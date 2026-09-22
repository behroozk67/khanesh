---

description: "Task list for Urinalysis Interpretation — Stage A"
---

# Tasks: Urinalysis Interpretation — Stage A

**Input**: Design documents from `/specs/005-urinalysis-rules/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md),
[data-model.md](data-model.md), [contracts/engine-output.md](contracts/engine-output.md),
[quickstart.md](quickstart.md)

**Scope**: **Stage A only** — User Story 1 (casts) and User Story 2 (dipstick-versus-microscope
cross-checks). User Stories 3–6 are Stage B and have no tasks here. Do not start Stage B until T041
has been completed and recorded.

**Tests**: **Required, not optional.** The spec's `SC-007` requires every new rule to be covered by a
test that fails against the engine as it stands today, and the constitution's Principle IV makes a
red-first test the merge gate. Every guard below is written *before* its implementation and must be
**observed red** on the pre-fix code, except the tasks explicitly marked **freeze** — those assert
that nothing changed and must be observed **green** on the pre-fix code.

**Organization**: Foundational work (the misread fix) blocks both stories, because the white-cell and
red-cell cross-checks (US2) read cell counts through the same corrected lookups that US1 depends on
(data-model V11).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: US1 or US2
- All paths are relative to the repo root. Run every `node`/`npm` command from `khanesh-server/`.

## Conventions every task inherits

- **IDs are fixed here, not chosen during implementation.** They are part of the contract
  ([engine-output.md](contracts/engine-output.md)): new rule ids appear in `_engine.patterns`.
  - Rule ids: `urine_cast_rbc`, `urine_cast_wbc`, `urine_cast_tubular`, `urine_cast_waxy_broad`,
    `urine_cast_fatty`, `urine_cast_granular`, `urine_cast_hyaline`, `urine_esterase_without_cells`.
  - Each finding's `pattern` field equals its rule id.
  - Guard ids: `M164`–`M168d` (the last guard in the suite today is `M163`, measured).
  - Register id: `P50` in `MEDICAL_RULES.md` (the last is `P49`, measured).
- **Persian only in patient text.** Write it with the Write/Edit tools or Bash/Node — **never** with
  PowerShell 5.1 `Get-Content`/`Set-Content`/`Add-Content`/`Out-File` (CLAUDE.md N15(d)). No cast
  or crystal name in Latin where a Persian name exists; «سیلندر» is the lab term Iranian sheets use
  for a cast, with the type in Persian after it («سیلندرِ گلبولِ قرمز»).
- **Every new finding's `action` is derived from its `urgency`**, never written beside it (N20). Use a
  module-local `actionFor(urgency, { week, routine })` — the codebase keeps a private copy of this
  helper in each module that needs it (`patterns_cardiac.js:33`, `patterns_hematology.js:13`,
  `patterns_mineral_bone.js:192`); follow that convention, do not refactor it into a shared export.
- **No new rule may emit `emergency`**, and none may use `urgency: "none"` (no rule in the engine does;
  data-model §3 correction).
- **No finding names a diagnosis as established** (`FR-026`). «به … اشاره دارد» / «می‌تواند نشانهٔ … باشد»,
  never «شما … دارید».
- **Thresholds are provisional until `P50` is approved.** Put each in a named constant with a comment
  pointing at `P50`, so the reviewer's decision is a one-line change:
  `HYALINE_CAST_UPPER_LPF = 2`, `URINE_RBC_UPPER_HPF = 2`, `URINE_WBC_UPPER_HPF = 5`.

---

## Phase 1: Setup — measure before touching anything

**Purpose**: Constitution Principle III. Every number this feature later reports is a delta against
figures captured here, on a named tree.

- [X] T001 Measure the test baseline on the working tree: run `npm test 2>&1 | tail -8` in `khanesh-server/` and record the `tests · pass · fail · todo` line, the `git rev-parse --short HEAD` value, and today's date in `specs/005-urinalysis-rules/baseline.md`. State explicitly that it is the **working tree** on that commit. Do not copy any figure from `CLAUDE.md`.
- [X] T002 [P] Capture the rule-id set: `node -e "import('./rules/patterns.js').then(m=>console.log(m.RULES.map(r=>r.id).sort().join('\n')))" > ../specs/005-urinalysis-rules/ids-before.txt` from `khanesh-server/`, and append its line count to `specs/005-urinalysis-rules/baseline.md` (expected 121 — if it is not 121, record the real figure and note the discrepancy; do not proceed on the assumption).
- [X] T003 [P] Reproduce both defects: extract the `probe-casts.mjs` block from `specs/005-urinalysis-rules/quickstart.md` §1 into the session scratchpad (never under `khanesh-server/`), run it with `khanesh-server/` as the working directory, and save its output to `specs/005-urinalysis-rules/probe-before.txt`. It must match quickstart §1's "Expected on the pre-fix tree" block line for line. **If it does not, stop** and report the difference — every red-first guard below depends on these five panels reproducing.
- [X] T004 [P] Capture the freeze corpus: write a scratch script that runs the four negative-control panels from `quickstart.md` §4 **plus** the X1 "agrees" panel (full urine sheet + `Blood +2` + `RBC 20-30 /hpf`) through `runEngine` → `runPatterns`, and writes each panel's complete `findings` array (every field, full text) to `specs/005-urinalysis-rules/frozen-before.json`. Use Node's `fs.writeFileSync(..., JSON.stringify(x, null, 2), "utf8")` — the output contains Persian.

**Checkpoint**: baseline, id set, probe output and freeze corpus all saved under `specs/005-urinalysis-rules/`, each naming the tree it came from.

---

## Phase 2: Foundational — the misread fix (blocks US1 and US2)

**Purpose**: `FR-004a`, `FR-004b`; data-model V1–V3, V6. After this phase a cast row can no longer be
counted as a loose cell by any existing rule. It does **not** yet produce a cast finding — that is US1.
So at the end of this phase, probes D1 and D2 fire nothing, which is correct and intermediate.

### Guards for the foundation — write first, observe red

- [X] T005 Add guard `M164` to `khanesh-server/rules/engine.test.js`: on probe **D1** (no urine-page markers; `Nitrite Negative · WBC 2-3 /hpf · RBC Casts 5-8 /lpf`), assert that no finding has `pattern === "hematuria"`. Persian comment above it: what the patient read before the fix (quote the headline) and why it was wrong. Run `node --test rules/engine.test.js` and confirm `M164` is **red**.
- [X] T006 Add guard `M164b` in `khanesh-server/rules/engine.test.js`: on probe **D2** (full urine sheet + `Leukocyte Casts 8-10 /lpf` + `WBC 2-3 /hpf`), assert that no finding has `pattern === "uti_likely"`. Confirm **red**.
- [X] T007 Add guard `M164c` in `khanesh-server/rules/engine.test.js` — the exclusion is total: for each of `RBC Casts`, `WBC Casts`, `Leukocyte Casts`, `Granular Casts`, `Epithelial Casts`, `سیلندر گلبول قرمز`, placed in `e.qual` with value `"8-10"` and **no** loose-cell row, assert `urineCellCount(e, /rbc|گلبول\s*قرمز/i)`, `urineCellCount(e, /wbc|puscell|پوسسل|leukocyt/i)` and `urinePositive(e, /leukocyte|استراز|esterase/i)` all return `null`/`false`. Build `e` directly as `{ qual: {...}, graded: [] }` — this guard tests the helpers, not the adapter. Confirm **red** (at least the RBC and Leukocyte rows). **Added during implementation (baseline.md § Deviation):** also add guard `M164e` — the esterase pad row is not a cell count: `urineCellCount({qual:{"Leukocyte Esterase":"+1","Urine WBC":"8-10"}}, WBC_RE)` returns 10 (not 1), `urineCellCount({qual:{"Leukocyte Esterase":"+2"}}, WBC_RE)` returns `null` (not 2), and the full urine sheet + `LE +1 · WBC 8-10 /hpf` fires `uti_likely`. Confirm **red**.
- [X] T008 Add **freeze** guard `M164d` in `khanesh-server/rules/engine.test.js`: load `specs/005-urinalysis-rules/frozen-before.json`, re-run each of its panels, and assert the `findings` array is deep-equal to the frozen one. Confirm **green** on the pre-fix code. (If it is red before the fix, the fixture is wrong, not the engine.)

### Implementation

- [X] T009 In `khanesh-server/rules/patterns_utils.js`, add and export `isCastKey(key)`: true when the qualitative key names a cast. Match English `\bcasts?\b` and `cylind`, and Persian `سیلندر` and `کست` **only as a whole word** (`(^|\s)کست($|\s)` — «شکست» must not match). Add a Persian comment naming CLAUDE.md N25 and research R1–R3 as the reason it exists.
- [X] T010 In `khanesh-server/rules/patterns_utils.js`, add a guard clause at the top of the per-entry loop in **each** of `urinePositive`, `urineCellCount` and `urineGrade`: `if (isCastKey(k)) continue;` — before the caller's `nameRe` is tested. Do not edit any call site in `patterns_nephrology.js`, `patterns_nephrology_new.js` or `isGlomerulonephritis`; the point is that all eight call sites (research R2) inherit the fix. Add the reason as a one-line Persian comment in each. **Added during implementation:** in `urineCellCount` **only**, also skip keys matching `/esterase|استراز/i` — a dipstick pad is not a cell count. Do **not** add it to `urinePositive`, whose esterase callers are *meant* to read the pad.
- [X] T011 In `khanesh-server/rules/patterns_utils.js`, add and export `CAST_TYPES` (ordered by the data-model §3 rank) and `castTypeOf(key, value)`, returning one of `rbc | wbc | tubular | waxy_broad | fatty | granular | hyaline` or `null`. Recognise the type from the key first, then the value (for rows like `Casts: Hyaline, few`). Spellings to cover, at minimum: `rbc|red\s*(blood\s*)?cell|erythrocyte|گلبول\s*قرمز`; `wbc|white\s*(blood\s*)?cell|leukocyte|pus|گلبول\s*سفید`; `epithelial|tubular|rte|اپی[تت]لیال`; `waxy|broad|مومی|پهن`; `fatty|fat|lipid|چرب`; `granular|گرانول`; `hyaline|هیالن|هیالین`. Order matters: test `epithelial` before `wbc` is irrelevant, but test `hyaline` **last**, because «hyaline» is the default reading a sheet uses when it says only "casts".
- [X] T012 In `khanesh-server/rules/patterns_utils.js`, add and export `castRows(e)`: every `[key, value]` in `e.qual` for which `isCastKey(key)` is true. This is how the exclusion in T010 **counts what it skipped** (constitution Principle IV) — it is consumed by the V3 invariant guard in T021.
- [X] T013 In `khanesh-server/rules/adapter.js`, route cast rows that carry no `/lpf`/`/hpf` unit. Import `isCastKey` and `castTypeOf` from `./patterns_utils.js` (no import cycle: `patterns_utils.js` imports only `names.js`, `preanalytical.js`, `biovar.js` — measured). Immediately **after** the layer-1 `/hpf|lpf/` block, add: if `isCastKey(t.name)` then — if `castTypeOf(t.name, t.value)` is non-null, store in `qual` under the same `Urine `-prefixing rule layer 1 uses, and `continue`; otherwise push `t.name` to `unmapped` and `continue` (data-model V6). **Also** amend layer 1 itself: a cast row arriving with a `/lpf` unit whose type `castTypeOf` cannot identify goes to `unmapped`, not `qual`. Comment in Persian, naming V6.
- [X] T014 Run `node --test rules/engine.test.js` from `khanesh-server/`. `M164`, `M164b`, `M164c` must be **green**; `M164d` must still be **green**; every guard that was green in T001 must still be green. Then run the T003 probe again: D1 and D2 must now fire nothing. Record both outputs in `specs/005-urinalysis-rules/baseline.md` under a "after foundation" heading.

**Checkpoint**: No existing rule can read a cast row as a loose cell. D1/D2 are silent — correct and
intermediate. The freeze corpus is unchanged.

---

## Phase 3: User Story 1 — Casts are read instead of misread (Priority: P1, Stage A) 🎯 MVP

**Goal**: A sheet reporting casts tells the patient what kind was seen, what it points at, and how
soon to act; a red-cell cast is never reported as loose blood.

**Independent test**: Run a panel whose only microscopy finding is a cast row; exactly one finding
naming that cast type appears. Run the freeze corpus; it is byte-identical.

### Guards for User Story 1 — write first, observe red

- [X] T015 [P] [US1] Add guard `M165` in `khanesh-server/rules/engine.test.js`: probe D1 fires exactly one finding with `pattern === "urine_cast_rbc"`, urgency `this_week`, and its `must_say` contains «سیلندر» and names bleeding **from inside the kidney** and does **not** contain «گلبول قرمز دیده شده». Confirm **red**.
- [X] T016 [P] [US1] Add guard `M165b` in `khanesh-server/rules/engine.test.js` — two spellings, one report (research R3, the N2 check): run probe D2 (`Leukocyte Casts`) and the "D2 other spelling" panel (`WBC Casts`). Assert both fire `urine_cast_wbc` and nothing else from `uti_pattern`, and that the two findings are **deep-equal**. Confirm **red**.
- [X] T017 [P] [US1] Add guard `M165c` in `khanesh-server/rules/engine.test.js` — one label per sheet (data-model V7): a full urine sheet with `RBC Casts 3-5`, `Granular Casts 2-3` and `Hyaline Casts 4-6`, all `/lpf`, fires **exactly one** finding whose `pattern` starts with `urine_cast_`, and it is `urine_cast_rbc`. Confirm **red**.
- [X] T018 [P] [US1] Add **freeze** guard `M165d` in `khanesh-server/rules/engine.test.js` — negatives are absent (V5): full urine sheet + `RBC Casts: Negative` (`/lpf`) fires no `urine_cast_*` finding and no `hematuria`; repeat with values `none`, `nil`, `0`, `-`, `منفی`. This is **green** on the pre-fix engine — measured 2026-09-22, all six fire nothing — because no cast rule exists yet to misfire. Its job is to stop T025/T026 from introducing a misfire, so it is a freeze, not a red-first guard. Print the fired patterns in the assertion message.
- [X] T019 [P] [US1] Add guard `M165e` in `khanesh-server/rules/engine.test.js` — hyaline, both sides of the bound: full urine sheet + `Hyaline Casts 1-2 /lpf` fires **no** `urine_cast_*` finding (data-model §3 correction); the same sheet with `Hyaline Casts 5-8 /lpf` fires `urine_cast_hyaline` at `routine`. Confirm the second half is **red**.
- [X] T020 [P] [US1] Add guard `M165f` in `khanesh-server/rules/engine.test.js` — the unitless path (research R4): a full urine sheet with a row `{ name: "Casts", value: "Waxy, few" }` (no unit) fires `urine_cast_waxy_broad`; a row `{ name: "Casts", value: "few" }` puts `"Casts"` in `unmapped` and fires no cast finding (V6). Confirm **red**.
- [X] T021 [P] [US1] Add guard `M165g` in `khanesh-server/rules/engine.test.js` — **the V3 invariant**, which is what makes the T010 skip safe: for every panel used by `M164`–`M165f`, every key returned by `castRows(e)` must be consumed by `castAxis(e)` (i.e. appear in `castAxis(e).read`). A cast row excluded from the cell count and unread by the axis must fail this test by name. Confirm **red** (the axis does not exist yet).
- [X] T022 [P] [US1] Add guard `M166` in `khanesh-server/rules/engine.test.js` — the GN hand-off, two-sided (data-model V13–V15): (a) **urine-only** sheet `RBC Casts 5-8 · RBC 20-30 /hpf · Protein +2` fires `urine_cast_rbc` and **not** `glomerulonephritis_pattern`; (b) the same urine rows plus `Creatinine 2.4` fires `glomerulonephritis_pattern`, **not** `urine_cast_rbc`, and the GN finding's `must_say` contains «سیلندر». Assert on both panels that **exactly one** finding mentions «سیلندر». Confirm **red**.
- [X] T023 [P] [US1] Add guard `M166b` in `khanesh-server/rules/engine.test.js` — GN is otherwise untouched (V15, and N8): on panel (b) from T022, GN's `urgency`, `headline` and `action` are byte-identical to a GN finding on the same panel **without** the cast row, and its `suggest` no longer contains «آزمایش کامل ادرار با بررسی کست» (casts were measured — asking for them again is the N8 "already on the sheet" class). On the panel without the cast row, that suggestion **is** still present. Confirm **red**.
- [X] T024 [P] [US1] Add guard `M166c` in `khanesh-server/rules/engine.test.js` — urgency and action agree (N20, the `M70` shape): sweep one panel per cast label through the engine; assert every `routine` `urine_cast_*` finding's `action` contains neither «این هفته» nor «همین حالا», and every `this_week` one contains «این هفته». Also assert **every** one of the seven `urine_cast_*` ids fired on at least one panel — without that, this test can pass while firing nothing (N15). Confirm **red**.

### Implementation for User Story 1

- [X] T025 [US1] In `khanesh-server/rules/patterns_utils.js`, add and export `castAxis(e)` returning `{ label, read }`: `read` is every cast key it consumed (including negatives and normal-hyaline rows — consumed means *judged*, not *reported*); `label` is the highest-ranked present type per data-model §3 (`rbc_cast` … `hyaline_cast_raised`), `hyaline_cast_normal` when the only present type is hyaline at or below `HYALINE_CAST_UPPER_LPF`, or `null` (V4). Count with `urineCellCount`'s range convention (upper bound of «۵-۸»), and treat descriptive amounts (`few`, `many`, `present`, `+`) as present. Negative values per V5 are consumed but absent. Declare `HYALINE_CAST_UPPER_LPF = 2` beside it with a comment citing Henry ch.29 and `P50`.
- [X] T026 [US1] Create `khanesh-server/rules/patterns_urine_casts.js`, exporting `RULES_URINE_CASTS` — seven rules, each `match: (e) => castAxis(e).label === "<its label>"` (the `patterns_mineral_bone.js` shape: one classifier, each rule asks only whether the label is its own). File header comment in Persian: the classifier shape and why (two cast findings on one report are impossible by construction), research R1–R3, and `P50`. Content per rule — each `must_say` states what the cast is in one plain sentence, what it points at, and what confirms it; never an established diagnosis:
  - `urine_cast_rbc` — `this_week`. Red-cell casts form inside the kidney's filters, so the bleeding is coming **from the kidney itself**, not from the bladder or urethra; this is what distinguishes it from ordinary blood in urine. `match` additionally requires `!isGlomerulonephritis(e)` (the V13 hand-off — the same call `hematuria_pattern` already uses to defer to GN). Suggest: kidney function (creatinine/eGFR) if not on the sheet — **three-way**: if creatinine is on the sheet and high / normal / absent, say which (Principle II); nephrology review; repeat urinalysis.
  - `urine_cast_wbc` — `this_week`. White-cell casts form inside the kidney, so the inflammation or infection involves **the kidney**, not only the bladder; this is the finding that separates the two. Warning: do not start antibiotics on your own. If fever or flank pain, sooner.
  - `urine_cast_tubular` — `this_week`. Casts made of the kidney's own tubule-lining cells point at injury to the tubules; name common causes (dehydration, some medicines) without asserting one. Suggest kidney function.
  - `urine_cast_waxy_broad` — `this_week`. Points at kidney damage that has been present for some time. Text must not assert chronic kidney failure. (Waxy vs broad equivalence is `P50` Q2.)
  - `urine_cast_fatty` — `this_week`. Belongs with heavy protein loss in urine; say whether dipstick protein on the same sheet is heavy (≥ +3), lighter, or not measured — three-way.
  - `urine_cast_granular` — `routine`. Non-specific; can appear transiently after strenuous exercise, fever or dehydration; worth repeating if it persists. (Exercise mention is `P50` Q3 — write it, flag it in the comment.)
  - `urine_cast_hyaline` — `routine`, fires only for `hyaline_cast_raised`. Hyaline casts are made of a protein the kidney normally produces; small numbers are normal, more can follow exercise, fever or dehydration. Reassuring in tone.
- [X] T027 [US1] Wire the module into `khanesh-server/rules/patterns.js`: add `import { RULES_URINE_CASTS } from "./patterns_urine_casts.js";` beside the other `patterns_*` imports (lines 1–16), and spread `...RULES_URINE_CASTS` into `RULES` after `...RULES_TRACE_ELEMENTS`. This import line is what places the new file under `M36`/`M37`/`M38` automatically (`livePatternFiles()` derives the live set from it, `engine.test.js:2402`); add nothing to any list by hand.
- [X] T028 [US1] In `khanesh-server/rules/patterns_nephrology.js`, `glomerulonephritis_pattern` (the last rule in `RULES_NEPHROLOGY`): when `castAxis(e).label === "rbc_cast"`, append one Persian sentence to `must_say` saying red-cell casts were also seen, and that this supports the bleeding coming from inside the kidney; and drop «آزمایش کامل ادرار با بررسی کست» from `suggest` in that case only. Do not change `urgency`, `headline` or `action` (V15). Import `castAxis` in the existing import line at the top of the file.
- [X] T029 [US1] Run `node --test rules/engine.test.js`. All of `M165`–`M166c` must be **green**, and `M164`–`M164d` must still be green. Run `npm test` for the full suite: `fail 0`.

**Checkpoint**: US1 is independently deliverable. D1 and D2 now fire cast findings; the two
spellings of a white-cell cast produce the same report; the freeze corpus is unchanged.

---

## Phase 4: User Story 2 — A dipstick result the microscope contradicts is flagged (Priority: P1, Stage A)

**Goal**: When the dipstick says blood or white cells and the microscope disagrees, the patient reads
the disagreement — never a claim that cells were seen.

**Independent test**: Probes X1 and X2 each produce a sentence naming the discordance; the X1
"agrees" panel's `hematuria` finding is byte-identical to before.

### Guards for User Story 2 — write first, observe red

- [X] T030 [P] [US2] Add guard `M167` in `khanesh-server/rules/engine.test.js` — blood, **argues against**: probe X1 (full sheet + `Blood +2` + `RBC 0-2 /hpf`) still fires `hematuria` (the host), still at `this_week` (V12), but its `headline` and `must_say` do **not** claim red cells were seen, and `must_say` names free haemoglobin and muscle pigment («هموگلوبین آزاد», «میوگلوبین» or «رنگدانهٔ عضله»). Confirm **red**.
- [X] T031 [P] [US2] Add guard `M167b` in `khanesh-server/rules/engine.test.js` — blood, **not done**: full sheet + `Blood +2` with **no** RBC row: `hematuria` fires and its text says the microscope red-cell count is not on the sheet (V10) — not that cells were seen, not that none were. Confirm **red**.
- [X] T032 [P] [US2] Add **freeze** guard `M167c` in `khanesh-server/rules/engine.test.js` — blood, **agrees**: full sheet + `Blood +2` + `RBC 20-30 /hpf`: the `hematuria` finding is deep-equal to its entry in `frozen-before.json` (V8). Confirm **green** before the fix.
- [X] T033 [P] [US2] Add guard `M167d` in `khanesh-server/rules/engine.test.js` — the corrected lookup feeds the cross-check (V11): full sheet + `Blood +2` + `RBC Casts 5-8 /lpf` and **no** loose RBC row resolves to the **not done** state for the blood pair — the cast count must not put it in *agrees*. Confirm the assertion message prints which state was reached.
- [X] T034 [P] [US2] Add guard `M168` in `khanesh-server/rules/engine.test.js` — esterase, **argues against**: probe X2 (full sheet + `Leukocyte Esterase +1` + `WBC 0-1 /hpf`, bacteria `Few`) fires exactly one `urine_esterase_without_cells` at `routine`, whose `must_say` names sample handling and non-bacterial causes and does **not** say an infection was found. Confirm **red**.
- [X] T035 [P] [US2] Add guard `M168b` in `khanesh-server/rules/engine.test.js` — esterase, **not done**: full sheet + `Leukocyte Esterase +1`, no WBC row: `urine_esterase_without_cells` fires and says the microscope white-cell count is not on the sheet. Confirm **red**.
- [X] T036 [P] [US2] Add guard `M168c` in `khanesh-server/rules/engine.test.js` — esterase hand-off, **two-sided**, over three panels: (a) ordinary UTI (`Nitrite Positive · LE +2 · WBC 15-20`) → `uti_likely` fires, `urine_esterase_without_cells` does not; (b) X2 → only `urine_esterase_without_cells`; (c) `LE +1 · WBC 0-1 · Bacteria Many` → `bacteriuria_no_inflammation` fires **with** the esterase sentence folded in, and `urine_esterase_without_cells` does **not** fire. On (b) and (c), assert exactly one finding discusses the esterase pad (text matches «استراز»); on (a) assert **at most** one. **Corrected during implementation:** `uti_pattern`'s text never names «استراز», and editing it to force a count of 1 would break freeze F2 — the claim that matters is "never stated twice". Confirm **red**.

### Implementation for User Story 2

- [X] T037 [US2] In `khanesh-server/rules/patterns_nephrology.js`, `hematuria_pattern`: change `build: () =>` to `build: (e) =>` and compute the blood-pair state from `urinePositive(e, /urine\s*blood|ur\s*blood|خون\s*ادرار|hematuria/i)` and `urineCellCount(e, /rbc|گلبول\s*قرمز/i)` against `URINE_RBC_UPPER_HPF = 2` (named constant, `P50` comment). Three arms (Principle II): **agrees** or blood-negative-with-high-RBC → return the current object **unchanged, byte for byte**; **argues against** → a headline that does not claim red cells were seen, and a `must_say` naming free haemoglobin and muscle pigment as what the pad can react to without intact cells, with a suggestion to repeat the urinalysis and, if the sheet has no CK, to ask about it; **not done** → the current text plus one sentence that the microscope count that would settle it is not on the sheet. `urgency` stays `this_week` in every arm (V12).
- [X] T038 [US2] In `khanesh-server/rules/patterns_nephrology.js`, add rule `urine_esterase_without_cells` to `RULES_NEPHROLOGY`, placed directly after `bacteriuria_no_inflammation`. `match`: esterase pad positive **and** `uti_pattern` would not fire **and** `bacteriuria_no_inflammation` would not fire — express both hand-offs by calling those rules' own `match` functions (extract each existing `match` body into a module-local named function, e.g. `utiFires(e)` and `bacteriuriaFires(e)`, and have both the original rule and the new one call it; this is the `anemiaCrisisOwns` pattern and the `M91e` lesson — ask whether the rule fires, never restate its threshold). `urgency: "routine"`. Two arms: **argues against** (`WBC ≤ URINE_WBC_UPPER_HPF = 5`, named constant, `P50` comment incl. the open sex-dependent-bound question) and **not done** (no WBC row).
- [X] T039 [US2] In `khanesh-server/rules/patterns_nephrology.js`, `bacteriuria_no_inflammation`: change `build: () =>` to `build: (e) =>`; when the esterase pad is positive, append one Persian sentence noting the esterase reaction without a matching white-cell count. When the pad is not positive, return the current object byte for byte.
- [X] T040 [US2] Run `node --test rules/engine.test.js`: `M167`–`M168c` **green**, `M164`–`M166c` still green, `M164d` and `M167c` still green. Then `npm test`: `fail 0`.

**Checkpoint**: Stage A is functionally complete.

---

## Phase 5: Polish, proof, and the record

**Purpose**: The constitution's merge gate, and the two documents it requires be updated in the same session.

- [X] T041 Prove every guard red-first, in isolation from your own changes. Extract the pre-fix engine with `git stash` (or `git archive HEAD khanesh-server | tar -x -C <tmp>` **with** `node_modules` junctioned in — see CLAUDE.md § Commands), copy **only** the new `rules/engine.test.js` into it, and run `node --test rules/engine.test.js`. Record in `specs/005-urinalysis-rules/baseline.md`: the exact set of red tests, which must be **precisely** the behavioural guards (`M164`, `M164b`, `M164c`, `M164e`, `M165`, `M165b`, `M165c`, `M165e`, `M165f`, `M165g`, `M166`, `M166b`, `M166c`, `M167`, `M167b`, `M167d`, `M168`, `M168b`, `M168c`) and must **not** include the freeze guards (`M164d`, `M165d`, `M167c`) or any pre-existing test. Explain any deviation in the file; do not silently adjust a guard to make the set match.
- [X] T042 [P] Diff the rule-id set: regenerate as in T002 into `specs/005-urinalysis-rules/ids-after.txt` and `diff` against `ids-before.txt`. The diff must show exactly eight `>` lines (the eight ids under *Conventions*) and **no** `<` lines (Stage A deletes nothing — `FR-003`). Record the result in `baseline.md`.
- [X] T043 [P] Run the T003 probe again and save to `specs/005-urinalysis-rules/probe-after.txt`. Check it against the table in `quickstart.md` §3 row by row, and record pass/fail per row in `baseline.md`.
- [X] T044 [P] Verify the contract ([engine-output.md](contracts/engine-output.md)) on one full cast sheet: call the real `engineDebug` path (or run `api-contract.test.js`'s harness on a cast panel) and assert `_engine.uncovered`, `_engine.tests` and `_engine.unitConversions` are identical with and without the cast row. Record in `baseline.md`.
- [X] T045 [P] Add `P50` to `MEDICAL_RULES.md` under «در انتظار بازبینی», in Persian, matching the format of `P49`: the three thresholds (`HYALINE_CAST_UPPER_LPF = 2`, `URINE_RBC_UPPER_HPF = 2`, `URINE_WBC_UPPER_HPF = 5`) with source (Henry ch.29) and what the patient reads either side of each; the three open questions from research.md; the two measured defects (probes D1, D2 — before/after text quoted); and the deliberate Stage A exclusions: dysmorphic RBC % and urine eosinophil % (`FR-022a`), plus the full list from `checklists/requirements.md` § Deliberate exclusions.
- [X] T046 [P] Update `CLAUDE.md` Lab Notebook: this is a **recurrence of N25** («A row name is not an identity»), not a new entry — N25 already names the mechanism («The urine rules look in `qual` with `/rbc/` and `/wbc/` on **any** key»). Append a dated ⚠️ **Recurred** paragraph to N25 covering: cast rows consumed as loose cells (D1, D2 — quote before/after), the two-spellings-two-reports finding (link it to N2), why the fix went in the shared helper and not the eight call sites, and why the skip is paired with `castRows` + `M165g` (Principle IV). Name the guards. Keep it at the density of the N25 entry it extends.
- [X] T047 [P] Update the structural facts in `CLAUDE.md`: in § File Structure add `patterns_urine_casts.js` beside the other `patterns_*` files with a one-line Persian description in the same style; in § Where a pattern lives, change "**fifteen**" `patterns_<system>.js` files to **sixteen** and the rule count to the figure measured in T042 (expected 129), each with today's date as the other entries have. Re-measure; do not write 129 from this file.
- [X] T048 Run the full gate one last time from `khanesh-server/`: `npm test 2>&1 | tail -8`. Record the line in `specs/005-urinalysis-rules/baseline.md` beside the T001 figure, naming the tree. The delta in `tests` must equal the number of new `test(...)` calls added (count them with `grep -c` on the diff) — if it does not, attribute the difference before reporting (CLAUDE.md: "a total is not an attribution").
- [X] T049 Run the project's review step (CLAUDE.md § Agents, "Typical clinical change": `qa` → `code-reviewer` before commit): invoke the `code-reviewer` agent on the diff, and `eval-medical-reviewer` on the clinical content, and save their findings to `specs/005-urinalysis-rules/medical_review.md`. Any finding that corrects patient-facing output gets its own guard, observed red, before the work is reported done — and, if it is a new class, its own Lab Notebook line.

**Do not commit.** Committing is the user's call (global CLAUDE.md).

---

## Dependencies & Execution Order

### Phase dependencies

```
Phase 1 Setup (T001–T004)
      │  every later "red before" claim is measured against this
      ▼
