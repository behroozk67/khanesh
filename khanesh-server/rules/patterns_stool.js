// ============================================================
// P117 — قاعده‌های برگهٔ مدفوع (مشاهده‌های توصیفی)
//
// کانال: adapter ردیف‌های Consistency / Undigested Food / Mucus / Blood / Ova of Parasites / Protozoa Cyst / Color
// را به‌عنوان «مشاهدهٔ چاپ‌شده» ثبت می‌کند (e.ungraded.STOOL_*، بی‌بازه). این فایل معنای بالینیِ همان متن را
// می‌گوید — بی‌ساختنِ هیچ عدد یا بازه‌ای.
//
// منابع (ثبت‌شده در rules/guidelines.js):
//   • WHO_LAB_STOOL_2003 — Manual of basic techniques for a health laboratory, 2nd ed. (2003): معاینهٔ ماکروسکوپی
//     (colour/consistency/blood/mucus/food remnants) و گزارشِ تخم/کیست در گسترهٔ میکروسکوپی.
//   • CDC_DPDX_STOOL — DPDx: تخمِ انگل و کیستِ پروتوزوآ؛ «بقایای غذاییِ هضم‌نشده» آرتیفکت است، نه انگل.
//   • STOOL_TESTS_REVIEW_2019 — مرورِ آزمون‌های مدفوع در بیماری‌های گوارشی: رنگِ طبیعی قهوه‌ای؛ گچی/سفید در
//     انسدادِ صفراوی؛ سیاه/قیری در خونریزیِ بالای گوارش (یا آهن/بیسموت)؛ سرخ در خونریزیِ پایینِ گوارش.
//
// ⚠️ قاعده‌های این فایل تشخیص نمی‌دهند؛ یافته را با کلمهٔ خودِ برگه نقل می‌کنند و کارِ بعدی را به پزشک می‌سپارند.
// ============================================================
import {
  STOOL_BLACK_RE, STOOL_CLAY_RE, STOOL_RED_RE, STOOL_NEGATIVE_RE, stoolGrade, stoolConsistency,
} from "./stool.js";
import { RULES_HEMATOLOGY } from "./patterns_hematology.js";

const URG = { routine: "routine", this_week: "this_week" };
const ACTION = {
  routine: "در ویزیتِ بعدی با پزشک در میان بگذارید.",
  this_week: "در روزهای آینده (بهتر است این هفته) با پزشک مراجعه کنید.",
};

const val = (e, key) => {
  const v = e.ungraded?.[key]?.value;
  const s = v == null ? "" : String(v).trim();
  return s || null;
};
const hasReader = (e, key) => val(e, key) != null;
const isNeg = (e, key) => {
  const v = val(e, key);
  return v != null && STOOL_NEGATIVE_RE.test(v);
};
const lineOf = (e, key, fa) => `${fa} روی برگه «${val(e, key)}» ثبت شده است`;

// «Backgroundِ کم‌خونیِ میکروسیتیک» را همان قاعده صاحب است (melena_microcytic_anemia) — هم‌پوشانی ممنوع (N20).
const anemiaOwnsMelena = (e) => RULES_HEMATOLOGY.some((r) => r.id === "melena_microcytic_anemia" && r.match(e));

const SOURCES = ["WHO_LAB_STOOL_2003", "CDC_DPDX_STOOL", "STOOL_TESTS_REVIEW_2019"];

