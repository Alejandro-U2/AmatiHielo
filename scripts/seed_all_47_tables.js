import fs from 'fs';
import path from 'path';
import { supabaseAdmin } from '../backend/src/config/supabaseAdmin.js';

// Parse columns from database_schema_backup_amati_hielo.sql
const schemaPath = path.resolve('data/backups/schema_dumps/database_schema_backup_amati_hielo.sql');
const sql = fs.readFileSync(schemaPath, 'utf8');

const tableRegex = /create table if not exists public\.([a-zA-Z0-9_]+)\s*\(([\s\S]*?)\n\);/g;
let match;
const schemaColumns = {};

function mapSqlType(rawType) {
  const t = rawType.toLowerCase();
  if (t.includes('int')) return 'integer';
  if (t.includes('numeric') || t.includes('decimal')) return 'numeric';
  if (t.includes('bool')) return 'boolean';
  if (t.includes('date')) return 'date';
  if (t.includes('timestamp') || t.includes('timestamptz')) return 'timestamp';
  return 'text';
}

while ((match = tableRegex.exec(sql)) !== null) {
  const tableName = match[1];
  const body = match[2];
  const lines = body.split('\n').map(l => l.trim()).filter(l => 
    l && !l.startsWith('--') && 
    !l.startsWith('unique') && 
    !l.startsWith('check') && 
    !l.startsWith('constraint') && 
    !l.startsWith('foreign key') && 
    !l.startsWith('primary key')
  );
  
  const columns = [];
  let order = 1;
  for (const line of lines) {
    const colMatch = line.match(/^([a-zA-Z0-9_]+)\s+([a-zA-Z0-9_]+(\(.*?\))?)/);
    if (colMatch) {
      const colName = colMatch[1];
      const rawType = colMatch[2];
      const isRequired = line.includes('not null');
      const isUnique = line.includes('unique') || line.includes('primary key');
      columns.push({
        nombre: colName,
        tipo_dato: mapSqlType(rawType),
        descripcion: `Campo ${colName}`,
        requerido: isRequired,
        unico: isUnique,
        orden: order++,
      });
    }
  }
  schemaColumns[tableName] = columns;
}

