# CODE-RECON — Khanesh `/app`

> Shared memory for the consensus pipeline. Generators and judges both read this.
> Produced by the read-only recon agent; persisted by the orchestrator.

**Premise correction 1:** `/app` renders nothing. `App.jsx:20` `Navigate`s `/app` → `/`, and `/` renders `Tafsir`. The page to redesign is `Tafsir.jsx` at `/`. The redirect exists so old bookmarks survive (`App.jsx:4-14`); it only works if prod Nginx serves `index.html` for unknown paths.

**Premise correction 2:** the UI does not call `POST /api/analyze`. It calls `POST /api/analyze/start` → 202 `{job_id, pages_total}` → polls `GET /api/analyze/job/:id` every 2s (`analyzeJob.js:15-16, 62-129`; `server.js:1039-1071`). `/api/analyze` still exists (`server.js:1025`) for backward compat but nothing in the frontend uses it.

---

## 1. Component tree

```
main.jsx:6      StrictMode
App.jsx:17        BrowserRouter
App.jsx:19          "/"     → Tafsir          ← the whole product
App.jsx:20          "/app"  → Navigate "/"
App.jsx:21          "*"     → Navigate "/"
```

`Tafsir.jsx:475-1127` is one component owning every region:

| Lines | Region |
|---|---|
| 734-737 | header — hardcoded `◐ خوانش` + tagline. **`Logo.jsx` is imported nowhere**; brand decision still open (`Logo.jsx:4-8`) |
| 739-791 | Card 1 — profile: age+ageUnit segment, sex segment, neonate badge (761), pregnant checkbox (765), condition chips (772), compare toggle (787) |
| 793-851 | Card 2 — search (794), category bar (799), 46-input `REF` grid (810-843), «تحلیل و تفسیر» (844), hard-range errors (845) |
| 853-961 | **Local result block** (`show && rows.length>0`) — own crit banner (855), `comboInsights` card (860), JSON export/import (877-911), per-test gauge rows (913-958). Entirely client-side, never touches the server |
| 964-1117 | Card 3 — AI: dropzone (970), staged-page list (1001), resume banner (1023), analyze button (1039), progress box (1050), error (1068), parseError branch (1074), `ResultErrorBoundary > ResultView` (1112-1116) |
| 1119-1123 | footer |

`ResultView.jsx:249-376` owns the entire engine-result region and is stateless. Sub-components: `Chip:26`, `TestRow:46`, `CategoryGroup:65`, `UnmatchedNote:94`, `DerivedValues:143`, `ExtractedTests:180`, `Provenance:209`.

**Where the two input paths diverge and reconverge:** they share the whole profile card and both end in `runAI()` (`621`). They diverge at `Tafsir.jsx:637-645`:

```js
if (images.length) payload.imageDataUrls = ...
else { payload.testResults; payload.tests; payload.patient }
```

Mutually exclusive — **if the user has both photos and typed values, the typed values are silently discarded.** They reconverge at `startJob` (650) → `pollJob` (654) → `setAiResult` (658) → the same `ResultView`. There is a *third* path: `show` (844) runs an entirely local `REF`-based analysis that never reaches the server and renders its own verdict above the AI section.

---

## 2. State machine

### Tafsir.jsx — 20 pieces of state, 3 refs (475-498)

| # | State | Transitions |
|---|---|---|
| 1 | `sex` (476) | segment buttons 755-756; feeds `REF[k].range(sex)` |
| 2 | `age` (477) | 744, through `normalizeDigits` |
| 3 | `ageUnit` (478) | 746-748; feeds `ageInMonths` 539 |
| 4 | `pregnant` (479) | 767; only rendered when `sex==="female"` (765) |
| 5 | `conditions[]` (480) | chips 778 |
| 6 | `vals{}` (481) | `set()` 541 ← 834; JSON import 901 |
| 7 | `activeCat` (482) | 803 |
| 8 | `show` (483) | 844 and JSON-import 904. **Never reset to false** |
| 9 | `expanded{}` (484) | 950 |
| 10 | `compareMode` (485) | 788; JSON import 902 |
| 11 | `prevVals{}` (486) | 827 |
| 12 | `search` (487) | 795; non-empty hides catBar (799) and switches `catKeys` to a global filter (542-544) |
| 13 | `aiLoading` (488) | 626 / 675 / 517 |
| 14 | `aiResult` (489) | 622, 658, 525, 1028 |
| 15 | `aiError` (490) | 624, 664, 668, 685, 712, 528 |
| 16 | `ioError` (491) | 903 / 905 |
| 17 | `images[]` (492) | `onFile` 708, `removeImage` 722, `moveImage` 723 |
| 18 | `imgBusy` (493) | 689 / 718 |
| 19 | `aiProgress` (494) | 627, 652, 656, 675, 518, 523 |
| 20 | `resumed` (495) | 535; cleared 628, 1029, 1033 |
| refs | `fileRef` 496, `abortRef` 497, `mountedRef` 498 | |

Derived, not state: `months` (539), `catKeys` (542), `{rows, errs, criticalCount}` useMemo (546-567).

