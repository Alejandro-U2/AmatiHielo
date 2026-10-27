import fs from 'fs';
import path from 'path';
import { supabaseAdmin } from '../backend/src/config/supabaseAdmin.js';

const KNOWN_TABLES = [
  'rol',
  'estado_usuario',
  'departamento',
  'municipio',
  'catalogo_categoria_inventario',
  'estado_producto',
  'tipo_movimiento',
  'catalogo_categoria_receta',
  'catalogo_presentacion_receta',
  'unidad_medida',
  'metodo_pago',
  'estado_orden_compra',
  'perfil',
  'producto',
  'proveedor',
  'cliente',
  'receta',
  'ingrediente_receta',
  'plan_produccion',
  'produccion',
  'movimiento_inventario',
  'entrada_inventario',
  'entrada_inventario_detalle',
  'orden_compra',
  'orden_compra_detalle',
  'venta_pos',
  'venta_pos_detalle',
  'factura',
  'arqueo_caja',
  'auditoria_inventario',
  'auditoria_inventario_detalle',
  'historial_clima',
  'tabla_estructura',
  'campo_estructura',
  'sistema_backup_config',
  'sistema_backup_historial'
];

async function inspectColumns() {
  const tableColumns = {};
  for (const tbl of KNOWN_TABLES) {
    const { data, error } = await supabaseAdmin.from(tbl).select('*').limit(1);
    if (!error && data && data.length > 0) {
      tableColumns[tbl] = Object.keys(data[0]);
    } else {
      tableColumns[tbl] = [];
    }
  }
  console.log(JSON.stringify(tableColumns, null, 2));
}

inspectColumns().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
