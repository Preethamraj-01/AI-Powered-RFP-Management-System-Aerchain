import Proposal from "../models/Proposal.js";
import RFP from "../models/RFP.js";
import Vendor from "../models/Vendor.js";
import { parseProposalFromEmail, compareProposals } from "../utils/ai.js";

// Parse a demo vendor response
export const parseDemoProposal = async (req, res) => {
  try {
    const { vendorId, rfpId, proposalText } = req.body;
    
    if (!vendorId || !rfpId || !proposalText) {
      return res.status(400).json({
        success: false,
        error: "vendorId, rfpId, and prossposalText are required"
      });
    }
    
    const vendor = await Vendor.findById(vendorId);
    const rfp = await RFP.findById(rfpId);
    
    if (!vendor || !rfp) {
      return res.status(404).json({
        success: false,
        error: "Vendor or RFP not found"
      });
    }
    
    console.log(`\n🤖 Parsing proposal from ${vendor.name} for RFP: ${rfp.title}`);
    
    // Use AI to parse proposal
    const parsedData = await parseProposalFromEmail(proposalText);
    
    // Create proposal record
    const proposal = new Proposal({
      rfpId: rfp._id,
      vendorId: vendor._id,
      totalPrice: parsedData.totalPrice || 0,
      deliveryTimeline: parsedData.deliveryTimeline || "Not specified",
      paymentTerms: parsedData.paymentTerms || "net 30",
      warranty: parsedData.warranty || "Standard",
      notes: parsedData.notes || "",
      items: parsedData.items || [],
      rawEmail: proposalText,
      aiScore: parsedData.score || 50,
      aiSummary: parsedData.summary || "Parsed by AI",
      status: 'submitted'
    });
    
    await proposal.save();
    
    // Update RFP and vendor counts
    await RFP.findByIdAndUpdate(rfpId, {
      $inc: { proposalsReceived: 1 }
    });
    
    await Vendor.findByIdAndUpdate(vendorId, {
      $inc: { proposalsSubmitted: 1 }
    });
    
    console.log(`✅ Proposal saved: $${proposal.totalPrice}, Score: ${proposal.aiScore}`);
    
    res.json({
      success: true,
      message: `Proposal from ${vendor.name} parsed and saved`,
      data: {
        proposal: proposal,
        aiAnalysis: parsedData,
        vendor: vendor.name,
        rfp: rfp.title
      }
    });
    
  } catch (error) {
    console.error("Error parsing proposal:", error);
    res.status(500).json({
      success: false,
      error: "Failed to parse proposal",
      details: error.message
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