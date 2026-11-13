# Research: Thyroid Disorders (Tietz ch. 42), gaps only

The extraction (`پرونده_استخراج_دانش_بالینی_اختلالات_غده_تیروئید.md`) is secondary and its quotes are unverified. Nothing here is cited as `sources: Tietz`. The probe ran on `HEAD` `0935e85`, and its output is in `snapshots/before.txt` (32 panels).

## Duplicates confirmed in code (condition 1)

These are all in `patterns_endocrine_rheum.js`, rule `thyroid`, unless another file is named:

- `thyroid_nonthyroidal_illness` (line 132): NTI initial and prolonged
- `thyroid_t3_toxicosis` (157): T3-toxicosis
- `thyroid_central_hypo` (180): TSH low with FT4 low
- `thyroid_secondary_hyper` (208): names a TSH-secreting tumour, hormone resistance and assay interference
- `thyroid_discordant_ft4_high` (213): biotin and levothyroxine timing
- `thyroid_ft4_abnormal` (393): FT4 low with TSH normal (P107)
- `thyroidAbSentences` (691): anti-Tg in cancer context, and TRAb in pregnancy
- `tumor_markers_result` (`patterns_autoimmune.js`): calcitonin
- inpatient sentence (P99): "repeat after recovery". Probe T5 shows it.

## Decisions

### D1: Activate `hypothyroid` (US1)

- **Decision:** add it to `ACTIVE_CONDITIONS`. Add a helper `knownHypothyroid(e) = e.conditions?.includes("hypothyroid")`. Pregnancy does not disable it. Unlike `dm2`, the dose question matters more in pregnancy. The overt-hypo pregnancy sentence is kept.
- **Wording:** every sentence is conditional on taking levothyroxine. The condition records the disease, not the drug.
- **Readers changed:**
  - `thyroid` hypo branch (238)
  - `thyroid` hyper branch (306)
  - `thyroid_tpo_positive` (343)
  - `thyroidWithAntibodies` tail (767)
- **Readers checked and left:**
  - `hypothyroid_dyslipidemia_link` already says «با درمان تیروئید اغلب چربی هم بهتر می‌شود». That is true for a treated patient too.
  - The `interpret.js` TSH classifier `patient` text is a band label that the `thyroid` finding supersedes. It is not a second sentence.
  - `thyroid_central_hypo`, `thyroid_secondary_hyper`, `thyroid_discordant_ft4_high` and `thyroid_ft4_abnormal` describe patterns a dose does not explain. They are unchanged (spec US1-5).
- **Context:** branches that used the condition set `applied_conditions: ["hypothyroid"]`. `engineContext` (`server.js:139`) then lists it only on those sheets, the same mechanism as `dm2`. M283 strips inactive conditions from the model. Once activated, the label reaches the tone context only through this path.
- **Test lock:** M280 (`engine.test.js:12305`) pins `["cancer","dialysis","dm2","hospitalized"]`. It is updated to add `hypothyroid`, with a Persian comment naming P144.
- **Alternative rejected:** a new `levothyroxine` condition. That adds an onboarding option, a UI change and a sixth list entry. The conditional wording covers the untreated case without one.

### D2: TSH ≥ 10 / < 0.1 with FT4 normal (US2)

- **Decision:** only the wording of the subclinical sentence changes. The edges are the existing `TSH_ENDO_REFER` (≥ 10) and `TSH_SUPPRESSED` (< 0.1). No new constant. Urgency stays `routine` (P72/M305).
- **Precedence:** when the `hypothyroid` condition applies, its text replaces this one, and the magnitude is stated inside it.
- **Paediatrics:** the sentence fires only on an already-abnormal TSH. A child's TSH of 10 against the 0.5–5.0 range gets it. No new child threshold.

### D3: Thyroglobulin (US3)

- **Route:** `serology.js` line 496 is extended with `THYROGLOBULIN_RE` → key `THYROGLOBULIN`, which gives `{to: "assay", state: "quoted"}`.
  - **No `abVerdict`.** Tg is a concentration, and N49 says never to run a concentration through an antibody reader. No above/within verdict is computed, because a population range is meaningless after thyroidectomy.
  - Non-numeric text with no value goes to `unmapped`, as today. A censored value («<0.1») is quoted as printed.
