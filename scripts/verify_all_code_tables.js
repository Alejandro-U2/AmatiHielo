import { supabaseAdmin } from '../backend/src/config/supabaseAdmin.js';

const CODE_TABLES = [
  'arqueo_caja',
  'auditoria_inventario',
  'auditoria_inventario_detalle',
  'catalogo_auditoria_estado',
  'catalogo_auditoria_tipo_alcance',
  'catalogo_categoria_inventario',
  'catalogo_categoria_receta',
  'catalogo_presentacion_receta',
  'cliente',
  'config_umbrales',
  'configuracion_auditoria',
  'departamento',
  'entrada_inventario',
  'entrada_inventario_detalle',
  'estado_orden_compra',
  'estado_producto',
  'estado_usuario',
  'factura',
  'historial_clima',
  'historial_prediccion_demanda',
  'ingrediente_receta',
  'metodo_pago',
  'motivo_merma',
  'movimiento_inventario',
  'municipio',
  'orden_compra',
  'orden_compra_detalle',
  'perfil',
  'plan_produccion',
  'produccion',
  'producto',
  'proveedor',
  'receta',
  'rol',
  'sistema_backup_config',
  'sistema_backup_historial',
  'sucursal',
  'tabla_estructura',
  'campo_estructura',
  'tipo_movimiento',
  'unidad_medida',
  'venta_pos',
  'venta_pos_detalle'
];

async function verifyAllCodeTables() {
  console.log(`Verificando ${CODE_TABLES.length} tablas del sistema contra Supabase...\n`);
  const missing = [];
  const existing = [];

  for (const t of CODE_TABLES) {
    const { data, error } = await supabaseAdmin.from(t).select('*').limit(1);
    if (error) {
      console.log(`❌ FALTA O ERROR: ${t} -> ${error.message}`);
      missing.push({ table: t, error: error.message });
    } else {
      console.log(`✅ OK: ${t}`);
      existing.push(t);
    }
  }

  console.log('\n--- RESUMEN ---');
  console.log(`Total verificadas: ${CODE_TABLES.length}`);
  console.log(`Tablas presentes y operativas: ${existing.length}`);
  console.log(`Tablas faltantes: ${missing.length}`);
}

verifyAllCodeTables().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
