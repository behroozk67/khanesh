# RESUME HERE — خلاصهٔ وضعیت — ۲۰۲۶-۱۰-۰۶

## ۲۰۲۶-۱۰-۰۵/۰۶ — بازبینیِ ۲۳۶ درخواستِ LIS (`engine_StandardExcel.json`) و رفعِ باگ‌ها — **باگ‌های ۱–۶ و P89–P91 کامیت شد: `853a6b7`**

**کامیت `853a6b7` (۲۰۲۶-۱۰-۰۶):** درختِ ایندکس سنجیده شد (git write-tree + archive + junction): `tests 1136 · pass 1135 · fail 0 · todo 1`؛ هوک: backend ✔، frontend lint ✔. push نشده. **بیرون ماند (عمداً):** کارِ هم‌زمانِ P87 تصمیمِ ۸ (کلسیمِ ادرار، Mayo: `refs.js`، `patterns_mineral_bone.js`، `patterns_specimen.js`، یک تکه از `adapter.js`، تست‌های U07/U09/W04/W05/U20، مدخلِ CLAUDE.md و بندهای P87 در MEDICAL_RULES) و فرانتِ onboarding/landing. ⚠️ ابزارِ تفکیک: `git apply --unidiff-zero --recount` درج‌ها را پس از تکه‌های حذف‌شده جابه‌جا می‌کرد؛ ایندکس با «HEAD + فقط تکه‌های من در موقعیتِ HEAD» ساخته شد (hash-object + update-index).

**بندِ ۵، بخشِ انجام‌شده (۲۰۲۶-۱۰-۰۶، کامیت‌نشده):** (الف) `applyQualGloss` (`patterns_utils.js`، فراخوانی در `patterns.js` پس از `applyChildVoice`): مقدارِ انگلیسیِ نقل‌شدهٔ فهرستِ بسته معنای فارسی می‌گیرد — «Negative» (منفی)، «Many» (زیاد)، «Weakly Positive» (مثبتِ ضعیف)؛ (ب) `server.js`: `QUAL_NEGATIVE` «No growth/بدون رشد» را منفی می‌شمارد و pHِ واژه‌ای (Acid/Neutral/Alkaline) نام برده نمی‌شود. روی ۲۳۶: یافته/فوریت بی‌تغییر؛ «Urine pH» ۱۲ ⇒ ۰، «Urine Culture» ۴ ⇒ ۰ در هشدار. گاردها `L18` (lis1005)، `L18b` (api-contract)، هر دو روی کدِ قبلی قرمز؛ `PN02` hcg_qual عمداً بازپایه. `npm test` ⇒ `1140 · 1139 · 0 · 1`. ⚠️ `patterns.js` را جلسهٔ هم‌زمان هم ویرایش کرده (`applyBareFluidVoice`، P87 تصمیمِ ۱۱) — هنگامِ کامیت فقط دو خطِ `applyQualGloss` مالِ این کار است. **بقیهٔ بندِ ۵ هم انجام شد (همان روز، کامیت‌نشده، P92 در MEDICAL_RULES):** تصمیمِ کاربر «الف، الف، ب، الف، الف، الف» — Mixed ⇒ `ungraded.MIXED` + جملهٔ توضیح (`mixedLine`)؛ رنگ/ظاهرِ ادرار ⇒ qual، معمولی بی‌صدا، کدر با نامِ فارسی (`unreadQualRows`)؛ CK-MB ⇒ `CK_MB` فقط با U/L سنجیده، بی‌واحد `unit_unknown_values`، جرمی noRef؛ `childVoice` ⇒ «اگر کودک تب دارد»؛ `oneCbcRepeat` در `tidyRecommendations`؛ برگهٔ همه-منفی ⇒ `buildAllNegativeResult` (+ جملهٔ تروپونین) از راهِ `qualAllReadNegative` در `server.js`. فایل‌ها: adapter.js، names.js، neonatal.js، patterns_utils.js (فقط واژه‌های QUAL_GLOSS)، prompt.js، server.js، تست‌ها (lis1005 L19–L22، api-contract L22b/T57، engine.test `پوشش/قلبی` ×۲ با U/L و `M104d` U1). روی ۲۳۶: فوریت/شناسهٔ یافته بی‌تغییر؛ ۱۲ برگه «تفسیر نشد» ⇒ «همه منفی»؛ Mixed ۱۲۸، Color/Appearance ۸۴، CH MB ۶ از unmapped بیرون آمدند. ⚠️ `engine_StandardExcel.json` دیگر روی Desktop نیست؛ اجرا از ورودیِ بی‌شناسهٔ `outA_n5b.json` (scratchpad) بازسازی شد و روی کدِ قبلی ۰/۲۳۶ اختلاف داد. `npm test` ⇒ `1150 · 1149 · 0 · 1`. **باز از بندِ ۵:** شمارهٔ کیسهٔ خون/گروه خون/کراس‌مچ (کاربر: لازم نیست)؛ تأییدِ «Dark-Yellow/Semi Clear معمول»؛ بازهٔ MXD.

**قدمِ بعدی پیشنهادی:** باقیِ بندِ ۵؛ پرسش‌های باز: «CK ≥ ۱۰۰۰» برای [22] (P91)، بند ۳ و ۴ (بالینی).

**وضعیتِ فعلی (۲۰۲۶-۱۰-۰۶، پس از P91):** `npm test` در `khanesh-server/` ⇒ `tests 1136 · pass 1135 · fail 0 · todo 1` (todo = `M154b` قدیمی).

**P91 (تصمیمِ کاربر روی جمع‌بندیِ منابعِ P90):** [199] TTP/HUS فقط با نشانگرِ همولیز (فوریت دست نخورد)؛ CK ِ کودک ≥ ۵×سقف ⇒ soon (⚠️ [22] خودش ۴٫۷۵× است و عوض نشد — پرسش: «یا CK ≥ ۱۰۰۰»؟)؛ CLL + Hb < ۱۱ یا PLT < ۱۰۰ در هر بزرگسال ⇒ soon و `viral_lymphocytosis` کنارِ CLL کنار می‌رود؛ [38] `melena_microcytic_anemia` (تازه، `STOOL_COLOR` در noRef) ⇒ soon. گاردها `L17`–`L17d` (روی HEAD قرمز). فریزهای `M104d` C4 و `M257` maha عمداً بازپایه. شرطِ گستردهٔ TTP (PLT < ۱۵۰) فقط اندازه گرفته شد: [114] پس از زایمان اورژانسِ کاذب می‌گرفت ⇒ پیاده نشد. فایل‌ها: `rules/{patterns_malignancy,patterns_infectious,patterns_biochem,patterns_p73_gaps,patterns_hematology,patterns_utils,adapter,names}.js`، `rules/{lis1005,engine}.test.js`، `MEDICAL_RULES.md` P91، `CLAUDE.md` N20.
⚠️ جلسهٔ هم‌زمان در همین روز `adapter.js` را هم ویرایش کرد — پیش از `git add` با `git diff` بخش‌ها را جدا کنید. `npm run lint` در `khanesh/` ⇒ exit 0. هر گاردِ تازه روی کدِ پیش از رفع قرمز دیده شد (stash).
⚠️ فایلِ ورودی `C:/Users/surface/Desktop/engine_StandardExcel.json` نام و کدِ ملی دارد — **هرگز وارد ریپو نشود**. شماره‌های `[i]` = جایگاهِ درخواست در همان JSON از صفر.

### روشِ بازبینی (برای تکرار)
هر درخواست جدا به `runEngine` ← `runPatterns` ← `buildNormalResult`/`buildUninterpretedResult`/`buildEngineFallbackResult` (مسیریابیِ `server.js`، بی‌LLM). نام/کدِ ملی حذف؛ نامِ ردیف = بخشِ آخرِ ستونِ LIS. اجراها: A (بی‌واحد، وضعِ واقعی)، B (`/hpf` روی میکروسکوپیِ ادرار)، C (`%` روی افتراقی)، D (C + واحدهای معمول).
اسکریپت‌ها در scratchpad (موقت، بیرونِ ریپو): `run.mjs` (اجرای A؛ `OUT=./x.json`)، `diffsweep.mjs` (شمارشِ مطلقِ افتراقی در برابرِ ٪×WBC)، `cmp.mjs` (تفاوتِ ID و فوریتِ دو خروجی). نسخهٔ اصلی: `…/0bb0157b-…/scratchpad/`؛ رونوشت + خروجی‌های این دور: `…/76c4f874-…/scratchpad/` (`outA_stash.json` = پایهٔ هم‌درخت پیش از رفع‌ها، `outA_bug3b.json` = آخرین).
نتیجهٔ کلِ پیش از رفع: ۶ اورژانس، ۱ soon، ۱۰۶ این‌هفته، ۹۵ روتین، ۳ طبیعی، ۲۵ «تفسیر نشد». پس از رفع‌ها: ۷ اورژانس، ۱ soon، ۱۰۶ این‌هفته، ۷۶ روتین، ۲۱ طبیعی/«بخشی تفسیر نشد»، ۲۵ «تفسیر نشد».

### ✅ انجام شد
| # | باگ | رفع | گارد | اثر روی ۲۳۶ |
|---|---|---|---|---|
| ۱ | افتراقیِ بی‌واحدِ < ۲۰ ⇒ مطلق ×۱۰۰۰ (CLL/مونوسیتوزِ کاذب، ۶۸ درخواست) | `unitlessDiffIsPercent` (`adapter.js`): جمعِ ٪ (+Mixed) ۸۵–۱۱۵ یا جمعِ مطلق > WBC×۱٫۱ ⇒ درصد؛ دوقلوی «NEUT%/NEUT» و WBC ≥ ۸۰ مطلق؛ بی‌شاهد ⇒ رفتارِ قبلی | `L11`، `MM8` (۵۲/۱۲۰ قرمز پیش از رفع) | مقدارِ غلط ۱۳۱ → ۰؛ CLL ۸→۰، مونوسیتوز ۳۰→۲، ائوزینوفیلی ۳۰→۱۰؛ هیچ فوریتی بالا نرفت. ثبت: CLAUDE.md N31 |
| ۲ | WBC/RBCِ عددیِ ادرار جای شمارشِ خون ([129]: اورژانسِ کاذب) | `cellTwinRoutes` (`adapter.js`): دو عددِ متفاوت روی یک صفحه ⇒ امتیازِ همسایه (ادراری − CBC)؛ یکتای بالاتر با همسایهٔ ادراری ⇒ `/hpf`؛ وگرنه هیچ‌کدام سنجیده نمی‌شود | `L12` | فقط [129] عوض شد (اورژانس → این‌هفته)؛ هیچ شمارشِ خونی unmapped نشد. ثبت: N25 |
| ۴ | زیرِ اورژانس، `unit_unknown_values` عدد را از دست می‌داد ([64]: اوره ۱۴۹، کراتینین ۲٫۸) | `brief` در `patterns_unit_unknown.js`: عددِ برگه کنارِ نام؛ ردیفِ خارج از محدوده/ناممکن/با فوریت جملهٔ کاملش را نگه می‌دارد؛ `brief_warnings` (تروپونین) | `L13`؛ ۵ هشِ `U10` (specimen.test.js) عمداً بازپایه — بی‌فیلدِ brief بایت‌به‌بایت یکی | ID/فوریت بی‌تغییر؛ ۵ درخواستِ زیرِ اورژانس عدد دارند. ثبت: N18 |
| ۳ (فقط Hb) | Hbِ بی‌واحد در ۱۶۹/۱۶۹ `unit_unknown` ⇒ ۲۴ میکروسیتیکِ بی‌یافته | `hgbSystemFromIndices` (`adapter.js`): واحد از MCHC/Hct یا MCH/RBCِ همان برگه (±۱۵٪، یک سیستم؛ MCHC ۲۲–۴۲، MCH ۱۲–۴۵)، پس از `decideUnit`؛ basis `indices` + جمله در `ResultView.jsx`. همراه: `buildNormalResult` (`prompt.js`) با `unmapped` غیرخالی دیگر «نتایج شما طبیعی است» نمی‌گوید | `L14` | Hb ۰ → ۱۶۸/۱۶۹ ([3] عمداً نه)؛ کم‌خونی‌ها = اجرای D؛ ۲۱ فوریت بالا (روتین → این‌هفته). ثبت: N3، **MEDICAL_RULES.md P89 (تصمیمِ کاربر «سه»، نه بازبینِ مستقل)** |

| ۵ | نوارِ ادرارِ برگهٔ ترکیبی (CBC + ادرار) `unmapped`؛ `Leuko estr` ناشناخته | `detectDipstickPages` + لایهٔ ۲ب (`adapter.js`): ≥ ۲ نشانگرِ قویِ نوار ⇒ نامِ مبهم با مقدارِ فهرستِ بستهٔ نوار ⇒ `Urine Blood/Protein/Glucose/Bilirubin/Ketone`؛ عدد سرم می‌ماند؛ بی‌شاهد unmapped؛ Yeast/Mycelium/Mucus ⇒ qual. همراه: `glycosuria_pattern` سه‌حالته با قندِ خونِ همان برگه (`patterns_nephrology.js`)؛ `unreadQualRows` روی هر برگهٔ مسیرِ موتور، فقط ردیف‌های ادرار (`server.js`) | `L15`، `L15b` (lis1005)، `L15c` (api-contract) — هر سه روی کپیِ بی‌رفع قرمز | پروتئینوری ۲→۲۰، گلوکوزوری ۱→۵، uti ۰→۱؛ ۳ فوریت بالا ([120]، [140]، [205])، هیچ پایین. Blood/Protein/Glucose/Leuko estr/Yeast/Mycelium/Mucus دیگر unmapped نیستند. ثبت: N25 |

| ۶ | [66] «WBC روی برگه نیست» کنارِ WBC 23.9؛ لنفوسیت ۲۰٬۷۹۳ «موقتی»؛ [3] MCHC/MCHِ ناممکن بی‌خواننده؛ [22]/[38] `liver_pattern` بی‌عدد | `mild_neutropenia` شاخهٔ WBCِ بالا (بی‌«موقتی»، بی‌زمانِ رقیب)؛ `viral_lymphocytosis` درجهٔ ۳ CTCAE ⇒ this_week بی‌«موقتی»؛ `rbc_indices_impossible` (تازه، مرزِ P89، routine، بی‌زمان)؛ `liver_pattern` عددِ ALT/AST/ALP و CK | `L16`، `L16b`، `L16c` — روی HEADِ سه فایلِ قاعده قرمز؛ فریزِ `M111` و `U10` عمداً بازپایه (با حذفِ پیشوندِ عددی همان هش) | ۸ درخواست متن عوض شد، هیچ فوریتی جابه‌جا نشد. ثبت: MEDICAL_RULES P90، CLAUDE.md N4 |

**فایل‌های باگِ ۶:** `rules/patterns_hematology.js` (`mild_neutropenia`، `rbc_indices_impossible`، import)، `rules/patterns_infectious.js` (`lymphG3`، `markedLymphocytosis`، import)، `rules/patterns_biochem.js` (`liver_pattern`)، `rules/patterns_utils.js` (`MCHC_PLAUSIBLE_GDL`، `MCH_PLAUSIBLE_PG`)، `rules/adapter.js` (فقط دو ثابت از utils)، `rules/lis1005.test.js` (L16–L16c)، `rules/engine.test.js` (فقط هشِ `pe_components`)، `rules/specimen.test.js` (فقط هشِ `liver`)، `MEDICAL_RULES.md` (P90)، `CLAUDE.md` (N4)، `note.md`.
**باز از باگِ ۶ (پرسشِ بازبین، P90):** `maha_ttp_suspicion` بی‌شیستوسیت/LDH ([199])؛ فوریتِ CKِ کودک ([22])؛ لامِ RBC بی‌واژگان ([201]، spec لازم)؛ مدفوع/ملنا ([38])؛ `cll_suspicion_nccn` فقط ≥ ۵۰ سال.

