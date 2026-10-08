# Contract: `_engine.expert` (version 1)

Attached to the `/api/analyze` and `/api/analyze/job/:id` responses **only on the engine path**, next to `_engine.score`. Absent on an older server and on the legacy path; the client MUST treat absence as "detail unavailable", not as an error.

```jsonc
{
  "version": 1,
  "urgency": "this_week",
  "findings": [
    {
      "label": "شاخص‌های لخته شدن خون شما غیرطبیعی هستند",
      "urgency": "this_week",
      "urgency_fa": "این هفته",
      "supplementary": false,
      "briefed": false,
      "triggers": [
        { "name": "زمان پروترومبین (PT)", "printed": null,
          "graded": { "value": 14, "unit": "sec" }, "derived_from": null,
          "engine_range": "11–13.5", "printed_range": null, "range_source": "Henry",
          "status_fa": "بالاتر از حد طبیعی", "level": null, "ctcae_grade": null, "grading_source": "…" }
      ],
      "context": [],
      "warnings": ["…"],
      "suggest": ["تکرار آزمایش انعقاد"],
      "sources": [ { "org": "…", "fa": "…", "title": "…", "year": 2024, "url": "…", "substituted": null } ],
      "no_source": false,
      "pro": { "cautions": ["…"], "differential": ["…"], "workup": ["…"], "sources": [ { "org": "…", "fa": "…", "url": "…" } ] }
    }
  ],
  "hidden": [ { "label": "…", "urgency": "routine", "urgency_fa": "نوبت عادی", "triggers": [], "sources": [], "no_source": true } ],
  "recommendations": ["…"],   // exactly buildEngineRecommendations(patternOut, engineOut) — the simple view's list, one final action
  "suggested": ["تکرار آزمایش انعقاد"],
  "tests": [ /* TestRow, abnormal first; ungraded rows with status_fa «بدون حکم» */ ],
  "indices": [ { "label": "eGFR", "value": 35, "unit": "mL/min/1.73m²", "method_fa": "…", "inputs": ["کراتینین", "سن", "جنس"] } ],
  "score": { "value": 96, "band": "mid", "reason": null,
             "systems": [ { "fa": "انعقاد", "score": 75, "cap": 75, "capped": true, "keys": ["PT", "INR"], "worst": "INR" } ] }
}
```

The values above illustrate shape only; the real values come from the engine.

## Invariants (each is a test)

1. No string anywhere in the object equals an engine key or a rule id (sweep, SC-002).
2. `urgency` equals `_engine.urgency`; each finding's `urgency` equals the shown finding's. `score` deep-equals `_engine.score`'s corresponding fields (SC-003).
3. No `suggest`/`suggested` item names a test measured on the sheet (graded or ungraded) (SC-004).
4. Every `TestRow` with `derived_from` set has `printed` non-null (SC-005); see 9.
5. No finding (shown or hidden) has an `action` key; the only instruction list is `recommendations` (review fix: rival timelines, N7/N20). `hidden[*]` also has no `warnings` or `pro`.
9. `printed` is non-null **only** with a `derived_from` reason, and its `unit` is non-null only when the sheet printed it (`basis = printed`); otherwise the assumed unit is in `unit_assumed` (N5, X11, X22–X24).
10. No string has the shape of an engine key (`/^[A-Z][A-Z0-9]*(_[A-Z0-9]+)+$/`), and source objects carry no guideline `id` (X3, X25).
11. Suggestions pass the same `forbid` filter as `buildEngineRecommendations` (X26).
6. For a hospitalized patient, no string contains «اورژانس», «مطب», «وقت بگیرید», «۱۱۵» (SC-006).
7. The object is never passed to `buildEnginePrompt`; the prompt payload is byte-identical with and without this feature.
8. Building it never throws: a malformed finding yields a finding with what is available, and the failure is counted, not hidden.

`keys` and `worst` in `score.systems` are serialized as Persian names, not keys (invariant 1).
