import { serologyReactive, qualPositive, qualValue, titreFa, hasInflammation, whoFerritinThreshold, whoInflamIronDeficiency, urinePositive, urineCellCount, urineGrade, isNephrotic, isGlomerulonephritis, isDIC, val, rankOf, CRP_RE, RF_RE, qualVerdict } from "./patterns_utils.js";
import { faName } from "./names.js";
import { CTCAE_V5 } from "./ctcae.js";
import { RULES_MALIGNANCY } from "./patterns_malignancy.js";
import { preanalyticalCaveats, attachPreanalytical } from "./preanalytical.js";
import { repeatDeltaFa } from "./biovar.js";
import { isNeonate, ageFa, nextNeonatalBand, NEONATAL_DANGER_WARNING, NEONATAL_SAMEDAY_ACTION } from "./neonatal.js";
// P77-۱۰ (تصمیمِ بازبین؛ Chiesa et al.): PCTِ نوزادِ ترم در ≈ ۲۴ ساعت تا حدود ۲۰ ng/mL فیزیولوژیک است.
const PCT_EARLY_NEONATE_DAYS = 2;
const PCT_EARLY_NEONATE_95TH = 20;

// P134-G3 (specs/022، N4): غربالگریِ واکنش‌گر کنارِ آزمایشِ مولکولیِ همان ویروس روی همان برگه (adapter M16 ⇒ unmapped، «تفسیر نشدند»)
//   همان آزمایش را دوباره درخواست می‌کرد. حالا می‌گوید روی برگه هست و تفسیر نشده، و درخواستش از suggest می‌افتد. فوریت دست‌نخورده.
const HCV_MOLECULAR_RE = /(hcv|hepatitis\s*c|هپاتیت\s*c).*\b(rna|pcr|nat|viral\s*load)\b/i;
const HBV_MOLECULAR_RE = /(hbv|hepatitis\s*b|هپاتیت\s*b).*\b(dna|pcr|nat|viral\s*load)\b/i;
function withMolecularOnSheet(e, re, label, finding) {
  const row = (e.unmapped ?? []).find((n) => re.test(String(n)));
  if (!row) return finding;
  return {
    ...finding,
    must_say: `${finding.must_say} آزمایشِ تکمیلیِ ${label} («${row}») روی همین برگه هست، ولی این سامانه نتیجهٔ آن را تفسیر نمی‌کند؛ برگه را برای خواندنِ آن به پزشک نشان دهید.`,
    suggest: finding.suggest.filter((s) => !s.includes(label)),
  };
}

