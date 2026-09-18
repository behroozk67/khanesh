# Research — 002 Reproductive, Fertility & hCG (Henry ch.26)

Every "measured" fact below was taken on the working tree on 2026-09-18 (tip `3416d63` plus
uncommitted work), and re-verified the same day on `8ccd67d` (after `001` Stage A was committed):
the probe still fires `hematuria`, there are 113 rules, `server.js:556` and `:895` are unchanged, and
`M104`/`P47` are still free. Re-measure before quoting any of it (Constitution III).

---

## R1 — How can the engine tell that a page is a semen analysis?

**Measured:** the OCR contract (`OCR_PROMPT`, [server.js:305-345](../../khanesh-server/server.js#L305-L345))
returns `{ name, value, unit, reference, flag, confidence }` for each row. **It has no section or
title field.** `mergePages()` tags each row with `_page` ([server.js:556](../../khanesh-server/server.js#L556)).
So a printed "Semen Analysis" header never reaches the engine.

**Decision:** detect semen pages per `_page` from two signals the engine already receives,
following the same pattern as `detectUrineOnlyPages()` / `detectAbgPages()`
([adapter.js:424-451](../../khanesh-server/rules/adapter.js#L424-L451)):
1. **Semen-only row names** (`SEMEN_ONLY_MARKERS`): motility, progressive motility,
   non-progressive, immotile, morphology, normal forms, liquefaction (time), viscosity, vitality,
   agglutination, sperm / sperm count / sperm concentration, total sperm number, abstinence,
   semen volume, plus the Persian forms (اسپرم، تحرک، مورفولوژی/ریخت‌شناسی، زمان مایع‌شدن،
   ویسکوزیته، مدت پرهیز، مایع منی، اسپرموگرام). The seed list comes from Iranian lab websites;
   real-sheet spellings are still open (N2), as they were for `P46`.
2. **A semen-only unit on any row of the page:** `million/mL`, `×10^6/mL`, `10*6/ml`, `mil/ml`.
   ⚠️ Blood RBC is printed `10*6/µL` (see the OCR example at server.js:339). The unit test must
   require **mL, not µL**, or every CBC page becomes a semen page.

One signal is enough (spec Clarifications Q4 = B).

**Alternatives considered:**
- *Add a `section` field to `OCR_PROMPT`* — this is the "printed title" signal the spec names.
  Rejected for this feature: it changes a prompt that `OCR_MAX_TOKENS` was tuned against after a
  real truncation incident, it is a network-cost change, and it adds nothing the row-name signal
  doesn't already catch (a semen report without one semen-only row name does not exist in
  practice). Recorded as a follow-up, not silently dropped.
- *Guess from magnitude* (for example "count > 1000 means semen") — forbidden (N3, spec FR-004).

## R2 — Where does the routing have to happen, and in what order?

**Measured:** in `ocrToEngineInput()` the `/hpf` unit layer (layer 1) runs **before** the pH and
urine-page layers ([adapter.js:564-591](../../khanesh-server/rules/adapter.js#L564-L591)). Semen
WBC/RBC are very often printed per `/hpf`, so a semen check placed after layer 1 would never run.

**Decision:** a new **layer 0** at the top of the loop. If `semenPages.has(_page)` and the row is
one of the ambiguous semen keys (`ph`, `wbc`, `rbc`, `volume`, `count`, `concentration`,
`puscells`…), route it to its `SEMEN_*` key and `continue`, before layer 1.

**Measured probe (baseline to turn green):** `Volume 2.5 · pH 8.4 · Count 40 · WBC 15-20 ·
RBC 8-10` fires `hematuria` («در آزمایش ادرار شما خون … دیده شده است»); `pH` lands in
`qual["Urine pH"]`.

**Mixed page guard:** if the same page also carries `BLOOD_ONLY_MARKERS`, the page is **not**
treated as semen for `wbc`/`rbc`. Those two keep today's behavior, and only the semen-only rows
are semen. This mirrors the urine-page rule ("if the page has any blood evidence, don't touch
it"), so a CBC's WBC can never be re-labelled.

## R3 — `mergePages` silently drops a second row with the same name

**Measured by reading** [server.js:539-557](../../khanesh-server/server.js#L539-L557): rows are
deduplicated across pages by `normName(name)`, and **the first one wins**. With a CBC page and a
semen page, `WBC` and `RBC` exist twice. Whichever page was uploaded first wins, and the other
row is dropped and reported as a "conflicting duplicate". If the semen page is uploaded first,
**the CBC's WBC is lost**. This is a silent under-read (N2/N18 class), and it becomes much more
likely once semen sheets are expected input.

**Decision:** compute semen pages per OCR page *before* merging (reusing the adapter's exported
detector), and dedupe semen-page rows under a `semen:` prefix, so the two `WBC`s coexist. Export
`mergePages` so a guard (`T18`) can test it directly.

## R4 — Key naming, and what is graded versus only recognized

| family | keys | graded? |
|---|---|---|
| semen (numeric) | `SEMEN_VOL`, `SPERM_CONC`, `SPERM_TOTAL` (total number, ungraded), `SPERM_MOT_TOTAL`, `SPERM_MOT_PROG`, `SPERM_MORPH`, `SEMEN_PH` | yes, once `P47` ranges are approved |
| semen (context) | `SEMEN_ABSTINENCE` (days), `SEMEN_WBC`, `SEMEN_RBC` | no — context or recognition only |
| semen (qualitative) | `SEMEN_FRUCTOSE`, `SEMEN_ACP`, `SEMEN_NAG` | qual channel, classifier in the rule |
| male / female hormones | `TESTO`, `LH`, `FSH`, `E2`, `PROG` | only when sex is known, age ≥ 16, and (for women: `LH`/`FSH`/`E2`/`PROG`) the cycle day is printed → keys `LH_D3`, `FSH_D3`, `E2_D3`, `PROG_D21` |
| other | `AMH`, `DHEAS`, `OHP17` | age ≥ 16, sex known (DHEAS and OHP17 are sex-dependent) |
| hCG | `HCG` (numeric), or qual `HCG` for Positive/Negative | numeric thresholds from `P47`; qual always |

**Time-in-the-key**, exactly like `CORTISOL_AM` in `001`: the printed name decides the key.
`FSH Day 3` / «FSH روز ۳» → `FSH_D3`; bare `FSH` for a woman → the ungraded channel (R5). For a
man, bare `FSH` is graded, because there is no cycle.

**Name collisions to fence off explicitly** (each needs a negative guard):
- `17-OH Progesterone` must not reach `PROG` through `resolveAlias` prefix matching.
- `Free Beta hCG` / anything with unit `MoM` must not reach `HCG` (spec US5.5).
- `AFP` is not mapped by this feature at all (both meanings stay unmapped, as today).
- `Testosterone Free` must not reach `TESTO` (total); free testosterone stays unmapped.
- Semen `Volume` must not become a urine-volume key (none exists today; guard anyway).

## R5 — The "recognized but not judged" channel

Four cases must show the number and **no verdict**: cycle day unknown (FR-013), age < 16
(FR-011), sex unknown (FR-011), and progesterone next to a positive or grey-zone hCG
(Clarifications Q6).

**Decision:** reuse the `ungraded` engine field designed in `001` (`P46` Stage B,
[001 data-model](../001-endocrine-pituitary-rules/data-model.md)). It is not built yet: `M103b`
is `todo` on it. Whichever feature reaches Stage B first builds it, and the other consumes it.
Each entry carries a **reason code** (`cycle_day_unknown`, `pediatric`, `sex_unknown`,
`hcg_positive`), so the owning rule can say *why* there is no verdict. `ungraded` is internal
and is not serialized into `_engine` (the same rule as `001`), so `val(e)` is unchanged (N17).

**Rejected alternative:** leave these in `noRef`. `noRef` produces «برای این تست‌ها محدوده مرجع
نداریم… تفسیر نشدند», which is false for a day-less FSH (a range exists; it just can't be applied
without the day) and says nothing about puberty.

## R6 — Routing a hormone-only sheet into the engine path

**Measured:** `if (engineCandidate.graded.length === 0) engineCandidate = null`
([server.js:895](../../khanesh-server/server.js#L895)) sends any sheet with no graded key to the
**legacy no-engine path**, where the model judges severity. This is gap (0) already recorded in
`P46`. It matters much more here: a sheet with *only* an untimed FSH/LH/E2 is common.

**Decision (Stage B only):** the condition becomes "nothing graded **and** nothing in
`ungraded` **and** no semen key". It must ship **in the same change** as
`reproductive_hormone_context`. Otherwise an ungraded-only sheet reaches `buildNormalResult`
(`findings 0 && abnormal 0`) and is told everything is normal. That is worse than the legacy
path, and it is the exact N2 failure. Guard `T19` asserts both halves.

## R7 — Single ownership (N20) — who owns which key

| rule / classifier | owns | returns |
|---|---|---|
| `semen_analysis` | every `SEMEN_*` / `SPERM_*` key | **one** finding that lists every abnormal parameter (azoospermia is exclusive; otherwise any subset of low volume / oligo / astheno / terato) |
| `maleAxis(e)` → `male_gonadal_axis` | `TESTO`, `LH`, `FSH` when sex = M | exactly one label or `null` |
| `femaleAxis(e)` → `female_ovarian_axis` | `FSH_D3`, `LH_D3`, `E2_D3` | exactly one label or `null` |
| `female_androgen_excess` | `TESTO`, `DHEAS`, `OHP17` when sex = F | one finding, with a three-way arm per analyte |
| `luteal_progesterone` | `PROG_D21` | one finding |
| `amh_level` | `AMH` | one finding |
| `hcg_result` | `HCG` (numeric or qual) | one finding |
| `reproductive_hormone_context` | every `ungraded` reproductive key | one routine finding listing them with reasons |

Cross-references are allowed and required: `maleAxis`'s `tubular_failure` label *reads*
`SPERM_CONC`, and `semen_analysis` does not discuss FSH. The two-sided sweep guard (`M110`)
asserts both no silence and no double ownership, for each family.

**`femaleAxis` deliberately does not implement "FSH/LH low or normal → secondary failure"
alone.** The DSL's step 4 assumes the patient has amenorrhea, which the engine cannot know. On a
normal fertility panel, "FSH normal, LH normal" would announce "hypothalamic–pituitary failure"
to a healthy woman. `central_pattern` fires only with a low `E2_D3` alongside, and that
condition is registered in `P47` for the reviewer.

## R8 — Unit conversions (Stage A, because they are not clinical decisions)

Exact values from molar mass, applied only when the unit is printed (N3). They go in `units.js`:

| key | from | to | factor | basis |
|---|---|---|---|---|
| `TESTO` | nmol/L | ng/dL | × 28.84 | MW 288.4 |
| `E2` family | pmol/L | pg/mL | ÷ 3.671 | MW 272.4 |
| `PROG` family | nmol/L | ng/mL | ÷ 3.180 | MW 314.5 |
| `OHP17` | nmol/L | ng/mL | ÷ 3.026 | MW 330.5 |
| `DHEAS` | µmol/L | µg/dL | × 36.85 | MW 368.5 |
| `LH`, `FSH`, `HCG` | IU/L | mIU/mL | × 1 | identity |

**Not in Stage A:** AMH pmol/L → ng/mL (÷ 7.14). This factor comes from a nominal ~140 kDa dimer
and is a convention, not an exact molar identity, so it goes to `P47` for the reviewer — the same
treatment `P46` gave the prolactin mIU/L factor.

## R9 — What the reviewer must decide (`P47`) and what each decision unblocks

The DSL supplies only some of the numbers; the rest have **no source in the input**, and the
reviewer must supply one. The full table is in [data-model.md](data-model.md) §5. Four DSL
defects are registered, not "fixed" silently:
1. Morphology exactly 4 % falls in no class (`> 4` excellent, `0–3` terato). The WHO LLN is 4 %,
   inclusive.
2. `volume < 2.0` is placed inside the definition of oligospermia. Low volume is hypospermia; the
   two are kept separate (FR-006).
3. The DSL's volume 2.0 / concentration 15 / motility 40 / progressive 32 mix WHO 1999 and WHO
   2010. WHO 2021 (6th ed.) is 1.4 mL / 16 M/mL / 42 % / 30 % / 4 %. The reviewer picks one
   edition, and every semen number follows from that single choice.
4. `PR_1_1` writes `0.53` for a 53 % rise (out of scope, recorded so it isn't copied).

## R10 — Delivery split (the same pattern as `001`)

- **Stage A (no reviewer needed; no new clinical claim):** semen-page routing and the
  `mergePages` fix (they *remove* a false finding); `NAME_MAP` / `FA_NAMES` / exact units for
  every key; the `P47` entry; every guard written, with the Stage B ones as `todo` naming their
  `P47` row. After Stage A, the new keys sit in `noRef` or `unmapped` exactly as today, and
  `graded.length === 0` still routes hormone-only sheets to the legacy path (unchanged; R6).
- **Stage B (per approved `P47` row):** ranges, `ungraded` (if `001` has not built it), the new
  module, the routing change (R6), `SUGGEST_TESTS` rows, `HENRY_REPRO` in `guidelines.js`, and
  `testCategories.js`.
