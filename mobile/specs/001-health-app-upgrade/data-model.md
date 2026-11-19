# Data Model

## AnalysisRecord (AsyncStorage `azmayar_history_v1`, array, newest last, max 50)

| field | type | note |
|---|---|---|
| id | string | job id, or random when absent |
| at | ISO string | when the analysis finished |
| sampleDate | ISO string \| null | `_engine.context.sample_date` |
| sig | string | djb2 hash of sorted `name:value` from `extracted_tests` (fallback `_engine.tests`) |
| patient | `{ age, sex }` | what was sent |
| result | AnalyzeResult | server body as received |

Derived:
- `scoreTrend(records, now)` → last 5 records with `score.value != null` and date within 365 days, ascending.
- `testSeries(records, key)` → `{ date, value, unit, range }[]` for numeric values, ascending; only the latest unit's points.
- `overview(records)` → latest score/band, latest phenoAge delta, abnormal/total of latest, days since latest.

## Challenge (constant)

`{ id, title, body, icon, target /*per week*/, auto?: 'analysis' }`

## Enrolment (AsyncStorage `azmayar_challenges_v1`, map id → enrolment)

| field | type |
|---|---|
| days | number[] (0=Sat … 6=Fri) |
| joinedAt | ISO |
| checkins | `YYYY-MM-DD` local dates, unique |
| notifIds | string[] |

Derived: `weekStart(date)` (Saturday), `weekCount(e, now)`, `streak(e, target, now)`, `badges(streak)` ∈ {1,4,12}.
