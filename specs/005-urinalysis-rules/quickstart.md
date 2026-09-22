# Quickstart: Verifying Urinalysis Stage A

Everything here runs from `khanesh-server/`. None of it needs `.env` — the engine makes no network
calls, and its absence turns nothing red.

---

## 1. Reproduce the two defects before touching anything

This step is not optional. Constitution Principle IV requires every guard to be observed red against
the pre-fix code, and these probes are how you know what "red" is supposed to look like.

Save as a scratch file (not under `khanesh-server/` — a file named `*.test.js` or `test-*.js` there
is picked up by the pre-commit hook):

```js
// probe-casts.mjs — run with: node <path>/probe-casts.mjs   (from khanesh-server/)
const FULL = (extra) => [
  { name: "Color", value: "Yellow" }, { name: "Specific Gravity", value: "1.020" },
  { name: "pH", value: "6.0" }, { name: "Nitrite", value: "Negative" },
  { name: "Urobilinogen", value: "Normal" }, { name: "Bacteria", value: "Few" }, ...extra,
];
const PANELS = [
  ["D1 rbc cast misread",   [{ name: "Nitrite", value: "Negative" }, { name: "WBC", value: "2-3", unit: "/hpf" },
                             { name: "RBC Casts", value: "5-8", unit: "/lpf" }]],
  ["D2 wbc cast misread",   FULL([{ name: "Leukocyte Casts", value: "8-10", unit: "/lpf" },
                                  { name: "WBC", value: "2-3", unit: "/hpf" }])],
  ["D2 other spelling",     FULL([{ name: "WBC Casts", value: "8-10", unit: "/lpf" },
                                  { name: "WBC", value: "2-3", unit: "/hpf" }])],
  ["X1 blood argues",       FULL([{ name: "Blood", value: "+2" }, { name: "RBC", value: "0-2", unit: "/hpf" }])],
  ["X2 esterase argues",    FULL([{ name: "Leukocyte Esterase", value: "+1" }, { name: "WBC", value: "0-1", unit: "/hpf" }])],
];
// Imports resolve against the working directory, not this file — so the probe can live outside
// khanesh-server/ (where the test runner would pick it up) and still load the live engine.
import { pathToFileURL } from "node:url";
const R = (p) => pathToFileURL(`${process.cwd()}/${p}`).href;
const { runEngine } = await import(R("rules/adapter.js"));
const { runPatterns } = await import(R("rules/patterns.js"));
for (const [label, tests] of PANELS) {
  const r = runPatterns(await runEngine({ patient: { age: 40, sex: "male" }, tests }));
  console.log(label.padEnd(22), "→", r.findings.map((f) => `${f.pattern}/${f.urgency}`).join(", ") || "(nothing)");
}
```

**Expected on the pre-fix tree** (measured at `395a5d7`):

```
D1 rbc cast misread    → hematuria/this_week
D2 wbc cast misread    → uti_likely/this_week
D2 other spelling      → (nothing)
X1 blood argues        → hematuria/this_week
X2 esterase argues     → (nothing)
```

If your output differs, stop. Either the tree has moved, or the fixtures are wrong — and a fixture
that doesn't reproduce the bug will produce a guard that passes on the broken code.

⚠️ **Do not shorten the X1/X2 fixtures to two rows.** A bare `Blood +2` is routed to `unmapped`
because `blood` is only treated as urinary on a page the adapter recognises as a urine page
(research R5). A two-row X1 produces `(nothing)` on the pre-fix tree for the wrong reason, and a
guard built on it locks in nothing.

---

## 2. Capture the baseline — measured, never copied

```bash
cd khanesh-server
npm test 2>&1 | tail -8
node -e "import('./rules/patterns.js').then(m=>console.log(m.RULES.map(r=>r.id).sort().join('\n')))" > <scratch>/ids-before.txt
wc -l < <scratch>/ids-before.txt
```

Record the `tests · pass · fail · todo` line **and** name the tree it came from. Do not use the
figure in `CLAUDE.md` — it describes an earlier moment.

---

## 3. After implementation — the verification run

```bash
cd khanesh-server
npm test 2>&1 | tail -8                                      # must be: fail 0
node <scratch>/probe-casts.mjs                               # see expected output below
node -e "import('./rules/patterns.js').then(m=>console.log(m.RULES.map(r=>r.id).sort().join('\n')))" > <scratch>/ids-after.txt
diff <scratch>/ids-before.txt <scratch>/ids-after.txt        # only '>' lines — Stage A deletes nothing
```

**Expected probe output after the fix** — the property that matters, not the exact rule ids:

| Panel | Must no longer happen | Must happen |
|---|---|---|
| D1 | `hematuria` fires | a red-cell cast finding fires |
| D2 | `uti_likely` fires | a white-cell cast finding fires |
| D2 other spelling | silence | the same white-cell cast finding as D2 — the two spellings now agree |
| X1 | the haematuria text asserts intact red cells | the text names the pad reaction without intact cells |
| X2 | silence | the text names sample handling and non-bacterial causes |

The row "D2 other spelling" is the most important one. Two spellings of one row currently produce
two different reports; after the fix they must produce the same one. That is the N2 check.

---

## 4. Negative controls — the fix must be inert where it has nothing to do

Each of these must produce **byte-identical** output before and after (`FR-004b`, `SC-003`):

- A full urine sheet with loose RBC 20-30/hpf, blood +3, protein +2 — no cast row.
- A full urine sheet with nitrite positive, esterase +2, WBC 15-20/hpf — no cast row (the ordinary UTI).
- A CBC-only panel.
- A combined CBC + biochemistry + urine sheet with no cast row.

Capture each finding's full text before, and diff. "Same rule ids fired" is not the check — the
cross-check sentences live *inside* existing rules, so a changed sentence would not change the id.

---

## 5. The guards, and how to confirm each one is real

For each new guard in `rules/engine.test.js`, prove it red on the pre-fix code:

```bash
git stash                                    # or: git archive HEAD khanesh-server | tar -x -C <tmp>
# copy ONLY the new engine.test.js into the pre-fix tree
node --test rules/engine.test.js 2>&1 | grep -E "^not ok|^# (pass|fail)"
git stash pop
```

⚠️ If you use `git archive`, junction `node_modules` in first, or `api-contract.test.js` fails on
`ERR_MODULE_NOT_FOUND` and inflates the fail count by ten. Running `engine.test.js` alone avoids that
trap entirely and is sufficient here.

The expected red set is exactly the Stage A guards that assert new behaviour. Freeze guards — the
negative controls in §4 — must be **green** on the pre-fix tree, because they assert that nothing
changed. A freeze guard that is red before the fix is testing the wrong thing.

---

## 6. Done when

- `npm test` is `fail 0`, and the before/after numbers are both recorded with their trees named.
- All five probes in §1 produce the post-fix properties in §3.
- The rule-id diff shows additions only.
- Every new behavioural guard was observed red on the pre-fix tree; every freeze guard was observed green.
- `MEDICAL_RULES.md` has `P50` with the three thresholds and three open questions.
- `CLAUDE.md`'s Lab Notebook has the entry for this defect class.
