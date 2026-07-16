/**
 * fix-uuid.js — replace the ESM-only `uuid` package with Node's built-in
 * crypto.randomUUID across the codebase.
 *
 * WHY: uuid v14 ships only ESM (`export` syntax). Node 22 can require() ESM,
 * so the server boots — but Jest's module compiler cannot parse it, so the
 * whole test suite fails with "Unexpected token 'export'". Node has had a
 * built-in, cryptographically strong UUID v4 generator since v16.17
 * (crypto.randomUUID), so the dependency is pure liability.
 *
 * THE TRICK: we alias the built-in AS uuidv4, so all 21 call sites
 * (`uuidv4()`) keep working with zero changes:
 *
 *   before: const { v4: uuidv4 } = require('uuid');
 *   after:  const { randomUUID: uuidv4 } = require('crypto');
 *
 * USAGE (from hospital-management-system/):
 *   node scripts/fix-uuid.js
 *   npm uninstall uuid
 *   npm test
 */

const fs = require('fs');
const path = require('path');

const OLD = "const { v4: uuidv4 } = require('uuid');";
const NEW = "const { randomUUID: uuidv4 } = require('crypto');";

let changed = 0;
let leftovers = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir)) {
    const p = path.join(dir, entry);
    const stat = fs.statSync(p);
    if (stat.isDirectory()) {
      if (entry !== 'node_modules' && entry !== '.git') walk(p);
    } else if (entry.endsWith('.js')) {
      let src = fs.readFileSync(p, 'utf8');
      if (src.includes(OLD)) {
        fs.writeFileSync(p, src.split(OLD).join(NEW));
        console.log('fixed:', p);
        changed += 1;
        src = fs.readFileSync(p, 'utf8');
      }
      // Catch any nonstandard uuid import the exact-match above missed.
      if (/require\(['"]uuid['"]\)/.test(src)) leftovers.push(p);
    }
  }
}

walk(path.join(process.cwd(), 'src'));
if (fs.existsSync(path.join(process.cwd(), 'tests'))) {
  walk(path.join(process.cwd(), 'tests'));
}

console.log(`\n${changed} file(s) updated.`);
if (leftovers.length) {
  console.log('\nWARNING — these files import uuid with a different pattern;');
  console.log('fix them by hand (use crypto.randomUUID):');
  leftovers.forEach((f) => console.log('  ', f));
  process.exit(1);
}
console.log('No uuid imports remain. Now run:  npm uninstall uuid  &&  npm test');