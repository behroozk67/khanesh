# Tasks: ویتامین‌ها و عناصرِ کمیاب (فصلِ هنری)

**Input**: `specs/004-vitamins-trace-elements/` — plan.md، spec.md، research.md، data-model.md،
contracts/engine-output.md، quickstart.md

**Tests**: **الزامی.** اصلِ IV constitution: هر آزمون پیش از کد اجرا و قرمز دیده می‌شود. شماره‌ها از
`M141` (engine) و `T21` (contract) شروع می‌شوند. آخرین شماره‌های موجود `M140` و `T20` هستند (اندازه‌گیری
۲۰۲۶-۰۹-۱۹).

**Format**: `- [ ] [ID] [P?] [Story] توضیح با مسیرِ فایل`. `[P]` یعنی فایلِ جدا و بی‌وابستگی به کارِ ناتمام.

**قیدهای همیشگی** (هر تسک):
- متنِ فارسی فقط با Edit/Write یا Bash/Node جابه‌جا می‌شود، هرگز با cmdletهای PowerShell.
- هر متنِ تازهٔ بیمار **عیناً** به کاربر نشان داده می‌شود.
- هیچ عددِ بالینیِ تازه‌ای بدونِ بندِ `P49` وارد کد نمی‌شود.
- `SKIP_HOOKS` ممنوع است.
- فایل‌های جلسهٔ دیگر هرگز stage نمی‌شوند: `.gitignore`، `khanesh-server/package*.json`، `khanesh/package-lock.json`.

---

## Phase 1: Setup (اندازه‌گیریِ پایه)

- [X] T001 خطِ پایه را اندازه بگیر: `npm test` در `khanesh-server/`. خروجی را با نامِ درخت (`2d32dd3` + درختِ کاری) در `specs/004-vitamins-trace-elements/baseline.md` ثبت کن.
- [X] T002 [P] فهرستِ شناسهٔ قواعد و `RULES.length` را با `node -e "import('./rules/patterns.js').then(m=>console.log(m.RULES.map(r=>r.id).sort().join('\n')))"` در `specs/004-vitamins-trace-elements/ids-before.txt` ذخیره کن.
- [X] T003 [P] دوازده پنلِ ثابتِ بی‌آنالیتِ این فصل را انتخاب کن و خروجیِ کاملِ `runPatterns` هر کدام را در `specs/004-vitamins-trace-elements/frozen-before.json` ذخیره کن (SC-005). نمونه: CBC طبیعی، کم‌خونیِ فقرِ آهن، کبد، کلیه، لیپید، تیروئید، الکترولیت، ادرار، B12 پایین، ویتامین D پایین، ماکروسیتیکِ بی‌فولات، و پتاسیمِ ۷.

---

## Phase 2: Foundational (پیش‌نیازِ همهٔ داستان‌ها)

**⚠️ هیچ کدی پیش از پایانِ این فاز.**

- [X] T004 سه نکتهٔ «باید اندازه‌گیری شود» در research.md را با یک اسکریپتِ probe در scratchpad اندازه بگیر و نتیجه را زیرِ R4 و R8 در `specs/004-vitamins-trace-elements/research.md` بنویس:
  - (الف) آیا `units.js`/`decideUnit` برای کلیدی بی‌`UNIT_PROFILE` (مثلاً `Zinc 80` بی‌واحد، پس از نگاشتِ آزمایشی در کپی) `unit_unknown` می‌سازد؟
  - (ب) آیا `resolveAlias("rbcfolate")` چیزی برمی‌گرداند؟
  - (ج) `Folate 300 ng/mL` و `Folate 300` بی‌واحد چه نتیجه‌ای دارند (graded، ungraded، یا impossible)؟
