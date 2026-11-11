# Quickstart: validating specs/023

Run everything from the repo root unless a step says otherwise.

1. **Probe after implementation** and diff against the baseline:
   ```bash
   D=specs/023-autoimmune-immunology-rules
   (for f in probe_rows probe_panels probe_edges probe_023; do echo "=== $f"; node $D/snapshots/$f.mjs; done) > $D/snapshots/after.txt 2>&1
   diff $D/snapshots/before.txt $D/snapshots/after.txt
   ```
   Expected:
   - Every in-scope `UNMAPPED` row in `before.txt` now has a rule id and a sentence quoting its value.
   - The only rows still `UNMAPPED` are IgG1–4, CD4, C1-INH, OCB and IgG index.
   - `TPO 20 printed <30` is not abnormal.
   - `RF 18 with <15 printed` is abnormal, with `rf_positive`.

   `probe_023.mjs` is the new panel set from tasks.md:
   - celiac, for a child and an adult;
   - IgA deficiency;
   - liver antibodies, with and without ALT;
   - MG;
   - Anti-DNase B at three ages;
   - APS at 30/45/85;
   - immunoglobulins in a child;
   - the name-collision rows.

2. **New tests** (`khanesh-server/`): `node --test rules/autoimmune3.test.js` gives all pass.

3. **Run them against the pre-change tree.** They must fail there (N10):
   ```bash
   T=$TEMP/k023 && rm -rf $T && mkdir -p $T && git archive b7eb497 khanesh-server | tar -x -C $T
   # junction node_modules (PowerShell): New-Item -ItemType Junction -Path $T/khanesh-server/node_modules -Target khanesh-server/node_modules
   cp khanesh-server/rules/autoimmune3.test.js $T/khanesh-server/rules/ && (cd $T/khanesh-server && node --test rules/autoimmune3.test.js)
   ```

4. **Full suite** (`khanesh-server/`): `npm test` passes, except for the known T15e dev-DB failure, which is named in the report. Metamorphic passes with `ALLOWED_DROPS` unchanged.

5. **Integrity:** `M32` (FA names), `GR1` (groups), `M36` (RULES integrity) and the `SUGGEST_TESTS` coverage test all pass inside step 4.
