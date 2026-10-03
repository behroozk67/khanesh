# Feature Specification: Onboarding and Intake Flow for the Interpretation Page

**Feature Branch**: `recovery` (no new branch created)

**Created**: 2026-10-02

**Status**: Draft

**Input**: User description: "ساختار صفحهٔ تفسیر (/app): ۱) ورود با دو حالت: شمارهٔ موبایل (پیامک) یا ایمیل؛ صفحهٔ مدرن و مینیمال. ۲) بعد از ورود، به‌ترتیب و هر کدام در یک صفحه: نام و نام خانوادگی ← جنسیت ← سن ← فهرست حدود ده بیماریِ زمینه‌ایِ پرشیوع در ایران با تیک‌زدن. سن، جنسیت و بیماری زمینه حتماً در تفسیر لحاظ شوند. ۳) در نهایت صفحهٔ تفسیر با دو حالت: عکس یا ورود دستی؛ کاربر هرکدام را انتخاب کرد وارد همان صفحه شود. در صفحهٔ عکس یک راهنمای کوتاه باشد؛ ورود دستی بخش‌بخش تقسیم شود: خون (CBC)، بیوشیمی، هورمون، ادرار و غیره."

## Clarifications

### Session 2026-10-02

- Q: وقتی بیمار بیماری زمینه‌ای را تیک می‌زند، در این نسخه تفسیر چه تغییری بکند؟ → A: فقط بیماری‌هایی که قاعدهٔ بالینی تأییدشده دارند (مثلاً دیابت، چربی، فشار خون) تفسیر را تغییر می‌دهند؛ بقیه ذخیره می‌شوند و ادعای اعمال‌شدن نمی‌کنند.
- Q: بیمار بتواند پروفایل و اطلاعات ذخیره‌شده را کامل پاک کند؟ → A: بله، دکمهٔ «حذف حساب و اطلاعات من» در پروفایل؛ بعد از تأیید، پروفایل و نتایج ذخیره‌شده پاک می‌شوند.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Sign in by mobile number or email (Priority: P1)

A visitor opening the interpretation tool sees one minimal, modern sign-in screen with two clearly separated choices: sign in with a mobile number (a one-time code arrives by SMS) or sign in with an email address (a one-time code arrives by email). They pick one, enter the identifier, enter the code, and are in.

**Why this priority**: Nothing else in the flow is reachable without it, and it is the first screen every patient sees.

**Independent Test**: Open the tool signed out; complete sign-in once with a mobile number and once with an email. Both end in the signed-in state with no other step required.

**Acceptance Scenarios**:

1. **Given** a signed-out visitor, **When** they open the tool, **Then** they see exactly two sign-in options (mobile/SMS and email) and nothing else competing for attention.
2. **Given** the mobile option, **When** they enter a valid Iranian mobile number and then the received code, **Then** they are signed in.
3. **Given** the email option, **When** they enter a valid email and then the received code, **Then** they are signed in.
4. **Given** a wrong or expired code, **When** they submit it, **Then** they get a clear Persian message and can request a new code without re-entering the identifier.
5. **Given** an invalid mobile number or email format, **When** they continue, **Then** the problem is shown inline before any code is sent.

---

### User Story 2 - Tell us who you are: name, sex, age, background conditions (Priority: P1)

After first sign-in the patient is walked through four single-purpose screens, one question group per screen, in this fixed order: (1) first name and last name, (2) sex, (3) age, (4) a tick-list of about ten background conditions that are common in Iran, plus an explicit "none of these" choice. Each screen has a back control and shows progress.

**Why this priority**: Age, sex and background conditions change what a lab value means. Without them the interpretation is generic; they are the reason this flow exists.

**Independent Test**: Sign in as a new user, complete the four screens, and confirm the four answers are stored, shown again on the profile, and used by the next interpretation.

**Acceptance Scenarios**:

1. **Given** a new signed-in user, **When** they arrive, **Then** they see the name screen first, then sex, then age, then conditions, never two at once.
2. **Given** the name screen, **When** first or last name is empty, **Then** they cannot advance and see which field is missing.
3. **Given** the sex screen, **When** they choose male or female, **Then** the choice is required before advancing.
4. **Given** the age screen, **When** they enter an age outside 0–120 or a non-number (Persian or Latin digits both accepted), **Then** it is rejected inline.
5. **Given** the conditions screen, **When** they tick any number of conditions, or choose "none", **Then** they can finish; ticking "none" clears other ticks and ticking any condition clears "none".
6. **Given** a returning user who completed intake, **When** they sign in, **Then** the four screens are skipped and they go straight to the method choice, and they can edit these answers from their profile.

