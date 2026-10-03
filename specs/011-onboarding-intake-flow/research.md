# Research: 011 Onboarding and Intake Flow

All findings below were measured against the working tree on 2026-10-02 (branch `recovery`), not quoted.

## R1. What already exists

| Piece | Where | State |
|---|---|---|
| SMS OTP request/verify, JWT, rate limits | `khanesh-server/auth.js` | Works; SMS sender is a `console.log` mock; phone regex `^09\d{9}$` (Latin digits only) |
| Users + jobs tables | `khanesh-server/database.js` | `users.phone TEXT UNIQUE NOT NULL` — no email, no profile columns |
| Auth gate in the UI | `khanesh/src/AuthGuard.jsx` | Phone → code, two steps; reads `authRequired` from `GET /health` |
| Age / sex / pregnancy / conditions form | `khanesh/src/ProfileCard.jsx` | One card on the tool page; 5 conditions: دیابت، فشار خون، بیماری کلیوی، بیماری کبدی، سرطان / شیمی‌درمانی |
| Patient → engine | `Tafsir.jsx` `buildStructuredPatient()` → `server.js` `mergePatient()` → `adapter.js` `runEngine` | Form fields already override the sheet **field by field** (`mergePatient`, server.js:678) |
| Manual-entry taxonomy | `khanesh/src/labRefs.js` `CATS` + `REF` | 46 numeric keys in 10 categories; **no urine keys** |
| Photo guide | `khanesh/src/HowToCapture.jsx` (`/how-to-capture`, a long page) | Exists as a page; no short in-flow version |

## R2. Which conditions the engine actually reads today

- **Decision**: Only `سرطان / شیمی‌درمانی` changes grading today (`adapter.js:1589` `isCancerPatient` → CTCAE grading in `grade.js:89-98`). `pregnant` changes the Hb floor (P53 Q2). Every other condition is passed to the LLM prompt only (`prompt.js:123` `بیماری_زمینه‌ای`).
- **Consequence for the spec**: FR-019/FR-020 (clarification B) say a condition without an approved rule must not change the result and must not be claimed. Sending «فشار خون» to the model as context is exactly a path by which the text could claim it. **The prompt payload must carry only active conditions.**
- **Alternatives rejected**: letting the model "take conditions into account" — violates Constitution I (the engine decides) and N9.

## R3. The tenth condition

- **Decision**: The tenth catalogue entry is **سرطان / شیمی‌درمانی** (cancer / on chemotherapy).
- **Rationale**: It is the only condition the engine already uses (R2). Dropping it from the new list would silently turn off CTCAE grading for every cancer patient — an N16-class deletion with no test that would notice from the UI side. This resolves the "tenth condition" deferred item without a new clinical decision.
- **Catalogue (ids stable, labels Persian)**: `htn` فشار خون بالا · `dm2` دیابت نوع ۲ · `lipid` چربی خون بالا · `hypothyroid` کم‌کاری تیروئید · `ckd` بیماری مزمن کلیه · `fatty_liver` کبد چرب · `ida` کم‌خونی فقر آهن · `thal_trait` ناقل تالاسمی (مینور) · `chd` بیماری عروق قلب · `cancer` سرطان / شیمی‌درمانی · plus `none`. Labels go to a clinical reviewer before release (P66, below).

## R4. Which conditions become "active" in this feature

- **Decision**: Ship the mechanism with **two** active conditions:
  1. `cancer` — already active (R2); only the id plumbing changes.
  2. `dm2` — reuses the **existing, already-sourced** N22 arm of `lipid_profile` (LDL target < 100 with `ADA_SOC_CVD`), which today fires only when the *sheet's* glucose is in the diabetes range. A reported diabetes diagnosis becomes a second trigger for the same arm. No new number.
- `htn` and `lipid` (named in clarification B) are **registered but inactive**: there is no approved lab rule for either. Inventing one is out of scope for a UI feature (Constitution, Clinical Change Constraints). They are proposed in `MEDICAL_RULES.md` as **P66** with their candidate effects (e.g. HTN → ACR/eGFR emphasis; known hyperlipidaemia → LDL treatment-target wording), awaiting a reviewer.
- **Rationale**: Clarification B says "subject to reviewer approval". Activating only what already has an approved source is the strict reading.
- **Alternative rejected**: a new rule per condition now — each needs a source, a `P` entry and red-first tests (Constitution IV), which is a clinical project, not this one.

## R5. Pregnancy and age units — spec deviation

- **Finding**: The spec's assumption "pregnancy is not asked" and FR-007 "ages 0–120" (years) would **remove** two inputs the engine depends on today:
  - `pregnant` sets the Hb floor to 11.0 (P53 Q2). Removing the checkbox regresses pregnant patients to the non-pregnant Hb range.
  - `ageUnit` (year/month/day) drives neonatal and infant ranges (`NEONATAL_NO_ADULT_FALLBACK`, `isNeonate`, P57/P63). A day-old baby cannot be entered in whole years.
