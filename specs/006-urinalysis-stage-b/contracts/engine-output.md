# Contract: engine output after Stage B

The response shape is unchanged, and the frontend is untouched.

- `_engine.patterns` gains only these new ids: `urine_crystals`, `urine_specific_gravity`,
  `urine_bilirubin_urobilinogen`, `urine_renal_tubular_cells` and `urine_squamous_contamination`. Each finding's
  `pattern` field equals its rule id, or a documented variant of it.
- `_engine.tests`, `uncovered`, `unitConversions` and `has_critical` are unchanged for every panel. Specific gravity
  never appears in `tests[]` (FR-017a).
- **`unmapped` changes on purpose.** Specific gravity, typed crystals and squamous or renal tubular cell rows leave the
  «تفسیر نشدند» line, because a rule now reads them. Unreadable values of those rows stay on it, or join it for the
  first time when printed with `/hpf` (SC-006).
- **No finding's `urgency` or `action` changes on any Stage A or pre-existing panel** (SC-003). The three owners gain
  one appended `must_say` sentence, and only when their panel carries a positive urine bilirubin, a raised
  urobilinogen, loose tubular cells or many squamous cells.
