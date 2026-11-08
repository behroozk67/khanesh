# Research: Tumour-Marker Clinical Rules

Trees: all measurements below are from the **working tree** of `main` (`HEAD` `8c15edf` + uncommitted changes from other sessions), 2026-11-08, by calling `runEngine` directly (45-year-old female profile). Probe scripts live in the session scratchpad, not the repo.

## 1. Measured current behaviour

| Probe | Result today |
|---|---|
| Live sheet (CEA 27.97 «Non smoker: < 5   Smokers: < 10», CA 125 10.3 «0-35», CA 15-3 11.6 «At or below: 31.0») | `graded`: VIT_D only. `ungraded`: CEA, CA125, CA153. CEA and CA153 → «بازهٔ مرجعِ چاپ‌شده … خوانده نشد»; CA125 → within. Finding `tumor_markers_result`, urgency `routine` |
| CEA 7, range with **spaces** / **newline** / «Non-smoker <5 Smoker <10» | `noref` (unread) |
| CEA 7, range with **`/`**, **`;`**, **`|`**, **`،`** | **`above`** — `cleanPrintedRef` splits on those separators and returns the first parseable part (`< 5`, the non-smoker band). A silent guess; the smoker band is discarded |
| CEA 5 vs «< 5» / «≤ 5»; CEA 5.1 vs «<5» | within / within / above — strict `<` is treated as `≤` (`abVerdict` hardcodes `≤`) |
| «At or below: 31.0» | `noref` (parser strips the label, leaves a bare number, no regex matches) |
| «up to 35», «Up to 35», «<= 35», «0 - 35», «0-35», «< 35», «Less than 35», «کمتر از 35», «Normal: <35», «Upto 35» | all read |
| Names mapped | `C.E.A`, `CEA`, `Carcinoembryonic Antigen`, `CA 125`, `CA-125`, `CA125`, `CA 125 II`, `Cancer Antigen 125`, `CA 15-3`, `CA15.3`, `CA 15 3`, `CA15-3`, `Cancer Antigen 15-3`, `Ca-153`, `CA 19-9`, `CA19.9`, `CA 19 9`, and with footnote marks `CEA(*1)`, `CA 125 (*1)` |
| Names **unmapped** (→ «تفسیر نشدند») | `CEA (Carcinoembryonic Antigen)`, `CA 15.3 (Breast)`, `CA 125 Ovarian`, and all Persian spellings tried (`سی ای ای`, `آنتی ژن کارسینو امبریونیک`, `سی آ 125`). `AI_RE` contains no Persian alternatives |
| Urgency, marker above printed range | `this_week` (`urgencyOf`, `patterns_autoimmune.js:46`); P77 register: «فوریت‌ها (بی‌منبع؛ پیشنهادِ من)», reviewer questions open |
| Where tumour markers sit | `ungraded` only ⇒ not in `serializeGraded` ⇒ not in `_engine.tests`; `score.js` counts them only in `unread` |
| Contract file named in the request | `specs/001-health-app-upgrade/contracts/engine-result.md` **does not exist** (no `specs/001-health-app-upgrade/`). Real contract: `_engine` shape in `.claude/rules/frontend.md` and `specs/016-expert-view/contracts/expert-output.md` |
| Baseline `npm test` (before) | working tree (`main` @ `8c15edf` + other sessions' dirty files), `khanesh-server/`, exit 0; runner summary: tests 1615, pass 1614, fail 0, skipped 0, todo 1. Re-measure before editing — the tree is shared |

## 2. Decisions

**D1 — Local range reader (`rules/tumor_markers.js`), not a change to `parseSegment`.**
Rationale: `parseSegment` has no notion of strictness or labelled bands and feeds every analyte's printed range; touching it risks moving unrelated byte-freeze tests (N36). Alternatives: (a) add `hiStrict` to `parseSegment` additively — rejected for this feature, revisit as a separate change; (b) extend `cleanPrintedRef` — rejected, it is the take-first-part trap.

**D2 — Two-band detection before any split.** Detect labelled bands (non-smoker / smoker, with Persian «غیرسیگاری / سیگاری» only if seen on real sheets) on the whole string; only if no labelled band exists fall back to the existing single-range path. Same rule protects any labelled multi-band range (e.g. pre-/post-menopausal) from first-part truncation — those are reported unreadable, not guessed.

**D3 — `between` verdict for CEA with unknown smoking status.** within ≤ lower limit; between (lower, upper]; above > upper. Neutral wording that states the dependence. No profile field (privacy/UX decision out of scope). Alternative "apply the non-smoker band" rejected: flags healthy smokers. Alternative "apply the smoker band" rejected: reassures non-smokers.

**D4 — Boundary semantics follow the printed text.** `<` strict, `≤`/«up to»/«at or below»/«not more than» inclusive, `lo-hi` inclusive both ends. This is reading the printed statement, not a clinical threshold, so it needs no clinical source. Tested at the limit and one least-significant unit either side.

**D5 — No default range, no `refs.js` row.** Manufacturer inserts could not be opened (§3), and ranges are kit-dependent; the printed range stays the only judge (consistent with P77). Alternative "ship Roche numbers from a lab catalogue" rejected: second-hand, against the golden rule.

**D6 — `_engine.tests` rows via a rules-module builder** (pattern of `urine_rows.js`), `abnormal: null` for no verdict. Alternative "make them `graded`" rejected: pulls them into `score.js`/PhenoAge/CTCAE and into dir-readers (Constitution: one number, one job).

**D7 — Client: a dedicated neutral state.** Without it a `null` verdict is rendered «در محدوده» (`resultStates.js:132`) — a Principle II violation this feature would otherwise introduce.

**D8 — Urgency unchanged.** Keep `this_week` above printed range (P77); `between` → `routine`, proposed, listed for reviewer. `has_critical` never set.

**D9 — Names.** Probe-driven additions only (no fuzzy). Candidate additions: parenthesised long forms already seen; Persian spellings only after finding them on a real sheet in the repo (N2: "get spellings from real sheets").

## 3. Clinical source access (researcher, `model: fable`, 2026-11-08)

Readable, to be used for Phase-1 extraction (verbatim passage + section/table required):
- NACB Laboratory Medicine Practice Guidelines, tumour markers (Sturgeon et al., Clin Chem 2008;54(12):e11–e79; ADLM PDF, image pages — read with the file reader; colorectal ch. 4, breast ch. 5, ovarian ch. 6; chapter tables **not yet opened**).
- EGTM 2014 GI update, Int J Cancer 2014;134:2513–22, [PMC4217376](https://pmc.ncbi.nlm.nih.gov/articles/PMC4217376/) (CEA use; no cut-off given).
- EGTM ovarian update, Sölétormos et al., Int J Gynecol Cancer 2016;26:43–51, [PMC4679342](https://pmc.ncbi.nlm.nih.gov/articles/PMC4679342/) (CA 125/HE4; non-malignant causes figure; table bodies are images).
- ASCO 2015 metastatic breast biomarkers, Van Poznak et al., JCO 33:2695, [PMC5478102](https://pmc.ncbi.nlm.nih.gov/articles/PMC5478102/) (CA 15-3/CEA; no absolute limits).

Not opened / unusable — rows depending on them are «بدون قاعدهٔ بالینی» and stay observational: NCCN (403), ACOG PB 174 (402), SGO (not found), ESMO (not readable), EGTM 2017 breast (abstract only), ASCO 2006/2007 GI/breast (abstract only), **all manufacturer package inserts** (Roche, Abbott, Siemens). Lab-catalogue statements of separate smoker ranges are second-hand and must not be cited.

Verdict: enough access to proceed for use/context/non-cancer-cause text; **not** enough for any kit default range — which is why none is added.

Stop rule (user's): if a later extraction pass cannot open a source it needs, stop and report; no value is written from recall.

## 4. Existing patient text to re-verify against opened passages

`TM_CONTEXT` sentences in `patterns_autoimmune.js` (CEA smoking/inflammatory; CA 125 causes; CA 19-9 «۵ تا ۱۰ درصد Lewis-منفی» and causes; CA 15-3 «پایش بیماریِ پیشرفته») came from P77's user-supplied document with sources never opened. Phase 1 either confirms each against a verbatim passage or marks it for removal/softening. Candidate confirmations from opened material: NACB/EGTM/ASCO use statements; EGTM ovarian «non-malignant conditions causing elevated CA 125».

## 5. Consumers to enumerate (tasks)

- Readers of `ungraded[*].state`: `patterns_autoimmune.js` (isPos/isNeg 33–34, lineOf 62, 304, tmBuild 443/456, 491), `patterns_endocrine_rheum.js` (Tg/TRAb, 672–724; not TM keys), `expert.js` (`ungradedRow`, `UNGRADED_FA`), `score.js` (unread count), coverage nets, `metamorphic.test.js` (N28/N31).
- Readers of `_engine.tests[*].abnormal/dir/level`: `resultStates.js` (111–118 emergencyKeys fallback uses all abnormal rows — a `true` tumour-marker row could be highlighted «امروز» when another finding is emergency and nothing is severe: decide `abnormal` for tumour rows must not feed `emergencyKeys`), `ResultReport.jsx` (273–275 counts), `ResultDashboard.jsx` (101, 260–269), `ExpertView.jsx`, `ResultView.jsx`, `Tafsir.jsx`.
- Server score reads `engineOut.graded`, not the serialized rows ⇒ unaffected (verified at `score.js:165–190`).

## 6. As built (2026-11-08) — corrections

- §5 last bullet ("Server score reads `engineOut.graded`… unaffected") was **wrong for the score value and band**: measured on a clean panel, adding a *normal* CEA changed the score 98 → 90 and the band high → mid (an unattributed finding capped the whole sheet; the ungraded row counted as «unread»). `score.js` now exempts tumour-marker keys from `count.unread` and exempts a `tumor_markers_result` finding whose `explains` are all tumour-marker keys from the sheet cap. Consequence: **score and band change for every sheet that contains tumour markers** (re-analysed sheets differ).
- §2 D1: unlabelled ranges keep the old first-readable-part salvage (HEAD read «0-35 U/mL (CA 125 II)»); only labelled ranges are never reduced.
- Extra consumers found and fixed: `Scorecard.jsx` («همه داخل محدودهٔ مرجع بودند»), `resultModel.normTest` (client re-derived a verdict from the range text), `historyRoutes.observationsFromResult` (`!!null` ⇒ in-range; cross-lab values not comparable), `expert.js` («بدون حکم»).
- Source verification: the ASCO 2015 full text is not on PMC (abstract only); quotes the sub-agents attributed to it were absent from the raw text and were not used. EGTM 2014/2016 and NACB pages were checked against raw XML / page images by hand — see `MEDICAL_RULES_TUMOR_MARKERS.md`.
