const geolib = require('geolib');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');        // timezone uchun kerak
const timezone = require('dayjs/plugin/timezone'); // timezone uchun

dayjs.extend(utc);
dayjs.extend(timezone);

const config = require('./config');

// Default qiymatlar (config da bo'lmasa ishlatiladi)
const DEFAULT_OFFICE = {
  lat: 41.2995,         // masalan Toshkent markazi
  lng: 69.2401,
  radius: 15000000000             // metrda, 150 metr ichida deb hisoblaydi
};

const DEFAULT_WORK_START = '09:00';     // 24 soat formatida
const DEFAULT_GRACE_MINUTES = 15;

/**
 * Ofis radiusini tekshirish
 * @param {number} lat 
 * @param {number} lng 
 * @returns {boolean}
 */
function isWithinOfficeRadius(lat, lng) {
  const officeLat = config.office?.lat ?? DEFAULT_OFFICE.lat;
  const officeLng = config.office?.lng ?? DEFAULT_OFFICE.lng;
  const radius = config.office?.radius ?? DEFAULT_OFFICE.radius;

  if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng)) {
    console.warn('Noto‘g‘ri koordinatalar:', { lat, lng });
    return false;
  }

  const distance = geolib.getDistance(
    { latitude: lat, longitude: lng },
    { latitude: officeLat, longitude: officeLng }
  );

  return distance <= radius;
}

/**
 * Check-in vaqtiga qarab holatni aniqlash
 * @param {dayjs.Dayjs | string | Date} checkInTime 
 * @returns {'Present' | 'Late' | 'Invalid'}
 */
function getAttendanceStatus(checkInTime) {
  let time = dayjs(checkInTime);

  // agar noto‘g‘ri format bo‘lsa
  if (!time.isValid()) {
    console.warn('Noto‘g‘ri vaqt formati:', checkInTime);
    return 'Invalid';
  }

  // Tashkent vaqt zonasiga o‘tkazamiz (UTC dan)
  time = time.tz('Asia/Tashkent');

  const workStartStr = config.workTime?.start ?? DEFAULT_WORK_START;
  const graceMinutes = Number(config.workTime?.graceMinutes) ?? DEFAULT_GRACE_MINUTES;

  const workStart = dayjs.tz(
    `${time.format('YYYY-MM-DD')} ${workStartStr}`,
    'YYYY-MM-DD HH:mm',
    'Asia/Tashkent'
  );

  const graceEnd = workStart.add(graceMinutes, 'minute');

  if (time.isAfter(graceEnd)) {
    return 'Late';
  }

  // agar juda erta bo‘lsa ham "Present" deb hisoblaymiz (agar kerak bo‘lmasa shart qo‘shsa bo‘ladi)
  return 'Present';
}

module.exports = {
  isWithinOfficeRadius,
  getAttendanceStatus
};