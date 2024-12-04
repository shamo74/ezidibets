import { createServer } from 'node:http';
import fetch from 'node-fetch';
import WebSocket from 'ws';
import express from 'express';

// إعدادات البوت
const BOT_TOKEN = '6618648466:AAFGGTIx055y0eCRvq_z3ABqchHfLsqD0M4';
const ADMIN_CHAT_ID = '6431271423';

// إعداد خادم WebSocket
const wss = new WebSocket.Server({ port: 8080 });
let clients = [];

wss.on('connection', (ws) => {
  clients.push(ws);

  ws.on('message', (message) => {
    console.log('Received:', message);
    clients.forEach(client => {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  });

  ws.on('close', () => {
    clients = clients.filter(client => client !== ws);
  });
});

// إنشاء خادم Express للتعامل مع Webhook
const app = express();
app.use(express.json());

// Webhook لاستقبال الردود من تيليجرام
app.post('/webhook', async (req, res) => {
  const { callback_query } = req.body;

  if (callback_query) {
    await handleTelegramCallback(callback_query);
  }

  res.status(200).send();
});

// التعامل مع الردود من Telegram (عند ضغط زر "قبول" أو "رفض")
async function handleTelegramCallback(callbackQuery) {
  const { data } = callbackQuery;
  if (data === 'accept') {
    const amount = 50; // المبلغ يمكن تغييره حسب الحاجة
    clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          action: 'accept',
          amount: amount,
        }));
      }
    });
    await sendMessageToTelegram(`تم قبول طلب تعبئة بمبلغ: ${amount}`);
  } else if (data === 'reject') {
    clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          action: 'reject',
        }));
      }
    });
    await sendMessageToTelegram('تم رفض طلب تعبئة.');
  }
}

// وظيفة لإرسال رسالة إلى تيليجرام
async function sendMessageToTelegram(message) {
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: ADMIN_CHAT_ID,
      text: message,
      reply_markup: JSON.stringify({
        inline_keyboard: [
          [
            { text: 'قبول ✅', callback_data: 'accept' },
            { text: 'رفض ❌', callback_data: 'reject' },
          ],
        ],
      }),
    }),
  });
}

// إعداد Webhook في تيليجرام
async function setWebhook() {
  const url = 'http://your-domain.com/webhook'; // ضع رابطك هنا
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/setWebhook?url=${url}`);
}

// بدء خادم HTTP و Webhook
createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Server is running!\n');
}).listen(3000, '127.0.0.1', () => {
  console.log('Server running on http://127.0.0.1:3000');
});

// بدء خادم Express
app.listen(3001, () => {
  console.log('Express server listening on http://127.0.0.1:3001');
});

// إعداد Webhook عند التشغيل
setWebhook();
