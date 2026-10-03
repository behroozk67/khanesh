// ============================================================
// بیماری‌های زمینه‌ایِ گزارش‌شده توسطِ بیمار (specs/011، P66).
//
// ⚠️ دو فهرست، دو کار:
//   CONDITIONS         — آنچه از بیمار پرسیده می‌شود (ده مورد، ترتیبِ نمایش).
//   ACTIVE_CONDITIONS  — آنچه موتور واقعاً می‌خواند. فقط این‌ها تفسیر را عوض
//                        می‌کنند، فقط این‌ها به پرامپتِ مدل می‌روند، و فقط این‌ها
//                        در خطِ «تفسیر بر پایهٔ …» می‌آیند (FR-019). افزودنِ یک
//                        شناسه اینجا یک تصمیمِ بالینی است و باید در MEDICAL_RULES.md
//                        (P66) تأیید شده باشد — نه یک تغییرِ ظاهری.
// ============================================================

export const CONDITIONS = Object.freeze([
  { id: "htn", fa: "فشار خون بالا" },
  { id: "dm2", fa: "دیابت نوع ۲" },
  { id: "lipid", fa: "چربی خون بالا" },
  { id: "hypothyroid", fa: "کم‌کاری تیروئید" },
  { id: "ckd", fa: "بیماری مزمن کلیه" },
  { id: "fatty_liver", fa: "کبد چرب" },
  { id: "ida", fa: "کم‌خونی فقر آهن" },
  { id: "thal_trait", fa: "ناقل تالاسمی (مینور)" },
  { id: "chd", fa: "بیماری عروق قلب" },
  { id: "cancer", fa: "سرطان / شیمی‌درمانی" },
]);

export const NONE_ID = "none";

export const ACTIVE_CONDITIONS = new Set(["dm2", "cancer"]);

const BY_ID = new Map(CONDITIONS.map((c) => [c.id, c]));
const BY_FA = new Map(CONDITIONS.map((c) => [c.fa, c.id]));

// برچسب‌های قدیمیِ ProfileCard و فایل‌های ذخیره‌شده — کلاینتِ قدیمی هنوز همین‌ها را می‌فرستد.
// ⚠️ سرطان همان regexِ قبلیِ adapter.js است، تا رفتارش عوض نشود. بقیه فقط برچسب‌های *دقیقِ* قدیمی:
//    بازبینیِ کد (specs/011) — regexِ آزادِ /دیابت/ «پیش‌دیابت» و «دیابت بارداری» را هم dm2 می‌کرد و
//    هدفِ LDL زیرِ ۱۰۰ را روشن می‌کرد.
const LEGACY = [
  [/سرطان|شیمی.?درمانی|رادیوتراپی|ایمونوتراپی/, "cancer"],
  [/^دیابت$/, "dm2"],
  [/^فشار خون$/, "htn"],
  [/^بیماری کلیوی$/, "ckd"],
  [/^بیماری کبدی$/, "fatty_liver"],
];

/**
 * ورودیِ آزاد (شناسه یا برچسبِ فارسی) → شناسه‌های کاتالوگ.
 * «none» حذف می‌شود؛ هرچه شناخته نشد در unknown برمی‌گردد (هرگز حدس زده نمی‌شود).
 */
export function conditionIds(input) {
  const ids = [];
  const unknown = [];
  const list = Array.isArray(input) ? input : input == null ? [] : [input];
  for (const raw of list) {
    const s = String(raw ?? "").trim();
    if (!s || s === NONE_ID) continue;
    let id = BY_ID.has(s) ? s : BY_FA.get(s) ?? null;
    if (!id) {
      const hit = LEGACY.find(([re]) => re.test(s));
      id = hit ? hit[1] : null;
    }
    if (id) { if (!ids.includes(id)) ids.push(id); }
    else unknown.push(s);
  }
  return { ids, unknown };
}

export const activeConditionIds = (input) => conditionIds(input).ids.filter((id) => ACTIVE_CONDITIONS.has(id));

export const conditionFa = (id) => BY_ID.get(id)?.fa ?? null;
