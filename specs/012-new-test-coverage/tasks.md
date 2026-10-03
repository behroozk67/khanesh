---
description: "Task list for specs/012 — catalogue relabel + Tier‑1 serology + semen names"
---

# Tasks: New Test Coverage — Catalogue Relabel + Tier‑1 Serology & Semen Names

**Input**: `specs/012-new-test-coverage/` — plan.md, spec.md, research.md (§P0), data-model.md, contracts/engine-findings.md, quickstart.md
**Tests**: REQUIRED. Constitution IV says every new guard must fail on the pre‑change tree before it is accepted. Tests are written first in each story phase.
**Story labels**: `[US1]`, `[US2]` and `[US4]` match the spec. US3 moved to specs/013 and has no tasks here.
**Implementation note (2026-10-03, during /speckit-implement):** a concurrent session added `M300`–`M302` to `engine.test.js` and is editing `patterns_coverage_gaps.js`/`patterns_nephrology.js`. To avoid ID and file collisions, the specs/012 tests live in their own files with an `S` prefix: `rules/serology.test.js` and `serology-api.test.js` (both picked up by `node --test`). Mapping: M301→S01, M302→S02, M303→S03 … M316→S16; T45→S17, T46→S18. Measured baseline at the start of implementation (working tree incl. the concurrent edits, HEAD `7b81c9e`): `tests 848 · pass 847 · fail 0 · todo 1`; `RULES.length` 192; frontend lint clean, coverage.mjs «بدون محتوا» 0.
**Line numbers** in `khanesh/src/testCatalog.js` were measured 2026‑10‑03. Re‑grep by name before editing, because lines drift.

## Format: `[ID] [P?] [Story] Description`

- Work in `khanesh/` for the frontend and `khanesh-server/` for the backend. They are independent projects and have no shared package.json.
- Write Persian text only with the Edit/Write tools, Bash or Node `fs`. **Never** use PowerShell `*-Content` (N15(d)).

---

## Phase 1: Setup (baseline — Constitution III)

- [X] T001 Re-measure the backend baseline: run `npm test 2>&1 | grep -E "^ℹ (tests|pass|fail|todo)"` in `khanesh-server/` and record the result, naming the tree (`git rev-parse --short HEAD` + "working tree"), in `specs/012-new-test-coverage/quickstart.md` §0. Expected at plan time: 846 · 845 · 0 · todo 1. If it is different, use the new number; do not chase the old one.
- [X] T002 [P] Dump the rule-id set: in `khanesh-server/` run `node -e "import('./rules/patterns.js').then(m=>console.log(m.RULES.map(r=>r.id).sort().join('\n')))"` and save the output to the scratchpad as `ids-before.txt`.
- [X] T003 [P] Record the frontend baseline: in `khanesh/` run `npm run lint`, `npm run build` and `node src/content/coverage.mjs | head -5`. Save the lint warning count and the «بدون محتوا» count.
- [X] T004 [P] Run `node ../specs/012-new-test-coverage/probe012.mjs` from `khanesh-server/` and keep its output as `probe-before.txt` (the reference for research §P0-1).

---

## Phase 2: Foundational (blocking for US2 and US4)

- [X] T005 Move `qualState()` from `khanesh-server/rules/patterns_coverage_gaps.js` into `khanesh-server/rules/patterns_utils.js` as an export, with no change to its body. Import it back into `patterns_coverage_gaps.js`. Verify with `npm test`: the counts must equal T001's exactly (a refactor-neutral move).
- [X] T005b Open and read the primary source for each guideline before T006 (WebFetch/firecrawl): CDC STI Treatment Guidelines 2021 (syphilis serology section), ACG 2024 H. pylori guideline (AJG), ATA 2016 hyperthyroidism guideline (Thyroid 26:1343, TRAb section), ACOG PB 181 (Rh D alloimmunization), and CLSI/CDC rubella IgG serology. For each one, record in `specs/012-new-test-coverage/research.md` §P0-8: the URL, opened yes/no, and the exact sentence that supports each P68 claim. Any claim whose sentence cannot be found is struck from P68, not kept on the strength of a search summary.
- [X] T006 Add guideline ids to `khanesh-server/rules/guidelines.js`: `CDC_STI_2021` (open), `ACG_HPYLORI_2024`, `ATA_HYPER_2016`, `ACOG_RH_PB181` (paywalled, `substitutedBy` an open review that is named), and `CLSI_RUBELLA` (paywalled, `substitutedBy` the open lab-catalogue interpretation). Register an id as read **only** if T005b opened it. A paywalled or unopened source gets `access: 'paywalled'` + `substitutedBy` naming what was actually read (rules-engine.md: "Don't cite a body whose document you didn't open"). Depends on T005b. Verify with `node --test rules/engine.test.js --test-name-pattern "G6"`, which must be green.

