# Feature Specification: New Test Coverage — Catalogue Relabel + Tier‑1 Serology & Semen Names

**Feature Branch**: `recovery` (no new branch; spec directory `specs/012-new-test-coverage`)
**Created**: 2026-10-03
**Status**: Draft — every clinical threshold is a *proposal* pending reviewer approval (MEDICAL_RULES.md `P68`, `P71` semen part; `P69`–`P70` and the G6PD part of `P71` moved to specs/013)
**Input**: "specs/012 — (الف) ردیف ۰: relabel `testCatalog.js` entries the engine already covers; (ب) ردیف ۱: H. pylori, Insulin (HOMA‑IR), OGTT, Anti‑Tg, TRAb/TSI, VDRL/RPR, Rubella IgG, Indirect Coombs, G6PD, Semen analysis (composite name), 24 h urine protein, PSA/Free PSA, Cystatin C. Research authoritative guidelines first; thresholds only as proposals; respect N1 N2 N3 N4 N6 N20 N25 N28."
**Evidence**: [research.md](research.md) — per‑test ranges, units, rules, sources, and what is NOT verified.

## Clarifications

### Session 2026-10-03

- Q: Deliver all four stories in specs/012, or split? → A: Split (option B). specs/012 = Stories 1, 2, 4. Story 3 (Insulin/HOMA‑IR, OGTT, Cystatin C, 24 h urine protein, PSA/Free PSA, G6PD) moves to **specs/013**, carrying proposals P69, P70 and the G6PD half of P71. Anti‑Tg and TRAb stay in Story 2 (printed cutoffs / qualitative reading, not engine‑owned numeric ranges).
- Q: (analyze C1) May pending P68 numbers ship in code? → A: No (option الف). Readers use only what the sheet printed (range, cutoff, interpretation word). Rubella 10 IU/mL, TRAb > 3× ULN and the ICT 1:16 titre stay proposals in P68 and are not in code until approved.

- Implementation finding (2026-10-03, /speckit-implement; recorded, not a new question): a *printed* eGFR or Non-HDL row is `unmapped`. The engine only computes both from creatinine and from cholesterol/HDL. Relabelling them «read from your photo» would be false, so they stay «soon». Story 1 therefore delivers **7** relabels (HbA2 & HbF, ApoB, Homocysteine ×2, NT-proBNP/BNP, Prolactin ×2, Thyroid Panel, Copper & Ceruloplasmin), and SC-001 is read as 7 of 7. Reading printed eGFR/Non-HDL rows is a candidate for specs/013.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — The encyclopaedia stops saying "coming soon" for tests the app already reads (Priority: P1)

A patient browsing the test encyclopaedia opens HbA2 & HbF, ApoB, Homocysteine, NT‑proBNP/BNP, Prolactin, Thyroid Panel, Copper & Ceruloplasmin, eGFR or Non‑HDL and finds a real page, not a placeholder. The app already interprets these when they appear on an uploaded sheet; only the catalogue label is stale.

**Why this priority**: zero clinical risk, zero engine change, nine visible gaps closed today. Independently shippable.

**Independent Test**: for each of the nine, the catalogue no longer marks it "soon", the page renders, and the engine probe (a sheet containing that test) still produces the finding named in research.md §0. No file under `khanesh-server/rules/` changes.

**Acceptance Scenarios**:
1. **Given** the nine tests, **When** the catalogue is opened, **Then** none shows the "coming soon" state, including both duplicate listings of Prolactin.
2. **Given** a catalogue entry relabelled, **When** its page is opened, **Then** its text makes no clinical claim that differs from the engine's (e.g. eGFR is described as *calculated*, not a separate blood test — the existing description already says so).
3. **Given** OGTT, Rubella IgG, Insulin, Cystatin C and the other Tier‑1 entries, **When** Story 1 ships alone, **Then** they remain "soon" (they are NOT relabelled until their engine support exists — a relabel without a reader is the N28 shape).

---

### User Story 2 — Serology and antibody results that decide a pregnancy or an infection get a reading (Priority: P1)

