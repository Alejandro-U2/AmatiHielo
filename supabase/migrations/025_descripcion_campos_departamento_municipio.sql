-- Descripcion de campos en el diccionario de datos para las tablas departamento y municipio.
-- Idempotente: se puede ejecutar cuantas veces se necesite.

-- ============ Tabla: departamento ============
do $$
declare
  v_tabla_id bigint;
begin
  insert into public.tabla_estructura (
    nombre_visible,
    nombre_interno,
    descripcion,
    modulo,
    es_sistema
  )
  values (
    'Departamentos',
    'departamento',
    'Catalogo de departamentos de Guatemala',
    'Seguridad y Acceso',
    true
  )
  on conflict (nombre_interno) do update
    set nombre_visible = excluded.nombre_visible,
        descripcion = excluded.descripcion,
        modulo = excluded.modulo,
        es_sistema = true,
        updated_at = now()
  returning id into v_tabla_id;

  delete from public.campo_estructura
  where tabla_id = v_tabla_id;

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
    v_tabla_id,
    c.column_name,
    c.data_type,
    case c.column_name
      when 'id' then 'Identificador unico del departamento.'
      when 'codigo' then 'Codigo oficial de dos digitos del departamento.'
      when 'nombre' then 'Nombre del departamento de Guatemala.'
      when 'descripcion' then 'Descripcion funcional del departamento.'
      when 'activo' then 'Indica si el departamento esta disponible para seleccion.'
      when 'es_sistema' then 'Indica si el registro pertenece a la configuracion base del sistema.'
      when 'orden' then 'Orden de visualizacion del departamento.'
      when 'created_at' then 'Fecha y hora de creacion del registro.'
      when 'updated_at' then 'Fecha y hora de ultima actualizacion del registro.'
      else null
    end,
    c.is_nullable = 'NO',
    c.column_name in ('id', 'codigo', 'nombre'),
    c.ordinal_position
  from information_schema.columns c
  where c.table_schema = 'public'
    and c.table_name = 'departamento'
  order by c.ordinal_position;
end;
$$;

-- ============ Tabla: municipio ============
do $$
declare
  v_tabla_id bigint;
begin
  insert into public.tabla_estructura (
    nombre_visible,
    nombre_interno,
    descripcion,
    modulo,
    es_sistema
  )
  values (
    'Municipios',
    'municipio',
    'Catalogo de municipios de Guatemala',
    'Seguridad y Acceso',
    true
  )
  on conflict (nombre_interno) do update
    set nombre_visible = excluded.nombre_visible,
        descripcion = excluded.descripcion,
        modulo = excluded.modulo,
        es_sistema = true,
        updated_at = now()
  returning id into v_tabla_id;

  delete from public.campo_estructura
  where tabla_id = v_tabla_id;

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
    v_tabla_id,
    c.column_name,
    c.data_type,
    case c.column_name
      when 'id' then 'Identificador unico del municipio.'
      when 'departamento_id' then 'Referencia al departamento al que pertenece el municipio.'
      when 'nombre' then 'Nombre del municipio.'
      when 'descripcion' then 'Descripcion funcional del municipio.'
      when 'activo' then 'Indica si el municipio esta disponible para seleccion.'
      when 'es_sistema' then 'Indica si el registro pertenece a la configuracion base del sistema.'
      when 'orden' then 'Orden de visualizacion del municipio.'
      when 'created_at' then 'Fecha y hora de creacion del registro.'
      when 'updated_at' then 'Fecha y hora de ultima actualizacion del registro.'
      else null
    end,
    c.is_nullable = 'NO',
    c.column_name in ('id', 'departamento_id', 'nombre'),
    c.ordinal_position
  from information_schema.columns c
  where c.table_schema = 'public'
    and c.table_name = 'municipio'
  order by c.ordinal_position;
end;
$$;