**Checkpoint**: suite identical to T001; G6 green.

---

## Phase 3: User Story 1 — Catalogue relabel (Priority: P1) 🎯 MVP

**Goal**: the 9 tests the engine already reads stop showing "soon".
**Independent test**: lint and build pass, the coverage.mjs «بدون محتوا» count is ≤ T003, the row-0 section of the probe is unchanged, and `git diff --stat` touches no file under `khanesh-server/`.

- [X] T007 [US1] (2026-10-03: eGFR and Non-HDL were reverted to `s(` after code review — a printed row of either is `unmapped`; see spec Clarifications) In `khanesh/src/testCatalog.js`, change `s(` to `p(` for: `HbA2 & HbF` (~506), `ApoB` (~293), `Homocysteine` (~296 **and** ~494), `NT-proBNP / BNP` (~298), `Prolactin` (~266 **and** ~331), `Copper & Ceruloplasmin` (~492), `eGFR` (~378), `Non-HDL Cholesterol` (~290). Keep the name and description strings byte-identical so the slugs don't change.
- [X] T008 [US1] In `khanesh/src/testCatalog.js` (~335), change `s("Thyroid Panel (پنل کامل تیروئید)", …)` to `c(…, "thyroid", "thyroid-panel")`, matching the existing panel entry at ~174. If both now render as duplicate panels in the same category, keep the one in its category and record the decision in the commit message.
- [X] T008b [US1] Content check for the 9 slugs: in `khanesh/` run `node -e "import('./src/content/extraTests.js').then(m=>{for(const s of ['hba2-hbf','apob','homocysteine','nt-probnp-bnp','prolactin','copper-ceruloplasmin','egfr','non-hdl-cholesterol','thyroid-panel'])console.log(s, !!m.EXTRA_TESTS[s])})"`. Derive the slugs with `testSlug()` first; the list above is a guess. Every slug must be `true`. For each `false`, add a sourced entry to the matching `khanesh/src/content/extra.<topic>.js`. Then read each of the 9 pages' text against the engine behaviour in research §P0-1 (spec Story 1, scenario 2). For example, eGFR must read as calculated rather than a separate test, and Non‑HDL as derived from cholesterol − HDL.
- [X] T009 [US1] Verify Story 1: run lint, build and `node src/content/coverage.mjs` in `khanesh/`, and compare against T003. If a relabelled slug now appears in «بدون محتوا», add a sourced entry to the matching `khanesh/src/content/extra.<topic>.js` (only for that slug). Re-run the row-0 part of the probe and confirm it is identical to `probe-before.txt`. Run `git diff --stat` and confirm it shows `khanesh/src/` only.

**Checkpoint**: US1 can be committed alone (the frontend lint gate only).

---

## Phase 4: User Story 2 — Serology readers (Priority: P1)

**Goal**: VDRL/RPR, Rubella IgG, Indirect Coombs, H. pylori, Anti‑Tg and TRAb/TSI each get exactly one Persian finding, conditional on what the sheet printed (contract C1–C4).
**Independent test**: M301–M314 and T45–T46 are green, they were red on the pre-change tree, and the rule-id diff shows only the 4 additions.

### Tests for US2 (write first; each must FAIL before implementation) ⚠️

- [X] T010 [P] [US2] In `khanesh-server/rules/engine.test.js`, add **M301** (routing, contract C1). Every row in the C1 table lands in its required channel and not the forbidden one. This includes: `Tg 180 mg/dL` → `TG`; `Coombs Wright 1/160` → `COOMBS_WRIGHT`; `Rubella IgM`, `H. pylori IgA`, `Direct Coombs` and bare `Coombs` → `unmapped`. Use a Persian comment.
  - **Form matrix (FR‑006)** per in-scope name: lone; no unit; alternate unit (Anti‑Tg: `IU/mL`, `kIU/L`, `U/mL`; TRAb: `IU/L`, `U/L`, `%`); Persian spelling; age 8 and age 0.5. Expected result: a printed range is read, the unit is quoted verbatim and never converted (equivalence is not assumed), and with no range and no word the value is unread. A child is never compared to an adult default (no default exists).
