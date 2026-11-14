// ============================================================
// patterns_autoimmune.js — P76 (مرحلهٔ ۱ و ۲) + P77 (سند مرجعِ کاربر، ۲۰۲۶-۱۰-۰۴): خودایمنی/روماتولوژی، آنتی‌فسفولیپید،
// تومورمارکرها و گوارش (کالپروتکتین، FIT/FOBT)
// ------------------------------------------------------------
// یازده یافته (هر خانواده یک یافته، N20):
//   ana_family_result (ANA + dsDNA + Sm + RNP + Ro/La) · anca_result · hla_b27_result · anti_ccp_result · complement_result
//   ssc_antibody_result (Scl-70 + سانترومر) · myositis_antibody_result (Jo-1) · antiphospholipid_result
//   tumor_markers_result · psa_result · gi_stool_result
//
// 🔴 پیش از P76 همه unmapped بودند: ANA مثبت و c-ANCA مثبت به «نتایج را در پرونده نگه دارید» می‌رسیدند (N2/N28).
//
// ⚠️ منبعِ هر ادعا: «سند مرجعِ کاربر» (پیست‌شده در جلسه، با علامت ✅/⚠️ که خودش گذاشته) + EULAR/ACR 2019 SLE (متنِ کامل باز شد).
//    بقیهٔ گایدلاین‌ها (ACR/EULAR 2010 RA، 2013 SSc، 2017 IIM، 2016 Sjögren، 2023 APS، ASAS 2009، ICAP، اجماع ANCA 2017،
//    USPSTF 2021، MSTF) از روی خلاصه/سند آمده‌اند و *باز نشده‌اند* ⇒ در `guidelines.js` ثبت نشدند (`sources` خالی).
//    هیچ‌کدام تأییدِ بازبینِ انسانی نیست (MEDICAL_RULES.md P77). معیارهای طبقه‌بندی «تشخیص» نیستند: امتیازی برای بیمار حساب نمی‌شود.
// ⚠️ C1: مثبت/منفی واژهٔ برگه است؛ بالا/پایین همیشه در برابرِ محدودهٔ *چاپ‌شده روی همان ردیف*. تنها حدهای ثابتِ کد:
//    ANA ≥ 1:80 (شرطِ ورودِ EULAR/ACR 2019 روی HEp-2)، نسبتِ ۳×ULNِ چاپی برای Anti-CCP، و تیترِ calcitonin > 100 pg/mL با واحدِ چاپی.
// ⚠️ تومورمارکر/گوارش بی‌محدودهٔ چاپی هم یافته می‌گیرد (state="noref"): عدد نقل می‌شود، «بالا/پایین» گفته نمی‌شود.
// ⚠️ هیچ قاعده‌ای اورژانس نیست؛ هیچ قاعده‌ای از یک آزمایش حکمِ بیماری نمی‌دهد (جملهٔ «مطرح‌کننده/مرتبط» با قید).
// ⚠️ هر جمله دربارهٔ آزمایشِ دیگر سه‌حالته است (مثبت / منفی / روی برگه نیست) — N4.
// ⚠️ N20: دستورِ زمان‌بندی فقط از urgency می‌آید؛ جملهٔ شرطیِ «اگر … پیدا کردید» در warnings است.
// ============================================================
import { autoAbState } from "./serology.js";
import { faName } from "./names.js";
import { parseReference } from "./units.js";
import { canBePregnant, isGlomerulonephritis, microMcvCut } from "./patterns_utils.js";

const ACTION = {
  routine: "در نوبتِ عادی با پزشک مطرح کنید.",
  this_week: "این هفته با پزشک مطرح کنید.",
};

const isPos = (a) => a.state === "pos" || a.state === "above";
const isNeg = (a) => a.state === "neg" || a.state === "within";
// نتیجه‌ای که نه مثبت است نه منفی: محدودهٔ چاپی نیست (noref) یا مرزی/نامشخص (equiv). متن‌ها نباید «منفی» بگویند.
const isUnsure = (a) => a.state === "noref" || a.state === "equiv";
const UNSURE_NOTE = "برای بعضی از این ردیف‌ها محدودهٔ مرجع روی برگه چاپ نشده یا نتیجه مرزی است، پس مثبت یا منفی بودنشان را نمی‌توان گفت؛ معنای این آزمایش‌ها به علائم و نظرِ پزشک بستگی دارد و بهتر است برگه را به او نشان دهید و در صورت لزوم آزمایش را تکرار کنید.";
const present = (a) => a.state !== "absent";
// ⚠️ نامِ چاپ‌شدهٔ برگه فقط برای ردیف‌های کیفی (qual) نمایش داده می‌شود — همان قراردادِ پیش از P112.
//    ردیفِ assay (عددی/بی‌نمره) نامِ فارسیِ خودش را نگه می‌دارد تا (۱) بیمار فارسی‌خوان نامِ آشنا را ببیند و
//    (۲) متنِ برگه‌های دیگر بایت‌به‌بایت عوض نشود (PN02). `name` در state می‌ماند چون fitMethod از آن روشِ گایاکی را می‌شناسد.
const label = (a, id) => (!a.assay && a.name ? a.name : faName(id));
const stateOf = (e, ids) => Object.fromEntries(ids.map((id) => [id, autoAbState(e, id)]));
const anyPresent = (st) => Object.values(st).some(present);
const explainsOf = (e, st) => Object.keys(st).filter((id) => e.ungraded?.[id]?.reason === "assay_printed");
const urgencyOf = (pos) => (pos ? "this_week" : "routine");
const CAUTION_DRUG = "بدونِ نظرِ پزشک خودسرانه دارو (به‌ویژه کورتون) شروع نکنید.";

/** یک جملهٔ سه‌حالته برای یک آزمایش (N5: عدد همان‌طور که چاپ شده). */
function lineOf(a, id) {
  const nm = label(a, id);
  if (a.assay) {
    const num = `${a.shown}${a.unit ? ` ${a.unit}` : ""}`;
    if (a.state === "equiv") return `${nm} روی برگهٔ شما «${a.raw}» (مرزی یا نامشخص) است؛ نه مثبت شمرده می‌شود نه منفی.`;
    if (a.state === "noref") {
      // P114: اگر بازه روی برگه *چاپ شده* ولی خوانده نشده، «چاپ نشده» ادعای کاذب است (N4).
      const printed = a.reference && String(a.reference).trim() && String(a.reference) !== "undefined";
      return printed
        ? `${nm} روی برگهٔ شما ${num} است؛ بازهٔ مرجعِ چاپ‌شده روی همان ردیف خوانده نشد، پس از همین برگه بالا یا پایین بودنش را نمی‌توان گفت — برگه را به پزشک نشان دهید.`
        : `${nm} روی برگهٔ شما ${num} است؛ محدودهٔ مرجع روی همان ردیف چاپ نشده، پس بالا یا پایین بودنش را نمی‌توان گفت.`;
    }
    // specs/019: CEA با دو حدِ چاپ‌شده (غیرسیگاری/سیگاری) و وضعیتِ سیگارِ نامعلوم — نه «بالا» و نه «داخل»؛ وابستگی را صریح می‌گوید.
    if (a.state === "between") return `${nm} روی برگهٔ شما ${num} است؛ این عدد به حدِ چاپ‌شده برای غیرسیگاری‌ها رسیده یا از آن بالاتر است و از حدِ چاپ‌شده برای سیگاری‌ها بالاتر نیست. وضعیتِ سیگارِ شما برای ما معلوم نیست، پس فقط از روی همین برگه نمی‌توان گفت خارج از محدوده است یا نه — این را با پزشک در میان بگذارید.`;
    const where = a.state === "below" ? "پایین‌تر از" : a.state === "within" ? "داخلِ" : "بالاتر از";
    return `${nm} روی برگهٔ شما ${num} است و ${where} ${a.state === "within" ? "محدودهٔ" : "مرزِ"} چاپ‌شدهٔ همان ردیف است.`;
  }
  if (a.bare && a.cut) {
    // specs/023: آنتی‌بادی‌های کبدی (ASMA، LKM-1، AMA) — مرزِ تیترِ ۱:۴۰ (IAIHG / PBC، P136).
    return a.state === "pos"
      ? `نتیجهٔ ${nm} روی برگهٔ شما «${a.raw}» است؛ تیترِ ۱:${faNum(a.cut)} یا بیشتر مثبت شمرده می‌شود.`
      : `نتیجهٔ ${nm} روی برگهٔ شما «${a.raw}» است؛ تیترِ کمتر از ۱:${faNum(a.cut)} منفی شمرده می‌شود.`;
  }
  if (a.bare) {
    return a.state === "pos"
      ? `نتیجهٔ ${nm} روی برگهٔ شما «${a.raw}» است؛ تیتر ۱:۸۰ یا بیشتر روی سلول‌های HEp-2 مثبت شمرده می‌شود.`
      : `نتیجهٔ ${nm} روی برگهٔ شما «${a.raw}» است؛ تیترِ کمتر از ۱:۸۰ منفی شمرده می‌شود.`;
  }
  const t = a.titre && !String(a.raw).includes(String(a.titre)) ? ` (تیتر 1:${a.titre})` : "";
  return a.state === "pos"
    ? `نتیجهٔ ${nm} روی برگهٔ شما «${a.raw}» است (مثبت)${t}.`
    : `نتیجهٔ ${nm} روی برگهٔ شما «${a.raw}» است (منفی).`;
}

const faNum = (n) => String(n).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[d]);
const CRITERIA_NOTE = "معیارهای طبقه‌بندی (EULAR/ACR و ...) برای پژوهش و کمک به تشخیص‌اند و جایگزینِ قضاوتِ پزشک نیستند.";

// ═══════════ ۱) ANA و آنتی‌بادی‌های اختصاصیِ هسته‌ای ═══════════
// specs/023: ANTI_HISTONE در همین خانواده (یک یافته، N20) ولی «اختصاصی» نیست (SPECIFIC).
const ANA_IDS = ["ANA", "ANTI_DSDNA", "ANTI_SM", "ANTI_RNP", "ANTI_RO", "ANTI_LA", "ANTI_HISTONE"];
const HISTONE_TEXT = "آنتی‌بادی ضدِ هیستون در لوپوسِ ناشی از دارو بسیار شایع است (مثلاً پس از بعضی داروهای فشارِ خون، قلب، ضدِسل یا ضدِتشنج)، ولی در لوپوسِ بی‌دارو هم دیده می‌شود؛ پس به‌تنهایی علت را نشان نمی‌دهد. داروهایی را که در ماه‌های اخیر شروع کرده‌اید به پزشک بگویید و هیچ دارویی را خودسرانه قطع نکنید.";
const CLIFT_RE = /clift|crithidia/i;
const SPECIFIC = ["ANTI_DSDNA", "ANTI_SM", "ANTI_RNP", "ANTI_RO", "ANTI_LA"];

// الگوی فلورسانس (ICAP). عبارتِ «گزارش شده» عمدی است: ارتباط است، نه تشخیص.
const PATTERN_FA = {
  homogeneous: "الگوی هموژن (AC-1) در گزارش‌ها بیشتر با لوپوس و بیماری‌های مرتبط همراه بوده است",
  dfs: "الگوی dense fine speckled (AC-2) اغلب به آنتی‌بادی DFS70 مربوط است؛ در نبودِ آنتی‌بادی‌های اختصاصیِ دیگر ممکن است به نفعِ بیماریِ بافت‌همبند نباشد (تفسیرش با پزشک است)",
  centromere: "الگوی سانترومر (AC-3) با اسکلرودرمی مرتبط گزارش شده است",
  finespeckled: "الگوی fine speckled (AC-4) با آنتی‌بادی‌های Ro/SSA و La/SSB مرتبط است و در لوپوس، اسکلرودرمی، میوزیت و شوگرن دیده شده است",
  coarsespeckled: "الگوی coarse speckled (AC-5) با آنتی‌بادی‌های Sm و U1-RNP مرتبط است (لوپوس، اسکلرودرمی، میوزیت)",
  nucleolar: "الگوی هستکی (nucleolar) در گزارش‌ها بیشتر با اسکلرودرمی (و گاهی میوزیت) همراه بوده است",
  dots: "الگوی نقطه‌ایِ هسته‌ای (AC-6/7) با چند بیماری، از جمله بیماری‌های عضله و صفراوی، گزارش شده است",
  cytoplasmic: "الگوی سیتوپلاسمی (AC-19 تا 21) با آنتی‌بادی‌های سنتتاز مثل Jo-1 و با بیماری‌های دیگر مرتبط گزارش شده است",
  speckled: "الگوی لکه‌ای (speckled) با آنتی‌بادی‌های Ro/La، Sm و RNP مرتبط است؛ آزمایشِ اختصاصی (پنل ENA) مشخص می‌کند کدام",
};

