// ============================================================
// نوزاد — کمکی‌های مشترکِ متن (job c138671c، P57)
//
// ⚠️ هیچ بازه یا آستانهٔ تازه‌ای اینجا نیست. سن‌ها از refs.js (تعریفِ WHO و ردیفِ اولِ PED_REFS.MCV) و
//    بازه‌ها از PED_REFS می‌آیند. این فایل فقط جمله می‌سازد.
// ⚠️ متن‌سازها عمداً *بیرون* از قاعده‌اند: RULE_READS سورسِ match/build را برای کلید می‌کاود، و خواندنِ WBC/MCV
//    داخلِ قاعده آن‌ها را در *هر* جهتی «پوشش‌داده» می‌کرد (M156) — WBCِ بالا یا MCVِ بالا بی‌صدا گم می‌شد.
// ============================================================
import { isNeonate, inNeonatalRedCellPeriod, NEONATAL_PERIOD_DAYS } from "./refs.js";
import { PED_REFS } from "./refs_ped.js";
import { faName } from "./names.js";

export { isNeonate, inNeonatalRedCellPeriod };

/** سن به فارسی برای متنِ بیمار: «۱ روز» تا سه ماه به روز، بعد به ماه. */
export function ageFa(age) {
  const days = age * 365;
  if (days < 1) return "کمتر از یک روز";
  if (days < 90) return `${Math.round(days)} روز`;
  return `${Math.round(age * 12)} ماه`;
}

// علائمِ خطرِ عفونتِ جدیِ باکتریایی در شیرخوارِ ۰ تا ۵۹ روزه — هفت نشانهٔ PSBIِ WHO («WHO recommendations for
// management of serious bacterial infections in infants aged 0–59 days»). عدد عمداً نیامده (دمای ۳۸ / ۳۵.۵،
// تنفسِ ۶۰): والد دماسنجِ دقیق یا شمارشِ تنفس ندارد، و آستانه‌ها مالِ پزشک‌اند. متن منتظرِ تأییدِ کاربر است (P57).
export const NEONATAL_DANGER_WARNING =
  "اگر نوزاد تب دارد یا بدنش سرد است، شیر نمی‌خورد یا بد شیر می‌خورد، تند نفس می‌کشد یا هنگامِ نفس قفسهٔ سینه‌اش به داخل کشیده می‌شود، تشنج می‌کند، یا بی‌حال است و فقط با تحریک حرکت می‌کند، منتظر نمانید و همان ساعت به اورژانس بروید.";

// P57 پرسش ۵ (بازبین، ۲۰۲۶-۰۹-۲۸): «این هفته» برای نوزاد ناامن است — هر یافتهٔ غیرطبیعی در دورهٔ نوزادی دست‌کم «امروز».
//   موتور سطحِ «امروز» ندارد؛ soon («۲۴ تا ۴۸ ساعت») از سقفِ «حداکثر ۲۴ ساعت» می‌گذرد، پس کف = emergency با همین دستورِ
//   «همین امروز» — همان جفتِ فوریت/جمله که leukopeniaِ شدید دارد (N20). رفتنِ فوری به اورژانس فقط با علائمِ خطر است.
export const NEONATAL_TODAY_ACTION = "همین امروز این برگه را به پزشکِ نوزاد (متخصصِ کودکان) نشان دهید یا با او تماس بگیرید.";
const FLOORED = new Set(["routine", "this_week", "soon"]);
// تصمیمِ کاربر ۲۰۲۶-۰۹-۲۹: RDW (CV و SD) فقط شاخصِ کمکی‌اند؛ اگر تنها عددِ بی‌مالکِ برگه باشند، کفِ نوزادی
//   «همین امروز» نمی‌سازد (بدونِ این، نوزادِ ۱ روزه با RDW-SD 80 تنها ⇒ emergency، N3). یافتهٔ بی‌مالک همان سطحِ خودش را می‌ماند.
export const NEONATAL_NO_FLOOR_KEYS = new Set(["RDW_SD", "RDW_CV"]);
/**
 * کفِ فوریتِ نوزادی — در runPatterns، پیش از انتخاب/سرکوبِ یافته‌ها. فقط یافته‌ای که دستور دارد (action ناتهی) و فنی نیست
 * (technical: ناهماهنگیِ شاخص‌ها خطای دستگاه است، نه یافتهٔ بالینی). کاوشِ درونیِ adapter (`_probe`) کف نمی‌گیرد، وگرنه
 * «فوریتِ نوتروفیلی برابرِ سقف» همیشه emergency می‌شد و blocks_others روشن.
 * دستور و فوریت با هم عوض می‌شوند؛ جملهٔ زمان‌دارِ قبلی نمی‌ماند تا «این هفته» کنارِ «امروز» نیاید (N20).
 */
