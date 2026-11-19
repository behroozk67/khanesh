# Feature Specification: Azmayar App Upgrade — Core Loop, Insights, Encyclopedia, Challenges

**Feature Branch**: `001-health-app-upgrade`
**Created**: 2026-11-06
**Status**: Draft
**Input**: User description: "App upgrade using a product framework: core function, core loop,
side features, surface review (minimum screens), retention hook. Core function: interpret the
user's lab results from camera, gallery photo or PDF using the khanesh backend's clinical rules.
Core loop: every submission is visually engaging with haptic feedback. Side features on the result
screen: PDF export, biological age, charts, health score, score trend of up to 5 analyses over the
last year, like the Azmayar site. A Tests encyclopedia with all tests and their info like the
Azmayar site. A History section with charts comparing previous analyses and a health overview.
Few screens. Retention hook: health-tracking challenges that bring the user back 2–3 times a week."

## Product Framework

| Layer | Decision |
|---|---|
| Core function | Turn a lab sheet (camera / gallery / PDF) into a Persian interpretation judged by the khanesh rules engine. |
| Core loop | Capture → animated reading progress → reveal of score, bio-age and results, with a haptic beat at each step. Each new sheet extends the user's history and challenge progress. |
| Side features | On the result: PDF report, bio-age card, health score, per-system chart, score trend (≤5 analyses, last 365 days). Tests encyclopedia. History with per-test comparison charts and a health overview. |
| Surface review | Exactly 4 tabs: «تفسیر» (home + capture), «تاریخچه», «آزمایش‌ها», «چالش‌ها». A result and a test detail are pushed screens, not tabs. |
| Retention hook | Weekly health challenges with check-ins, a streak, and local reminders on 2–3 chosen weekdays. |

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Interpret a lab sheet from camera, gallery or PDF (Priority: P1)

A user opens the app, enters age and sex once, and submits a lab sheet by taking photos with the
camera, picking photos from the gallery, or choosing a PDF. They watch an animated progress view,
feel a haptic tap at each milestone, and land on a result screen showing every test with its
status, the health score and (when available) biological age.

**Why this priority**: This is the core function; nothing else has value without it.

**Independent Test**: Submit one photo of a CBC sheet against a running backend; the result
screen lists the tests in Persian with server-provided names, ranges and status.

**Acceptance Scenarios**:

1. **Given** a first-time user, **When** they tap «عکس با دوربین», **Then** the camera opens; each
   captured page is added to a page strip with a light haptic tap (max 5 pages).
2. **Given** a user with a PDF of their results, **When** they pick it, **Then** each page is
   converted to an image and added to the same page strip; a PDF with more pages than remaining
   slots is refused whole with a Persian message.
3. **Given** pages selected, **When** the user taps «شروع تفسیر», **Then** a progress view shows
   pages read out of total with an animated indicator, and a medium haptic fires on start.
4. **Given** analysis completes, **When** the result arrives, **Then** a success haptic fires and
   the result screen opens with an entrance animation; a failure fires an error haptic and shows
   the server's Persian error.
5. **Given** the user leaves the app mid-analysis, **When** they return, **Then** the analysis
   resumes and finishes without resubmission.
6. **Given** the server asks for payment, **When** the result would open, **Then** the user sees
   a Persian prompt to pay that opens the payment page.

---

### User Story 2 - Rich result screen with export (Priority: P1)

On the result screen the user sees, top to bottom: an emergency/critical banner when the server
flags one; the health score (0–100) with its band colour, or the server's reason when no score is
given; a biological age card comparing bio-age to calendar age when the server provides it; a
per-body-system score chart; the score trend of up to the 5 most recent analyses within the last
365 days; the full test list with a range bar per test; and a «دریافت PDF» button.

**Why this priority**: It turns a raw list into an understandable, shareable report — the reason
users come back.

**Independent Test**: Open a stored result with a score and bio-age; all cards render; tapping
«دریافت PDF» produces a shareable PDF in Persian RTL with the same content.

**Acceptance Scenarios**:

