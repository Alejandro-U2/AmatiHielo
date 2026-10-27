import fs from 'fs';
import path from 'path';

const migrationsDir = 'supabase/migrations';
const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql'));

const tableCreatedInMigrations = new Map();

for (const f of files) {
  const content = fs.readFileSync(path.join(migrationsDir, f), 'utf8');
  const regex = /create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?([a-zA-Z0-9_]+)/gi;
  let match;
  while ((match = regex.exec(content)) !== null) {
    const tableName = match[1].toLowerCase();
    if (!tableCreatedInMigrations.has(tableName)) {
      tableCreatedInMigrations.set(tableName, []);
    }
    tableCreatedInMigrations.get(tableName).push(f);
  }
}

console.log('Total tablas creadas en migraciones SQL:', tableCreatedInMigrations.size);
for (const [tbl, migs] of tableCreatedInMigrations.entries()) {
  console.log(`- ${tbl} (creada en: ${migs.join(', ')})`);
}
