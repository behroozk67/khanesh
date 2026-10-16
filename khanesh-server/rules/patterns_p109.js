// ============================================================
// patterns_p109.js — ردیف‌هایی که از برگه خوانده می‌شدند و موتور تفسیرشان نمی‌کرد (P109، برگهٔ واقعی ۲۰۲۶-۱۰-۱۶، تصمیمِ کاربر:
//   «قاعدهٔ بالینی و رنجش را از گایدلاین و رفرنسِ معتبر بگیر»).
//   eag_result          — میانگینِ تخمینیِ قند (ADAG، Nathan 2008: eAG = 28.7 × A1C − 46.7 mg/dL؛ 1.59 × A1C − 2.59 mmol/L)
//   atherogenic_index   — شاخصِ آتروژنیک؛ فرمولش از هویتِ عددی با چربی‌های همین برگه، مرز فقط برای AIP (Dobiášová 2001)
//   hpylori_igm_result  — IgM/IgAِ هلیکوباکتر: بی‌حکم، با معرفیِ آزمایشِ معتبر (ACG 2024)
//   smear_rbc_size      — میکروسیتوز/هیپوکرومی/ماکروسیتوز/آنیزوسیتوز/پویکیلوسیتوزِ لام، کنارِ MCV/RDW همان برگه
// هیچ‌کدام آستانهٔ تازهٔ بی‌منبع ندارد؛ همه routine، مگر eAG ِ معادلِ HbA1c ≥ ۶٫۵ (همان فوریتِ glycemia برای HbA1c).
// ============================================================
import { faName } from "./names.js";
import { rbcMorphOf } from "./patterns_utils.js";
import { isHpyloriIgmKey, isHpyloriKey, hpyloriKind, readSerologyValue, abVerdict } from "./serology.js";
import { normUnit } from "./units.js";

const latinDigits = (x) => String(x ?? "").replace(/[۰-۹]/g, (d) => "۰۱۲۳۴۵۶۷۸۹".indexOf(d)).replace(/[٠-٩]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d)).replace(/[٫,]/g, ".");
const ACTION = {
  routine: "در نوبتِ عادی با پزشک مطرح کنید.",
  this_week: "این هفته با پزشک مطرح کنید.",
};
const g = (e, k) => e.graded.find((x) => x.test === k);
const unitKey = (u) => normUnit(String(u ?? "")).replace(/[µμ]|mc/g, "u");

// ═══ eAG (ADAG) ═══
// ضریب‌های رگرسیونِ ADAG (Nathan DM و همکاران، Diabetes Care 2008;31:1473) — تعریفیِ همان فرمول، نه آستانه.
const EAG_MGDL = { a: 28.7, b: 46.7 };
const EAG_MMOL = { a: 1.59, b: 2.59 };
// مرزهای HbA1c ِ ADA (همان‌هایی که glycemia می‌خواند): ۵٫۷ پیش‌دیابت، ۶٫۵ دیابت.
const A1C_PRE = 5.7, A1C_DM = 6.5;
// بی‌واحد فقط وقتی یک واحد ممکن است (P48، «magnitude»): eAG ≥ ۶۰ نمی‌تواند mmol/L باشد (= HbA1c > ۳۹٪)؛
//   ≤ ۲۵ نمی‌تواند mg/dL باشد (= HbA1c < ۲٫۵٪). میانه ⇒ نامعلوم.
function eagA1c(entry) {
  if (!entry || typeof entry.value !== "number") return null;
  const u = unitKey(entry.unit), v = entry.value;
  const sys = /^mg\/dl$|^mg%$/.test(u) ? EAG_MGDL : /^mmol\/l$/.test(u) ? EAG_MMOL
    : !u ? (v >= 60 ? EAG_MGDL : v <= 25 ? EAG_MMOL : null) : null;
  if (!sys) return null;
  const a1c = +((v + sys.b) / sys.a).toFixed(1);
  return a1c >= 3 && a1c <= 20 ? a1c : null;   // بیرون از این، عدد یا واحد اشتباه خوانده شده
}

