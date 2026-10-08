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
const WHERE_WHEN = /اورژانس|۱۱۵|مطب|وقت بگیرید|نوبتِ?\s*(عادی|بعدی)|مراجعه|تماس بگیرید|این هفته|همین امروز|همین چند روز|همین حالا|فوراً|فورا|اسرع وقت|اولین فرصت|منتظر|برگه را همراه|هفته‌های پیشِ رو|۲۴ تا ۴۸ ساعت/;
const SENT = /(?<=[.؟!؛])\s+/;
const CONDITIONAL = /^(اگر|مگر|چنانچه|در صورتِ?)\s/;
const split = (s) => String(s).split(SENT).map((x) => x.trim()).filter(Boolean);

/** هشدارِ شرطیِ «اگر X، به اورژانس بروید» ⇒ «اگر X، همین حالا به پرستارِ بخش اطلاع دهید»؛ غیرشرطیِ کجا/کی ⇒ حذف. */
function inpatientWarning(w) {
  const out = [];
  for (const s of split(w)) {
    if (!WHERE_WHEN.test(s)) { out.push(s); continue; }
    const i = s.lastIndexOf("،");
    if (CONDITIONAL.test(s) && i > 0) out.push(`${s.slice(0, i)}، همین حالا به پرستارِ بخش اطلاع دهید.`);
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

/** بنرِ بالای صفحه برای بستریِ دارای نتیجهٔ بحرانی. متنِ پیش‌فرضِ فرانت «به اورژانس بروید یا ۱۱۵» است و برای بستری غلط است. */
export function inpatientBanner(engineOut, patternOut) {
  if (!onInpatient(engineOut) || !patternOut?.has_critical) return null;
  return {
    title: "این نتیجه باید همین حالا به تیم درمان اطلاع داده شود",
    body: "شما در بیمارستان هستید و لازم نیست به جایی بروید. همین حالا پرستار یا پزشکِ بخش را از این نتیجه باخبر کنید و همین برگه را نشانش بدهید.",
  };
}
