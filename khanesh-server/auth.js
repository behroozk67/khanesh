// ============================================================
// LabMate — احراز هویت با کدِ یک‌بارمصرف (OTP) روی شمارهٔ موبایل یا ایمیل (specs/011)
//
// ⚠️ این فایل تنها جایی در پروژه است که دادهٔ شناسایی‌کنندهٔ بیمار را *ذخیره*
//    می‌کند. تا پیش از آن، قاعدهٔ صریحِ پروژه این بود که شماره/نام/کد ملی نه
//    استخراج می‌شود و نه به مدل می‌رود (rules/notes.md). ذخیرهٔ شمارهٔ موبایل
//    در database.sqlite یک سطحِ تازهٔ حریم خصوصی است، نه یک جزئیاتِ پیاده‌سازی:
//    جدولِ `jobs` هم نتیجهٔ کاملِ تفسیرِ آزمایش را کنارِ user_id نگه می‌دارد.
//    هر تصمیمی دربارهٔ نگهداشت، رمزگذاری و حذف باید آگاهانه گرفته شود.
// ============================================================

import express from 'express';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { randomInt, createHash } from 'node:crypto';
import { getUser, createUser, getUserById, getUserByEmail, createUserWithEmail, getProfile, deleteUserCascade, linkDeviceHistoryToUser } from './database.js';
import { dropJobsForUser } from './jobStore.js';
import { makeSmsIrSender } from './smsir.js';

const router = express.Router();

const DEV_SECRET = 'super-secret-key-for-labmate-dev-only';
const JWT_SECRET = process.env.JWT_SECRET || DEV_SECRET;

// ⚠️ احراز هویت پیش‌فرض *خاموش* است — این وضعِ موجود را حفظ می‌کند، نه اینکه
//    آن را تأیید کند. پیش‌تر همین کار با یک `return next()` و چند خطِ کدِ
//    دست‌نیافتنی زیرش انجام شده بود، که بدترین شکلِ ممکن است: فایل طوری خوانده
//    می‌شود که انگار محافظت برقرار است. حالا با متغیرِ محیطی صریح است و بوت
//    دربارهٔ آن بلند هشدار می‌دهد.
// صادر می‌شود تا /health و فرانت از همین یک متغیر بخوانند. دوباره خواندنِ
// process.env در server.js یک کپیِ دومِ همان تصمیم بود — کلاسِ N20.
export const AUTH_REQUIRED = String(process.env.AUTH_REQUIRED || '').toLowerCase() === 'true';

// کاربرِ ساختگیِ حالتِ خاموش. ⚠️ همهٔ درخواست‌ها یک userId می‌گیرند، پس
// `getJobById(jobId, userId)` عملاً محدودیتی اعمال نمی‌کند و هر کسی می‌تواند
// نتیجهٔ هر کسی را ببیند. این تنها برای توسعهٔ محلی قابل قبول است.
const ANON_USER = Object.freeze({ phone: null, userId: 1, anonymous: true });

export function authBootReport() {
  if (!AUTH_REQUIRED) {
    return '⚠️ احراز هویت خاموش است (AUTH_REQUIRED ست نشده) — همهٔ درخواست‌ها به‌عنوان کاربرِ ناشناس پذیرفته می‌شوند و تاریخچهٔ آزمایش‌ها بینِ کاربران جدا نیست. فقط برای توسعهٔ محلی.';
  }
  if (JWT_SECRET === DEV_SECRET) {
    // با احراز هویتِ روشن، کلیدِ پیش‌فرضِ داخلِ مخزن یعنی هر کسی می‌تواند
    // توکن جعل کند. این دیگر هشدار نیست، خطاست.
    throw new Error('JWT_SECRET ست نشده و احراز هویت روشن است — کلیدِ پیش‌فرض در مخزن است و توکن‌ها جعل‌شدنی‌اند. یک JWT_SECRET در .env بگذارید.');
  }
  return '✅ احراز هویت روشن است.';
}

