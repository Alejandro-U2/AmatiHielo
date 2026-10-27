import fs from 'fs';
import path from 'path';
import { supabaseAdmin } from '../backend/src/config/supabaseAdmin.js';

async function createSafetySnapshot() {
  const snapshotDir = path.resolve('data/backups/safety_snapshots');
  if (!fs.existsSync(snapshotDir)) {
    fs.mkdirSync(snapshotDir, { recursive: true });
  }

  const { data: recetas, error } = await supabaseAdmin
    .from('receta')
    .select('*')
    .order('id', { ascending: true });

  if (error) {
    console.error('Error fetching recipes:', error);
    process.exit(1);
  }

  const snapshotFile = path.join(snapshotDir, 'receta_pre_fase2_backup.json');
  fs.writeFileSync(snapshotFile, JSON.stringify(recetas, null, 2), 'utf8');

  console.log(`Snapshot creado exitosamente: ${snapshotFile}`);
  console.log(`Total registros respaldados: ${recetas.length}`);
  const stat = fs.statSync(snapshotFile);
  console.log(`Tamaño del archivo de respaldo: ${stat.size} bytes (${(stat.size / 1024 / 1024).toFixed(2)} MB)`);
}

createSafetySnapshot().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
