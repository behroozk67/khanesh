// ============================================================
// دریافت و فشرده‌سازیِ عکسِ برگه — استخراج‌شده از Tafsir.jsx بدون تغییرِ رفتار.
// هر تصمیمِ اینجا از یک شکستِ واقعی روی گوشیِ کاربر آمده؛ کامنت‌ها همراهش
// منتقل شده‌اند چون بدونشان، نفرِ بعدی همان محافظ را برمی‌دارد.
// ============================================================

export const MAX_IMAGES = 5;
const MAX_WIDTH = 1200;         // برای OCR کافی است
const MAX_PIXELS = 6_000_000;   // سقف امن مساحت canvas (سافاری/iOS بالای ~۱۶.۷MP بلانک می‌دهد)
const JPEG_QUALITY = 0.85;

// آیا این فایل عکس است؟
// بعضی فایل‌پیکرها (به‌خصوص روی آیفون) f.type را خالی می‌دهند،
// پس فقط به MIME تکیه نکن — پسوند را هم چک کن.
const IMG_EXT = /\.(jpe?g|png|gif|webp|bmp|heic|heif|tiff?)$/i;
export function looksLikeImage(file) {
  if (file.type && file.type.startsWith("image/")) return true;
  if (file.type) return false;              // MIME داد ولی عکس نبود
  return IMG_EXT.test(file.name || "");     // MIME نداد → پسوند
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
export async function compressImage(file, maxWidth = MAX_WIDTH, quality = JPEG_QUALITY) {
  const dec = await decodeImage(file);
  try {
    if (!dec.w || !dec.h) throw new Error("decode_failed");
    // هم عرض را محدود می‌کنیم هم مساحت کل را. قبلاً فقط عرض محدود می‌شد؛
    // یک برگهٔ بلند (مثلاً ۳۰۰۰×۱۲۰۰۰) بعد از مقیاسِ عرض هنوز از سقف پیکسل
    // مرورگر رد می‌شد و canvas خالی/بریده برمی‌گشت — بی‌آنکه toDataURL خطا دهد.
    const widthScale = Math.min(1, maxWidth / dec.w);
    const areaScale = Math.min(1, Math.sqrt(MAX_PIXELS / (dec.w * dec.h)));
    const scale = Math.min(widthScale, areaScale);
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(dec.w * scale));
    canvas.height = Math.max(1, Math.round(dec.h * scale));
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(dec.src, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", quality);
  } finally {
    dec.close();
  }
}
