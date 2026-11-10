# Tasks: Tumour-Marker Rules from Reference Chapter 20 (specs/020)

**Input**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md),
[contracts/engine-tests-tumor-rows-v2.md](contracts/engine-tests-tumor-rows-v2.md), [quickstart.md](quickstart.md)

**Tests**: the constitution requires them (Principle IV). Each regression test is run against the pre-change tree and
seen red before the change it locks is written.

**Ground rules for every task**:
- Run commands from `khanesh-server/` unless stated otherwise.
- Write Persian only with the Write/Edit tools, Bash or Node `fs`. Never use PowerShell `Set-Content`/`Get-Content`.
- No chapter threshold goes into code (FR-009).
- No frontend file is edited.
- The suite's fail count must stay at the R0 baseline: 1, which is `T15e`, pre-existing.

## Format: `- [ ] T### [P?] [Story?] Description`

---

## Phase 1: Setup

- [X] T001 Re-measure the baseline on the working tree. In `khanesh-server/`, run `npm test 2>&1 | grep -E "^ℹ (tests|pass|fail)"` and `git rev-parse --short HEAD`. Record both, plus the name of every failing test, at the top of a new file `specs/020-tumor-marker-chapter20/snapshots/BASELINE.md`. If anything other than `T15e` fails, stop and report it before continuing.
- [X] T002 [P] Copy the R2 probe from `$TEMP/claude_probe020.mjs` into `specs/020-tumor-marker-chapter20/snapshots/probe-reader.mjs`, keeping its absolute `file:///` imports. Add a sex = `null` run for every case, so that Q5b (calcitonin «Male: < 8.4 Female: < 5» with sex unknown) is covered. Run it and save the output as `specs/020-tumor-marker-chapter20/snapshots/reader-before.txt`.

---

## Phase 2: Foundational (blocks all stories)

- [X] T003 Write `specs/020-tumor-marker-chapter20/snapshots/e2e.mjs`.
  - It runs each quickstart scenario through the real pipeline: `toEngineInput`/the adapter entry used by `server.js`, then `runEngine`, then `serializeGraded` + `tumorMarkerRows` (as at `server.js:363`), then `score.js`.
  - The scenarios are Q1, Q2, Q3, Q4, Q5 (MoM *and* «AFP 35 IU/mL · Total hCG 29000» on a pregnant profile), Q5b, Q6, Q7, Q8, Q9 and Q10.
  - For each scenario it prints, as JSON: the `_engine.tests` rows for the TM keys, `ungraded[key].state`, the findings (`pattern`, `urgency`, `must_say`), the overall urgency, and the score.
  - Use the profile shapes of the existing `tumor_markers.test.js` fixtures. Read that file first and reuse its helper.
- [X] T004 Run T003 on the unchanged tree. Save the output as `specs/020-tumor-marker-chapter20/snapshots/before.json`, and quote, in `BASELINE.md`, the exact current Persian `must_say` line for Q1 (ratio 18 against «> 25») and for Q2 (ratio 30). T024 and T025 quote these.
- [X] T005 Allocate P132 in `MEDICAL_RULES.md` under «در انتظار بازبینی» *before* any code cites it (N37). For now the entry is only its title: «P132 — تومورمارکرهای P77 از خوانندهٔ specs/019 (AFP، B2M، کلسی‌تونین، CgA، PSA کل/آزاد/نسبت)». First run `grep -rnE '\bP132\b' --include=*.md --include=*.js .` from the repo root and confirm it returns nothing.
- [X] T006 Read `context.sex` resolution (open item 2). In `khanesh-server/server.js`, look around lines 150 and 249, and find where `engineOut.context.sex` is set, so you can tell whether profile sex or sheet sex wins when they disagree. Write the answer and its file:line into `BASELINE.md`. If sheet sex wins and `server.js` already writes a sheet/profile conflict sentence, T019 must not fire in that case (one fact, one sentence).

**Checkpoint**: baseline, before-snapshot, P132 title and sex source are all recorded. No code has changed yet.

---

## Phase 3: User Story 2 — printed-range reading for the 7 keys (P2, the MVP code)

**Goal**: AFP, B2M, CALCITONIN, CGA, PSA_TOTAL, PSA_FREE and PSA_RATIO are read by the specs/019 reader. Each gets a row
in `_engine.tests`, and none of them counts in the score. No new clinical text is added.

**Independent test**: Q1–Q5b and Q8–Q10 from [quickstart.md](quickstart.md) pass, and the prenatal fixtures are
byte-identical.

### Tests first (each must be red on the current tree; record the red output in `BASELINE.md`)

