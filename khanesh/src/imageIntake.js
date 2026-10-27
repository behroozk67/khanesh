// ============================================================
// دریافت و فشرده‌سازیِ عکسِ برگه — استخراج‌شده از Tafsir.jsx بدون تغییرِ رفتار.
// هر تصمیمِ اینجا از یک شکستِ واقعی روی گوشیِ کاربر آمده؛ کامنت‌ها همراهش
// منتقل شده‌اند چون بدونشان، نفرِ بعدی همان محافظ را برمی‌دارد.
// ============================================================

export const MAX_IMAGES = 5;
export const MAX_WIDTH = 1200;         // برای OCR کافی است
export const MAX_PIXELS = 6_000_000;   // سقف امن مساحت canvas (سافاری/iOS بالای ~۱۶.۷MP بلانک می‌دهد)
export const JPEG_QUALITY = 0.85;

// مقیاسِ کوچک‌سازی — یک قاعده برای عکس و صفحهٔ PDF (pdfIntake.js).
// هم عرض را محدود می‌کنیم هم مساحت کل را. قبلاً فقط عرض محدود می‌شد؛
// یک برگهٔ بلند (مثلاً ۳۰۰۰×۱۲۰۰۰) بعد از مقیاسِ عرض هنوز از سقف پیکسل
// مرورگر رد می‌شد و canvas خالی/بریده برمی‌گشت — بی‌آنکه toDataURL خطا دهد.
//
// upscale: عکس هرگز بزرگ نمی‌شود (پیکسلِ تازه‌ای نمی‌سازد). صفحهٔ PDF برداری است و
// در مقیاسِ ۱ فقط ۷۲ dpi است (A4 = ۵۹۵ پیکسل، متنِ ۱۲ پوینت ≈ ۱۲ پیکسل) — برای
// OCR کم. پس pdfIntake.js با upscale:true تا همان سقفِ عرض/مساحت رندر می‌کند.
// (اندازه‌گیری‌شده ۲۰۲۶-۱۰-۱۶: بدونِ این گزینه صفحهٔ A4 با عرضِ ۵۹۵ رفت.)
export function fitScale(w, h, maxWidth = MAX_WIDTH, { upscale = false } = {}) {
  const cap = upscale ? Infinity : 1;
  const widthScale = Math.min(cap, maxWidth / w);
  const areaScale = Math.min(cap, Math.sqrt(MAX_PIXELS / (w * h)));
  return Math.min(widthScale, areaScale);
}

export function encodeCanvas(canvas, quality = JPEG_QUALITY) {
  return canvas.toDataURL("image/jpeg", quality);
}

// آیا این فایل عکس است؟
// بعضی فایل‌پیکرها (به‌خصوص روی آیفون) f.type را خالی می‌دهند،
// پس فقط به MIME تکیه نکن — پسوند را هم چک کن.
const IMG_EXT = /\.(jpe?g|png|gif|webp|bmp|heic|heif|tiff?)$/i;
export function looksLikeImage(file) {
  if (file.type && file.type.startsWith("image/")) return true;
  if (file.type) return false;              // MIME داد ولی عکس نبود
  return IMG_EXT.test(file.name || "");     // MIME نداد → پسوند
}

// آیا این فایل PDF است؟ همان منطقِ looksLikeImage: فایل‌پیکرِ آیفون گاهی
// f.type را خالی می‌دهد، پس بی‌MIME به پسوند نگاه می‌کنیم. این فقط ادعاست؛
// pdfIntake.js پیش از باز کردن، امضای «%PDF-» را در بایت‌های اول هم چک می‌کند.
// این تابع عمداً اینجاست (نه در pdfIntake.js) تا تشخیص، pdf.js را بار نکند.
export function looksLikePdf(file) {
  // نام هم معیار است، نه فقط type: فایل‌پیکرِ اندروید (دانلودها/تلگرام/درایو)
  // گاهی PDF را با typeِ «application/octet-stream» می‌دهد و با اعتمادِ صرف به
  // type، فایل به مسیرِ عکس می‌افتاد و پیامِ بی‌ربط می‌گرفت. امضای «%PDF-» بعداً
  // در pdfIntake.js دوباره چک می‌شود، پس این‌جا سخاوتمند بودن ضرری ندارد.
  if (file.type === "application/pdf") return true;
  if (/\.pdf$/i.test(file.name || "")) return true;
  return false;
}

// دیکود عکس با دو مسیر.
// createImageBitmap سریع است ولی روی HEIC (عکس پیش‌فرض دوربین آیفون)
// در خیلی از مرورگرها خطا می‌دهد. سافاری HEIC را با تگ <img> دیکود می‌کند.
async function decodeImage(file) {
  try {
    const bmp = await createImageBitmap(file);
    return { src: bmp, w: bmp.width, h: bmp.height, close: () => bmp.close() };
  } catch {
    // fallback — سافاری/آیفون
    const url = URL.createObjectURL(file);
    try {
      const img = await new Promise((resolve, reject) => {
        const el = new Image();
        el.onload = () => resolve(el);
        el.onerror = () => reject(new Error("decode_failed"));
        el.src = url;
      });
      return {
        src: img,
        w: img.naturalWidth,
        h: img.naturalHeight,
        close: () => URL.revokeObjectURL(url),
      };
    } catch (e) {
      URL.revokeObjectURL(url);
      throw e;
    }
  }
}

// فشرده‌سازی: عکس موبایل ۸ مگابایتی → ~۴۰۰ کیلوبایت.
// این هم آپلود را سریع می‌کند، هم AvalAI را، هم از سقف بدنه رد نمی‌شود.
//
// ⚠️ حریم خصوصی، صریح: این تابع فقط اندازه را کم می‌کند. برش یا سانسور
//    نمی‌کند. کلِ عکسِ برگه — نام، کد ملی، مهرِ پزشک — به مدلِ بینایی
//    می‌رود. «ما شناسه نمی‌فرستیم» دربارهٔ خروجیِ OCR راست است و دربارهٔ
//    خودِ آپلود نه؛ در متنِ رو به کاربر این قید حذف نشود.
//    همین برای PDF هم صادق است (specs/017): pdfIntake.js هر صفحه را به JPEG
//    رندر می‌کند و همان‌طور می‌فرستد — با همهٔ شناسه‌های چاپ‌شده روی آن.
export async function compressImage(file, maxWidth = MAX_WIDTH, quality = JPEG_QUALITY) {
  const dec = await decodeImage(file);
  try {
    if (!dec.w || !dec.h) throw new Error("decode_failed");
    const scale = fitScale(dec.w, dec.h, maxWidth);   // سقفِ عرض و مساحت — توضیح بالای fitScale
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(dec.w * scale));
    canvas.height = Math.max(1, Math.round(dec.h * scale));
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(dec.src, 0, 0, canvas.width, canvas.height);
    return encodeCanvas(canvas, quality);
  } finally {
    dec.close();
  }
}