export const RULES_INFECTIOUS = [
  // ═══════════ سرولوژی غربالگری (هپاتیت B/C، HIV) ═══════════
  // اصل CDC: یک نتیجه مثبت غربالگری هرگز تشخیص قطعی نیست.
  //   نتایج واکنش‌گر گاهی مثبت کاذب‌اند و همه نیاز به تست تأییدی دارند.
  // طراحی: سرتیتر خنثی (حریم خصوصی)، جزئیات و تست تأییدی در متن.
  //   نه blocks_others (نباید بقیه یافته‌ها را بپوشاند)، نه emergency (وحشت‌آفرین).

  {
    id: "hcv_screen_reactive",
    match: (e) => serologyReactive(e, /hcv|hepatitisc|هپاتیتc|آنتیبادیc/i),
    build: (e) => withMolecularOnSheet(e, HCV_MOLECULAR_RE, "HCV RNA", {
      pattern: "hcv_ab_reactive",
      urgency: "this_week",
      // سرتیتر خنثی — نام بیماری در سرتیتر نمی‌آید
      headline: "یکی از تست‌های غربالگری شما نیاز به یک آزمایش تکمیلی دارد",
      must_say:
        "یکی از تست‌های غربالگری (آنتی‌بادی هپاتیت C) واکنش‌گر شده است. " +
        "این یک تست غربالگری است، نه تشخیص قطعی — و حتماً باید با یک آزمایش تکمیلی بررسی شود. " +
        "دو نکته مهم: اول اینکه گاهی این تست می‌تواند «مثبت کاذب» باشد یعنی فرد اصلاً عفونت ندارد. " +
        "دوم اینکه حتی اگر واقعی باشد، آنتی‌بادی مثبت می‌تواند نشان‌دهنده‌ی عفونت گذشته‌ای باشد که بدن از آن عبور کرده، نه لزوماً عفونت فعال. " +
        "برای روشن شدن قطعی، آزمایش تکمیلی لازم است.",
      // تست تأییدی مفصل با توضیح در suggest
      suggest: [
        "آزمایش HCV RNA (PCR) — این تست مشخص می‌کند که آیا ویروس همین حالا در خون فعال است یا نه؛ تنها راه تأیید عفونت فعلی همین است",
        "مراجعه به پزشک برای تفسیر درست و تعیین مراحل بعدی",
      ],
      warnings: [
        "تا وقتی آزمایش تکمیلی انجام نشده، نتیجه را قطعی نگیرید و نگران نشوید. این نتیجه به‌تنهایی تشخیص نیست.",
      ],
    }),
  },

  {
    id: "hbv_screen_reactive",
    // ⚠️ «hbs» تنها عمداً حذف شد: Anti-HBs (ایمنیِ واکسن) هم آن را جور می‌کرد و
    //    به فردِ واکسینه گفته می‌شد ممکن است هپاتیت B داشته باشد. فقط آنتی‌ژنِ
    //    سطحی — که نشانهٔ عفونت است — این قاعده را فعال می‌کند. Anti-HBc هم
    //    خارج است: تفسیرش با HBsAg یکی نیست.
    match: (e) => serologyReactive(
      e,
      /hbsag|hepatitisbsurface|هپاتیتb|استرالیا/i,
      /^anti|آنتیبادی|antibody|hbsab|hbcab|surfaceab|ab$/i,
    ),
    build: (e) => withMolecularOnSheet(e, HBV_MOLECULAR_RE, "HBV DNA", {
      pattern: "hbsag_reactive",
      urgency: "this_week",
      headline: "یکی از تست‌های غربالگری شما نیاز به یک آزمایش تکمیلی دارد",
      must_say:
        "یکی از تست‌های غربالگری (آنتی‌ژن سطحی هپاتیت B یا HBsAg) واکنش‌گر شده است. " +
        "این یک تست غربالگری است، نه تشخیص قطعی. نتایج واکنش‌گر گاهی می‌توانند مثبت کاذب باشند، " +
        "و برای اطمینان حتماً باید با آزمایش‌های تکمیلی بررسی شوند. " +
        "این آزمایش‌ها همچنین مشخص می‌کنند که آیا عفونت تازه است یا مزمن، و چقدر فعال است.",
      suggest: [
        "تکرار HBsAg همراه با تست تأییدی تخصصی — برای رد کردن احتمال مثبت کاذب",
        "پنل کامل هپاتیت B (HBeAg، Anti-HBc، Anti-HBs) — برای تعیین مرحله و وضعیت عفونت",
        "آزمایش HBV DNA — برای اندازه‌گیری میزان فعالیت ویروس",
        "مراجعه به پزشک یا متخصص گوارش و کبد برای تفسیر و پیگیری",
      ],
      warnings: [
        "تا وقتی آزمایش‌های تکمیلی انجام نشده، نتیجه را قطعی نگیرید. این نتیجه به‌تنهایی تشخیص نیست.",
      ],
    }),
  },

  {
    id: "hiv_screen_reactive",
    match: (e) => serologyReactive(e, /hiv|ایدز|ایچآیوی/i),
    build: () => ({
      pattern: "hiv_screen_reactive",
      urgency: "this_week",
      // حریم خصوصی: سرتیتر کاملاً خنثی، هیچ نامی برده نمی‌شود
      headline: "یکی از تست‌های غربالگری شما نیاز به یک آزمایش تکمیلی دارد",
      must_say:
        "یکی از تست‌های غربالگری واکنش‌گر شده است و نیاز به بررسی تکمیلی دارد. " +
        "بسیار مهم است بدانید که این یک تست غربالگری است، نه تشخیص — و نتایج غربالگری واکنش‌گر گاهی مثبت کاذب هستند. " +
        "به همین دلیل، تأیید قطعی نیاز به آزمایش‌های تأییدی جداگانه دارد و هرگز از روی یک نتیجه‌ی مثبت نمی‌توان نتیجه‌گیری قطعی کرد. " +
        "آرام باشید و مرحله‌ی بعدی را با یک پزشک انجام دهید.",
      suggest: [
        "آزمایش تأییدی تخصصی که نوع دقیق را مشخص می‌کند (تست تفکیکی HIV-1/HIV-2) — برای رد کردن مثبت کاذب",
        "در صورت نیاز، آزمایش HIV RNA (بار ویروسی) — که مستقیماً وجود ویروس را می‌سنجد",
        "مراجعه به پزشک یا مراکز مشاوره‌ی مخصوص برای انجام تست تأییدی و راهنمایی محرمانه",
      ],
      warnings: [
        "این نتیجه به‌تنهایی تشخیص نیست. تا انجام آزمایش تأییدی، آن را قطعی در نظر نگیرید.",
      ],
    }),
  },

  // ═══════════ بروسلوز (تب مالت) ═══════════
  // آستانه‌ها: راهنمای کشوری تشخیص و درمان بروسلوز، وزارت بهداشت، ص ۴۰ —
  //   رایت ≥۱/۸۰، 2ME ≥۱/۴۰، کومبس رایت ≥۱/۴۰. عمداً از عددِ CDC (SAT ≥۱:۱۶۰)
  //   پایین‌تر است چون گونهٔ غالبِ انسانی در ایران B. melitensis است ولی آنتی‌ژنِ
  //   تست B. abortus، و عیارِ به‌دست‌آمده ≈ نصفِ رقمِ حقیقی (همان راهنما، ص ۳۴).
  //
  // فوریت هرگز emergency نیست: بروسلوز تحتِ‌حاد است و از روی سرولوژیِ تنها
  //   اورژانس نمی‌شود — ولی هفته‌ها آنتی‌بیوتیکِ ترکیبی می‌خواهد و درمان‌نشده
  //   به اندوکاردیت/اسپوندیلیت می‌رسد. پس this_week.
  {
    id: "brucella_active",
    match: (e) => {
      const w = e.graded.find((g) => g.test === "WRIGHT");
      const m = e.graded.find((g) => g.test === "ME2");
      const c = e.graded.find((g) => g.test === "COOMBS_WRIGHT");
      const wSig = w?.value >= 80;
      const mSig = m?.value >= 40;
      const cSig = c?.value >= 40;
      // تعریفِ موردِ فعال: (رایت باارزش + 2ME باارزش) یا کومبسِ باارزش (با رایتِ زیرِ آستانه یا باارزش).
      // N19 (لایهٔ ۲): «رایت ≥۱/۸۰ + کومبس ≥۱/۴۰ + 2ME زیرِ آستانه/غایب» نه فعال بود نه wright_only (که کومبس را رد می‌کند) ⇒ فقط
      //   `unmatched_abnormal` و فوریتِ routine — در حالی‌که رایتِ تنها this_week بود؛ آزمایشِ قوی‌تر فوریت را کم می‌کرد.
      return (wSig && mSig) || cSig;
    },
    build: (e) => {
      const w = e.graded.find((g) => g.test === "WRIGHT");
      const m = e.graded.find((g) => g.test === "ME2");
      const c = e.graded.find((g) => g.test === "COOMBS_WRIGHT");
      const esr = e.graded.find((g) => g.test === "ESR");
      const wSig = w?.value >= 80;
      const blocked = !wSig && c?.value >= 40;
      const cSig = c?.value >= 40;
      const mSig = m?.value >= 40;
      const esrHigh = esr?.value > 40;
      const parts = [];
      if (w) parts.push(`رایت ${titreFa(w.value)}`);
      if (m) parts.push(`2ME ${titreFa(m.value)}`);
      if (c) parts.push(`کومبس رایت ${titreFa(c.value)}`);
      return {
        pattern: "brucella_active",
        urgency: "this_week",
        headline: "نتایج سرولوژی شما به تب مالت (بروسلوز) اشاره دارد",
        must_say:
          `${parts.join("، ")} گزارش شده. ` +
          "تب مالت عفونتی است که معمولاً از شیر و لبنیاتِ غیرپاستوریزه یا تماس با دام می‌گیرند. " +
          (blocked
            ? "نکتهٔ مهم اینجا این است که رایتِ ساده زیر آستانه مانده ولی کومبس رایت مثبت است؛ این حالت وقتی رخ می‌دهد که آنتی‌بادی‌های «بلوک‌کننده» جلوی واکنشِ رایت را می‌گیرند و بیشتر در شکل‌های طولانی‌شده دیده می‌شود. "
            : (cSig && !mSig)
              ? "کومبس رایت هم کنارِ رایت مثبت است؛ کومبس رایت آنتی‌بادی‌های ناقص (IgG) را هم نشان می‌دهد و مثبت‌بودنش به‌سود عفونتِ فعال است، هرچند 2ME " + (m ? `${titreFa(m.value)} و زیرِ آستانه` : "انجام نشده") + " مانده. "
            : "مثبت بودنِ 2ME در کنار رایت، به‌سود عفونتِ فعال است — چون 2ME فقط IgG را می‌سنجد و در تب مالت همین IgG است که با بیماریِ فعال و علامت‌دار همراهی دارد. ") +
          (esrHigh ? `ESR شما هم ${esr.value} است؛ ESR بالای ۴۰ با درگیریِ موضعی مثل مهره یا مفصل همراهی دارد و باید جدی گرفته شود. ` : "") +
          "درمانِ تب مالت چند هفته آنتی‌بیوتیکِ ترکیبی است و نیمه‌کاره رها کردنش باعث عود می‌شود، پس حتماً زیر نظر پزشک انجام شود. " +
          "یک نکته که پزشک لازم دارد: تیترِ منفرد به‌تنهایی «عفونتِ فعال» را از «تماسِ قبلی» جدا نمی‌کند؛ آنچه ارزش دارد افزایشِ چهاربرابریِ تیتر در فاصلهٔ دو هفته است.",
        action:
          "این هفته حتماً به پزشک (ترجیحاً عفونی) مراجعه کنید و همین برگه را همراه ببرید. " +
          "حتماً بگویید آیا شیر یا پنیرِ محلیِ غیرپاستوریزه مصرف کرده‌اید، یا با دام (گوسفند، بز، گاو) تماس داشته‌اید، و آیا تب، تعریق شبانه، درد مفاصل و کمردرد دارید.",
        suggest: ["کشت خون", "تکرار تیتر پس از دو هفته", "CRP", "ESR"],
        warnings: [
          "درمان را خودسرانه شروع یا قطع نکنید؛ دورهٔ ناقص شایع‌ترین علتِ عودِ تب مالت است.",
          "اگر کمردردِ شدید، تنگی نفس یا تپش قلب داشتید زودتر مراجعه کنید — تب مالت گاهی مهره یا قلب را درگیر می‌کند.",
          "تا روشن شدن وضعیت، از مصرف لبنیاتِ غیرپاستوریزه پرهیز کنید و به سایر افراد خانواده هم بگویید.",
        ],
        ...(w?.value ? { key_number: w.value } : {}),
      };
    },
  },
  // بازبینیِ متامورفیک ۲۰۲۶-۱۰-۰۵ (N1/N19): 2MEِ باارزش (≥۱/۴۰، همان آستانهٔ بالا) بی‌رایتِ باارزش و بی‌کومبس هیچ مالکی نداشت ⇒
  //   فقط `unmatched_abnormal` («توضیحِ آماده نداریم»). عددِ تازه‌ای نیست؛ فوریت همان this_weekِ brucella_wright_only (هم‌رده).
  {
    id: "brucella_2me_only",
    match: (e) => {
      const w = e.graded.find((g) => g.test === "WRIGHT");
      const m = e.graded.find((g) => g.test === "ME2");
      const c = e.graded.find((g) => g.test === "COOMBS_WRIGHT");
      return m?.value >= 40 && !(w?.value >= 80) && !(c?.value >= 40);
    },
    build: (e) => {
      const w = e.graded.find((g) => g.test === "WRIGHT");
      const m = e.graded.find((g) => g.test === "ME2");
      const c = e.graded.find((g) => g.test === "COOMBS_WRIGHT");
      return {
        pattern: "brucella_2me_only",
        urgency: "this_week",
        headline: "تیتر 2ME شما باارزش است و باید کنارِ رایت تفسیر شود",
        must_say:
          `2ME ${titreFa(m.value)} گزارش شده که از آستانهٔ باارزشِ راهنمای کشوری (۱/۴۰) بالاتر است. ` +
          (w
            ? `رایت ${titreFa(w.value)} است و زیرِ آستانهٔ ۱/۸۰ مانده؛ این ترکیب غیرمعمول است، چون 2ME بخشی از همان آنتی‌بادی‌هایی است که رایت می‌سنجد، و معمولاً با تکرارِ هر دو آزمایش روشن می‌شود. `
            : "رایت روی این برگه نیست؛ 2ME همیشه کنارِ رایت تفسیر می‌شود، پس این عدد به‌تنهایی تشخیصِ تب مالت نیست. ") +
          (c ? `کومبس رایت ${titreFa(c.value)} است و زیرِ آستانهٔ ۱/۴۰. ` : "") +
          "2ME آنتی‌بادیِ IgG را می‌سنجد که در تب مالت با بیماریِ فعال همراهی دارد، ولی تصمیم با پزشک و پس از دیدنِ رایت و کومبس رایت است.",
        action:
          "این هفته با پزشک مطرح کنید. اگر تب، تعریق شبانه، درد مفاصل یا کمردرد دارید حتماً بگویید، و همچنین سابقهٔ مصرف لبنیاتِ غیرپاستوریزه یا تماس با دام.",
        suggest: [...(w ? ["تکرار تیتر پس از دو هفته"] : ["رایت"]), ...(c ? [] : ["کومبس رایت"])],
        warnings: [
          "بدون نظر پزشک آنتی‌بیوتیک شروع نکنید؛ درمانِ بی‌مورد هم عوارض دارد هم تفسیرِ آزمایش‌های بعدی را سخت می‌کند.",
        ],
        key_number: m.value,
      };
    },
  },
  // رایتِ باارزش ولی 2ME زیر آستانه — تماسِ قبلی/عفونتِ خیلی زودرس، نه موردِ قطعی.
  {
    id: "brucella_wright_only",
    match: (e) => {
      const w = e.graded.find((g) => g.test === "WRIGHT");
      const m = e.graded.find((g) => g.test === "ME2");
      const c = e.graded.find((g) => g.test === "COOMBS_WRIGHT");
      return w?.value >= 80 && !(m?.value >= 40) && !(c?.value >= 40);
    },
    build: (e) => {
      const w = e.graded.find((g) => g.test === "WRIGHT");
      const m = e.graded.find((g) => g.test === "ME2");
      return {
        pattern: "brucella_wright_only",
        urgency: "this_week",
        headline: "تیتر رایت شما باارزش است ولی تصویر هنوز کامل نیست",
        must_say:
          `رایت ${titreFa(w.value)} گزارش شده که در ایران آستانهٔ باارزش (۱/۸۰) را رد کرده` +
          (m ? `، اما 2ME ${titreFa(m.value)} است و زیر آستانهٔ ۱/۴۰ مانده` : "، اما 2ME انجام نشده") +
          ". " +
          "این ترکیب یک تشخیصِ قطعیِ تب مالت نیست: رایتِ مثبتِ تنها می‌تواند از تماسِ قبلی، عفونتِ خیلی زودرس، یا واکنشِ متقاطع با باکتری‌های دیگر باشد. " +
          "در افرادی که با دام سروکار دارند، تیترِ پایدار بدون بیماریِ فعال شایع است. " +
          "راهِ روشن‌شدن، تکرارِ آزمایش پس از دو هفته و دیدنِ افزایشِ چهاربرابریِ تیتر است — نه قضاوت از روی همین یک نوبت.",
        action:
          "این هفته با پزشک مطرح کنید و دربارهٔ تکرارِ تیتر پس از دو هفته تصمیم بگیرید. " +
          "اگر تب، تعریق شبانه، درد مفاصل یا کمردرد دارید حتماً بگویید، و همچنین سابقهٔ مصرف لبنیاتِ غیرپاستوریزه یا تماس با دام.",
        suggest: ["2ME", "کومبس رایت", "تکرار تیتر پس از دو هفته"],
        warnings: [
          "بدون نظر پزشک آنتی‌بیوتیک شروع نکنید؛ درمانِ بی‌مورد هم عوارض دارد هم تفسیرِ آزمایش‌های بعدی را سخت می‌کند.",
        ],
        ...(w?.value ? { key_number: w.value } : {}),
      };
    },
  },

  {
    id: "sepsis_markers",
    match: (e) => {
      const t = val(e);
      return (t.LACTATE != null && t.LACTATE >= 4) ||
             (t.PCT_SEPSIS != null && t.PCT_SEPSIS >= 2);
    },
    build: (e) => {
      const t = val(e);
      // P77-۱۰ (تصمیمِ بازبین ۲۰۲۶-۱۰-۰۴؛ Chiesa/Springer): در ۴۸ ساعتِ اولِ زندگی PCT به‌طور فیزیولوژیک بالا می‌رود (صدکِ ۹۵ام ≈ ۲۰ ng/mL در ۲۴ ساعت).
      //    پس PCT ۲ تا ۲۰ در < ۴۸ ساعت (بی‌لاکتاتِ ≥ ۴) soon است، نه اورژانس؛ بالاتر از آن اورژانس می‌ماند. سنِ ساعتی را موتور ندارد — روز.
      const early = e.age != null && e.age * 365 < PCT_EARLY_NEONATE_DAYS;
      const physio = early && !(t.LACTATE >= 4) && t.PCT_SEPSIS <= PCT_EARLY_NEONATE_95TH;
      return {
        pattern: "sepsis_markers",
        urgency: physio ? "soon" : "emergency",
        headline: "نشانگرهای عفونت شدید در خون شما بالاست",
        must_say:
          (t.LACTATE >= 4 ? `لاکتات ${t.LACTATE} است. ` : "") +
          (t.PCT_SEPSIS >= 2 ? `پروکلسی‌تونین ${t.PCT_SEPSIS} است. ` : "") +
          (physio
            ? "در ۴۸ ساعتِ اولِ زندگی این شاخص به‌طور طبیعی بالا می‌رود (تا حدود ۲۰ ng/mL در ۲۴ ساعت)، پس به‌تنهایی نشانهٔ عفونت نیست؛ ولی پزشکِ نوزاد باید آن را کنارِ حالِ نوزاد بسنجد."
            : "این اعداد نیاز به رسیدگی فوری دارند."),
        action: physio ? NEONATAL_SAMEDAY_ACTION : "همین حالا به اورژانس مراجعه کنید. این برگه را همراه ببرید.",
        suggest: [],
        warnings: [],
        blocks_others: !physio,
      };
    },
  },

  // ═══════════ التهاب ═══════════
  {
    id: "crp_pos_esr_normal",
    match: (e) => {
      const crpPos = Object.entries(e.qual).some(
        ([k, v]) => /crp/i.test(k) && qualVerdict(v).state === "pos"   /* N6: «+/-» ⊃ «+»؛ «Reactive» هم مثبت است */
      );
      const esr = e.graded.find((g) => g.test === "ESR");
      return crpPos && esr && !esr.abnormal;
    },
    build: () => ({
      pattern: "acute_inflammation_recent",
      urgency: "this_week",
      headline: "نشانه‌ای از التهاب تازه در بدن دیده می‌شود",
      must_say:
        "CRP بالا با ESR طبیعی معمولاً یعنی التهاب خیلی تازه است — ESR هنوز وقت نکرده بالا برود.",
      // بندِ ۴ (LIS ۲۰۲۶-۱۰-۰۶، N20): فوریت this_week بود و جمله بی‌زمان («با پزشک وقت بگیرید.»، ۵ درخواست). گارد L25.
      action: "این هفته با پزشک وقت بگیرید.",
      suggest: [],
      warnings: [],
    }),
  },

  // ── CRPِ کیفی («۳+»، «مثبت») ──
  // 🔴 باگ واقعی: «crp» در فهرست QUALITATIVE بود و به e.qual می‌رفت، ولی همهٔ
  //    الگوها دنبال کلیدِ عددیِ CRP_Q می‌گشتند. نتیجه: CRPِ ۳+ خوانده می‌شد،
  //    در جدولِ «مقادیر خوانده‌شده» می‌آمد، و در تفسیر هیچ‌جا ذکر نمی‌شد.
  //    (همان کلاسِ باگِ D-dimer: «خوانده می‌شد ولی تفسیر نداشت».)
  //
  // ⚠️ «۳+» را به mg/L ترجمه نمی‌کنیم: در کیت‌های نیمه‌کمی ضریبِ تبدیل روی
  //    برچسبِ همان کیت است (۵ تا ۱۰ mg/L) و در پلاکِ کیفی اصلاً فرمولی وجود
  //    ندارد — شدتِ لختگی را چشمی درجه می‌دهند. ساختنِ عدد یعنی جعلِ داده.
  {
    id: "crp_elevated",
    match: (e) => {
      const q = e.graded.find((g) => g.test === "CRP_Q");
      const quant = q?.abnormal && q.dir === "high";
      const qual = qualPositive(e, CRP_RE);
      // قاعدهٔ اختصاصی‌ترِ «CRP مثبت + ESR طبیعی» خودش متن دارد؛ دوباره‌گویی نکن.
      const esr = e.graded.find((g) => g.test === "ESR");
      if (qual && !quant && esr && !esr.abnormal) return false;
      return quant || qual;
    },
    build: (e) => {
      const q = e.graded.find((g) => g.test === "CRP_Q");
      const quant = q?.abnormal && q.dir === "high";
      const shown = quant ? `${q.value} (حد طبیعی ${q.range})` : `«${qualValue(e, CRP_RE)}»`;
      return {
        pattern: "crp_elevated",
        urgency: "this_week",
        headline: "شاخص التهاب (CRP) شما بالاست",
        must_say:
          `CRP شما ${shown} گزارش شده است. ` +
          "CRP پروتئینی است که کبد هنگام التهاب می‌سازد؛ بالا بودنش یعنی جایی در بدن التهاب فعال وجود دارد. " +
          (quant
            ? ""
            : "این آزمایش به‌شکلِ کیفی گزارش شده، یعنی فقط می‌گوید «بالاتر از حد آستانه است» و درجهٔ پلاسِ بیشتر یعنی التهابِ بیشتر — ولی عددِ دقیقی به دست نمی‌دهد و آن را نمی‌شود به mg/L ترجمه کرد، چون ضریبِ هر کیت فرق می‌کند. ") +
          "نکتهٔ مهم این است که CRP نمی‌گوید التهاب از کجاست: عفونت، آسیب بافتی، بیماری‌های خودایمنی و حتی یک سرماخوردگیِ ساده همه آن را بالا می‌برند. " +
          (quant
            ? "برای اینکه معلوم شود این عدد رو به بهبود است یا نه، معمولاً چند روز تا دو هفته بعد تکرار می‌شود. "
            : "برای پیگیریِ دقیق‌تر بهتر است CRP به‌صورت کمی (بر حسب mg/L) اندازه‌گیری شود تا بشود روند آن را با عدد دنبال کرد. ") +
          "پس این نتیجه به‌تنهایی تشخیص نیست؛ باید کنار علائم شما تفسیر شود.",
        action: "این هفته با پزشک مطرح کنید؛ اگر تب، درد موضعی یا علامت مشخصی دارید حتماً بگویید تا منشأ التهاب پیدا شود.",
        suggest: quant ? ["ESR", "تکرار CRP"] : ["CRP کمی (mg/L)", "ESR"],
        warnings: [],
        ...(quant ? { key_number: q.value } : {}),
      };
    },
  },

  // ── ESR بالا ──
  // 🔴 باگ واقعی: ESR باینری است و هیچ الگویی برنمی‌داشتش، پس «۸۵ با مرجعِ
  //    ۰–۲۰» به unmatched_abnormal می‌افتاد و به بیمار می‌گفت «برای این ترکیب
  //    توضیح آماده‌ای نداریم» — همان کلاسِ باگِ D-dimer.
  //
  // ⚠️ ESR غیراختصاصی است و مهم‌تر: خودِ کم‌خونی آن را کاذب بالا می‌برد.
  //    در بیمارِ کم‌خون، بخشی از عدد را همان کم‌خونی توضیح می‌دهد و این نکته
  //    باید گفته شود، وگرنه بیمار دنبال علتِ دومی می‌گردد که وجود ندارد.
  {
    id: "esr_elevated",
    match: (e) => {
      const esr = e.graded.find((g) => g.test === "ESR");
      return esr?.abnormal && esr.dir === "high";
    },
    build: (e) => {
      const esr = e.graded.find((g) => g.test === "ESR");
      const hgb = e.graded.find((g) => g.test === "HGB");
      const anemic = hgb?.abnormal && hgb.dir === "low";
      const marked = esr.value >= 100;
      const crpMeasured = e.graded.some((g) => g.test === "CRP_Q") || qualPositive(e, CRP_RE);
      return {
        pattern: "esr_elevated",
        urgency: marked ? "this_week" : "routine",
        // زیرِ یافته‌های مهم‌تر پنهان نشود — مثل D-dimer.
        always_show: true,
        headline: "سرعت رسوب گلبول‌ها (ESR) بالاتر از حد طبیعی است",
        must_say:
          `ESR شما ${esr.value} است (حد طبیعی ${esr.range}). ` +
          "ESR سرعتِ ته‌نشین شدن گلبول‌های قرمز را می‌سنجد و یک شاخصِ عمومیِ التهاب است؛ وقتی التهاب باشد پروتئین‌های خون بیشتر می‌شوند و گلبول‌ها سریع‌تر ته‌نشین می‌شوند. " +
          (anemic
            ? "نکتهٔ مهمی که باید بدانید: خودِ کم‌خونی ESR را بالا می‌برد، بنابراین بخشی از این عدد را همان کم‌خونیِ شما توضیح می‌دهد و لزوماً نشانهٔ یک مشکلِ جداگانه نیست. "
            : "") +
          (marked
            ? "با این حال مقدار شما بالای ۱۰۰ است؛ در این حد معمولاً یک علتِ مشخص وجود دارد (عفونتِ طول‌کشیده، التهابِ فعال، یا بیماری‌های خاص) و بررسی لازم است. "
            : "ESR به‌تنهایی نمی‌گوید علت چیست و با سن، جنسیت، بارداری و حتی خستگیِ ساده هم بالا می‌رود، پس باید کنار علائم شما تفسیر شود. ") +
          (crpMeasured
            ? ""
            : "معمولاً CRP را هم کنارش می‌سنجند: CRP سریع‌تر بالا و پایین می‌رود و برای تشخیصِ التهابِ تازه دقیق‌تر است. "),
        action: marked
          ? "این هفته با پزشک مطرح کنید تا علت پیدا شود؛ اگر تب، کاهش وزن بی‌دلیل، تعریق شبانه یا دردِ مداوم دارید حتماً بگویید."
          : "با پزشک مطرح کنید. اگر علامتی ندارید، معمولاً تکرارِ آزمایش پس از چند هفته کافی است.",
        suggest: ["CRP کمی (mg/L)", "تکرار ESR"],
        warnings: [],
        key_number: esr.value,
      };
    },
  },

  // ═══════════ عفونت ویروسی — لنفوسیتوز ═══════════
  // ⚠️ نوزاد (زیرِ ۲۸ روز): «پس از بهبودِ عفونت» و «تکرار پس از بهبود» جملهٔ بزرگسال است (job c138671c، D3/D7).
  //   neonatalLymphocytosis (پایینِ فایل) می‌گوید بازه روزبه‌روز عوض می‌شود و عدد را پزشکِ نوزاد می‌سنجد.
  {
    id: "viral_lymphocytosis",
    match: (e) => {
      const lymph = e.graded.find((g) => g.test === "LYMPH_ABS");
      const lymphHigh = lymph?.abnormal && lymph.dir === "high";
      // نوتروفیل بالا نباشد (که به باکتریایی می‌خورد)
      const neut = e.graded.find((g) => g.test === "NEUT_ABS");
      const neutHigh = neut?.abnormal && neut.dir === "high";
      // job c138671c (D3): نوزادی که نوتروفیلش غایب است — لنفوسیت را neutrophil_count_missing سه‌حالته می‌گوید (یک یافته
      //   دربارهٔ یک عدد، N20). شرط همان match آن قاعده است، نه کپیِ آستانه.
      if (isNeonate(e.age) && e.ungraded?.NEUT_ABS?.reason === "diff_incomplete") return false;
      // P91 (N20): «معمولاً موقتی … تکرار پس از چند هفته» کنارِ «در اسرع وقت به هماتولوژیست» دو زمان‌بندی برای یک عدد بود.
      //   مالکِ لنفوسیت وقتی cll_suspicion_nccn فعال است همان است — خودِ match ِ آن صدا زده می‌شود، نه کپیِ آستانه (M91e).
      if (lymphHigh && RULES_MALIGNANCY.find((r) => r.id === "cll_suspicion_nccn")?.match(e)) return false;
      return lymphHigh && !neutHigh;
    },
    build: (e) => isNeonate(e.age) ? neonatalLymphocytosis(e) : lymphG3(e) ? markedLymphocytosis(e) : ({
      pattern: "viral_lymphocytosis",
      urgency: "routine",
      headline: "افزایش لنفوسیت‌ها معمولاً به یک عفونت ویروسی اشاره دارد",
      must_say:
        "لنفوسیت‌ها نوعی گلبول سفیدند که در عفونت‌های ویروسی بالا می‌روند. " +
        "این معمولاً موقتی است و پس از بهبود عفونت به حالت عادی برمی‌گردد.",
      action: "اگر علائم دارید یا این عدد خیلی بالاست، با پزشک مطرح کنید. در غیر این صورت تکرار آزمایش بعد از چند هفته کافی است.",
      suggest: ["تکرار CBC پس از بهبود", "اسمیر خون محیطی در صورت تداوم"],
      warnings: [],
    }),
  }];

