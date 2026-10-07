-- Simplifica el catalogo de proveedores a los datos basicos del negocio.
alter table if exists public.proveedor
  drop column if exists departamento_id,
  drop column if exists municipio_id,
  drop column if exists direccion,
  drop column if exists es_sistema,
  drop column if exists orden,
  drop column if exists contacto;