**فایل‌های باگِ ۵:** `khanesh-server/rules/adapter.js` (`LE_KEY_RE`…`detectDipstickPages` + لایهٔ ۲ب + سه املای استراز در `URINE_ONLY_MARKERS`)، `rules/patterns_nephrology.js` (`glycosuria_pattern` + import)، `server.js` (`COMBINED_URINE_ROW`، `unreadQualRows`)، `rules/lis1005.test.js` (L15، L15b)، `api-contract.test.js` (L15c)، `CLAUDE.md` (N25)، `note.md`.
**باز از باگِ ۵:** Color/Appearance هنوز «تفسیر نشدند» (نویز، بند ۵)؛ شبکهٔ `unreadQualRows` روی برگهٔ فقط-ادرار «Urine pH (Acid)» و «Urine Culture (No growth)» را «چیزی نشان می‌دهند» می‌نامد (پیش از این کار هم بود؛ `QUAL_NEGATIVE` «no growth» ندارد)؛ «Glucose 3+»ِ برگه‌ای بی‌نشانگرِ قویِ نوار هنوز بی‌صدا در qual (`Glucose`) می‌رود؛ متنِ گلوکوزوری درجه (۱+ در برابرِ ۳+) را نمی‌گوید.

**فایل‌های این کار (برای کامیت — جلسهٔ دیگری هم‌زمان `patterns.js`، `prompt.js`، `server.js`، `specimen.js`، `specimen.test.js`، `api-contract.test.js`، `MEDICAL_RULES.md` را تغییر می‌دهد؛ فقط این بخش‌ها مالِ این کارند):**
`khanesh-server/rules/adapter.js` (سه تابع + سه اتصال)، `rules/patterns_unit_unknown.js` (brief)، `rules/prompt.js` (فقط انتهای `buildNormalResultAdult`)، `rules/lis1005.test.js` (L11–L14)، `rules/metamorphic.test.js` (MM8)، `rules/specimen.test.js` (فقط ۵ هشِ FREEZE + کامنت)، `khanesh/src/ResultView.jsx` (`BASIS_TEXT.indices`)، `MEDICAL_RULES.md` (P89)، `CLAUDE.md` (N3، N18، N25، N31)، `note.md`.

### ⏳ باقی مانده (به ترتیب)
1. ~~باگِ ۵~~ ✅ رفع شد (جدولِ بالا).
2. ~~باگِ ۶~~ ✅ بخشِ رفع‌شدنی انجام شد (جدولِ بالا)؛ باقی‌مانده‌اش پرسشِ بازبین است (P90). متنِ اصلیِ بند برای سابقه:
   - [3] Hb = 4.38 (= RBC، خطای ورود) با MCHC 12 / MCH 10؛ `rbc_indices_implausible` فعال نمی‌شود (Hb حالا عمداً سنجیده نمی‌شود، ولی شاخصِ ناممکن هنوز نام برده نمی‌شود).
   - [66] `viral_lymphocytosis` «موقتی» کنارِ لنفوسیتِ ۲۰٬۷۹۳ (حالا با نوتروپنیِ ۱۵۷۷).
   - [201]/[199] «Plt Count = 65000» در PBS Others — ۱۹ ردیفِ PBS بی‌خواننده؛ [199] حالا `maha_ttp_suspicion` می‌گیرد.
   - [38] مدفوعِ سیاه + MCV 55 ⇒ ردیف‌های مدفوع کلاً unmapped؛ `liver_pattern` بی‌عدد.
   - [22] CK 1424 در کودک هیچ‌جا نام برده نمی‌شود (فقط «ورزش سنگین»).
3. **بقیهٔ باگِ ۳ (تصمیمِ بالینی، P48):** اوره/کراتینین (۸۴)، قند (۶۱)، بیلی‌روبین (۱۸)، Ca/Mg/P، چربی‌ها بی‌واحد ⇒ `unit_unknown`. رابطهٔ درون‌برگه‌ای ندارند؛ تنها راه `plausible` (گامِ اندازه) است که بازبین باید تأیید کند. وابسته: فوریتِ اورهٔ ۱۴۹ ِ بی‌واحد `routine` است.
4. **🟠 متوسط (تصمیمِ بالینی):** `thrombocytopenia` + `isolated_thrombocytopenia` هم‌زمان (۵؛ PLT 60/70 «خفیف»، «ایزوله» با RBC/HCT پایین، PLT=100 «به زیر ۱۰۰ هزار»)؛ کراتینینِ شیرخوار (P88 باز)؛ HCT کودک بی‌بازه (۳۷)؛ INR 1.12–1.2 با aPTT طبیعی ⇒ «این هفته» (۴)؛ LDH 490–634 پس از زایمان (۱۲)؛ [17] «R.B.C=4..81» بی‌صدا در qual؛ [57] SG = «1.0» «خیلی رقیق»؛ `crp_pos_esr_normal` «این هفته» بی‌زمان در متنِ اقدام (۵، N20)؛ قندِ تصادفی ۱۴۱–۱۹۹ بی‌قاعده؛ **[87] حالا اورژانس** (`leukocytosis_with_cytopenia`: WBC 22.2، Hb 7.5، PLT 549، ESR 104، CRP++ — پلاکت بالاست نه پایین؛ پرسش برای بازبین)؛ [75] باند ۷۵٪ / نوتروفیل ۱۸٪ (احتمالاً ستونِ جابه‌جای LIS).
5. **🟡 نویز:** `Mixed`، Color/Appearance، گروه خون/کراس‌مچ، **شمارهٔ کیسهٔ خون به‌عنوان آزمایش**، `CH MB II`/`CPK-MB(CHEMICAL)`، ادرارِ کاملاً منفی یا تروپونین/CRP منفیِ تنها ⇒ «تفسیر نشد»؛ «Negative/Many/Weakly Positive» انگلیسی در متنِ بیمار؛ لحنِ «شما/اگر تب دارید» در کودک (۶۸)؛ «تکرار CBC» تکراری (۱۹).
6. **محدودیت‌های شناخته‌شدهٔ رفع‌های انجام‌شده:** ردیفِ افتراقیِ تنهای < WBC بی‌شاهدِ جمع (Eos 3 کنارِ WBC 7.8) هنوز مطلق خوانده می‌شود (۱)؛ دو WBCِ متفاوت بی‌شاهدِ ادرار ⇒ هیچ‌کدام سنجیده نمی‌شود (۲، در این داده رخ نداد)؛ پرسش‌های بازبین در P89 (تحملِ ۱۵٪، بازه‌های اعتمادِ MCHC/MCH، Hct).
7. **کامیت** — فقط با درخواستِ کاربر؛ فایل‌های بالا را جدا stage کنید (بخش‌های جلسهٔ هم‌زمان را نه).
- نکتهٔ داده: ۶ درخواستِ بخشِ زایمان با بیلی‌روبینِ تام ۸–۱۴ و مستقیم ۰٫۲–۰٫۶ احتمالاً نمونهٔ نوزاد زیرِ پروندهٔ مادرند؛ موتور سنِ بزرگسال می‌گیرد.

### پس از هر رفعِ بعدی
`npm test` (درختِ کار) + گاردِ قرمز-اول (stash فقط فایلِ خودت) + `OUT=./outA_<n>.json node run.mjs` و `node cmp.mjs <قبلی> <تازه>` (ID و فوریت) + در صورتِ لزوم `node diffsweep.mjs`؛ ثبت در CLAUDE.md Lab Notebook و، برای هر عدد/تصمیمِ بالینی، `MEDICAL_RULES.md`.

## ۲۰۲۶-۱۰-۰۵ (specs/014، مرحلهٔ الف: ادرارِ ۲۴ساعته و مایعاتِ بدن — P87؛ **کامیت شد: `80315b5`**)
`npm test` روی درختِ کار پیش از کامیت ⇒ `tests 1099 · pass 1098 · fail 0 · todo 1`. پیش از شروع `1079 · 1078 · 0 · 1` بود؛ تفاوت = ۲۱ تستِ تازه منهای `L10` که جلسهٔ هم‌زمان برداشت. فریزِ ۱۴ پنلِ معمولی بایت‌به‌بایت یکی ماند.
**انجام شد:**
- spec، clarify (دو پرسش: «فقط مرحلهٔ الف»، «جای نمایش = خطِ تفسیر نشدند»، «بی‌عددِ مشتق»)، plan، research، data-model، contract، quickstart، tasks (۲۳ کار، همه ✅) در `specs/014-urine24h-body-fluids/`.
- `rules/specimen.js` (تازه): ردیف‌های ادرارِ ۲۴ساعته (حجم، پروتئین، کراتینین، اوره، کلسیم، اسید اوریک) و مایعِ بدن (قند، پروتئین، LDH، نوعِ مایع) *پیش از* NAME_MAP به کانالِ `e.specimen` می‌روند. ردیفی که mapKey می‌شناسد دزدیده نمی‌شود (`24h urine calcium` همان `U_CA`). «Urine Protein»ِ برهنه فقط با مقدارِ عددی و شاهدِ ۲۴ساعتهٔ همان صفحه.
- `prompt.js`: `specimenLine()` (خطِ «این مقادیر شناخته شدند، ولی موتور هنوز تفسیرشان نمی‌کند …» در `ocr_warnings`)، `buildUninterpretedResult({recognized})`، شاخهٔ specimen در `buildNormalResult` («همه طبیعی» ردیفِ تفسیرنشده را نمی‌پوشاند).
- `server.js`: خط در هر دو مسیر؛ برگهٔ specimenدار حتی با `ALLOW_LEGACY_PATH` به مدل نمی‌رسد؛ `safeEngineOut.specimen = undefined`؛ کلیدِ `mergePages` شکلِ مقدار را دارد (نوار و ۲۴ساعته هر دو می‌مانند).
- تست‌ها: `rules/specimen.test.js` (U01–U16، U18)، `api-contract.test.js` (T54–T57). هر گاردِ غیرِفریز روی کدِ قبلی قرمز دیده شد (U16 اول اشتباه سبز بود و سفت شد).
- بازبینیِ کد: ۲ HIGH + ۱ MEDIUM رفع شد (نوارِ ادرار ۲۴ساعته خوانده می‌شد و پروتئینوری گم می‌شد؛ جملهٔ احتیاط می‌گفت «نادیده بگیرید» کنارِ اورژانس؛ ادغامِ صفحه‌ها). دو LOW هم رفع شد (برگهٔ فقط-Fluid Type، مقدارِ خالی).
- ثبت: `MEDICAL_RULES.md` P87 (همهٔ آستانه‌ها/فوریت‌های سند با ✅/📘، «در انتظار بازبینی»، ۱۲ تصمیمِ باز). `CLAUDE.md`: ساختارِ فایل + یادداشتِ N2.
**باقی مانده:**
- مرحلهٔ ب (تفسیرِ واقعی: U24-C دروازهٔ کاملیِ جمع‌آوری، V، P، K، U، CA، UA؛ FL-P/A/C/S) — فقط پس از تأییدِ بازبینِ بالینی روی P87. FL-C1 (قندِ CSF < ۴۰) نخستین اورژانسِ پیشنهادی است.
- دادهٔ لازم از Tirita/LIS: جدولِ کدِ «Fluid Type» (۴ = ؟)، واحدِ هر ستون (اوره یا UUN)، وزن/قد، نام و واحدِ ستون‌های کلسیم/اسید اوریکِ ۲۴ساعته، نامِ واقعیِ ستون‌های مایع.
- محدودیتِ شناخته‌شده: Glucose/LDHِ برهنه کنارِ «Fluid Type» هنوز سرم خوانده می‌شود (فقط جملهٔ احتیاط، `U13`).
- دو هویت برای کلسیمِ ادرار: `24h urine calcium` سنجیده می‌شود، `Urine Ca/24h` فقط شناخته (موقت، تا فریزِ محورِ معدنی بماند).
- LOWهای رفع‌نشده: املاهای `Glucose, CSF`، `Pleural Fluid Protein (Total)`، `Microalbumin 24h` (به «تفسیر نشدند» می‌روند)؛ «Fluid Type: Serum» ⇒ «مایع دیگر».
- مرورگر: تغییر در UI دیده نشد (فرانت دست نخورد؛ خط از راهِ `ocr_warnings` موجود رندر می‌شود).
- پیامِ هماهنگی به جلسهٔ `khanesh-project-49` به‌خاطرِ تفاوتِ حالتِ مجوز منقضی شد و نرسید؛ آن جلسه خودش کار را به specs/014 سپرد (P88).

## ۲۰۲۶-۱۰-۰۵ (قدمِ ۴: جاروبِ کودک/ادرار/سرولوژی/چندصفحه — P84 R11–R15)
`npm test` ⇒ `tests 1067 · pass 1066 · fail 0 · todo 1` (~۲۰ ثانیه). رفع: طبقه‌بندِ TSH با بازهٔ سنی (`interpret.js`)، کفِ فوریتِ عددِ پوشش‌داده (`patterns.js`، ساختاری؛ استثنای دیالیز)، «Many»ِ ادرار، «+/-» مرزی، «Detected»، کشتِ خونِ POS/NEG و N20ِ «نامعلوم»، سرخجه +/-. `mergePages` و سه‌تایی‌ها تمیز. `metamorphic.test.js`: MM1 با ۷ پروفایل و «داخلِ بازه غیرطبیعی نیست»، MM2 بزرگسال+کودک، MM7 ادرار/سرولوژی — روی `1e878eb` سه‌تا قرمز.

## ۲۰۲۶-۱۰-۰۵ (روشِ متامورفیک دائمی شد)
`rules/metamorphic.test.js` (MM0–MM5) در `npm test`: یکنواختی، افزایشی، قالبِ عدد، املا، ترتیب/تکرار، بی‌صدا نبودن. `npm test` ⇒ `tests 1061 · pass 1060 · fail 0 · todo 1`، ~۱۷ ثانیه (پیش‌تر ~۱۰). روی `9a43d1a` (پیش از P84) MM1–MM3 قرمزند. `NAME_MAP` از `adapter.js` export شد (فقط برای این تست). استثناها: `ALLOWED_DROPS` (HCT+Hb، HCT+MCV، کاپا+لامبدا، آلبومین+کلسیم) هر کدام با نمونهٔ ثابت.

## ۲۰۲۶-۱۰-۰۵ (P84: بازبینیِ متامورفیک — ۱۰ رفع، کامیت‌نشده)
`npm test` ⇒ `tests 1055 · pass 1054 · fail 0 · todo 1` (درختِ کار). گاردها R1–R10 در `rules/review1005.test.js` (فایلِ تازه، untracked)؛ هر ۱۰ روی HEAD `9a43d1a` قرمز (git archive + junction). فایل‌ها: `rules/{adapter,patterns_infectious,patterns_endocrine_rheum,patterns_coverage_gaps,patterns_p73_gaps,patterns_nephrology,patterns_biochem}.js`، `server.js` (یک جمله)، `rules/serology.test.js` (S08 عمداً بازپایه)، `MEDICAL_RULES.md` P84، `CLAUDE.md` N31. **کامیت شد: `2c68225`.** حدهای K/Na/Cl، کفِ شمارشِ خام، متنِ 2ME و «Widal بی‌قاعده» با تصمیمِ کاربر (۲۰۲۶-۱۰-۰۵) تأیید شدند (P84) — نه بازبینِ بالینیِ مستقل. **باز:** Widal (منبعِ آستانه)، کامای سه‌رقمی؛ `urea_bun_emergency` ×۲ در برابرِ ×۲٫۱۴.

