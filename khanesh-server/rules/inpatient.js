// ============================================================
// بیمارِ بستری — بخش، ICU یا اورژانسِ بیمارستان (گزینهٔ الف، تصمیمِ کاربر ۲۰۲۶-۱۰-۰۸، P66/P97).
//
// ⚠️ فقط *لحنِ دستور* عوض می‌شود. فوریت، آستانه، بازهٔ مرجع، has_critical و نمره دست نمی‌خورند.
//    «به اورژانس بروید»، «وقت بگیرید» و «این هفته» برای کسی که همین حالا در بیمارستان است بی‌معنا یا گمراه‌کننده‌اند؛
//    جایش یک جملهٔ ثابت می‌آید که از *خودِ فوریتِ یافته* ساخته می‌شود (N20: دستور و فوریت یک تصمیم‌اند).
// ⚠️ شکلِ این فایل همان applyNeonatalFloor است (neonatal.js)، ولی کف نمی‌گذارد و هیچ فوریتی را بالا یا پایین نمی‌برد.
//    آستانهٔ «بحرانی» برای بیمارِ ICU فرق دارد، ولی آن یک تصمیمِ بالینیِ جداست و اینجا نیست (گزینهٔ ب).
// ============================================================

export const onInpatient = (e) => Array.isArray(e?.conditions) && e.conditions.includes("hospitalized");

export const INPATIENT_NOW_ACTION = "همین حالا این نتیجه را به پزشک یا پرستارِ بخش اطلاع دهید.";
export const INPATIENT_ROUND_ACTION = "این نتیجه را در ویزیتِ بعدیِ پزشکِ معالج مطرح کنید.";

// جمله‌ای که *کجا برو / کی برو* می‌گوید. محتوا (تکرار آزمایش، قطعِ دارو، …) این واژه‌ها را ندارد و می‌ماند.
const WHERE_WHEN = /اورژانس|۱۱۵|مطب|وقت بگیرید|نوبتِ?\s*(عادی|بعدی)|مراجعه|تماس بگیرید|این هفته|همین امروز|همین چند روز|همین حالا|فوراً|فورا|اسرع وقت|اولین فرصت|منتظر|برگه را همراه|هفته‌های پیشِ رو|۲۴ تا ۴۸ ساعت|زودتر/;
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

// ═══ P142-ب (درخواستِ کاربر ۲۰۲۶-۱۱-۱۲): بستری ⇒ فقط *اشاره* به نقشِ بستری/درمانِ بخش در چند یافتهٔ شمارشِ خون ═══
// ⚠️ فقط یک جمله به must_say اضافه می‌شود. فوریت، آستانه، action و نمره دست نمی‌خورند. جمله ادعا نمی‌کند «بستری علتِ این عدد است»؛
//    می‌گوید می‌تواند در آن نقش داشته باشد و پزشکِ معالج باید همراهِ داروها و وضعیتِ بالینی بسنجد (N5/N21).
// ⚠️ کلیدِ جدول شناسهٔ قاعده است؛ قاعدهٔ تازه باید اینجا ثبت شود (کمی عمداً: اشارهٔ بی‌جا به هر یافته‌ای نویز است).
export const INPATIENT_CONTEXT = {
  eosinophilia: "چون در بیمارستان بستری هستید، داروهای تازه‌شروع‌شده در بخش (مثلاً بعضی آنتی‌بیوتیک‌ها) و عفونت یا بیماریِ زمینه‌ای می‌توانند در بالا رفتنِ ائوزینوفیل نقش داشته باشند؛ پزشکِ معالج این عدد را همراهِ فهرستِ داروهای شما می‌سنجد.",
  leukocytosis: "چون در بیمارستان بستری هستید، عفونت، استرسِ بیماریِ حاد و داروهایی مثل کورتیکواستروئید هم می‌توانند گلبول‌های سفید را بالا ببرند؛ پزشکِ معالج این عدد را با وضعیتِ بالینیِ شما می‌سنجد.",
  neutrophilia: "چون در بیمارستان بستری هستید، عفونت، استرسِ بیماریِ حاد و داروهایی مثل کورتیکواستروئید هم می‌توانند نوتروفیل را بالا ببرند؛ پزشکِ معالج این عدد را با وضعیتِ بالینیِ شما می‌سنجد.",
  lymphopenia: "چون در بیمارستان بستری هستید، استرسِ بیماریِ حاد و داروهایی مثل کورتیکواستروئید هم می‌توانند لنفوسیت را پایین بیاورند؛ پزشکِ معالج این عدد را با وضعیتِ بالینیِ شما می‌سنجد.",
  normocytic_anemia: "چون در بیمارستان بستری هستید، بیماریِ حاد، التهاب و نمونه‌گیری‌های مکرر هم می‌توانند هموگلوبین را پایین بیاورند؛ پزشکِ معالج این عدد را با روندِ روزهای قبل می‌سنجد.",
  anemia_hb_alone: "چون در بیمارستان بستری هستید، بیماریِ حاد، التهاب و نمونه‌گیری‌های مکرر هم می‌توانند هموگلوبین را پایین بیاورند؛ پزشکِ معالج این عدد را با روندِ روزهای قبل می‌سنجد.",
};

export function applyInpatientContext(findings, engineOut) {
  if (engineOut?._probe || !onInpatient(engineOut)) return;
  for (const f of findings) {
    const s = INPATIENT_CONTEXT[f.rule_id];
    if (!s || typeof f.must_say !== "string" || f.must_say.includes(s)) continue;
    f.must_say = `${f.must_say.trimEnd()} ${s}`;
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