function anaBuild(e, { pregnant }) {
  const st = stateOf(e, ANA_IDS);
  const anaPos = isPos(st.ANA);
  const specificPos = SPECIFIC.some((id) => isPos(st[id]));
  // ANAِ عددی که ≥ ۱۰ برابرِ حدِ چاپ‌شدهٔ همان ردیف است، مثبتِ ضعیف/مرزی نیست: اولویتِ ارجاع به روماتولوژی (MEDICAL_RULES: انتظار تأییدِ بازبین).
  const anaCut = Number(String(st.ANA.reference ?? "").replace(/[٠-٩]/g, (d) => d.charCodeAt(0) - 1632).match(/\d+(?:\.\d+)?/)?.[0]);
  const anaHigh = st.ANA.assay && st.ANA.state === "above" && Number.isFinite(anaCut) && anaCut > 0 && Number(st.ANA.value) >= 10 * anaCut;
  const urgency = urgencyOf(specificPos || anaHigh);
  const parts = ANA_IDS.filter((id) => present(st[id])).map((id) => lineOf(st[id], id));
  if (anaHigh) parts.push(`این عدد حدود ${Math.round(Number(st.ANA.value) / anaCut)} برابرِ مرزِ چاپ‌شدهٔ برگه (${st.ANA.reference}) است، یعنی مثبتِ ضعیف یا مرزی نیست. در این سطح معمولاً ارجاع به روماتولوژیست و بررسیِ علائمِ مفصلی (درد و تورمِ مفصل، خشکیِ صبحگاهی)، پوستی (بثورات، حساسیت به نور) و خشکیِ چشم و دهان لازم است؛ این موضوع از اختلالاتِ جزئیِ دیگرِ برگه (مثلاً تیروئیدِ خفیف یا HDL کمی پایین) اولویتِ بیشتری دارد.`);

  if (anaPos) {
    for (const p of st.ANA.patterns ?? []) if (PATTERN_FA[p]) parts.push(`${PATTERN_FA[p]}.`);
    parts.push(`در معیارهای طبقه‌بندیِ لوپوس (EULAR/ACR 2019) ANA با تیتر ۱:۸۰ یا بیشتر شرطِ ورود به بررسی است و ANAِ منفی برای آن معیارها ورودی نیست؛ ${CRITERIA_NOTE}`);
  }
  if (isPos(st.ANTI_DSDNA) || isPos(st.ANTI_SM)) {
    parts.push("در همان معیارها anti-dsDNA یا anti-Sm هر کدام ۶ امتیاز دارند، به شرطی که آزمایش اختصاصیتِ بالا (دست‌کم ۹۰٪) داشته باشد؛ ولی امتیازدهی علائمِ بالینی هم می‌خواهد و از روی آزمایش به‌تنهایی حساب نمی‌شود.");
  }
  if (isPos(st.ANTI_DSDNA) && CLIFT_RE.test(`${st.ANTI_DSDNA.name ?? ""}`)) parts.push("روشِ CLIFT (روی کریتیدیا) اختصاصی‌ترین روشِ سنجشِ anti-dsDNA است و نتیجهٔ مثبتش شرطِ اختصاصیتِ معیار را برآورده می‌کند.");
  if (isPos(st.ANTI_SM)) parts.push("anti-Sm از آنتی‌بادی‌های بسیار اختصاصی‌تر برای لوپوس است.");
  if (isPos(st.ANTI_HISTONE)) parts.push(HISTONE_TEXT);
  if (isPos(st.ANTI_RNP)) {
    parts.push("تیترِ بالای anti-U1RNP پیش‌شرطِ تقریباً همهٔ معیارهای «بیماری مختلطِ بافت‌همبند» (MCTD) است" +
      (isPos(st.ANTI_SM) ? "؛ ولی در معیار Sharp مثبت‌بودنِ anti-Sm این تشخیص را کنار می‌گذارد، و اینجا هر دو مثبت‌اند" : "") +
      ". تنها از روی این آزمایش حکمی داده نمی‌شود.");
  }
  if (isPos(st.ANTI_RO)) {
    parts.push("در معیارهای شوگرن (ACR/EULAR 2016) فقط anti-SSA/Ro امتیاز دارد (۳ امتیاز؛ anti-SSB امتیاز ندارد) و مجموعِ ۴ یا بیشتر شوگرنِ اولیه را طبقه‌بندی می‌کند؛ بقیهٔ امتیازها از علائمِ خشکیِ چشم و دهان و بررسی‌های تخصصی می‌آید.");
  }
  if (isPos(st.ANTI_RO) || isPos(st.ANTI_LA)) {
    if (pregnant) {
      // P136 پاسخِ بازبین (پرسش ۵، ۲۰۲۶-۱۱-۱۱): درصدها حذف شد — دو منبع (۱–۲٪/۵٪ در برابرِ ~۲٪/~۳٪) ناهم‌خوان‌اند و پیامِ عملی همان پیگیریِ اکو است.
      parts.push("چون باردارید: آنتی‌بادی‌های Ro/SSA و La/SSB در بخشِ کوچکی از بارداری‌ها با بلوکِ مادرزادیِ قلبِ جنین همراه‌اند؛ خطر کم است ولی واقعی، و با پیگیری می‌شود زود آن را دید. دورانِ پرخطر هفتهٔ ۱۶ تا ۲۶ است و راهنمای ACR 2020 در این هفته‌ها اکوکاردیوگرافیِ جنین را توصیه می‌کند. این را حتماً به پزشکِ زنان بگویید.");
    } else if (canBePregnant(e)) {
      parts.push("اگر قصدِ بارداری دارید، پیش از آن به پزشک بگویید: آنتی‌بادی‌های Ro/La می‌توانند در بارداری به قلبِ جنین اثر بگذارند و در هفته‌های ۱۶ تا ۲۶ پیگیریِ ویژه لازم است.");
    }
    if (typeof e.age === "number" && e.age < 1) parts.push("در شیرخوار این آنتی‌بادی‌ها ممکن است از مادر رسیده باشند و لزوماً نشانهٔ بیماریِ خودِ کودک نیستند.");
  }

  if (specificPos) {
    parts.push(
      "آنتی‌بادی‌های اختصاصی‌تر از ANA، وقتی مثبت‌اند، معمولاً باید توسط روماتولوژیست یا متخصص داخلی با علائم شما و آزمایش‌های دیگر (شمارش خون، کلیه، ادرار) تفسیر شوند. " +
      "این نتیجه به‌تنهایی نامِ بیماری نمی‌گذارد؛ مثبت‌شدنِ این آنتی‌بادی‌ها در برخی افرادِ بی‌علامت هم گزارش شده است.");
    if (!present(st.ANA)) parts.push("ANA روی این برگه نیست.");
  } else if (anaPos) {
    parts.push(
      "مثبت‌بودنِ ANA به‌تنهایی بیماری را نشان نمی‌دهد: این آزمایش در بخشی از افرادِ سالم، در بعضی عفونت‌ها و داروها و با بالا رفتنِ سن هم مثبت می‌شود. " +
      "معنای آن به علائم و به آزمایش‌های اختصاصی‌ترِ بعدی بستگی دارد.");
    if (!present(st.ANTI_DSDNA)) parts.push("آزمایشِ anti-dsDNA روی این برگه نیست.");
    if (!present(st.ANTI_RO) && !present(st.ANTI_LA)) parts.push("آنتی‌بادی‌های Ro و La (پنل ENA) هم روی این برگه نیست.");
  } else if (isPos(st.ANTI_HISTONE)) {
    if (!present(st.ANA)) parts.push("ANA روی این برگه نیست.");
  } else if (ANA_IDS.some((id) => isUnsure(st[id]))) {
    parts.push(`${UNSURE_NOTE} ANA و آنتی‌بادی‌های اختصاصی‌ترش (anti-dsDNA، Sm، RNP، Ro، La) برای بررسیِ بیماری‌های خودایمنی‌اند. اگر درد و تورمِ مفصل، بثورات پوستی، حساسیت به نور یا خشکیِ چشم و دهان دارید، آن را با پزشک مطرح کنید.`);
    if (!present(st.ANA)) parts.push("ANA روی این برگه نیست.");
  } else {
    parts.push(
      "این فقط دربارهٔ همین آزمایش‌هاست و دربارهٔ سایر آزمایش‌ها یا علائمِ شما حکمی نمی‌دهد. " +
      "اگر درد و تورمِ مفصل، بثورات پوستی، حساسیت به نور یا خشکیِ چشم و دهان دارید، آن را با پزشک مطرح کنید.");
    if (!present(st.ANA)) parts.push("ANA روی این برگه نیست.");
  }

  const suggest = [];
  if ((anaPos || specificPos) && !present(st.ANTI_DSDNA)) suggest.push("Anti-dsDNA");
  if ((anaPos || specificPos) && !present(st.ANTI_RO) && !present(st.ANTI_LA) && !present(st.ANTI_SM) && !present(st.ANTI_RNP)) suggest.push("پنل ENA (Anti-Sm، Anti-RNP، Anti-Ro، Anti-La)");
  if (specificPos && autoAbState(e, "C3").state === "absent" && autoAbState(e, "C4").state === "absent") suggest.push("C3 و C4");
  if (specificPos || anaHigh) suggest.push("بررسی توسط متخصص روماتولوژی");

  const ex = explainsOf(e, st);
  return {
    pattern: "ana_family_result",
    urgency, action: ACTION[urgency],
    ...(anaPos || specificPos ? { keep_under_blocker: true } : {}),   // P147-۲
    headline: specificPos
      ? "آنتی‌بادی‌های اختصاصیِ هسته‌ای (anti-dsDNA / Sm / RNP / Ro / La) در آزمایش شما مثبت یا بالاتر از مرز است"
      : anaPos ? "آزمایش ANA شما مثبت است"
        : isPos(st.ANTI_HISTONE) ? "آنتی‌بادی ضدِ هیستون در آزمایش شما مثبت یا بالاتر از مرز است"
        : ANA_IDS.some((id) => isUnsure(st[id])) ? "نتیجهٔ آزمایش‌های ANA / آنتی‌بادی‌های هسته‌ای شما" : "آزمایش‌های ANA / آنتی‌بادی‌های هسته‌ای شما منفی است",
    must_say: parts.join(" "),
    suggest,
    warnings: anaPos || specificPos ? [CAUTION_DRUG] : [],
    ...(ex.length ? { explains: ex } : {}),
  };
}

// ═══════════ ۲) ANCA ═══════════
const ANCA_IDS = ["C_ANCA", "P_ANCA", "ANCA", "MPO", "PR3"];

function ancaBuild(e) {
  const st = stateOf(e, ANCA_IDS);
  const pos = ANCA_IDS.some((id) => isPos(st[id]));
  const urgency = urgencyOf(pos);
  const parts = ANCA_IDS.filter((id) => present(st[id])).map((id) => lineOf(st[id], id));

  if (pos) {
    parts.push(
      "ANCA و آنتی‌بادی‌های MPO و PR3 به پزشک کمک می‌کنند گروهی از بیماری‌های التهابِ رگ را بررسی کند؛ نتیجهٔ مثبت به‌تنهایی تشخیص نیست و باید با علائم، کلیه و ادرار تفسیر شود.");
    if (isPos(st.PR3) || isPos(st.C_ANCA)) parts.push("الگوی PR3 / c-ANCA بیشتر با گرانولوماتوز با پلی‌آنژئیت (GPA) همراه گزارش شده است.");
    if (isPos(st.MPO) || isPos(st.P_ANCA)) parts.push("الگوی MPO / p-ANCA بیشتر با پلی‌آنژئیتِ میکروسکوپی (MPA) یا EGPA همراه گزارش شده است.");
    if (isPos(st.P_ANCA) && !present(st.MPO) && !isPos(st.MPO)) {
      parts.push("p-ANCA بدونِ MPO ماهیتِ غیرواسکولیتی هم می‌تواند داشته باشد و در بیماری‌های التهابیِ روده و کبدِ خودایمنی دیده می‌شود؛ برای اطمینان آزمایشِ اختصاصی MPO لازم است.");
    }
    const missing = ["MPO", "PR3"].filter((id) => !present(st[id]));
    if (missing.length) parts.push(`${missing.join(" و ")} روی این برگه نیست؛ پزشک معمولاً ${missing.length === 2 ? "این دو را" : "آن را"} هم می‌خواهد.`);
    const cr = e.graded?.find((g) => g.test === "CREAT" && g.value != null);
    parts.push(
      !cr ? "کراتینین (و آزمایش ادرار) روی این برگه نیست؛ برای تفسیرِ این نتیجه پزشک معمولاً هر دو را می‌خواهد."
        : cr.abnormal ? "کراتینینِ روی همین برگه هم بیرون از محدودهٔ مرجع است؛ این را حتماً به پزشک بگویید."
          : "کراتینینِ روی همین برگه داخلِ محدودهٔ مرجع است.");
  } else if (ANCA_IDS.some((id) => isUnsure(st[id]))) {
    parts.push(UNSURE_NOTE + " اگر علائمِ مداومی مثل خون در ادرار، سرفهٔ خونی، التهابِ سینوس یا بی‌حسیِ اندام دارید، با پزشک مطرح کنید.");
  } else {
    parts.push(
      "این فقط دربارهٔ همین آزمایش‌هاست و منفی‌بودنِ آن‌ها همهٔ بیماری‌های التهابِ رگ را رد نمی‌کند؛ اگر شکِ بالینیِ قوی باشد پزشک ممکن است آزمایشِ دومی (روشِ دیگر) بخواهد. " +
      "اگر علائمِ مداومی مثل خون در ادرار، سرفهٔ خونی، التهابِ سینوس یا بی‌حسیِ اندام دارید، با پزشک مطرح کنید.");
  }

  const suggest = [];
  if (pos) {
    if (!present(st.MPO)) suggest.push("Anti-MPO");
    if (!present(st.PR3)) suggest.push("Anti-PR3");
    if (!e.graded?.some((g) => g.test === "CREAT")) suggest.push("کراتینین");
    suggest.push("بررسی توسط متخصص روماتولوژی");
  }
  const ex = explainsOf(e, st);
  return {
    pattern: "anca_result",
    urgency, action: ACTION[urgency],
    headline: pos ? "آزمایش ANCA (یا MPO / PR3) شما مثبت یا بالاتر از مرز است" : ANCA_IDS.some((id) => isUnsure(st[id])) ? "نتیجهٔ آزمایش ANCA (یا MPO / PR3) شما" : "آزمایش ANCA شما منفی است",
    must_say: parts.join(" "),
    suggest,
    warnings: pos ? ["اگر خون در ادرار، سرفهٔ خونی یا تنگی نفسِ ناگهانی پیدا کردید، همان روز به اورژانس مراجعه کنید."] : [],
    ...(ex.length ? { explains: ex } : {}),
  };
}

// ═══════════ ۳) HLA-B27 ═══════════
function b27Build(e) {
  const a = autoAbState(e, "HLA_B27");
  const nm = label(a, "HLA_B27");
  if (a.state === "pos") {
    return {
      pattern: "hla_b27_result", urgency: "routine", action: ACTION.routine,
      headline: "آزمایش HLA-B27 شما مثبت است",
      must_say:
        `نتیجهٔ ${nm} روی برگهٔ شما «${a.raw}» است. HLA-B27 یک ژن است، نه بیماری، و در حدود ۸ تا ۱۰ درصد سفیدپوستانِ کاملاً سالم هم دیده می‌شود؛ مثبت‌بودنش به‌تنهایی بیماری را نشان نمی‌دهد. ` +
        "در معیارهای ASAS برای اسپوندیلیتِ محوری، HLA-B27 همراه با دست‌کم دو ویژگیِ بالینی یک مسیر است؛ ویژگی‌ها شامل دردِ التهابیِ کمر (شروع پیش از ۴۵ سالگی و بیش از ۳ ماه، با استراحت بدتر و با حرکت بهتر)، آرتریتِ مفاصلِ محیطی، التهابِ پاشنه، التهابِ مکررِ چشم (یووئیت)، التهابِ انگشت، پسوریازیس، بیماریِ التهابیِ روده، پاسخِ خوب به داروی ضدالتهاب، سابقهٔ خانوادگی و CRP بالا است. " +
        "اگر چنین علائمی دارید، آن را با پزشک مطرح کنید.",
      suggest: [], warnings: [],
    };
  }
  return {
    pattern: "hla_b27_result", urgency: "routine", action: ACTION.routine,
    headline: "آزمایش HLA-B27 شما منفی است",
    must_say:
      `نتیجهٔ ${nm} روی برگهٔ شما «${a.raw}» است. منفی‌بودنِ این ژن بیماری‌های التهابیِ مفصل و ستون فقرات را رد نمی‌کند؛ ` +
      "اگر علائمِ مداوم دارید، تصمیم با پزشک است.",
    suggest: [], warnings: [],
  };
}