**ResultView.jsx has zero state** (249) — pure props. Its only interactive widget is the native `<details>` at 211.

### Distinct screens

| Name | Condition | Rendered at |
|---|---|---|
| **S0 empty** | first paint | 731-1127 minus conditionals |
| **S1 category-picking** | `!search.trim()` | 799-843 |
| **S1b searching** | `search.trim()` — catBar hidden, cross-category | 542-544, 799 |
| **S2 typing** | per-cell live border+emoji | 818, 835-836 |
| **S2b out-of-hard-range** | `bad` | 817, 839, 845-850 |
| **S3 local-results** | `show && rows.length>0` | 853-961 |
| **S4 compressing** | `imgBusy` | 982, button disabled 1039 |
| **S4b images-staged** | `images.length>0` | 1001-1018 |
| **S5 analyzing** | `aiLoading` | 1050-1066 |
| **S5b degraded network** | `aiProgress.degraded` | `analyzeJob.js:99,145` → 1052 |
| **S5c auto-resuming** | `pendingJob()` on mount — enters S5 with no user action | 513-532 |
| **S6 resume-offer** | `resumed && !aiResult && !aiLoading` | 1023-1037 |
| **S7 results** | `aiResult && !error && !parseError` | 1112 → ResultView |
| S7a emergency | `result.has_critical` | ResultView:269-278 |
| S7b partial-OCR | `pages.failed.length` / `ocr_warnings` | ResultView:281-291 |
| S7c unmatched | `patterns.includes("unmatched_abnormal")` | ResultView:253, 311 |
| S7d legacy (no `_engine`) | groups/derived/chips all vanish (`tests=[]` at 254) | ResultView:233-242 |
| S7e all-normal | `buildNormalResult` path | ResultView:297-308 + normal chips |
| **S8 parse-error** | `aiResult.parseError` — raw values + retry, ResultView never mounts | 1074-1110 |
| **S9 error** | `aiError` — network / cancel / HEIC / >5 images | 1068 |
| **S10 render-crash** | ErrorBoundary tripped | 463-473 |

**S3 and S7 can be on screen simultaneously** and can disagree about the same number (frontend TSH high 5.0 vs backend 4.5 — N11 / `REF_DIFF.md`).

---

## 3. API contract the UI actually reads

Read from `data.result` (`analyzeJob.js:126`). Job envelope: `jobStore.js:84-93` → `{job_id, status, pages_total, pages_done, last_page_tests, status_code?, result?}`.

| Field | Type | Consumed at | If missing | Guaranteed? |
|---|---|---|---|---|
| `job_id` | string | `analyzeJob.js:72` | **throws** «پاسخ سرور شناسهٔ تحلیل نداشت» | ✅ `server.js:1045` |
| `pages_total` | number | `Tafsir:651-652` | `?? images.length` | ✅ 1045 |
| `summary` | string | `ResultView:297-302` | block hidden | engine paths yes (`prompt.js:304,325`); **legacy path: model JSON, not guaranteed** |
| `interpretation` | string | `ResultView:303-308` | block hidden | same |
| `general_recommendations` | string[] | `ResultView:313-322` via `asList` | block hidden | `server.js:936` only rewrites when `patternOut.findings.length` — **on the legacy path a model emitting `recommendations` makes the section vanish silently** |
| `has_critical` | bool | `ResultView:269` — the emergency banner | no banner | engine overwrites at `server.js:997`; **on the legacy path this is the model's own judgment** and the UI treats it as authoritative |
| `extracted_tests` | `[{test, value, reference}]` | `ResultView:294→180`, `Tafsir:1088` | `if(!list.length) return null` (181) | only when non-empty (`913`); **absent on manual entry** (`server.js:820`). `value` is a *string* with unit appended and possibly a `⚠️` suffix (`587-601`); `reference` defaults to `"—"`, never null |
| `ocr_warnings` | string[] | `ResultView:287`, `Tafsir:1100` | nothing shown | only when non-empty (914) |
| `pages` | `{total, read, failed[]}` | `ResultView:281-286, 186`; `Tafsir:1081` | all sites use `?.` | image path only (915, 729). **On the parseError branch `server.js:907` sets it to `null` explicitly** |
| `sources` | string[] URLs | `ResultView:344-364` | block hidden | only if MedlinePlus returned any (918) |
| `_engine` | object | `ResultView:250` | `hasEngine=false` → whole grouped-rows / derived-values / provenance-claim UI degrades | **absent on the legacy `USE_ENGINE=false` path** |
| `_engine.urgency` | enum | `resultStates.js:80,85` | `?? "none"` (252) | ✅ when `_engine` present |
| `_engine.patterns` | string[] | `.includes("unmatched_abnormal")` (253) | `?.` guarded | ✅ |
| `_engine.tests[]` | `{key,name,value,range,refSource,abnormal,dir,fa,level,ctcaeGrade,nearLimit,source}` | `server.js:69-82` | `Array.isArray` guard (254) | ✅ |
| `_engine.indices` | object | `DerivedValues:143` | `if(!indices) return null` | ✅ |
| `parseError` / `raw` | bool/string | `Tafsir:1074` | — | `raw` is fetched and **never rendered** |

