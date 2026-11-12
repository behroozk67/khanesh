# Contract: patient-facing output of specs/024

The interface is the engine's `findings[]` (consumed by `server.js` and the model, which only rewrites `headline`/`must_say`). Nothing here changes the API response shape, `_engine`, or `has_critical`.

The Persian strings below are **drafts for the reviewer**. They are the exact text the implementation must use, unless the reviewer edits them in P141. Placeholders: `${v}` is the printed value.

## 1. Caveat `pseudohyponatremia_lipid_protein` (attached to `sodium_critical`)

Carrier: the existing finding's caveat list (same mechanism as `hemolysis_potassium`). `sodium_critical`'s urgency, headline, `must_say`, `key_number` and `blocks_others` are byte-identical with and without it.

> وقتی چربیِ خون (تری‌گلیسرید) یا پروتئینِ خون خیلی بالاست، بعضی روش‌های آزمایشگاهی سدیم را کمتر از مقدارِ واقعی نشان می‌دهند، چون ذراتِ چربی یا پروتئین بخشی از حجمِ نمونه را می‌گیرند. پس این سدیمِ پایین ممکن است واقعی نباشد؛ پیش از هر درمانی، پزشک ممکن است سدیم را با روشِ دیگری یا همراهِ اسمولالیتهٔ سرم دوباره بسنجد.

Absent when: Na ≤ 120, Na not low, glucose correction applied, TG and TP both below the D1 cut-offs or not on the sheet.

## 2. Finding `sweat_chloride_result` (new rule, group `general`)

| Field | Value |
|---|---|
| `rule_id` / `pattern` | `sweat_chloride_result` |
| `headline` (all states; never names the disease, FR-008) | «نتیجهٔ آزمایشِ کلرید عرق شما» |
| `key_number` | `${v}` for the four value states; absent for `too_young` and `unread` |
| `urgency` | per D3 |

`must_say` by state:

- **unlikely (< 30)** — `routine`
  > کلرید عرق شما ${v} میلی‌مول در لیتر است. مقدارِ کمتر از ۳۰ در منابعِ آزمایشگاهی «احتمالِ فیبروز کیستیک کم» شمرده می‌شود. اگر پزشک به‌خاطرِ علائم این آزمایش را خواسته، تصمیمِ نهایی با اوست.
- **intermediate (30 to < 60)** — `this_week`
  > کلرید عرق شما ${v} میلی‌مول در لیتر است و در محدودهٔ بینابینی (۳۰ تا ۵۹) قرار دارد. این عدد به‌تنهایی بیماری را تأیید یا رد نمی‌کند؛ معمولاً آزمایش ظرفِ چند هفته تکرار می‌شود و ممکن است پزشک آزمایشِ ژنتیک را هم پیشنهاد کند.
- **consistent (60 to 160)** — `this_week`
  > کلرید عرق شما ${v} میلی‌مول در لیتر است. مقدارِ ۶۰ و بالاتر با معیارهای تشخیصیِ فیبروز کیستیک هم‌خوان است، ولی تشخیص با یک عدد قطعی نمی‌شود: پزشکِ متخصص آن را با علائم، تکرارِ آزمایش یا آزمایشِ ژنتیک تأیید می‌کند.
- **implausible (> 160)** — `routine`
  > کلرید عرق شما ${v} میلی‌مول در لیتر گزارش شده است. مقدارِ بالاتر از ۱۶۰ از نظرِ فیزیولوژیک بعید است و معمولاً از خطای جمع‌آوری یا اندازه‌گیریِ نمونه است؛ این آزمایش باید تکرار شود و از این عدد نتیجه‌ای گرفته نمی‌شود.
- **too_young (age < 14 days)** — `routine`
  > کلرید عرق در نوزادِ کمتر از دو هفته قابلِ اتکا نیست و معمولاً پس از دو هفتگی انجام یا تکرار می‌شود؛ این نتیجه را به پزشکِ کودک نشان دهید.
- **unread (no or other unit)** — `routine`
  > کلرید عرق روی برگه هست ولی واحدِ آن (میلی‌مول در لیتر) خوانده نشد، پس دربارهٔ آن قضاوت نمی‌کنیم؛ برگه را به پزشک نشان دهید.

`action`:
- `this_week`: «این هفته نتیجه را به پزشکِ متخصص (ریه یا گوارشِ کودکان) نشان دهید.»
- `routine`: «در نوبتِ عادی نتیجه را به پزشکی که آزمایش را خواسته نشان دهید.»

`suggest` (each string needs a `SUGGEST_TESTS` row; S11):
- intermediate, consistent: «تکرار کلرید عرق», «آزمایش ژنتیک CFTR»
- implausible, too_young: «تکرار کلرید عرق»
- unlikely, unread: none

Voice: for a child the engine's existing `childVoice` turns «شما» into «فرزندتان»; for an infant under 28 days `neonatalVoice` applies and the newborn floor (N26/P63) sets `soon` with its own action. The strings above are the adult form.

## Invariants (tests)

1. No finding outside this contract changes on any probe panel (diff against `snapshots/before.txt`).
2. `sodium_critical` with the caveat has the same urgency as without it, at every Na value 121–134.
3. A sheet with serum `Chloride 100` and `Sweat Chloride 65` grades serum `CL` exactly as before (N25).
4. No raw key (`SWEAT_CL`, `TG`, `TP`, `NA`) appears in any `headline`, `must_say`, `action` or `suggest` (V/N8).
