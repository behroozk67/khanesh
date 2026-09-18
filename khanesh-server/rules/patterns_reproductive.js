// ============================================================
// LabMate — قواعد باروری، ناباروری و hCG
// منبع: Henry's Clinical Diagnosis, فصل ۲۶ «Reproductive Function and Pregnancy»
//        (شناسهٔ HENRY_REPRO در guidelines.js)؛ حدهای منی از WHO 2021 (WHO_SEMEN_2021)
// طراحی: specs/002-reproductive-fertility-rules/ — ثبتِ بالینی: P47 در MEDICAL_RULES.md
//
// مرحلهٔ ب، ۲۷ شهریور ۱۴۰۵ — فقط بندهای «منبع‌دارِ» P47 که بازبین تأیید کرد:
//   • semen_analysis              — بندهای ۱–۹ (WHO 2021 + pH/پرهیز/زنده‌مانی از DSL)
//   • male_gonadal_axis           — بند ۱۰ (تستوسترونِ < ۳۰۰ ng/dL)؛ LH/FSH بازه ندارند (بند ۱۱)،
//                                   پس فقط نقل می‌شوند و منشأ «بیضه یا هیپوفیز» حکم نمی‌شود
//   • luteal_progesterone         — بند ۱۵ (> ۳ ng/mL)
//   • hcg_result                  — بند ۲۱ (> ۵ mIU/mL)؛ منطقهٔ خاکستری منبع ندارد و نیست
//   • reproductive_hormone_context — بی‌آستانه: مقدارهای بی‌قضاوت
// ⚠️ عمداً هنوز نیست (بندهای بی‌منبع): محورِ زن (FSH/LH/E2ِ روزِ سوم، سنِ یائسگی)، AMH،
//    DHEA-S، 17-OHP، تستوسترونِ زن، و «آسیبِ لوله‌های منی‌ساز» (نیازِ بازهٔ FSHِ مرد).
//    این کلیدها در noRef می‌مانند و هشدارِ «تفسیر نشد، با پزشک» به بیمار می‌رسد.
//
// اصل‌ها: هر کلید دقیقاً یک مالک (N20)؛ هر آنالیتِ همراه سه‌حالته (N4)؛ هیچ اورژانسی (P47 #22)؛
// هیچ دارو/دوز/اقدامی (FR-023)؛ فوریت و جملهٔ اقدام از یک تصمیم (N20).
// ============================================================

import { HCG_POSITIVE_ABOVE, HCG_QUAL_NAME_RE, getRef } from "./refs.js";
import { faName } from "./names.js";

// ── آستانه‌های تشخیصیِ تأییدشده (جدا از بازه‌های مرجع — «یک عدد، یک کار») ──
/** P47 #15 — DSL `FR_2_1`: پروژسترونِ میان‌لوتئال > ۳ ng/mL → تخمک‌گذاری تأیید. */
export const PROG_OVULATION_NGML = 3.0;
/** P47 #8 — DSL `PA_1`: پنجرهٔ پرهیزِ ۲ تا ۵ روز. */
export const ABSTINENCE_MIN_DAYS = 2;
export const ABSTINENCE_MAX_DAYS = 5;
/** P47 #9 — DSL `SA_2_1`: تحرکِ کلِ < ۳۰٪ → پیشنهادِ رنگ‌آمیزیِ زنده‌مانی. */
export const VIABILITY_STAIN_BELOW_PCT = 30;
export { HCG_POSITIVE_ABOVE };

