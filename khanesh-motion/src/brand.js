// رنگ‌ها و اندازه‌ها از توکن‌های خودِ سایت برداشته شده‌اند (khanesh/src/index.css)
// تا تیزر با سایت یکدست باشد. اگر توکنی در سایت عوض شد، همین‌جا عوضش کنید.
export const C = {
  page: "#faf7f0",
  card: "#ffffff",
  sunken: "#f7f8fa",
  track: "#eef0f3",
  ink: "#16202c",
  ink2: "#5a6675",
  ink3: "#6f685b",
  line: "#e6e3dc",
  borderCard: "#eee6d8",
  brand: "#2f6f6b",
  brandDeep: "#26605c",
  brandSoft: "#e6f4f3",
  brandInk: "#0b4a47",
  brandLine: "#bfe0dd",
  normalFg: "#1f6b45",
  normalBg: "#eaf4ee",
  outFg: "#7a4408",
  outBg: "#fff3e5",
  red: "#b3261e", // فقط صحنهٔ اول، برای دو-سه عدد (طبقِ بریف)
  redSoft: "#fdecea",
  warnBg: "#fdf3e2",
};

export const FONT = "'Vazirmatn', system-ui, sans-serif";
export const BRAND_FA = "آزمایار";
export const SLOGAN = "دستیار تفسیر آزمایش";

// ⚠️ آدرسِ سایت در کد پیدا نشد. وقتی دامنه قطعی شد اینجا بنویسید (مثلاً "azmayar.ir")؛
// تا خالی است، صحنهٔ آخر فقط شعار را نشان می‌دهد و آدرسی ساختگی چاپ نمی‌کند.
export const SITE_URL = "";

export const FPS = 30;
export const DURATION = 40 * FPS; // ۱۲۰۰ فریم

// مرزِ صحنه‌ها (فریم) — مطابقِ بریف
export const SCENES = {
  hook: [0, 150],
  problem: [150, 330],
  intro: [330, 480],
  usage: [480, 720],
  result: [720, 960],
  trust: [960, 1110],
  cta: [1110, 1200],
};

// زیرنویس = متنِ نریشن. همین جدول SRT را هم می‌سازد (scripts/make-srt.mjs)،
// پس نریشن را با همین زمان‌ها ضبط کنید.
export const CAPTIONS = [
  { from: 0.3, to: 4.6, text: "جواب آزمایش آمد… ولی این همه عدد یعنی چی؟" },
  { from: 5.3, to: 10.6, text: "تا وقت دکتر، یا گوگل می‌کنی و نگران‌تر می‌شوی، یا فقط منتظر می‌مانی." },
  { from: 11.3, to: 15.6, text: "آزمایار آزمایشت را به زبان ساده برایت می‌خواند." },
  { from: 16.3, to: 19.8, text: "از برگه عکس بگیر، یا عددها را خودت بنویس." },
  { from: 20.0, to: 23.7, text: "آزمایار می‌گوید کدام در محدوده است و کدام نیست." },
  { from: 24.3, to: 28.0, text: "معنی هر عدد را می‌فهمی، می‌دانی چقدر فوریت دارد،" },
  { from: 28.1, to: 31.7, text: "و می‌دانی از پزشکت چه بپرسی." },
  { from: 32.3, to: 34.6, text: "قضاوت بر پایهٔ قاعده‌های مشخص پزشکی است، نه حدس." },
  { from: 34.7, to: 36.8, text: "هوش مصنوعی فقط متن را روان می‌کند." },
  { from: 37.2, to: 39.8, text: "آزمایار؛ آزمایشت را بفهم، بعد با پزشکت حرف بزن." },
];