// ═══ شاخصِ آتروژنیک ═══
// وزنِ مولکولیِ تبدیلِ mg/dL ⇒ mmol/L (تعریفی): TG ÷ ۸۸٫۵۷، HDL ÷ ۳۸٫۶۷. AIP = log10(TG/HDL) با غلظتِ *مولی* (Dobiášová).
const TG_MGDL_PER_MMOL = 88.57, HDL_MGDL_PER_MMOL = 38.67;
// مرزهای AIP (Dobiášová M, Frohlich J. Clin Biochem 2001؛ ماشین‌حسابِ خودِ نویسنده در biomed.cas.cz): < ۰٫۱۱ کم، ۰٫۱۱–۰٫۲۱ متوسط، > ۰٫۲۱ زیاد.
const AIP_LOW = 0.11, AIP_HIGH = 0.21;
function atheroFormula(e, v) {
  const tc = g(e, "CHOL")?.value, hdl = g(e, "HDL")?.value, ldl = g(e, "LDL")?.value, tg = g(e, "TG")?.value;
  if (!(hdl > 0)) return null;
  const c = [];
  if (tc > 0) c.push({ id: "castelli1", value: tc / hdl, fa: "کلسترولِ تام ÷ HDL (شاخصِ کاستلیِ ۱)" });
  if (tc > 0) c.push({ id: "ac", value: (tc - hdl) / hdl, fa: "(کلسترولِ تام − HDL) ÷ HDL (ضریبِ آتروژنیک)" });
  if (ldl > 0) c.push({ id: "castelli2", value: ldl / hdl, fa: "LDL ÷ HDL (شاخصِ کاستلیِ ۲)" });
  if (tg > 0) {
    c.push({ id: "aip", value: Math.log10((tg / TG_MGDL_PER_MMOL) / (hdl / HDL_MGDL_PER_MMOL)), fa: "لگاریتمِ نسبتِ مولیِ تری‌گلیسرید به HDL (AIP)" });
    c.push({ id: "aip_mg", value: Math.log10(tg / hdl), fa: "لگاریتمِ نسبتِ تری‌گلیسرید به HDL با mg/dL (AIP با واحدِ جرمی)" });
  }
  // تطبیق تا حدِ گردکردنِ چاپ (۵٪ یا ۰٫۰۲)؛ دو فرمولِ هم‌خوان ⇒ مبهم ⇒ null (حدس نمی‌زنیم).
  const hits = c.filter((x) => Math.abs(x.value - v) <= Math.max(0.05 * Math.abs(v), 0.02));
  return hits.length === 1 ? hits[0] : null;
}
const fmt2 = (x) => String(+x.toFixed(2));