// ═══════════ ۴) Anti-CCP ═══════════
// فوریتش عمداً routine است، هم‌سطحِ rf_positive: وگرنه دو یافتهٔ روماتیسمی دو زمان‌بندیِ رقیب می‌داد (N20).
function rfLine(e) {
  const g = e.graded?.find((x) => x.test === "RF" && x.value != null);
  if (g) return g.abnormal && g.dir === "high" ? "RF روی همین برگه هم بالاتر از محدودهٔ مرجع است." : "RF روی همین برگه داخلِ محدودهٔ مرجع است.";
  const q = Object.entries(e.qual ?? {}).find(([n]) => /^(rf|rheumatoidfactor|rafactor)$/i.test(String(n).toLowerCase().replace(/[\s.\-_()/]/g, "")));
  return q ? `RF روی همین برگه «${String(q[1]).trim()}» گزارش شده است.` : "RF روی این برگه نیست.";
}

/** ACR/EULAR 2010: مثبتِ ضعیف = بالاتر از ULN تا ۳×ULN، قوی = بیش از ۳×ULN — ULN از محدودهٔ چاپ‌شدهٔ همان ردیف. */
function ccpStrength(a) {
  if (!a.assay || a.state !== "above") return a.assay ? null : "word";
  if (a.titreRow) return null;   // specs/023: تیتر در برابرِ تیترِ چاپی — مضربِ ULN معنا ندارد
  const pr = parseReference(a.reference);
  const uln = pr?.hi;
  if (uln == null || !(uln > 0) || a.cmp) return null;
  return a.value > 3 * uln ? "strong" : "weak";
}

function ccpBuild(e) {
  const a = autoAbState(e, "ANTI_CCP");
  const line = lineOf(a, "ANTI_CCP");
  const ex = e.ungraded?.ANTI_CCP?.reason === "assay_printed" ? { explains: ["ANTI_CCP"] } : {};
  if (isPos(a)) {
    const s = ccpStrength(a);
    const strength =
      s === "strong" ? "این عدد بیش از ۳ برابرِ حدِ بالای چاپ‌شدهٔ برگه است (مثبتِ قوی؛ در معیار ۲۰۱۰ ACR/EULAR ۳ امتیاز). "
        : s === "weak" ? "این عدد بالاتر از حدِ بالا ولی تا ۳ برابرِ آن است (مثبتِ ضعیف؛ در معیار ۲۰۱۰ ۲ امتیاز). "
          : s === "word" ? "وقتی آزمایشگاه فقط «مثبت» می‌نویسد، در معیار ۲۰۱۰ مثبتِ ضعیف (۲ امتیاز) شمرده می‌شود. " : "";
    return {
      pattern: "anti_ccp_result", urgency: "routine", action: ACTION.routine,
      headline: "آزمایش Anti-CCP شما مثبت یا بالاتر از مرز است",
      must_say:
        `${line} ${strength}Anti-CCP برای روماتیسم مفصلی اختصاصی‌تر از RF است و می‌تواند سال‌ها پیش از علائمِ مفصلی مثبت شود، ولی مثبت‌بودنش به‌تنهایی تشخیص نیست: ` +
        "در معیار ۲۰۱۰ دست‌کم یک مفصلِ دارای التهابِ بالینی لازم است و مجموعِ امتیاز (مفصل‌ها، RF و Anti-CCP، CRP یا ESR، و مدت علائم ≥ ۶ هفته) باید ۶ یا بیشتر باشد؛ این را پزشک با معاینه حساب می‌کند. " +
        `${rfLine(e)} اگر تورم یا خشکیِ صبحگاهیِ مفاصل دارید، آن را به پزشک بگویید؛ بررسیِ زودهنگام در این بیماری اهمیت دارد.`,
      suggest: ["بررسی توسط متخصص روماتولوژی"], warnings: [], ...ex,
    };
  }
  return {
    pattern: "anti_ccp_result", urgency: "routine", action: ACTION.routine,
    headline: isUnsure(a) ? "نتیجهٔ آزمایش Anti-CCP شما" : "آزمایش Anti-CCP شما منفی یا داخلِ محدودهٔ چاپ‌شده است",
    must_say: isUnsure(a)
      ? `${line} ${UNSURE_NOTE} Anti-CCP برای روماتیسم مفصلی اختصاصی‌تر از RF است. ${rfLine(e)} اگر تورم یا خشکیِ صبحگاهیِ مفاصل دارید، آن را به پزشک بگویید.`
      : `${line} این فقط دربارهٔ همین آزمایش است و روماتیسم مفصلی را رد نمی‌کند؛ بخشی از بیماران Anti-CCP منفی دارند. ${rfLine(e)} ` +
        "اگر تورم یا خشکیِ صبحگاهیِ مفاصل دارید، تصمیم با پزشک است.",
    suggest: [], warnings: [], ...ex,
  };
}

// ═══════════ ۵) کمپلمان C3 / C4 ═══════════
// فقط در برابرِ بازهٔ چاپ‌شدهٔ همان ردیف؛ جهتِ مهم «پایین» است (C1). پایین ⇒ this_week؛ بالا/داخل ⇒ routine.
function complementBuild(e) {
  const c3 = autoAbState(e, "C3"), c4 = autoAbState(e, "C4"), ch50 = autoAbState(e, "CH50");
  const items = [["C3", c3], ["C4", c4]].filter(([, a]) => present(a));
  const all = [...items, ...(present(ch50) ? [["CH50", ch50]] : [])];
  const ch50Low = ch50.state === "below";
  const low = items.some(([, a]) => a.state === "below") || ch50Low;
  const c34Low = items.some(([, a]) => a.state === "below");
  const bothLow = c3.state === "below" && c4.state === "below";
  const lines = all.map(([id, a]) => {
    if (isUnsure(a)) return lineOf(a, id);   // بی‌محدودهٔ چاپی / مرزی: «داخل/بالا/پایین» نگو
    const num = `${a.shown}${a.unit ? ` ${a.unit}` : ""}`;
    const where = a.state === "below" ? "پایین‌تر از" : a.state === "above" ? "بالاتر از" : "داخلِ";
    return `${faName(id)} روی برگهٔ شما ${num} است و ${where} محدودهٔ چاپ‌شدهٔ همان ردیف است.`;
  });
  const parts = [...lines];
  // specs/023 (P136): CH50ِ پایین کنارِ C3 و C4ِ داخلِ محدوده الگوی کمبودِ ارثیِ یکی از اجزای کمپلمان است، نه مصرف در فعالیتِ لوپوس.
  if (ch50Low && !c34Low) {
    const c34Normal = c3.state === "within" && c4.state === "within";
    parts.push((c34Normal
      ? "CH50 فعالیتِ کلِ مسیرِ کلاسیکِ کمپلمان را می‌سنجد. پایین بودنش در حالی که C3 و C4 داخلِ محدوده‌اند بیشتر به کمبودِ (اغلب ارثیِ) یکی از اجزای دیگرِ کمپلمان اشاره دارد؛ کمبودِ اجزای انتهایی با عفونت‌های مکررِ مننگوکوکی و کمبودِ اجزای ابتدایی با لوپوسِ زودرس همراه گزارش شده است. "
      : "CH50 فعالیتِ کلِ مسیرِ کلاسیکِ کمپلمان را می‌سنجد و پایین بودنش یعنی یکی از اجزای این مسیر کم است یا مصرف شده؛ C3 و C4 کمک می‌کنند معلوم شود کدام. " +
        (items.length ? "" : "C3 و C4 روی این برگه نیست. ")) +
      "نمونهٔ دیرمانده یا گرم‌شده هم CH50 را به‌طورِ کاذب پایین نشان می‌دهد، پس معمولاً تکرار می‌شود. این نتیجه را با متخصصِ ایمونولوژی بالینی یا روماتولوژی مطرح کنید.");
  } else if (c34Low) {
    parts.push(
      "کمپلمان بخشی از دستگاه ایمنی است و در بعضی بیماری‌های خودایمنی با فعالیتِ بیماری مصرف می‌شود و پایین می‌آید؛ " +
      "ولی علت‌های دیگری هم دارد (مثل بیماری شدید کبدی، سوءتغذیه، یا کمبودِ ارثی). این نتیجه به‌تنهایی تشخیص نیست و باید کنارِ علائم، آزمایش ادرار، کراتینین و آنتی‌بادی‌هایی مثل anti-dsDNA تفسیر شود. " +
      `در معیارهای طبقه‌بندیِ لوپوس (EULAR/ACR 2019) پایین‌بودنِ C3 یا C4 ۳ امتیاز و پایین‌بودنِ هر دو ۴ امتیاز دارد${bothLow ? " (اینجا هر دو پایین‌اند)" : ""}؛ افتِ پایدار و روندِ سریالِ آن‌ها با فعالیتِ بیماری، به‌ویژه درگیریِ کلیه، هماهنگ است.`);
    if (autoAbState(e, "ANTI_DSDNA").state === "absent") parts.push("anti-dsDNA روی این برگه نیست.");
  } else if (items.some(([, a]) => isUnsure(a))) {
    parts.push(UNSURE_NOTE + " کمپلمان (C3 و C4) بخشی از دستگاه ایمنی است؛ پایین بودنش در بعضی بیماری‌های خودایمنی دیده می‌شود و بالا بودنش معمولاً بازتابِ التهاب است، ولی بدونِ محدودهٔ مرجعِ چاپی نمی‌توان گفت این عدد کدام است.");
  } else {
    parts.push("بالا بودنِ کمپلمان معمولاً بازتابِ التهاب یا عفونت است (جزو واکنش‌گرهای فازِ حاد)، و داخلِ محدوده بودنش فقط دربارهٔ همین عدد است.");
  }
  if (items.length === 1) parts.push(`${items[0][0] === "C3" ? "C4" : "C3"} روی این برگه نیست.`);
  // N18: CH50ِ تنها هم یافته می‌سازد؛ متنِ «بالا/داخل» برای CH50ِ تنها از شاخهٔ پیش‌فرض می‌آید.
  const urgency = urgencyOf(low);
  return {
    pattern: "complement_result", urgency, action: ACTION[urgency],
    ...(c34Low ? { keep_under_blocker: true } : {}),   // P147-۲
    headline: c34Low ? "کمپلمان C3 یا C4 شما پایین‌تر از محدودهٔ چاپ‌شده است" : ch50Low ? "فعالیتِ کلِ کمپلمان (CH50) شما پایین‌تر از محدودهٔ چاپ‌شده است" : present(ch50) && !items.length ? "نتیجهٔ کمپلمانِ کل (CH50) شما" : "نتیجهٔ کمپلمان (C3 / C4) شما",
    must_say: parts.join(" "),
    suggest: [], warnings: low ? [CAUTION_DRUG] : [],
    explains: all.map(([id]) => id),
  };
}

// ═══════════ ۶) اسکلرودرمی: Scl-70 و سانترومر ═══════════
const SSC_IDS = ["SCL70", "ANTI_CENTROMERE"];
function sscBuild(e) {
  const st = stateOf(e, SSC_IDS);
  const pos = SSC_IDS.some((id) => isPos(st[id]));
  const urgency = urgencyOf(pos);
  const parts = SSC_IDS.filter((id) => present(st[id])).map((id) => lineOf(st[id], id));
  parts.push(
    "در معیارهای اسکلرودرمی (ACR/EULAR 2013) آنتی‌بادی‌های anti-centromere، anti-topoisomerase I (Scl-70) و anti-RNA polymerase III روی هم حداکثر ۳ امتیاز دارند و حدِ طبقه‌بندی مجموعِ ۹ امتیاز است؛ " +
    "ضخیم‌شدگیِ پوستِ انگشتانِ هر دو دست خودش ۹ امتیاز است. مثبت‌بودنِ یک آنتی‌بادی به‌تنهایی برای تشخیص کافی نیست و در بستر بالینی تفسیر می‌شود.");
  if (isPos(st.SCL70)) parts.push("Scl-70 مثبت در گزارش‌ها بیشتر با درگیریِ وسیع‌ترِ پوست و خطرِ درگیریِ ریه همراه بوده است؛ پزشک ممکن است بررسیِ ریه (اسپیرومتری و سی‌تی) بخواهد.");
  if (isPos(st.ANTI_CENTROMERE)) parts.push("آنتی‌بادی سانترومر بیشتر با فرمِ محدودِ اسکلرودرمی همراه گزارش شده است.");
  if (pos) {
    for (const [id, nm] of [["SCL70", "Scl-70"], ["ANTI_CENTROMERE", "anti-centromere"]]) if (!present(st[id])) parts.push(`${nm} روی این برگه نیست.`);
  } else if (SSC_IDS.some((id) => isUnsure(st[id]))) {
    parts.push(UNSURE_NOTE + " اگر ضخیم‌شدنِ پوست انگشتان، سردی و تغییر رنگِ انگشتان (رینود) یا زخم انگشت دارید، با پزشک مطرح کنید.");
  } else {
    parts.push("این فقط دربارهٔ همین آزمایش‌هاست؛ اگر ضخیم‌شدنِ پوست انگشتان، سردی و تغییر رنگِ انگشتان (رینود) یا زخم انگشت دارید، با پزشک مطرح کنید.");
  }
  const ex = explainsOf(e, st);
  return {
    pattern: "ssc_antibody_result", urgency, action: ACTION[urgency],
    headline: pos ? "آنتی‌بادی مرتبط با اسکلرودرمی (Scl-70 / سانترومر) در آزمایش شما مثبت است" : SSC_IDS.some((id) => isUnsure(st[id])) ? "نتیجهٔ آنتی‌بادی‌های مرتبط با اسکلرودرمی (Scl-70 / سانترومر)" : "آنتی‌بادی‌های مرتبط با اسکلرودرمی (Scl-70 / سانترومر) منفی است",
    must_say: parts.join(" "),
    suggest: pos ? ["بررسی توسط متخصص روماتولوژی"] : [], warnings: pos ? [CAUTION_DRUG] : [],
    ...(ex.length ? { explains: ex } : {}),
  };
}

// ═══════════ ۷) Jo-1 (میوزیت) ═══════════
function jo1Build(e) {
  const a = autoAbState(e, "JO1");
  const line = lineOf(a, "JO1");
  const ex = e.ungraded?.JO1?.reason === "assay_printed" ? { explains: ["JO1"] } : {};
  if (isPos(a)) {
    return {
      pattern: "myositis_antibody_result", urgency: "this_week", action: ACTION.this_week,
      headline: "آزمایش Anti-Jo-1 شما مثبت یا بالاتر از مرز است",
      must_say:
        `${line} Jo-1 نشانگرِ «سندرم آنتی‌سنتتاز» است؛ تظاهراتِ شایعش میوزیت (ضعفِ عضلهٔ شانه و ران)، درگیریِ بافتِ ریه و آرتریت است و گاهی با تب، رینود و ترک‌خوردگیِ پوستِ انگشتان (دست‌های مکانیک) همراه است. ` +
        "در معیارهای میوزیت (ACR/EULAR 2017) Jo-1 مثبت ۳٫۹ امتیاز (بدونِ بیوپسی) دارد؛ ولی مثبت‌بودنِ یک آنتی‌بادی به‌تنهایی تشخیص نیست و با علائم، آنزیم‌های عضله (CK) و بررسیِ ریه تفسیر می‌شود. " +
        (e.graded?.some((g) => g.test === "CK" && g.value != null) ? "CK روی همین برگه هست و باید همراهِ آن دیده شود. " : "CK روی این برگه نیست. ") +
        "اگر ضعفِ عضله یا تنگیِ نفسِ تازه دارید، آن را بگویید.",
      suggest: ["بررسی توسط متخصص روماتولوژی"], warnings: [CAUTION_DRUG], ...ex,
    };
  }
  return {
    pattern: "myositis_antibody_result", urgency: "routine", action: ACTION.routine,
    headline: isUnsure(a) ? "نتیجهٔ آزمایش Anti-Jo-1 شما" : "آزمایش Anti-Jo-1 شما منفی یا داخلِ محدودهٔ چاپ‌شده است",
    must_say: isUnsure(a)
      ? `${line} ${UNSURE_NOTE} Jo-1 نشانگرِ «سندرم آنتی‌سنتتاز» (میوزیت، درگیریِ ریه، آرتریت) است. اگر ضعفِ عضله یا تنگیِ نفسِ تازه دارید، با پزشک مطرح کنید.`
      : `${line} این فقط دربارهٔ همین آزمایش است و میوزیت را رد نمی‌کند؛ آنتی‌بادی‌های دیگری هم هستند که در این آزمایش دیده نمی‌شوند. اگر ضعفِ عضله یا تنگیِ نفسِ تازه دارید، با پزشک مطرح کنید.`,
    suggest: [], warnings: [], ...ex,
  };
}

