# Feature Specification: آپلود PDF برگهٔ آزمایش

**Feature Branch**: `017-pdf-upload` (spec directory; work continues on branch `recovery`)

**Created**: 2026-10-16

**Status**: Draft

**Input**: User description: کاربر بتواند به‌جای عکس، فایل PDF برگهٔ آزمایش (اسکن‌شده یا چاپ‌شده) را آپلود کند. هر صفحهٔ PDF در مرورگر به تصویر تبدیل و فشرده می‌شود و از همان مسیر فعلی خواندن برگه می‌رود؛ قرارداد سرور و موتور قواعد تغییر نمی‌کند. استخراج مستقیم متن از PDF (بدون OCR) خارج از محدوده است.

## Current Behaviour (measured facts the spec starts from)

Read 2026-10-16 on the working tree (branch `recovery`).

- The upload control accepts images only (`accept="image/*"` in `UploadCard.jsx`), and `looksLikeImage` in `imageIntake.js` rejects any file whose MIME type is not `image/*`. A PDF cannot be selected or is refused.
- The page limit is `MAX_IMAGES = 5` on the client, counted over the images already chosen plus the new pick (`Tafsir.jsx`: «حداکثر ۵ عکس. الان N صفحه انتخاب شده»). The server enforces the same limit and keeps only `data:image` strings (`server.js`).
- Every selected image is compressed on the device to a JPEG (max width 1200, canvas area cap 6 MP) before upload. Compression exists because phone photos can exceed 8 MB.
- The server reads each image with the vision model, merges pages, and from there the engine takes over. The engine never sees the file, only the extracted rows.
- The privacy note in `.claude/rules/notes.md` states the whole sheet image, including identifiers, is uploaded to the third-party gateway. This is a documented limit, not a guarantee.

## Clarifications

### Session 2026-10-16

- Q: How should a PDF reach the reader? → A: **Each PDF page becomes one image on the user's device**, then follows the existing image path unchanged. No server change, no new request shape.
- Q: Should text be pulled straight out of digital PDFs? → A: **No.** Out of scope; every page is read as an image, as photos are.
- Q: What is the page limit? → A: **The existing limit of 5 pages counts pages across all selected files together** (photos and PDF pages combined).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Upload a PDF of my lab sheet (Priority: P1)

