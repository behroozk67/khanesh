import { bandGeometry } from "./rangeMath.js";

// ============================================================
// نوارِ محدودهٔ مرجع — «عددِ من کجای بازه ایستاده؟»
//
// این جایگزینِ گیجِ قبلی در Tafsir.jsx است که با left فیزیکی ساخته شده بود و
// داخلِ dir="rtl" آینه می‌شد: باندِ سبز و نشانگر از راست‌به‌چپ رندر می‌شدند
// در حالی که برچسب‌های کم/زیاد زیرشان چپ‌به‌راست چاپ می‌شد. باگِ واقعی.
//
// قاعده‌های RTL که رعایت شده‌اند (جزئیاتِ CSS در ui.css):
//   • محور در جهتِ خواندن می‌رود: **کم سمت راست، زیاد سمت چپ** (در RTL).
//     با inset-inline-start به‌دست می‌آید، نه با left. در LTR خودش برعکس می‌شود.
//   • مرکز کردنِ نشانگر با «افستِ منطقی منهای نصفِ عرض» انجام می‌شود، نه با
//     translateX(-50%): translate جهت‌دار است و در RTL نشانگر را به اندازهٔ
//     تمامِ عرضش جابه‌جا می‌کند.
//   • کلاهکِ نامتقارنِ گوشه ساخته نشده: شعاعِ pill روی خودِ ریل با
//     overflow:hidden، که در برابر جهت مصون است.
//   • خودِ عددها در .num می‌مانند: لاتین، LTR، ایزوله.
//
// aria-hidden است و این عمدی است: همین اطلاعات یک خط بالاتر به‌صورتِ متن
// («12.4 — محدودهٔ مرجع: 13.5–17.5» به‌علاوهٔ واژهٔ وضعیت) وجود دارد.
// تکرارِ صوتیِ یک نمودارِ تزئینی فقط سر و صداست.
// ============================================================

export default function RangeBand({ low, high, value, stateCls }) {
  if (!Number.isFinite(low) || !Number.isFinite(high) || !Number.isFinite(value)) return null;
  const g = bandGeometry(low, high, value);
  return (
    <div className="band" aria-hidden="true">
      <div className="band-track">
        <span
          className="band-normal"
          style={{ "--band-start": `${g.bandStart}%`, "--band-width": `${g.bandWidth}%` }}
        />
        <span className={`band-marker ${stateCls}`} style={{ "--band-pos": `${g.pos}%` }} />
      </div>
      <div className="band-scale">
        <span className="num">{low}</span>
        <span className="band-scale-mid">محدودهٔ مرجع</span>
        <span className="num">{high}</span>
      </div>
    </div>
  );
}
