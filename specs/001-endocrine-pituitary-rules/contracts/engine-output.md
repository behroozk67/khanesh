# Contract — Engine Output and `/api/analyze` Response

The project's external interface is the `/api/analyze` (and `/api/analyze/start` →
`/api/analyze/job/:id`) response, consumed by `khanesh/src/ResultView.jsx`. This feature **adds
values** inside existing fields and **adds no field** to the response.

---

## 1. `_engine` — unchanged shape

```
_engine = {
  patterns, urgency, abnormal, uncovered, indices, tests,
  guidelines, preanalytical, unitConversions
}
```

No new top-level key. In particular `engineOut.ungraded` (data-model §3) is **not** serialized
into `_engine`: it is an engine-internal channel from `runEngine()` to the rules.

### New values that may appear

| field | new values |
|---|---|
| `_engine.patterns[]` | `hyperprolactinemia`, `adrenal_discordant`, `cushing_likely`, `cushing_screen_positive`, `adrenal_insufficiency_likely`, `adrenal_insufficiency_indeterminate`, `cortisol_am_high_nonspecific`, `cortisol_untimed` |
| `_engine.tests[].key` | `PRL`, `CORTISOL_AM`, `CORTISOL_DST`, `CORTISOL_SAL`, `UFC`, `ACTH` — **never** `CORTISOL` (it is not graded) |
| `_engine.tests[].name` | `faName()` of the above — Persian, never the raw key (N8) |
| `_engine.unitConversions[]` | rows for cortisol-family nmol/L, ACTH pmol/L, UFC nmol/24h, PRL mIU/L — each with `name` |
| `_engine.guidelines[]` | a new `HENRY_ENDOCRINE` entry (Henry ch.25), `access: 'open'` |

### Invariants the frontend relies on

- `_engine.urgency` is never `emergency` because of a finding in this feature (FR-020).
- A key in `_engine.uncovered` is never a key owned by a rule in this feature when that rule fired
  (ownership, FR-015). `ACTH` without any cortisol is the one expected `uncovered` case.
- `extracted_tests` (built from OCR, not from the engine) continues to show the untimed cortisol's
  number; that is the patient's view of it, alongside the `cortisol_untimed` finding.

---

## 2. Findings emitted by this feature

Common to every finding: Persian `headline` / `must_say` / `action`; `action` derived from
`urgency` via `actionFor()` (N20); no drug, dose or surgery in any field (FR-018); `sources`
includes `HENRY_ENDOCRINE`.

| `pattern` | owner of | max urgency | must contain | must never contain |
|---|---|---|---|---|
| `hyperprolactinemia` | `PRL` | `this_week` (> 200), else `routine` | pregnancy / breastfeeding / medications as common causes; the thyroid arm (4 states) | "prolactinoma" stated as confirmed; reassurance that normal PRL excludes a tumour; reassurance that the disease is active |
| `adrenal_discordant` | cortisol family | `this_week` | that the results conflict; steroid **and** estrogen medicines | a single diagnosis |
| `cushing_likely` | cortisol family | `this_week` | the ACTH arm (4 states); estrogen / birth-control pills | "confirmed"; medicine advice |
| `cushing_screen_positive` | cortisol family | `routine` | "needs confirmation"; the ACTH arm; estrogen / birth-control pills | a diagnosis; medicine advice |
| `adrenal_insufficiency_likely` | cortisol family | `this_week` | that the draw was a morning one; steroid medicines as a common cause; the ACTH arm (present/absent, no threshold) | advice to stop or change a medicine |
| `adrenal_insufficiency_indeterminate` | cortisol family | `routine` | that a further test decides; steroid medicines as a common cause | a diagnosis; medicine advice |
| `cortisol_am_high_nonspecific` | cortisol family | `routine` | non-specific causes (stress); estrogen / birth-control pills | "Cushing" as a diagnosis; medicine advice |
| `cortisol_untimed` | cortisol family | `routine` | the value; that interpretation depends on draw time; that a morning draw is the usual basis | "insufficiency", "Cushing", "low", "high" as a verdict |

### `SUGGEST_TESTS` rows (same commit as the rules, N8)

`«ACTH»` → `["ACTH"]`, `«کورتیزول صبح»` → `["CORTISOL_AM"]`. `«TSH و FT4»` already exists.

---

## 3. Guard tests that pin this contract

Next free ids at plan time: `M101`+.

| id | asserts | red before Stage B? |
|---|---|---|
| `M101` | `PRL` alone and high → a `hyperprolactinemia` finding; response is not the all-normal result | **yes** |
| `M101b` | `PRL 22`: F normal, M high, unknown sex high | **yes** |
| `M101c` | thyroid companion: all four arms produce distinct, correct text | **yes** |
| `M101d` | `PRL 250`: pituitary sentence present; pregnancy named; forbidden phrases absent | **yes** |
| `M102` | sweep of cortisol panels: exactly one adrenal finding on each (silence *and* contradiction fail) | **yes** |
| `M102b` | untimed cortisol `3`: `cortisol_untimed` only; `CORTISOL` not in `abnormal`/`tests[]`; no verdict words | **yes** |
| `M102c` | `CORTISOL_DST 1.5` → not an insufficiency finding | **yes** |
| `M102d` | ACTH companion: four arms for Cushing labels | **yes** |
| `M102e` | low morning cortisol + high UFC → `adrenal_discordant` only | **yes** |
| `M102f` | every low-cortisol label names steroid medicines, every high-cortisol label names estrogen pills, none advises stopping a medicine (spec FR-023, SC-010) | **yes** |
| `M101e` | `PRL` at age 1 is graded against the adult range (documents the all-ages decision; fails if a pediatric branch appears without a register decision) | **yes** |
| `M103` | duplicate freeze: the research.md R7 panels produce byte-identical findings | no — "nothing changed" guard, green both ways by design |
| `M103b` | `CORTISOL` absent from `ADULT_REFS`; `ungraded.CORTISOL` populated | **yes** (field does not exist) |
| `M103c` | nmol/L cortisol converts; unitless cortisol `> 100` is not graded | **yes** |
| `M103d` | no finding of this feature ever has `urgency: "emergency"` across all sweep panels | **yes** (rules absent → sweep asserts each pattern was reached) |
| `M103e` | `CORTISOL` has a `FA_NAMES` entry (`M32` only covers `ADULT_REFS`) | **yes** |

"Red before" is verified with the `git archive` + junction recipe in `CLAUDE.md`, per N10.
