const fs = require('fs');

const code = fs.readFileSync('patterns.js', 'utf8');
const lines = code.split('\n');

let startIdx = -1;
let endIdx = -1;

for (let i = 0; i < lines.length; i++) {
  if (lines[i].trim() === 'export const RULES = [') {
    startIdx = i;
  }
  // The RULES array ends at a line that is precisely `];`
  if (startIdx !== -1 && i > startIdx && lines[i].trim() === '];') {
    endIdx = i;
    break;
  }
}

if (startIdx === -1 || endIdx === -1) {
  console.error("Could not find RULES boundaries");
  process.exit(1);
}

const beforeRules = lines.slice(0, startIdx).join('\n');
const afterRules = lines.slice(endIdx + 1).join('\n');

const imports = `import { RULES_INFECTIOUS } from "./patterns_infectious.js";
import { RULES_NEPHROLOGY } from "./patterns_nephrology.js";
import { RULES_HEMATOLOGY } from "./patterns_hematology.js";
import { RULES_BIOCHEM } from "./patterns_biochem.js";
import { RULES_ENDOCRINE_RHEUM } from "./patterns_endocrine_rheum.js";\n`;

const newRules = `export const RULES = [
  ...RULES_INFECTIOUS,
  ...RULES_NEPHROLOGY,
  ...RULES_HEMATOLOGY,
  ...RULES_BIOCHEM,
  ...RULES_ENDOCRINE_RHEUM
];`;

fs.writeFileSync('patterns.js', imports + beforeRules + '\n' + newRules + '\n' + afterRules, 'utf8');

console.log("Safe replacement complete.");