// ═══ لامِ خون ═══
const SMEAR_KINDS = ["microcytosis", "hypochromia", "macrocytosis", "anisocytosis", "poikilocytosis"];
const SMEAR_FA = {
  microcytosis: "میکروسیتوز (گلبول‌های قرمزِ کوچک)",
  hypochromia: "هیپوکرومی (گلبول‌های قرمزِ کم‌رنگ)",
  macrocytosis: "ماکروسیتوز (گلبول‌های قرمزِ درشت)",
  anisocytosis: "آنیزوسیتوز (اندازه‌های ناهمسانِ گلبولِ قرمز)",
  poikilocytosis: "پویکیلوسیتوز (شکل‌های غیرعادیِ گلبولِ قرمز)",
};
// P110: حالتِ هر نوع کنارِ شاخصِ دستگاهی (همان منطقِ smearClause) — برای اینکه بدانیم یافتهٔ لام حرفِ تازه‌ای دارد یا نه.
function smearState(e, kind) {
  const idx = kind === "anisocytosis" ? g(e, "RDW_CV") ?? g(e, "RDW_SD") : kind === "hypochromia" ? g(e, "MCH") ?? g(e, "MCHC") : g(e, "MCV");
  const want = kind === "macrocytosis" || kind === "anisocytosis" ? "high" : "low";
  if (kind === "poikilocytosis") return { state: "poik" };
  if (!idx) return { state: "noidx" };
  const name = `${faName(idx.test)} ${idx.value}`;
  if (idx.abnormal && idx.dir === want) return { state: "concord", name };
  if (!idx.abnormal) return { state: "normal", name };
  return { state: "discord", name };
}
// جملهٔ هر نوع کنارِ شاخصِ دستگاهیِ همان برگه؛ چهار حالت: هم‌جهت / طبیعی / خلافِ جهت / روی برگه نیست (N4، N12).
function smearClause(e, kind) {
  const idx = kind === "anisocytosis" ? g(e, "RDW_CV") ?? g(e, "RDW_SD") : kind === "hypochromia" ? g(e, "MCH") ?? g(e, "MCHC") : g(e, "MCV");
  const want = kind === "macrocytosis" || kind === "anisocytosis" ? "high" : "low";
  const name = idx ? `${faName(idx.test)} ${idx.value} (حد طبیعی ${idx.range})` : null;
  if (kind === "poikilocytosis") return "معنای شکل‌های غیرعادی به نوعِ شکل بستگی دارد (مثلاً گلبولِ قطعه‌قطعه، اشکی یا داسی) که در این ردیف نیامده؛ پزشک آن را از گزارشِ کاملِ لام می‌خواند.";
  if (!idx) return `${kind === "anisocytosis" ? "RDW" : kind === "hypochromia" ? "MCH" : "MCV"} روی این برگه نیست تا توصیفِ لام با عددِ دستگاه مقایسه شود.`;
  if (idx.abnormal && idx.dir === want) return `این با ${name} هم‌خوان است؛ توضیحِ آن در یافته‌های دیگرِ همین گزارش آمده است.`;
  if (!idx.abnormal) return `${name} در محدوده است؛ توصیفِ لام کیفی است و وقتی عددِ دستگاه طبیعی است معمولاً یعنی فقط بخشی از گلبول‌ها چنین‌اند. پزشک آن را کنارِ بقیهٔ نتایج می‌سنجد.`;
  return `این با ${name} هم‌جهت نیست؛ این ناهمخوانی را با آزمایشگاه یا پزشک روشن کنید (گاهی دو جمعیتِ گلبولی کنارِ هم‌اند).`;
}

