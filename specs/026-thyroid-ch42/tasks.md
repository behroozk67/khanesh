# Tasks: Thyroid Disorders (Tietz ch. 42): gaps only

**Input**: [spec.md](spec.md) · [plan.md](plan.md) · [research.md](research.md) · [data-model.md](data-model.md) · [contracts/findings.md](contracts/findings.md) · [quickstart.md](quickstart.md)

**Tests**: Required. FR-010 says each new behaviour needs a regression test, and that test must fail on `HEAD` `0935e85` (N10). Every test goes in `khanesh-server/rules/p144.test.js` with Persian comments, in the shape of `p143.test.js`.

**Paths**: these are relative to the repo root. Commands run from `khanesh-server/`.

**Persian text**: write it with Write, Edit or Bash heredoc only. Never use PowerShell `Get-Content` or `Set-Content` (N15).

## Phase 1: Setup

- [X] T001 Measure the baseline. On a `git archive HEAD khanesh-server` tree with `node_modules` linked by `mklink /J`, run `npm test`. Record pass/fail/total in `specs/026-thyroid-ch42/quickstart.md` §1, and name every pre-existing failure.
- [X] T002 Record the rule ids before any change. Run `node -e "import('./rules/patterns.js').then(m=>console.log(m.RULES.map(r=>r.id).sort().join('\n')))"` and write the output to `specs/026-thyroid-ch42/snapshots/ids_before.txt`.
- [X] T003 Confirm that `specs/026-thyroid-ch42/snapshots/before.txt` is reproducible. Re-run `probe_ch42.mjs` on the clean tree and diff it against `before.txt`. The diff must be empty.

## Phase 2: Foundational (blocking)

- [X] T004 Create `khanesh-server/rules/p144.test.js`.
  - Add a local `run(tests, patient)` helper that calls `runEngine` then `runPatterns`, the same way `p143.test.js` does.
  - Add a `textOf(pattern)` helper.
  - Write no assertions yet.
- [X] T005 Allocate P144 in `MEDICAL_RULES.md`: add a stub heading after P143, «### P144 — تیروئید (Tietz فصلِ ۴۲، specs/026): فقط شکاف‌ها (۲۰۲۶-۱۱-۱۳) — در حالِ پیاده‌سازی». Its body is filled in T036 (N37).

**Checkpoint**: the harness exists. Every story phase below follows the same loop: write tests → see them go red on `HEAD` → implement → see them go green.

## Phase 3: User Story 1, known hypothyroidism reads TSH as a dose check (P1) 🎯 MVP

**Goal**: with `hypothyroid` active, a low or high TSH gets C1/C2, and TPO gets C5. Without the condition, the output is byte-identical.

**Independent test**: the T4 probe panels (`hypo-cond tsh 0.2 / 8 / 14 / 2 / tpo high`) against the same panels with no condition.

### Tests

- [X] T006 [US1] In `khanesh-server/rules/p144.test.js`, add tests R1a–R1g.
  - **R1a** — `hypothyroid` + TSH 0.2 + FT4 1.6. Expect:
    - `thyroid_hyper_subclinical`;
    - text contains «اگر لووتیروکسین» and «0.2»;
    - text does not contain «شایع‌ترین علت آن بیماری خودایمنی گریوز است»;
    - urgency `routine`;
    - `applied_conditions` includes `hypothyroid`.
  - **R1b** — `hypothyroid` + TSH 0.05 + FT4 1.3. Expect «کمتر از ۰٫۱», and no C4 sentence stacked on it.
  - **R1c** — `hypothyroid` + TSH 8 + FT4 1.0. Expect:
    - text contains «دوزِ فعلی کافی نیست»;
    - text does not contain «اغلب فقط پیگیری»;
    - urgency `routine`.
  - **R1d** — `hypothyroid` + TSH 14 + FT4 1.0. Expect «خیلی بالاتر», and no C3 sentence («حدی است که پزشکان معمولاً»).
  - **R1e** — `hypothyroid` + TSH 2. Expect no `thyroid` finding.
  - **R1f** — `hypothyroid` + TPO 60 (<34) + TSH 2. Expect «همان علتِ کم‌کاریِ شماست», and not «به کم‌کاری تیروئید می‌انجامد».
  - **R1g** — panels R1a/R1c with no condition must produce `must_say` byte-identical to `before.txt`.
