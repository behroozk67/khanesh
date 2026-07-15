import { useState, useMemo, useRef } from "react";

// آدرس سرور واسط (بک‌اند). اگر سرور روی پورت دیگری است، اینجا عوض کن.
const PROXY_URL = "/api/analyze";

// ============================================================
// خوانش — نسخه با تفسیر آموزشی غنی
// محدوده‌ها: استاندارد بین‌المللی
// متن‌های تفسیری و آستانه‌های بحرانی: برگرفته از منابع فارسی
// crit: [low, high] آستانه بحرانی (خارج از آن = هشدار فوری)
// ============================================================

// تبدیل سن به ماه، بر اساس واحد (year/month/day)
// خروجی: تعداد ماه (برای تشخیص نوزاد). اگر نامعتبر، null.
function ageInMonths(age, ageUnit) {
  const a = parseFloat(age);
  if (isNaN(a)) return null;
  if (ageUnit === "day") return a / 30;
  if (ageUnit === "month") return a;
  return a * 12; // سال (پیش‌فرض)
}

const REF = {
  // ---------- قند و دیابت ----------
  fbs: { label: "قند خون ناشتا", unit: "mg/dL", cat: "diabetes", hard: [20, 800],
    range: () => ({ low: 70, high: 99 }), crit: [40, 500],
    about: "قند خون ناشتا سطح گلوکز پس از حداقل ۸ ساعت ناشتایی را می‌سنجد.",
    high: "۱۰۰ تا ۱۲۵ پیش‌دیابت و ۱۲۶ به بالا می‌تواند نشانه‌ای از دیابت باشد.",
    low: "قند پایین؛ می‌تواند به ناشتایی طولانی، دارو یا موارد دیگر مربوط باشد." },
  hba1c: { label: "HbA1c", unit: "%", cat: "diabetes", hard: [3, 20],
    range: () => ({ low: 4, high: 5.6 }),
    about: "میانگین قند خون طی دو تا سه ماه گذشته را نشان می‌دهد.",
    high: "۵.۷ تا ۶.۴ پیش‌دیابت و ۶.۵ به بالا می‌تواند نشانه دیابت باشد.",
    low: "مقادیر پایین معمولاً نگران‌کننده نیست." },

  // ---------- چربی ----------
  chol: { label: "کلسترول تام", unit: "mg/dL", cat: "heart", hard: [50, 600],
    range: () => ({ low: 0, high: 200 }),
    about: "مجموع کلسترول خون؛ شاخصی از سلامت قلب و عروق.",
    high: "۲۰۰ تا ۲۳۹ مرزی و ۲۴۰ به بالا بالا؛ با خطر بیماری قلبی مرتبط است." },
  tg: { label: "تری‌گلیسیرید", unit: "mg/dL", cat: "heart", hard: [20, 2000],
    range: () => ({ low: 35, high: 149 }),
    about: "نوعی چربی خون که با مصرف قند و نشاسته بالا می‌رود.",
    high: "۱۵۰ تا ۱۹۹ مرزی، ۲۰۰ تا ۴۹۹ بالا و ۵۰۰ به بالا بسیار بالا." },
  hdl: { label: "HDL (کلسترول خوب)", unit: "mg/dL", cat: "heart", hard: [10, 150],
    range: (s) => s === "female" ? { low: 50, high: 100 } : { low: 40, high: 100 },
    about: "کلسترول «خوب» که نقش محافظتی در برابر بیماری قلبی دارد.",
    low: "زیر ۴۰ ریسک قلبی، ۴۰ تا ۶۰ متوسط و بالای ۶۰ مطلوب است." },
  ldl: { label: "LDL (کلسترول بد)", unit: "mg/dL", cat: "heart", hard: [20, 400],
    range: () => ({ low: 0, high: 129 }),
    about: "کلسترول «بد» که با رسوب در عروق مرتبط است.",
    high: "بالای ۱۰۰ مطلوب نیست؛ هدف بسته به عوامل خطر فردی متفاوت است." },

  // ---------- کلیه ----------
  urea: { label: "اوره", unit: "mg/dL", cat: "kidney", hard: [3, 300],
    range: () => ({ low: 15, high: 45 }), crit: [0, 214],
    about: "محصول فرعی متابولیسم پروتئین؛ شاخص عملکرد کلیه.",
    high: "بالا می‌تواند به عملکرد کلیه یا کم‌آبی مربوط باشد." },
  bun: { label: "BUN", unit: "mg/dL", cat: "kidney", hard: [2, 150],
    range: () => ({ low: 6, high: 21 }), crit: [0, 70],
    about: "نیتروژن اوره خون؛ شاخص عملکرد کلیه.",
    high: "بالا می‌تواند به کاهش عملکرد کلیه یا کم‌آبی مربوط باشد." },
  cr: { label: "کراتینین", unit: "mg/dL", cat: "kidney", hard: [0.1, 20],
    range: (s) => s === "female" ? { low: 0.4, high: 1.1 } : { low: 0.5, high: 1.2 }, crit: [0, 5],
    about: "از توده عضلانی تولید می‌شود؛ شاخص مهم عملکرد کلیه.",
    high: "بالا می‌تواند نشانه کاهش عملکرد کلیه باشد و نیاز به بررسی دارد." },
  uric: { label: "اسید اوریک", unit: "mg/dL", cat: "kidney", hard: [0.5, 20],
    range: (s) => s === "female" ? { low: 2.5, high: 6.2 } : { low: 3.5, high: 7.2 },
    about: "محصول متابولیسم پورین؛ بالا بودن با نقرس مرتبط است.",
    high: "بالا می‌تواند با نقرس یا سنگ کلیه مرتبط باشد." },

  // ---------- کبد ----------
  ast: { label: "AST (SGOT)", unit: "U/L", cat: "liver", hard: [0, 2000],
    range: (s) => s === "female" ? { low: 0, high: 35 } : { low: 0, high: 50 },
    about: "آنزیم کبد، قلب و عضلات؛ بالا بودن نشانه آسیب بافتی.",
    high: "بالا می‌تواند به آسیب کبدی، عضلانی یا قلبی مربوط باشد." },
  alt: { label: "ALT (SGPT)", unit: "U/L", cat: "liver", hard: [0, 2000],
    range: (s) => s === "female" ? { low: 0, high: 35 } : { low: 0, high: 50 },
    about: "آنزیم کبدی و شاخص اختصاصی‌تر آسیب کبد.",
    high: "بالا اغلب نشانه التهاب یا آسیب کبد است." },
  alp: { label: "ALP (آلکالن فسفاتاز)", unit: "U/L", cat: "liver", hard: [0, 2000],
    range: (s) => s === "female" ? { low: 35, high: 104 } : { low: 40, high: 129 },
    about: "آنزیم کبد، استخوان و روده.",
    high: "بالا می‌تواند به مشکلات کبدی، صفراوی یا استخوانی مربوط باشد.",
    low: "پایین معمولاً اهمیت بالینی کمی دارد." },
  bili: { label: "بیلی‌روبین تام", unit: "mg/dL", cat: "liver", hard: [0, 40],
    range: () => ({ low: 0, high: 1.4 }), critFn: (v, sex, m) => { if (m != null && m < 6 && v > 15) return true; return false; },
    about: "محصول تجزیه گلبول قرمز؛ بالا بودن باعث زردی می‌شود.",
    high: "بالا می‌تواند به مشکلات کبدی، صفراوی یا همولیز مربوط باشد." },
  albumin: { label: "آلبومین", unit: "g/dL", cat: "liver", hard: [1, 8],
    range: () => ({ low: 3.5, high: 5.2 }),
    about: "پروتئین اصلی خون که کبد می‌سازد.",
    low: "پایین می‌تواند نشانه مشکل کبد، کلیه یا تغذیه باشد." },
  amylase: { label: "آمیلاز", unit: "U/L", cat: "liver", hard: [5, 5000],
    range: () => ({ low: 30, high: 110 }), crit: [0, 330],
    about: "آنزیم گوارشی؛ بالا بودن با پانکراتیت مرتبط است.",
    high: "بالا (به‌ویژه بیش از ۳ برابر نرمال) می‌تواند نشانه پانکراتیت حاد باشد و نیاز به بررسی فوری دارد." },

  // ---------- الکترولیت ----------
  na: { label: "سدیم (Na)", unit: "mmol/L", cat: "electro", hard: [100, 200],
    range: () => ({ low: 133, high: 145 }), crit: [120, 160],
    about: "مهم‌ترین یون خارج سلولی؛ در تعادل آب نقش دارد.",
    high: "بالا اغلب به کم‌آبی مربوط است.", low: "پایین می‌تواند به احتباس آب یا از دست دادن سدیم مربوط باشد." },
  k: { label: "پتاسیم (K)", unit: "mmol/L", cat: "electro", hard: [1, 10],
    range: () => ({ low: 3.4, high: 5.4 }), crit: [3.0, 6.5],
    about: "یون حیاتی برای عملکرد قلب و عضلات.",
    high: "بالا (هایپرکالمی) می‌تواند خطر آریتمی قلبی ایجاد کند و نیاز به بررسی فوری دارد.",
    low: "پایین (هایپوکالمی) می‌تواند به اسهال، استفراغ یا دارو مربوط باشد." },
  ca: { label: "کلسیم (Ca)", unit: "mg/dL", cat: "electro", hard: [4, 16],
    range: () => ({ low: 8.4, high: 10.6 }), crit: [6.9, 12.6],
    about: "برای استخوان، عضله و انعقاد خون ضروری است.",
    high: "بالا می‌تواند به مشکلات پاراتیروئید یا موارد دیگر مربوط باشد.",
    low: "پایین می‌تواند به کمبود ویتامین D یا پاراتیروئید مربوط باشد." },
  phos: { label: "فسفر", unit: "mg/dL", cat: "electro", hard: [0.5, 12],
    range: () => ({ low: 2.6, high: 4.5 }),
    about: "برای استخوان و انرژی سلولی لازم است؛ در کنار کلسیم تفسیر می‌شود.",
    high: "بالا می‌تواند به مشکل کلیه مربوط باشد.",
    low: "پایین می‌تواند به سوءتغذیه یا اختلال جذب مربوط باشد." },
  mg: { label: "منیزیم (Mg)", unit: "mg/dL", cat: "electro", hard: [0.5, 6],
    range: () => ({ low: 1.3, high: 2.5 }), crit: [0.9, 3.5],
    about: "در عملکرد عضله و قلب نقش دارد.",
    high: "بالا می‌تواند به مشکل کلیه یا مصرف مکمل مربوط باشد.",
    low: "پایین می‌تواند به مشکلات عضلانی و قلبی منجر شود." },

  // ---------- آهن ----------
  ferritin: { label: "فریتین", unit: "ng/mL", cat: "iron", hard: [1, 3000],
    range: (s) => s === "female" ? { low: 15, high: 150 } : { low: 30, high: 300 },
    about: "ذخیره آهن بدن را نشان می‌دهد.",
    low: "پایین نشانه کاهش ذخایر آهن است و می‌تواند به کم‌خونی منجر شود.",
    high: "بالا می‌تواند به التهاب یا اضافه‌بار آهن مربوط باشد." },
  iron: { label: "آهن (Fe)", unit: "µg/dL", cat: "iron", hard: [10, 400],
    range: () => ({ low: 60, high: 170 }),
    about: "آهن سرم؛ در ساخت هموگلوبین نقش دارد.",
    low: "پایین می‌تواند نشانه کم‌خونی فقر آهن باشد." },
  tibc: { label: "TIBC", unit: "µg/dL", cat: "iron", hard: [100, 700],
    range: () => ({ low: 240, high: 450 }),
    about: "ظرفیت اتصال آهن؛ در کم‌خونی فقر آهن بالا می‌رود.",
    high: "بالا اغلب همراه با کمبود آهن دیده می‌شود." },

  // ---------- CBC ----------
  wbc: { label: "گلبول سفید (WBC)", unit: "×10³/µL", cat: "cbc", hard: [0.5, 100],
    range: () => ({ low: 4.5, high: 11 }), crit: [2.0, 30],
    about: "سلول‌های دفاعی بدن که با عفونت مبارزه می‌کنند.",
    high: "بالا اغلب نشانه عفونت، التهاب یا استرس است.",
    low: "پایین می‌تواند به مشکل مغز استخوان، عفونت شدید یا دارو مربوط باشد." },
  rbc: { label: "گلبول قرمز (RBC)", unit: "×10⁶/µL", cat: "cbc", hard: [1, 10],
    range: (s, m) => {
      if (m != null && m < 1) return { low: 4.0, high: 6.1 };
      if (m != null && m < 6) return { low: 3.8, high: 5.5 };
      return s === "female" ? { low: 4.0, high: 5.2 } : { low: 4.5, high: 5.9 };
    },
    about: "سلول‌های حامل اکسیژن.",
    low: "پایین می‌تواند به کم‌خونی، فقر آهن یا کمبود B12 مربوط باشد.",
    high: "بالا می‌تواند به کم‌آبی، زندگی در ارتفاع یا موارد دیگر مربوط باشد." },
  hb: { label: "هموگلوبین", unit: "g/dL", cat: "cbc", hard: [3, 25],
    range: (s, m) => {
      if (m != null && m < 1) return { low: 11, high: 24 };
      if (m != null && m < 6) return { low: 9.5, high: 18 };
      return s === "female" ? { low: 12.0, high: 16.0 } : { low: 13.5, high: 17.5 };
    }, crit: [7, 20],
    about: "رنگدانه حامل اکسیژن در گلبول قرمز.",
    low: "پایین نشانه کم‌خونی است و نیاز به بررسی دارد.",
    high: "بالا می‌تواند به کم‌آبی یا موارد دیگر مربوط باشد." },
  hct: { label: "هماتوکریت (HCT)", unit: "%", cat: "cbc", hard: [10, 70],
    range: (s, m) => {
      if (m != null && m < 1) return { low: 35, high: 70 };
      if (m != null && m < 6) return { low: 29, high: 42 };
      return s === "female" ? { low: 36.0, high: 46.0 } : { low: 41.0, high: 53.0 };
    },
    about: "نسبت حجم گلبول قرمز به کل خون.",
    low: "پایین اغلب همراه با کم‌خونی است.",
    high: "بالا می‌تواند به کم‌آبی یا تولید بیش از حد گلبول قرمز مربوط باشد." },
  mcv: { label: "MCV", unit: "fl", cat: "cbc", hard: [40, 130],
    range: () => ({ low: 80, high: 100 }),
    about: "میانگین حجم گلبول قرمز؛ در تشخیص نوع کم‌خونی کمک می‌کند.",
    low: "پایین می‌تواند نشانه کم‌خونی فقر آهن باشد.",
    high: "بالا می‌تواند به کمبود B12 یا فولات مربوط باشد." },
  mch: { label: "MCH", unit: "pg", cat: "cbc", hard: [10, 50],
    range: () => ({ low: 27, high: 33 }),
    about: "میانگین مقدار هموگلوبین در هر گلبول قرمز.",
    low: "پایین می‌تواند نشانه کم‌خونی فقر آهن باشد." },
  mchc: { label: "MCHC", unit: "g/dL", cat: "cbc", hard: [25, 40],
    range: () => ({ low: 32, high: 36 }),
    about: "غلظت متوسط هموگلوبین در گلبول قرمز.",
    low: "پایین با کم‌خونی هیپوکروم مرتبط است." },
  plt: { label: "پلاکت", unit: "×10³/µL", cat: "cbc", hard: [10, 1500],
    range: () => ({ low: 150, high: 400 }), crit: [50, 1000],
    about: "در انعقاد خون و جلوگیری از خونریزی نقش دارند.",
    low: "پایین می‌تواند خطر خونریزی را افزایش دهد و نیاز به بررسی دارد.",
    high: "بالا می‌تواند واکنشی یا نیازمند بررسی باشد." },
  esr: { label: "ESR", unit: "mm/hr", cat: "cbc", hard: [0, 150],
    range: (s) => s === "female" ? { low: 0, high: 20 } : { low: 0, high: 15 },
    about: "سرعت رسوب گلبول قرمز؛ شاخص غیراختصاصی التهاب.",
    high: "بالا می‌تواند نشانه التهاب، عفونت یا بیماری روماتیسمی باشد." },
  rdw: { label: "RDW", unit: "%", cat: "cbc", hard: [5, 30],
    range: () => ({ low: 11.5, high: 14.5 }),
    about: "میزان یکنواختی اندازه گلبول‌های قرمز.",
    high: "بالا می‌تواند به کم‌خونی فقر آهن یا کمبود ویتامین مربوط باشد." },

  // ---------- انعقاد ----------
  pt: { label: "PT", unit: "sec", cat: "coag", hard: [5, 60],
    range: () => ({ low: 11, high: 13.5 }),
    about: "زمان پروترومبین؛ مسیر انعقاد خون را می‌سنجد.",
    high: "بالا می‌تواند به دارو (وارفارین)، مشکل کبد یا کمبود ویتامین K مربوط باشد." },
  inr: { label: "INR", unit: "", cat: "coag", hard: [0.3, 12],
    range: () => ({ low: 0.9, high: 1.1 }), crit: [0, 6.0],
    about: "نسبت نرمال‌شده PT؛ برای پایش داروی ضدانعقاد استفاده می‌شود.",
    high: "بالای ۵ خطر خونریزی جدی دارد و نیاز به بررسی فوری است." },
  ptt: { label: "PTT", unit: "sec", cat: "coag", hard: [10, 120],
    range: () => ({ low: 24, high: 35 }), crit: [0, 120],
    about: "زمان ترومبوپلاستین نسبی؛ مسیر دیگر انعقاد را می‌سنجد.",
    high: "بالا می‌تواند به دارو (هپارین) یا اختلالات انعقادی مربوط باشد." },

  // ---------- تیروئید ----------
  tsh: { label: "TSH", unit: "µIU/mL", cat: "thyroid", hard: [0.01, 100],
    range: () => ({ low: 0.5, high: 4.5 }),
    about: "هورمون محرک تیروئید؛ اصلی‌ترین آزمایش عملکرد تیروئید.",
    high: "بالا (با T4 طبیعی) می‌تواند نشانه کم‌کاری تیروئید باشد.",
    low: "پایین می‌تواند نشانه پرکاری تیروئید باشد." },
  t4: { label: "T4 تام", unit: "µg/dL", cat: "thyroid", hard: [1, 30],
    range: (s) => s === "female" ? { low: 5, high: 12 } : { low: 4, high: 12 },
    about: "هورمون تیروکسین؛ در کنار TSH تفسیر می‌شود.",
    high: "بالا می‌تواند به پرکاری تیروئید مربوط باشد.",
    low: "پایین می‌تواند به کم‌کاری تیروئید مربوط باشد." },
  t3_ngdl: { label: "T3 تام (ng/dL)", unit: "ng/dL", cat: "thyroid", hard: [20, 600],
    range: () => ({ low: 80, high: 180 }),
    about: "هورمون تری‌یدوتیرونین (واحد متعارف)؛ در کنار TSH و T4 تفسیر می‌شود.",
    high: "بالا می‌تواند به پرکاری تیروئید مربوط باشد.",
    low: "پایین در کنار سایر هورمون‌ها تفسیر می‌شود." },
  t3_nmol: { label: "T3 تام (nmol/L)", unit: "nmol/L", cat: "thyroid", hard: [0.3, 10],
    range: () => ({ low: 1.6, high: 3.1 }),
    about: "هورمون تری‌یدوتیرونین (واحد SI)؛ در کنار TSH و T4 تفسیر می‌شود.",
    high: "بالا می‌تواند به پرکاری تیروئید مربوط باشد.",
    low: "پایین در کنار سایر هورمون‌ها تفسیر می‌شود." },
  ft4: { label: "Free T4", unit: "ng/dL", cat: "thyroid", hard: [0.1, 8],
    range: () => ({ low: 0.7, high: 2.0 }),
    about: "تیروکسین آزاد؛ شکل فعال هورمون.",
    high: "بالا می‌تواند به پرکاری تیروئید مربوط باشد.",
    low: "پایین می‌تواند به کم‌کاری تیروئید مربوط باشد." },

  // ---------- ویتامین ----------
  vitd: { label: "ویتامین D (25-OH)", unit: "ng/mL", cat: "vitamin", hard: [3, 200],
    range: () => ({ low: 30, high: 100 }),
    about: "برای جذب کلسیم و سلامت استخوان ضروری است.",
    low: "کمتر از ۲۰ کمبود و ۲۰ تا ۲۹ ناکافی؛ کمبود بسیار شایع است." },
  b12: { label: "ویتامین B12", unit: "pg/mL", cat: "vitamin", hard: [50, 2000],
    range: () => ({ low: 200, high: 800 }),
    about: "برای سلول‌های عصبی و ساخت گلبول قرمز لازم است.",
    low: "پایین می‌تواند به مشکلات عصبی و کم‌خونی منجر شود." },
  folate: { label: "فولات", unit: "ng/mL", cat: "vitamin", hard: [1, 40],
    range: () => ({ low: 5, high: 25 }),
    about: "برای ساخت گلبول قرمز و سلامت سلول لازم است.",
    low: "پایین می‌تواند به کم‌خونی مربوط باشد." },
};