// باگِ ۶ (LIS ۲۰۲۶-۱۰-۰۶، [66]): لنفوسیتِ ۲۰٬۷۹۳ کنارِ نوتروپنی «معمولاً موقتی است … تکرار پس از چند هفته کافی است» می‌گرفت
//   (cll_suspicion_nccn زیرِ ۵۰ سال فعال نیست). مرز = CTCAE v5 «Lymphocyte count increased» درجهٔ ۳ (> ۲۰٬۰۰۰/µL، ctcae.js) — عددِ تازه
//   نیست. در این درجه «ویروسی/موقتی» گفته نمی‌شود و عدد نقل می‌شود؛ نامِ بیماری نمی‌آید. P90 — منتظرِ بازبین.
function lymphG3(e) {
  const ly = e.graded.find((g) => g.test === "LYMPH_ABS");
  return !!ly && CTCAE_V5.LYMPH_HIGH.grade(Number(ly.value)) >= 3;
}
function markedLymphocytosis(e) {
  const ly = e.graded.find((g) => g.test === "LYMPH_ABS");
  return {
    pattern: "viral_lymphocytosis",
    urgency: "this_week",
    key_number: ly.value,
    headline: "تعداد لنفوسیت‌های خون شما خیلی بالاست",
    must_say:
      `لنفوسیت شما ${ly.value} است (حد طبیعی ${ly.range}). لنفوسیت‌ها نوعی گلبول سفیدند و عفونت‌های ویروسی هم آن‌ها را بالا می‌برند، ` +
      "ولی افزایش در این حد زیاد است و نباید فقط به حسابِ یک عفونتِ گذرا گذاشته شود؛ با بررسیِ لام خون معلوم می‌شود این سلول‌ها واکنشی‌اند یا نه.",
    action: "این هفته با پزشک مطرح کنید و این برگه را همراه ببرید.",
    suggest: ["لام خون محیطی", "تکرار CBC"],
    warnings: [],
  };
}