- [X] T005 بررسی کن «ویتامین B12» و «فولات» در `SUGGEST_TESTS` در `khanesh-server/rules/patterns.js` هستند. اگر «ویتامین B12» نیست، ثبتش کن (در T018 اضافه می‌شود).
- [X] T006 بندِ **`P49`** را زیرِ «در انتظار بازبینی» در `MEDICAL_RULES.md` بنویس (research.md R9). این پنج بخش را داشته باشد:
  1. فوریتِ `routine` برای فولاتِ تنها؛
  2. هر بندِ داستانِ ۳ با شمارهٔ فرعی (`P49-الف` سرولوپلاسمین/ویلسون با مرزِ یک سال و هشدارِ CRP، `P49-ب` MMA، `P49-ج` دو آنتی‌بادی، `P49-د` روی، مس، سلنیوم، E، C و PLP)، هر کدام با منبع، عدد، واحد و پیامدِ بیمار در هر دو تصمیم؛
  3. هفت ایرادِ متنِ ورودی؛
  4. بندهای تکراری، از جمله B12 125 pmol/L در برابرِ `P21`؛
  5. بندهای خارج از دامنه و عددهای عناصرِ نادر.

  متن با Edit نوشته شود.

**Checkpoint**: خطِ پایه، فهرستِ شناسه‌ها، پنل‌های ثابت و `P49` آماده‌اند.

---

## Phase 3: User Story 1 — فولاتِ پایین یک مالک دارد و سه‌حالته خوانده می‌شود (Priority: P1) 🎯 MVP

**Goal**: فولاتِ پایین دیگر به `unmatched_abnormal` نمی‌رسد. روی هر پنل دقیقاً یک یافته از فولات می‌گوید، و فولات و B12 همیشه سه‌حالته‌اند.

**Independent Test**: پنل‌های فولاتِ quickstart §۳ (هشت ردیفِ اول) و هشت املای FR-005.

### Tests (اول بنویس، اجرا کن، قرمز ببین)

- [X] T007 [P] [US1] `M141` در `khanesh-server/rules/engine.test.js`: `Folate 2 ng/mL` تنها → `folate_deficiency` با `routine`. `unmatched_abnormal` نمی‌آید و FOLATE در `uncovered` نیست. `must_say` عدد ۲ را دارد و می‌گوید B12 اندازه‌گیری نشده و پیش از اسیدفولیک باید سنجیده شود. `action` از `actionFor("routine")` است، بی «این هفته» و «همین حالا».
- [X] T008 [P] [US1] (`khanesh-server/rules/engine.test.js`) `M141b`: `Folate 5 nmol/L` → متن عددِ چاپ‌شده و واحدِ برگه را می‌گوید، نه فقط ۲.۲ ng/mL (N5).
- [X] T009 [P] [US1] (`khanesh-server/rules/engine.test.js`) `M142`: B12 سه‌حالته در یافتهٔ فولات:
  - `+ B12 120` → «B12 هم پایین» و `overt_b12_deficiency` هم هست؛
  - `+ B12 250` → «نزدیکِ مرز»؛
  - `+ B12 450` → «طبیعی»؛
  - هیچ حالتی دو یافتهٔ فولات نمی‌سازد.
- [X] T010 [P] [US1] (`khanesh-server/rules/engine.test.js`) `M143` آزمونِ دوطرفهٔ مالکیت (SC-002). روی دست‌کم ۸ پنل **دقیقاً یک** یافته فولات را نام ببرد:
  - فولاتِ تنها؛
  - با B12 پایین، طبیعی و غایب؛
  - `+ Hb 9 + MCV 110`؛
  - `+ Hb 9 + MCV 110 + B12 120`؛
  - با اورژانسِ `K 7.0`، که در آن فولات در `unmatched_abnormal` نیست (N18)؛
  - فولاتِ طبیعی + ماکروسیتیک.

  این آزمون هم سکوت را رد می‌کند و هم تکرار را.
- [X] T011 [P] [US1] (`khanesh-server/rules/engine.test.js`) `M144`: متنِ سه‌حالتهٔ `macrocytic_anemia`:
  - `Folate 2` → فولاتِ ۲ و پایین نام برده می‌شود؛
  - `Folate 8` → «فولات طبیعی است، پس کمبودِ فولات علتِ محتمل‌تر نیست»؛
  - بی‌فولات و بی‌B12 → هر دو «اندازه‌گیری نشده» و هیچ «طبیعی» (N4، N21).