- [X] T007 [P] [US2] In `khanesh-server/rules/engine.test.js`, add a test for the real fixed bug (Q1): Free PSA ratio 18 % against «> 25» for a 60-year-old male. Assert that the `PSA_RATIO` row has `verdict:"below"` and `dir:"low"`, and that the `psa_result` `must_say` contains «پایین‌تر از» and not «داخلِ». Write the comment in Persian and name P132. Run `node --test rules/engine.test.js` and confirm it fails.
- [X] T008 [P] [US2] In `khanesh-server/rules/tumor_markers.test.js`, add tests for:
  - Q2: ratio 30 ⇒ `within`;
  - Q3: PSA 4.0 against «< 4.0» ⇒ `above`, `psa_result` urgency `this_week`;
  - Q4: an AFP 7.0 row against «< 7.0» exists in `_engine.tests` with `above`;
  - Q9: calcitonin with no range ⇒ `noref`, `abnormal:null`;
  - Q10: age-banded PSA ⇒ `unreadable`, text «خوانده نشد».

  Confirm all of them fail on the current tree.
- [X] T009 [P] [US2] Add Q8 to `khanesh-server/rules/tumor_markers.test.js`. The score of {PSA 6 «< 4», Hb normal} must equal the score of {Hb normal}. Confirm it fails.
- [X] T010 [P] [US2] Add Q5 and Q5b to `khanesh-server/rules/tumor_markers.test.js` as negative controls:
  - prenatal AFP (MoM, and the IU/mL quad form) produces no TM row;
  - calcitonin with sex-banded text and unknown sex does not pick a band. Assert the state measured in T002.

  These pass on both trees. To show they can fail, temporarily remove the AFP MoM guard in `serology.js:400-405` locally, watch the test go red, then restore the guard. Note this in `BASELINE.md`.
- [X] T011 [US2] Contract invariants test in `khanesh-server/rules/tumor_markers.test.js` (contract v2): for every row with `source:"tumor_marker_printed"` across the T003 panels, `abnormal === null` ⇔ `verdict ∈ {between, noref, unreadable}`, and `name !== key` (except `CEA`).

### Implementation

- [X] T012 [US2] In `khanesh-server/rules/tumor_markers.js`, set `TM_KEYS` to `["CEA","CA125","CA153","CA199","AFP","B2M","CALCITONIN","CGA","PSA_TOTAL","PSA_FREE","PSA_RATIO"]`, and update the header comment to say «specs/020، P132». Change nothing else in the reader.
- [X] T013 [US2] In `khanesh-server/rules/score.js:203`, extend the exemption so that `psa_result` is skipped like `tumor_markers_result`: when `f.explains?.length && f.explains.every((k) => TM_KEYS.has(k))`. Keep the one-line Persian comment citing P132.
- [X] T014 [US2] Confirm that `serology.js` `assayRoute` needs no edit: it already branches on `TM_KEYS.has(abKey)`. Confirm the AFP MoM/IU guard at `serology.js:400` runs *before* `assayRoute`. If either fails, stop and re-plan; do not patch around it.
- [X] T015 [US2] Run `node --test rules/engine.test.js rules/tumor_markers.test.js`. T007–T011 must now pass.
- [X] T016 [US2] Run `npm test`. For any newly red test, diff its output and show that it changed only by one of the research.md R2 rows (N36). Only then update its expectation, and give each updated test a Persian comment citing P132. If a red test is outside R2, stop and bisect.
- [X] T017 [US2] Run `node specs/020-tumor-marker-chapter20/snapshots/probe-reader.mjs > specs/020-tumor-marker-chapter20/snapshots/reader-after.txt` and `node specs/020-tumor-marker-chapter20/snapshots/e2e.mjs > specs/020-tumor-marker-chapter20/snapshots/after.json`. Diff each against its "before". Every difference must be an R2 row or Q8. List the diffs in `BASELINE.md`.

**Checkpoint**: US2 is complete and independently testable.

---

## Phase 4: User Story 3 — context-dependent rules stay silent; additive PSA sex flag (P2)

**Goal**: no chapter rule fires without its input (FR-006). PSA on a female profile gets a flag and one sentence, and its
verdict is not suppressed (FR-007, amended).

**Independent test**: Q6 and Q7 pass, plus a sweep showing that no new sentence appears on any T003 panel other than Q6.

