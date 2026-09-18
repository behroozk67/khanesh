# Quickstart — Validating the Endocrine & Pituitary Feature

A run guide, not an implementation. Keys, labels and thresholds are defined in
[data-model.md](data-model.md); the response contract and guard ids in
[contracts/engine-output.md](contracts/engine-output.md).

## Prerequisites

- Backend dependencies installed: `cd khanesh-server && npm install`.
- `P46` exists in `MEDICAL_RULES.md`. For Stage B, each number it uses is marked approved.
- Never move Persian text through PowerShell 5.1 cmdlets (constitution V).

## 0. Measure the baseline — do not quote one

```bash
cd khanesh-server
npm test 2>&1 | grep -E "ℹ (tests|pass|fail)"
node -e "import('./rules/patterns.js').then(m=>console.log(m.RULES.length))"
```

Record both numbers and name the tree (working tree on `<sha>`). Expected delta after Stage B:
**+ (new tests)** tests — `M37` and `M38` scan the new module inside their existing test (measured; no subtest is added) when the new module is
imported (research.md R6) — and **+ 8** rules.

Freeze the duplicate panels (research.md R7) before any edit:

```bash
node -e "
Promise.all([import('./rules/adapter.js'),import('./rules/patterns.js')]).then(([a,p])=>{
  const P=[['TSH','6.0','FT4','0.7'],['TSH','4.8','FT4','1.2'],['TSH','12','FT4','1.2'],
           ['TSH','1.0','FT4','0.6'],['TSH','0.3','FT4','0.6'],['Na','128','Glucose','400']];
  for (const [n1,v1,n2,v2] of P) {
    const r=p.runPatterns(a.runEngine({patient:{age:40,sex:'F'},tests:[{name:n1,value:v1},{name:n2,value:v2}]}));
    console.log(n1+' '+v1+' / '+n2+' '+v2+' → '+r.findings.map(f=>f.pattern+'['+f.urgency+']').join(' + '));
  }})" > /tmp/dup-before.txt
```

## Stage A — before reviewer approval

1. `P46` written (data-model §7).
2. Guard tests `M101`–`M103e` appended to `rules/engine.test.js` (Node `fs.appendFileSync` or the
   Write tool — never PowerShell).
3. Run `npm test`. **Expected:** every id marked "red before" in the contract fails; `M103`
   passes. A red-marked test that passes here locks in nothing — fix the test, not the count.

## Stage B — after approval

Run the scenarios; each line is the expected outcome.

| panel (age 40) | expected |
|---|---|
| F, `Prolactin 80` alone | `hyperprolactinemia` [routine]; **not** the all-normal response |
| F, `Prolactin 22` | nothing about prolactin |
| M, `Prolactin 22` | `hyperprolactinemia` |
| sex unknown, `Prolactin 22` | `hyperprolactinemia` |
| F, `Prolactin 80` + `TSH 8` | `hyperprolactinemia` + existing thyroid finding; prolactin text links hypothyroidism |
| F, `Prolactin 80` + `TSH 2` + `FT4 1.2` | prolactin text says thyroid excluded |
| F, `Prolactin 80`, no TSH | prolactin text says not measured; suggestion «TSH و FT4» |
| F, `Prolactin 250` | [this_week]; pituitary sentence; pregnancy named; no "confirmed" |
| M, age 1, `Prolactin 30` | `hyperprolactinemia` — adult limits at every age (clarified) |
| `Cortisol (8 AM) 2` | `adrenal_insufficiency_likely` [this_week]; steroid medicines named; no stop-medicine advice |
| `Cortisol 2` (no time) | `cortisol_untimed` [routine] only; no verdict words; `CORTISOL` absent from `_engine.tests` |
| `Cortisol post dex 1.5` | no adrenal-insufficiency finding |
| `UFC` > 4×ULN + `ACTH 5` | `cushing_likely`; "adrenal source" |
| `UFC` > 4×ULN, no ACTH | `cushing_likely`; ACTH "not measured"; suggestion «ACTH» |
| `Cortisol (8 AM) 2` + `UFC` > ULN | `adrenal_discordant` only |
| `Cortisol (8 AM) 190 nmol/L` | converted to ≈ 6.9 µg/dL; a `unitConversions` row with a Persian `name` |
| `Cortisol 400` (no unit) | not graded; finding says the unit is unclear |
| `ACTH 80` alone | falls to `unexplained_abnormal` (expected — ACTH is a companion, never an owner) |

Then:

```bash
npm test 2>&1 | grep -E "ℹ (tests|pass|fail)"        # all green
# re-run the freeze command above into /tmp/dup-after.txt
diff /tmp/dup-before.txt /tmp/dup-after.txt           # must print nothing (FR-014)
node -e "import('./rules/patterns.js').then(m=>console.log(m.RULES.map(r=>r.id).sort().join('\n')))"
                                                     # id-set diff: 8 additions, 0 removals (N16)
cd ../khanesh && npm run lint                         # frontend (testCategories.js touched)
```

## Committed-tree check (N10)

Run the guard tests against `HEAD` with the `git archive` + `node_modules` junction recipe from
`CLAUDE.md` → "Commands". Every "red before" id must fail there. Skip the junction and
`api-contract.test.js` dies on `ERR_MODULE_NOT_FOUND` — that is not a result.