- [X] T012 [P] [US1] (`khanesh-server/rules/engine.test.js`) `M145`: هر یک از هشت املای FR-005 به کلیدِ درست می‌رسد. `unmapped` روی پنلِ هشت‌تایی ۰ است (پیش از تغییر ۸ است).
- [X] T013 [US1] این شش آزمون را اجرا کن و **قرمز بودنِ هر کدام** را با پیامِ شکست در `specs/004-vitamins-trace-elements/baseline.md` ثبت کن.

### Implementation

- [X] T014 [US1] در `khanesh-server/rules/patterns_hematology.js`، `match`ِ `macrocytic_anemia` را بی‌تغییرِ منطق در ثابتِ `export const macrocyticMatch` بیرون بکش و قاعده از آن استفاده کند. پس از این کار `npm test` باید بی‌تغییر سبز باشد، چون این یک refactor است.
- [X] T015 [US1] در `khanesh-server/rules/patterns_hematology.js`، `must_say`ِ `macrocytic_anemia` را با دو بندِ سه‌حالتهٔ فولات و B12 کامل کن (data-model.md):
  - B12 مرزی = ۱۵۰ تا ۳۹۹، همان مرزِ `borderline_b12_deficiency`؛ عددِ تازه ممنوع.
  - «پایین» از `dir === "low"` خوانده شود، نه از مقایسهٔ عدد (N12).
  - متنِ فارسی را پیش از ادامه عیناً به کاربر نشان بده.
- [X] T016 [US1] قاعدهٔ `folate_deficiency` را در `khanesh-server/rules/patterns_hematology.js`، بلافاصله پس از `macrocytic_anemia`، بساز:
  - `match` = فولاتِ graded پایین && `!macrocyticMatch(e)`؛
  - `urgency: "routine"` و `action` از `actionFor`؛
  - B12 سه‌حالته/چهارحالته؛
  - `suggest: ["ویتامین B12"]` فقط وقتی B12 نیست؛
  - بی دوز و بی دارو (FR-002)؛
  - `key_number` = عددِ فولات.

  متنِ فارسی را عیناً نشان بده.
- [X] T017 [US1] مطمئن شو `folate_deficiency` در `RULES_HEMATOLOGY` است و آن آرایه در `khanesh-server/rules/patterns.js` پخش می‌شود (N1). با `node -e` بررسی کن `RULES.length` یکی بیشتر شده است.
- [X] T018 [US1] اگر T005 نشان داد، سطرِ «ویتامین B12» → `["B12"]` را به `SUGGEST_TESTS` در `khanesh-server/rules/patterns.js` اضافه کن (N8).
- [X] T019 [US1] هشت املای FR-005 را به `NAME_MAP` در `khanesh-server/rules/adapter.js` اضافه کن. کلیدِ `norm()` هر کدام را پیش از نوشتن با یک `node -e` اندازه بگیر. `resolveAlias` را گسترش نده.
- [X] T020 [US1] `npm test` را اجرا کن. `M141` تا `M145` سبز و بقیه بی‌تغییر باشند. عددها را با نامِ درخت ثبت کن.

**Checkpoint**: داستانِ ۱ مستقلاً کامل و قابلِ نمایش است (MVP).

---

## Phase 4: User Story 2 — ۲۰ آنالیتِ تازه بی‌قضاوت شناخته می‌شوند (Priority: P2)

**Goal**: ۱۴ آنالیتِ FR-007 و ۶ عنصرِ نادرِ FR-011b با نامِ فارسی در خطِ «تفسیر نشدند» می‌آیند. نه یافته می‌سازند، نه فوریت. برگهٔ فقط-این‌ها مسیرِ موتور را می‌گیرد.

**Independent Test**: ردیف‌های `Zinc` تا `Mn` در quickstart §۳، به‌علاوهٔ `T21`.

### Tests (اول، قرمز)

