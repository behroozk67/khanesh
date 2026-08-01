const fs = require('fs');

const code = fs.readFileSync('patterns.js', 'utf8');
const lines = code.split('\n');

let startIdx = -1;
let endIdx = -1;

for (let i = 0; i < lines.length; i++) {
  if (lines[i].trim() === 'export const RULES = [') {
    startIdx = i;
  }
  if (startIdx !== -1 && i > startIdx && lines[i].trim() === '];') {
    endIdx = i;
    break;
  }
}

// Write patterns_utils.js
// We take lines 0 to startIdx-1.
// And we also search for LEVEL_RANK, rankOf, val which are somewhere after endIdx.
let rankOfIdx = -1;
let valIdx = -1;
let suggestTestsIdx = -1;

for (let i = endIdx; i < lines.length; i++) {
  if (lines[i].includes('const LEVEL_RANK =')) rankOfIdx = i - 1; // get the comment too
  if (lines[i].includes('function val(e)')) valIdx = i - 1;
  if (lines[i].includes('export const SUGGEST_TESTS =')) suggestTestsIdx = i - 4; // get comments
}

const utilsLines = lines.slice(0, startIdx);
const rankOfLines = lines.slice(rankOfIdx, valIdx);
const valLines = lines.slice(valIdx, suggestTestsIdx);

const utilsContent = utilsLines.join('\n') + '\n' + rankOfLines.join('\n') + '\n' + valLines.join('\n');
const utilsExport = `\nexport { serologyReactive, qualPositive, qualValue, titreFa, hasInflammation, whoFerritinThreshold, whoInflamIronDeficiency, urinePositive, urineCellCount, urineGrade, isNephrotic, isGlomerulonephritis, isDIC, val, rankOf, has, CRP_RE, RF_RE };\n`;

fs.writeFileSync('patterns_utils.js', utilsContent + utilsExport, 'utf8');

const imports = `import { RULES_INFECTIOUS } from "./patterns_infectious.js";
import { RULES_NEPHROLOGY } from "./patterns_nephrology.js";
import { RULES_HEMATOLOGY } from "./patterns_hematology.js";
import { RULES_BIOCHEM } from "./patterns_biochem.js";
import { RULES_ENDOCRINE_RHEUM } from "./patterns_endocrine_rheum.js";
import { RULES_ANEMIA } from "./patterns_anemia.js";
import { RULES_MALIGNANCY } from "./patterns_malignancy.js";
import { rankOf } from "./patterns_utils.js";
import { faName } from "./names.js";
import { preanalyticalCaveats, attachPreanalytical } from "./preanalytical.js";
import { repeatDeltaFa } from "./biovar.js";\n`;

const newRules = `
const LEGACY_ANEMIA_IDS = [
  "macrocytic_anemia",
  "microcytic_anemia",
  "microcytic_thal_likely",
  "microcytic_ida_likely",
  "normocytic_anemia",
  "iron_deficiency_panel",
  "anemia_chronic_disease",
  "hemolysis_pattern",
];

export const RULES = [
  ...RULES_INFECTIOUS,
  ...RULES_NEPHROLOGY,
  ...RULES_HEMATOLOGY.filter(r => !LEGACY_ANEMIA_IDS.includes(r.id)),
  ...RULES_ANEMIA,
  ...RULES_MALIGNANCY,
  ...RULES_BIOCHEM,
  ...RULES_ENDOCRINE_RHEUM
];`;

const restOfFile = lines.slice(suggestTestsIdx).join('\n');

fs.writeFileSync('patterns.js', imports + '\n' + newRules + '\n\n' + restOfFile, 'utf8');

console.log("FINAL SPLIT DONE");
