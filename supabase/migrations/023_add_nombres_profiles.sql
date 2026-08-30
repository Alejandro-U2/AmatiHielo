-- Desglose del nombre de usuario en 4 campos en profiles.
-- Se elimina la columna `nombre` (nombre completo concatenado) y se conserva
-- solo la estructura normalizada. El nombre completo se compone en la API.

alter table public.profiles
  add column if not exists primer_nombre text,
  add column if not exists segundo_nombre text,
  add column if not exists primer_apellido text,
  add column if not exists segundo_apellido text;

-- Backfill desde `nombre` (heuristica de palabras):
--   1 palabra  -> primer_nombre
--   2 palabras -> primer_nombre + primer_apellido
--   3 palabras -> + segundo_nombre
--   4 palabras -> los 4 campos
update public.profiles p
set
  primer_nombre = case
      when cardinality(w.words) >= 1 then w.words[1]
      else null
    end,
  segundo_nombre = case
      when cardinality(w.words) >= 3 then w.words[2]
      else null
    end,
  primer_apellido = case
      when cardinality(w.words) = 2 then w.words[2]
      when cardinality(w.words) = 3 then w.words[3]
      when cardinality(w.words) >= 4 then w.words[cardinality(w.words) - 1]
      else null
    end,
  segundo_apellido = case
      when cardinality(w.words) >= 4 then w.words[cardinality(w.words)]
      else null
    end
from (
  select id, string_to_array(coalesce(nombre, ''), ' ') as words
  from public.profiles
) w
where w.id = p.id
  and p.primer_nombre is null;

-- Respaldo: si aun quedan filas sin primer_nombre (nombre vacio), usa el propio nombre.
update public.profiles
set primer_nombre = nombre
where primer_nombre is null
  and nombre is not null
  and nombre <> '';

-- Indices para busqueda por cada componente del nombre.
create index if not exists idx_profiles_primer_nombre on public.profiles (primer_nombre);
create index if not exists idx_profiles_segundo_nombre on public.profiles (segundo_nombre);
create index if not exists idx_profiles_primer_apellido on public.profiles (primer_apellido);
create index if not exists idx_profiles_segundo_apellido on public.profiles (segundo_apellido);

-- Se elimina la columna original del nombre completo.
alter table public.profiles
  drop column if exists nombre;

-- Refresca el diccionario de datos (campo_estructura) de profiles.
-- Cada campo de la tabla tiene su descripcion.
do $$
declare
  v_profiles_id bigint;
begin
  select id into v_profiles_id
  from public.tabla_estructura
  where nombre_interno = 'profiles';

  if v_profiles_id is not null then
    delete from public.campo_estructura
    where tabla_id = v_profiles_id;

    insert into public.campo_estructura (
      tabla_id,
      nombre,
      tipo_dato,
      descripcion,
      requerido,
      unico,
      orden
    )
    select
      v_profiles_id,
      c.column_name,
      c.data_type,
      case c.column_name
        when 'id' then 'Identificador del usuario relacionado con auth.users.'
        when 'usuario' then 'Nombre de usuario unico para iniciar sesion o identificar al perfil.'
        when 'email' then 'Correo electronico unico del usuario.'
        when 'primer_nombre' then 'Primer nombre del usuario.'
        when 'segundo_nombre' then 'Segundo nombre del usuario (opcional).'
        when 'primer_apellido' then 'Primer apellido del usuario.'
        when 'segundo_apellido' then 'Segundo apellido del usuario (opcional).'
        when 'rol_id' then 'Referencia al rol asignado al usuario.'
        when 'estado_usuario_id' then 'Referencia al estado actual del usuario.'
        when 'ultimo_acceso' then 'Fecha y hora del ultimo acceso registrado.'
        when 'created_at' then 'Fecha y hora de creacion del perfil.'
        when 'updated_at' then 'Fecha y hora de ultima actualizacion del perfil.'
        else null
      end,
      c.is_nullable = 'NO',
      c.column_name in ('id', 'usuario', 'email'),
      c.ordinal_position
    from information_schema.columns c
    where c.table_schema = 'public'
      and c.table_name = 'profiles'
    order by c.ordinal_position;
  end if;
end;
$$;
