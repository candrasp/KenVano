import fs from 'fs';
const data = JSON.parse(fs.readFileSync('output.json', 'utf8'));
const heights = data.formats.map(f => f.height).filter(h => h !== null && h !== undefined);
const uniqueHeights = [...new Set(heights)];
console.log('Unique Heights:', uniqueHeights);
console.log('Number of formats:', data.formats.length);
