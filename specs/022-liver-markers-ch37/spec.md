# Feature Specification: Liver Markers (Tietz, chapter 37)

**Feature Branch**: `022-liver-markers-ch37` (spec directory only; no git branch)

**Created**: 2026-11-10

**Status**: Draft

**Input**: «برای کبد هم مانند کلیه دقیقا عمل کن» — a NotebookLM extraction of Tietz chapter 37 (Liver Disease, pp. 700–717), covering:

- analytes;
- IF-THEN rules;
- special populations;
- pre-analytical factors;
- units;
- inconsistencies within the chapter;
- method-dependent cut-offs;
- what the chapter does not cover.

The workflow follows specs/021: read the engine first, add no rule for duplicates, and implement only gaps a probe shows.

## Current Behaviour

This was measured on `HEAD` (3a3ad46), which matches the working tree because `khanesh-server/` is clean. The method was to run `snapshots/probe.mjs` (38 panels) through `runEngine` and `runPatterns`. The output is in `snapshots/before.txt`.

**Source premise.** The chapter has no reference-interval table; §1 refers out to chapters 18 and 28. So `refs.js` is not touched. The extraction is an unverified summary (N46), so nothing cites Tietz as `sources:`.

**Already in the engine. These are duplicates and get no new rule:**

| Source item | Existing owner |
|---|---|
| Hepatocellular vs cholestatic | `liver_pattern` R ratio (≥ 5 / ≤ 2 / mixed / unspecified) |
| > 10× URL means acute injury | `liverMarked` → `soon`; CTCAE G4 (> 20×) → `emergency` + `blocks_others` |
| AST/ALT > 1 with alcohol | `alcoholic_liver_pattern` (De Ritis ≥ 2 + GGT) |
| Isolated ALP: check GGT for a bone or liver source | `alp_isolated` (GGT normal / high / absent) |
| Dilated vs normal ducts | not lab input; `liver_pattern` suggests ultrasound |
| Muscle source of AST (CK high) | `muscle_origin_not_liver` branch, `ck_elevated_alone` |
| Ammonia in liver failure | `hyperammonemia` (> 100 → emergency), `ammonia_mild_high` (AASLD/EASL) |
| anti-HBs ≥ 10 means immunity | `anti_hbs_result` |
| HBsAg reactive, false positive possible | `hbv_screen_reactive` |
| Low ceruloplasmin and Wilson | `wilson_evaluation` |
| Direct vs indirect bilirubin, Gilbert, haemolysis | `bilirubin_pattern`, `bilirubin_direct_high`/`_indirect_high`, `hemolysis_pattern` |
| Low albumin, low platelets, high INR, high bilirubin together | `cirrhosis_pattern` (3 of 4) |
| Ferritin and transferrin saturation in iron overload | `iron_markers_high` |
| AFP in cirrhosis surveillance | `tumor_markers_result` |
| Bilirubin µmol/L ↔ mg/dL (×17.1) | `units.js` |
| Child and pregnancy exclusions for "borderline" ALT | `liverBorderline` |
| HBV DNA / HCV RNA are not antibodies | adapter M16 → «تفسیر نشدند» (by design) |

**Gaps found by the probe:**

- **G1, coverage hole (N18/N20/N5).** `cirrhosis_pattern` quotes no number. Its text is «پروتئین سازنده کبد پایین، پلاکت پایین، و شاخص‌های دیگر». `albumin_low_alone` hands albumin to it (`P73_OWNERS.albumin`). So on L29, «آلبومین 2.7» lands in «برای این‌ها توضیحِ آمادهٔ اختصاصی نداریم», directly under the cirrhosis card. Bilirubin, platelets and INR count as "covered" only because the rule source reads them; the patient never sees their values in that card.
- **G2, wrong identity (N25/N49).** «HCV Ag: Reactive» (core antigen) is read by `hcv_screen_reactive` as an antibody, and the text says «آنتی‌بادی … می‌تواند نشان‌دهنده‌ی عفونت گذشته‌ای باشد». An antigen marks virus present now. The source says the assay is positive when HCV RNA ≥ 20,000 IU/mL. «HCV Core Antigen: 30» (numeric) has no reader at all; only the server's unread-row warning shows it.
- **G3, asking for a test that is on the sheet (N4).** «Anti-HCV Reactive + HCV RNA 2,500,000» and «HBsAg Positive + HBV DNA 50,000» both say «حتماً باید با یک آزمایش تکمیلی بررسی شود». They never mention that the molecular test is printed on the same sheet and was not interpreted.
- **G4, a missing source rule.** AST high with ALT normal or lower than AST, and **no CK on the sheet** (L17b, L4): the text says «سلول‌های کبد تحریک شده‌اند» and suggests ALP/GGT/hepatitis/ultrasound. The source (p. 704, p. 710) says AST > ALT points to early injury, a non-hepatic (muscle) source, or cirrhosis, «especially in physically active young individuals». CK is never suggested.
- **G5, numberless texts (N5).**
  - `hyperammonemia` is an emergency, and its text quotes neither the value nor the range.
  - `alp_isolated` quotes neither.
  - `coagulation_abnormal` quotes no number when aPTT is absent (L14, L26, L27, L29). Next to raised liver enzymes it names only «داروهای رقیق‌کننده خون». The source says a prolonged PT in liver disease reflects reduced synthesis (p. 702).