Phase 2 Foundational (T005–T014)   ── BLOCKS both stories
      │
      ├──────────────────────────────┐
      ▼                              ▼
Phase 3 US1 (T015–T029)        Phase 4 US2 (T030–T040)
      │                              │
      └──────────────┬───────────────┘
                     ▼
         Phase 5 Polish (T041–T049)
```

- **Why Foundational blocks US2, not just US1**: V11 — the cross-check reads the microscopy count
  through `urineCellCount`. Before T010, a cast row can put the blood pair in the *agrees* state.
  `M167d` exists specifically to prove that coupling is closed.
- **US1 ↔ US2 are independent after Phase 2**, with one shared file: T028 (US1) and T037–T039 (US2)
  all edit `patterns_nephrology.js`. They touch different rules, but must be applied **sequentially**,
  not in parallel, to avoid conflicting edits to one file.
- **T041 must run after both stories**, because it asserts the complete red set.

### Within each phase

- Guards before implementation, and each guard observed in its required state (red, or green for
  freeze) **before** the implementation task that follows it.
- `patterns_utils.js` changes (T009–T012, T025) before anything that imports them.
- T027 (wiring) before T029 — a rule in a file `patterns.js` doesn't import is invisible and fails
  exactly like N1: silently.

### Parallel opportunities

- **Phase 1**: T002, T003, T004 in parallel after T001.
- **Phase 2**: the guards T005–T008 all edit `engine.test.js`; write them in one pass, not in parallel.
  T009–T012 are one file, sequential. T013 (`adapter.js`) can proceed in parallel with T011–T012 once
  T009 exists.
- **Phase 3**: T015–T024 are marked `[P]` because they are independent assertions, but all live in
  `engine.test.js` — draft in parallel, apply in one edit. T026 can be drafted in parallel with T025.
- **Phase 4**: same pattern as Phase 3.
- **Phase 5**: T042–T047 are all independent files and can run in parallel after T041.

### Parallel example — Phase 5

```text
After T041 records the red set:
  T042  ids-after.txt + diff            (specs/…/ids-after.txt)
  T043  probe-after.txt                 (specs/…/probe-after.txt)
  T044  contract check                  (specs/…/baseline.md)
  T045  P50                             (MEDICAL_RULES.md)
  T046  N25 recurrence                  (CLAUDE.md § Lab Notebook)
  T047  structural facts                (CLAUDE.md § File Structure, § Where a pattern lives)
