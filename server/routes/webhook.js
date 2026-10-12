const express = require('express');
const router = express.Router();
const conversation = require('../conversation');

router.post('/inbound', async (req, res) => {
  try {
    const { order_id, customer_phone, customer_name, product_name, brand_id } = req.body;
    if (!brand_id || !customer_phone || !customer_name || !product_name) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const result = await conversation.startConversation(brand_id, customer_phone, customer_name, product_name);
    res.json({ success: true, conversation_id: result.id, opening_message: result.opening_message });
  } catch (error) {
    console.error('Webhook inbound error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/whatsapp-reply', async (req, res) => {
  try {
    const { conversation_id, message } = req.body;
    if (!conversation_id || !message) {
      return res.status(400).json({ error: 'conversation_id and message required' });
    }

    const result = await conversation.handleCustomerReply(conversation_id, message);
    res.json({ success: true, ai_reply: result.aiReply, conversation_complete: result.conversationComplete, insights: result.insights });
  } catch (error) {
    console.error('Webhook reply error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;