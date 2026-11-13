# Feature Specification: Thyroid Disorders (Tietz chapter 42): gaps only

**Feature Branch**: `026-thyroid-ch42` (spec directory only; no git branch)

**Created**: 2026-11-13

**Status**: Draft

**Input**: A Persian NotebookLM extraction of Tietz chapter 42 («Thyroid Disorders», pp. 811–828), pasted by the user as `پرونده_استخراج_دانش_بالینی_اختلالات_غده_تیروئید.md`. The user set the same two conditions as P143:
1. No rule the engine already has is implemented again. Only rules that make the engine's diagnosis or interpretation better are implemented.
2. Where a normal range differs from the engine's, the range most used in Iran wins.

## Current Behaviour

Every panel was probed on `HEAD` `0935e85`, a clean tree apart from `.impeccable`. Each panel was run through `runEngine` and then `runPatterns`. The probe script is `snapshots/probe_ch42.mjs` and its output is `snapshots/before.txt`.

**Source premise.** The extraction is secondary and unverified, because the raw chapter was not opened. Under N39/N46, nothing from it goes into `sources:` or `guidelines.js`, and no quote is treated as verbatim. Every number this feature contributes is a reviewer question under the next free number, **P144**. Grep shows `MEDICAL_RULES.md` ends at P143.

The extraction's §7 counts (13 🆕 / 5 ➕ / 6 ♻️) are not reused. Each item below was classified against the code and the probes.

### Already in the engine: duplicates that get no new rule (condition 1)

| Extraction item | Existing owner |
|---|---|
| Overt and subclinical hypo- and hyperthyroidism; central hypothyroidism (§5 rows 1–5) | `thyroid`, branches `thyroid_hypo_*`, `thyroid_hyper_*` and `thyroid_central_hypo` |
| `RULE_T3_TOX_01` (T3-toxicosis) | `thyroid_t3_toxicosis` |
| `RULE_RTH_TR_BETA_01`, `RULE_TSH_OMA_01` (thyroid hormone resistance, TSH-oma) | `thyroid_secondary_hyper`, which already names a pituitary tumour, hormone resistance and assay interference |
| `RULE_NTI_LOW_T3_01`, `RULE_NTI_PROLONGED_02` (non-thyroidal illness) | `thyroid_nonthyroidal_illness` |
| `RULE_NTI_RECOVERY_03` (TSH rebound during recovery) | Inpatient context (P99/`hospitalized`). Probe T5: «آزمایشِ تیروئید در بیماریِ حاد گمراه‌کننده است و معمولاً بعد از بهبود تکرار می‌شود». Outside hospital, "recent severe illness" is not on a sheet. |
| `RULE_PREG_TRAB_01` (TRAb positive in pregnancy) | `thyroidAbSentences` already adds a pregnancy sentence (P68). Gestational age (≥ 24 weeks) is not on a sheet. |
| `RULE_TG_INTERFERENCE_02`, for the anti-Tg side (anti-Tg positive makes Tg unreliable) | The P68 cancer-context anti-Tg sentence: «وجودش می‌تواند نتیجهٔ تیروگلوبولین را نامعتبر (کاذب پایین) کند» |
| Total T3/T4 raised by pregnancy or the pill (TBG) | `thyroid` (P84 M4), plus `total_t4_abnormal` (P119) |
| Calcitonin | `tumor_markers_result` (P77/P132) |
| Biotin and levothyroxine-timing interference | `thyroid_discordant_ft4_high` and `thyroid_ft4_abnormal`. The chapter itself does not mention biotin (§5 row 14). |

### Not executable from a lab sheet, or failing condition 1: these stay out

