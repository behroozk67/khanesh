// عددِ «روی برگه» در برابر عددِ سنجیده‌شده (N5) و دو بلوکِ پایانیِ تفسیر که موتور خودش می‌سازد، نه مدل:
//   ۱) «موارد دیگر» = یافته‌های تکمیلی (زیرِ blocker)، ۲) «مواردِ در محدودهٔ طبیعی».
// فقط به names.js وابسته است تا هم patterns.js هم prompt.js هم expert.js بدونِ دور وارد کنند.
import { faName } from "./names.js";

/**
 * عددِ روی برگه و دلیلِ تفاوتش با عددِ سنجیده‌شده. فقط وقتی پر می‌شود که موتور عددِ برگه را *واقعاً* نگه داشته و
 * دلیلِ تفاوت معلوم است؛ وگرنه null. واحدِ چاپ‌نشده هرگز «روی برگه» نوشته نمی‌شود: basis ≠ printed ⇒ unit = null.
 */
export function printedOf(key, g, engineOut) {
  const ix = engineOut.indices ?? {};
  const albumin = key === "CA" && ix.ca_correction_applied;
  const glucose = key === "NA" && ix.na_correction_applied;
  const conv = (engineOut.unitConversions ?? []).find((c) => c.test === key);
  if (conv) {
    const printedUnit = conv.basis == null || conv.basis === "printed";
    return {
      printed: { value: conv.raw, unit: printedUnit ? conv.from ?? null : null },
      ...(printedUnit ? {} : { unit_assumed: conv.from ?? null }),
      derived_from: albumin ? "unit_conversion_and_albumin_correction" : glucose ? "unit_conversion_and_glucose_correction" : "unit_conversion",
    };
  }
  if (albumin) return { printed: { value: ix.ca_measured, unit: null }, derived_from: "albumin_correction" };
  if (glucose) return { printed: { value: ix.na_measured, unit: null }, derived_from: "glucose_correction" };
  const pct = engineOut.derivedAbs?.[key];
  if (pct != null) return { printed: { value: pct, unit: "%" }, derived_from: "percent_of_wbc" };
  return { printed: null, derived_from: null };
}

/** «ائوزینوفیل ٪2 (شمارش مطلق 36؛ طبیعی 100–1000)» — عددِ چاپ‌شده اول، عددِ سنجیده‌شده با برچسب (N5). */
export function rowQuoteFa(engineOut, a) {
  const name = faName(a.test);
  const p = printedOf(a.test, a, engineOut);
  const pv = p.printed?.value;
  const showPrinted = pv != null && String(pv) !== String(a.value);
  if (!showPrinted) return `${name} ${a.value}${a.range ? ` (طبیعی ${a.range})` : ""}`;
  const printed = p.printed.unit === "%" ? `٪${pv}` : `${pv}${p.printed.unit ? ` ${p.printed.unit}` : ""}`;
  const measured = p.derived_from === "percent_of_wbc" ? "شمارش مطلق" : "مقدار سنجیده‌شده";
  return `${name} ${printed} (${measured} ${a.value}${a.range ? `؛ طبیعی ${a.range}` : ""})`;
}

const NEONATE_YEARS = 28 / 365.25;
const CHILD_YEARS = 12;

/** وقتی جمله درصدِ چاپ‌شده را از پیش گفته: فقط شمارشِ مطلق («لنفوسیت: شمارشِ مطلق 787؛ طبیعی 1500–9500»)، نه تکرارِ درصد. */
export function absOnlyQuoteFa(engineOut, a) {
  const p = printedOf(a.test, a, engineOut);
  if (p.derived_from !== "percent_of_wbc") return null;
  return `شمارشِ مطلقِ ${faName(a.test)} ${a.value}${a.range ? ` (طبیعی ${a.range})` : ""}`;
}

/** بلوکِ «موارد دیگر»: یافته‌های تکمیلی به‌صورتِ یک پاراگرافِ جدا، بی‌برچسبِ شماره‌دار و بی‌ادعای فوریت. */
export function supplementaryParagraph(patterns) {
  const items = (patterns?.findings ?? [])
    .filter((f) => f.supplementary && f.must_say)
    .map((f) => String(f.must_say).trim())
    .map((s) => (/[.؟!]$/.test(s) ? s : `${s}.`));
  if (!items.length) return "";
  return `موارد دیگرِ این برگه (جدا از دستور اورژانسیِ بالا): ${items.join(" ")}`;
}

/**
 * پاراگرافِ مواردِ در محدوده. فقط ردیف‌های graded و غیرغیرطبیعی (N4: ungraded و unit_unknown هرگز «طبیعی» نمی‌شوند)،
 * با عددِ چاپ‌شدهٔ برگه (N5) و نامِ فارسی (N8: کلیدی که نامِ فارسی ندارد نمی‌آید).
 */
export function normalRangeParagraph(engineOut, { max = 20 } = {}) {
  const seen = new Set();
  const items = [];
  for (const g of engineOut?.graded ?? []) {
    if (g.abnormal) continue;
    const name = faName(g.test);
    // کلیدِ خامِ زیرخط‌دار (NEUT_PCT) نام نیست (N8)؛ اختصارِ چاپ‌شدهٔ برگه (MCH، MCHC، HDL) نامِ درست است.
    if (!name || (name === g.test && /_/.test(g.test)) || seen.has(name)) continue;
    const p = printedOf(g.test, g, engineOut);
    const pv = p.printed ? p.printed.value : g.value;
    if (pv == null || pv === "") continue;
    const shown = p.printed?.unit === "%" ? `٪${pv}` : p.printed?.unit ? `${pv} ${p.printed.unit}` : `${pv}`;
    seen.add(name);
    items.push(`${name} ${shown}`);
  }
  if (!items.length) return "";
  const age = engineOut?.age;
  const who = age == null ? "" : age < NEONATE_YEARS ? "برای سنِ نوزاد " : age < CHILD_YEARS ? "برای سنِ کودک " : "";
  const head = items.slice(0, max);
  const rest = items.length - head.length;
  return `مواردی که ${who}در محدودهٔ طبیعی‌اند: ${head.join("، ")}${rest > 0 ? ` و ${rest} مورد دیگر` : ""}.`;
}

/** دو بلوکِ پایانی با \n\n؛ رشتهٔ خالی اگر چیزی نبود. */
export function engineClosingBlocks(engineOut, patterns) {
  return [supplementaryParagraph(patterns), normalRangeParagraph(engineOut)].filter(Boolean).join("\n\n");
}
