require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db');
const webhookRoutes = require('./routes/webhook');
const apiRoutes = require('./routes/api');
const demoRoutes = require('./routes/demo');

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'client', 'public')));

app.use('/webhook', webhookRoutes);
app.use('/api', apiRoutes);
app.use('/demo', demoRoutes);

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'client', 'public', 'index.html'));
});

async function start() {
  await db.initializeDatabase();
  console.log('Database initialized');

  const server = app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
  
  server.on('error', (err) => {
    console.error('Server error:', err);
  });
}

start().catch(console.error);