**Fields produced and never consumed:** `_engine.abnormal` (count, kept for back-compat `server.js:58`), `tests[].fa`, `.level`, `.ctcaeGrade`, `.nearLimit`, `.dir`, `.source`, `result.warnings` (`prompt.js:332`), `result.disclaimer` (`prompt.js:314,334` — deliberately ignored, see §4), `result.parseErrorRecovered` (`server.js:898`), `result.abnormal_results` (legacy prompt).

**Divergence from the documented contract:** `frontend.md:36-38` says `fa` is a ready Persian worded status — *"render them; don't re-derive a status client-side."* `ResultView`/`resultStates.js:75-86` does exactly the opposite: it ignores `fa`, `level` and `ctcaeGrade` and derives one label from the **panel-level** `urgency`. Consequence: in an emergency panel, a mildly low HDL and a CTCAE-3 potassium both get the chip «امروز». This is the single biggest correctness gap in the current UI.

**Read but not guaranteed:** on the legacy path everything except `_engine` comes from raw model JSON. Mitigated by `asText`/`asList` (`Tafsir:449-459`) + `ResultErrorBoundary` (463) — that mitigation is load-bearing and must not be removed.

---

## 4. What is already good — do not regress any of this

### `digits.js` (whole file is a deliberate decision)
- **Persian/Arabic → Latin digit normalization.** WHY (4-8): user types «۱۲٫۵» on a Persian keyboard, `parseFloat` returns `NaN`, and the form's `return`-on-NaN dropped the value **silently** — no error, no highlight. *«این همان کم‌خوانیِ خاموش است که بدترین حالتِ شکستِ این پروژه است، این بار در ورودِ دستی.»*
- **`type="number"` abandoned for `type="text" inputMode="decimal"`.** WHY (10-13): the browser discards non-Latin digits at the DOM level, so `e.target.value` comes back empty and there is no opportunity to normalize. Applied at `Tafsir:744, 826, 833`.
- Arabic decimal U+066B + Persian comma → `.` (36-37); thousands separators U+066C and `,` **removed, not converted** (39-40).
- Invisible bidi characters (ZWNJ, ZWJ, LRM/RLM, embeds, isolates, NBSP) stripped — *"they come from copy/paste"* (42-45).
- Returns a **string** so it can run in `onChange` and the user sees exactly what will be sent (24-27).
- Explicit contract parity with backend `toNum()` in `rules/adapter.js` (15-17).
- Reinforced twice inside Tafsir: `552-556` (JSON-imported values never passed through `onChange`, so the useMemo must use `toNumber` not `parseFloat`) and `588-591` (same for the server payload — *"with raw parseFloat the Persian-typed value became NaN and `null` in JSON"*).

### `resultStates.js` (six-state model)
- **Word + shape + colour, never colour alone** (4-5). WHY: *«رنگ هرگز تنها حاملِ معنا نیست (WCAG 1.4.1): هر حالت برچسبِ فارسی و شکلِ نشانهٔ خودش را دارد، چون قرمز/زرد/سبز زیر دوترانوپی روی هم می‌افتند.»*
- **Red is exclusively emergency** (7-8). WHY: if red is spent on a link, a form error, or a delete button, *«قرمز یعنی همین امروز»* loses its meaning.
- `unmatched` is **cool purple, deliberately** (38): yellow is already spent on OCR warnings and red is reserved.
- `missing` gets an **action colour, not indifferent grey** (55-57). WHY: grey reads "doesn't matter" and rebuilds the false reassurance of N4 — *«آزمایشِ غایب، آزمایشِ طبیعی نیست.»*
- `stateOf` **never infers emergency from a value** — only when the engine said so (79): *«هیچ‌وقت از روی مقدار حدس نمی‌زنیم.»*
- `countRows` (88-92) powers the «۳ طبیعی · ۱ خارج از محدوده» group header.

### `testCategories.js`
- **Deliberately in the frontend, not `rules/refs.js`** (3-6). WHY: adding a `cat` field to `refs.js` would force the five-file "add a test" checklist to be touched for a purely cosmetic change.
- Keyed by **engine** key (`HGB`, `GLU_F`), not front `REF` key (`hb`, `fbs`) (8).
- `categoryOf` unknown → `"other"` (78-82). WHY: explicit generalization of N2 — *«چیزی که نگاشت نشده باید دیده شود، نه اینکه بی‌صدا از فهرست بیفتد بیرون.»*
- `CATEGORY_ORDER` matches the order Iranian lab sheets print (87-88).

