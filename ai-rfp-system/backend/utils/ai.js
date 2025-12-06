import Groq from "groq-sdk";
// Use dynamic import for pdf-parse since it's CommonJS
let pdfParse;
import('pdf-parse').then(module => {
  pdfParse = module.default || module;
}).catch(err => {
  console.error('Failed to load pdf-parse:', err);
  pdfParse = null;
});
import dotenv from "dotenv";

dotenv.config();

const client = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// Updated parseProposalFromEmail to handle files
export const parseProposalFromEmail = async (file) => {
  try {
    console.log('parseProposalFromEmail: Starting with file:', file.name);
    console.log('File size:', file.size, 'bytes');
    console.log('File type:', file.type);
    
    let extractedText = '';
    
    // Extract text from PDF
    if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
      try {
        console.log('Processing PDF file...');
        
        // Wait for pdfParse to load if needed
        if (!pdfParse) {
          console.log('Loading pdf-parse module...');
          const module = await import('pdf-parse');
          pdfParse = module.default || module;
          console.log('pdf-parse loaded successfully');
        }
        
        // Ensure buffer is a Buffer object
        let bufferData;
        if (Buffer.isBuffer(file.buffer)) {
          bufferData = file.buffer;
        } else if (file.buffer instanceof ArrayBuffer) {
          bufferData = Buffer.from(file.buffer);
        } else if (file.buffer && file.buffer.data) {
          bufferData = Buffer.from(file.buffer.data);
        } else if (file.buffer) {
          bufferData = Buffer.from(file.buffer);
        } else {
          throw new Error('No buffer data found');
        }
        
        console.log('PDF buffer length:', bufferData.length);
        
        // Try to parse with options for better text extraction
        const pdfOptions = {
          pagerender: function(pageData) {
            // Try to extract text with different strategies
            return pageData.getTextContent().then(function(textContent) {
              let lastY, text = '';
              for (let item of textContent.items) {
                if (lastY == item.transform[5] || !lastY) {
                  text += item.str;
                } else {
                  text += '\n' + item.str;
                }
                lastY = item.transform[5];
              }
              return text;
            });
          },
          max: 0 // 0 means parse all pages
        };
        
        const pdfData = await pdfParse(bufferData, pdfOptions);
        extractedText = pdfData.text;
        
        console.log('PDF text extracted, length:', extractedText.length);
        console.log('First 500 chars of extracted text:', extractedText.substring(0, 500));
        
        // Check if text extraction was successful
        if (!extractedText || extractedText.trim().length < 10) {
          console.warn('⚠️ PDF text extraction may have failed. Extracted text is too short or empty.');
          
          // Try alternative: simple extraction without custom pagerender
          console.log('Trying alternative extraction method...');
          const pdfDataSimple = await pdfParse(bufferData);
          extractedText = pdfDataSimple.text;
          console.log('Alternative extraction length:', extractedText.length);
        }
        
      } catch (pdfError) {
        console.error('❌ PDF parsing error:', pdfError.message);
        console.error('Stack:', pdfError.stack);
        
        // Fallback: Try to extract as text
        try {
          if (file.buffer && file.buffer.toString) {
            extractedText = file.buffer.toString('utf-8', 0, 10000);
            console.log('Fallback text extraction (first 1000 chars):', extractedText.substring(0, 1000));
          }
        } catch (fallbackError) {
          console.error('Fallback extraction failed:', fallbackError);
          extractedText = 'PDF parsing failed. Could not extract text.';
        }
      }
    } 
    // For text files
    else if (file.type.includes('text') || file.name.endsWith('.txt')) {
      extractedText = file.buffer.toString('utf-8');
      console.log('Text file extracted, length:', extractedText.length);
    }
    // For other file types
    else {
      console.log('Unsupported file type, attempting to extract as text:', file.type);
      try {
        extractedText = file.buffer.toString('utf-8', 0, 10000);
      } catch {
        extractedText = '';
      }
    }

    // If we have extracted text, parse it
    if (extractedText && extractedText.trim().length > 10) {
      console.log('✅ Successfully extracted text, sending to AI...');
      return await parseTextProposal(extractedText);
    } else {
      console.error('❌ Could not extract meaningful text from file');
      return {
        success: false,
        error: "Could not extract readable text from PDF. The PDF might be scanned or image-based.",
        totalPrice: 0,
        deliveryTimeline: "Not specified",
        paymentTerms: "Not specified",
        warranty: "Not specified",
        title: "Not specified",
        items: [],
        budget: "Not specified",
        quantity: "Not specified",
        specifications: "Not specified",
        vendorName: "Not specified",
        rfpReference: "Not specified",
        notes: "Text extraction failed. The PDF might be scanned or contain only images.",
        score: 0,
        summary: "Could not extract text from PDF"
      };
    }

  } catch (error) {
    console.error('❌ Error in parseProposalFromEmail:', error);
    return {
      success: false,
      error: error.message || "AI parsing failed",
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    };
  }
};
// Helper function to parse text content
const parseTextProposal = async (emailContent) => {
  try {
    const prompt = `
You are an expert procurement analyst. Extract the following information from the proposal document:

EXTRACT THESE FIELDS:
1. totalPrice - Total price/cost in USD (extract as number)
2. deliveryTimeline - Delivery timeline/duration
3. paymentTerms - Payment terms (e.g., Net 30, Net 60)
4. warranty - Warranty information
5. title - The title or subject of the proposal
6. items - List of items/products/services being offered
7. budget - Budget mentioned (if any)
8. quantity - Total quantity (if mentioned)
9. specifications - Technical specifications
10. vendorName - Vendor/company name
11. rfpReference - RFP reference/ID if mentioned
12. notes - Any additional notes

FORMAT INSTRUCTIONS:
- For items: Return as array if multiple items, or string if single item
- For price/budget: Extract numeric values only (remove $, USD, etc.)
- For delivery: Extract timeline in clear text
- If a field is not found, use "Not specified"
- Clean the text but keep it readable

Original text:
"""
${emailContent.substring(0, 15000)}  // Limit to prevent token overflow
"""

Return ONLY a JSON object with these fields. No other text, no markdown, no code blocks.

Expected JSON format:
{
  "totalPrice": 14850,
  "deliveryTimeline": "2 weeks",
  "paymentTerms": "Net 30",
  "warranty": "3-year onsite warranty",
  "title": "Proposal for Laptop Procurement",
  "items": ["Business Laptop - 16GB RAM, i5 12th Gen, 512GB SSD, 14-inch FHD"],
  "budget": 15000,
  "quantity": 10,
  "specifications": "16GB RAM, i5 12th Gen Processor, 512GB SSD, 14-inch FHD Display",
  "vendorName": "TechNova Supplies",
  "rfpReference": "RFP-BD2ACA",
  "notes": "Bulk purchase discount applied",
  "score": 95,
  "summary": "Vendor TechNova Supplies proposes 10 business laptops for $14,850 with 2-week delivery"
}
`;

    const response = await client.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.1,
      response_format: { type: "json_object" }
    });

    const aiText = response.choices[0].message.content;
    console.log("AI Proposal Response:", aiText);
    
    let parsed;
    try {
      parsed = JSON.parse(aiText);
      console.log("Parsed Proposal:", parsed);
    } catch (parseError) {
      console.error("JSON parsing error:", parseError);
      // Try to extract JSON from text
      const jsonMatch = aiText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          parsed = JSON.parse(jsonMatch[0]);
        } catch {
          throw new Error("No valid JSON found in AI response");
        }
      } else {
        throw new Error("No JSON found in AI response");
      }
    }

    // Calculate AI score based on completeness
    const requiredFields = ['title', 'items', 'totalPrice', 'deliveryTimeline'];
    const filledFields = requiredFields.filter(field => 
      parsed[field] && 
      parsed[field] !== 'Not specified' && 
      parsed[field] !== '' &&
      !(Array.isArray(parsed[field]) && parsed[field].length === 0)
    );
    
    const score = Math.round((filledFields.length / requiredFields.length) * 100);
    
    // Ensure all fields exist with defaults
    const result = {
      success: true,
      extractedText: emailContent.substring(0, 500) + '...',
      ...parsed,
      score: parsed.score || score,
      summary: parsed.summary || `Proposal from ${parsed.vendorName || 'unknown vendor'} for ${parsed.title || 'unspecified items'}`,
      rawTextPreview: emailContent.substring(0, 300) + '...',
      // Default values for missing fields
      totalPrice: parsed.totalPrice || 0,
      deliveryTimeline: parsed.deliveryTimeline || 'Not specified',
      paymentTerms: parsed.paymentTerms || 'Not specified',
      warranty: parsed.warranty || 'Not specified',
      title: parsed.title || 'Not specified',
      items: Array.isArray(parsed.items) ? parsed.items : [parsed.items].filter(Boolean),
      budget: parsed.budget || 'Not specified',
      quantity: parsed.quantity || 'Not specified',
      specifications: parsed.specifications || 'Not specified',
      vendorName: parsed.vendorName || 'Not specified',
      rfpReference: parsed.rfpReference || 'Not specified',
      notes: parsed.notes || 'Not specified'
    };

    console.log('Parsing completed. Score:', result.score);
    return result;

  } catch (error) {
    console.error("AI Proposal parsing error:", error);
    return {
      success: false,
      error: error.message || "AI parsing failed",
      totalPrice: 0,
      deliveryTimeline: "Not specified",
      paymentTerms: "Not specified",
      warranty: "Not specified",
      title: "Not specified",
      items: [],
      budget: "Not specified",
      quantity: "Not specified",
      specifications: "Not specified",
      vendorName: "Not specified",
      rfpReference: "Not specified",
      notes: "Parsing failed: " + error.message,
      score: 0,
      summary: "AI parsing failed"
    };
  }
};