- [X] T007 [US1] Update M280 in `khanesh-server/rules/engine.test.js` (line ~12305). The expected active set becomes `["cancer","dialysis","dm2","hospitalized","hypothyroid"]`, with the comment «P144: کم‌کاری تیروئید فعال شد (فقط متن)».
- [X] T008 [US1] Prove T006 and T007 are red on `HEAD`. Copy only `p144.test.js` into the T001 archive tree, run `node --test rules/p144.test.js`, and record which tests fail.

### Implementation

- [X] T009 [US1] Add `"hypothyroid"` to `ACTIVE_CONDITIONS` in `khanesh-server/rules/conditions.js`. Update the comment above the set to name P144.
- [X] T010 [US1] Add the helper `knownHypothyroid(e)` near `thyroidCancerContext` in `khanesh-server/rules/patterns_endocrine_rheum.js`. It returns `!!e.conditions?.includes("hypothyroid")`. It does not depend on pregnancy (research D1).
- [X] T011 [US1] Change the `tshLow` branch of `thyroid` in `khanesh-server/rules/patterns_endocrine_rheum.js` (line ~308).
  - When `knownHypothyroid(e)`:
    - build `must_say` from contract C1, adding the < 0.1, FT4-high and FT4-missing clauses;
    - set the headline to «TSH شما پایین‌تر از حد طبیعی است»;
    - set `applied_conditions: ["hypothyroid"]`;
    - keep `urgency`, `action`, `warnings`, `suggest` and `key_number` unchanged.
  - The path without the condition is unchanged.
- [X] T012 [US1] Change the `tshHigh` branch of `thyroid` in the same file (line ~239).
  - When `knownHypothyroid(e)`:
    - replace the explanatory sentence and the overt/subclinical/missing sentence with contract C2;
    - make the FT4 clause three-state, and add «خیلی بالاتر» at TSH ≥ `TSH_ENDO_REFER`;
    - keep the T3, TPO, `secondaryHits` and pregnancy clauses in their current order;
    - set `applied_conditions: ["hypothyroid"]`;
    - keep urgency and action unchanged.
- [X] T013 [US1] Under `knownHypothyroid(e)`, swap two tails in the same file:
  - the `thyroid_tpo_positive` tail (line ~350) becomes contract C5;
  - in `thyroidWithAntibodies` (line ~767), `tail` loses «اغلب فقط پیگیریِ دوره‌ای لازم است».
  - Add `applied_conditions: ["hypothyroid"]` to both findings.
- [X] T014 [US1] Run `node --test rules/p144.test.js rules/engine.test.js`. R1a–R1g and M280 must pass.

**Checkpoint**: US1 is complete. The T4 panels match quickstart §2.

## Phase 4: User Story 2, a clearly high or suppressed TSH is not "mild" (P1)

**Goal**: with FT4 normal and no condition, TSH ≥ 10 gets C3 and TSH < 0.1 gets C4. Urgency is unchanged.

**Independent test**: probe panels T2 (9.9 / 10 / 14) and T3 (0.05 / 0.2).

- [X] T015 [US2] In `khanesh-server/rules/p144.test.js`, add tests R2a–R2f.
  - **R2a** — TSH 10 + FT4 1.1. Expect C3 text, without «اغلب فقط پیگیری» or «خفیف».
  - **R2b** — TSH 9.9. Expect `must_say` equal to `before.txt`.
  - **R2c** — TSH 0.099 + FT4 1.3. Expect C4 text, without «خفیف».
  - **R2d** — TSH 0.1. Expect today's text.
  - **R2e** — the urgency of R2a and R2c is `routine`.
  - **R2f** — a 9-year-old with TSH 12 + FT4 normal also gets C3: it is already abnormal against 0.5–5.0.
  - Prove all of them red on `HEAD`, in the same way as T008.
