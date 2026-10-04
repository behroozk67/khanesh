# Research: Prenatal Serum Screening

## Decisions

| # | Decision | Rationale | Alternatives rejected |
|---|---|---|---|
| D1 | Separate ungraded `prenatal` channel | N25: a renamed row in `qual`/`tests` is still caught by old regex readers (`/hcg/`, tumour-marker AFP). The hemostasis channel (specs/010) is the working precedent incl. the `server.js` fallback-gate line | Re-label rows and keep in `qual` (known to fail); grade MoM against a 0.5–2.0 range (⚠️ unsourced band) |
| D2 | Two-pass identity claim (strong names or MoM unit, then weak names) | Clarification Q3; a single-pass name map cannot know whether a bare hCG is a screening value | Profile pregnancy flag as signal (rejected by Q3); name-only (collides with pregnancy test) |
| D3 | One classifier per arm returning one label | Prevents two contradictory findings by construction (N20, `mineralAxis` precedent) | Independent `match` per pattern |
| D4 | Executable only where every cut-off is ✅ | FR-010, `MEDICAL_RULES.md` discipline | Fill gaps from general knowledge (forbidden) |
| D5 | Lab-printed risk/category prevails; engine bands only when none printed | FR-011; labs differ in cut-offs (source §3-4) | Engine recomputes risk (out of scope, would need weight/ethnicity/etc.) |
| D6 | No profile gestational-age field; sheet only | Clarification Q2 | New profile field (extra surface, privacy, no value) |
| D7 | New test file `prenatal.test.js` | `serology.test.js` precedent: avoids merge clashes in `engine.test.js` | Append to `engine.test.js` |

## Source thresholds: executable vs pending

| Item | Source value | Mark | Plan |
|---|---|---|---|
| NT raised | ≥ 3.0 mm or ≥ 99th percentile | ✅ | executable |
| PAPP-A low (outcome definition) | < 0.4 MoM (some < 0.5; severe < 0.2) | ✅ | executable at < 0.4 for the finding; follow-up protocol pending |
| T21 first-trimester: free β-hCG ↑ | > 1.5 MoM with PAPP-A low and NT high | ✅ | executable together with the two partners |
| T21 first-trimester: PAPP-A | < 0.5 | ✅ | executable |
| FMF bands | > 1:100 / 1:100–1:1000 / < 1:1000 | ✅ | executable when no lab category printed |
| Quad T21 / T18 / NTD | < 1:270 neg / < 1:100 neg / AFP < 2.5 neg | ✅ | executable when no lab category printed |
| AFP ≥ 2.5 MoM | NTD arm | ✅ | executable |
| AFP low | < 0.5 MoM | ✅ | executable as isolated-marker association |
| uE3 low / very low | < 0.5 / ≤ 0.10 | ✅ | executable |
| Inhibin A high | ≥ 2.0 | ✅ | executable |
| hCG high | > 2.0 (some) vs > 3.0 (CAOG) | ✅ but conflicting | pending (choose one) |
| hCG low, T18/T13/Turner/triploid MoM direction cuts | "↓↓", no number | — | pending; named without label |
| 0.5–2.0 MoM single-marker band | convention | ⚠️ | pending; not used |
| Affected-fetus medians | approximate | ⚠️ | not used |
| Aspirin, PAPP-A growth/BP protocol | — | ⚠️ | not used |
| T18/T13 FTS risk cut-off | 1:100–1:150 | ⚠️ | lab's printed category only |
| `soon` tier for T18/T13/triploid | none in source | owner decision (Q1) | pending confirmation |

## Unknowns: measured 2026-10-04 (working tree, `runEngine` + `runPatterns`, pregnant F 30)