---

### User Story 3 - Choose how to enter results: photo or manual (Priority: P1)

After intake the patient sees the interpretation screen with two choices: "photo of the lab sheet" or "manual entry". Choosing one opens that mode directly; they can switch modes at any time without losing what they entered in the other.

**Why this priority**: This is the tool's actual job; stories 1 and 2 only feed it.

**Independent Test**: From the choice screen, run one full interpretation via photo and one via manual entry; both produce a result that reflects the stored age, sex and conditions.

**Acceptance Scenarios**:

1. **Given** a completed intake, **When** the patient lands on the interpretation screen, **Then** both modes are offered with one-line descriptions.
2. **Given** they choose photo, **When** the screen opens, **Then** a short guide (a few lines or steps, readable in under 15 seconds) explains how to photograph the sheet, followed by the upload area.
3. **Given** they choose manual entry, **When** the screen opens, **Then** tests are grouped into labelled sections: blood count (CBC), biochemistry, hormones, urine, and further groups for other tests, each collapsible, and only values the patient typed are submitted.
4. **Given** values typed in several sections, **When** they submit, **Then** all sections are interpreted together as one report.

---

### User Story 4 - Age, sex and conditions shape the interpretation (Priority: P1)

The patient's stored age, sex and ticked conditions are applied to every interpretation, in both modes, and the result visibly says which of them were taken into account.

**Why this priority**: The user stated these must be factored in. Collecting them without using them would be a false promise.

**Independent Test**: Submit the same lab values for two profiles that differ only in sex, age band, or one condition (for example a diabetes tick); the interpretations differ in the clinically relevant way, and the result states the context used.

**Acceptance Scenarios**:

1. **Given** a stored sex and age, **When** a result is produced, **Then** reference ranges and findings use that sex and age, not values guessed from the sheet when the two disagree; on a disagreement the patient is told.
2. **Given** a ticked background condition that has an approved rule, **When** a relevant value is interpreted, **Then** the interpretation takes the condition into account and says so in one sentence; a condition without an approved rule changes nothing.
3. **Given** the result screen, **Then** a line such as «تفسیر بر پایهٔ: زن، ۴۵ ساله، دیابت» shows exactly what context was applied.
4. **Given** the patient chose "none" for conditions, **Then** no condition-specific text appears.

---

### Edge Cases