// ── ذخیرهٔ کدها ─────────────────────────────────────────────
// در حافظه و با TTL. ریستارتِ سرور کدهای در جریان را دور می‌ریزد (پذیرفته:
// کاربر دوباره درخواست می‌دهد). پشتِ چند نمونه کار نمی‌کند — همان محدودیتی
// که jobStore.js دارد.
const OTP_TTL_MS = 2 * 60 * 1000;
// ایمیل دیرتر می‌رسد (صف و فیلترِ هرزنامه)؛ دو دقیقه یعنی کدِ منقضی پیش از رسیدن.
const EMAIL_OTP_TTL_MS = 10 * 60 * 1000;
const MAX_OTP_ATTEMPTS = 5;
// فاصلهٔ ارسالِ دوباره برای *یک* شناسه — جدا از سقفِ IP. کاربر در صفحه شمارشِ معکوس می‌بیند.
const RESEND_COOLDOWN_MS = 60 * 1000;
const otpStore = new Map();   // "phone:09…" | "email:a@b" -> { code, expiresAt, attempts }
// ⚠️ جدا از otpStore: سوختنِ کد (۵ حدسِ اشتباه) رکوردش را پاک می‌کند، و اگر زمانِ ارسال هم همان‌جا بود،
//    درخواستِ بعدی بی‌فاصله کدِ تازه می‌گرفت — یعنی فاصلهٔ ارسالِ دوباره دور زده می‌شد (بازبینیِ کد).
const lastSent = new Map();   // key -> ms

/** پاک‌سازیِ کدهای منقضی. بدونِ این، Map با هر شناسه برای همیشه رشد می‌کند. */
function sweepExpired(now = Date.now()) {
  for (const [key, rec] of otpStore) {
    if (now > rec.expiresAt) otpStore.delete(key);
  }
  for (const [key, at] of lastSent) {
    if (now - at > RESEND_COOLDOWN_MS) lastSent.delete(key);
  }
}

// ── فرستنده‌ها ───────────────────────────────────────────────
// MOCK: هر دو کد را در لاگِ سرور چاپ می‌کنند. ⚠️ پیش از پرودکشن به پنلِ پیامک و سرویسِ ایمیلِ
//    واقعی وصل شوند — لاگ جای کدِ ورود نیست. /health وضعیتشان را («mock») گزارش می‌کند.
let smsSender = (phone, code) => console.log(`[SMS MOCK] کد ${code} برای ${phone}`);
let emailSender = (email, code) => console.log(`[EMAIL MOCK] کد ${code} برای ${email}`);
let sendersLive = { sms: false, email: false };
/** برای تست و برای وصل‌کردنِ فرستندهٔ واقعی؛ فرستندهٔ واقعی live: { sms: true } می‌دهد. */
export function setOtpSenders({ sms, email, live = {} } = {}) {
  if (sms) smsSender = sms;
  if (email) emailSender = email;
  sendersLive = { ...sendersLive, ...live };
}
// فرستندهٔ واقعیِ پیامک: فقط با SMSIR_API_KEY و SMSIR_TEMPLATE_ID روشن می‌شود.
const smsIr = makeSmsIrSender({ apiKey: process.env.SMSIR_API_KEY, templateId: process.env.SMSIR_TEMPLATE_ID, paramName: process.env.SMSIR_PARAM || 'CODE' });
if (smsIr) setOtpSenders({ sms: smsIr, live: { sms: true } });
export const otpSenderStatus = () => ({ smsOtp: sendersLive.sms ? 'live' : 'mock', emailOtp: sendersLive.email ? 'live' : 'mock' });

/** شمارشِ داخلِ جملهٔ فارسی با رقمِ فارسی (سیاستِ digits.js در فرانت). */
const faDigits = (n) => String(n).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[d]);

/** رقمِ فارسی/عربی → لاتین. */
const latinDigits = (s) => String(s ?? '')
  .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
  .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660));

/** «۰۹۱۲ ۱۲۳ ۴۵۶۷»، «+98912…»، «0098912…»، «912…» → «0912…»؛ نامعتبر → null. */
export function normalizePhone(raw) {
  let s = latinDigits(raw).replace(/[\s\-()]/g, '');
  if (s.startsWith('+98')) s = '0' + s.slice(3);
  else if (s.startsWith('0098')) s = '0' + s.slice(4);
  else if (/^98\d{10}$/.test(s)) s = '0' + s.slice(2);
  else if (/^9\d{9}$/.test(s)) s = '0' + s;
  return /^09\d{9}$/.test(s) ? s : null;
}

export function normalizeEmail(raw) {
  const s = String(raw ?? '').trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s) && s.length <= 254 ? s : null;
}

