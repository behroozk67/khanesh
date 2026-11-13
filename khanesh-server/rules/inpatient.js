// ============================================================
// بیمارِ بستری — بخش، ICU یا اورژانسِ بیمارستان (گزینهٔ الف، تصمیمِ کاربر ۲۰۲۶-۱۰-۰۸، P66/P97).
//
// ⚠️ فقط *لحنِ دستور* عوض می‌شود. فوریت، آستانه، بازهٔ مرجع، has_critical و نمره دست نمی‌خورند.
//    «به اورژانس بروید»، «وقت بگیرید» و «این هفته» برای کسی که همین حالا در بیمارستان است بی‌معنا یا گمراه‌کننده‌اند؛
//    جایش یک جملهٔ ثابت می‌آید که از *خودِ فوریتِ یافته* ساخته می‌شود (N20: دستور و فوریت یک تصمیم‌اند).
// ⚠️ شکلِ این فایل همان applyNeonatalFloor است (neonatal.js)، ولی کف نمی‌گذارد و هیچ فوریتی را بالا یا پایین نمی‌برد.
//    آستانهٔ «بحرانی» برای بیمارِ ICU فرق دارد، ولی آن یک تصمیمِ بالینیِ جداست و اینجا نیست (گزینهٔ ب).
// ============================================================

import { faName } from "./names.js";
import { CHILD_VOICE_MAX_AGE } from "./neonatal.js";

export const onInpatient = (e) => Array.isArray(e?.conditions) && e.conditions.includes("hospitalized");

export const INPATIENT_NOW_ACTION = "همین حالا این نتیجه را به پزشک یا پرستارِ بخش اطلاع دهید.";
export const INPATIENT_ROUND_ACTION = "این نتیجه را در ویزیتِ بعدیِ پزشکِ معالج مطرح کنید.";

// جمله‌ای که *کجا برو / کی برو* می‌گوید. محتوا (تکرار آزمایش، قطعِ دارو، …) این واژه‌ها را ندارد و می‌ماند.
// P146: «با پزشک مطرح کنید تا علت بررسی شود» کنارِ «در ویزیتِ بعدیِ پزشکِ معالج مطرح کنید» تکرار بود؛ فقط شکلِ بی‌شرط (آغازِ جمله).
const WHERE_WHEN = /^با پزشک مطرح کنید|اورژانس|۱۱۵|مطب|وقت بگیرید|نوبتِ?\s*(عادی|بعدی)|مراجعه|تماس بگیرید|این هفته|همین امروز|همین چند روز|همین حالا|فوراً|فورا|اسرع وقت|اولین فرصت|منتظر|برگه را همراه|هفته‌های پیشِ رو|۲۴ تا ۴۸ ساعت|زودتر/;
const SENT = /(?<=[.؟!؛])\s+/;
const CONDITIONAL = /^(اگر|مگر|چنانچه|در صورتِ?)\s/;
const SYMPTOM_ALARM = /^(علائم|علامت‌های|نشانه‌های)\s/;   // فقط جمله‌ای که *فهرستِ* علائم است، نه «… می‌تواند نشانهٔ X باشد»
const URGENT_WORD = /اورژانس|۱۱۵|همین حالا|فوراً|فورا/;
const split = (s) => String(s).split(SENT).map((x) => x.trim()).filter(Boolean);

