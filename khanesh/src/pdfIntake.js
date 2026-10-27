// ============================================================
// PDFِ برگهٔ آزمایش ← تصویرِ هر صفحه (specs/017).
// این ماژول فقط با import() بار می‌شود؛ کاربری که PDF انتخاب نکند pdf.js را
// دانلود نمی‌کند (FR-013). خروجیِ هر صفحه همان JPEGی است که عکسِ فشرده‌شده
// می‌دهد — با همان fitScale و encodeCanvas — پس از اینجا به بعد سرور و موتور
// فرقی بین PDF و عکس نمی‌بینند (FR-003، FR-010).
//
// ⚠️ متنِ داخلِ PDF هرگز خوانده نمی‌شود (getTextContent صدا زده نمی‌شود، FR-014):
//    فقط تصویرِ رندرشده می‌رود، تا مسیرِ OCR و تورهای ایمنی همان مسیرِ عکس بماند.
// ⚠️ حریم خصوصی، همان قیدِ compressImage: صفحهٔ رندرشده کاملاً به مدلِ بینایی
//    می‌رود — نام، کد ملی، مهر. هیچ برش یا سانسوری اینجا نیست.
//
// legacy build عمداً: نسخهٔ مدرن از Promise.withResolvers و مانندِ آن استفاده
// می‌کند که آیفون‌های قدیمی ندارند (research R1).
// ============================================================

import { getDocument, GlobalWorkerOptions } from "pdfjs-dist/legacy/build/pdf.mjs";
import workerUrl from "pdfjs-dist/legacy/build/pdf.worker.min.mjs?url";
import { fitScale, encodeCanvas } from "./imageIntake.js";

// fallback: اگر ساختِ کارگر از Blob ممکن نشد، pdf.js خودش همین URL را بار می‌کند
GlobalWorkerOptions.workerSrc = workerUrl;

// دارایی‌های جانبی (specs/017): wasm برای JBIG2/JPX/ICC و فونت‌های استاندارد.
// این‌ها با scripts/copy-pdfjs-assets.mjs در public/ گذاشته می‌شوند.
const assetBase = new URL(import.meta.env.BASE_URL || "/", window.location.href);
const wasmUrl = new URL("wasm/", assetBase).href;
const standardFontDataUrl = new URL("standard_fonts/", assetBase).href;

// code: "password" | "unreadable" | "empty" | "worker"
export class PdfIntakeError extends Error {
  constructor(code, cause) {
    super(code);
    this.name = "PdfIntakeError";
    this.code = code;
    if (cause) this.cause = cause;
  }
}

const MAGIC = [0x25, 0x50, 0x44, 0x46, 0x2d]; // "%PDF-"

// ── بارگذاریِ کارگر از Blob (گزارشِ کاربر ۲۰۲۶-۱۰-۲۱) ──
// کارگرِ pdf.js یک module worker است؛ مرورگر اسکریپتِ ماژول را فقط با MIMEِ
// JavaScript اجرا می‌کند. nginx 1.18 پسوندِ mjs را نمی‌شناخت ⇒ octet-stream ⇒
// «ابزارِ خواندنِ PDF بارگیری نشد». هدرِ سرور اصلاح شد، ولی نسخهٔ خرابِ همان فایل
// با Cache-Control: immutable یک‌ساله در مرورگرِ کاربران ماند و «هنوز خطا می‌دهد»
// شد. حالا متنِ کارگر را خودمان می‌گیریم و به Blob با typeِ درست تبدیل می‌کنیم:
// هدرِ Content-Type و کشِ مرورگر هیچ نقشی ندارند و این مسیر یک‌بار برای همیشه بسته است.
async function makeWorker() {
  const res = await fetch(workerUrl, { credentials: "same-origin" });
  if (!res.ok) throw new PdfIntakeError("worker", new Error(`worker HTTP ${res.status}`));
  const source = await res.text();
  if (!source || source.length < 1000) {
    throw new PdfIntakeError("worker", new Error("worker body too small"));
  }
  const blobUrl = URL.createObjectURL(new Blob([source], { type: "text/javascript" }));
  try {
    return { worker: new Worker(blobUrl, { type: "module" }), blobUrl };
  } catch (e) {
    URL.revokeObjectURL(blobUrl);
    throw e;
  }
}

export async function openPdf(file) {
  let bytes;
  try {
    bytes = new Uint8Array(await file.arrayBuffer());
  } catch (e) {
    throw new PdfIntakeError("unreadable", e);
  }
  // فایلی که فقط پسوندِ .pdf دارد (مثلاً متنِ تغییرنام‌داده) پیش از pdf.js رد می‌شود
  if (bytes.length < MAGIC.length || MAGIC.some((b, i) => bytes[i] !== b)) {
    throw new PdfIntakeError("unreadable");
  }

  let made = null;
  try {
    made = await makeWorker();
    GlobalWorkerOptions.workerPort = made.worker;
  } catch (e) {
    // رها می‌کنیم تا pdf.js با workerSrc تصمیم بگیرد (مسیرِ fallback)
    console.warn("[pdf] blob worker unavailable, falling back to workerSrc:", e?.message || e);
  }

  const task = getDocument({ data: bytes, wasmUrl, standardFontDataUrl });
  let doc;
  try {
    doc = await task.promise;
  } catch (e) {
    // task.destroy کارگر را آزاد می‌کند؛ بدونش هر تلاشِ ناموفق یک worker جا می‌گذارد
    try { await task.destroy(); } catch { /* ignore */ }
    console.error("[pdf] open failed:", e?.name, e?.message || e);
    // تازه وقتی کارگرِ خودمان ساخته نشده، شکست را به گردنِ استقرار می‌نویسیم
    const code = !made
      ? "worker"
      : e?.name === "PasswordException" ? "password" : "unreadable";
    throw new PdfIntakeError(code, e);
  }

  const numPages = doc.numPages || 0;
  if (numPages === 0) {
    try { await doc.destroy(); } catch { /* ignore */ }
    throw new PdfIntakeError("empty");
  }

  async function renderPage(i) {
    const page = await doc.getPage(i);
    const canvas = document.createElement("canvas");
    try {
      const base = page.getViewport({ scale: 1 });
      // upscale: صفحهٔ برداری تا سقفِ عرض/مساحت رندر می‌شود، نه ۷۲ dpi (توضیحِ fitScale)
      const scale = fitScale(base.width, base.height, undefined, { upscale: true });
      const viewport = page.getViewport({ scale });
      canvas.width = Math.max(1, Math.round(viewport.width));
      canvas.height = Math.max(1, Math.round(viewport.height));
      const ctx = canvas.getContext("2d");
      // زمینهٔ سفید: pdf.js جاهای خالی را شفاف می‌گذارد و JPEG شفاف را سیاه می‌کند
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvasContext: ctx, viewport }).promise;
      return encodeCanvas(canvas);
    } finally {
      page.cleanup();
      // آزاد کردنِ حافظهٔ canvas روی گوشیِ کم‌حافظه — صفحه‌ها یکی‌یکی رندر می‌شوند
      canvas.width = 0;
      canvas.height = 0;
    }
  }

  async function close() {
    try { await doc.destroy(); } catch { /* ignore */ }
    // workerPort سراسری است؛ پاک‌نکردنش PDFِ بعدی را به کارگرِ مرده وصل می‌کند
    GlobalWorkerOptions.workerPort = null;
    if (made) {
      try { made.worker.terminate(); } catch { /* ignore */ }
      URL.revokeObjectURL(made.blobUrl);
      made = null;
    }
  }

  return { numPages, renderPage, close };
}
