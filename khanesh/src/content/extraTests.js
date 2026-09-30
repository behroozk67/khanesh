// ============================================================
// محتوای صفحهٔ آزمایش‌هایی که در فرمِ ورودِ دستی نیستند — ۲۳۷ آزمایش.
//
// ساختارِ هر مدخل همان ساختارِ TEST_PAGES در testContent.js است، منهای دو
// چیز و به‌علاوهٔ یکی:
//   • `high`/`low` ندارد. آن‌ها از REF می‌آمدند و این آزمایش‌ها در REF نیستند.
//   • جای آن‌ها `results` و `resultsUl` نشسته: برای آزمایشِ کیفی معنیِ «مثبت»
//     و «منفی» و برای آزمایشِ کمّی معنیِ «بالا» و «پایین».
//   • `sample` اینجا مهم‌تر است تا در testContent: نمونهٔ خیلی از این‌ها خون
//     نیست (ادرار ۲۴ ساعته، مدفوع، سواب، مایع نخاع، تستِ پوستی).
//
// ⚠️ همان سه قاعدهٔ testContent.js اینجا هم برقرار است و مهم‌ترینش این است:
//    هیچ محدودهٔ مرجعِ آزمایشگاهی نوشته نمی‌شود. تنها عددهایی که می‌آیند
//    آستانه یا معیارِ یک راهنمای منتشرشده‌اند، داخلِ `guideline`، و هر کدام
//    `ids` دارند که در sources.js موجود است.
//
// ⚠️ و یک قاعدهٔ ویژهٔ همین فایل: **این آزمایش‌ها را برنامه تفسیر نمی‌کند.**
//    متن نباید طوری نوشته شود که انگار موتور نتیجه‌شان را می‌خواند؛ کادرِ
//    وضعیتِ پوشش را ExtraTestPage خودش اضافه می‌کند و متنِ اینجا نباید با آن
//    تناقض داشته باشد.
//
// کلیدِ هر مدخل اسلاگی است که testCatalog.testSlug() از نامِ آزمایش می‌سازد.
// اگر نامِ آزمایش در فهرست عوض شود، اسلاگش هم عوض می‌شود و مدخلِ اینجا یتیم
// می‌ماند — coverage.mjs همین را می‌گیرد.
// ============================================================

import { ALLERGY } from "./extra.allergy.js";
import { WELLNESS } from "./extra.wellness.js";
import { INFLAMMATION } from "./extra.inflammation.js";
import { CANCER } from "./extra.cancer.js";
import { HEAVYMETAL } from "./extra.heavymetal.js";
import { PREGNANCY } from "./extra.pregnancy.js";
import { CARDIAC } from "./extra.cardiac.js";
import { HORMONE } from "./extra.hormone.js";
import { STD } from "./extra.std.js";
import { DISEASE } from "./extra.disease.js";
import { IMMUNITY } from "./extra.immunity.js";
import { THYROID } from "./extra.thyroid.js";
import { DRUG } from "./extra.drug.js";
import { INFECTIOUS } from "./extra.infectious.js";
import { VITAMINS } from "./extra.vitamins.js";
import { GENETIC } from "./extra.genetic.js";
import { ATHOME } from "./extra.athome.js";
import { PANELS } from "./extra.panels.js";

export const EXTRA_TESTS = {
  ...ALLERGY, ...WELLNESS, ...INFLAMMATION, ...CANCER, ...HEAVYMETAL,
  ...PREGNANCY, ...CARDIAC, ...HORMONE, ...STD, ...DISEASE, ...IMMUNITY,
  ...THYROID, ...DRUG, ...INFECTIOUS, ...VITAMINS, ...GENETIC, ...ATHOME,
  ...PANELS,
};