/** کدِ تازه برای یک کلید؛ اگر در فاصلهٔ ارسالِ دوباره است، ثانیه‌های باقی‌مانده را برمی‌گرداند. */
function issueCode(key, ttlMs) {
  sweepExpired();
  const now = Date.now();
  const prev = lastSent.get(key);
  if (prev != null && now - prev < RESEND_COOLDOWN_MS) {
    return { wait: Math.ceil((RESEND_COOLDOWN_MS - (now - prev)) / 1000) };
  }
  // ⚠️ randomInt رمزنگارانه است. Math.random قابل پیش‌بینی است و برای کدی که
  //    نقشِ رمزِ عبور را بازی می‌کند مناسب نیست.
  const code = String(randomInt(100000, 1000000));
  otpStore.set(key, { code, expiresAt: now + ttlMs, attempts: 0 });
  lastSent.set(key, now);
  return { code };
}

/**
 * ارسالِ کد و گزارشِ نتیجه. فرستنده‌ای که false برگرداند یا بیندازد شکست‌خورده است (undefined = موفق، مثل mock).
 * در شکست، کدِ ساخته‌شده و فاصلهٔ ارسالِ دوباره پاک می‌شود تا کاربر بتواند فوراً دوباره بخواهد.
 */
async function deliver(sender, key, to, code) {
  let ok = true;
  try { ok = (await sender(to, code)) !== false; } catch { ok = false; }
  if (!ok) { otpStore.delete(key); lastSent.delete(key); }
  return ok;
}
const SEND_FAILED = { error: 'ارسالِ کد انجام نشد. چند دقیقهٔ دیگر دوباره تلاش کنید.' };
// ⚠️ کدِ وضعیت ۵۰۳ است، نه ۵۰۲: کلودفلر بدنهٔ ۵۰۲ را با صفحهٔ خودش («error code: 502»)
//    عوض می‌کند و بیمار به‌جای همین جملهٔ فارسی یک متنِ انگلیسیِ بی‌معنی می‌بیند
//    (روی azmayarapp.ir دیده شد). ۵۰۳ از کلودفلر بی‌تغییر رد می‌شود.
const SEND_FAILED_STATUS = 503;

/** null یعنی کد درست بود و مصرف شد؛ در غیر این صورت پیامِ فارسیِ خطا. */
function checkCode(key, code) {
  const record = otpStore.get(key);
  if (!record) return 'کدی برای این شناسه یافت نشد. کدِ تازه بگیرید.';
  if (Date.now() > record.expiresAt) {
    otpStore.delete(key);
    return 'کد منقضی شده است. کدِ تازه بگیرید.';
  }
  if (record.code !== latinDigits(code ?? '').trim()) {
    record.attempts += 1;
    // سقفِ تلاش: کد پس از چند حدسِ اشتباه می‌سوزد، وگرنه پنجرهٔ دو دقیقه‌ای
    // برای حدس‌زدنِ یک عددِ شش‌رقمی کافی است.
    if (record.attempts >= MAX_OTP_ATTEMPTS) {
      otpStore.delete(key);
      return 'تعدادِ تلاشِ اشتباه زیاد شد. کدِ تازه بگیرید.';
    }
    return 'کد وارد شده اشتباه است.';
  }
  otpStore.delete(key);
  // ورودِ موفق فاصلهٔ ارسال را آزاد می‌کند (کاربرِ واقعی که خارج شد و برگشت، منتظر نماند)؛ کدِ *سوخته* نه.
  lastSent.delete(key);
  return null;
}

async function issueToken(user, kind) {
  // ⚠️ شناسه (شماره/ایمیل) عمداً داخلِ توکن نیست — توکن در localStorage و لاگ‌ها می‌گردد.
  const token = jwt.sign({ userId: user.id, kind }, JWT_SECRET, { expiresIn: '7d' });
  const prof = await getProfile(user.id);
  return {
    success: true,
    token,
    user: { id: user.id, phone: user.phone || null, email: user.email || null },
    profile: prof ? { ...prof, phone: user.phone || null } : null,
  };
}

/** دو درخواستِ هم‌زمان برای یک شناسه: یکی می‌سازد، دیگری به قیدِ UNIQUE می‌خورد — خواندنِ دوباره درست است. */
async function findOrCreate(find, create, id) {
  let user = await find(id);
  if (user) return user;
  try {
    return await create(id);
  } catch (e) {
    user = await find(id);
    if (!user) throw e;
    return user;
  }
}

