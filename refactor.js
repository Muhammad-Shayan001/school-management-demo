import fs from 'fs';

let content = fs.readFileSync('server.ts', 'utf8');

// Replace synchronous route handlers with async
content = content.replace(/app\.(post|put|delete)\('([^']+)',\s*\(req,\s*res\)\s*=>\s*\{/g, 'app.$1(\'$2\', async (req, res) => {');

// Replace writeDatabase(db) with await writeDatabase(db)
content = content.replace(/writeDatabase\((.+?)\);/g, 'await writeDatabase($1);');

fs.writeFileSync('server.ts', content, 'utf8');
console.log('Refactored server.ts');