const CATS = {
  diabetes: { label: "قند و دیابت", icon: "🩸" },
  heart: { label: "چربی خون", icon: "❤️" },
  kidney: { label: "کلیه", icon: "🧪" },
  liver: { label: "کبد", icon: "🫀" },
  electro: { label: "الکترولیت", icon: "⚡" },
  iron: { label: "آهن", icon: "🔩" },
  cbc: { label: "شمارش خون (CBC)", icon: "🩺" },
  coag: { label: "انعقاد", icon: "🩹" },
  thyroid: { label: "تیروئید", icon: "🧬" },
  vitamin: { label: "ویتامین", icon: "🦴" },
};

const ST = {
  ok:   { fa: "🟢", label: "طبیعی", fg: "#0f5132", bg: "#d1e7dd", bar: "#198754" },
  watch:{ fa: "🔵", label: "نیاز به پیگیری", fg: "#0a4b78", bg: "#cfe8f5", bar: "#3d8fc0" },
  below:{ fa: "🟡", label: "پایین", fg: "#664d03", bg: "#fff3cd", bar: "#e0a800" },
  above:{ fa: "🔴", label: "بالا",  fg: "#842029", bg: "#f8d7da", bar: "#dc3545" },
  crit: { fa: "🚨", label: "بحرانی", fg: "#fff", bg: "#dc3545", bar: "#b02a37" },
};