// نسخهٔ نوزادیِ viral_lymphocytosis (job c138671c، D3). بیرون از قاعده، تا LYMPH_ABS فقط از match در RULE_READS بیاید.
// ردیفِ لنفوسیتِ ۰–۳ روز با P57 پرسش ۴ یکی شد (۲۰۰۰–۷۵۰۰). اگر ردیفِ بعدی هنوز در دورهٔ نوزادی باشد متن آن را هم می‌گوید.
// حکمِ «ویروسی» نمی‌دهد.
function neonatalLymphocytosis(e) {
  const ly = e.graded.find((g) => g.test === "LYMPH_ABS");
  const next = nextNeonatalBand(ly.test, e.age);
  return {
    pattern: "viral_lymphocytosis",
    urgency: "routine",
    headline: "لنفوسیت‌های نوزاد بالاتر از بازهٔ این سن است",
    must_say:
      `لنفوسیت ${ly.value} است (بازهٔ مرجعِ نوزادی برای سنِ ${ageFa(e.age)}: ${ly.range}). ` +
      (next ? `بازهٔ لنفوسیت در روزهای اولِ عمر روزبه‌روز عوض می‌شود — برای ${next.label} ${next.range} است — پس یک عدد در این روزها به ساعتِ دقیقِ تولد حساس است. ` : "") +
      "در روزهای اولِ عمر، معنای این عدد را پزشکِ نوزاد کنارِ معاینه و بقیهٔ شمارشِ خون تعیین می‌کند.",
    // P57 پرسش ۵: فوریت را applyNeonatalFloor به «امروز» می‌برد؛ جمله همان.
    action: NEONATAL_SAMEDAY_ACTION,
    suggest: ["تکرار CBC"],
    warnings: [NEONATAL_DANGER_WARNING],
  };
}
