const express = require('express');
const router = express.Router();
const db = require('../db');
const conversation = require('../conversation');

const PERSONAS = {
  'voltedge': [
    { name: 'Riya', description: 'happy overall but noticed battery drains in 4 hours not 6 as advertised', used: false },
    { name: 'Arjun', description: 'very unhappy, connectivity drops every hour, considering returning', used: false },
    { name: 'Priya', description: 'loves the sound quality, first-time earbuds buyer, no complaints', used: false },
    { name: 'Karan', description: 'mentions BoAt is cheaper and has better battery, considering switching', used: false },
    { name: 'Meera', description: 'packaging was damaged on arrival, product fine but first impression bad', used: false },
    { name: 'Dev', description: 'loves them, bought as gift, wants to buy another pair for himself', used: false },
    { name: 'Sneha', description: 'hinge feels wobbly, worried it will break, otherwise satisfied', used: false },
    { name: 'Rohit', description: 'mixed — great sound, battery acceptable, case hinge is a concern', used: false }
  ],
  'glowrite': [
    { name: 'Anjali', description: 'saw no results after 2 weeks, disappointed, considering Minimalist', used: false },
    { name: 'Vikram', description: 'loves the product, already ordered second bottle', used: false },
    { name: 'Pooja', description: 'mild tingling bothered her first week, now seeing good results', used: false },
    { name: 'Rahul', description: 'pump jammed after 10 uses, had to use a pin to fix it', used: false },
    { name: 'Kavya', description: 'noticed brighter skin in 10 days, recommending to friends', used: false },
    { name: 'Amit', description: 'compares it favorably to The Ordinary, happy with value', used: false },
    { name: 'Nisha', description: 'wants a moisturizer from the same brand next', used: false }
  ],
  'nestcraft': [
    { name: 'Sunita', description: 'loves the piece, knots slightly uneven but adds to handmade charm', used: false },
    { name: 'Prakash', description: 'color in real life darker than photos, slightly disappointed', used: false },
    { name: 'Divya', description: 'delighted, bought as housewarming gift, friend loved it', used: false },
    { name: 'Arun', description: 'shipping took 12 days, product great but delay caused gifting issues', used: false },
    { name: 'Lakshmi', description: 'wants to buy more but price feels high for repeat purchase', used: false }
  ]
};

function getBrandKey(brandId) {
  const brandMap = {
    'brand-voltedge': 'voltedge',
    'brand-glowrite': 'glowrite',
    'brand-nestcraft': 'nestcraft'
  };
  return brandMap[brandId] || 'voltedge';
}

function pickUnusedPersona(brandKey) {
  const list = PERSONAS[brandKey] || PERSONAS.voltedge;
  const unused = list.filter(p => !p.used);
  if (unused.length === 0) {
    list.forEach(p => p.used = false);
    return list[0];
  }
  const persona = unused[Math.floor(Math.random() * unused.length)];
  persona.used = true;
  return persona;
}

router.post('/trigger', async (req, res) => {
  try {
    const { brand_id } = req.body;
    if (!brand_id) return res.status(400).json({ error: 'brand_id required' });

    const brand = await db.get('SELECT * FROM brands WHERE id = ?', [brand_id]);
    if (!brand) return res.status(404).json({ error: 'Brand not found' });

    const brandKey = getBrandKey(brand_id);
    const persona = pickUnusedPersona(brandKey);

    const customerPhone = `+91${Math.floor(1000000000 + Math.random() * 9000000000)}`;
    const result = await conversation.startConversation(brand_id, customerPhone, persona.name, brand.name);

    res.json({
      conversation_id: result.id,
      opening_message: result.opening_message,
      customer_name: persona.name,
      product_name: brand.name,
      persona_description: persona.description
    });
  } catch (error) {
    console.error('Demo trigger error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;