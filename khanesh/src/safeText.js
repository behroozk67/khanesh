// ---- رندر امن خروجی مدل ----
// خروجی JSON مدل ممکن است رشته نباشد (شیء/آرایه). React موقع رندرِ مستقیمِ یک
// شیء crash می‌کند و چون Error Boundary نبود، کل صفحه سفید می‌شد.
//
// ⚠️ هر چیزی که از خروجیِ مدل خوانده می‌شود باید از این دو رد شود. روی مسیرِ
//    قدیمیِ USE_ENGINE=false هیچ فیلدی جز _engine تضمین‌شده نیست.
export function asText(v) {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  try { return JSON.stringify(v); } catch { return ""; }
}

export function asList(v) {
  if (Array.isArray(v)) return v;
  if (v == null || v === "") return [];
  return [v];
}