A patient photographs a sheet with **VDRL/RPR, Rubella IgG, Indirect Coombs, H. pylori (Ag/Ab/UBT)** or **Anti‑Tg / TRAb**. Today these are either unmapped (→ canned "your results are normal", N2) or recognised without a reader. After this feature each yields a Persian finding that is conditional on exactly what the sheet printed.

**Why this priority**: these are the highest‑harm silent drops — a *reactive* VDRL, a *non‑immune* rubella in pregnancy and a *positive* indirect Coombs in an Rh‑negative mother all currently read as "normal".

**Independent Test**: for each test, a reactive/positive and a non‑reactive/negative panel through `runEngine` + `runPatterns`: positive fires exactly one finding with correct urgency; negative produces a reassurance scoped to *that* test only; `unmatched_abnormal` and "تفسیر نشدند" are absent for it.

**Acceptance Scenarios**:
1. **Given** `VDRL: Reactive 1:8`, **When** analysed, **Then** a finding says a screening (non‑treponemal) test is reactive, that it is **not diagnostic**, that false positives occur (pregnancy, autoimmune disease), and that a treponemal confirmatory test and a physician visit are needed — never "you have syphilis".
2. **Given** `Rubella IgG 4 IU/mL` with the lab's printed cutoff (e.g. «Immune ≥ 10») or the word `Non-immune`, **When** analysed, **Then** the finding says antibody is below the lab's own immunity level (no engine-fixed cutoff; a number with no printed cutoff or word is unread); if pregnancy is declared it gives a pregnancy‑specific sentence (avoid exposure, report to obstetrician; **no vaccination advice during pregnancy**); if not pregnant it recommends discussing vaccination before a future pregnancy.
3. **Given** `Indirect Coombs: Positive` and a declared pregnancy, **When** analysed, **Then** the finding is `this_week` or stronger, asks for antibody identification/titre, and does not say "dangerous to the baby" as a conclusion. **Given** the same row for a non‑pregnant patient, **Then** a pre‑transfusion/antibody‑identification sentence instead.
4. **Given** `Indirect Coombs: Negative` with no Rh type on the sheet, **When** analysed, **Then** the text states the result says nothing about Rh type (N4: absent ≠ normal).
5. **Given** `Coombs Wright` (Brucella) and `Indirect Coombs` on the same sheet, **When** analysed, **Then** each is read by its own rule and neither collides (N25 identity).
6. **Given** `H. pylori IgG: Positive`, **When** analysed, **Then** the finding states serology cannot separate current from past infection and recommends a stool antigen / breath test before treatment; `H. pylori Stool Ag: Positive` / `UBT: Positive` states active infection and treatment discussion with a physician. A negative stool Ag/UBT states the PPI (2 wk) / antibiotic (4 wk) false‑negative caveat.
7. **Given** a value in any closed qualitative set (§FR‑Q) that is **not** in the whitelist (`undetected`, `+/-`, `equivocal`, `borderline`), **When** analysed, **Then** it is never read as positive; it goes to "تفسیر نشدند" (N6).
8. **Given** `TRAb` positive/above the printed cutoff with a high FT4 (or low TSH), **When** analysed, **Then** the finding states the pattern is typical of Graves' disease **as a pattern requiring physician confirmation**; with a normal thyroid it says only that the antibody is present. **Given** `Anti‑Tg` or `Anti‑TPO` high with a high TSH, **Then** autoimmune thyroiditis is named as a likely cause; a lone Anti‑Tg is a "this week" routine finding, never an emergency.
9. **Given** the bare row `Tg 45` , **When** analysed, **Then** it stays **triglyceride** (existing alias) and is not read as thyroglobulin; only `Anti‑Tg`/`Anti‑thyroglobulin` forms map to the antibody (N2/N25).
---

### User Story 3 — MOVED to specs/013 (numeric hormone / glucose / kidney / enzyme tests)

Insulin/HOMA‑IR, OGTT, Cystatin C, 24 h urine protein, PSA/Free PSA and G6PD are out of this spec by clarification (Session 2026‑10‑03). Their scenarios, unit tables and proposals P69, P70, P71‑G6PD are carried to specs/013. Story numbering is kept so cross‑references stay valid. The Anti‑Tg/TRAb and bare‑`Tg` scenarios that used to sit here are now Story 2 scenarios 8–9.

