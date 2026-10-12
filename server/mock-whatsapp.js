// TO GO LIVE: replace send() with a POST request to your BSP API endpoint
// Interakt: POST https://api.interakt.ai/v1/public/message/
// AiSensy: POST https://backend.aisensy.com/campaign/t1/api/v2
// Set WHATSAPP_API_KEY and WHATSAPP_PHONE_NUMBER_ID in .env

async function send(phone, message) {
  console.log(`[WhatsApp → ${phone}] ${message}`);
  return { success: true, mock: true };
}

module.exports = { send };