const g = (e, key) => e.graded.find((x) => x.test === key);
const low = (e, key) => { const x = g(e, key); return !!(x?.abnormal && x.dir === "low"); };
const fmt = (n) => String(+Number(n).toFixed(2));
const lln = (key) => getRef(key, "M", 40)?.[0];
// حدهای مرجع برای نقل در متن — یک‌بار و بیرون از رشته‌ها، تا هیچ کلیدِ خامی در متنِ بیمار
// نباشد (M38، N8). عدد از همان ردیفِ refs.js می‌آید که درجه‌بندی را انجام داد.
const LLN = {
  vol: lln("SEMEN_VOL"), conc: lln("SPERM_CONC"), mot: lln("SPERM_MOT_TOTAL"),
  prog: lln("SPERM_MOT_PROG"), morph: lln("SPERM_MORPH"), testo: lln("TESTO"),
};

/** مقدارِ کیفیِ صفحهٔ منی (semenQual) → "absent" | "present" | "low" | null */
function semenQualState(e, key) {
  const v = e.semenQual?.[key];
  if (v == null) return null;
  const s = String(v).trim().toLowerCase();
  if (/^(neg|negative|absent|nil|none|not\s*detected|منفی|ندارد|غایب)/.test(s)) return "absent";
  if (/low|reduced|decreas|کم|پایین/.test(s)) return "low";
  if (/pos|positive|present|normal|detected|مثبت|دارد|طبیعی/.test(s)) return "present";
  return null;
}

const SEMEN_KEYS = ["SEMEN_VOL", "SPERM_CONC", "SPERM_MOT_TOTAL", "SPERM_MOT_PROG", "SPERM_MORPH", "SEMEN_PH"];

// 🔴 بازبینی: ردیف‌هایی از برگهٔ منی که روی برگه هست ولی موتور نمی‌تواند با حدِ مرجع بسنجد —
//    شاخصِ اصلیِ غیرعددی («<1»، «few»)، تحرکِ درجه‌ای (Grade a/b/c/d، WHO 2010)، و گلبول‌های
//    سفید/قرمزِ «/hpf» (حدِ WHO بر حسبِ میلیون در میلی‌لیتر است، نه در هر میدان). پیش از این به
//    semenQual می‌رفتند، هیچ قاعده‌ای نمی‌خواندشان، و برگهٔ «تحرکِ فقط درجه‌ای، ۷۵٪ بی‌حرکت» یا
//    «WBC 20-25» به buildNormalResult («همه‌چیز طبیعی است») می‌رسید — N2. حکم نمی‌دهیم؛ نام می‌بریم.
const UNREAD_SEMEN_KEYS = ["SPERM_CONC", "SPERM_TOTAL", "SPERM_MOT_TOTAL", "SPERM_MOT_PROG", "SPERM_MORPH",
  "SEMEN_VOL", "SEMEN_PH", "SEMEN_WBC", "SEMEN_RBC"];
const GRADE_MOTILITY_RE = /^(grade[abcd]|rapidprogressive|slowprogressive|nonprogressive(motility)?|immotile)$/;
function unreadSemenRows(e) {
  const out = [];
  for (const [k, v] of Object.entries(e.semenQual ?? {})) {
    const nk = String(k).toLowerCase().replace(/[^a-z]/g, "");
    if (UNREAD_SEMEN_KEYS.includes(k)) out.push(`${faName(k)} («${v}»)`);
    else if (GRADE_MOTILITY_RE.test(nk)) out.push(`${k} («${v}»)`);
  }
  return out;
}

function hcgState(e) {
  const u = e.ungraded?.HCG;
  // raw: «<2» روی برگه — عدد برای حکم، متنِ خام برای نقل (N5).
  if (u) return { value: u.value, positive: u.value > HCG_POSITIVE_ABOVE, raw: u.raw, blood: true };
  for (const [k, v] of Object.entries(e.qual ?? {})) {
    if (!HCG_QUAL_NAME_RE.test(k)) continue;   // همان الگوی دروازهٔ پروژسترون در adapter
    const s = String(v).trim();
    // «Pregnancy test» ممکن است ادرار باشد؛ «خون» را فقط وقتی می‌گوییم که نامِ ردیف بگوید.
    const blood = /beta|β|bhcg|بتا|serum|سرم|خون/i.test(k);
    if (/^(neg|negative|منفی)/i.test(s)) return { value: null, positive: false, raw: s, blood };
    if (/pos|positive|مثبت|\+/i.test(s)) return { value: null, positive: true, raw: s, blood };
  }
  return null;
}