- **Cancer context (blocking, FR-004a):** `thyroidCancerContext` gains `|| e.ungraded?.THYROGLOBULIN`. The probe `T7 tg + antitg pos nocond` locks the cancer-context text.
- **Owner:** the `thyroid` rule. `match` adds `Tg present`, and `thyroidWithAntibodies` treats Tg as a third partner.
  - If nothing else is abnormal: pattern `thyroid_thyroglobulin`, urgency `routine`.
  - Otherwise: the Tg sentence is appended to the core finding.
  - No new rule id, so the GR1 entry `thyroid` already covers it. `RULE_READS` sees `THYROGLOBULIN` in `thyroidAbSentences`, which sits outside `build`. It is checked with `unmatched_abnormal` probes.
- **Anti-Tg three states:**
  - above/pos: the existing anti-Tg cancer sentence already says Tg may be falsely low, so the Tg sentence does not repeat it.
  - within/neg: one sentence says the interference is unlikely.
  - absent: one sentence, plus a suggest entry «آنتی‌بادی ضد تیروگلوبولین (Anti-Tg)» (new `SUGGEST_TESTS` row).
- **Score:** measure `healthScore` on a clean sheet with and without Tg (N46/N57). If it drops, exempt a `thyroid` finding whose `explains ⊆ {THYROGLOBULIN, ANTI_TG, TRAB}` in `score.js`, in the same shape as the `tumor_markers_result` line 216.
- **Names:** `FA_NAMES.THYROGLOBULIN = "تیروگلوبولین"`. Spellings: the existing `THYROGLOBULIN_RE` plus `thyroglobulintg`. «Tg» alone stays unmapped, because it collides with triglyceride (N25).

### D4: Pregnancy and thyroid antibodies (US4)

- **Decision:** applies when `e.pregnant === true` and TPO is high or anti-Tg is above/pos, with TSH not abnormal. The «اغلب فقط پیگیری…» tail is **replaced**, not appended to, because it contradicts the monitoring advice.
- Urgency unchanged.

### D5: Newborn < 3 days (US5)

- **Input path exists:** onboarding sends `ageUnit` (year/month/day), and probe T9 with age 2/365 graded against the `D(3)` row.
- **Gate:** `getPedRef("TSH", e.age)` returns the row with `maxAge === D(3)`, and TSH is high. The sentence is timing-only (contract C8).
- Urgency and range unchanged.

### D6: TSH lower limit (US6, condition 2)

- **Decision:** `refs.js` TSH becomes `[0.4, 4.5]`. `labRefs.js` `tsh.range` becomes `low: 0.4`. Update the REF_DIFF row.
- **Why:** Tietz pp. 820/825 both give 0.4. Iranian kit inserts are Roche 0.27–4.2, Abbott 0.35–4.94, and ELISA kits 0.3–5.0 or 0.4–4.0. The upper limit stays: 4.5 is inside 4.2–5.0 and equals Tietz p. 820.
- **N23:** grep every `TSH` `dir === "low"` reader:
  - `thyroid` (hyper, NTI)
  - `interpret.js` `lln` band, which follows `getRef`
  - `TSH_SUPPRESSED` (0.1), which is unaffected
  - the paediatric rows, which are unaffected

  Probe at 0.39, 0.40, 0.45 and 0.5.
- **Separate commit:** it lands after US1–US5 are diffed against the 0.5 baseline.

## Conflicts recorded, not applied

- Upper TSH limit: Tietz 4.2 (p. 825, age-dependent) and 2.5–3.5 (antibody-negative population) against the engine's 4.5. Kept at 4.5.
- FT4, FT3 and Anti-TPO ranges: the chapter defers them to the Appendix. No change.
- TSH ≥ 10 with FT4 normal from `routine` to `this_week`: a P144 reviewer question.
- Wording: «taken with food/coffee/iron» is not in the extraction, so it is not used (spec US1-2 drift, recorded in the contract).