### `index.css` + `index.html`
- The whole file replaced Vite's untouched template — fixed 1126px width, `text-align:center`, two grey vertical rules beside `#root`, purple accent, and a dark-mode block nothing read (2-6).
- **Self-hosted Vazirmatn variable woff2, deliberately not Google's CDN** (8-13). WHY: more reliable for Iranian users *and* consistent with the project's privacy stance — no request goes to a third-party domain. Also: the font was previously declared in `fontFamily` on both pages but never actually loaded (no `@font-face`, no link, no file), so **the entire Persian app was rendering in system-ui**. `index.html:8-14` preloads it with `crossorigin`.
- **WCAG-checked contrast tokens with the measured ratio written next to each** (24-39): `--text` 16.4:1, `--text-muted` 5.8:1, and the six state pairs at 6.5 / 6.3 / 6.0 / 6.5 / 7.2 / 4.8:1.
- **`color-scheme: light` locked** (49-52). WHY: with `light dark`, native controls (checkbox, number spinner, file picker) rendered dark in phone dark mode on top of the page's light cream card.
- `line-height: 1.8` because *«فارسی به لیدینگِ بیشتری از لاتین نیاز دارد»* (45).
- **`.num/.unit/.range`: `unicode-bidi: isolate` + `direction: ltr` + `tabular-nums`/`tnum`** (73-84). WHY: the patient must find the number from the paper verbatim; without `isolate` a range («4.4–11») and a titre («1/320») invert inside RTL text; and a non-tabular column of values *itself* creates reading errors.
- **16px minimum on inputs** (86-94). WHY: below 16px iOS Safari zooms on focus and never zooms back, and the rest of the session runs with a broken layout. And explicitly: the fix is **not** `user-scalable=no` — that breaks WCAG 1.4.4, and here the patient really does pinch-zoom to read a number. Repeated inline at `Tafsir:1142`.
- `min-height: 100dvh` alongside `100vh` for iOS Safari's variable address bar (61-63); `font-synthesis: none` (53).
- `index.html:6-7` `viewport-fit=cover` for `env(safe-area-inset-*)`; `lang="fa" dir="rtl"` on `<html>`.

### `ResultView.jsx`
- **The section order is deliberate and documented** (1-13): ① urgency banner *only when urgent* — **there is deliberately no green "all is well" banner; the absence of the banner is itself the normal state** (5-6, 268); ② number confirmation **before** meaning, because *«آیا درست خواندیم؟» اولین سؤالِ واقعیِ بیمار است، نه «چه معنایی دارد»* — it used to be below the summary (7-8); ③ summary + interpretation; ④ rows by body system with counts; ⑤ derived values, always stating they are not on the sheet (N5); ⑥ sources + disclaimer.
- `Num` component + `.num` class for LTR isolation, with the comment restating the range/titre inversion (20-24).
- **Two-numeral-system policy** (87-90): counts inside Persian prose use Persian digits (`toFa`), test values use Latin digits.
- `refSource` printed next to the claim itself (57): *«اعتمادِ سطر‌به‌سطر، نه نشانِ تبلیغاتی.»*
- `printedRef` is explicitly labelled «محدودهٔ چاپ‌شده روی برگهٔ شما» (196-197). WHY: the sheet's printed range ≠ the engine's, and without the explicit label a disagreement looks like a contradiction.
- **`MEASURED_OF`** (138-141) — a corrected value is never shown without the measured value from the sheet, citing N5 by name: *«بیمار که ۷.۳ را ببیند و روی کاغذش ۶.۲ باشد، نتیجه می‌گیرد برنامه اشتباه می‌کند.»*
- `DerivedValues` header note: *«این عددها روی برگهٔ آزمایشگاه نیستند»* (153-155) plus a per-row «محاسبه‌شده» chip (169).
- **`UnmatchedNote`** (94-121) — the third state gets a full lay explanation including the 95%-reference-interval statistic, and the explicit *«نه اینکه حتماً مشکلی هست»*.
- **`Provenance` gated on `hasEngine`** (209-245). With `_engine`: deterministic rules, reproducibility, per-range sourcing, "the AI only rewrites, it may not change a number, add a finding, or drop one," and "what this tool does not do: diagnose." Without `_engine` the copy says an LLM wrote it and our clinical rules did not run — with the comment *«ادعای «قاعده‌های ثابت» آنجا دروغ است»* (234-235).
- **Disclaimer hardcoded client-side, deliberately not read from model output** (368-369): *«تنها جملهٔ حقوقیِ صفحه نباید چیزی باشد که مدل هر بار از نو می‌نویسد.»*
- Unknown engine key falls into «سایر» and never disappears (256-257).

