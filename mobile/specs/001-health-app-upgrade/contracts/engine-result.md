# Contract: fields read from the analyze result

Source of truth: `../khanesh-project/.claude/rules/frontend.md`, `khanesh-server/rules/score.js`,
`rules/pheno_age.js` (`phenoAgeCard`). The app reads only these; everything optional.

```
result.has_critical: boolean
result.extracted_tests: { name, value, … }[]      // signature only
result._engine.urgency: "emergency"|"soon"|"this_week"|"routine"|"none"
result._engine.critical_banner: { title, body } | null
result._engine.context: { sex, age_text, sample_date? }
result._engine.tests[]: { key, name, fa, value, range, abnormal, dir, level, unit? }
result._engine.score: {
  version: 2, value: number|null, band: "high"|"mid"|"low"|null,
  reason: "neonate"|"emergency"|"too_few"|"one_system"|null,
  systems: { id, fa, score: number|null, critical: boolean }[],
  counted: number, total: number
}
result._engine.phenoAge: { years, chronoAge, deltaYears, capped } | null
```

Display rules copied from the site (`resultModel.js`):
- band → «مطلوب» (high) / «نیاز به توجه» (mid, low); critical system → «نیازمند اقدام».
- `reason` → `NO_SCORE_FA` sentences (one_system lists covered system names).
- `phenoAge.capped` → show «کمتر از ۲۰».