export function applyNeonatalFloor(findings, engineOut) {
  if (engineOut?._probe || !isNeonate(engineOut?.age)) return;
  for (const f of findings) {
    if (!f.action || f.technical || !FLOORED.has(f.urgency)) continue;
    if (f.uncovered?.length && f.uncovered.every((k) => NEONATAL_NO_FLOOR_KEYS.has(k))) continue;
    // تورِ «هیچ قاعده‌ای نبود» (patterns.js) فیلدِ uncovered ندارد — همهٔ غیرطبیعی‌ها را از خودِ موتور می‌خوانیم.
    if (f.pattern === "unmatched_abnormal" && engineOut.abnormal?.length && engineOut.abnormal.every((a) => NEONATAL_NO_FLOOR_KEYS.has(a.test))) continue;
    f.urgency = "emergency";
    f.neonatal_floor = true;
    f.action = NEONATAL_TODAY_ACTION;
    if (!(f.warnings ?? []).includes(NEONATAL_DANGER_WARNING)) f.warnings = [...(f.warnings ?? []), NEONATAL_DANGER_WARNING];
  }
}

/**
 * ردیفِ *بعدیِ* PED_REFS برای همان کلید، اگر هنوز داخلِ دورهٔ نوزادی است — تا متن بگوید بازه روزبه‌روز عوض می‌شود.
 * خروجی: { label: «۲ تا ۳ روزگی»، range: «3000–9000» } یا null.
 */
export function nextNeonatalBand(key, age) {
  const rows = PED_REFS[key];
  if (!rows || age == null) return null;
  const i = rows.findIndex((r) => age <= r.maxAge);
  if (i < 0 || i + 1 >= rows.length) return null;
  const from = Math.round(rows[i].maxAge * 365), to = Math.round(rows[i + 1].maxAge * 365);
  if (to > NEONATAL_PERIOD_DAYS) return null;
  if (!rows[i + 1].range) return null;
  const [lo, hi] = rows[i + 1].range;
  return { label: `${from} تا ${to} روزگی`, range: `${lo}–${hi}` };
}

const gradedOf = (e, k) => e.graded.find((g) => g.test === k);

/**
 * متنِ یافتهٔ neutrophil_count_missing. ورودی: e.ungraded.NEUT_ABS با reason = "diff_incomplete" (adapter.js).
 * WBC و بقیهٔ اجزا از `from` خوانده می‌شوند، نه با نام — تا در RULE_READS نیایند (M156).
 */
export function neutMissingText(e) {
  const u = e.ungraded.NEUT_ABS;
  const neo = isNeonate(e.age);
  const [wbcKey, ...otherKeys] = u.from;
  const wbc = gradedOf(e, wbcKey);
  const others = otherKeys.map((k) => gradedOf(e, k)).filter(Boolean);
  const intro = u.unreadable
    ? "شمارشِ نوتروفیل روی برگه چاپ شده ولی خوانا نبود، و بدونِ آن تصویرِ گلبول‌های سفید کامل نمی‌شود."
    : "شمارشِ نوتروفیل روی این برگه نیامده، و بدونِ آن تصویرِ گلبول‌های سفید کامل نمی‌شود.";
  const minus = others.map((g) => `${faName(g.test)} ${g.value}`).join(" و ");
  const arithmetic = wbc
    ? ` از روی عددهای خودِ برگه سقفش را می‌شود حساب کرد: ${faName(wbc.test)} ${wbc.value} هزار در میکرولیتر (یعنی ${Math.round(wbc.value * 1000)}) منهای ${minus}، یعنی نوتروفیل حداکثر ${u.ceiling} در میکرولیتر است.`
    : "";
  const ref = `بازهٔ مرجع${neo ? ` برای سنِ ${ageFa(e.age)}` : ""} (${u.range})`;
  const verdict = !u.range ? ""
    : u.below
      ? ` این سقف از حدِ پایینِ ${ref} کمتر است؛ پس نوتروفیل با هر مقدارِ ممکنی کمتر از این بازه است.`
      : ` این سقف از حدِ پایینِ ${ref} کمتر نیست، پس از روی برگه نمی‌شود گفت نوتروفیل کم است یا نه.`;
  return `${intro}${arithmetic}${verdict} عددِ واقعی را فقط شمارشِ افتراقی (دستگاهی یا با لامِ خون) نشان می‌دهد.`;
}

/**
 * متنِ neonatal_reference_context: چرا بعضی شاخص‌های گلبول قرمز در این سن سنجیده نشدند (D4–D6، D8).
 * MCV/MCHC اینجا خوانده می‌شوند، نه در قاعده (M156).
 */