// ═══════════ ۸) آنتی‌فسفولیپید ═══════════
const APL_IDS = ["LUPUS_AC", "ACL_IGG", "ACL_IGM", "ACL", "B2GPI_IGG", "B2GPI_IGM", "B2GPI", "ACL_IGA"];
// specs/023 (P136، راهنمای کاربر): تیترِ ELISA در معیارِ ACR/EULAR 2023 — ۴۰–۷۹ متوسط، ≥ ۸۰ بالا؛ زیرِ ۴۰ شمرده نمی‌شود.
export const APS_MODERATE = 40, APS_HIGH = 80;
const APS_BAND_IDS = ["ACL_IGG", "ACL_IGM", "B2GPI_IGG", "B2GPI_IGM"];
const APS_UNIT_RE = /^(gpl|mpl|u|u\/ml|gplu|mplu|gpl\/ml|mpl\/ml|gplu\/ml|mplu\/ml)$/i;
function apsBand(a) {
  if (!a.assay || a.state !== "above" || a.cmp || a.titreRow || !APS_UNIT_RE.test(String(a.unit ?? "").replace(/\s+/g, ""))) return null;
  return a.value >= APS_HIGH ? "high" : a.value >= APS_MODERATE ? "moderate" : "low";
}
const APS_BAND_FA = {
  low: "بالاتر از مرزِ آزمایشگاه است ولی زیرِ ۴۰ واحد، یعنی کمتر از سطحی که معیارِ ۲۰۲۳ می‌شمارد؛ با این حال باید ۱۲ هفته بعد تکرار شود",
  moderate: "در محدودهٔ «متوسط» معیارِ ۲۰۲۳ (۴۰ تا ۷۹ واحد) است",
  high: "در محدودهٔ «بالا»ی معیارِ ۲۰۲۳ (۸۰ واحد یا بیشتر) است",
};
function aplBuild(e) {
  const st = stateOf(e, APL_IDS);
  // specs/023: کاردیولیپین IgA جزو آنتی‌بادی‌های معیارِ APS نیست ⇒ IgAِ تنها «این هفته» نمی‌گیرد.
  const pos = APL_IDS.some((id) => id !== "ACL_IGA" && isPos(st[id]));
  const igaOnly = !pos && isPos(st.ACL_IGA);
  const urgency = urgencyOf(pos);
  const parts = APL_IDS.filter((id) => present(st[id])).map((id) => lineOf(st[id], id));
  const posOf = (ids) => ids.some((id) => isPos(st[id]));
  const la = isPos(st.LUPUS_AC), acl = posOf(["ACL_IGG", "ACL_IGM", "ACL"]), b2 = posOf(["B2GPI_IGG", "B2GPI_IGM", "B2GPI"]);
  if (pos) {
    parts.push(
      "آنتی‌بادی‌های آنتی‌فسفولیپید (لوپوس‌آنتی‌کوآگولان، کاردیولیپین و بتا-۲ گلیکوپروتئین I) با خطرِ لخته شدنِ خون و عوارضِ بارداری مرتبط‌اند. " +
      "مثبت‌بودنِ یک نوبت کافی نیست: باید دست‌کم ۱۲ هفته بعد با نمونهٔ مستقل تکرار و تأیید شود (معیار Sydney)، و نوعِ IgG وزنِ بیشتری از IgM دارد. " +
      "در معیارهای ۲۰۲۳ ACR/EULAR برای روشِ ELISA تیترِ متوسط ۴۰ تا ۷۹ و بالا ۸۰ واحد یا بیشتر است (واحد و روشِ آزمایشگاهِ شما ممکن است فرق کند، پس به محدودهٔ چاپ‌شدهٔ برگه تکیه کنید)؛ " +
      "طبقه‌بندیِ سندرم آنتی‌فسفولیپید به یک رویدادِ بالینی (لخته یا عارضهٔ بارداری) هم نیاز دارد و از روی آزمایش به‌تنهایی حاصل نمی‌شود.");
    for (const id of APS_BAND_IDS) {
      const b = apsBand(st[id]);
      if (b) parts.push(`${faName(id)} (${st[id].shown} ${st[id].unit}) ${APS_BAND_FA[b]}.`);
    }
    if (isPos(st.ACL_IGA)) parts.push("کاردیولیپین IgA جزو آنتی‌بادی‌های معیارِ طبقه‌بندیِ سندرم آنتی‌فسفولیپید نیست و به‌تنهایی وزنی ندارد.");
    if (la && acl && b2) parts.push("مثبت‌بودنِ هر سه آزمایش (لوپوس‌آنتی‌کوآگولان، کاردیولیپین و بتا-۲ گلیکوپروتئین I) پرخطرترین الگو شمرده می‌شود.");
    for (const [id, nm] of [["LUPUS_AC", "لوپوس‌آنتی‌کوآگولان"]]) if (!present(st[id])) parts.push(`${nm} روی این برگه نیست.`);
    if (!APL_IDS.some((id) => /^ACL/.test(id) && present(st[id]))) parts.push("کاردیولیپین روی این برگه نیست.");
    if (!APL_IDS.some((id) => /^B2GPI/.test(id) && present(st[id]))) parts.push("بتا-۲ گلیکوپروتئین I روی این برگه نیست.");
  } else if (igaOnly) {
    parts.push("کاردیولیپین IgA جزو آنتی‌بادی‌های معیارِ طبقه‌بندیِ سندرم آنتی‌فسفولیپید نیست و به‌تنهایی وزنی ندارد؛ آزمایش‌های معیار لوپوس‌آنتی‌کوآگولان، کاردیولیپین IgG/IgM و بتا-۲ گلیکوپروتئین I IgG/IgM‌اند و پزشک تصمیم می‌گیرد لازم است یا نه.");
  } else if (APL_IDS.some((id) => isUnsure(st[id]))) {
    parts.push(UNSURE_NOTE + " آنتی‌فسفولیپید (لوپوس‌آنتی‌کوآگولان، کاردیولیپین، بتا-۲ گلیکوپروتئین I) با خطرِ لخته و عوارضِ بارداری مرتبط است و مثبت‌بودنش باید ۱۲ هفته بعد تأیید شود.");
  } else {
    parts.push("این فقط دربارهٔ همین آزمایش‌هاست؛ سندرم آنتی‌فسفولیپید با سه آزمایش (لوپوس‌آنتی‌کوآگولان، کاردیولیپین، بتا-۲ گلیکوپروتئین I) بررسی می‌شود و منفی‌بودنِ یکی از آن‌ها بقیه را رد نمی‌کند.");
  }
  // specs/023 (P136): لوپوس‌آنتی‌کوآگولان آزمایشِ انعقادی است و داروهای ضدانعقاد (هپارین، وارفارین، داروهای خوراکیِ تازه) نتیجه‌اش را مخدوش می‌کنند؛ ELISA نه.
  if (present(st.LUPUS_AC)) parts.push("نتیجهٔ لوپوس‌آنتی‌کوآگولان زیرِ اثرِ داروهای ضدانعقاد (هپارین، وارفارین و داروهای خوراکیِ جدید) قابلِ اعتماد نیست؛ اگر چنین دارویی مصرف می‌کنید به پزشک بگویید. سنجش‌های کاردیولیپین و بتا-۲ گلیکوپروتئین I از این داروها اثر نمی‌پذیرند.");
  const ex = explainsOf(e, st);
  return {
    pattern: "antiphospholipid_result", urgency, action: ACTION[urgency],
    headline: pos ? "آنتی‌بادی آنتی‌فسفولیپید در آزمایش شما مثبت یا بالاتر از مرز است" : igaOnly ? "کاردیولیپین IgA شما بالاتر از مرز است" : APL_IDS.some((id) => isUnsure(st[id])) ? "نتیجهٔ آزمایش‌های آنتی‌فسفولیپید شما" : "آزمایش‌های آنتی‌فسفولیپید شما منفی یا داخلِ محدودهٔ چاپ‌شده است",
    must_say: parts.join(" "),
    suggest: pos ? ["بررسی توسط متخصص روماتولوژی"] : [],
    warnings: pos ? ["بدونِ نظرِ پزشک داروی ضدانعقاد یا آسپرین را شروع یا قطع نکنید."] : [],
    ...(ex.length ? { explains: ex } : {}),
  };
}

// ═══════════ ۹) تومورمارکرها ═══════════
const TM_IDS = ["CEA", "AFP", "CA125", "CA199", "CA153", "B2M", "CALCITONIN", "CGA"];
const TM_CONTEXT = {
  // specs/019 — سه متنِ CEA/CA 125/CA 15-3 فقط از عبارت‌هایی ساخته شده‌اند که منبعشان در این نشست باز و خوانده شد
  //   (MEDICAL_RULES_TUMOR_MARKERS.md، ردیف‌های V1–V16). «سیگاری‌ها»ی CEA، «آسیت»ی CA 125 و «فقط»ِ CA 15-3 در هیچ منبعِ بازشده‌ای نبود ⇒ برداشته شد.
  CEA: "CEA برای غربالگریِ سرطانِ رودهٔ بزرگ در افرادِ سالم به‌کار نمی‌رود؛ از کاربردهایش پیگیریِ بیمارِ شناخته‌شدهٔ سرطانِ رودهٔ بزرگ پس از درمان و پایشِ درمانِ بیماریِ پیشرفته است. بعضی بیماری‌های خوش‌خیم هم می‌توانند آن را بالا ببرند.",
  AFP: "در بیمارانِ مبتلا به سیروز، پایشِ سرطانِ کبد با سونوگرافیِ هر ۶ ماه، با AFP یا بدونِ آن، توصیه می‌شود؛ AFP برای غربالگریِ جمعیتِ عمومی به‌کار نمی‌رود.",
  CA125: "CA 125 برای غربالگریِ سرطانِ تخمدان در زنانِ بی‌علامت توصیه نمی‌شود. در شرایطِ غیرسرطانی هم می‌تواند بالا برود — مثلاً در قاعدگی و بارداری، کیستِ تخمدان، اندومتریوز و فیبرومِ رحم، التهابِ لگن و برخی بیماری‌های کبد، کلیه و قلب — و پیش از یائسگی اختصاصی‌بودنش کمتر است.",
  CA199: "CA 19-9 غربالگری نیست و در افرادِ بی‌علامت ارزشِ پیش‌بینیِ بسیار پایینی دارد. انسدادِ صفراوی، پانکراتیت، کلانژیت و نارسایی کلیه آن را بالا می‌برند. حدود ۱۰ درصدِ افراد فنوتیپِ Lewis-منفی‌اند و این نشانگر را کم یا اصلاً نمی‌سازند، پس نتیجهٔ طبیعی در آن‌ها اطمینان‌بخش نیست.",
  CA153: "نشانگرهای خونی برای تشخیصِ زودهنگامِ سرطانِ پستان کاربردی ندارند و CA 15-3 هم از این قاعده بیرون نیست؛ در بیماریِ پیشرفتهٔ شناخته‌شده می‌تواند همراهِ تصویربرداری و معاینه برای پایشِ درمان به‌کار رود. بعضی بیماری‌های خوش‌خیم هم می‌توانند آن را بالا ببرند، و پس از شروعِ شیمی‌درمانی ممکن است چند هفته موقتاً بالا برود.",
  B2M: "بتا-۲ میکروگلوبولین را پزشک کنارِ سایر آزمایش‌ها و وضعیتِ بالینی تفسیر می‌کند؛ بالا بودنش به‌تنهایی تشخیصِ بیماری نیست.",
  CALCITONIN: "کلسی‌تونین نشانگرِ سرطانِ مدولاریِ تیروئید است و در پیگیریِ ندولِ تیروئید گاهی به‌کار می‌رود؛ دربارهٔ لزومِ آن در ندول بینِ متخصصان اختلاف‌نظر هست. نارسایی مزمنِ کلیه، پرکاریِ پاراتیروئید و تیروئیدیتِ خودایمنی هم می‌توانند آن را بالا ببرند.",
  CGA: "کروموگرانین A را پزشک کنارِ سایر آزمایش‌ها و وضعیتِ بالینی تفسیر می‌کند؛ بالا بودنش به‌تنهایی تشخیصِ بیماری نیست.",
};

const AFP_PREGNANT = "در بارداری AFP به‌طورِ طبیعی بالا می‌رود و با محدودهٔ بزرگسالِ غیرباردار سنجیده نمی‌شود؛ معنای آن در بارداری با غربالگریِ بارداری (MoM برای همان هفتهٔ بارداری) روشن می‌شود، پس این عدد را به پزشک یا مامای پیگیرِ بارداری‌تان نشان دهید.";

const CA125_MALE = "CA 125 آزمایشِ مخصوصِ سرطانِ تخمدان است و جنسِ ثبت‌شده برای این برگه مرد است؛ اگر این برگه مالِ شخصِ دیگری نیست، جنسِ پروفایل را بررسی کنید و برگه را به پزشک نشان دهید.";

// کلیدها عمداً بیرون از tmBuild: RULE_READS سورسِ build را می‌خواند و «ALP» در آن، ALPِ پایین را بی‌توضیح «پوشش‌داده» می‌کرد (N56).
function ca199CholestasisSentence(e) {
  const hi = ["BILI_T", "BILI_D", "ALP", "GGT"].filter((k) => gradedOf(e, k)?.dir === "high");
  if (!hi.length) return [];
  return [`روی همین برگه ${hi.map((k) => faName(k)).join(" و ")} هم بالاتر از حد طبیعی است. انسدادِ مجاریِ صفراوی یا التهابِ آن‌ها می‌تواند CA 19-9 را بدونِ سرطان هم بالا ببرد؛ پس پزشک این عدد را کنارِ آزمایش‌های کبد و صفرا می‌خواند و اگر لازم شد پس از برطرف‌شدنِ مشکلِ صفراوی دوباره می‌سنجد.`];
}

