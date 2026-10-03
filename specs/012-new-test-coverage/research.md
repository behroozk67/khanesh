# Research — specs/012 (2026-10-03)

**Method & limit.** Web‑search summaries only; primary guideline PDFs were **not** opened. Every number below is a *proposal* for the reviewer (MEDICAL_RULES.md P68–P71), "summary‑verified", not "read in the source". Engine state from `engine-inventory.mjs --search` on the same day.

## §0 Row 0 — already covered (relabel only)
Re-probe at implementation time (FR‑003). User's probe: HbA2→`hba2_elevated`, HbF graded, ApoB→`apob_elevated`, Homocysteine→`homocysteine_elevated`, NT‑proBNP/BNP→`natriuretic_peptide_elevated`, Prolactin→`hyperprolactinemia`, eGFR→`indices.egfr` (CKD‑EPI 2021), Non‑HDL→`indices.non_hdl`. Catalogue duplicates noticed: Prolactin (lines ~266 and ~331); OGTT, Rubella IgG, Homocysteine also listed twice — duplicates must change together.

## §1 Tier‑1 per test

| Test | Engine today | Range / unit (proposal) | Rules / pattern (proposal) | Source (summary‑verified) |
|---|---|---|---|---|
| **H. pylori** | no trace | qualitative: Ag/UBT/IgG positive/negative | Ag or UBT positive = active infection → physician, treat; IgG positive ≠ active (can't tell current/past); negative caveat: PPI ≥2 wk, antibiotics ≥4 wk, bismuth | ACG 2024 H. pylori treatment guideline (AJG, 1 Sep 2024) |
| **Insulin / HOMA‑IR** | no trace | fasting insulin lab‑specific; µIU/mL = mIU/L; pmol/L ÷ 6.945. One Brazilian lab study: 2.52–13.14 µIU/mL (not a universal range). HOMA‑IR = ins(µIU/mL) × glu(mg/dL) ÷ 405 (÷22.5 with mmol/L) | **No official cutoff** (neither ADA nor Endocrine Society publishes one). Use printed range; HOMA‑IR shown as derived, ≥ ~2.5–3 "commonly cited", no diagnosis | PMC11554367 (Arch Endocrinol Metab 2024;68:e230483) |
| **OGTT** | `GLU_2H` exists; no OGTT point set | 75 g: GDM any of fasting ≥92, 1 h ≥180, 2 h ≥153 mg/dL (pregnancy 24–28 wk). Non‑pregnant 2 h: ≥200 diabetes, 140–199 prediabetes | key per timepoint; GDM thresholds only when `pregnant`; fasting ≥126 / random ≥200+symptoms = overt diabetes not GDM | ADA Standards of Care 2025 (§2, §15) |
| **Anti‑Tg** | no trace; **bare `tg` → TG (triglyceride)** | assay‑dependent; use printed cutoff | high + high TSH → autoimmune thyroiditis (Hashimoto) likely; lone high = routine; in thyroid cancer follow‑up Anti‑Tg invalidates thyroglobulin (not a feature of this app) | ATA 2016 hyperthyroidism guideline; ATA thyroid‑cancer guidance (not opened) |
| **TRAb / TSI** | only a `suggest` string (`patterns_endocrine_rheum.js:246`) | assay‑dependent; ATA: sens 96–97 %, spec 99 % for Graves in overt thyrotoxicosis; in pregnancy > 3× ULN → closer fetal monitoring | positive + low TSH/high FT4 = Graves pattern; pregnancy and > 3× printed ULN → obstetric/endocrine sentence | ATA 2016 (Ross et al.) |
| **VDRL / RPR** | no trace | qualitative + titre (1:2…); 4‑fold fall = treatment response | reactive = screening only; confirm with treponemal test; false positives: pregnancy, SLE/autoimmune, viral infection, drug use; never name syphilis alone | CDC STI Treatment Guidelines (syphilis; traditional vs reverse algorithm) |
| **Rubella IgG** | no trace | ≥ 10 IU/mL immune (CLSI cutoff; some labs 15) ; < 10 non‑immune; equivocal = lab‑printed | non‑immune: pregnancy → avoid exposure + tell obstetrician, **no vaccine in pregnancy**; non‑pregnant → vaccine counselling; infant <12 mo = maternal Ab | CLSI rubella serology subcommittee; CDC/ACOG (not opened) |
| **Indirect Coombs** | `COOMBS_WRIGHT` exists (Brucella) — different test | qualitative + titre | positive in pregnancy → antibody identification, titre; critical titre ≥ 1:16 → MCA Doppler (obstetrician); post‑RhIG (28 wk) low titres can be passive; negative says nothing of Rh type | ACOG PB 181 (Rh D alloimmunization); not opened |
| **G6PD** | no trace | activity U/g Hb or % of normal; qualitative fluorescent spot; WHO 2022 classes A <20 %, B <45 %, C 60–150 %, U | deficient: avoid trigger drugs/fava list, ask doctor; false normal after haemolysis/transfusion; female heterozygotes can read normal | WHO Malaria PAG 2022 G6PD classification |
| **Semen (composite)** | `semen_analysis`, `SEMEN_*`, `WHO_SEMEN_2021` exist | WHO 2021 LRL: volume 1.4 mL, conc 16 M/mL, total motility 42 %, progressive 30 %, morphology 4 % | names only | WHO Laboratory Manual 6th ed. 2021 |
| **24 h urine protein** | `proteinuria_pattern` reads dipstick/ACR | normal < 150 mg/24 h; nephrotic range > 3.5 g/24 h (per 1.73 m²/adult) | needs units per day; KDIGO 2024 prefers ACR; ACR A1 <30, A2 30–300, A3 >300 mg/g | KDIGO 2024 CKD guideline |
| **PSA / Free PSA** | no trace | no single AUA cutoff; free‑PSA % reference bands by age (40–49 25–40 %; 50–59 20–40 %; 60–69 15–30 %; ≥70 10–25 %), < 10 % ↑ suspicion in 4–10 ng/mL zone | nudge to urologist only; many benign causes; men ≥ 40–50 | AUA/SUO 2023 early detection (summary only; bands from a non‑guideline aggregator — **weakest source here**) |
| **Cystatin C** | no trace | assay/IFCC‑ERM specific (mg/L); use printed range | high with normal creatinine → possible reduced GFR; eGFRcr‑cys is KDIGO 2024's preferred confirmatory; **computing it is out of scope** | KDIGO 2024 |

## §2 Engine collisions found (N2/N25)
- `adapter.js:225` maps bare `tg` → `TG` (triglyceride). Thyroglobulin antibody must only map from `anti-Tg` / `anti-thyroglobulin` forms; a bare `Tg` stays triglyceride.
- `COOMBS_WRIGHT` aliases begin `coombs…`; direct/indirect Coombs need their own identities.
- `proteinuria_pattern` and `total_protein_abnormal` read "protein" rows: 24 h protein must not enter them by name.
- SEMEN has a page‑kind detector; composite title mapping must go through it, not `NAME_MAP`.

## §3 Weakest evidence (flag for reviewer)
PSA age bands; HOMA‑IR cutoff; Anti‑Tg/TRAb cutoffs (assay‑dependent); rubella 10 vs 15 IU/mL; Indirect‑Coombs titre thresholds (secondary articles, not ACOG text).

---

## §P0 Phase 0 decisions (plan, 2026-10-03)

### P0-1 Live probe (working tree, backend = `7b81c9e`, `RULES.length` 192)
Script: `specs/012-new-test-coverage/probe012.mjs` (run from `khanesh-server/`).

| Input | Today |
|---|---|
| HbA2 5.2 %, HbF 4 %, ApoB 160, Hcy 25, NT-proBNP 2000, BNP 500, PRL 60, FT4 2.5, Cu 40, Ceruloplasmin 10, Creat 2.5, Chol 260 + HDL 40 | each fires (`hba2_elevated`, `hbf_elevated`, `apob_elevated`, `homocysteine_elevated`, `natriuretic_peptide_elevated`×2, `hyperprolactinemia`, `thyroid_discordant_ft4_high`, `copper_deficiency`, `wilson_evaluation`, `kidney_impairment`, `dyslipidemia`) → **Story 1 confirmed, all 9** |
| VDRL, RPR, Rubella IgG, Indirect Coombs, H. pylori Ag, H. pylori IgG, Anti-Tg, Anti-thyroglobulin Ab, TRAb, TSI | **all `unmapped`, findings ∅** |
| Coombs Wright 1/160 | `brucella_active` (must stay) |
| bare `Tg 180 mg/dL` | `TG` → `dyslipidemia` (must stay) |
| Sperm concentration / Total motility / Normal forms | already `SPERM_CONC`, `SPERM_MOT_TOTAL`, `SPERM_MORPH` → `semen_analysis` |
| `Spermogram: Abnormal` | `semenQual`, findings ∅ → N28 gap |

### P0-2 Where the readers live
- **Decision**: new `patterns_serology.js` for VDRL/RPR, Rubella IgG, Indirect Coombs, H. pylori. Anti-Tg/TRAb extend the existing `thyroid` rule in `patterns_endocrine_rheum.js`.
- **Rationale**: `thyroid` already owns ANTI_TPO and fires on TPO alone. A second thyroid finding about an antibody would be the N20 two-findings-one-organ shape.
- **Alternatives**: put everything in `patterns_infectious.js` (rejected: Rubella/Coombs are not infections of the patient, and the file is the serology-of-infection owner for HIV/HBV/HCV with different urgency semantics). Put everything in `patterns_coverage_gaps.js` (rejected: that file is the P67 audit's catch-all, not a system owner).

### P0-3 Qualitative reading
- **Decision**: reuse `qualState()` (currently local to `patterns_coverage_gaps.js`). Move it to `patterns_utils.js` and export it, with no behaviour change. Its positive/negative lists already match the whole value and include `undetected`/`nondetected`. Add the titre form (`Reactive 1:8`, `1/8`, `۱:۸`) through `parseTitre` *after* `qualState` says `unknown`, and never treat a bare number as a titre for VDRL.
- **Rationale**: `serologyReactive` matches substrings (`detected` inside `undetected` → positive). That is the N6 class, so new readers must not use it. Fixing `serologyReactive` itself is out of scope (it is HIV/HBV/HCV territory); record it as a follow-up in P68.
- **Alternatives**: a new word list (rejected: two lists drift).

### P0-4 Routing names (adapter)
Anchored patterns added to `QUALITATIVE_PATTERNS`, all tested against the normalised key:
- `/^(vdrl|rpr)/`
- `/^rubellaigg|^rubellaab|^rubellaantibody|^سرخجه/` (IgG only)
- `/^(indirectcoombs|indirectantiglobulin|iat$|ict$|antibodyscreen|کومبسغیرمستقیم)/`
- `/^(hpylori|helicobacter|هلیکوباکتر)/` and `/^(ubt|ureabreathtest|c13ubt|c14ubt)$/`

Sent to **unmapped** on purpose (named in «تفسیر نشدند», no reader): `rubellaigm`, any H. pylori `iga`/`igm`, `directcoombs`/`dat`, a bare `coombs` without direct/indirect/wright. **Rationale**: a channel without a reader is a silent drop (N28), and `unmapped` is at least named.

Numeric Anti-Tg/TRAb/TSI: `antitg`, `antithyroglobulin(ab)?`, `tgab`, `atg`; `trab`, `tsi`, `tbii`, `tshreceptorab`, `tshrab`. With a printed reference they go to `ungraded` with the new reason **`assay_printed`** (`{value, unit, printedRange}`). With a qualitative value they go to `qual`. With neither they go to `unitUnknown`/unread. A bare `tg` stays `TG`. `assay_printed` was grepped across all `ungraded` readers to confirm it is unique (N25, M190b lesson).

### P0-5 Urgency (all proposals, P68)
| Finding | ordinary negative | positive / non-immune |
|---|---|---|
| syphilis screen | routine reassurance (scoped) | `this_week` |
| rubella IgG | none (immune is not abnormal; a one-line note only if pregnant) | pregnant `this_week`, otherwise `routine` |
| indirect Coombs | `routine` note (no claim about Rh) | pregnant `this_week` (reviewer Q: `soon`?), otherwise `routine` |
| H. pylori | `routine` note + PPI/antibiotic caveat for Ag/UBT | Ag/UBT `routine` (treatment talk); IgG `routine` (confirm with Ag/UBT) |
| thyroid antibodies | unchanged `thyroid` urgency | the `thyroid` rule's existing urgency. A lone antibody above its printed range is `routine`. In a declared pregnancy, TRAb above its printed range adds a sentence (tell the obstetrician); **no 3× ULN escalation in code** (C1) |

No `emergency`, no `blocks_others`.

### P0-5b C1 decision (2026-10-03, option الف)
**C1 decision (2026‑10‑03, option الف): no unapproved fixed threshold in code. Until P68 is approved by a human reviewer, readers use only the value, range, cutoff or interpretation word printed on the sheet.** Consequences: rubella numeric needs a printed cutoff or interpretation word; ICT titre is quoted and its significance is left to the obstetrician (no 1:16 in code); TRAb has no 3× ULN escalation. The urgency levels in P0-5 are non-numeric routing choices and stay, recorded as pending in P68.

### P0-6 Server routing
`server.js` already keeps the engine path for `qual` rows that produce a finding (`ownedQual`) and for any `ungraded` reason other than `no_range` (`ownedUngraded`). Contract tests T45 (VDRL-only sheet) and T46 (Anti-Tg-only sheet with printed range) must prove that no legacy-path fallback occurs. No `server.js` code change is expected. If T45 is red, fix the gate rather than the test.

### P0-7 Catalogue
Story 1 flips 9 lines (Prolactin ×2 → both). "Thyroid Panel" (line ~335) becomes `c(..., "thyroid", "thyroid-panel")` to match line 174. Story 2 entries flip in the same change as their reader. Before and after each flip, `node src/content/coverage.mjs` runs and the "بدون محتوا" count must not rise.

### P0-8 Guideline ids
`CDC_STI_2021` (open), `ACG_HPYLORI_2024` (open summary; AJG full text may be paywalled → `substitutedBy`), `ATA_HYPER_2016` (open, Thyroid 2016), `ACOG_RH_PB181` (paywalled → `substitutedBy` a named open review), `CLSI_RUBELLA` (paywalled → `substitutedBy` lab catalogue). Test G6 must stay green. A source not opened is cited with `substitutedBy`, never as read.

### P0-8b T005b: primary sources opened (2026-10-03)
| Source | Opened? | Exact supporting sentence | Effect on P68 |
|---|---|---|---|
| CDC STI Treatment Guidelines 2021, syphilis (cdc.gov/std/treatment-guidelines/syphilis.htm) | **yes** | "Persons with a reactive nontreponemal test should always receive a treponemal test to confirm the syphilis diagnosis" · "False-positive nontreponemal test results can be associated with … other infections (e.g., HIV), autoimmune conditions, vaccinations, injecting drug use, pregnancy, and older age" · "results should be reported quantitatively" | supports the VDRL/RPR text in full |
| CDC Pink Book ch.20 Rubella (cdc.gov/pinkbook/…/chapter-20-rubella.html) | **yes** | "serologic evidence of rubella immunity (equivocal test results should be considered negative)" · "Pregnancy is a contraindication for MMR or MMRV vaccine." · "vaccinate women postpartum and postabortion" | supports the no-vaccine-in-pregnancy and postpartum text. **No IU/mL cutoff in this source**, so the 10 IU/mL (CLSI) claim stays unverified. **New:** CDC treats an equivocal result as negative; that goes to P68 as a reviewer question. Until a decision, code keeps `equivocal` → unread. |
| ACG 2024 H. pylori: ACG "Guidelines Highlights 2024" PDF (gi.org), primary AJG text paywalled | **yes (highlights)** | "All patients found to be infected with H. pylori should be treated" · test of cure "Urea breath test · Fecal antigen test · Biopsy-based test" · "To avoid false negatives in test of cure - hold PPI x 2 weeks; bismuth and antibiotics x 4 weeks" | supports the Ag/UBT text and the caveat. The "serology cannot show active infection" sentence is **not** in the highlights, so it is registered with `substitutedBy` (the highlights) and phrased as the general fact that an antibody stays after infection, without attributing it to ACG |
| ATA 2016 hyperthyroidism, Ross et al., Thyroid 26:1343 (open copy, nursing.duke.edu) | **yes** | "In the setting of overt thyrotoxicosis, newer TRAb binding and bioassays have a sensitivity of 96-97% and a specificity of 99% for GD" · Rec 92: "TRAb levels should be measured when the etiology of hyperthyroidism in pregnancy is uncertain." · Rec 93: TRAb in the first trimester and, "if levels are elevated, again at 18-22 weeks" | supports the Graves-pattern and pregnancy sentences. **Correction: the ">3× ULN" rule is NOT in ATA 2016.** It comes from the 2017 ATA pregnancy guideline, which was not opened. Strike the "ATA 2016" attribution of 3× from P68 (it was never in code, per C1). |
| ACOG PB 181 (paywalled) → Baylor College of Medicine OB guideline "Alloimmunization" (Eppes & Adams, Oct 2025, bcm.edu) | **yes (substitute)** | "Titers of antibodies are determined with indirect coombs tests to determine the degree of alloimmunization" · "The threshold titer at which there is an increased risk of development of fetal hydrops is 1:16 for almost all antigens. The critical titer for Anti-Kell and Anti-Little c is 1:4." | supports the ICT text. The single 1:16 cutoff is **antigen-dependent** (1:4 for Kell/c), which is one more reason to keep no number in code (C1). |
| CLSI rubella serology document | no (paywalled, not opened) | — | the 10 IU/mL figure remains search-summary only and stays in P68 as unverified |
