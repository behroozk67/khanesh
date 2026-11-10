# Quickstart: validating specs/021

All commands run from `khanesh-server/`.

1. **Probe, before and after.**
   ```bash
   node ../specs/021-kidney-markers-ch21/snapshots/probe.mjs > ../specs/021-kidney-markers-ch21/snapshots/after.txt
   diff ../specs/021-kidney-markers-ch21/snapshots/before.txt ../specs/021-kidney-markers-ch21/snapshots/after.txt
   ```
   Expected: the only differences are on the G1–G5 panels.
   - A1/A3 tags are raised.
   - The G2 panels lose `unexplained_abnormal`.
   - U1/U2 lose `unmatched_abnormal` and gain `uric_acid_low`.
   - The PCR rows leave `unmapped`.
   - The B2 text gains the pregnancy sentence.

2. **Regression tests.**
   ```bash
   node --test rules/engine.test.js
   ```
   KD1–KD10 pass, and each one fails on `HEAD`. To show that, run them against a `git archive HEAD` copy.

3. **Rule-id diff.**
   ```bash
   node -e "import('./rules/patterns.js').then(m=>console.log(m.RULES.map(r=>r.id).sort().join('\n')))"
   ```
   Compare with the same command on `HEAD`. Expected: exactly `+uric_acid_low`.

4. **Full suite on a clean copy.** Run `git archive` of the index into a temp dir, junction `node_modules` in, then run `node --test`. Expected: 0 failures.

5. **Local end-to-end.** With the server on 8787, send these through `/api/analyze`:
   - ACR 3.2 mg/mmol;
   - Urea 80 + Cr 2.0;
   - Uric acid 1.5 (M);
   - UPCR 60 mg/mmol;
   - pregnant, urea 12.

   Then read the Persian `interpretation` and `_engine.tests`.
