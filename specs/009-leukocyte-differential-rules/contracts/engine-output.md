# Contract: what changes in `/api/analyze` for specs/009

No route, field or type is added or removed in the response. `Tafsir.jsx` and `ResultView.jsx` need **no change**.
Only these values change.

| field | change | consumer impact |
|---|---|---|
| `_engine.patterns[]` | new ids: `monocytosis`, `monocytopenia`, `eosinophilia`, `basophilia`, `peripheral_smear_findings`; `unmatched_abnormal` stops appearing on isolated mono/eos/baso panels | none |
| `_engine.tests[]` (`MONO_ABS`) | adult `range` «200–800» (was «0–800»); a count < 200 is now `abnormal: true, dir: "low"` | the existing render |
| `_engine.urgency` / `has_critical` | may rise: a smear with blasts ≥ 20 % or Auer rods → `emergency` (`has_critical` true); eos ≥ 1500 or blasts < 20 % → `this_week` | none |
| `_engine.uncovered[]` | on sheets where a finding is suppressed by an emergency, the keys that finding read now appear here (research R6: e.g. `BASO_ABS`, `LYMPH_ABS` under `extreme_leukocytosis`) | the «نیازمند بررسی» chip is decided per key, as today |
| `ocr_warnings` («تفسیر نشدند») | smear rows the engine now reads (blasts, Auer, toxic granulation, Döhle, Pelger, May-Hegglin, Alder-Reilly, Chédiak-Higashi, and generic smear rows naming them) leave this list, including «Blasts 0 %» / «not seen». Unrecognised values stay. | none |
| `general_recommendations` | one final action from `pickFinalAction()`, unchanged mechanism; a blast/Auer emergency can now be that action | none |

## Internal (engine) contract, not in the HTTP response

- `runEngine()` returns a new field, `smear: SmearItem[]` ([data-model.md](../data-model.md) §2). It is always an array,
  and empty when no smear row is read.
- `server.js` must not forward `smear` to the model raw (Principle I). The model sees only the findings' `headline` and
  `must_say`, as today. `safeEngineOut` for the graph path is a copy of `engineOut`, so `smear` would ride along by default.
  It holds printed text, so the copy must **delete** it, as it deletes `note` and `patient` (N13).

`api-contract.test.js` must stay green. The contract tests run with no smear rows, so they exercise the
empty-array path.
