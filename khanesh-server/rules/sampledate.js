// ============================================================
// sampledate.js — تاریخِ نمونه‌گیریِ چاپ‌شده روی برگه ⇒ تاریخِ میلادیِ ISO (P108-ج، تصمیمِ کاربر ۲۰۲۶-۱۰-۱۶)
//
// کاربرد: فاصلهٔ دو نوبتِ ALT/AST («پایدار» = ≥ ۴ هفته). بی‌این، تاریخِ بارگذاری جای تاریخِ نمونه می‌نشست و برگهٔ
//   قدیمی‌ای که امروز آپلود شود فاصله را کمتر نشان می‌داد.
// برگه‌های ایرانی معمولاً شمسی چاپ می‌کنند («۱۴۰۵/۰۷/۲۴»)؛ گاهی میلادی («2026-10-16»، «16/10/2026»).
// ⚠️ هر ابهام ⇒ null (همان «تاریخ نداریم»؛ سرور به تاریخِ بارگذاری برمی‌گردد). حدس نمی‌زنیم:
//   «03/04/2026» (روز/ماه یا ماه/روز؟) null است؛ تاریخِ آینده یا قدیمی‌تر از ۱۰ سال null است.
// ============================================================

const FA = "۰۱۲۳۴۵۶۷۸۹", AR = "٠١٢٣٤٥٦٧٨٩";
const latin = (s) => String(s).replace(/[۰-۹]/g, (d) => FA.indexOf(d)).replace(/[٠-٩]/g, (d) => AR.indexOf(d));

// تبدیلِ شمسی ⇒ میلادی (الگوریتمِ jalaali-js، Borkowski؛ معتبر برای ۱۲۰۰–۱۵۰۰ ه.ش).
const BREAKS = [-61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210, 1635, 2060, 2097, 2192, 2262, 2324, 2394, 2456, 3178];
const div = (a, b) => ~~(a / b);
const mod = (a, b) => a - ~~(a / b) * b;
function jalCal(jy) {
  const gy = jy + 621;
  let leapJ = -14, jp = BREAKS[0], jm, jump = 0;
  for (let i = 1; i < BREAKS.length; i++) {
    jm = BREAKS[i]; jump = jm - jp;
    if (jy < jm) break;
    leapJ += div(jump, 33) * 8 + div(mod(jump, 33), 4);
    jp = jm;
  }
  let n = jy - jp;
  leapJ += div(n, 33) * 8 + div(mod(n, 33) + 3, 4);
  if (mod(jump, 33) === 4 && jump - n === 4) leapJ += 1;
  const leapG = div(gy, 4) - div((div(gy, 100) + 1) * 3, 4) - 150;
  const march = 20 + leapJ - leapG;
  if (jump - n < 6) n = n - jump + div(jump + 4, 33) * 33;
  let leap = mod(mod(n + 1, 33) - 1, 4);
  if (leap === -1) leap = 4;
  return { leap, gy, march };
}
function g2d(gy, gm, gd) {
  let d = div((gy + div(gm - 8, 6) + 100100) * 1461, 4) + div(153 * mod(gm + 9, 12) + 2, 5) + gd - 34840408;
  d = d - div(div(gy + 100100 + div(gm - 8, 6), 100) * 3, 4) + 752;
  return d;
}
function d2g(jdn) {
  let j = 4 * jdn + 139361631;
  j = j + div(div(4 * jdn + 183187720, 146097) * 3, 4) * 4 - 3908;
  const i = div(mod(j, 1461), 4) * 5 + 308;
  const gd = div(mod(i, 153), 5) + 1;
  const gm = mod(div(i, 153), 12) + 1;
  const gy = div(j, 1461) - 100100 + div(8 - gm, 6);
  return { gy, gm, gd };
}
export function jalaliToGregorian(jy, jm, jd) {
  if (jm < 1 || jm > 12 || jd < 1 || jd > (jm <= 6 ? 31 : jm <= 11 ? 30 : 30)) return null;
  const r = jalCal(jy);
  if (jm === 12 && jd === 30 && r.leap !== 0) return null;   // اسفندِ ۳۰ فقط در سالِ کبیسه
  const jdn = g2d(r.gy, 3, r.march) + (jm - 1) * 31 - div(jm, 7) * (jm - 7) + jd - 1;
  return d2g(jdn);
}

const iso = ({ gy, gm, gd }) => `${gy}-${String(gm).padStart(2, "0")}-${String(gd).padStart(2, "0")}`;
function validGreg(gy, gm, gd) {
  if (gm < 1 || gm > 12 || gd < 1) return false;
  const dim = new Date(Date.UTC(gy, gm, 0)).getUTCDate();
  return gd <= dim;
}

/**
 * رشتهٔ چاپ‌شده ⇒ «YYYY-MM-DD» (میلادی) یا null.
 * @param {string} raw
 * @param {number} [now] برای آزمون؛ پیش‌فرض اکنون. تاریخِ بعد از فردا یا پیش از ۱۰ سال ⇒ null.
 */
export function parseSampleDate(raw, now = Date.now()) {
  if (raw == null) return null;
  const s = latin(raw).trim();
  // فقط بخشِ تاریخ (ساعتِ کنارش، «Sampling:» و … کنار گذاشته می‌شود). سه عدد با / - . جدا.
  const m = s.match(/(\d{1,4})\s*[\/\-.]\s*(\d{1,2})\s*[\/\-.]\s*(\d{1,4})/);
  if (!m) return null;
  const [a, b, c] = [m[1], m[2], m[3]].map(Number);
  let g = null;
  if (m[1].length === 4) {
    if (a >= 1300 && a <= 1499) g = jalaliToGregorian(a, b, c);              // ۱۴۰۵/۰۷/۲۴
    else if (a >= 1990 && a <= 2100 && validGreg(a, b, c)) g = { gy: a, gm: b, gd: c };   // 2026-10-16
  } else if (m[3].length === 4) {
    if (c >= 1300 && c <= 1499) g = jalaliToGregorian(c, b, a);              // ۲۴/۰۷/۱۴۰۵
    else if (c >= 1990 && c <= 2100) {
      // روز/ماه یا ماه/روز؟ فقط وقتی یکی > ۱۲ است معلوم است.
      if (a > 12 && validGreg(c, b, a)) g = { gy: c, gm: b, gd: a };
      else if (b > 12 && validGreg(c, a, b)) g = { gy: c, gm: a, gd: b };
    }
  }
  if (!g) return null;
  const t = Date.UTC(g.gy, g.gm - 1, g.gd);
  const DAY = 24 * 3600 * 1000;
  if (t > now + DAY || t < now - 3653 * DAY) return null;
  return iso(g);
}