- [X] T016 [US2] In the `tshHigh` subclinical branch (`!overt && !ft4Missing && !knownHypothyroid`) of `khanesh-server/rules/patterns_endocrine_rheum.js`, select the sentence by `Number(tsh.value) >= TSH_ENDO_REFER`: C3, or today's mild sentence.
- [X] T017 [US2] In the `tshLow` subclinical branch, select the sentence by `Number(tsh.value) < TSH_SUPPRESSED`: C4, or today's sentence.
- [X] T018 [US2] Run `node --test rules/p144.test.js` and get it green.

## Phase 5: User Story 3, thyroglobulin is read, never dropped (P2)

**Goal**: route `THYROGLOBULIN` as quote-only, keep the cancer context, write the three-state anti-Tg sentences, and leave the score unchanged.

**Independent test**: the T7 panels, including `nocond`, and `healthScore` with and without Tg.

- [X] T019 [US3] In `khanesh-server/rules/p144.test.js`, add tests R3a–R3h.
  - **R3a** — «Thyroglobulin 2.5 ng/mL» alone. Expect:
    - finding `thyroid_thyroglobulin`;
    - text contains «2.5» and «آزمایشِ تشخیصِ سرطان نیست»;
    - `e.unmapped` has no thyroglobulin;
    - urgency `routine`.
  - **R3b** — Tg + anti-Tg 150 (<115) with `cancer`. Expect the Tg sentence, followed by the unchanged anti-Tg cancer sentence («کاذب پایین»).
  - **R3c** (FR-004a) — Tg 0.2 + anti-Tg 150 (<115) with **no condition**. Expect:
    - text contains «در پیگیریِ پس از درمانِ سرطانِ تیروئید»;
    - text does not contain «هاشیموتو» or «اغلب فقط پیگیری».
  - **R3d** — Tg + anti-Tg «Negative». Expect «بعید است».
  - **R3e** — Tg alone. Expect `suggest` to include «آنتی‌بادی ضد تیروگلوبولین (Anti-Tg)».
  - **R3f** — «Anti-Tg» alone is never read as thyroglobulin, and «TG 150 mg/dL» stays triglyceride.
  - **R3g** — `healthScore` of a clean CBC sheet is equal with and without a Tg row.
  - **R3h** — the text contains no forbidden word from contract C7 («تومور ندارید», «پاک», «درمان شده‌اید»).
  - Prove R3a, R3c and R3e red on `HEAD`. R3c is green on `HEAD`; it is a lock against regression, so record that.
- [X] T020 [US3] In `khanesh-server/rules/serology.js` (line ~496):
  - after the `abKey` block, so that `ANTI_TG_RE` wins first, add a branch for `THYROGLOBULIN_RE`;
  - extend that regex with `thyroglobulintg`;
  - a numeric value (including censored `<x`) returns `{ to: "assay", key: "THYROGLOBULIN", value, cmp, shown, unit: printedUnit(t), state: "quoted", raw, reference }`;
  - a non-numeric value returns `{ to: "unmapped" }`;
  - never call `abVerdict` (N49).
- [X] T021 [US3] In `khanesh-server/rules/patterns_endocrine_rheum.js`:
  - `thyroidCancerContext` adds `|| e.ungraded?.THYROGLOBULIN?.reason === "assay_printed"`;
  - add the helper `thyroglobulinSentence(e)`, built from contract C7 with the three anti-Tg states. It lives **outside** `build` (N56 `RULE_READS`).
- [X] T022 [US3] In the same file:
  - `thyroid.match` adds `|| !!e.ungraded?.THYROGLOBULIN`;
  - `thyroidWithAntibodies` treats Tg as present;
  - with an abnormal core, append `thyroglobulinSentence` before the anti-Tg text;
  - with no abnormal core and no notable antibody, return pattern `thyroid_thyroglobulin` with the C7 headline, action and urgency `routine`;
  - with a notable antibody and no abnormal core, keep `thyroid_antibody_positive`, with the Tg sentence first.
