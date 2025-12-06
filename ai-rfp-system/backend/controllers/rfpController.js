// Import Groq client directly
import Groq from "groq-sdk";
import dotenv from "dotenv";
import RFP from "../models/RFP.js";
import mongoose from "mongoose";
import Vendor from "../models/Vendor.js";
import emailService from "../services/emailService.js";

dotenv.config();

const client = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// 1. Parse natural language to structured RFP (AI)
export const generateRFP = async (req, res) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({
        success: false,
        error: "Text input is required"
      });
    }

    const prompt = `
You are an AI procurement assistant. Extract structured RFP data from this text:

"${text}"

Return a COMPLETE JSON object with ALL these fields. If any information is missing, provide REASONABLE DEFAULT VALUES:

{
  "title": "string (create a descriptive title)",
  "budget": "string (e.g., '$15,000' or 'Not specified')",
  "deliveryTimeline": "string (e.g., '2 weeks' or 'ASAP')",
  "paymentTerms": "string (default: 'net 30')",
  "warranty": "string (e.g., '1 year' or 'Standard warranty')",
  "items": [
    {
      "itemName": "string",
      "quantity": number (minimum 1),
      "specs": "string"
    }
  ]
}

IMPORTANT RULES:
1. ALWAYS include ALL fields
2. If quantity is not specified, use 1
3. If specs are not specified, use 'Standard specifications'
4. If budget is not specified, use 'To be negotiated'
5. Return ONLY the JSON object, no other text
6. Ensure the JSON is valid and parsable
`;

    const response = await client.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        { role: "user", content: prompt }
      ],
      temperature: 0.2
    });

    const aiText = response.choices[0].message.content;
    
    // Debug: Log the raw response
    console.log("Raw AI Response:", aiText);
    
    // Clean the response - remove markdown code blocks and backticks
    let cleanedText = aiText.trim();
    
    // Remove ```json and ``` markers
    cleanedText = cleanedText.replace(/^```(?:json)?\s*/i, '');
    cleanedText = cleanedText.replace(/\s*```$/i, '');
    
    // Remove any remaining backticks
    cleanedText = cleanedText.replace(/`/g, '');
    
    // Trim again
    cleanedText = cleanedText.trim();
    
    // Debug: Log cleaned response
    console.log("Cleaned Response:", cleanedText);
    
    // Try to find JSON object if there's extra text
    const jsonMatch = cleanedText.match(/(\{[\s\S]*\})/);
    if (jsonMatch) {
      cleanedText = jsonMatch[0];
    }
    
    // Parse JSON with error handling
    let structured;
    try {
      structured = JSON.parse(cleanedText);
      console.log("Successfully parsed JSON:", structured);
    } catch (parseError) {
      console.error("JSON Parse Error:", parseError, "Raw text:", cleanedText);
      // Fallback: Create basic structure if AI fails
      structured = {
        title: "Procurement Request",
        budget: "To be negotiated",
        deliveryTimeline: "ASAP",
        paymentTerms: "net 30",
        warranty: "Standard warranty",
        items: [
          {
            itemName: "Item",
            quantity: 1,
            specs: "Standard specifications"
          }
        ]
      };
    }
    
    // Ensure all required fields exist with defaults
    const rfpData = {
      title: structured.title || "Untitled RFP",
      description: `Procurement request: ${text.substring(0, 100)}${text.length > 100 ? '...' : ''}`,
      originalText: text,
      budget: structured.budget || "To be negotiated",
      deliveryTimeline: structured.deliveryTimeline || "ASAP",
      paymentTerms: structured.paymentTerms || "net 30",
      warranty: structured.warranty || "Standard warranty",
      items: Array.isArray(structured.items) ? structured.items.map(item => ({
        itemName: item.itemName || "Item",
        quantity: item.quantity || 1,
        specs: item.specs || "Standard specifications"
      })) : [{
        itemName: "Item",
        quantity: 1,
        specs: "Standard specifications"
      }],
      status: 'draft',
      createdBy: 'procurement_manager'
    };
    
    console.log("Final RFP data to save:", rfpData);
    
    // Save to database
    const saved = await RFP.create(rfpData);
    
    res.json({
      success: true,
      message: "RFP generated successfully",
      data: saved
    });

  } catch (err) {
    console.error("AI Error:", err);
    
    // More detailed error response
    res.status(500).json({ 
      success: false,
      error: "Failed to generate RFP",
      details: err.message,
      hint: "The AI might be returning malformed JSON. Check the raw response."
    });
  }
};

// 2. Get all RFPs
export const getAllRFPs = async (req, res) => {
  try {
    const { status, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    
    const filter = {};
    if (status) filter.status = status;
    
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
    
    const rfps = await RFP.find(filter)
      .sort(sort)
      .populate('vendorsSentTo', 'name email')
      .populate('selectedVendor', 'name email');
    
    res.json({
      success: true,
      count: rfps.length,
      data: rfps
    });
  } catch (error) {
    console.error("Error fetching RFPs:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch RFPs",
      details: error.message
    });
  }
};

// 3. Get single RFP by ID (Simplified - no Proposal yet)
export const getRFPById = async (req, res) => {
  try {
    const rfp = await RFP.findById(req.params.id)
      .populate('vendorsSentTo')
      .populate('selectedVendor');
    
    if (!rfp) {
      return res.status(404).json({
        success: false,
        error: "RFP not found"
      });
    }
    
    res.json({
      success: true,
      data: rfp
    });
  } catch (error) {
    console.error("Error fetching RFP:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch RFP",
      details: error.message
    });
  }
};

// 4. Update RFP
export const updateRFP = async (req, res) => {
  try {
    const rfp = await RFP.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: Date.now() },
      { new: true, runValidators: true }
    );
    
    if (!rfp) {
      return res.status(404).json({
        success: false,
        error: "RFP not found"
      });
    }
    
    res.json({
      success: true,
      message: "RFP updated successfully",
      data: rfp
    });
  } catch (error) {
    console.error("Error updating RFP:", error);
    res.status(500).json({
      success: false,
      error: "Failed to update RFP",
      details: error.message
    });
  }
};

// 5. Delete RFP
export const deleteRFP = async (req, res) => {
  try {
    const rfp = await RFP.findByIdAndDelete(req.params.id);
    
    if (!rfp) {
      return res.status(404).json({
        success: false,
        error: "RFP not found"
      });
    }
    
    res.json({
      success: true,
      message: "RFP deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting RFP:", error);
    res.status(500).json({
      success: false,
      error: "Failed to delete RFP",
      details: error.message
    });
  }
};

// 6. Send RFP to vendors (with actual email sending)
export const sendRFPToVendors = async (req, res) => {
  try {
    const { vendorIds } = req.body;
    const { id: rfpId } = req.params;
    
    // Get RFP
    const rfp = await RFP.findById(rfpId);
    if (!rfp) {
      return res.status(404).json({
        success: false,
        error: "RFP not found"
      });
    }
    
    // Validate vendors exist
    const vendors = await Vendor.find({ _id: { $in: vendorIds } });
    if (vendors.length === 0) {
      return res.status(400).json({
        success: false,
        error: "No valid vendors selected"
      });
    }
    
    // Send emails to vendors
    console.log(`Starting email sending for RFP: ${rfp.title}`);
    const emailResults = await emailService.sendRFPToVendors(rfp, vendors);
    
    // Update RFP status and vendors
    rfp.vendorsSentTo = vendorIds;
    rfp.status = 'sent';
    rfp.proposalsExpected = vendors.length;
    await rfp.save();
    
    // Update vendor statistics
    await Vendor.updateMany(
      { _id: { $in: vendorIds } },
      { $inc: { proposalsSubmitted: 1 } }
    );
    
    res.json({
      success: true,
      message: `RFP sent to ${emailResults.successful} vendor(s) successfully${emailResults.failed > 0 ? `, ${emailResults.failed} failed` : ''}`,
      data: {
        rfp: {
          _id: rfp._id,
          title: rfp.title,
          status: rfp.status,
          vendorsCount: vendors.length
        },
        emailResults: {
          total: emailResults.total,
          successful: emailResults.successful,
          failed: emailResults.failed,
          failedVendors: emailResults.details.filter(r => !r.success).map(r => r.vendorEmail)
        },
        vendors: vendors.map(v => ({
          name: v.name,
          email: v.email,
          company: v.company
        })),
        mailhogUrl: "http://localhost:8025"
      }
    });
  } catch (error) {
    console.error("Error sending RFP to vendors:", error);
    res.status(500).json({
      success: false,
      error: "Failed to send RFP to vendors",
      details: error.message
    });
  }
};

// 7. Get RFP statistics
export const getRFPStats = async (req, res) => {
  try {
    const totalRFPs = await RFP.countDocuments();
    const draftRFPs = await RFP.countDocuments({ status: 'draft' });
    const sentRFPs = await RFP.countDocuments({ status: 'sent' });
    const completedRFPs = await RFP.countDocuments({ status: 'completed' });
    
    res.json({
      success: true,
      data: {
        totalRFPs,
        draftRFPs,
        sentRFPs,
        completedRFPs,
        otherRFPs: totalRFPs - draftRFPs - sentRFPs - completedRFPs
      }
    });
  } catch (error) {
    console.error("Error fetching RFP stats:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch RFP statistics",
      details: error.message
    });
  }
};