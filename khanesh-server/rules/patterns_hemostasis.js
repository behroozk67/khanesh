// ════════════════════════════════════════════════════════════
// specs/010 — هموستاز: فعالیتِ فاکتور ۸/۹، مهارکننده (Bethesda)، فون‌ویلبراند (P61)
// ════════════════════════════════════════════════════════════
// ⚠️ این مقدارها نمره نمی‌گیرند (بازهٔ مرجعی در refs.js ندارند) و از کانالِ جدای e.hemostasis می‌آیند (research R2).
//    تا پیش از این فایل، برگهٔ فقط-فاکتور هیچ یافته‌ای نداشت و «طبیعی» یا مسیرِ قدیمِ بی‌موتور می‌گرفت (N2، P61).
// ⚠️ هیچ یافته‌ای نامِ بیماری را تشخیصِ بیمار نمی‌گوید (FR-010): «الگو، نیاز به ارزیابیِ هماتولوژیست».
// ⚠️ هیچ مسیرِ اورژانسی در این فایل نیست (P61 پرسشِ 61-c): عدد شدتِ اختلال را می‌گوید، نه خونریزیِ جاری را.
// ⚠️ آستانهٔ عددیِ تأییدنشده (۰٫۵ BU، نسبتِ ۰٫۶) اینجا نیست (FR-021، P61 پرسشِ 61-d): نقل می‌شوند، حکم نمی‌گیرند.
import { factorBand, vwfRatio } from "./patterns_utils.js";
import { printedVerdict } from "./units.js";
import { faName } from "./names.js";

function actionFor(urgency, { week, routine }) {
  return urgency === "this_week" ? week : routine;
}

const FACTOR_FA = { FVIII: "فاکتور ۸", FIX: "فاکتور ۹" };
const LOW_BANDS = new Set(["severe", "moderate", "mild", "reduced"]);
const WEEK_BANDS = new Set(["severe", "moderate"]);
const quote = (it) => `${it.raw}${it.unit ? ` ${it.unit}` : ""}`;

// همان دو هشدارِ coagulation_abnormal — وقتی این یافته مالکِ APTT است، باید همراهش بیاید (M155: فهرستِ هشدارها هم منتقل می‌شود).
const COAG_WARNINGS = [
  "تا مشخص شدن علت، آسپرین یا مسکن‌های ضدالتهاب مصرف نکنید.",
  "اگر خونریزی غیرعادی یا کبودی بی‌دلیل دیدید، همان روز به پزشک مراجعه کنید.",
];

// FVIII:Cِ برگهٔ فون‌ویلبراند مالِ vwf_panel است (I2، FR-023): بی‌ردهٔ هموفیلی نقل می‌شود.
const vwfPresent = (e) => !!(e.hemostasis?.VWF_AG || e.hemostasis?.VWF_ACT);
/** کلیدهای فاکتوری که factor_activity مالکِ آن‌هاست. */
function ownedFactorKeys(e) {
  const h = e.hemostasis ?? {};
  const keys = [];
  if (h.FVIII && !vwfPanelFires(e)) keys.push("FVIII");
  if (h.FIX) keys.push("FIX");
  return keys;
}

function factorSentence(e, key) {
  const it = e.hemostasis[key];
  const name = `فعالیتِ ${FACTOR_FA[key]}`;
  const band = factorBand(it, e.age, e.sex);
  const q = quote(it);
  switch (band) {
    case "severe": return { band, text: `${name} شما ${q} است؛ این عدد در ردهٔ «شدید» (کمتر از ۱٪) قرار می‌گیرد.` };
    case "moderate": return { band, text: `${name} شما ${q} است؛ این عدد در ردهٔ «متوسط» (۱ تا ۵٪) قرار می‌گیرد.` };
    case "mild": return { band, text: `${name} شما ${q} است؛ این عدد در ردهٔ «خفیف» (بیش از ۵ تا ۳۰٪) قرار می‌گیرد.` };
    case "reduced": return { band, text: `${name} شما ${q} است؛ از محدودهٔ طبیعیِ چاپ‌شده روی برگه (${it.reference}) کمتر است، ولی بالاتر از ۳۰٪ و بیرون از رده‌های شدت است.` };
    case "inRange": return { band, text: `${name} شما ${q} است و در محدودهٔ چاپ‌شده روی برگه (${it.reference}) قرار دارد.` };
    case "notJudged": return { band, text: `${name} شما ${q} است؛ این عدد بالاتر از ۳۰٪ است، ولی برگه محدودهٔ طبیعی‌اش را چاپ نکرده، پس از روی این برگه نمی‌شود گفت طبیعی است یا کمی پایین.` };
    case "paediatric": return { band, text: `${name} شما ${q} است. در کودکان، به‌ویژه نوزادان، مقدارِ طبیعیِ فاکتورهای انعقادی با سن تغییر می‌کند و این عدد باید با جدولِ مخصوصِ همان سن سنجیده شود؛ رده‌های بزرگسال برای این سن به کار نمی‌روند.` };
    default: return { band, text: `${name} روی برگه «${it.raw}» نوشته شده، ولی واحدش چاپ نشده یا شناخته نشد؛ بدونِ واحد نمی‌شود آن را رده‌بندی کرد.` };
  }
}

