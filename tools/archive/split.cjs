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
walk.simple(ast, {
  VariableDeclarator(node) {
    if (node.id.name === 'RULES' && node.init && node.init.type === 'ArrayExpression') {
      rulesArrayNode = node.init;
    }
  }
});

if (!rulesArrayNode) {
  console.error("Could not find RULES array");
  process.exit(1);
}

const map = {
  hcv_screen_reactive: "infectious", hbv_screen_reactive: "infectious", hiv_screen_reactive: "infectious", brucella_active: "infectious", brucella_wright_only: "infectious", viral_lymphocytosis: "infectious", crp_pos_esr_normal: "infectious", crp_elevated: "infectious", esr_elevated: "infectious", sepsis_markers: "infectious",
  uti_pattern: "nephrology", bacteriuria_no_inflammation: "nephrology", proteinuria_pattern: "nephrology", hematuria_pattern: "nephrology", glycosuria_pattern: "nephrology", ketonuria_pattern: "nephrology", kidney: "nephrology", albuminuria_pattern: "nephrology", rhabdomyolysis_pattern: "nephrology", nephrotic_pattern: "nephrology", glomerulonephritis_pattern: "nephrology",
  extreme_leukocytosis: "hematology", leukocytosis: "hematology", leukopenia: "hematology", severe_neutropenia: "hematology", severe_thrombocytopenia: "hematology", thrombocytopenia: "hematology", mild_thrombocytopenia: "hematology", thrombocytosis: "hematology", pancytopenia: "hematology", thal_trait_no_anemia: "hematology", erythrocytosis: "hematology", macrocytic_anemia: "hematology", microcytic_anemia: "hematology", normocytic_anemia: "hematology", iron_deficiency_panel: "hematology", anemia_chronic_disease: "hematology", hemolysis_pattern: "hematology", dic_pattern: "hematology", d_dimer_elevated: "hematology", coagulation_abnormal: "hematology",
  rf_positive: "endocrine_rheum", thyroid: "endocrine_rheum", hypothyroid_dyslipidemia_link: "endocrine_rheum", vitamin_d_abnormal: "endocrine_rheum"
};

const categorized = {
  infectious: [], nephrology: [], hematology: [], endocrine_rheum: [], biochem: []
};

// Also keep track of comments before each element
for (let i = 0; i < rulesArrayNode.elements.length; i++) {
  const el = rulesArrayNode.elements[i];
  
  // Try to find the rule ID
  let id = null;
  for (const prop of el.properties) {
    if (prop.key && prop.key.name === 'id') {
      id = prop.value.value;
      break;
    }
  }

  const category = map[id] || 'biochem';
  
  // Find start and end. Include preceding comments if possible.
  let startIdx = el.start;
  let endIdx = el.end;
  
  // Naive but works: search backwards for previous element's end, or array start
  let prevEnd = i === 0 ? rulesArrayNode.start + 1 : rulesArrayNode.elements[i-1].end;
  // Get text between previous element and this one (which contains comments)
  const prefix = code.slice(prevEnd, startIdx);
  
  categorized[category].push(prefix + code.slice(startIdx, endIdx));
}

for (const [cat, rules] of Object.entries(categorized)) {
  const fileContent = `import { serologyReactive, qualPositive, qualValue, titreFa, hasInflammation, whoFerritinThreshold, whoInflamIronDeficiency, urinePositive, urineCellCount, urineGrade, isNephrotic, isGlomerulonephritis, isDIC, val, rankOf } from "./patterns_utils.js";\nimport { faName } from "./names.js";\nimport { preanalyticalCaveats, attachPreanalytical } from "./preanalytical.js";\nimport { repeatDeltaFa } from "./biovar.js";\n\nexport const RULES_${cat.toUpperCase()} = [${rules.join(',')}];\n`;
  fs.writeFileSync(`patterns_${cat}.js`, fileContent, 'utf8');
}

// Now generate patterns_utils.js by taking lines 1 to rulesArrayNode.start
// Wait, we need to extract everything before "export const RULES = ["
const utilsEnd = code.indexOf('export const RULES = [');
const utilsContent = code.slice(0, utilsEnd);
const exportsLine = `\nexport { serologyReactive, qualPositive, qualValue, titreFa, hasInflammation, whoFerritinThreshold, whoInflamIronDeficiency, urinePositive, urineCellCount, urineGrade, isNephrotic, isGlomerulonephritis, isDIC, val, rankOf, has };\n`;
fs.writeFileSync('patterns_utils.js', utilsContent + exportsLine, 'utf8');

// The rest of patterns.js (SUGGEST_TESTS, runPatterns, etc) is from rulesArrayNode.end + 1
// Wait, there is `];` after the array
let restStart = code.indexOf('];', rulesArrayNode.end);
if (restStart !== -1) restStart += 2;
else restStart = rulesArrayNode.end;

const restContent = code.slice(restStart);
const mainImports = `import { RULES_INFECTIOUS } from "./patterns_infectious.js";
import { RULES_NEPHROLOGY } from "./patterns_nephrology.js";
import { RULES_HEMATOLOGY } from "./patterns_hematology.js";
import { RULES_BIOCHEM } from "./patterns_biochem.js";
import { RULES_ENDOCRINE_RHEUM } from "./patterns_endocrine_rheum.js";
import { rankOf } from "./patterns_utils.js";

export const RULES = [
  ...RULES_INFECTIOUS,
  ...RULES_NEPHROLOGY,
  ...RULES_HEMATOLOGY,
  ...RULES_BIOCHEM,
  ...RULES_ENDOCRINE_RHEUM
];
`;

fs.writeFileSync('patterns.js', mainImports + restContent, 'utf8');
console.log('Done splitting!');