function calcitoninHigh(a) {
  // فقط با واحدِ چاپیِ pg/mL (یا ng/L) — بی‌واحد عدد مقایسه نمی‌شود (N3).
  return a.assay && !a.cmp && typeof a.value === "number" && /^(pg\/ml|ng\/l)$/i.test(String(a.unit ?? "").replace(/\s/g, "")) && a.value > 100;
}

function tmBuild(e) {
  const st = stateOf(e, TM_IDS);
  const items = TM_IDS.filter((id) => present(st[id]));
  const calcHi = calcitoninHigh(st.CALCITONIN);
  const above = items.some((id) => st[id].state === "above") || calcHi;
  const urgency = urgencyOf(above);
  const parts = items.map((id) => lineOf(st[id], id));
  // P132-ب: AFP روی پروفایلِ باردار ⇒ جملهٔ بارداری به‌جای «سیروز» (Tietz فصلِ ۲۰: بارداری از علل غیربدخیمِ بالا رفتنِ AFP). فوریت دست نمی‌خورد.
  for (const id of items) parts.push(id === "AFP" && e.pregnant === true ? AFP_PREGNANT : TM_CONTEXT[id]);
  if (calcHi) parts.push("کلسی‌تونینِ پایه بالای ۱۰۰ pg/mL در یک مطالعه روی بیمارانِ دارای ندولِ تیروئید با سرطانِ مدولاریِ تیروئید همراه بوده است و نیازمندِ ارزیابیِ تخصصی (غدد یا جراحیِ سر و گردن) است؛ این حکمِ تشخیص نیست.");
  // P140 (تأییدِ کاربر ۲۰۲۶-۱۱-۱۲، استخراجِ ثانویهٔ Tietz فصلِ ۲۰ — بازبینیِ پزشک نیست): هر دو جمله *افزون بر* حکم‌اند؛ فوریت و سرتیتر دست نمی‌خورند.
  if (present(st.CA125) && e.sex === "M") parts.push(CA125_MALE);
  if (st.CA199?.state === "above") parts.push(...ca199CholestasisSentence(e));
  const between = items.some((id) => st[id].state === "between");
  parts.push(!above && between
    // specs/019 (بازبینیِ بالینی): برای «بین دو حد» جملهٔ «داخلِ محدوده یا بدونِ محدوده» توصیفِ این حالت نیست.
    ? "این عدد نه تشخیصِ سرطان است و نه آن را رد می‌کند؛ پزشک آن را با وضعیتِ سیگار، علائم و معاینه تفسیر می‌کند."
    : above
    ? "یک عددِ بالا در تومورمارکر تشخیصِ سرطان نیست و در بیماری‌های خوش‌خیم هم دیده می‌شود؛ پزشک آن را با علائم، معاینه و تصویربرداری تفسیر می‌کند و ممکن است آزمایش را تکرار کند."
    : "این آزمایش‌ها برای غربالگریِ سرطان در افرادِ بی‌علامت توصیه نمی‌شوند؛ نتیجهٔ داخلِ محدوده یا بدونِ محدودهٔ چاپی، وجود یا نبودِ سرطان را ثابت نمی‌کند.");
  const ex = explainsOf(e, st);
  return {
    pattern: "tumor_markers_result", urgency, action: ACTION[urgency],
    // P105 (M19): «بالاتر از محدودهٔ چاپ‌شده» فقط وقتی محدوده‌ای چاپ شده و عدد از آن بالاتر است؛ کلسی‌تونینِ > ۱۰۰ بی‌محدودهٔ چاپی
    //   سرتیترِ خودش را می‌گیرد (بدنه همان‌جا می‌گفت «محدودهٔ مرجع … چاپ نشده»).
    headline: items.some((id) => st[id].state === "above") ? "تومورمارکر روی برگهٔ شما بالاتر از محدودهٔ چاپ‌شده است"
      : calcHi ? "کلسی‌تونینِ شما بالاتر از ۱۰۰ pg/mL است" : "نتیجهٔ تومورمارکرهای شما",
    must_say: parts.join(" "),
    suggest: [], warnings: [],
    ...(ex.length ? { explains: ex } : {}),
  };
}

// ═══════════ ۱۰) PSA ═══════════
const PSA_IDS = ["PSA_TOTAL", "PSA_FREE", "PSA_RATIO"];
/** احتمالِ یافتنِ سرطان در بیوپسی برحسب درصدِ Free PSA (Catalona، JAMA 1998؛ سند مرجع) — فقط وقتی PSA کل ۴ تا ۱۰ است. */
function freePsaBand(pct) {
  if (pct <= 10) return { p: 56, high: true };
  if (pct <= 15) return { p: 28, high: true };
  if (pct <= 20) return { p: 20, high: false };
  if (pct <= 25) return { p: 16, high: false };
  return { p: 8, high: false };
}
function psaBuild(e) {
  const st = stateOf(e, PSA_IDS);
  const items = PSA_IDS.filter((id) => present(st[id]));
  const parts = items.map((id) => lineOf(st[id], id));
  const tot = st.PSA_TOTAL, fr = st.PSA_FREE, rt = st.PSA_RATIO;
  const num = (a) => (a.assay && !a.cmp && typeof a.value === "number" ? a.value : null);
  let pct = num(rt);
  const sameUnit = (a, b) => String(a.unit ?? "").toLowerCase().replace(/\s/g, "") === String(b.unit ?? "").toLowerCase().replace(/\s/g, "");
  if (pct == null && num(tot) > 0 && num(fr) != null && sameUnit(tot, fr)) pct = (num(fr) / num(tot)) * 100;
  const totV = num(tot);
  let band = null;
  if (pct != null && totV != null && totV >= 4 && totV <= 10) {
    band = freePsaBand(pct);
    parts.push(`درصدِ Free PSA حدود ${pct.toFixed(1)}٪ است (Free PSA ÷ PSA کل). در ناحیهٔ خاکستری (PSA کل ۴ تا ۱۰) این نسبت کمک می‌کند: در یک مطالعه، احتمالِ یافتنِ سرطان در بیوپسی برای این دسته حدود ${band.p}٪ بود (نسبتِ بیش از ۲۵٪ حدود ۸٪ و تا ۱۰٪ حدود ۵۶٪). این احتمال است، نه تشخیص؛ نسبتِ بالا خطر را صفر نمی‌کند و تصمیم (چگالیِ PSA، MRI، بیوپسی) با پزشک است.`);
  } else if (pct != null) {
    parts.push(`درصدِ Free PSA حدود ${pct.toFixed(1)}٪ است؛ تفسیرِ این نسبت فقط وقتی PSA کل بین ۴ تا ۱۰ ng/mL باشد (با واحدِ چاپی) معتبر است، پس درباره‌اش حکمی نمی‌دهیم.`);
  }
  const above = tot.state === "above";
  // M19/M29 (تصمیمِ کاربر ۲۰۲۶-۱۰-۱۳، P106): PSA کلِ ≥ ۲۰ ng/mL بی محدودهٔ چاپی «نوبتِ عادی» بود ⇒ this_week. فقط با واحدِ چاپی (N3).
  const psaVeryHigh = !above && totV != null && totV >= 20 && /^(ng\/ml|µg\/l|μg\/l|ug\/l)$/i.test(String(tot.unit ?? "").replace(/\s/g, ""));
  if (psaVeryHigh) parts.push(`PSA کلِ شما ${totV} ng/mL است؛ عددِ ۲۰ و بالاتر، بی‌توجه به محدودهٔ آزمایشگاه، نیاز دارد که پزشک (معمولاً اورولوژیست) آن را زود ببیند. این تشخیصِ سرطان نیست.`);
  const urgency = urgencyOf(above || psaVeryHigh || (band && band.high));
  parts.push(
    "PSA نشانگرِ بافتِ پروستات است نه فقط سرطان: بزرگیِ خوش‌خیم، التهاب و عفونتِ پروستات، سوندگذاری، انزالِ اخیر و دوچرخه‌سواری هم آن را بالا می‌برند. " +
    "اگر فیناستراید یا دوتاستراید مصرف می‌کنید، پس از حدود ۶ ماه PSA را تا حدود ۵۰٪ کمتر نشان می‌دهد و پزشک باید آن را در تفسیر لحاظ کند.");
  if (!present(tot) && present(fr)) parts.push("PSA کل روی این برگه نیست؛ Free PSA بدونِ PSA کل تفسیر نمی‌شود.");
  // specs/020 (P132، FR-007): PSA روی جنسِ زن — *افزون بر* حکم؛ فوریت و سرتیتر دست نمی‌خورند. جنس همان e.sex (پروفایل مقدم، mergePatient).
  if (e.sex === "F" && items.length) parts.push("PSA آزمایشِ مخصوصِ پروستات است و جنسِ ثبت‌شده برای این برگه زن است؛ اگر این برگه مالِ شخصِ دیگری نیست، جنسِ پروفایل را بررسی کنید و برگه را به پزشک نشان دهید.");
  const ex = explainsOf(e, st);
  return {
    pattern: "psa_result", urgency, action: ACTION[urgency],
    headline: above ? "PSA شما بالاتر از محدودهٔ چاپ‌شده است" : "نتیجهٔ PSA شما",
    must_say: parts.join(" "),
    suggest: [], warnings: [],
    ...(ex.length ? { explains: ex } : {}),
  };
}

// ═══════════ ۱۱) کالپروتکتین و FIT/FOBT ═══════════
const GI_IDS = ["CALPROTECTIN", "FIT"];

// ── P112 (۲۰۲۶-۱۰-۲۱، درخواستِ کاربر: «قواعدِ خونِ مخفی در مدفوع را اول از گایدلاین‌ها و مقالات پیدا کن، بعد در تفسیر اعمال کن») ──
// هر شش منبع در همان جلسه باز/خوانده شد و در guidelines.js ثبت است؛ کنارِ یافته به بیمار نمایش داده می‌شود (expert.js ⇒ sourceList).
//   • ACPGBI/BSG 2022 (Gut 71:1939): در بیمارِ علامت‌دار آستانهٔ ۱۰ µg Hb/g و ارجاعِ فوری؛ FIT ابزارِ *تریاژ* است و
//     «بیمار نباید تنها بر پایهٔ نتیجهٔ FIT از ارجاع محروم شود»؛ FIT برای تعیینِ فوریتِ ارجاع در کمخونیِ فقر آهن؛
//     خونریزیِ مقعدیِ پایدار با نتیجهٔ زیرِ آستانه ⇒ بررسیِ موضعی (سیگموئیدوسکوپیِ فلکسابل)؛ تغییرِ آستانه بر پایهٔ
//     ویژگی‌های بیمار/دارو شواهدِ کافی ندارد؛ FIT برای بیمارانِ زیرِ ۵۰ سال با علائمِ مشکوک هم پیشنهاد شده.
//   • USPSTF 2021 (JAMA 325:1965): FIT سالی یک بار از ۴۵ تا ۷۵ سالگی؛ هر نتیجهٔ مثبتِ آزمایشِ مدفوع ⇒ کولونوسکوپی؛
//     gFOBTِ حساسیت‌بالا سه نمونه + محدودیتِ غذایی/دارویی ⇒ FIT یک نمونه و بی‌محدودیت.
//   • BSG/ACPGBI 2025 (Frontline Gastro): در کمخونیِ فقر آهن، FIT بالای آستانه ⇒ بررسیِ همزمانِ گوارشِ فوقانی و تحتانی؛
//     FITِ زیرِ آستانه بررسی را حذف نمی‌کند.
//   • Nieuwenburg 2019 (Gut 68:866): دقتِ FIT با ضدانعقادِ خوراکی/آسپیرین/NSAID تغییرِ معناداری نمی‌کند؛ قطعِ دارو لازم نیست.
//   • Corley 2017 (JAMA 317:1631): تأخیرِ بیش از ۱۰ ماه تا کولونوسکوپی پس از FIT مثبت ⇒ سرطانِ بیشتر و مرحلهٔ پیشرفته‌تر.
//   • Clin Chem Lab Med 2013 (51:2173): تبدیلِ واحدِ کیت — هر ۵ ng/mL ≈ ۱ µg Hb در گرمِ مدفوع.
// ⚠️ C1 همچنان حاکم است: موتور هیچ آستانهٔ ثابتی اعمال نمی‌کند — مثبت/منفی فقط در برابرِ مرز/بازهٔ *چاپ‌شدهٔ همان ردیف*.
//    اعدادِ بالا در متنِ بیمار «مرزِ رایجِ راهنماها» هستند، نه حکمِ موتور؛ عددِ برگه همان‌طور که چاپ شده نقل می‌شود (N5).
const FIT_SOURCES = ["USPSTF_CRC_2021", "ACPGBI_BSG_FIT_2022", "BSG_ACPGBI_FIT_IDA_2025"];
const FIT_DRUG_SOURCES = ["NIEWENBURG_2019_FIT_DRUGS"];
const FIT_DELAY_SOURCES = ["CORLEY_2017_FIT_DELAY"];
const FIT_UNIT_SOURCES = ["FIT_UNIT_CONVERSION_2013"];
// نامِ چاپ‌شدهٔ ردیف اگر گایاکی باشد (Hemoccult/gFOBT/Guaiac)، روشِ قدیمی است: سه نمونه + محدودیتِ غذایی/دارویی (USPSTF 2021).
const GUAIAC_RE = /guaiac|hemoccult|gfobt/i;
const FIT_NG_ML_UNIT = /ng\s*\/\s*ml/i;
const FIT_UG_G_UNIT = /(µg|mcg|μg|ug)\s*\/\s*g/i;

/** کمخونی (و فقرِ آهن) روی همان برگه — فقط برای جملهٔ همراهِ یافتهٔ FIT؛ یافتهٔ جدا نمی‌سازد (N20). */
function ironOnSheet(e) {
  const hgb = e.graded?.find((g) => g.test === "HGB");
  if (!hgb || !hgb.abnormal || hgb.dir !== "low") return null;
  const mcv = e.graded?.find((g) => g.test === "MCV");
  const fer = e.graded?.find((g) => g.test === "FERRITIN");
  const ida = !!((fer && fer.abnormal && fer.dir === "low") || (mcv && mcv.abnormal && mcv.dir === "low"));
  return { hb: hgb.value, ida };
}

const IDA_BOTH_TEXT =
  "راهنمای مشترکِ BSG/ACPGBI (۲۰۲۵) برای کمخونیِ فقر آهن می‌گوید هر دو بخشِ دستگاهِ گوارش باید بررسی شوند — " +
  "کولونوسکوپی برای رودهٔ بزرگ و آندوسکوپی برای معده و مری؛ در همین بیماران، سرطانِ بخشِ فوقانی در ۲ تا ۳ درصد موارد پیدا شده است.";