const CONTEXT_REASONS = {
  cycle_day_unknown:
    "مقدار این هورمون در روزهای مختلفِ چرخهٔ قاعدگی بسیار فرق می‌کند و روزِ نمونه‌گیری روی برگه نیست؛ برای همین دربارهٔ بالا یا پایین بودنش قضاوت نمی‌کنیم. اگر روزِ چرخه را می‌دانید، با پزشک مطرح کنید.",
  pediatric:
    "مقدار این هورمون پیش و در طولِ بلوغ به‌طورِ طبیعی با بزرگسالان فرق دارد و به مرحلهٔ بلوغ بستگی دارد؛ برای همین با محدودهٔ بزرگسالان سنجیده نمی‌شود. تفسیرش با پزشک است.",
  sex_unknown:
    "محدودهٔ طبیعیِ این هورمون در زن و مرد بسیار متفاوت است و جنسیت روی برگه مشخص نیست؛ برای همین قضاوت نمی‌کنیم.",
  hcg_positive:
    "با تستِ بارداریِ مثبت روی همین برگه، تفسیرِ این عدد با پزشک است.",
  unit_unknown:
    "واحدِ این آزمایش روی برگه خوانده نشد؛ آزمایشگاه‌ها تستوسترون را با واحدهایی گزارش می‌کنند که تا صد برابر با هم فرق دارند (ng/dL یا ng/mL)، برای همین دربارهٔ بالا یا پایین بودنش قضاوت نمی‌کنیم. تفسیرش با پزشک است.",
};