### `analyzeJob.js` + async architecture
- **Job id in `localStorage`** (1-13). WHY: analysis takes 90–150s; previously the whole result came back in one long fetch body and was stored nowhere, so a phone lock, an app switch, or a pull-to-refresh destroyed it. Now the user returns to a finished result and *«اصلاً نمی‌فهمد چیزی قطع شده بود»*. Plus: data never leaves the device; the server keeps the job at most 30 minutes (11-12, 21).
- **The old 300s client-side abort was deliberately removed** (`Tafsir:631-634`): aborting the client used to mean losing the whole job; now the bound is the 30-minute server TTL, after which polling 404s and the user gets an «منقضی شده» message.
- **Transient network failure does not kill the job**: `MAX_POLL_FAILURES=6` with backoff and `degraded=true` surfaced in the copy (22, 80-81, 94-102) — *«یک تونل، تحلیلِ شکست‌خورده نیست.»*
- **`progressText` — real page-by-page progress, no fake percentage** (141): *«هر جمله‌اش راست است، هیچ درصدِ ساختگی‌ای نیست.»* Matched by `Tafsir:1048-1049`: *«یک دکمهٔ غیرفعال به‌مدت دو دقیقه از «هنگ کردن» قابل‌تشخیص نیست.»*
- `etaText` **deliberately over-estimates** (156).
- Progress bar fills **from the right in RTL** via `marginInlineStart:auto` (`Tafsir:1244`): *«پیشرفت جهتِ خواندن را دنبال می‌کند.»*
- Stored result is **offered, not forced** (`Tafsir:1022`, 1023-1037).
- Cancel copy tells the user the job survives on the server (`Tafsir:662-664`).
- `safeGet`/`safeSet`/`safeDel` wrapped in try/catch for private mode and full storage (26-34).

### `Tafsir.jsx` — image path
- **`compressImage` caps width *and* total area** (`MAX_PIXELS = 6M`, 16, 65-69). WHY: a tall sheet (3000×12000) still blew past the browser's pixel ceiling after width scaling, and canvas came back blank or cropped **without `toDataURL` throwing**. Safari/iOS blanks above ~16.7MP.
- **`decodeImage` two-path with `<img>` fallback** (29-31): `createImageBitmap` fails on HEIC (the iPhone camera default) in many browsers; Safari decodes HEIC via `<img>`.
- **`looksLikeImage` checks the extension too** (19-22): some file pickers, especially on iPhone, give an empty `f.type`.
- A corrupt file does not kill the batch (703-706), and **rejected files are named in the error rather than vanishing silently** (710-716) — with concrete iPhone remediation («سازگارترین» in camera settings, or take a screenshot).
- `e.target.value = ""` so the same file can be picked twice (681).
- Target ~400KB per photo: faster upload, faster AvalAI, and stays under the body cap (59-60).

### `Tafsir.jsx` — engine contract
- **`engineName()` strips Persian parentheses before sending** (577-583). WHY: «Hb (هموگلوبین)» breaks `NAME_MAP` lookup and the test drops out of the interpretation silently; removing the parens maps all 46 tests. Locked by a regression test in `khanesh-server/rules/engine.test.js`.
- **Structured `tests`/`patient` sent instead of a re-parsed Persian display string** (585-593, mirrored `server.js:735-739`). WHY: a real bug — every text request went straight to the LLM and the rules engine never ran, so the model judged severity itself; Hb=9.2 in a woman (CTCAE 2, `this_week`) was shown as «بحرانی — مراجعه فوری».
- **`patient.age` specifically** (595-596): the engine reads age only from `patient.age`; put it anywhere else and age is `null` and adult ranges get applied to a child.
- `pregnant`/`conditions` sent as **tone context only, explicitly not grading input** (601-605) — but omitting them entirely made the engine path drop them completely.
- `testResults` still sent alongside on the manual path (640-642): it builds the MedlinePlus context and is the legacy fallback if the engine recognizes nothing.
- **Relative API paths only** (9-11): `http://localhost:8787` fails in production because the *user's* browser resolves localhost, not the server's.

### `Tafsir.jsx` — resilience / StrictMode
- **`mountedRef.current = true` on mount** (500-507), with the warning spelling out N11: in StrictMode dev the mount→unmount→mount cycle leaves it `false` forever and the result/loading is never set — *«چرخش بی‌پایان»* (commit `7545772`).
- **The resume effect is deliberately a separate effect that touches neither ref** (509-512): *«جدا کردنِ آن رف‌ها از افکتِ بالا دقیقاً همان کاری است که باگِ چرخشِ بی‌پایانِ StrictMode را ساخت.»*
- **`asText`/`asList`** (446-459): model JSON may not be a string; React crashes rendering an object and, with no boundary, the whole page went white.
- **`ResultErrorBoundary`** (461-473) scoped to the result region only, so a render failure degrades one section instead of blanking the app.
- `comboInsights`' `belowRange` (414-416): "low haemoglobin" is age/sex-dependent; the old hardcoded `hb < 12` false-fired on men and infants — now it reads from `REF`.
- **JSON export includes `ageUnit`** (879-880): without it, a file created in months/days is re-imported as years and every neonatal range is wrong.
- `useMemo` depends on `months` directly — both correct and silences `exhaustive-deps` (564-566): *«۵ سال → ۵ ماه محدوده‌ها را عوض می‌کند.»*
- `smallInput` is LTR + `tabular-nums` (1176-1177) — the same policy as `.num`.
- `statusOf` (358-376): tests with no `crit`/`critFn` can *never* be marked critical (368); `watch` = inside range but within the outer 10% (371-374).
- Neonate mode badge naming exactly which tests switch ranges (761-762).

