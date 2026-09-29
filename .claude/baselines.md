# Test baselines — measurement log

History, not a baseline. Re-measure the tree you are about to change and name it; see
`CLAUDE.md` → Your Role, step 4, and Commands.

**Last measured — re-derive before you quote it:**

| what was measured | when | tests | pass | fail | skipped |
|---|---|---|---|---|---|
| working tree on `0d8c782`, after specs/009 (monocyte/eosinophil/basophil rules, the `smear` channel + `peripheral_smear_findings`, the N18 suppressed-finding fix — `M200`–`M202h`; `پوشش/قلبی` and `M188c` changed on purpose). ⚠️ **Includes a concurrent session's PCT and WHO-PV work (`M196`, `M196b`, `M197`, `M197b`, `M104d` C5, `erythrocytosis_who_screen`)** — 150 rules | 2026-09-25 | 701 | 682 | **0** | 19 todo |
| `0d8c782` (`git archive` + junction) with that `engine.test.js` (engine suite only) — red: specs/009's 13 (`M200`, `M201`, `M201c`–`e`, `M202`–`M202g`, `پوشش/قلبی`) + the concurrent session's 4 (`M104d`, `M196`, `M197`, `M197b`); freezes `M201b`, `M201f`, `M202h` green on both | 2026-09-25 | 656 | 620 | **17** | 19 todo |
| working tree on `953f513`, after the user's MCV-in-the-elderly decision (`P55`: geriatric band stays ≥ 75; from 75 "macrocytic" means MCV above the geriatric 102 — `macroMcvCut`; `M193`, `M193b`; `M184e` changed on purpose) — 144 rules | 2026-09-24 | 682 | 663 | **0** | 19 todo |
| working tree on `953f513`, after the second real sheet (job `0400a412`: RBC/HCT/MCH named in the *full* macrocytic and normocytic text, `macrocytic_anemia` gets `always_show` + `brief`, new `mild_neutropenia`, leukopenia names neutrophils — `M192`–`M192d`; `M180b` panels 3/5/10 re-baselined after freezediff) — 144 rules | 2026-09-24 | 680 | 661 | **0** | 19 todo |
| copy of that tree with the new code switched off (helpers return "", `mild_neutropenia` never matches) — red: exactly `M192`–`M192d` + `M180b` | 2026-09-24 | — | — | **5** | — |
| working tree on `953f513`, after the real-sheet review (job `d982209d`: pancytopenia numbers + workup, `normocytic_anemia` brief, RDW-SD/CV names, self-contained net action, shifted diff ranges, per-field patient merge — `M191`–`M191c`, `T27`; freezes `M104d` C2/C4/C5, `M171d` hemol, `M180b` re-baselined after freezediff) — 143 rules | 2026-09-24 | 675 | 656 | **0** | 19 todo |
| `953f513` copy with those tests — red: the 17 of the row below plus `M171d`, `M191`, `M191c`, `T27`; `M191b` green on both (negative control) | 2026-09-24 | 675 | 635 | **21** | 19 todo |
| working tree on `953f513`, after the user's answers to the 16 P53 questions (pregnancy input, unknown-sex Hb, ZPP/sTfR, HbF/HbS/HbC/HbE, HbA2 ≥ 8, Mentzer flip, MCV-without-Hb, ferritin 45/100, child thal trait — `M190`–`M190i`; `M184f`, `M184i`, `M186d`, `M186g`, `T25` changed on purpose; freezes `M104d`/`M125`/`M164d`/`M180b` re-baselined after a full-output diff) — 143 rules | 2026-09-24 | 671 | 652 | **0** | 19 todo |
| `953f513` (`git archive` + junction) with those `engine.test.js` + `api-contract.test.js` — red: exactly the 9 `M190` guards, the 4 freezes, and `M184f`, `M184i`, `M186d`, `T25` | 2026-09-24 | 671 | 635 | **17** | 19 todo |
| working tree on `9deba20`, after the specs/008 **round-3** review fixes (R3-B1 ferritin wording, R3-B2 hepatitis-vs-variant gate, R3-CR1 brief coverage, R3-CR2 per-finding forbid, R3-CR4 same-page merge — `M189`–`M189d`, `T26`; `M184i` changed on purpose) — 137 rules | 2026-09-24 | 662 | 643 | **0** | 19 todo |
| copy of that tree taken before the round-3 fixes, with the new test files — red: exactly `M189`–`M189d`, `T26`, `M184i` | 2026-09-24 | 662 | 637 | **6** | 19 todo |
| working tree on `9deba20`, after the specs/008 **round-2** review fixes (medical FAIL R2-B1–B5 + code CR1–CR11 + builder #2–#5 — `M184g`–`M184j`, `M186m`, `M186n`, `M187c`, `M188d`, `T24`, `T25`; `M184f`, `M186i` changed on purpose) — 137 rules | 2026-09-24 | 657 | 638 | **0** | 19 todo |
| copy of that tree with the pre-fix `patterns_hematology.js`/`patterns_utils.js`/`adapter.js`/`prompt.js` + the `server.js` merge edit undone — red: exactly the 10 new guards + `M184f`, `M186i` | 2026-09-24 | 657 | 626 | **12** | 19 todo |
| working tree on `9deba20`, after specs/008 (Hb anaemia thresholds by age/sex, iron/ferritin ranges with held rule cut-offs, Hb electrophoresis identity + HbA2/HbF grading, `hba2_elevated` — `M184`–`M186g`; `M34`, `M47`, geriatric Hb 12.3 @ 75 changed on purpose; freeze hashes re-baselined for the Hb range string only). ⚠️ **Includes a concurrent session's `microcytic_anemia` work (`M187`, `M187b`, its `M100`/`M104d`/`M180b` updates)** — 136 rules | 2026-09-23 | 636 | 617 | **0** | 19 todo |
| `9deba20` (`git archive` + junction) with that `engine.test.js` + `geriatric.test.js` (engine suites only) — red: specs/008's 12 behaviour tests + geriatric + `M34` + the re-baselined freezes (`M104d`, `M125`, `M164d`, `M171d`, `M180b`), and the concurrent session's `M100`, `M187`, `M187b` | 2026-09-23 | 598 | 556 | **23** | 19 todo |
| working tree on `aeb2ff3`, after the user's decisions on P52 questions 1–5 (MCHC note under an Hb crisis, MCV in the note, `PED_REFS.RETIC_ABS` deleted, Hct-only crisis at every age — `M183`–`M183d`; `M179c`, `M180b` changed on purpose) — 135 rules | 2026-09-23 | 618 | 599 | **0** | 19 todo |
| `aeb2ff3` (`git archive` + junction) with that `engine.test.js` (engine suite only) — red: exactly `M183`–`M183d` + `M179c`, `M180b` | 2026-09-23 | 579 | 554 | **6** | 19 todo |
| working tree on `b9068df` (specs/006 still uncommitted), after specs/007 + its review round (Henry ch.31: RBC-F range, Hct-only crisis, MCHC artefact note, `RETIC_ABS`, HCT L/L + MCHC g/L units — `M177`–`M181`, 10 tests; review fixes `M182`–`M182f`, 6 tests, all red on the pre-fix tree; `M104d` C3 changed on purpose) — 135 rules | 2026-09-23 | 614 | 595 | **0** | 19 todo |
| copy of that working tree taken **before** specs/007, with the final `engine.test.js` dropped in (engine suite only) — red: `M177`, `M178`, `M179`, `M179b`, `M180`, `M181`, `M182`, `M182b`, `M182c`, `M182e`, `M182f` + `M104d`; green: freezes `M177b`/`M178b`/`M179c`/`M180b`, and `M182d` (guards a rule that didn't exist yet) | 2026-09-23 | 575 | 544 | **12** | 19 todo |
| working tree on `b9068df`, after the specs/006 review round (medical FAIL B1–B4 + code review #1–#9 — `M176`–`M176l`, 12 tests, all red on the pre-fix Stage B tree; `M173`, `M173d`, `M175c`, `M104d` U4 changed on purpose) — 134 rules | 2026-09-22 | 598 | 579 | **0** | 19 todo |
| `b9068df` (`git archive` + junction) with that final `engine.test.js` — red: 22 Stage B guards + 10 review guards + `M104d` (`M176e`/`M176l` green there: no reader existed) | 2026-09-22 | 559 | 507 | **33** | 19 todo |
| working tree on `b9068df`, after specs/006 Stage B (urinalysis: specific gravity, crystals, epithelial cells, dipstick bilirubin/urobilinogen — `M171`–`M175g`, 27 tests; 22 red on `b9068df` + `M104d` changed on purpose + 5 freezes) — 134 rules | 2026-09-22 | 586 | 567 | **0** | 19 todo |
| `b9068df` (`git archive` + junction) with that `engine.test.js` dropped in (engine suite only) — red: exactly the 22 behavioural guards + `M104d` | 2026-09-22 | 547 | 505 | **23** | 19 todo |
| working tree on `b9068df`, **before** specs/006 — 129 rules | 2026-09-22 | 559 | 540 | **0** | 19 todo |
| working tree on `395a5d7`, after the specs/005 review round (medical FAIL B1–B4 + code review #1–#8 — `M169`–`M169k`, 11 tests, all red before the fix; `M167d` changed on purpose) — 129 rules | 2026-09-22 | 558 | 539 | **0** | 19 todo |
| working tree on `395a5d7`, after specs/005 Stage A (urinalysis: cast misread, esterase-pad misread, dipstick/microscope cross-checks — `M164`–`M168c`, 22 tests, 19 red before + 3 freezes) — 129 rules | 2026-09-22 | 547 | 528 | **0** | 19 todo |
| `HEAD` at `395a5d7` (`git archive` + junction) with that `engine.test.js` dropped in (engine suite only) — red: exactly the 19 behavioural guards | 2026-09-22 | 508 | 470 | **19** | 19 todo |
| working tree on `395a5d7`, **before** specs/005 — 121 rules | 2026-09-22 | 525 | 506 | **0** | 19 todo |
| working tree on `607b419`, after the Hb<7 hand-off + the neonatal wording decision (`M162`–`M162c`, `M163`; `M162` and `M163` red before, `M162b`/`M162c` freezes; `M134` and `M138` changed on purpose) — 121 rules | 2026-09-20 | 525 | 506 | **0** | 19 todo |
| working tree on `a34e4d2`, after the decimal-comma fix (`toNum` → `commaToDot`; `M161`–`M161c`; `M161`, `M161c` and `M161b`'s `0,500` case red before, `M161b`'s thousands cases green before as the guard) — 121 rules | 2026-09-20 | 521 | 502 | **0** | 19 todo |
| working tree on `2d32dd3`, after P49-الف/ج (user-approved): `wilson_evaluation`, antibody sentence in `overt_b12_deficiency`, `unexplainedNoRef` — `M151`–`M151c`, `M153` un-todo’d; `M151d`, `M151e`, `M153b`, `T22` new (all red before; `T22` also red with only the server filter undone) — 121 rules | 2026-09-19 | 518 | 499 | **0** | 19 todo |
| working tree on `2d32dd3`, after specs/004 + its review fixes (B1–B3, code-review 2/4/5 — `M155`–`M160`, all red before the fix) — 120 rules | 2026-09-19 | 514 | 491 | **0** | 23 todo |
| working tree on `2d32dd3`, specs/004 before review (`M141`–`M150`, `T21`; 6 P49 `todo`s). `M141`–`M149` + `T21` red on `2d32dd3` (archive + junction, measured by the code reviewer: `508 · 473 · 12`); `M150` is a freeze, green on both | 2026-09-19 | 508 | 485 | **0** | 23 todo |
| `2d32dd3` working tree **before** specs/004 — 119 rules | 2026-09-19 | 489 | 472 | **0** | 17 todo |
| working tree on `edec069`, after the fourth review round (B10 age parsing, B11 newborn text — `M139`, `M140`, both red before the fix) — 119 rules | 2026-09-19 | 489 | 472 | **0** | 17 todo |
| working tree on `edec069`, after the third review round (B9, `M138` — red with the newborn rule removed) — 119 rules | 2026-09-19 | 487 | 470 | **0** | 17 todo |
| working tree on `edec069`, after the **second** specs/003 review round (B6–B8 + code-review 1–7) — `M134`–`M137b`; `M121`, `M127` changed on purpose — 119 rules | 2026-09-19 | 486 | 469 | **0** | 17 todo |
| the pre-review-fix copy with that `engine.test.js` dropped in (engine suite only) — `M134`–`M137b` all red | 2026-09-19 | 449 | 415 | **17** | 17 todo |
| working tree on `edec069`, after the specs/003 review fixes (B1–B5 + 10 items) — `M126`–`M133`; `M121`, `M123d` changed on purpose — 119 rules | 2026-09-19 | 481 | 464 | **0** | 17 todo |
| the working tree **before** those fixes (copy) with the new `engine.test.js` dropped in (engine suite only) — red: exactly the 10 new (`M126`–`M126c`, `M127`–`M133`) + `M121`, `M123d` | 2026-09-19 | 444 | 415 | **12** | 17 todo |
| working tree on `edec069`, after specs/003 (unitless values) — `M121`–`M125`, `T20`; 342 fixture rows given the unit they always assumed — 119 rules | 2026-09-19 | 471 | 454 | **0** | 17 todo |
| `edec069` rules (`git archive` + junction) with that new `engine.test.js`/`api-contract.test.js` dropped in — red: exactly the 11 new tests + `G1b`, `M115` (intended behaviour changes) | 2026-09-19 | 470 | 440 | **13** | 17 todo |
| working tree on `8ccd67d`, after Stage B of Henry ch.26 + the agent-review fixes (`M114`–`M120`) — 118 rules | 2026-09-19 | 459 | 442 | **0** | 17 todo |
| the Stage B rules dir **before** the review fixes, with the new `engine.test.js` dropped in (engine suite only) — red: exactly `M114`–`M120` (8) | 2026-09-19 | 423 | 398 | **8** | 17 todo |
| working tree on `8ccd67d`, after Stage A of Henry ch.26 (`P47`) — `M104`–`M105c`, `M111`, `T18` live; `M106`–`M111b`, `T19` as `todo` (13) | 2026-09-18 | 446 | 419 | **0** | 27 todo |
| `HEAD` at `8ccd67d` **with the 9 Stage A guards dropped in** (`git archive` + junction) — red: `M104`, `M104b`, `M105`, `M105b`, `M105c`, `T18`; freezes `M104c`, `M104d`, `M111` green | 2026-09-18 | 433 | 413 | **6** | 14 todo |
| working tree on `8ccd67d`, **before** the ch.26 work | 2026-09-18 | 424 | 410 | **0** | 14 todo |
| working tree on `3416d63`, after Stage A of Henry ch.25 (`P46`) — `M103`, `M103e`, `T17` live; `M101`–`M103d` as `todo` | 2026-09-18 | 424 | 410 | **0** | 14 todo |
| `HEAD` at `3416d63` **with that `engine.test.js` dropped in** (engine suite only, `git archive` + junction) | 2026-09-18 | 390 | 364 | **12** | 14 todo |
| working tree on `3416d63`, after the N24 auth/scoping + `_engine.uncovered` work — `T14`–`T16`, `M100`–`M100b` | 2026-09-17 | 407 | 407 | **0** | — |
| `HEAD` at `3416d63` **with those 5 tests dropped in** (`git archive` + junction) | 2026-09-17 | 407 | 394 | **13** | — |
| working tree on `3416d63`, after the N20 amylase/bilirubin/thyroid fix — `M97`–`M99d`, 13 tests, **113 rules** | 2026-09-17 | 402 | 402 | **0** | — |
| `HEAD` at `3416d63` **with the 13 new tests dropped in** (`git archive` + junction recipe) — 115 rules | 2026-09-17 | 402 | 393 | **9** | — |
| working tree on `3416d63`, **before** that fix | 2026-09-17 | 389 | 389 | **0** | — |
| `HEAD` at `90ac7d6` (`git archive` + junction recipe below) — **115 rules** | 2026-08-11 | 372 | 372 | **0** | — |
| `HEAD` at `c5700c0` (same recipe) — 116 rules | 2026-08-11 | 350 | 350 | **0** | — |
| working tree on `c5700c0`, mid-way — glucose/liver only, `M91`–`M92d` (`npm test`) | 2026-08-11 | 359 | 359 | **0** | — |
| working tree on `c4c28e7`, **before** the Henry ch.20 protein work (`npm test`) | 2026-08-11 | 350 | 350 | **0** | — |
| working tree on `c4c28e7`, after it — `M94`–`M94k`, 11 tests (`npm test`) | 2026-08-11 | 372 | 372 | **0** | — |

⚠️ **That 350 → 372 is +22, and only 11 of them are the ch.20 work.** A second session was
editing this tree at the same time and landed `M91`–`M92d` and its own `M93`/`M93b` in
between the two measurements. Isolated properly — the rules suites alone, measured in a temp
copy with the ch.20 edits reverted and again with them applied — the range change is
**330 · 330 · 0 both ways**, i.e. it broke nothing and added nothing. Two things this cost,
worth knowing before you trust a delta here: the concurrent session had already taken `P41`,
`P42` **and** `P43` in `MEDICAL_RULES.md` (hence `P44`), and it had taken `M93`/`M93b`, so a
bulk rename of a freshly appended block clobbered two of its test names before they were
restored. **When `git status` shows files you did not touch, derive your delta by isolating
your own change — a total is not an attribution.**
| working tree on `c4c28e7`, **before** the Henry ch.19 cardiac work (`npm test`) | 2026-08-10 | 319 | 319 | **0** | — |
| working tree on `c4c28e7`, after it — `M83`–`M90b`, 31 tests (`npm test`) | 2026-08-10 | 350 | 350 | **0** | — |
| working tree on `c4c28e7`, **before** the Henry ch.18 lipid work (`npm test`) | 2026-08-10 | 302 | 302 | **0** | — |
| working tree on `c4c28e7`, after it — `M78`–`M82c`, 17 tests (`npm test`) | 2026-08-10 | 319 | 319 | **0** | — |
| `HEAD` at `e9d386e` (`isolated_ldh_elevation`, `M61`×5) | 2026-08-06 | 266 | 266 | **0** | — |
| `HEAD` at `c81019c` (the commit before it) | 2026-08-06 | 256 | 256 | **0** | — |

Both with the `git archive` + `node_modules` recipe under [Commands](../CLAUDE.md#commands). The suite has
been green in both trees since the uncommitted clinical work landed; **that is a fact about
2026-08-06, not a property of the repo.**

<details>
<summary>Historical rows — the record that produced the warning above. Not current.</summary>

| what you measured | tests | pass | fail | skipped |
|---|---|---|---|---|
| `HEAD` before `5059a05` | 186 | 137 | **49** | — |
| `HEAD` at `5059a05` (mojibake repaired) | 186 | 174 | **12** | — |
| `HEAD` at `a547164` (docs only — unchanged, as expected) | 186 | 174 | **12** | — |
| `HEAD` at `c093712` (`M36`+`M37` added) | 190 | 178 | **12** | — |
| working tree, 2026-08-04 (before `M37`) | 187 | 186 | **1** (`T10`) | — |
| working tree, 2026-08-04 (after `M37`, 3 new tests) | 190 | 189 | **1** (`T10`) | — |
| `HEAD` at `acc9cc0` (`T10` fixed, `M38` added) | 193 | 181 | **12** | `patterns_anemia.js` |
| working tree, 2026-08-04 (after `acc9cc0`) | 193 | 193 | **0** | `patterns_anemia.js` |
| `HEAD` at `1469449` (docs + hook only — unchanged, as expected) | 193 | 181 | **12** | `patterns_anemia.js` |
| working tree, 2026-08-05 (after `M41`, `spherocytosis_likely` restored) | 194 | 194 | **0** | `patterns_anemia.js` |
| working tree, 2026-08-06, **before** the electrolyte work (bare `node --test`) | 215 | 215 | **0** | — |
| working tree, 2026-08-06, after it — `rules/*.test.js` + `avalaiClient.test.js` only | 238 | 238 | **0** | `patterns_anemia.js` |
| working tree, 2026-08-06, after the auth/DB test-gate repair (`npm test`) | 256 | 256 | **0** | — |
| working tree, 2026-08-07, **before** the mineral/bone work (`npm test`) | 266 | 266 | **0** | — |
| working tree, 2026-08-07, after it — `patterns_mineral_bone.js` + 17 tests (`npm test`) | 285 | 285 | **0** | — |
| working tree, 2026-08-07, after P30+P31 (ped phosphate, magnesium) | 289 | 289 | **0** | — |
| working tree, 2026-08-10, **before** the real-sheet work (`npm test`) | 289 | 289 | **0** | — |
| working tree, 2026-08-10, after it — `M73`–`M77`, 13 tests (`npm test`) | 302 | 302 | **0** | — |

⚠️ **266 → 285 is 19, not 17, and the extra two are not tests anyone wrote.** `M37` and `M38`
derive their file list from `patterns.js`'s own `import` statements (`livePatternFiles()`), so
adding a `patterns_*.js` file automatically adds a subtest to each. Useful to know before you
conclude a count is off: **the total is a function of how many pattern files exist**, not just
of how many `test()` calls are in the suite.
⚠️ **No longer true — measured 2026-09-18.** Adding `patterns_endocrine_pituitary.js` moved the
count by exactly the one test written (407 → 408). `M37`/`M38` now loop over
`livePatternFiles()` inside a single `test()` each, so a new module is *scanned* but adds no
subtest. The file list is still derived from the imports; only the count coupling is gone.

The `skipped` column names `patterns_anemia.js`, a dead file `M38` exempted by name. **That
file was deleted in `ba144a7`** and nothing is exempt from any guard today — see
[Where a pattern lives](../CLAUDE.md#where-a-pattern-lives).

</details>
