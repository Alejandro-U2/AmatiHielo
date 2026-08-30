-- Agregar columna producto_id a ingrediente_receta para vincular con inventario
ALTER TABLE public.ingrediente_receta
ADD COLUMN producto_id bigint REFERENCES public.producto(id) ON DELETE SET NULL;

-- Crear índice para búsquedas por producto
CREATE INDEX idx_ingrediente_receta_producto_id ON public.ingrediente_receta(producto_id);