- [X] T021 [P] [US2] `M146` در `khanesh-server/rules/engine.test.js`: هر یک از ۲۰ کلید، تنها و با واحدِ رایج، این نتیجه‌ها را دارد:
  - `unmapped` خالی است؛
  - کلید در `noRef` است؛
  - `overall_urgency === "none"`؛
  - یافته‌ای نیست؛
  - `FA_NAMES[key]` تعریف شده و با کلید برابر نیست.
- [X] T022 [P] [US2] (`khanesh-server/rules/engine.test.js`) `M147`: `Anti-Intrinsic Factor: Positive` و `Parietal Cell Antibody: Positive` → در `noRef`، **نه** در `qual`. هیچ یافته‌ای نیست و مقدار به عدد تبدیل نمی‌شود (N6، N25).
- [X] T023 [P] [US2] (`khanesh-server/rules/engine.test.js`) `M148` مخفف‌ها:
  - `Zn 80 µg/dL` → `ZINC`، و `Zn 80` بی‌واحد → `unmapped`؛
  - همین دو حالت برای `Cu` و `Se`؛
  - `Cr 1.1 mg/dL` → `CREAT` graded؛
  - `Mn 10`، `Co 5` و `Mo 2` → `unmapped`؛
  - `NAME_MAP.cr === "CREAT"` (SC-004b).
- [X] T024 [P] [US2] (`khanesh-server/rules/engine.test.js`) `M149` جداسازی (FR-010):
  - `RBC Folate 300 ng/mL` → `RBC_FOLATE`، هرگز `FOLATE` graded؛
  - `Urine Copper 24h` → `U_COPPER_24H`؛
  - `Urine Copper` بی‌۲۴ → `unmapped`؛
  - `Folate 300` بی‌پیشوند → رفتاری که T004(ج) اندازه گرفت و به هر حال نه `high`.
- [X] T025 [P] [US2] `T21` در `khanesh-server/api-contract.test.js`: برگه‌ای فقط با `Zinc`، `Ceruloplasmin` و `Anti-IF` این نتیجه‌ها را دارد (الگوی `T19`):
  - مسیرِ موتور (`_engine` هست)؛
  - `has_critical === false`؛
  - خطِ «تفسیر نشدند» با «روی»، «سرولوپلاسمین» و نامِ فارسیِ آنتی‌بادی؛
  - هیچ کلیدِ خامی (`ZINC`، `ANTI_IF`) در کلِ پاسخ نیست؛
  - `buildNormalResult` برنگشته است.
- [X] T026 [P] [US2] `M150`: CBCِ کم‌خونیِ فقرِ آهن + `Zinc 50` → یافته‌های Hb دقیقاً همانِ بدونِ Zinc است (سناریوی ۵).
- [X] T027 [US2] `M146` تا `M150` و `T21` را اجرا کن و قرمز بودنِ هر کدام را در `baseline.md` ثبت کن.

### Implementation

- [X] T028 [P] [US2] بیست نامِ فارسیِ جدولِ data-model.md را به `FA_NAMES` در `khanesh-server/rules/names.js` اضافه کن. **فهرست را پیش از نوشتن عیناً به کاربر نشان بده.**
- [X] T029 [US2] نام‌های کاملِ انگلیسی و فارسیِ ۲۰ کلید را به `NAME_MAP` در `khanesh-server/rules/adapter.js` اضافه کن (data-model.md، ستونِ «نگاشت»). هیچ مخففِ `mn`، `co`، `cr` یا `mo` اضافه نشود. `RBC_FOLATE` فقط با پیشوند و `U_COPPER_24H` فقط با «24» نگاشت شوند. کلیدِ `norm()` هر کدام را اندازه بگیر.
- [X] T030 [US2] در `khanesh-server/rules/adapter.js`:
  - `UNIT_GATED_ALIASES` را برای `zn`، `cu` و `se` بساز. پس از شکستِ `NAME_MAP` خوانده شود و واحد را با `recognizedUnit` از `units.js` بسنجد، نه با regexِ تازه.
  - بی‌واحد یا با واحدِ ناسازگار → `unmapped`.
