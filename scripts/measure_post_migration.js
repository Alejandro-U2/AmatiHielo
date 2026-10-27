import { supabaseAdmin } from '../backend/src/config/supabaseAdmin.js';

async function measureTableSize() {
  const { data: recetasFull } = await supabaseAdmin
    .from('receta')
    .select('id, codigo, nombre, categoria, presentacion, costo_electricidad, costo_mano_obra, costo_agua, costo_local, subtotal_materia_prima, costos_produccion, costo_total, precio_sugerido, created_at, updated_at, imagen_url');

  const fullBytes = Buffer.byteLength(JSON.stringify(recetasFull), 'utf8');

  console.log('--- POST-MIGRATION MEASUREMENTS ---');
  console.log('Total recetas:', recetasFull.length);
  console.log('Total payload of table WITH imagen_url (now public URLs):', fullBytes, 'bytes (' + (fullBytes / 1024).toFixed(2) + ' KB)');
  for (const r of recetasFull) {
    console.log(`- Receta ${r.id} (${r.codigo}): imagen_url = ${r.imagen_url || 'null'}`);
  }
}

measureTableSize().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