/** هشدارِ شرطیِ «اگر X، به اورژانس بروید» ⇒ «اگر X، همین حالا به پرستارِ بخش اطلاع دهید»؛ غیرشرطیِ کجا/کی ⇒ حذف. */
export function inpatientWarning(w) {
  const out = [];
  for (const s of split(w)) {
    if (!WHERE_WHEN.test(s)) { out.push(s); continue; }
    // دستورِ کجا/کیِ بی‌شرط برای بستری بی‌معناست — مگر جمله فهرستِ علائمِ هشدار با دستورِ فوری باشد
    //   («علائم هشدار: تهوع … — با هر کدام از این‌ها همین حالا اورژانس»). P107 (L20): پیش‌تر کامل حذف می‌شد و
    //   بیمارِ بستریِ قند ۴۰۰ هیچ نشانهٔ DKA نمی‌دید. حالا همان علائم می‌ماند و دستور به «پرستارِ بخش» برمی‌گردد.
    const alarmList = !CONDITIONAL.test(s) && SYMPTOM_ALARM.test(s) && URGENT_WORD.test(s);
    if (!CONDITIONAL.test(s) && !alarmList) continue;
    // نتیجهٔ شرط آخرین بندِ جمله است. اول توضیحِ پرانتزیِ پایانی کنار می‌رود — خودش «،» و واژهٔ «اورژانسی» دارد
    //   («… فوراً به اورژانس بروید (… «طوفان تیروئیدی»، یک وضعیت اورژانسی …)»، H8) — بعد برش روی آخرین جداکننده
    //   («،» یا « — »): «اگر همین حالا نشانه‌ها … — تورم، … سرفهٔ خونی — منتظر نمانید و فوراً …» (H9). «همین حالا» ممکن
    //   است در خودِ شرط باشد، پس جای واژهٔ دستور ملاک نیست. ⚠️ هشدارِ شرطی هرگز حذف نمی‌شود (H10).
    const core = s.replace(/\s*\([^()]*\)\s*\.?\s*$/, "").replace(/[.؛]\s*$/, "");
    // نتیجه = *آخرین* بندی (جداشده با «،» یا « — ») که واژهٔ کجا/کی دارد، از اولین واژهٔ کجا/کیِ همان بند. بندهای بعد از آن
    //   توضیح‌اند و می‌روند («… داشتید زودتر مراجعه کنید — تب مالت گاهی …»، بی «،» پیش از دستور).
    const bounds = [0];
    for (const mm of core.matchAll(/،| — /g)) bounds.push(mm.index);
    let cut = -1;
    for (let k = bounds.length - 1; k >= 0 && cut < 0; k--) {
      const end = k + 1 < bounds.length ? bounds[k + 1] : core.length;
      const m = core.slice(bounds[k], end).search(WHERE_WHEN);
      if (m >= 0) cut = bounds[k] + m;
    }
    const cond = cut > 0 ? core.slice(0, cut).replace(/[ ،—]+$/, "").trim() : "";
    if (alarmList) {
      if (cond) out.push(`${cond}، همین حالا به پرستارِ بخش اطلاع دهید.`);
      continue;
    }
    const head = cond && CONDITIONAL.test(cond) ? cond : "اگر نشانهٔ تازه یا بدترشدنی پیدا شد";
    out.push(`${head}، همین حالا به پرستارِ بخش اطلاع دهید.`);
  }
  return out.join(" ");
}

export function applyInpatientVoice(findings, engineOut) {
  if (engineOut?._probe || !onInpatient(engineOut)) return;
  for (const f of findings) {
    let changed = false;
    if (typeof f.action === "string" && f.action.trim()) {
      const keep = split(f.action).filter((s) => !WHERE_WHEN.test(s));
      const head = f.urgency === "emergency" || f.urgency === "soon" ? INPATIENT_NOW_ACTION : INPATIENT_ROUND_ACTION;
      const next = [head, ...keep].join(" ");
      if (next !== f.action) { f.action = next; changed = true; }
    }
    for (const k of ["warnings", "brief_warnings"]) {
      if (!Array.isArray(f[k])) continue;
      const next = f[k].map(inpatientWarning).filter(Boolean);
      if (next.join("\n") !== f[k].join("\n")) { f[k] = next; changed = true; }
    }
    if (changed) (f.applied_conditions ??= []).includes("hospitalized") || f.applied_conditions.push("hospitalized");
  }
}

