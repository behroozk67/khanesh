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
        { "name": "زمان پروترومبین (PT)", "printed": { "value": 14, "unit": "sec" },
          "graded": { "value": 14, "unit": "sec" }, "derived_from": null,
          "engine_range": "11–13.5", "printed_range": null, "range_source": "Henry",
          "status_fa": "بالاتر از حد طبیعی", "level": null, "ctcae_grade": null, "grading_source": "…" }
      ],
      "context": [],
      "action": "…",
      "warnings": ["…"],
      "suggest": ["تکرار آزمایش انعقاد"],
      "sources": [ { "id": "…", "org": "…", "fa": "…", "title": "…", "year": 2024, "url": "…", "substituted": null } ],
      "no_source": false,
      "pro": { "cautions": ["…"], "differential": ["…"], "workup": ["…"], "sources": ["…"] }
    }
  ],
  "hidden": [ { "label": "…", "urgency": "routine", "urgency_fa": "نوبت عادی", "triggers": [], "sources": [], "no_source": true } ],
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
4. Every `TestRow` with `derived_from` set has `printed` non-null or the explicit unavailable marker (SC-005).
5. `hidden[*]` has no `action`, `warnings` or `pro` key.
6. For a hospitalized patient, no string contains «اورژانس», «مطب», «وقت بگیرید», «۱۱۵» (SC-006).
7. The object is never passed to `buildEnginePrompt`; the prompt payload is byte-identical with and without this feature.
8. Building it never throws: a malformed finding yields a finding with what is available, and the failure is counted, not hidden.

`keys` and `worst` in `score.systems` are serialized as Persian names, not keys (invariant 1).
