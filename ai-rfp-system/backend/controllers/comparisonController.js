import Proposal from "../models/Proposal.js";
import RFP from "../models/RFP.js";
import { Groq } from "groq-sdk";
import dotenv from "dotenv";

dotenv.config();

// Initialize Groq client
const groqClient = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

// Helper function to extract data from proposal text using AI
const extractProposalData = async (proposalText, fileName) => {
  try {
    console.log("🤖 Extracting data from proposal text...");
    console.log("📄 File:", fileName);
    console.log("📄 First 500 chars:", proposalText.substring(0, 500));
    
    // Check if text is valid
    if (!proposalText || proposalText.trim().length < 50) {
      console.error("❌ Proposal text is too short or empty!");
      return {
        vendorName: "Unknown Vendor",
        proposalTitle: fileName || "Proposal File",
        totalPrice: { value: 0, currency: "USD", formatted: "$0" },
        items: ["Could not extract data - file may be empty or corrupted"],
        specifications: "File parsing failed",
        deliveryTimeline: "Not specified",
        warranty: "Not specified",
        paymentTerms: "Not specified",
        contactInfo: "Not specified",
        summary: `Failed to extract meaningful data from ${fileName}`
      };
    }

    const prompt = `
CRITICAL INSTRUCTION: You are a procurement AI assistant. Parse the following vendor proposal text and extract the requested information.
You MUST return ONLY a valid JSON object with the exact structure below. NO other text, no markdown, no code blocks.

PROPOSAL TEXT TO PARSE:
"""
${proposalText.substring(0, 3500)}
"""

EXTRACT THE FOLLOWING INFORMATION AND RETURN AS JSON:

{
  "vendorName": "Extract the company or vendor name",
  "proposalTitle": "Extract the proposal title or subject",
  "totalPrice": {
    "value": "Extract the numerical price value (number only)",
    "currency": "Extract currency code (USD, INR, EUR, GBP, etc)",
    "formatted": "Extract price with currency symbol (e.g., $1,000 or Rs.50,000)"
  },
  "items": ["List each item, product, or service mentioned"],
  "specifications": "Technical specifications, features, or requirements",
  "deliveryTimeline": "Delivery date, timeline, or schedule",
  "warranty": "Warranty period, terms, or guarantee",
  "paymentTerms": "Payment terms (e.g., Net 30, 50% advance, COD)",
  "contactInfo": "Contact person, email, phone if mentioned",
  "summary": "Brief 2-3 line summary of the proposal"
}

IMPORTANT RULES:
1. Extract REAL data from the text, DO NOT invent or make up information
2. If a field is not found in the text, use "Not specified"
3. For items: Always return an array, even if only one item
4. For prices: If you see "Rs." or "₹", currency is "INR". If you see "$", currency is "USD"
5. The "summary" should be a brief description based on actual content
6. RETURN ONLY THE JSON OBJECT, NOTHING ELSE
`;

    const completion = await groqClient.chat.completions.create({
      messages: [
        { 
          role: "system", 
          content: "You are a procurement data extraction expert. You extract structured data from vendor proposals and return ONLY valid JSON objects. Never add explanations or additional text." 
        },
        { role: "user", content: prompt }
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.1,
      max_tokens: 2000,
      response_format: { type: "json_object" }
    });

    const extractedText = completion.choices[0]?.message?.content || "{}";
    console.log("📄 AI Raw Response (first 300 chars):", extractedText.substring(0, 300));
    
    try {
      const parsedData = JSON.parse(extractedText);
      
      // Validate and clean the parsed data
      const vendorName = parsedData.vendorName || 
                        extractVendorFromText(proposalText) || 
                        "Unknown Vendor";
      
      const proposalTitle = parsedData.proposalTitle || 
                           extractTitleFromText(proposalText) || 
                           fileName || 
                           "Vendor Proposal";
      
      // Process total price
      let totalPrice = { value: 0, currency: "USD", formatted: "$0" };
      if (parsedData.totalPrice) {
        if (typeof parsedData.totalPrice === 'object') {
          totalPrice = {
            value: Number(parsedData.totalPrice.value) || 0,
            currency: parsedData.totalPrice.currency || "USD",
            formatted: parsedData.totalPrice.formatted || `$${parsedData.totalPrice.value || 0}`
          };
        } else if (typeof parsedData.totalPrice === 'string') {
          // Try to extract from string
          const priceMatch = parsedData.totalPrice.match(/([\d,.]+)/);
          if (priceMatch) {
            const value = parseFloat(priceMatch[1].replace(/,/g, ''));
            totalPrice = {
              value: value || 0,
              currency: parsedData.totalPrice.includes('Rs') || parsedData.totalPrice.includes('₹') ? 'INR' : 
                       parsedData.totalPrice.includes('€') ? 'EUR' : 
                       parsedData.totalPrice.includes('£') ? 'GBP' : 'USD',
              formatted: parsedData.totalPrice
            };
          }
        }
      }
      
      // Process items array
      let items = [];
      if (Array.isArray(parsedData.items)) {
        items = parsedData.items.filter(item => item && item.trim());
      } else if (parsedData.items && typeof parsedData.items === 'string') {
        items = [parsedData.items];
      }
      
      if (items.length === 0) {
        // Try to extract items from text
        const extractedItems = extractItemsFromText(proposalText);
        if (extractedItems.length > 0) {
          items = extractedItems;
        }
      }
      
      // Ensure all fields have defaults
      const cleanedData = {
        vendorName,
        proposalTitle,
        totalPrice,
        items: items.length > 0 ? items : ["Not specified"],
        specifications: parsedData.specifications || "Not specified",
        deliveryTimeline: parsedData.deliveryTimeline || "Not specified",
        warranty: parsedData.warranty || "Not specified",
        paymentTerms: parsedData.paymentTerms || "Not specified",
        contactInfo: parsedData.contactInfo || "Not specified",
        summary: parsedData.summary || `Proposal from ${vendorName} for ${proposalTitle.substring(0, 50)}...`
      };
      
      console.log("✅ Extracted data:", {
        vendorName: cleanedData.vendorName,
        itemsCount: cleanedData.items.length,
        price: cleanedData.totalPrice.formatted
      });
      
      return cleanedData;
      
    } catch (parseError) {
      console.error("❌ JSON Parse Error:", parseError);
      console.error("Raw AI response that failed:", extractedText);
      
      // Fallback: extract basic info manually
      const fallbackData = extractBasicInfoManually(proposalText, fileName);
      console.log("🔄 Using fallback extraction:", fallbackData.vendorName);
      return fallbackData;
    }
    
  } catch (error) {
    console.error("❌ AI Extraction Error:", error);
    return {
      vendorName: "Unknown Vendor",
      proposalTitle: fileName || "Proposal File",
      totalPrice: { value: 0, currency: "USD", formatted: "$0" },
      items: ["AI extraction failed"],
      specifications: "Extraction error",
      deliveryTimeline: "Not specified",
      warranty: "Not specified",
      paymentTerms: "Not specified",
      contactInfo: "Not specified",
      summary: `Failed to extract data: ${error.message}`
    };
  }
};

// Helper functions for fallback extraction
const extractVendorFromText = (text) => {
  const vendorPatterns = [
    /Vendor[:\s]+([^\n]+)/i,
    /Company[:\s]+([^\n]+)/i,
    /From[:\s]+([^\n]+)/i,
    /Supplier[:\s]+([^\n]+)/i
  ];
  
  for (const pattern of vendorPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  
  // Look for common vendor names in text
  const commonVendors = ['Dell', 'HP', 'Lenovo', 'Microsoft', 'Apple', 'IBM', 'Cisco', 'Oracle'];
  for (const vendor of commonVendors) {
    if (text.includes(vendor)) {
      return vendor;
    }
  }
  
  return null;
};

const extractTitleFromText = (text) => {
  const titlePatterns = [
    /Proposal[:\s]+([^\n]+)/i,
    /Quotation[:\s]+([^\n]+)/i,
    /Subject[:\s]+([^\n]+)/i,
    /Title[:\s]+([^\n]+)/i
  ];
  
  for (const pattern of titlePatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  
  // Take first non-empty line as title
  const lines = text.split('\n').filter(line => line.trim().length > 10);
  if (lines.length > 0) {
    return lines[0].trim().substring(0, 100);
  }
  
  return null;
};

const extractItemsFromText = (text) => {
  const items = [];
  const lines = text.split('\n');
  
  // Look for bullet points or numbered lists
  const itemPatterns = [
    /^\s*[•\-*]\s*(.+)/,
    /^\s*\d+\.\s*(.+)/,
    /Item[:\s]+(.+)/i,
    /Product[:\s]+(.+)/i
  ];
  
  for (const line of lines) {
    for (const pattern of itemPatterns) {
      const match = line.match(pattern);
      if (match && match[1]) {
        const item = match[1].trim();
        if (item.length > 3 && !items.includes(item)) {
          items.push(item);
        }
      }
    }
  }
  
  return items;
};

const extractBasicInfoManually = (text, fileName) => {
  return {
    vendorName: extractVendorFromText(text) || "Unknown Vendor",
    proposalTitle: extractTitleFromText(text) || fileName || "Proposal",
    totalPrice: extractPriceFromText(text),
    items: extractItemsFromText(text) || ["Not specified"],
    specifications: "Manually extracted",
    deliveryTimeline: "Not specified",
    warranty: "Not specified",
    paymentTerms: "Not specified",
    contactInfo: "Not specified",
    summary: `Basic extraction from ${fileName}`
  };
};

const extractPriceFromText = (text) => {
  const pricePatterns = [
    /Total[:\s]+(?:Rs\.?|₹|USD|€|£)?\s*([\d,.]+)/i,
    /Price[:\s]+(?:Rs\.?|₹|USD|€|£)?\s*([\d,.]+)/i,
    /Cost[:\s]+(?:Rs\.?|₹|USD|€|£)?\s*([\d,.]+)/i,
    /Amount[:\s]+(?:Rs\.?|₹|USD|€|£)?\s*([\d,.]+)/i
  ];
  
  for (const pattern of pricePatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const value = parseFloat(match[1].replace(/,/g, ''));
      // Determine currency
      const line = match[0];
      let currency = "USD";
      let symbol = "$";
      
      if (line.includes('Rs') || line.includes('₹')) {
        currency = "INR";
        symbol = "₹";
      } else if (line.includes('€')) {
        currency = "EUR";
        symbol = "€";
      } else if (line.includes('£')) {
        currency = "GBP";
        symbol = "£";
      }
      
      return {
        value: value || 0,
        currency,
        formatted: `${symbol}${value.toLocaleString()}`
      };
    }
  }
  
  return { value: 0, currency: "USD", formatted: "$0" };
};

// Helper function to compare RFP with proposals using AI
const compareRFPWithProposals = async (rfpData, proposalsData) => {
  try {
    console.log("🤖 Starting AI comparison of", proposalsData.length, "proposals...");
    
    // Prepare proposals data for AI
    const proposalsForAI = proposalsData.map((proposal, index) => ({
      proposalIndex: index,
      vendorName: proposal.vendorName || `Vendor ${index + 1}`,
      proposalTitle: proposal.proposalTitle || `Proposal ${index + 1}`,
      totalPrice: proposal.totalPrice?.formatted || "Not specified",
      items: Array.isArray(proposal.items) ? proposal.items.join(", ") : proposal.items || "Not specified",
      specifications: proposal.specifications || "Not specified",
      deliveryTimeline: proposal.deliveryTimeline || "Not specified",
      warranty: proposal.warranty || "Not specified",
      paymentTerms: proposal.paymentTerms || "Not specified",
      summary: proposal.summary || "No summary available"
    }));

    const prompt = `
You are a senior procurement expert comparing vendor proposals against RFP requirements.

RFP REQUIREMENTS:
- Title: ${rfpData.title}
- Budget: ${rfpData.budget}
- Required Delivery: ${rfpData.deliveryTimeline}
- Items Required: ${rfpData.items.map(item => `${item.quantity}x ${item.itemName}`).join(", ")}
- Description/Specifications: ${rfpData.description || "Standard requirements"}

VENDOR PROPOSALS TO COMPARE:
${JSON.stringify(proposalsForAI, null, 2)}

ANALYZE EACH PROPOSAL and provide:
1. Compatibility Score (0-100%): How well it matches ALL RFP requirements
2. Price Analysis: Compare proposal price to RFP budget - "Within budget", "Over budget by X%", or "Significantly over budget"
3. Specification Match (0-100%): How well technical specs match requirements
4. Delivery Match: "Meets deadline", "Exceeds deadline", "Late by X weeks", or "Not specified"
5. Key Strengths: Array of 2-3 main advantages
6. Key Weaknesses: Array of 2-3 main disadvantages
7. AI Comments: Brief professional analysis summary

THEN RECOMMEND the BEST proposal overall based on: price compliance, spec match, delivery, and overall value.

Return ONLY a valid JSON object with this EXACT structure:
{
  "comparisonResults": [
    {
      "proposalIndex": 0,
      "vendorName": "Vendor Name",
      "compatibilityScore": 85,
      "priceAnalysis": "Within budget",
      "specMatchPercentage": 90,
      "deliveryMatch": "Meets deadline",
      "strengths": ["Good price", "Fast delivery", "Good warranty"],
      "weaknesses": ["Limited support", "Higher setup cost"],
      "aiComments": "Good overall match with competitive pricing."
    }
  ],
  "bestProposalIndex": 0,
  "bestProposalReason": "Clear explanation why this is the best proposal",
  "summary": "Overall comparison summary of all proposals (2-3 sentences)"
}

IMPORTANT:
- Be objective and fair in analysis
- Compare against RFP requirements, not between proposals
- If information is missing, note it in weaknesses
- Return ONLY the JSON object, no other text
`;

    const completion = await groqClient.chat.completions.create({
      messages: [
        { 
          role: "system", 
          content: "You are a procurement comparison expert. Analyze proposals against RFP requirements objectively. Return ONLY valid JSON with comparison results." 
        },
        { role: "user", content: prompt }
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.2,
      max_tokens: 2500,
      response_format: { type: "json_object" }
    });

    const comparisonText = completion.choices[0]?.message?.content || "{}";
    console.log("📊 AI Comparison Response (first 300 chars):", comparisonText.substring(0, 300));
    
    try {
      const parsedComparison = JSON.parse(comparisonText);
      
      // Validate and ensure all proposals have results
      const validatedResults = proposalsData.map((proposal, index) => {
        const aiResult = parsedComparison.comparisonResults?.find(r => r.proposalIndex === index);
        
        if (aiResult) {
          return aiResult;
        }
        
        // Default result if AI didn't analyze this proposal
        return {
          proposalIndex: index,
          vendorName: proposal.vendorName || `Vendor ${index + 1}`,
          compatibilityScore: 50,
          priceAnalysis: "Not analyzed",
          specMatchPercentage: 50,
          deliveryMatch: "Not specified",
          strengths: ["Basic proposal submitted"],
          weaknesses: ["Incomplete analysis"],
          aiComments: "AI analysis was not completed for this proposal"
        };
      });

      // Ensure bestProposalIndex is valid
      const bestIndex = Math.min(
        parsedComparison.bestProposalIndex || 0,
        proposalsData.length - 1
      );

      console.log("✅ AI Comparison completed. Best proposal index:", bestIndex);
      
      return {
        comparisonResults: validatedResults,
        bestProposalIndex: bestIndex,
        bestProposalReason: parsedComparison.bestProposalReason || "Based on overall compliance",
        summary: parsedComparison.summary || "AI comparison analysis completed."
      };
      
    } catch (parseError) {
      console.error("❌ Comparison JSON Parse Error:", parseError);
      console.error("Raw response:", comparisonText);
      
      // Create default comparison results
      return {
        comparisonResults: proposalsData.map((proposal, index) => ({
          proposalIndex: index,
          vendorName: proposal.vendorName || `Vendor ${index + 1}`,
          compatibilityScore: 60,
          priceAnalysis: "Default analysis",
          specMatchPercentage: 60,
          deliveryMatch: "Default",
          strengths: ["Proposal submitted", "Basic compliance"],
          weaknesses: ["Detailed analysis not available"],
          aiComments: "AI comparison parsing failed, using default results"
        })),
        bestProposalIndex: 0,
        bestProposalReason: "Default selection (first proposal)",
        summary: "AI comparison encountered parsing issues. Manual review recommended."
      };
    }
    
  } catch (error) {
    console.error("❌ AI Comparison Error:", error);
    throw new Error(`AI comparison failed: ${error.message}`);
  }
};

// Main comparison endpoint controller
export const compareProposals = async (req, res) => {
  try {
    console.log("🚀 Starting AI Comparison Process...");
    
    const { rfpId } = req.body;
    const files = req.files; // Array of uploaded .txt files
    
    // Validation
    if (!rfpId) {
      return res.status(400).json({
        success: false,
        error: "RFP ID is required"
      });
    }
    
    if (!files || files.length === 0) {
      return res.status(400).json({
        success: false,
        error: "At least one proposal file is required"
      });
    }
    
    console.log(`📋 Processing ${files.length} proposal files for RFP: ${rfpId}`);
    
    // 1. Fetch RFP details from database
    const rfp = await RFP.findById(rfpId)
      .populate('vendorsSentTo', 'name email rating category')
      .populate('selectedVendor', 'name email');
    
    if (!rfp) {
      return res.status(404).json({
        success: false,
        error: "RFP not found"
      });
    }
    
    console.log(`✅ RFP Found: ${rfp.title} (Budget: ${rfp.budget})`);
    
    // 2. Extract data from each proposal file using AI
    const proposalsData = [];
    const extractionErrors = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      console.log(`\n📄 Processing file ${i + 1}/${files.length}: ${file.originalname}`);
      console.log(`📏 File size: ${file.size} bytes`);
      
      try {
        const proposalText = file.buffer.toString('utf-8');
        
        if (!proposalText || proposalText.trim().length < 10) {
          console.error("❌ File appears to be empty or invalid");
          extractionErrors.push({
            fileName: file.originalname,
            error: "File is empty or contains no text"
          });
          continue;
        }
        
        console.log(`📝 Text length: ${proposalText.length} characters`);
        
        const extractedData = await extractProposalData(proposalText, file.originalname);
        
        proposalsData.push({
          fileName: file.originalname,
          fileIndex: i,
          ...extractedData
        });
        
        console.log(`✅ Extracted: ${extractedData.vendorName} - ${extractedData.totalPrice.formatted}`);
        
      } catch (extractionError) {
        console.error(`❌ Failed to extract data from ${file.originalname}:`, extractionError.message);
        extractionErrors.push({
          fileName: file.originalname,
          error: extractionError.message
        });
        
        // Add placeholder data for failed extraction
        proposalsData.push({
          fileName: file.originalname,
          fileIndex: i,
          vendorName: "Extraction Failed",
          proposalTitle: file.originalname,
          totalPrice: { value: 0, currency: "USD", formatted: "$0" },
          items: ["Data extraction failed"],
          specifications: "Extraction error",
          deliveryTimeline: "Not specified",
          warranty: "Not specified",
          paymentTerms: "Not specified",
          contactInfo: "Not specified",
          summary: `Failed to extract data: ${extractionError.message}`
        });
      }
    }
    
    if (proposalsData.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Could not extract data from any proposal files",
        extractionErrors
      });
    }
    
    console.log(`\n✅ Successfully extracted ${proposalsData.length} proposals`);
    console.log("📊 Proposal Summary:");
    proposalsData.forEach((p, i) => {
      console.log(`  ${i + 1}. ${p.vendorName} - ${p.totalPrice.formatted}`);
    });
    
    // 3. Prepare RFP data for comparison
    const rfpData = {
      title: rfp.title,
      description: rfp.description || "Standard requirements",
      budget: rfp.budget,
      items: rfp.items.map(item => ({
        itemName: item.itemName,
        quantity: item.quantity,
        specs: item.specs
      })),
      deliveryTimeline: rfp.deliveryTimeline,
      paymentTerms: rfp.paymentTerms,
      warranty: rfp.warranty,
      vendorsSentTo: rfp.vendorsSentTo || []
    };
    
    // 4. Run AI comparison
    console.log("\n🤖 Running AI comparison engine...");
    const comparisonResults = await compareRFPWithProposals(rfpData, proposalsData);
    
    // 5. Save results to database
    const savedProposals = [];
    for (let i = 0; i < proposalsData.length; i++) {
      try {
        const proposal = new Proposal({
          rfp: rfpId,
          vendorName: proposalsData[i].vendorName,
          fileName: proposalsData[i].fileName,
          extractedData: proposalsData[i],
          comparisonResult: comparisonResults.comparisonResults[i] || {},
          aiScore: comparisonResults.comparisonResults[i]?.compatibilityScore || 0,
          isRecommended: i === comparisonResults.bestProposalIndex
        });
        
        await proposal.save();
        savedProposals.push(proposal);
        console.log(`💾 Saved proposal ${i + 1}: ${proposal.vendorName}`);
      } catch (saveError) {
        console.error(`❌ Failed to save proposal ${i + 1}:`, saveError.message);
      }
    }
    
    // 6. Update RFP status
    try {
      await RFP.findByIdAndUpdate(rfpId, {
        status: 'under_review',
        proposalsReceived: files.length,
        updatedAt: new Date()
      });
      console.log("✅ Updated RFP status to 'under_review'");
    } catch (updateError) {
      console.error("❌ Failed to update RFP status:", updateError.message);
    }
    
    // 7. Prepare response
    const response = {
      success: true,
      message: `Successfully compared ${files.length} proposals with RFP "${rfp.title}"`,
      rfp: {
        id: rfp._id,
        title: rfp.title,
        budget: rfp.budget,
        deliveryTimeline: rfp.deliveryTimeline,
        items: rfp.items.length
      },
      proposals: savedProposals.map(p => ({
        id: p._id,
        vendorName: p.vendorName,
        fileName: p.fileName,
        compatibilityScore: p.comparisonResult?.compatibilityScore || 0,
        price: p.extractedData?.totalPrice?.formatted || "Not specified"
      })),
      comparison: comparisonResults,
      bestProposal: {
        index: comparisonResults.bestProposalIndex,
        vendorName: proposalsData[comparisonResults.bestProposalIndex]?.vendorName,
        fileName: proposalsData[comparisonResults.bestProposalIndex]?.fileName,
        compatibilityScore: comparisonResults.comparisonResults[comparisonResults.bestProposalIndex]?.compatibilityScore || 0,
        reason: comparisonResults.bestProposalReason,
        price: proposalsData[comparisonResults.bestProposalIndex]?.totalPrice?.formatted || "Not specified"
      },
      stats: {
        totalProposals: files.length,
        successfullyExtracted: proposalsData.length,
        extractionErrors: extractionErrors.length,
        extractionErrorDetails: extractionErrors.length > 0 ? extractionErrors : undefined
      },
      timestamp: new Date().toISOString()
    };
    
    console.log("\n🎉 AI Comparison Process Complete!");
    console.log(`🏆 Best Proposal: ${response.bestProposal.vendorName}`);
    console.log(`📈 Score: ${response.bestProposal.compatibilityScore}%`);
    console.log(`💰 Price: ${response.bestProposal.price}`);
    
    res.json(response);
    
  } catch (error) {
    console.error("❌ Comparison Process Error:", error);
    
    res.status(500).json({
      success: false,
      error: error.message || "Failed to compare proposals",
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
  }
};

// Get comparison results for an RFP
export const getComparisonResults = async (req, res) => {
  try {
    const { rfpId } = req.params;
    
    if (!rfpId) {
      return res.status(400).json({
        success: false,
        error: "RFP ID is required"
      });
    }
    
    // Fetch RFP
    const rfp = await RFP.findById(rfpId);
    if (!rfp) {
      return res.status(404).json({
        success: false,
        error: "RFP not found"
      });
    }
    
    // Fetch all proposals for this RFP
    const proposals = await Proposal.find({ rfp: rfpId }).sort({ aiScore: -1 });
    
    // Find best proposal
    const bestProposal = proposals.find(p => p.isRecommended) || proposals[0];
    
    res.json({
      success: true,
      rfp: {
        id: rfp._id,
        title: rfp.title,
        budget: rfp.budget,
        deliveryTimeline: rfp.deliveryTimeline
      },
      proposals: proposals.map(p => ({
        id: p._id,
        vendorName: p.vendorName,
        fileName: p.fileName,
        compatibilityScore: p.comparisonResult?.compatibilityScore || 0,
        price: p.extractedData?.totalPrice?.formatted || "Not specified",
        isRecommended: p.isRecommended,
        submittedAt: p.submittedAt
      })),
      bestProposal: bestProposal ? {
        vendorName: bestProposal.vendorName,
        fileName: bestProposal.fileName,
        compatibilityScore: bestProposal.comparisonResult?.compatibilityScore || 0,
        price: bestProposal.extractedData?.totalPrice?.formatted || "Not specified"
      } : null,
      totalProposals: proposals.length
    });
    
  } catch (error) {
    console.error("❌ Get Comparison Results Error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to fetch comparison results"
    });
  }
};