function inhibitorSentence(e) {
  const it = e.hemostasis?.FVIII_INHIB;
  if (!it) return null;
  const q = it.value != null ? quote(it) : it.raw;
  if (it.qual === "positive") return { state: "positive", text: `آزمایشِ مهارکننده (Bethesda) «${q}» و مثبت گزارش شده است؛ یعنی در خون ماده‌ای هست که فعالیتِ فاکتورِ انعقادی را خنثی می‌کند. این یافته را باید هماتولوژیست ببیند.` };
  if (it.qual === "negative") return { state: "negative", text: `آزمایشِ مهارکننده (Bethesda) «${q}» و منفی گزارش شده است.` };
  return { state: "unknown", text: `آزمایشِ مهارکننده (Bethesda) «${q}» گزارش شده، ولی برگه محدودهٔ مرجعش را چاپ نکرده یا جواب روشن نیست؛ از روی این برگه نمی‌شود گفت مثبت است یا منفی، و تفسیرش با هماتولوژیست است.` };
}

/** آیا factor_activity مالکِ APTT است؟ فقط وقتی واقعاً فعال است، فاکتوری پایین است، و APTT تنها شاخصِ غیرطبیعیِ انعقاد است (R8). */
export function factorOwnsAptt(e) {
  if (!factorActivityFires(e)) return false;
  const g = (k) => e.graded?.find((x) => x.test === k);
  const aptt = g("APTT");
  if (!(aptt?.abnormal && aptt.dir === "high")) return false;
  const pt = g("PT"), inr = g("INR"), fib = g("FIB");
  if ((pt?.abnormal && pt.dir === "high") || (inr?.abnormal && inr.dir === "high") || (fib?.abnormal && fib.dir === "low")) return false;
  return ownedFactorKeys(e).some((k) => LOW_BANDS.has(factorBand(e.hemostasis[k], e.age, e.sex)));
}