function statusOf(key, v, sex, months) {
  const m = REF[key];
  const r = m.range(sex, months);
  // بررسی بحرانی:
  // اول critFn: منطق سفارشی مثل بیلی‌روبین نوزاد
  if (m.critFn && m.critFn(v, sex, months)) return "crit";
  // سپس crit: بازه ثابت، خارج از آن = بحرانی
  if (m.crit) {
    if (v < m.crit[0] || v > m.crit[1]) return "crit";
  }
  // تست‌هایی که crit یا critFn ندارند، هرگز بحرانی نمی‌شوند (فقط بالا/پایین)
  if (v < r.low) return "below";
  if (v > r.high) return "above";
  // نیاز به پیگیری: در محدوده طبیعی ولی نزدیک مرز (۱۰٪ لبه‌ها)
  const width = (r.high - r.low) || 1;
  const margin = width * 0.1;
  if (v <= r.low + margin || v >= r.high - margin) return "watch";
  return "ok";
}

// جهت مطلوب هر تست: آیا نزدیک شدن به محدوده = بهبود؟
// برای همه تست‌ها، حرکت به سمت محدوده طبیعی = بهبود در نظر گرفته می‌شود.
function trendOf(key, prev, curr, sex, months) {
  if (prev === undefined || prev === "" || curr === undefined || curr === "") return null;
  const p = parseFloat(prev), c = parseFloat(curr);
  if (isNaN(p) || isNaN(c)) return null;
  if (p === c) return { dir: "same", delta: 0 };
  const r = REF[key].range(sex, months);
  const mid = (r.low + r.high) / 2;
  // فاصله از مرکز محدوده طبیعی
  const distPrev = Math.abs(p - mid);
  const distCurr = Math.abs(c - mid);
  // اگر هر دو در محدوده طبیعی‌اند، تغییر کوچک را خنثی در نظر بگیر
  const prevOk = p >= r.low && p <= r.high;
  const currOk = c >= r.low && c <= r.high;
  const delta = c - p;
  let dir;
  if (prevOk && currOk) dir = "same";      // هر دو طبیعی
  else if (distCurr < distPrev) dir = "better"; // به محدوده نزدیک‌تر شد
  else dir = "worse";                        // از محدوده دورتر شد
  return { dir, delta };
}

