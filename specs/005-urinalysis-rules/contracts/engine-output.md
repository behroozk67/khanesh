# Contract: Engine Output (`_engine`) — Stage A

**Consumer**: `khanesh/src/ResultView.jsx` and the rest of the result screen, via the `_engine` object
attached to every engine-path response by `engineDebug()` in `khanesh-server/server.js`.

**Stage A verdict: additive only. No field is added, removed, renamed or re-typed. No frontend change
is required.**

---

## What Stage A adds

| Field | Change | Frontend impact |
|---|---|---|
| `_engine.patterns` | New string values may appear — the Stage A cast rule ids | None. The array is rendered generically; no code branches on a specific cast id. |
| `_engine.urgency` | May now be `this_week` on a sheet that was previously `none` (a cast sheet that fired nothing) | None. Already a four-value enum the UI handles. |

`_engine.patterns` is populated from each finding's `rule_id` (`server.js:61`). The new rule ids are
therefore part of this contract, and are fixed in `tasks.md` before implementation rather than
chosen during it.

## What Stage A must not change

These are the fields a frontend consumer reads that a careless implementation could disturb. Each
is asserted unchanged on the negative-control panels in [quickstart.md](../quickstart.md).

| Field | Why it is at risk | Guarantee |
|---|---|---|
| `_engine.uncovered` | Populated from graded keys whose abnormality no rule explained (`server.js:70`). | **Unchanged.** Cast rows are qualitative rows, never graded keys, so they cannot enter or leave this list. |
| `_engine.tests[]` | Serialised from graded tests. | **Unchanged.** Stage A grades nothing new. Specific gravity stays out of `tests[]` permanently, per clarification Q2 — that is a Stage B guarantee recorded here so Stage B cannot quietly break it. |
| `_engine.unitConversions` | Populated from unit conversions the adapter applied. | **Unchanged.** Cast rows carry `/lpf`, which is a counting convention, not a convertible unit. |
| `has_critical` | Derived from engine urgency, never from the model. | **Unchanged in kind.** No Stage A rule emits `emergency`. |
| Any existing finding on a sheet with no cast row | — | **Byte-identical** (`FR-004b`, `SC-003`). |

## A limitation of the existing contract, recorded so Stage A is not credited with fixing it

The "nothing explains this" net (`unexplained_abnormal` → `_engine.uncovered`) operates over
**graded keys only**. A qualitative row that no rule reads — which is every cast row today except
the red-cell one that is misread — produces no finding, is absent from `uncovered`, and is absent
from `unmapped`. It is fully silent.

Stage A removes that silence for cast rows by giving them a reader. It does **not** extend the net
to qualitative rows in general. A future qualitative row that nothing reads will still be silent,
and nothing will report it. That is a real gap in the architecture, it is outside this feature's
scope, and it is written down here so nobody assumes Stage A closed it.

## Response shape reference

Unchanged. See `.claude/rules/frontend.md` § `_engine` shape.
