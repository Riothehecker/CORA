# CustomerIQ — AI-Powered Post-Purchase Customer Intelligence Platform

A hackathon prototype for an AI-driven WhatsApp post-purchase conversation platform that extracts structured insights and provides a RAG-powered dashboard for product teams.

## 🚀 Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env and add your GROQ_API_KEY from https://console.groq.com

# 3. Seed database (runs 20 full AI conversations — takes ~3-5 min)
npm run seed

# 4. Start development server
npm run dev
```

Open http://localhost:3000 to see the dashboard.

## 📦 What the Seed Script Does

- Creates 3 brands (Voltedge, GlowRite, NestCraft) with known issues
- Simulates 20 complete customer conversations (8 + 7 + 5 personas)
- Each conversation: AI opens → Groq generates realistic customer reply → AI responds → repeat 3-4 times
- After completion: extracts structured insights (sentiment, issues, competitors, repurchase intent, feature requests)
- Generates TF-IDF embeddings for RAG retrieval
- Logs progress: `Seeding conversation 3/20: Arjun (Voltedge)...`

## 🎬 Live Demo Flow

1. Open dashboard at http://localhost:3000
2. Click **▶ Trigger Live Demo** (bottom-right floating button)
3. Select a brand in the modal
4. Watch a WhatsApp-style conversation unfold in real-time (polls every 2s)
5. Dashboard auto-refreshes every 5s — summary cards, charts, and insights update live

## 🔄 Swap Mock WhatsApp for Real BSP

Replace `server/mock-whatsapp.js` `send()` function with your BSP API call:

```javascript
// Interakt
await fetch('https://api.interakt.ai/v1/public/message/', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${process.env.WHATSAPP_API_KEY}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ phoneNumber: phone, message: message, ... })
});

// AiSensy
await fetch('https://backend.aisensy.com/campaign/t1/api/v2', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${process.env.WHATSAPP_API_KEY}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ phoneNumber: phone, message: message, ... })
});
```

Required `.env` vars:
```
WHATSAPP_API_KEY=your_bsp_api_key
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
```

## 🛡️ DPDP Compliance Note

This platform assumes customers have opted in to post-purchase WhatsApp feedback at checkout. Consent is captured via a checkbox at order placement:

> "We may send a WhatsApp message after delivery to collect your feedback. Reply STOP anytime to opt out."

- Raw conversations retained for **90 days only**
- Extracted insight tags retained indefinitely in **anonymized form** (no PII)
- Customers can request data deletion via `STOP` reply or support email

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CustomerIQ Platform                       │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────┐  │
│  │   WhatsApp   │───▶│  Webhook     │───▶│  Conversation    │  │
│  │   (Mock/BSP) │    │  /inbound    │    │  State Machine   │  │
│  └──────────────┘    └──────────────┘    └────────┬─────────┘  │
│                                                   │            │
│                                                   ▼            │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────┐  │
│  │   Dashboard  │◀───│   API Routes │◀───│  SQLite Database │  │
│  │  (React CDN) │    │  /api/*      │    │  (better-sqlite3)│  │
│  └──────────────┘    └──────┬───────┘    └──────────────────┘  │
│                             │                                    │
│                    ┌────────▼────────┐                           │
│                    │   Groq LLM      │                           │
│                    │  llama-3.3-70b  │                           │
│                    │  - generateReply│                           │
│                    │  - extractInsights│                         │
│                    └─────────────────┘                           │
│                             │                                    │
│                    ┌────────▼────────┐                           │
│                    │   RAG Layer     │                           │
│                    │  (TF-IDF vector │                           │
│                    │   + cosine sim) │                           │
│                    └─────────────────┘                           │
└─────────────────────────────────────────────────────────────────┘
```

## 📁 Project Structure

```
customer-intel-platform/
├── server/
│   ├── index.js           # Express entry point
│   ├── db.js              # SQLite setup & helpers
│   ├── groq.js            # Groq API: reply, extract, embed
│   ├── conversation.js    # State machine
│   ├── rag.js             # Embedding + retrieval + QA
│   ├── mock-whatsapp.js   # Mock WhatsApp sender
│   └── routes/
│       ├── webhook.js     # /webhook/inbound, /webhook/whatsapp-reply
│       ├── api.js         # /api/* endpoints
│       └── demo.js        # /demo/trigger
├── seed/
│   ├── products.js        # 3 brand definitions
│   ├── personas.js        # 20 customer personas
│   └── seed.js            # Full conversation simulation
├── client/public/
│   ├── index.html         # Single HTML entry
│   ├── js/App.jsx         # React dashboard (CDN)
│   └── styles.css         # Tailwind + custom
├── .env.example
├── package.json
└── README.md
```

## 🛠️ Tech Stack

- **Backend**: Node.js, Express, SQLite3
- **AI**: Groq SDK (llama-llama-3.3-70b-versatile), JSON mode for extraction
- **Embeddings**: TF-IDF keyword vectors (100-dim) — swap for Gemini/OpenAI/Cohere in prod
- **Frontend**: React 18 (unpkg CDN), Tailwind (CDN), Recharts (CDN) — no build step
- **Dev**: nodemon, concurrently

## 📊 Dashboard Sections

1. **Summary Cards** — Total convos, Positive %, High Repurchase %, Top Issue
2. **Charts** — Sentiment donut, Repurchase bar chart
3. **Top Insights** — Issues, Competitors, Feature Requests (ranked)
4. **Ask Anything** — RAG-powered Q&A with 5 suggested chips
5. **Conversation Explorer** — Table + WhatsApp-style side panel

## 📝 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /webhook/inbound | Start conversation from order |
| POST | /webhook/whatsapp-reply | Handle customer reply |
| GET | /api/brands | List brands |
| GET | /api/conversations | List conversations (filter by brand) |
| GET | /api/conversations/:id/messages | Get message history |
| GET | /api/insights | List extracted insights |
| GET | /api/insights/summary | Aggregated stats |
| POST | /api/ask | RAG question answering |
| POST | /demo/trigger | Start live demo conversation |

## 🧪 Testing the Seed

```bash
npm run seed
# Watch console for:
# 🌱 Starting seed process...
# ✅ Brand created: Voltedge
# ...
# Seeding conversation 1/20: Riya (Voltedge)...
#    AI: Hi Riya! 👋 How's your Voltedge Wireless Earbuds treating you so far?
#    Riya: They sound great but battery dies after 4 hours not 6 like advertised
#    AI: Thanks for sharing! Is the battery drain consistent across all uses or mainly during calls?
#    ...
#    ✅ Conversation completed! Insight extracted.
# 🎉 Seed complete!
#    Conversations: 20
#    Messages: 180
#    Insights extracted: 20
```

## ⚠️ Known Limitations (Hackathon Scope)

- TF-IDF embeddings are a placeholder — swap for real vector embeddings
- Mock WhatsApp layer — replace with BSP integration
- Single SQLite file — not for production scale
- No auth — add JWT/session for real deploy
- Groq rate limits — seed script has 500ms delays

## 📄 License

MIT — Hackathon prototype. Use freely.