const TREND = {
  better: { icon: "⬇", label: "بهبود", fg: "#0f5132", bg: "#d1e7dd" },
  worse:  { icon: "⬆", label: "بدتر", fg: "#842029", bg: "#f8d7da" },
  same:   { icon: "＝", label: "بدون تغییر", fg: "#6f685b", bg: "#f0ebe0" },
};

// تفسیر ترکیبی: بررسی الگوهای چند-تستی
function comboInsights(getVal, sex, age) {
  const out = [];
  const num = (k) => {
    const v = parseFloat(getVal(k));
    return isNaN(v) ? null : v;
  };
  const fbs = num("fbs"), tg = num("tg"), hdl = num("hdl"), chol = num("chol");
  const hb = num("hb"), ferritin = num("ferritin"), mcv = num("mcv");
  const tsh = num("tsh"), t4 = num("t4");

  // مقاومت به انسولین / سندروم متابولیک
  if (fbs !== null && fbs >= 100 && tg !== null && tg >= 150) {
    out.push("قند ناشتای بالا همراه با تری‌گلیسیرید بالا می‌تواند نشانه‌ای از مقاومت به انسولین یا سندروم متابولیک باشد. بررسی توسط پزشک توصیه می‌شود.");
  }
  // چربی نامطلوب
  if (hdl !== null && chol !== null && chol >= 200 && hdl < 40) {
    out.push("کلسترول تام بالا همراه با HDL پایین، الگوی نامطلوب چربی است و با خطر قلبی-عروقی مرتبط است.");
  }
  // کم‌خونی فقر آهن
  if (hb !== null && hb < 12 && ferritin !== null && ferritin < 30) {
    out.push("هموگلوبین پایین همراه با فریتین پایین، الگوی شایع کم‌خونی فقر آهن است.");
  }
  if (hb !== null && hb < 12 && mcv !== null && mcv < 80) {
    out.push("هموگلوبین پایین همراه با MCV پایین (کم‌خونی میکروسیتیک) اغلب به کمبود آهن مربوط است.");
  }
  // کم‌کاری تیروئید
  if (tsh !== null && tsh > 4.5 && t4 !== null && t4 < 5) {
    out.push("TSH بالا همراه با T4 پایین می‌تواند نشانه‌ای از کم‌کاری تیروئید باشد.");
  }
  return out;
}

const ALL = Object.keys(REF);