1. **Given** a result where the server returns a score, **When** the screen opens, **Then** the
   score animates from 0 to its value and the band label reads «مطلوب» / «نیاز به توجه» /
   «نیازمند اقدام».
2. **Given** a result where the server withholds the score (emergency, too few tests, one
   system, neonate), **Then** no number is shown and the matching Persian reason is.
3. **Given** a result without server bio-age, **Then** the bio-age card is not shown at all.
4. **Given** 3 earlier analyses in the last year, **Then** the trend chart shows 4 points
   (3 earlier + this one) with dates; with no earlier analysis it shows an empty-state sentence.
5. **Given** the user taps «دریافت PDF», **Then** the system share sheet opens with a PDF
   report; on web the browser print dialog opens.

---

### User Story 3 - History and health overview (Priority: P2)

The «تاریخچه» tab shows a health overview (latest score, latest bio-age delta, number of tests
in/out of range on the last sheet, days since last sheet), the score trend line, a list of past
analyses (tap to reopen the full result), and per-test comparison: picking a test shows its
values across sheets on a chart with the server's reference band and the change from the
previous value.

**Why this priority**: Comparison over time is the main side value after the first result.

**Independent Test**: With 2 stored analyses containing hemoglobin, open history, pick
«هموگلوبین»; a 2-point chart with the reference band and the numeric change appears.

**Acceptance Scenarios**:

1. **Given** no stored analyses, **Then** the tab shows an empty state with a button to the
   capture flow.
2. **Given** several analyses, **When** the user taps one, **Then** its full result screen opens.
3. **Given** a test measured in different units on two sheets, **Then** those points are not
   joined on one line; the chart shows only the latest unit's series and says so.
4. **Given** the user deletes an analysis (long-press → confirm), **Then** it disappears from the
   list, trend and charts.

---

### User Story 4 - Tests encyclopedia (Priority: P2)

The «آزمایش‌ها» tab lists all test categories and tests from the Azmayar site with search. A
test detail screen shows the same information the site shows for that test: what it measures,
why it is ordered, when it is requested, what high and low values mean, preparation, and the
site's sources.

**Why this priority**: Educational content builds trust and gives a reason to open the app
between lab visits.

**Independent Test**: Search «فریتین», open it, and compare the text with the site's page for
that test — content is identical.

**Acceptance Scenarios**:

1. **Given** the tab is open, **When** the user types in search, **Then** matching tests appear
   (Persian or Latin names, Persian or Latin digits).
2. **Given** a test row in a result screen, **When** tapped, **Then** that test's encyclopedia
   page opens if one exists.

---

### User Story 5 - Health challenges and reminders (Priority: P3)

The «چالش‌ها» tab offers a small set of weekly health-tracking challenges (e.g. walking,
water, sleep, reading one test page, logging the next lab sheet). The user joins a challenge,
picks 2–3 weekdays, and checks in with one tap (with haptic and a small celebration). The tab
shows weekly progress, a streak of consecutive weeks meeting the target, and earned badges.
Local reminders arrive on the chosen days.

**Why this priority**: Retention; brings users back 2–3 times a week. Valuable only once the
core loop exists.

**Independent Test**: Join «پیاده‌روی ۳۰ دقیقه», choose 3 days, check in twice; progress shows
2/3; a reminder is scheduled for each chosen day.

**Acceptance Scenarios**:

1. **Given** a joined challenge with target 3 per week, **When** the user checks in 3 times in a
   week, **Then** the week is marked done, a success haptic and celebration play, and the streak
   increases by 1 the following week if it continues.
2. **Given** a week ends with fewer than target check-ins, **Then** the streak resets to 0.
3. **Given** a user checks in twice on the same day, **Then** only one check-in counts.
4. **Given** notifications are denied, **Then** challenges still work and the tab notes reminders
   are off.
5. **Given** a «ثبت آزمایش بعدی» challenge, **When** an analysis completes, **Then** it is
   checked in automatically.

### Edge Cases

- PDF that is encrypted or unreadable → Persian error, no pages added.
- Camera permission denied → Persian message with a gallery fallback.
- Same sheet analysed twice → history keeps one entry (matched by sample date or values), its
  data replaced.