### Backend decisions the UI depends on
- **`serializeGraded`** (`server.js:42-53, 65-83`). WHY: previously the only engine verdict reaching the client was the number `abnormal.length` — the UI knew *how many* were abnormal but never *which*, while `evaluate()` had already computed the full per-test status including a ready Persian `fa` label and threw it away one line before `res.json`. *«بدون این، گروه‌بندی بر اساس دستگاه بدن و «وضعیت واژه‌ای به‌جای رنگ» از سمت کلاینت غیرممکن بود، نه سخت.»* Explicitly a serialization change, no clinical judgment, `rules/` untouched.
- `name` goes through `faName()` in the serializer (65-66) — the N8 class.
- **`buildNormalResult` now also carries `_engine`** (`server.js:844-848`). WHY: it used to be hand-built with neither `indices` nor `tests`, so the app's most common path — a fully normal panel — was the *only* one where the UI had no row data at all.
- Rate limiting is on `/start`, not `/job/:id` (`server.js:1035-1037`) — otherwise a client polling every 2s blocks itself.

---

## 5. Unfinished / weak

### Dead code
- **`Logo.jsx` is orphaned** — imported nowhere. `Tafsir:735` hardcodes `◐ خوانش`. The `LABMATE` vs «خوانش» brand conflict (`Logo.jsx:4-8`, `frontend.md:8-9`) is an open product decision a redesign will be forced to resolve.
- **8 dead style keys** in `Tafsir`'s `s`, all leftovers from before `ResultView` was extracted: `aiSourceNote`/`aiSourceLink` (1223-1224), `aiPageOk` (1233), `aiCritBanner` (1254), `aiText` (1257), `aiRecList`/`aiRecItem` (1259-1260), `aiDisclaimer` (1261). Plus `aiBlock: {}` (1255) is an empty object still applied at 1089.
- `result.raw` is returned by the server on parse failure (`server.js:903`) and never rendered.
- `Chip` has `color: state.filled ? state.fg : state.fg` and the same identity ternary for `background` (`ResultView:33-34`) — vestigial.
- The `!aiResult.error` guard (`Tafsir:1112`) is effectively unreachable: `pollJob` already throws on an error status (`analyzeJob.js:123-125`).
- `clearJob` / `storeResult` are exported from `analyzeJob.js` but used only internally.
- `retry_after` is returned on 429 (`server.js:676, 1012`) and ignored by the client.

### Duplication
- **Two complete result UIs for the same numbers.** The local `show` block (853-961) uses its own five-state `ST` model (350-356) and its own crit banner (856); `ResultView` uses the audited six-state model. Both can be visible at once and can disagree — frontend TSH high is 5.0, backend 4.5 (N11 / `REF_DIFF.md`). A patient scrolls from «طبیعی» to «بالا» for the same TSH.
- **Three colour vocabularies**: `ST` (350-356, Bootstrap `#dc3545`/`#d1e7dd`), `TREND` (401-405), `STATES` (`resultStates.js`). Only `STATES` is contrast-audited. `ST.crit`, `s.critBanner` (1185) and `s.aiCritBanner` (1254) use `#dc3545`, **not** the audited `--st-emergency` `#b3261e` — and red is *also* used for form errors (`s.cellErr` 1180) and the delete button (`aiPageDel` 1221, `#c0392b`), which is precisely what `resultStates.js:7-8` forbids.
- **The six CSS custom properties in `index.css:24-39` are never referenced.** Every consumer hardcodes hex or reads the JS objects in `resultStates.js`. Two sources of truth that currently agree by hand and nothing enforces it.
- **Two category taxonomies**: `CATS` (`Tafsir:337-348`, 10 categories, front keys, «شمارش خون (CBC)» 🩺) vs `CATEGORIES` (`testCategories.js:11-26`, 14 categories, engine keys, «شمارش خون» 🩸). Different labels and different icons for the same body system.
- **Two identical Persian-digit helpers**: `toFa` (`ResultView:88`) and `faNum` (`analyzeJob.js:164`).
- **Two extracted-tests renderers**: `ExtractedTests` (`ResultView:180`) and the inline one on the parseError branch (`Tafsir:1088-1098`) — the second uses neither `asText` nor `Num`, and labels the printed range «مرجع» instead of the explicit «محدودهٔ چاپ‌شده روی برگهٔ شما», reintroducing exactly the confusion `ResultView:196-197` was written to prevent.

### Missing states
- `show` **never resets to `false`** — there is no way back to "not yet analyzed" once the local block is up.
- `errs` (hard-range violations) are displayed (845-850) but **do not block submission**: an out-of-hard-range value is dropped from `rows` at 558 and never sent. The user sees a warning and assumes the test was included.
- No confirmation before «پاک کن» destroys the stored result (1031-1034).
- No skeleton or placeholder — `ResultView` appears all at once, far below the fold.
- No empty state for the result region at all.