- [X] T023 [P] [US3] Add `THYROGLOBULIN: "تیروگلوبولین"` to `FA_NAMES` in `khanesh-server/rules/names.js`.
- [X] T024 [P] [US3] Add a `SUGGEST_TESTS` row for «آنتی‌بادی ضد تیروگلوبولین (Anti-Tg)» in `khanesh-server/rules/patterns.js` if it is not already there.
- [X] T025 [US3] Run R3g. If the score drops, add an exemption in `khanesh-server/rules/score.js` next to line 216: a `thyroid` finding whose `explains` all sit in `{THYROGLOBULIN, ANTI_TG, TRAB}`. Re-run until green.
- [X] T026 [US3] Run `node --test rules/p144.test.js rules/serology.test.js rules/score.test.js` and get it green.

## Phase 6: User Story 4, pregnancy and thyroid antibodies (P2)

**Goal**: when `pregnant === true`, TPO or anti-Tg is high or positive, and TSH is not abnormal, the C6 tail replaces «اغلب فقط پیگیری».

- [X] T027 [US4] In `khanesh-server/rules/p144.test.js`, add tests R4a–R4d.
  - **R4a** — pregnant + TPO 60 (<34) + TSH 2. Expect C6 text, without «اغلب فقط پیگیری».
  - **R4b** — not pregnant, same panel. Expect `before.txt` text.
  - **R4c** — pregnant + anti-Tg 150 (<115) + TSH 2. Expect C6.
  - **R4d** — pregnant + `hypothyroid` + TPO. Expect C5 followed by C6.
  - Prove all of them red on `HEAD`.
- [X] T028 [US4] In `khanesh-server/rules/patterns_endocrine_rheum.js`:
  - add the C6 tail to `thyroid_tpo_positive`, and to the `thyroidWithAntibodies` antibody-only `tail`;
  - gate it on `e.pregnant === true`;
  - when both condition and pregnancy apply, emit C5 then C6;
  - leave urgency unchanged.

## Phase 7: User Story 5, newborn timing sentence (P3)

**Goal**: a TSH graded high on the `< 3 days` paediatric row gets C8 and nothing else.

- [X] T029 [US5] In `khanesh-server/rules/p144.test.js`, add tests R5a–R5c.
  - **R5a** — age 2/365 + TSH 20. Expect:
    - text contains «روزِ ۳ تا ۵»;
    - text does not contain «طبیعی است» or «فیزیولوژیک»;
    - urgency `soon`, unchanged.
  - **R5b** — age 10/365 + TSH 20. Expect no C8.
  - **R5c** — age 2/365 + TSH 10, which is within 5.2–14.6. Expect no finding.
  - Prove R5a red on `HEAD`.
- [X] T030 [US5] In the `tshHigh` branch of `khanesh-server/rules/patterns_endocrine_rheum.js`:
  - append C8 when `getPedRef("TSH", e.age)?.maxAge` equals the `D(3)` row bound. Import what is needed from `refs_ped.js`; do not recompute an age literal.
  - This applies to both the condition and no-condition paths.

**Checkpoint (commit 1)**: US1–US5 are done.

- [X] T031 Run `node ../specs/026-thyroid-ch42/snapshots/probe_ch42.mjs > ../specs/026-thyroid-ch42/snapshots/after_us1-5.txt` and diff it against `before.txt`. Every changed panel must be listed in quickstart §2. Any other diff is a bug.
- [X] T032 Run the full `npm test`. The failures must equal the T001 set. `node --test rules/metamorphic.test.js` must be green with no new `ALLOWED_DROPS`.
- [X] T033 Check rule ids. Write the current ids to `specs/026-thyroid-ch42/snapshots/ids_after.txt` and diff it against `ids_before.txt`. The diff must be empty (N16).
- [X] T034 For every probe panel carrying Tg, `unmatched_abnormal` must be absent.
- [X] T035 Write a contract drift section at the end of `specs/026-thyroid-ch42/contracts/findings.md`, quoting the implemented strings if they differ from C1–C8.
- [X] T036 Fill the P144 body in `MEDICAL_RULES.md`:
  - decisions D1–D5;
  - the conditional wording rule;
  - reviewer questions: TSH ≥ 10 urgency, the TSH upper limit, a dedicated levothyroxine condition;
  - cross-references to P68, P72, P119, P136 and P143;
  - the list of tests.
