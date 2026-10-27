import fs from 'fs';

const sql = fs.readFileSync('data/backups/schema_dumps/database_schema_backup_amati_hielo.sql', 'utf8');
const lines = sql.split('\n');
const declared = new Set(['users']); // auth.users
let orderIssues = [];

lines.forEach((line, i) => {
  const tableMatch = line.match(/create table if not exists public\.([a-zA-Z0-9_]+)/);
  if (tableMatch) {
    declared.add(tableMatch[1]);
  }
  const refMatch = line.match(/references public\.([a-zA-Z0-9_]+)/);
  if (refMatch) {
    const referenced = refMatch[1];
    if (!declared.has(referenced)) {
      orderIssues.push(`Line ${i + 1}: references "${referenced}" before it was created!`);
    }
  }
});

console.log('Order issues count:', orderIssues.length);
if (orderIssues.length > 0) {
  console.log(orderIssues);
} else {
  console.log('Topological table creation order is 100% PERFECT!');
}