## ۲۰۲۶-۱۰-۰۴ (P83: RDW↑ و TIBC↑/↓ قاعده گرفتند — کامیت‌نشده؛ P82 در `6cfce31` کامیت شد)
`npm test` ⇒ `tests 1043 · pass 1042 · fail 0 · todo 1`. قاعده‌های `rdw_high`، `tibc_high`، `tibc_low` در `patterns_p73_gaps.js`؛ گاردهای `M377`، `M378` در `review1004.test.js` (روی کدِ قبلی قرمز دیده شد). بی‌آستانهٔ تازه؛ متنِ علت‌ها بی‌منبعِ بازشده (MEDICAL_RULES.md P83). بیلی‌روبین مستقیم↑/غیرمستقیم↑ هم قاعده گرفتند (M380؛ `tests 1045 · pass 1044 · fail 0`). **باز:** ۳۴ ترکیبِ دیگرِ جاروبِ جفت‌ها (MCHC، RDW↓، اورات↓، LDH↓، NH3↓، کلر، GGT↑، …) و جاروبِ سه‌تایی؛ ادعای «طبیعی» برای PDW/P-LCR/PT کنترلِ تنها رفع شد (M379؛ `tests 1044 · pass 1043 · fail 0`).

## ۲۰۲۶-۱۰-۰۴ (ادامهٔ P82: دو مورد بسته شد)
`npm test` ⇒ `tests 1041 · pass 1040 · fail 0 · todo 1`. (۱) فیبرینوژن < ۱۰۰ ⇒ `soon` (تصمیمِ کاربر؛ `M372` و هشِ `fib_90` در `M257` عمداً عوض شد). (۲) ردیفِ Hb شیرخوارِ ۳–۶ ماه **۹٫۳–۱۳٫۴ از CALIPER** (کاربر جدول را paste کرد) در `refs_ped.js`؛ ۶–۱۲ ماه عمداً RCPCH ۱۱–۱۴ ماند (تضاد با CALIPER/WHO — پرسشِ بازبین)؛ گارد `M376` (قرمز-اولش اجرا نشد). جملهٔ «علائمِ حاد» تأیید شد. ثبت: `MEDICAL_RULES.md` P82. **باز:** تضادِ ۶–۱۲ ماه؛ منبعِ بازشدهٔ ۱۰۰ فیبرینوژن.

## ۲۰۲۶-۱۰-۰۴ (بازبینیِ دو گزارشِ فقط‌خواندنی + تصمیم‌های بازبین — P82، کامیت‌نشده)
`npm test` ⇒ `tests 1040 · pass 1039 · fail 0 · todo 1` (روی working tree، همین جلسه سنجیده شد). ثبت: `MEDICAL_RULES.md` P82. تست‌ها: `rules/review1004.test.js` (M366–M375، فایلِ جدا)، `T53` در `api-contract.test.js`.
**انجام شد (قرمز-اول روی HEAD دیده شد، جز M375 که کنترل است):**
- `mds_suspicion` هر ردهٔ «پایین» را با عدد می‌گوید (پلاکتِ ≥۱۰۰ گم نمی‌شد) — M366.
- «روی این برگه نیست» برای هاپتوگلوبین/WBC سه‌حالته (چاپ‌شدهٔ بی‌بازه ≠ غایب) — M367، M368.
- `coagulation_abnormal`: دستورِ شاخهٔ severe ⇒ اورژانس + هشدارِ خونریزی؛ INR ≥ ۳ با آنزیمِ کبدیِ شدید ⇒ emergency؛ با PLT/فیبرینوژنِ پایین ⇒ دست‌کم soon؛ PT > ۲۵ تنها ⇒ soon (با INRِ طبیعی routine) — M369، M372.
- «تفسیر نشد»: «فهرستِ بالا» فقط در مسیرِ عکس + جملهٔ ثابتِ علائمِ حاد در `general_recommendations` (نه `warnings`؛ ResultView آن را رندر نمی‌کند) — M370.
- `childVoice`: بندِ بارداری/قاعدگی/الکل «شما» می‌ماند، «کودکِ کودک» نمی‌شود — M371.
- `fenceData` در `server.js` (تگِ داده در متنِ خام خنثی) — T53.
- WHO: `anemiaSeverityFa` به `patterns_utils.js` رفت و `whoSeverity` را عوض کرد؛ شیرخوارِ زیرِ ۶ ماه هرگز routine نمی‌ماند (تالاسمیِ `microcytic_anemia`، `anemia_hb_alone`) — M373.
- کراتینین و CRP به پیشنهادِ کم‌خونیِ نورموسیتیکِ کودک برگشتند — M374؛ `M365` در `l2.test.js` عمداً به‌روز شد.
- `microMcvCut` در ۱۶ سالگی پیوسته است (۱۵٫۹ و ۱۶ هر دو ۸۰)، فقط گارد — M375.
- فریزِ `fib_90` (در `M257`) عمداً عوض شد: تنها تفاوت‌ها جملهٔ اورژانس و هشدارِ خونریزی است (diff کامل با HEAD).
**باقی مانده:**
- ⚠️ «فیبرینوژن < ۱۰۰ ⇒ اورژانس» **بی‌منبع** است (بازبین از منبعِ باز تأیید نکرد).
- بررسی شود `PED_REFS` در ۶ تا ۱۲ هفتگی افتِ فیزیولوژیکِ Hb را دارد یا نه، وگرنه شیرخوارِ سالم زیاد علامت می‌خورد.
- جملهٔ ثابتِ علائمِ حاد در «تفسیر نشد» را بازبین ببیند (متنِ بیمارخوان).
- HCT < ۲۱ بی‌منبعِ مستقل است (قاعدهٔ سرانگشتیِ ۳×Hb بحرانی)؛ ثبت شد، تأیید شد.
- مرزِ ۱۲ سالِ `childVoice` انتخابِ واژه است، نه بالینی (از P79).
- مرورگر: هیچ‌کدام از این تغییرها در UI دیده نشد (فرانت دست نخورد).
- ⚠️ کامیت‌نشده؛ `rules/review1004.test.js` فایلِ تازه است (untracked) و باید با بقیه stage شود.

## ۲۰۲۶-۱۰-۰۴ (لایهٔ ۵، امنیت — P80، کامیت‌نشده)
`npm test` ⇒ `tests 994 · pass 993 · fail 0 · todo 1`. **رفع شد:** هدرهای ایمنی در `server.js` (`no-store` روی /api چون پاسخ تفسیرِ کاملِ یک بیمار است، nosniff، X-Frame-Options، Referrer-Policy، حذفِ X-Powered-By؛ بی‌وابستگیِ تازه)، گارد T52؛ `npm audit fix` (بدونِ --force) در `khanesh-server`: ۵ آسیب‌پذیری (undici/ip-address/qs) ⇒ ۰ (`package-lock.json`)؛ فرانت از قبل ۰. **اندازه‌گیری شد، رفع‌شدنی نیست مگر با شما:** (۱) کلیدِ AvalAI در تاریخچهٔ گیت است (`763c73d`، `labmat-prototype/.env`؛ `.env` الان ردیابی نمی‌شود) — **فقط شما در AvalAI بچرخانید**؛ (۲) `AUTH_REQUIRED` پیش‌فرض خاموش ⇒ هر job-id خوانا؛ id از `randomUUID` است (حدس‌نزدنی) ولی با auth خاموش هیچ مالکی نیست؛ (۳) SMS/ایمیل mock؛ (۴) تصویرِ کاملِ برگه (نام/کدملی) به سرویسِ ثالث می‌رود؛ (۵) `ALLOWED_ORIGINS` و `TRUST_PROXY` ست نشده (هشدارِ بوت)؛ (۶) سقفِ بدنه ۶۰MB بی‌احراز هویت. **ممیزی نشد:** لاگ‌ها برای دادهٔ بیمار، CSP، rate-limit روی `/api/auth`، وابستگی‌های dev.

## ۲۰۲۶-۱۰-۰۴ (دو موردِ جزئیِ لایهٔ ۴ رفع شد — P79، کامیت‌نشده)
`npm test` ⇒ `tests 993 · pass 992 · fail 0 · todo 1`. (۱) صدا: `applyChildVoice` در `rules/neonatal.js` + فراخوانی در `patterns.js` — «شما» ⇒ «کودک» برای ۲۸ روز تا < ۱۲ سال. (۲) `normocytic_anemia` کودک: فقط رتیکولوسیت و فریتین (`patterns_hematology.js`). گاردها M365–M365c در `l2.test.js` (M365 قرمز-اول دیده شد)؛ `M158` و `M184h` در `engine.test.js` عمداً عوض شدند. ثبت: `MEDICAL_RULES.md` P79. **باز:** مرزِ ۱۲ سال واژه است نه بالینی؛ شاخهٔ `reticLow` هنوز کراتینین پیشنهاد می‌دهد؛ در مرورگر دوباره دیده نشد.

## ۲۰۲۶-۱۰-۰۴ (لایهٔ ۴، ادامه): جریانِ کامل با مدلِ واقعی در مرورگر دیده شد (ورودِ دستی، اعتبارِ AvalAI فعال)
سه اجرا، هر کدام ۶–۱۴ ثانیه: (۱) زنِ ۴۰ ساله Hb 9.5/MCV 70/فریتین 6 ⇒ «این هفته»، متنِ فقرِ آهن با عددهای برگه، FOBT و «قرصِ آهن بدونِ پزشک نخورید»؛ (۲) K 7.1 ⇒ بنرِ «همین امروز»، «همین حالا به اورژانس»، ردیفِ «بحرانی — خیلی بالا»، eGFR به‌عنوانِ «محاسبه‌شده»؛ (۳) پسرِ ۳ ساله Hb 10.5/MCV 75 ⇒ بازهٔ RCPCH (Hb 11–14، MCV 75–87 «طبیعی») — تأییدِ اینکه رفعِ پیش‌نمایش (نسخهٔ بزرگسال MCV 75 را «پایین» می‌گفت) درست بود. **دیده نشد:** مسیرِ عکس/OCR، نتیجهٔ «تفسیر نشد» از UI (فرمِ دستی کلیدِ نشناخته نمی‌پذیرد)، موبایل. **یافتهٔ جزئی (رفع نشد):** در متنِ کودک «این کودک…» در خلاصه ولی «خون شما…/هموگلوبین شما» در تفسیر (لحنِ ناهمگن)؛ پیشنهادِ «کراتینین/CRP» برای کم‌خونیِ خفیفِ نورموسیتیکِ کودک از موتور می‌آید و بازبینِ بالینی لازم دارد.

## ۲۰۲۶-۱۰-۰۴ (لایهٔ ۴، فرانت): پیش‌نمایشِ محلیِ ورودِ دستی (P79) — کامیت‌نشده
`npm run lint` exit 0، `npm run build` exit 0 (فرانت تست ندارد؛ با پروبِ `node` و Playwright وارسی شد — این بار وصل شد). **یافته‌ها (اندازه‌گیری‌شده):** (۱) `comboInsights` آستانه‌های هاردکد داشت و با ردیفِ کنارش مخالفت می‌کرد: FBS 105 ردیف «در محدوده» ولی نکته «قند بالا»؛ بارداریِ Hb 11.5 + فریتین 20 ردیف‌ها «در محدوده» ولی نکته «فقر آهن» (بارداری پاس داده نمی‌شد)؛ فریتین < 30 در حالی که بازهٔ زن از 15 است. (۲) **زیرِ ۱۶ سال همهٔ بازه‌ها بزرگسال بودند** (Hb کودکِ ۳ ساله با 13.5–17.5، MCV 75 «پایین»، نکتهٔ «کم‌خونی میکروسیتیک»). **رفع:** نکته‌ها از همان بازهٔ ردیف (با بارداری)؛ زیرِ ۱۶ سال (`PED_MONTHS = 192`) بالا/پایین و نکته‌ها نمی‌آیند — وضعیتِ تازهٔ `na` «برای این سن سنجیده نمی‌شود» (نه «طبیعی»)، بازهٔ بزرگسال نمایش داده نمی‌شود؛ مرزهای بحرانیِ ثابت (K 7.2) می‌ماند. هیچ عددِ بالینیِ تازه‌ای نیامد. فایل‌ها: `khanesh/src/{labRefs.js,LocalPreview.jsx,EntryGrid.jsx}`. **تأییدشده در مرورگر:** گزینهٔ «دیالیز» در گامِ آخرِ intake هست؛ کودکِ ۳ ساله: Hb 10.5 ⇒ chip «سنجیده نمی‌شود»، بی‌RangeBand، بی‌نکته. **باز:** `buildTestText` هنوز «محدودهٔ طبیعی» بزرگسال را برای کودک در `testResults` می‌فرستد (فقط زمینهٔ MedlinePlus/مسیرِ بستهٔ قدیم)؛ `LocalPreview` برای سالمندِ ≥ ۷۵ بازهٔ ژریاتریک ندارد؛ جریانِ کاملِ تفسیر در مرورگر بی‌بک‌اند/اعتبارِ AvalAI دیده نشد؛ موبایلِ واقعی دیده نشد. REF_DIFF.md به‌روز نشد.

## ۲۰۲۶-۱۰-۰۴ (لایهٔ ۳): مسیرِ قدیمِ «مدل داورِ شدت» بسته شد (P78) — کامیت‌نشده
`npm test` ⇒ `tests 989 · pass 988 · fail 0 · todo 1`. با `ALLOW_LEGACY_PATH=true` تست‌های T49/T50 قرمز می‌شوند (قرمز-اول). تصمیمِ من (تأیید نشده): پیش‌فرضِ بسته؛ برگهٔ نشناخته/فقط-متن ⇒ «تفسیر نشد» بی‌مدل. فایل‌ها: `server.js` (`LEGACY_ALLOWED`، گیت پیش از گراف)، `rules/prompt.js` (`buildUninterpretedResult`)، `api-contract.test.js` (T49–T51)، `.claude/rules/{architecture,environment}.md`. **بعداً (تأییدشده):** `USE_ENGINE` حذف شد (نادیده + هشدارِ بوت)؛ گراف بی‌موتور اجرا نمی‌شود؛ دفاعِ «تگ‌ها داده‌اند» در `SYSTEM_PROMPT` (ضعیف؛ مسیر پیش‌فرض بسته است). `tests 990 · pass 989 · fail 0`. با `USE_GRAPH=true` تستِ T16 (می‌خواهد گراف خاموش باشد) و T10 (N13) قرمزند — از این کار نیست. **باز:** لایه‌های ۴ (فرانت) و ۵ (امنیت) اجرا نشده.

