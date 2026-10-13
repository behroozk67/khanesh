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
import { canBePregnant } from "./patterns_utils.js";

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
const label = (a, id) => a.name ?? faName(id);
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
    if (a.state === "noref") return `${nm} روی برگهٔ شما ${num} است؛ محدودهٔ مرجع روی همان ردیف چاپ نشده، پس بالا یا پایین بودنش را نمی‌توان گفت.`;
    const where = a.state === "below" ? "پایین‌تر از" : a.state === "within" ? "داخلِ" : "بالاتر از";
    return `${nm} روی برگهٔ شما ${num} است و ${where} ${a.state === "within" ? "محدودهٔ" : "مرزِ"} چاپ‌شدهٔ همان ردیف است.`;
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

const CRITERIA_NOTE = "معیارهای طبقه‌بندی (EULAR/ACR و ...) برای پژوهش و کمک به تشخیص‌اند و جایگزینِ قضاوتِ پزشک نیستند.";

// ═══════════ ۱) ANA و آنتی‌بادی‌های اختصاصیِ هسته‌ای ═══════════
const ANA_IDS = ["ANA", "ANTI_DSDNA", "ANTI_SM", "ANTI_RNP", "ANTI_RO", "ANTI_LA"];
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
  const urgency = urgencyOf(specificPos);
  const parts = ANA_IDS.filter((id) => present(st[id])).map((id) => lineOf(st[id], id));

  if (anaPos) {
    for (const p of st.ANA.patterns ?? []) if (PATTERN_FA[p]) parts.push(`${PATTERN_FA[p]}.`);
    parts.push(`در معیارهای طبقه‌بندیِ لوپوس (EULAR/ACR 2019) ANA با تیتر ۱:۸۰ یا بیشتر شرطِ ورود به بررسی است و ANAِ منفی برای آن معیارها ورودی نیست؛ ${CRITERIA_NOTE}`);
  }
  if (isPos(st.ANTI_DSDNA) || isPos(st.ANTI_SM)) {
    parts.push("در همان معیارها anti-dsDNA یا anti-Sm هر کدام ۶ امتیاز دارند، به شرطی که آزمایش اختصاصیتِ بالا (دست‌کم ۹۰٪) داشته باشد؛ ولی امتیازدهی علائمِ بالینی هم می‌خواهد و از روی آزمایش به‌تنهایی حساب نمی‌شود.");
  }
  if (isPos(st.ANTI_SM)) parts.push("anti-Sm از آنتی‌بادی‌های بسیار اختصاصی‌تر برای لوپوس است.");
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
      parts.push("چون باردارید: در حدود ۲٪ بارداری‌هایی که مادر Ro/SSA مثبت دارد (حدود ۳٪ اگر هر دو Ro و La مثبت باشند) نوزاد دچار بلوکِ مادرزادیِ قلب می‌شود. دورانِ پرخطر هفتهٔ ۱۶ تا ۲۶ است و راهنمای ACR 2020 در این هفته‌ها اکوکاردیوگرافیِ جنین را توصیه می‌کند. این را حتماً به پزشکِ زنان بگویید.");
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
  if (specificPos) suggest.push("بررسی توسط متخصص روماتولوژی");

  const ex = explainsOf(e, st);
  return {
    pattern: "ana_family_result",
    urgency, action: ACTION[urgency],
    headline: specificPos
      ? "آنتی‌بادی‌های اختصاصیِ هسته‌ای (anti-dsDNA / Sm / RNP / Ro / La) در آزمایش شما مثبت یا بالاتر از مرز است"
      : anaPos ? "آزمایش ANA شما مثبت است"
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
  const c3 = autoAbState(e, "C3"), c4 = autoAbState(e, "C4");
  const items = [["C3", c3], ["C4", c4]].filter(([, a]) => present(a));
  const low = items.some(([, a]) => a.state === "below");
  const bothLow = c3.state === "below" && c4.state === "below";
  const lines = items.map(([id, a]) => {
    if (isUnsure(a)) return lineOf(a, id);   // بی‌محدودهٔ چاپی / مرزی: «داخل/بالا/پایین» نگو
    const num = `${a.shown}${a.unit ? ` ${a.unit}` : ""}`;
    const where = a.state === "below" ? "پایین‌تر از" : a.state === "above" ? "بالاتر از" : "داخلِ";
    return `${faName(id)} روی برگهٔ شما ${num} است و ${where} محدودهٔ چاپ‌شدهٔ همان ردیف است.`;
  });
  const parts = [...lines];
  if (low) {
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
  const urgency = urgencyOf(low);
  return {
    pattern: "complement_result", urgency, action: ACTION[urgency],
    headline: low ? "کمپلمان C3 یا C4 شما پایین‌تر از محدودهٔ چاپ‌شده است" : "نتیجهٔ کمپلمان (C3 / C4) شما",
    must_say: parts.join(" "),
    suggest: [], warnings: low ? [CAUTION_DRUG] : [],
    explains: items.map(([id]) => id),
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
const APL_IDS = ["LUPUS_AC", "ACL_IGG", "ACL_IGM", "ACL", "B2GPI_IGG", "B2GPI_IGM", "B2GPI"];
function aplBuild(e) {
  const st = stateOf(e, APL_IDS);
  const pos = APL_IDS.some((id) => isPos(st[id]));
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
    if (la && acl && b2) parts.push("مثبت‌بودنِ هر سه آزمایش (لوپوس‌آنتی‌کوآگولان، کاردیولیپین و بتا-۲ گلیکوپروتئین I) پرخطرترین الگو شمرده می‌شود.");
    for (const [id, nm] of [["LUPUS_AC", "لوپوس‌آنتی‌کوآگولان"]]) if (!present(st[id])) parts.push(`${nm} روی این برگه نیست.`);
    if (!APL_IDS.some((id) => /^ACL/.test(id) && present(st[id]))) parts.push("کاردیولیپین روی این برگه نیست.");
    if (!APL_IDS.some((id) => /^B2GPI/.test(id) && present(st[id]))) parts.push("بتا-۲ گلیکوپروتئین I روی این برگه نیست.");
  } else if (APL_IDS.some((id) => isUnsure(st[id]))) {
    parts.push(UNSURE_NOTE + " آنتی‌فسفولیپید (لوپوس‌آنتی‌کوآگولان، کاردیولیپین، بتا-۲ گلیکوپروتئین I) با خطرِ لخته و عوارضِ بارداری مرتبط است و مثبت‌بودنش باید ۱۲ هفته بعد تأیید شود.");
  } else {
    parts.push("این فقط دربارهٔ همین آزمایش‌هاست؛ سندرم آنتی‌فسفولیپید با سه آزمایش (لوپوس‌آنتی‌کوآگولان، کاردیولیپین، بتا-۲ گلیکوپروتئین I) بررسی می‌شود و منفی‌بودنِ یکی از آن‌ها بقیه را رد نمی‌کند.");
  }
  const ex = explainsOf(e, st);
  return {
    pattern: "antiphospholipid_result", urgency, action: ACTION[urgency],
    headline: pos ? "آنتی‌بادی آنتی‌فسفولیپید در آزمایش شما مثبت یا بالاتر از مرز است" : APL_IDS.some((id) => isUnsure(st[id])) ? "نتیجهٔ آزمایش‌های آنتی‌فسفولیپید شما" : "آزمایش‌های آنتی‌فسفولیپید شما منفی یا داخلِ محدودهٔ چاپ‌شده است",
    must_say: parts.join(" "),
    suggest: pos ? ["بررسی توسط متخصص روماتولوژی"] : [],
    warnings: pos ? ["بدونِ نظرِ پزشک داروی ضدانعقاد یا آسپرین را شروع یا قطع نکنید."] : [],
    ...(ex.length ? { explains: ex } : {}),
  };
}

// ═══════════ ۹) تومورمارکرها ═══════════
const TM_IDS = ["CEA", "AFP", "CA125", "CA199", "CA153", "B2M", "CALCITONIN", "CGA"];
const TM_CONTEXT = {
  CEA: "CEA ابزارِ غربالگری یا تشخیصِ سرطان نیست؛ کاربردِ اصلی‌اش پایشِ بیمارِ شناخته‌شدهٔ سرطانِ روده‌ی بزرگ پس از درمان است. در سیگاری‌ها و بیماری‌های التهابی و خوش‌خیم هم بالا می‌رود.",
  AFP: "AFP برای پایشِ گروه‌های پرخطرِ کبد (سیروز، ناقلِ مزمنِ هپاتیت B) همراهِ سونوگرافیِ هر ۶ ماه به‌کار می‌رود، نه غربالگریِ جمعیتِ عمومی. بیماریِ کبدیِ فعال و بارداری هم آن را بالا می‌برند.",
  CA125: "CA 125 غربالگریِ سرطانِ تخمدان نیست؛ اندومتریوز، فیبرومِ رحم، التهابِ لگن، قاعدگی و آسیت هم آن را بالا می‌برند (به‌ویژه پیش از یائسگی).",
  CA199: "CA 19-9 غربالگری نیست و در افرادِ بی‌علامت ارزشِ پیش‌بینیِ بسیار پایینی دارد. انسدادِ صفراوی، پانکراتیت، کلانژیت و نارسایی کلیه آن را بالا می‌برند. حدود ۵ تا ۱۰ درصدِ مردم فنوتیپِ Lewis-منفی‌اند و اصلاً این نشانگر را نمی‌سازند، پس نتیجهٔ طبیعی در آن‌ها اطمینان‌بخش نیست.",
  CA153: "CA 15-3 برای غربالگری یا تشخیصِ سرطانِ پستان کاربرد ندارد؛ فقط برای پایشِ بیماریِ پیشرفته همراهِ تصویربرداری و معاینه به‌کار می‌رود.",
  B2M: "بتا-۲ میکروگلوبولین در نارسایی کلیه بالا می‌رود و باید کنارِ کراتینین دیده شود. این آزمایش در بیمارانِ مبتلا به مولتیپل میلوما برای مرحله‌بندی و پیش‌آگهی (ISS) به‌کار می‌رود؛ بالا بودنش در فردِ بدونِ آن بیماری، تشخیص نیست.",
  CALCITONIN: "کلسی‌تونین بیشتر در افرادِ مشکوک به سرطانِ مدولاریِ تیروئید یا ندولِ تیروئید به‌کار می‌رود. داروهای مهارکنندهٔ اسید معده (PPI)، نارسایی کلیه، گاستریتِ آتروفیک، هیپرگاسترینمی، سیروز، کلسیمِ بالا و تیروئیدیتِ خودایمنی هم آن را بالا می‌برند.",
  CGA: "کروموگرانین A نشانگرِ تومورهای نورواندوکرین است و به‌تنهایی برای پایش کافی نیست. داروهای PPI (مثل امپرازول و پانتوپرازول) آن را کاذب و گاهی چند برابر بالا می‌برند؛ پیش از آزمایش، قطعِ آن‌ها دست‌کم ۲ هفته (فقط با نظرِ پزشک) توصیه شده است. گاستریتِ آتروفیک، کم‌خونیِ پرنیشیوز و نارسایی کلیه هم آن را بالا می‌برند.",
};

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
  for (const id of items) parts.push(TM_CONTEXT[id]);
  if (calcHi) parts.push("کلسی‌تونینِ پایه بالای ۱۰۰ pg/mL در گزارش‌ها با احتمالِ بالای سرطانِ مدولاریِ تیروئید همراه بوده است و نیازمندِ ارزیابیِ تخصصی (غدد یا جراحیِ سر و گردن) است؛ این حکمِ تشخیص نیست.");
  parts.push(above
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
  const urgency = urgencyOf(above || (band && band.high));
  parts.push(
    "PSA نشانگرِ بافتِ پروستات است نه فقط سرطان: بزرگیِ خوش‌خیم، التهاب و عفونتِ پروستات، سوندگذاری، انزالِ اخیر و دوچرخه‌سواری هم آن را بالا می‌برند. " +
    "اگر فیناستراید یا دوتاستراید مصرف می‌کنید، پس از حدود ۶ ماه PSA را تا حدود ۵۰٪ کمتر نشان می‌دهد و پزشک باید آن را در تفسیر لحاظ کند.");
  if (!present(tot) && present(fr)) parts.push("PSA کل روی این برگه نیست؛ Free PSA بدونِ PSA کل تفسیر نمی‌شود.");
  const ex = explainsOf(e, st);
  return {
    pattern: "psa_result", urgency, action: ACTION[urgency],
    headline: above ? "PSA شما بالاتر از محدودهٔ چاپ‌شده است" : "نتیجهٔ PSA شما",
    must_say: parts.join(" "),
    suggest: [], warnings: [],
    ...(ex.length ? { explains: ex } : {}),
  };
}

// ═══════════ ۱۱) کالپروتکتین و FIT ═══════════
const GI_IDS = ["CALPROTECTIN", "FIT"];
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
  if (present(fit)) {
    parts.push(lineOf(fit, "FIT"));
    if (isPos(fit)) {
      parts.push(
        "خونِ مخفی در مدفوع یعنی مقدار کمی خون از دستگاه گوارش دفع شده است؛ علتش لزوماً سرطان نیست (هموروئید، پولیپ و بیماری‌های التهابی هم علت‌اند). " +
        "طبق راهنماهای غربالگری (USPSTF 2021 و MSTF) هر نتیجهٔ مثبتِ FIT باید با کولونوسکوپی پیگیری شود و تکرارِ آزمایش جایگزینِ آن نیست.");
    } else if (isNeg(fit)) {
      parts.push("غربالگری با FIT در افرادِ بدونِ علامت از ۴۵ تا ۷۵ سالگی سالی یک بار توصیه می‌شود (USPSTF 2021)؛ این نتیجه فقط دربارهٔ همین نمونه است و اگر خونریزیِ مقعدی، تغییرِ مداومِ اجابت مزاج یا کاهشِ وزنِ ناخواسته دارید، منفی بودنش مانعِ مراجعه نیست.");
    } else {
      parts.push("آستانهٔ مثبت‌بودنِ FIT به کیت و برنامه بستگی دارد (مثلاً ۲۰ µg Hb/g مدفوع در آمریکا و ۱۰ µg/g در مسیرِ بیماران علامت‌دار در بریتانیا)؛ بدونِ محدودهٔ چاپیِ همین کیت نمی‌توان گفت این عدد مثبت است یا نه.");
    }
  }
  const pos = isPos(cal) || isPos(fit);
  const urgency = urgencyOf(pos);
  const ex = explainsOf(e, st);
  return {
    pattern: "gi_stool_result", urgency, action: ACTION[urgency],
    headline: isPos(fit) ? "آزمایش خونِ مخفی در مدفوع (FIT/FOBT) شما مثبت یا بالاتر از مرز است"
      : isPos(cal) ? "کالپروتکتینِ مدفوعِ شما بالاتر از محدودهٔ چاپ‌شده است" : "نتیجهٔ آزمایش مدفوعِ شما (کالپروتکتین / خونِ مخفی)",
    must_say: parts.join(" "),
    suggest: isPos(fit) ? ["کولونوسکوپی"] : [],
    warnings: pos ? ["اگر خونریزیِ آشکار از مقعد، سیاه‌شدنِ مدفوع یا دردِ شدیدِ شکم پیدا کردید، همان روز به اورژانس مراجعه کنید."] : [],
    ...(ex.length ? { explains: ex } : {}),
  };
}

const ctx = (e) => ({ pregnant: e.pregnant === true });
export const RULES_AUTOIMMUNE = [
  { id: "ana_family_result", match: (e) => anyPresent(stateOf(e, ANA_IDS)), build: (e) => anaBuild(e, ctx(e)) },
  { id: "anca_result", match: (e) => anyPresent(stateOf(e, ANCA_IDS)), build: ancaBuild },
  { id: "hla_b27_result", match: (e) => autoAbState(e, "HLA_B27").state !== "absent", build: b27Build },
  { id: "anti_ccp_result", match: (e) => autoAbState(e, "ANTI_CCP").state !== "absent", build: ccpBuild },
  { id: "complement_result", match: (e) => ["C3", "C4"].some((id) => autoAbState(e, id).state !== "absent"), build: complementBuild },
  { id: "ssc_antibody_result", match: (e) => anyPresent(stateOf(e, SSC_IDS)), build: sscBuild },
  { id: "myositis_antibody_result", match: (e) => autoAbState(e, "JO1").state !== "absent", build: jo1Build },
  { id: "antiphospholipid_result", match: (e) => anyPresent(stateOf(e, APL_IDS)), build: aplBuild },
  { id: "tumor_markers_result", match: (e) => anyPresent(stateOf(e, TM_IDS)), build: tmBuild },
  { id: "psa_result", match: (e) => anyPresent(stateOf(e, PSA_IDS)), build: psaBuild },
  { id: "gi_stool_result", match: (e) => anyPresent(stateOf(e, GI_IDS)), build: giBuild },
];