export const RULES_STOOL = [
  {
    // مدفوعِ سیاه/قیری: خونریزیِ بالای گوارش یا آهن/بیسموت (WHO 2003؛ مرور ۲۰۱۹). بی‌آستانهٔ Hb؛
    //   اگر کم‌خونیِ میکروسیتیک هم باشد، melena_microcytic_anemia صاحبِ یافته است (N20).
    id: "stool_melena",
    match: (e) => {
      const c = val(e, "STOOL_COLOR");
      return !!c && STOOL_BLACK_RE.test(c) && !anemiaOwnsMelena(e);
    },
    build: (e) => {
      // ⚠️ رشته‌های داخلِ must_say باید فارسی باشند؛ کلیدِ موتور بیرون از آن ساخته می‌شود (M38).
      const said =
        `${lineOf(e, "STOOL_COLOR", "رنگِ مدفوع")}. ` +
        "مدفوعِ سیاه و قیری‌شکل می‌تواند نشانهٔ خونریزی در بخشِ بالاییِ دستگاهِ گوارش باشد؛ در خونریزیِ دستگاهِ گوارش، هموگلوبینِ اول ممکن است مقدارِ خونِ ازدست‌رفته را کمتر از واقع نشان دهد. " +
        "قرصِ آهن و داروهای حاویِ بیسموت (و برخی غذاها) هم مدفوع را سیاه می‌کنند؛ اگر چنین چیزی مصرف می‌کنید به پزشک بگویید.";
      return {
      pattern: "stool_melena",
      urgency: URG.this_week,
      explains: ["STOOL_COLOR"],
      headline: "مدفوعِ سیاه (قیری‌شکل) روی برگه ثبت شده است",
      must_say: said,
      action: ACTION.this_week,
      suggest: ["مشاوره با متخصص گوارش", "آزمایش خون مخفی در مدفوع", "شمارش کامل خون (CBC)"],
      warnings: ["اگر ضعفِ شدید، سرگیجه، غش، استفراغِ خونی یا مدفوعِ سیاهِ تکرارشونده دارید، منتظر نمانید و همین حالا به اورژانس بروید."],
      sources: SOURCES,
      };
    },
  },
  {
    // گچی/سفید/بی‌رنگ: انسدادِ صفراوی (مرور ۲۰۱۹؛ WHO 2003: pale/white = obstructive jaundice).
    id: "stool_clay_colored",
    match: (e) => {
      const c = val(e, "STOOL_COLOR");
      return !!c && STOOL_CLAY_RE.test(c);
    },
    build: (e) => {
      const parts = [
        `${lineOf(e, "STOOL_COLOR", "رنگِ مدفوع")}. ` +
        "مدفوعِ گچی، سفید یا بی‌رنگ می‌تواند نشانهٔ کم‌رسیدنِ صفرا به روده باشد (انسدادِ مجاریِ صفراوی)؛ رنگِ قهوه‌ایِ مدفوع از صفرا می‌آید.",
      ];
      // اگر ALP/بیلی‌روبین روی همان برگه باشد، فقط *نقلِ عدد* می‌شود (بدونِ تفسیرِ تازه).
      const alp = e.graded.find((g) => g.test === "ALP");
      const bili = e.graded.find((g) => g.test === "BILI_T");
      if (alp) parts.push(`روی همین برگه ALP ${alp.value} است (حد طبیعی ${alp.range}).`);
      if (bili) parts.push(`بیلی‌روبینِ تام ${bili.value} است (حد طبیعی ${bili.range}).`);
      return {
        pattern: "stool_clay_colored",
        urgency: URG.this_week,
        explains: ["STOOL_COLOR"],
        headline: "مدفوعِ گچی/سفید — باید از نظرِ صفرا بررسی شود",
        must_say: parts.join(" "),
        action: ACTION.this_week,
        suggest: ["بیلی‌روبین تام و مستقیم", "آلکالین فسفاتاز (ALP)", "سونوگرافی کبد و مجاری صفراوی"],
        warnings: ["اگر زردیِ پوست یا چشم، خارشِ شدید یا تب دارید، همین روزها به پزشک مراجعه کنید."],
        sources: SOURCES,
      };
    },
  },
  {
    // خونِ سرخ/آشکار: خونریزیِ پایینِ گوارش (مرور ۲۰۱۹). بی‌تکرار با gi_stool_result: آن یکی آزمایش است، این مشاهده.
    id: "stool_fresh_blood",
    match: (e) => {
      const c = val(e, "STOOL_COLOR");
      const b = val(e, "STOOL_BLOOD");
      return (!!c && STOOL_RED_RE.test(c)) || (!!b && !STOOL_NEGATIVE_RE.test(b));
    },
    build: (e) => {
      const bits = [];
      if (hasReader(e, "STOOL_COLOR") && STOOL_RED_RE.test(val(e, "STOOL_COLOR"))) bits.push(lineOf(e, "STOOL_COLOR", "رنگِ مدفوع"));
      if (hasReader(e, "STOOL_BLOOD") && !STOOL_NEGATIVE_RE.test(val(e, "STOOL_BLOOD"))) bits.push(lineOf(e, "STOOL_BLOOD", "خونِ آشکارِ مدفوع"));
      return {
        pattern: "stool_fresh_blood",
        urgency: URG.this_week,
        explains: [...(hasReader(e, "STOOL_COLOR") ? ["STOOL_COLOR"] : []), ...(hasReader(e, "STOOL_BLOOD") ? ["STOOL_BLOOD"] : [])],
        headline: "خونِ سرخ یا آشکار در مدفوع ثبت شده است",
        must_say:
          `${bits.join(" و ")}. ` +
          "خونِ سرخ معمولاً از بخشِ پایینیِ دستگاهِ گوارش (رودهٔ بزرگ و راست‌روده) می‌آید و بررسیِ منبعِ خونریزی لازم است؛ بواسیر و شقاق هم همین تصویر را می‌سازند، ولی تشخیص را پزشک می‌گذارد.",
        action: ACTION.this_week,
        suggest: ["مشاوره با متخصص گوارش", "کولونوسکوپی", "شمارش کامل خون (CBC)"],
        warnings: ["اگر خونریزیِ فعال، مقدارِ زیادِ خون، ضعف یا سرگیجه دارید، همین حالا به اورژانس بروید."],
        sources: SOURCES,
      };
    },
  },
  {
    // تخمِ انگل یا کیستِ پروتوزوآ در گزارشِ میکروسکوپی (WHO 2003؛ CDC DPDx).
    id: "stool_parasite_found",
    match: (e) => ["STOOL_OVA", "STOOL_CYST"].some((k) => hasReader(e, k) && !isNeg(e, k)),
    build: (e) => {
      const bits = [];
      if (hasReader(e, "STOOL_OVA") && !isNeg(e, "STOOL_OVA")) bits.push(lineOf(e, "STOOL_OVA", "تخمِ انگل"));
      if (hasReader(e, "STOOL_CYST") && !isNeg(e, "STOOL_CYST")) bits.push(lineOf(e, "STOOL_CYST", "کیستِ پروتوزوآ"));
      return {
        pattern: "stool_parasite_found",
        urgency: URG.this_week,
        explains: [...(hasReader(e, "STOOL_OVA") ? ["STOOL_OVA"] : []), ...(hasReader(e, "STOOL_CYST") ? ["STOOL_CYST"] : [])],
        headline: "در گزارشِ مدفوع، تخمِ انگل یا کیستِ پروتوزوآ گزارش شده است",
        must_say:
          `${bits.join(" و ")}. ` +
          "یافتنِ تخمِ انگل یا کیست در مدفوع یعنی یکی از این انگل‌ها در رودهٔ شما هست؛ پزشک بر اساسِ نوعِ آن، درمانِ داروییِ مناسب را انتخاب می‌کند و برای بعضی انگل‌ها تکرارِ آزمایشِ مدفوع لازم است. " +
          "«بقایای غذاییِ هضم‌نشده» و سلول‌های گیاهی در میکروسکوپ گاهی شبیهِ تخمِ انگل دیده می‌شوند؛ تشخیصِ قطعی کارِ آزمایشگاه و پزشک است.",
        action: ACTION.this_week,
        suggest: ["مشاوره با پزشک (درمانِ ضدانگل)", "تکرار آزمایش مدفوع (۳ نمونه)"],
        sources: SOURCES,
      };
    },
  },
  {
    // مخاط در مدفوع: تحریک/التهابِ مخاطِ روده؛ اگر همراهِ خون باشد، همان یافتهٔ خون صاحبِ کار است.
    id: "stool_mucus_present",
    match: (e) => {
      const m = val(e, "STOOL_MUCUS");
      const grade = m ? stoolGrade(m) : null;
      const blood = (val(e, "STOOL_BLOOD") && !STOOL_NEGATIVE_RE.test(val(e, "STOOL_BLOOD"))) ||
        (val(e, "STOOL_COLOR") && STOOL_RED_RE.test(val(e, "STOOL_COLOR")));
      return !!m && !blood && (grade == null || grade >= 1);
    },
    build: (e) => {
      const said =
        `${lineOf(e, "STOOL_MUCUS", "مخاطِ مدفوع")}. ` +
        "مقدارِ کمِ مخاط در مدفوع طبیعی است؛ مقدارِ زیاد یا همراه با تغییرِ اجابت‌مزاج می‌تواند نشانهٔ تحریک یا التهابِ مخاطِ روده باشد. اگر همراهِ خون، تب یا کاهشِ وزن است، زودتر بررسی می‌شود.";
      return {
        pattern: "stool_mucus_present",
        urgency: URG.routine,
        explains: ["STOOL_MUCUS"],
        headline: "مخاط در مدفوع گزارش شده است",
        must_say: said,
        action: ACTION.routine,
        suggest: ["کالپروتکتینِ مدفوع"],
        sources: SOURCES,
      };
    },
  },
  {
    // بقایای غذاییِ هضم‌نشدهٔ قابلِ توجه: می‌تواند سوءجذب/کم‌کاریِ پانکراس را مطرح کند (WHO 2003؛ آرتیفکت در DPDx).
    id: "stool_undigested_food",
    match: (e) => {
      const v = val(e, "STOOL_UNDIGESTED");
      if (!v) return false;
      const grade = stoolGrade(v);
      return grade != null && grade >= 2;   // «Few/کم» یافته نیست (تنها «متوسط/زیاد/+++» خوانده می‌شود)
    },
    build: (e) => {
      const said =
        `${lineOf(e, "STOOL_UNDIGESTED", "بقایای غذاییِ هضم‌نشده")}. ` +
        "مقدارِ کمِ بقایای گیاهی در مدفوع طبیعی است و به‌تنهایی بیماری محسوب نمی‌شود؛ مقدارِ زیادِ مکرر می‌تواند نشانهٔ هضمِ ناقص یا سوءجذب باشد و همراهِ کاهشِ وزن یا اسهالِ چرب معنا پیدا می‌کند.";
      return {
        pattern: "stool_undigested_food",
        urgency: URG.routine,
        explains: ["STOOL_UNDIGESTED"],
        headline: "بقایای غذاییِ هضم‌نشده در مدفوع",
        must_say: said,
        action: ACTION.routine,
        suggest: ["آزمایش چربیِ مدفوع", "مشاوره با متخصص گوارش"],
        sources: SOURCES,
      };
    },
  },
  {
    // قوامِ آبکی/شل — بی‌عددِ تازه؛ فقط هشدارِ کم‌آبی و پیگیری.
    id: "stool_loose_consistency",
    match: (e) => {
      const c = val(e, "STOOL_CONSISTENCY");
      const kind = c ? stoolConsistency(c) : null;
      return kind === "watery";
    },
    build: (e) => {
      const said =
        `${lineOf(e, "STOOL_CONSISTENCY", "قوامِ مدفوع")}. ` +
        "مدفوعِ آبکی یعنی گذرِ سریعِ غذا از روده و کم‌آب‌شدنِ بدن را ممکن می‌کند؛ مایعات و املاح را جبران کنید و اگر بیش از چند روز طول کشید یا با تب/خون همراه بود، با پزشک در میان بگذارید.";
      return {
        pattern: "stool_loose_consistency",
        urgency: URG.routine,
        explains: ["STOOL_CONSISTENCY"],
        headline: "قوامِ مدفوع آبکی/شل گزارش شده است",
        must_say: said,
        action: ACTION.routine,
        sources: SOURCES,
      };
    },
  },
];
