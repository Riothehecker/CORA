const Groq = require('groq-sdk');
require('dotenv').config();

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const MODEL = 'llama-3.3-70b-versatile';

const ECOMMERCE_KEYWORDS = [
  'quality', 'battery', 'packaging', 'shipping', 'price', 'value',
  'sound', 'comfort', 'fit', 'design', 'durability', 'performance',
  'recommend', 'repeat', 'purchase', 'buy', 'gift', 'friend',
  'competitor', 'boAt', 'minimalist', 'ordinary', 'mamaearth',
  'wow', 'plum', 'derma', 'nikhil', 'nykaa', 'amazon',
  'flipkart', 'return', 'delivery', 'delay', 'damaged', 'broken',
  'defective', 'issue', 'problem', 'complaint', 'satisfied',
  'happy', 'love', 'great', 'excellent', 'amazing', 'good',
  'okay', 'average', 'poor', 'bad', 'terrible', 'worst',
  'battery life', 'connectivity', 'hinge', 'loose', 'wobbly',
  'pump', 'jam', 'tingling', 'sensitive', 'skin', 'results',
  'weeks', 'days', 'brighter', 'glow', 'serum', 'moisturizer',
  'knots', 'uneven', 'handmade', 'charm', 'color', 'photos',
  'darker', 'lighter', 'shipping', 'long', 'days', 'gifting',
  'repeat value', 'price', 'high', 'expensive', 'affordable',
  'feature', 'request', 'improve', 'suggestion', 'wish',
  'size', 'fit', 'small', 'large', 'sound quality', 'noise cancellation',
  'comfortable', 'uncomfortable', 'ear pain', 'connection', 'bluetooth',
  'case', 'charging', 'fast charging', 'anc', 'transparency mode',
  'results', 'dark spots', 'acne', 'pimples', 'hydration', 'moisture',
  'texture', 'smell', 'fragrance', 'absorb', 'sticky', 'greasy',
  'unique', 'beautiful', 'artistic', 'decor', 'wall', 'hanging',
  'size', 'large', 'small', 'perfect', 'exactly', 'different'
];

async function generateReply(conversationHistory, productName, brandName, knownIssues) {
  const systemPrompt = `You are a friendly post-purchase research assistant for ${brandName}. The customer just received their ${productName}. Conduct a natural 3-4 message conversation — warm, human, not like a survey. After each customer message ask ONE intelligent, specific follow-up question that probes deeper into what they said. Keep each message under 40 words. Known issues with this product to probe if relevant: ${knownIssues}. After 3-4 customer replies, thank them warmly and end your message with the token [CONVERSATION_END].`;

  const messages = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory
  ];

  try {
    const completion = await groq.chat.completions.create({
      model: MODEL,
      messages,
      temperature: 0.8,
      max_tokens: 200
    });
    return completion.choices[0].message.content.trim();
  } catch (error) {
    console.error('Groq generateReply error:', error.message);
    return "Thanks for sharing! Could you tell me a bit more about your experience?";
  }
}

async function extractInsights(conversationText, productName) {
  const systemPrompt = `You are a customer insight analyst. Extract structured data from this post-purchase conversation. Return ONLY valid JSON with these exact keys: sentiment (positive|neutral|negative), issue (string or null), competitor_mention (string or null), repurchase_intent (high|medium|low), feature_request (string or null), summary (one sentence, max 20 words)`;

  const userPrompt = `Product: ${productName}\n\nConversation:\n${conversationText}`;

  try {
    const completion = await groq.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.1,
      max_tokens: 300,
      response_format: { type: 'json_object' }
    });
    return JSON.parse(completion.choices[0].message.content);
  } catch (error) {
    console.error('Groq extractInsights error:', error.message);
    return {
      sentiment: 'neutral',
      issue: null,
      competitor_mention: null,
      repurchase_intent: 'medium',
      feature_request: null,
      summary: 'Conversation completed'
    };
  }
}

function generateEmbedding(text) {
  // Swap this for a real embedding API (Gemini, OpenAI, Cohere) before production
  const lowerText = text.toLowerCase();
  const vector = ECOMMERCE_KEYWORDS.map(keyword => 
    lowerText.includes(keyword.toLowerCase()) ? 1 : 0
  );
  return JSON.stringify(vector);
}

function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dot += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

module.exports = {
  groq,
  generateReply,
  extractInsights,
  generateEmbedding,
  cosineSimilarity
};