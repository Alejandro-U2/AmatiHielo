-- Permitir eliminar recetas sin romper el historial de ventas POS
-- Si una receta ya fue vendida, sus detalles de venta conservarán el registro
-- pero dejarán de bloquear el borrado de la receta.

alter table if exists public.venta_pos_detalle
  alter column receta_id drop not null;

alter table if exists public.venta_pos_detalle
  drop constraint if exists venta_pos_detalle_receta_id_fkey;

alter table if exists public.venta_pos_detalle
  add constraint venta_pos_detalle_receta_id_fkey
  foreign key (receta_id)
  references public.receta(id)
  on delete set null;