Then T048 (full gate) → T049 (review).
```

---

## Implementation Strategy

### MVP — Phase 1 + Phase 2 + Phase 3 (US1)

The MVP is **the misread fix plus the cast findings**. Phase 2 alone would already stop the wrong
sentence, but it replaces a wrong finding with silence, which is not a shippable state for a
red-cell cast — so the MVP boundary is the end of Phase 3, not Phase 2.

1. Phase 1 — measure.
2. Phase 2 — the exclusion. **Stop and validate**: D1/D2 silent, freeze corpus unchanged.
3. Phase 3 — the cast axis and rules. **Stop and validate**: D1/D2 fire cast findings, both spellings agree.
4. Deliverable as-is; US2 can follow.

### Incremental delivery

1. Setup + Foundational → no cast is misread.
2. + US1 → casts are read. **MVP.**
3. + US2 → dipstick/microscope discordance is stated. **Stage A complete.**
4. Polish → proof, register, notebook, review. Only then is Stage A reportable as done.
5. Stage B — a separate `/speckit-plan` → `/speckit-tasks` pass, after this one is merged.

---

## Notes

- A guard that passes on the old code locks in nothing (Principle IV, N10). "Observed red" means you
  ran it and saw it fail, not that you reasoned it would.
- Two-row fixtures for the cross-checks are wrong: `blood` on a page the adapter doesn't recognise as
  urine goes to `unmapped` (research R5). Use the full urine sheet from `quickstart.md` §1.
- If a test that was green in T001 turns red, stop and read the **first** error, not the summary —
  CLAUDE.md records three different root causes that all present as "a whole file went red".
- Do not use `SKIP_HOOKS=1`.