- [X] T011 [P] [US2] In `engine.test.js`, add **M302**, a closed-set sweep (spec SC-004). Cover at least 15 positive, 15 negative and 10 ambiguous spellings across English, Persian and titre forms (`Reactive 1:8`, `1/8`, `۱:۸`, `NR`, `غیر واکنش‌گر`, `+/-`, `equivocal`, `borderline`, `undetected`, `مشکوک`), for VDRL, ICT, H. pylori Ag and Rubella. Every positive must read pos, every negative must read neg, and every ambiguous value must land in the unread line, never pos (N6).
- [X] T012 [P] [US2] In `engine.test.js`, add **M303** for syphilis.
  - Reactive 1:8 → `syphilis_screen_result` at `this_week`. The text names the titre and says it is not diagnostic, and a treponemal test is suggested.
  - Non-reactive → a `routine` note scoped to the test.
  - Forbidden phrase test: no finding contains «سیفلیس دارید».
- [X] T013 [P] [US2] In `engine.test.js`, add **M304** for rubella.
  - `4 IU/mL (Immune ≥ 10)` + declared pregnancy → `this_week`, with no vaccination advice (forbidden-phrase assertion on «واکسن»).
  - `Non-immune`, not pregnant → `routine` with vaccine counselling.
  - `25 IU/mL (Immune ≥ 10)` → no abnormal finding.
  - **C1 guard:** `4 IU/mL` with **no** printed cutoff and no word → unread (proves no fixed 10 in code); same for `15` with no unit.
  - A printed cutoff «Immune ≥ 15» classifies `12` as non‑immune (the printed number is the only cutoff).
  - Age 0.5 → the maternal-antibody sentence and no immunity claim.
- [X] T014 [P] [US2] In `engine.test.js`, add **M305** for Indirect Coombs.
  - Positive + pregnant → `this_week`, asking for antibody identification and titre.
  - **C1 guard:** a printed titre (`1:32`) is quoted verbatim; the text names no titre threshold.
  - Positive, not pregnant → `routine` with a pre-transfusion sentence.
  - Negative with no Rh type on the sheet → the text says the result does not tell the Rh type (N4).
  - A sheet that also has Coombs Wright → both `brucella_active` and `indirect_coombs_result` fire, each exactly once (N25).
- [X] T015 [P] [US2] In `engine.test.js`, add **M306** for H. pylori.
  - Stool Ag positive → active-infection text.
  - UBT positive → the same.
  - IgG positive → "cannot separate current from past", suggesting Ag/UBT, and no suggestion when Ag is already on the sheet (`SUGGEST_TESTS`).
  - Stool Ag negative → the PPI 2 wk / antibiotic 4 wk caveat.
  - A key with no subtype → unread.
  - All of these are `routine`.
- [X] T016 [P] [US2] In `engine.test.js`, add **M307** for thyroid antibodies.
  - `Anti-Tg 300 IU/mL` with printed `<115` + `TSH 8` → one `thyroid` finding that mentions Anti‑Tg.
  - A lone `Anti-Tg` above its printed range → `thyroid` at `routine`.
  - `TRAb 8 IU/L (<1.75)` + low TSH + high FT4 → "pattern typical of Graves', needs physician confirmation", with no «مبتلا به گریوز».
  - TRAb above its printed range + declared pregnancy → the obstetrician sentence, urgency unchanged from the `thyroid` rule. **C1 guard:** TRAb at 10× ULN in pregnancy does not raise urgency (no 3× rule in code).
  - `Anti-Tg 300` with no unit and no range → unread.
- [X] T017 [P] [US2] In `engine.test.js`, add **M308**, a freeze. Run 12 existing thyroid panels (TSH/FT4/FT3/T3/ANTI_TPO combinations, none containing Anti‑Tg/TRAb) and assert the `thyroid` output is byte-identical to the pre-change output. Capture the reference by running the panels on the pre-change tree, and store the hash in the test (M104d pattern).
- [X] T018 [P] [US2] In `engine.test.js`, add **M309**, the count contract C3. For each of the 7 tests, on panels with partners (TSH/FT4, Coombs Wright, a pregnancy flag), exactly one finding's text mentions the test. Assert that each of the 7 was reached at least once, which prevents a meaningless green (N15).
- [X] T019 [P] [US2] In `engine.test.js`, add **M310** for N20 and urgency.
  - For every new finding, `action === ACTION[urgency]`.
  - No new finding is ever `emergency`.
  - A sweep of ordinary negatives produces nothing above `routine`.
