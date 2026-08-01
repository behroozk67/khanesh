const fs = require('fs'); 
const content = fs.readFileSync('patterns.js', 'utf8');
const ids = [...content.matchAll(/id:\s*['"]([^'"]+)['"]/g)].map(m => m[1]);
console.log(ids.join('\n'));