// ═══ P142-ب (درخواستِ کاربر ۲۰۲۶-۱۱-۱۲): بستری (بخش، به‌ویژه ICU) ⇒ *اشاره* به عواملِ بخش که آزمایش را عوض می‌کنند ═══
// برای هر آزمایشِ غیرطبیعی که یافته‌ای آن را در متنش نام برده، عاملِ شناخته‌شدهٔ بخش/ICU (دارو، سرم، تغذیهٔ وریدی، نمونه‌گیری، بیماریِ حاد)
//   در یک جمله می‌آید. ⚠️ فقط متن: فوریت، آستانه، action و نمره دست نمی‌خورند. ادعا نمی‌کند «بستری علتِ این عدد است»؛ می‌گوید می‌تواند نقش داشته باشد.
// ⚠️ یافتهٔ emergency جمله نمی‌گیرد: «شاید دارو باشد» کنارِ پتاسیمِ ۷ یا تروپونین دلیلِ صبر کردن نمی‌شود (N20/N26).
// ⚠️ جدول بر پایهٔ دانشِ بالینیِ عمومیِ داروها و بیماریِ حاد است، نه متنِ مرجعِ بازشده؛ منتظرِ بازبینیِ بالینی (P142).
const ACUTE_STRESS = "استرسِ بیماریِ حاد و داروهایی مثل کورتیکواستروئید";
const INFLAM = "عفونت، استرسِ بیماریِ حاد و داروهایی مثل کورتیکواستروئید";
const ANEMIA = "بیماریِ حاد، التهاب، خونریزی، نمونه‌گیریِ مکرر و رقیق‌شدنِ خون با سرم";
const KIDNEY = "کم‌آبی، افتِ فشار و داروهای آسیب‌زنندهٔ کلیه (مثلاً بعضی آنتی‌بیوتیک‌ها و مادهٔ کنتراست)";
const LIVER = "داروها (مثلاً بعضی آنتی‌بیوتیک‌ها، ضدقارچ‌ها و استامینوفن)، عفونتِ شدید، افتِ فشار و تغذیهٔ وریدی";
const THYROID = "بیماریِ حاد و داروهایی مثل دوپامین و کورتیکواستروئید؛ آزمایشِ تیروئید در بیماریِ حاد گمراه‌کننده است و معمولاً بعد از بهبود تکرار می‌شود";
const GLU_HI = "استرسِ بیماری، کورتیکواستروئید و سرم‌های قندی یا تغذیهٔ وریدی";
const GLU_LO = "انسولین و کم‌بودنِ دریافتِ غذا";
export const INPATIENT_FACTORS = {
  WBC: { high: INFLAM }, NEUT_ABS: { high: INFLAM },
  LYMPH_ABS: { low: ACUTE_STRESS },
  EOS_ABS: { high: "داروهای تازه‌شروع‌شده (مثلاً بعضی آنتی‌بیوتیک‌ها) و عفونت", low: ACUTE_STRESS + " (در ICU شایع است)" },
  HGB: { low: ANEMIA }, HCT: { low: ANEMIA }, RBC: { low: ANEMIA },
  PLT: { low: "عفونتِ شدید، هپارین، بعضی داروها و اختلالِ انعقادی", high: "واکنش به عفونت، جراحی یا التهاب" },
  GLU_F: { high: GLU_HI, low: GLU_LO }, GLU_RANDOM: { high: GLU_HI, low: GLU_LO }, GLU_2H: { high: GLU_HI }, 
  NA: { low: "سرم‌های وریدی، دیورتیک‌ها و ترشحِ نابجای هورمونِ ضدادراری", high: "از دست رفتنِ مایع و سرم‌های نمکیِ غلیظ" },
  K: { low: "دیورتیک‌ها، انسولین و از دست رفتنِ مایعاتِ گوارشی", high: "نارساییِ کلیه، داروهایی که پتاسیم نگه می‌دارند، تزریقِ خون و همولیزِ نمونه" },
  CREAT: { high: KIDNEY }, UREA: { high: KIDNEY },
  ALT: { high: LIVER }, AST: { high: LIVER }, ALP: { high: LIVER }, GGT: { high: LIVER },
  BILI_T: { high: "عفونتِ شدید، همولیز، تغذیهٔ وریدی و بعضی داروها" },
  ALB: { low: "بیماریِ حاد، التهاب و رقیق‌شدن با سرم" },
  MG: { low: "دیورتیک‌ها، بعضی آنتی‌بیوتیک‌ها و داروهای ضدترشحِ معده" },
  PHOS: { low: "انسولین، تغذیهٔ وریدی یا شروعِ دوبارهٔ تغذیه" },
  INR: { high: "داروهای ضدانعقاد، بعضی آنتی‌بیوتیک‌ها و کم‌بودنِ دریافتِ ویتامین K" },
  PT: { high: "داروهای ضدانعقاد، بعضی آنتی‌بیوتیک‌ها و کم‌بودنِ دریافتِ ویتامین K" },
  APTT: { high: "هپارین" },
  CK: { high: "تزریقِ عضلانی، ضربه و بعضی داروها (مثلاً استاتین‌ها)" },
  TSH: { any: THYROID }, FT3: { low: THYROID }, T3: { low: THYROID },
};
const INPATIENT_MARK = "چون در بیمارستان بستری هستید";
const INPATIENT_MARK_CHILD = "چون فرزندتان در بیمارستان بستری است";

