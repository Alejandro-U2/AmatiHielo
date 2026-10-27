import { supabaseAdmin } from '../backend/src/config/supabaseAdmin.js';

async function listAllEstructuras() {
  const { data, error } = await supabaseAdmin.from('tabla_estructura').select('id, nombre_visible, nombre_interno, modulo, es_sistema').order('id', { ascending: true });
  if (error) console.error(error);
  else {
    console.log('Total tablas en tabla_estructura:', data.length);
    data.forEach(t => console.log(`- [${t.modulo}] ${t.nombre_interno} (${t.nombre_visible})`));
  }
}

listAllEstructuras().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