1. **What the rows become today.** Every MoM row (Free β-hCG, PAPP-A, AFP, uE3, hCG, Inhibin A), NT in mm, and «Risk Trisomy …» rows go to `unmapped`; nothing fires. Free β-hCG in IU/L or unitless is also `unmapped`. Full table in spec.md "Current Behaviour".
2. **Free β-hCG collision: none.** It is deliberately unmapped (adapter comment above `betahcg`, M105). The spec's earlier claim was wrong and has been corrected.
3. **Readers that claim the rows: the live defect.** On a concentration-unit quad sheet, `AFP 35 IU/mL` goes to `ungraded.AFP` and fires `tumor_markers_result` (patterns_autoimmune.js), with liver-surveillance and cancer-screening text. `Total hCG 29000` goes to `ungraded.HCG` and fires `hcg_result` («تستِ بارداریِ خون مثبت است»). Decision: the two-pass claim (D2) must cover concentration-unit quad sheets too. AFP/hCG are claimed whenever a companion (uE3/estriol, Inhibin A, PAPP-A, NT, Free β-hCG) or a MoM unit is on the sheet, so `tumor_markers_result` and `hcg_result` never see them. This is the first guard to write (red on today's tree).
4. **Routing.** A sheet with only `unmapped` rows reaches `buildUninterpretedResult` (P78; `server.js` fallback gate, line ~1145). After this feature, a prenatal-only sheet must pass that gate. Decision: add a `hasPrenatal` term beside `hasHemostasis`.
5. **Real Iranian sheet spellings: not resolved here.** No real sheet was available in this session. Task T001 collects them (from user-supplied sheets or the `research` agent) before `NAME_MAP`-style entries are written. The name list in the plan is a starting set, not a claim of coverage (N2).

Also confirmed: `estriol` alone is not mapped today; the weak-name list for D2 is {AFP, hCG/total hCG/β-hCG, estriol}.

## Baseline (T001, measured 2026-10-04)

- Tree: branch `013-prenatal-serum-screening`, `HEAD` `4121a8b` + uncommitted changes from other sessions.
- `node --test` before this feature: **994 tests · 993 pass · 0 fail · 1 todo** (`M154b`, TODO P49-د). Rule count **217**.
- After: **1019 · 1018 · 0 · 1 todo**. Rule count **231** (+14 `prenatal_*`, −0, id-set diff per N16).
- Red-before (`git archive HEAD` + `node_modules` junction): `rules/prenatal.test.js` **1 pass · 23 fail** (the pass is `PN02`, the deliberate freeze); `T53` **0 · 1**.
  The first run showed `PN44` and `PN50` passing vacuously on `HEAD`. Both got positive assertions (N10/N15) and are now red there.

## Sheet spellings (T002)

**Not collected — no real double/quad sheet was available in this session.** The names in `rules/prenatal.js` are a starting set
(English lab-report spellings plus a few Persian forms), not a measurement. Before relying on this in production, run 3–5 real Iranian
sheets through the engine and count `unmapped` (N2). Registered as P81 question 8.

## Deviations from data-model.md (made during implementation)

- **Isolated quad markers folded into one finding.** `prenatal_afp_low`, `prenatal_ue3_low` and `prenatal_inhibin_high` became per-marker
  sentences in `prenatal_marker_notes`. Separate routine cards for each marker would repeat the same action several times, and a single
  card can also name every marker that no other finding explained (N28). `prenatal_papp_a_low` stays separate because its message is its own.
- **Printed-risk findings** are one classifier (`riskAxis`) with five labels: `prenatal_risk_t18_t13_high` / `_t21_high` /
  `_intermediate` / `_unrated` / `_low`. They replace `prenatal_printed_risk_*`; partial sheets are covered by the shared
  «روی برگه نیامده» sentence (FR-009a).
- **A printed T21 risk owns the first-trimester markers** (`PN43`): the MoM pattern label fires only when no T21 risk is printed, because the
  lab's risk already combines those markers (D5). NT ≥ 3.0 keeps its own finding regardless (FR-006).
- **NT is judged only with an explicit mm unit**; a unitless NT is named, not judged (`PN14`, P81 question 7).
- **Confounders (T036):** the profile has no twins/IVF/smoking fields, and activating `dm2` here would be a P66 clinical decision. Instead,
  one generic sentence (lab corrects MoM for weight, smoking, IVF, diabetes, twins; tell the lab if one applies) goes on the lead finding.
- **"One action per sheet" (PN50 f)** became "every finding's action equals ACTION[urgency]". Different prenatal findings at different
  urgencies are about different things; `pickFinalAction` already gives the report one final instruction.

## Risks

- **Silent claim of the wrong row** (N25 both directions): a weak name claimed on a non-prenatal sheet, or left unclaimed on a prenatal one. Mitigation: one test panel per direction.
- **Unread channel** (N28): every prenatal key needs a named reader or a route to «تفسیر نشدند».
- **Re-opening N18 at routing**: prenatal-only sheet must not fall to the model-judged path.
- **Rival timelines** (N20): screening findings beside any other finding's action; sweep with the existing `M307`-style emergency sweep plus a prenatal one.
