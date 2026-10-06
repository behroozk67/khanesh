// ============================================================
// patterns_coverage_gaps.js — ممیزیِ پوششِ ۲۰۲۶-۱۰-۰۳ (P67)
// ------------------------------------------------------------
// هر ردیفی که موتور می‌خواند ولی هیچ قاعده‌ای نمی‌دیدش — طبقِ N1/N18 یا «طبیعی» می‌شد یا «توضیح نداریم».
// ⚠️ بازه‌ها و آستانه‌ها از منابعِ بازِ آزمایشگاهی/گایدلاین‌اند (ذکرشده کنارِ هر قاعده) و در MEDICAL_RULES.md (P67)
//    منتظرِ بازبینِ انسانی‌اند. هیچ‌کدام emergency نیست؛ سخت‌ترین سطح «soon» (همین امروز) برای کشتِ خونِ مثبت و BHB ≥ ۳ است.
// ⚠️ متنِ همهٔ قاعده‌ها حکم نمی‌دهد؛ «مطرح می‌کند». و برای هر ردیف سه‌حالت: بالا / پایین-یا-منفی / نامفهوم.
// ============================================================
import { bandNeutDiscordance, serologyReactive, urinePositive, urineCellCount, urineCellState, castAxis, qualState, qualVerdict, ungradedFa } from "./patterns_utils.js";
import { utiFires, bacteriuriaFires, bacteriaSignificant } from "./patterns_nephrology.js";
import { RULES_BIOCHEM } from "./patterns_biochem.js";
import { netUrgency, ALBUMIN_LOW_WARNING } from "./patterns_p73_gaps.js";

