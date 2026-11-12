# Baseline — specs/024 (measured on HEAD c4d3622, working tree = HEAD for khanesh-server/)

- `node --test`: tests 1787, pass 1785, fail 1 — `T15e` (payment route, 503 ≠ 200), pre-existing; it passed in the pre-commit hook's run of the index tree.
- Rule ids: `ids_before.txt` (285).
- Probe re-run is byte-identical to `before.txt`.

## Red on HEAD (constitution IV)
- Before any rule code: `CH24-1`–`CH24-4` failed, `CH24-5` (serum chloride guard, negative control) passed.
- `CH24-6` failed with `rules/score.js` stashed (sweat chloride 20 ⇒ score 98 → 90), passed with it.

## After (working tree, same HEAD + this change)
- `node --test`: tests 1793 (+6), pass 1791, fail 1 — `T15e` only (same as baseline).
- Rule ids 285 → 286: `+sweat_chloride_result` only (`ids_after.txt`).
- Probe diff (`before.txt` → `after.txt`): G2a–G2e only. G2f (conductivity) and G3a–G3d unchanged.
- Sodium caveat (in `warnings`, not printed by the probe): G1a true, G1b false, G1c true, G1d false, G1e false (emergency), G1f true; urgencies unchanged.
- Score, healthy 10-year-old: base 98 «high», unread 0; + sweat chloride 20 ⇒ 90 «mid», unread 1 before the score.js fix, equal to base after it.
