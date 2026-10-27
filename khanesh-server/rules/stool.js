// ============================================================
// P117 — مشاهده‌های توصیفیِ برگهٔ مدفوع (رنگ، قوام، بقایای غذایی، مخاط، خونِ آشکار، تخمِ انگل، کیستِ پروتوزوآ)
//
// پیش‌تر این ردیف‌ها «تست‌هایی بی‌محدودهٔ مرجع» یا «تفسیرنشده» شمرده می‌شدند. یک برگهٔ واقعی نشان داد این
// برچسب برای مشاهدهٔ ظاهریِ نمونه غلط است: رنگِ مدفوع عدد نیست که با بازه سنجیده شود، ولی «سیاه/قیری» و
// «گچی» و «سرخ» معنای بالینیِ روشنی دارند (منابع پایین).
//
// قواعدِ این فایل هیچ آستانهٔ عددیِ تازه‌ای نمی‌سازند؛ فقط متنِ چاپ‌شدهٔ برگه را به فهرستِ بسته می‌برند
// (N6: مقدارِ بیرون از فهرست، «نامعلوم» می‌ماند — نه حدس).
//
// منابع:
//   • WHO. Manual of basic techniques for a health laboratory, 2nd ed. Geneva: WHO; 2003 — معاینهٔ ماکروسکوپیِ
//     مدفوع: colour, consistency, blood, mucus, food remnants. (WHO_LAB_STOOL_2003)
//   • CDC DPDx — Stool Specimens / Artifacts: تخمِ انگل و کیستِ پروتوزوآ در گسترهٔ مستقیم و تغلیظی؛
//     «بقایای غذاییِ هضم‌نشده» آرتیفکت است نه انگل. (CDC_DPDX_STOOL)
//   • Review: stool tests in diagnosis/follow-up of GI disorders (2019) — رنگِ طبیعی tawny/قهوه‌ای؛ گچی/سفید در
//     انسدادِ صفراوی؛ مدفوعِ سیاه و قیری در خونریزیِ بالای گوارش (بیش از ۱۰۰ میلی‌لیتر) و نیز آهن/بیسموت؛
//     سرخ = خونریزیِ پایینِ گوارش. (STOOL_TESTS_REVIEW_2019)
// ============================================================

/** فهرستِ بستهٔ رنگ — «Dark brown» عمداً سیاه نیست (N6). */
export const STOOL_BLACK_RE = /^(black|blackish|tarry|tar[\s-]*like|melena|melaena|سیاه|سیاه‌رنگ|سیاه رنگ|قیری|قیرمانند|قیری‌شکل)$/i;
export const STOOL_CLAY_RE = /^(clay|clay[\s-]*colou?red|pale|pale[\s-]*yellow|putty|acholic|white|whitish|grey|gray|گچی|سفید|بی‌رنگ|بی رنگ|خاکستری روشن|زردِ روشن)$/i;
export const STOOL_RED_RE = /^(red|reddish|bloody|fresh[\s-]*blood|blood[\s-]*streaked|hematochezia|سرخ|سرخ‌رنگ|خونی|خون‌آلود|خون آلود)$/i;

/** «منفی»های رایج — برای تخم/کیست و بقایای غذایی. */
export const STOOL_NEGATIVE_RE = /^(negative|neg|nil|none|not[\s-]*seen|no[\s-]*ova|absent|ندارد|منفی|دیده نشد|مشاهده نشد)$/i;

/** درجهٔ شدتِ چاپی: Few/+/++/+++/Moderate/Many → ۱..۳ (بی‌درجه ⇒ null، نه صفر). */
export function stoolGrade(value) {
  const v = String(value ?? "").trim().replace(/\s+/g, " ");
  if (!v || STOOL_NEGATIVE_RE.test(v)) return 0;
  if (/^\+{3,}$/.test(v) || /^(many|abundant|large|زیاد|فراوان)$/i.test(v)) return 3;
  if (/^\+{2}$/.test(v) || /^(moderate|متوسط)$/i.test(v)) return 2;
  if (/^\+$/.test(v) || /^(few|occasional|کم|کمی|rare|trace|scanty|نادر|اثر)$/i.test(v)) return 1;
  return null;
}