export const RULES_P109 = [
  {
    id: "eag_result",
    match: (e) => !!e.ungraded?.EAG,
    build: (e) => {
      const entry = e.ungraded.EAG;
      const shown = `${entry.value}${entry.unit ? " " + entry.unit : ""}`;
      const a1cG = g(e, "HBA1C");
      const lead = `میانگینِ تخمینیِ قندِ خون (eAG) روی برگهٔ شما ${shown} است. این عدد جداگانه اندازه‌گیری نمی‌شود؛ آزمایشگاه آن را از روی HbA1c با فرمولِ مطالعهٔ ADAG حساب می‌کند تا HbA1c را به زبانِ قندِ روزانه بگوید. `;
      if (a1cG) {
        return {
          pattern: "eag_result", urgency: "routine",
          headline: "میانگینِ تخمینیِ قند (eAG)",
          must_say: lead + `پس تفسیرش همان تفسیرِ HbA1c ِ شما (${a1cG.value}٪) است و جداگانه حکم نمی‌گیرد.`,
          info: true, minor_line: `میانگینِ تخمینیِ قند (eAG) ${shown}: برگردانِ همان HbA1c ِ ${a1cG.value}٪ است و جداگانه حکم ندارد`,
          action: ACTION.routine, suggest: [], warnings: [], explains: ["EAG"],
        };
      }
      const a1c = eagA1c(entry);
      if (a1c == null) {
        return {
          pattern: "eag_result", urgency: "routine",
          headline: "میانگینِ تخمینیِ قند (eAG)",
          must_say: lead + "خودِ HbA1c روی این برگه نیست و واحدِ این عدد هم معلوم نشد، پس به HbA1c برنمی‌گردانیمش و درباره‌اش حکم نمی‌دهیم؛ اگر برگهٔ کامل HbA1c دارد، همان را به پزشک نشان دهید.",
          info: true, minor_line: `میانگینِ تخمینیِ قند (eAG) ${shown}: واحدش معلوم نشد و HbA1c روی برگه نیست، پس حکم ندارد`,
          action: ACTION.routine, suggest: [], warnings: [], explains: ["EAG"],
        };
      }
      const cat = a1c >= A1C_DM ? "dm" : a1c >= A1C_PRE ? "pre" : "normal";
      const urgency = cat === "dm" ? "this_week" : "routine";
      return {
        pattern: "eag_result", urgency,
        headline: "میانگینِ تخمینیِ قند (eAG)",
        key_number: entry.value,
        sources: ["ADA_SOC"],
        must_say: lead + `خودِ HbA1c روی این برگه نیامده، ولی این عدد برابرِ HbA1c ِ حدودِ ${a1c}٪ است، ` + {
          dm: "که در محدودهٔ دیابت (۶٫۵٪ یا بیشتر، معیارِ انجمنِ دیابتِ آمریکا) قرار می‌گیرد. تشخیصِ دیابت با یک عدد قطعی نمی‌شود و پزشک آن را با تکرار یا آزمایشِ دیگری تأیید می‌کند.",
          pre: "که در محدودهٔ پیش‌دیابت (۵٫۷ تا ۶٫۴٪، معیارِ انجمنِ دیابتِ آمریکا) قرار می‌گیرد؛ این یعنی خطرِ دیابت بیشتر است و تغییرِ سبکِ زندگی اثرِ زیادی دارد.",
          normal: "که زیرِ مرزِ پیش‌دیابت (۵٫۷٪) است.",
        }[cat],
        // P110: eAG ِ زیرِ مرزِ پیش‌دیابت اقدامی ندارد ⇒ یک خط در «موارد دیگر».
        ...(cat === "normal" ? { info: true, minor_line: `میانگینِ تخمینیِ قند (eAG) ${shown}: برابرِ HbA1c ِ حدودِ ${a1c}٪، زیرِ مرزِ پیش‌دیابت (۵٫۷٪)` } : {}),
        action: ACTION[urgency],
        suggest: cat === "normal" ? [] : ["HbA1c", "قند خون ناشتا (FBS)"],
        warnings: [], explains: ["EAG"],
      };
    },
  },

  {
    id: "atherogenic_index",
    match: (e) => !!e.ungraded?.ATHERO_INDEX,
    build: (e) => {
      const v = e.ungraded.ATHERO_INDEX.value;
      const head = `شاخصِ آتروژنیکِ برگهٔ شما ${v} است. `;
      const f = typeof v === "number" ? atheroFormula(e, v) : null;
      const base = { pattern: "atherogenic_index", urgency: "routine", headline: "شاخصِ آتروژنیک (نسبتِ چربی‌های خون)", action: ACTION.routine, suggest: [], warnings: [], explains: ["ATHERO_INDEX"] };
      if (!f) {
        return { ...base, info: true, minor_line: `شاخصِ آتروژنیک ${v}: معلوم نشد با کدام فرمول حساب شده، پس حکم ندارد؛ قضاوتِ چربی از خودِ کلسترول، HDL و تری‌گلیسرید می‌آید`,
          must_say: head + "آزمایشگاه‌ها این نام را برای چند فرمولِ متفاوت به کار می‌برند (کلسترولِ تام ÷ HDL، LDL ÷ HDL، یا لگاریتمِ تری‌گلیسرید به HDL) و از روی چربی‌های همین برگه معلوم نشد کدام است؛ پس درباره‌اش حکم نمی‌دهیم. قضاوتِ چربیِ خون از خودِ کلسترول، LDL، HDL و تری‌گلیسرید می‌آید." };
      }
      if (f.id === "aip" || f.id === "aip_mg") {
        const aip = f.id === "aip" ? v : v + Math.log10(HDL_MGDL_PER_MMOL / TG_MGDL_PER_MMOL);
        const conv = f.id === "aip_mg" ? `این عدد با واحدِ mg/dL حساب شده؛ AIP ِ استاندارد (با غلظتِ مولی) برابرِ ${fmt2(aip)} است. ` : "";
        const band = aip < AIP_LOW ? "کم" : aip <= AIP_HIGH ? "متوسط" : "بیشتر";
        // P110: گروهِ «کم/متوسط» اقدامی جدا از خودِ چربی‌ها ندارد ⇒ یک خط؛ «بیشتر» یافتهٔ کامل می‌ماند.
        return { ...base, ...(band === "بیشتر" ? {} : { info: true, minor_line: `شاخصِ آتروژنیک (AIP) ${fmt2(aip)}: گروهِ خطرِ «${band}» در تقسیم‌بندیِ Dobiášová` }),
          must_say: head + `این عدد با ${f.fa} از چربی‌های همین برگه جور است. ` + conv +
          `در تقسیم‌بندیِ پیشنهادیِ سازندگانِ این شاخص (Dobiášová)، زیرِ ${AIP_LOW} خطرِ کم، ${AIP_LOW} تا ${AIP_HIGH} متوسط و بالای ${AIP_HIGH} خطرِ بیشتر برای بیماریِ قلب‌وعروق است؛ عددِ شما در گروهِ «${band}» است. ` +
          "این شاخص جایگزینِ ارزیابیِ کاملِ خطرِ قلبی (سن، فشارِ خون، دیابت، سیگار) نیست." };
      }
      return { ...base, info: true, minor_line: `شاخصِ آتروژنیک ${v}: همان ${f.fa.replace(/ \(.*$/, "")} از چربی‌های همین برگه است و مرزِ استاندارد ندارد`,
        must_say: head + `این عدد با ${f.fa} از چربی‌های همین برگه جور است، یعنی خبرِ تازه‌ای جز همان کلسترول و HDL نمی‌دهد. برای این نسبت مرزِ استانداردِ واحدی در راهنماهای معتبر نیست، پس جداگانه حکم نمی‌گیرد؛ قضاوتِ چربیِ خون از خودِ کلسترول، LDL، HDL و تری‌گلیسرید می‌آید.` };
    },
  },

  {
    id: "hpylori_igm_result",
    match: (e) => Object.keys(e.qual ?? {}).some((k) => isHpyloriIgmKey(k)),
    build: (e) => {
      const rows = Object.entries(e.qual).filter(([k]) => isHpyloriIgmKey(k));
      const quoted = rows.map(([k, v]) => `«${k}: ${String(v).trim()}»`).join("، ");
      const active = Object.keys(e.qual).some((k) => isHpyloriKey(k) && hpyloriKind(k) === "active");
      // P110 (گزارشِ کاربر ۲۰۲۶-۱۰-۱۶): IgMِ منفی (۱۳٫۸، مرزِ <۴۰) و بی‌علامت آزمایشِ تنفسی و قطعِ PPI گرفت — آزمایشِ زیادی.
      //   ACG 2024 آزمایشِ عفونتِ فعال را برای کسی می‌خواهد که اندیکاسیون دارد (علامتِ گوارشی، زخم، …)، نه برای هر سرولوژیِ چاپ‌شده.
      //   پس نه منفی و نه مثبت درخواستِ بی‌قید نمی‌گیرد؛ پیشنهاد مشروط به علامت است و فقط در warnings (suggest نام است، نه جمله — N8).
      const verdicts = rows.map(([k, v]) => {
        const r = readSerologyValue(v);
        if (r.state !== "unknown") return r.state;
        const n = Number(latinDigits(v).trim().replace(/^[<>≤≥]\s*/, ""));
        if (!Number.isFinite(n)) return "unknown";
        const cmp = (latinDigits(v).trim().match(/^([<>≤≥])/) ?? [])[1] ?? null;
        const vd = abVerdict(n, cmp, e.serologyRef?.[k] ?? null);
        return vd === "within" ? "neg" : vd === "above" ? "pos" : "unknown";
      });
      const allNeg = verdicts.every((v) => v === "neg");
      const base = "آنتی‌بادیِ IgM (و IgA) برای تشخیصِ عفونتِ هلیکوباکتر اعتبارِ کافی ندارد: چه مثبت باشد چه منفی، نشان نمی‌دهد که الان عفونتِ فعال دارید یا نه.";
      const conditional = "اگر علامتِ گوارشی دارید (سوزش یا دردِ سرِ دل، سوءهاضمهٔ مداوم)، پزشک برای عفونتِ فعال آزمایشِ تنفسیِ اوره یا آنتی‌ژنِ مدفوع را درخواست می‌کند؛ پیش از آن داروی ضدِاسید از نوعِ پمپِ پروتون (مثل امپرازول، پنتوپرازول) معمولاً دو هفته و آنتی‌بیوتیک چهار هفته قطع می‌شود تا جواب منفیِ کاذب ندهد.";
      if (allNeg && !active) {
        return {
          pattern: "hpylori_igm_result",
          urgency: "routine",
          info: true,
          headline: "آنتی‌بادیِ IgM ِ هلیکوباکتر منفی است",
          sources: ["ACG_HPYLORI_2024"],
          must_say: `روی برگهٔ شما ${quoted} آمده و زیرِ مرزِ مثبت‌بودنِ همان آزمایشگاه است (منفی). ${base} بی‌علامتِ گوارشی، اقدامی لازم نیست.`,
          minor_line: `آنتی‌بادیِ IgM ِ هلیکوباکتر ${quoted}: منفی؛ این آزمایش اعتبارِ تشخیصی ندارد و بی‌علامتِ گوارشی اقدامی لازم نیست`,
          action: ACTION.routine,
          suggest: [],
          warnings: [],
        };
      }
      return {
        pattern: "hpylori_igm_result",
        urgency: "routine",
        headline: "آنتی‌بادیِ IgM/IgA ِ هلیکوباکتر",
        sources: ["ACG_HPYLORI_2024"],
        must_say: `روی برگهٔ شما ${quoted} آمده است. ${base} ` +
          (active
            ? "آزمایشِ معتبرِ عفونتِ فعال (آنتی‌ژنِ مدفوع یا تستِ تنفسی) روی همین برگه هست و تصمیم بر پایهٔ همان است."
            : "راهنماها (از جمله کالجِ گوارشِ آمریکا، ۲۰۲۴) برای تشخیصِ عفونتِ فعال آزمایشِ تنفسیِ اوره یا آنتی‌ژنِ مدفوع را توصیه می‌کنند، آن هم برای کسی که علامت یا دلیلِ دیگری برای آزمایش دارد."),
        action: ACTION.routine,
        suggest: [],
        warnings: active ? [] : [conditional],
      };
    },
  },

  {
    id: "smear_rbc_size",
    match: (e) => SMEAR_KINDS.some((k) => rbcMorphOf(e, k)),
    build: (e) => {
      const present = SMEAR_KINDS.filter((k) => rbcMorphOf(e, k)?.state === "present");
      const absent = SMEAR_KINDS.filter((k) => rbcMorphOf(e, k)?.state === "absent");
      const parts = present.map((k) => `در گزارشِ لامِ خونِ شما ${SMEAR_FA[k]} «${rbcMorphOf(e, k).raw}» آمده است. ${smearClause(e, k)}`);
      if (absent.length) parts.push(`${absent.map((k) => SMEAR_FA[k].replace(/ \(.*$/, "")).join("، ")} در لام دیده نشده است.`);
      // P110: وقتی هر توصیفِ لام با عددِ دستگاه هم‌جهت است یا عدد طبیعی است، حرفِ تازه‌ای نیست ⇒ یک خط. ناهمخوانی/پویکیلوسیت یافتهٔ کامل می‌ماند.
      const st = present.map((k) => [k, smearState(e, k)]);
      const quiet = st.every(([, s]) => s.state === "concord" || s.state === "normal");
      const line = [
        ...st.map(([k, s]) => `${SMEAR_FA[k].replace(/ \(.*$/, "")} «${rbcMorphOf(e, k).raw}» (${s.state === "concord" ? `هم‌خوان با ${s.name}` : `${s.name} طبیعی است`})`),
        ...(absent.length ? [`${absent.map((k) => SMEAR_FA[k].replace(/ \(.*$/, "")).join("، ")} دیده نشده`] : []),
      ].join("، ");
      return {
        pattern: "smear_rbc_size",
        urgency: "routine",
        ...(quiet ? { info: true, minor_line: `لامِ خون: ${line}` } : {}),
        headline: present.length ? "توصیفِ گلبول‌های قرمز در لامِ خون" : "لامِ خون: یافتهٔ گلبولِ قرمز گزارش نشده",
        must_say: parts.join(" "),
        action: ACTION.routine,
        suggest: [],
        warnings: [],
      };
    },
  },
];