---

### User Story 4 — Semen analysis printed under a composite name is read like a semen page (Priority: P2)

A man uploads a report titled "آنالیز منی / Semen Analysis / Spermogram". The engine's semen channel and rules already exist; the composite title and common row spellings fail to reach them.

**Why this priority**: engine rules exist (`semen_analysis`, WHO 2021); only name mapping is missing — cheap, but it touches N25.

**Independent Test**: a page headed with the composite name and rows `Volume/Count/Motility/Morphology/pH` produces the same findings as today's semen‑channel fixtures, and a CBC + semen mixed upload still loses no CBC row.

**Acceptance Scenarios**:
1. **Given** rows named `Spermogram`, `Sperm concentration`, `Total motility`, `Progressive motility`, `Normal forms`, **When** analysed, **Then** they route to the existing `SEMEN_*` keys (or to `unmapped` — never to a blood/urine key).
2. **Given** a page with only `Volume/pH/Count/WBC/RBC` and no semen‑only signal, **Then** behaviour is unchanged (known limit, N25).
3. **Given** a lone `Count 40` with no unit, **Then** it is not graded.

---

### Edge Cases

- **Pregnancy flag absent** — Rubella, Coombs, VDRL sentences must branch on `context.pregnant` and say nothing pregnancy‑specific when unknown.
- **Neonate / child** — semen: not applicable < 16 y (no adult range fallback; N3 P57 pattern). Rubella IgG in an infant reflects maternal antibody — no immunity claim under 12 months.
- **Same word, two tests (N25)** — `Tg` (triglyceride vs thyroglobulin), `Coombs` (Wright vs direct vs indirect), semen‑page `Count`/`Volume`/`pH`/`WBC`/`RBC` vs blood/urine. (Protein/OGTT/Insulin/PSA collisions belong to specs/013.)
- **IgG vs IgM** — a rubella *IgM* positive is a different (acute‑infection) finding; it must not be read by the IgG rule. Same for H. pylori IgA/IgM and syphilis IgM if printed.
- **Assay‑dependent cutoffs** — Anti‑Tg, TRAb/TSI and H. pylori IgG cutoffs vary by kit. Where a printed cutoff exists the printed range wins; the engine never invents a number for these.
- **Titre strings** — `1:8`, `1/8`, `۱:۸`, `Reactive 1:16`: parsed by `parseTitre`, never `toNum` (N6).
- **Unit‑less numbers whose unit decides severity** (a numeric Anti‑Tg/TRAb in IU/mL vs kIU/L, a semen count without ×10⁶/mL) are never graded by guess (N3/P48).
- **Hand‑off with existing rules** — `thyroid_*`, `hypothyroid/hyperthyroid`, `semen_analysis` rules already read neighbouring keys. New rules must hand off by calling the owner (M91e), and each analyte gets a count guard (exactly one finding talks about it, N20).

## Requirements *(mandatory)*

### Functional Requirements

**Part A — catalogue relabel (Story 1)**
- **FR‑001**: The catalogue MUST show HbA2 & HbF, ApoB, Homocysteine, NT‑proBNP/BNP, Prolactin (both listings), Thyroid Panel, Copper & Ceruloplasmin, eGFR and Non‑HDL as available, and MUST NOT change the state of any Tier‑1 test until that test's engine support ships.
- **FR‑002**: Part A MUST NOT modify any file under `khanesh-server/rules/`.
- **FR‑003**: Before relabelling, each of the nine MUST be re‑probed through the live engine on the day of the change and the finding id recorded (the probe in the request is not trusted — N15(b)); an item whose probe fails stays "soon" and is reported.