### Accessibility
- **One `aria-*` attribute in all 1262 lines of `Tafsir.jsx`** (`aria-label` on the dropzone, 975). Two in `ResultView` (`aria-hidden` on icons, 38, 72).
- **Zero `htmlFor`/`id` pairs.** `<label style={s.label}>` at 742, 753, 773 and `<label style={s.cellLabel}>` at 822 are floating siblings, not associated. **All 46 value inputs (833) are announced as unlabelled text boxes.** Only the two wrapping checkbox labels (766, 787) work, by containment.
- **No `aria-live` anywhere.** The 90–150s async analyze updates `progressText` (1052) into a plain `<div>`; a screen-reader user gets silence and then an unannounced result. Same for `aiError` (1068), `errs` (845), `ioError` (911).
- **The critical banner is a plain `<div>`, not `role="alert"`** (`ResultView:270`) — the single most urgent string in the app is not announced.
- Segmented controls (sex 754-757, ageUnit 745-749, categories 800-808, conditions 775-783) are plain `<button>`s with no `role="radio"` / `aria-pressed` / `aria-selected`. **Selection state is conveyed by colour alone** — the exact failure `resultStates.js:4-5` guards against elsewhere.
- **`outline: "none"` with no replacement** on `s.input` (1143), `s.searchBox` (1158) and `s.smallInput` (1177). Hard WCAG 2.4.7 failure, and in practice a keyboard user tabbing through 46 inputs is completely lost. Inline styles cannot express `:focus-visible`, which is *why* this happened (see §6).
- The dropzone is `role="button" tabIndex={0}` wrapping a `display:none` file input (970-975, 1020) — a native `<label htmlFor>` would be free and correct.
- `▲`/`▼` reorder buttons (1010-1013) have no accessible name.
- `ST[st].fa` at 836 is a bare emoji as the only per-input status indicator, with no text alternative and no `aria-hidden`.
- No focus management after analysis completes: focus stays on the button, the result renders far below, nothing scrolls.

### RTL
- **The gauge in the local-results block is mirrored.** `s.track`/`s.normal`/`s.marker` (1193-1195) use physical `left` (`944-945`) inside a `dir="rtl"` container, so the band and marker render right-to-left while the low–high labels printed at 929 read left-to-right. Real bug.
- Numbers embedded in Persian prose in `Tafsir` — `857` «{criticalCount} مورد», `991` «{images.length} صفحه», `1007` «صفحه {idx+1}», `1084` «{read} از {total}», `1094` «(مرجع: {t.reference})» — use Latin digits with **no `.num` isolation and no `toFa`**, contradicting the two-numeral policy `ResultView` established, and `1094` in particular can visually reorder a range like `4.4-11`.
- `s.aiRecList` uses physical `paddingRight: 18` (1259) — dead code now, but `ResultView` correctly uses `paddingInlineStart` (433, 447).

### Desktop-only / mobile
- **No `@media` query anywhere in the project.** `index.css` has none; every style object is fluid-by-accident.
- `s.profRow` (1139) is `display:flex` with no `flexWrap` — age (plus a 3-button unit segment) and sex on one row is cramped below ~360px.
- `maxWidth: 960` (1131) with the `minmax(140px,1fr)` grid (1172) gives ~6 columns of tiny cells on desktop.
- **`viewport-fit=cover` is enabled (`index.html:7`) but `env(safe-area-inset-*)` is never used** — on a notched iPhone the footer sits under the home indicator.
- Touch targets: `minHeight: 36` on the resume/cancel buttons (1247, 1251-1252) and ~20px on the `▲`/`▼` page buttons (1215-1218), all below the 44px guideline.

### StrictMode / N11
- The `mountedRef` fix is correct as written (500-512) — **merging those two effects, or making `mountedRef` cleanup-only, reintroduces `7545772`.**
- The resume effect (513) starts a `pollJob` and assigns `abortRef.current` but **returns early at 531 with no cleanup function**. In dev it survives only because the *other* effect's cleanup (506) aborts it. Fragile.
- `runAI`'s `finally` sets `abortRef.current = null` (674) even if a newer request replaced it. Unreachable today only because the button is `disabled` while `aiLoading` (1039).

### Engine boundary drift (pre-existing)
`comboInsights` (408-442) hardcodes metabolic-syndrome, iron-deficiency-anemia and hypothyroidism thresholds client-side — logic `rules/patterns.js` owns. `statusOf` + `crit`/`critFn` in `REF` (358-376) is client-side severity judgment. Both are manual-entry-only and predate the engine, but **a redesign that promotes them visually or merges them with the engine result makes an existing smell into an actual violation.**

---

## 6. Styling mechanism

- **`khanesh/src/App.css` does not exist.** Only `index.css` is imported (`main.jsx:3`). Any redesign plan referencing `App.css` is planning against a file that isn't there.
- **`index.css` is 95 lines, roughly 60 of them comment.** Its entire content: one `@font-face`, a `:root` token block (24-57), `body`/`#root` (59-69), a `p` margin reset (71), **one utility class** `.num/.unit/.range` (79-84), and a global `input/select/textarea/button` font rule (91-94). There is no component CSS whatsoever.
- **Everything else is inline.**

