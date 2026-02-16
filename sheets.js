const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
const config = require('./config');

const creds = require(process.env.GOOGLE_SERVICE_ACCOUNT_PATH);

const auth = new JWT({
    email: creds.client_email,
    key: creds.private_key,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

let cachedDoc = null;

/* ---------- HELPERS ---------- */
function todayISO() {
    return new Date().toISOString().split('T')[0]; // YYYY-MM-DD
}

async function getDoc() {
    if (cachedDoc) return cachedDoc;

    cachedDoc = new GoogleSpreadsheet(config.google.sheetId, auth);
    await cachedDoc.loadInfo();
    console.log(`Google Sheet ulandi: ${cachedDoc.title}`);
    return cachedDoc;
}

async function getSheet(title) {
    const doc = await getDoc();
    const sheet = doc.sheetsByTitle[title];
    if (!sheet) throw new Error(`${title} sheet topilmadi`);
    return sheet;
}

/* ---------- EMPLOYEES ---------- */
async function getEmployeeByTelegramId(telegramId) {
    const sheet = await getSheet('Employees');
    const rows = await sheet.getRows();

    return rows.find(r =>
        String(r.get('Telegram ID')).trim() === String(telegramId).trim() &&
        String(r.get('Is Active')).toUpperCase() === 'TRUE'
    ) || null;
}

/* ---------- ATTENDANCE ---------- */
async function getTodayAttendanceRow(telegramId) {
    const sheet = await getSheet('Attendance');
    const rows = await sheet.getRows();
    const today = todayISO();

    return rows.find(r =>
        String(r.get('Telegram ID')).trim() === String(telegramId) &&
        String(r.get('Date')).trim() === today
    ) || null;
}

async function createCheckIn({
    telegramId,
    employeeName,
    time,
    lat,
    lng
}) {
    const sheet = await getSheet('Attendance');

    await sheet.addRow({
        Date: todayISO(),
        'Employee Name': employeeName,
        'Telegram ID': telegramId,
        'Check In Time': time,
        'Check In Lat': lat,
        'Check In Lng': lng,
        Status: 'IN'
    });
}

async function applyCheckOut({
    row,
    time,
    lat,
    lng,
    totalHours
}) {
    row.set('Check Out Time', time);
    row.set('Check Out Lat', lat);
    row.set('Check Out Lng', lng);
    row.set('Total Hours', totalHours);
    row.set('Status', 'OUT');
    await row.save();
}

module.exports = {
    getEmployeeByTelegramId,
    getTodayAttendanceRow,
    createCheckIn,
    applyCheckOut
};