// ⚠️ هر دو مسیر محدودیتِ نرخ دارند و دلیلشان فرق می‌کند:
//   request-otp — بدونِ آن، یک اسکریپت می‌تواند برای یک شماره صدها پیامک
//     بفرستد (هزینه + آزارِ صاحبِ شماره).
//   verify-otp  — کد شش‌رقمی است؛ بدونِ سقفِ تلاش، حدس‌زدنش در پنجرهٔ دو
//     دقیقه‌ای صرفاً مسئلهٔ سرعتِ شبکه است.
const otpRequestLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.OTP_REQUEST_MAX) || 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'تعدادِ درخواستِ کد بیش از حد مجاز است. کمی بعد دوباره تلاش کنید.' },
});

const otpVerifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.OTP_VERIFY_MAX) || 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'تعدادِ تلاشِ ناموفق بیش از حد مجاز است. کمی بعد دوباره تلاش کنید.' },
});

// 1. درخواست ارسال کد — پیامک
router.post('/request-otp', otpRequestLimiter, async (req, res) => {
  const phone = normalizePhone(req.body?.phone);
  if (!phone) return res.status(400).json({ error: 'شماره موبایل نامعتبر است. شماره را مثل ۰۹۱۲۱۲۳۴۵۶۷ وارد کنید.' });
  const r = issueCode(`phone:${phone}`, OTP_TTL_MS);
  if (r.wait) return res.status(429).json({ error: `کد قبلاً فرستاده شده. ${faDigits(r.wait)} ثانیهٔ دیگر دوباره تلاش کنید.`, retryAfterSec: r.wait });
  if (!(await deliver(smsSender, `phone:${phone}`, phone, r.code))) return res.status(SEND_FAILED_STATUS).json(SEND_FAILED);
  return res.json({ success: true, message: 'کد با موفقیت ارسال شد.', retryAfterSec: RESEND_COOLDOWN_MS / 1000 });
});

// 2. تأیید کد و صدور توکن — پیامک
router.post('/verify-otp', otpVerifyLimiter, async (req, res) => {
  const phone = normalizePhone(req.body?.phone);
  if (!phone) return res.status(400).json({ error: 'شماره موبایل نامعتبر است.' });
  const err = checkCode(`phone:${phone}`, req.body?.code);
  if (err) return res.status(400).json({ error: err });
  try {
    const user = await findOrCreate(getUser, createUser, phone);
    // اتصالِ تاریخچهٔ ثبت‌شده روی همین دستگاه به حسابِ کاربر
    const dev = String(req.get('x-device-id') ?? req.body?.deviceId ?? '').trim();
    if (/^[A-Za-z0-9_-]{8,64}$/.test(dev)) {
      const devOwner = `d:${createHash('sha256').update(dev).digest('hex').slice(0, 24)}`;
      await linkDeviceHistoryToUser(devOwner, `u:${user.id}`).catch(() => {});
    }
    return res.json(await issueToken(user, 'phone'));
  } catch (dbError) {
    console.error('DB Error in auth:', dbError.message);
    return res.status(500).json({ error: 'خطای سرور در ایجاد کاربر. کمی بعد دوباره تلاش کنید.' });
  }
});

// 1ب/2ب. همان دو مرحله با ایمیل (specs/011). حسابِ ایمیلی و حسابِ موبایلی دو حسابِ جدایند (پیوند خارج از دامنه).
router.post('/request-email-otp', otpRequestLimiter, async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  if (!email) return res.status(400).json({ error: 'نشانیِ ایمیل نامعتبر است.' });
  const r = issueCode(`email:${email}`, EMAIL_OTP_TTL_MS);
  if (r.wait) return res.status(429).json({ error: `کد قبلاً فرستاده شده. ${faDigits(r.wait)} ثانیهٔ دیگر دوباره تلاش کنید.`, retryAfterSec: r.wait });
  if (!(await deliver(emailSender, `email:${email}`, email, r.code))) return res.status(SEND_FAILED_STATUS).json(SEND_FAILED);
  return res.json({ success: true, message: 'کد به ایمیلِ شما فرستاده شد.', retryAfterSec: RESEND_COOLDOWN_MS / 1000 });
});

