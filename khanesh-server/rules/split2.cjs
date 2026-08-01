const fs = require('fs');
const acorn = require('acorn');
const walk = require('acorn-walk');

const code = fs.readFileSync('patterns.js', 'utf8');

const ast = acorn.parse(code, {
  ecmaVersion: 2022,
  sourceType: 'module',
  locations: true,
  ranges: true,
});

let rulesArrayNode = null;
let rulesDeclStart = null;
walk.simple(ast, {
  VariableDeclarator(node) {
    if (node.id.name === 'RULES' && node.init && node.init.type === 'ArrayExpression') {
      rulesArrayNode = node.init;
    }
  },
  ExportNamedDeclaration(node) {
    if (node.declaration && node.declaration.declarations && node.declaration.declarations[0].id.name === 'RULES') {
       rulesDeclStart = node.start;
    }
  }
});

const map = {
  hcv_screen_reactive: "infectious", hbv_screen_reactive: "infectious", hiv_screen_reactive: "infectious", brucella_active: "infectious", brucella_wright_only: "infectious", viral_lymphocytosis: "infectious", crp_pos_esr_normal: "infectious", crp_elevated: "infectious", esr_elevated: "infectious", sepsis_markers: "infectious",
  uti_pattern: "nephrology", bacteriuria_no_inflammation: "nephrology", proteinuria_pattern: "nephrology", hematuria_pattern: "nephrology", glycosuria_pattern: "nephrology", ketonuria_pattern: "nephrology", kidney: "nephrology", albuminuria_pattern: "nephrology", rhabdomyolysis_pattern: "nephrology", nephrotic_pattern: "nephrology", glomerulonephritis_pattern: "nephrology",
  extreme_leukocytosis: "hematology", leukocytosis: "hematology", leukopenia: "hematology", severe_neutropenia: "hematology", severe_thrombocytopenia: "hematology", thrombocytopenia: "hematology", mild_thrombocytopenia: "hematology", thrombocytosis: "hematology", pancytopenia: "hematology", thal_trait_no_anemia: "hematology", erythrocytosis: "hematology", macrocytic_anemia: "hematology", microcytic_anemia: "hematology", normocytic_anemia: "hematology", iron_deficiency_panel: "hematology", anemia_chronic_disease: "hematology", hemolysis_pattern: "hematology", dic_pattern: "hematology", d_dimer_elevated: "hematology", coagulation_abnormal: "hematology",
  rf_positive: "endocrine_rheum", thyroid: "endocrine_rheum", hypothyroid_dyslipidemia_link: "endocrine_rheum", vitamin_d_abnormal: "endocrine_rheum"
};

const categorized = { infectious: [], nephrology: [], hematology: [], endocrine_rheum: [], biochem: [] };

for (let i = 0; i < rulesArrayNode.elements.length; i++) {
  const el = rulesArrayNode.elements[i];
  let id = null;
  for (const prop of el.properties) {
    if (prop.key && prop.key.name === 'id') {
      id = prop.value.value;
      break;
    }
  }
  const category = map[id] || 'biochem';
  let startIdx = el.start;
  let endIdx = el.end;
  let prevEnd = i === 0 ? rulesArrayNode.start + 1 : rulesArrayNode.elements[i-1].end;
  const prefix = code.slice(prevEnd, startIdx);
  categorized[category].push(prefix + code.slice(startIdx, endIdx));
}

for (const [cat, rules] of Object.entries(categorized)) {
  const fileContent = `import { serologyReactive, qualPositive, qualValue, titreFa, hasInflammation, whoFerritinThreshold, whoInflamIronDeficiency, urinePositive, urineCellCount, urineGrade, isNephrotic, isGlomerulonephritis, isDIC, val, rankOf, has } from "./patterns_utils.js";\nimport { faName } from "./names.js";\nimport { preanalyticalCaveats, attachPreanalytical } from "./preanalytical.js";\nimport { repeatDeltaFa } from "./biovar.js";\n\nexport const RULES_${cat.toUpperCase()} = [${rules.join(',')}];\n`;
  fs.writeFileSync(`patterns_${cat}.js`, fileContent, 'utf8');
}

// NOW safely create patterns_utils.js and patterns.js without circular deps
// All helpers are defined before RULES. 
// EXCEPT val and rankOf, which are defined AFTER RULES.
// We must move val and rankOf and LEVEL_RANK to patterns_utils.js.

// Find LEVEL_RANK, rankOf, val definitions in the AST
let levelRankStart = code.indexOf('const LEVEL_RANK');
let rankOfStart = code.indexOf('function rankOf(g)');
let valStart = code.indexOf('function val(e)');
let valEnd = code.indexOf('return t;\n}', valStart) + 12;

let utilsContent = code.slice(0, rulesDeclStart) + '\n' + code.slice(levelRankStart, valEnd);
utilsContent += `\nexport { serologyReactive, qualPositive, qualValue, titreFa, hasInflammation, whoFerritinThreshold, whoInflamIronDeficiency, urinePositive, urineCellCount, urineGrade, isNephrotic, isGlomerulonephritis, isDIC, val, rankOf, has };\n`;
fs.writeFileSync('patterns_utils.js', utilsContent, 'utf8');

// Now patterns.js
const imports = `import { RULES_INFECTIOUS } from "./patterns_infectious.js";
import { RULES_NEPHROLOGY } from "./patterns_nephrology.js";
import { RULES_HEMATOLOGY } from "./patterns_hematology.js";
import { RULES_BIOCHEM } from "./patterns_biochem.js";
import { RULES_ENDOCRINE_RHEUM } from "./patterns_endocrine_rheum.js";
import { rankOf } from "./patterns_utils.js";\n\n`;

// What is after val?
const afterVal = code.slice(valEnd);
const newRules = `export const RULES = [
  ...RULES_INFECTIOUS,
  ...RULES_NEPHROLOGY,
  ...RULES_HEMATOLOGY,
  ...RULES_BIOCHEM,
  ...RULES_ENDOCRINE_RHEUM
];\n`;

fs.writeFileSync('patterns.js', imports + newRules + afterVal, 'utf8');

console.log("Done splitting safely!");
