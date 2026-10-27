import fs from 'fs';
import path from 'path';

function findFiles(dir, extensions) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const fullPath = path.join(dir, file);
    if (file === 'node_modules' || file === '.git' || file === 'dist' || file === 'build') continue;
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(findFiles(fullPath, extensions));
    } else {
      const ext = path.extname(file);
      if (extensions.includes(ext)) {
        results.push(fullPath);
      }
    }
  }
  return results;
}

const files = [
  ...findFiles('src', ['.js', '.jsx', '.ts', '.tsx']),
  ...findFiles('backend/src', ['.js', '.ts']),
];

const tableUsage = new Map();

for (const f of files) {
  const content = fs.readFileSync(f, 'utf8');
  // Match .from('table_name') or .from("table_name")
  const regex = /\.from\(['"]([a-zA-Z0-9_]+)['"]\)/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    const table = match[1];
    if (!tableUsage.has(table)) {
      tableUsage.set(table, new Set());
    }
    tableUsage.get(table).add(path.relative('.', f).replace(/\\/g, '/'));
  }
}

const sortedTables = Array.from(tableUsage.keys()).sort();
console.log(`Total tablas referenciadas en código: ${sortedTables.length}\n`);

for (const t of sortedTables) {
  const filesUsing = Array.from(tableUsage.get(t));
  console.log(`Tabla: ${t}`);
  console.log(`  Archivos que la consultan (${filesUsing.length}):`);
  filesUsing.slice(0, 5).forEach(f => console.log(`    - ${f}`));
  if (filesUsing.length > 5) {
    console.log(`    ... y ${filesUsing.length - 5} archivos más`);
  }
}
