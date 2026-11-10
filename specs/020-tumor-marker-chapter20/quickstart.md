# Quickstart / validation: specs/020

Run everything from `khanesh-server/`. Name the tree in every report (Principle III).

## 0. First task: an end-to-end snapshot before any edit

The R2 probe measured `routeSerology` state only. Urgency, score and patient text were *read off the code*. Run Q1–Q10
through the real engine and `serializeGraded`/`tumorMarkerRows` and save the JSON in
`specs/020-tumor-marker-chapter20/snapshots/before.json` (not `$TEMP`). P132's "patient impact" must quote that
snapshot. If an existing byte-lock test goes red after the change, re-baseline only after showing its diff is exactly
one of the R2 rows (N36).

## 1. Baseline (before any edit)

```bash
npm test 2>&1 | grep -E "^ℹ (tests|pass|fail)"     # dev folder: 1698 / 1696 / 1 (T15e, environmental: dev DB/.env). Clean git-archive copy of HEAD: 1698 / 1696 / 0
node "$TEMP/claude_probe020.mjs"                    # the R2 table; save the output as before.txt
```

## 2. After the change

```bash
node "$TEMP/claude_probe020.mjs" > after.txt; diff before.txt after.txt   # only the R2 rows marked "Change" may differ
npm test 2>&1 | grep -E "^ℹ (tests|pass|fail)"     # fail count must equal baseline (only T15e)
```

## 3. Scenarios a test must lock in (each must fail on the pre-change tree: N10)

| # | Input (45-year-old unless stated) | Expected |
|---|---|---|
| Q1 | Free PSA ratio 18 % · «> 25» (male): **the real fixed bug** (`engine.test.js`) | row `verdict:"below"`, `dir:"low"`; text «پایین‌تر از مرزِ» (today: shown as inside the range, an under-read) |
| Q2 | Free PSA ratio 30 % · «> 25» | row `verdict:"within"`; text «داخلِ محدودهٔ» (today «بالاتر از مرزِ»: numerically true, wrong framing) |
| Q3 | PSA 4.0 ng/mL · «< 4.0» | `verdict:"above"`; `psa_result` urgency `this_week` (P132 reviewer item) |
| Q4 | AFP 7.0 ng/mL · «< 7.0» | `verdict:"above"`; row present in `_engine.tests` (today: absent) |
| Q5 | AFP 2.5 MoM on a prenatal sheet, pregnant profile; **and** the quad-screen form «AFP 35 IU/mL · Total hCG 29000» (`adapter.js:1686`) | prenatal path owns both; no tumour-marker row; all existing prenatal fixtures byte-identical before/after |
| Q5b | Calcitonin 12 pg/mL · «Male: < 8.4 Female: < 5», **sex unknown** | no guess between the two bands (expected `unreadable`/`noref`, measure first) |
| Q6 | PSA 1.2 · «< 4.0», female profile | verdict unchanged (`within`), `sexMismatch:true`, the R4 sentence in `psa_result` |
| Q7 | PSA 1.2 · «< 4.0», male profile | no `sexMismatch`, no R4 sentence |
| Q8 | sheet = PSA 6 · «< 4» + Hb normal | score equals the same sheet without the PSA row |
| Q9 | Calcitonin 12 pg/mL, no range | row `verdict:"noref"`, `abnormal:null`; text «چاپ نشده» |
| Q10 | PSA 3.0 · «40-49 y: <2.5 / 50-59 y: <3.5» | row `verdict:"unreadable"`; text «خوانده نشد» (already so before; only the row is new) |

## 4. Register check

- `grep -c "P132" ../MEDICAL_RULES.md` ≥ 1, in the same commit as the code.
- `MEDICAL_RULES_TUMOR_MARKERS.md` §6 lists 40 rules, 7 contradictions and the R5 table, each marked "secondary, unverified".
