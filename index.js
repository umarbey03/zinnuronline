if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

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

const bot = new TelegramBot(config.telegram.token, { 
  polling: {
    interval: 1000,
    autoStart: true,
    params: {
      timeout: 10
    }
  }
});

// cache faqat /start uchun
const authorizedUsers = new Map();

console.log('Bot ishga tushdi...');

/* =========================
   ERROR HANDLING
========================= */
bot.on('polling_error', (error) => {
  console.error('Polling error:', error.message);
  if (error.code === 'ENOTFOUND') {
    console.log('Network error - retrying in 5 seconds...');
    setTimeout(() => {
      console.log('Retrying connection...');
    }, 5000);
  }
});

bot.on('error', (error) => {
  console.error('Bot error:', error);
});

/* =========================
   START
========================= */
bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const telegramId = msg.from.id;

    try {
        const employee = await getEmployeeByTelegramId(telegramId);
        if (!employee) {
            return bot.sendMessage(
                chatId,
                "❌ Siz ro‘yxatdan o‘tmagansiz yoki faol emassiz.\nAdmin bilan bog‘laning."
            );
        }

        authorizedUsers.set(telegramId, employee);

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
    } catch (err) {
        console.error(err);
        bot.sendMessage(chatId, '❌ Xatolik yuz berdi');
    }
});

/* =========================
   CHECK IN / CHECK OUT
========================= */
bot.on('message', async (msg) => {
    if (!msg.text || msg.text === '/start') return;

    const chatId = msg.chat.id;
    const telegramId = msg.from.id;

    const employee = authorizedUsers.get(telegramId);
    if (!employee) {
        return bot.sendMessage(chatId, 'Iltimos avval /start ni bosing');
    }

    /* ---------- CHECK IN ---------- */
    if (msg.text === '🟢 Check In') {
        return bot.sendMessage(
            chatId,
            '📍 Check-in uchun joylashuvingizni yuboring'
        );
    }

    /* ---------- CHECK OUT ---------- */
    if (msg.text === '🔴 Check Out') {
        const todayRow = await getTodayAttendanceRow(telegramId);

        if (!todayRow) {
            return bot.sendMessage(chatId, '⚠️ Bugun check-in qilmagansiz');
        }

        if (todayRow.get('Check Out Time')) {
            return bot.sendMessage(chatId, '⚠️ Siz allaqachon check-out qilgansiz');
        }

        return bot.sendMessage(
            chatId,
            '📍 Check-out uchun joylashuvingizni yuboring'
        );
    }
});

/* =========================
   LOCATION HANDLER
========================= */
bot.on('location', async (msg) => {
    const chatId = msg.chat.id;
    const telegramId = msg.from.id;
    const { latitude, longitude } = msg.location;

    try {
        const employee = authorizedUsers.get(telegramId);
        if (!employee) return;

        if (!isWithinOfficeRadius(latitude, longitude)) {
            return bot.sendMessage(chatId, '❌ Joylashuv ofis hududida emas');
        }

        const now = dayjs();
        const time = now.format('HH:mm');

        const todayRow = await getTodayAttendanceRow(telegramId);

        /* ---------- CHECK IN ---------- */
        if (!todayRow) {
            const status = getAttendanceStatus(now);

            await createCheckIn({
                telegramId,
                employeeName: employee.get('Name'),
                time,
                lat: latitude,
                lng: longitude
            });

            return bot.sendMessage(
                chatId,
                `✅ Check-in qilindi\n🕘 ${time}`
            );
        }

        /* ---------- CHECK OUT ---------- */
        if (!todayRow.get('Check Out Time')) {
            const checkInTime = todayRow.get('Check In Time');
            const diffMinutes = now.diff(
                dayjs(checkInTime, 'HH:mm'),
                'minute'
            );
            const totalHours = (diffMinutes / 60).toFixed(2);

            await applyCheckOut({
                row: todayRow,
                time,
                lat: latitude,
                lng: longitude,
                totalHours
            });

            return bot.sendMessage(
                chatId,
                `✅ Check-out qilindi\n🕔 ${time}\n⏱ ${totalHours} soat`
            );
        }

        return bot.sendMessage(
            chatId,
            'ℹ️ Bugungi check-in va check-out yakunlangan'
        );

    } catch (err) {
        console.error(err);
        bot.sendMessage(chatId, '❌ Xatolik yuz berdi');
    }
});

/* =========================
   ERROR
========================= */
bot.on('polling_error', (err) => {
    console.error('Polling error:', err);
});
