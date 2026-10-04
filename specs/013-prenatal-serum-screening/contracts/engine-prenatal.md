# Contract: prenatal channel across the engine

## Adapter input → `ocrToEngineInput`

- Rows are OCR objects `{ name, value, unit, range? }` as today. A new pass runs **before** the generic `^mom$ → unmapped` branch and before `NAME_MAP` alias resolution for `hcg`/`afp`/`estriol`.
- Output adds `prenatal` (see data-model.md). Rows it claims are removed from `tests`/`qual`/`unmapped`; rows it does not claim are untouched (byte-identical output for every existing panel — freeze test).
- `runEngine` forwards `prenatal` in the engine output exactly as `hemostasis` is forwarded; it is **not** passed to the model or the graph path (N13).

## Engine → response (`_engine`)

- No new required field. `patterns` gains the `prenatal_*` ids; `urgency` per finding as in data-model.md.
- `uncovered` / «تفسیر نشدند» must list any prenatal key with no owner (N18). Names via `faName()`.
- Frontend: no change required. `ResultView.jsx` renders findings generically. (If a later task adds a manual-entry form, that is a separate spec.)

## Fallback gate (`server.js`)

A sheet whose only recognised rows are prenatal MUST stay on the engine path (same as `hasHemostasis`). Otherwise it reaches the model-judged path (N18 at the routing layer).

## Safety nets

- `must_say` coverage and `key_number`: findings expose the printed MoM/risk as `key_number` where the existing mechanism supports it, so the model cannot drop the number.
- `forbid`: no diagnosis words («دارید»، «مبتلا»); tested by sweep.

## Invariants (each has a test)

1. Existing-panel output unchanged (freeze over the current fixtures).
2. No prenatal row graded against any concentration range.
3. Exactly one label per arm; no two prenatal findings with different instructions.
4. Weak names unclaimed ⇒ old behaviour.
5. Every patient string Persian, no raw key, includes the screening-not-diagnosis line.
