import { serologyReactive, qualPositive, qualValue, titreFa, hasInflammation, whoFerritinThreshold, whoInflamIronDeficiency, urinePositive, urineCellCount, urineGrade, isNephrotic, isGlomerulonephritis, isDIC, val, rankOf, has, CRP_RE, RF_RE } from "./patterns_utils.js";
import { faName } from "./names.js";
import { preanalyticalCaveats, attachPreanalytical } from "./preanalytical.js";
import { repeatDeltaFa } from "./biovar.js";

export const RULES_ENDOCRINE_RHEUM = [

  // ── فاکتور روماتوئید مثبت ──
  // ⚠️ RF مثبت ≠ آرتریت روماتوئید. ارزشِ اخباریِ مثبتِ آن در جمعیتِ عمومی
  //    حدود ۲۴٪ است؛ ۵٪ بزرگسالان و ۱۰–۲۵٪ سالمندانِ سالم مثبت‌اند.
  //    ACR/EULAR 2010 «مثبتِ کم» را ≤۳×ULN و «مثبتِ زیاد» را >۳×ULN می‌گیرد،
  //    و می‌گوید RFِ گزارش‌شده به‌صورت صرفاً «مثبت» باید «مثبتِ کم» شمرده شود.
  {
    id: "rf_positive",
    match: (e) => {
      const rf = e.graded.find((g) => g.test === "RF");
      if (rf?.abnormal && rf.dir === "high") return true;
      return qualPositive(e, RF_RE);
    },
    build: (e) => {
      const rf = e.graded.find((g) => g.test === "RF");
      const uln = rf ? Number(String(rf.range).split(/[–-]/).pop()) : null;
      const high = rf && uln ? rf.value > 3 * uln : false;
      const crpPos = e.graded.some((g) => g.test === "CRP_Q" && g.abnormal) ||
                     qualPositive(e, CRP_RE);
      return {
        pattern: "rf_positive",
        urgency: "routine",
        headline: "فاکتور روماتوئید (RF) شما مثبت است",
        must_say:
          (rf ? `فاکتور روماتوئید شما ${rf.value} است (حد طبیعی ${rf.range})` : "فاکتور روماتوئید شما مثبت گزارش شده") +
          (high ? " — بیش از سه برابرِ حد بالای طبیعی، که در طبقه‌بندی‌های تخصصی «مثبتِ قوی» شمرده می‌شود. " : ". ") +
          "نکته‌ای که باید بدانید: RFِ مثبت به‌تنهایی به‌معنای روماتیسم مفصلی نیست. " +
          "حدود ۵ درصد بزرگسالانِ سالم و تا یک‌چهارمِ سالمندانِ سالم RF مثبت دارند، و بیماری‌های دیگری مثل سندرم شوگرن، لوپوس، هپاتیت مزمن و عفونت‌های طولانی هم آن را بالا می‌برند. " +
          (crpPos ? "شاخص التهاب (CRP) شما هم مثبت است؛ این ترکیب یعنی التهابی وجود دارد، اما همچنان علتش را مشخص نمی‌کند. " : "") +
          "تشخیصِ روماتیسم مفصلی بر پایهٔ علائم (تورم و خشکیِ صبحگاهیِ مفاصل)، معاینه و آزمایشِ اختصاصی‌ترِ Anti-CCP گذاشته می‌شود، نه RF تنها.",
        action: "نوبت عادی با پزشک. اگر تورم، خشکی صبحگاهی بیش از نیم‌ساعت، یا درد قرینه در مفاصل کوچک دست دارید، حتماً مطرح کنید — این علائم تعیین‌کننده‌ترند تا خودِ عدد.",
        suggest: ["Anti-CCP", "CRP کمی (mg/L)", "ESR"],
        warnings: [],
      };
    },
  },

  // ═══════════ تیروئید ═══════════
  {
    id: "thyroid",
    match: (e) => {
      const tsh = e.graded.find((g) => g.test === "TSH");
      const ft4 = e.graded.find((g) => g.test === "FT4");
      const ft3 = e.graded.find((g) => g.test === "FT3");
      const t3 = e.graded.find((g) => g.test === "T3");
      const tpo = e.graded.find((g) => g.test === "ANTI_TPO");
      return tsh?.abnormal || ft4?.abnormal || ft3?.abnormal || t3?.abnormal || tpo?.abnormal;
    },
    build: (e) => {
      const tsh = e.graded.find((g) => g.test === "TSH");
      const ft4 = e.graded.find((g) => g.test === "FT4");
      const ft3 = e.graded.find((g) => g.test === "FT3");
      const t3 = e.graded.find((g) => g.test === "T3");
      const tpo = e.graded.find((g) => g.test === "ANTI_TPO");
      const tshLow = tsh?.abnormal && tsh.dir === "low";
      const tshHigh = tsh?.abnormal && tsh.dir === "high";
      const tshNormal = tsh != null && !tsh.abnormal;
      const ft4Low = ft4?.abnormal && ft4.dir === "low";
      const ft4High = ft4?.abnormal && ft4.dir === "high";
      const ft3Low = ft3?.abnormal && ft3.dir === "low";
      const t3High = (ft3?.abnormal && ft3.dir === "high") || (t3?.abnormal && t3.dir === "high");
      const t3Low = (ft3?.abnormal && ft3.dir === "low") || (t3?.abnormal && t3.dir === "low");
      const tpoHigh = tpo?.abnormal && tpo.dir === "high";

      // ── سندرم بیماری غیرتیروئیدی (euthyroid sick) ──
      // TSH نرمال/پایین + FT4 پایین + T3 پایین → لزوماً کم‌کاری واقعی نیست؛
      // اغلب در بیماری‌های شدید غیرتیروئیدی دیده می‌شود.
      if ((tshNormal || tshLow) && (ft4Low || ft3Low) && t3Low && !tshHigh) {
        return {
          pattern: "thyroid_nonthyroidal_illness",
          urgency: "routine",
          headline: "الگوی هورمون‌های تیروئید شما غیرمعمول است",
          must_say:
            "برخی هورمون‌های تیروئید پایین هستند در حالی که TSH طبیعی یا پایین است. " +
            "این الگو گاهی به‌جای مشکل خود تیروئید، در جریان یک بیماری یا استرس جسمی دیگر دیده می‌شود و ممکن است موقت باشد. " +
            "برای تفسیر درست بهتر است در زمان مناسب و توسط پزشک بررسی شود.",
          action: "نوبت عادی. اگر اخیراً بیماری شدیدی داشته‌اید به پزشک بگویید؛ معمولاً آزمایش بعداً تکرار می‌شود.",
          suggest: ["تکرار پنل تیروئید پس از بهبود", "بررسی توسط پزشک"],
          warnings: [],
        };
      }

      // ── تیروتوکسیکوز T3 (فقط T3 بالا، FT4 نرمال) ──
      if (t3High && !ft4High && (tshLow || tshNormal)) {
        return {
          pattern: "thyroid_t3_toxicosis",
          urgency: "this_week",
          headline: "یکی از هورمون‌های تیروئید (T3) شما بالاست",
          must_say:
            "هورمون T3 بالاست در حالی که هورمون دیگر (T4) طبیعی است. این می‌تواند نوعی پرکاری تیروئید باشد " +
            "که باید توسط پزشک بررسی شود.",
          action: "این هفته با پزشک مطرح کنید.",
          suggest: ["TSH", "FT4", "بررسی توسط پزشک"],
          warnings: [],
        };
      }

      // ── حالت ثانویه (هیپوفیزی): TSH پایین + FT4 پایین ──
      // در حالت عادی اگر تیروئید کم‌کار باشد TSH بالا می‌رود؛ اگر TSH هم
      // پایین باشد یعنی مشکل از هیپوفیز است، نه خود تیروئید. این پرکاری نیست.
      if (tshLow && ft4Low) {
        return {
          pattern: "thyroid_central_hypo",
          urgency: "this_week",
          headline: "الگوی تیروئید شما غیرمعمول است و نیاز به بررسی دقیق‌تر دارد",
          must_say:
            "هم هورمون تیروئید (FT4) و هم هورمون تنظیم‌کننده‌ی آن (TSH) پایین هستند. " +
            "این ترکیب غیرمعمول است و می‌تواند نشان‌دهنده‌ی مشکلی در غده‌ی تنظیم‌کننده در مغز (هیپوفیز) باشد، نه خود تیروئید. " +
            "حتماً باید توسط پزشک بررسی شود.",
          action: "این هفته با پزشک مطرح کنید و این نکته را بگویید که هر دو هورمون پایین هستند.",
          suggest: ["بررسی توسط پزشک (احتمالاً غدد)", "سایر هورمون‌های هیپوفیز در صورت صلاحدید"],
          warnings: [],
        };
      }

      // ── FT4 بالا ولی TSH پایین نیست (ناهماهنگ) ──
      // باید پیش از شاخهٔ «TSH بالا» بررسی شود، وگرنه FT4ِ بالا با TSHِ بالا
      // اشتباهاً «کم‌کاریِ تحت‌بالینی» برچسب می‌خورد (باگ).
      //  • TSH بالا + FT4 بالا → پرکاریِ ثانویه (تومورِ ترشح‌کنندهٔ TSH در هیپوفیز)
      //    یا مقاومت به هورمونِ تیروئید، یا تداخلِ آزمایش (Table 13.3، Moore؛ Table 14.1).
      //  • TSH طبیعی + FT4 بالا → در پرکاریِ واقعیِ اولیه TSH سرکوب می‌شود؛ پس
      //    اغلب خطای پیش‌تحلیلی (خون‌گیری ۶–۹ ساعت پس از لووتیروکسین) یا بیوتین است.
      if (ft4High && !tshLow) {
        const bothHigh = tshHigh;
        return {
          pattern: bothHigh ? "thyroid_secondary_hyper" : "thyroid_discordant_ft4_high",
          urgency: bothHigh ? "this_week" : "routine",
          headline: bothHigh
            ? "هم هورمون تیروئید و هم TSH بالا هستند — یک الگوی نادر که باید بررسی شود"
            : "هورمون تیروئید (FT4) بالاست ولی TSH طبیعی است — نیاز به بررسی",
          must_say: bothHigh
            ? `هورمون تیروئید FT4 بالاست (${ft4.value}؛ حد طبیعی ${ft4.range}) و TSH هم بالاست (${tsh.value}؛ حد طبیعی ${tsh.range}). ` +
              "در حالت طبیعی وقتی هورمون تیروئید بالا می‌رود TSH باید پایین بیاید؛ بالا بودنِ هر دو یک الگوی غیرمعمول است که می‌تواند نشان‌دهندهٔ علتی در غدهٔ هیپوفیز (مثلاً تومورِ خوش‌خیمِ ترشح‌کنندهٔ TSH)، مقاومتِ بدن به هورمون تیروئید، یا تداخلِ آزمایشگاهی باشد. " +
              "این نیاز به بررسی تخصصیِ غدد دارد؛ اولین گام، تکرارِ آزمایش برای رد کردنِ تداخل است."
            : `هورمون تیروئید FT4 بالاست (${ft4.value}؛ حد طبیعی ${ft4.range}) اما TSH طبیعی است. ` +
              "در پرکاریِ واقعیِ تیروئید معمولاً TSH پایین می‌آید؛ بنابراین این ترکیب اغلب به‌جای بیماری، ناشی از خطای آزمایشگاهی یا تداخل است — " +
              "مثلاً خون‌گیری ۶ تا ۹ ساعت پس از دوز لووتیروکسین، یا مصرف مکمل بیوتین. به‌ندرت می‌تواند علتی نادر داشته باشد. " +
              "بهتر است آزمایش در شرایط استاندارد تکرار و توسط پزشک بررسی شود.",
          action: bothHigh
            ? "این هفته با پزشک مطرح کنید؛ احتمالاً به متخصص غدد ارجاع می‌شوید و آزمایش نخست تکرار می‌شود."
            : "نوبت عادی. اگر مکمل بیوتین می‌خورید چند روز پیش از آزمایش با نظر پزشک قطع کنید؛ در صورت مصرف لووتیروکسین، خون‌گیری را پیش از دوز روزانه انجام دهید.",
          suggest: bothHigh
            ? ["تکرار FT4 و TSH", "بررسی توسط متخصص غدد", "FT3"]
            : ["تکرار FT4 و TSH در شرایط استاندارد"],
          warnings: [],
          key_number: ft4.value,
        };
      }

      // ── کم‌کاری اولیه: TSH بالا ──
      if (tshHigh) {
        const overt = ft4Low;
        // یافته‌های آزمایشگاهیِ همراه که کم‌کاری تیروئید می‌تواند خودش توضیح‌شان دهد
        // (Nishizawa-Brennen, «Thyroid Function»): هیپوناترمی، CK بالا، کم‌خونی، چربی بالا.
        const naG = e.graded.find((g) => g.test === "NA");
        const ckG = e.graded.find((g) => g.test === "CK");
        const hgbG = e.graded.find((g) => g.test === "HGB");
        const secondaryHits = [];
        if (naG?.abnormal && naG.dir === "low") secondaryHits.push("سدیم پایین");
        if (ckG?.abnormal && ckG.dir === "high") secondaryHits.push("آنزیم عضلانی CK بالا");
        if (hgbG?.abnormal && hgbG.dir === "low") secondaryHits.push("کم‌خونی");
        return {
          pattern: `thyroid_hypo_${overt ? "overt" : "subclinical"}`,
          urgency: overt ? "this_week" : "routine",
          headline: "غده تیروئید شما کندتر از حد معمول کار می‌کند",
          must_say:
            `TSH شما ${tsh.value} است (حد طبیعی ${tsh.range})` +
            (overt && ft4 != null ? ` و هورمون تیروئید FT4 پایین است (${ft4.value}؛ حد طبیعی ${ft4.range})` : "") +
            ". تیروئید غده‌ای در گردن است که سرعت سوخت‌وساز بدن را تنظیم می‌کند؛ TSH بالا یعنی بدن دارد غدهٔ کم‌کار را بیشتر تحریک می‌کند. " +
            (overt
              ? "چون هورمون تیروئید (FT4) هم پایین است، این یک کم‌کاری واضح است و معمولاً با علائمی مثل خستگی، سرمایی‌شدن، یبوست، خشکی پوست و افزایش وزن همراه است."
              : "چون هورمون تیروئید (FT4) هنوز طبیعی است، این کم‌کاری خفیف («تحت‌بالینی») است؛ برای تأیید معمولاً چند هفته بعد تکرار می‌شود و اغلب فقط پیگیری لازم دارد.") +
            (tpoHigh
              ? " آنتی‌بادی TPO هم بالاست، که اغلب نشان می‌دهد علت، نوعی التهاب خودایمنی تیروئید (هاشیموتو) است — این شایع‌ترین علت کم‌کاری تیروئید است."
              : "") +
            (secondaryHits.length
              ? ` ضمناً ${secondaryHits.join(" و ")} هم در نتایج شما دیده می‌شود؛ کم‌کاری تیروئید می‌تواند خودش عاملِ این‌ها باشد و با درمانِ تیروئید اغلب بهتر می‌شوند — این را با پزشک مطرح کنید.`
              : ""),
          action: overt ? "این هفته وقت بگیرید." : "نوبت عادی. معمولاً این آزمایش چند هفته بعد تکرار می‌شود.",
          suggest: tpoHigh ? ["FT4"] : ["FT4", "آنتی‌بادی TPO"],
          warnings: [],
          key_number: tsh.value,
        };
      }

      // ── پرکاری اولیه: TSH پایین (± FT4 بالا) ──
      // FT4ِ بالا فقط وقتی «واضح» است که TSH هم سرکوب شده باشد (پرکاریِ اولیه).
      if (tshLow) {
        const overt = ft4High;
        return {
          pattern: `thyroid_hyper_${overt ? "overt" : "subclinical"}`,
          urgency: overt ? "this_week" : "routine",
          headline: "غده تیروئید شما پرکارتر از حد معمول است",
          must_say:
            `TSH شما ${tsh.value} است (حد طبیعی ${tsh.range})` +
            (overt && ft4 != null ? ` و هورمون تیروئید FT4 بالاست (${ft4.value}؛ حد طبیعی ${ft4.range})` : "") +
            ". TSH پایین یعنی هورمون تیروئید بیش از نیاز بدن ساخته می‌شود؛ پرکاری تیروئید می‌تواند باعث تپش قلب، لاغری، لرزش، تعریق، گرمایی‌شدن و بی‌قراری شود. شایع‌ترین علت آن بیماری خودایمنی گریوز است. " +
            (overt ? "چون هورمون تیروئید (FT4) هم بالاست، این یک پرکاری واضح است." : "چون FT4 هنوز طبیعی است، این پرکاری خفیف («تحت‌بالینی») است؛ برای تأیید معمولاً چند هفته بعد تکرار می‌شود."),
          action: overt ? "این هفته وقت بگیرید." : "نوبت عادی. معمولاً این آزمایش چند هفته بعد تکرار می‌شود.",
          suggest: ["FT4", "FT3", "آنتی‌بادی گیرندهٔ TSH (TRAb)"],
          warnings: overt
            ? [
                "اگر تپش قلب شدید یا نامنظم، تنگی نفس یا درد سینه دارید، زودتر مراجعه کنید.",
                "اگر تب بالا همراه ضربان قلب بسیار تند و بی‌قراری یا گیجی شدید پیدا کردید، فوراً به اورژانس بروید (می‌تواند نشانهٔ «طوفان تیروئیدی»، یک وضعیت اورژانسی، باشد).",
              ]
            : [],
          key_number: tsh.value,
        };
      }

      // ── anti-TPO بالا با تیروئید ظاهراً طبیعی ──
      if (tpoHigh && !tshHigh && !tshLow && !ft4Low && !ft4High) {
        return {
          pattern: "thyroid_tpo_positive",
          urgency: "routine",
          headline: "آنتی‌بادی تیروئید (TPO) شما بالاست",
          must_say:
            "آنتی‌بادی TPO بالاست. این نشان می‌دهد سیستم ایمنی بدن با تیروئید تعامل دارد که می‌تواند به نوعی التهاب خودایمنی تیروئید مربوط باشد. " +
            "در این مرحله اگر بقیه‌ی هورمون‌ها طبیعی باشند، اغلب فقط پیگیری لازم است، چون گاهی با گذر زمان به کم‌کاری تیروئید می‌انجامد.",
          action: "نوبت عادی با پزشک. معمولاً تیروئید به‌صورت دوره‌ای پایش می‌شود.",
          suggest: ["پایش دوره‌ای TSH", "بررسی توسط پزشک"],
          warnings: [],
        };
      }

      // ── FT4/FT3 پایین با TSH طبیعی → ارجاع محتاط ──
      // Table 14.1 (Nishizawa-Brennen): TSHِ طبیعی + FT4ِ پایین می‌تواند کم‌کاریِ
      //   ثانویه (هیپوفیزی) یا اثرِ بیماریِ شدیدِ غیرتیروئیدی باشد؛ گاهی هم خطای
      //   آزمایشگاهی/تداخل (مثل بیوتین) — نه لزوماً کم‌کاریِ اولیهٔ تیروئید.
      return {
        pattern: "thyroid_ft4_abnormal",
        urgency: "routine",
        headline: "الگوی هورمون‌های تیروئید شما ناهماهنگ است و نیاز به بررسی دارد",
        must_say:
          (ft4Low && ft4 != null
            ? `هورمون تیروئید FT4 پایین است (${ft4.value}؛ حد طبیعی ${ft4.range}) در حالی که TSH طبیعی مانده است. `
            : "یکی از هورمون‌های تیروئید خارج از محدودهٔ طبیعی است در حالی که TSH طبیعی است. ") +
          "در کم‌کاریِ معمولِ تیروئید انتظار می‌رود TSH بالا برود؛ وقتی TSH بالا نرفته، این الگو می‌تواند نشانهٔ کم‌کاریِ ثانویه (مشکل در غدهٔ هیپوفیزِ مغز) یا اثرِ یک بیماریِ شدیدِ غیرتیروئیدی باشد، یا خطای آزمایشگاهی/تداخل (مثلاً مکمل بیوتین). " +
          "برای تفسیر درست باید با پزشک بررسی شود.",
        action: "نوبت عادی با پزشک. در صورت لزوم آزمایش در شرایط استاندارد تکرار می‌شود.",
        suggest: ["تکرار پنل تیروئید", "TSH و FT4"],
        warnings: [],
      };
    },
  },

  // ═══════════ کم‌کاری تیروئید + چربی بالا (نکته‌ی کیس ابونی) ═══════════
  // اگر کم‌کاری تیروئید و چربی بالا با هم باشند، ممکن است چربی ثانویه به
  //   تیروئید باشد و با درمان تیروئید بهتر شود. یک بینش مکمل (نه جایگزین).
  {
    id: "hypothyroid_dyslipidemia_link",
    match: (e) => {
      const tsh = e.graded.find((g) => g.test === "TSH");
      const tshHigh = tsh?.abnormal && tsh.dir === "high";
      if (!tshHigh) return false;
      // چربی بالا؟ کلسترول یا LDL بالا
      const chol = e.graded.find((g) => g.test === "CHOL");
      const ldl = e.graded.find((g) => g.test === "LDL");
      const cholHigh = chol?.abnormal && chol.dir === "high";
      const ldlHigh = ldl?.abnormal && ldl.dir === "high";
      return cholHigh || ldlHigh;
    },
    build: () => ({
      pattern: "hypothyroid_dyslipidemia_link",
      urgency: "this_week",
      headline: "کم‌کاری تیروئید و چربی خون بالا ممکن است به هم مربوط باشند",
      must_say:
        "هم نشانه‌ی کم‌کاری تیروئید و هم چربی خون بالا در نتایج شما دیده می‌شود. " +
        "نکته‌ی مهم این است که کم‌کاری تیروئید خودش می‌تواند باعث بالا رفتن چربی خون شود — " +
        "و در این حالت، با درمان تیروئید اغلب چربی هم بهتر می‌شود. این نکته را حتماً با پزشک در میان بگذارید.",
      action: "این هفته با پزشک مطرح کنید و به هر دو یافته اشاره کنید.",
      suggest: ["FT4", "پیگیری تیروئید پیش از تصمیم‌گیری نهایی درباره‌ی داروی چربی"],
      warnings: [],
    }),
  },

  // ═══════════ ویتامین D ═══════════
  // تک‌تست، ولی بدون این قاعده کمبود ویتامین D (شایع‌ترین اختلال این جمعیت)
  // به unmatched_abnormal می‌افتاد و به بیمار می‌گفت «توضیح آماده‌ای نداریم».
  // آستانه‌ها Endocrine Society 2011 (در interpret.js/refs.js مستند شده).
  {
    id: "vitamin_d_abnormal",
    match: (e) => {
      const d = e.graded.find((g) => g.test === "VIT_D");
      return ["deficiency", "insufficiency", "above_target", "possible_toxicity"].includes(d?.tag);
    },
    build: (e) => {
      const d = e.graded.find((g) => g.test === "VIT_D");
      const high = d.tag === "above_target" || d.tag === "possible_toxicity";
      if (high) {
        const toxic = d.tag === "possible_toxicity";
        return {
          pattern: "vitamin_d_high",
          urgency: "routine",
          headline: "ویتامین D خون شما بالاتر از حد مطلوب است",
          must_say: toxic
            ? `سطح ویتامین D شما ${d.value} است (محدودهٔ مطلوب حدود ۳۰ تا ۱۰۰). این معمولاً ناشی از مصرف زیاد مکمل است، نه بیماری. ` +
              "ویتامین D خیلی زیاد می‌تواند باعث بالا رفتن کلسیم خون شود، پس بهتر است بررسی شود."
            : `سطح ویتامین D شما ${d.value} است (محدودهٔ مطلوب حدود ۳۰ تا ۱۰۰) — کمی بالاتر از حد مطلوب. این معمولاً از مصرف مکمل است و نگران‌کننده نیست.`,
          action: "مصرف مکمل ویتامین D و دوز آن را با پزشک در میان بگذارید.",
          suggest: [],
          warnings: [],
        };
      }
      const deficient = d.tag === "deficiency";
      return {
        pattern: "vitamin_d_deficiency",
        urgency: "routine",
        headline: deficient
          ? "ویتامین D خون شما کم است"
          : "ویتامین D خون شما کمی کمتر از حد مطلوب است",
        must_say: deficient
          ? `سطح ویتامین D شما ${d.value} است (محدودهٔ مطلوب حدود ۳۰ تا ۱۰۰) — یعنی کمبود. ` +
            "کمبود ویتامین D بسیار شایع است و معمولاً با قرار گرفتن کم در معرض آفتاب و دریافت ناکافی از غذا ارتباط دارد. این وضعیت " +
            "معمولاً جدی نیست ولی بهتر است اصلاح شود، چون ویتامین D برای سلامت استخوان و عضله لازم است."
          : `سطح ویتامین D شما ${d.value} است (محدودهٔ مطلوب حدود ۳۰ تا ۱۰۰) — کمی کمتر از حد مطلوب. ` +
            "این یافتهٔ رایجی است و معمولاً با اصلاح تغذیه و نور آفتاب یا مکمل قابل بهبود است.",
        action:
          "دربارهٔ مصرف مکمل ویتامین D و دوز مناسب با پزشک مشورت کنید — دوز خودسرانه‌ی بالا لازم نیست و می‌تواند مضر باشد.",
        suggest: [],
        warnings: [],
      };
    },
  }];