- [X] T031 [US2] در `khanesh-server/rules/adapter.js`:
  - `QUAL_NO_READER = new Set(["ANTI_IF", "APCA"])` را بساز و ردیفِ کیفیِ این کلیدها را به `noRef` بفرست، نه `qual`.
  - `anti-if` و `apca` را در `QUALITATIVE` یا الگوها بگذار تا ردیف به مسیرِ کیفی برسد و به عدد تبدیل نشود.
  - کامنتِ فارسی بنویس که چرا (N25) و چه چیزی این مجموعه را خالی می‌کند (تأییدِ `P49-ج`).
- [X] T032 [US2] اگر T004(الف) نشان داد `decideUnit` کلیدهای تازه را لمس می‌کند، شرطِ «فقط کلیدِ دارای `UNIT_PROFILE`» را در `khanesh-server/rules/adapter.js` تضمین کن و یک پنلِ آزمون به `M146` بیفزا.
- [X] T033 [US2] `npm test` را اجرا کن. `M146` تا `M150` و `T21` سبز و `M141` تا `M145` بی‌تغییر باشند.

**Checkpoint**: داستان‌های ۱ و ۲ هر کدام مستقلاً سبزند.

---

## Phase 5: User Story 3 — آستانه‌های `P49` به شکلِ آزمونِ `todo` (Priority: P3)

**Goal**: هر بندِ داستانِ ۳ یک آزمونِ `todo` دارد که می‌گوید پس از تأیید چه باید درست باشد. هیچ کدِ یافته‌ای نوشته نمی‌شود (FR-015b).

**Independent Test**: `npm test` این‌ها را `todo` گزارش می‌کند و شمارِ `fail` صفر می‌ماند. رفتارِ فعلیِ این آنالیت‌ها همان داستانِ ۲ است.

- [X] T034 [P] [US3] `M151` تا `M151c` به‌صورتِ `test(..., { todo: "P49-الف — در انتظارِ تأییدِ بازبین" })` در `khanesh-server/rules/engine.test.js`. همه دربارهٔ `Ceruloplasmin 10` هستند:
  - بی‌مسِ ادرار → «ارزیابیِ ویلسون» و «مسِ ادرار اندازه‌گیری نشده»؛
  - `+ U_COPPER_24H 150` → پشتیبان؛
  - `+ U_COPPER_24H 40` → ردکننده؛
  - `+ CRP بالا`، یک هشدار؛
  - سن زیرِ یک سال → هیچ یافته؛
  - هرگز «ویلسون دارید».
- [X] T035 [P] [US3] `M152` (`todo`، `P49-ب`): `B12 180 + MMA 0.8` → **یک** یافتهٔ B12 که MMA را شاهد می‌آورد (FR-015).
- [X] T036 [P] [US3] `M153` (`todo`، `P49-ج`): `Anti-IF Positive + B12 120` → یافتهٔ موجودِ B12 احتمالِ پرنیشیوز را می‌گوید، نه تشخیص. `ANTI_IF` از `QUAL_NO_READER` خارج شده است.
- [X] T037 [P] [US3] `M154` (`todo`، `P49-د`): روی، مس، سلنیوم، E، C و PLPِ پایین، هر کدام غیرفوری. در مسِ پایین با رویِ بالای همان برگه، جملهٔ جذب گفته می‌شود.
- [X] T038 [US3] `npm test` را اجرا کن. شمارِ `todo` باید دقیقاً به اندازهٔ T034 تا T037 بالا رفته باشد و `fail` صفر بماند.

---

## Phase 6: Polish & Cross-Cutting

