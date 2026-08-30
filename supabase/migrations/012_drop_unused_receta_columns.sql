-- Remover columnas no utilizadas de la tabla receta
ALTER TABLE public.receta 
DROP COLUMN IF EXISTS tiempo_produccion,
DROP COLUMN IF EXISTS margen_ganancia;