- `RULE_DRUG_AMIODARONE_01`, `RULE_DRUG_LITHIUM_02` and `RULE_DRUG_PROTEIN_DISP_03`. The drug list is not an engine input, and no reported condition carries it.
- `RULE_HETEROPHILE_INTERF_01`. Its condition, high TSH with normal FT4, is ordinary subclinical hypothyroidism, the most common abnormal thyroid sheet. Attaching an interference warning to every one of them would contaminate the common case (N20), and "clinical discordance" is not on a sheet.
- rT3, TBG and T3 uptake/FTI. These are almost never printed on Iranian sheets, and the probes (T8) show they stay in the unread list. They are not dropped silently.
- Trimester-specific pregnancy ranges, the TSH suppression target in thyroid cancer, antibody cut-offs, macro-TSH and dose timing. The extraction itself marks all of these 🚫: the chapter has no number for them.
- Pregnancy with low TSH (hCG effect). This is not in the extraction, so it cannot be used.

### Real gaps, each shown by a probe

| # | Probe | What the patient gets today |
|---|---|---|
| G1 | TSH 10 and 14, FT4 normal (T2) | «این کم‌کاری خفیف («تحت‌بالینی») است… و اغلب فقط پیگیری لازم دارد». The extraction separates mild SCH (4.0–9.9) from severe SCH (≥ 10). The engine's own `TSH_ENDO_REFER = 10` (ETA 2013, opened in P72) already says a TSH above 10 is a treatment threshold. The text contradicts both. |
| G2 | TSH 0.05, FT4 and FT3 normal (T3) | «این پرکاری خفیف («تحت‌بالینی») است». The extraction puts mild at 0.1–0.4. A value below 0.1 is not mild, and the engine's own `TSH_SUPPRESSED = 0.1` already says so when FT4 is missing. |
| G3 | Reported `hypothyroid` condition: TSH 0.2 + FT4 1.6, and TSH 8 + FT4 1.0 (T4) | The condition is stored but not active (P66), so the text is identical to a first diagnosis. The low TSH is told «شایع‌ترین علت آن بیماری خودایمنی گریوز است», and the high TSH is told «اغلب فقط پیگیری لازم دارد». For a patient on levothyroxine, the likeliest cause of either is the dose (extraction: `RULE_SUBCLIN_HYPER_01`, next step "review the levothyroxine dose"). This is the N57/P143 `dm2` shape again. |
| G4 | Pregnant, TPO 60 (< 34), TSH 2.0 (T6) | «اغلب فقط پیگیری لازم است». No word about pregnancy. The extraction (`RULE_PREG_AITD_RISK_02`) says thyroid antibodies in a euthyroid pregnancy call for TSH/FT4 monitoring through pregnancy and the postpartum period. |
| G5 | Thyroglobulin 2.5 ng/mL alone; Tg 0.2 + anti-Tg 150 (< 115) with `cancer` (T7) | `Thyroglobulin` sits in `unmapped`. Its number is never interpreted, and the anti-Tg sentence talks about a Tg result that the engine never read. |
| G6 | Neonate aged 2 days, TSH 20 (T9) | Graded against 5.2–14.6 and urgency `soon`, with «کم‌کاری». Nothing says when the screening sample should be taken (extraction: `RULE_NEONATAL_TSH_SURGE_01`, days 3–5). The `< 3 days` row already accounts for the surge, so a value above it is **not** explained by the surge. |
| G3b | `hypothyroid` + TPO 60 (< 34), TSH 2 (T4) | «گاهی با گذر زمان به کم‌کاری تیروئید می‌انجامد», said to someone who already has hypothyroidism. |
| G7 | TSH 0.45 with no printed range (T1) | Graded low against 0.5–4.5, which gives `thyroid_hyper_subclinical` and «گریوز». Tietz's lower limit is 0.4, and the kits common in Iran print 0.27–0.4. |

## User Scenarios & Testing *(mandatory)*

### User Story 1: A patient on levothyroxine reads their TSH as a dose check, not a new diagnosis (Priority: P1)

A patient who reported hypothyroidism uploads a follow-up TSH. Today a low TSH is attributed to Graves' disease, and a high TSH is told "often only follow-up". Both texts should say what the number means for someone already treated: the dose may be more than needed, or less than needed, and the treating doctor adjusts it.