export const ALL_47_TABLES_META = [
  // 1. Seguridad y Acceso
  { nombre_interno: 'perfil', nombre_visible: 'Perfiles de Usuario', modulo: 'Seguridad y Acceso', descripcion: 'Usuarios, roles y credenciales del personal' },
  { nombre_interno: 'rol', nombre_visible: 'Roles de Usuario', modulo: 'Seguridad y Acceso', descripcion: 'Roles de acceso y niveles de permiso' },
  { nombre_interno: 'estado_usuario', nombre_visible: 'Estados de Usuario', modulo: 'Seguridad y Acceso', descripcion: 'Estados de cuentas de usuario (Activo, Inactivo, etc.)' },
  
  // 2. Inventarios
  { nombre_interno: 'producto', nombre_visible: 'Productos e Insumos', modulo: 'Inventarios', descripcion: 'Materias primas, suministros y bolsas de hielo' },
  { nombre_interno: 'proveedor', nombre_visible: 'Proveedores', modulo: 'Inventarios', descripcion: 'Directorio de proveedores registrados' },
  { nombre_interno: 'movimiento_inventario', nombre_visible: 'Movimientos de Inventario', modulo: 'Inventarios', descripcion: 'Historial de entradas, salidas y mermas de almacén' },
  { nombre_interno: 'entrada_inventario', nombre_visible: 'Entradas de Inventario', modulo: 'Inventarios', descripcion: 'Cabecera de facturas de compras de materias primas' },
  { nombre_interno: 'entrada_inventario_detalle', nombre_visible: 'Detalle de Entradas', modulo: 'Inventarios', descripcion: 'Productos individuales recibidos por compra' },
  { nombre_interno: 'catalogo_categoria_inventario', nombre_visible: 'Categorías de Inventario', modulo: 'Inventarios', descripcion: 'Clasificación de productos e insumos' },
  { nombre_interno: 'tipo_movimiento', nombre_visible: 'Tipos de Movimiento', modulo: 'Inventarios', descripcion: 'Entradas, Salidas, Mermas y Ajustes' },
  { nombre_interno: 'motivo_merma', nombre_visible: 'Motivos de Merma', modulo: 'Inventarios', descripcion: 'Causas justificadas de pérdida o merma' },
  { nombre_interno: 'estado_producto', nombre_visible: 'Estados de Producto', modulo: 'Inventarios', descripcion: 'Catálogo de estados de productos (Activo, Inactivo)' },
  { nombre_interno: 'unidad_medida', nombre_visible: 'Unidades de Medida', modulo: 'Inventarios', descripcion: 'Unidades para control de inventario y recetas' },
  { nombre_interno: 'unidad_compra', nombre_visible: 'Unidades de Compra', modulo: 'Inventarios', descripcion: 'Presentaciones de adquisición de proveedores' },
  { nombre_interno: 'auditoria_inventario', nombre_visible: 'Auditorías de Inventario', modulo: 'Inventarios', descripcion: 'Toma física y arqueo de existencias en almacén' },
  { nombre_interno: 'auditoria_inventario_detalle', nombre_visible: 'Detalle de Auditorías', modulo: 'Inventarios', descripcion: 'Conteos físicos por producto y discrepancias' },
  { nombre_interno: 'catalogo_auditoria_estado', nombre_visible: 'Estados de Auditoría', modulo: 'Inventarios', descripcion: 'Catálogo de estados de auditorías físicas' },
  { nombre_interno: 'catalogo_auditoria_tipo_alcance', nombre_visible: 'Tipos de Alcance de Auditoría', modulo: 'Inventarios', descripcion: 'Alcances de auditoría (Todo, categoría, específico)' },
  { nombre_interno: 'configuracion_auditoria', nombre_visible: 'Configuración de Auditorías', modulo: 'Inventarios', descripcion: 'Parámetros y tolerancias de auditorías de inventario' },

  // 3. Producción y Recetas
  { nombre_interno: 'receta', nombre_visible: 'Recetas de Venta', modulo: 'Producción y Recetas', descripcion: 'Catálogo de recetas y productos finales de venta' },
  { nombre_interno: 'ingrediente_receta', nombre_visible: 'Ingredientes de Receta (BOM)', modulo: 'Producción y Recetas', descripcion: 'Lista de materiales e insumos por receta' },
  { nombre_interno: 'plan_produccion', nombre_visible: 'Planes de Producción', modulo: 'Producción y Recetas', descripcion: 'Planeación de lotes de producción' },
  { nombre_interno: 'produccion', nombre_visible: 'Lotes de Producción', modulo: 'Producción y Recetas', descripcion: 'Registro de lotes producidos y ejecutados' },
  { nombre_interno: 'catalogo_categoria_receta', nombre_visible: 'Categorías de Recetas', modulo: 'Producción y Recetas', descripcion: 'Clasificación de recetas fabricadas' },
  { nombre_interno: 'catalogo_presentacion_receta', nombre_visible: 'Presentaciones de Recetas', modulo: 'Producción y Recetas', descripcion: 'Formatos de empaque comercial' },

  // 4. Punto de Venta
  { nombre_interno: 'venta_pos', nombre_visible: 'Ventas POS', modulo: 'Punto de Venta', descripcion: 'Registro de transacciones y tickets cobrados en caja' },
  { nombre_interno: 'venta_pos_detalle', nombre_visible: 'Detalle de Ventas POS', modulo: 'Punto de Venta', descripcion: 'Renglones y productos vendidos por cada ticket' },
  { nombre_interno: 'metodo_pago', nombre_visible: 'Métodos de Pago', modulo: 'Punto de Venta', descripcion: 'Efectivo, transferencia bancaria, tarjetas' },
  { nombre_interno: 'cliente', nombre_visible: 'Clientes', modulo: 'Punto de Venta', descripcion: 'Clientes frecuentes y datos para facturación' },
  { nombre_interno: 'factura', nombre_visible: 'Facturas FEL', modulo: 'Punto de Venta', descripcion: 'Registro de facturación electrónica y documentos tributarios' },
  { nombre_interno: 'arqueo_caja', nombre_visible: 'Arqueos de Caja', modulo: 'Punto de Venta', descripcion: 'Cierres de caja y conciliación de efectivo semanal' },

  // 5. Compras
  { nombre_interno: 'orden_compra', nombre_visible: 'Órdenes de Compra', modulo: 'Compras', descripcion: 'Cabecera de pedidos de compra a proveedores' },
  { nombre_interno: 'orden_compra_detalle', nombre_visible: 'Detalle de Órdenes de Compra', modulo: 'Compras', descripcion: 'Líneas y productos pedidos en órdenes de compra' },
  { nombre_interno: 'estado_orden_compra', nombre_visible: 'Estados de Órdenes de Compra', modulo: 'Compras', descripcion: 'Catálogo de estados de órdenes de compra' },

  // 6. IA Predictiva
  { nombre_interno: 'historial_clima', nombre_visible: 'Historial Climático', modulo: 'IA Predictiva', descripcion: 'Condiciones meteorológicas para el pronóstico' },
  { nombre_interno: 'historial_prediccion_demanda', nombre_visible: 'Predicciones de Demanda', modulo: 'IA Predictiva', descripcion: 'Estimaciones de demanda calculadas por IA y reglas' },

  // 7. Configuración y Geografía
  { nombre_interno: 'departamento', nombre_visible: 'Departamentos (Guatemala)', modulo: 'Configuración', descripcion: 'Departamentos geográficos de Guatemala' },
  { nombre_interno: 'municipio', nombre_visible: 'Municipios (Guatemala)', modulo: 'Configuración', descripcion: 'Municipios geográficos por departamento' },
  { nombre_interno: 'sucursal', nombre_visible: 'Sucursales', modulo: 'Configuración', descripcion: 'Plantas y locales de AMATI HIELO' },
  { nombre_interno: 'config_empresa', nombre_visible: 'Datos de la Empresa', modulo: 'Configuración', descripcion: 'Razón social, NIT, dirección y contacto' },
  { nombre_interno: 'config_impuestos', nombre_visible: 'Configuración de Impuestos', modulo: 'Configuración', descripcion: 'Parámetros del IVA y retenciones' },
  { nombre_interno: 'config_notificaciones', nombre_visible: 'Configuración de Notificaciones', modulo: 'Configuración', descripcion: 'Parámetros de alertas y notificaciones' },
  { nombre_interno: 'config_umbrales', nombre_visible: 'Configuración de Umbrales', modulo: 'Configuración', descripcion: 'Umbrales mínimos de stock y límites operativos' },
  { nombre_interno: 'sistema_backup_config', nombre_visible: 'Configuración de Respaldos', modulo: 'Configuración', descripcion: 'Frecuencia y políticas de retención de respaldos' },
  { nombre_interno: 'sistema_backup_historial', nombre_visible: 'Historial de Respaldos', modulo: 'Configuración', descripcion: 'Bitácora y archivos de respaldos generados' },

  // 8. Mantenimiento y Diccionario
  { nombre_interno: 'tabla_estructura', nombre_visible: 'Catálogo de Tablas del Sistema', modulo: 'Mantenimiento y Diccionario', descripcion: 'Metadatos de tablas del diccionario de datos de AMATI HIELO' },
  { nombre_interno: 'campo_estructura', nombre_visible: 'Catálogo de Campos del Sistema', modulo: 'Mantenimiento y Diccionario', descripcion: 'Metadatos de atributos y columnas de cada tabla' }
];