- [X] T020 [P] [US2] In `engine.test.js`, add **M311**: every `suggest` string emitted by the new rules is a key of `SUGGEST_TESTS`, and every `sources` id exists in `guidelines.js`.
- [X] T021 [P] [US2] In `engine.test.js`, add **M312** for Persian/N8. The new finding strings contain no raw engine key (`ANTI_TG`, `TRAB`), and `FA_NAMES` has both keys. The M37/M38 guards are expected to cover encoding and language automatically; confirm they reach `patterns_serology.js` through `livePatternFiles()`.
- [X] T022 [P] [US2] In `khanesh-server/api-contract.test.js`, add **T45**: a sheet whose only row is `VDRL: Reactive 1:8` stays on the engine path. The response has `_engine`, `_engine.patterns` includes `syphilis_screen_result`, and there is no buildNormalResult text (C4).
- [X] T023 [P] [US2] In `api-contract.test.js`, add **T46**: the same check for a sheet with only `Anti-Tg 300 IU/mL` and a printed range `<115`.
- [X] T023b [P] [US2] In `engine.test.js`, add **M315** (SC‑008, N25). A two-page upload — page 1 is a lipid panel with `Tg 180 mg/dL`; page 2 is a thyroid page with `Anti-Tg 300 IU/mL (<115)`, `TSH 8` and `TRAb 0.5 IU/L (<1.75)` — runs through `mergePages` then `runEngine` (use the same helper the existing mergePages tests use; grep `mergePages` in `engine.test.js`/`api-contract.test.js` first). Expect zero rows lost, `TG` = 180 and graded, `ANTI_TG` in `ungraded` with `assay_printed`, and each finding exactly once. Repeat with the page order reversed.
- [X] T024 [US2] Red-first proof: run `git stash push -- khanesh-server/rules/adapter.js khanesh-server/rules/patterns*.js khanesh-server/rules/names.js khanesh-server/server.js` (only if any of them already has changes; otherwise run before T025). Then run `node --test rules/engine.test.js` and `node --test api-contract.test.js`. **M301–M307, M309 and T45–T46 must fail**; M308 (freeze) is green by design. Record the fail count in `specs/012-new-test-coverage/quickstart.md` §4, then `git stash pop`.

### Implementation for US2

- [X] T025 [US2] Routing, in `khanesh-server/rules/adapter.js`:
  - Add the anchored patterns from research §P0-4 to `QUALITATIVE_PATTERNS`.
  - Make the IgM/IgA/DAT/bare-`coombs` forms go to `unmapped` before `isQualitative` and `resolveAlias` see them.
  - Map the Anti‑Tg/TRAb spellings to `ANTI_TG`/`TRAB`, routed by value: a printed range goes to `ungraded` with `reason: "assay_printed"` and `{value, unit, printedRange, raw}`; a qualitative word goes to `qual`; neither goes to unread.
  - Leave the `tg` → `TG` alias untouched.
  - Verify: M301 green, and `probe012.mjs` shows 0 `unmapped` among the in-scope names.
- [X] T026 [P] [US2] In `khanesh-server/rules/names.js`, add `FA_NAMES` entries: `ANTI_TG: "آنتی‌بادی ضد تیروگلوبولین (Anti‑Tg)"` and `TRAB: "آنتی‌بادی گیرندهٔ TSH (TRAb/TSI)"`.
- [X] T027 [US2] Create `khanesh-server/rules/patterns_serology.js` exporting `RULES_SEROLOGY` with four rules: `syphilis_screen_result`, `rubella_igg_status`, `indirect_coombs_result` and `h_pylori_result`.
  - Read values with `qualState` (from T005), plus `parseTitre` for titres. A local `ACTION` map gives urgency → sentence (N20).
  - Every branch is pos / neg / unread / absent-partner (Constitution II).
  - Read pregnancy as `e.pregnant === true` only, and age as `e.age`.
  - The headlines are the drafts in `contracts/engine-findings.md` §C2.
  - Put the sources on each finding.
  - Write the file with the Write tool (Persian).