**Why this priority**: This is the most common thyroid sheet in Iran, a follow-up TSH for a known patient. The current sentence misattributes the cause for every one of them.

**Independent Test**: Run TSH 0.05, 0.2, 2, 8 and 14 with FT4 normal, with and without the `hypothyroid` condition, and compare the text.

**Acceptance Scenarios**:

0. **The condition means "has hypothyroidism", not "takes levothyroxine".** Every new sentence is conditional, in the P143 shape: «اگر برای کم‌کاری تیروئید لووتیروکسین مصرف می‌کنید، …». No sentence assumes a dose exists.
1. **Given** the `hypothyroid` condition and TSH below range with FT4 normal or high, **Then** the text says that, if the patient takes levothyroxine, the most common cause of a low TSH is a dose higher than needed. It quotes the TSH number, and says the doctor decides on any dose change. «شایع‌ترین علت آن بیماری خودایمنی گریوز است» is not said as the first explanation.
2. **Given** the `hypothyroid` condition and TSH above range, **Then** the text says that, if the patient takes levothyroxine, the dose may not be enough, or the tablets may have been missed or taken with food. It does not say «اغلب فقط پیگیری لازم دارد».
2a. **Precedence with US2:** with the condition, the condition's text replaces the US2 ≥ 10 / < 0.1 wording. The magnitude is still stated, for example «TSH 14 بسیار بالاتر از حد است». One text wins, and the two never stack.
2b. **Every reader that describes the disease** (N57) is checked under the condition:
   - `thyroid_tpo_positive` and the `thyroid_antibody_positive` tail drop «گاهی با گذر زمان به کم‌کاری تیروئید می‌انجامد» / «اغلب فقط پیگیری». They say instead that this antibody is a common cause of the hypothyroidism already diagnosed.
   - `hypothyroid_dyslipidemia_link` and the `interpret.js` TSH classifier text are read, and their behaviour is recorded in the plan. They change only if they assert a first diagnosis.
2c. The condition appears in `_engine.context.conditions_applied` and in the model's tone context only on sheets where a thyroid analyte was read. This is the same limit `dm2` uses, and the plan states where it is enforced.
3. **Given** the `hypothyroid` condition and TSH within range, **Then** no new finding appears. No sentence is generated about a normal value (N35).
4. **Given** no condition is reported, **Then** the output is byte-identical to today on every probe panel.
5. **Given** the condition is active with low FT4 and low TSH (central pattern), or with high TSH and high FT4, **Then** those branches keep their current text. The condition only rewrites the primary hypo- and hyper branches.
6. **Given** any of the above, **Then** urgency is the same as today for the same numbers. Only the wording changes.

---

### User Story 2: A clearly high or clearly suppressed TSH is not called "mild" (Priority: P1)

**Why this priority**: G1 and G2 tell the patient the opposite of the engine's own thresholds.

**Independent Test**: TSH 9.9 / 10.0 / 14 with FT4 normal, and TSH 0.1 / 0.099 / 0.05 with FT4 normal.

**Acceptance Scenarios**:

1. **Given** TSH ≥ 10 mIU/L with FT4 normal, **Then** «خفیف» and «اغلب فقط پیگیری لازم دارد» are replaced. The new text says the hormone is still normal, but a TSH this high is a level at which doctors usually consider treatment. It still says the test is usually repeated to confirm.
2. **Given** TSH 9.9 with FT4 normal, **Then** today's mild text is kept exactly (the edge is ≥ 10).
3. **Given** TSH < 0.1 with FT4 normal, **Then** «خفیف» is replaced by «تحت‌بالینی» without the word «خفیف». The text says the TSH is suppressed and the pattern needs a doctor's assessment.
4. **Given** TSH exactly 0.1, **Then** today's mild text is kept (the edge is < 0.1, the same as `TSH_SUPPRESSED`).
5. **Given** any of the above, **Then** urgency is unchanged. P72/M305 deliberately keep FT4-normal subclinical at `routine`. Raising it is a reviewer question under P144, not part of this feature.

