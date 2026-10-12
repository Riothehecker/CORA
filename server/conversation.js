const { v4: uuidv4 } = require('uuid');
const db = require('./db');
const groq = require('./groq');
const whatsapp = require('./mock-whatsapp');

async function startConversation(brandId, customerPhone, customerName, productName) {
  const brand = await db.get('SELECT * FROM brands WHERE id = ?', [brandId]);
  if (!brand) throw new Error('Brand not found');

  const conversationId = uuidv4();
  await db.run(
    `INSERT INTO conversations (id, brand_id, customer_phone, customer_name, product_name, status)
     VALUES (?, ?, ?, ?, ?, 'active')`,
    [conversationId, brandId, customerPhone, customerName, productName]
  );

  const openingMessage = `Hi ${customerName}! 👋 How's your ${productName} treating you so far?`;
  
  await db.run(
    `INSERT INTO messages (id, conversation_id, role, content) VALUES (?, ?, 'ai', ?)`,
    [uuidv4(), conversationId, openingMessage]
  );

  await whatsapp.send(customerPhone, openingMessage);

  return {
    id: conversationId,
    brand_id: brandId,
    customer_phone: customerPhone,
    customer_name: customerName,
    product_name: productName,
    status: 'active',
    opening_message: openingMessage
  };
}

async function handleCustomerReply(conversationId, customerMessage) {
  await db.run(
    `INSERT INTO messages (id, conversation_id, role, content) VALUES (?, ?, 'customer', ?)`,
    [uuidv4(), conversationId, customerMessage]
  );

  const messages = await db.all(
    `SELECT role, content FROM messages WHERE conversation_id = ? ORDER BY created_at ASC`,
    [conversationId]
  );

  // Convert roles for Groq API: 'ai' -> 'assistant', 'customer' -> 'user'
  const groqMessages = messages.map(m => ({
    role: m.role === 'ai' ? 'assistant' : 'user',
    content: m.content
  }));

  const conversation = await db.get('SELECT * FROM conversations WHERE id = ?', [conversationId]);
  const brand = await db.get('SELECT * FROM brands WHERE id = ?', [conversation.brand_id]);

  const aiReply = await groq.generateReply(groqMessages, conversation.product_name, brand.name, brand.known_issues);

  await db.run(
    `INSERT INTO messages (id, conversation_id, role, content) VALUES (?, ?, 'ai', ?)`,
    [uuidv4(), conversationId, aiReply]
  );

  await whatsapp.send(conversation.customer_phone, aiReply);

  const customerMessageCount = messages.filter(m => m.role === 'customer').length;
  const conversationComplete = aiReply.includes('[CONVERSATION_END]') || customerMessageCount >= 4;

  let insights = null;
  if (conversationComplete) {
    await db.run(`UPDATE conversations SET status = 'completed', completed_at = CURRENT_TIMESTAMP WHERE id = ?`, [conversationId]);

    const transcript = messages.map(m => `${m.role}: ${m.content}`).join('\n') + `\ncustomer: ${customerMessage}\nai: ${aiReply}`;
    const extracted = await groq.extractInsights(transcript, conversation.product_name);
    const embedding = groq.generateEmbedding(extracted.summary);

    await db.run(
      `INSERT INTO extracted_insights (id, conversation_id, brand_id, sentiment, issue, competitor_mention, repurchase_intent, feature_request, summary, embedding)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [uuidv4(), conversationId, conversation.brand_id, extracted.sentiment, extracted.issue, extracted.competitor_mention, extracted.repurchase_intent, extracted.feature_request, extracted.summary, embedding]
    );

    insights = extracted;
  }

  return { aiReply, conversationComplete, insights };
}

async function getConversation(conversationId) {
  return db.get('SELECT * FROM conversations WHERE id = ?', [conversationId]);
}

async function getMessages(conversationId) {
  return db.all('SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC', [conversationId]);
}

module.exports = { startConversation, handleCustomerReply, getConversation, getMessages };