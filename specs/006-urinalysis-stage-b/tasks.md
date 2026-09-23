# Tasks: Urinalysis Stage B (Henry ch.29): crystals, specific gravity, bilirubin/urobilinogen, cells

**Input**: [plan.md](plan.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/engine-output.md](contracts/engine-output.md), [quickstart.md](quickstart.md)
**Tests**: required. Constitution IV: every guard must be observed red on `b9068df` before its fix counts.
All paths are relative to the repo root. Commands run from `khanesh-server/`.

## Phase 1: Setup

- [X] T001 Measure the baseline with `npm test` and record it in specs/006-urinalysis-stage-b/baseline.md
- [X] T002 [P] Save the rule-id set to specs/006-urinalysis-stage-b/ids-before.txt (N16 one-liner)
- [X] T003 [P] Save research probe output to specs/006-urinalysis-stage-b/probe-before.txt, plus a sha of every existing urine fixture's findings to specs/006-urinalysis-stage-b/frozen-before.json

## Phase 2: Foundational (routing and classifiers, blocking every story)

- [X] T004 Write red guards for routing in khanesh-server/rules/engine.test.js:
  - (a) specific gravity reaches `qual`, and never `tests`/`graded`;
  - (b) a crystal or epithelial row with `/hpf` and an unreadable value lands in `unmapped`, not silently in `qual`;
  - (c) bare `Cholesterol 240 mg/dL` and `Uric Acid 6 mg/dL` are still graded as serum (freeze);
  - (d) collision: panels carrying every new key produce byte-identical existing findings (freeze).
- [X] T005 Add to khanesh-server/rules/patterns_utils.js:
  - `sgValue`/`sgState`
  - `isCrystalKey`, `crystalClassOf`, `crystalRoute`, `crystalAxis`
  - `epithelialKind`, `epithelialRoute`
  - `urineBiliState`, `urobilState`, `urineBiliSentence`
  - the P51 constants (`SG_DILUTE_MAX`, `SG_CONCENTRATED_MIN`, `RTEC_UPPER_HPF`, `SQUAMOUS_CONTAM_HPF`)
- [X] T006 Wire routing in khanesh-server/rules/adapter.js: layer 1 consults `crystalRoute`/`epithelialRoute`; new layer 1c sends unitless specific-gravity, crystal and epithelial rows to `qual` or `unmapped`
- [X] T007 Create khanesh-server/rules/patterns_urinalysis.js exporting `RULES_URINALYSIS` (empty), and spread it in khanesh-server/rules/patterns.js

## Phase 3: US3 — Crystals (P2)

- [X] T008 [US3] Write red guards in khanesh-server/rules/engine.test.js:
  - cystine → `this_week` with «طبیعی نیست»;
  - amorphous urates → `routine`, reassuring;
  - calcium oxalate → `routine`, stone possible but not asserted;
  - «Crystals: Not seen» → no finding;
  - an unknown crystal → `unmapped`;
  - one crystal finding per sheet, and the lower class is named.
- [X] T009 [US3] Implement the `urine_crystals` rule in khanesh-server/rules/patterns_urinalysis.js

## Phase 4: US4 — Specific gravity (P2)

- [X] T010 [US4] Write red guards in khanesh-server/rules/engine.test.js:
  - 1.030 → concentrated, `routine`, not called abnormal;
  - 1.003 → dilute, with the unreliable-pads sentence;
  - 1.015 → no finding;
  - `1030` → read as 1.030;
  - unreadable → `unmapped`;
  - concentrated + protein positive → caveat only.
- [X] T011 [US4] Implement the `urine_specific_gravity` rule in khanesh-server/rules/patterns_urinalysis.js

## Phase 5: US5 — Bilirubin/urobilinogen (P3)

- [X] T012 [US5] Write red guards in khanesh-server/rules/engine.test.js:
  - bilirubin +2 alone → `this_week`, «پردازش‌شده»;
  - urobilinogen raised with bilirubin negative → `routine`, red-cell breakdown named;
  - hand-off to a serum owner: exactly one finding, carrying the folded sentence;
  - «Urobilinogen Normal» → no finding.
- [X] T013 [US5] Implement `urine_bilirubin_urobilinogen` in khanesh-server/rules/patterns_urinalysis.js, with owner predicates over the imported rule objects
- [X] T014 [P] [US5] Append `urineBiliSentence(e)` in `bilirubin_pattern` (khanesh-server/rules/patterns_biochem.js), `bilirubin_emergency` (khanesh-server/rules/patterns_biochem_new.js) and `hemolysis_pattern` (khanesh-server/rules/patterns_hematology.js)

## Phase 6: US6 — Cells (P3)

- [X] T015 [US6] Write red guards in khanesh-server/rules/engine.test.js:
  - renal tubular cells 5-10 → `this_week`, with the three-way creatinine clause;
  - renal tubular cells + a tubular cast → one finding;
  - squamous Many → `routine` contamination finding, and every other finding's urgency is unchanged;
  - squamous + `bacteriuria_no_inflammation` → one midstream suggestion;
  - squamous Few → no finding;
  - dysmorphic RBC stays `unmapped` (freeze).
- [X] T016 [US6] Implement `urine_renal_tubular_cells` and `urine_squamous_contamination` in khanesh-server/rules/patterns_urinalysis.js; export `creatClause` from khanesh-server/rules/patterns_urine_casts.js and add the loose-cell sentence to `urine_cast_tubular`
- [X] T017 [US6] Append the squamous sentence to `bacteriuria_no_inflammation` in khanesh-server/rules/patterns_nephrology.js

## Phase 7: Polish

- [X] T018 Run `npm test` (0 fail); save ids-after.txt and probe-after.txt, and confirm the diff against the frozen hashes
- [X] T019 Isolated proof on `b9068df` (archive + junction): only the behavioural guards are red; record it in baseline.md
- [X] T020 [P] Add P51 to MEDICAL_RULES.md: the thresholds, the crystal classes, the specific-gravity correction decision and the exclusions
- [X] T021 [P] Update CLAUDE.md: the N25 recurrence (silent drop of recognised rows), the file-structure line, the rule count and the baseline rows
- [X] T022 Run the medical and code review (eval-medical-reviewer, code-reviewer) and fix every blocking item with a red-first guard
- [X] T023 Print every new or changed Persian string verbatim for the user

## Dependencies

Setup → Foundational (T004–T007) → US3, US4, US5, US6. The four stories are independent, but all of them edit
engine.test.js and patterns_urinalysis.js, so they run sequentially. Polish comes last.
MVP: Foundational + US3 + US4 (routing closes the silent drop on its own).