- [X] T018 [P] [US3] In `khanesh-server/rules/tumor_markers.test.js`, add tests for:
  - Q6: PSA 1.2 against «< 4.0» on a female profile ⇒ verdict still `within`, row `sexMismatch:true`, and `psa_result` `must_say` contains the R4 sentence exactly;
  - Q7: the same values on a male profile ⇒ no `sexMismatch`, no sentence;
  - CA 125 on a male profile ⇒ no flag, no sentence.

  Confirm Q6 fails on the current tree.
- [X] T019 [US3] In `khanesh-server/rules/patterns_autoimmune.js` `psaBuild`, push the R4 sentence exactly as written in research.md R4 when `present(st.PSA_TOTAL) || present(st.PSA_FREE) || present(st.PSA_RATIO)` and the engine's sex (the source found in T006) is female. Apply T006's rule for the sheet/profile conflict. **Urgency and headline must not change.** Use the Edit tool only.
- [X] T020 [US3] In `khanesh-server/rules/tumor_markers.js` `tumorMarkerRows`, add `sexMismatch: true` to `PSA_*` rows under the same condition, read from `engineOut.context.sex` (Persian «زن», as at `server.js:150`). It never alters `abnormal/dir/fa/verdict`.
- [X] T021 [US3] Silence sweep (FR-006/SC-004): add a test in `khanesh-server/rules/tumor_markers.test.js` that runs every T003 panel and asserts that no `must_say` contains any of «عود», «پروستاتکتومی», «RMI», «Lewis-منفی» (new), «نیمه‌عمر» or «پیوند». This proves that no chapter rule leaked into code. Exception: the existing `TM_CONTEXT.CA199` Lewis sentence predates this feature, so exclude that exact string and leave a comment saying so.
- [X] T022 [US3] Re-run `npm test` and the T017 commands. The only new diffs allowed are Q6. Update `BASELINE.md`.

---

## Phase 5: User Story 1 — chapter claims recorded against raw text (P1; blocked in part)

**Goal**: every claim in the extraction is listed together with the engine input it needs and its verification
state. Nothing is shown as verified without the raw text.

**Independent test**: open `MEDICAL_RULES_TUMOR_MARKERS.md` §6 and check:
- 40 rules are listed, and each has a needed-input column and a state;
- 7 contradictions are listed;
- the R5 gap table is present;
- no row reads "verified".

- [X] T023 [P] [US1] Append `## ۶. فصلِ ۲۰ (specs/020، P132) — استخراجِ ثانویه، تأییدنشده` to `MEDICAL_RULES_TUMOR_MARKERS.md`. Use the Edit tool, or Bash `cat >>`; never PowerShell. The section contains:
  - (a) one line naming the source as "NotebookLM extraction of chapter 20; book/edition not given; raw text not opened";
  - (b) a table of the 40 IF-THEN rules from the user's extraction, with the columns: number | marker | rule in short | threshold | input the engine lacks (prior value, surgery/treatment state, symptom, imaging, histology, Lewis phenotype, gestational age, or «—») | state = «ثانویه، تأییدنشده»;
  - (c) the 7 source contradictions from the extraction §4, verbatim in meaning, each marked «باز»;
  - (d) the research.md R5 gap table;
  - (e) the candidate new keys (thyroglobulin, HE4, NSE, CYFRA 21-1, SCCA, ProGRP, S100, inhibin A/B, PLAP), each with «نیاز به املای برگهٔ واقعی + قاعدهٔ مالک»;
  - (f) «CA 125 در مرد: پرچم نمی‌خورد (R4)؛ تصمیمِ بازبین».
- [ ] T024 [US1] **BLOCKED until the user supplies the raw chapter text, book title and edition.** For each row of §6(b) and each threshold table row, find the raw sentence. Set its state to «تأییدشده» (quote the raw sentence and page), «اصلاح‌شده» (state the difference), or «یافت نشد». Only after this may any row be proposed for code, and that is a separate feature behind a reviewer decision. Until then, report FR-001/SC-001 as "not started (blocked)" and never as done.

---

## Phase 6: User Story 4 — reviewer register and the single commit (P3)

**Goal**: one commit carries the code, the P132 entry and the tests, and a reviewer can read every behaviour change
without opening the code.

- [X] T025 [US4] Fill the P132 entry in `MEDICAL_RULES.md` (Edit tool). It must contain:
  - the proposal (the 7 keys go through the specs/019 reader; the score exemption covers `psa_result`; the PSA-in-female sentence, quoted verbatim);
  - the patient impact, quoted from the `before.json`/`after.json` diff (T017/T022), not from research.md;
  - the reviewer decisions needed: (1) PSA 4.0/AFP 7.0 boundary ⇒ `this_week`; (2) PSA and AFP etc. leave the score; (3) **P106**: PSA ≥ 20 without a printed range stays `this_week` but no longer affects the score; (4) the wording of the mismatch sentence; (5) whether CA 125 in a man should be flagged;
  - a cross-reference to `MEDICAL_RULES_TUMOR_MARKERS.md` §6.