/** جمله‌های روش/واحد: (۱) تبدیلِ واحدِ کیت (ng/mL ⇒ µg Hb/g، Clin Chem Lab Med 2013) و (۲) روشِ گایاکی در برابر FIT (USPSTF 2021).
 *  دو محورِ جدا‌اند: ردیفِ گایاکیِ عددی هم واحد دارد و هم روش ⇒ هر دو جمله می‌آید. */
function fitMethod(fit) {
  const unit = String(fit.unit ?? "");
  const n = Number(fit.value);
  const out = { unit: false, texts: [] };
  if (fit.assay && Number.isFinite(n) && FIT_NG_ML_UNIT.test(unit)) {
    const ug = Math.round((n / 5) * 10) / 10;
    out.unit = true;
    out.texts.push(
      "واحدِ این ردیف غلظتِ هموگلوبین در محلولِ کیت (ng/mL) است؛ در کیت‌هایی که ۱۰ میلی‌گرم مدفوع را در ۲ میلی‌لیتر بافر می‌گیرند، " +
      `هر ۵ ng/mL معادلِ ۱ µg هموگلوبین در هر گرمِ مدفوع است، یعنی عددِ این برگه حدودِ ${ug} µg Hb/g مدفوع می‌شود.`);
  } else if (fit.assay && Number.isFinite(n) && FIT_UG_G_UNIT.test(unit)) {
    out.unit = true;
    out.texts.push("واحدِ این ردیف (µg هموگلوبین در هر گرمِ مدفوع) همان واحدی است که راهنماها با آن کار می‌کنند.");
  }
  if (GUAIAC_RE.test(String(fit.name ?? ""))) {
    out.texts.push(
      "این ردیف به روشِ گایاکی (Hemoccult / gFOBT) گرفته شده است؛ آن روشِ قدیمی سه نمونه از سه اجابت‌مزاجِ جدا و محدودیتِ غذایی و دارویی می‌خواهد " +
      "(گوشتِ قرمز و ویتامین C می‌توانند نتیجهٔ مثبتِ کاذب بسازند)، برخلافِ FIT که یک نمونه می‌خواهد و چنین محدودیتی ندارد.");
  }
  return out;
}

const FIT_POS_MEANING =
  "خونِ مخفی در مدفوع یعنی مقدارِ کمی خون از دستگاهِ گوارش دفع شده است؛ بیشترِ این نتیجه‌های مثبت سرطان نیستند و علتش لزوماً سرطان نیست " +
  "(هموروئید، پولیپ و بیماری‌های التهابیِ روده هم علت‌اند). ولی طبق راهنمای ACPGBI/BSG هر نتیجهٔ مثبت باید با کولونوسکوپی پیگیری شود و " +
  "تکرارِ همین آزمایش جایگزینِ کولونوسکوپی نیست.";
const FIT_POS_LEVEL =
  "هر چه مقدارِ خونی که این آزمایش نشان می‌دهد بالاتر باشد، احتمالِ بیماریِ جدیِ روده بیشتر است؛ مقدارِ کم هم بیماری را رد نمی‌کند.";
const FIT_POS_DELAY =
  "پیگیری را رها نکنید و ماه‌ها عقب نیندازید: در یک مطالعهٔ بزرگ روی بیش از ۷۰ هزار بیمارِ FIT-مثبت، انجامِ کولونوسکوپی با تأخیرِ بیش از ۱۰ ماه " +
  "با تشخیصِ سرطانِ بیشتر و مرحلهٔ پیشرفته‌تر همراه بود.";
const FIT_POS_DRUGS =
  "مصرفِ آسپیرین، داروهای ضدالتهابِ غیراستروئیدی یا ضدانعقادها دقتِ این آزمایش را کم نمی‌کند و لازم نیست قطعشان کنید؛ " +
  "پس نتیجهٔ مثبت را به دارو نسبت ندهید.";
const FIT_POS_YOUNG =
  "راهنما برای بیمارانِ زیرِ ۵۰ سال با علائمِ گوارشی هم همین آزمایش را پیشنهاد می‌کند؛ در این سن بیماریِ التهابیِ روده علتِ محتمل‌تری از سرطان است.";
const FIT_NEG_SYMPTOMS =
  "غربالگری با FIT در افرادِ بدونِ علامت از ۴۵ تا ۷۵ سالگی سالی یک بار توصیه می‌شود (USPSTF 2021)؛ این نتیجه فقط دربارهٔ همین نمونه است. " +
  "طبق راهنمای ACPGBI/BSG، منفی بودنِ FIT به‌تنهایی دلیلی برای ردِ ارجاع نیست: اگر خونریزیِ مقعدی، تغییرِ مداومِ اجابت‌مزاج، دردِ شکم یا " +
  "کاهشِ وزنِ ناخواسته دارید باید بررسی شوید — خونریزیِ مقعدیِ پایدار حتی با نتیجهٔ زیرِ آستانه هم بررسیِ موضعی می‌خواهد.";
const FIT_NEG_IDA =
  "راهنما صریح می‌گوید در کمخونیِ فقر آهن، نتیجهٔ زیرِ آستانهٔ FIT بررسیِ گوارشی را حذف نمی‌کند (فقط مسیرِ ارجاع را غیرِسرطانی می‌کند).";
const FIT_NUM_NO_CUTOFF =
  "مرزِ مثبت‌بودنِ FIT به کیت و برنامه بستگی دارد (مثلاً ۲۰ µg Hb/g مدفوع در غربالگریِ آمریکا و ۱۰ µg/g در مسیرِ بیماران علامت‌دار در بریتانیا)؛ " +
  "بدونِ محدودهٔ چاپیِ همین کیت نمی‌توان گفت این عدد مثبت است یا نه. از آزمایشگاه یا پزشک بپرسید مرزِ همین کیت چند است و اگر علائمی دارید " +
  "همین عدد را با خودتان به پزشک نشان دهید.";
const FIT_EQUIV_TEXT =
  "نتیجهٔ «مرزی» را نه مثبت بشمارید نه منفی؛ برای تصمیم باید مرزِ همین کیت و علائمِ شما را با هم دید، پس برگه را به پزشک نشان دهید و " +
  "اگر لازم باشد آزمایش تکرار می‌شود.";

function giBuild(e) {
  const st = stateOf(e, GI_IDS);
  const cal = st.CALPROTECTIN, fit = st.FIT;
  const parts = [];
  if (present(cal)) {
    parts.push(lineOf(cal, "CALPROTECTIN"));
    parts.push(isPos(cal)
      ? "کالپروتکتینِ مدفوع نشانگرِ التهابِ دیوارهٔ روده است و بالا بودنش بیماریِ التهابیِ روده را مطرح می‌کند، ولی علت‌های دیگری (عفونت، مصرفِ داروهای ضدالتهاب) هم دارد و تشخیص را فقط پزشک (معمولاً با آندوسکوپی) می‌گذارد."
      : "کالپروتکتینِ مدفوع التهابِ دیوارهٔ روده را می‌سنجد؛ نتیجهٔ داخلِ محدوده یا بدونِ محدودهٔ چاپی، همهٔ علت‌های اسهال و دردِ شکم را رد نمی‌کند.");
  }
  const method = present(fit) ? fitMethod(fit) : null;
  const iron = present(fit) ? ironOnSheet(e) : null;
  if (present(fit)) {
    parts.push(lineOf(fit, "FIT"));
    if (isPos(fit)) {
      // P112: پیامِ مثبت = معنا + سطحِ عدد + پیگیریِ بی‌تأخیر + داروها (Nieuwenburg 2019) + سن.
      parts.push(FIT_POS_MEANING, FIT_POS_LEVEL, FIT_POS_DELAY, FIT_POS_DRUGS);
      if (e.age != null && e.age < 50) parts.push(FIT_POS_YOUNG);
      if (iron) {
        parts.push(
          `روی همین برگه هموگلوبین ${iron.hb} پایین است؛ ` +
          (iron.ida ? IDA_BOTH_TEXT : "کمخونی همراهِ FIT مثبت باید در همان بررسیِ گوارشی دیده شود."));
      }
    } else if (isNeg(fit)) {
      parts.push(FIT_NEG_SYMPTOMS);
      if (iron?.ida) parts.push(IDA_BOTH_TEXT, FIT_NEG_IDA);
    } else if (isUnsure(fit)) {
      parts.push(fit.state === "noref" ? FIT_NUM_NO_CUTOFF : FIT_EQUIV_TEXT);
    }
    if (method) parts.push(...method.texts);
  }
  const pos = isPos(cal) || isPos(fit);
  const urgency = urgencyOf(pos);
  const ex = explainsOf(e, st);
  // منابعِ یافته: منبع‌های FIT فقط وقتی ردیفِ FIT روی برگه هست (کالپروتکتین تنها، منبعِ FIT نمی‌گیرد).
  const sources = present(fit)
    ? [...FIT_SOURCES,
       ...(isPos(fit) ? [...FIT_DRUG_SOURCES, ...FIT_DELAY_SOURCES] : []),
       ...(method?.unit ? FIT_UNIT_SOURCES : [])]
    : [];
  return {
    pattern: "gi_stool_result", urgency, action: ACTION[urgency],
    headline: isPos(fit) ? "آزمایش خونِ مخفی در مدفوع (FIT/FOBT) شما مثبت یا بالاتر از مرز است"
      : isPos(cal) ? "کالپروتکتینِ مدفوعِ شما بالاتر از محدودهٔ چاپ‌شده است" : "نتیجهٔ آزمایش مدفوعِ شما (کالپروتکتین / خونِ مخفی)",
    must_say: parts.join(" "),
    suggest: isPos(fit) ? (iron?.ida ? ["کولونوسکوپی", "آندوسکوپیِ فوقانی", "مشاوره با متخصص گوارش"] : ["کولونوسکوپی"]) : [],
    warnings: pos ? ["اگر خونریزیِ آشکار از مقعد، سیاه‌شدنِ مدفوع یا دردِ شدیدِ شکم پیدا کردید، همان روز به اورژانس مراجعه کنید."] : [],
    ...(ex.length ? { explains: ex } : {}),
    ...(sources.length ? { sources } : {}),
  };
}

// ═══════════ specs/023 (P136، راهنمای گوگل‌درایوِ کاربر): سلیاک، کبدِ خودایمن، میاستنی، ایمونوگلوبولین‌ها، آنتی‌دی‌اِن‌آز B ═══════════
// 🔴 پیش از این همهٔ این ردیف‌ها unmapped بودند («تفسیر نشدند»). منبع: خلاصهٔ ثانویهٔ کاربر؛ منابعِ اصلی باز نشدند ⇒ `sources` خالی.
// ⚠️ هر جملهٔ «شریک» سه‌حالته است (بالا/داخل/روی برگه نیست — N4). هیچ‌کدام اورژانس نیست؛ هیچ‌کدام تشخیص نمی‌گذارد.
const gradedOf = (e, key) => e.graded?.find((x) => x.test === key && x.value != null);
const ulnMultiple = (a) => {
  if (!a.assay || a.state !== "above" || a.cmp || a.titreRow) return null;
  const hi = parseReference(a.reference)?.hi;
  return hi > 0 ? a.value / hi : null;
};
const fmt1 = (x) => (Math.round(x * 10) / 10).toString();
// غلظت (ایمونوگلوبولین): «پایین‌تر از / بالاتر از *محدودهٔ*» — نه «مرزِ» آنتی‌بادی.
function concLine(a, id) {
  if (!a.assay || !["below", "above", "within"].includes(a.state)) return lineOf(a, id);
  const where = a.state === "below" ? "پایین‌تر از" : a.state === "above" ? "بالاتر از" : "داخلِ";
  return `${faName(id)} روی برگهٔ شما ${a.shown}${a.unit ? ` ${a.unit}` : ""} است و ${where} محدودهٔ چاپ‌شدهٔ همان ردیف است.`;
}

