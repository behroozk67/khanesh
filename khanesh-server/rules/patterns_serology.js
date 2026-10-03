// ============================================================
// patterns_serology.js — specs/012 (P68): سرولوژیِ ردیف ۱
// ------------------------------------------------------------
// VDRL/RPR، سرخجه IgG، کومبسِ غیرمستقیم، هلیکوباکتر پیلوری. (Anti-Tg و TRAb در قاعدهٔ thyroid خوانده
// می‌شوند — یک یافته برای تیروئید، N20.)
//
// 🔴 پیش از specs/012 هر چهار unmapped بودند و هیچ یافته‌ای نمی‌ساختند: VDRLِ واکنش‌گر، سرخجهٔ غیرایمن در
//    بارداری و کومبسِ غیرمستقیمِ مثبت به «نتایج شما طبیعی است» یا به مسیرِ بی‌موتور می‌رسیدند (N2/N28).
//
// ⚠️ C1 (تصمیمِ کاربر، ۲۰۲۶-۱۰-۰۳): هیچ آستانهٔ بالینیِ تأییدنشده‌ای این‌جا نیست. سرخجه فقط با مرز یا واژهٔ
//    چاپ‌شده روی همان ردیف خوانده می‌شود؛ تیترِ VDRL و کومبس نقل می‌شود، با هیچ عددی مقایسه نمی‌شود.
//    سطحِ فوریت‌ها (routine / this_week) پیشنهادِ P68‌اند و منتظرِ بازبینِ انسانی. تنها عدد: «زیرِ یک سال» (P68 پرسش ۶).
// ⚠️ N6: مقدار با serology.js خوانده می‌شود (مجموعهٔ بسته، کلِ مقدار). مقدارِ مبهم اصلاً به qual نمی‌رسد.
// ⚠️ هیچ قاعده‌ای از یک آزمایش حکمِ بیماری نمی‌دهد (FR-011) و هیچ‌کدام اورژانس نیست.
// منابع (باز و خوانده‌شده، جملهٔ پشتیبان در specs/012-new-test-coverage/research.md §P0-8b):
//    CDC_STI_2021 (سیفلیس؛ «Syphilis During Pregnancy» و «Congenital Syphilis» همان راهنما)، CDC_PINKBOOK_RUBELLA،
//    ACOG_RH_PB181 (← Baylor)، ACG_HPYLORI_2024 (← خلاصهٔ رسمیِ ACG).
// ============================================================
import { readSerologyValue, rubellaRead, isSyphilisKey, isRubellaIggKey, isIctKey, isHpyloriKey, hpyloriKind, k0 } from "./serology.js";
import { canBePregnant } from "./patterns_utils.js";

// N20: جملهٔ زمان‌بندی از خودِ urgency می‌آید — همان متنِ patterns_coverage_gaps.js.
const ACTION = {
  routine: "در نوبتِ عادی با پزشک مطرح کنید.",
  this_week: "این هفته با پزشک مطرح کنید.",
};

const rowsBy = (e, pred) => Object.entries(e.qual ?? {})
  .filter(([name]) => pred(name))
  .map(([name, v]) => ({ name, raw: String(v).trim() }));

const pregnant = (e) => e.pregnant === true;   // فقط بارداریِ اعلام‌شده (P53 پرسش ۲) — هرگز حدس از سن/جنس
const infant = (e) => typeof e.age === "number" && e.age < 1;   // P68 پرسش ۶ — فقط برای «ادعا نکردن» به کار می‌رود