export function neonatalContextText(e) {
  const noRange = Object.entries(e.ungraded)
    .filter(([, u]) => u.reason === "neonatal_no_range")
    .map(([k, u]) => `${faName(k)} ${u.value}`);
  const mch = Object.entries(e.ungraded).find(([, u]) => u.reason === "neonatal_derived");
  const mcv = gradedOf(e, "MCV");
  const who = isNeonate(e.age) ? "نوزاد" : "شیرخوار";
  const parts = [
    `سنِ ثبت‌شده ${ageFa(e.age)} است، پس شمارشِ خون با بازه‌های مرجعِ ویژهٔ این سن سنجیده شد، نه با بازه‌های بزرگسال.`,
    `گلبول‌های قرمزِ ${who} در ماه‌های اولِ عمر به‌طورِ طبیعی درشت‌ترند` +
      (mcv && !mcv.abnormal ? ` (MCV شما ${mcv.value} است و در بازهٔ این سن، ${mcv.range}، قرار دارد).` : "."),
  ];
  if (noRange.length) {
    parts.push(`برای ${noRange.join("، ")} در این سن بازهٔ مرجعِ منتشرشده‌ای در موتور نیست و بازهٔ بزرگسال برای این سن درست نیست؛ ` +
      "پس این‌ها عمداً سنجیده نشدند و «بالا» یا «پایین» خوانده نمی‌شوند.");
  }
  if (mch) {
    const mchc = gradedOf(e, "MCHC");
    parts.push(`MCH (${mch[1].value}) عددی مستقل نیست: از MCV و MCHC${mchc ? ` (${mchc.value})` : ""} به دست می‌آید و هر دوِ آن‌ها در بازهٔ این سن‌اند؛ ` +
      "پس MCH جداگانه «غیرطبیعی» شمرده نشد.");
  }
  return parts.join(" ");
}

/**
 * P57 پرسش ۶: شاخص‌های پلاکتی (PDW، پلاکت‌کریت، P-LCR) به دستگاه وابسته‌اند و بازهٔ استانداردِ بین‌المللی ندارند. هرگز
 * به‌تنهایی هشدار یا فوریت نمی‌سازند؛ فقط وقتی پلاکت یا MPV غیرطبیعی است، به‌عنوانِ شاهدِ کمکی با بازهٔ معمولِ پاسخِ
 * بازبین نقل می‌شوند — بی‌حکمِ «بالا/پایین». PDW دو فرمول دارد (fL یا ٪)؛ بی‌واحد، بازه‌ای نقل نمی‌شود.
 */
export const plateletAbnormal = (e) =>
  e.graded.some((g) => (g.test === "PLT" || g.test === "MPV") && g.abnormal);
export function plateletIndicesText(e) {
  const typical = (k, u) => {
    if (k === "PLT_CRIT") return "0.15–0.40٪";
    if (k === "P_LCR") return "15–35٪";
    if (/fl/i.test(String(u ?? ""))) return "9–17 fL";
    if (/%/.test(String(u ?? ""))) return "35–55٪";
    return null;
  };
  const items = Object.entries(e.ungraded)
    .filter(([, u]) => u.reason === "platelet_index")
    .map(([k, u]) => {
      const t = typical(k, u.unit);
      return `${faName(k)} ${u.value}${t ? ` (بازهٔ معمول ${t})` : ""}`;
    });
  return `شاخص‌های پلاکتیِ این برگه: ${items.join("، ")}. ` +
    "این شاخص‌ها به دستگاهِ آزمایشگاه وابسته‌اند و بازهٔ استانداردِ بین‌المللی ندارند؛ فقط به‌عنوانِ شاهدِ کمکی کنارِ شمارشِ پلاکت و MPV آمده‌اند و به‌تنهایی تفسیر نمی‌شوند.";
}

/** P57 پرسش ۳: متنِ rbc_indices_inconsistent. MCV/MCHC اینجا خوانده می‌شوند، نه در قاعده (M156). */
export function indicesInconsistentText(e) {
  const u = e.ungraded.MCH;
  const mcv = gradedOf(e, "MCV"), mchc = gradedOf(e, "MCHC");
  return `MCH شما ${u.value} گزارش شده، ولی از روی MCV (${mcv?.value ?? u.mcv}) و MCHC (${mchc?.value ?? u.mchc}) همین برگه باید حدودِ ${u.calc} باشد ` +
    "(MCH = MCV × MCHC ÷ ۱۰۰). اختلافِ بیش از ۱۰٪ معمولاً از خطای ثبت یا دستگاه است؛ پس از MCH نتیجه‌ای گرفته نمی‌شود و تفسیرِ گلبول‌های قرمز بر پایهٔ MCV و هموگلوبین است.";
}

/** نسخهٔ نوزادیِ low_rbc_hct_without_anemia — جملهٔ «گلبولِ درشت». MCV اینجا خوانده می‌شود، نه در قاعده (M156). */
export function neonatalLowRbcClause(e) {
  const mcv = gradedOf(e, "MCV");
  const big = mcv && !(mcv.abnormal && mcv.dir === "low");
  return (big
    ? `گلبول‌های قرمزِ نوزاد درشت‌ترند (MCV ${mcv.value})، پس همان مقدار هموگلوبین در تعدادِ کمتری گلبول جا می‌گیرد. `
    : "") +
    "معنای این ترکیب را پزشکِ نوزاد کنارِ معاینه و تکرارِ CBC تعیین می‌کند.";
}
