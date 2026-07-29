// ============================================================
// گروه‌بندی تست‌ها بر اساس دستگاه بدن — دادهٔ نمایشی، نه بالینی.
//
// عمداً اینجاست و نه در khanesh-server/rules/refs.js: کارِ refs.js فقط
// محدودهٔ مرجعِ بالینی است، و افزودنِ یک فیلدِ `cat` به آن یعنی چک‌لیستِ
// پنج‌فایلیِ «افزودن تست جدید» برای یک تغییرِ صرفاً ظاهری هم باید لمس شود.
//
// کلیدها کلیدِ موتورند (HGB, GLU_F)، نه کلیدهای REF فرانت (hb, fbs).
// ============================================================

export const CATEGORIES = {
  cbc:        { label: "شمارش خون", icon: "🩸" },
  iron:       { label: "آهن و کم‌خونی", icon: "🧲" },
  glycemia:   { label: "قند خون", icon: "🍬" },
  lipids:     { label: "چربی خون", icon: "❤️" },
  kidney:     { label: "کلیه", icon: "🫘" },
  liver:      { label: "کبد", icon: "🫀" },
  electro:    { label: "الکترولیت‌ها", icon: "⚡" },
  thyroid:    { label: "تیروئید", icon: "🦋" },
  coag:       { label: "انعقاد", icon: "🩹" },
  inflam:     { label: "التهاب و عفونت", icon: "🌡️" },
  cardiac:    { label: "قلب", icon: "💓" },
  vitamin:    { label: "ویتامین‌ها", icon: "💊" },
  serology:   { label: "سرولوژی", icon: "🔬" },
  other:      { label: "سایر", icon: "📋" },
};

// کلیدِ موتور → دستهٔ نمایشی
const MAP = {
  // شمارش خون
  WBC: "cbc", RBC: "cbc", HGB: "cbc", HCT: "cbc", PLT: "cbc", MPV: "cbc",
  MCV: "cbc", MCH: "cbc", MCHC: "cbc", RDW_CV: "cbc", RDW_SD: "cbc", RETIC: "cbc",
  NEUT_ABS: "cbc", LYMPH_ABS: "cbc", MONO_ABS: "cbc", EOS_ABS: "cbc",
  BASO_ABS: "cbc", BAND_ABS: "cbc",

  // آهن و کم‌خونی
  FERRITIN: "iron", IRON: "iron", TIBC: "iron", TSAT: "iron",
  B12: "iron", FOLATE: "iron", HAPTO: "iron",

  // قند
  GLU_F: "glycemia", GLU_2H: "glycemia", GLU_RANDOM: "glycemia", HBA1C: "glycemia",

  // چربی
  CHOL: "lipids", TG: "lipids", HDL: "lipids", LDL: "lipids",

  // کلیه
  CREAT: "kidney", UREA: "kidney", UREA_N: "kidney", URIC: "kidney", ACR: "kidney",

  // کبد
  AST: "liver", ALT: "liver", ALP: "liver", GGT: "liver",
  BILI_T: "liver", BILI_D: "liver", BILI_I: "liver",
  ALB: "liver", TP: "liver", AMYLASE: "liver", LIPASE: "liver", NH3: "liver",

  // الکترولیت و اسید-باز
  NA: "electro", K: "electro", CL: "electro", CA: "electro",
  MG: "electro", PHOS: "electro", HCO3: "electro", PH: "electro", LACTATE: "electro",

  // تیروئید
  TSH: "thyroid", T3: "thyroid", T4: "thyroid", FT3: "thyroid", FT4: "thyroid",
  ANTI_TPO: "thyroid",

  // انعقاد
  PT: "coag", APTT: "coag", INR: "coag", FIB: "coag", ATIII: "coag", DDIMER: "coag",

  // التهاب
  ESR: "inflam", CRP_Q: "inflam", PCT_SEPSIS: "inflam", RF: "inflam", LDH: "inflam",

  // قلب
  TROPONIN_I: "cardiac", CK: "cardiac", CK_MB: "cardiac",

  // ویتامین
  VIT_D: "vitamin",

  // سرولوژی
  WRIGHT: "serology", ME2: "serology", COOMBS_WRIGHT: "serology",
};

/**
 * دستهٔ یک کلیدِ موتور. کلیدِ ناشناخته در «سایر» می‌افتد و هرگز ناپدید
 * نمی‌شود — تعمیمِ درسِ N2: چیزی که نگاشت نشده باید دیده شود، نه اینکه
 * بی‌صدا از فهرست بیفتد بیرون.
 */
export function categoryOf(key) {
  return MAP[key] ?? "other";
}

/** ترتیب نمایش دسته‌ها — به ترتیبی که روی برگهٔ آزمایش ایرانی چاپ می‌شوند */
export const CATEGORY_ORDER = [
  "cbc", "iron", "glycemia", "lipids", "kidney", "liver",
  "electro", "thyroid", "coag", "inflam", "cardiac", "vitamin", "serology", "other",
];