// ── سلیاک ──
export const TTG_NO_BIOPSY_ULN_MULTIPLE = 10;   // P136: ≥ ۱۰×ULN + EMA در نمونهٔ دوم (ESPGHAN، کودکان) — به نقلِ راهنما
const CELIAC_IDS = ["TTG_IGA", "TTG_IGG", "DGP_IGA", "DGP_IGG", "EMA_IGA"];
const celiacPresent = (e) => CELIAC_IDS.some((id) => present(autoAbState(e, id)));
const GLUTEN_NOTE = "همهٔ این آزمایش‌ها فقط وقتی معتبرند که هنوز گلوتن (نان و غذاهای گندمی، جو) می‌خورید؛ پیش از تمام شدنِ بررسی‌ها رژیمِ بدونِ گلوتن را شروع نکنید.";
// «4-10 Weak positive» روی همان ردیف: عددِ داخلِ این باند مرزی است، نه «بازه خوانده نشد» (US2-5).
const WEAK_BAND_RE = /([\d.]+)\s*[-–]\s*([\d.]+)\s*:?\s*(weak(ly)?\s*positive|borderline|equivocal|grey|gray|مرزی|ضعیف)/i;
function weakBand(a) {
  if (!a.assay || a.cmp || a.value == null || !["noref", "above", "within"].includes(a.state)) return a;
  const m = String(a.reference ?? "").match(WEAK_BAND_RE);
  if (!m) return a;
  const lo = Number(m[1]), hi = Number(m[2]);
  if (a.value >= lo && a.value <= hi) return { ...a, state: "equiv", raw: `${a.shown}${a.unit ? ` ${a.unit}` : ""}` };
  if (a.state === "noref") return { ...a, state: a.value > hi ? "above" : "within" };
  return a;
}
function celiacBuild(e) {
  const st = Object.fromEntries(CELIAC_IDS.map((id) => [id, weakBand(autoAbState(e, id))]));
  const iga = autoAbState(e, "IGA_TOTAL");
  const pos = CELIAC_IDS.some((id) => isPos(st[id]));
  const urgency = urgencyOf(pos);
  const parts = CELIAC_IDS.filter((id) => present(st[id])).map((id) => lineOf(st[id], id));
  if (present(iga)) parts.push(concLine(iga, "IGA_TOTAL"));
  const suggest = [];
  const igaLow = iga.state === "below", igaOk = iga.state === "within" || iga.state === "above";
  if (pos) {
    const m = ulnMultiple(st.TTG_IGA);
    if (m != null) parts.push(`tTG-IgA شما حدود ${fmt1(m)} برابرِ حدِ بالای چاپ‌شدهٔ برگه است.`);
    parts.push("آنتی‌بادی‌های سلیاک (به‌ویژه tTG-IgA) آزمایشِ اصلیِ خونیِ بیماریِ سلیاک (حساسیتِ خودایمن به گلوتن) هستند. مثبت بودنشان احتمالِ سلیاک را بالا می‌برد ولی به‌تنهایی تشخیص نیست؛ تأیید معمولاً با آندوسکوپی و نمونه‌برداری از دوازدهه توسطِ متخصصِ گوارش است.");
    // P136 پاسخِ بازبین (پرسش ۴): مسیرِ بدون‌نمونه‌برداری (ESPGHAN) فقط برای زیرِ ۱۸ سال؛ سنِ نامعلوم ⇒ گفته نمی‌شود.
    if (m != null && m >= TTG_NO_BIOPSY_ULN_MULTIPLE && typeof e.age === "number" && e.age < 18) {
      parts.push("در کودکان، وقتی tTG-IgA دست‌کم ۱۰ برابرِ حدِ بالا باشد و آنتی‌بادی اندومیزیوم (EMA) در نمونهٔ خونِ دوم هم مثبت شود، متخصصِ گوارشِ کودکان گاهی بدونِ نمونه‌برداری تشخیص می‌گذارد؛ این تصمیمِ متخصص است.");
      if (!present(st.EMA_IGA)) parts.push("EMA روی این برگه نیست.");
    }
    if (isPos(st.EMA_IGA)) parts.push("آنتی‌بادی اندومیزیوم (EMA) اختصاصی‌ترین آزمایشِ خونیِ سلیاک است.");
    if ((isPos(st.TTG_IGG) || isPos(st.DGP_IGG)) && !isPos(st.TTG_IGA) && !isPos(st.EMA_IGA)) {
      parts.push(igaOk
        ? "وقتی IgA تامِ خون طبیعی است، آنتی‌بادی‌های نوعِ IgG (tTG-IgG یا DGP-IgG) به‌تنهایی ارزشِ تشخیصیِ کمتری دارند و آزمایشِ اصلی tTG-IgA است."
        : igaLow ? "چون IgA تامِ شما پایین است، آنتی‌بادی‌های نوعِ IgG آزمایشِ درستِ سلیاک‌اند و مثبت بودنشان مهم است." : "");
    }
    suggest.push("بررسی توسط متخصص گوارش");
  } else if (isNeg(st.TTG_IGA)) {
    if (igaLow) {
      parts.push("چون IgA تامِ شما پایین‌تر از محدوده است، منفی بودنِ tTG-IgA قابلِ اعتماد نیست: در کمبودِ IgA این آزمایش به‌طورِ کاذب منفی می‌شود. برای سلیاک باید آزمایشِ نوعِ IgG (DGP-IgG یا tTG-IgG) انجام شود.");
      if (!present(st.DGP_IGG) && !present(st.TTG_IGG)) suggest.push("DGP-IgG یا tTG-IgG");
    } else if (igaOk) {
      parts.push("IgA تامِ شما داخلِ محدوده است، پس منفی بودنِ tTG-IgA معتبر است و شواهدی از سلیاک در این آزمایش دیده نشد.");
    } else if (!present(iga)) {
      parts.push("IgA تام روی این برگه نیست. برای اینکه منفی بودنِ tTG-IgA قابلِ اعتماد باشد معمولاً IgA تام هم اندازه گرفته می‌شود، چون کمبودِ IgA در افرادِ مبتلا به سلیاک شایع‌تر است و آزمایش را به‌طورِ کاذب منفی می‌کند.");
      suggest.push("Total IgA (IgA تام)");
    }
  } else if (CELIAC_IDS.some((id) => isUnsure(st[id]))) {
    parts.push(UNSURE_NOTE + " آنتی‌بادی‌های سلیاک (tTG، DGP، EMA) آزمایش‌های خونیِ بیماریِ سلیاک‌اند.");
  } else {
    parts.push("این فقط دربارهٔ همین آزمایش‌هاست.");
  }
  if (typeof e.age === "number" && e.age < 2) parts.push("در کودکِ زیرِ ۲ سال tTG-IgA حساسیتِ کمتری دارد و معمولاً همراهِ DGP-IgG سنجیده می‌شود.");
  parts.push(GLUTEN_NOTE);
  parts.push("اگر اسهال یا نفخِ طولانی، کاهشِ وزن، کم‌خونیِ فقرِ آهن، یا (در کودک) کندیِ رشد دارید، آن را به پزشک بگویید.");
  return {
    pattern: "celiac_serology_result", urgency, action: ACTION[urgency],
    headline: pos ? "آنتی‌بادی‌های سلیاک در آزمایش شما مثبت یا بالاتر از مرز است" : "نتیجهٔ آزمایش‌های سلیاک شما",
    must_say: parts.filter(Boolean).join(" "),
    suggest, warnings: pos ? ["پیش از نظرِ متخصص رژیمِ بدونِ گلوتن را شروع نکنید؛ نتیجهٔ بررسی‌ها را مخدوش می‌کند."] : [],
    explains: [...CELIAC_IDS.filter((id) => present(st[id])), ...(present(iga) ? ["IGA_TOTAL"] : [])],
  };
}

// ── کبدِ خودایمن ──
const LIVER_AB_IDS = ["ASMA", "ANTI_LKM1", "ANTI_SLA", "AMA", "AMA_M2"];
function enzLine(e, keys, faList) {
  const gs = keys.map((k) => gradedOf(e, k)).filter(Boolean);
  if (!gs.length) return `${faList} روی این برگه نیست.`;
  const high = gs.filter((g) => g.abnormal && g.dir === "high");
  return high.length
    ? `${high.map((g) => `${faName(g.test)} ${g.value}`).join("، ")} روی همین برگه بالاتر از محدوده است و باید همراهِ این آنتی‌بادی دیده شود.`
    : `${gs.map((g) => faName(g.test)).join(" و ")} روی همین برگه داخلِ محدوده ${gs.length > 1 ? "هستند" : "است"}.`;
}
function liverAbBuild(e) {
  const st = stateOf(e, LIVER_AB_IDS);
  const aihPos = ["ASMA", "ANTI_LKM1", "ANTI_SLA"].some((id) => isPos(st[id]));
  const pbcPos = ["AMA", "AMA_M2"].some((id) => isPos(st[id]));
  const pos = aihPos || pbcPos;
  const urgency = urgencyOf(pos);
  const parts = LIVER_AB_IDS.filter((id) => present(st[id])).map((id) => lineOf(st[id], id));
  if (aihPos) {
    parts.push("این آنتی‌بادی‌ها با «هپاتیت خودایمنی» مرتبط‌اند: ASMA (همراهِ ANA) بیشتر در نوعِ ۱، LKM-1 در نوعِ ۲ که در کودکان و نوجوانان شایع‌تر است، و SLA/LP بسیار اختصاصی است. تشخیص به آنزیم‌های کبد، سطحِ IgG، ردِ هپاتیت‌های ویروسی و اغلب نمونه‌برداری از کبد نیاز دارد و با متخصصِ گوارش و کبد است.");
    parts.push(enzLine(e, ["ALT", "AST"], "آنزیم‌های کبد (ALT و AST)"));
    const igg = autoAbState(e, "IGG");
    parts.push(igg.state === "above" ? "IgG سرم هم روی همین برگه بالاتر از محدوده است (در هپاتیت خودایمنی معمولاً بالا می‌رود)."
      : igg.state === "within" ? "IgG سرم روی همین برگه داخلِ محدوده است." : present(igg) ? "" : "IgG سرم روی این برگه نیست.");
  }
  if (pbcPos) {
    parts.push("AMA (به‌ویژه نوعِ M2) نشانگرِ اصلیِ «کلانژیتِ صفراویِ اولیه» (PBC) است، بیماریِ خودایمنِ مجاری صفراویِ ریزِ کبد که بیشتر در زنانِ میانسال دیده می‌شود؛ تشخیص با آلکالن فسفاتاز (ALP) و نظرِ متخصص گذاشته می‌شود.");
    parts.push(enzLine(e, ["ALP"], "آلکالن فسفاتاز (ALP)"));
  }
  if (!pos) {
    parts.push(LIVER_AB_IDS.some((id) => isUnsure(st[id]))
      ? UNSURE_NOTE + " این آنتی‌بادی‌ها برای بررسیِ بیماری‌های خودایمنِ کبد (هپاتیت خودایمنی و کلانژیتِ صفراویِ اولیه) به کار می‌روند."
      : "این فقط دربارهٔ همین آزمایش‌هاست؛ منفی بودن بیماریِ خودایمنِ کبد را کاملاً رد نمی‌کند (در فرمِ حادِ هپاتیت خودایمنی گاهی آنتی‌بادی‌ها در ابتدا منفی‌اند).");
  }
  return {
    pattern: "liver_autoantibody_result", urgency, action: ACTION[urgency],
    headline: pos ? "آنتی‌بادی‌های مرتبط با بیماریِ خودایمنِ کبد در آزمایش شما مثبت یا بالاتر از مرز است" : "نتیجهٔ آنتی‌بادی‌های کبدِ خودایمن",
    must_say: parts.filter(Boolean).join(" "),
    suggest: pos ? ["بررسی توسط متخصص گوارش"] : [], warnings: pos ? [CAUTION_DRUG] : [],
    explains: LIVER_AB_IDS.filter((id) => present(st[id])),
  };
}

// ── میاستنی گراویس ──
export const ACHR_STRONG_NMOL = 0.4;   // P136 پاسخِ بازبین (پرسش ۲)
export const ACHR_BINDING_POS_NMOL = 0.02;   // P136: بی‌بازهٔ چاپی و فقط با واحدِ nmol/L (Mayo، به نقلِ راهنما)
function achrState(a) {
  if (a.assay && a.state === "noref" && !a.cmp && a.value != null && /nmol\s*\/\s*l/i.test(String(a.unit ?? "")) && !String(a.reference ?? "").trim().replace("undefined", "")) {
    return { ...a, state: a.value > ACHR_BINDING_POS_NMOL ? "above" : "within", fallback: true };
  }
  return a;
}
function mgBuild(e) {
  const achr = achrState(autoAbState(e, "ACHR")), musk = autoAbState(e, "ANTI_MUSK");
  const pos = isPos(achr) || isPos(musk);
  const urgency = urgencyOf(pos);
  const parts = [];
  if (present(achr)) parts.push(achr.fallback
    ? `${faName("ACHR")} روی برگهٔ شما ${achr.shown} ${achr.unit} است؛ بازه روی برگه چاپ نشده و در روشِ رایج بیش از ${ACHR_BINDING_POS_NMOL} nmol/L مثبت شمرده می‌شود، پس این نتیجه ${achr.state === "above" ? "مثبت" : "منفی"} است.`
    : lineOf(achr, "ACHR"));
  if (present(musk)) parts.push(lineOf(musk, "ANTI_MUSK"));
  if (pos) {
    parts.push("این آنتی‌بادی‌ها آزمایشِ اصلیِ «میاستنی گراویس»‌اند، بیماریِ خودایمنی که انتقالِ پیام از عصب به عضله را مختل می‌کند و ضعفِ پلک، دوبینی، ضعفِ عضلاتِ صورت، بلع یا اندام‌ها را می‌دهد که با خستگی بدتر می‌شود. مثبت بودن با علائمِ مناسب تشخیص را بسیار محتمل می‌کند، ولی تشخیص و درمان با متخصصِ مغز و اعصاب است.");
    // P136 پاسخِ بازبین (پرسش ۲): ۰٫۰۲ تا ۰٫۴ nmol/L مثبتِ ضعیف (گاهی کاذب)؛ بالای ۰٫۴ ویژگیِ ~۹۵٪ (Mayo، به نقلِ راهنما). فوریت عوض نمی‌شود.
    if (isPos(achr) && !achr.cmp && achr.value != null && /nmol\s*\/\s*l/i.test(String(achr.unit ?? ""))) {
      parts.push(achr.value <= ACHR_STRONG_NMOL
        ? `این عدد بالاتر از مرز ولی زیرِ ${faNum(ACHR_STRONG_NMOL).replace(".", "٫")} nmol/L است (مثبتِ ضعیف)؛ این سطح گاهی در افرادِ بدونِ میاستنی هم دیده می‌شود، پس معنایش فقط کنارِ علائم و معاینه روشن می‌شود و ممکن است تکرار شود.`
        : `این عدد بالاتر از ${faNum(ACHR_STRONG_NMOL).replace(".", "٫")} nmol/L است؛ در این سطح نتیجه برای میاستنی اختصاصیِ بالایی دارد.`);
    }
    if (isPos(achr)) parts.push("در بخشی از بیماران با AChRِ مثبت تومورِ غدهٔ تیموس (تیموما) هم هست، پس پزشک معمولاً تصویربرداریِ قفسهٔ سینه می‌خواهد.");
    if (isPos(musk)) parts.push("آنتی‌بادی MuSK بیشتر در بیمارانی دیده می‌شود که AChR منفی دارند.");
  } else if ([achr, musk].some(isUnsure)) {
    parts.push(UNSURE_NOTE + " این آنتی‌بادی‌ها برای بررسیِ میاستنی گراویس (ضعفِ عضلهٔ خستگی‌پذیر) به کار می‌روند.");
  } else {
    parts.push("منفی بودن میاستنی را رد نمی‌کند: در فرمِ فقط-چشمی بخشِ قابلِ‌توجهی از بیماران منفی‌اند، بعضی آنتی‌بادی MuSK دارند و گاهی آنتی‌بادی ماه‌ها بعد مثبت می‌شود؛ اگر افتادگیِ پلک، دوبینی یا ضعفِ خستگی‌پذیر دارید با متخصصِ مغز و اعصاب مطرح کنید.");
  }
  const suggest = pos ? ["بررسی توسط متخصص مغز و اعصاب"] : isNeg(achr) && !present(musk) ? ["Anti-MuSK"] : [];
  return {
    pattern: "mg_antibody_result", urgency, action: ACTION[urgency],
    headline: pos ? "آنتی‌بادی‌های میاستنی گراویس در آزمایش شما مثبت یا بالاتر از مرز است" : "نتیجهٔ آنتی‌بادی‌های میاستنی گراویس",
    must_say: parts.join(" "), suggest,
    warnings: ["اگر تنگیِ نفس یا اختلالِ بلع دارید، فوراً به اورژانس بروید."],
    explains: ["ACHR", "ANTI_MUSK"].filter((id) => e.ungraded?.[id]?.reason === "assay_printed"),
  };
}