/** قوام: watery|liquid|loose|soft|formed|hard (فهرستِ بسته). */
export const STOOL_CONSISTENCY_RE = {
  watery: /^(watery|liquid|fluid|rice[\s-]*water|آبکی|آب‌کی|شل|روان|مایع)$/i,
  loose: /^(loose|semi[\s-]*formed|semi[\s-]*liquid|soft|pasty|unformed|نرم|خمیری|نیمه‌شکل|نیمه شکل)$/i,
  formed: /^(formed|normal|well[\s-]*formed|شکل‌دار|شکل دار|طبیعی)$/i,
  hard: /^(hard|firm|scybalous|dry|سفت|خشک|سخت)$/i,
};
export function stoolConsistency(value) {
  const v = String(value ?? "").trim();
  for (const [kind, re] of Object.entries(STOOL_CONSISTENCY_RE)) if (re.test(v)) return kind;
  return null;
}

/** ردیف‌های این کانال — adapter با این مجموعه آن‌ها را از «تفسیرنشده‌ها» بیرون می‌برد. */
export const STOOL_OBS_KEYS = new Set([
  "STOOL_COLOR", "STOOL_CONSISTENCY", "STOOL_UNDIGESTED", "STOOL_MUCUS", "STOOL_BLOOD", "STOOL_OVA", "STOOL_CYST",
]);

/**
 * نامِ چاپی (پس از norm: بی‌فاصله/کوچک) → کلیدِ مشاهده. فهرستِ صریح؛ هیچ حدسِ فازی (N2).
 * «Blood» و «Mucus»ِ برهنه فقط روی شاهدی از مدفوع پذیرفته می‌شوند (N25).
 */
export const STOOL_FIELD_RULES = [
  ["STOOL_CONSISTENCY", /^(consistency|stoolconsistency|قوام|قواممدفوع)$/],
  ["STOOL_UNDIGESTED", /^(undigestedfood|undigestedfoods|undigestedfoodstuff|undigestedfoodparticles|undigestedfibers?|vegetablefibers?|foodremnants?|بقایایغذایی|هضمنشده)$/],
  ["STOOL_MUCUS", /^(mucus|mucous|mucusthreads?|mucousthreads?|مخاط|مخاطمدفوع)$/],
  ["STOOL_BLOOD", /^(grossblood|visibleblood|blood|stoolblood|fecalblood|faecalblood|خونآشکار|خون)$/],
  ["STOOL_OVA", /^(ova|ovaofparasites|ovaandparasites|ovaandparasite|parasiteova|parasitesova|ovaandcyst|تخمانگل)$/],
  ["STOOL_CYST", /^(protozoacyst|protozoacysts|protozoa|cysts?|parasitecysts?|کیست|کیستپروتوزوآ)$/],
];
/** کلیدِ مشاهدهٔ مدفوع برای یک نامِ چاپی (یا null). */
export function stoolFieldOf(normName) {
  const hit = STOOL_FIELD_RULES.find(([, re]) => re.test(normName));
  return hit ? hit[0] : null;
}

/** برچسبِ فارسی برای پیامِ «مشاهدهٔ چاپ‌شده» (names.js هم همین‌ها را دارد؛ این‌جا برای مصرفِ سمتِ سرور). */
export const STOOL_OBS_FA = {
  STOOL_COLOR: "رنگِ مدفوع",
  STOOL_CONSISTENCY: "قوامِ مدفوع",
  STOOL_UNDIGESTED: "بقایای غذاییِ هضم‌نشده",
  STOOL_MUCUS: "مخاطِ مدفوع",
  STOOL_BLOOD: "خونِ آشکار در مدفوع",
  STOOL_OVA: "تخمِ انگل در مدفوع",
  STOOL_CYST: "کیستِ پروتوزوآ در مدفوع",
};