// ═══════════ ۱) VDRL / RPR ═══════════
function syphilisBuild(e) {
  const rows = rowsBy(e, isSyphilisKey).map((r) => ({ ...r, ...readSerologyValue(r.raw) }));
  const pos = rows.filter((r) => r.state === "pos");
  const base = { pattern: "syphilis_screen_result", sources: ["CDC_STI_2021"] };
  if (pos.length) {
    const r = pos[0];
    // CR2: تیتر ممکن است ردیفِ جدای خودش را داشته باشد («VDRL: Reactive» + «VDRL Titer: 1:16»).
    const tr = rows.find((x) => x.titre);
    const titreTxt = tr
      ? ` (تیترِ 1:${tr.titre}${tr === r ? "" : `، از ردیفِ «${tr.name}»`})`
      : "";
    const head = `نتیجهٔ ${r.name} روی برگهٔ شما «${r.raw}» است${titreTxt}. ` +
      (tr ? "" : "تیتر (رقیق‌سازی) روی برگه نیامده؛ آزمایشگاه معمولاً آن را هم گزارش می‌کند و برای پیگیری لازم است. ");
    const urgency = "this_week";

    // B2: شیرخوار — آنتی‌بادی ممکن است از مادر باشد؛ تستِ ترپونمایی روی سرمِ نوزاد توصیه نمی‌شود (CDC، Congenital Syphilis).
    if (infant(e)) {
      return {
        ...base, urgency, action: ACTION[urgency],
        headline: "آزمایش غربالگری سیفلیس (VDRL/RPR) شیرخوار واکنش‌گر است",
        must_say: head +
          "در شیرخوار، این آنتی‌بادی می‌تواند از مادر و از راهِ جفت رسیده باشد؛ برای همین نتیجه به‌تنهایی عفونتِ خودِ کودک را نشان نمی‌دهد. " +
          "پزشکِ کودک آن را کنارِ تیترِ همین آزمایش در مادر (هنگامِ زایمان، ترجیحاً از همان آزمایشگاه) تفسیر می‌کند. " +
          "آزمایشِ ترپونمایی روی خونِ شیرخوار توصیه نمی‌شود، چون آنتی‌بادیِ مادر ممکن است بیش از ۱۵ ماه در خونِ او بماند.",
        suggest: [],
        warnings: [],
      };
    }
    // B1: بارداری — CDC: «Pregnant women seropositive for syphilis should be considered infected unless an adequate
    //     treatment history is clearly documented…»؛ «Penicillin G is the only known effective antimicrobial for treating
    //     fetal infection and preventing congenital syphilis». بارداری این‌جا توضیحِ بی‌خطر نیست.
    if (pregnant(e)) {
      return {
        ...base, urgency, action: ACTION[urgency],
        headline: "آزمایش غربالگری سیفلیس (VDRL/RPR) شما واکنش‌گر است — در بارداری مهم است",
        must_say: head +
          "این آزمایش غربالگری است و باید با یک آزمایشِ اختصاصی‌تر (ترپونمایی، مثلِ TPHA یا FTA-ABS) تأیید شود؛ ولی در بارداری آن را جدی می‌گیرند: " +
          "طبقِ راهنمای CDC، زنِ بارداری که این آزمایشش مثبت است مبتلا در نظر گرفته می‌شود، مگر این‌که درمانِ کافیِ قبلی و افتِ تیتر در پرونده‌اش ثبت شده باشد. " +
          "سیفلیس می‌تواند به جنین منتقل شود، و درمان با پنی‌سیلین در دورانِ بارداری هم عفونتِ جنین را درمان می‌کند و هم از سیفلیسِ مادرزادی پیشگیری می‌کند. " +
          "این نتیجه را به پزشکِ زنانِ خود نشان دهید.",
        suggest: ["تست تأییدی ترپونمایی (TPHA/FTA-ABS)"],
        warnings: ["تا نظرِ پزشک، خودسرانه آنتی‌بیوتیک مصرف نکنید."],
      };
    }
    return {
      ...base, urgency, action: ACTION[urgency],
      headline: "آزمایش غربالگری سیفلیس (VDRL/RPR) شما واکنش‌گر است",
      must_say: head +
        "این آزمایش «غربالگری» است، نه تشخیص: واکنش‌گر بودنش به‌تنهایی ابتلا به سیفلیس را ثابت نمی‌کند و باید با یک آزمایشِ اختصاصی‌تر " +
        "(آزمایشِ ترپونمایی، مثلِ TPHA یا FTA-ABS) تأیید شود. این آزمایش گاهی بدونِ سیفلیس هم واکنش‌گر می‌شود — از جمله در بیماری‌های خودایمنی، " +
        "بعضی عفونت‌های دیگر (مثلِ HIV)، پس از بعضی واکسن‌ها، در مصرفِ تزریقیِ مواد، در بارداری و در سنِ بالا.",
      suggest: ["تست تأییدی ترپونمایی (TPHA/FTA-ABS)"],
      warnings: ["تا نتیجهٔ آزمایشِ تأییدی و نظرِ پزشک، خودسرانه آنتی‌بیوتیک مصرف نکنید."],
    };
  }
  const r = rows[0];
  const urgency = "routine";
  return {
    ...base, urgency, action: ACTION[urgency],
    headline: "آزمایش غربالگری سیفلیس (VDRL/RPR) شما منفی است",
    must_say:
      `نتیجهٔ ${r.name} روی برگهٔ شما «${r.raw}» است، یعنی واکنشی دیده نشده. این فقط دربارهٔ همین آزمایشِ غربالگری است؛ ` +
      "در عفونتِ بسیار تازه ممکن است هنوز منفی باشد، پس اگر تماسِ پرخطرِ اخیر یا زخمِ تناسلی دارید، آن را با پزشک مطرح کنید.",
    suggest: [],
    warnings: [],
  };
}