**Part B — engine coverage (Stories 2 and 4), for every new test**
- **FR‑004**: Each new test MUST ship as one unit: name spellings (English, Persian, common misspellings from real sheets), reference/unit definition, a grading mode or a qualitative reader, a pattern/rule that reads it, its Persian display name, and a regression test — a test without a reader is not "added" (N1, N28).
- **FR‑005**: Each new analyte MUST have a reader for **every** direction/value class it can land in (high, low, normal, absent, unreadable) (N19, N21).
- **FR‑006**: Every name the new mapping recognises MUST be probed in its ordinary, lone, unit‑less, other‑unit and child forms before shipping (N28), and the id set of `RULES` MUST be diffed before/after (N16).
- **FR‑007**: Numeric values in scope (numeric Anti‑Tg/TRAb, semen rows) MUST convert units only when the sheet prints the unit; with no unit, use the row's printed range, else do not grade and route to the unit‑unknown finding (N3/P48). Each accepted unit spelling MUST be listed.
- **FR‑008**: **Closed qualitative sets (FR‑Q).** VDRL/RPR, Indirect Coombs, H. pylori Ag/Ab/UBT, Rubella IgG (when qualitative), TRAb/Anti‑Tg (qualitative) MUST be read from a closed, whole‑value whitelist of positive and negative words (English + Persian + titre forms). Anything else (`undetected`, `+/-`, `equivocal`, `borderline`, `grey zone`) MUST go to "تفسیر نشدند" and MUST NOT be treated as positive or negative (N6).
- **FR‑009**: Findings MUST be conditional on what the sheet printed. A negative/normal result MUST be scoped to that test only; absence of a partner test (Rh type, FT4/TSH, glucose, age, sex, pregnancy) MUST have its own sentence (N4, N21).
- **FR‑010**: Every finding's `urgency` and its action sentence MUST derive from one computed value (N20/`actionFor`). No new finding may be `emergency` unless a reviewer‑approved, sourced criterion says so; the default ceiling is `this_week` (`soon` where the engine's existing neonatal/blast convention applies). Check each rule's failure direction against its most **ordinary** input, not its worst (N3 troponin, N20 DKA).
- **FR‑011**: No finding MAY name a disease as a conclusion from one test. Permitted wording is "pattern typical of …, needs physician confirmation". Specifically forbidden: "you have syphilis / Graves / H. pylori infection" from a screening or single result.
- **FR‑012**: Any derived value MUST be labelled calculated/derived and MUST carry their formula inputs (N5) and MUST NOT appear as if printed on the sheet.
- **FR‑013**: Pregnancy‑, age‑ and sex‑dependent sentences MUST read `context` and MUST say nothing when the field is unknown (P64 pattern). Adult tables MUST NOT silently apply to children (N23/P57).
- **FR‑014**: Row identity MUST be `(page kind, name)`: `Tg`/Anti‑Tg, the Coombs family and the semen page MUST NOT collide (N25). A recognised row MUST have a reader or a route to `unmapped`; none may be dropped silently.
- **FR‑015**: Every clinical threshold, range and unit factor considered MUST be recorded in `MEDICAL_RULES.md` as a pending proposal (`P68`, `P71` semen part) with source, scope and patient impact. **No threshold MAY reach executable code until a human reviewer approves it** (constitution, Clinical Change Constraints). Until then readers compare only against what the sheet printed (range, cutoff, interpretation word); a value with nothing printed to compare against is unread.
- **FR‑016**: Part B Persian strings MUST be Persian‑only (no raw engine keys — `faName()` for every key, rows added to `SUGGEST_TESTS` for any suggested panel), and MUST pass the existing encoding and language guards.
- **FR‑017**: After the Tier‑1 reader exists for a test, its catalogue entry MUST be relabelled in the same change (not before).

### Key Entities

