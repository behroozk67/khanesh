---
name: professional-interpretation
description: Make a Khanesh/LabMate clinical interpretation read like a professional's write-up (magnitude, mechanism, confirmation criteria, concrete next steps, red-flags, caveats) WITHOUT upgrading the LLM — by enriching the deterministic engine's `must_say` findings. Use when the user says an interpretation is too shallow/basic ("ابتدایی"), wants "تفسیر حرفه‌ای‌تر", or asks to enrich a pattern/test in khanesh-server/rules/patterns.js.
---

# Professional Interpretation Enrichment

The depth of an interpretation lives in the engine's findings, **not** in the model. The
LLM only rewrites `must_say` into fluent Persian (see [architecture.md](../rules/architecture.md)) —
it never decides anything. So "make it more professional" = write richer `must_say` /
`warnings` / `suggest` in `khanesh-server/rules/patterns.js`. A cheap model formatting a
rich finding beats an expensive model formatting a thin one, and stays deterministic and safe.

Do **not** propose a model upgrade, a smarter prompt that "reasons more," or moving clinical
judgment into `prompt.js`. That breaks the boundary and the user has explicitly ruled it out.

## The 6-element template (what "professional" means)

Every enriched finding should carry, in Persian, as many of these as apply:

1. **Magnitude, not just direction** — the actual number *and* the normal range:
   `مقدار شما ۹۰ است (حد طبیعی ۱۵۰ تا ۴۵۰)`, not merely "پایین است". Prefer a
   derived, patient-legible number when one exists (eGFR as "٪ ظرفیت کلیه", A1c as eAG).
2. **Brief mechanism** — one plain sentence on *why* / what it reflects physiologically.
3. **Confirmation criteria** — is one result enough, or does it need a repeat / a second
   test? Get this right (see diabetes below — a wrong "needs repeat" is a real defect).
4. **Concrete next step + timeframe** — a specific action, not "به پزشک مراجعه کنید" alone.
5. **Red-flag symptoms** → put in `warnings` (and, when truly urgent, `must_say` with
   `emergency` urgency so the server safety-net force-appends it).
6. **Caveats / limitations** — e.g. "برای «مزمن» بودن باید بیش از سه ماه پایدار بماند".

## How to enrich a rule's `build(e)`

Inside a rule in `patterns.js`, `build(e)` returns
`{ pattern, urgency, headline, must_say, action, suggest, forbid, warnings, blocks_others, key_number? }`.

- Read values with `val(e)` (`t.HBA1C`, `t.GLU_F`, …) and graded results with
  `e.graded.find(g => g.test === "X")` → `{ value, range, abnormal, dir, ctcaeGrade, tag, fa }`.
  Derived indices: `e.indices.egfr`, `e.indices.anion_gap`, `e.indices.bun_cr`.
- Build `must_say` as magnitude → mechanism → confirmation → caveat, in that order.
- **`key_number`** — when the finding hinges on a computed number (eGFR, eAG, anion gap),
  set `key_number` so the server magnitude safety-net can re-inject it if the model drops it:
  `...(egfr != null ? { key_number: egfr } : {})`. Put that same number in the **first
  sentence** of `must_say` (the safety-net prepends the first sentence).
- All strings Persian, digits fine either way (the safety-net normalizes Latin/Persian digits).

### Worked exemplars already in the tree

Read one before writing — they are the style target, not just examples.

- **Diabetes (`glycemia`)**: `dmHits` counts independent diabetic tests → `dm`/`confirmed`.
  eAG = `Math.round(28.7 * t.HBA1C - 46.7)` (ADAG/Nathan 2008). ADA "two different tests on
  one sample = confirmed" → drop the wrong "باید تکرار شود" when `confirmed`, add fundus exam.
  DKA/HHS red-flag when `marked` (glucose ≥250 or A1c ≥10).
- **Kidney (`kidney`)**: KDIGO `stage` word (مرحلهٔ ۲…۵) from `egfr`, framed as "~N٪ ظرفیت",
  plus the ">3 months = مزمن" caveat.
- **Magnesium (`magnesium_depletion`)** — the most compact full example: value+range, the
  mechanism that *changes management* ("تا منیزیم اصلاح نشود پتاسیم و کلسیم درست نمی‌شوند"),
  an arrhythmia red-flag in `warnings`, and a **drug-interaction warning** (digoxin toxicity).
  Drug interactions belong in `warnings` whenever the electrolyte/organ finding implies one.
