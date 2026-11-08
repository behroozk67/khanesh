# Quickstart: validating tumour-marker rules

Run from the repo root; backend commands from `khanesh-server/`. Name the tree for every number you quote (working tree vs `HEAD`).

## 0. Baseline (before any edit)

```bash
cd khanesh-server && npm test 2>&1 | tail -15      # record pass/fail counts and "tree: working tree @ HEAD <sha> + dirty"
```
A failing baseline test is a finding to report, not to fix here. To measure `HEAD` itself: `git archive HEAD khanesh-server | tar -x -C <tmp>`, junction `node_modules` in, `node --test`.

## 1. Reproduce the defect (must be red before the change)

Feed the live sheet through `runEngine` (see research.md §1 for the rows) and assert:
- CEA 27.97 / «Non smoker: < 5   Smokers: < 10» → verdict `above`, text states both limits and that smoking status is unknown.
- CA 15-3 11.6 / «At or below: 31.0» → `within`.
- CA 125 10.3 / «0-35» → `within` (unchanged).
- None of the three produce «خوانده نشد».

## 2. Range-reader table (pure module)

`node --test rules/tumor_markers.test.js` — per wording × boundary (on limit, one least-significant unit below/above); separators `/ ; | ، \n` and spaces; contradictory two-band → `unreadable`; labelled multi-band never reduced to first band.

## 3. CEA smoking regions

CEA 3 / 7 / 12 vs the two-band range → within / between / above; text for `between` says the answer depends on smoking status.

## 4. Row contract

For the live sheet, `serializeGraded`-built `tests` contains `CEA`, `CA125`, `CA153` with Persian `name`; a no-range marker row has `abnormal: null`, `verdict: "noref"`. Panel with markers added: `has_critical` false, urgency ≠ `emergency`, score and PhenoAge unchanged.

## 5. Frontend

```bash
cd khanesh && npm run lint
```
Then trace by reading: `resultStates.stateOf` returns `norange` for `abnormal: null`; `buildVerdictContext` ignores `source: "tumor_marker_printed"`; each consumer in research.md §5 reviewed.

## 6. Regression guards

- Each new test is run against the unmodified tree first and observed red.
- `RULES` id set diff before/after (no id removed).
- Full `npm test` after; any moved freeze test explained individually.
- `git diff --cached` shows only this feature's hunks (shared dirty tree: `server.js`, `Tafsir.jsx`, `CLAUDE.md`).

## 7. Sources gate

`MEDICAL_RULES_TUMOR_MARKERS.md` exists, every patient-text claim cites a verbatim opened passage with section/table, unopened sources are marked «بدون قاعدهٔ بالینی».
