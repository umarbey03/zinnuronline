function requireEnv(name) {
  if (!process.env[name]) {
    console.warn(`Missing environment variable: ${name}`);
  }
}

require("dotenv").config();

// Default qiymatlar – agar .env da bo'lmasa
const defaults = {
    OFFICE_LATITUDE: 41.2995,          // Toshkent markazi misoli
    OFFICE_LONGITUDE: 69.2401,
    OFFICE_RADIUS_METERS: 150000000,         // metr
    WORK_START_TIME: '09:00',
    GRACE_PERIOD_MINUTES: 15,
    WORK_END_TIME: '18:00'             // hozir ishlatilmasa ham saqlab qo'yish mumkin
};

requireEnv("GOOGLE_PRIVATE_KEY");
requireEnv("GOOGLE_CLIENT_EMAIL");
requireEnv("GOOGLE_PROJECT_ID");

module.exports = {
    telegram: {
        token: process.env.TELEGRAM_BOT_TOKEN || '',
        adminId: process.env.ADMIN_TELEGRAM_ID || ''
    },

    office: {
        lat: parseFloat(process.env.OFFICE_LATITUDE ?? defaults.OFFICE_LATITUDE),
        lng: parseFloat(process.env.OFFICE_LONGITUDE ?? defaults.OFFICE_LONGITUDE),
        radius: parseInt(process.env.OFFICE_RADIUS_METERS ?? defaults.OFFICE_RADIUS_METERS, 10)
    },

    workTime: {
        start: process.env.WORK_START_TIME ?? defaults.WORK_START_TIME,
        end: process.env.WORK_END_TIME ?? defaults.WORK_END_TIME,
        graceMinutes: parseInt(process.env.GRACE_PERIOD_MINUTES ?? defaults.GRACE_PERIOD_MINUTES, 10)
    },

    google: {
        sheetId: process.env.GOOGLE_SHEET_ID || '',
        clientEmail: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || '',
        // Private key uchun eng ishonchli usul:
        // .env da bitta uzun qatorda saqlang, \n larni qo'lda qoldirmang
        // Misol: GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----MIIE...-----END PRIVATE KEY-----"
        privateKey: process.env.GOOGLE_PRIVATE_KEY
          ? process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n')
          : undefined,
        // Agar .env da \n larni ishlatayotgan bo'lsangiz, quyidagicha saqlang:
        // privateKey: (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n')
    }
};

// Muhim tekshiruvlar (bot ishga tushganda xatolarni oldini olish uchun)
if (!module.exports.telegram.token) {
    console.error('XATO: TELEGRAM_BOT_TOKEN .env faylda yo‘q!');
    process.exit(1);
}

if (!module.exports.google.sheetId) {
    console.error('XATO: GOOGLE_SHEET_ID .env faylda yo‘q!');
    process.exit(1);
}

if (!module.exports.google.clientEmail || !module.exports.google.privateKey) {
    console.error('XATO: Google Service Account ma\'lumotlari (.env) to‘liq emas!');
    process.exit(1);
}

if (isNaN(module.exports.office.lat) || isNaN(module.exports.office.lng)) {
    console.warn('Ogohlantirish: Ofis koordinatalari noto‘g‘ri (NaN). Default qiymatlar ishlatiladi.');
}

console.log('Config muvaffaqiyatli yuklandi');