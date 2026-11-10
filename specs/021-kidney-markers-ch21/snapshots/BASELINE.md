# specs/021 — measurements (2026-11-10)

| Tree | How | tests | pass | fail |
|---|---|---|---|---|
| `HEAD` (045c940), clean copy | `git archive HEAD khanesh-server`, `node_modules` junction, no `.env`, fresh DB, `node --test --test-reporter=tap` | 1709 | 1707 | 0 |
| Index tree `eec3f71`, clean copy | the same from `git write-tree` | 1721 | 1719 | 0 |
| Working tree (dev folder) | `node --test` in `khanesh-server/` | 1721 | 1719 | 1 (T15e, which comes from the dev folder's `database.sqlite`/`.env` and is green on the clean copy) |

- The 12 added tests are KD1–KD10, KD8b and KD9b.
- On `HEAD`, 10 of the 12 fail. KD3 and KD7 pass there because they are guards for behaviour that must not change.

## Rule-id set

`rule-ids-before.txt` has 277 ids; `rule-ids-after.txt` has 278. The diff is exactly `+uric_acid_low`.

## Probe (`probe.mjs`, 41 panels): `before.txt` → `after.txt`

Every hunk is in G1–G5:

- **G1**
  - ACR 3.0 and 3.2 mg/mmol, and AB4, go from A1 / no finding to A2 / `albuminuria_pattern` / `this_week`.
  - 30.1 and 33 mg/mmol go from A2 to A3; urgency stays `this_week`.
  - Every mg/mmol row's range now reads `0–26.5`.
  - mg/g rows are unchanged.
- **G2**: `unexplained_abnormal` is gone on all 7 panels (B4, G2a–G2f). G2g (dialysis) and G2h (urea emergency) are unchanged.
- **G3**: U1 and U2 go from `unmatched_abnormal` to `uric_acid_low`. U6 (no sex) and U7 (child) are unchanged.
- **G4**: the PCR spellings leave `unmapped`. P6, the molecular PCR negative control, is unchanged.
- **G5**: no visible change in the probe, which prints headlines only. The sentence is checked by KD10.

## Locks re-baselined, with proof

- **M125** (6th panel) and **X0** (`kidney`, runPatterns hash): both contain «Creatinine + Urea».
- **Proof.** On a copy of the working tree with only the G2 hunks removed (`$TEMP/khanesh-021-proof`), both give the old hashes again (9f92862b01304e03 and f7f33ea438235fe1).
- **Score.** X0's score hash did not change.
- **M58c.** Its sample of an unowned value was urea next to high creatinine, which is the gap G2 closes. The sample is now chloride 115, and an assertion that urea is no longer in the net was added.

## Local end-to-end (`e2e.mjs` → `e2e-output.txt`)

Run through `/api/analyze` on the restarted local server, with gpt-4o-mini and the mock email OTP user `local-qa-021@example.test`. All 6 panels came out as intended, and the model kept the engine's text (the urea sentence, the mg/mmol band, the pregnancy sentence). A PCR-only sheet gets «موتور هیچ‌کدام را تفسیر نکرد», not «طبیعی».
