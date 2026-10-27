import { supabaseAdmin } from '../backend/src/config/supabaseAdmin.js';

const tables = [
  'catalogo_auditoria_estado',
  'catalogo_auditoria_tipo_alcance',
  'config_umbrales',
  'configuracion_auditoria',
  'historial_prediccion_demanda',
  'motivo_merma',
  'sucursal',
  'campo_estructura',
  'entrada_inventario_detalle',
  'factura',
  'orden_compra',
  'orden_compra_detalle',
  'estado_orden_compra'
];

async function checkSpecialTables() {
  for (const t of tables) {
    const { data, error } = await supabaseAdmin.from(t).select('*').limit(1);
    if (error) {
      console.log(`[NO EXISTE o ERROR] ${t}: ${error.message}`);
    } else {
      console.log(`[EXISTE EN SUPABASE] ${t} - Filas retornadas: ${data?.length || 0}`);
    }
  }
}

checkSpecialTables().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
