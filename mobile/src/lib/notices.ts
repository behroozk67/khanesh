// Pure presentation logic for two safety surfaces the server already sends:
//   • the urgency banner that must be visible *before* payment (site: PaymentCard.jsx, P128);
//   • the OCR warnings that say a page or a value was not read (site: ResultView.jsx).
// No clinical judgement here — only which server field to show, in the site's words.
import { EMERGENCY_BANNER } from "../content/khanesh/resultModel.js";

export type Notice = { tone: "bad" | "warn"; title: string; body: string };

/** Structural mirror of the payment branch of pollJob (kept import-free so `node src/lib/selfcheck.ts` can run). */
export type PayNoticeInput = {
  has_critical?: boolean;
  urgency?: string | null;
  critical_banner?: { title?: unknown; body?: unknown } | null;
};

const NOT_PAYWALLED = "این هشدار به پرداخت وابسته نیست؛ همین حالا به آن عمل کنید. متنِ کاملِ تفسیر بعد از پرداخت باز می‌شود.";

export function payNotice(req: PayNoticeInput | null | undefined): Notice | null {
  if (!req) return null;
  const banner = req.critical_banner;
  if (req.has_critical) {
    const title = typeof banner?.title === "string" && banner.title ? banner.title : EMERGENCY_BANNER.title;
    const body = typeof banner?.body === "string" && banner.body ? banner.body : EMERGENCY_BANNER.body;
    return { tone: "bad", title, body: `${body} ${NOT_PAYWALLED}` };
  }
  if (req.urgency === "soon") {
    return {
      tone: "warn",
      title: "ظرفِ ۲۴ تا ۴۸ ساعت با پزشک",
      body: "در این برگه یافته‌ای هست که نباید منتظرِ پرداخت بماند؛ این توصیه به پرداخت وابسته نیست. متنِ کاملِ تفسیر بعد از پرداخت باز می‌شود.",
    };
  }
  return null;
}

/** Server-written OCR warnings, trimmed, empty strings dropped, duplicates removed, order kept. */
// Index signature عمدی است: نتیجهٔ ذخیره‌شده `{ [k: string]: unknown, _engine?, … }` است و
// بدونِ آن، قاعدهٔ «weak type» تایپ‌اسکریپت می‌گوید هیچ کلیدِ مشترکی با `{ ocr_warnings? }` ندارد (TS2559).
export function ocrWarningsOf(result: { ocr_warnings?: unknown; [k: string]: unknown } | null | undefined): string[] {
  const list = Array.isArray(result?.ocr_warnings) ? result.ocr_warnings : [];
  const out: string[] = [];
  for (const w of list) {
    if (typeof w !== "string") continue;
    const t = w.trim();
    if (t && !out.includes(t)) out.push(t);
  }
  return out;
}