// ── ایمونوگلوبولین‌های سرم (شریک؛ تفسیرِ نقصِ ایمنی خارج از دامنه) ──
const IG_IDS = ["IGG", "IGA_TOTAL", "IGM", "IGE"];
function igBuild(e) {
  // یک مالک برای هر آنالیت (N20): وقتی آزمایشِ سلیاک روی برگه است IgA تام مالِ celiac_serology_result است.
  const ids = IG_IDS.filter((id) => !(id === "IGA_TOTAL" && celiacPresent(e)));
  const st = stateOf(e, ids);
  const items = ids.filter((id) => present(st[id]));
  const child = typeof e.age === "number" && e.age < 16;
  const low = items.filter((id) => id !== "IGE" && st[id].state === "below");
  const high = items.filter((id) => id !== "IGE" && st[id].state === "above");
  const parts = items.map((id) => {
    const a = st[id];
    if (child && a.state === "below") return `${faName(id)} روی برگهٔ شما ${a.shown}${a.unit ? ` ${a.unit}` : ""} است و کمتر از عددِ پایینِ بازهٔ چاپ‌شده (${a.reference}) است.`;
    return concLine(a, id);
  });
  if (low.length) parts.push(child
    ? "سطحِ ایمونوگلوبولین‌ها در کودکان با سن تغییر می‌کند و در خردسالان به‌طورِ طبیعی پایین‌تر از بزرگسال است؛ اگر بازهٔ چاپ‌شده برای بزرگسال باشد، این عدد را نمی‌توان «پایین» خواند. برگه را به پزشکِ کودکان نشان دهید، به‌ویژه اگر کودک عفونت‌های مکرر یا شدید دارد."
    : "ایمونوگلوبولین‌ها آنتی‌بادی‌های کلیِ خون‌اند. پایین بودنشان می‌تواند از کمبودِ ارثی یا اکتسابیِ ساختِ آنتی‌بادی، از دست رفتنِ پروتئین از کلیه یا روده، یا داروهایی مثل کورتون باشد. اگر عفونت‌های مکرر یا شدید (سینوزیت، ذات‌الریه، عفونتِ گوش) دارید به پزشک بگویید؛ بررسی‌اش با متخصصِ ایمونولوژی بالینی است.");
  if (high.length) parts.push("بالا بودنِ ایمونوگلوبولین‌ها معمولاً بازتابِ التهاب یا عفونتِ طولانی، بیماریِ کبد یا بیماری‌های خودایمنی است؛ گاهی هم دلیلش ساختِ یک نوع آنتی‌بادیِ یکسان (گاموپاتی) است که با الکتروفورزِ پروتئین مشخص می‌شود.");
  if (st.IGE?.state === "above") parts.push("IgE بالا بیشتر با آلرژی (آسم، آبریزشِ آلرژیکِ بینی، اگزما) و عفونت‌های انگلی همراه است و به‌تنهایی تشخیص نیست.");
  if (!low.length && !high.length && st.IGE?.state !== "above") parts.push(items.some((id) => isUnsure(st[id])) ? UNSURE_NOTE : "این فقط دربارهٔ همین اعداد است.");
  return {
    pattern: "immunoglobulin_result", urgency: "routine", action: ACTION.routine,
    headline: low.length ? "یک یا چند ایمونوگلوبولینِ سرمِ شما پایین‌تر از بازهٔ چاپ‌شده است" : "نتیجهٔ ایمونوگلوبولین‌های سرم",
    must_say: parts.join(" "), suggest: [], warnings: [],
    explains: items,
  };
}

// ── آنتی‌دی‌اِن‌آز B (کنارِ ASO) ──
// P136: سقفِ سنی وقتی بازه چاپ نشده (U/mL، Mayo/Children's Colorado به نقلِ راهنما): < ۵ سال ۲۵۰، ۵–۱۷ سال ۳۷۵، ≥ ۱۸ سال ۳۰۰.
export const DNASEB_ULN_BY_AGE = [[5, 250], [18, 375], [Infinity, 300]];
const dnasebUln = (age) => (typeof age === "number" ? DNASEB_ULN_BY_AGE.find(([lim]) => age < lim)[1] : null);
function dnasebBuild(e) {
  let a = autoAbState(e, "ANTI_DNASEB");
  const uln = dnasebUln(e.age);
  let line = lineOf(a, "ANTI_DNASEB");
  if (a.assay && a.state === "noref" && !a.cmp && a.value != null && uln != null && (!a.unit || /u\s*\/\s*ml/i.test(a.unit)) && !(a.reference && String(a.reference).trim() && String(a.reference) !== "undefined")) {
    a = { ...a, state: a.value > uln ? "above" : "within" };
    line = `${faName("ANTI_DNASEB")} روی برگهٔ شما ${a.shown}${a.unit ? ` ${a.unit}` : ""} است؛ بازه روی برگه چاپ نشده و حدِ بالای تقریبیِ همین سن حدود ${uln} U/mL است، پس این عدد ${a.state === "above" ? "بالاتر از آن" : "در همان محدوده"} است.`;
  }
  const high = isPos(a);
  const aso = Object.keys(e.qual ?? {}).some((n) => /^(aso|antistreptolysin)/.test(String(n).toLowerCase().replace(/[\s.\-_()/]/g, "")));
  return {
    pattern: "dnaseb_result", urgency: "routine", action: ACTION.routine,
    headline: high ? "آنتی‌دی‌اِن‌آز B بالاتر از حدِ معمول است" : "نتیجهٔ آنتی‌دی‌اِن‌آز B",
    must_say: `${line} ` + (high
      ? "این آنتی‌بادی مثلِ ASO نشانِ برخوردِ چند هفته تا چند ماهِ اخیرِ بدن با استرپتوکوکِ گروه A است؛ مدتِ بیشتری بالا می‌ماند و در عفونت‌های پوستی هم بالا می‌رود که ASO گاهی بالا نمی‌رود. خودش بیماری را ثابت نمی‌کند و فقط کنارِ علائمی مثل دردِ مفاصل، تب، ادرارِ تیره یا تورمِ صورت و پا معنا پیدا می‌کند؛ در کودکانِ مدرسه‌ای سطحِ طبیعی بالاتر است."
      : isUnsure(a) ? UNSURE_NOTE : "یعنی در این آزمایش شواهدی از برخوردِ اخیر با استرپتوکوکِ گروه A دیده نشد.") +
      (aso ? "" : " ASO روی این برگه نیست."),
    suggest: [], warnings: high ? ["اگر تب، دردِ مفاصل، ادرارِ تیره یا تورمِ صورت و پا دارید، زودتر به پزشک مراجعه کنید."] : [],
    ...(e.ungraded?.ANTI_DNASEB?.reason === "assay_printed" ? { explains: ["ANTI_DNASEB"] } : {}),
  };
}

// ═══ P143 (specs/025، D7): islet autoantibodies (anti-GAD، IA-2). Verdict only from the printed cut-off or a word;
//   never a diagnosis. Positive with glucose/HbA1c already in the diabetes range on the same sheet ⇒ this week. ═══
const ISLET_IDS = ["ANTI_GAD", "ANTI_IA2"];
function isletBuild(e) {
  const st = stateOf(e, ISLET_IDS);
  const shown = Object.entries(st).filter(([, a]) => present(a));
  const lines = shown.map(([id, a]) => lineOf(a, id)).join(" ");
  const pos = shown.some(([, a]) => isPos(a));
  const unsure = shown.some(([, a]) => isUnsure(a));
  const t = Object.fromEntries((e.graded ?? []).map((g) => [g.test, g.value]));
  const dmOnSheet = t.GLU_F >= 126 || t.HBA1C >= 6.5 || t.GLU_2H >= 200 || t.GLU_RANDOM >= 200;
  const urgency = pos && dmOnSheet ? "this_week" : "routine";
  // A qualitative row's line already says «(مثبت)»/«(منفی)»; only a number read against the printed cut-off needs the word.
  const assay = shown.some(([, a]) => a.assay);
  const tail = pos
    ? `${assay ? "یعنی مثبت است. " : ""}این آنتی‌بادی به نفعِ نوعِ خودایمنیِ دیابت (نوع ۱ یا دیابتِ خودایمنیِ دیررسِ بزرگسالی، LADA) است، ولی به‌تنهایی تشخیص نیست و پزشک آن را با قند و سی‌پپتید کنار هم می‌سنجد.`
    : unsure
      ? "این نتیجه تفسیر نشد؛ مرزِ مثبت را آزمایشگاهِ خودتان می‌تواند بگوید."
      : `${assay ? "یعنی منفی است؛ " : ""}منفی‌بودنِ این آنتی‌بادی نوعِ خودایمنیِ دیابت را کاملاً رد نمی‌کند.`;
  return {
    pattern: "islet_autoantibody_result", urgency, action: ACTION[urgency],
    headline: pos ? "آنتی‌بادیِ مرتبط با دیابتِ خودایمنی مثبت است" : "نتیجهٔ آنتی‌بادیِ مرتبط با دیابتِ خودایمنی",
    must_say: `${lines} ${tail}`,
    suggest: pos && !t.C_PEPTIDE ? ["سی‌پپتید"] : [], warnings: [],
    ...(pos ? {} : { score_neutral: true }),   // P143: read only by score.js (negative or uninterpreted ⇒ no score cap)
    ...(explainsOf(e, st).length ? { explains: explainsOf(e, st) } : {}),
  };
}

const ctx = (e) => ({ pregnant: e.pregnant === true });
// ═══════════ P147-۴ اتصالِ لوپوس (تصمیمِ کاربر ۲۰۲۶-۱۱-۱۴) ═══════════
// منبع (خوانده‌شده ۲۰۲۶-۱۱-۱۴، Merck Professional، SLE): «Serum complement levels (C3, C4) are often depressed in active disease and
//   are usually lowest in patients with active nephritis»؛ «Red blood cell (RBC) and/or white blood cell casts suggest active nephritis»؛
//   «Hematologic manifestations include anemia (… autoimmune hemolytic anemia), leukopenia …, and thrombocytopenia»؛ کومبسِ مستقیم در
//   تعریفِ همولیزِ خودایمنیِ معیار؛ «Proteinuria can be estimated by the urine protein/creatinine ratio».
// هر یافته جدا حرف می‌زد و هیچ‌جا گفته نمی‌شد این‌ها با هم یک تصویرند. فوریتِ تازه نمی‌سازد (this_week، زیرِ اجزای خودش)، تشخیص نمی‌گذارد.
// ⚠️ شرط در کمکیِ بیرونِ قاعده است: RULE_READS کلیدهای نام‌برده در متنِ match/build را «پوشش‌داده» می‌شمارد و این یافته عددِ
//   شمارشِ خون/کراتینین را نقل نمی‌کند (آن‌ها مالِ یافته‌های خودشان‌اند).
function lupusLinkState(e) {
  const st = stateOf(e, ["ANA", "ANTI_DSDNA", "ANTI_SM"]);
  const c3 = autoAbState(e, "C3"), c4 = autoAbState(e, "C4");
  const serology = isPos(st.ANA) && (isPos(st.ANTI_DSDNA) || isPos(st.ANTI_SM) || c3.state === "below" || c4.state === "below");
  if (!serology) return null;
  const low = (k) => { const g = e.graded.find((x) => x.test === k); return !!(g?.abnormal && g.dir === "low"); };
  const kidney = isGlomerulonephritis(e);
  // کم‌خونیِ میکروسیتیک (الگوی کمبودِ آهن) «درگیریِ خونیِ لوپوس» شمرده نمی‌شود؛ رده‌های دیگر هر کدام کافی‌اند.
  const microcytic = (() => { const m = e.graded.find((x) => x.test === "MCV"); return !!(m && m.value < microMcvCut(e)); })();
  const blood = ["HGB", "WBC", "PLT", "LYMPH_ABS"].filter((k) => low(k) && !(k === "HGB" && microcytic));
  if (!kidney && !blood.length) return null;
  return { kidney, anemia: blood.includes("HGB"), blood: blood.length > 0, comp: c3.state === "below" || c4.state === "below", ds: isPos(st.ANTI_DSDNA) || isPos(st.ANTI_SM) };
}
function lupusLinkBuild(e) {
  const s = lupusLinkState(e);
  const sero = ["ANA مثبت", s.ds ? "آنتی‌بادیِ اختصاصی‌ترِ مثبت (anti-dsDNA یا anti-Sm)" : null, s.comp ? "کمپلمانِ پایین" : null].filter(Boolean);
  const organ = [s.kidney ? "نشانه‌های التهابِ کلیه در ادرار و خون" : null, s.blood ? "کاهشِ رده‌های خون" : null].filter(Boolean);
  return {
    pattern: "lupus_activity_link",
    urgency: "this_week", action: ACTION.this_week,
    keep_under_blocker: true,
    headline: "چند یافتهٔ این برگه با هم به یک بیماریِ خودایمنی اشاره دارند",
    must_say:
      `روی همین برگه ${sero.join("، ")} کنارِ ${organ.join(" و ")} دیده می‌شود. ` +
      "این یافته‌ها با هم در فعالیتِ بیماری‌های خودایمنی مثل لوپوس دیده می‌شوند؛ این تشخیص نیست و پزشک باید آن‌ها را با هم ببیند" +
      (s.kidney ? "، به‌ویژه درگیریِ کلیه که درمانِ زودهنگام را مهم می‌کند." : "."),
    suggest: [
      "بررسی توسط متخصص روماتولوژی",
      ...(s.kidney ? ["بررسی توسط پزشک (احتمالاً نفرولوژی)", "نسبت پروتئین به کراتینین ادرار"] : []),
      ...(s.anemia ? ["تست کومبس"] : []),
    ],
    warnings: [CAUTION_DRUG],
  };
}

export const RULES_AUTOIMMUNE = [
  { id: "islet_autoantibody_result", match: (e) => anyPresent(stateOf(e, ISLET_IDS)), build: isletBuild },
  { id: "ana_family_result", match: (e) => anyPresent(stateOf(e, ANA_IDS)), build: (e) => anaBuild(e, ctx(e)) },
  { id: "anca_result", match: (e) => anyPresent(stateOf(e, ANCA_IDS)), build: ancaBuild },
  { id: "hla_b27_result", match: (e) => autoAbState(e, "HLA_B27").state !== "absent", build: b27Build },
  { id: "anti_ccp_result", match: (e) => autoAbState(e, "ANTI_CCP").state !== "absent", build: ccpBuild },
  { id: "complement_result", match: (e) => ["C3", "C4", "CH50"].some((id) => autoAbState(e, id).state !== "absent"), build: complementBuild },
  { id: "lupus_activity_link", match: (e) => !!lupusLinkState(e), build: lupusLinkBuild },   // P147-۴
  { id: "ssc_antibody_result", match: (e) => anyPresent(stateOf(e, SSC_IDS)), build: sscBuild },
  { id: "myositis_antibody_result", match: (e) => autoAbState(e, "JO1").state !== "absent", build: jo1Build },
  { id: "antiphospholipid_result", match: (e) => anyPresent(stateOf(e, APL_IDS)), build: aplBuild },
  { id: "tumor_markers_result", match: (e) => anyPresent(stateOf(e, TM_IDS)), build: tmBuild },
  { id: "psa_result", match: (e) => anyPresent(stateOf(e, PSA_IDS)), build: psaBuild },
  { id: "gi_stool_result", match: (e) => anyPresent(stateOf(e, GI_IDS)), build: giBuild },
  // specs/023 (P136)
  { id: "celiac_serology_result", match: celiacPresent, build: celiacBuild },
  { id: "liver_autoantibody_result", match: (e) => anyPresent(stateOf(e, LIVER_AB_IDS)), build: liverAbBuild },
  { id: "mg_antibody_result", match: (e) => ["ACHR", "ANTI_MUSK"].some((id) => present(autoAbState(e, id))), build: mgBuild },
  { id: "immunoglobulin_result", match: (e) => IG_IDS.some((id) => present(autoAbState(e, id)) && !(id === "IGA_TOTAL" && celiacPresent(e))), build: igBuild },
  { id: "dnaseb_result", match: (e) => present(autoAbState(e, "ANTI_DNASEB")), build: dnasebBuild },
];
