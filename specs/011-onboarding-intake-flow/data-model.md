# Data Model: 011 Onboarding and Intake Flow

## users (SQLite, rebuilt by migration)

| Field | Type | Rules |
|---|---|---|
| id | INTEGER PK | |
| phone | TEXT UNIQUE NULL | normalized `09\d{9}` |
| email | TEXT UNIQUE NULL | lower-cased, trimmed |
| created_at | DATETIME | |

- `CHECK (phone IS NOT NULL OR email IS NOT NULL)`.
- Migration: `PRAGMA user_version` 0 → 1 rebuilds `users` (SQLite cannot drop `NOT NULL` in place), copying existing rows. Idempotent; `jobs.user_id` keeps referencing `users.id`.

## profiles (server, auth on only)

| Field | Type | Rules |
|---|---|---|
| user_id | INTEGER PK, FK users.id ON DELETE CASCADE | one profile per user |
| first_name | TEXT NOT NULL | 1–50 chars after trim |
| last_name | TEXT NOT NULL | 1–50 chars after trim |
| sex | TEXT NOT NULL | `male` \| `female` |
| age_value | INTEGER NOT NULL | year: 1–120 · month: 1–23 · day: 0–60 |
| age_unit | TEXT NOT NULL | `year` \| `month` \| `day` |
| pregnant | INTEGER NOT NULL DEFAULT 0 | only `1` when `sex = female` and age ≥ 10 years |
| conditions | TEXT NOT NULL DEFAULT '[]' | JSON array of catalogue ids; `[]` = "none" chosen |
| conditions_answered | INTEGER NOT NULL DEFAULT 0 | distinguishes "none" from "not answered yet" |
| updated_at | DATETIME | |

**Intake state** (derived, not stored): `name` → `sex` → `age` → `conditions` → `done`. The first missing field decides the resume screen (FR-010). `done` ⇔ all four answered.

## Local profile (auth off)

`localStorage["azmayar_profile_v1"]` holds the same shape (`firstName, lastName, sex, ageValue, ageUnit, pregnant, conditions, conditionsAnswered`). Every read/write is wrapped in try/catch; if storage is unavailable the intake still works for the session.

## Condition catalogue (frontend + backend, one shared list)

| id | fa | active in engine |
|---|---|---|
| htn | فشار خون بالا | no (P66) |
| dm2 | دیابت نوع ۲ | **yes** — LDL target arm of `lipid_profile` |
| lipid | چربی خون بالا | no (P66) |
| hypothyroid | کم‌کاری تیروئید | no (P66) |
| ckd | بیماری مزمن کلیه | no (P66) |
| fatty_liver | کبد چرب | no (P66) |
| ida | کم‌خونی فقر آهن | no (P66) |
| thal_trait | ناقل تالاسمی (مینور) | no (P66) |
| chd | بیماری عروق قلب | no (P66) |
| cancer | سرطان / شیمی‌درمانی | **yes** — CTCAE grading |

- Backend source of truth: `khanesh-server/rules/conditions.js` (`CONDITIONS`, `ACTIVE_CONDITIONS`, `conditionIds(input)`), which accepts ids **and** the legacy Persian labels (older clients, saved files from `Tafsir.jsx`'s export).
- Frontend copy: `khanesh/src/conditions.js` (ids + labels only; the frontend never decides "active" — it renders `_engine.context`).

## Analyze request `patient` (unchanged shape, new content)

```
patient: { age: "45 سال", sex: "زن", pregnant?: true, conditions?: ["dm2", "cancer"] }
```
No name, phone or email — ever.

## Analyze response additions

```
_engine.context = {
  sex: "زن", age_text: "۴۵ سال", pregnant: false,
  conditions_applied: [{ id: "dm2", fa: "دیابت نوع ۲" }],
  source: { sex: "profile" | "sheet", age: "profile" | "sheet" }
}
ocr_warnings += «روی برگه … چاپ شده؛ تفسیر با … پروفایل انجام شد.»   // only on disagreement
```
