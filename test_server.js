require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./server/db');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

app.get('/test', (req, res) => {
  res.json({ ok: true });
});

async function start() {
  await db.initializeDatabase();
  console.log('Database initialized');

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log('Server running on http://localhost:' + PORT);
  });
  
  server.on('error', (err) => {
    console.error('Server error:', err);
  });
  
  server.on('listening', () => {
    console.log('Server is listening on', server.address());
  });
}

start().catch(console.error);