-- Genera automaticamente los codigos de proveedor con formato PRV-001.
create sequence if not exists public.proveedor_codigo_seq;

select setval(
  'public.proveedor_codigo_seq',
  coalesce(
    (select max((substring(codigo from 5))::bigint)
     from public.proveedor
     where codigo ~ '^PRV-[0-9]+$'),
    1
  ),
  (select count(*) > 0
   from public.proveedor
   where codigo ~ '^PRV-[0-9]+$')
);

create or replace function public.generar_codigo_proveedor()
returns trigger
language plpgsql
as $$
begin
  if new.codigo is null or btrim(new.codigo) = '' then
    new.codigo := 'PRV-' || lpad(nextval('public.proveedor_codigo_seq')::text, 3, '0');
  end if;
  return new;
end;
$$;

drop trigger if exists trg_proveedor_codigo_automatico on public.proveedor;
create trigger trg_proveedor_codigo_automatico
before insert on public.proveedor
for each row
execute function public.generar_codigo_proveedor();