export default function App() {
  const [sex, setSex] = useState("male");
  const [age, setAge] = useState("");
  const [ageUnit, setAgeUnit] = useState("year"); // year | month | day
  const [pregnant, setPregnant] = useState(false);
  const [conditions, setConditions] = useState([]); // آرایه بیماری‌های زمینه‌ای
  const [vals, setVals] = useState({});
  const [activeCat, setActiveCat] = useState("diabetes");
  const [show, setShow] = useState(false);
  const [expanded, setExpanded] = useState({});
  const [compareMode, setCompareMode] = useState(false);
  const [prevVals, setPrevVals] = useState({}); // مقادیر آزمایش قبلی
  const [search, setSearch] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [aiError, setAiError] = useState("");
  const [imageDataUrl, setImageDataUrl] = useState("");
  const [imageName, setImageName] = useState("");
  const fileRef = useRef(null);

  // سن به ماه (برای تشخیص نوزاد). اگر واحد سال باشد، ماه معادل آن.
  const months = ageInMonths(age, ageUnit);

  function set(k, v) { setVals((s) => ({ ...s, [k]: v })); }
  const catKeys = search.trim()
    ? ALL.filter((k) => REF[k].label.includes(search.trim()) || k.includes(search.trim().toLowerCase()))
    : ALL.filter((k) => REF[k].cat === activeCat);

  const { rows, errs, criticalCount } = useMemo(() => {
    const rows = [], errs = [];
    let criticalCount = 0;
    ALL.forEach((k) => {
      const raw = vals[k];
      if (raw === undefined || raw === "") return;
      const v = parseFloat(raw);
      if (isNaN(v)) return;
      const [mn, mx] = REF[k].hard;
      if (v < mn || v > mx) { errs.push(`${REF[k].label}: مقدار ${v} غیرواقعی است (بازه ${mn}–${mx})`); return; }
      const status = statusOf(k, v, sex, months);
      if (status === "crit") criticalCount++;
      rows.push({ k, v, status });
    });
    return { rows, errs, criticalCount };
  }, [vals, sex, age]);

  const byCat = {};
  Object.keys(CATS).forEach((c) => { byCat[c] = []; });
  rows.forEach((r) => byCat[REF[r.k].cat].push(r));

  // ساخت متن نتایج برای فرستادن به AI
  function buildTestText() {
    return rows.map((r) => {
      const m = REF[r.k]; const ref = m.range(sex, months);
      return `${m.label}: ${r.v} ${m.unit} (محدوده طبیعی: ${ref.low}-${ref.high})`;
    }).join("\n");
  }
  function patientInfo() {
    const unitFa = ageUnit === "day" ? "روز" : ageUnit === "month" ? "ماه" : "سال";
    const parts = [
      `سن: ${age || "نامشخص"} ${age ? unitFa : ""}`,
      `جنسیت: ${sex === "female" ? "زن" : "مرد"}`,
    ];
    if (months != null && months < 6) parts.push("توجه: بیمار نوزاد است؛ محدوده‌های مرجع نوزادی لحاظ شود.");
    if (sex === "female" && pregnant) parts.push("وضعیت: باردار");
    if (conditions.length > 0) parts.push(`بیماری‌های زمینه‌ای: ${conditions.join("، ")}`);
    return parts.join("، ");
  }

  // فراخوانی سرور برای تفسیر متنی
  async function runAI() {
    setAiError(""); setAiResult(null);
    if (rows.length === 0 && !imageDataUrl) {
      setAiError("ابتدا مقادیری وارد کنید یا عکس آپلود کنید."); return;
    }
    setAiLoading(true);
    try {
      const payload = { patientInfo: patientInfo() };
      if (imageDataUrl) payload.imageDataUrl = imageDataUrl;
      else payload.testResults = buildTestText();
      const res = await fetch(PROXY_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("server");
      setAiResult(await res.json());
    } catch {
      setAiError("اتصال به سرور برقرار نشد. مطمئن شو سرور روشن است (node server.js).");
    } finally {
      setAiLoading(false);
    }
  }

  function onFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { setAiError("لطفاً یک فایل عکس انتخاب کنید."); return; }
    setImageName(file.name);
    const reader = new FileReader();
    reader.onload = () => setImageDataUrl(reader.result);
    reader.readAsDataURL(file);
  }

  return (
    <div dir="rtl" style={s.page}>
      <div style={s.shell}>
        <header style={s.header}>
          <div style={s.logo}><span style={s.mark}>◐</span><span style={s.brand}>خوانش</span></div>
          <p style={s.tag}>تفسیر آموزشی نتایج آزمایش خون</p>
        </header>

        <section style={s.card}>
          <div style={s.profRow}>
            <div style={s.field}>
              <label style={s.label}>سن</label>
              <div style={s.ageRow}>
                <input type="number" value={age} onChange={(e) => setAge(e.target.value)} placeholder="مقدار" style={{ ...s.input, flex: 1 }} />
                <div style={s.unitSeg}>
                  <button onClick={() => setAgeUnit("year")} style={{ ...s.unitBtn, ...(ageUnit === "year" ? s.unitOn : {}) }}>سال</button>
                  <button onClick={() => setAgeUnit("month")} style={{ ...s.unitBtn, ...(ageUnit === "month" ? s.unitOn : {}) }}>ماه</button>
                  <button onClick={() => setAgeUnit("day")} style={{ ...s.unitBtn, ...(ageUnit === "day" ? s.unitOn : {}) }}>روز</button>
                </div>
              </div>
            </div>
            <div style={s.field}>
              <label style={s.label}>جنسیت</label>
              <div style={s.segment}>
                <button onClick={() => setSex("male")} style={{ ...s.seg, ...(sex === "male" ? s.segOn : {}) }}>مرد</button>
                <button onClick={() => setSex("female")} style={{ ...s.seg, ...(sex === "female" ? s.segOn : {}) }}>زن</button>
              </div>
            </div>
          </div>

          {months != null && months < 6 && (
            <div style={s.neonateBadge}>👶 حالت نوزاد فعال است — محدوده‌های مرجع نوزادی برای هموگلوبین، هماتوکریت، RBC و پلاکت اعمال می‌شود.</div>
          )}

          {sex === "female" && (
            <label style={s.checkRow}>
              <input type="checkbox" checked={pregnant} onChange={(e) => setPregnant(e.target.checked)} style={{ width: 16, height: 16 }} />
              <span>باردار هستم</span>
            </label>
          )}

          <div style={s.condSection}>
            <label style={s.label}>بیماری‌های زمینه‌ای</label>
            <div style={s.condGrid}>
              {["دیابت", "فشار خون", "بیماری کلیوی", "بیماری کبدی"].map((c) => {
                const on = conditions.includes(c);
                return (
                  <button key={c} onClick={() => setConditions((arr) => on ? arr.filter((x) => x !== c) : [...arr, c])}
                    style={{ ...s.condChip, ...(on ? s.condOn : {}) }}>
                    {on ? "✓ " : ""}{c}
                  </button>
                );
              })}
            </div>
          </div>

          <label style={s.compareToggle}>
            <input type="checkbox" checked={compareMode} onChange={(e) => setCompareMode(e.target.checked)} style={{ width: 16, height: 16 }} />
            <span>مقایسه با آزمایش قبلی (وارد کردن دو نوبت)</span>
          </label>
        </section>

        <section style={s.card}>
          <input
            type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="🔍 جستجوی تست (مثلاً قند، TSH، هموگلوبین)..."
            style={s.searchBox}
          />
          {!search.trim() && <div style={s.catBar}>
            {Object.keys(CATS).map((c) => {
              const n = ALL.filter((k) => REF[k].cat === c && vals[k] && vals[k] !== "").length;
              return (
                <button key={c} onClick={() => setActiveCat(c)}
                  style={{ ...s.catBtn, ...(activeCat === c ? s.catOn : {}) }}>
                  {CATS[c].icon} {CATS[c].label}{n > 0 && <span style={s.catN}>{n}</span>}
                </button>
              );
            })}
          </div>}
          <div style={s.fieldsGrid}>
            {catKeys.map((k) => {
              const m = REF[k];
              const raw = vals[k] ?? "";
              const rawPrev = prevVals[k] ?? "";
              const v = parseFloat(raw);
              const [mn, mx] = m.hard;
              const bad = raw !== "" && !isNaN(v) && (v < mn || v > mx);
              const st = raw !== "" && !isNaN(v) && !bad ? statusOf(k, v, sex, months) : null;
              const r = m.range(sex, months);
              return (
                <div key={k} style={s.cell}>
                  <label style={s.cellLabel}>{m.label} <span style={s.unitInline}>{m.unit}</span></label>
                  {compareMode && (
                    <div style={s.cellInput}>
                      <span style={s.prevTag}>قبلی</span>
                      <input type="number" inputMode="decimal" value={rawPrev}
                        onChange={(e) => setPrevVals((s) => ({ ...s, [k]: e.target.value }))} placeholder="—"
                        style={{ ...s.smallInput, background: "#faf7f0" }} />
                    </div>
                  )}
                  <div style={s.cellInput}>
                    {compareMode && <span style={s.currTag}>فعلی</span>}
                    <input type="number" inputMode="decimal" value={raw}
                      onChange={(e) => set(k, e.target.value)} placeholder="—"
                      style={{ ...s.smallInput, borderColor: bad ? "#dc3545" : st ? ST[st].bar : "#d8d3c9" }} />
                    {st && <span style={s.fa}>{ST[st].fa}</span>}
                  </div>
                  <span style={s.refHint}>طبیعی: {r.low}–{r.high}</span>
                  {bad && <span style={s.cellErr}>غیرواقعی ({mn}–{mx})</span>}
                </div>
              );
            })}
          </div>
          <button onClick={() => setShow(true)} style={s.primary}>تحلیل و تفسیر</button>
          {errs.length > 0 && (
            <div style={s.errBox}>
              <div style={s.errTitle}>⚠️ بررسی شوند:</div>
              {errs.map((e, i) => <div key={i} style={s.errItem}>• {e}</div>)}
            </div>
          )}
        </section>

        {show && rows.length > 0 && (
          <>
            {criticalCount > 0 && (
              <div style={s.critBanner}>
                🚨 {criticalCount} مورد در محدوده بحرانی است. توصیه می‌شود در اسرع وقت به پزشک یا اورژانس مراجعه کنید.
              </div>
            )}
            {(() => {
              const insights = comboInsights((k) => vals[k], sex, age);
              if (insights.length === 0) return null;
              return (
                <section style={s.card}>
                  <h2 style={s.cardTitle}>💡 تفسیر ترکیبی</h2>
                  <div style={s.comboList}>
                    {insights.map((ins, i) => (
                      <div key={i} style={s.comboItem}>{ins}</div>
                    ))}
                  </div>
                </section>
              );
            })()}
            <section style={s.card}>
              <div style={s.resultHeader}>
                <h2 style={s.cardTitle}>نتایج و تفسیر</h2>
                <div style={s.exportBtns}>
                  <button style={s.exportBtn} onClick={() => {
                    const data = { sex, age, vals, prevVals: compareMode ? prevVals : undefined };
                    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url; a.download = "khanesh-results.json"; a.click();
                    URL.revokeObjectURL(url);
                  }}>خروجی JSON</button>
                  <label style={s.exportBtn}>
                    واردات JSON
                    <input type="file" accept=".json" style={{ display: "none" }} onChange={(e) => {
                      const f = e.target.files?.[0]; if (!f) return;
                      const reader = new FileReader();
                      reader.onload = () => {
                        try {
                          const d = JSON.parse(reader.result);
                          if (d.sex) setSex(d.sex);
                          if (d.age) setAge(d.age);
                          if (d.vals) setVals(d.vals);
                          if (d.prevVals) { setPrevVals(d.prevVals); setCompareMode(true); }
                          setShow(true);
                        } catch { alert("فایل معتبر نیست"); }
                      };
                      reader.readAsText(f);
                    }} />
                  </label>
                </div>
              </div>
              {rows.map((row) => {
                const m = REF[row.k], r = m.range(sex, months), st = ST[row.status];
                const span = (r.high - r.low) || 1;
                const lo = Math.max(m.hard[0], r.low - span * 0.6);
                const hi = Math.min(m.hard[1], r.high + span * 0.6);
                const pct = (x) => ((Math.max(lo, Math.min(hi, x)) - lo) / (hi - lo)) * 100;
                const nl = pct(r.low), nw = pct(r.high) - nl, mk = pct(row.v);
                const note = row.status === "above" || row.status === "crit"
                  ? (m.high || m.about)
                  : row.status === "below" ? (m.low || m.about) : m.about;
                const isOpen = expanded[row.k];
                return (
                  <div key={row.k} style={s.resRow}>
                    <div style={s.resTop}>
                      <span style={s.resName}>{m.label}</span>
                      <span style={s.resVal}>{row.v} <span style={s.resUnit}>{m.unit}</span></span>
                      <span style={s.resRange}>{r.low}–{r.high}</span>
                      <span style={{ ...s.badge, color: st.fg, background: st.bg }}>{st.fa} {st.label}</span>
                      {(() => {
                        if (!compareMode) return null;
                        const t = trendOf(row.k, prevVals[row.k], vals[row.k], sex, months);
                        if (!t) return null;
                        const tr = TREND[t.dir];
                        return (
                          <span style={{ ...s.trendPill, color: tr.fg, background: tr.bg }}>
                            {tr.icon} {tr.label} {t.delta !== 0 && `(${prevVals[row.k]} ← ${vals[row.k]})`}
                          </span>
                        );
                      })()}
                    </div>
                    <div style={s.track}>
                      <div style={{ ...s.normal, left: nl + "%", width: nw + "%" }} />
                      <div style={{ ...s.marker, left: mk + "%", background: st.bar }} />
                    </div>
                    <div style={s.noteRow}>
                      <span style={s.note}>{note}</span>
                      {m.about && note !== m.about && (
                        <button style={s.moreBtn} onClick={() => setExpanded((e) => ({ ...e, [row.k]: !e[row.k] }))}>
                          {isOpen ? "بستن" : "این تست چیست؟"}
                        </button>
                      )}
                    </div>
                    {isOpen && <div style={s.aboutBox}>{m.about}</div>}
                  </div>
                );
              })}
            </section>
          </>
        )}

        {/* بخش تفسیر هوشمند با AI + آپلود عکس */}
        <section style={s.card}>
          <h2 style={s.cardTitle}>🤖 تفسیر هوشمند با هوش مصنوعی</h2>
          <p style={s.aiIntro}>
            برای تحلیل عمیق‌تر و توصیه‌های شخصی، مقادیر را وارد کن (یا عکس برگه آزمایش را آپلود کن) و دکمه زیر را بزن.
          </p>

          <div
            onClick={() => fileRef.current?.click()}
            style={s.aiDropzone}
          >
            {imageDataUrl ? (
              <div style={s.aiPreviewWrap}>
                <img src={imageDataUrl} alt="برگه" style={s.aiPreview} />
                <span style={s.aiFileName}>{imageName} — برای تغییر کلیک کن</span>
              </div>
            ) : (
              <div style={s.aiDropInner}>
                <span style={{ fontSize: 28 }}>📄</span>
                <span style={s.aiDropText}>عکس برگه آزمایش را آپلود کن (اختیاری)</span>
              </div>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" onChange={onFile} style={{ display: "none" }} />

          <button onClick={runAI} disabled={aiLoading} style={{ ...s.aiBtn, opacity: aiLoading ? 0.6 : 1 }}>
            {aiLoading ? "در حال تحلیل با هوش مصنوعی..." : "✨ تفسیر هوشمند با AI"}
          </button>

          {aiError && <div style={s.aiErr}>{aiError}</div>}

          {aiResult && !aiResult.error && (
            <div style={s.aiResultWrap}>
              {aiResult.has_critical && (
                <div style={s.aiCritBanner}>🚨 موارد بحرانی شناسایی شد — مراجعه فوری به پزشک توصیه می‌شود.</div>
              )}
              {aiResult.summary && (
                <div style={s.aiBlock}>
                  <div style={s.aiBlockTitle}>خلاصه</div>
                  <p style={s.aiText}>{aiResult.summary}</p>
                </div>
              )}
              {aiResult.extracted_tests?.length > 0 && (
                <div style={s.aiBlock}>
                  <div style={s.aiBlockTitle}>مقادیر خوانده‌شده از عکس</div>
                  {aiResult.extracted_tests.map((t, i) => (
                    <div key={i} style={s.aiExtract}>
                      <b>{t.test}</b>: {t.value} {t.reference && <span style={{ color: "#a39a88" }}>(مرجع: {t.reference})</span>}
                    </div>
                  ))}
                </div>
              )}
              {aiResult.interpretation && (
                <div style={s.aiBlock}>
                  <div style={s.aiBlockTitle}>تفسیر</div>
                  <p style={s.aiText}>{aiResult.interpretation}</p>
                </div>
              )}
              {aiResult.general_recommendations?.length > 0 && (
                <div style={s.aiBlock}>
                  <div style={s.aiBlockTitle}>توصیه‌ها</div>
                  <ul style={s.aiRecList}>
                    {aiResult.general_recommendations.map((r, i) => <li key={i} style={s.aiRecItem}>{r}</li>)}
                  </ul>
                </div>
              )}
              {aiResult.disclaimer && <div style={s.aiDisclaimer}>{aiResult.disclaimer}</div>}
            </div>
          )}
        </section>

        <footer style={s.footer}>
          محدوده‌ها بر اساس مراجع استاندارد است و ممکن است با کیت آزمایشگاه شما اندکی فرق کند. این ابزار آموزشی است و جایگزین پزشک نیست.
          <br />
          بخشی از اطلاعات تفسیر هوشمند از <a href="https://medlineplus.gov" target="_blank" rel="noopener noreferrer" style={s.footerLink}>MedlinePlus.gov</a> (کتابخانه ملی پزشکی آمریکا) تأمین می‌شود.
        </footer>
      </div>
    </div>
  );
}

const s = {
  page: { minHeight: "100vh", background: "#faf7f0", fontFamily: "'Vazirmatn', system-ui, sans-serif", color: "#2b2b28", padding: "20px 14px" },
  shell: { maxWidth: 960, margin: "0 auto" },
  header: { textAlign: "center", marginBottom: 18 },
  logo: { display: "inline-flex", alignItems: "center", gap: 8 },
  mark: { fontSize: 28, color: "#2f6f6b" },
  brand: { fontSize: 26, fontWeight: 800 },
  tag: { margin: "6px 0 0", color: "#8a8272", fontSize: 13.5 },
  card: { background: "#fff", borderRadius: 18, border: "1px solid #eee6d8", padding: 16, marginBottom: 14, boxShadow: "0 1px 2px rgba(0,0,0,.03)" },
  cardTitle: { margin: "0 0 14px", fontSize: 16, fontWeight: 700 },
  profRow: { display: "flex", gap: 12 },
  field: { display: "flex", flexDirection: "column", gap: 6, flex: 1 },
  label: { fontSize: 13, fontWeight: 600, color: "#6f685b" },
  input: { padding: "9px 11px", borderRadius: 10, border: "1.5px solid #d8d3c9", fontSize: 14, fontFamily: "inherit", outline: "none" },
  segment: { display: "flex", background: "#f5f0e6", borderRadius: 10, padding: 3 },
  seg: { flex: 1, padding: "8px 0", border: "none", background: "transparent", borderRadius: 8, fontSize: 13.5, fontWeight: 600, color: "#8a8272", fontFamily: "inherit" },
  segOn: { background: "#2f6f6b", color: "#fff" },
  compareToggle: { display: "flex", alignItems: "center", gap: 8, marginTop: 14, fontSize: 13, fontWeight: 600, color: "#4a463d", cursor: "pointer" },
  ageRow: { display: "flex", gap: 8, alignItems: "center" },
  unitSeg: { display: "flex", background: "#f5f0e6", borderRadius: 8, padding: 2 },
  unitBtn: { padding: "6px 10px", border: "none", background: "transparent", borderRadius: 6, fontSize: 12, fontWeight: 600, color: "#8a8272", cursor: "pointer", fontFamily: "inherit" },
  unitOn: { background: "#2f6f6b", color: "#fff" },
  neonateBadge: { marginTop: 12, padding: "10px 12px", borderRadius: 10, background: "#e7f3ff", border: "1px solid #b8ddf5", color: "#0a4b78", fontSize: 12.5, lineHeight: 1.7 },
  checkRow: { display: "flex", alignItems: "center", gap: 8, marginTop: 12, fontSize: 13, fontWeight: 600, color: "#4a463d", cursor: "pointer" },
  condSection: { marginTop: 14 },
  condGrid: { display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 },
  condChip: { padding: "7px 12px", borderRadius: 999, border: "1px solid #eee6d8", background: "#fff", color: "#6f685b", fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" },
  condOn: { background: "#2f6f6b", color: "#fff", borderColor: "#2f6f6b" },
  searchBox: { width: "100%", padding: "10px 12px", borderRadius: 10, border: "1.5px solid #d8d3c9", fontSize: 14, fontFamily: "inherit", outline: "none", marginBottom: 14, background: "#fdfbf6" },
  comboList: { display: "flex", flexDirection: "column", gap: 10 },
  comboItem: { fontSize: 13, lineHeight: 1.9, color: "#4a463d", background: "#fff8e6", border: "1px solid #ffe69c", borderRadius: 10, padding: "10px 12px" },
  resultHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 14 },
  exportBtns: { display: "flex", gap: 8 },
  exportBtn: { fontSize: 12, fontWeight: 700, padding: "6px 12px", borderRadius: 9, border: "1px solid #2f6f6b", background: "#fff", color: "#2f6f6b", cursor: "pointer", fontFamily: "inherit" },
  unitInline: { fontSize: 10, color: "#a39a88", fontWeight: 400 },
  prevTag: { fontSize: 10, color: "#a39a88", minWidth: 26 },
  currTag: { fontSize: 10, color: "#2f6f6b", fontWeight: 700, minWidth: 26 },
  trendPill: { fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 999 },
  catBar: { display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 },
  catBtn: { padding: "6px 10px", borderRadius: 999, border: "1px solid #eee6d8", background: "#fff", color: "#6f685b", fontSize: 12, fontWeight: 600, fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 5 },
  catOn: { background: "#2f6f6b", color: "#fff", borderColor: "#2f6f6b" },
  catN: { background: "rgba(255,255,255,.25)", borderRadius: 999, padding: "0 6px", fontSize: 10.5, fontWeight: 700 },
  fieldsGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 11, marginBottom: 16 },
  cell: { display: "flex", flexDirection: "column", gap: 3 },
  cellLabel: { fontSize: 12, fontWeight: 600, color: "#6f685b" },
  cellInput: { display: "flex", alignItems: "center", gap: 5 },
  smallInput: { width: "100%", padding: "7px", borderRadius: 8, border: "1.5px solid #d8d3c9", fontSize: 13.5, fontFamily: "inherit", outline: "none", textAlign: "center" },
  unit: { fontSize: 10, color: "#a39a88", whiteSpace: "nowrap" },
  fa: { fontSize: 12 },
  refHint: { fontSize: 10.5, color: "#a39a88" },
  cellErr: { fontSize: 10.5, color: "#dc3545", lineHeight: 1.5 },
  primary: { width: "100%", padding: 12, borderRadius: 12, border: "none", background: "#2f6f6b", color: "#fff", fontSize: 15, fontWeight: 700, fontFamily: "inherit" },
  errBox: { marginTop: 12, padding: 12, background: "#fff3cd", border: "1px solid #ffe69c", borderRadius: 10 },
  errTitle: { fontSize: 12.5, fontWeight: 700, color: "#664d03", marginBottom: 5 },
  errItem: { fontSize: 12, color: "#664d03", lineHeight: 1.8 },
  critBanner: { padding: "14px 16px", borderRadius: 14, background: "#dc3545", color: "#fff", fontSize: 14, fontWeight: 700, lineHeight: 1.8, marginBottom: 14 },
  resRow: { paddingBottom: 16, borderBottom: "1px solid #f5f0e6", marginBottom: 16 },
  resTop: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 8 },
  resName: { fontSize: 13.5, fontWeight: 700, minWidth: 90 },
  resVal: { fontSize: 13, color: "#2f6f6b", fontWeight: 600 },
  resUnit: { fontSize: 10, color: "#a39a88", fontWeight: 400 },
  resRange: { fontSize: 11.5, color: "#8a8272" },
  badge: { fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 999 },
  track: { position: "relative", height: 8, background: "#f0ebe0", borderRadius: 999, marginBottom: 8 },
  normal: { position: "absolute", height: "100%", background: "#c6e6d3", borderRadius: 999 },
  marker: { position: "absolute", top: "50%", width: 14, height: 14, borderRadius: "50%", transform: "translate(-50%,-50%)", border: "2px solid #fff", boxShadow: "0 1px 3px rgba(0,0,0,.25)" },
  noteRow: { display: "flex", alignItems: "flex-start", gap: 8, justifyContent: "space-between" },
  note: { fontSize: 12.5, color: "#6f685b", lineHeight: 1.8, flex: 1 },
  moreBtn: { fontSize: 11, color: "#2f6f6b", background: "none", border: "none", fontWeight: 700, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" },
  aboutBox: { marginTop: 8, padding: "10px 12px", background: "#f5f0e6", borderRadius: 10, fontSize: 12.5, color: "#6f685b", lineHeight: 1.8 },
  footer: { textAlign: "center", color: "#a39a88", fontSize: 11.5, marginTop: 8, lineHeight: 1.8 },
  footerLink: { color: "#2f6f6b", fontWeight: 600, textDecoration: "none" },
  aiIntro: { fontSize: 13, color: "#6f685b", lineHeight: 1.9, marginBottom: 14 },
  aiDropzone: { border: "2px dashed #d8d3c9", borderRadius: 12, padding: 16, cursor: "pointer", background: "#fdfbf6", marginBottom: 12 },
  aiDropInner: { display: "flex", flexDirection: "column", alignItems: "center", gap: 6, textAlign: "center" },
  aiDropText: { fontSize: 13, color: "#6f685b", fontWeight: 600 },
  aiPreviewWrap: { display: "flex", flexDirection: "column", alignItems: "center", gap: 8 },
  aiPreview: { maxWidth: "100%", maxHeight: 200, borderRadius: 10, border: "1px solid #eee6d8" },
  aiFileName: { fontSize: 12, color: "#8a8272" },
  aiBtn: { width: "100%", padding: 13, borderRadius: 12, border: "none", background: "linear-gradient(135deg, #2f6f6b, #3d8f89)", color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" },
  aiErr: { marginTop: 12, padding: "10px 12px", borderRadius: 10, background: "#f8d7da", color: "#842029", fontSize: 13, lineHeight: 1.7 },
  aiResultWrap: { marginTop: 16, display: "flex", flexDirection: "column", gap: 14 },
  aiCritBanner: { padding: "12px 14px", borderRadius: 12, background: "#dc3545", color: "#fff", fontSize: 14, fontWeight: 700, lineHeight: 1.7 },
  aiBlock: {},
  aiBlockTitle: { fontSize: 13, fontWeight: 700, color: "#2f6f6b", marginBottom: 6 },
  aiText: { margin: 0, fontSize: 13.5, lineHeight: 1.9, color: "#4a463d" },
  aiExtract: { fontSize: 13, lineHeight: 1.9, color: "#4a463d" },
  aiRecList: { margin: 0, paddingRight: 18, display: "flex", flexDirection: "column", gap: 5 },
  aiRecItem: { fontSize: 13.5, lineHeight: 1.8, color: "#4a463d" },
  aiDisclaimer: { padding: "10px 12px", borderRadius: 10, background: "#f5f0e6", color: "#8a8272", fontSize: 12, lineHeight: 1.8 },
};
