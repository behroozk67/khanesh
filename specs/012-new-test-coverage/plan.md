# Implementation Plan: New Test Coverage — Catalogue Relabel + Tier‑1 Serology & Semen Names

**Branch**: `recovery` (spec dir `012-new-test-coverage`) | **Date**: 2026-10-03 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `specs/012-new-test-coverage/spec.md` (Stories 1, 2, 4; Story 3 → specs/013)

## Summary

Three increments, shippable in order:

1. **Story 1 — catalogue relabel (frontend only).** Nine `s(` entries in `khanesh/src/testCatalog.js` become `p(` (or `c(` for Thyroid Panel). The live probe confirmed every one already yields an engine finding (research.md §P0‑1). No `rules/` change.
2. **Story 2 — serology readers (backend).** Today all seven Tier‑1 serology rows (VDRL, RPR, Rubella IgG, Indirect Coombs, H. pylori Ag/IgG, Anti‑Tg, TRAb/TSI) are `unmapped` with **zero findings** (probe, §P0‑1). Each gets a route into a channel, plus a reader that uses a closed whole‑value word set (reusing `qualState`) or the printed range, plus Persian text with three‑way branches. VDRL, Rubella, Coombs and H. pylori go into a new `patterns_serology.js`. Anti‑Tg and TRAb fold into the existing `thyroid` owner rule so one finding talks about the thyroid (N20).
3. **Story 4 — semen names (backend, small).** The probe showed composite row names (`Sperm concentration`, `Total motility`, `Normal forms`) **already** reach `SEMEN_*` keys and fire `semen_analysis`. The remaining gap is text‑only semen rows such as `Spermogram: Abnormal`: they land in `semenQual` with no finding (the N28 shape). Scope is narrowed to a spelling sweep plus a reader or unread line for every `semenQual` row.

## Technical Context

**Language/Version**: Node.js (ESM) backend; React 19 + Vite 8 frontend
**Primary Dependencies**: Express 4; `node:test`; oxlint (frontend)
**Storage**: N/A (no new persistence)
**Testing**: `npm test` in `khanesh-server/` (all `*.test.js`); `npm run lint` + `npm run build` + `node src/content/coverage.mjs` in `khanesh/`
**Target Platform**: web (mobile‑first), Node server
**Project Type**: web application (two independent sub‑projects)
**Performance Goals**: N/A. Adds O(rows) regex checks per sheet.
**Constraints**: Constitution I–V. **No unapproved threshold in code** (C1): readers use printed range/cutoff/word only. No unit guessing (N3). Closed qualitative sets (N6). Row identity is (page kind, name) (N25).
**Scale/Scope**: ~5 new rule ids, 1 new rules file, ~4 guideline ids, ~15 regression tests, 9 + 7 catalogue lines
**Baseline (measured 2026‑10‑03, working tree, backend identical to `7b81c9e`)**: `tests 846 · pass 845 · fail 0 · todo 1` (`M154b`, a pre‑existing `todo`). `RULES.length = 192`. Re‑measure before the first edit.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Principle | How this plan complies | Status |
|---|---|---|
| I. Engine decides | Every verdict (reactive, immune, positive, above printed range) is computed in `rules/`. The prompt is not touched. | ✅ |
| II. Missing ≠ normal | Every reader returns `pos / neg / num / unknown / absent`. Partner tests (Rh type, FT4/TSH, pregnancy) get explicit "not on the sheet" arms. `unknown` goes to «تفسیر نشدند», never to `neg`. | ✅ |
| III. Measure, never quote | The baseline and RULES count above were measured this session. Implementation re‑measures and names the tree. | ✅ |
| IV. Test failed first | Every new M/T guard is run against the pre‑change tree (stash) and must go red. The rule‑id set is diffed before and after (only additions expected). | ✅ planned |
| V. Persian | All strings Persian. New keys go into `FA_NAMES`. Suggestions go into `SUGGEST_TESTS`. No PowerShell text cmdlets. | ✅ |
| Clinical constraints: approved thresholds only | No fixed number in code (C1, option الف). Rubella, Anti‑Tg/TRAb and ICT are judged only against the range/cutoff/word printed on the sheet; titres are quoted, not compared. Pending numbers live only in P68. | ✅ |
| One owner per analyte | Anti‑Tg/TRAb join `thyroid`. VDRL/Rubella/ICT/H. pylori each have one rule. Count guard: exactly one finding mentions each. | ✅ |
| Ordinary‑input check | No new rule emits `emergency`. The ceiling is `this_week`. A sweep of ordinary negatives must produce ≤ `routine`. | ✅ |

