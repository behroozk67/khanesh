# Data Model: Urinalysis Stage B

All entities are values derived from `e.qual`. None is an engine key, and none has a reference range (FR-017a).

## SpecificGravity
- **Source row**: name `specificgravity|sg|وزن ?مخصوص` → `qual["Urine Specific Gravity"]`.
- **Parse**: `1.0xx` as is; `10xx` → `/1000`; outside 1.000–1.060, or no number → `unknown`.
- **State**: `dilute` (≤ `SG_DILUTE_MAX` 1.005) | `usual` | `concentrated` (≥ `SG_CONCENTRATED_MIN` 1.030) | `unknown` | `absent`.
- **Route**: `unknown` → `unmapped`; every other state → `qual`.

## Crystal
- **Row identity**: the name contains `crystal|کریستال`, or is a crystal-only name (`calcium oxalate`, `amorphous`,
  `triple phosphate`, `ammonium biurate`). A bare `Uric Acid`, `Cholesterol`, `Cystine`, `Tyrosine` or `Leucine`
  is **not** a crystal row.
- **Type**: read from the name, or from the value when the name is generic («Crystals: Calcium oxalate»).
- **Class**: `pathologic` (cystine, tyrosine, leucine, cholesterol) | `stone` (uric acid, calcium oxalate, triple
  phosphate) | `incidental` (amorphous urates/phosphates, ammonium biurate).
- **Presence**: Stage A's `castValueState` semantics (a closed presence list, negation first; unknown → unmapped).
- **Route**: typed and present → `qual`; negative → `qual`; untyped present, several classes, or unknown → `unmapped`.
- **Axis**: `crystalAxis(e) → { label: pathologic|stone|incidental|null, types[], others[] }`, ordered by class.

## EpithelialCells
- **Kind**: `renal_tubular` (`renal|tubular|توبول|کلیوی`), `transitional` (out of scope → `unmapped`), `squamous`
  (`squamous|سنگفرشی`, or a bare `epithelial`).
- **State**: `urineCellState`-like: `absent` | `low` | `high` | `unknown`.
  - renal tubular: high when > `RTEC_UPPER_HPF` (2), or described few/moderate/many.
  - squamous: high when ≥ `SQUAMOUS_CONTAM_HPF` (15), or described many/numerous/زیاد/+3. «Few/Moderate» is low.

## UrineBilirubin / Urobilinogen
- `urineBiliState(e)`: `positive` | `negative` | `unknown` | `absent`, through the same closed presence list (N6).
- `urobilState(e)`: `raised` (+1 and above, or a number > 1 mg/dL / > 17 µmol/L) | `normal` (Normal/Negative/Trace/0.2/1)
  | `unknown` | `absent`.
- `urineBiliSentence(e)`: `""` unless the bilirubin is positive, or the urobilinogen is raised.

## Hand-off relations
| New rule | Stands down when | Owner gains |
|---|---|---|
| `urine_bilirubin_urobilinogen` | `bilirubin_pattern`, `bilirubin_emergency` or `hemolysis_pattern` fires | `urineBiliSentence(e)` |
| `urine_renal_tubular_cells` | `castAxis(e).label === "tubular_cast"` | one sentence on loose tubular cells |
| `urine_squamous_contamination` | `bacteriuria_no_inflammation` fires | one sentence on squamous cells |