// ═══════════ ۲) سرخجه IgG ═══════════
function rubellaState(e) {
  const r = rowsBy(e, isRubellaIggKey)[0];
  if (!r) return null;
  return { r, st: rubellaRead(r.raw, e.serologyRef?.[r.name] ?? null) };
}

function rubellaBuild(e) {
  const { r, st } = rubellaState(e);
  const cutTxt = st.cut != null ? ` (مرزِ ایمنیِ چاپ‌شده روی برگه: ${st.cut})` : "";
  const base = { pattern: "rubella_igg_status", suggest: [], warnings: [], sources: ["CDC_PINKBOOK_RUBELLA"] };

  // شیرخوارِ زیرِ یک سال: آنتی‌بادی معمولاً از مادر است — دربارهٔ ایمنیِ خودِ کودک حکم نمی‌دهیم.
  if (infant(e)) {
    return {
      ...base, urgency: "routine", action: ACTION.routine,
      headline: "نتیجهٔ آنتی‌بادی سرخجه (IgG)",
      must_say:
        `آنتی‌بادی IgGِ سرخجه روی برگه «${r.raw}»${cutTxt} است. در شیرخوارِ زیرِ یک سال این آنتی‌بادی معمولاً از مادر رسیده ` +
        "و نشانهٔ ایمنیِ خودِ کودک نیست؛ برای همین از روی آن دربارهٔ ایمنیِ کودک حکم نمی‌دهیم. زمانِ واکسنِ کودک طبقِ برنامهٔ واکسیناسیون است.",
    };
  }
  if (st.state === "immune") {
    return {
      ...base, urgency: "routine", action: ACTION.routine,
      headline: "آنتی‌بادی محافظ سرخجه (IgG) در خون شما دیده می‌شود",
      must_say:
        `نتیجهٔ ${r.name} روی برگه «${r.raw}»${cutTxt} است. این معمولاً یعنی بدن در برابرِ سرخجه محافظت شده است — از واکسن یا ابتلای قبلی.`,
    };
  }
  // st.state === "nonimmune" (match حالتِ unknown را بیرون می‌گذارد)
  if (pregnant(e)) {
    return {
      ...base, urgency: "this_week", action: ACTION.this_week,
      headline: "آنتی‌بادی محافظ سرخجه در خون شما کافی نیست — در بارداری مهم است",
      must_say:
        `نتیجهٔ ${r.name} روی برگه «${r.raw}»${cutTxt} است، یعنی آنتی‌بادیِ محافظِ سرخجه به اندازهٔ کافی دیده نمی‌شود. ` +
        "ابتلا به سرخجه در بارداری، به‌ویژه در ماه‌های اول، می‌تواند به جنین آسیب بزند. واکسنِ سرخجه (MMR) در دورانِ بارداری تزریق نمی‌شود؛ " +
        "زمانِ مناسبش پس از زایمان است. تا آن موقع از تماس با بیمارِ تب‌دار و دارای دانه‌های پوستی دوری کنید و این نتیجه را به پزشکِ زنانِ خود نشان دهید.",
    };
  }
  return {
    ...base, urgency: "routine", action: ACTION.routine,
    headline: "آنتی‌بادی محافظ سرخجه در خون شما کافی نیست",
    must_say:
      `نتیجهٔ ${r.name} روی برگه «${r.raw}»${cutTxt} است، یعنی آنتی‌بادیِ محافظِ سرخجه به اندازهٔ کافی دیده نمی‌شود. ` +
      "این بیماری نیست؛ فقط یعنی بدن در برابرِ سرخجه محافظت نشده است. دربارهٔ واکسنِ سرخجه (MMR) با پزشک مشورت کنید" +
      (canBePregnant(e) ? " — به‌ویژه اگر قصدِ بارداری دارید: پس از این واکسن تا چهار هفته باید از بارداری پیشگیری کرد." : "."),
  };
}