- **Catalogue entry**: a test page with a state (available / soon); Part A flips state only.
- **Engine key**: canonical identifier for a measured quantity or qualitative result (new: TRAb/TSI, Anti‑Tg, qualitative VDRL/RPR, Rubella IgG, Indirect Coombs, H. pylori Ag/Ab/UBT; semen names map to existing `SEMEN_*`).
- **Finding**: a rule's output with urgency, must‑say text, action, sources.
- **Pending proposal (P68, P71 semen part)**: a recorded, sourced, unapproved clinical decision.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC‑001**: After Part A, 9 of 9 listed catalogue entries open a full page (0 "soon" among them), with a before/after list showing no other entry changed state.
- **SC‑002**: For each of the 7 in‑scope Tier‑1 tests (H. pylori, VDRL/RPR, Rubella IgG, Indirect Coombs, Anti‑Tg, TRAb/TSI, semen composite), a sheet containing only that test's abnormal result produces a Persian finding that names the test and the printed number; the share of such sheets that end in the canned "normal" message or in "no explanation" is 0%.
- **SC‑003**: For each of the 7, a *normal/negative* sheet produces no alarmist finding (0 findings above `routine` for ordinary inputs), and a sweep of ordinary inputs in every accepted unit produces zero false emergencies.
- **SC‑004**: A sweep of qualitative spellings per closed set (≥ 15 positive, ≥ 15 negative, ≥ 10 ambiguous, English + Persian + titre forms) classifies 100% of positives and negatives correctly and 100% of ambiguous values into "unread" — none as positive.
- **SC‑005**: 0 unit‑less numeric values (numeric Anti‑Tg/TRAb, semen) whose unit decides severity are graded without a printed range; each ends in the unit‑unknown line.
- **SC‑006**: The rule‑id set changes only by the new ids listed in the plan; the full backend suite passes with no existing test weakened, and every new regression test is demonstrated failing against the pre‑change tree (N10).
- **SC‑007**: A medical reviewer can accept or reject each of the proposed thresholds from `MEDICAL_RULES.md` alone — every one has a named source, an applicability scope and a patient‑impact statement; the count of thresholds in code without a recorded entry is 0.
- **SC‑008**: A mixed upload (CBC page + semen page; lipid page + thyroid antibody page) loses 0 rows from any page and misreads 0 shared‑vocabulary rows (Tg, Coombs, Count, Volume).

## Assumptions

- **Delivery order**: Story 1 ships first, alone and immediately. Stories 2 → 4 follow; each is gated by `MEDICAL_RULES.md` review of its own thresholds, and nothing blocks Story 1. Story 3 is specs/013 (clarification 2026‑10‑03).
- **Evidence status**: the research in `research.md` was gathered via web‑search summaries of the named guidelines on 2026‑10‑03; primary documents were **not** opened. Sources are therefore cited as "named body / document, summary‑verified". The reviewer must confirm against the primary text before any number leaves "pending"; this follows the project rule that a document not opened is not cited as read.
- **Assay dependence**: thresholds that vary by kit (Anti‑Tg, TRAb/TSI, H. pylori IgG, rubella equivocal zone) are read from the sheet's printed range/flag; the engine ships no fixed cutoff for them. This now applies to every test in this spec (C1, option الف): rubella 10 IU/mL is not in code either; VDRL/ICT titres are quoted, never compared to a fixed number.
- **Out of scope** (explicitly, to keep the feature bounded): Insulin/HOMA‑IR, OGTT, Cystatin C, 24 h urine protein, PSA/Free PSA, G6PD (all specs/013); Tier‑2/3 tests; computing eGFR from cystatin C (eGFRcr‑cys, KDIGO 2024) — only recording/reading a printed cystatin value now, with eGFRcr‑cys proposed as a follow‑up spec; treatment/dosing advice; PSA velocity/density; HLA, genetics; image‑based tests; full OGTT charting UI; GDM *screening* (50 g challenge) variants beyond a clearly‑labelled 75 g OGTT.
- **Semen**: reuses the WHO 2021 limits already in the engine (`WHO_SEMEN_2021`); this feature adds names only (no numeric thresholds). If a composite name cannot be proven semen‑only, it goes to `unmapped`.
- **Frontend**: has no tests; Story 1 and the relabel in FR‑017 are verified by lint + build + reading, and by the engine probe. `REF` (manual‑entry copy in `labRefs.js`) is NOT extended for new keys in this feature; divergences are recorded in `docs/reviews/REF_DIFF.md`.
- **Pre‑commit gate** applies; no `SKIP_HOOKS`. Baseline is re‑measured at plan time, never quoted.