- [X] T039 [P] بخشِ «عمداً غایب از ورودِ دستی — ویتامین‌ها و عناصرِ کمیاب» را به `khanesh-server/rules/REF_DIFF.md` اضافه کن، مثلِ بخشِ P46.
- [X] T040 [P] فهرستِ شناسه‌ها را دوباره بساز و با `ids-before.txt` مقایسه کن. تنها تفاوتِ مجاز `+ folate_deficiency` است (N16). نتیجه را در `baseline.md` ثبت کن.
- [X] T041 [P] دوازده پنلِ ثابتِ T003 را دوباره اجرا کن و با `frozen-before.json` مقایسه کن. اگر پنلِ «ماکروسیتیکِ بی‌فولات» تغییر کرده، این تغییرِ عمدیِ T015 است و با diff در `baseline.md` توضیح داده شود. بقیه باید بایت‌به‌بایت یکسان باشند (SC-005).
- [X] T042 [P] SC-007: عددهای `20`، `100`، `125`، `6.8`، `227`، `322` و `368` را در `khanesh-server/rules/patterns_*.js` و `refs.js` grep کن. هیچ رخدادِ تازه‌ای از این تغییر نباید باشد.
- [X] T043 `npm test` در `khanesh-server/` و `npm run lint` در `khanesh/` را اجرا کن. عددها را با نامِ درخت در `baseline.md` بنویس.
- [X] T044 عاملِ `code-reviewer` و سپس `eval-medical-reviewer` را روی diff اجرا کن. هر blocker با یک آزمونِ «اول قرمز» اصلاح شود. هر متنِ فارسیِ بیمار که عامل‌ها گزارش کردند عیناً به کاربر نشان داده شود.
- [X] T045 این فایل‌ها را به‌روز کن:
  - `CLAUDE.md`: ردیفِ جدولِ خطِ پایه و شمارِ قواعد در «Where a pattern lives». اگر بازبینی خروجیِ غلطی را اصلاح کرد، یک مدخل در Lab Notebook.
  - `note.md`: وضعیت و گامِ بعد.
  - کامیت فقط وقتی کاربر بگوید.

---

## Dependencies & Execution Order

- **Setup (T001–T003)**: بی‌وابستگی. T002 و T003 موازی‌اند.
- **Foundational (T004–T006)**: پس از Setup. **همهٔ داستان‌ها را مسدود می‌کند.** `P49` (T006) پیش از هر کد.
- **US1 (T007–T020)**: پس از Foundational. آزمون‌ها (T007–T012) موازی‌اند و T013 پیش از هر پیاده‌سازی. T014 → T015 → T016 ترتیبی‌اند (یک فایل). T018 و T019 پس از T016.
- **US2 (T021–T033)**: پس از Foundational، **مستقل از US1**. فقط T029 و T019 هر دو `NAME_MAP` را ویرایش می‌کنند، پس اگر موازی اجرا شوند باید یکی پس از دیگری ادغام شوند. T028 موازی است (فایلِ جدا). T029 → T030 → T031 → T032 ترتیبی‌اند (یک فایل).
- **US3 (T034–T038)**: پس از T006 و US2، چون `todo`ها به `QUAL_NO_READER` و کلیدها ارجاع می‌دهند.
- **Polish (T039–T045)**: پس از همهٔ داستان‌ها.

## Parallel Examples

```text
# US1 — آزمون‌ها با هم نوشته می‌شوند (یک فایل، ولی بلوک‌های مستقل؛ ترتیبی درج کن تا Edit برخورد نکند):
T007, T008, T009, T010, T011, T012 → T013 (قرمز)

# US2 — دو فایل موازی:
T028 (names.js)  ‖  T029→T030→T031 (adapter.js)
T025 (api-contract.test.js)  ‖  T021–T024, T026 (engine.test.js)

# Polish:
T039 ‖ T040 ‖ T041 ‖ T042
```

## Implementation Strategy

1. **MVP = Phase 1 + 2 + US1.** این تنها بخشی است که خوانشِ غلطِ امروزی (فولاتِ بی‌توضیح، و ماکروسیتیکی که فولاتِ برگه را نمی‌خواند) را می‌بندد. پس از T020 می‌تواند به‌تنهایی بازبینی و کامیت شود.
2. **US2** سکوتِ ۲۰ آنالیت را به «دیده شد، تفسیر با پزشک» بدل می‌کند، بی‌ادعای بالینی.
3. **US3** فقط قراردادِ آینده است (`todo`). کدش پس از تأییدِ `P49` در تغییری جدا نوشته می‌شود.
4. پس از هر داستان: `npm test`، ثبتِ عدد با نامِ درخت، و نمایشِ متنِ فارسیِ تازه به کاربر.