export const RULES_REPRODUCTIVE = [

  // ═══════════════════════════════════════════════════
  // ۱) آنالیزِ مایع منی — یک یافته، تنها مالکِ همهٔ SEMEN_*/SPERM_*
  // ═══════════════════════════════════════════════════
  // ⚠️ حجمِ کم «الیگواسپرمی» نیست (ایرادِ ۲ِ DSL): الیگواسپرمی کم بودنِ *غلظت* است.
  // ⚠️ هر یافته می‌گوید یک نمونه کافی نیست، و هرگز «نابارور» یا «باروریِ عالی» نمی‌گوید.
  {
    id: "semen_analysis",
    match: (e) => SEMEN_KEYS.some((k) => g(e, k)?.abnormal) || unreadSemenRows(e).length > 0,
    build: (e) => {
      const conc = g(e, "SPERM_CONC");
      const azoo = conc != null && conc.value === 0;
      const parts = [];
      const suggest = ["تکرار آنالیز منی"];
      const warnings = [];

      if (azoo) {
        parts.push("در این نمونه هیچ اسپرمی شمرده نشد (به این حالت «آزواسپرمی» می‌گویند). این نتیجه به‌تنهایی تشخیص نیست: گاهی در نمونهٔ دوم اسپرم دیده می‌شود، و علت می‌تواند بسته بودنِ مسیرِ خروجِ اسپرم یا کم بودنِ تولیدِ آن باشد که پزشک با بررسیِ بیشتر از هم جدا می‌کند.");
        // فروکتوز — سه‌حالته (DSL `SA_4_2`، `SA_4_3`)
        const fr = semenQualState(e, "SEMEN_FRUCTOSE");
        if (fr === "absent") {
          parts.push("فروکتوزِ مایع منی روی برگهٔ شما «منفی» گزارش شده؛ این ترکیب می‌تواند با نبودنِ مادرزادیِ مجرای انتقالِ اسپرم سازگار باشد و باید حتماً با متخصص اورولوژی بررسی شود.");
        } else if (fr === "present") {
          parts.push("فروکتوزِ مایع منی «مثبت» است، یعنی کیسه‌های منی کار می‌کنند؛ جدا کردنِ «بسته بودنِ مسیر» از «کم بودنِ تولیدِ اسپرم» به بررسیِ تخصصی نیاز دارد.");
        } else {
          parts.push("فروکتوزِ مایع منی روی برگهٔ شما نیست؛ این آزمایش به پزشک کمک می‌کند علت را دقیق‌تر پیدا کند.");
          suggest.push("فروکتوز مایع منی");
        }
      } else {
        if (low(e, "SPERM_CONC")) {
          parts.push(`غلظتِ اسپرم ${fmt(conc.value)} میلیون در میلی‌لیتر است و از حدِ مرجع (${LLN.conc} میلیون) کمتر است؛ به این حالت «الیگواسپرمی» (کم بودنِ تعدادِ اسپرم) می‌گویند.`);
        }
        const mt = g(e, "SPERM_MOT_TOTAL"), mp = g(e, "SPERM_MOT_PROG");
        if (low(e, "SPERM_MOT_TOTAL") || low(e, "SPERM_MOT_PROG")) {
          const bits = [];
          if (low(e, "SPERM_MOT_TOTAL")) bits.push(`تحرکِ کل ${fmt(mt.value)}٪ (حدِ مرجع ${LLN.mot}٪)`);
          if (low(e, "SPERM_MOT_PROG")) bits.push(`تحرکِ پیش‌رونده ${fmt(mp.value)}٪ (حدِ مرجع ${LLN.prog}٪)`);
          parts.push(`تحرکِ اسپرم کمتر از حدِ مرجع است — ${bits.join("، ")}؛ به این حالت «آستنواسپرمی» (کم بودنِ تحرک) می‌گویند.`);
        }
        if (mt && mt.value < VIABILITY_STAIN_BELOW_PCT) {
          parts.push("وقتی تحرک خیلی کم است، آزمایشی به نام «زنده‌مانیِ اسپرم» نشان می‌دهد اسپرم‌های بی‌حرکت زنده‌اند یا نه.");
          suggest.push("رنگ‌آمیزی زنده‌مانی اسپرم");
        }
        if (low(e, "SPERM_MORPH")) {
          parts.push(`درصدِ اسپرم‌های با شکلِ طبیعی ${fmt(g(e, "SPERM_MORPH").value)}٪ است و از حدِ مرجع (${LLN.morph}٪) کمتر است؛ به این حالت «تراتواسپرمی» می‌گویند.`);
        }
      }

      // حجمِ کم — در هر دو شاخه، از جمله آزواسپرمی: «حجمِ کم + بی‌اسپرم + فروکتوزِ منفی» دقیقاً
      // الگوی نبودنِ مادرزادیِ مجراست (DSL `SA_4_2`)، و ننوشتنش آن را از بیمار پنهان می‌کرد.
      const vol = g(e, "SEMEN_VOL");
      if (low(e, "SEMEN_VOL")) {
        parts.push(`حجمِ مایع منی ${fmt(vol.value)} میلی‌لیتر است و از حدِ مرجع (${LLN.vol} میلی‌لیتر) کمتر است. این «کم بودنِ حجم» است و با کم بودنِ تعدادِ اسپرم فرق دارد؛ گاهی از جمع‌آوریِ ناقصِ نمونه است.`);
      }

      // pH — دوطرفه (DSL `SA_4_1`): بالا + اسید فسفاتازِ کم → کارکردِ پروستات
      const ph = g(e, "SEMEN_PH");
      if (ph?.abnormal) {
        if (ph.dir === "high") {
          const acp = semenQualState(e, "SEMEN_ACP");
          parts.push(`pHِ مایع منی ${fmt(ph.value)} و بالاتر از محدودهٔ مرجع (${ph.range.replace("–", " تا ")}) است.` +
            (acp === "low" || acp === "absent"
              ? " همراه با کم بودنِ اسید فسفاتازِ مایع منی، این می‌تواند به کارکردِ پروستات مربوط باشد."
              : acp === "present" ? " اسید فسفاتازِ مایع منی کم نیست." : ""));
        } else {
          parts.push(`pHِ مایع منی ${fmt(ph.value)} و پایین‌تر از محدودهٔ مرجع (${ph.range.replace("–", " تا ")}) است.`);
        }
      }
      // آلفاگلوکوزیدازِ خنثی (DSL `SA_4_4`) — فقط وقتی روی برگه است
      const nag = semenQualState(e, "SEMEN_NAG");
      if (nag === "low" || nag === "absent") {
        parts.push("آلفاگلوکوزیدازِ خنثیِ مایع منی پایین گزارش شده، که می‌تواند نشانهٔ بسته بودنِ مسیر در اپیدیدیم (لولهٔ پشتِ بیضه) باشد.");
      }

      // پرهیز — فقط اگر روی برگه چاپ شده (DSL `PA_1`)؛ نبودنش هیچ ادعایی نمی‌سازد.
      const ab = e.ungraded?.SEMEN_ABSTINENCE?.value;
      if (ab != null && ab < ABSTINENCE_MIN_DAYS) {
        warnings.push(`مدتِ پرهیز پیش از این نمونه ${fmt(ab)} روز بوده که کمتر از ${ABSTINENCE_MIN_DAYS} روزِ توصیه‌شده است؛ پرهیزِ کوتاه می‌تواند غلظتِ اسپرم را کمتر از واقع نشان دهد.`);
      } else if (ab != null && ab > ABSTINENCE_MAX_DAYS) {
        warnings.push(`مدتِ پرهیز پیش از این نمونه ${fmt(ab)} روز بوده که بیشتر از ${ABSTINENCE_MAX_DAYS} روزِ توصیه‌شده است؛ پرهیزِ طولانی می‌تواند تحرکِ اسپرم را کمتر از واقع نشان دهد.`);
      }

      const unread = unreadSemenRows(e);
      if (unread.length) {
        parts.push(`این ردیف‌ها روی برگهٔ شما هست ولی شکلِ گزارششان با حدهای مرجعِ ما قابلِ مقایسه نیست، پس دربارهٔ آن‌ها قضاوت نمی‌کنیم: ${unread.join("، ")}. این ردیف‌ها را حتماً به پزشک نشان دهید.`);
      }

      parts.push("یک نمونهٔ مایع منی برای قضاوت کافی نیست، چون این شاخص‌ها از هفته‌ای به هفتهٔ دیگر زیاد تغییر می‌کنند؛ معمولاً آزمایش پس از چند هفته تکرار می‌شود. این نتیجه به‌تنهایی دربارهٔ توانِ باروریِ شما حکم نمی‌دهد.");

      return {
        pattern: "semen_analysis",
        urgency: "routine",
        // ⚠️ N12: عنوان جهت را از خودِ یافته‌ها می‌گیرد — pHِ بالا به‌تنهایی «کمتر» نیست.
        headline: azoo
          ? "در نمونهٔ مایع منی شما اسپرمی دیده نشد"
          : SEMEN_KEYS.some((k) => g(e, k)?.abnormal)
            ? (SEMEN_KEYS.every((k) => !g(e, k)?.abnormal || g(e, k).dir === "low")
              ? "بعضی از شاخص‌های آنالیز مایع منی شما کمتر از حد مرجع است"
              : "بعضی از شاخص‌های آنالیز مایع منی شما خارج از محدودهٔ مرجع است")
            : "بعضی از ردیف‌های آنالیز مایع منی شما تفسیر نشده است",
        must_say: parts.join(" "),
        action: "در نوبتِ عادی با پزشک (ترجیحاً متخصص اورولوژی یا ناباروری) مطرح کنید.",
        key_number: azoo ? `${faName("SPERM_CONC")}: ۰` : undefined,
        suggest,
        warnings,
        sources: ["WHO_SEMEN_2021", "HENRY_REPRO"],
      };
    },
  },

  // ═══════════════════════════════════════════════════
  // ۲) تستوسترونِ پایینِ مرد (P47 #10) — فقط حدِ پایین تأیید شده
  // ═══════════════════════════════════════════════════
  // ⚠️ DSL تشخیص را به «دو تستوسترونِ صبحگاهیِ < ۳۰۰» مشروط می‌کند؛ موتور یک برگه می‌بیند،
  //    پس هرگز «کمبودِ تأییدشده» نمی‌گوید. LH/FSH بازهٔ تأییدشده ندارند (#11)، پس منشأ (بیضه در
  //    برابرِ هیپوفیز) حکم نمی‌شود — فقط نقل، و اگر نیستند پیشنهاد.
  {
    id: "male_gonadal_axis",
    match: (e) => e.sex === "M" && low(e, "TESTO"),
    build: (e) => {
      const t = g(e, "TESTO");
      const lh = e.ungraded?.LH?.value, fsh = e.ungraded?.FSH?.value;
      let axis;
      const suggest = ["تکرار تستوسترون صبحگاهی"];
      if (lh != null && fsh != null) {
        axis = `LHِ شما ${fmt(lh)} و FSHِ شما ${fmt(fsh)} است. این دو هورمونِ هیپوفیز به پزشک نشان می‌دهند که علت در خودِ بیضه است یا در هیپوفیز و مغز؛ تفسیرِ این دو عدد با پزشک است.`;
      } else if (lh != null || fsh != null) {
        const [have, v, miss] = lh != null ? ["LH", lh, "FSH"] : ["FSH", fsh, "LH"];
        axis = `${have}ِ شما ${fmt(v)} است ولی ${miss} روی برگهٔ شما نیست؛ این دو هورمونِ هیپوفیز با هم به پزشک نشان می‌دهند که علت در خودِ بیضه است یا در هیپوفیز و مغز.`;
        suggest.push("LH و FSH");
      } else {
        axis = "LH و FSH (هورمون‌های هیپوفیز) روی برگهٔ شما نیست؛ این دو به پزشک کمک می‌کنند بفهمد علت در خودِ بیضه است یا در هیپوفیز و مغز.";
        suggest.push("LH و FSH");
      }
      return {
        pattern: "male_gonadal_axis",
        urgency: "routine",
        headline: "تستوسترونِ شما پایین‌تر از حد مرجع است",
        must_say:
          `تستوسترونِ شما ${fmt(t.value)} ng/dL است و از حدِ ${LLN.testo} ng/dL کمتر است. ` +
          "تستوسترون در طولِ روز تغییر می‌کند و صبح‌ها بیشترین مقدار را دارد؛ برای همین تشخیصِ کمبودِ تستوسترون " +
          "به دست‌کم دو نمونهٔ صبحگاهی در روزهای جداگانه نیاز دارد و یک عدد به‌تنهایی کافی نیست. " + axis,
        action: "در نوبتِ عادی با پزشک مطرح کنید؛ نمونهٔ تکرار را صبح بدهید.",
        suggest,
        sources: ["HENRY_REPRO"],
      };
    },
  },

  // ═══════════════════════════════════════════════════
  // ۳) پروژسترونِ روزِ ۲۱ (P47 #15)
  // ═══════════════════════════════════════════════════
  // ⚠️ کنارِ hCGِ مثبت اینجا نمی‌رسد: adapter آن را با دلیلِ hcg_positive به کانالِ بی‌قضاوت
  //    می‌فرستد (کلاریفای Q6)، چون پروژسترونِ بارداری «تخمک‌گذاری» نیست.
  {
    id: "luteal_progesterone",
    match: (e) => e.sex === "F" && e.ungraded?.PROG_D21?.reason === "threshold",
    build: (e) => {
      const v = e.ungraded.PROG_D21.value;
      const ok = v > PROG_OVULATION_NGML;
      return ok ? {
        pattern: "luteal_progesterone",
        urgency: "routine",
        headline: "پروژسترونِ روزِ ۲۱ با تخمک‌گذاری سازگار است",
        must_say: `پروژسترونِ روزِ ۲۱ِ شما ${fmt(v)} ng/mL است که از ${PROG_OVULATION_NGML} ng/mL بیشتر است؛ این عدد نشان می‌دهد در این چرخه به احتمالِ زیاد تخمک‌گذاری انجام شده است. این فقط دربارهٔ همین یک چرخه است.`,
        action: "نتیجه را در ویزیتِ بعدی به پزشک نشان دهید.",
        suggest: [],
        sources: ["HENRY_REPRO"],
      } : {
        pattern: "luteal_progesterone",
        urgency: "routine",
        headline: "پروژسترونِ روزِ ۲۱ پایین است",
        must_say:
          `پروژسترونِ روزِ ۲۱ِ شما ${fmt(v)} ng/mL است و از ${PROG_OVULATION_NGML} ng/mL بیشتر نیست؛ این می‌تواند یعنی در این چرخه تخمک‌گذاری انجام نشده یا نیمهٔ دومِ چرخه کوتاه بوده است. ` +
          "زمان‌بندیِ نمونه هم مهم است: «روزِ ۲۱» برای چرخهٔ ۲۸ روزه است، و اگر چرخهٔ شما بلندتر یا کوتاه‌تر است، ممکن است نمونه در زمانِ درستی گرفته نشده باشد.",
        action: "در نوبتِ عادی با پزشک مطرح کنید.",
        suggest: ["تکرار پروژسترون در چرخهٔ بعد"],
        sources: ["HENRY_REPRO"],
      };
    },
  },

  // ═══════════════════════════════════════════════════
  // ۴) بتا اچ‌سی‌جی به‌عنوانِ نتیجهٔ تستِ بارداری (P47 #21، کلاریفای Q3)
  // ═══════════════════════════════════════════════════
  // ⚠️ هیچ جمله‌ای دربارهٔ نابجا بودن، سقط، سلامت یا سنِ بارداری — به دو نمونهٔ متوالی و
  //    سونوگرافی نیاز دارد. منطقهٔ خاکستری منبع ندارد، پس نیست. در مرد آزمایشِ بارداری نیست.
  {
    id: "hcg_result",
    match: (e) => {
      const h = hcgState(e);
      if (!h) return false;
      return !(e.sex === "M" && !h.positive);   // hCGِ منفیِ مرد طبیعی است و یافته نمی‌خواهد
    },
    build: (e) => {
      const h = hcgState(e);
      const num = h.value != null ? `${h.raw ?? fmt(h.value)} mIU/mL` : `«${h.raw}»`;
      const label = h.blood ? "تستِ بارداریِ خون (بتا اچ‌سی‌جی)" : "تستِ بارداری";
      const src = ["HENRY_REPRO"];
      if (e.sex === "M") {
        return {
          pattern: "hcg_result", urgency: "this_week",
          headline: "بتا اچ‌سی‌جی در خونِ شما مثبت است",
          must_say: `بتا اچ‌سی‌جیِ شما ${num} است. این آزمایش در زنان برای تشخیصِ بارداری به کار می‌رود، ولی در مردان معمولاً نزدیکِ صفر است و مثبت بودنش باید حتماً با پزشک بررسی شود.`,
          action: "این هفته با پزشک مطرح کنید.",
          suggest: [], sources: src,
        };
      }
      if (e.sex !== "F") {
        return {
          pattern: "hcg_result", urgency: "routine",
          headline: h.positive ? "بتا اچ‌سی‌جی مثبت است" : "بتا اچ‌سی‌جی مثبت نیست",
          must_say: h.positive
            ? `بتا اچ‌سی‌جیِ شما ${num} است. معنای این نتیجه به جنسیت بستگی دارد (در زن با بارداری سازگار است) و جنسیت روی برگه مشخص نیست.`
            : `بتا اچ‌سی‌جیِ شما ${num} است و این آزمایش مثبت نیست.`,
          action: "با پزشک مطرح کنید.",
          suggest: [], sources: src,
        };
      }
      return h.positive ? {
        pattern: "hcg_result", urgency: "routine",
        headline: `${label} مثبت است`,
        must_say:
          (h.value != null
            ? `مقدارِ بتا اچ‌سی‌جیِ شما ${num} است که از حدِ ${HCG_POSITIVE_ABOVE} بیشتر است؛ این نتیجه با بارداری سازگار است.`
            : `نتیجهٔ ${label} شما ${num} گزارش شده؛ این نتیجه با بارداری سازگار است.`) +
          " این آزمایش به‌تنهایی دربارهٔ روندِ بارداری چیزی نمی‌گوید؛ پیگیری با پزشک است.",
        action: "در نوبتِ عادی با پزشک یا ماما پیگیری کنید.",
        warnings: ["اگر دردِ شدیدِ شکم یا خونریزی دارید، منتظرِ نوبت نمانید و همان روز به پزشک یا اورژانس مراجعه کنید."],
        suggest: [], sources: src,
      } : {
        pattern: "hcg_result", urgency: "routine",
        headline: `${label} منفی است`,
        must_say:
          (h.value != null
            ? `مقدارِ بتا اچ‌سی‌جیِ شما ${num} است و از حدِ ${HCG_POSITIVE_ABOVE} بیشتر نیست؛ یعنی این آزمایش بارداری را نشان نمی‌دهد.`
            : `نتیجهٔ ${label} شما ${num} گزارش شده؛ یعنی این آزمایش بارداری را نشان نمی‌دهد.`) +
          " اگر آزمایش خیلی زود (پیش از عقب افتادنِ قاعدگی) انجام شده باشد، ممکن است هنوز منفی باشد؛ اگر قاعدگی‌تان عقب افتاده، آزمایش را چند روز بعد تکرار کنید.",
        action: "اگر قاعدگی عقب افتاده، چند روز بعد تکرار کنید.",
        suggest: [], sources: src,
      };
    },
  },

  // ═══════════════════════════════════════════════════
  // ۵) مقدارهای بی‌قضاوت — تنها مالکِ ungraded با دلیلِ «بافت‌محور»
  // ═══════════════════════════════════════════════════
  // بدونِ این قاعده، تغییرِ مسیرِ server.js (research R6) برگهٔ «FSHِ بی‌روز» را به
  // buildNormalResult («همه‌چیز طبیعی است») می‌فرستاد — N2. پس این دو با هم می‌آیند (T19).
  {
    id: "reproductive_hormone_context",
    match: (e) => Object.values(e.ungraded ?? {}).some((u) => CONTEXT_REASONS[u.reason]),
    build: (e) => {
      const byReason = {};
      for (const [k, u] of Object.entries(e.ungraded ?? {})) {
        if (!CONTEXT_REASONS[u.reason]) continue;
        (byReason[u.reason] ??= []).push(`${faName(k)} (${fmt(u.value)})`);
      }
      const lines = Object.entries(byReason).map(([r, names]) => `${names.join("، ")}: ${CONTEXT_REASONS[r]}`);
      return {
        pattern: "reproductive_hormone_context",
        urgency: "routine",
        headline: "بعضی از هورمون‌های برگهٔ شما بدونِ قضاوت گزارش شده‌اند",
        must_say: lines.join(" "),
        action: "این مقادیر را در نوبتِ عادی به پزشک نشان دهید.",
        suggest: [],
        sources: ["HENRY_REPRO"],
      };
    },
  },
];