- A patient closes the app mid-intake and returns: answers already completed are kept and they resume at the first unanswered screen.
- A code is requested repeatedly: requests are rate-limited with a visible wait time.
- SMS or email delivery fails: the patient sees an actionable message and can switch to the other method.
- The same person signs in once by mobile and once by email: they are treated as two accounts; linking is out of scope.
- Sheet-printed age/sex differs from the profile: the profile wins for grading, and the patient is told which one was used.
- Manual entry with every field empty: submit stays disabled and explains why.
- A child (under 16) or an elderly patient (75 and over): age-specific ranges apply as the engine already supports; the age screen does not block these ages.
- Patient is female and 10 years or older: a pregnancy question appears on the age screen.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST offer two sign-in methods on one minimal screen: mobile number with an SMS one-time code, and email with an emailed one-time code.
- **FR-002**: The system MUST validate mobile numbers (Iranian format, Persian and Latin digits accepted) and email addresses before sending a code.
- **FR-003**: The system MUST limit code requests and wrong-code attempts per identifier and show the patient the remaining wait.
- **FR-004**: The system MUST show the intake as four separate screens in this order: name (first and last), sex, age, background conditions.
- **FR-005**: The system MUST require first name, last name, sex and age; the conditions screen MUST be completable with zero ticks via an explicit "none" choice.
- **FR-006**: The system MUST offer sex as male or female.
- **FR-007**: The system MUST accept age as a number plus a unit (years 1–120, months 1–23, days 0–60) and reject everything else with an inline message; the unit is required because newborn and infant ranges depend on it.
- **FR-008**: The system MUST present about ten common-in-Iran background conditions as tickable items, each with a plain-Persian name, plus "none of these". Proposed set: high blood pressure, type 2 diabetes, high blood lipids, underactive thyroid, chronic kidney disease, fatty liver, iron-deficiency anemia, thalassemia trait (carrier), coronary heart disease, and cancer / on chemotherapy (the one condition the engine already grades with).
- **FR-009**: The system MUST persist the intake answers per user, skip the intake for returning users, and let the user edit each answer from the profile.
- **FR-021**: The profile MUST offer a confirmed "delete my account and data" action that removes the profile, intake answers and stored results.
- **FR-010**: The system MUST resume an incomplete intake at the first unanswered screen. An age given in days or months that was recorded more than 7 days ago counts as unanswered and is asked again.
- **FR-011**: After intake the system MUST present a choice between photo entry and manual entry and open the chosen mode directly.
- **FR-012**: The photo mode MUST show a short capture guide before the upload area.
- **FR-013**: The manual mode MUST group tests into sections: blood count (CBC), biochemistry, hormones, urine, and further sections for remaining test groups; sections MUST be collapsible and MUST show a count of filled values.
- **FR-014**: The user MUST be able to switch between photo and manual modes without losing entered values in either.
- **FR-015**: The stored age, sex and conditions MUST accompany every interpretation request in both modes and MUST be used by the deterministic clinical rules, never left to the language model to judge.
- **FR-016**: The result MUST state which context (sex, age, conditions) was applied, in Persian.
- **FR-017**: Where a profile value conflicts with what is printed on the sheet, the system MUST use the profile value for grading and MUST tell the patient about the mismatch. When the two ages fall in different age bands (newborn < 28 days, child < 16, adult, 75 and over), the system MUST first ask the patient to confirm the sheet is theirs (it may be a child's sheet sent with a parent's profile); only after confirmation does the profile value win.
- **FR-018**: All screens, messages and condition names MUST be in Persian, right-to-left, usable at phone width.
- **FR-019**: A ticked condition that has no approved clinical rule MUST be stored and shown in the profile but MUST NOT change the interpretation and MUST NOT appear in the "context applied" line (FR-016).
- **FR-020**: Only conditions with a clinically approved rule (at release: type 2 diabetes and cancer/chemotherapy; high blood pressure and high blood lipids follow once a reviewer approves their rules) alter the interpretation; the set of active conditions is a single maintained list so adding one later needs no change to the intake screens.

### Key Entities

- **User account**: identified by a verified mobile number or a verified email; owns one profile.
- **Profile**: first name, last name, sex, age, set of background conditions, intake-completed flag.
- **Background condition**: a fixed, ordered catalogue entry with a stable identifier and a Persian display name.
- **Interpretation request**: the entered results (photo or manual) plus the profile context.
- **Interpretation result**: findings plus the statement of which profile context was applied.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A new user can go from the first screen to a submitted interpretation in under 3 minutes (excluding code delivery time).
- **SC-002**: A returning user reaches the photo/manual choice in no more than 2 steps after sign-in.
- **SC-003**: 90% of test users complete the four intake screens without assistance on the first try.
- **SC-004**: 100% of interpretations produced after this feature show the applied age, sex and conditions.
- **SC-005**: For every ticked condition that has an associated rule, a pair of identical panels (with and without the condition) yields a visibly different, clinically correct result.
- **SC-006**: All screens remain fully usable at 360 px width with no horizontal scrolling.
- **SC-007**: Every sign-in failure (wrong code, expired code, delivery failure) ends in a message that names the next action; none show a raw error code.

## Assumptions

- Sign-in reuses the existing one-time-code account system; email delivery is added as a second channel next to SMS.
- Today the SMS sender is a mock; real SMS delivery is a deployment dependency, not part of this feature's design.
- Authentication being off by default stays a deployment choice; when off, the intake flow still runs and stores the profile for the anonymous session only.
- Sex has two options because the clinical reference ranges in use are defined for male and female.
- Pregnancy status is asked when sex is female and age is 10 years or more, because the engine already uses it for the haemoglobin range; medication lists are not asked in this version.
- Every use of age, sex and conditions in interpretation is a clinical decision. Condition-specific rules and thresholds follow the project's clinical-review process and are recorded in the clinical decision register before shipping; this spec sets no threshold.
- The exact Persian condition names are confirmed with a clinical reviewer before release.
- Name and contact details are never sent to the language model or to the analysis step; only age, sex and condition identifiers are.
- Photo guide and manual sections reuse the tests and groupings the tool already supports; adding new tests is out of scope.