- Result from a server without `score`/`phenoAge` → those cards are hidden, rest works.
- Haptics unavailable (web) → silently skipped.
- Storage unavailable/corrupt → history and challenges start empty, the app does not crash.
- Week boundaries use the Iranian week (Saturday start) in the device's local time.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The app MUST provide exactly 4 tabs: تفسیر، تاریخچه، آزمایش‌ها، چالش‌ها.
- **FR-002**: Users MUST be able to add sheet pages by camera, gallery and PDF, up to 5 pages in
  total, and remove any page before submitting.
- **FR-003**: The app MUST send pages, age and sex to the khanesh backend and render its
  verdict; it MUST NOT compute any clinical threshold, status, score or bio-age itself.
- **FR-004**: The core loop MUST give haptic feedback on page added, analysis start, success and
  failure, and animate progress and result reveal.
- **FR-005**: An in-flight analysis MUST survive app backgrounding and restart.
- **FR-006**: The result screen MUST show (when the server provides them) critical banner, health
  score with band, per-system scores chart, bio-age card, score trend (≤5 analyses within 365
  days), full test list with range bars, and a PDF export action.
- **FR-007**: The PDF report MUST be Persian RTL and contain score, bio-age, test table and the
  disclaimer.
- **FR-008**: Each completed analysis MUST be stored on-device with its date and the server
  result; at most 50 analyses are kept (oldest dropped).
- **FR-009**: The history tab MUST show a health overview, score trend, list of analyses and a
  per-test comparison chart with reference band and numeric change from the previous value.
  Change wording MUST be neutral («افزایش» / «کاهش»), never «بهتر/بدتر».
- **FR-010**: The encyclopedia MUST contain the same categories, tests and per-test text as the
  Azmayar site, taken from the site's source content without rewriting.
- **FR-011**: Encyclopedia search MUST match Persian and Latin names and normalise Persian/Arabic
  digits and letters.
- **FR-012**: Challenges MUST support join/leave, choosing reminder weekdays, one check-in per
  day, weekly target, streak of consecutive successful weeks, and badges at streaks 1, 4 and 12.
- **FR-013**: Reminders MUST be local notifications on the chosen weekdays; no server is involved.
- **FR-014**: Challenge text MUST be general wellness habits and MUST NOT give medical advice or
  reference a user's specific results.
- **FR-015**: All user-visible text MUST be Persian; raw engine keys MUST never be shown.

### Key Entities

- **Analysis record**: id, created date, sample date (if the server read one), server result
  (tests, score, bio-age, urgency), the patient age/sex used.
- **Test series** (derived): for one test, the values, units, ranges and dates across records.
- **Challenge definition**: id, Persian title, description, weekly target, default weekdays.
- **Challenge enrolment**: challenge id, chosen weekdays, joined date, check-in dates.
- **Badge**: challenge id, streak milestone, earned date.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A first-time user reaches a result in at most 4 taps after the photo is taken
  (excluding analysis wait).
- **SC-002**: Every screen in the app is reachable in at most 2 taps from a tab.
- **SC-003**: 100% of numbers shown as score, band, bio-age or test status match the server
  response for the same sheet.
- **SC-004**: Encyclopedia covers 100% of the tests listed on the Azmayar site's tests page.
- **SC-005**: A user who joins a 3-day challenge receives a reminder on each chosen day.
- **SC-006**: Target retention: users with an active challenge open the app 2–3 times per week.

## Assumptions

- No sign-in screen in this feature; the app uses the device id as today, against a backend with
  auth disabled or an existing token. Payment remains "open the payment page".
- History is stored only on this device (the server's paid history API is not used); uninstalling
  clears it.
- "Score" is the server's health score; "امتیاز دادن" in the request means showing it.
- "Trend of five analyses over one year" means the score trend of the 5 most recent analyses
  dated within the last 365 days.
- Encyclopedia content is bundled with the app (works offline); updating it requires an app update.
- Challenge catalogue is a fixed list of 6 general wellness habits plus 2 app-usage challenges.
