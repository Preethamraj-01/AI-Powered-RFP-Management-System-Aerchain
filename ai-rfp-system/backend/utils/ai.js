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

// Helper function to detect and extract currency
const extractPriceWithCurrency = (text) => {
  if (!text || text === 'Not specified' || text === '') {
    return "Not specified";
  }
  
  // If already an object (from previous extraction), return as is
  if (typeof text === 'object' && text !== null) {
    return text;
  }
  
  const textStr = text.toString();
  console.log(`🔍 extractPriceWithCurrency input: "${textStr}"`);
  
  // Special handling for Rs. pattern - check first
  if (textStr.toLowerCase().includes('rs')) {
    console.log('⚠️ Detected "Rs" in text, treating as INR');
    const match = textStr.match(/Rs\.?\s*([\d,.]+)/i);
    if (match) {
      const value = match[1].replace(/,/g, '');
      console.log(`✅ Extracted Rs. value: ${value}`);
      return {
        value: parseFloat(value) || 0,
        formatted: `₹${parseFloat(value).toLocaleString()}`,
        currency: 'INR',
        currencyName: 'Indian Rupees',
        symbol: '₹',
        raw: textStr,
        original: `Rs.${value}`
      };
    }
  }
  
  const currencyPatterns = [
    { symbol: '₹', code: 'INR', name: 'Indian Rupees', pattern: /₹\s*([\d,.]+)/ },
    { symbol: 'Rs.', code: 'INR', name: 'Indian Rupees', pattern: /Rs\.\s*([\d,.]+)/i },
    { symbol: 'Rs', code: 'INR', name: 'Indian Rupees', pattern: /Rs\s*([\d,.]+)/i },
    { symbol: '$', code: 'USD', name: 'US Dollars', pattern: /\$\s*([\d,.]+)/ },
    { symbol: '€', code: 'EUR', name: 'Euros', pattern: /€\s*([\d,.]+)/ },
    { symbol: '£', code: 'GBP', name: 'British Pounds', pattern: /£\s*([\d,.]+)/ },
    { symbol: '¥', code: 'JPY', name: 'Japanese Yen', pattern: /¥\s*([\d,.]+)/ },
    { symbol: 'A$', code: 'AUD', name: 'Australian Dollars', pattern: /A\$\s*([\d,.]+)/ },
    { symbol: 'C$', code: 'CAD', name: 'Canadian Dollars', pattern: /C\$\s*([\d,.]+)/ }
  ];
  
  // Look for currency symbols
  for (const currency of currencyPatterns) {
    const match = textStr.match(currency.pattern);
    if (match) {
      const value = match[1].replace(/,/g, '');
      console.log(`✅ Found ${currency.code}: ${currency.symbol}${value}`);
      return {
        value: parseFloat(value) || 0,
        formatted: `${currency.symbol}${parseFloat(value).toLocaleString()}`,
        currency: currency.code,
        currencyName: currency.name,
        symbol: currency.symbol,
        raw: textStr
      };
    }
  }
  
  // If no symbol found, try to extract just the number
  const numberMatch = textStr.match(/([\d,.]+)/);
  if (numberMatch) {
    const value = numberMatch[1].replace(/,/g, '');
    console.log(`ℹ️ No currency symbol found, extracted number: ${value}`);
    return {
      value: parseFloat(value) || 0,
      formatted: value,
      currency: 'UNKNOWN',
      currencyName: 'Unknown Currency',
      symbol: '',
      raw: textStr
    };
  }
  
  console.log(`❌ Could not extract price from: "${textStr}"`);
  return {
    value: 0,
    formatted: textStr,
    currency: 'UNKNOWN',
    currencyName: 'Unknown Currency',
    symbol: '',
    raw: textStr
  };
};

