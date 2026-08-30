-- Comentarios de tabla y columna para que las descripciones aparezcan en Supabase
-- (editor de tablas) y en pg_dump, ademas del diccionario campo_estructura.
-- Idempotente: se puede ejecutar cuantas veces se necesite.

comment on table public.departamento is 'Catalogo de departamentos de Guatemala';

comment on column public.departamento.id is 'Identificador unico del departamento.';
comment on column public.departamento.codigo is 'Codigo oficial de dos digitos del departamento.';
comment on column public.departamento.nombre is 'Nombre del departamento de Guatemala.';
comment on column public.departamento.descripcion is 'Descripcion funcional del departamento.';
comment on column public.departamento.activo is 'Indica si el departamento esta disponible para seleccion.';
comment on column public.departamento.es_sistema is 'Indica si el registro pertenece a la configuracion base del sistema.';
comment on column public.departamento.orden is 'Orden de visualizacion del departamento.';
comment on column public.departamento.created_at is 'Fecha y hora de creacion del registro.';
comment on column public.departamento.updated_at is 'Fecha y hora de ultima actualizacion del registro.';

comment on table public.municipio is 'Catalogo de municipios de Guatemala';

comment on column public.municipio.id is 'Identificador unico del municipio.';
comment on column public.municipio.departamento_id is 'Referencia al departamento al que pertenece el municipio.';
comment on column public.municipio.nombre is 'Nombre del municipio.';
comment on column public.municipio.descripcion is 'Descripcion funcional del municipio.';
comment on column public.municipio.activo is 'Indica si el municipio esta disponible para seleccion.';
comment on column public.municipio.es_sistema is 'Indica si el registro pertenece a la configuracion base del sistema.';
comment on column public.municipio.orden is 'Orden de visualizacion del municipio.';
comment on column public.municipio.created_at is 'Fecha y hora de creacion del registro.';
comment on column public.municipio.updated_at is 'Fecha y hora de ultima actualizacion del registro.';

comment on column public.profiles.departamento_id is 'Departamento de residencia o ubicacion del usuario.';
comment on column public.profiles.municipio_id is 'Municipio de residencia o ubicacion del usuario.';