A patient has their lab report as a PDF (downloaded from the lab's site, emailed, or scanned). They open the photo mode, choose the PDF, and get the same interpretation they would get from photographing the paper.

**Why this priority**: Many Iranian labs deliver results as PDF. Today those users must screenshot or print and re-photograph, and some give up.

**Independent Test**: Upload a 2-page PDF of a known sheet and compare the extracted rows and the interpretation with those from photos of the same sheet. They must match.

**Acceptance Scenarios**:

1. **Given** the photo mode with no files chosen, **When** the user picks a 2-page PDF, **Then** two pages appear in the page list as previews, in order, and the user can start the analysis.
2. **Given** a PDF has been chosen, **When** the analysis completes, **Then** the result screen and the extracted-numbers list look exactly as they do for photos, with no PDF-specific wording.
3. **Given** a PDF whose pages are scans of a paper sheet, **When** analysed, **Then** the rows are read as they would be from a photo of the same page.

---

### User Story 2 - Mix photos and PDF pages, with a clear page limit (Priority: P2)

A user has a PDF for the blood count and a photo for the urine page. They add both. If the total goes over the limit they are told plainly what happened and what to do.

**Why this priority**: Multi-page sheets are normal, and the limit protects cost and time. Silent truncation would hide part of the sheet (a missed-test risk).

**Independent Test**: Add a 4-page PDF and then 2 photos; confirm the user is told the limit is 5 pages and nothing was silently dropped or silently added.

**Acceptance Scenarios**:

1. **Given** 2 photos are selected, **When** the user adds a 3-page PDF, **Then** all 5 pages are accepted.
2. **Given** 3 pages are selected, **When** the user adds a 4-page PDF, **Then** none of that PDF's pages is added, and a Persian message states the limit (5), how many pages are selected, and how many the PDF has.
3. **Given** pages are selected, **When** the user removes one, **Then** the count updates and a previously refused PDF can be added.

---

### User Story 3 - Understand why a PDF could not be used (Priority: P3)

If a PDF is password-protected, damaged, empty, or not really a PDF, the user is told in plain Persian what is wrong and what to try (e.g. remove the password, or photograph the sheet).

**Why this priority**: Without a clear message the user sees a spinner or a raw error and has no next step. This is the only story that does not add capability.

**Independent Test**: Try a password-protected PDF, a truncated PDF, and a renamed text file; each gives a distinct, understandable Persian message and leaves existing selections untouched.

**Acceptance Scenarios**:

1. **Given** a password-protected PDF, **When** chosen, **Then** a message says it is protected and suggests removing the password or using photos.
2. **Given** a damaged or unreadable PDF, **When** chosen, **Then** a message says it could not be opened and suggests a photo, and the page list is unchanged.
3. **Given** a file named `.pdf` that is not a PDF, **When** chosen, **Then** it is treated as unreadable, not as an image or as a crash.

---

### Edge Cases

- A PDF page that is blank or nearly blank (cover page, trailing page): it still counts toward the limit; the existing "nothing read from this page" handling applies.
- A very large PDF (many pages or tens of MB): the page count is known before conversion, so a PDF over the remaining allowance is refused before any page is converted, without freezing the page.
- A PDF with mixed page sizes or landscape pages: each page is read at its own aspect ratio, within the same size caps as photos.
- A multi-sheet PDF belonging to two different patients: the existing age/sex mismatch check applies unchanged.
- Two PDFs chosen at once: they are processed in the order picked and the limit applies to the total; the first that fits is added and the rest are refused with the message above.
- The phone locks or backgrounds the tab during conversion: no partial pages are submitted; the user can start again.
- Low resolution after rendering: the same "unreadable photo" outcome as a poor photo; there is no separate quality path for PDFs.
- Slow devices: conversion shows visible progress so the user does not tap again.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The upload control MUST accept PDF files in addition to images, on desktop and on phones.
- **FR-002**: Each page of a selected PDF MUST become one page in the user's page list, in document order, with a preview like a photo's.
- **FR-003**: PDF pages MUST go through the same compression and the same analysis path as photos; the result for a sheet MUST NOT depend on whether it arrived as PDF or as photos, apart from image quality.
- **FR-004**: The total page limit (currently 5) MUST apply to photos and PDF pages combined, and MUST be checked before pages are converted.
- **FR-005**: When a PDF would exceed the limit, the system MUST add none of its pages and MUST tell the user, in Persian, the limit, the current count, and the PDF's page count.
- **FR-006**: The system MUST NOT silently drop, truncate, or reorder pages at any point.
- **FR-007**: Password-protected, damaged, empty, and non-PDF files named `.pdf` MUST each produce a specific Persian message with a next step, and MUST leave existing selections unchanged.
- **FR-008**: While a PDF is being converted, the user MUST see progress, and the analysis button MUST NOT start until conversion has finished.
- **FR-009**: Removing a PDF-derived page MUST work like removing a photo; the user MUST be able to remove individual pages.
- **FR-010**: The server request shape, the response shape, and the clinical engine MUST remain unchanged; this feature MUST NOT alter any interpretation logic.
- **FR-011**: Every user-facing string added by this feature MUST be in Persian.
- **FR-012**: The documented privacy limit MUST be updated to say that a PDF's pages are uploaded as images in the same way as photos, including any identifiers printed on them. No wording on the page or in the docs may claim identifiers are removed from PDFs.
- **FR-013**: The PDF handling MUST NOT load its heavy parts for users who never choose a PDF, so the page loads no slower for photo-only users.
- **FR-014**: Text content inside a PDF MUST NOT be sent anywhere or used for interpretation; only the rendered page images are used.

### Key Entities

- **Selected page**: One item in the user's page list: a preview and a compressed image ready for analysis. It may come from a photo or from one page of a PDF; downstream it is indistinguishable.
- **Page allowance**: The remaining number of pages the user can still add, counted over all pages currently selected.
- **Rejected file**: A file the user chose that was not added, with a reason shown to the user (over the limit, protected, unreadable, wrong type).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user with a 2-page PDF can go from choosing the file to pressing "analyse" in under 30 seconds on a mid-range phone.
- **SC-002**: For the same sheet, the list of extracted tests from the PDF matches the list from photos of that sheet on at least 95 % of rows, and no test is lost solely because of the format, measured on at least 5 sample sheets of different labs.
- **SC-003**: 100 % of over-limit selections are refused with a message that states the limit; none results in silently fewer or extra pages submitted.
- **SC-004**: 100 % of the four failure cases in FR-007 produce a message specific to the cause, verified by trying each.
- **SC-005**: Users who only upload photos see no measurable increase in the initial page load.
- **SC-006**: The result and safety behaviour for PDF-origin sheets is identical to photo-origin sheets on the existing test panels; no existing backend test changes.

## Assumptions

- Users open the PDF on a reasonably recent phone or desktop browser; very old browsers that cannot convert PDFs show the "could not open" message rather than breaking the page.
- PDFs are typically 1–3 pages; the 5-page limit is kept as is and is not raised by this feature.
- Digital (text-layer) PDFs are read by the vision model like scans. Their accuracy is expected to be at least that of photos.
- Pages are read at a resolution comparable to a good photo; the exact size is decided in planning, and the existing size caps stay in force.
- The feature touches only the browser side. Server limits (body size, rate limit, 5-image cap) already fit, because the converted pages are the same kind of data as photos.
- Password-protected PDFs are not unlocked; the user is asked to remove the password.
- The page-selection UI is the existing one; no new screen is added.
- Dependency: a PDF-rendering library is needed in the frontend; choosing it, and confirming its licence, belongs to the plan.
