const { v4: uuidv4 } = require('uuid');
const db = require('../server/db');
const groq = require('../server/groq');
const conversation = require('../server/conversation');

const PERSONAS = {
  'brand-voltedge': [
    { name: 'Riya', phone: '+919876543210', description: 'happy overall but noticed battery drains in 4 hours not 6 as advertised' },
    { name: 'Arjun', phone: '+919876543211', description: 'very unhappy, connectivity drops every hour, considering returning' },
    { name: 'Priya', phone: '+919876543212', description: 'loves the sound quality, first-time earbuds buyer, no complaints' },
    { name: 'Karan', phone: '+919876543213', description: 'mentions BoAt is cheaper and has better battery, considering switching' },
    { name: 'Meera', phone: '+919876543214', description: 'packaging was damaged on arrival, product fine but first impression bad' },
    { name: 'Dev', phone: '+919876543215', description: 'loves them, bought as gift, wants to buy another pair for himself' },
    { name: 'Sneha', phone: '+919876543216', description: 'hinge feels wobbly, worried it will break, otherwise satisfied' },
    { name: 'Rohit', phone: '+919876543217', description: 'mixed — great sound, battery acceptable, case hinge is a concern' }
  ],
  'brand-glowrite': [
    { name: 'Anjali', phone: '+919876543218', description: 'saw no results after 2 weeks, disappointed, considering Minimalist' },
    { name: 'Vikram', phone: '+919876543219', description: 'loves the product, already ordered second bottle' },
    { name: 'Pooja', phone: '+919876543220', description: 'mild tingling bothered her first week, now seeing good results' },
    { name: 'Rahul', phone: '+919876543221', description: 'pump jammed after 10 uses, had to use a pin to fix it' },
    { name: 'Kavya', phone: '+919876543222', description: 'noticed brighter skin in 10 days, recommending to friends' },
    { name: 'Amit', phone: '+919876543223', description: 'compares it favorably to The Ordinary, happy with value' },
    { name: 'Nisha', phone: '+919876543224', description: 'wants a moisturizer from the same brand next' }
  ],
  'brand-nestcraft': [
    { name: 'Sunita', phone: '+919876543225', description: 'loves the piece, knots slightly uneven but adds to handmade charm' },
    { name: 'Prakash', phone: '+919876543226', description: 'color in real life darker than photos, slightly disappointed' },
    { name: 'Divya', phone: '+919876543227', description: 'delighted, bought as housewarming gift, friend loved it' },
    { name: 'Arun', phone: '+919876543228', description: 'shipping took 12 days, product great but delay caused gifting issues' },
    { name: 'Lakshmi', phone: '+919876543229', description: 'wants to buy more but price feels high for repeat purchase' }
  ]
};

async function generateCustomerReply(personaDescription, aiMessage) {
  const systemPrompt = `You are roleplaying as a customer with this profile: ${personaDescription}. Respond naturally to this message as that customer would over WhatsApp. Keep it casual, 1-3 sentences, use natural language. Do NOT be overly formal.`;

  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: aiMessage }
      ],
      temperature: 0.8,
      max_tokens: 100
    });
    return completion.choices[0].message.content.trim();
  } catch (error) {
    console.error('Customer reply generation error:', error.message);
    return "Thanks for asking! It's been okay so far.";
  }
}

async function seed() {
  console.log('🌱 Starting seed process...\n');

  await db.initializeDatabase();

  const brands = [
    { id: 'brand-voltedge', name: 'Voltedge', product_category: 'electronics', known_issues: 'battery life shorter than advertised, case hinge feels loose, some users report connectivity drops, competitor BoAt frequently mentioned' },
    { id: 'brand-glowrite', name: 'GlowRite', product_category: 'skincare', known_issues: 'results take longer than expected, mild tingling on sensitive skin, packaging pump sometimes jams, competitor Minimalist and The Ordinary mentioned' },
    { id: 'brand-nestcraft', name: 'NestCraft', product_category: 'home decor', known_issues: 'some knots looser than expected, color slightly different from photos, shipping takes long, customers love uniqueness but question repeat value' }
  ];

  for (const brand of brands) {
    await db.run(
      `INSERT OR REPLACE INTO brands (id, name, product_category, known_issues) VALUES (?, ?, ?, ?)`,
      [brand.id, brand.name, brand.product_category, brand.known_issues]
    );
    console.log(`✅ Brand created: ${brand.name}`);
  }

  let totalConversations = 0;
  let totalMessages = 0;
  let totalInsights = 0;

  for (const [brandId, personas] of Object.entries(PERSONAS)) {
    const brand = await db.get('SELECT * FROM brands WHERE id = ?', [brandId]);
    
    for (let i = 0; i < personas.length; i++) {
      const persona = personas[i];
      totalConversations++;
      console.log(`\n📱 Seeding conversation ${totalConversations}/20: ${persona.name} (${brand.name})...`);

      try {
        const result = await conversation.startConversation(brandId, persona.phone, persona.name, brand.name);
        totalMessages += 2;
        console.log(`   AI: ${result.opening_message.substring(0, 60)}...`);

        let conversationComplete = false;
        let customerReplies = 0;

        while (!conversationComplete && customerReplies < 6) {
          await new Promise(r => setTimeout(r, 500));

          const customerReply = await generateCustomerReply(persona.description, result.opening_message);
          console.log(`   ${persona.name}: ${customerReply.substring(0, 60)}...`);
          totalMessages++;

          const handleResult = await conversation.handleCustomerReply(result.id, customerReply);
          totalMessages++;
          console.log(`   AI: ${handleResult.aiReply.substring(0, 60)}...`);

          if (handleResult.conversationComplete) {
            conversationComplete = true;
            totalInsights++;
            console.log(`   ✅ Conversation completed! Insight extracted.`);
          }

          customerReplies++;
        }

      } catch (error) {
        console.error(`   ❌ Error: ${error.message}`);
      }
    }
  }

  console.log('\n🎉 Seed complete!');
  console.log(`📊 Summary:`);
  console.log(`   Conversations: ${totalConversations}`);
  console.log(`   Messages: ${totalMessages}`);
  console.log(`   Insights extracted: ${totalInsights}`);
  
  process.exit(0);
}

seed().catch(console.error);