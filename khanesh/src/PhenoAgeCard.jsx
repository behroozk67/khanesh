// ============================================================
// P113 — کارتِ «سنِ زیستی» در نمای ساده، پیش از تفسیر.
//
// داده از سرور می‌آید (`_engine.phenoAge`: سه عددِ ساخته‌شده در rules/pheno_age.js).
// ⚠️ اینجا هیچ فرمولی نیست — نه تقسیم، نه لگاریتم، نه آستانه. کلاینت فقط می‌چیند،
//    همان قاعده‌ای که برای `score` گذاشته شد (specs/015).
// ⚠️ هیچ جملهٔ بالینی از این فایل به بیمار نمی‌رسد که در MEDICAL_RULES (P113) نباشد:
//    «عددِ جمعیتی، نه پیش‌بینیِ فردی» و فهرستِ ۹ آزمایش، عیناً همان چیزی است که آنجا ثبت شده.
// ⚠️ اگر pheno_age نباشد (یکی از ۹ مارکر روی برگه نیست، یا سن زیرِ ۲۰/نامشخص)،
//    کارت اصلاً رندر نمی‌شود — هیچ عددِ جایگزین و هیچ امتیازِ خالی‌ای ساخته نمی‌شود.
//
// الهامِ بصری: InsideTracker (InnerAge) و Function Health — یک عددِ بزرگ، مقایسهٔ صریح با
// سنِ شناسنامه‌ای، و یک مقیاسِ نازک با دو نشانگر؛ بدونِ گیجِ پیچیده و بدونِ نمودارِ تزئینی.
// ============================================================

import Num from "./Num.jsx";
import "./PhenoAgeCard.css";

// ۳۶٫۷ ⇒ «36.7» · ۳۸ ⇒ «38» (عددِ بالینی لاتین می‌ماند؛ <Num> آن را LTR و tabular می‌کند)
const fmt1 = (n) => String(Math.round(n * 10) / 10);

const BIOMARKERS_FA = [
  "آلبومین", "کراتینین", "قندِ خون", "CRP", "درصدِ لنفوسیت",
  "MCV", "RDW-CV", "آلکالین فسفاتاز و WBC",
];

export default function PhenoAgeCard({ data }) {
  if (!data || typeof data.years !== "number" || typeof data.chronoAge !== "number") return null;
  const { years, chronoAge, deltaYears } = data;

  // مقیاس: چند سال حاشیه در دو طرف، تا دو نشانگر هرگز روی لبه نچسبند.
  const lo = Math.floor(Math.min(years, chronoAge) - 4);
  const hi = Math.ceil(Math.max(years, chronoAge) + 4);
  const span = hi - lo || 1;
  const pos = (v) => Math.min(100, Math.max(0, ((v - lo) / span) * 100));
  const bioP = pos(years);
  const chronoP = pos(chronoAge);
  const younger = deltaYears < 0;
  const same = Math.abs(deltaYears) < 0.05;
  const delta = fmt1(Math.abs(deltaYears));

  const aria = `سنِ زیستی ${fmt1(years)} سال در برابرِ سنِ شناسنامه‌ای ${fmt1(chronoAge)} سال`;

  return (
    <section className="card pheno-card" aria-labelledby="pheno-age-title">
      <div className="pc-head">
        <h2 className="pc-kicker" id="pheno-age-title">سنِ زیستی</h2>
        <span className="pc-chip" dir="ltr">PhenoAge</span>
      </div>

      <div className="pc-figure">
        <span className="pc-age">
          <span className="pc-value"><Num>{fmt1(years)}</Num></span>
          <span className="pc-unit">سال</span>
        </span>
        <span className={same ? "pc-badge" : younger ? "pc-badge pc-badge--good" : "pc-badge"}>
          {same ? "هم‌سال" : <><Num>{delta}</Num> سال {younger ? "جوان‌تر" : "بالاتر"}</>}
        </span>
      </div>

      {/* مقیاسِ نازک: محورِ سن عمداً LTR است (سن به سمتِ راست زیاد می‌شود) */}
      <div className="pc-scale" role="img" aria-label={aria}>
        <div className="pc-track">
          <span
            className="pc-span"
            style={{ left: `${Math.min(bioP, chronoP)}%`, width: `${Math.abs(bioP - chronoP)}%` }}
          />
          {!same && <span className="pc-dot pc-dot--chrono" style={{ left: `${chronoP}%` }} />}
          <span className="pc-dot pc-dot--bio" style={{ left: `${bioP}%` }} />
        </div>
        <div className="pc-legend">
          <span className="pc-key">
            <i className="pc-key-dot pc-key-dot--bio" aria-hidden="true" />
            سنِ زیستی <b><Num>{fmt1(years)}</Num></b>
          </span>
          <span className="pc-key">
            <i className="pc-key-dot pc-key-dot--chrono" aria-hidden="true" />
            سنِ شناسنامه‌ای <b><Num>{fmt1(chronoAge)}</Num></b>
          </span>
        </div>
      </div>

      <details className="pc-more">
        <summary>این عدد از کجا می‌آید؟</summary>
        <div className="pc-more-body">
          <p className="hint">
            از ۹ آزمایشِ همین برگه ساخته می‌شود: {BIOMARKERS_FA.join("، ")}.
            اگر یکی از این‌ها روی برگه نباشد، عدد ساخته نمی‌شود — هیچ مقداری جای آن گذاشته نمی‌شود.
          </p>
          <p className="hint">
            روش: معادلهٔ منتشرشدهٔ Levine (۲۰۱۸) با تصحیحِ ۲۰۱۹ — همان شاخصی که در مطالعاتِ جمعیتی
            برای پیش‌بینیِ مرگ‌ومیرِ ده‌ساله اعتبارسنجی شده است. این یک شاخصِ جمعیتی است، نه
            پیش‌بینیِ فردی و نه تشخیص؛ خطای چند ساله دارد و جای تفسیرِ پزشک را نمی‌گیرد.
            فقط برای ۲۰ سال و بالاتر معنا دارد.
          </p>
          <p className="hint">
            عددِ ریسکِ ده‌ساله عمداً اینجا نشان داده نمی‌شود؛ یک احتمالِ آماری برای گروه است،
            نه سرنوشتِ یک نفر.
          </p>
        </div>
      </details>
    </section>
  );
}