router.post('/verify-email-otp', otpVerifyLimiter, async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  if (!email) return res.status(400).json({ error: 'نشانیِ ایمیل نامعتبر است.' });
  const err = checkCode(`email:${email}`, req.body?.code);
  if (err) return res.status(400).json({ error: err });
  try {
    const user = await findOrCreate(getUserByEmail, createUserWithEmail, email);
    const dev = String(req.get('x-device-id') ?? req.body?.deviceId ?? '').trim();
    if (/^[A-Za-z0-9_-]{8,64}$/.test(dev)) {
      const devOwner = `d:${createHash('sha256').update(dev).digest('hex').slice(0, 24)}`;
      await linkDeviceHistoryToUser(devOwner, `u:${user.id}`).catch(() => {});
    }
    return res.json(await issueToken(user, 'email'));
  } catch (dbError) {
    console.error('DB Error in auth:', dbError.message);
    return res.status(500).json({ error: 'خطای سرور در ایجاد کاربر. کمی بعد دوباره تلاش کنید.' });
  }
});

// 3. میدل‌ور محافظت از مسیرها
export function requireAuth(req, res, next) {
  if (!AUTH_REQUIRED) {
    req.user = ANON_USER;
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'برای دسترسی به این بخش باید وارد شوید.' });
  }

  const token = authHeader.slice('Bearer '.length).trim();
  let payload;
  try {
    payload = jwt.verify(token, JWT_SECRET);
  } catch {
    return res.status(401).json({ error: 'توکن نامعتبر است یا منقضی شده. دوباره وارد شوید.' });
  }
  // specs/011: توکنِ حسابِ حذف‌شده تا انقضای هفت‌روزه‌اش هنوز امضای معتبر دارد؛ بدونِ این بررسی،
  //    «حذفِ حساب» یعنی کاربر همچنان کار ثبت می‌کند زیرِ userIdای که دیگر وجود ندارد.
  getUserById(payload.userId)
    .then((u) => {
      if (!u) return res.status(401).json({ error: 'این حساب دیگر وجود ندارد. دوباره وارد شوید.' });
      req.user = { ...payload, phone: u.phone ?? null, email: u.email ?? null };
      return next();
    })
    .catch((e) => {
      console.error('DB Error in requireAuth:', e.message);
      return res.status(500).json({ error: 'خطای سرور. کمی بعد دوباره تلاش کنید.' });
    });
}

/** کاربرِ درخواست بدونِ ردِ آن: برای مسیری که بی‌نشست هم کار می‌کند (برگشت از درگاه) ولی داده‌اش مالک دارد. */
export async function optionalUser(req) {
  if (!AUTH_REQUIRED) return ANON_USER;
  const h = req.headers.authorization;
  if (!h || !h.startsWith('Bearer ')) return null;
  try {
    const payload = jwt.verify(h.slice('Bearer '.length).trim(), JWT_SECRET);
    const u = await getUserById(payload.userId);
    return u ? { ...payload, phone: u.phone ?? null, email: u.email ?? null } : null;
  } catch {
    return null;
  }
}

// 4. دریافت اطلاعات پروفایل و تاریخچه آزمایش‌ها
router.get('/me', requireAuth, async (req, res) => {
  // ⚠️ در حالتِ خاموش همهٔ درخواست‌ها userId = ۱ می‌گیرند، پس این مسیر
  //    تاریخچهٔ همان کاربرِ مشترک را برمی‌گرداند. جداسازیِ واقعی فقط با
  //    AUTH_REQUIRED=true برقرار است.
  try {
    const { getUserJobs } = await import('./database.js');
    const jobs = await getUserJobs(req.user.userId);
    return res.json({ success: true, phone: req.user.phone, email: req.user.email ?? null, jobs });
  } catch (err) {
    console.error('DB Error in /me:', err.message);
    return res.status(500).json({ error: 'خطا در دریافت اطلاعات کاربر' });
  }
});

// 5. حذفِ حساب و اطلاعات (specs/011، clarify A). تأییدِ صریح در بدنه، تا یک درخواستِ اشتباه حساب را پاک نکند.
router.delete('/me', requireAuth, async (req, res) => {
  if (!AUTH_REQUIRED) {
    return res.status(409).json({ error: 'در این نسخه اطلاعاتِ شما فقط روی همین دستگاه ذخیره است و از همین‌جا پاک می‌شود.', code: 'local_only' });
  }
  if (req.body?.confirm !== true) return res.status(400).json({ error: 'برای حذفِ حساب، تأیید لازم است.' });
  try {
    await deleteUserCascade(req.user.userId);
    dropJobsForUser(req.user.userId);
    return res.json({ success: true });
  } catch (err) {
    console.error('DB Error in DELETE /me:', err.message);
    return res.status(500).json({ error: 'حذفِ حساب انجام نشد. کمی بعد دوباره تلاش کنید.' });
  }
});

export default router;