**Numeric conflicts with the engine.** These are recorded and not changed.

| Item | Source | Engine |
|---|---|---|
| Ferritin, abnormal | F premenopausal > 250, M/postmenopausal > 300 µg/L | F 15–150 (refs), `feCut` F 200 / M 300 |
| Transferrin saturation | > 45 % = earliest overload marker | range 20–55; `tsCut` F 45 / M 50 |
| Ammonia | > 200 µmol/L in ALF = cerebral oedema | emergency > 100 (stricter, kept) |
| Acute hepatitis | AST > 200 or ALT > 300 U/L (> 90 % sens/spec) | `liverMarked` 330/360 U/L (~ 8–9×); `this_week` below |
| Bilirubin 5 mg/dL | 85 vs 86 µmol/L in the same table | ×17.1 |

**Clinical decisions offered to the user. None is implemented without an answer.**

- **D1.** Transferrin saturation 46–55 % gives no finding today (L10). Options: a second `match` arm with a fasting caveat, or no change.
- **D2.** Ferritin > 1000 (L9) gets the same «mostly inflammation» text as 230.
- **D3.** Aminotransferases > 50× URL or > 10,000 (L3, L32) are already an emergency, but the text names only «التهاب حاد کبد». The source names toxic (acetaminophen) and ischaemic injury.
- **D4.** Liver injury with INR ≥ 1.5 (L14) stays `this_week`. AASLD treats acute liver injury with an INR ≥ 1.5 as needing same-day assessment.

**Source items that need an input no sheet carries.** These are not implemented: Child-Pugh (ascites, encephalopathy), PT in seconds over control, HBV phases and treatment thresholds, the BCG/BCP albumin method, the acetaminophen dose, imaging, and all of §6 (incubation periods, chronicity rates).

## Requirements

- **FR-001 (G1).** `cirrhosis_pattern` quotes each abnormal marker it counted, with value and range. On L29 no abnormal value may remain in «توضیح نداریم». Urgency is unchanged.
- **FR-002 (G2).** An HCV core-antigen row is never read by the antibody reader. It goes to «تفسیر نشدند», the same route as HCV RNA (M16). An anti-HCV row is unchanged.
- **FR-003 (G3).** When a hepatitis B/C screen is reactive and the same virus's DNA/RNA row is on the sheet, the finding says that test is on the sheet and was not interpreted, instead of asking for it. Urgency is unchanged.
- **FR-004 (G4).** When AST is high, ALT is normal or lower than AST, CK is not on the sheet, and the muscle branch did not fire, `liver_pattern` adds one sentence naming a muscle source (exercise) and adds «CK» to `suggest`. No urgency change.
- **FR-005 (G5).** `hyperammonemia`, `alp_isolated` and `coagulation_abnormal` (numberless branch) quote the value and range. Next to raised ALT/AST, the coagulation text names reduced liver synthesis as a cause. No urgency change.
- **FR-006.** Every hunk of `after.txt` maps to a G item. The rule-id set is unchanged. Byte-locks that move are re-baselined only with proof that the diff is the intended clause.
- **FR-007.** Each G gets a test that fails on `HEAD`. A `MEDICAL_RULES.md` P134 entry lands in the same commit.

## Clarifications

### Session 2026-11-10

- Q: Which gaps get implemented, and which D items? → G1–G5, all. D1–D4 are not implemented (user: «G1 to G5, all (Recommended)»).