export const RULES_HEMOSTASIS = [
  {
    id: "factor_activity",
    match: (e) => ownedFactorKeys(e).length > 0,
    build: (e) => {
      const keys = ownedFactorKeys(e);
      const parts = keys.map((k) => factorSentence(e, k));
      const bands = parts.map((p) => p.band);
      const anyLow = bands.some((b) => LOW_BANDS.has(b));
      const allPaed = bands.every((b) => b === "paediatric");
      const lines = parts.map((p) => p.text);
      if (anyLow) {
        lines.push("فاکتورهای ۸ و ۹ پروتئین‌هایی هستند که برای لخته‌شدنِ خون لازم‌اند. کم‌بودنِ فعالیتشان الگویی است که یک هماتولوژیست (متخصصِ خون) باید بررسی کند: آزمایش را تکرار کند، علتِ آن را مشخص کند و بگوید چه احتیاط‌هایی لازم است.");
        if (e.age == null) lines.push("سنِ بیمار روی برگه نیامده بود؛ این رده‌ها برای بزرگسال است.");
      }

      // APTT — سه‌حالته (N21، N4). مالکیت فقط وقتی APTT تنها شاخصِ غیرطبیعی است (factorOwnsAptt)؛ وگرنه coagulation_abnormal توضیحش می‌دهد.
      const aptt = e.graded.find((g) => g.test === "APTT");
      const apttFa = faName("APTT");
      const owns = factorOwnsAptt(e);
      const measuredNotLow = bands.length > 0 && bands.every((b) => b === "inRange");
      if (aptt?.abnormal && aptt.dir === "high") {
        if (owns) lines.push(`${apttFa} شما ${aptt.value} ثانیه و طولانی‌تر از حدِ طبیعی (${aptt.range}) است، که با کم‌بودنِ فعالیتِ فاکتور هم‌خوان است.`);
        else if (measuredNotLow) lines.push(`فاکتورهای اندازه‌گیری‌شده پایین نیستند، پس طولانی‌بودنِ ${apttFa} علتِ دیگری دارد که پزشک باید بررسی کند.`);
        // بالای ۳۰٪ ولی بی‌محدودهٔ چاپ‌شده: «پایین نیست» ادعای بیش از داده است؛ فقط همان که می‌دانیم (N21، نه اطمینانِ کاذب).
        else if (bands.length > 0 && bands.every((b) => b === "inRange" || b === "notJudged"))
          lines.push(`فعالیتِ فاکتورهای اندازه‌گیری‌شده زیرِ ۳۰٪ نیست؛ اینکه طولانی‌بودنِ ${apttFa} را توضیح می‌دهد یا نه، با پزشک است.`);
      } else if (aptt?.abnormal && aptt.dir === "low") {
        lines.push(`${apttFa} شما ${aptt.value} ثانیه و کوتاه‌تر از حدِ طبیعی (${aptt.range}) است.`);
      } else if (aptt) {
        if (anyLow) lines.push(`${apttFa} شما ${aptt.value} ثانیه و در محدودهٔ طبیعی است.`);
      } else if (anyLow) {
        lines.push(`${apttFa} (زمانِ ترومبوپلاستینِ نسبی) روی این برگه نیست.`);
      }

      const inh = inhibitorSentence(e);
      if (inh) lines.push(inh.text);

      const week = bands.some((b) => WEEK_BANDS.has(b)) || inh?.state === "positive" || inh?.state === "unknown";
      const urgency = week ? "this_week" : "routine";
      // کودک/نوزاد: جمله توضیح می‌دهد، دستور نمی‌دهد — بی action، کفِ نوزادی (applyNeonatalFloor) آن را اورژانس نمی‌کند (R12).
      const action = allPaed && !inh
        ? ""
        : actionFor(urgency, {
          week: "این هفته با پزشک یا هماتولوژیست وقت بگیرید. حتماً بگویید چه داروهایی مصرف می‌کنید.",
          routine: "در نوبتِ عادی با پزشک مطرح کنید. حتماً بگویید چه داروهایی مصرف می‌کنید.",
        });
      const suggest = [];
      if (anyLow && !aptt) suggest.push("aPTT");
      if (anyLow) suggest.push("تکرار آزمایش انعقاد");
      return {
        pattern: "factor_activity",
        urgency,
        headline: anyLow
          ? "فعالیتِ فاکتورِ انعقادیِ شما کمتر از حدِ معمول است"
          : bands.every((b) => b === "inRange")
            ? "فعالیتِ فاکتورِ انعقادیِ شما در محدودهٔ برگه است"
            : "فعالیتِ فاکتورِ انعقادیِ شما اندازه‌گیری شده است",
        must_say: lines.join(" "),
        action,
        suggest,
        warnings: anyLow || inh?.state === "positive" ? COAG_WARNINGS.slice() : [],
      };
    },
  },
  {
    id: "factor_inhibitor",
    match: (e) => !!e.hemostasis?.FVIII_INHIB && !factorActivityFires(e),
    build: (e) => {
      const inh = inhibitorSentence(e);
      const urgency = inh.state === "negative" ? "routine" : "this_week";
      return {
        pattern: "factor_inhibitor",
        urgency,
        headline: inh.state === "positive" ? "آزمایشِ مهارکنندهٔ فاکتورِ انعقادیِ شما مثبت است" : "آزمایشِ مهارکنندهٔ فاکتورِ انعقادی",
        must_say: inh.text,
        action: actionFor(urgency, {
          week: "این هفته با پزشک یا هماتولوژیست وقت بگیرید.",
          routine: "در نوبتِ عادی با پزشک مطرح کنید.",
        }),
        suggest: [],
        warnings: inh.state === "positive" ? COAG_WARNINGS.slice() : [],
      };
    },
  },
  {
    id: "vwf_panel",
    match: (e) => vwfPresent(e),
    build: (e) => {
      const h = e.hemostasis;
      const NAMES = { VWF_AG: "آنتی‌ژنِ فون‌ویلبراند (vWF:Ag)", VWF_ACT: "فعالیتِ فون‌ویلبراند (vWF:RCo)", FVIII: "فعالیتِ فاکتور ۸ (FVIII:C)" };
      const lines = ["فاکتور فون‌ویلبراند پروتئینی است که به چسبیدنِ پلاکت‌ها و نگه‌داشتنِ فاکتور ۸ در خون کمک می‌کند."];
      let below = false, unjudged = false;
      for (const k of ["VWF_AG", "VWF_ACT", "FVIII"]) {
        const it = h[k];
        if (!it) continue;
        const name = NAMES[k];
        if (it.value == null || it.unitState !== "ok") {
          unjudged = true;
          lines.push(`${name} روی برگه «${it.raw}» نوشته شده، ولی واحدش چاپ نشده یا شناخته نشد؛ بدونِ واحد نمی‌شود آن را سنجید.`);
          continue;
        }
        const pv = it.reference ? printedVerdict(it.reference, it.value, e.sex) : null;
        if (pv === "below") { below = true; lines.push(`${name} شما ${quote(it)} و کمتر از محدودهٔ چاپ‌شده روی برگه (${it.reference}) است.`); }
        else if (pv === "above") lines.push(`${name} شما ${quote(it)} و بالاتر از محدودهٔ چاپ‌شده روی برگه (${it.reference}) است.`);
        else if (pv === "within") lines.push(`${name} شما ${quote(it)} و در محدودهٔ چاپ‌شده روی برگه (${it.reference}) است.`);
        else { unjudged = true; lines.push(`${name} شما ${quote(it)} است؛ برگه محدودهٔ طبیعی‌اش را چاپ نکرده، پس از روی این برگه نمی‌شود گفت طبیعی است یا پایین.`); }
      }
      const suggest = [];
      const { ratio, reason } = vwfRatio(h);
      if (ratio != null) {
        lines.push(`نسبتِ فعالیت به آنتی‌ژن (vWF:RCo به vWF:Ag) ${ratio} است.`);
      } else if (reason === "partner_missing") {
        const missing = h.VWF_AG ? "vWF:RCo" : "vWF:Ag";
        lines.push(`${missing === "vWF:RCo" ? NAMES.VWF_ACT : NAMES.VWF_AG} روی برگهٔ شما نیست؛ این دو معمولاً با هم اندازه‌گیری و با هم تفسیر می‌شوند.`);
        suggest.push(missing);
      }
      lines.push("تفسیرِ الگوی کلیِ این آزمایش‌ها با هماتولوژیست است.");
      const urgency = below || unjudged ? "this_week" : "routine";
      return {
        pattern: "vwf_panel",
        urgency,
        headline: below
          ? "سطحِ فاکتور فون‌ویلبراندِ شما کمتر از محدودهٔ برگه است"
          : unjudged
            ? "آزمایشِ فاکتور فون‌ویلبراندِ شما نیاز به تفسیرِ هماتولوژیست دارد"
            : "آزمایشِ فاکتور فون‌ویلبراندِ شما در محدودهٔ برگه است",
        must_say: lines.join(" "),
        action: actionFor(urgency, {
          week: "این هفته با پزشک یا هماتولوژیست وقت بگیرید.",
          routine: "در نوبتِ عادی با پزشک مطرح کنید.",
        }),
        suggest,
        warnings: below ? COAG_WARNINGS.slice() : [],
      };
    },
  },
];

// «آیا آن قاعده واقعاً فعال است» — نه بازگوییِ شرطش (M91e، thalOwnerFires).
function ruleById(id) { return RULES_HEMOSTASIS.find((r) => r.id === id); }
function factorActivityFires(e) { return !!ruleById("factor_activity").match(e); }
function vwfPanelFires(e) { return !!ruleById("vwf_panel").match(e); }
