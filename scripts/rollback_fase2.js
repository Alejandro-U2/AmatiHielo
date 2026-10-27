import fs from 'fs';
import path from 'path';
import { supabaseAdmin } from '../backend/src/config/supabaseAdmin.js';

async function rollbackFase2() {
  console.log('Iniciando rollback de Fase 2 (Restauración de Base64 en receta.imagen_url)...');
  const backupFile = path.resolve('data/backups/safety_snapshots/receta_pre_fase2_backup.json');

  if (!fs.existsSync(backupFile)) {
    throw new Error(`Archivo de respaldo no encontrado: ${backupFile}`);
  }

  const snapshot = JSON.parse(fs.readFileSync(backupFile, 'utf8'));
  console.log(`Leídos ${snapshot.length} registros del snapshot.`);

  for (const r of snapshot) {
    console.log(`Restaurando receta ID ${r.id} (${r.codigo} - ${r.nombre})...`);
    const { error } = await supabaseAdmin
      .from('receta')
      .update({ imagen_url: r.imagen_url })
      .eq('id', r.id);

    if (error) {
      console.error(`Error al restaurar receta ID ${r.id}:`, error);
    } else {
      console.log(`Receta ID ${r.id} restaurada correctamente.`);
    }
  }

  console.log('Rollback de datos completado.');
}

rollbackFase2().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
