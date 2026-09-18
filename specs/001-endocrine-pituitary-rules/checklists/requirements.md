# Specification Quality Checklist: قواعد غدد درون‌ریز و هیپوفیز — فصل ۲۵ هنری

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-09-18
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

## Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Success criteria are technology-agnostic (no implementation details)
- [x] All acceptance scenarios are defined
- [x] Edge cases are identified
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

## Feature Readiness

- [x] All functional requirements have clear acceptance criteria
- [x] User scenarios cover primary flows
- [x] Feature meets measurable outcomes defined in Success Criteria
- [x] No implementation details leak into specification

## Notes

- **دور ۱ (۲۰۲۶-۰۹-۱۸):** همهٔ موارد جز دو مورد پاس شد؛ هر دو موردِ ناتمام مستقیماً از سه نشانگرِ
  `[NEEDS CLARIFICATION]` می‌آمدند.
- **دور ۲ (۲۰۲۶-۰۹-۱۸):** کاربر هر سه را پاسخ داد (Q1: پرولاکتین + کورتیزول/ACTH؛ Q2: فقط کورتیزولِ
  صبحگاهیِ مشخص؛ Q3: نام بردن در متن، بی‌ورودیِ تازه) و در بخشِ `Clarifications` ثبت شد. سنجش:
  `NEEDS CLARIFICATION = 0`، ارجاع به فایل/کد = `0`، ۲۲ FR، ۹ SC، ۳ داستان. **همهٔ موارد پاس.**
- **یافتهٔ دورِ ۲:** Q1 نشان داد کورتیزول خودش تلهٔ واحد دارد (µg/dL در برابر nmol/L)؛ قیدِ واحد
  (FR-004) از نشانگرهای کم‌تکرار به آنالیت‌های همین ویژگی منتقل شد.
- **تصمیمِ آگاهانه دربارهٔ «جزئیاتِ پیاده‌سازی»:** نقشهٔ پوشش به شمارهٔ قواعدِ DSL و فرمولِ
  اسمولالیته ارجاع می‌دهد. این‌ها اصطلاحِ بالینیِ منبع‌اند، نه فناوری؛ برای قابل‌ردیابی بودنِ پاسخ
  به «تکراری اضافه نکن» لازم‌اند. نامِ فایل یا ساختارِ کد در spec نیامده است.
- **سه تعارضِ اندازه‌گیری‌شده** (TSH، ضریبِ سدیم، شاخهٔ مرکزی) عمداً به‌عنوانِ سؤالِ بازبین در
  spec ماندند، نه `[NEEDS CLARIFICATION]`: قانون اساسی پیش‌فرض را تعیین کرده است (رفتار عوض
  نمی‌شود، ثبت می‌شود)، پس سؤالِ کاربر نیستند.
