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

const rpcCalls = [];

for (const f of files) {
  const content = fs.readFileSync(f, 'utf8');
  const regex = /\.rpc\(['"]([a-zA-Z0-9_]+)['"]/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    rpcCalls.push({
      rpc: match[1],
      file: path.relative('.', f).replace(/\\/g, '/'),
    });
  }
}

console.log('RPC calls found:', rpcCalls.length);
const grouped = {};
for (const item of rpcCalls) {
  if (!grouped[item.rpc]) grouped[item.rpc] = [];
  grouped[item.rpc].push(item.file);
}

for (const [rpc, callingFiles] of Object.entries(grouped)) {
  console.log(`\nRPC: ${rpc}`);
  callingFiles.forEach(f => console.log(`  - ${f}`));
}