**Gate result: PASS.** No violation, so the Complexity Tracking section is empty.

*Post‑design re‑check (after Phase 1)*: PASS. The design adds no LLM path or persistence, and it does not touch `refs.js` ranges, so N23 coupling does not arise.

## Project Structure

### Documentation (this feature)

```text
specs/012-new-test-coverage/
├── spec.md
├── plan.md              # this file
├── research.md          # dossier + Phase 0 decisions (§P0)
├── data-model.md        # channels, keys, reader states, findings
├── quickstart.md        # validation runbook
├── contracts/
│   └── engine-findings.md   # finding contract per new rule + routing contract
├── checklists/requirements.md
└── tasks.md             # /speckit-tasks (not created here)
```

### Source Code (repository root)

```text
khanesh/src/
├── testCatalog.js               # Story 1: 9 relabels; Story 2: relabel each serology entry in the same change as its reader (FR‑017)
└── content/extra.*.js           # only if coverage.mjs reports a missing page for a relabelled slug

khanesh-server/
├── server.js                    # verify only: ownedQual / ownedUngraded keep serology‑only sheets on the engine path (T45)
├── api-contract.test.js         # T45–T46
└── rules/
    ├── adapter.js               # routing: QUALITATIVE_PATTERNS (anchored), assay_printed ungraded channel, IgM/IgA/DAT/bare "coombs" → unmapped, semen spellings
    ├── patterns_serology.js     # NEW: syphilis_screen_reactive, rubella_igg_status, indirect_coombs_result, h_pylori_result
    ├── patterns_endocrine_rheum.js  # thyroid rule: reads Anti‑Tg / TRAb (assay_printed + qual)
    ├── patterns_reproductive.js # semenQual text rows → named (reader or unread line)
    ├── patterns.js              # import + spread RULES_SEROLOGY; SUGGEST_TESTS rows
    ├── names.js                 # FA_NAMES for new keys
    ├── guidelines.js            # CDC_STI_2021, ACG_HPYLORI_2024, ATA_HYPER_2016, ACOG_RH (paywalled → substitutedBy), CLSI_RUBELLA (paywalled → substitutedBy)
    └── engine.test.js           # M301–M316
MEDICAL_RULES.md                 # P68 / P71 updated with the final strings and the decisions in research §P0
CLAUDE.md                        # File Structure + rule count; Lab Notebook entry only if a wrong patient output is corrected
```

**Structure Decision**: this is the existing two sub‑project web layout. The new rules file follows the `patterns_<system>.js` convention and must be spread into `RULES` in the same commit (N1). Thyroid antibodies go to the thyroid owner, not the new file, because one finding per organ system is the hand‑off rule (N20).

## Delivery order and verification

| # | Increment | Verify with (real command) |
|---|---|---|
| 1 | Story 1 relabel | `cd khanesh; npm run lint; npm run build; node src/content/coverage.mjs` (missing count not higher than before) + re‑run `probe012.mjs` row‑0 section |
| 2 | Story 2 routing (adapter) | `node --test rules/engine.test.js` (M301–M302 routing) + probe shows 0 `unmapped` for in‑scope names, still `unmapped` for IgM/IgA/DAT/bare Coombs |
| 3 | Story 2 readers + thyroid fold | `npm test` (M303–M312, M315, T45–T46). Rule‑id diff: +4 ids only. Freeze: existing thyroid panels unchanged byte‑for‑byte (M308) |
| 4 | Story 4 semen | `npm test` (M313–M314, M316) + spelling sweep |
| 5 | Catalogue flip for Story 2 tests | lint + build + coverage.mjs |
| 6 | Docs | `MEDICAL_RULES.md` P68/P71, `CLAUDE.md` counts (re‑measured) |
| 7 | Review | `code-reviewer` + `eval-medical-reviewer` agents on the diff |

## Complexity Tracking

None.