## ۲۰۲۶-۱۰-۰۴ (دوم): پاسخِ بازبین به ۱۵ پرسش پیاده شد (MEDICAL_RULES «P77-پاسخ»؛ M354–M364) — کامیت‌نشده
**بازاندازه‌گیری‌شده:** `npm test` ⇒ `tests 986 · pass 985 · fail 0 · todo 1` (درختِ کار؛ ۲۱۷ قاعده؛ کارِ هم‌زمانِ خودایمنی داخلش است). تغییرِ عمدی: `M50b`، یک هش در `M180b`. پاسخ‌ها را کاربر از یک دستیارِ دیگر چسباند؛ منبع‌ها را باز نکردم و پله‌های زیرِ اورژانس (Mg، اوره ۱۵۰، فسفر، INR، آدرنال) تصمیمِ طراحی‌اند. فایل‌های تازه برای `git add`: `rules/{patterns_nephrology,patterns_mineral_bone,patterns_infectious,patterns_endocrine_pituitary,refs,names,units,adapter}.js` علاوه بر فهرستِ پایین.

## ۲۰۲۶-۱۰-۰۴ (بعد از P75): لایهٔ ۲ — گروه‌های ۳ (فقط MCV)، ۵، ۶، ۷ پیاده شد (P77) — **کامیت‌نشده**
**بازاندازه‌گیری‌شده:** `npm test` ⇒ `tests 958 · pass 957 · fail 0 · todo 1` (درختِ کار؛ شاملِ کارِ هم‌زمانِ خودایمنی `patterns_autoimmune.js`/`autoimmune.test.js`، P76 — از من نیست؛ ۲۱۱ قاعده). فرانت دست نخورد.
- **رفع شد (گاردها `l2.test.js` M341–M353):** N4 در `tpBuild`، `hemolysis_pattern` (عضله)، `isolated_thrombocytopenia`، `mild_neutropenia`، `pancytopenia` (ANC کم + WBC طبیعی)، `overt_b12_deficiency` (بی‌MCV)، `potassium_critical` (Mgِ بالا)؛ مرزِ MCV کودک از `PED_REFS` (`macroMcvCut`/`microMcvCut`)؛ زمان‌بندیِ رقیب: `glycemia`↔FBS 300 (`glucoseOwnerFires`)، `alcoholic_liver_pattern`↔`liver_pattern` (`liverMarked`)، `hscrp_ascvd_risk`↔`crp_elevated`؛ `SUGGEST_TESTS` (۱۳ ردیف)؛ `anemia_macrocytic_mds` کنارِ `mds_suspicion`؛ `hcg_result` دخترِ < ۱۰ سال.
- **تغییرِ عمدی در تستِ قدیمی:** فقط `M111` (هشِ `pe_components`: PLT بی‌Hb/WBC).
- ⚠️ **قرمز-اولِ صریح فقط برای بخشی:** تلاشِ تمیز با فایل‌های HEAD روی temp به‌خاطرِ ناهم‌خوانیِ import شکست خورد؛ M341/M342/M347–M350/M353 را پیش از رفع با `probe.mjs` روی موتور دیدم (قرمز)، ولی M343–M346 و M351/M352 فقط با خواندنِ متنِ قدیمی. اگر لازم است با `git archive` + کلِ درخت بازبسنج.
- **باز (پرسشِ بازبین، `MEDICAL_RULES.md` P77):** HCT کودک، WHO زیرِ ۵ سال، PCT/BNP نوزادِ روزِ اول، زنجیرهٔ سبکِ آزاد (قاعده‌های مرده: بازه یا حذف)، hCG زنِ یائسه. باقی‌ماندهٔ گروه ۷: `hcg` بالا انجام شد؛ ACR/`thyroid_nonthyroidal_illness` بازتولید نشد.
- **کامیت:** فایل‌به‌فایل؛ این جلسه علاوه بر فهرستِ P75 این‌ها را زد: `rules/{patterns,patterns_biochem,patterns_cardiac,patterns_coverage_gaps,patterns_endocrine_rheum,patterns_hematology,patterns_malignancy,patterns_reproductive,patterns_utils}.js`، `rules/{engine,l2}.test.js`، `MEDICAL_RULES.md`، `note.md`. ⚠️ `patterns.js`، `names.js`، `serology.js`، `server.js`، `units.js` و `patterns_autoimmune.js`/`autoimmune.test.js` کارِ جلسهٔ هم‌زمان هم دارند — پیش از `git add` با `git diff` جدا کنید.

## ۲۰۲۶-۱۰-۰۴ (جدیدترین‌تر): P77 — سندِ مرجعِ کاربر در موتور پیاده شد (مراحل ۱–۴ کامل) — **کامیت‌نشده**
`node --test` ⇒ `tests 989 · pass 988 · fail 0 · todo 1` (دور ۲: ردیفِ بی‌محدوده/مرزی هم یافته می‌گیرد؛ قرمزهای جلسهٔ هم‌زمان در این اجرا سبز بودند). قاعده‌ها ۲۰۶ ⇒ ۲۱۷ (+۱۱: ۵ از P76 و ۶ از P77). فایل‌ها: `serology.js` (کلیدهای تازه، `AI_NOREF`، `anaPatternsOf`)، `patterns_autoimmune.js` (بازنویسی)، `autoimmune.test.js` (A01/A04/A10 عمداً عوض)، `autoimmune2.test.js` (تازه، B00–B16)، `names.js`، `patterns.js` (`SUGGEST_TESTS`)، `server.js` (`QUAL_WORDS`)، `MEDICAL_RULES.md` P77. جزئیات، حدهای ثابتِ تازه و پرسش‌های بازبین: P77. **منابعِ اصلی باز نشده‌اند؛ `sources` خالی.**
- **تله (دوباره N15):** `node -e`/heredoc با رشتهٔ regex در template literal **بک‌اسلش را می‌خورد** (`\s`→`s`، `\b`→backspace U+0008) — این بار در `serology.js` و `server.js`؛ با `grep -nP '[\x00-\x08]'` گرفته شد. regex را فقط با ابزارِ Edit/Write بنویس.
- **باز:** AFP بی‌واحد unmapped (M105)؛ خودایمنیِ عددیِ بی‌محدوده unmapped (P76/C1)؛ فوریتِ FIT/کلسی‌تونین/PSA منتظر بازبین.

## ۲۰۲۶-۱۰-۰۴ (قبل‌تر): پنلِ خودایمنی/روماتولوژی، مرحلهٔ ۱ و ۲ پیاده شد (P76) — **کامیت‌نشده**
**بازاندازه‌گیری‌شده:** `node --test` ⇒ `tests 958 · pass 954 · fail 3 · todo 1`؛ شروعِ جلسه `917 · 916 · 0 · 1`. قاعده‌ها ۲۰۶ ⇒ ۲۱۱ (diffِ id: فقط +۵ — `ana_family_result`، `anca_result`، `hla_b27_result`، `anti_ccp_result`، `complement_result`؛ N16).
- **۳ تستِ قرمز از من نیست:** `M111`، `M180b`، `M257` (هش‌های freeze). ثابت‌شده: با برگرداندنِ سه فایلِ من (`serology.js`، `patterns.js`، `names.js`) به HEAD همان هشِ `plt_80` (`c5c413bc7be25ba5` ≠ مورد انتظار) می‌ماند. علت: جلسهٔ هم‌زمانی `patterns_malignancy.js` (`isolated_thrombocytopenia`، N4)، `patterns_endocrine_rheum.js`، `patterns_hematology.js` و `patterns.js` را هم‌زمان ویرایش می‌کند (mtime ۰۹:۲۱–۰۹:۳۳). بازپایه‌کردنِ هش‌ها با صاحبِ آن کار است؛ **دست نزدم**.
- **فایل‌های من:** `rules/serology.js` (کلیدهای `AI_RE`، `readAutoValue`، `rangeVerdict`، `autoAbState`، شاخهٔ تازه در `routeSerology`)، `rules/patterns_autoimmune.js` (تازه)، `rules/autoimmune.test.js` (تازه، A00–A27)، `patterns.js` (import + spread + ۴ ردیف `SUGGEST_TESTS` + `measured`)، `names.js`، `server.js` (`QUAL_WORDS`)، `MEDICAL_RULES.md` P76. **`git add` فایل‌به‌فایل** — `patterns.js` و `names.js` را جلسهٔ دیگر هم لمس کرده؛ `git diff` را ببین.
- **C1:** هیچ آستانهٔ ثابتی نیست؛ مرز فقط از خودِ ردیف. بی‌مرز/سانسورشده/تیترِ بی‌واژه/«+/-» ⇒ `unmapped`.
- **باز:** مرحله ۳ (تومورمارکرها) و ۴ (کالپروتکتین، FOBT) از طرحِ پایین انجام نشد؛ Anti-Sm/RNP/Scl-70/Jo-1/آنتی‌فسفولیپید نگاشت ندارند؛ پرسش‌های بازبین در P76؛ هیچ `sources` ثبت نشد (هیچ سندی باز نشده).
- **تله:** در Git Bash، `> $TEMP/x` مسیرِ ویندوز را با بک‌اسلش می‌خورد — `TD=$(cygpath -u "$TEMP")` بزن. و `cd khanesh-server` در یک فراخوانی cwd را برای بعدی‌ها هم عوض می‌کند.

## ۲۰۲۶-۱۰-۰۴ (قبل‌تر): P74 کامیت شد؛ ممیزیِ لایهٔ ۲ اجرا و گروه‌های ۱، ۲، ۴ رفع شد — **کامیت‌نشده**
**بازاندازه‌گیری‌شده:** `npm test` در `khanesh-server/` ⇒ `tests 917 · pass 916 · fail 0 · todo 1`؛ ۲۰۶ قاعده (`diabetes_a1c_diagnostic` حذف، `qual_equivocal_result` اضافه). فرانت دست نخورد.

### انجام‌شده
- **P74 کامیت شد:** بازه‌های بزرگسالِ `refs.js` = فرانت، جز قندِ ناشتا (۷۰–۱۱۰). ۸ فایل، فقط همین کار. push نشده.
- **لایهٔ ۲:** ۶ `eval-medical-reviewer` موازی روی ۱۹ فایلِ `patterns_*.js` + utils (چک‌لیستِ N1–N29، بازتولید با موتورِ واقعی) ⇒ ≈ ۸۲ یافته. گزارش‌ها فقط در scratchpadِ جلسه بود (در مخزن نیست).
- **گروه ۱ — N6:** `qualVerdict()` در `patterns_utils.js` خوانندهٔ بستهٔ مشترک است (تروپونین ×۲، `serologyReactive`، `qualPositive`، hCG، `crp_pos_esr_normal`)؛ کشتِ منفی (فقط ادرار آستانهٔ CFU دارد؛ نامِ ارگانیسم = رشد)؛ لامِ «<1%»؛ IgM منفی؛ `qual_equivocal_result` (مبهم نام برده می‌شود؛ تروپونینِ مرزی `soon`).
- **گروه ۲ — N3:** `PRINTED_ONLY_CONVERSIONS` ← LACTATE/PCT_SEPSIS/APOB؛ PRL بی‌واحد با محدودهٔ چاپیِ ≥ ۶۰ ⇒ mIU/L؛ پرهیزِ منی ساعت ÷ ۲۴؛ «1,200» هزارگان؛ مقدارِ سانسورشدهٔ «<6» ⇒ `unmapped` (`censoredIndeterminate` در adapter).
- **گروه ۴ — N19/N20:** `kidneySevere` (kidney↔GN + GN با `always_show`/`brief`)، `muscle_origin_not_liver` فوریت از CK، `lowestGlucose`، تالاسمیِ Hb < ۸ ⇒ this_week، شاخهٔ A1c-نامعتبر، حذفِ `diabetes_a1c_diagnostic`، `brucella_active` = `(رایت و 2ME) یا کومبس`.
- **بازبینیِ مستقل (`code-reviewer`):** ۹ یافته، ۸ رفع (`POSITIVE.` تروپونین را می‌انداخت، آستانهٔ `<10000` روی کشتِ خون، `RULE_READS` قندِ پایین، GN پنهان، «TSH <5 mIU/L»، «less than 20%» ⇒ اورژانس، `key_number`)؛ یافتهٔ ۸ (دو اورژانسِ عضله/رابدو) رقابتی نبود (`pickFinalAction` یک دستور می‌دهد).
- **تست‌ها:** `rules/l2.test.js` M322–M340. M322–M335: ۱۷ از ۱۸ روی HEAD قرمز (M322b کنترلِ جهتِ مخالف). M336–M338 و M340 روی HEAD سبزند (گاردِ رفعِ خودمان). تغییرِ عمدی در قدیمی‌ها: `M92d`، `M125` (یک هش)، `M176b` (CK ۶۰۰).
- **ثبت:** `MEDICAL_RULES.md` P75، `CLAUDE.md` N30، این فایل.

### مراحلِ باقی‌مانده (به ترتیب)
1. **کامیت (کاربر نخواسته؛ فقط با درخواست).** `git add` فایل‌به‌فایل: `khanesh-server/rules/{adapter,units,patterns_utils,patterns_biochem,patterns_cardiac,patterns_coverage_gaps,patterns_hematology,patterns_infectious,patterns_nephrology,patterns_reproductive}.js`، `rules/{engine,l2}.test.js`، `MEDICAL_RULES.md`، `CLAUDE.md`، `note.md`. **نه** `-A`: `khanesh/src/{Landing.jsx,onboarding/*,site.css}` کارِ جدایِ کاربر است. هوکِ pre-commit تستِ ایندکس را اجرا می‌کند.
2. **پرسش‌های بازبینِ پزشکی (P75، آستانهٔ بی‌منبع — کد عدد نمی‌سازد):** Mg بالای تنها (۶٫۵ mg/dL ⇒ routine؛ `CTCAE_MAP.MG.high = null`)، لیپاز ۲۰۰۰ تنها ⇒ this_week، پرشِ اوره ۱۹۰ (routine) / ۲۰۰ (اورژانس)، فسفاتِ بالا ۹٫۵ بی‌نشانهٔ کلیوی، سقفِ this_week در `adrenal_insufficiency_likely` (تصمیمِ P46 بند ۱۲)، `INR` ≥ ۳ ⇒ اورژانس، و **تروپونینِ مرزی = `soon`** (تصمیمِ من، تأیید نشده).
3. **گروه‌های نخواسته‌شدهٔ لایهٔ ۲:** (۳) آستانهٔ بزرگسال برای کودک: MCV (`macroMcvCut`، `MCV>102`، `<80`)، HCT (ردیفِ اطفال ندارد)، فریتین/TSAT، BNP، PCT نوزاد، شدتِ WHO (`anemiaSeverityFa`)؛ (۵) «طبیعی است» برای آزمایشِ نسنجیده: `hemolysis_pattern` (هاپتوگلوبین)، `pancytopenia` (WBC طبیعی)، `tpBuild` (آلبومینِ پایین «نیست»)، K/Mg، `isolated_thrombocytopenia`، `mild_neutropenia`، `overt_b12_deficiency` (CBC)؛ (۶) زمان‌بندیِ رقیب: FBS ۳۰۰ (`severe_hyperglycemia`+`diabetes_range`)، AST ۵۰۰ (`liver_unspecified`+`alcoholic`)، CRP + `hscrp_ascvd_risk` (روی هر CRPِ ۲–۱۰ آتش می‌شود و می‌گوید «نشانهٔ التهاب نیست»)، ACR، `thyroid_nonthyroidal_illness` (FT3 اضافه ⇒ routine)؛ (۷) `SUGGEST_TESTS` ناقص (CBC، 2ME، کومبس رایت، «ویتامین B12 و فولات»، «ACR ادرار»، «BUN»، «ABG»)، `monoclonal_gammopathy_kappa/lambda` هرگز آتش نمی‌شوند (N17)، قاعده‌های `mds_suspicion` و `anemia_macrocytic_mds` تکراری، `hcg_result` بی‌گیتِ سن.
4. **لایه‌های ۳–۵ از پیشنهادِ اولِ جلسه:** (۳) مسیرِ قدیمیِ `USE_ENGINE=false` / متنِ بی‌تصویر که مدل شدت را قضاوت می‌کند؛ (۴) فرانت: `LocalPreview.jsx` (تنها متنِ بالینیِ بی‌موتور)، جریانِ کاملِ مرورگر (Playwright قبلاً `CONNECT_TIMEOUT` داد)، مسیرِ «دیالیز» در intake؛ (۵) امنیت: **کلیدِ AvalAI در تاریخچهٔ git است و فقط کاربر می‌تواند در AvalAI بچرخاند**، `AUTH_REQUIRED` پیش‌فرض خاموش، SMS mock، ارسالِ تصویرِ کاملِ برگه به سرویسِ ثالث.
5. **باز از قبل:** منبع‌های «فقط خلاصهٔ جست‌وجو» (WHO 2016، ACG، Soeters، AASLD/EASL، WHO anaemia)؛ TSH < ۰٫۱ در بارداری؛ اثرهای جانبیِ P74 در انتظارِ بازبین (FT4 ۰٫۷ طبیعی، بیلی‌روبین ۱۴ این‌هفته‌ای، فولات > ۲۵ «بالا»، INR ۱٫۲ «بالا»، PLT ۴۰۰–۴۵۰ «بالا»).