// ═══════════ ۳) کومبسِ غیرمستقیم ═══════════
// نامِ ردیفِ گروهِ خون/Rh — لنگرشده، تا «abo» درونِ «Laboratory» نگیرد (بازبینی).
const RH_ROW_RE = /^(rh|rhd|rhfactor|rhtyping|rhtype|abo|aborh|abogroup|bloodgroup|bloodgrouping|bloodtype|bloodgroupandrh|گروهخون|گروهخونی|گروهخونیوrh)$/;
function ictBuild(e) {
  const r = rowsBy(e, isIctKey).map((x) => ({ ...x, ...readSerologyValue(x.raw) }))[0];
  const base = { pattern: "indirect_coombs_result", sources: ["ACOG_RH_PB181"], warnings: [] };
  const titreTxt = r.titre ? ` (تیترِ 1:${r.titre})` : "";
  if (r.state === "pos") {
    const urgency = pregnant(e) ? "this_week" : "routine";
    return {
      ...base, urgency, action: ACTION[urgency],
      headline: "در آزمایش کومبس غیرمستقیم شما آنتی‌بادی دیده شده است",
      must_say: pregnant(e)
        ? `نتیجهٔ ${r.name} روی برگه «${r.raw}» است${titreTxt}. کومبسِ غیرمستقیم در بارداری دنبالِ آنتی‌بادی‌هایی در خونِ مادر می‌گردد ` +
          "که می‌توانند به گلبول‌های قرمزِ جنین برسند. مثبت بودنش یعنی چنین آنتی‌بادی‌ای دیده شده؛ گامِ بعدی تعیینِ نوعِ آنتی‌بادی (شناسایی) " +
          "و اندازه‌گیریِ تیترِ آن است، و اهمیتِ هر تیتر به نوعِ آنتی‌بادی بستگی دارد — این را پزشکِ زنان تفسیر می‌کند."
        : `نتیجهٔ ${r.name} روی برگه «${r.raw}» است${titreTxt}، یعنی آنتی‌بادی‌ای علیهِ گلبول‌های قرمز در خونِ شما دیده شده است. ` +
          "این آزمایش بیشتر پیش از تزریقِ خون یا در بارداری انجام می‌شود؛ اگر قرار است خون دریافت کنید، بانکِ خون باید نوعِ این آنتی‌بادی را بداند " +
          "تا خونِ سازگار انتخاب شود. نوعِ آنتی‌بادی با آزمایشِ شناسایی تعیین می‌شود." +
          (canBePregnant(e) ? " اگر در آینده باردار شدید، به پزشکِ زنان بگویید که این آنتی‌بادی را دارید." : ""),
      suggest: ["شناسایی آنتی‌بادی و تیتر (کومبس غیرمستقیم)"],
    };
  }
  const rhOnSheet = [...Object.keys(e.qual ?? {}), ...(e.unmapped ?? [])].some((n) => RH_ROW_RE.test(k0(n)));
  return {
    ...base, urgency: "routine", action: ACTION.routine,
    headline: "آزمایش کومبس غیرمستقیم شما منفی است",
    must_say:
      `نتیجهٔ ${r.name} روی برگه «${r.raw}» است، یعنی آنتی‌بادیِ علیهِ گلبول‌های قرمز دیده نشد. این آزمایش دربارهٔ گروهِ خون یا Rh چیزی نمی‌گوید` +
      (rhOnSheet ? "." : "؛ گروهِ خون و Rh روی این برگه نیست.") +
      (pregnant(e) ? " اگر Rh منفی هستید، دربارهٔ مراقبت‌های پیشگیرانهٔ بارداری با پزشکِ زنان صحبت کنید." : ""),
    suggest: [],
  };
}

