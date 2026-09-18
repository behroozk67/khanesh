// ============================================================
// LabMate — قواعد هیپوفیز و آدرنال
// منبع: Henry's Clinical Diagnosis, فصل ۲۵ «Endocrine and Pituitary Function»
//        (شناسهٔ HENRY_ENDOCRINE در guidelines.js)
// طراحی: specs/001-endocrine-pituitary-rules/ — ثبتِ بالینی: P46 در MEDICAL_RULES.md
//
// ⚠️ این فایل عمداً خالی است (مرحلهٔ الف). کلیدهای PRL، CORTISOL_*، UFC و ACTH
//    شناخته می‌شوند ولی بازه ندارند و به noRef می‌روند — هیچ ادعای بالینی‌ای
//    ساخته نمی‌شود. قاعده‌ها فقط پس از تأییدِ بازبین برای بندهای P46 وارد می‌شوند:
//      • hyperprolactinemia — تنها مالکِ PRL (بندهای ۱، ۲، ۱۱)
//      • adrenalAxis(e) + هفت قاعدهٔ برچسبی — تنها مالکِ خانوادهٔ کورتیزول
//        (همان شکلِ mineralAxis در patterns_mineral_bone.js؛ بندهای ۳–۱۰، ۱۲)
//    آزمون‌های M101–M103d از پیش نوشته شده‌اند و با برچسبِ todo قرمزند.
// ============================================================

export const RULES_ENDOCRINE_PITUITARY = [];