export async function syncAll47Tables() {
  console.log(`=== REGISTRANDO TODAS LAS ${ALL_47_TABLES_META.length} TABLAS EN EL DICCIONARIO ===`);

  for (const meta of ALL_47_TABLES_META) {
    try {
      const { data: existingTabla } = await supabaseAdmin
        .from('tabla_estructura')
        .select('id')
        .eq('nombre_interno', meta.nombre_interno)
        .maybeSingle();

      let tablaId = existingTabla?.id;

      if (!tablaId) {
        const { data: inserted, error: insertErr } = await supabaseAdmin
          .from('tabla_estructura')
          .insert({
            nombre_visible: meta.nombre_visible,
            nombre_interno: meta.nombre_interno,
            descripcion: meta.descripcion,
            modulo: meta.modulo,
            es_sistema: true
          })
          .select('id')
          .single();

        if (insertErr) {
          console.error(`❌ Error insertando tabla ${meta.nombre_interno}:`, insertErr.message);
          continue;
        }
        tablaId = inserted.id;
        console.log(`✅ [NUEVA TABLA] ${meta.nombre_visible} (${meta.nombre_interno}) -> ID ${tablaId}`);
      } else {
        await supabaseAdmin
          .from('tabla_estructura')
          .update({
            nombre_visible: meta.nombre_visible,
            descripcion: meta.descripcion,
            modulo: meta.modulo,
            es_sistema: true
          })
          .eq('id', tablaId);
        console.log(`🔄 [ACTUALIZADA] ${meta.nombre_visible} (${meta.nombre_interno}) -> ID ${tablaId}`);
      }

      const cols = schemaColumns[meta.nombre_interno] || [];
      if (cols.length > 0) {
        await supabaseAdmin.from('campo_estructura').delete().eq('tabla_id', tablaId);

        const camposPayload = cols.map(c => ({
          tabla_id: tablaId,
          nombre: c.nombre,
          tipo_dato: c.tipo_dato,
          descripcion: c.descripcion,
          requerido: c.requerido,
          unico: c.unico,
          orden: c.orden
        }));

        const { error: cErr } = await supabaseAdmin.from('campo_estructura').insert(camposPayload);
        if (cErr) {
          console.error(`   ⚠️ Error insertando campos de ${meta.nombre_interno}:`, cErr.message);
        } else {
          console.log(`   └─ ${camposPayload.length} campos registrados.`);
        }
      }
    } catch (e) {
      console.error(`Excepción procesando ${meta.nombre_interno}:`, e.message);
    }
  }

  const { data: finalTablas } = await supabaseAdmin.from('tabla_estructura').select('id, nombre_visible, modulo').order('id', { ascending: true });
  const { data: finalCampos } = await supabaseAdmin.from('campo_estructura').select('id');
  console.log(`\n🎉 RESULTADO FINAL: ${finalTablas?.length || 0} de 47 tablas registradas con ${finalCampos?.length || 0} campos en total.`);
}

if (process.argv[1] && process.argv[1].endsWith('seed_all_47_tables.js')) {
  syncAll47Tables().then(() => process.exit(0)).catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
