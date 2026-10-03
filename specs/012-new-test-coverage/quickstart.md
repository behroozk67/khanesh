# Quickstart — validating specs/012

## Prerequisites
- `khanesh-server/node_modules` and `khanesh/node_modules` installed.
- No `.env` is needed for tests.
- Bash or the Edit/Write tools for any Persian text. Never use PowerShell `*-Content` (N15(d)).

## 0. Baseline (re-measure; do not copy the number from plan.md)
```bash
cd khanesh-server && npm test 2>&1 | grep -E "^ℹ (tests|pass|fail|todo)"
node -e "import('./rules/patterns.js').then(m=>console.log(m.RULES.map(r=>r.id).sort().join('\n')))" > /tmp/ids-before.txt
cd ../khanesh && node src/content/coverage.mjs | head -3
```

## 1. Story 1
```bash
cd khanesh && npm run lint && npm run build && node src/content/coverage.mjs | head -3
```
Expected:
- lint shows 0 errors.
- The build succeeds.
- The «بدون محتوا» count is not higher than at baseline.
- Each of the 9 names shows tier `photo` (or `panel` for Thyroid Panel). Check with `grep -n` on `testCatalog.js`.

Run the row-0 section of `specs/012-new-test-coverage/probe012.mjs` (research §P0-1) and confirm the same 9 findings still fire.

## 2. Story 2 — routing then readers
```bash
cd khanesh-server
node --test rules/engine.test.js     # M301–M312 green
node --test api-contract.test.js     # T45–T46 green
```
Manual probe (re-run `specs/012-new-test-coverage/probe012.mjs`). Expected tier-1 rows:

| row | expected finding |
|---|---|
| VDRL Reactive 1:8 | `syphilis_screen_result`, this_week |
| Rubella IgG 4 IU/mL + pregnant | `rubella_igg_status`, this_week |
| Indirect Coombs Positive + pregnant | `indirect_coombs_result`, this_week |
| H. pylori Ag Positive | `h_pylori_result`, routine |
| Anti-Tg 300 IU/mL (<115) | `thyroid` |
| Tg 180 mg/dL | `dyslipidemia` (TG, unchanged) |
| Coombs Wright 1/160 | `brucella_active` (unchanged) |

Negative controls:
- `VDRL: +/-` goes to «تفسیر نشدند», not to reactive.
- `Rubella IgM: Positive` goes to `unmapped`.

## 3. Story 4
Run the semen spelling sweep (M313): every spelling routes to `SEMEN_*`, `semenQual` named, or `unmapped`. None may be silent.

## 4. Red-first proof (Constitution IV)
```bash
git stash push -- khanesh-server/rules khanesh-server/server.js   # keep the test files
node --test rules/engine.test.js ; node --test api-contract.test.js    # new tests MUST fail
git stash pop
```

## 5. Rule-id diff
After the change, dump the ids to `/tmp/ids-after.txt` and run `diff /tmp/ids-before.txt /tmp/ids-after.txt`.

Expected: only these lines are added:
- `+h_pylori_result`
- `+indirect_coombs_result`
- `+rubella_igg_status`
- `+syphilis_screen_result`

There must be no `-` lines.

## 6. Full gate
```bash
cd khanesh-server && npm test      # fail 0; tests = baseline + new
cd ../khanesh && npm run lint && npm run build
```

---

## Measured during /speckit-implement (2026-10-03, working tree; HEAD `7b81c9e`; a concurrent session's edits are in the same tree)

| Step | Result |
|---|---|
| §0 baseline | `tests 848 · pass 847 · fail 0 · todo 1` (todo = pre-existing `M154b`); `RULES.length` 192; frontend lint clean; coverage.mjs «بدون محتوا» 0 |
| T005 (`qualState` moved) | `848 · 847 · 0 · todo 1`, identical |
| §4 red-first: implementation files (`adapter.js`, `patterns.js`, `patterns_endocrine_rheum.js`, `names.js`, `server.js`) set to `HEAD`, tests kept | `serology.test.js`: 13 of 14 fail (S08 freeze green by design); T45, T46 and T47 fail, T48 passes (freeze on behaviour that was already correct). With **only** `server.js` at `HEAD`, T45 fails on «VDRL به‌عنوانِ ردیفِ توضیح‌داده‌نشده گزارش شد» (the `QUAL_WORDS` fix) |
| US4 red-first | S13/S14 red before the `listedSemenRows` change (full-suite run: `862 · 859 · 2 fail`) |
| §5 rule-id diff | `+h_pylori_result +indirect_coombs_result +rubella_igg_status +syphilis_screen_result`, no `-` lines; `RULES.length` 196 |
| §6 full gate | `tests 866 · pass 865 · fail 0 · todo 1`; frontend lint clean; build OK; coverage.mjs 0 / 0 / 0 |
| T042b C1 audit | Numeric literals in `serology.js` / `patterns_serology.js` / the thyroid helpers are all array indices or doc comments, except `e.age < 1` (rubella: no immunity claim for infants). That one is recorded in P68 question 6 |

## After review fixes (2026-10-03)

| Step | Result |
|---|---|
| Review | `code-reviewer`: 5 findings (CR1–CR5). `eval-medical-reviewer`: **FAIL** with 5 blockers (B1–B5) and 8 notes. All blockers and CR1–CR5 fixed, plus notes 1, 2, 6, 7 and 8. Notes 3, 4 and 5 went to P68 as reviewer questions, or as an out-of-scope bug |
| Red-first for the fixes | S15–S22 added first: `22 tests · 14 pass · 8 fail` before the fixes |
| Full gate | `npm test`: `tests 874 · pass 873 · fail 0 · todo 1` (todo = pre-existing `M154b`). Rule-id diff `+4 / −0`, `RULES.length` 196. `khanesh`: lint clean, build OK, coverage.mjs 0 / 0 / 0 |
| Shell-escaping incident | Three regexes written through a `node -e` one-liner lost their backslashes: the whitespace and digit escapes became plain letters, and a word-boundary escape became a literal backspace control character. They were in `patterns_reproductive.js`, `serology.js` and `server.js`. All three were found and fixed with the Edit tool, and a control-character scan of every touched file is clean. Lesson: write regex-bearing edits with the Edit tool, never through the shell (same as the N18 `$&` note in CLAUDE.md) |
