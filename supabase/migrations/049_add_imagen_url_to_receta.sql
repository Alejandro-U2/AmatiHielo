-- 049_add_imagen_url_to_receta.sql
-- Agregar columna imagen_url a la tabla receta para fotos del producto en el Punto de Venta (POS)

alter table public.receta
  add column if not exists imagen_url text;

comment on column public.receta.imagen_url is 'URL o imagen en formato Base64/DataURL del producto terminado para mostrar en el catálogo y en el Punto de Venta (POS).';
