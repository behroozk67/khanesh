# Rules Engine

## Grading Modes

Each test is graded through exactly one mode, chosen by `rules/grade.js`:

| Mode | Meaning | Example tests | Source file |
|---|---|---|---|
| `severity` | CTCAE v5 grade (G1–G4), a true severity scale | Hb, PLT, WBC, Na, K, Ca, glucose, liver enzymes | `ctcae.js` |
| `classifier` | Categorical label, not severity — degree doesn't matter | MCV (micro/normo/macrocytic), MCH, TSH | `interpret.js` |
| `binary` | Just in/out of reference range; a multi-test pattern decides significance | HCT, RBC, PT, aPTT, ferritin, ESR | `interpret.js` (fallback) |

Reference ranges: `refs.js` (Henry's Clinical Diagnosis, adult) and `refs_ped.js` (RCPCH 2016, pediatric <16y — pediatric ranges are tried first and fall back to adult per RCPCH's own guidance).

---

## Adding a New Lab Test

- [ ] `refs.js` (and `refs_ped.js` if age matters) — add the reference range
- [ ] `adapter.js` `NAME_MAP` — map every real-world spelling/abbreviation (English + Farsi) seen on lab sheets to one canonical key
- [ ] `ctcae.js` `CTCAE_MAP` if it has an official CTCAE v5 severity grade, **or** `interpret.js` `CLASSIFIERS` if it needs a categorical label — otherwise it falls through to plain binary in/out-of-range
- [ ] the right `patterns_<system>.js` if the test participates in a multi-test clinical pattern — and confirm that file's `RULES_*` export is spread into `RULES` in `patterns.js`
- [ ] `names.js` `FA_NAMES` — the Persian display name, so the key never reaches the patient as raw text (`faName()` falls back to the key itself, which is exactly the bug this file exists to prevent)

All five files live in `khanesh-server/rules/`. See [architecture.md](architecture.md) for how these modules fit into the overall request flow.

---

## Guideline Layer

Four modules carry the published-standard side of the engine. They add *context and
caveats*; none of them decides abnormal/normal — that stays with `refs.js` + `grade.js`.

| File | Standard body | What it does |
|---|---|---|
| `guidelines.js` | all | Citation registry. Every guideline-anchored threshold points at an id here; `sourceList()` renders them for the patient. Test `G6` fails the build if a rule cites an id that doesn't exist. |
| `units.js` | IFCC | SI → conventional conversion (`HbA1c` mmol/mol via the IFCC/NGSP master equation, glucose/lipids mmol/L, creatinine/bilirubin/urate µmol/L, …), wired into `adapter.js`. |
| `preanalytical.js` | CLSI | Sample-quality caveats attached to existing findings — hemolysis → K/LDH/AST, fasting → TG/glucose, EDTA clumping → isolated low platelets, stasis → protein/albumin. |
| `biovar.js` | EFLM | CVi/CVg per analyte → reference change value (`rcv()`) and index of individuality, so "repeat this test" carries a real number instead of a vague instruction. |

Three rules govern this layer:

- **A paywalled source is never cited as if it were read.** `access: 'paywalled'` entries
  (UpToDate, BMJ Best Practice, the CLSI documents themselves) carry a `substitutedBy` naming
  the open source the number actually came from, and `sourceList()` returns *that* to the
  patient. Test `G6` asserts the paywalled URL never reaches the client.
- **Nothing here changes urgency.** A pre-analytical caveat adds text to a finding; it never
  downgrades one. "The sample may have been hemolyzed" is not a reason to stop treating a
  dangerous number as dangerous — see the `hemolysis_potassium` gate at K < 6.5.
- **A unit is converted only when the sheet states it.** `units.js` matches the printed unit
  explicitly. The single exception is HbA1c, where the two scales cannot overlap; the reasoning
  is written out at `HBA1C_IMPLAUSIBLE_AS_PERCENT`. Guessing a unit from magnitude is how N3
  happened in the first place.

When adding a guideline-anchored threshold: put the number in the rule, put the citation id in
`RULE_SOURCES` (or `sources:` on the finding), and add the source to `guidelines.js` if it isn't
there. Don't cite a body whose document you didn't open.