/** owns(f, key): یافته f آن آزمایش را می‌خواند *و* در متنش نامش را آورده (patterns.js: RULE_READS + textNamesTest). */
export function applyInpatientContext(findings, engineOut, owns) {
  if (engineOut?._probe || !onInpatient(engineOut) || typeof owns !== "function") return;
  // P146 (برگهٔ بستریِ کودکِ ۷ ساله): AST/CK در دو یافته (کبد و LDH) هر بار همان پاراگرافِ «چون بستری هستید … » را می‌گرفتند —
  //   سه بار در یک گزارش. هر آزمایش فقط یک بار عامل می‌گیرد (اولین یافته‌ای که نامش را برده). و کودکِ زیرِ ۱۲ (لحنِ والد، P79):
  //   «هستید» را childVoice عوض نمی‌کند ⇒ جملهٔ والد از همین‌جا.
  const mark = typeof engineOut.age === "number" && engineOut.age < CHILD_VOICE_MAX_AGE ? INPATIENT_MARK_CHILD : INPATIENT_MARK;
  const seen = new Set();
  // فوری‌ترین یافته اول (پیش‌تر ترتیبِ پردازش): جمله روی کارتی می‌نشیند که بیشتر دیده می‌شود، نه روی یافتهٔ روتینی که شاید بعداً پنهان شود (N18).
  const RANK = { emergency: 0, soon: 1, this_week: 2, routine: 3, none: 4 };
  for (const f of [...findings].sort((a, b) => (RANK[a.urgency] ?? 5) - (RANK[b.urgency] ?? 5))) {
    if (typeof f.must_say !== "string" || f.urgency === "emergency" || f.must_say.includes("بستری")) continue;
    const byFactor = new Map();
    for (const g of engineOut.graded ?? []) {
      if (!g.abnormal || seen.has(g.test)) continue;
      const fac = INPATIENT_FACTORS[g.test]?.[g.dir] ?? INPATIENT_FACTORS[g.test]?.any;
      if (!fac || !owns(f, g.test)) continue;
      byFactor.set(fac, [...(byFactor.get(fac) ?? []), g.test]);
    }
    if (!byFactor.size) continue;
    const used = [...byFactor].slice(0, 3);
    for (const [, keys] of used) keys.forEach((k) => seen.add(k));
    const items = used.map(([fac, keys]) => `${[...new Set(keys.map(faName))].join(" و ")}: ${fac}`);
    f.must_say = `${f.must_say.trimEnd()} ${mark} (بخش یا ICU)، عواملِ درمان و بیماریِ حاد هم می‌توانند این نتیجه‌ها را تغییر دهند — ${items.join("؛ ")}. پزشکِ معالج این اعداد را همراهِ داروها و روندِ روزهای قبل می‌سنجد.`;
    (f.applied_conditions ??= []).includes("hospitalized") || f.applied_conditions.push("hospitalized");
  }
}

/** بنرِ بالای صفحه برای بستریِ دارای نتیجهٔ بحرانی. متنِ پیش‌فرضِ فرانت «به اورژانس بروید یا ۱۱۵» است و برای بستری غلط است. */
export function inpatientBanner(engineOut, patternOut) {
  if (!onInpatient(engineOut) || !patternOut?.has_critical) return null;
  return {
    title: "این نتیجه باید همین حالا به تیم درمان اطلاع داده شود",
    body: "شما در بیمارستان هستید و لازم نیست به جایی بروید. همین حالا پرستار یا پزشکِ بخش را از این نتیجه باخبر کنید و همین برگه را نشانش بدهید.",
  };
}
