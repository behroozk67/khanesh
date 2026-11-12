import { inferAge } from "./adapter.js";

/**
 * P108-ج: ردیفِ ذخیره‌شدهٔ jobs ⇒ `prior` ِ موتور ({ date, graded, sex }). فقط ALT/AST؛ نتیجهٔ بی‌_engine ⇒ null.
 * تاریخ: `_engine.context.sample_date` (چاپ‌شده روی برگه) اگر هست، وگرنه created_at (SQLite، UTC بی‌منطقه ⇒ «Z»).
 */
export function priorFromStoredResult(row) {
  const eng = row?.result?._engine;
  if (!Array.isArray(eng?.tests)) return null;
  const graded = eng.tests.filter((t) => t.key === "ALT" || t.key === "AST")
    .map((t) => ({ test: t.key, value: t.value, abnormal: t.abnormal, dir: t.dir, range: t.range }));
  if (!graded.length || !row.created_at) return null;
  // تاریخِ نمونهٔ چاپ‌شده بر تاریخِ بارگذاری مقدم است (برگهٔ قدیمیِ امروز آپلودشده).
  const c = String(row.created_at);
  const date = eng.context?.sample_date ?? (/[zZ]|[+-]\d\d:?\d\d$/.test(c) ? c : c.replace(" ", "T") + "Z");
  const sex = eng.context?.sex === "مرد" ? "M" : eng.context?.sex === "زن" ? "F" : null;
  // سن از همان متنِ context («۳۸ سال»، «۶ ماه») با همان خواننده‌ای که برگه را می‌خواند.
  const age = eng.context?.age_text ? inferAge({ patient: { age: eng.context.age_text } }) : null;
  return { date, graded, ...(sex ? { sex } : {}), ...(typeof age === "number" ? { age } : {}) };
}