**تله‌های این جلسه:** (الف) Python با `open(..., newline='')` و رشتهٔ `` غیرخام یک backspace (U+0008) در regex گذاشت و `qualVerdict` را بی‌صدا از کار انداخت — بعد از هر ویرایشِ regex `grep -P '[ -]' rules/*.js` بزنید. (ب) فایل‌های rules/ بیشترشان CRLF‌اند؛ ویرایشِ چندخطی با رشتهٔ LF خطِ مختلط می‌سازد. (ج) هر خواننده‌ای که کلیدِ تست را در یک helper ماژول می‌خواند از `RULE_READS` بیرون می‌رود (N18) — کلید را در سورسِ خودِ قاعده نگه دارید. (د) بازبینیِ مستقل: ریویوِ مستقل ۳ رگرسیونِ واقعی در رفعِ خودم پیدا کرد (مثبت‌های از دست‌رفته، آستانهٔ کشتِ خون، RULE_READS)؛ رفعِ N6 بی‌ریویو کامل نیست.

## ۲۰۲۶-۱۰-۰۳ (آخرین): P72 کامیت شد (`84a0dd5`)؛ TSH < ۰٫۱ + ۱۲ شکافِ پوشش (P73) پیاده و کامیت شد
`npm test` ⇒ `tests 894 · pass 893 · fail 0 · todo 1` (بازاندازه‌گیری‌شده). جزئیاتِ منبع‌ها و پرسش‌های بازبین: `MEDICAL_RULES.md` P72/P73؛ درس: `CLAUDE.md` N29.
- مسیرِ دیالیز در intake: بدونِ تغییر کار می‌کند (کاتالوگ → چیپ‌ها → سرور)؛ در مرورگر دیده نشد.
- باز: آستانه‌های P73 (فریتین ۳۰۰۰ routine، HCO3 < ۱۸ برگرفته از CKD، PCT this_week، CK ۵×ULN از Merck)، TSH < ۰٫۱ در بارداری، منبع‌های «فقط خلاصهٔ جست‌وجو» (WHO 2016، ACG، Soeters، AASLD/EASL، WHO anaemia).
- هنوز: چرخاندنِ کلیدِ AvalAI، کارِ جدایِ فرانتِ کاربر (`Landing.jsx`، `onboarding/*`، `site.css`) کامیت‌نشده — با `git add` فایل‌به‌فایل.


## ۲۰۲۶-۱۰-۰۳ (آخر): ممیزیِ لایهٔ ۱ (P72) — سه رفع + چهار تصمیمِ کاربر پیاده شد؛ کامیت‌نشده

**هدف جلسه:** «خوانش» پروژهٔ سلامت است؛ برای یافتنِ باگ‌های تفسیر، به‌جای خواندنِ کد، موتور را با جاروبِ ناقض‌ها اندازه گرفتم. **بازاندازه‌گیری‌شده:** `node --test` ⇒ `tests 884 · pass 883 · fail 0 · todo 1` (`M154b` قدیمی)، `npm run lint` در فرانت exit 0. شروعِ جلسه: `874 · 873 · 0`.

**روش (لایهٔ ۱):** ۴٬۳۵۵ پنلِ تک‌آزمایشی (۹۱ کلید × ۵ گروه: مرد/زن/باردار/کودک ۸ ساله/سالمند ۸۲ × وسطِ بازه + ۵ پلهٔ بدترشدن در هر جهت) + ۱۲٬۱۸۰ پنلِ دوتایی، روی `buildEngineFallbackResult` (بی‌مدل). ناقض‌ها: I1 سکوت، I2 جهتِ متن، I3 دو دستورِ رقیب / اورژانسِ بی‌دستورِ فوری، I4 وسطِ بازه یافته نسازد، I5 «طبیعی» دربارهٔ آزمایشِ غایب، I6 یکنواختیِ فوریت، I7 کلیدِ خام/`undefined`، I8 ورودیِ SI. نتیجه: I3 رقیب صفر؛ I0 (کرش) صفر؛ I5 فقط مثبتِ کاذبِ HbA2/HbF (۳۶۱ مورد، بی‌خطر). **اسکریپت‌ها حالا در مخزن‌اند: `.claude/audit/`** (untracked، کامیت‌نشده؛ مسیرها نسبی، از هر جا اجرا می‌شوند؛ هر کدام در خطِ اولش می‌گوید چه می‌کند): `layer1.mjs` (جاروب؛ خروجیِ میانی `<tmp>/layer1-out.json` یا `$LAYER1_OUT`)، `gaps.mjs` (پله‌های شکاف)، `n8.mjs` (پیشنهادهای غیرِ آزمایش؛ ⚠️ regexِ خودش «درخواست سونوگرافی …» را هم پرچم می‌زند که حالا *درست* است — فقط «درخواست آزمایش …» + غیرِ آزمایش خطاست)، `probe.mjs` (پروبِ پنلِ تکی: `node .claude/audit/probe.mjs '[["برچسب",{"sex":"F","age":35},[{"name":"FT4","value":"2.5","unit":"ng/dL"}]]]'`)، `diff.mjs` (HEAD در برابرِ درخت؛ نیاز به `HEAD_ROOT=<git archive + junction node_modules>`). ترتیبِ اجرا: `layer1` ← `gaps`/`n8`. اجرای تأییدشده روی درختِ فعلی: `fallback-only key|dir: 64`، `I3` صفر، `I0` صفر. اسم‌ها `*.test.js` نیستند، پس `npm test` برنمی‌دارد.

**⚠️ «کامیت‌نشده»‌های بخش‌های قدیمیِ پایین کهنه‌اند** (`git status` را جلسهٔ ۲۰۲۶-۱۰-۰۳ بازخواندم): specs/011 (ورود، intake، `conditions.js`، پروفایل) در `ccfd9e5` کامیت شده؛ `labmate_hero_mockup.webp` ردیابی‌شده است؛ ۷ تستِ todoِ P46/P47/P49 و specs/012 در `4794f22` و پیش از آن رفته‌اند. **درخت‌ِ کاریِ فعلی فقط این‌هاست:**
- *کارِ این جلسه (P72، آماده، تست‌شده):* `CLAUDE.md`، `MEDICAL_RULES.md`، `note.md`، `khanesh-server/rules/{conditions,patterns_biochem,patterns_endocrine_rheum,patterns_hematology,patterns_malignancy,patterns_nephrology,prompt}.js`، `rules/{engine,serology}.test.js`، `khanesh/src/conditions.js`، و `.claude/audit/` (untracked).
- *کارِ فرانتِ جدای از این جلسه (من نزدم؛ تمام‌بودنش را نمی‌دانم):* `Landing.jsx` (پارامترِ `onDark` برای `PillNav`)، `onboarding/{Intake,OnbShell,SignIn,StartChoice}.jsx`، `onboarding.css`، `site.css`، و untracked: `onboarding/icons.jsx`، `public/lab/labmate_hero_mockup.jpg` (دیگر مصرف نمی‌شود). ⚠️ `khanesh/src/conditions.js` (من) و `Intake.jsx` (او) هر دو در همین درخت‌اند — کامیتِ من نباید `Intake.jsx` را با خود ببرد.
- *پاک‌شد ۲۰۲۶-۱۰-۰۳ (دستورِ کاربر):* ۸۶ فایلِ اسکرچ — ۱۹ `khanesh-server/_audit_*.json` + ۶۷ `_audit_*.mjs`/`_dbg*.mjs` در `khanesh-server/` و `rules/` (۱٫۲MB؛ untracked، بی‌هیچ ارجاع از فایلِ ردیابی‌شده؛ نتایجشان در P67/P72 ثبت است). **بازگشت‌پذیر نیست.** *هنوز untracked و دست‌نخورده، چون اسکرچ‌بودنشان قطعی نیست:* `.hermes/`، `khanesh-server/.hermes/`، `.clinerules/`، `labmate-bot/` (پروژهٔ کاملِ ربات با تست)، `abs.sh`، `start-labmate*.bat`، `diagnose-labmate.bat`، `docs/hero-*`، `docs/site-modernization-proposal.md`، `specs/document_*.mp4`، `.claude/backend-dev.log`.

**رفع‌شده (همه با تستِ قرمزِ-اول؛ M303–M311):**
1. `kidney` (N20): eGFR < ۱۵ «emergency» بود با دستورِ «وقت بگیرید». حالا «همین امروز به اورژانس» (شدتِ ۴، نه ۵؛ نسخهٔ اول دستورِ نهاییِ K 7 را می‌ربود — بازبین گرفت، `M303b`).
2. `thyroid` (N4+N12): TSH/FT4ِ غایب «طبیعی» خوانده می‌شد؛ FT3 بالا متنِ کم‌کاری می‌گرفت؛ برگهٔ فقط-TSH «FT4 هنوز طبیعی است» می‌گفت. `missingFa()`، شاخهٔ `thyroid_tsh_unmeasured` (this_week)، `thyroid_hypo/hyper_ft4_unmeasured` (`M304`، `M305`).
3. N8: `phraseSuggestion` دیگر «درخواست آزمایش» را پیشِ سونوگرافی/معاینه/ارجاع/فیبرواسکن/فشارخون/پایش نمی‌گذارد (`NON_LAB`)؛ جملهٔ «اگر داروی دیابت…» از suggest به warnings؛ «ارجاع فوری اورژانسی» و «تزریق خون (Blood Transfusion)» از suggest حذف (`M306`).
4. **تصمیمِ کاربر — کبد:** > ۱۰× سقف (ALT > ۳۶۰ / AST > ۳۳۰) ⇒ `soon` + «ظرفِ ۲۴ تا ۴۸ ساعت»؛ CTCAE درجهٔ ۴ ⇒ `emergency` + دستورِ اورژانس (`M308`). استثنای `M307` برداشته شد.
5. **تصمیمِ کاربر — دیالیز:** شناسهٔ تازهٔ `dialysis` (کاتالوگ ۱۰⇒۱۱؛ `ACTIVE_CONDITIONS` = cancer، dm2، dialysis؛ قرینه در `khanesh/src/conditions.js`). بیمارِ دیالیزیِ اعلام‌شده برای کراتینین/اوره اورژانس نمی‌گیرد (`kidney_dialysis`، eGFR نقل نمی‌شود؛ `creatinine_emergency` و `urea_bun_emergency` خاموش)؛ K/Hb/Na دست‌نخورده (`M310`).
6. **تصمیمِ کاربر — TSH:** ≥ ۱۰ mIU/L بی‌FT4 ⇒ this_week + ارجاع به متخصص غدد (`M311`). ⚠️ **عددِ ۱۰ را من گذاشتم**، منبعِ بازشده ندارد.
7. **تصمیمِ کاربر — قند:** < ۵۴ mg/dL (۳ mmol/L) بزرگسال ⇒ `emergency` + `has_critical` + «همین امروز به اورژانس». نوزادِ < ۲۸ روز تصمیمِ P63 را نگه می‌دارد (اورژانس فقط < ۴۰) (`M309`). اثرِ جانبی: قندِ بی‌واحدِ ۱۵ از this_week به `soon` رفت (`M123`/`M123d` عمداً عوض شد).
- تست‌های قفلِ رفتارِ قدیمی که عمداً عوض شدند: `S08` (هش)، `M111` (هش `pe_components`)، `M5`، `M246c`، `M280`، `M123`، `M123d`، `M307`. هر کدام کامنتِ دلیل دارد.
- ثبت: `MEDICAL_RULES.md` **P72** (پرسش‌های ۱، ۲، ۴، ۵ بسته)، `CLAUDE.md` (N4/N8/N20 — بازگشتِ تازه).
- فایل‌های تغییرکرده (بدونِ فرانت): `rules/{patterns_nephrology,patterns_endocrine_rheum,patterns_biochem,patterns_hematology,patterns_malignancy,prompt,conditions}.js`، `rules/{engine,serology}.test.js`، `khanesh/src/conditions.js`، `MEDICAL_RULES.md`، `CLAUDE.md`.