// ═══════════ ۴) هلیکوباکتر پیلوری ═══════════
function hpBuild(e) {
  const rows = rowsBy(e, isHpyloriKey).map((x) => ({ ...x, kind: hpyloriKind(x.name), ...readSerologyValue(x.raw) }));
  const active = rows.filter((x) => x.kind === "active");
  const sero = rows.filter((x) => x.kind === "serology");
  const urgency = "routine";
  const base = { pattern: "h_pylori_result", urgency, action: ACTION[urgency], warnings: [], sources: ["ACG_HPYLORI_2024"] };
  const seroNote = (s) => s
    ? ` ${s.name} هم «${s.raw}» است؛ آنتی‌بادی می‌تواند از عفونتِ گذشته باقی مانده باشد، و برای عفونتِ فعلی آزمایشِ آنتی‌ژن/تنفسیِ همین برگه ملاک است.`
    : "";
  const aPos = active.find((x) => x.state === "pos");
  if (aPos) {
    // یادداشتِ ۷ِ بازبینی: آزمایشِ فعالِ دیگری که منفی است گم نشود.
    const aNeg = active.filter((x) => x.state === "neg");
    const discord = aNeg.length
      ? ` ${aNeg.map((x) => `${x.name} «${x.raw}»`).join("، ")} منفی است؛ وقتی دو آزمایشِ عفونتِ فعال با هم نمی‌خوانند، پزشک تصمیم می‌گیرد کدام ملاک است یا آزمایش تکرار شود.`
      : "";
    return {
      ...base,
      headline: "آزمایش هلیکوباکتر پیلوری شما (آنتی‌ژن مدفوع/تست تنفسی) مثبت است",
      must_say:
        `نتیجهٔ ${aPos.name} «${aPos.raw}» است. آزمایشِ آنتی‌ژنِ مدفوع و تستِ تنفسیِ اوره خودِ میکروب را نشان می‌دهند، پس مثبت بودنشان یعنی عفونتِ فعال ` +
        "با هلیکوباکتر پیلوری. طبقِ راهنمای کالج گوارش آمریکا (ACG) عفونتِ تأییدشده درمان می‌شود؛ نوع و طولِ درمان را پزشک تعیین می‌کند، " +
        "و دست‌کم چهار هفته پس از پایانِ درمان، آزمایشِ دوباره نشان می‌دهد میکروب از بین رفته یا نه." + discord + seroNote(sero.find((s) => s.state === "pos")),
      suggest: [],
    };
  }
  if (active.length) {
    const a = active[0];
    const others = active.slice(1).map((x) => `${x.name} «${x.raw}»`);
    return {
      ...base,
      headline: "آزمایش هلیکوباکتر پیلوری شما منفی است",
      must_say:
        `نتیجهٔ ${a.name} «${a.raw}» است${others.length ? ` (و ${others.join("، ")})` : ""}. اگر در دو هفتهٔ پیش از آزمایش داروی کاهندهٔ اسیدِ معده از نوعِ مهارکنندهٔ پمپِ پروتون (مثل امپرازول یا پنتوپرازول) ` +
        "یا در چهار هفتهٔ پیش از آن آنتی‌بیوتیک یا ترکیباتِ بیسموت مصرف کرده‌اید، جوابِ منفی ممکن است کاذب باشد؛ این را با پزشک مطرح کنید." +
        seroNote(sero.find((s) => s.state === "pos")),
      suggest: [],
    };
  }
  const s = sero[0];
  if (s.state === "pos") {
    return {
      ...base,
      headline: "آنتی‌بادی هلیکوباکتر پیلوری در خون شما مثبت است",
      must_say:
        `نتیجهٔ ${s.name} «${s.raw}» است. آنتی‌بادی پس از عفونت تا مدت‌ها در خون می‌ماند، پس مثبت بودنش نشان نمی‌دهد عفونت الان فعال است یا در گذشته بوده. ` +
        "برای دانستنِ این‌که میکروب الان هست، آزمایشِ آنتی‌ژنِ مدفوع یا تستِ تنفسیِ اوره لازم است.",
      suggest: ["آنتی‌ژن مدفوع یا تست تنفسی اوره برای هلیکوباکتر"],
    };
  }
  return {
    ...base,
    headline: "آنتی‌بادی هلیکوباکتر پیلوری در خون شما منفی است",
    must_say:
      `نتیجهٔ ${s.name} «${s.raw}» است، یعنی آنتی‌بادی‌ای دیده نشد. این فقط دربارهٔ همین آزمایش است؛ اگر علائمِ گوارشی دارید، ` +
      "پزشک ممکن است آزمایشِ آنتی‌ژنِ مدفوع یا تستِ تنفسیِ اوره را ترجیح دهد.",
    suggest: [],
  };
}

const hasRows = (e, pred) => Object.keys(e.qual ?? {}).some(pred);

export const RULES_SEROLOGY = [
  { id: "syphilis_screen_result", match: (e) => hasRows(e, isSyphilisKey), build: syphilisBuild },
  // حالتِ «unknown» (مثلاً مرزِ چاپ‌شده‌ای که با مسیریابی فرق کند) هرگز «غیرایمن» خوانده نمی‌شود — بازبینی، N4.
  { id: "rubella_igg_status", match: (e) => { const x = rubellaState(e); return !!x && (infant(e) || x.st.state !== "unknown"); }, build: rubellaBuild },
  { id: "indirect_coombs_result", match: (e) => hasRows(e, isIctKey), build: ictBuild },
  { id: "h_pylori_result", match: (e) => hasRows(e, (n) => isHpyloriKey(n) && hpyloriKind(n)), build: hpBuild },
];
