import fs from 'fs';

const depSql = fs.readFileSync('supabase/migrations/024_departamentos_municipios.sql', 'utf8');
const depLines = depSql.split('\n');
const depMunicipioBlock = depLines.slice(29, 413).join('\n');

const additionalSeeds = `
-- Departamentos y Municipios de Guatemala (INE)
${depMunicipioBlock}

-- Estados de Producto
insert into public.estado_producto (nombre, descripcion, activo, es_sistema, orden)
values
  ('Normal', 'Producto con stock dentro de los niveles esperados.', true, true, 1),
  ('Bajo', 'Producto con stock por debajo del minimo.', true, true, 2),
  ('Critico', 'Producto con stock en nivel critico.', true, true, 3)
on conflict (nombre) do update set descripcion = excluded.descripcion, activo = excluded.activo;

-- Categorias de Receta
insert into public.catalogo_categoria_receta (codigo, nombre, descripcion, activo, es_sistema, orden)
values
  ('BEB', 'Bebidas', 'Recetas de bebidas preparadas para la venta.', true, true, 1),
  ('PT', 'Producto Terminado', 'Productos terminados listos para la venta.', true, true, 2)
on conflict (codigo) do update set nombre = excluded.nombre, descripcion = excluded.descripcion;

-- Presentaciones de Receta
insert into public.catalogo_presentacion_receta (codigo, nombre, descripcion, activo, es_sistema, orden)
values
  ('TU', 'Tamaño Único', 'Presentacion estandar sin variantes de tamaño.', true, true, 1),
  ('P', 'Pequeño', 'Presentacion de tamaño pequeño.', true, true, 2),
  ('M', 'Mediano', 'Presentacion de tamaño mediano.', true, true, 3),
  ('G', 'Grande', 'Presentacion de tamaño grande.', true, true, 4)
on conflict (codigo) do update set nombre = excluded.nombre, descripcion = excluded.descripcion;

-- Estados de Orden de Compra
insert into public.estado_orden_compra (codigo, nombre, descripcion, activo, es_sistema, orden)
values
  ('PEN', 'Pendiente', 'Orden creada, a la espera de recepcion.', true, true, 1),
  ('REC', 'Recibida', 'Orden recibida por completo.', true, true, 2),
  ('ANU', 'Anulada', 'Orden anulada.', true, true, 3)
on conflict (codigo) do update set nombre = excluded.nombre, descripcion = excluded.descripcion;
`;

let compileScript = fs.readFileSync('scripts/compile_final_complete_schema.js', 'utf8');

const target = '-- 16. CATÁLOGOS BASE ESENCIALES (SEMILLA PARA INICIALIZAR ENTORNO EN BLANCO)';
if (!compileScript.includes('Departamentos y Municipios de Guatemala (INE)')) {
  compileScript = compileScript.replace(target, target + '\n' + additionalSeeds);
  fs.writeFileSync('scripts/compile_final_complete_schema.js', compileScript, 'utf8');
  console.log('Added catalog seeds to compile script successfully!');
} else {
  console.log('Already contains additional seeds.');
}
