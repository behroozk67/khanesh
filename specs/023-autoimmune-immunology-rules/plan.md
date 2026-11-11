# Implementation Plan: Autoimmune Disease Rules (user's Google Drive guide)

**Branch**: `023-autoimmune-immunology-rules` (spec directory only) | **Date**: 2026-11-11 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/023-autoimmune-immunology-rules/spec.md`

## Summary

The engine already interprets the systemic-rheumatology panel (P76/P77): ANA family, ANCA, CCP, C3/C4, SSc, Jo-1, aPL. This feature has three parts:

1. **Fix two wrong verdicts.** Anti-TPO and RF are graded against an engine range rather than the lab's printed one (G1).
2. **Route spellings and secondary antibodies to existing owners.** G2 lists them.
3. **Add four family readers** for analytes the engine has never known:
   - celiac;
   - autoimmune liver;
   - myasthenia;
   - serum immunoglobulins, as partners.

Every new key takes the existing **serology assay path** (`serology.js` `AI_RE` → `ungraded[key].reason = "assay_printed"` → `autoAbState`). That path already gives above/within/below/noref/equiv states, the censored-value rule, titre handling and printed-unit quoting. So no new grading machinery is written.

## Technical Context

**Language/Version**: Node (ESM), plain JS. No new dependency.

**Primary Dependencies**: none new. This uses the existing `serology.js`, `patterns_autoimmune.js`, `adapter.js`, `names.js`, `groups.js` and `patterns.js` (`SUGGEST_TESTS`).

**Storage**: N/A.

**Testing**: `node --test` in `khanesh-server/` (the full suite: metamorphic, api-contract, byte-locks). New file `rules/autoimmune3.test.js`. Each test must fail on `HEAD` b7eb497; this is proved with `git archive` plus a junction to `node_modules`.

**Target Platform**: backend rules engine. No frontend change: `_engine` shape and `ResultDashboard` are unchanged, because new findings render like any other.

**Project Type**: web service (rules module).

**Performance Goals**: N/A. A few regexes and rules are added.

**Constraints**:
- No emergency is created.
- Every fixed number goes in a P136 entry.
- No `guidelines.js` citation, because the source was not opened (N39/N46).
- Persian strings are written with Write/Edit only (N15).

**Scale/Scope**: about 22 new engine keys, 4 new rule ids, and 6 existing rules touched.

## Constitution Check

| Principle | Status |
|---|---|
| I. The engine decides, the model only speaks | ✅ All verdicts come from the engine. No prompt change. |
| II. A missing test is not a normal test | ✅ Partner sentences are three-way: present-normal, present-abnormal, absent (FR-006, FR-010). |
| III. Measure, never quote | ✅ The baseline is `snapshots/before.txt` on b0cae21. The after state is re-measured with the same probes. |
| IV. Every fix is locked by a test that failed first | ✅ This is FR-019, proved on the `HEAD` archive. |
| V. Persian is the patient's language | ✅ New names go into `FA_NAMES`. Guard `M32` covers this. |
| Clinical change constraints: number with a source, pending review | ⚠️ **Justified deviation** (see Complexity Tracking). Numbers are implemented now and recorded under P136 as «پیاده‌شده؛ در انتظارِ بازبینیِ بالینی». This is the same practice as P132–P135. |
| One owner per analyte per panel | ✅ Total IgA belongs to `celiac_serology_result` whenever any celiac key is present. Otherwise it belongs to `immunoglobulin_result`. This is a two-sided test. |
| One number does one job | ✅ The TPO/RF printed range answers "is it unusual", and no rule reads it as a diagnosis threshold. The APS 40/80 and tTG 10×ULN bands are separate constants. |

## Design (decisions in [research.md](research.md); keys in [data-model.md](data-model.md))

1. **G1: printed range first for Anti-TPO and RF.** This is in `adapter.js`. It extends the P114 `printedOwn` branch, which today is LDH-only, with `PRINTED_FIRST_KEYS = {ANTI_TPO, RF}`.
   - When the row prints a parseable upper limit (`printedRangePair`), that limit becomes the graded range, with `refSource: "بازهٔ چاپ‌شدهٔ همین برگه"`.
   - Otherwise the `refs.js` range stays, so a row with no printed range is unchanged.
   - In `thyroid` (`patterns_endocrine_rheum.js`), the TPO sentence quotes the value and range.
   - **Boundary panel** (N23): TPO and RF at limit − ε, at the limit, and at limit + ε, with and without a printed range. Readers checked: `thyroid`, `hypothyroid_dyslipidemia_link`, `rf_positive`, `anti_ccp_result` `rfLine`, `score.js`, `minor.js` (`ANTI_TPO` near-limit), and the expert view.
2. **G2: spellings.** These are regex widenings in `AI_RE`:
   - ANA: `(iif|fana)` suffix and prefix;
   - ANTI_DSDNA: `clift|crithidia`;
   - ANTI_CENTROMERE: `b` suffix.

   New keys:
   - `ANTI_HISTONE` and `ACL_IGA` go to `ana_family_result` and `antiphospholipid_result` respectively.
   - `CH50` goes to `complement_result`, as `AI_RANGE_ONLY`.
   - `ANTI_DNASEB` gets a new small rule, `dnaseb_result`, which uses age bands when there is no printed range.
3. **G3–G5, G7: new keys, all in `AI_RE`.** Each family has one rule (N20) in `patterns_autoimmune.js`:
   - `celiac_serology_result` reads TTG_IGA, TTG_IGG, DGP_IGG, DGP_IGA and EMA_IGA, with IGA_TOTAL as partner.
   - `liver_autoantibody_result` reads ASMA, ANTI_LKM1, ANTI_SLA, AMA and AMA_M2, with ALT, AST, ALP and IGG as partners.
   - `mg_antibody_result` reads ACHR and ANTI_MUSK.
   - `immunoglobulin_result` reads IGG, IGA_TOTAL, IGM and IGE. These are concentrations, so they are `AI_RANGE_ONLY`. Under 16 a "below" verdict is reworded (research D7).
4. **Liver-antibody titres.** A bare titre (`1:80`) for ASMA, LKM1 and AMA is read against **1:40**, the IAIHG and PBC threshold quoted in the guide. This is the same shape as the existing ANA ≥ 1:80 exception in `readAutoValue`. Other new keys keep the P77 rule that a bare titre has no verdict (`noref`).
5. **G6: APS bands.** `aplBuild` adds one sentence per numeric aCL or β2GPI IgG/IgM: < 40 / 40–79 / ≥ 80, used only when the printed unit is GPL, MPL or U. Urgency is unchanged. Isolated aCL-IgA positive gets `routine` and the sentence «IgA جزو آنتی‌بادی‌های معیارِ APS نیست».
6. **Wiring for every new rule id and key:**
   - `groups.js` `immune` group (GR1);
   - `FA_NAMES`;
   - new `SUGGEST_TESTS` strings: «Total IgA (IgA تام)», «DGP-IgG یا tTG-IgG», «بررسی توسط متخصص گوارش», «بررسی توسط متخصص مغز و اعصاب», «Anti-MuSK»;
   - `explains` set to the key list, so the coverage nets see them owned (N18).
7. **Docs, in the same commit:**
   - MEDICAL_RULES **P136**;
   - CLAUDE.md **N55**, because G1 was a wrong patient-facing output;
   - this spec's `snapshots/after.txt`.

## Project Structure

### Documentation (this feature)

```text
specs/023-autoimmune-immunology-rules/
├── spec.md · plan.md · research.md · data-model.md · quickstart.md
├── source-gdoc.txt          # the user's guide, exported
├── checklists/requirements.md
├── snapshots/               # probe_*.mjs, before.txt, after.txt (after implementation)
└── tasks.md                 # /speckit-tasks
```

No `contracts/`: the API shape doesn't change. New findings use the existing finding shape, and `_engine.tests` is untouched, because assay rows live in `ungraded` as before.

### Source Code (repository root)

```text
khanesh-server/rules/
├── serology.js            # AI_RE: 3 widened + ~22 new keys; AI_RANGE_ONLY += CH50, IGG, IGA_TOTAL, IGM, IGE; titre-1:40 readers
├── patterns_autoimmune.js # + celiac/liver/mg/immunoglobulin/dnaseb rules; ana (histone), apl (IgA, bands), complement (CH50)
├── adapter.js             # PRINTED_FIRST_KEYS (ANTI_TPO, RF)
├── patterns_endocrine_rheum.js  # TPO sentence quotes number + range
├── names.js · groups.js · patterns.js (SUGGEST_TESTS)
└── autoimmune3.test.js    # new
MEDICAL_RULES.md (P136) · CLAUDE.md (N55)
```

**Structure Decision**: The existing backend rules layout is used. There is no new module; the families join `patterns_autoimmune.js`, whose `RULES_AUTOIMMUNE` is already spread into `RULES`.

## Complexity Tracking

| Violation | Why needed | Simpler alternative rejected because |
|---|---|---|
| Fixed numbers enter code before human review: 1:40 titre, AChR 0.02 nmol/L, Anti-DNase B age bands, APS 40/80, tTG 10×ULN | The user asked for complete rules. Every repo precedent (P77, P132–P135) implements and flags the numbers. | Leaving them out keeps these rows in «تفسیر نشدند», which is the N2 failure the feature exists to remove. Each number is isolated in a named constant and listed in P136, so a reviewer can change it in one place. |
