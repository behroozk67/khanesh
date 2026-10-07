# Contract: `_engine.score` (version 2)

**Producer**: `healthScore(engineOut, patternOut)` in `khanesh-server/rules/score.js`, called once in `server.js` where `_engine` is assembled.
**Consumer**: `khanesh/src/ResultDashboard.jsx`. No other consumer: not the prompt, not the graph, not `has_critical`.

## Function signature

```
healthScore(engineOut, patternOut) -> SheetScore
```

- `patternOut` is the `runPatterns` return value. The function reads `findings` (shown only), `overall_urgency`, and each finding's `rule_id`, `urgency` and `uncovered`.
- For backward compatibility, a string second argument is read as `{ overall_urgency: <string>, findings: [] }`.

## Shape

```jsonc
{
  "version": 2,
  "value": 96,                // number | null
  "band": "high",             // "high" | "mid" | "low" | null
  "reason": null,             // null | "neonate" | "too_few" | "one_system"
  "cap": null,                // 35 when overall_urgency === "emergency", else null
  "capped": false,
  "covered": ["blood", "liver", "kidney", "metabolic", "coag"],
  "systems": [
    { "id": "coag", "fa": "انعقاد", "weight": 0.8, "keys": ["PT", "INR"],
      "raw": 80, "cap": 75, "score": 75, "capped": true, "critical": false,
      "worst": { "key": "INR", "name": "INR", "points": 0.8 } },
    { "id": "heart", "fa": "قلب", "weight": 1, "keys": [], "raw": null, "cap": null,
      "score": null, "capped": false, "critical": false, "worst": null }
    // … always 8 entries, in table order
  ],
  "count": { "scored": 9, "out": 2,
             "levels": { "mild": 0, "moderate": 0, "marked": 0, "critical": 0 },
             "no_level": 2, "excluded": 0, "unread": 0 },
  "points": { "PT": 0.96, "INR": 0.8, "HGB": 1 },
  "counted": 9,
  "total": 9
}
```

## Invariants (each one is a test)

1. `value != null` ⇒ `reason === null`, and `reason != null` ⇒ `value === null && band === null`.
2. `overall_urgency === "emergency"` ⇒ `value === null || value <= 35`.
3. `value != null` ⇒ `value <= min(systems[].score) + 30`.
4. `systems.length === 8`. Every `worst.name` is `faName(worst.key)` and is never equal to a raw key, except where `FA_NAMES` deliberately uses the abbreviation (`INR`, `MCH`, `LDL`, …; see `M32`).
5. `count.out === count.levels.mild + moderate + marked + critical + count.no_level` (excluded keys are not in `out`).
6. A key in `systems[].keys` belongs to exactly one system.
7. Old consumers that read only `value`, `band`, `reason`, `points` and `counted` keep working.
8. *(After code review.)* `overall_urgency ∈ {soon, this_week}` ⇒ `band !== "high"`.
9. *(After code review.)* Each shown finding with urgency `soon`, `this_week` or `routine` caps either the systems of the keys it is about (source reads ∪ `uncovered` ∪ keys its text names), or, when none can be attributed, the whole sheet (`cap`). `cap` is therefore no longer emergency-only: it is the smallest whole-sheet cap that applied.
10. Every out-of-range row's points are ≤ 0.9.

## Persian strings introduced (shown verbatim for review)

Producer (`score.js`), system titles: «خون‌سازی»، «کبد»، «کلیه»، «قلب»، «متابولیک و غدد»، «انعقاد»، «التهاب و ایمنی»، «الکترولیت و مواد معدنی».

Consumer (`ResultDashboard.jsx`):

- Count line: «از {N} آزمایش، {k} مورد خارج از محدوده» followed by the parts that are non-zero: «{n} کمی خارج»، «{n} خارج»، «{n} خیلی خارج»، «{n} بحرانی»، «{n} بدون درجهٔ شدت». When `k = 0`: «از {N} آزمایش، همه در محدوده». When `count.unread > 0`, «؛ {n} ردیف بدون حکم» is appended in both cases.
- Overall-number tone comes from `band` (high → good, mid/low → warn), except on an emergency, which is always red.
- Number label: «امتیازِ این برگه — خلاصهٔ مرورِ سریعِ همین برگه، نه حکمِ پزشکی».
- Per system, under its score when `worst` is set: «پایین‌ترین: {worst.name}».
- `NO_SCORE_FA.too_few`: «آزمایشِ کافی برای امتیازِ کل نیست (دست‌کم ۵ اندازه‌گیریِ مستقل لازم است).»
- `NO_SCORE_FA.one_system`: «امتیازِ کل فقط وقتی داده می‌شود که برگه دست‌کم دو دستگاهِ بدن را پوشش دهد. امتیاز فقط برای: {covered fa joined with «، »}.»
- `NO_SCORE_FA.neonate`: unchanged.

`levels` keys map to the engine's own wording in `grade.js` `FA` (`mild_*` «کمی بالاتر/پایین‌تر…», `moderate_*` «بالاتر/پایین‌تر…», `marked_*` «خیلی…», `critical_*` «بحرانی…»), shortened without direction: mild «کمی خارج», moderate «خارج», marked «خیلی خارج», critical «بحرانی». No new severity vocabulary is introduced (clarification Q1). The words «خفیف/متوسط/شدید» are deliberately not used: the engine never says them about a test.
