# Quickstart — validating 002

All commands run from `khanesh-server/` unless noted. Persian test text is appended only with
the Write/Edit tools or Node `fs`, never with PowerShell (Constitution V).

## 0. Baseline — measure it, don't quote it

```bash
npm test 2>&1 | tail -8          # record tests / pass / fail / todo, and say "working tree"
node -e "import('./rules/patterns.js').then(m=>console.log(m.RULES.length))"
node -e "import('./rules/patterns.js').then(m=>console.log(m.RULES.map(r=>r.id).sort().join('\n')))" > /tmp/ids-before.txt
```

Committed-tree baseline: use the `git archive` + `node_modules` junction recipe in `CLAUDE.md`
→ Commands.

## 1. The misreading this feature removes (Stage A)

Run the probe from [research.md](research.md) R2 through `runEngine` + `runPatterns`:
`Volume 2.5 · pH 8.4 · Count 40 · WBC 15-20 · RBC 8-10` (sex M, age 35).

- **Before:** the findings include `hematuria`.
- **After:** no urinary finding. `pH`, `WBC` and `RBC` resolve to `SEMEN_PH`, `SEMEN_WBC` and
  `SEMEN_RBC`.

Negative control (N10): run `M104` against `HEAD` using the archive recipe. It must be red.

## 2. Nothing else moved (Stage A and B)

`M104c`, `M104d` and `M111` must be green both before and after. Also diff the rule-id set:

```bash
node -e "…same as §0…" > /tmp/ids-after.txt; diff /tmp/ids-before.txt /tmp/ids-after.txt
```
Stage A: no difference. Stage B: **additions only**, exactly the 8 ids in
[contracts/engine-output.md](contracts/engine-output.md). Any removal is a clinical deletion (N16).

## 3. Recognition (Stage A)

`M105`, `M105b` and `M105c` are green. `unmapped` for the probe panels in the spec's "context"
table drops to zero for this feature's analytes. `Protein (urine)` stays unmapped (out of scope,
recorded).

## 4. Stage B — only rows of `P47` that the reviewer has approved

For each approved row, un-`todo` its guards and watch them go red → implement → green. Then:

- `M110` (sweep) green: no silence and no double ownership.
- `T19` green: an ungraded-only sheet (for example `FSH 12` for a woman with no cycle day) takes
  the engine path and gets `reproductive_hormone_context`, **not** `buildNormalResult`.
- Manual spot check of patient text: one semen panel, one male low-T panel, one hCG panel.
  Paste the Persian verbatim into the change description for review.

## 5. Gates

```bash
npm test                         # khanesh-server — 0 fail; todo count = unapproved P47 rows
cd ../khanesh && npm run lint    # only if testCategories.js changed
```
Update `CLAUDE.md`: the baseline row (named tree), the rule count, and a Lab Notebook entry for
the semen → urine misreading (a new N entry, or a recurrence under N2/N18).