- [X] T026 [US4] Append a Lab Notebook entry to `CLAUDE.md`, after N48, using the Edit tool, so ZWNJ characters are preserved. Title: «N49 — نسبتِ Free PSA وارونه خوانده می‌شد». Include:
  - the commit placeholder «(commit: this change)»;
  - what happened: the T004 quoted text for ratio 18 against «> 25» (shown as inside the range);
  - the cause: `abVerdict` reads «> N» as a positive-above cut-off for every assay;
  - the generalising rule: «"> N" روی یک نسبت/درصد حدِ پایینِ طبیعی است، نه مرزِ مثبت‌شدن؛ خواننده‌ای که برای آنتی‌بادی نوشته شده را روی غلظت/نسبت به‌کار نبر».
- [X] T027 [US4] Diff the rule-id set (Principle IV). Run `node -e "import('file:///C:/Users/surface/Desktop/khanesh-project/khanesh-server/rules/patterns.js').then(m=>console.log(m.RULES.map(r=>r.id).sort().join('\n')))"` on the before tree (`git stash` is NOT allowed because the tree is shared; use `git archive HEAD khanesh-server | tar -x -C <tmp>` plus a `node_modules` junction) and on the working tree. The two sets must be identical. Record the result in `BASELINE.md`.
- [X] T028 [US4] Stage only this feature's files. Run `git add` on `khanesh-server/rules/tumor_markers.js`, `khanesh-server/rules/score.js`, `khanesh-server/rules/patterns_autoimmune.js`, `khanesh-server/rules/tumor_markers.test.js`, `khanesh-server/rules/engine.test.js`, any test files updated in T016, `MEDICAL_RULES.md`, `MEDICAL_RULES_TUMOR_MARKERS.md`, `CLAUDE.md` (only the N49 hunk: use `git add -p`, because `CLAUDE.md` already has unrelated uncommitted edits) and `specs/020-tumor-marker-chapter20/`. Then confirm with `git diff --cached --stat`.
- [X] T029 [US4] Commit. The pre-commit hook runs `npm test` on the index; `SKIP_HOOKS` is never used. The message is in Persian, in the repo's style, for example «feat(tumor-markers): AFP/B2M/کلسی‌تونین/CgA/PSA از خوانندهٔ specs/019 + نسبتِ Free PSA وارونه (specs/020, P132)», and it ends with the attribution line. If the hook fails only on `T15e`, stop and report: do not bypass. Do not push.

---

## Phase 7: Polish

- [ ] T030 Measure the committed tree. Extract it with `git archive HEAD khanesh-server` into a temp dir with a `node_modules` junction, run `node --test` there, and report tests/pass/fail plus the commit hash in the final report.
- [ ] T031 Update `specs/020-tumor-marker-chapter20/checklists/requirements.md` and `MEDICAL_RULES_TUMOR_MARKERS.md` §5 (open question 4 now points to §6). Report FR-001/SC-001 as blocked, and give the R4 sentence verbatim in the report.

---

## Dependencies

```text
Phase 1 (T001–T002) → Phase 2 (T003–T006) → US2 (T007–T017) → US3 (T018–T022) ─┐
                                             US1 T023 (independent; can run any time after T005) ┤
                                                                                  └→ US4 (T025–T029) → Polish (T030–T031)
US1 T024 is BLOCKED on external input and does not block US4.
```

- US3 depends on US2 because both edit `tumor_markers.js` and the tests, and US3 needs PSA in `TM_KEYS` for rows.
- US4 needs US2, US3 and T023 complete, because the commit is one unit (N37: register entry and behaviour together).

## Parallel opportunities

- T002 ∥ T001.
- T007 ∥ T008 ∥ T009 ∥ T010 (different test blocks; `engine.test.js` and `tumor_markers.test.js` are separate files, but T008–T010 share `tumor_markers.test.js`, so write them sequentially if one session does all three).
- T023 ∥ any task of Phase 3/4 (different file).

## Implementation strategy

- **MVP = US2 (T001–T017)**: it fixes the inverted free-PSA verdict and adds rows for 7 keys. It is still uncommitted at that point, because it must ship together with T025.
- **Then US3**, then US1 T023.
- **Then the single commit (US4).**
- **US1 T024 is a later session**, once the raw text is supplied.