---

### User Story 3: Thyroglobulin on the sheet is read, never dropped (Priority: P2)

**Why this priority**: Thyroglobulin only appears on a sheet in thyroid-cancer follow-up, and today it falls into `unmapped` (N2).

**Independent Test**: Tg alone with and without a printed range; Tg with anti-Tg positive, negative, or absent; with and without the `cancer` condition.

**Acceptance Scenarios**:

0. **Blocking precondition.** Today the anti-Tg cancer context (`thyroidCancerContext`, B5) detects thyroglobulin only by finding its row in `unmapped` or `qual`. Mapping Tg removes it from there. Without a fix, «Tg 0.2 + anti-Tg 150 (<115)» with no `cancer` condition falls back to the Hashimoto text and «اغلب فقط پیگیری». That is the false reassurance B5 exists to prevent. The reader MUST recognise the mapped Tg key. The probe `T7 tg + antitg pos nocond` locks today's cancer-context text, and it must survive.
1. **Given** «Thyroglobulin 2.5 ng/mL», **Then** the row is recognised and quoted with its number. It is never in `unmapped`.
2. **Given** a thyroglobulin row, **Then** the text says Tg is mainly used to follow people treated for thyroid cancer, that its meaning depends on whether the thyroid was removed and on the treating doctor's protocol, and that it is not a cancer test. No verdict from a normal-population reference range is given, because that range is meaningless after thyroidectomy.
3. **Given** Tg with anti-Tg above range or positive on the same sheet, **Then** one sentence says the Tg number may be falsely low and cannot be relied on. **Given** anti-Tg within range or negative, **Then** it says that anti-Tg is negative, so this interference is unlikely. **Given** anti-Tg absent, **Then** it says anti-Tg is needed to interpret Tg, and it is suggested as a test.
4. **Given** any Tg value, **Then** no text says "no tumour" or "cured". The extraction's < 1 ng/mL cut-off is for a *stimulated* Tg, and a sheet does not say whether the Tg was stimulated.
5. **Given** a Tg row, **Then** urgency is `routine`. The finding owns no scored key, and the health score of a sheet is unchanged by the row (N46/N57).

---

### User Story 4: Pregnancy changes what a positive thyroid antibody means (Priority: P2)

**Acceptance Scenarios**:

1. **Given** `pregnant` and TPO or anti-Tg above range or positive with TSH normal or absent, **Then** one sentence is added: in pregnancy, thyroid antibodies are associated with a higher risk to the pregnancy and with postpartum thyroiditis even when TSH is normal, so TSH (and FT4) are usually checked again during pregnancy and after delivery.
2. **Given** not pregnant, **Then** the text is byte-identical to today.
3. **Given** the pregnancy sentence, **Then** urgency is unchanged.

---

### User Story 5: A newborn's TSH in the first days carries the screening timing, never a reassurance (Priority: P3)

**Why it is limited to timing**: the `< 3 days` row (5.2–14.6) already allows for the post-birth surge. A TSH graded high against it has exceeded the surge-adjusted range. Saying "TSH rises physiologically after birth" would soften a possible congenital hypothyroidism, which is time-critical.

**Acceptance Scenarios**:

1. **Given** TSH graded high against the `< 3 days` paediatric row, **Then** one sentence is added: the newborn thyroid screening test is done on days 3–5 after birth, and this result should be repeated or confirmed in that window, as the doctor or screening programme advises. Nothing in the sentence implies the value is explained or normal.
2. **Given** the sentence, **Then** urgency is unchanged (the N26 newborn floor stays). The 5.2–14.6 range is not changed.
3. **Given** the gate, **Then** it is the paediatric row that actually graded the value, not a recomputed age. Intake sends whole years (N53). The plan must show that a real sheet can deliver an age in days or hours (for example «48 h»). If no path can, US5 is dropped and recorded as not executable.
4. **Given** a TSH graded against any other row, **Then** the text is unchanged.

