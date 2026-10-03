// بیماری‌های زمینه‌ای (specs/011). قرینهٔ khanesh-server/rules/conditions.js —
// ⚠️ فقط شناسه و برچسب. اینکه کدام بیماری واقعاً در تفسیر لحاظ شد را فرانت
//    تصمیم نمی‌گیرد؛ از `_engine.context.conditions_applied` خوانده می‌شود.
export const CONDITIONS = [
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
];

export const NONE_ID = "none";

export const conditionFa = (id) => CONDITIONS.find((c) => c.id === id)?.fa ?? id;
