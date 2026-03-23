require('dotenv').config();
const https = require('https');

const botToken = process.env.TELEGRAM_BOT_TOKEN;
const chatId = process.env.TELEGRAM_CHAT_ID;

const rawText = "測試 POST 發送！\n換行測試：這是一個測試。";

const postData = JSON.stringify({
  chat_id: chatId,
  text: rawText
});

const options = {
  hostname: 'api.telegram.org',
  port: 443,
  path: `/bot${botToken}/sendMessage`,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

const req = https.request(options, (res) => {
  let chunks = '';
  res.on('data', d => chunks += d);
  res.on('end', () => console.log('Response:', chunks));
});

req.on('error', (e) => {
  console.error('Crash error:', e);
});

req.write(postData);
req.end();
