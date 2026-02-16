if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const dayjs = require('dayjs');

const config = require('./config');
const {
    getEmployeeByTelegramId,
    getTodayAttendanceRow,
    createCheckIn,
    applyCheckOut
} = require('./sheets');

const {
    isWithinOfficeRadius,
    getAttendanceStatus
} = require('./utils');

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'Employee Attendance Bot API',
    status: 'running',
    port: PORT
  });
});

// Telegram webhook endpoint
app.post('/webhook', (req, res) => {
  const update = req.body;
  
  // Handle Telegram updates here
  if (update.message) {
    handleMessage(update.message);
  }
  
  res.status(200).send('OK');
});

// Bot message handling logic
async function handleMessage(msg) {
  const chatId = msg.chat.id;
  const telegramId = msg.from.id;

  try {
    if (msg.text === '/start') {
      const employee = await getEmployeeByTelegramId(telegramId);
      if (!employee) {
        return bot.sendMessage(
          chatId,
          "❌ Siz ro‘yxatdan o‘tmagansiz yoki faol emassiz.\nAdmin bilan bog‘laning."
        );
      }

      return bot.sendMessage(
        chatId,
        `✅ Xush kelibsiz, ${employee.get('Name')}!`,
        {
          reply_markup: {
            keyboard: [
              ['🟢 Check In'],
              ['🔴 Check Out']
            ],
            resize_keyboard: true
          }
        }
      );
    }

    // Handle other message types...
  } catch (err) {
    console.error(err);
    bot.sendMessage(chatId, '❌ Xatolik yuz berdi');
  }
}

// Initialize Telegram Bot
const bot = new TelegramBot(config.telegram.token);

// Set webhook (only in production)
if (process.env.NODE_ENV === "production") {
  const webhookUrl = `https://${process.env.FLY_APP_NAME}.fly.dev/webhook`;
  bot.setWebHook(webhookUrl).then(() => {
    console.log(`Webhook set to: ${webhookUrl}`);
  });
} else {
  // Use polling for local development
  bot.startPolling();
  console.log('Bot started with polling');
}

// Start server
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
