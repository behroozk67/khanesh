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
- [ ] `patterns.js` `RULES` if the test participates in a multi-test clinical pattern
- [ ] `names.js` `FA_NAMES` — the Persian display name, so the key never reaches the patient as raw text (`faName()` falls back to the key itself, which is exactly the bug this file exists to prevent)

All five files live in `khanesh-server/rules/`. See [architecture.md](architecture.md) for how these modules fit into the overall request flow.