// Add this export - Compare proposals function
export const compareProposals = async (proposals, rfp) => {
  try {
    const prompt = `
Compare these vendor proposals:

RFP: ${rfp?.title || 'No title'}
Budget: ${rfp?.budget || 'Not specified'}

Proposals:
${JSON.stringify(proposals, null, 2)}

Analyze and provide:
1. Best value proposal (considering price, delivery, terms)
2. Comparison matrix
3. Recommendation with justification
4. Risk assessment

Return JSON with analysis and recommendation.
Focus on price, delivery, terms, and value.
`;

    const response = await client.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.1,
      response_format: { type: "json_object" }
    });

    const aiText = response.choices[0].message.content;
    console.log("AI Comparison Response:", aiText);
    
    let parsed;
    try {
      parsed = JSON.parse(aiText);
    } catch (parseError) {
      console.error("JSON parsing error in comparison:", parseError);
      // Try to extract JSON from text
      const jsonMatch = aiText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          parsed = JSON.parse(jsonMatch[0]);
        } catch {
          parsed = {
            summary: "Comparison analysis",
            recommendation: "Manual review needed",
            analysis: "Could not parse AI response",
            bestValue: "Not determined",
            comparisonMatrix: []
          };
        }
      } else {
        parsed = {
          summary: "AI comparison completed",
          recommendation: "Review manually",
          bestValue: "Not determined",
          notes: "AI response format was invalid"
        };
      }
    }

    return parsed;

  } catch (error) {
    console.error("AI Comparison error:", error);
    return {
      summary: "AI comparison failed",
      recommendation: "Review manually",
      error: error.message,
      bestValue: "Not determined",
      comparisonMatrix: []
    };
  }
};

// Alternative: If compareProposals is already defined differently, you might need to check the existing function.
// If the function exists but isn't exported, make sure it has the "export" keyword.

// Keep default export for backward compatibility
export default client;