- [X] T028 [US2] In `khanesh-server/rules/patterns.js`, import `RULES_SEROLOGY`, spread it into `RULES`, and add the new suggestion strings to `SUGGEST_TESTS` with their already-measured keys: «تست تأییدی ترپونمایی (TPHA/FTA-ABS)»; «آنتی‌ژن مدفوع یا تست تنفسی اوره برای هلیکوباکتر», which counts as measured when an H. pylori Ag/UBT row exists; «شناسایی آنتی‌بادی و تیتر (کومبس غیرمستقیم)». Then run `node -e` to dump the id set, and diff it against `ids-before.txt`. Expect +4 and −0.
- [X] T029 [US2] In `khanesh-server/rules/patterns_endocrine_rheum.js`, extend the `thyroid` rule.
  - `match` additionally fires on `ANTI_TG`/`TRAB`, either from `assay_printed` above the printed range or from a positive `qual`.
  - `build` adds one sentence for each antibody, three-way (above / within / not on the sheet). Write it only when the antibody exists; otherwise the output stays unchanged so the M308 freeze holds.
  - The Graves wording requires TRAb plus (low TSH or high FT4), and stays conditional.
  - TRAb above its printed range with `e.pregnant === true` adds one sentence (tell your obstetrician). It does **not** change urgency and uses no multiple of ULN (C1).
  - Verify: M307 and M308 green.
- [X] T030 [US2] Verify that `khanesh-server/server.js` keeps serology-only and Anti‑Tg-only sheets on the engine path through `ownedQual`/`ownedUngraded` (`assay_printed` ≠ `no_range`). T45 and T46 must be green. Only if one is red, fix the gate condition in `server.js` with a Persian comment that cites N18, and do not change the test.
- [X] T031 [US2] In `khanesh/src/testCatalog.js`, flip the US2 tests from `s(` to `p(` now that each has a reader (FR-017): `VDRL / RPR` (~349), `Indirect Coombs` (~269), `Rubella IgG` (~270 **and** ~395), `H. pylori` (~465), `Anti-Tg` (~416), `TRAb / TSI` (~417). Then run lint, build and coverage.mjs, comparing against T003.
- [X] T032 [US2] Run the full `npm test` in `khanesh-server/`. Expect `fail 0`, and `tests` = T001 + the number of new tests. Re-run `probe012.mjs` and check the outputs against the table in quickstart.md §2.

**Checkpoint**: US2 complete and independently verifiable.

---

## Phase 5: User Story 4 — Semen names (Priority: P2)

**Goal**: every semen-page spelling routes to a semen key, to a named `semenQual` row, or to `unmapped`. None may be silent.
**Independent test**: M313–M314 green. The existing semen fixtures (M104c/M104d freezes) are unchanged.

- [X] T033 [P] [US4] In `khanesh-server/rules/engine.test.js`, add **M313**, a spelling sweep. Cover at least 20 real semen row spellings in English and Persian: `Spermogram`, `Sperm count`, `Sperm concentration`, `Total sperm number`, `Progressive motility`, `Total motility`, `Normal forms`, `Morphology (Kruger)`, `Vitality`, `تعداد اسپرم`, `تحرک`, `شکل طبیعی`, and so on. Each one, on a page that has a semen-only marker, must land in `SEMEN_*`, a named `semenQual` row, or `unmapped`. Assert that none ends up in a channel without a reader (N28).
- [X] T034 [P] [US4] In `engine.test.js`, add **M314**: `Spermogram: Abnormal` (and «آنالیز منی: غیرطبیعی») on a male page produces a finding or an unread line that names it. Today it is silent (research §P0-1), so the test must be red first. Add a negative control: a CBC page with `WBC`/`RBC` and no semen marker is unchanged.
- [X] T034b [P] [US4] In `engine.test.js`, add **M316** (SC‑008). A two-page upload — a CBC page (`WBC 7.2`, `RBC 4.8`, `Hb 14`) and a semen page (`Volume 2.5`, `Sperm concentration 40 million/mL`, `WBC 1`, `RBC 0`, `Spermogram: Normal`) — run in both orders. Expect the CBC `WBC`/`RBC` to stay graded blood values, the semen WBC/RBC to be in `semenQual`, and zero rows lost. This extends the existing N25 `semen:` merge-key guard (M104/T18); check that it does not duplicate them.
- [X] T035 [US4] Run the red-first check for M313/M314 against the pre-change `adapter.js`/`patterns_reproductive.js` using the T024 method, and record the result in quickstart.md §4.
- [X] T036 (no-op: the S13 sweep showed every spelling already routes to `SEMEN_*`/`semenQual`; no `SEMEN_KEY` change was needed) [US4] Make M313 green: in `khanesh-server/rules/adapter.js`, extend the `SEMEN_KEY` map only for spellings the sweep found missing. Do not add any number or threshold (P71: names only).
- [X] T037 [US4] Make M314 green: in `khanesh-server/rules/patterns_reproductive.js`, name every `semenQual` text row that no rule reads. Do this either through the existing named-without-verdict path (M116b pattern) or by adding the row to the unread line, with no clinical verdict. Verify that M104c, M104d and M116b are still green.
- [X] T038 [US4] In `khanesh/src/testCatalog.js` (~267), flip `Semen Analysis` from `s(` to `p(`. Then run lint and build.

