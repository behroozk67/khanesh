import RangeBand from "./RangeBand.jsx";
import Num from "./Num.jsx";
import { BRAND_FA } from "./Logo.jsx";
import { REF, LOCAL_STATES, statusOf } from "./labRefs.js";

// ============================================================
// «نمونهٔ یک نتیجه» در هیروی صفحهٔ فرود — جایگزینِ عکسِ تصویرسازی‌شده.
//
// این کارت عدد نمی‌سازد که ادعا شود؛ دو عددِ نمایشی‌اش با برچسبِ صریحِ «نمونه»
// آمده‌اند و هر چیزِ دیگر از همان منبعِ فرمِ دستی مشتق می‌شود: محدوده از
// REF[...].range، وضعیت از statusOf. پس اگر محدوده‌ای عوض شود، این کارت از
// فرم جدا نمی‌افتد. هیچ نمرهٔ کل و هیچ درصدی در آن نیست (Scorecard.jsx).
// ============================================================

const SAMPLE_SEX = "male";
const SAMPLE = [
  { key: "hb", v: 14.6 },
  { key: "tsh", v: 6.1 },
];

function SampleRow({ k, v }) {
  const m = REF[k];
  const r = m.range(SAMPLE_SEX, null);
  const S = LOCAL_STATES[statusOf(k, v, SAMPLE_SEX, null)];
  return (
    <li className={`row ${S.cls}`}>
      <div className="row-main">
        <span className="row-name">{m.label}</span>
        <span className={`chip ${S.cls}`}>
          <span aria-hidden="true">{S.icon}</span>
          {S.label}
        </span>
      </div>
      <div className="row-nums">
        <Num>{v}</Num> <span className="row-range">{m.unit}</span>
        <span className="row-range">
          محدودهٔ مرجع: <Num>{r.low}–{r.high}</Num>
        </span>
      </div>
      <RangeBand low={r.low} high={r.high} value={v} stateCls={S.cls} />
    </li>
  );
}

export default function HeroResult() {
  return (
    <div className="site-device">
      <div className="site-device-screen">
        <span className="site-device-pill" aria-hidden="true">{BRAND_FA}</span>
        <figure className="site-hero-result" aria-label="نمونهٔ نمایشی از یک نتیجه">
          <figcaption className="site-hero-result-cap">
            <b>نمونه</b>
            <span>عددها نمایشی‌اند و از برگهٔ شما نیستند</span>
          </figcaption>
          <ul className="row-list">
            {SAMPLE.map((s) => (
              <SampleRow key={s.key} k={s.key} v={s.v} />
            ))}
          </ul>
          <p className="site-hero-result-foot">
            برای هر عددِ برگهٔ شما همین نوار رسم می‌شود: عدد کجای محدودهٔ مرجع ایستاده است.
          </p>
        </figure>
      </div>
    </div>
  );
}
