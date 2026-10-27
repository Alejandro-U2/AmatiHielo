-- Migración 048: Soporte para Sencillo (Fondo de Caja para Cambio) y Liquidación en Arqueo Semanal
alter table public.arqueo_caja
  add column if not exists fondo_inicial numeric(12,2) not null default 0,
  add column if not exists sencillo_dejado numeric(12,2) not null default 0,
  add column if not exists total_efectivo_esperado numeric(12,2) not null default 0,
  add column if not exists efectivo_retirado numeric(12,2) not null default 0,
  add column if not exists efectivo_real numeric(12,2) not null default 0,
  add column if not exists diferencia numeric(12,2) not null default 0,
  add column if not exists observaciones text;

comment on column public.arqueo_caja.fondo_inicial is 'Monto en efectivo con el que se abrió la caja (sencillo para cambio del período anterior)';
comment on column public.arqueo_caja.sencillo_dejado is 'Monto en efectivo que se deja en la gaveta como sencillo para dar cambio en las siguientes ventas';
comment on column public.arqueo_caja.total_efectivo_esperado is 'Total de efectivo que debe haber en caja: fondo_inicial + total_efectivo de ventas';
comment on column public.arqueo_caja.efectivo_retirado is 'Efectivo neto liquidado o retirado de la caja (total esperado menos el sencillo dejado)';
comment on column public.arqueo_caja.efectivo_real is 'Efectivo físico total contado en la gaveta';
comment on column public.arqueo_caja.diferencia is 'Diferencia de caja (sobrante o faltante)';