**Checkpoint**: US4 complete.

---

## Phase 6: Polish & cross-cutting

- [X] T039 Update `MEDICAL_RULES.md`:
  - P68: add «C1 (۲۰۲۶-۱۰-۰۳): هیچ آستانهٔ تأییدنشده‌ای در کد نیست؛ فقط بازه/مرز/واژهٔ چاپ‌شده روی برگه». List rubella 10 IU/mL, ICT 1:16 and TRAb 3× ULN as awaiting approval before any code may use them.
  - P68: replace the drafts with the **final** Persian headline and `must_say` strings, the urgency table (research §P0-5), and the follow-up "`serologyReactive` substring match (`undetected` ⊃ `detected`) — HIV/HBV/HCV — not fixed here".
  - P71: mark the G6PD half as moved to specs/013 and keep the semen half.
  - P69/P70: add a one-line «منتقل‌شده به specs/013».
  - Use the Edit tool (Persian).
- [X] T040 [P] Update `CLAUDE.md`:
  - Add `patterns_serology.js` to the File Structure list.
  - Change the `patterns.js` imported-file count and the rule count to the **re-measured** values from T028 (`RULES.length`), naming the date.
  - Add a Lab Notebook entry **only** if a wrong patient output was corrected (the US4 silent semen row qualifies as an N28 recurrence: add the hash to N28, not a new entry).
- [X] T041 [P] Run `code-reviewer` (agent) on the full diff, checking the engine boundary, N8 raw keys, the contract drift and the Persian strings. Fix every confirmed finding.
- [X] T042 [P] Run `eval-medical-reviewer` (agent) on the diff together with P68/P71. Address each blocker, and record reviewer-only questions in P68 rather than deciding them in code.
- [X] T042b C1 audit: grep the diff of `patterns_serology.js` and the `thyroid` edit for numeric literals. Each one must be a parse/format constant, not a clinical cutoff; list the result in quickstart.md §6.
- [X] T043 Final gate: run `npm test` in `khanesh-server/` (fail 0, quoting the real `ℹ` lines), and `npm run lint` and `npm run build` in `khanesh/`. Then check the rule-id diff (+4 / −0) and the coverage.mjs count (≤ T003). Write the measured numbers into quickstart.md §6. Commit only when the user asks.

---

## Dependencies & execution order

- **Phase 1** (T001–T004) runs first. T002–T004 are [P].
- **Phase 2** (T005, T005b → T006) blocks US2 and US4. T005b (reading the sources) must finish before T006 and before T039 writes P68. **US1 does not depend on Phase 2** and can start right after T003.
- **US1** (T007 → T008 → T008b → T009) is independent and is the MVP.
- **US2**: tests T010–T023b [P] → T024 red-proof → T025 → T026 [P] → T027 → T028 → T029 → T030 → T031 → T032.
- **US4**: T033–T034b [P] → T035 → T036 → T037 → T038. US4 is independent of US2 (it uses different files, apart from `adapter.js` and `engine.test.js`, so if both run, do them in sequence and do not edit both at the same time).
- **Polish** (T039–T043) comes after the stories that are delivered.

### Parallel examples

```text
Phase 1:  T002 ‖ T003 ‖ T004
US2 tests: T010 ‖ T011 ‖ … ‖ T023   (all append to engine.test.js / api-contract.test.js — one writer at a time in practice; [P] = no logical dependency)
US2 impl:  T026 ‖ T027 (names.js vs new file), then T028 → T029
Polish:    T040 ‖ T041 ‖ T042
```

## Implementation strategy

1. **MVP = US1** (T001, T003, T007–T009). It is a frontend-only commit with no clinical risk, and it can ship today.
2. **US2** next. It carries the highest harm (a reactive VDRL, a non-immune rubella in pregnancy and a positive ICT currently read as "normal"). The numbers it uses are pending review in P68, which matches the P67 practice and is flagged in code comments.
3. **US4** last; it is small.
4. Every increment follows the same cycle: re-measure, red-first, implement, full `npm test`, rule-id diff.
