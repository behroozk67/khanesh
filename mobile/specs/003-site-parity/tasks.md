# Tasks: 003 — site parity (sign-in, payment, manual entry, profile, onboarding, info pages)

Scope: the site routes still missing after 002, added in the order the user asked. No new tabs (constitution III):
everything is a root-Stack screen reached from the header (profile), the interpret screen, or «آزمایش‌ها» → «بیشتر».
Constitution check: I (manual entry sends values; only the site's `hard` plausibility bounds run on device, the engine
judges), II (all copy is the site's; info pages are extracted verbatim by `scripts/sync-content.mjs`), V (profile stays on device;
delete clears device data) — PASS.

- [x] T001 Sign-in: `api.ts` `fetchHealth`/`channelsOf`/`authPost`/`needsSignIn`; `src/app/signin.tsx` (phone/email OTP, mock channels hidden, resend countdown); interpret screen opens it when `/health.authRequired` and no token, and on `auth_required`
- [x] T002 Payment: `api.ts` `fetchPlan`/`requestPayment`/`verifyPayment`; `src/lib/pay.ts` (in-app browser, then verify by authority — the gateway returns to the site, not the app); paywall card on the interpret screen; `src/app/pricing.tsx`
- [x] T003 (removed later at the user's request) Manual entry: `src/lib/manual.ts` (port of `buildStructuredTests`/`buildTestText`, selfcheck asserts); `src/components/manual-entry.tsx`; 4th source «ورود دستی»
- [x] T004 Profile: `src/app/profile.tsx` (account, local profile, plan → pricing, sign-out, two-step «حذف حساب و اطلاعات من» → `deleteAccount` + `clearAllData`); header person icon
- [x] T005 Onboarding: `src/app/onboarding.tsx` on first run (StartChoice + PhotoGuide copy); method cards return with `?go=`
- [x] T006 Info pages: sync script extracts ReferenceRanges/UnitsGuide/HowToCapture/Methodology/Terms/Privacy → `pages.js`; `src/app/info/[page].tsx`; `src/app/contact.tsx`; «بیشتر» list in «آزمایش‌ها»
- [x] T007 Verify: tsc, lint, selfcheck, web smoke of each screen; CLAUDE.md

Not ported: the site's local preview of manual values (it uses client thresholds), compare-with-previous mode, server-side profile sync (`/api/profile` is 409 `local_only` unless auth is on), the contact page's message form, family profiles.
