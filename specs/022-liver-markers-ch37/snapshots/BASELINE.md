# specs/022 — measurements (2026-11-10)

| Tree | How | tests | pass | fail |
|---|---|---|---|---|
| `HEAD` (3a3ad46) + the new LV tests | `git archive HEAD khanesh-server`, `node_modules` junction, LV1–LV5 only | 5 | 0 | 5 (all fail on HEAD) |
| Working tree (dev folder) | `node --test --test-reporter=tap` in `khanesh-server/` | 1732 | 1730 | 1 (T15e, the dev-folder `database.sqlite`/`.env` artefact, as in 021) |

## Rule-id set

`rule-ids-before.txt` and `rule-ids-after.txt` each have 278 ids, and they are identical. No rule was added or removed.

## Probe (`probe.mjs`, 57 panels): `before.txt` (HEAD copy, `RULES_URL`) → `after.txt`

Every changed panel maps to a G item:

- **G1.** L29 and L38: the cirrhosis card quotes albumin, platelets, bilirubin and INR. `unexplained_abnormal` (albumin) is gone.
- **G2.** L13b, L33 and L33b: HCV antigen goes to `unmapped`. L33 and L33b go from `this_week` (the antibody text) to `none`; this is the only urgency change, and it is recorded in P134.
- **G3.** L12b, L34 and L35: the sentence says the molecular test is on the sheet, and its request is dropped from `suggest`.
- **G4.** L4, L4b, L5, L5b, L9b, L17b and L29: the AST-predominant sentence is added, and CK is added to `suggest`.
- **G5.** L6 and L6b (NH3), L16, L16b and L16c (ALP), L14, L26, L27, L29 and L38 (coag numbers; the liver clause appears only on L14 and L29).

Negative controls, unchanged:

- L33c (HCV Ag/Ab combo);
- L33d (Anti-HCV alone);
- L36 (CK normal on the sheet);
- L37 (AST grade 3);
- L1, L2, L3 and L32 (severe injury).

## Locks re-baselined, with proof

| Lock | Panel | Cause |
|---|---|---|
| M111 | `pe_components` (AST 90 / ALT 80) | G4 |
| M257 | `aptt_only`, `pt_inr` | G5 coag |
| X0 | `ptinr` (runPatterns hash only; the score hash is unchanged) | G5 coag |
| U10 | `coag` | G5 coag |

Proof: a copy of the working tree (`$TEMP/khanesh-022-proof`) with only `astLeadNoCk → false` and `coagPlainClause → ""` passes M111, M257, X0 and U10 on the **old** hashes.
