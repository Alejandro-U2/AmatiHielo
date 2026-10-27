import { supabaseAdmin } from '../backend/src/config/supabaseAdmin.js';

const CANDIDATE_TABLES = [
  'rol',
  'estado_usuario',
  'perfil',
  'departamento',
  'municipio',
  'catalogo_categoria_inventario',
  'estado_producto',
  'tipo_movimiento',
  'catalogo_motivos_merma',
  'producto',
  'proveedor',
  'movimiento_inventario',
  'entrada_inventario',
  'entrada_inventario_detalle',
  'catalogo_categoria_receta',
  'catalogo_presentacion_receta',
  'unidad_medida',
  'receta',
  'ingrediente_receta',
  'plan_produccion',
  'produccion',
  'metodo_pago',
  'cliente',
  'factura',
  'venta_pos',
  'venta_pos_detalle',
  'arqueo_caja',
  'historial_clima',
  'prediccion_demanda_historial',
  'prediccion_configuracion',
  'tabla_estructura',
  'campo_estructura',
  'configuracion_sistema',
  'sistema_backup_configuracion',
  'sistema_backup_historial',
  'auditoria_inventario_catalogo_estado',
  'auditoria_inventario_catalogo_tipo',
  'auditoria_inventario',
  'auditoria_inventario_detalle',
  'orden_compra',
  'orden_compra_detalle',
  'estado_orden_compra'
];

async function scanTables() {
  console.log('--- ESCANEANDO TABLAS ACTIVAS EN SUPABASE ---');
  const activeTables = [];

  for (const table of CANDIDATE_TABLES) {
    const { data, error } = await supabaseAdmin.from(table).select('*').limit(1);
    if (!error) {
      const sample = data?.[0] || {};
      const cols = Object.keys(sample);
      activeTables.push({ name: table, cols });
      console.log(`[EXISTE] ${table} (${cols.length > 0 ? cols.length + ' columnas detectadas' : '0 registros para sample'})`);
    } else {
      console.log(`[NO EXISTE] ${table}: ${error.message}`);
    }
  }

  console.log('\nTotal tablas activas:', activeTables.length);
}

scanTables().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
