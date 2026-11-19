// A self-contained page that rasterises a PDF with pdf.js (same caps as khanesh/src/pdfIntake.js:
// 1200 px width, ≤6 MP, JPEG 0.85, white background) and posts each page back as a data URL.
// Host: WebView on native, hidden iframe on web (components/pdf-renderer*.tsx).
// pdf.js is assets/pdfjs: pdfjs-dist@4.10.38 legacy build, because the modern one needs Promise.withResolvers, which
// older Android WebViews lack. It is inlined so nothing depends on a CDN. 4.x, not the site's 6.x: 6.x needs separate wasm files.

export type PdfLib = { main: string; worker: string };

export type PdfMessage =
  | { type: "page"; i: number; n: number; data: string }
  | { type: "done"; n: number }
  | { type: "error"; code: "password" | "unreadable" | "empty" | "worker" | "too_many"; n?: number; detail?: string };

// "<" is escaped so a "</script>" inside the library or file can't end the page's script.
const literal = (s: string) => JSON.stringify(s).replace(/</g, "\\u003c");

export function pdfHtml(base64: string, room: number, lib: PdfLib) {
  return `<!doctype html><meta charset="utf-8"><script>
const send = (m) => { const s = JSON.stringify(m); window.ReactNativeWebView ? window.ReactNativeWebView.postMessage(s) : parent.postMessage(s, "*"); };
let stall;
const fail = (code, e, n) => { clearTimeout(stall); send({ type: "error", code, n, detail: String((e && e.message) || e || "") }); };
// Nothing may leave the app stuck on the spinner: a silent page counts as a failure.
const arm = () => { clearTimeout(stall); stall = setTimeout(() => fail("worker", "stalled"), 60000); };
const post = (m) => { send(m); arm(); };
arm();
const blob = (src) => URL.createObjectURL(new Blob([src], { type: "text/javascript" }));
(async () => {
  let pdfjs;
  try {
    pdfjs = await import(blob(${literal(lib.main)}));
    // Runs pdf.js's worker on this page's thread: the page is hidden, and a blob module Worker isn't available in every WebView.
    globalThis.pdfjsWorker = await import(blob(${literal(lib.worker)}));
  } catch (e) { return fail("worker", e); }
  const bin = atob(${literal(base64)});
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  let doc;
  try { doc = await pdfjs.getDocument({ data: bytes }).promise; }
  catch (e) { return fail(e && e.name === "PasswordException" ? "password" : "unreadable", e); }
  const n = doc.numPages || 0;
  if (!n) return fail("empty");
  if (n > ${room}) return fail("too_many", null, n);
  for (let i = 1; i <= n; i++) {
    const page = await doc.getPage(i);
    const base = page.getViewport({ scale: 1 });
    const scale = Math.min(1200 / base.width, Math.sqrt(6000000 / (base.width * base.height)));
    const vp = page.getViewport({ scale });
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(vp.width)); c.height = Math.max(1, Math.round(vp.height));
    const ctx = c.getContext("2d"); ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, c.width, c.height);
    // "print": the "display" intent paces itself with requestAnimationFrame, which never fires in a hidden view.
    await page.render({ canvasContext: ctx, viewport: vp, intent: "print" }).promise;
    post({ type: "page", i, n, data: c.toDataURL("image/jpeg", 0.85) });
    page.cleanup(); c.width = 0; c.height = 0;
  }
  clearTimeout(stall);
  send({ type: "done", n });
})().catch((e) => fail("unreadable", e));
</script>`;
}

const fa = (n: number) => String(n).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[+d]);

/** Persian message per failure — wording from khanesh/src/Tafsir.jsx. */
export function pdfErrorFa(m: Extract<PdfMessage, { type: "error" }>, name: string, used: number, max: number) {
  switch (m.code) {
    case "password":
      return `فایل «${name}» رمز دارد و باز نشد. رمزش را بردارید یا از صفحه‌های برگه عکس بگیرید.`;
    case "empty":
      return `فایل «${name}» هیچ صفحه‌ای ندارد.`;
    case "worker":
      return "ابزارِ خواندنِ PDF روی این گوشی اجرا نشد. لطفاً از صفحه‌های برگه عکس بگیرید.";
    case "too_many":
      return `فایل «${name}» ${fa(m.n ?? 0)} صفحه دارد و الان ${fa(used)} صفحه انتخاب شده؛ حداکثر ${fa(max)} صفحه می‌شود. چند صفحه را حذف کنید یا فقط صفحه‌های لازم را جدا کنید.`;
    default:
      return `فایل «${name}» به‌عنوان PDF باز نشد؛ شاید خراب باشد. از صفحه‌های برگه عکس بگیرید.`;
  }
}