- [X] T037 Commit 1: «feat(rules): P144 Tietz فصل ۴۲ — کم‌کاریِ ثبت‌شده، TSH ≥۱۰/<۰٫۱، تیروگلوبولین، بارداری، نوزاد». Stage only the touched files, plus `specs/026-thyroid-ch42`. Never `.impeccable`. The pre-commit hook must pass without `SKIP_HOOKS`.

## Phase 8: User Story 6, TSH fallback lower limit 0.4 (P3, commit 2)

**Goal**: with no printed range, an adult TSH of 0.4–0.49 is normal. Every other diff is only the range string.

- [X] T038 [US6] In `khanesh-server/rules/p144.test.js`, add tests R6a–R6d.
  - **R6a** — adult TSH 0.45 with no printed range. Expect no `thyroid` finding.
  - **R6b** — TSH 0.39. Expect `thyroid_hyper_subclinical`.
  - **R6c** — TSH 0.40. Expect normal (edge inclusive, like `refs.js` treats 0.5 today).
  - **R6d** — a printed «0.5-4.5» with TSH 0.45 is still low (printed range wins).
  - Prove R6a and R6c red.
- [X] T039 [US6] Change `TSH.both` from `[0.5, 4.5]` to `[0.4, 4.5]` in `khanesh-server/rules/refs.js`. Update the comment to cite P144, Tietz pp. 820/825 and the Iranian kit inserts.
- [X] T040 [P] [US6] Change `tsh.range` `low` from 0.5 to 0.4 in `khanesh/src/labRefs.js`, and update the TSH row in `docs/reviews/REF_DIFF.md`.
- [X] T041 [US6] N23 sweep. Run `grep -n '"TSH"' khanesh-server/rules/*.js` and list every `dir === "low"` or `lln` reader. Probe the adult values 0.39 / 0.40 / 0.45 / 0.50 and the paediatric rows (unchanged).
- [X] T042 [US6] Run `probe_ch42.mjs > after.txt` and diff it against `after_us1-5.txt`. Only `0.5–4.5` → `0.4–4.5` may change, plus T1 tsh 0.45 noref losing its finding. Then run the full `npm test`, metamorphic, and `npm run lint` in `khanesh/`.
- [X] T043 [US6] Add US6 to the P144 entry in `MEDICAL_RULES.md`. Commit 2: «fix(refs): P144 کفِ TSHِ بزرگسال ۰٫۵ ⇒ ۰٫۴ (کیت‌های رایجِ ایران، Tietz)».

## Phase 9: Polish

- [X] T044 Run the `code-reviewer` agent on commits 1 and 2. Fix confirmed findings in a follow-up commit, with a test for each one.
- [X] T045 If a review or probe corrected wrong output, append a Lab Notebook entry (N58) to `CLAUDE.md`.
- [ ] T046 Deploy from a clean `git worktree` of `HEAD`. Use the procedure in memory `reference-deploy-server`. Then `curl` `/api/health`, and run one live analyze probe with TSH 14 + FT4 1.1. Do not push.

## Dependencies

- Phase 1 → Phase 2 → stories.
- US1 → US2: both edit the same `tshHigh` and `tshLow` branches, so they run sequentially in one file.
- US3 can start right after Phase 2. It touches `serology.js` and the antibody wrapper, so it is independent of US1/US2 except for T013's tail edit. Do T013 before T022, or merge the two carefully.
- US4 depends on T013 (shared tails).
- US5 depends on T012 (`tshHigh` branch).
- US6 runs strictly after T037 (commit 1).
- Polish runs last.

## Parallel opportunities

- T023 and T024 can run alongside T020–T022, because they are different files.
- T040 can run alongside T039.
- All tests share `p144.test.js`, so they are written sequentially.

## Implementation strategy

- **MVP**: US1 + US2, which covers the most common thyroid sheet in Iran.
- **Then**: US3, the patient-safety piece for the cancer context, then US4 and US5. All of them land in commit 1.
- **Last**: US6 alone, in commit 2, so its range-string noise cannot hide a regression.
