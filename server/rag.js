const db = require('./db');
const groq = require('./groq');

async function retrieveRelevant(queryText, brandId, topK = 5) {
  const queryVector = JSON.parse(groq.generateEmbedding(queryText));
  
  const insights = await db.all(
    `SELECT * FROM extracted_insights WHERE brand_id = ? AND embedding IS NOT NULL`,
    [brandId]
  );

  const scored = insights.map(insight => {
    const storedVector = JSON.parse(insight.embedding);
    const similarity = groq.cosineSimilarity(queryVector, storedVector);
    return { ...insight, similarity };
  });

  scored.sort((a, b) => b.similarity - a.similarity);
  return scored.slice(0, topK);
}

async function answerQuestion(question, brandId) {
  console.log('answerQuestion called:', { question, brandId });
  const relevant = await retrieveRelevant(question, brandId, 5);
  console.log('Retrieved relevant:', relevant.length);
  
  if (relevant.length < 3) {
    return {
      answer: 'Not enough conversation data yet to answer this question. Need at least 3 completed conversations.',
      sourcesUsed: relevant.length,
      insights: relevant
    };
  }

  const contextBlock = relevant.map((insight, i) => 
    `[${i + 1}] Summary: ${insight.summary} | Sentiment: ${insight.sentiment} | Issue: ${insight.issue || 'none'} | Repurchase Intent: ${insight.repurchase_intent}`
  ).join('\n');

  const systemPrompt = `You are a customer intelligence analyst. Answer the business owner's question using ONLY the customer conversation data provided. Be specific and direct. Cite which conversation numbers support your answer. If the data is insufficient, say so honestly.`;

  try {
    const completion = await groq.groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Question: ${question}\n\n${contextBlock}` }
      ],
      temperature: 0.3,
      max_tokens: 400
    });

    return {
      answer: completion.choices[0].message.content.trim(),
      sourcesUsed: relevant.length,
      insights: relevant
    };
  } catch (error) {
    console.error('Groq answerQuestion error:', error.message);
    return {
      answer: 'Error generating answer. Please try again.',
      sourcesUsed: 0,
      insights: relevant
    };
  }
}

module.exports = { retrieveRelevant, answerQuestion };