| File | Total lines | Style-object block | Keys | `style={...}` sites | of which `style={{...}}` literals |
|---|---|---|---|---|---|
| `Tafsir.jsx` | 1262 | **1129-1262 = 134 lines** | ~88 | 126 | 29 |
| `ResultView.jsx` | 465 | **380-465 = 86 lines** | ~40 | 64 | 2 |

**≈220 lines of style-object definitions plus ~190 style attribute sites — roughly 17-18% of both files is styling.** Many sites are spread-merges: `{...s.smallInput, borderColor: bad ? ... : st ? ... : ...}` (835), `{...s.catBtn, ...(activeCat===c ? s.catOn : {})}` (804), `{...s.aiPageBtn, opacity: idx===0 ? 0.25 : 1}` (1011).

Consequences a redesign inherits directly from this mechanism:
- **No pseudo-classes are expressible.** No `:hover`, no `:focus-visible`, no `:active`, no `:disabled`. This is the mechanical cause of the missing focus rings and of `opacity` being used as a fake disabled state (1011, 1040).
- **No media queries**, hence no responsive design.
- **No dark mode**, hence `color-scheme: light` is locked.
- **The audited CSS variables go unused** because the JS never reads them — `resultStates.js` duplicates the same hex values as JS objects. A redesign moving to CSS should collapse these two into one source.

---

## 7. Hard constraints — do not break

1. **Engine boundary.** No clinical judgment client-side. `stateOf` derives from `_engine.urgency`/`abnormal` and **never** from the value (`resultStates.js:79`). Do not extend or promote the legacy client-side judgment (`statusOf` 358-376, `comboInsights` 408-442, `REF.crit`/`critFn`) into the engine result view.
2. **`_engine` may be absent** (legacy `USE_ENGINE=false`). Every "these conclusions come from deterministic rules" claim must stay gated on `hasEngine` (`ResultView:251, 213/233`), or it states something false (`frontend.md:17-19`).
3. **`value` for `CA`/`NA` may be the corrected, not the measured value.** `MEASURED_OF` and the «روی برگهٔ شما» line (`ResultView:138-165`) must survive. Dropping it reproduces N5.
4. **`name`/`fa` are already Persian-resolved — never fall back to `key`** in user-facing text (`server.js:65-66`, N8, regression test M32). If a name is missing, drop the row; never show «HGB».
5. **`REF` is a deliberate separate copy** from the backend (`frontend.md:45`, N11). Do not "DRY it up" by fetching ranges from the server — frontend TSH high is 5.0 vs backend 4.5 on purpose, tracked in `khanesh-server/rules/REF_DIFF.md`.
6. **Never remove `normalizeDigits` from a value input's `onChange`, and never revert a value input to `type="number"`** (`digits.js:10-13`). Silent under-reading is this project's worst failure mode.
7. **`mountedRef.current = true` on mount; the two effects stay separate** (`Tafsir:500-512`, N11 `7545772`).
8. **The localStorage job/resume path must survive**, and no client-side timeout may be reintroduced on the analyze request (`analyzeJob.js:1-13`, `Tafsir:631-634`).
9. **No green "everything is fine" banner** (`ResultView:5-6, 268`). The absence of the banner *is* the normal state.
10. **The disclaimer stays hardcoded client-side** and is never read from model output (`ResultView:368-373`).
11. **Red is only for emergency** (`resultStates.js:7-8`). A redesign that wants red for a delete button must first relocate emergency.
12. **`.num` isolation + `tabular-nums` on every clinical number** (`index.css:73-84`). Ranges and titres invert in RTL without it.
13. **16px minimum on inputs; never `user-scalable=no`** (`index.css:86-94`).
14. **A missing test is not a normal test** — `STATES.missing` keeps an action colour, not grey (`resultStates.js:55-57`, N4).
15. **Unknown engine key → «سایر», never disappears** (`testCategories.js:78-82`, N2).
16. **`engineName()` keeps stripping Persian parentheses** before sending (`Tafsir:577-583`); locked by a backend regression test.
17. **Structured `tests` + `patient` payload with age in `patient.age`** — never a re-parsed Persian display string (`Tafsir:585-607`, `server.js:735-758`).
18. **`asText`/`asList` + `ResultErrorBoundary` must wrap anything read from model JSON** (`Tafsir:446-473`).
19. **Relative API paths only** (`Tafsir:9-11`), and the async endpoints (`/api/analyze/start`, `/api/analyze/job/:id`), not `/api/analyze`.
20. **`/app` keeps `Navigate`-ing to `/`** (`App.jsx:20`), and prod Nginx keeps `try_files $uri /index.html`.

---

**Highest-value fix a redesign should carry, not discard:** `_engine.tests[].fa` / `.level` / `.ctcaeGrade` / `.nearLimit` are serialized by the backend specifically so the client can render a per-test worded status (`server.js:42-53`, `frontend.md:36-38`), and `resultStates.js:75-86` currently ignores all four in favour of one panel-wide `urgency` label. Fixing that is the difference between "every abnormal row says «امروز»" and a per-test verdict — and it requires no backend change.
