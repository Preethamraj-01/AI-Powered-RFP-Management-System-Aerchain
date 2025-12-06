import Proposal from "../models/Proposal.js";
import RFP from "../models/RFP.js";
import Vendor from "../models/Vendor.js";
import { parseProposalFromEmail, compareProposals } from "../utils/ai.js";

// Parse a demo vendor response
//import { parseProposalFromEmail } from '../services/aiService.js';
import multer from 'multer';

// Configure multer for memory storage
const storage = multer.memoryStorage();
export const upload = multer({ storage });

export const parseDemoProposal = async (req, res) => {
  try {
    console.log('=== parseDemoProposal START ===');
    
    // Debug logging
    console.log('Request received:', {
      method: req.method,
      contentType: req.headers['content-type'],
      hasFile: !!req.file,
      fileInfo: req.file ? {
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        bufferType: req.file.buffer?.constructor?.name,
        bufferLength: req.file.buffer?.length
      } : null,
      bodyKeys: Object.keys(req.body)
    });

    if (!req.file) {
      console.log('ERROR: No file found in request');
      return res.status(400).json({
        success: false,
        error: "No file uploaded. Please select a file.",
        debug: {
          hasFile: false,
          contentType: req.headers['content-type'],
          receivedFields: Object.keys(req.body)
        }
      });
    }

    const { originalname, mimetype, buffer, size } = req.file;

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'application/msword'
    ];
    
    if (!allowedTypes.includes(mimetype) && 
        !originalname.match(/\.(pdf|docx|txt|doc)$/i)) {
      return res.status(400).json({
        success: false,
        error: `Unsupported file type: ${mimetype}. Please upload PDF, DOCX, or TXT.`
      });
    }

    console.log('Processing file:', {
      name: originalname,
      type: mimetype,
      size: `${(size / 1024).toFixed(2)} KB`,
      bufferLength: buffer?.length
    });

    // Prepare file object for AI parsing
    const fileObj = {
      buffer: buffer,
      name: originalname,
      type: mimetype,
      size: size
    };

    // Parse with AI
    console.log('Calling AI parser...');
    const parsedData = await parseProposalFromEmail(fileObj);
    
    console.log('AI parser returned:', {
      success: parsedData.success !== false,
      hasError: !!parsedData.error,
      extractedTextLength: parsedData.extractedText?.length,
      score: parsedData.score
    });

    // Format the response
    const response = {
      success: parsedData.success !== false,
      message: parsedData.success !== false 
        ? 'File parsed successfully by AI' 
        : parsedData.error || 'AI parsing failed',
      data: {
        extracted: parsedData,
        fileInfo: {
          name: originalname,
          type: mimetype,
          size: size
        }
      }
    };

    console.log('=== parseDemoProposal END ===');
    return res.json(response);

  } catch (error) {
    console.error("❌ Error in parseDemoProposal:", error.message);
    console.error("Stack trace:", error.stack);
    
    return res.status(500).json({
      success: false,
      error: "Server error while parsing file",
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};
// Get proposals for an RFP
export const getProposalsByRFP = async (req, res) => {
  try {
    const { rfpId } = req.params;
    
    const proposals = await Proposal.find({ rfpId })
      .populate('vendorId', 'name email rating company')
      .sort({ aiScore: -1, totalPrice: 1 });
    
    res.json({
      success: true,
      count: proposals.length,
      data: proposals
    });
  } catch (error) {
    console.error("Error fetching proposals:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch proposals"
    });
  }
};

// Compare proposals with AI
export const compareProposalsForRFP = async (req, res) => {
  try {
    const { rfpId } = req.params;
    
    const rfp = await RFP.findById(rfpId);
    const proposals = await Proposal.find({ rfpId })
      .populate('vendorId', 'name email rating');
    
    if (proposals.length < 2) {
      return res.status(400).json({
        success: false,
        error: "Need at least 2 proposals to compare",
        count: proposals.length
      });
    }
    
    // Prepare data for AI comparison
    const proposalsData = proposals.map(p => ({
      vendor: p.vendorId.name,
      price: p.totalPrice,
      delivery: p.deliveryTimeline,
      warranty: p.warranty,
      terms: p.paymentTerms,
      aiScore: p.aiScore,
      notes: p.notes
    }));
    
    // Get AI comparison
    const comparison = await compareProposals(proposalsData, rfp);
    
    res.json({
      success: true,
      message: `AI comparison of ${proposals.length} proposals`,
      data: {
        rfp: {
          title: rfp.title,
          budget: rfp.budget
        },
        proposals: proposals.map(p => ({
          id: p._id,
          vendor: p.vendorId.name,
          price: p.totalPrice,
          delivery: p.deliveryTimeline,
          aiScore: p.aiScore,
          summary: p.aiSummary
        })),
        aiComparison: comparison
      }
    });
    
  } catch (error) {
    console.error("Error comparing proposals:", error);
    res.status(500).json({
      success: false,
      error: "Failed to compare proposals"
    });
  }
};

// Select winning proposal
export const selectWinningProposal = async (req, res) => {
  try {
    const { proposalId } = req.params;
    const { notes } = req.body;
    
    const proposal = await Proposal.findById(proposalId)
      .populate('rfpId')
      .populate('vendorId');
    
    if (!proposal) {
      return res.status(404).json({ 
        success: false,
        error: "Proposal not found" 
      });
    }
    
    // Update proposal
    proposal.status = 'selected';
    proposal.selectionNotes = notes;
    await proposal.save();
    
    // Update RFP
    await RFP.findByIdAndUpdate(proposal.rfpId._id, {
      status: 'completed',
      selectedVendor: proposal.vendorId._id
    });
    
    // Update vendor
    await Vendor.findByIdAndUpdate(proposal.vendorId._id, {
      $inc: { awardsWon: 1 }
    });
    
    // Reject other proposals
    await Proposal.updateMany(
      { rfpId: proposal.rfpId._id, _id: { $ne: proposalId } },
      { status: 'rejected' }
    );
    
    res.json({
      success: true,
      message: `${proposal.vendorId.name} selected as winner`,
      data: proposal
    });
    
  } catch (error) {
    console.error("Error selecting winner:", error);
    res.status(500).json({ 
      success: false,
      error: "Failed to select winner" 
    });
  }
};