**باز مانده (به ترتیب اولویت):**
1. **کامیت.** هیچ‌چیز commit نشده. قبلش `git status` — فایل‌های `_audit_*.json/.mjs` (پاک شدند)، و تغییراتِ commit‌نشدهٔ فرانت (`Landing.jsx`، `onboarding/*`، `site.css`) کارِ جدایِ کاربر است — **با `git add` فایل‌به‌فایل، نه `-A`.** هوکِ pre-commit تستِ ایندکس را اجرا می‌کند.
2. **نمایشِ «دیالیز» در UI:** فقط یک ردیف به `khanesh/src/conditions.js` اضافه شد؛ `Intake.jsx` (ناکامیت‌شدهٔ کاربر) را باز نکردم. باید در مرورگر دیده شود که گزینه در گامِ آخرِ intake می‌آید و شناسه به سرور می‌رود (Playwright این جلسه وصل نشد: `CONNECT_TIMEOUT`).
3. **تأییدِ بازبین (P72):** آستانهٔ TSH ≥ ۱۰؛ آستانهٔ ۱۰× کبد؛ جملهٔ دیالیز؛ فوریتِ `thyroid_tsh_unmeasured` = this_week (FT4 پایینِ تنها از routine به this_week رفت)؛ قندِ < ۵۴ ⇒ اورژانس روی ورودیِ شایعِ ناشتاییِ بی‌علامت (اورژانسِ کاذب، آگاهانه).
4. **TSHِ خیلی پایین (< ۰٫۱) بی‌FT4** هنوز `routine` است (کاربر فقط «بالا» را خواست). متقارن شود؟
5. **شکافِ پوششِ تک‌آزمایشی (N1) — ۱۲ مورد که فقط «توضیح آماده نداریم» می‌گیرند:** هماتوکریت↑ (۶۵٪)، RBC↑ (۷٫۷)، بیلی‌روبین تام↑ (۱۲)، CK↑ (۱۷۰۰)، آلبومین↓ (۱٫۹۵)، فریتین↑ (۳۰۰۰)، TSAT↑ (۷۱٪)، T4 تام (هر دو جهت)، HCO3↓ (۱۵؛ زیرِ آستانهٔ اورژانسِ ۱۱)، PCT↑ (۱٫۰؛ زیرِ ۲)، NH3↑ (۹۰؛ زیرِ ۱۸۰)، Hb↓ تنها (۹٫۶، مسیرِ ورودِ دستی). کلاً ۶۴ ترکیبِ کلید×جهت در `layer1-out.json` ⇒ `gapList` (بیشترش CBCِ کم‌اهمیت: MCV/MCH/RDW/رتیک، GGT، Cl، اورات↓). هرکدام قاعده + آستانهٔ منبع‌دار + `SUGGEST_TESTS` می‌خواهد (checklist در `.claude/rules/rules-engine.md`) و کاربر باید بگوید کدام‌ها. روش: تستِ قرمز ← قاعده (در `patterns_<system>.js`، نه `_new`) ← `code-reviewer` ← ثبت در P72/P73.
6. **عددِ بیمار در متن نقل نمی‌شود:** `liver_pattern`، `coagulation_abnormal`، `hypoglycemia` (برای قند عمداً ننوشتم چون واحدِ بیمار mmol/L می‌تواند باشد؛ جمله هر دو واحد را دارد).
7. **لایه‌های ۲–۵ پیشنهادِ اولِ جلسه هنوز اجرا نشده:** (۲) بازبینیِ موازیِ `eval-medical-reviewer` روی هر `patterns_<system>.js` (۱۹ فایل) با چک‌لیست N1–N28؛ (۳) مسیرِ قدیمیِ `USE_ENGINE=false`/متنِ بی‌تصویر که مدل خودش شدت را قضاوت می‌کند — پیشنهاد: در production خاموش؛ تزریقِ متن در OCR؛ (۴) فرانت: `labRefs.js` در برابرِ `refs.js` (TSH از قبل ناهمخوان بود)، متنِ `LocalPreview.jsx` (تنها متنِ بالینیِ بی‌موتور)، جریانِ کامل در مرورگر؛ (۵) امنیت: **کلیدِ AvalAI در تاریخچهٔ git است و باید در AvalAI چرخانده شود**، `AUTH_REQUIRED` پیش‌فرض خاموش، SMS mock، ارسالِ تصویرِ کاملِ برگه (با نام/کدملی) به سرویسِ ثالث.
8. **جاروب‌های ناپوشش:** ۱۳ کلیدِ `*_ABS`/`PH`/ردیف‌های منی (نامشان به واحد وابسته)، کانالِ `qual`، مقدارِ بی‌واحد، نوزاد، شکلِ واقعیِ متنِ OCR. لایهٔ ۱ فقط `ADULT_REFS` را می‌روبد.

**تله‌های این جلسه:**
- `Edit` روی فایل‌های بک‌اند کار می‌کند ولی heredocِ Bash/`node -e` با بلوکِ چندخطیِ فارسی گاهی «not found» می‌دهد — از ابزارِ Edit استفاده کن.
- پوشهٔ HEAD برای مقایسه: `git archive HEAD khanesh-server | tar -x -C <tmp>` + junction با `cmd //c mklink //J` به `node_modules`. **پیش از `rm -rf` خودِ junction را با `cmd //c rmdir` بردار** وگرنه `node_modules`ِ واقعی پاک می‌شود (پس از هر بار بررسی شد: ۶۲۲ پوشه سالم است).
- هر `action`ای که برای یک یافته می‌نویسی، نامزدِ «دستورِ نهاییِ کلِ گزارش» هم هست (`pickFinalAction` در تساوی اولی را برمی‌دارد): کنارِ هر اورژانسِ دیگری که می‌تواند هم‌برگه باشد بیازماش (K 7، Hb 6، Na 118) — N20، `M303b`.
- یک `ACTIVE_CONDITIONS` تازه تصمیمِ بالینی است؛ `M280` عمداً قرمز می‌شود.
- نخست `git status`/`git diff --stat` بخوان؛ کارِ ناکامیتِ فرانتِ کاربر در درخت هست.

