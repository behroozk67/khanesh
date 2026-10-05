# Research: 24-Hour Urine and Body-Fluid Chemistry (Stage A)

All facts measured 2026-10-05 on `8e0d769` + working tree, calling `runEngine`/`runPatterns` directly.

## R1 — How a row becomes a "24-hour urine" row

- **Decision**: A row is 24-hour urine when **either**
  (a) its normalised name contains a 24-hour token (`24h`, `24hr`, `24hour`, `/24`, `۲۴ساعت`, `24ساعته`) together with a
  urine analyte word (`prot|protein`, `cr|creat|creatinine`, `urea|uun`, `ca|calcium`, `uric|ua`, `vol|volume`);
  **or** (b) it is a bare `Urine Protein` / `Urine Creatinine` / `Urine Volume` and the sheet shows 24-hour evidence. That
  evidence is a 24-hour unit on the row (`/24h`, `mg/24h`, `g/24h`, `mmol/24h`, `mL/24h`) or another row on the same
  sheet already claimed by (a).
- **Rationale**: (b) is the N25 case. Today `Urine Protein 100` goes to `qual` (dipstick), measured. A 24-hour protein
  printed under that bare name would fire urinalysis rules. Evidence is computed per sheet, before the row loop
  (the shape of `isPrenatalSheet`).
- **Alternatives**: name-only matching, rejected because it misses (b); treating every `Urine Protein` with a number
  > 30 as 24-hour, rejected because guessing identity from magnitude is the P48 error.

## R2 — Where the claim runs

- **Decision**: in `ocrToEngineInput`'s row loop, after the "unit glued to the value" split and **before** the
  prenatal claim and every `NAME_MAP`/`qual`/`QUALITATIVE` branch. A claimed row ends with `continue`.
- **Rationale**: the same reason specs/013 claims first. Once `resolveAlias` sees the name, plural/prefix rules can
  turn it into a serum key. Measured: no fluid spelling collides **today**, but that is luck, not a guard.
- **Alternatives**: adding the spellings to `NAME_MAP` with new keys, rejected because they would then be graded
  (needs `refs.js`) or need `noRef`, which `buildNormalResult` already words as «محدودهٔ مرجعِ تأییدشده نداریم».
  That wording is false here, since ranges exist and are pending review.

## R3 — Existing `U_CA` and other existing mappings

- **Decision**: `specimenClaim` returns `null` for any row that `mapKey(norm(name))` already resolves. Exception:
  the bare names in R1(b), which today are `qual` or unmapped, not `NAME_MAP`. So `24h urine calcium` keeps going to
  `U_CA` and the mineral axis (FR-004, FR-014). `Urine Ca/24h` (currently unmapped) goes to the specimen channel.
- **Rationale**: freezing existing behaviour is a hard requirement. Grading new LIS spellings into `U_CA` would be
  interpretation, which Stage A forbids. The LIS also prints no unit, and a unitless U_CA is unit-sensitive
  (mg vs mmol).
- **Alternatives**: route new spellings to `U_CA` only when a unit is printed. Deferred to P87 as an open question.

## R4 — Routing and the result builders

Measured paths:
- Specimen-only sheet today: everything is `unmapped`, so the gate at `server.js:1155` falls back. P78 then returns
  `buildUninterpretedResult(unmapped)`: «موتورِ تفسیرِ ما هیچ‌کدام از مقادیرِ این برگه را نشناخت».
- After claiming, `unmapped` is empty. The same gate would still fall back, but the sentence "recognised nothing"
  becomes false.
- **Decision**:
  1. `buildUninterpretedResult(unmapped, { listShown, recognized })`. When `recognized` (the specimen line) is
     non-empty, the interpretation says the rows were recognised as 24-hour urine / body fluid and that the engine does
     not interpret them yet. It never says «نشناخت» about them, and never says «طبیعی».
  2. Engine path with specimen rows: `specimenLine(e.specimen)` is pushed to `ocrWarnings` next to the unmapped line.
  3. `buildNormalResult` (`findings === 0 && abnormal === 0`): a specimen branch alongside the `noRef` branch.
     The summary is «مقادیری که موتور می‌سنجد در محدودهٔ طبیعی‌اند، ولی چند مقدارِ این برگه تفسیر نشدند», with the
     specimen names, so «همه طبیعی» never covers a fluid row (constitution II).
  4. The gate condition is **not** widened. A specimen-only sheet stays off the engine path (nothing to grade), so it
     can never reach `buildNormalResult` with zero graded tests.
- **Alternatives**: keep specimen-only sheets on the engine path. Rejected because the engine path with nothing
  graded ends in `buildNormalResult`, which is the N18 "nothing happened ⇒ normal" shape.

## R5 — Fluid type

- **Decision**: `fluidTypeOf(name, value)` reads type words in the row name (`pleur`, `ascit|periton`, `csf|cerebrospinal|مایع
  مغزی`, `synov|joint|مفصل`, `pericard`) or in the `Fluid Type` value (`Pleural`, `Ascites`, …). A numeric value is
  `{ type: "unknown", code: "4" }`. The type is attached per row. Rows of different types are never merged.
- **Rationale**: D1 (code table) is not available. F0 says no interpretation without a type, and Stage A interprets
  nothing anyway, but the type is shown so the patient sees what was read.

## R6 — Bare `Glucose` / `Protein` / `LDH` beside a `Fluid Type` row

- **Measured**: `Glucose` → `GLU_F`, `LDH` → `LDH`, `Protein` → unmapped.
- **Decision**: not claimed (FR-004 freeze; we can't tell fluid from serum, and request 28 has both). If the sheet has a
  `Fluid Type` row and a bare one of those names that maps to a serum key, *and* the same analyte is not also printed with a fluid
  name, the specimen line adds one caution sentence (see contract). Refined in implementation: request 28 prints both `Fluid LDH` and
  `LDH`, and there the bare row is the serum partner.
  Recorded in P87 as an open question to settle with the LIS column names.

## R7 — Units and values

- **Decision**: the printed value and unit are kept verbatim (`raw`, `unit`) for display. A number is parsed with the
  adapter's `toNum`/`commaToDot` only so that duplicates can be compared; it is never graded or converted. Two
  conflicting values for one specimen identity: the first is kept and the second goes to `unmapped` (the hemostasis rule).

## R8 — Persian names

- **Decision**: `SPECIMEN_FA` in `specimen.js` holds the Persian names (e.g. `U24_PROT`: «پروتئین ادرار ۲۴ساعته»,
  `FL_LDH`: «LDH مایع»). Specimen identities are **not** added to `FA_NAMES`: they are not engine keys, and `M32`
  sweeps `FA_NAMES` against `ADULT_REFS`. U11 asserts no raw identity reaches text.
