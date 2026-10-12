const express = require('express');
const router = express.Router();
const db = require('../db');
const rag = require('../rag');

router.get('/brands', async (req, res) => {
  try {
    const brands = await db.all('SELECT * FROM brands');
    res.json(brands);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/conversations', async (req, res) => {
  try {
    const { brand_id } = req.query;
    let query = 'SELECT * FROM conversations';
    const params = [];
    if (brand_id) {
      query += ' WHERE brand_id = ?';
      params.push(brand_id);
    }
    query += ' ORDER BY created_at DESC';
    const conversations = await db.all(query, params);
    res.json(conversations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/conversations/:id/messages', async (req, res) => {
  try {
    const messages = await db.all(
      'SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC',
      [req.params.id]
    );
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/insights', async (req, res) => {
  try {
    const { brand_id } = req.query;
    let query = 'SELECT * FROM extracted_insights';
    const params = [];
    if (brand_id) {
      query += ' WHERE brand_id = ?';
      params.push(brand_id);
    }
    query += ' ORDER BY created_at DESC';
    const insights = await db.all(query, params);
    res.json(insights);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/insights/summary', async (req, res) => {
  try {
    const { brand_id } = req.query;
    let where = '';
    const params = [];
    if (brand_id) {
      where = 'WHERE brand_id = ?';
      params.push(brand_id);
    }

    const total = await db.get(`SELECT COUNT(*) as count FROM conversations ${where}`, params);
    const completed = await db.get(`SELECT COUNT(*) as count FROM conversations ${where} AND status = 'completed'`, params);

    const sentiment = await db.all(
      `SELECT sentiment, COUNT(*) as count FROM extracted_insights ${where} GROUP BY sentiment`, params
    );
    const repurchase = await db.all(
      `SELECT repurchase_intent, COUNT(*) as count FROM extracted_insights ${where} GROUP BY repurchase_intent`, params
    );

    const issues = await db.all(
      `SELECT issue, COUNT(*) as count FROM extracted_insights ${where} AND issue IS NOT NULL GROUP BY issue ORDER BY count DESC LIMIT 5`, params
    );
    const competitors = await db.all(
      `SELECT competitor_mention, COUNT(*) as count FROM extracted_insights ${where} AND competitor_mention IS NOT NULL GROUP BY competitor_mention ORDER BY count DESC LIMIT 5`, params
    );
    const features = await db.all(
      `SELECT feature_request, COUNT(*) as count FROM extracted_insights ${where} AND feature_request IS NOT NULL GROUP BY feature_request ORDER BY count DESC LIMIT 5`, params
    );

    const sentimentBreakdown = { positive: 0, neutral: 0, negative: 0 };
    sentiment.forEach(s => sentimentBreakdown[s.sentiment] = s.count);

    const repurchaseBreakdown = { high: 0, medium: 0, low: 0 };
    repurchase.forEach(r => repurchaseBreakdown[r.repurchase_intent] = r.count);

    res.json({
      total_conversations: total.count,
      completed: completed.count,
      sentiment_breakdown: sentimentBreakdown,
      repurchase_breakdown: repurchaseBreakdown,
      top_issues: issues,
      competitor_mentions: competitors,
      feature_requests: features
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/ask', async (req, res) => {
  try {
    const { question, brand_id } = req.body;
    console.log('Ask API called:', { question, brand_id });
    if (!question || !brand_id) {
      return res.status(400).json({ error: 'question and brand_id required' });
    }

    const result = await rag.answerQuestion(question, brand_id);
    console.log('Ask API result:', result);
    res.json(result);
  } catch (error) {
    console.error('Ask API error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;