// ============================================================
// کارنامهٔ وضعیت — لایهٔ «یک نگاه».
//
// اولین سؤالِ واقعیِ بیمار «آیا چیزی هست که باید نگرانش باشم؟» است، و این
// بلوک قبل از هر متنی به همان جواب می‌دهد: یک شمارش، فوریتِ موتور، و
// کارت‌های دستگاه بدن که هرکدام شمارشِ خودشان را دارند.
//
// ⚠️ چیزی که اینجا عمداً **نیست**: نمرهٔ سلامت، درصد، «سن زیستی»، یا هر
//    عددی که از روی برگه ساخته شده باشد. حلقه فقط یک **شمارش** را نشان
//    می‌دهد و کمانش همان نسبتِ شمارش است؛ هیچ درصدی چاپ نمی‌شود. موتور
//    هیچ فیلدی برای «نمره» ندارد و ساختنش از روی برگهٔ آزمایش قابل دفاع
//    نیست (design-reference §۱۰ بند ۷، و درسِ N5).
//
// ⚠️ بنر سبزِ «همه‌چیز خوب است» هنوز وجود ندارد. حالتِ «هیچ چیز خارج از
//    محدوده نیست» همان شمارشِ صفر است، با همان لحنِ خبری، به‌علاوهٔ جمله‌ای
//    که می‌گوید «داخلِ محدوده» یعنی چه و یعنی چه نیست.
// ============================================================

import { toFaDigits } from "./digits.js";
import { CATEGORIES } from "./testCategories.js";
import { countRows, stateOf, worstState } from "./resultStates.js";

const URGENCY = {
  emergency: { label: "همین امروز دیده شود", cls: "st-emergency" },
  this_week: { label: "این هفته با پزشک", cls: "st-out" },
  routine: { label: "در نوبت عادیِ پزشک", cls: "st-near" },
  none: { label: "پیگیریِ فوری لازم ندانست", cls: "st-normal" },
};

const MAX_PIPS = 18;

function SystemCard({ group, ctx }) {
  const cat = CATEGORIES[group.key] ?? CATEGORIES.other;
  const { inRange, out, total } = countRows(group.rows);
  const worst = worstState(group.rows, ctx);
  const pips = group.rows.slice(0, MAX_PIPS);

  return (
    <li>
      <a className="sys-card" href={`#sys-${group.key}`} data-tone={worst.key}>
        <span className="sys-head">
          <span className="sys-icon" aria-hidden="true">{cat.icon}</span>
          <span className="sys-name">{cat.label}</span>
        </span>
        <span className="sys-counts">
          <span className="mini-chip st-normal">
            <span aria-hidden="true">✓</span> {toFaDigits(inRange)} در محدوده
          </span>
          {out > 0 && (
            <span className={`mini-chip ${worst.cls}`}>
              <span aria-hidden="true">{worst.icon}</span> {toFaDigits(out)} خارج از محدوده
            </span>
          )}
        </span>
        {/* پیپ‌ها: یک نشانه به‌ازای هر آزمایش، نه یک درصد. شمارشِ واژه‌ای
            بالای همین‌هاست، پس نمودار حاملِ تنهای معنا نیست. */}
        <span className="sys-pips" aria-hidden="true">
          {pips.map((t) => (
            <i key={t.key} className={`pip ${stateOf(t, ctx).cls}`} />
          ))}
          {total > MAX_PIPS && <i className="pip-more">+{toFaDigits(total - MAX_PIPS)}</i>}
        </span>
      </a>
    </li>
  );
}

/**
 * @param groups  [{key, rows}] — همان گروه‌بندیِ ResultView، دوباره ساخته نمی‌شود
 * @param ctx     خروجی buildVerdictContext
 * @param urgency `_engine.urgency`
 * @param hasNumbers آیا بلوکِ «اعدادی که خواندیم» وجود دارد (مسیر عکس)
 */
export default function Scorecard({ groups, ctx, urgency, hasNumbers }) {
  const all = groups.flatMap((g) => g.rows);
  if (!all.length) return null;

  const { inRange, out, total } = countRows(all);
  const worst = worstState(all, ctx);
  const urg = URGENCY[urgency] ?? URGENCY.none;
  // کمانِ حلقه = نسبتِ همان شمارش. وقتی هیچ‌چیز بیرون نیست حلقه کامل و
  // سبز است، ولی هیچ «آفرین»ی کنارش نوشته نمی‌شود.
  const ringPct = out === 0 ? 100 : Math.max(6, Math.round((out / total) * 100));

  return (
    <section className="scorecard" aria-labelledby="scorecard-h">
      <h2 id="scorecard-h" className="block-title">وضعیت در یک نگاه</h2>

      <div className="score-hero">
        <div
          className="ring"
          data-tone={out === 0 ? "normal" : worst.key}
          style={{ "--ring-pct": ringPct }}
        >
          <span className="ring-hole">
            <span className="ring-value">{toFaDigits(out)}</span>
            <span className="ring-label">خارج از محدوده</span>
          </span>
        </div>

        <div className="score-lines">
          <p className="score-headline">
            {out === 0
              ? `${toFaDigits(total)} آزمایش خوانده شد؛ همه داخل محدودهٔ مرجع بودند.`
              : `از ${toFaDigits(total)} آزمایش، ${toFaDigits(out)} مورد خارج از محدودهٔ مرجع و ${toFaDigits(inRange)} مورد داخل آن بود.`}
          </p>

          <p className="score-urgency">
            <span className={`chip ${urg.cls}`}>
              <span aria-hidden="true">{urgency === "emergency" ? "⚠" : "•"}</span>
              {urg.label}
            </span>
            <span className="score-urgency-note">— جمع‌بندیِ قاعده‌های موتور برای کلِ برگه</span>
          </p>

          {out === 0 && (
            <p className="score-note">
              محدودهٔ مرجع طوری تعریف می‌شود که حدود ۹۵ درصد افرادِ سالم داخلش بیفتند. «داخلِ
              محدوده» یعنی همین، و جای معاینه و سابقهٔ شما را نمی‌گیرد.
            </p>
          )}

          {hasNumbers && (
            <p className="score-note">
              این شمارش روی اعدادی است که از عکسِ شما خواندیم.{" "}
              <a href="#numbers-check" className="link">یک نگاه به آن‌ها بیندازید</a> و با برگه
              مقایسه کنید.
            </p>
          )}
        </div>
      </div>

      <ul className="sys-grid">
        {groups.map((g) => (
          <SystemCard key={g.key} group={g} ctx={ctx} />
        ))}
      </ul>
    </section>
  );
}
