// ============================================================
// «اعدادی که از عکس شما خواندیم» — تأییدِ عدد، قبل از معنا.
//
// یک کامپوننت، دو مصرف‌کننده. قبلاً دو رندرِ جداگانه وجود داشت: یکی اینجا و
// یکی داخلِ شاخهٔ parseError در Tafsir.jsx که نه از asText رد می‌شد، نه از
// .num، و محدودهٔ چاپ‌شده را «مرجع» صدا می‌زد — یعنی دقیقاً همان ابهامی را
// می‌ساخت که برچسبِ صریحِ زیر برای جلوگیری از آن نوشته شده بود.
// ============================================================

import Num from "./Num.jsx";
import { toFaDigits } from "./digits.js";

export default function ExtractedTests({ list, pages, asText }) {
  if (!list?.length) return null;
  return (
    <section className="card card--sunken" id="numbers-check" tabIndex={-1}>
      <h2 className="block-title">
        اعدادی که از عکس شما خواندیم
        {pages?.total > 1 ? ` (${toFaDigits(pages.total)} صفحه)` : ""}
      </h2>
      <p className="hint">
        لطفاً یک نگاه به برگه بیندازید و مقایسه کنید. یک قدم کوتاه است و جلوی اشتباه را می‌گیرد.
      </p>
      <ul className="extract-list">
        {list.map((t, i) => (
          <li key={i} className="extract-row">
            <b className="extract-name">{asText(t?.test)}</b>
            <Num>{asText(t?.value)}</Num>
            {/* server.js جای محدودهٔ نخوانده «—» می‌گذارد؛ آن را «محدودهٔ چاپ‌شده» نشان نده (job c138671c، D10). */}
            {t?.reference && !/^[\s—–-]*$/.test(String(t.reference)) && (
              <span className="printed-ref">
                {/* محدودهٔ چاپ‌شده روی برگه ≠ محدودهٔ موتور. برچسبش صریح است تا
                    وقتی این دو اختلاف دارند، تناقض به‌نظر نرسد. */}
                محدودهٔ چاپ‌شده روی برگهٔ شما: <Num>{asText(t.reference)}</Num>
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
