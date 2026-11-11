# Data Model: specs/023

All new keys live in `serology.js` `AI_RE`. Each key's rows reach `ungraded[KEY]` (`reason: "assay_printed"`, state above/within/below/noref/equiv) or `qual` (positive or negative word), and are read through `autoAbState(e, KEY)`.

| Key | Spellings, after `k0` normalisation (minimum set) | Kind | Owner rule | FA name |
|---|---|---|---|---|
| TTG_IGA | `ttgiga`, `antittgiga`, `tissuetransglutaminaseiga`, `antitissuetransglutaminaseiga`, `ttgaiga`, `tgaiga` | antibody | `celiac_serology_result` | آنتی‌بادی tTG-IgA (ترانس‌گلوتامیناز بافتی) |
| TTG_IGG | same with `igg` | antibody | celiac | آنتی‌بادی tTG-IgG |
| DGP_IGG | `dgpigg`, `antidgpigg`, `deamidatedgliadin(peptide)?igg`, `gliadindeamidatedigg` | antibody | celiac | آنتی‌بادی گلیادینِ دآمینه (DGP-IgG) |
| DGP_IGA | same with `iga` | antibody | celiac | آنتی‌بادی گلیادینِ دآمینه (DGP-IgA) |
| EMA_IGA | `ema`, `emaiga`, `antiendomysial(antibody)?(iga)?`, `endomysialiga` | antibody | celiac | آنتی‌بادی اندومیزیوم (EMA) |
| IGA_TOTAL | `iga`, `totaliga`, `serumiga`, `igatotal`, `immunoglobulina` | concentration (range only) | celiac if any celiac key is present, else `immunoglobulin_result` | IgA تام سرم |
| IGG | `igg`, `totaligg`, `serumigg`, `immunoglobuling` | concentration | `immunoglobulin_result` | IgG سرم |
| IGM | `igm`, `totaligm`, `serumigm`, `immunoglobulinm` | concentration | `immunoglobulin_result` | IgM سرم |
| IGE | `ige`, `totalige`, `serumige`, `immunoglobuline` | concentration | `immunoglobulin_result` | IgE تام سرم |
| ASMA | `asma`, `antismoothmuscle(antibody)?`, `smoothmuscleab`, `antiactin`, `factin(antibody)?` | antibody, titre cut 1:40 | `liver_autoantibody_result` | آنتی‌بادی ضد عضلهٔ صاف (ASMA) |
| ANTI_LKM1 | `lkm`, `lkm1`, `antilkm`, `antilkm1`, `liverkidneymicrosomal(antibody)?` | antibody, titre cut 1:40 | liver | آنتی‌بادی LKM-1 |
| ANTI_SLA | `sla`, `antisla`, `slalp`, `antislalp`, `solubleliverantigen` | antibody | liver | آنتی‌بادی SLA/LP |
| AMA | `ama`, `antimitochondrial(antibody)?`, `mitochondrialab` | antibody, titre cut 1:40 | liver | آنتی‌بادی ضد میتوکندری (AMA) |
| AMA_M2 | `amam2`, `antim2`, `m2`, `antimitochondrialm2` | antibody | liver | آنتی‌بادی AMA-M2 |
| ACHR | `achr`, `achrab`, `achrbinding(ab|antibody)?`, `antiachr`, `acetylcholinereceptor(binding)?(ab|antibody)?` | antibody; fallback > 0.02 nmol/L | `mg_antibody_result` | آنتی‌بادی گیرندهٔ استیل‌کولین (AChR) |
| ANTI_MUSK | `musk`, `antimusk`, `muskab`, `muscle-specifickinase` | antibody | mg | آنتی‌بادی MuSK |
| ANTI_HISTONE | `antihistone`, `histoneab`, `antihistoneab` | antibody | `ana_family_result` | آنتی‌بادی ضد هیستون |
| ACL_IGA | `(anti)?cardiolipin…iga`, `acliga` | antibody | `antiphospholipid_result` | کاردیولیپین IgA |
| ANTI_DNASEB | `antidnaseb`, `dnaseb`, `adnaseb`, `antideoxyribonucleaseb` | antibody; fallback age bands | `dnaseb_result` | آنتی‌دی‌اِن‌آز B |
| CH50 | `ch50`, `totalhemolyticcomplement`, `cH50` | concentration (range only) | `complement_result` | کمپلمانِ کل (CH50) |

**Widened (existing keys):**

| Key | Addition |
|---|---|
| ANA | suffix `iif`, plus the whole names `fana`, `anaiif`, `anahep2iif` |
| ANTI_DSDNA | suffix `clift`, `crithidia` |
| ANTI_CENTROMERE | `anticentromereb`, `centromereb` |

**Exclusions that must keep their current outcome** (negative regex tests):
- `igg1`–`igg4`, `iggindex`, `cd4`, `c1inh`, `oligoclonalbands`: these stay unmapped.
- `sma` stays unmapped, because it is not ASMA.
- `tg`/`thyroglobulin` keeps its tumour-marker route.
- `antitg` keeps the ANTI_TG route.

**State used by the rules:** `{ state: absent|pos|neg|above|within|below|noref|equiv, value, cmp, shown, unit, reference, raw, titre }`. This is the existing `autoAbState` contract, unchanged.

**Constants (all P136):**
- `TTG_NO_BIOPSY_ULN_MULTIPLE = 10`
- `LIVER_AB_TITRE_CUT = 40`
- `ACHR_BINDING_POS_NMOL = 0.02`
- `DNASEB_ULN_BY_AGE = [[5, 250], [18, 375], [Infinity, 300]]`
- `APS_MODERATE = 40`, `APS_HIGH = 80`
- `PRINTED_FIRST_KEYS = {ANTI_TPO, RF}`