## ۲۰۲۶-۱۰-۰۳ (بعد): ۷ از ۱۹ تستِ todo فعال شد — تأییدِ عاملی، کامیت‌نشده
`npm test` ⇒ `tests 835 · pass 834 · fail 0 · todo 1` (بازاندازه‌گیری‌شده). همهٔ P46 و P47 (#11–14، #16، #18) و P49 (MMA، مسِ پایین) با تأییدِ عاملی فعال شد — جزئیاتِ هر عدد و منبعش در `MEDICAL_RULES.md`. todo ماند: `M154b` (روی/سلنیوم/E/C/PLP). بی‌حکم ماند: 17-OHP و تستوسترونِ زن (P47 #19–۲۰)، ضریبِ AMH pmol/L (#17)، بازهٔ LH/E2 روزِ سوم. حدِ UFC (۴۵) و بزاق (۴ nmol/L) پیش‌فرض‌اند، نه حدِ چاپ‌شدهٔ برگه.
جزئیات و دلیلِ ماندنِ ۱۲ تای دیگر: `MEDICAL_RULES.md` P46 («تأییدِ عاملی ۲۰۲۶-۱۰-۰۳»). P47 (۳) و P49 (۲) بررسی نشدند. این تأیید جایگزینِ بازبینِ انسانی نیست.

## جلسهٔ ۲۰۲۶-۱۰-۰۲/۰۳: specs/011 — ورود (موبایل/ایمیل) + چهار پرسشِ آغازین + انتخابِ عکس/دستی — کامل، کامیت‌نشده

**مستندات:** `specs/011-onboarding-intake-flow/` (spec، plan، research، data-model، contracts، quickstart، tasks). هر ۵۳ تسک `[X]`؛ جدولِ بازبینیِ کد در انتهای `tasks.md`.

**انجام شد:**
- **ورود:** موبایل با پیامک یا ایمیل، کدِ ۶ رقمی (`auth.js`). رقمِ فارسی و `+98` پذیرفته می‌شود؛ کد پس از ۵ اشتباه می‌سوزد؛ ارسالِ دوباره ۶۰ ثانیه فاصله دارد (حتی بعد از سوختنِ کد). `DELETE /api/auth/me` حساب/پروفایل/نتایج را پاک می‌کند. توکن فقط `{userId, kind}` دارد.
- **پایگاه‌داده:** مهاجرتِ `users` (phone یا email، `user_version=1`)، جدولِ `profiles` (+ ستونِ `age_recorded_at` با ALTER). `DB_FILE` برای تست.
- **پرسش‌های آغازین** (`khanesh/src/onboarding/`): نام ← جنسیت ← سن (سال/ماه/روز؛ بارداری برای زنِ ≥ ۱۰ سال) ← ده بیماریِ زمینه‌ای + «هیچ‌کدام». ادامه از اولین گامِ ناتمام؛ سنِ روز/ماهِ قدیمی‌تر از ۷ روز دوباره پرسیده می‌شود.
- **پروفایل** سمتِ سرور فقط با `AUTH_REQUIRED=true` (`profile.js`، `GET/PATCH /api/profile`)؛ با احراز هویتِ خاموش فقط در `localStorage` (سرور ۴۰۹ `local_only` می‌دهد). نام هرگز به تحلیل/مدل نمی‌رود.
- **مسیرها:** `/app` (اولین گامِ ناتمام) · `/app/intake/:step` · `/app/start` · `/app/:mode` (photo/manual — یک مسیر تا داده‌ها با جابه‌جایی پاک نشوند). `ProfileCard.jsx` حذف شد (`git rm`).
- **ورودِ دستی** بخش‌بخش: خون، بیوشیمی، هورمون، ویتامین‌ها، **ادرار (تازه)**؛ ادرار به‌صورتِ رشته با `kind:"urine"` به سرور می‌رود. صفحهٔ عکس راهنمای کوتاهِ چهارخطی دارد.
- **موتور:** `rules/conditions.js` (کاتالوگ + `ACTIVE_CONDITIONS = dm2, cancer`). `cancer` → CTCAE (مثلِ قبل). `dm2` گزارش‌شده → همان بازوی LDL < ۱۰۰ (`ADA_SOC_CVD`) با جملهٔ «دیابت را گزارش کرده‌اید». فقط بیماریِ فعال به پرامپتِ مدل/گراف می‌رسد. `_engine.context` → خطِ «تفسیر بر پایهٔ …» در `ResultView` (فقط آنچه واقعاً به کار رفت).
- **سرور:** جملهٔ اختلافِ جنس/سنِ برگه با پروفایل در `ocr_warnings`؛ اگر گروهِ سنی فرق کند (نوزاد/کودک/بزرگسال/≥۷۵) اول `PATIENT_MISMATCH` (تأیید). برگهٔ فقط-ادرار دیگر به مسیرِ قدیم نمی‌رود (`ownedQual`) و ردیفِ ادرارِ غیرمنفیِ بی‌توضیح نام برده می‌شود (`unreadQualRows`). نتیجهٔ کاربرِ ناشناس در `jobs` ذخیره نمی‌شود.
- **دو باگِ قدیمی رفع شد:** گاردِ ورود `/health` را می‌خواند که پروکسی به سرور نمی‌برد → صفحهٔ ورود هرگز نمی‌آمد (حالا `/api/health`، N27)؛ `TestPage` لینکِ «وارد کردن عدد» به `/?test=` (صفحهٔ فرود) می‌رفت → `/app/manual?test=`.
- **مستندات به‌روز شد:** `CLAUDE.md` (مسیرها، N27، بندِ تازه در N18)، `.claude/rules/{architecture,environment,frontend}.md`، `MEDICAL_RULES.md` (**P66**).

**گیت‌ها (درختِ کاری، ۲۰۲۶-۱۰-۰۲):** بک‌اند `tests 826 · pass 807 · fail 0 · todo 19` (شروع: ۸۰۶ · ۷۸۷ · ۰)؛ `oxlint` بدون خطا؛ `npm run build` سبز. تست‌های تازه: `M280`–`M284`، `T33`–`T45` (فایلِ تازهٔ `khanesh-server/auth-contract.test.js` با احراز هویتِ روشن). هرکدام روی کدِ بی‌اصلاح قرمز دیده شد.

**باز مانده (به ترتیب):**
1. **تصمیمِ بالینی P66:** شاخهٔ «دیابتِ گزارش‌شده» الان فعال است در حالی که P66 «در انتظارِ بازبین» است. اگر رد شد: `dm2` را از `ACTIVE_CONDITIONS` در `khanesh-server/rules/conditions.js` بردار (M280 هم‌زمان عوض شود). برچسب‌های فارسیِ ده بیماری هم تأیید بالینی می‌خواهند.
2. **سیاستِ FR-017:** فعلاً سنِ/جنسِ پروفایل بر برگه برنده است (با تأیید در اختلافِ گروهِ سنی). آیا سنِ چاپ‌شده باید برنده باشد؟ — تصمیمِ کاربر.
3. **فرستندهٔ واقعی:** پیامک و ایمیل هنوز mock (کد در لاگِ سرور). پیش از روشن‌کردنِ `AUTH_REQUIRED` باید با `setOtpSenders({sms, email, live})` در `auth.js` وصل شوند.
4. **اعتبارِ AvalAI تمام است (۴۲۹)** — تفسیرِ کامل در مرورگر دیده نشد؛ فقط موتور (لاگِ سرور) و خطِ «تفسیر بر پایهٔ …» (با نتیجهٔ ساختگی) تأیید شد. بعد از شارژ، quickstart #6–#12 را end-to-end اجرا کن.
5. **N1 باز:** نیتریتِ مثبتِ تنها و پیوریِ تنها در ادرار قاعدهٔ اختصاصی ندارند (فعلاً فقط در `ocr_warnings` نام برده می‌شوند).
6. **کامیت نشده.** همهٔ تغییرات در درختِ کاری؛ `ProfileCard.jsx` حذفش stage شده. `khanesh-server/database.sqlite` واقعی مهاجرت کرده (gitignored).
7. صفحهٔ جدای `/app/signin` ساخته نشد (ورود داخلِ `AuthGuard` روی همان مسیر) — انحرافِ کوچک از `contracts/ui-flow.md`.

**تله‌های این جلسه:**
- heredocِ Bash با متنِ فارسی گاهی parse نمی‌شود — اسکریپت را با Write بنویس و `python file.py` اجرا کن.
- فایل‌های بک‌اند CRLF‌اند؛ جایگزینیِ رشته‌ایِ Python باید `\r\n` را نرمال کند (`fix_head.py` در scratchpad الگوست).
- سرورِ پس‌زمینه با kill یا سقفِ زمان می‌میرد؛ پروکسیِ Vite آن‌وقت ۵۰۲ می‌دهد. `timeout: 7200000` یا اجرا در ترمینالِ خودت.
- اسکرین‌شاتِ Playwright در ریشهٔ مخزن ذخیره می‌شود — بعد از کار پاکشان کن (`/*.png` ignore است ولی بماند تمیز).

---

## جلسهٔ ۲۰۲۶-۱۰-۰۱: بازنویسیِ متنِ سایت + هیروی تازه + چهار کارتِ «از برگه تا شرح» — فقط فرانت‌اند، کامیت‌نشده

**انجام شد (همه در `khanesh/`، `npm run lint` و `npm run build` سبز؛ تست‌های بک‌اند اجرا نشد چون بک‌اند دست نخورد):**
- **ویرایشِ لحن:** حدود ۱۲۰ جمله با نشانه‌های متنِ مصنوعی («هوشمند»، «جامع»، «اطمینان خاطر»، «اصل طلایی»…) یا ادعای اغراق‌آمیز بازنویسی شد. فایل‌ها: `HowToCapture.jsx`، `ReferenceRanges.jsx`، `UnitsGuide.jsx`، `UploadCard.jsx`، `LocalPreview.jsx`، `Tafsir.jsx`، `Logo.jsx`، `LabMateLogo.jsx`، `testContent.js`، `content/extra.panels.js`، `content/extra.std.js`. دکمهٔ «تفسیر هوشمند» → «تفسیر آزمایش» (بدون ایموجی).
- **اصلاحِ محتوایی (نه فقط لحن):** «قانوناً باید کلسیم تصحیح شود» حذف؛ «الگوی قطعیِ فقر آهن» → «به‌شدت می‌خورد؛ تشخیصِ نهایی با پزشک»؛ KDIGO «الزامی می‌شمارد» → «توصیه می‌کند»؛ «از ۱۲۶ ریسک به‌شدت بالا می‌رود» نرم شد؛ تب در نوتروپنیِ شدید: «اورژانس، فوراً ارزیابی، اغلب بستری و آنتی‌بیوتیک». `UnitsGuide` با خودش تناقض داشت (استثنای بی‌واحد: سه گروه یا فقط HbA1c) — هماهنگ شد.
- **متنِ Landing** دو بار بازنویسی شد (ساده برای عموم، بعد رسمی/کتابی برای عموم و کادر درمان). ادعاها همان‌هایی‌اند که CLAUDE.md پشتیبانی می‌کند: قواعدِ ثابت داورِ طبیعی/غیرطبیعی‌اند، هوش مصنوعی فقط بازنویسی می‌کند، هیئتِ بازبینیِ پزشکی نداریم.
- **هیرو** (`Landing.jsx`، کلاس‌های `.lh-*` در انتهای `site.css`): عکسِ تمام‌عرض (`public/lab/labmate_hero_mockup.webp`، ۴۹KB، از jpg ساخته شد) + نوارِ کپسولیِ شناور (فقط در Landing؛ `Nav` صادرشده برای بقیهٔ صفحه‌ها دست نخورده) + سه آکاردئونِ شیشه‌ای + چهار پلهٔ کلیکیِ سمتِ راست. چیدمانِ فیزیکی عمداً چپ‌به‌راست (`dir="ltr"` روی `.lh`) تا با طرحِ مرجع یکی باشد؛ متنِ داخلِ ستون‌ها rtl است. ویجتِ چتِ زنده و «۱۵۰+ بیومارکر»/Reviews/Log in عمداً **نیامد** (در محصول وجود ندارند).
- **«از برگهٔ آزمایش تا شرحی روشن»** (`HowItWorks`، کلاس‌های `.hw-*`): چهار کارتِ تصویری با برچسبِ شماره و کارتِ شیشه‌ایِ شناور. کارت‌های شناور **نمونهٔ توضیحی با عددِ ساختگی** هستند و زیرِ شبکه همین نوشته شده. باند و بلوک‌های قدیمیِ آن بخش حذف شد.
- `CREDITS.md`: ردیفِ `labmate_hero_mockup.webp` (تولیدِ هوش مصنوعی، رابطِ روی تبلت ساختگی) اضافه شد.

**باز مانده (به ترتیب):**
1. **چهار عکسِ کارت‌ها عوض شود.** الان: `res-1.webp`، `lab_modern_tech.webp`، برشِ تبلت از `labmate_hero_mockup.webp` (با `pos:"38% center"`)، `couple.webp`. دلیلِ تعویض: عکس‌ها تزئینی/عمومی‌اند و با «گام» نمی‌خوانند. پرامپت‌ها در پیامِ همین جلسه نوشته شد؛ اجرای تصویر با Higgsfield ممکن نبود (`ECONNREFUSED`). فایلِ جدید را `public/lab/NAME.webp` بگذار، مسیر را در آرایهٔ `steps` در `HowItWorks` عوض کن، و ردیفش را در `CREDITS.md` ثبت کن (درسِ N14).
2. **روی تبلتِ عکسِ هیرو هنوز «LabMate» و عددهای انگلیسیِ ساختگی است**؛ برندِ فعلی «آزمایار» است. عکس را با برندِ درست بسازید یا صفحه را مثلِ ویدیوی قبلی جایگزین کنید.
3. **کامیت‌نشده:** `public/lab/labmate_hero_mockup.jpg` و `.webp` هر دو untracked‌اند؛ بدونِ کامیتِ `.webp` روی کلونِ تازه ۴۰۴ می‌شود. jpg دیگر مصرف نمی‌شود. فایل‌های `hero-tablet.{mp4,webm}` و `hero-tablet-poster.webp` هم دیگر از Landing خوانده نمی‌شوند (به `CREDITS.md` ارجاع دارند؛ تصمیمِ حذف با شما).
4. پله‌های هیرو فقط با کلیک عوض می‌شوند (اسکرول‌محور نیست، تصویرِ وسط ثابت است). موبایلِ واقعیِ <۵۰۰px دیده نشد (headless کمینهٔ ۵۰۰ می‌دهد؛ ۸۰۰px و ۱۴۴۰px دیده شد).
5. دو یافتهٔ هوکِ impeccable (`bounce-easing` در `site.css:413` و `index.css:158`) از قبل بوده و تأیید نشده؛ نه عوض شد نه ignore.
6. متنِ دانشنامه‌ای که هنوز خوانده نشد: `guideContent.js` (۱۰۰KB)، `extra.hormone.js`، `extra.allergy.js` و بقیهٔ `extra.*`. روش: grep روی کلیشه‌ها، نه خواندنِ خط‌به‌خط.
7. متنِ بالینیِ بک‌اند (`must_say`/`headline` در `rules/patterns_*.js`) عمداً دست نخورد (هر تغییرش از `npm test` و `MEDICAL_RULES.md` می‌گذرد).

**تله‌های این جلسه:**
- سرورهای پس‌زمینه با سقفِ ۳۰ دقیقه می‌میرند و پروکسیِ Vite آن‌وقت **۵۰۲** می‌دهد. `timeout: 7200000` بده، یا در ترمینالِ خودت `npm run dev` (در `khanesh/`) و `node server.js` (در `khanesh-server/`) را اجرا کن.
- `python - <<'EOF'` با متنِ فارسی و `'` داخلِ رشته در Bash شکست خورد؛ اسکریپت را با ابزارِ Write بنویس و اجرا کن. رشتهٔ فارسیِ بازنویسی‌شده گاهی با فایل نمی‌خورد (ZWNJ)؛ Edit قابل‌اعتمادتر است.
- Playwright MCP وصل نشد؛ اسکرین‌شات با `chrome.exe --headless=new --screenshot` گرفته شد.

---

## جلسهٔ ۲۰۲۶-۰۹-۳۰ (دوم): سامانهٔ سه‌عاملی روی همهٔ بندهای بازِ `MEDICAL_RULES.md` — نیمه‌کاره، هیچ تغییری در کد/`MEDICAL_RULES.md` اعمال نشده

**انجام شد:**
- کلِ `MEDICAL_RULES.md` خوانده و فهرستِ بندهای باز استخراج شد (در گفت‌وگو؛ بندهای تصمیم‌شده حذف شدند).
- ۴ پژوهشگر (general-purpose، پس‌زمینه) هر کدام مأمورِ سه منبعِ مستقل برای یک دسته:
  - A فوریت/آستانه‌های اورژانسی (P37، P42، P45، P50، P38، P26، P61-c/d)
  - B خون‌شناسی/هموستاز (P8، P10، P52، P53، P54، P55، P56، P58، P59، P61)
  - C بیوشیمی/غدد (P1، P3، P14، P15، P17، P20، P21، P22/23/31، P25، P28، P33، P46، P47)
  - D واحد/ادرار/نوزاد/ویتامین (P48، P49، P51، P57، P61-f)
- **فقط A تمام شد:** `scratchpad/research_A.md` (۲۸ KB؛ خروجیِ هفت بند + جدولِ خلاصه). B و C و D با خطای `rate_limit` (HTTP 429، «session limit») مردند/متوقف شدند و **`research_B/C/D.md` نوشته نشد.** فایل‌های میانی‌شان (pdf/txt) در `scratchpad/` و `scratchpad/w/` مانده (ALP، BSH، Endocrine، prolactin، eos، cmml، dic_ped …) ولی جمع‌بندی نشده‌اند.
- مسیر scratchpad: `C:\Users\surface\AppData\Local\Temp\claude\c--Users-surface-Desktop-khanesh-project\eea623be-fbc4-4aa2-a5d2-5270e67a10bc\scratchpad\` (موقتی است؛ اگر لازم است نتیجه بماند به `specs/` کپی کن).
- یافته‌های A که مهم‌اند (ادعای پژوهشگر، هنوز راستی‌آزمایی نشده):
  - P37: ۳۰ ng/L حدِ ۹۹ام عمومی نیست (Roche hs-cTnT ≈۱۴، Abbott hs-cTnI ≈۲۶)؛ تک‌مقدارِ سرپایی حاد/مزمن را جدا نمی‌کند؛ پیشنهاد: اورژانس فقط ≈≥۵×URL یا علامت، وگرنه `soon`.
  - P42: «۷۸٪ BHB» منبع ندارد؛ منبع: BHB کتونِ غالب (نسبت ≈۳:۱ در DKA ⇒ ≈۷۵٪)؛ نوار ادرار BHB را نمی‌بیند (۳/۳).
  - P61-d: ۰.۶ BU (نه ۰.۵)؛ نسبتِ vWF ۰.۶ در برابر ۰.۷ — تعارض.
  - منابعِ مسدود (۴۰۳): StatPearls، NCBI، PubMed، NICE، ACC، AHA، WFH PDF — در A استناد نشدند.

**باقی‌مانده (به ترتیب):**
1. تمام‌کردنِ پژوهشِ B، C، D (بعد از ریست‌شدنِ سقف؛ هر دسته را جدا و کوچک‌تر اجرا کن — چهار عاملِ موازی سقف را سوزاند). با `SendMessage` می‌شود عاملِ متوقف را ادامه داد، یا دوباره ساخت. خروجی: `research_B/C/D.md` با سه منبعِ واقعاً بازشده برای هر بند.
2. **راستی‌آزمای مستقل** (عامل ۲): منبع‌ها را دوباره باز کند و نقل‌قول‌ها را با صفحه تطبیق دهد. WebFetch فقط خلاصه برمی‌گرداند؛ PDF را با `pdftotext` محلی بخوان تا نقل‌قول واقعی باشد.
3. **مدیرِ ناظر** (عامل ۳): فقط بندهایی تأیید شوند که سه منبعِ بازشده همخوان‌اند و راستی‌آزما هم تأیید کرده؛ بقیه به «نیازمندِ بازبینِ انسانی» می‌روند (تعارض، منبعِ بازنشده، جمعیتِ نامرتبط: کودک/بستری/تبار اروپایی).
4. **اعمال** فقط روی تأییدشده‌ها، با تستِ قرمز-اول (stash)، ثبت در `MEDICAL_RULES.md` و `guidelines.js` + `RULE_SOURCES` (+ `G6`)؛ بعد `npm test` و بازاندازه‌گیریِ baseline. کامیت فقط با درخواستِ کاربر.
5. قاعدهٔ پروژه: «هیچ عددی بدون تأییدِ بازبینِ انسانی به کد نمی‌رسد» — تأییدِ سامانهٔ عاملی جایگزینِ بازبینِ انسانی نیست مگر کاربر صریحاً همان را بخواهد؛ در خروجی بگو کدام بندها با تأییدِ عاملی اعمال شدند.

⚠️ یادداشتِ پیام‌های خودکار: «تأییدی» که در اعلان‌های سیستم آمده تأییدِ کاربر نیست.

---

شاخه: `recovery`. درخت: `cd khanesh-server && npm test` ⇒ `tests 784 · pass 765 · fail 0 · todo 19` (اندازه‌گیری‌شده روی درخت کار، پس از کامیتِ `bf9a02c`). عدد را نقل نکن؛ بازاندازه بگیر (N15b).

## انجام شد (specs/010 — هموستاز/انعقاد، P61)

کامیت‌ها، به ترتیب:
- `610f215` — پیاده‌سازیِ اصلی: کانالِ بی‌نمرهٔ `hemostasis` (FVIII، FIX، vWF:Ag، vWF:RCo، Bethesda، PT Control)، `patterns_hemostasis.js` (`factor_activity`، `factor_inhibitor`، `vwf_panel`)، `dic_isth_score`، پلاکت ≥۱۰۰۰ ⇒ `this_week`، گیتِ fallback در `server.js`، جملهٔ `OCR_PROMPT`. شناسه‌ها ۱۵۷ ⇒ ۱۶۱.
- `f7e107c` — بازبینیِ کد (`code-reviewer`)، ۵ نقص رفع شد:
  - مقیاسِ IU/mL: حکم با عددِ چاپ‌شده در برابرِ محدودهٔ چاپ‌شده (`item.position` در `hemostasisItem`)، نه مقدارِ تبدیل‌شده به ٪ (جهتِ وارونه، N12). `M259`.
  - D-dimer بین ۴۰۰ و ۵۰۰ «بالا» خوانده می‌شد. `M260`.
  - دو مالک برای D-dimer (`dic_isth_score` و `d_dimer_elevated`)؛ حالا یکی. `M261`.
  - کفِ نوزادی: vWF در محدوده / Bethesda منفی در نوزاد بنرِ «همین امروز» می‌ساخت؛ حالا نوزاد فقط برای یافتهٔ غیرطبیعی action می‌گیرد (`neonateQuiet`). `M262`.
  - ردیفِ تکراریِ هموستاز به «تفسیر نشدند»؛ ردیف‌های `SUGGEST_TESTS` (aPTT، فیبرینوژن، vWF)؛ PT Control تنها مسیرِ موتور نمی‌گیرد. `M263`.
  - منبعِ `ISTH` به `dic_isth_score` وصل شد (جدول را از PMC7769303 باز و تطبیق دادم؛ Taylor 2001 خودش بسته بود).
- `d076b95` — تأییدِ کاربر روی متن‌های فارسی (`factor_activity`، `factor_inhibitor`، `vwf_panel`، `dic_isth_score`، `thrombocytosis` ≥۱۰۰۰) و جملهٔ `OCR_PROMPT` (server.js:341).
- `bf9a02c` — سامانهٔ سه‌عاملی (پژوهشگر با منابعِ باز ⇒ راستی‌آزمای مستقل ⇒ مدیرِ ناظر) روی پرسش‌های باز؛ اعمال‌شده:
  - **ISTH D-dimer:** «متوسط» = بالای ULNِ موتور (۵۰۰ ng/mL؛ پیش‌تر ۴۰۰ بی‌منبع)، «شدید» = بیش از ۷×ULN = ۳۵۰۰ (ماشین‌حسابِ Ulm؛ منبعِ دوم نیست). `isDIC` (≥۵۰۰۰) دست نخورد.
  - **مرزِ ۱۶ سال برای فاکتورها برداشته شد** (WFH: ردهٔ <۱ / ۱–۵٪ برای کودک هم؛ FVIII و vWF از تولد نزدیکِ بزرگسال). FIX زیر ۶ ماه جملهٔ تأییدِ سنی می‌گیرد. نوزادِ <۲۸ روز رده می‌گیرد ولی بی‌action. ⚠️ این تصمیمِ قبلیِ کاربر (FR-020 / D10) را برمی‌گرداند.
  - مستندسازی: `MEDICAL_RULES.md` بندهای 61-g و 61-h، ورودیِ Lab Notebook در `CLAUDE.md` (زیرِ N12).

## باقی‌مانده

### الف) نیازمندِ تصمیمِ بازبینِ بالینی (کد ننوشته‌ام)
1. **`FACTOR_MILD_MAX_PCT = 30`** در برابرِ «خفیف ۵–۴۰٪» WFH: مقادیرِ ۳۰–۴۰٪ الان «reduced/inRange» می‌گیرند. آیا ۴۰ شود؟
2. **FVIII <۱٪ در نوزاد** بی‌action و بی‌بنر است؛ تصمیمِ سیاستِ بالینی که نوزادِ شدید هم اورژانس شود یا نه.
3. **مرزِ Bethesda (61-d / 61-g3):** WFH: مثبت FVIII >۰٫۶ (فصل ۳: ≥۰٫۶)، FIX ۰٫۳ (نمادِ PDF ناخوانا)، low<5 / high≥5؛ ۰٫۵ BU بی‌منبع است. قالب‌های «Positive (2.4 BU)» و «0.0 BU» بی‌مرجع هنوز «جواب روشن نیست» می‌گیرند. نام‌های عمومیِ «Factor Inhibitor / Inhibitor Assay» به `FVIII_INHIB` نگاشت می‌شوند در حالی که «Inhibitor» تنها عمداً نه.
4. **61-a:** ADAMTS13 <۱۰٪ تأیید شد (PMC7867179) ولی بازهٔ طبیعیِ بزرگسال منبعِ باز ندارد و TT (۱۲–۱۹ ثانیه) تأییدنشده؛ فعلاً unmapped. اگر کلیدی اضافه شود فقط «<۱۰٪» را ردبندی کند.
5. **61-b:** ISTH ≥۵ بدونِ `isDIC` ⇒ `soon` یا اورژانس؟ هیچ منبعی زمان‌بندی نمی‌دهد؛ `soon` بی‌تغییر.
6. **61-c:** تأییدِ اینکه هیچ ردهٔ فاکتور اورژانس نیست.
7. **61-e:** دو مشکلِ پیش‌ازاین در `isolated_thrombocytopenia` (فوریتِ `"today"` بیرونِ جدولِ رتبه؛ «سایر رده‌ها طبیعی» روی برگهٔ دارای D-dimer/PT بالا).
8. **61-f:** نوزادِ ۳ روزه با Hb 17 ⇒ `erythrocytosis_who_screen` اورژانسِ کاذب (آستانهٔ بزرگسال روی نوزاد، N3). اصلاح نشده؛ پنلِ `neo_hb17` در `specs/010-…/probe.mjs`.
9. **ISTH D-dimer:** فرضِ FEU؛ آزمایشگاهِ DDU حدودِ نصفِ عدد می‌دهد و کم‌امتیاز می‌گیرد. اگر بخواهید واحدِ FEU/DDU در ورودی مشخص شود، تصمیمِ جدا لازم است.

### ب) کارِ فنی
- `code-reviewer` روی `bf9a02c` اجرا شد (۲۰۲۶-۰۹-۳۰؛ بازتولیدشده با `runEngine`+`runPatterns`؛ هنوز رفع نشده، چون هر دو تصمیمِ سیاستِ بالینی‌اند):
  ✅ **موارد ۱ و ۲ با تأییدِ کاربر رفع شد (۲۰۲۶-۰۹-۳۰، کامیت‌نشده):** ردهٔ شدید/متوسطِ نوزاد ارجاعِ «این هفته» می‌گیرد و `no_neonatal_floor` (در `neonatal.js`) آن را اورژانس نمی‌کند؛ مهارکنندهٔ مثبت همچنان از کف می‌گذرد؛ جملهٔ سنیِ FIX تا ۱ سال و پیش از «هماتولوژیست». کامنت‌های کهنهٔ ۴۰۰ هم اصلاح شد. `M264` جدید، `M251b` عمداً عوض شد؛ هر دو روی مبدأِ قدیم قرمز (stash). درخت: `785 · 766 · 0 · todo 19`. موارد ۳ و ۴ (گیتِ سنیِ `dic_isth_score`) باز است.
  1. نوزادِ <۲۸ روز با `Factor VIII 0.5 %` ⇒ `this_week` با `action: ""` و بدونِ ارجاع/زمان‌بندی در `buildEngineRecommendations()`؛ فقط یک جمله در `must_say`. (`neonateQuiet`، patterns_hemostasis.js:22,121). `Factor IX 3 %` همین‌طور. گزینه‌ها: action برای نوزادِ ردهٔ هفته‌ای که به کفِ اورژانسِ نوزادی نخورد، یا جملهٔ ارجاع در `must_say`. با پرسشِ باز ۲ (الف) یکی است.
  2. `Factor IX 25 %` در نوزاد ⇒ «ردهٔ خفیف» + «هماتولوژیست باید بررسی کند» پیش از جملهٔ تأییدِ سنی؛ جملهٔ سنی فقط برای <۰٫۵ سال (FIX 4 % در ۰٫۶ سال بی‌جمله). (patterns_utils.js:1196-1211).
  ⚠️ **بند ۳ (گیتِ سنی) عمداً پیاده نشد — تصحیحِ ادعای قبلیِ بازبین/خودم (۲۰۲۶-۰۹-۳۰):** «ناسازگاری با `d_dimer_elevated`» واقعی نیست. آن قاعده برشِ سنی (۱۰×سن) را فقط *جمله* می‌کند و فوریت را عمداً دست‌نخورده می‌گذارد (کامنتِ patterns_hematology.js خطوط ۳۹۳–۳۹۶: برشِ سنی مخصوصِ رد کردنِ PE است)، و وقتی `dic_isth_score` فعال است `d_dimer_elevated` اصلاً نمی‌آید — پس بیمار دو حرفِ متناقض نمی‌بیند. گیت‌کردنِ ISTH با برشِ سنی فوریتِ سالمند را از `soon` به `this_week` می‌برد، یعنی همان چیزی که آن کامنت ردش کرده. تصمیمِ باقی‌مانده بالینی است: آیا امتیازِ ISTH (PLT 50–100 + D-dimer > ULN) برای سنِ ≥50 و D-dimer زیرِ ۱۰×سن یا برای <۱۶ سال باید فعال شود؟ → پرسشِ بازبین 61-b؛ کدی عوض نشد. جلسهٔ پژوهشیِ دیگر (بالا) فایلِ میانیِ `dic_ped` دارد؛ پیش از هر تغییرِ سنیِ ISTH نتیجه‌اش را ببین.
  3. (قدیمی) کامنتِ کهنه دربارهٔ برشِ ۴۰۰ در `patterns_hematology.js` (حدود خط ۳۴۴)؛ `dic_isth_score` برای D-dimer ۵۱۰ + PLT 95 (سن ۶۰) و برای سن ۷۸/۸ بدونِ گیتِ سنی `soon` می‌دهد و با `d_dimer_elevated` (برشِ سنی) ناسازگار است (پیش‌ازاین هم بود).
  4. `M251b` سه حالت را نمی‌پوشاند: FIX سالمِ نوزاد، توصیه‌های کلِ نوزاد، FIX بین ۰٫۵ و ۱ سال.
- منبعِ اختصاصی برای `factor_activity` / `factor_inhibitor` / `vwf_panel`: اول WFH (https://www1.wfh.org/publications/files/pdf-1863.pdf، جدول ۲-۱) را خودت باز کن، بعد به `guidelines.js` + `RULE_SOURCES` بیفزا (+ تستِ `G6`). تا آن زمان `sources` فقط MedlinePlus است.
- فرمِ ورودِ دستیِ فرانت (`khanesh/src/labRefs.js`) به هیچ‌یک از این تست‌ها دست نخورد.
- گرافِ codebase-memory را پس از کارِ ساختاری دوباره ایندکس کن.
- چند پرسشِ بازِ قدیمی‌تر در `MEDICAL_RULES.md`: P57/P58 (بازه‌های نوزاد، آستانهٔ WBC>۲۰٬۰۰۰، PDW/PCT)، P59 (۶ پرسشِ بازبین؛ منبعِ `RULE_SOURCES` برای `isolated_urea_elevation`، `coagulation_abnormal`، `hyperkalemia`).

### ج) فقط خودِ شما می‌توانید
- ⚠️ **`AVALAI_API_KEY` هنوز در تاریخچهٔ git است** (`763c73d`) و باید در AvalAI **چرخانده** شود.
- ⚠️ `data/cline-tokens.json` توکن دارد؛ اگر جایی افشا شده بچرخانید.
- کامیت‌نشده عمداً: `database.sqlite` (تلفنِ بیماران)، `labmate-bot/` (node_modules + `.env`)، اشاره‌گرِ ساب‌ماژول `.impeccable`، `abs.sh`.

## بازتولید
- `node specs/010-hemostasis-coagulation-rules/probe.mjs [panel…]`؛ `PROBE_ROOT=<dir>` برای درخت دیگر.
- قرمز-اولِ `M259`–`M263` با stashِ فایل‌های مبدأ (نه تست) اثبات شد؛ `M251b`/`M260` پس از تغییرِ مرزِ سن/D-dimer بازنویسی شدند (عمداً).

## تله‌ها (تکرار نشود)
- **`node --check` برای ESM کافی نیست.** درختی را که کامیت می‌کنی خودت با `npm test` اجرا کن.
- **فایلِ تستِ بزرگ را با اسکریپتِ `indexOf`/`slice` ویرایش نکن** (`indexOf = -1` فایل را چندبرابر می‌کند)؛ از Edit استفاده کن.
- **فایل‌های `rules/` CRLF دارند؛ `node -e` با `replace` روی رشتهٔ چندخطی ممکن است نخورد** — از ابزار Edit استفاده کن. از `$&` در replacement-string پرهیز کن (تابع بده).
- **فارسی را با `Get-Content`/`Add-Content`/`Set-Content` PowerShell 5.1 جابه‌جا نکن** (mojibake، N15d)؛ از Write/Edit یا Bash `cat >>` با heredoc در گیومهٔ تکی استفاده کن.
- **یک بار `npm test` روی این درخت `pass 734 · fail 26` داد و خروجی ذخیره نشد**؛ اجراهای بعدی همه ۰ شکست. اگر دوباره دیدی، **نامِ تست‌های قرمز** را ذخیره کن.
- عددِ پایه را بازاندازه‌گیری کن، از فایل نقل نکن (N15b).
- خروجیِ زیرعامل‌ها ادعاست، نه حقیقت: هر یافته را پیش از رفع بازتولید کن (این جلسه، هر ۵ یافتهٔ بازبین بازتولید شد).

## ۲۰۲۶-۱۰-۰۱ — بررسی: «تفسیر بی‌توضیح + اخطار فوری» (فقط بررسی؛ هیچ کدی تغییر نکرد)
- **منبع:** آخرین job در `khanesh-server/database.sqlite` (`5fdd233a-bf41-4dc4-a03c-327a1d42e832`)، برگهٔ نوزاد: MCH 38 (بازه 31–37)، `T. Bilirubin(Clot)` = 9.58 mg/dl.
- **علتِ ۱ — «توضیح نداریم»:** `T. Bilirubin` در `NAME_MAP` نیست (فقط `bilirubintotal`/`totalbilirubin`/`tbil`)؛ `norm()` کلید را `tbilirubinclot` می‌کند ⇒ unmapped. با `runEngine` راستی‌آزمایی شد: «T. Bilirubin» و «T. Bilirubin(Clot)» unmapped؛ «Total Bilirubin»/«Bilirubin Total» ⇒ `BILI_T`. تنها غیرطبیعیِ دیده‌شده MCH 38 بود (بی‌قاعده) ⇒ `unmatched_abnormal` (patterns.js:388) با متنِ ثابتِ «برای این ترکیب توضیح آماده‌ای نداریم».
- **علتِ ۲ — اخطار فوری:** `applyNeonatalFloor` (`rules/neonatal.js`) هر یافتهٔ دستوردارِ نوزاد <۲۸ روز را `emergency` می‌کند؛ `unmatched_abnormal` فقط وقتی معاف است که همهٔ غیرطبیعی‌ها RDW باشند. MCH معاف نیست ⇒ emergency، بنرِ «همین امروز»، `has_critical: true`. دستور به‌خاطرِ MCH صادر شد، نه بیلی‌روبین (N20-مانند: دستور و دلیل جدا).
- **هنوز انجام‌نشده (منتظر تأیید):**
  1. `tbilirubin`/`tbilirubinclot`/`bilirubinclot` به `NAME_MAP` + تستِ قرمز-اول در `engine.test.js` (N2).
  2. MCH تنها: به `NEONATAL_NO_FLOOR_KEYS` یا قاعدهٔ اختصاصی — تصمیمِ بالینی، ثبت در `MEDICAL_RULES.md`.
  3. متنِ `unmatched_abnormal` در حالتِ کفِ نوزادی باید دلیل را بگوید، نه «توضیح نداریم» کنارِ «همین امروز».
- بیلی‌روبینِ نوزاد شدتش به سن (ساعت) و نمودار بستگی دارد؛ موتور بدونِ grade نمی‌تواند شدت بدهد.

## ۲۰۲۶-۱۰-۰۴ — پلنِ پنلِ خودایمنی/روماتولوژی + تومورمارکرها (فقط پلن؛ هیچ کدی تغییر نکرد)
- **وضعیتِ سنجیده‌شده (`engine-inventory.mjs --search`، نامِ لاتین):** در موتور **نیست**: dsDNA، ANCA، PR3، C4، HLA-B27، کالپروتکتینِ مدفوع، CA 125، CA 19-9، CA 15-3، Beta-2 microglobulin، Chromogranin A، Calcitonin (فقط procalcitonin = `PCT_SEPSIS`)؛ Anti-Ro/La هم ردِ واقعی ندارند. CCP، C3، CEA، AFP، FOBT فقط در متنِ قاعده‌ها آمده‌اند، نه نگاشت/محدوده/قاعدهٔ اختصاصی. PSA/Free PSA = `P70`، منتقل به specs/013، منتظرِ بازبین، بی‌کد. **ادعای «اضافه شده» با درختِ فعلی نمی‌خواند.** `ANA`/`MPO`/`Ro`/`C3` در جست‌وجو substringِ بی‌ربط‌اند.
- **ورود به دو کانال:**
  1. کیفی/تیتر (بی‌آستانهٔ ثابت): ANA، anti-dsDNA، ANCA/MPO/PR3، Anti-Ro/La، HLA-B27، FOBT/FIT ⇒ `serology.js` + `patterns_autoimmune.js` (مجموعهٔ بستهٔ واژه‌ها، N6).
  2. عددیِ بی‌نمره (فقط محدودهٔ چاپ‌شده، الگوی `hemostasis`): تومورمارکرها، B2M، کلسی‌تونین، کروموگرانین، کالپروتکتین، anti-CCP، C3/C4 (واحد g/L و mg/dL) ⇒ `patterns_tumor_markers.js`. بی‌واحد ⇒ نمره نمی‌گیرد (N3/P48).
- **فایل‌ها (N1):** `adapter.js` (`NAME_MAP` با املای واقعیِ برگه‌های ایرانی از `research`؛ مرزِ `CA`=کلسیم≠CA 125، C3/C4، Ro/La، PSA/Free PSA)، `QUALITATIVE`/`UNIT_GATED`، `refs.js` فقط با منبعِ تأییدشده وگرنه `noRef`، `names.js` `FA_NAMES`، import در `patterns.js`، `SUGGEST_TESTS` (N8).
- **متن:** هر قاعده سه‌حالته (مثبت/منفی/اندازه‌گیری‌نشده، N4). ANA مثبتِ بی‌dsDNA/ENA بی‌نامِ بیماری. تومورمارکرِ بالا: «تشخیص نیست»، حداکثر `this_week`، بی‌مسیرِ اورژانس. owner صریح و بی‌idِ دوبل (N20/N29).
- **قفل‌ها:** تست برای هر املای واقعی (هر دو سمت)؛ sweep روی کلیدهای جدید: بی‌`unmatched_abnormal` و بی‌ردیفِ بی‌خواننده (N28)؛ قرمز-اول روی کدِ قدیم (N10)؛ `M36/M37/M38` سبز؛ فارسی فقط با Write/Edit یا Bash (N15d).
- **ثبت:** آستانه‌های بی‌منبع در `MEDICAL_RULES.md` از `P75` (کنارِ P70).
- **ترتیب:** ۱) خودایمنی کیفی ← ۲) C3/C4 + anti-CCP ← ۳) تومورمارکرها ← ۴) calprotectin + FOBT؛ بعد از هر مرحله `npm test` و عددِ واقعی؛ قبل از شروع baseline و diffِ مجموعهٔ id قاعده‌ها (N16).
- **فرض‌ها (تأییدنشده):** محدوده از خودِ برگه می‌آید؛ PSA در specs/013 می‌ماند؛ commit نمی‌شود.