- **Decision**: Keep both. The age screen gets the existing year/month/day unit selector; the sex screen asks "باردار هستید؟" only when female and age ≥ 10 years. Spec FR-007 and the pregnancy assumption are amended accordingly.
- **Rationale**: Constitution II and N4 — a missing input is not a normal one; a feature must not quietly remove a grading input.

## R6. Email sign-in

- **Decision**: Add `/api/auth/request-email-otp` and `/api/auth/verify-email-otp` mirroring the SMS pair (6-digit `randomInt`, 2-min TTL — raised to 10 min for email delivery latency, 5 attempts, same limiters keyed per identifier). Sender is a **mock** (`console.log`) behind one `sendEmailCode()` function, exactly like SMS, so wiring a real provider is a one-function change at deploy time.
- **Phone**: accept Persian digits and `+98`/`0098` prefixes by normalizing to `09xxxxxxxxx` on both client and server (`normalizeDigits` already exists client-side).
- **Accounts**: phone and email are separate identities (spec edge case: no linking).
- **Alternatives rejected**: magic links (needs a public URL + deep-link handling, harder on mobile); passwords (spec says OTP).

## R7. Where the profile lives, given auth is off by default

- **Finding**: With `AUTH_REQUIRED` unset every request is `userId: 1` (auth.js:35). Storing a **name** server-side under that shared id would show one patient's name to the next.
- **Decision**:
  - **Auth on** → profile stored server-side per user (`profiles` table), fetched on sign-in.
  - **Auth off** → profile stored **only in the browser** (`localStorage`, key `azmayar_profile_v1`); the server never persists it. The intake flow still runs (spec assumption).
- Name and contact are never part of the analyze payload; only `{age, sex, pregnant, conditions:[ids]}` is sent (spec assumption; `notes.md` privacy rule).

## R8. Deleting the account (clarification A)

- **Decision**: `DELETE /api/auth/me` (auth on) deletes `jobs` rows, the profile and the user in one transaction, and drops any in-memory `jobStore` jobs owned by that user. Auth off → the button clears the local profile and the stored job id. Two-step confirm in the UI.

## R9. Sheet vs profile mismatch (FR-017)

- **Finding**: `mergePatient()` already makes the profile win per field. What is missing is the **notice**.
- **Decision**: The server compares the OCR'd sex/age with the profile and, on disagreement, adds a Persian line to `ocr_warnings` (e.g. «روی برگه «مرد» چاپ شده؛ تفسیر با جنسیتِ پروفایل (زن) انجام شد.»). Age disagreement threshold: > 1 year for adults, any unit change under 1 year. Existing multi-page `mismatch` handling is unchanged.

## R10. "Context applied" line (FR-016)

- **Decision**: The server returns `_engine.context = { sex, age_text, pregnant, conditions_applied:[{id, fa}] }`, built from what the engine **actually used**. The UI renders «تفسیر بر پایهٔ: زن، ۴۵ ساله، دیابت» from it. A ticked inactive condition is absent from `conditions_applied` by construction (FR-019).

## R11. Manual-entry sections and urine

- **Decision**: Regroup the existing `CATS` into the user's sections, without new numeric tests:
  - **خون (CBC و انعقاد)**: `cbc`, `coag`, `iron`
  - **بیوشیمی**: `diabetes`, `heart`, `kidney`, `liver`, `electro`
  - **هورمون**: `thyroid`
  - **ویتامین‌ها**: `vitamin`
  - **ادرار**: new — a short dipstick/microscopy set (pH, وزن مخصوص, پروتئین, قند, خون, نیتریت, لکوسیت استراز, WBC/hpf, RBC/hpf)
- **Finding that makes urine non-trivial**: the manual path in `server.js` (~line 893) keeps only `Number.isFinite(t.value)` rows, so qualitative urine values (`+1`, `منفی`) would be **silently dropped** (N2/N18). Urine rows must travel as `{name, value: string, unit}` and be accepted into the OCR-shaped `tests` array so the adapter's existing urine layer reads them, exactly as on the photo path.
- **Rationale**: The user named urine explicitly; the engine already interprets urine (specs/005, 006). Reusing that path adds no clinical logic.

## R12. Routing and screens

- **Decision**: Keep `/app` as the single entry. A small state machine decides the screen: `signin → intake/name → intake/sex → intake/age → intake/conditions → choose → photo | manual → result`. Sub-routes: `/app/start`, `/app/intake/:step`, `/app/photo`, `/app/manual`. `/tafsir` keeps redirecting to `/app`. Back/forward work through the router.
- Mode switch keeps state in one parent (`Tafsir.jsx` already owns `vals`/`images`) so photo ↔ manual loses nothing (FR-014).
