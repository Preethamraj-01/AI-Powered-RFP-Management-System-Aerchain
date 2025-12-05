import Groq from "groq-sdk";
import dotenv from "dotenv";

dotenv.config();

const client = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// Named exports
export const parseProposalFromEmail = async (emailContent) => {
  try {
    const prompt = `
You are an AI procurement assistant. Parse this vendor proposal email.
First, clean the text by replacing special characters:
- Replace $ with "dollars" 
- Replace % with "percent"
- Remove any quotes that might break JSON

Original text:
"""
${emailContent}
"""

Cleaned text for parsing:
"""
${emailContent.replace(/\$/g, 'dollars ').replace(/%/g, 'percent ')}
"""

Now extract structured data and return as JSON:

{
  "totalPrice": number (extract total amount),
  "deliveryTimeline": "string",
  "paymentTerms": "string",
  "warranty": "string",
  "notes": "string",
  "items": [
    {
      "itemName": "string",
      "quantity": number,
      "unitPrice": number,
      "totalPrice": number,
      "specs": "string"
    }
  ],
  "score": number (1-100),
  "summary": "string"
}

IMPORTANT: Return ONLY valid JSON. No other text.
`;

    const response = await client.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.1
    });

    const aiText = response.choices[0].message.content;
    console.log("AI Proposal Response:", aiText);
    
    const jsonMatch = aiText.match(/(\{[\s\S]*\})/);
    
    if (!jsonMatch) {
      throw new Error("No JSON found in AI response");
    }
    
    const parsed = JSON.parse(jsonMatch[0]);
    console.log("Parsed Proposal:", parsed);
    
    return parsed;
  } catch (error) {
    console.error("AI Proposal parsing error:", error);
    return {
      totalPrice: 0,
      deliveryTimeline: "Not specified",
      paymentTerms: "net 30",
      warranty: "Standard",
      notes: "Parsing failed: " + error.message,
      items: [],
      score: 50,
      summary: "AI parsing failed"
    };
  }
};

export const compareProposals = async (proposals, rfp) => {
  try {
    const prompt = `
Compare these vendor proposals:

RFP: ${rfp.title}
Budget: ${rfp.budget}

Proposals:
${JSON.stringify(proposals, null, 2)}

Return JSON with analysis and recommendation.
Focus on price, delivery, terms, and value.
`;

    const response = await client.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.1
    });

    const aiText = response.choices[0].message.content;
    const jsonMatch = aiText.match(/(\{[\s\S]*\})/);
    
    return jsonMatch ? JSON.parse(jsonMatch[0]) : {
      summary: "Comparison failed",
      recommendation: "Manual review needed"
    };
  } catch (error) {
    console.error("AI Comparison error:", error);
    return {
      summary: "AI comparison failed",
      recommendation: "Review manually"
    };
  }
};

// Keep default export for backward compatibility
export default client;