const normK = (s) => String(s).toLowerCase().replace(/[\s.\-_()/%#:]/g, "");
const g = (e, k) => e.graded?.find((x) => x.test === k);
const ungradedBy = (e, reason) => Object.entries(e.ungraded ?? {}).filter(([, u]) => u.reason === reason);

// N20: زمان‌بندیِ جمله از خودِ urgency می‌آید، نه جدا نوشته می‌شود.
const ACTION = {
  routine: "در نوبتِ عادی با پزشک مطرح کنید.",
  this_week: "این هفته با پزشک مطرح کنید.",
  soon: "همین امروز نزدِ پزشک بروید.",
};

function qualRows(e, re) {
  return Object.entries(e.qual ?? {})
    .filter(([k]) => re.test(normK(k)))
    .map(([key, v]) => ({ key, raw: String(v).trim(), norm: normK(key) }));
}

const EQUIVOCAL_ROW_RE = /crp|troponin|ctn[it]|hiv|hbsag|hcv|hcg|pregnan|بارداری|بتا|تروپونین/;
function equivocalRows(e) {
  return Object.entries(e.qual ?? {})
    .filter(([k, v]) => EQUIVOCAL_ROW_RE.test(normK(k)) && qualVerdict(v).state === "equiv")
    .map(([key, v]) => ({ key, raw: String(v).trim() }));
}

// N6: qualState (مجموعهٔ بستهٔ کلمه‌ها) در patterns_utils.js است — specs/012 آن را مشترک کرد.

const NAMES_FA = { NEUT: "نوتروفیل", LYMPH: "لنفوسیت", MONO: "مونوسیت", EOS: "ائوزینوفیل", BASO: "بازوفیل", BAND: "باند (نوتروفیلِ نابالغ)" };
// نسبتِ معمولِ درصدی در بزرگسال (Henry's / Medscape، حدودی). فقط برای جمله‌ی «در/خارج از نسبتِ معمول»، نه حکم.
const PCT_USUAL = { NEUT: [40, 75], LYMPH: [20, 45], MONO: [2, 10], EOS: [0, 6], BASO: [0, 2], BAND: [0, 10] };

// ── ۱) درصدِ افتراقی بدونِ WBC ──
function diffNoWbcText(e) {
  const rows = ungradedBy(e, "diff_pct_no_wbc");
  const parts = rows.map(([key, u]) => {
    const base = key.replace("_PCT", "");
    const [lo, hi] = PCT_USUAL[base] ?? [null, null];
    const pos = lo == null ? "" : u.value > hi ? " (بالاتر از نسبتِ معمول)" : u.value < lo ? " (پایین‌تر از نسبتِ معمول)" : " (در نسبتِ معمول)";
    return `${NAMES_FA[base] ?? base} ${u.value}٪${pos}`;
  });
  return `روی این برگه فقط درصدِ انواعِ گلبولِ سفید آمده: ${parts.join("، ")}. ` +
    "درصد فقط سهمِ هر نوع را نشان می‌دهد، نه تعدادِ واقعی‌اش؛ بدونِ شمارشِ کلِ گلبول‌های سفید (WBC) نمی‌شود گفت تعدادِ این سلول‌ها کم است، زیاد است یا طبیعی " +
    "(۸۰٪ از یک WBCِ بسیار پایین با ۸۰٪ از یک WBCِ طبیعی خیلی فرق دارد). برای همین چیزی دربارهٔ «کم یا زیاد بودنِ تعداد» نمی‌گوییم و WBC را از همان آزمایشگاه یا برگهٔ CBC بگیرید.";
}

// ── ۲) باند (نوتروفیلِ نابالغ) — Henry's: ۰–۷۰۰/µL ──
// ── ۳..۸) آزمایش‌های عددی با بازهٔ بزرگسال ──
const dirFa = (x) => (x.dir === "high" ? "بالاتر از" : "پایین‌تر از");

// P88 (N4): آهنِ چاپ‌شده ولی بی‌واحد «روی این برگه نیست» نیست — بیرون از متن (M38).
function transferrinIronAbsentFa(e) {
  const u = ungradedFa(e, "IRON", "آهن");
  return u ? `${u}؛ فریتین روی این برگه نیست، و هر دو برای تفسیرِ ترانسفرین لازم‌اند. ` : "آهن و فریتین روی این برگه نیست؛ برای تفسیرِ ترانسفرین لازم‌اند. ";
}
// P88 (N4): بیرون از متن تا M38 کلیدِ TROPONIN_I را متنِ بیمار نخواند.
function myoglobinTropAbsentFa(e) {
  const u = ungradedFa(e, "TROPONIN_I", "تروپونین (نشانگرِ اختصاصیِ قلب)");
  return u ? `${u}. ` : "تروپونین (نشانگرِ اختصاصیِ قلب) روی این برگه نیست. ";
}
function myoglobinBuild(e) {
  const m = g(e, "MYOGLOBIN");
  const hi = m.dir === "high";
  const ck = g(e, "CK"), tropI = g(e, "TROPONIN_I");
  const urgency = hi ? "this_week" : "routine";
  return {
    pattern: "myoglobin_result",
    urgency,
    headline: hi ? "میوگلوبینِ شما بالاتر از حد طبیعی است" : "میوگلوبینِ شما پایین‌تر از حد طبیعی است",
    must_say: hi
      ? `میوگلوبین ${m.value} ng/mL است (بازهٔ مرجع ${m.range}). میوگلوبین پروتئینی در عضله‌ها، از جمله عضلهٔ قلب است و با آسیب عضله زود (طیِ چند ساعت) به خون می‌آید؛ ` +
        "ولی اختصاصیِ قلب نیست — ورزشِ سنگین، ضربه، تزریقِ عضلانی، نارسایی کلیه و عضله‌سوزی (رابدومیولیز) هم آن را بالا می‌برند. " +
        (ck?.abnormal && ck.dir === "high" ? `CK هم روی همین برگه بالاست (${ck.value}) که با منشأ عضلانی جور است. ` : ck ? "CK روی همین برگه طبیعی است. " : "CK روی این برگه نیست؛ مقایسه با آن کمک می‌کند. ") +
        // P88 (N4): تروپونینِ چاپ‌شده ولی بی‌واحد «روی این برگه نیست» نیست.
        (tropI ? "" : myoglobinTropAbsentFa(e))
      : `میوگلوبین ${m.value} ng/mL است (بازهٔ مرجع ${m.range}). مقدارِ پایین‌تر از بازه به‌تنهایی نشانهٔ بیماری نیست و معمولاً اهمیتِ بالینی ندارد.`,
    action: ACTION[urgency],
    suggest: hi ? ["CK", "تروپونین", "کراتینین"] : [],
    warnings: hi
      ? ["اگر درد قفسهٔ سینه، تنگی نفس، ادرارِ تیره (رنگِ چای) یا دردِ شدیدِ عضلانی دارید، منتظرِ نوبت نمانید و همان لحظه به اورژانس بروید."]
      : [],
  };
}

function transferrinBuild(e) {
  const t = g(e, "TRANSFERRIN");
  const hi = t.dir === "high";
  const fer = g(e, "FERRITIN"), iron = g(e, "IRON");
  const ironSide = (iron?.abnormal && iron.dir === "low") || (fer?.abnormal && fer.dir === "low");
  return {
    pattern: "transferrin_result",
    urgency: "routine",
    headline: hi ? "ترانسفرینِ شما بالاتر از حد طبیعی است" : "ترانسفرینِ شما پایین‌تر از حد طبیعی است",
    must_say: hi
      ? `ترانسفرین ${t.value} mg/dL است (بازهٔ مرجع ${t.range}). ترانسفرین پروتئینِ حملِ آهن است و وقتی ذخیرهٔ آهنِ بدن کم شود، بدن بیشتر می‌سازد؛ بارداری و مصرفِ قرصِ ضدبارداری هم آن را بالا می‌برد. ` +
        (ironSide ? "آهن/فریتینِ پایین روی همین برگه با کمبودِ آهن جور است. " : fer || iron ? "آهن و فریتین روی همین برگه کمبودِ آهن را نشان نمی‌دهند. " : transferrinIronAbsentFa(e))
      : `ترانسفرین ${t.value} mg/dL است (بازهٔ مرجع ${t.range}). ترانسفرینِ پایین در التهابِ مزمن، بیماریِ کبد، از دست‌رفتنِ پروتئین از کلیه یا روده، سوءتغذیه و بارِ اضافیِ آهن دیده می‌شود. ` +
        "به‌تنهایی علت را مشخص نمی‌کند و با آهن، فریتین، آلبومین و CRP باید دید.",
    action: ACTION.routine,
    suggest: ["پنل کامل آهن"],
    warnings: [],
  };
}

function atiiiBuild(e) {
  const a = g(e, "ATIII");
  const hi = a.dir === "high";
  const urgency = hi ? "routine" : "this_week";
  return {
    pattern: "antithrombin_result",
    urgency,
    headline: hi ? "فعالیتِ آنتی‌ترومبین شما بالاتر از حد طبیعی است" : "فعالیتِ آنتی‌ترومبین شما پایین‌تر از حد طبیعی است",
    must_say: hi
      ? `فعالیتِ آنتی‌ترومبین ${a.value}٪ است (بازهٔ مرجع ${a.range}). افزایشِ آن معمولاً اهمیتِ بالینی ندارد و گاهی با مصرفِ وارفارین دیده می‌شود.`
      : `فعالیتِ آنتی‌ترومبین ${a.value}٪ است (بازهٔ مرجع ${a.range}). آنتی‌ترومبین از پروتئین‌هایی است که جلوی لخته‌شدنِ بی‌جای خون را می‌گیرد؛ کمبودش می‌تواند ارثی باشد یا اکتسابی (بیماریِ کبد، ازدست‌رفتنِ پروتئین از کلیه، لخته یا DIC در جریان، مصرفِ هپارین، بارداری یا قرصِ ضدبارداری). ` +
        "با یک عدد نمی‌شود فرقش را گفت و مقدارِ پایین به‌معنیِ «لخته دارید» نیست، ولی خطرِ لخته را بالا می‌برد.",
    action: ACTION[urgency],
    suggest: hi ? [] : ["تکرار آنتی‌ترومبین (خارج از دورهٔ هپارین)", "فیبرینوژن و D-dimer"],
    warnings: hi ? [] : ["اگر ناگهان تورم و دردِ یک پا، تنگی نفس یا دردِ قفسهٔ سینه پیدا کردید، فوراً به اورژانس بروید."],
  };
}

function ttBuild(e) {
  const t = g(e, "TT");
  const hi = t.dir === "high";
  const fib = g(e, "FIB"), dd = g(e, "DDIMER");
  const urgency = hi ? "this_week" : "routine";
  return {
    pattern: "thrombin_time_result",
    urgency,
    headline: hi ? "زمان ترومبینِ شما طولانی‌تر از حد طبیعی است" : "زمان ترومبینِ شما کوتاه‌تر از حد طبیعی است",
    must_say: hi
      ? `زمان ترومبین ${t.value} ثانیه است (بازهٔ معمول ${t.range}؛ به معرف و دستگاهِ هر آزمایشگاه بستگی دارد، پس با بازهٔ چاپ‌شده روی برگه هم مقایسه کنید). ` +
        "این آزمایش آخرین مرحلهٔ لخته‌شدن را می‌سنجد و با هپارین (حتی مقدارِ کمِ آلودگیِ نمونه از خطِ وریدی)، فیبرینوژنِ کم یا ناکارآمد، DIC و بیماریِ کبد طولانی می‌شود. " +
        (fib ? `فیبرینوژنِ همین برگه ${fib.value} است. ` : "فیبرینوژن روی این برگه نیست و مهم‌ترین آزمایشِ مکمل است. ") +
        (dd?.abnormal && dd.dir === "high" ? "D-dimer هم بالاست که پیگیریِ سریع‌تر را مهم می‌کند. " : "")
      : `زمان ترومبین ${t.value} ثانیه است (بازهٔ معمول ${t.range}). کوتاه‌تر از بازه بودن معمولاً اهمیتِ بالینی ندارد و به معرف و نمونه بستگی دارد.`,
    action: ACTION[urgency],
    suggest: hi && !fib ? ["فیبرینوژن"] : [],
    warnings: hi ? ["اگر خونریزیِ غیرعادی (لثه، بینی، ادرار، مدفوعِ سیاه) دارید، همان روز به پزشک یا اورژانس مراجعه کنید."] : [],
  };
}

function mpvBuild(e) {
  const m = g(e, "MPV");
  const plt = g(e, "PLT");
  const hi = m.dir === "high";
  const pltState = !plt ? "absent" : plt.abnormal ? plt.dir : "normal";
  const pltSentence = {
    absent: "پلاکت روی این برگه نیست؛ MPV بدونِ شمارشِ پلاکت معنای زیادی ندارد. ",
    normal: "پلاکتِ همین برگه طبیعی است، پس MPVِ خارج از بازه به‌تنهایی یافتهٔ مهمی نیست. ",
    low: "پلاکتِ همین برگه پایین است و MPV باید در کنارِ آن خوانده شود (پلاکتِ جوان‌تر و بزرگ‌تر معمولاً نشانهٔ تولیدِ جبرانیِ مغز استخوان است، پلاکتِ کوچک‌تر نشانهٔ کم‌کاریِ تولید). ",
    high: "پلاکتِ همین برگه بالاست و MPV باید در کنارِ آن خوانده شود. ",
  }[pltState];
  return {
    pattern: "mpv_result",
    urgency: "routine",
    headline: hi ? "اندازهٔ متوسطِ پلاکت‌ها (MPV) بزرگ‌تر از حد طبیعی است" : "اندازهٔ متوسطِ پلاکت‌ها (MPV) کوچک‌تر از حد طبیعی است",
    must_say: `MPV ${m.value} fL است (بازهٔ مرجع ${m.range}). MPV میانگینِ اندازهٔ پلاکت‌هاست و به‌تنهایی تشخیص نمی‌دهد؛ دستگاه‌ها و نگهداریِ نمونه بر آن اثر می‌گذارند. ` + pltSentence,
    action: ACTION.routine,
    suggest: [],
    warnings: [],
  };
}

function tpBuild(e) {
  const tp = g(e, "TP");
  const alb = g(e, "ALB");
  const hi = tp.dir === "high";
  const albState = !alb ? "absent" : alb.abnormal ? alb.dir : "normal";
  let tail;
  if (!hi) {
    tail = albState === "low"
      ? `آلبومینِ همین برگه هم پایین است (${alb.value})، یعنی کاهش از بخشِ آلبومین می‌آید؛ علت‌های شایع: بیماریِ کبد، ازدست‌رفتنِ پروتئین از کلیه یا روده، سوءتغذیه و التهابِ مزمن. `
      : albState === "normal"
        ? "آلبومینِ همین برگه طبیعی است، پس کاهش از بخشِ گلوبولین‌ها (پروتئین‌های ایمنی) می‌آید. "
        : albState === "high"
          // 🔴 N4 (لایهٔ ۲): آلبومینِ بالا با پروتئینِ تامِ پایین به «آلبومین روی برگه نیست» می‌افتاد — ادعای دروغ دربارهٔ عددِ چاپ‌شده.
          ? `آلبومینِ همین برگه بالاتر از حد طبیعی است (${alb.value}) و پروتئینِ تام پایین؛ این ترکیب غیرمعمول است و ارزش دارد پزشک آن را (و احتمال خطای نمونه‌گیری) بررسی کند. `
          : `${ungradedFa(e, "ALB", "آلبومین") ?? "آلبومین روی این برگه نیست"}؛ برای فهمیدنِ علت لازم است. `;
  } else {
    tail = albState === "normal"
      ? "آلبومینِ همین برگه طبیعی است، پس افزایش از بخشِ گلوبولین‌هاست؛ علت‌ها از التهابِ مزمن و عفونت تا گاهی بیماری‌های خونی را شامل می‌شود و با آزمایشِ الکتروفورزِ پروتئین روشن می‌شود. "
      : albState === "high"
        ? "آلبومینِ همین برگه هم بالاست؛ این الگو اغلب به کم‌آبیِ بدن (غلیظ‌شدنِ خون) برمی‌گردد. "
        : albState === "low"
          ? `آلبومینِ همین برگه پایین است (${alb.value}) و پروتئینِ تام بالا؛ یعنی افزایش از بخشِ گلوبولین‌هاست (نه آلبومین). علت را پزشک با آزمایش‌های تکمیلی مثل الکتروفورزِ پروتئین روشن می‌کند. `
          : `${ungradedFa(e, "ALB", "آلبومین") ?? "آلبومین روی این برگه نیست"}؛ برای فهمیدنِ علتِ افزایش لازم است. `;
  }
  // 🔴 بازبینیِ متامورفیک ۲۰۲۶-۱۰-۰۵ (N29): این یافته مالکِ آلبومینِ پایین است (P73_OWNERS.albumin)، پس albumin_low_alone کنار
  //    می‌رود — «ALB 1.05» تنها «این هفته» بود و با پروتئینِ تام «نوبتِ عادی» می‌شد، و هشدارِ تورم هم گم می‌شد (N20).
  //    فوریت و هشدار از همان قاعده به ارث می‌رسند (netUrgency، یک تعریف)؛ عددِ تازه‌ای نیست.
  const albLow = albState === "low";
  const urgency = albLow ? netUrgency(e, alb) : "routine";
  return {
    pattern: "total_protein_result",
    urgency,
    headline: hi ? "پروتئینِ تامِ شما بالاتر از حد طبیعی است" : "پروتئینِ تامِ شما پایین‌تر از حد طبیعی است",
    must_say: `پروتئین تام ${tp.value} g/dL است (بازهٔ مرجع ${tp.range}). ` + tail + "این عدد به‌تنهایی تشخیص نیست.",
    action: ACTION[urgency] ?? ACTION.routine,
    suggest: hi && albState === "normal" ? ["الکتروفورز پروتئین سرم"] : [],
    warnings: albLow ? [ALBUMIN_LOW_WARNING] : [],
  };
}

// ── ۹) ردیف‌های فقط-بزرگسال در کودک ──
function adultOnlyBuild(e) {
  const rows = ungradedBy(e, "adult_ref_only");
  const names = { MYOGLOBIN: "میوگلوبین", TRANSFERRIN: "ترانسفرین", ATIII: "آنتی‌ترومبین", TT: "زمان ترومبین" };
  return {
    pattern: "adult_only_reference_child",
    urgency: "routine",
    headline: "محدودهٔ مرجعِ این آزمایش‌ها برای کودک با بزرگسال فرق دارد",
    must_say:
      `${rows.map(([k, u]) => `${names[k] ?? k} ${u.value}`).join("، ")} روی برگه آمده است. ` +
      "محدودهٔ این آزمایش‌ها در نوزاد و کودک با بزرگسال فرق می‌کند (مثلاً آنتی‌ترومبینِ نوزاد طبیعی کمتر است) و ما برای سنِ این بیمار بازهٔ منبع‌دار نداریم؛ برای همین بالا یا پایین بودن را حدس نمی‌زنیم. " +
      "این عددها را با محدودهٔ چاپ‌شده روی همین برگه (که برای سنِ کودک نوشته می‌شود) و پزشکِ کودکان بسنجید.",
    action: ACTION.routine,
    suggest: [],
    warnings: [],
  };
}

// ── ۱۰) سرولوژیِ هپاتیت B: Anti-HBs / Anti-HBc ──
// منبع: CDC «Interpretation of Hepatitis B Serologic Test Results» و ACIP: anti-HBs ≥ 10 mIU/mL = محافظت.
const ANTIHBS_RE = /^antihbs|^hbsab|^hepatitisbsurfaceantibody|^hbsantibody/;
const ANTIHBC_RE = /^antihbc|^hbcab|^hbcantibody|^hepatitisbcore/;
const hbsagReactive = (e) => serologyReactive(e, /hbsag|hepatitisbsurfaceantigen|^hepatitisbsurface$|هپاتیتb|استرالیا/i, /^anti|آنتیبادی|antibody|ab$|hbsab/i);

function antiHbsBuild(e) {
  const rows = qualRows(e, ANTIHBS_RE);
  const r = rows[0];
  const st = qualState(r.raw);
  const agPos = hbsagReactive(e);
  let level; // protected | notProtected | unknown
  let shown = r.raw;
  if (st.state === "pos") level = "protected";
  else if (st.state === "neg") level = "notProtected";
  else if (st.state === "num" && /miu|iu|u\/l/i.test(st.unit)) {
    shown = `${st.cmp ?? ""}${st.n} ${st.unit}`;
    level = st.cmp === "<" ? (st.n <= 10 ? "notProtected" : "unknown") : st.n >= 10 ? "protected" : "notProtected";
  } else level = "unknown";
  const urgency = agPos ? "this_week" : "routine";
  const body =
    agPos
      ? `Anti-HBs روی این برگه «${shown}» است، ولی HBsAg هم واکنش‌گر است؛ این دو را نمی‌شود جدا خواند و باید پزشک با هم تفسیر کند (نباید فرض کنید ایمن هستید). `
      : level === "protected"
        ? `Anti-HBs (آنتی‌بادیِ ضدِ پوستهٔ ویروسِ هپاتیت B) «${shown}» است. حدِ محافظت ۱۰ mIU/mL و بالاتر است. ` +
          "این معمولاً یعنی یا واکسنِ هپاتیت B اثر کرده یا بدن از عفونتِ قبلی بهبود یافته؛ برای تفکیک، Anti-HBc کمک می‌کند. "
        : level === "notProtected"
          ? `Anti-HBs «${shown}» است، یعنی سطحِ محافظتی (۱۰ mIU/mL و بالاتر) دیده نمی‌شود. این نشانهٔ بیماری نیست؛ فقط یعنی در برابرِ هپاتیت B محافظت ندارید یا اثرِ واکسن کم شده است. ` +
            "اگر واکسن نزده‌اید یا مشاغل و شرایطِ پرخطر دارید، دربارهٔ واکسیناسیون یا یک دوزِ یادآور با پزشک مشورت کنید. "
          : `Anti-HBs روی برگه به‌صورتِ «${r.raw}» آمده و به‌روشنی مثبت یا منفی نیست؛ از روی آن دربارهٔ ایمنی قضاوت نمی‌کنیم و با پزشک یا همان آزمایشگاه روشنش کنید. `;
  return {
    pattern: "anti_hbs_result",
    urgency,
    headline: "نتیجهٔ Anti-HBs (ایمنی در برابر هپاتیت B)",
    must_say: body,
    action: ACTION[urgency],
    suggest: [],
    warnings: [],
  };
}

function antiHbcBuild(e) {
  const rows = qualRows(e, ANTIHBC_RE);
  const r = rows[0];
  const igm = /igm/.test(r.norm);
  const st = qualState(r.raw);
  const agPos = hbsagReactive(e);
  const hbsRows = qualRows(e, ANTIHBS_RE);
  const hbsPos = hbsRows.some((x) => {
    const s = qualState(x.raw);
    return s.state === "pos" || (s.state === "num" && s.n >= 10 && s.cmp !== "<");
  });
  let urgency = "routine", body;
  if (st.state === "pos") {
    if (igm) { urgency = "this_week"; body = "Anti-HBc IgM مثبت است؛ این آنتی‌بادی معمولاً نشانهٔ عفونتِ تازهٔ هپاتیت B (شش ماهِ اخیر) است و باید این هفته پزشک ارزیابی کند. "; }
    else if (agPos) { urgency = "this_week"; body = "Anti-HBc مثبت است و HBsAg هم واکنش‌گر است؛ این ترکیب با عفونتِ فعالِ هپاتیت B (تازه یا مزمن) جور است و باید پزشک یا متخصص کبد ارزیابی کند. "; }
    else if (hbsPos) { body = "Anti-HBc مثبت و Anti-HBs هم مثبت است؛ این معمولاً یعنی عفونتِ قبلیِ هپاتیت B که بدن از آن بهبود یافته. نکتهٔ مهم: اگر قرار است داروی سرکوب‌کنندهٔ ایمنی یا شیمی‌درمانی بگیرید، حتماً پزشک را از این نتیجه باخبر کنید، چون ویروس به‌ندرت دوباره فعال می‌شود. "; }
    else { urgency = "this_week"; body = "Anti-HBc مثبت است ولی Anti-HBs روی برگه مثبت نیست و HBsAg هم واکنش‌گر گزارش نشده یا روی برگه نیست. این حالت («Anti-HBc تنها») چند توضیح دارد: عفونتِ قدیمیِ بهبودیافته، عفونتِ کم‌فعال، یا نتیجهٔ مثبتِ کاذب؛ با HBsAg و Anti-HBs روشن می‌شود. "; }
  } else if (st.state === "neg") {
    // N6/N4: IgM منفی فقط عفونتِ تازه را رد می‌کند؛ «تماسِ قبلی دیده نشد» را فقط Anti-HBc تام می‌تواند بگوید.
    body = igm
      ? "Anti-HBc IgM منفی است؛ یعنی نشانهٔ عفونتِ تازهٔ هپاتیت B دیده نشد. این آزمایش تماسِ قدیمیِ قبلی با ویروس را رد نمی‌کند؛ آن را Anti-HBc تام می‌گوید. "
      : "Anti-HBc منفی است؛ یعنی نشانه‌ای از تماسِ قبلی با ویروسِ هپاتیت B دیده نشده. (این آزمایش واکسن‌زدن را نشان نمی‌دهد؛ آن را Anti-HBs می‌گوید.) ";
  } else {
    body = `Anti-HBc روی برگه به‌صورتِ «${r.raw}» آمده و به‌روشنی مثبت یا منفی نیست؛ از آن نتیجه نمی‌گیریم و با پزشک یا همان آزمایشگاه روشنش کنید. `;
  }
  return {
    pattern: "anti_hbc_result",
    urgency,
    headline: "نتیجهٔ Anti-HBc (آنتی‌بادیِ هستهٔ ویروسِ هپاتیت B)",
    must_say: body + "این یک آزمایشِ غربالگری است، نه تشخیصِ قطعی.",
    action: ACTION[urgency],
    // AASLD/EASL: Anti-HBc تنها (HBsAg و Anti-HBs منفی) با HBV DNA و HBsAg/Anti-HBs روشن می‌شود.
    suggest: st.state === "pos" && !agPos && !hbsPos
      ? ["آنتی‌ژنِ سطحیِ هپاتیت B (HBsAg)", "آنتی‌بادیِ سطحیِ هپاتیت B (Anti-HBs)", "آزمایش بار ویروسیِ هپاتیت B (HBV DNA)"]
      : [],
    warnings: [],
  };
}

// ── ۱۱) ASO — آستانهٔ بالایی به سن وابسته است (Distribution and ULN of ASO by age، پیش‌دبستانی ≈۱۳۱، مدرسه ≈۴۳۳، بزرگسال ≈۱۳۶–۲۰۰ IU/mL) ──
function asoUln(age) {
  if (age == null) return null;
  if (age < 5) return 130;
  if (age < 20) return 430;
  return 200;
}
function asoBuild(e) {
  const r = qualRows(e, /^aso|^antistreptolysin/)[0];
  const st = qualState(r.raw);
  const uln = asoUln(e.age);
  let urgency = "routine", body;
  const ageNote = e.age == null ? "سنِ بیمار روی برگه نیست و آستانهٔ طبیعیِ ASO به سن بستگی دارد (در کودکِ دبستانی خیلی بالاتر از بزرگسال است)، پس از روی عدد حکم نمی‌دهیم. " : "";
  if (st.state === "pos") body = `ASO «${r.raw}» گزارش شده؛ یعنی از آستانهٔ همان کیتِ آزمایشگاه بالاتر است. ${ageNote}`;
  else if (st.state === "neg") body = "ASO منفی است؛ یعنی شواهدی از تماسِ اخیر با استرپتوکوکِ گروه A دیده نشده. ";
  else if (st.state === "num" && uln != null) {
    const n = st.n, below = st.cmp === "<";
    body = below || n <= uln
      ? `ASO ${st.cmp ?? ""}${n} است و برای سنِ شما (حدِ بالای تقریبیِ ${uln} IU/mL) بالا نیست. `
      : `ASO ${n} است و از حدِ بالای تقریبیِ همین سن (${uln} IU/mL) بیشتر است. `;
  } else if (st.state === "num") body = `ASO ${st.cmp ?? ""}${st.n} است. ${ageNote}`;
  else body = `ASO روی برگه به‌صورتِ «${r.raw}» آمده و روشن نیست؛ از آن نتیجه نمی‌گیریم و با همان آزمایشگاه روشنش کنید. `;
  const high = st.state === "pos" || (st.state === "num" && uln != null && st.n > uln && st.cmp !== "<");
  return {
    pattern: "aso_result",
    urgency,
    headline: high ? "ASO (آنتی‌استرپتولیزین O) بالاتر از حدِ معمول است" : "نتیجهٔ ASO (آنتی‌استرپتولیزین O)",
    must_say: body +
      (high
        ? "ASO بالا یعنی چند هفته تا چند ماهِ اخیر بدن با استرپتوکوکِ گروه A (مثلاً گلودردِ استرپتوکوکی یا عفونتِ پوستی) روبه‌رو شده؛ خودِ عفونت یا بیماری را ثابت نمی‌کند و در بسیاری از آدم‌های سالم هم بالا می‌ماند. " +
          "فقط وقتی اهمیت دارد که علامتی مثل دردِ مفاصل، تب، ادرارِ تیره یا تورمِ صورت و پا هم باشد (تب روماتیسمی یا گلومرولونفریتِ پس از استرپتوکوک)."
        : "این آزمایش به‌تنهایی بیماری را تشخیص نمی‌دهد."),
    action: ACTION[urgency],
    suggest: [],
    warnings: high ? ["اگر تب، دردِ مفاصل، ادرارِ تیره یا تورمِ صورت و پا دارید، زودتر به پزشک مراجعه کنید."] : [],
  };
}

// ── ۱۲) کشت ادرار / کشت خون ──
function cultureState(raw, kind = "urine") {
  const s = String(raw);
  if (/contaminat|mixed (flora|growth)|آلوده|فلور ?مخلوط/i.test(s)) return "contaminated";
  // نامِ ارگانیسم = رشد؛ «<10^3 other flora» یا «no significant growth» کنارِ آن منفی‌اش نمی‌کند، و آستانهٔ CFUِ معنادار فقط برای ادرار است
  //   (در کشتِ خون هر رشدی معنادار است).
  const ORG = /coli|klebsiella|proteus|pseudomonas|enterobacter|enterococc|staph|strep|candida|acinetobacter|citrobacter|morganella|serratia|salmonella|اشرشیا|کلبسیلا|پروتئوس|استافیلوکوک|استرپتوکوک|انتروکوک|کاندیدا|growth of|رشد (?:کرد|دارد)/i;
  if (ORG.test(s) && !/(no|without|nil)\s+growth|عدم ?رشد|بدون ?رشد/i.test(s)) return "pos";
  // N6: «بدون رشد»، «رشد نداشت»، «رشد … مشاهده نشد»، «No significant growth»، «<10000 CFU/mL» (زیرِ حدِ معنادار) منفی‌اند؛
  //   پیش‌تر فقط «عدم رشد/رشد نکرد» منفی بود و بقیه چون شامل «رشد/growth/cfu» بودند مثبت خوانده می‌شدند.
  if (/(no|without|nil)\s+(significant\s+|bacterial\s+|organism\s+)?(growth|organisms?)|no ?growth|negative|sterile|not isolated|no bacteria|عدم ?رشد|بدون ?رشد|رشد ?(نکرد|نداشت|نشد|ندارد)|رشدی|منفی|steril|^-$|(رشد|باکتری|میکروب|growth).{0,25}(مشاهده|دیده|یافت) ?نشد/i.test(s)) return "neg";
  if (kind === "urine" && /<\s*(10[,.]?000|10\s*\^\s*[34]|1[0o]\s*[⁴³])/i.test(s)) return "neg";
  // P84 (N30، فهرستِ بسته): «NEG»، «Not detected»، «Nil»، «Non-reactive» منفی‌اند؛ «POS»، «+» و «Detected» مثبت — هر دو فقط به‌عنوانِ
  //   *کلِ* مقدار. پیش‌تر هر دو «نامعلوم» می‌شدند (و نامعلوم حالا this_week است، پس منفیِ نانوشته فوریتِ کاذب می‌گرفت).
  if (/^(neg\.?|nil|none|not\s*detected|undetected|non.?reactive)$/i.test(s.trim())) return "neg";
  if (/^(pos\.?|\+{1,4}|detected|reactive)$/i.test(s.trim())) return "pos";
  if (/positive|مثبت|growth|cfu|coli|klebsiella|proteus|pseudomonas|enterobacter|enterococc|staph|strep|candida|acinetobacter|citrobacter|morganella|serratia|salmonella|رشد|اشرشیا|کلبسیلا|پروتئوس|استافیلوکوک|استرپتوکوک|انتروکوک|کاندیدا/i.test(s)) return "pos";
  return "unknown";
}
function urineCultureBuild(e) {
  const r = qualRows(e, /^urineculture/)[0];
  const st = cultureState(r.raw);
  const urgency = st === "pos" ? "this_week" : "routine";
  const body = {
    pos: `کشت ادرار «${r.raw}» گزارش شده است؛ یعنی باکتری یا قارچی در نمونه رشد کرده. اینکه این عفونتِ واقعی است یا نه به تعدادِ کلنی، علائمِ شما (سوزش، تکررِ ادرار، تب، دردِ پهلو) و روشِ نمونه‌گیری بستگی دارد؛ در خانمِ باردار حتی بدونِ علامت مهم است. آنتی‌بیوگرامِ همین کشت نشان می‌دهد کدام دارو اثر دارد.`,
    neg: "در کشتِ ادرار رشدِ باکتری گزارش نشده است. (اگر علامت دارید و قبل از نمونه آنتی‌بیوتیک مصرف کرده بودید، منفی‌شدنِ کشت همیشه عفونت را رد نمی‌کند.)",
    contaminated: "کشتِ ادرار «مخلوط/آلوده» گزارش شده؛ یعنی نمونه احتمالاً هنگام جمع‌آوری آلوده شده و نتیجه قابلِ اتکا نیست. معمولاً تکرارِ کشت با نمونهٔ وسطِ ادرار در ظرفِ استریل لازم است.",
    unknown: `کشتِ ادرار روی برگه به‌صورتِ «${r.raw}» آمده و از متنِ آن نمی‌توان مثبت یا منفی‌بودن را قطعی خواند؛ با همان آزمایشگاه یا پزشک روشنش کنید.`,
  }[st];
  return {
    pattern: "urine_culture_result",
    urgency,
    headline: st === "pos" ? "در کشتِ ادرارِ شما رشدِ میکروب گزارش شده است" : "نتیجهٔ کشتِ ادرار",
    must_say: body,
    action: ACTION[urgency],
    suggest: st === "contaminated" ? ["تکرار کشت ادرار با نمونهٔ وسطِ ادرار"] : [],
    warnings: st === "pos" ? ["خودسرانه آنتی‌بیوتیک شروع نکنید — انتخاب و دوزِ درست را پزشک بر پایهٔ آنتی‌بیوگرام تعیین می‌کند. اگر تب بالا یا دردِ پهلو دارید، زودتر مراجعه کنید."] : [],
  };
}
function bloodCultureBuild(e) {
  const r = qualRows(e, /^bloodculture/)[0];
  const st = cultureState(r.raw, "blood");
  // N20 (P84): «نامعلوم» پیش‌تر urgency=routine با action=«این هفته» بود — دو نسخه از یک تصمیم. حالا یکی‌اند.
  const urgency = st === "pos" ? "soon" : st === "unknown" ? "this_week" : "routine";
  const body = {
    pos: `کشتِ خون «${r.raw}» گزارش شده است؛ یعنی میکروب در خون رشد کرده. این نتیجه را آزمایشگاه معمولاً فوری به پزشک اطلاع می‌دهد. گاهی (به‌ویژه وقتی فقط یک شیشه مثبت است) آلودگیِ پوست هنگامِ نمونه‌گیری است، ولی تا پزشک بررسی نکرده نباید آن را بی‌اهمیت گرفت.`,
    neg: "در کشتِ خون رشدِ میکروب گزارش نشده است. (اگر نتیجهٔ مقدماتی است، کشتِ خون معمولاً تا ۵ روز پیگیری می‌شود و گزارشِ نهایی را آزمایشگاه می‌دهد؛ اگر تب یا لرز ادامه دارد، به پزشک بگویید.)",
    contaminated: "کشتِ خون «آلوده/مخلوط» گزارش شده؛ یعنی احتمالاً هنگامِ نمونه‌گیری آلوده شده و نیاز به تفسیرِ پزشک و گاهی تکرار دارد.",
    unknown: `کشتِ خون روی برگه به‌صورتِ «${r.raw}» آمده و روشن نیست؛ چون کشتِ خون مهم است، همین‌ها را سریع با پزشک یا همان آزمایشگاه روشن کنید.`,
  }[st];
  return {
    pattern: "blood_culture_result",
    urgency,
    headline: st === "pos" ? "در کشتِ خونِ شما رشدِ میکروب گزارش شده است" : "نتیجهٔ کشتِ خون",
    must_say: body,
    action: st === "unknown" ? ACTION.this_week : ACTION[urgency],
    suggest: [],
    warnings: st === "pos" ? ["اگر تب، لرز، تپشِ قلب، سرگیجه یا حالِ بد دارید، به‌جای منتظرماندن به اورژانس بروید."] : [],
  };
}

// ── ۱۳) BHB (بتاهیدروکسی‌بوتیرات) سرم/خون ──
// منبع: ADA/EASD/JBDS/AACE/DTS — ۲۰۲۴ Hyperglycemic crises consensus: BHB ≥ ۳٫۰ mmol/L = کتوزِ در حدِ DKA. نرمالِ آزمایشگاهی < ~۰٫۶.
const BHB_RE = /^betahydroxybutyrate|^bhb|^hydroxybutyrate|^bhydroxybutyrate/;
const KETONE_OWNER_IDS = ["dka_pattern", "hhs_pattern", "severe_hyperglycemia_uncertain_ketosis"];
const ketoneOwnerFires = (e) => RULES_BIOCHEM.some((r) => KETONE_OWNER_IDS.includes(r.id) && r.match(e));
function bhbBuild(e) {
  const r = qualRows(e, BHB_RE)[0];
  const st = qualState(r.raw);
  let level, shown = r.raw;
  if (st.state === "pos") level = "pos";
  else if (st.state === "neg") level = "neg";
  else if (st.state === "num") {
    let mm = null;
    if (/mmol/i.test(st.unit)) mm = st.n;
    else if (/mg\/dl/i.test(st.unit)) mm = st.n / 10.4;
    if (mm == null) level = "unitless"; // 3.5 بی‌واحد: mmol/L (بالا) یا mg/dL (طبیعی) — حدس نمی‌زنیم (N3)
    else level = st.cmp === "<" ? "normal" : mm >= 3 ? "high" : mm >= 0.6 ? "mild" : "normal";
    shown = `${st.cmp ?? ""}${st.n} ${st.unit}`.trim();
  } else level = "unknown";
  const urgency = level === "high" ? "soon" : level === "mild" || level === "pos" || level === "unitless" || level === "unknown" ? "this_week" : "routine";
  const body = {
    high: `بتاهیدروکسی‌بوتیرات (BHB) ${shown} است؛ مقدارِ ۳٫۰ mmol/L و بالاتر در حدِ کتواسیدوز دیابتی است و به ارزیابیِ فوریِ پزشکی نیاز دارد (قند خون، بی‌کربنات یا گازِ خون هم لازم است). علت‌های دیگر هم دارد (الکل، گرسنگیِ طولانی).`,
    mild: `BHB ${shown} است (بالاتر از حدِ معمولِ حدودِ ۰٫۶ mmol/L ولی کمتر از ۳٫۰). این می‌تواند کتوزِ خفیف باشد: ناشتای طولانی، رژیمِ کم‌کربوهیدرات، ورزش، الکل یا شروعِ کم‌کنترلیِ دیابت؛ در دیابت باید با قند خون و پزشک دیده شود.`,
    normal: `BHB ${shown} است و در حدِ معمول است؛ کتوزِ مهمی دیده نمی‌شود.`,
    pos: `BHB (کتونِ خون) «${r.raw}» گزارش شده است؛ یعنی بدن به‌جای قند، چربی می‌سوزاند. علتش می‌تواند ناشتای طولانی، رژیمِ کم‌کربوهیدرات، الکل یا دیابتِ کم‌کنترل باشد؛ بدونِ عدد و قندِ خون نمی‌شود شدتش را گفت.`,
    neg: "BHB (کتونِ خون) منفی است؛ کتوزِ قابلِ‌توجهی دیده نمی‌شود.",
    unitless: `BHB ${shown} بدونِ واحد چاپ شده است. اگر mmol/L باشد، ۳٫۰ و بالاتر در حدِ کتواسیدوز است، ولی اگر mg/dL باشد معمولاً طبیعی است؛ چون واحد روی برگه نیست، شدتش را حدس نمی‌زنیم. واحد را از آزمایشگاه بپرسید و اگر علامتی مثلِ تشنگیِ شدید، تهوع، نفسِ تند یا بوی استون دارید زودتر مراجعه کنید.`,
    unknown: `BHB روی برگه به‌صورتِ «${r.raw}» آمده و روشن نیست؛ با همان آزمایشگاه روشنش کنید.`,
  }[level];
  return {
    pattern: "bhb_result",
    urgency,
    headline: "نتیجهٔ بتاهیدروکسی‌بوتیرات (کتونِ خون)",
    must_say: body,
    action: ACTION[urgency],
    suggest: [],
    warnings: level === "high" ? ["اگر تهوع و استفراغ، دردِ شکم، نفسِ تند و عمیق یا گیجی دارید، همان لحظه به اورژانس بروید."] : [],
  };
}

// ── ۱۴) نیتریت/پیوریِ تنها (uti_pattern دو نشانه می‌خواهد؛ N1 بازِ CLAUDE.md) ──
const NIT_RE = /nitrite|نیتریت/i;
const WBC_RE = /wbc|pus\s*cells?|پوس\s*سل|leukocyt/i;
const LE_RE = /leukocyte|استراز|esterase/i;
// IDSA/ACOG/USPSTF: در بارداری باکتری‌ی بی‌علامت هم باید با کشتِ ادرار پیدا و درمان شود؛ نوار (نیتریت/استراز) حساسیتِ کمی دارد
// و نتیجهٔ منفیِ آن در بارداری کافی نیست (به‌ویژه ۱۲–۱۶ هفتگی). پس بارداریِ اعلام‌شده ⇒ این هفته + کشت.
const PREGNANCY_URINE_SENTENCE =
  "چون باردار هستید، باکتریِ ادرار حتی بدونِ علامت مهم است (خطرِ عفونتِ کلیه و زایمانِ زودرس) و نوارِ ادرار برای رد کردنش در بارداری کافی نیست؛ کشتِ ادرار لازم است.";
const pyuriaAlone = (e) => {
  if (utiFires(e)) return false;
  if (urineCellState(e, WBC_RE, 5) !== "high") return false;   // «Many» هم (P84، N19)
  if (urinePositive(e, LE_RE) || urinePositive(e, NIT_RE)) return false;
  return !castAxis(e).types.includes("wbc");
};

export const RULES_COVERAGE_GAPS = [
  {
    id: "differential_without_wbc",
    match: (e) => ungradedBy(e, "diff_pct_no_wbc").length > 0,
    build: (e) => ({
      pattern: "differential_without_wbc",
      urgency: "routine",
      headline: "درصدِ انواعِ گلبولِ سفید آمده ولی شمارشِ کلِ گلبولِ سفید (WBC) نیست",
      must_say: diffNoWbcText(e),
      action: ACTION.routine,
      suggest: ["CBC کامل با شمارش گلبول‌های سفید"],
      warnings: [],
    }),
  },
  // P96 (تصمیمِ بازبین ۲۰۲۶-۱۰-۰۶، [75]): باند > نوتروفیل ⇒ «مشکوک به خطای ثبت یا جابه‌جاییِ ستون»؛ به بازبینیِ خودِ آزمایشگاه می‌رود، نه به فوریتِ بالینی.
  //   فوریت routine است و بیمار را به نوبتِ عادی/بازبینیِ لام می‌فرستد؛ هیچ ادعایی دربارهٔ عفونت یا کم‌شدنِ نوتروفیل نمی‌کند (کلیدها را هر دو نام می‌برد: M156).
  {
    id: "band_neutrophil_discordance",
    match: (e) => bandNeutDiscordance(e),
    build: (e) => {
      const b = g(e, "BAND_ABS"), n = g(e, "NEUT_ABS");
      return {
        pattern: "band_neutrophil_discordance",
        urgency: "routine",
        headline: "عددِ باند و نوتروفیل با هم نمی‌خوانند؛ نتیجه باید دوباره بررسی شود",
        must_say:
          `باند ${b.value} و نوتروفیل ${n.value} در میکرولیتر است (از درصدِ چاپ‌شده و گلبول سفید حساب شده)؛ یعنی باندها از نوتروفیل‌های رسیده بیشترند. ` +
          "این الگو کمتر دیده می‌شود و اغلب نشانهٔ خطای ثبت یا جابه‌جاییِ ستونِ «باند» و «نوتروفیل» در برگه است. برای همین این دو عدد را نشانهٔ عفونت یا کم‌شدنِ نوتروفیل نمی‌خوانیم؛ " +
          "از آزمایشگاه بخواهید ردیف‌ها را با لامِ خونِ محیطی تطبیق دهد.",
        action: ACTION.routine,
        suggest: ["لام خون محیطی (شمارش افتراقی دستی)", "تکرار CBC"],
        warnings: ["اگر تب بالا، لرز یا حالِ بد دارید، منتظرِ نوبت نمانید."],
      };
    },
  },
  {
    id: "bandemia",
    // P96: باندِ بیشتر از نوتروفیل = ردیف‌های ناسازگار؛ مالکش band_neutrophil_discordance است (بالینی خوانده نمی‌شود).
    match: (e) => { const b = g(e, "BAND_ABS"); return !!(b?.abnormal && b.dir === "high") && !bandNeutDiscordance(e); },
    build: (e) => {
      const b = g(e, "BAND_ABS");
      const infant = e.age != null && e.age < 1;
      const urgency = infant ? "routine" : "this_week";
      return {
        pattern: "bandemia",
        urgency,
        headline: "نوتروفیل‌های نابالغ (باند) بالاتر از حد طبیعی است",
        must_say:
          `باند ${b.value} در میکرولیتر است (بازهٔ مرجع ${b.range}). باندها نوتروفیل‌های نابالغ‌اند که مغز استخوان در برابرِ عفونتِ باکتریایی یا التهابِ شدید زودتر آزاد می‌کند («چپ‌گرایی»)؛ استرس و بعضی داروها هم می‌توانند باعثش شوند. ` +
          (infant ? "در نوزاد و شیرخوار نسبتِ باند به‌تنهایی حکم نیست و پزشکِ کودک آن را با علائم و CRP می‌خواند. " : "به‌تنهایی تشخیص نیست و در کنارِ علائم (تب، لرز) و WBC و CRP معنا می‌گیرد. "),
        action: ACTION[urgency],
        suggest: [],
        warnings: ["اگر تب بالا، لرز یا حالِ بد دارید، منتظرِ نوبت نمانید."],
      };
    },
  },
  { id: "myoglobin_abnormal", match: (e) => !!g(e, "MYOGLOBIN")?.abnormal, build: myoglobinBuild },
  { id: "transferrin_abnormal", match: (e) => !!g(e, "TRANSFERRIN")?.abnormal, build: transferrinBuild },
  { id: "antithrombin_abnormal", match: (e) => !!g(e, "ATIII")?.abnormal, build: atiiiBuild },
  { id: "thrombin_time_abnormal", match: (e) => !!g(e, "TT")?.abnormal, build: ttBuild },
  { id: "mpv_abnormal", match: (e) => !!g(e, "MPV")?.abnormal, build: mpvBuild },
  { id: "total_protein_abnormal", match: (e) => !!g(e, "TP")?.abnormal, build: tpBuild },
  { id: "adult_only_reference_child", match: (e) => ungradedBy(e, "adult_ref_only").length > 0, build: adultOnlyBuild },
  { id: "anti_hbs_result", match: (e) => qualRows(e, ANTIHBS_RE).length > 0, build: antiHbsBuild },
  { id: "anti_hbc_result", match: (e) => qualRows(e, ANTIHBC_RE).length > 0, build: antiHbcBuild },
  { id: "aso_result", match: (e) => qualRows(e, /^aso|^antistreptolysin/).length > 0, build: asoBuild },
  // N6/N28: نتیجهٔ «مرزی/+/-/نامشخص» در آزمایش‌هایی که قاعده‌شان فقط مثبت یا منفیِ روشن را می‌خواند (CRP، تروپونین، HIV/HBV/HCV،
  //   hCG) بی‌خواننده می‌ماند و بیمار مسیرِ «نتایج طبیعی است» را می‌گرفت. فقط می‌گوید «مبهم است»؛ حکمی نمی‌دهد.
  { id: "qual_equivocal_result", match: (e) => equivocalRows(e).length > 0, build: (e) => {
    const rows = equivocalRows(e);
    // تروپونینِ مرزی سؤالِ «همین امروز» است (تکرارِ سریالی)، نه نوبتِ عادی — هرگز اورژانس نمی‌شود چون نتیجه مثبت نشده (P75 پرسش).
    const trop = rows.some((r) => /troponin|ctn[it]|تروپونین/i.test(r.key));
    const urgency = trop ? "soon" : "routine";
    return {
      pattern: "qual_equivocal_result", urgency,
      headline: "نتیجهٔ یکی از آزمایش‌های شما مبهم است",
      must_say: rows.map((r) => `نتیجهٔ «${r.key}» روی برگه به‌صورتِ «${r.raw}» آمده و به‌روشنی مثبت یا منفی نیست؛ از آن نتیجه نمی‌گیریم.`).join(" ") +
        " برای روشن‌شدنش با پزشک یا همان آزمایشگاه مشورت کنید؛ معمولاً تکرارِ آزمایش یا روشِ دقیق‌تر لازم است.",
      action: ACTION[urgency], suggest: [],
    };
  } },
  { id: "urine_culture_result", match: (e) => qualRows(e, /^urineculture/).length > 0, build: urineCultureBuild },
  { id: "blood_culture_result", match: (e) => qualRows(e, /^bloodculture/).length > 0, build: bloodCultureBuild },
  // BHB: اگر یکی از مالک‌های کتون (DKA/HHS/قندِ بسیار بالا) فعال است، او مالکِ جمله است (M91e: «آیا آن قاعده فعال می‌شود»).
  { id: "bhb_result", match: (e) => qualRows(e, BHB_RE).length > 0 && !ketoneOwnerFires(e), build: bhbBuild },
  {
    id: "urine_nitrite_alone",
    match: (e) => urinePositive(e, NIT_RE) && !utiFires(e),
    build: (e) => {
      const bact = bacteriuriaFires(e);
      const preg = e.pregnant === true;   // فقط بارداریِ اعلام‌شده (P67 پرسش ۴)
      return {
        pattern: "urine_nitrite_alone",
        urgency: preg ? "this_week" : "routine",
        headline: "نیتریتِ ادرارِ شما مثبت است",
        must_say:
          "نیتریت در ادرار وقتی مثبت می‌شود که بعضی باکتری‌ها نیترات را به نیتریت تبدیل کرده باشند، پس می‌تواند نشانهٔ باکتری در ادرار باشد. " +
          "ولی روی این برگه نشانهٔ دومی (لکوسیت‌استراز یا گلبولِ سفیدِ بالا) نیست، و نیتریتِ تنها گاهی مثبتِ کاذب یا ناشی از نمونه‌ای است که مدتی مانده. " +
          (bact ? "باکتری هم در همین برگه گزارش شده است. " : "") +
          (preg ? PREGNANCY_URINE_SENTENCE : "اگر سوزش، تکررِ ادرار یا تب دارید یا باردارید، اهمیتش بیشتر است."),
        action: preg
          ? ACTION.this_week
          : "در نوبتِ عادی با پزشک مطرح کنید. اگر سوزش یا تکررِ ادرار، تب یا درد پهلو دارید، زودتر مراجعه کنید.",
        suggest: preg ? ["کشت ادرار"] : ["کامل ادرار — تکرار با نمونهٔ وسطِ ادرار در ظرفِ استریل"],
        warnings: ["خودسرانه آنتی‌بیوتیک شروع نکنید — انتخاب و دوز درست را پزشک تعیین می‌کند."],
      };
    },
  },
  {
    id: "urine_pyuria_alone",
    match: pyuriaAlone,
    build: (e) => {
      const w = urineCellCount(e, WBC_RE);
      // «Many» عدد ندارد (P84): مقدارِ چاپ‌شده نقل می‌شود، نه عددِ ساختگی (N6).
      const wRaw = Object.entries(e.qual || {}).find(([k]) => WBC_RE.test(k) && !/cast|esterase|استراز/i.test(k))?.[1];
      const wFa = w != null ? `${w} در هر میدانِ میکروسکوپ است (حدِ معمول تا ۵)` : `«${wRaw}» گزارش شده است (حدِ معمول تا ۵ در هر میدانِ میکروسکوپ)`;
      const preg = e.pregnant === true;
      const bact = bacteriaSignificant(e);
      const week = preg || bact;   // باکتری + پیوری = دو نشانه در عمل، هم‌سطحِ uti_likely (this_week)
      return {
        pattern: "urine_pyuria_alone",
        urgency: week ? "this_week" : "routine",
        headline: "در ادرارِ شما گلبولِ سفید بالاتر از حدِ معمول است",
        must_say:
          `گلبولِ سفیدِ ادرار ${wFa}. گلبولِ سفیدِ ادرار علت‌های متعددی دارد: عفونتِ ادراری (حتی وقتی نوار هنوز منفی است)، سنگ، التهابِ مجاری و گاهی آلودگیِ نمونه. ` +
          "چون نیتریت و لکوسیت‌استرازِ مثبت کنارش نیست، به‌تنهایی نمی‌شود عفونت را قطعی دانست." +
          (bact ? " باکتریِ قابل‌توجه هم در همین ادرار گزارش شده؛ همراهِ گلبولِ سفیدِ بالا، این‌ها کنارِ هم به عفونتِ ادراری نزدیک‌ترند تا به آلودگیِ نمونه، و کشتِ ادرار آن را روشن می‌کند." : "") +
          (preg ? " " + PREGNANCY_URINE_SENTENCE : ""),
        action: week
          ? ACTION.this_week
          : "در نوبتِ عادی با پزشک مطرح کنید. اگر سوزش یا تکررِ ادرار، تب یا درد پهلو دارید، زودتر مراجعه کنید.",
        suggest: week ? ["کشت ادرار"] : ["کامل ادرار — تکرار با نمونهٔ وسطِ ادرار در ظرفِ استریل", "کشت ادرار"],
        warnings: [],
      };
    },
  },
];
