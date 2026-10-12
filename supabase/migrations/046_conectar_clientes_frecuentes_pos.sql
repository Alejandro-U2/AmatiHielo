-- Vincula las ventas del POS con el catalogo de clientes frecuentes.
alter table if exists public.venta_pos
  add column if not exists cliente_id bigint references public.cliente(id);

create index if not exists idx_venta_pos_cliente_id
  on public.venta_pos(cliente_id);

comment on column public.venta_pos.cliente_id is
  'Cliente frecuente asociado a la venta. Puede ser null para clientes ocasionales.';