---

### User Story 6: The fallback TSH lower limit matches Iranian sheets (Priority: P3)

**Acceptance Scenarios**:

1. **Given** an adult TSH of 0.45 with no printed range, **Then** it is within range (the new lower limit is 0.4), and no hyperthyroid finding appears.
2. **Given** TSH 0.39 with no printed range, **Then** it is low, and the text is today's subclinical text.
3. **Given** a printed range, **Then** the printed range keeps deciding, as today.
4. **Given** the change, **Then** `TSH_SUPPRESSED`, the paediatric rows and every rule reading `TSH.dir === "low"` are re-probed at 0.39, 0.40, 0.45 and 0.5 (N23).
5. **Sequencing.** US6 changes the quoted «حد طبیعی 0.5–4.5» in every finding that graded TSH on the fallback, which is almost every probe panel. So US6 is its own step and its own commit. It has its own before/after, and the diff is proven to be only that range string (plus the T1 panels) before it is re-baselined. US1–US5 are diffed against `before.txt` first, while the range is still 0.5.

### Edge Cases

- `hypothyroid` and `pregnant` together: both sentences may apply. The pregnancy overt-hypothyroidism sentence is kept.
- `hypothyroid` with `hospitalized`: the inpatient context sentence is still appended. The condition does not remove it.
- A man with TPO positive is not given the pregnancy sentence (`pregnant` is never true for a man).
- «Tg» alone is ambiguous with triglyceride. It must not be mapped to thyroglobulin. Only explicit thyroglobulin spellings are (N25, the existing `THYROGLOBULIN_RE`).
- Anti-Tg must not be captured as thyroglobulin, and thyroglobulin must not be captured as anti-Tg.
- Under-16 patients: US2 uses the same ≥ 10 / < 0.1 edges only when the graded TSH is already abnormal against the paediatric range. No new child threshold is added.
- Every new rule or branch needs a `RULE_GROUP` entry (GR1) and must be tested beside every emergency it can sit under (N20).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The items listed under "Already in the engine" and "Not executable" MUST NOT produce new rules or change existing thresholds.
- **FR-002**: The `hypothyroid` condition MUST become active (recorded in P144, P66 procedure). Test M280 pins the active set (`["cancer","dialysis","dm2","hospitalized"]`) and is updated deliberately. Under the condition, the condition rewrites the primary hypo- and hyper-branch wording and every reader listed in US1-2b, always conditionally («اگر لووتیروکسین مصرف می‌کنید»). Without the condition, output MUST be byte-identical on every probe panel.
- **FR-003**: With FT4 normal, TSH ≥ 10 MUST NOT be described as «خفیف» or «اغلب فقط پیگیری». TSH < 0.1 MUST NOT be described as «خفیف». The edges are the engine's existing constants. No new number is introduced.
- **FR-004**: Thyroglobulin MUST be recognised and quoted, with its three-state anti-Tg sentence, and MUST NOT be graded against a population reference range.
- **FR-005**: In pregnancy, a positive TPO or anti-Tg with TSH not abnormal MUST carry the monitoring sentence.
- **FR-004a**: `thyroidCancerContext` MUST still detect thyroglobulin after it is mapped.
- **FR-006**: A TSH graded high against the `< 3 days` row MUST carry the screening-timing sentence and no reassurance, with no change to range or urgency. If no input path delivers an age under 3 days, FR-006 is dropped.
- **FR-007**: The adult fallback TSH range MUST change from 0.5–4.5 to 0.4–4.5. The client copy (`labRefs.js`) MUST be checked and any divergence recorded in `REF_DIFF.md`.
- **FR-008**: No new finding or sentence MUST lower the urgency of any panel (metamorphic). No new `ALLOWED_DROPS`.
- **FR-009**: Every new number and decision MUST be recorded under **P144** in `MEDICAL_RULES.md` «در انتظارِ بازبینی», in the same commit as its behaviour (N37). P68, P72, P119 and P136 are cross-referenced, not re-decided.
- **FR-010**: Each new behaviour MUST have a regression test that fails on `HEAD` `0935e85` (N10). Edges MUST be probed at edge − ε, edge, and edge + ε.
- **FR-011**: Every new user-facing string MUST be Persian, use `faName()` where it names a test, and use probabilistic, non-diagnostic wording.