// Updated parseProposalFromEmail to handle files
export const parseProposalFromEmail = async (file) => {
  try {
    console.log('parseProposalFromEmail: Starting with file:', file.name);
    
    let extractedText = '';
    
    // Extract text from PDF
    if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
      try {
        // Wait for pdfParse to load if needed
        if (!pdfParse) {
          const module = await import('pdf-parse');
          pdfParse = module.default || module;
        }
        
        const pdfData = await pdfParse(file.buffer);
        extractedText = pdfData.text;
        console.log('PDF text extracted, length:', extractedText.length);
      } catch (pdfError) {
        console.error('PDF parsing error:', pdfError);
        // Fallback to text content
        const textContent = file.buffer?.toString('utf-8') || '';
        return await parseTextProposal(textContent || 'PDF parsing failed. Using fallback text extraction.');
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
        // Try to extract as text anyway
        extractedText = file.buffer.toString('utf-8', 0, 10000);
      } catch {
        extractedText = '';
      }
    }

    // If we have extracted text, parse it
    if (extractedText && extractedText.trim().length > 0) {
      return await parseTextProposal(extractedText);
    } else {
      // Fallback for empty text
      return {
        success: false,
        error: "Could not extract text from file",
        totalPrice: { value: 0, formatted: "$0", currency: "USD", currencyName: "US Dollars", symbol: "$" },
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
        notes: "No text could be extracted from the file",
        score: 0,
        summary: "Text extraction failed"
      };
    }

  } catch (error) {
    console.error('Error in parseProposalFromEmail:', error);
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
    // IMPORTANT: Check if content contains Rs. or similar patterns
    console.log('📄 Checking for currency patterns in email content...');
    const hasRs = emailContent.toLowerCase().includes('rs.');
    const hasRupeeSymbol = emailContent.includes('₹');
    const hasDollar = emailContent.includes('$');
    const hasEuro = emailContent.includes('€');
    
    console.log('Currency detection:', {
      hasRs,
      hasRupeeSymbol,
      hasDollar,
      hasEuro
    });
    
    // Build dynamic prompt based on detected currency
    let currencyHint = '';
    if (hasRs || hasRupeeSymbol) {
      currencyHint = 'IMPORTANT: The document contains "Rs." or "₹" symbols. When extracting prices, use "Rs." or "₹" NOT "$".';
    } else if (hasEuro) {
      currencyHint = 'IMPORTANT: The document contains "€" symbols. When extracting prices, use "€" NOT "$".';
    }
    
    const prompt = `
You are an expert procurement analyst. Extract the following information from the proposal document:

EXTRACT THESE FIELDS:
1. totalPrice - Total price/cost with original currency symbol (e.g., "$14,850", "Rs.1000", "₹5000", "€850")
2. deliveryTimeline - Delivery timeline/duration
3. paymentTerms - Payment terms (e.g., Net 30, Net 60)
4. warranty - Warranty information
5. title - The title or subject of the proposal
6. items - List of items/products/services being offered
7. budget - Budget mentioned (if any) with original currency symbol
8. quantity - Total quantity (if mentioned)
9. specifications - Technical specifications
10. vendorName - Vendor/company name
11. rfpReference - RFP reference/ID if mentioned
12. notes - Any additional notes

CRITICAL CURRENCY INSTRUCTIONS:
${currencyHint}
- PRESERVE ORIGINAL CURRENCY SYMBOLS: Extract exactly as written in the document
- DO NOT convert currencies (e.g., if you see "Rs.1000", extract as "Rs.1000" NOT "$1000")
- DO NOT add currency symbols if they are not present in the original text
- If text says "Total: Rs.1000", extract "totalPrice": "Rs.1000"
- If text says "Price: $1,295", extract "totalPrice": "$1,295"
- If text says "Cost: €850", extract "totalPrice": "€850"
- If text says "Amount: ₹5000", extract "totalPrice": "₹5000"

FORMAT INSTRUCTIONS:
- For items: Return as array if multiple items, or string if single item
- For price/budget: Extract WITH original currency symbols
- For delivery: Extract timeline in clear text
- If a field is not found, use "Not specified"
- Clean the text but keep it readable

Original text:
"""
${emailContent.substring(0, 15000)}  // Limit to prevent token overflow
"""

Return ONLY a JSON object with these fields. No other text, no markdown, no code blocks.

IMPORTANT EXAMPLES:
1. If text says "Total: Rs.1000", extract: "totalPrice": "Rs.1000"
2. If text says "Price: $1,295.00", extract: "totalPrice": "$1,295.00"
3. If text says "Cost: €850", extract: "totalPrice": "€850"
4. If text says "Amount: ₹5000", extract: "totalPrice": "₹5000"
5. If text says "Budget: Rs.50000", extract: "budget": "Rs.50000"

Expected JSON format:
{
  "totalPrice": "Rs.1000",
  "deliveryTimeline": "To be determined",
  "paymentTerms": "Not specified",
  "warranty": "Not specified",
  "title": "PROPOSAL FOR OFFICE FURNITURE",
  "items": ["Ergonomic Office Chairs", "Standing Desks"],
  "budget": "Not specified",
  "quantity": "Not specified",
  "specifications": "Not specified",
  "vendorName": "OfficeWorks Corp",
  "rfpReference": "Not specified",
  "notes": "Not specified",
  "score": 85,
  "summary": "OfficeWorks Corp proposes office furniture for Rs.1000"
}
`;

    console.log('🤖 Sending to AI with prompt...');
    console.log('Prompt includes currency hint:', currencyHint);
    
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
      console.log("Parsed Proposal:", JSON.stringify(parsed, null, 2));
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
    
    // DEBUG: Log what we got from AI
    console.log('🔍 DEBUG - AI returned prices:', {
      totalPrice: parsed.totalPrice,
      budget: parsed.budget,
      typeTotalPrice: typeof parsed.totalPrice,
      typeBudget: typeof parsed.budget
    });
    
    // Process prices with currency detection
    const totalPriceObj = extractPriceWithCurrency(parsed.totalPrice);
    const budgetObj = extractPriceWithCurrency(parsed.budget);
    
    console.log('💰 After currency extraction:', {
      totalPriceObj,
      budgetObj
    });
    
    // Ensure all fields exist with defaults
    const result = {
      success: true,
      extractedText: emailContent.substring(0, 500) + '...',
      ...parsed,
      score: parsed.score || score,
      summary: parsed.summary || `Proposal from ${parsed.vendorName || 'unknown vendor'} for ${parsed.title || 'unspecified items'}`,
      rawTextPreview: emailContent.substring(0, 300) + '...',
      
      // Processed price fields
      totalPrice: totalPriceObj,
      budget: budgetObj,
      
      // Default values for other fields
      deliveryTimeline: parsed.deliveryTimeline || 'Not specified',
      paymentTerms: parsed.paymentTerms || 'Not specified',
      warranty: parsed.warranty || 'Not specified',
      title: parsed.title || 'Not specified',
      items: Array.isArray(parsed.items) ? parsed.items : [parsed.items].filter(Boolean),
      quantity: parsed.quantity || 'Not specified',
      specifications: parsed.specifications || 'Not specified',
      vendorName: parsed.vendorName || 'Not specified',
      rfpReference: parsed.rfpReference || 'Not specified',
      notes: parsed.notes || 'Not specified'
    };

    console.log('✅ Parsing completed. Score:', result.score);
    console.log('💰 Final price details:', {
      totalPrice: result.totalPrice,
      budget: result.budget,
      totalPriceFormatted: result.totalPrice?.formatted,
      totalPriceCurrency: result.totalPrice?.currency
    });
    
    return result;

  } catch (error) {
    console.error("AI Proposal parsing error:", error);
    return {
      success: false,
      error: error.message || "AI parsing failed",
      totalPrice: { value: 0, formatted: "$0", currency: "USD", currencyName: "US Dollars", symbol: "$" },
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

// Helper function to fix AI's currency conversion issue
const fixAICurrencyMistakes = (text, originalEmailContent) => {
  if (!text || typeof text !== 'string') return text;
  
  // Check if AI incorrectly added $ when original had Rs.
  if (text.includes('$') && originalEmailContent.toLowerCase().includes('rs.')) {
    console.log('⚠️ AI incorrectly used $ when Rs. was in original');
    
    // Extract the number from AI's response
    const numMatch = text.match(/\$?\s*([\d,.]+)/);
    if (numMatch) {
      const value = numMatch[1].replace(/,/g, '');
      console.log(`🔄 Converting $${value} to Rs.${value}`);
      return `Rs.${value}`;
    }
  }
  
  return text;
};

// Alternative parsing function that's more aggressive about currency
export const parseProposalFromEmailAlternative = async (file) => {
  try {
    console.log('🔄 Using alternative parsing method...');
    
    let extractedText = '';
    
    // Extract text
    if (file.type.includes('text') || file.name.endsWith('.txt')) {
      extractedText = file.buffer.toString('utf-8');
    } else {
      extractedText = file.buffer.toString('utf-8', 0, 10000);
    }
    
    // Direct extraction without AI for testing
    const directExtraction = {
      success: true,
      title: extractField(extractedText, ['PROPOSAL FOR', 'Proposal for', 'QUOTATION FOR']),
      vendorName: extractField(extractedText, ['Vendor:', 'Company:', 'From:']),
      totalPrice: extractPriceDirect(extractedText),
      budget: extractField(extractedText, ['Budget:', 'Budget Allocation:', 'Allocated:']),
      deliveryTimeline: extractField(extractedText, ['Delivery:', 'Delivery Timeline:', 'Timeline:']),
      paymentTerms: extractField(extractedText, ['Payment Terms:', 'Payment:', 'Terms:']),
      warranty: extractField(extractedText, ['Warranty:', 'Guarantee:', 'Support:']),
      items: extractItems(extractedText),
      quantity: extractField(extractedText, ['Quantity:', 'Qty:', 'Units:']),
      specifications: extractField(extractedText, ['Specifications:', 'Specs:', 'Features:']),
      rfpReference: extractField(extractedText, ['RFP Reference:', 'Reference:', 'Ref:']),
      notes: 'Direct extraction',
      score: 70,
      summary: 'Direct text extraction (bypassing AI currency conversion)'
    };
    
    // Process the directly extracted price
    if (directExtraction.totalPrice) {
      directExtraction.totalPrice = extractPriceWithCurrency(directExtraction.totalPrice);
    }
    
    return directExtraction;
    
  } catch (error) {
    console.error('Alternative parsing error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Simple helper functions for direct extraction
const extractField = (text, keywords) => {
  for (const keyword of keywords) {
    const index = text.indexOf(keyword);
    if (index !== -1) {
      let value = text.substring(index + keyword.length, index + keyword.length + 100);
      value = value.split('\n')[0].trim();
      return value || 'Not specified';
    }
  }
  return 'Not specified';
};

const extractPriceDirect = (text) => {
  // Look for Rs. pattern first
  const rsMatch = text.match(/Rs\.?\s*([\d,.]+)/i);
  if (rsMatch) {
    return `Rs.${rsMatch[1]}`;
  }
  
  // Look for $ pattern
  const dollarMatch = text.match(/\$\s*([\d,.]+)/);
  if (dollarMatch) {
    return `$${dollarMatch[1]}`;
  }
  
  // Look for any number that might be a price
  const priceMatch = text.match(/(?:Total|Price|Cost|Amount)[:\s]*([\d,.]+)/i);
  if (priceMatch) {
    // Check context to guess currency
    const context = text.substring(Math.max(0, priceMatch.index - 50), priceMatch.index + 50).toLowerCase();
    if (context.includes('rs') || context.includes('inr') || context.includes('rupee')) {
      return `Rs.${priceMatch[1]}`;
    } else if (context.includes('$') || context.includes('usd') || context.includes('dollar')) {
      return `$${priceMatch[1]}`;
    } else {
      return priceMatch[1]; // Return just the number
    }
  }
  
  return 'Not specified';
};

const extractItems = (text) => {
  const items = [];
  const lines = text.split('\n');
  let inItemsSection = false;
  
  for (const line of lines) {
    if (line.toLowerCase().includes('items:')) {
      inItemsSection = true;
      continue;
    }
    
    if (inItemsSection) {
      if (line.trim().startsWith('-') || line.trim().startsWith('•')) {
        items.push(line.trim().substring(1).trim());
      } else if (line.trim() === '' && items.length > 0) {
        break; // End of items section
      }
    }
  }
  
  return items.length > 0 ? items : ['Not specified'];
};

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

// Keep default export for backward compatibility
export default client;