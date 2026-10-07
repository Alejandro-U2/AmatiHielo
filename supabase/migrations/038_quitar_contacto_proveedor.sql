-- El catalogo de proveedores conserva solo los datos basicos requeridos.
alter table if exists public.proveedor
  drop column if exists contacto;