### Reference-range decisions (condition 2: the range most used in Iran)

| Analyte | Tietz (extraction) | Engine today | Chosen | Why |
|---|---|---|---|---|
| TSH, adult | 0.4–4.5 (p. 820); 0.4–4.2 (p. 825) | 0.5–4.5 | **0.4–4.5** | Both Tietz lower limits are 0.4. Iranian sheets print 0.27–4.2 (Roche), 0.35–4.94 (Abbott) and 0.3–5.0 / 0.4–4.0 (ELISA kits). 0.5 is above all of them, and today it labels values they call normal as hyperthyroid. The upper limit 4.5 sits inside the 4.2–5.0 spread and matches Tietz p. 820, so it stays. |
| TSH, paediatric | surge 25–160 in the first 30 min | RCPCH rows; 1–16 y 0.5–5.0 (P119) | **no change** | The chapter gives no child range. P119 was a user decision. |
| FT4, FT3, T3, T4, Anti-TPO | not in the chapter (Appendix) | 0.7–2.0 / 2.8–4.4 / 80–180 / 5–12 / 0–9 | **no change** | No source number. Anti-TPO is printed-first already (P136). |
| Thyroglobulin | sensitivity ≤ 0.1 ng/mL; stimulated cut-off < 1 | none | **no fallback range** | A population range misleads after thyroidectomy. The printed range is only quoted. |

### Key Entities

- **`hypothyroid` condition**: an existing reported condition (`conditions.js`), now added to `ACTIVE_CONDITIONS`.
- **Thyroglobulin row**: name, value, unit (ng/mL = µg/L), printed range (quoted only), and partner anti-Tg state (above or positive / within or negative / absent).
- **Pregnancy flag**: the existing `patient.pregnant`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Before US6, the probe panels for G1–G6 change as specified, and every other panel in `before.txt` is byte-identical. After US6, the diff against the pre-US6 output contains only the TSH range string and the T1 panels.
- **SC-002**: A sheet printing thyroglobulin leaves 0 thyroglobulin rows in the unmapped list.
- **SC-003**: The existing suite and `metamorphic.test.js` stay green with no new `ALLOWED_DROPS`. The only failure allowed is the pre-existing one, re-measured on `HEAD`.
- **SC-004**: No panel's overall urgency differs from `before.txt`, except where the TSH fallback change (US6) removes a false finding (TSH 0.4–0.49 with no printed range).
- **SC-005**: Every new decision appears in P144 with its source and its status, «در انتظارِ بازبینی».

## Assumptions

- Activating `hypothyroid` is the same kind of decision as `dm2` (P143). The user's request to implement "what improves interpretation" is taken as covering it. It is recorded in P144 as a reviewer question, not a settled one.
- "Most used in Iran" for TSH is judged from common kit inserts (Roche Elecsys, Abbott Architect, Iranian ELISA kits), not from a document opened this session. It is a reviewer question.
- The ≥ 10 and < 0.1 edges reuse `TSH_ENDO_REFER` and `TSH_SUPPRESSED`. Urgency for FT4-normal subclinical stays `routine` (P72/M305). Whether TSH ≥ 10 with FT4 normal should become `this_week` is listed as a P144 question.
- The newborn sentence uses only the "days 3–5" screening window. No number from the 25–160 peak is shown, and the surge is not offered as an explanation.
- Spellings for thyroglobulin come from the existing `THYROGLOBULIN_RE` plus the extraction §4-a (Thyroglobulin, Serum Thyroglobulin, تیروگلوبولین). No fuzzy matching is added, and «Tg» alone is not mapped.
