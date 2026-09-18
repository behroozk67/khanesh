// ============================================================
// LabMate — احراز هویت با کدِ یک‌بارمصرف (OTP) روی شمارهٔ موبایل
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
import { randomInt } from 'node:crypto';
import { getUser, createUser } from './database.js';

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
const MAX_OTP_ATTEMPTS = 5;
const otpStore = new Map();   // phone -> { code, expiresAt, attempts }

/** پاک‌سازیِ کدهای منقضی. بدونِ این، Map با هر شماره برای همیشه رشد می‌کند. */
function sweepExpired(now = Date.now()) {
  for (const [phone, rec] of otpStore) {
    if (now > rec.expiresAt) otpStore.delete(phone);
  }
}

// ⚠️ هر دو مسیر محدودیتِ نرخ دارند و دلیلشان فرق می‌کند:
//   request-otp — بدونِ آن، یک اسکریپت می‌تواند برای یک شماره صدها پیامک
//     بفرستد (هزینه + آزارِ صاحبِ شماره).
//   verify-otp  — کد شش‌رقمی است؛ بدونِ سقفِ تلاش، حدس‌زدنش در پنجرهٔ دو
//     دقیقه‌ای صرفاً مسئلهٔ سرعتِ شبکه است.
const otpRequestLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'تعدادِ درخواستِ کد بیش از حد مجاز است. کمی بعد دوباره تلاش کنید.' },
});

const otpVerifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'تعدادِ تلاشِ ناموفق بیش از حد مجاز است. کمی بعد دوباره تلاش کنید.' },
});

// 1. درخواست ارسال کد
router.post('/request-otp', otpRequestLimiter, (req, res) => {
  const { phone } = req.body;
  if (!phone || !/^09\d{9}$/.test(String(phone))) {
    return res.status(400).json({ error: 'شماره موبایل نامعتبر است.' });
  }

  sweepExpired();

  // ⚠️ randomInt رمزنگارانه است. Math.random قابل پیش‌بینی است و برای کدی که
  //    نقشِ رمزِ عبور را بازی می‌کند مناسب نیست.
  const code = String(randomInt(100000, 1000000));

  otpStore.set(phone, { code, expiresAt: Date.now() + OTP_TTL_MS, attempts: 0 });

  // MOCK SMS: به جای اتصال به پنل واقعی، کد در سرور چاپ می‌شود.
  // ⚠️ پیش از رفتن به پرودکشن این باید به پنلِ واقعی وصل شود، وگرنه کد فقط
  //    در لاگِ سرور است و لاگ جای کدِ ورود نیست.
  console.log(`[SMS MOCK] کد ${code} برای ${phone}`);

  return res.json({ success: true, message: 'کد با موفقیت ارسال شد.' });
});

// 2. تأیید کد و صدور توکن
router.post('/verify-otp', otpVerifyLimiter, async (req, res) => {
  const { phone, code } = req.body;

  const record = otpStore.get(phone);
  if (!record) {
    return res.status(400).json({ error: 'کدی برای این شماره یافت نشد.' });
  }

  if (Date.now() > record.expiresAt) {
    otpStore.delete(phone);
    return res.status(400).json({ error: 'کد منقضی شده است. دوباره تلاش کنید.' });
  }

  if (record.code !== String(code ?? '')) {
    record.attempts += 1;
    // سقفِ تلاش: کد پس از چند حدسِ اشتباه می‌سوزد، وگرنه پنجرهٔ دو دقیقه‌ای
    // برای حدس‌زدنِ یک عددِ شش‌رقمی کافی است.
    if (record.attempts >= MAX_OTP_ATTEMPTS) {
      otpStore.delete(phone);
      return res.status(400).json({ error: 'تعدادِ تلاشِ اشتباه زیاد شد. کدِ تازه بگیرید.' });
    }
    return res.status(400).json({ error: 'کد وارد شده اشتباه است.' });
  }

  otpStore.delete(phone);

  try {
    let user = await getUser(phone);
    if (!user) {
      try {
        user = await createUser(phone);
      } catch (e) {
        // دو درخواستِ هم‌زمان برای یک شماره: یکی می‌سازد، دیگری به قیدِ UNIQUE
        // می‌خورد. خواندنِ دوباره درست است، نه خطا دادن به کاربر.
        user = await getUser(phone);
        if (!user) throw e;
      }
    }

    const token = jwt.sign({ phone: user.phone, userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
    return res.json({ success: true, token, user });
  } catch (dbError) {
    console.error('DB Error in auth:', dbError.message);
    return res.status(500).json({ error: 'خطای سرور در ایجاد کاربر.' });
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
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    return next();
  } catch {
    return res.status(401).json({ error: 'توکن نامعتبر است یا منقضی شده.' });
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
    return res.json({ success: true, phone: req.user.phone, jobs });
  } catch (err) {
    console.error('DB Error in /me:', err.message);
    return res.status(500).json({ error: 'خطا در دریافت اطلاعات کاربر' });
  }
});

export default router;