- **Thyroid (`thyroid`)** — shows two things: (a) *ordering matters*, the discordant FT4-high
  branch must run before the TSH-high branch or it mislabels as subclinical hypothyroidism
  (a real fixed bug); (b) **pre-analytical causes are part of the interpretation** — biotin,
  levothyroxine timing. When a result is more likely artifact than disease, say so.
  It also folds in secondary findings the primary diagnosis explains (Na↓, CK↑, anemia).
- **Lipids (`lipid_profile`)** — per-component number + target (`مطلوب زیر ۱۰۰`), a severity
  branch with its own pattern id (TG>880 → pancreatitis risk), a derived index (`non_hdl`),
  and the **Friedewald caveat** (TG>400 invalidates calculated LDL). Assay-validity caveats
  are element #6.

## Three cross-cutting fixes this pattern relies on

- **CTCAE never reaches the patient in English.** `prompt.js` maps grade→Persian word via
  `SEVERITY_FA = {1:"خفیف",2:"متوسط",3:"شدید",4:"بحرانی"}`. Never emit `CTCAE Grade N`.
- **Server magnitude safety-net** (`server.js`, inside the `patternOut.findings` block):
  if the model's text omits a finding's `key_number`, it prepends that finding's first
  `must_say` sentence. Mirrors the existing emergency-`must_say` net. Keep both.
- **No raw engine key in patient text** — `HGB`, `BILI_T`, `LDH` are internal. `prompt.js`
  passes every graded test through `faName()` (`rules/names.js`) before the LLM sees it,
  and `unmatched_abnormal` does the same when it names the worst test. Enriched prose is
  usually hand-written Persian so this rarely bites — but the moment you interpolate a key
  (`${g.test}`, a loop over `e.graded`, a `suggest` built from keys), wrap it: `faName(g.test)`.
  `faName()` silently falls back to the raw key, so this fails as a patient-visible string,
  never as an exception. Adding a new test? Add it to `FA_NAMES` too.

## Verify (this is not optional)

1. `cd khanesh-server && npm test` — all regression tests pass. The `.githooks/pre-commit`
   gate runs this automatically on any staged `khanesh-server/**.js`, so a shallow-to-rich
   edit that breaks an old assertion blocks the commit. Fix the rule or update the test —
   don't reach for `SKIP_HOOKS=1`. (The gate depends on `core.hooksPath=.githooks`, which is
   local config and *not* committed — a fresh clone silently has no gate, so run `npm test`
   yourself rather than trusting the hook to exist.)

### The trap this rule keeps hitting: an absent test is not a normal test

Enrichment means writing branches per finding, and the tempting shape is
`abnormalHigh ? "…بالاست…" : "…طبیعی است…"`. That `else` also catches **abnormal-low** and
**never measured**, so the engine tells the patient a result they never had. This has now
happened for real (rhabdomyolysis: «شاخص کلیه (کراتینین) هنوز طبیعی است» on a sheet with no
creatinine). Inside an `emergency` + `blocks_others` finding it is the only text the patient
sees, and no safety net downstream can catch it — `must_say` is carried through verbatim.

Always branch three ways: abnormal / measured-but-not-abnormal / **not measured at all**
(`const measured = g != null`). And write the missing-test case as a *gap to close*
(«اندازه‌گیری نشده؛ بررسی‌اش فوری است»), never as reassurance.
2. **Add a regression test** in `rules/engine.test.js` for the specific improvement (one test
   per fixed bug, commented in Persian; it must fail against the old shallow output). E.g. M13
   asserts eAG=298 + confirmed-no-repeat; M14 asserts `key_number === e.indices.egfr`.
3. End-to-end sanity via the API — **but watch the Windows/curl UTF-8 trap**: passing Persian
   literals through `curl --data-binary '...'` or node `argv` mangles them to `???`, which
   silently breaks `inferSex`/age → derived numbers (eGFR) never compute. **Always write the
   JSON payload to a file with the Write tool (real UTF-8), then `curl --data-binary @file`.**
   (Vite binds IPv6-only `[::1]`; curl to the frontend port returns 000 but the browser works —
   not an app bug.)
4. Then run `code-reviewer` before committing.

See [rules-engine.md](../rules/rules-engine.md) for grading modes and the add-a-test checklist.
