-- Comentarios (COMMENT ON COLUMN) para todas las columnas de todas las tablas
-- del esquema public de AMATI HIELO. Solo documentacion; no modifica estructura.
-- Idempotente: se puede ejecutar cuantas veces se necesite.

-- Tabla: perfil
COMMENT ON COLUMN perfil.id IS 'Identificador único del perfil de usuario, vinculado al mismo identificador en auth.users.';
COMMENT ON COLUMN perfil.primer_nombre IS 'Primer nombre del usuario.';
COMMENT ON COLUMN perfil.segundo_nombre IS 'Segundo nombre del usuario (opcional).';
COMMENT ON COLUMN perfil.primer_apellido IS 'Primer apellido del usuario.';
COMMENT ON COLUMN perfil.segundo_apellido IS 'Segundo apellido del usuario (opcional).';
COMMENT ON COLUMN perfil.usuario IS 'Nombre de usuario único utilizado para iniciar sesión en el sistema.';
COMMENT ON COLUMN perfil.email IS 'Correo electrónico único del usuario, utilizado como credencial de autenticación.';
COMMENT ON COLUMN perfil.departamento_id IS 'Identificador del departamento de residencia o ubicación del usuario.';
COMMENT ON COLUMN perfil.municipio_id IS 'Identificador del municipio de residencia o ubicación del usuario.';
COMMENT ON COLUMN perfil.rol_id IS 'Identificador del rol asignado al usuario, que determina sus permisos de acceso.';
COMMENT ON COLUMN perfil.estado_usuario_id IS 'Identificador del estado del usuario (Activo o Inactivo) que habilita o bloquea su acceso.';
COMMENT ON COLUMN perfil.ultimo_acceso IS 'Fecha y hora del último inicio de sesión registrado del usuario.';
COMMENT ON COLUMN perfil.created_at IS 'Fecha y hora de creación del registro.';
COMMENT ON COLUMN perfil.updated_at IS 'Fecha y hora de la última actualización del registro.';

-- Tabla: rol
COMMENT ON COLUMN rol.id IS 'Identificador único del rol.';
COMMENT ON COLUMN rol.nombre IS 'Nombre del rol de acceso (Superusuario, Administrador, Operario).';
COMMENT ON COLUMN rol.descripcion IS 'Descripción funcional de las responsabilidades del rol.';
COMMENT ON COLUMN rol.activo IS 'Indica si el rol está disponible para asignación a usuarios.';
COMMENT ON COLUMN rol.es_sistema IS 'Indica si el rol pertenece a la configuración base del sistema.';
COMMENT ON COLUMN rol.orden IS 'Orden de visualización del rol en listados y formularios.';
COMMENT ON COLUMN rol.created_at IS 'Fecha y hora de creación del registro.';
COMMENT ON COLUMN rol.updated_at IS 'Fecha y hora de la última actualización del registro.';

-- Tabla: estado_usuario
COMMENT ON COLUMN estado_usuario.id IS 'Identificador único del estado de usuario.';
COMMENT ON COLUMN estado_usuario.nombre IS 'Nombre del estado de usuario (Activo o Inactivo).';
COMMENT ON COLUMN estado_usuario.descripcion IS 'Descripción funcional del estado de usuario.';
COMMENT ON COLUMN estado_usuario.activo IS 'Indica si el estado está disponible para asignación.';
COMMENT ON COLUMN estado_usuario.es_sistema IS 'Indica si el registro pertenece a la configuración base del sistema.';
COMMENT ON COLUMN estado_usuario.orden IS 'Orden de visualización del estado en listados y formularios.';
COMMENT ON COLUMN estado_usuario.created_at IS 'Fecha y hora de creación del registro.';
COMMENT ON COLUMN estado_usuario.updated_at IS 'Fecha y hora de la última actualización del registro.';

-- Tabla: departamento
COMMENT ON COLUMN departamento.id IS 'Identificador único del departamento.';
COMMENT ON COLUMN departamento.codigo IS 'Código oficial de dos dígitos del departamento de Guatemala.';
COMMENT ON COLUMN departamento.nombre IS 'Nombre del departamento de Guatemala.';
COMMENT ON COLUMN departamento.descripcion IS 'Descripción funcional del departamento.';
COMMENT ON COLUMN departamento.activo IS 'Indica si el departamento está disponible para selección en el sistema.';
COMMENT ON COLUMN departamento.es_sistema IS 'Indica si el registro pertenece a la configuración base del sistema.';
COMMENT ON COLUMN departamento.orden IS 'Orden de visualización del departamento en listados.';
COMMENT ON COLUMN departamento.created_at IS 'Fecha y hora de creación del registro.';
COMMENT ON COLUMN departamento.updated_at IS 'Fecha y hora de la última actualización del registro.';

-- Tabla: municipio
COMMENT ON COLUMN municipio.id IS 'Identificador único del municipio.';
COMMENT ON COLUMN municipio.departamento_id IS 'Identificador del departamento al que pertenece el municipio.';
COMMENT ON COLUMN municipio.nombre IS 'Nombre del municipio.';
COMMENT ON COLUMN municipio.descripcion IS 'Descripción funcional del municipio.';
COMMENT ON COLUMN municipio.activo IS 'Indica si el municipio está disponible para selección en el sistema.';
COMMENT ON COLUMN municipio.es_sistema IS 'Indica si el registro pertenece a la configuración base del sistema.';
COMMENT ON COLUMN municipio.orden IS 'Orden de visualización del municipio dentro de su departamento.';
COMMENT ON COLUMN municipio.created_at IS 'Fecha y hora de creación del registro.';
COMMENT ON COLUMN municipio.updated_at IS 'Fecha y hora de la última actualización del registro.';

-- Tabla: unidad_compra
COMMENT ON COLUMN unidad_compra.id IS 'Identificador único de la unidad de compra.';
COMMENT ON COLUMN unidad_compra.nombre IS 'Nombre de la unidad de compra (unidad, ciento, millar).';
COMMENT ON COLUMN unidad_compra.factor IS 'Factor de conversión que multiplica la cantidad para obtener unidades base de inventario.';
COMMENT ON COLUMN unidad_compra.created_at IS 'Fecha y hora de creación del registro.';

-- Tabla: producto
COMMENT ON COLUMN producto.id IS 'Identificador único del producto.';
COMMENT ON COLUMN producto.codigo IS 'Código interno único del producto para identificación en inventario.';
COMMENT ON COLUMN producto.nombre IS 'Nombre o descripción comercial del producto.';
COMMENT ON COLUMN producto.categoria IS 'Categoría a la que pertenece el producto.';
COMMENT ON COLUMN producto.stock IS 'Cantidad actual disponible del producto en unidades de inventario.';
COMMENT ON COLUMN producto.minimo IS 'Cantidad mínima de existencias antes de considerar el producto bajo o crítico.';
COMMENT ON COLUMN producto.unidad IS 'Unidad de medida base del producto (unidad, gramos, litros, etc.).';
COMMENT ON COLUMN producto.costo_unitario IS 'Costo de adquisición por unidad del producto.';
COMMENT ON COLUMN producto.precio_compra IS 'Precio de compra del producto, usado como referencia de costo.';
COMMENT ON COLUMN producto.precio_venta IS 'Precio de venta del producto.';
COMMENT ON COLUMN producto.estado IS 'Estado de disponibilidad del producto (normal, bajo, crítico).';
COMMENT ON COLUMN producto.cantidad_compra IS 'Cantidad de unidades que contiene el paquete de compra habitual del producto.';
COMMENT ON COLUMN producto.precio_paquete IS 'Precio del paquete de compra completo del producto.';
COMMENT ON COLUMN producto.created_at IS 'Fecha y hora de creación del registro.';
COMMENT ON COLUMN producto.updated_at IS 'Fecha y hora de la última actualización del registro.';

-- Tabla: movimiento_inventario
COMMENT ON COLUMN movimiento_inventario.id IS 'Identificador único del movimiento de inventario.';
COMMENT ON COLUMN movimiento_inventario.producto_id IS 'Identificador del producto afectado por el movimiento.';
COMMENT ON COLUMN movimiento_inventario.tipo IS 'Tipo de movimiento (Entrada, Salida, Merma o Ajuste) que determina si el stock aumenta o disminuye.';
COMMENT ON COLUMN movimiento_inventario.cantidad IS 'Cantidad del movimiento expresada en unidades base de inventario.';
COMMENT ON COLUMN movimiento_inventario.cantidad_compra IS 'Cantidad del movimiento expresada en la unidad de compra utilizada.';
COMMENT ON COLUMN movimiento_inventario.unidad_compra_id IS 'Identificador de la unidad de compra aplicada al movimiento.';
COMMENT ON COLUMN movimiento_inventario.motivo IS 'Motivo u observación que explica la causa del movimiento.';
COMMENT ON COLUMN movimiento_inventario.usuario IS 'Nombre del usuario que registró el movimiento.';
COMMENT ON COLUMN movimiento_inventario.created_at IS 'Fecha y hora en que se registró el movimiento.';

-- Tabla: receta
COMMENT ON COLUMN receta.id IS 'Identificador único de la receta.';
COMMENT ON COLUMN receta.codigo IS 'Código interno único de la receta.';
COMMENT ON COLUMN receta.nombre IS 'Nombre de la receta o producto preparado.';
COMMENT ON COLUMN receta.categoria IS 'Categoría de la receta (Bebidas o Producto Terminado).';
COMMENT ON COLUMN receta.presentacion IS 'Presentación o tamaño del producto que produce la receta.';
COMMENT ON COLUMN receta.costo_total IS 'Costo total de producción calculado a partir de los ingredientes.';
COMMENT ON COLUMN receta.precio_sugerido IS 'Precio de venta sugerido para la receta.';
COMMENT ON COLUMN receta.created_at IS 'Fecha y hora de creación del registro.';
COMMENT ON COLUMN receta.updated_at IS 'Fecha y hora de la última actualización del registro.';

-- Tabla: ingrediente_receta
COMMENT ON COLUMN ingrediente_receta.id IS 'Identificador único del ingrediente de la receta.';
COMMENT ON COLUMN ingrediente_receta.receta_id IS 'Identificador de la receta a la que pertenece el ingrediente.';
COMMENT ON COLUMN ingrediente_receta.nombre IS 'Nombre del ingrediente dentro del BOM de la receta.';
COMMENT ON COLUMN ingrediente_receta.cantidad IS 'Cantidad del ingrediente requerida por la receta.';
COMMENT ON COLUMN ingrediente_receta.unidad IS 'Unidad de medida del ingrediente (g, ml, L, kg, unidad, docena).';
COMMENT ON COLUMN ingrediente_receta.costo_unitario IS 'Costo por unidad del ingrediente al momento de definir el BOM.';
COMMENT ON COLUMN ingrediente_receta.producto_id IS 'Identificador del producto de inventario vinculado al ingrediente para consumo directo en ventas.';
COMMENT ON COLUMN ingrediente_receta.created_at IS 'Fecha y hora de creación del registro.';

-- Tabla: plan_produccion
COMMENT ON COLUMN plan_produccion.id IS 'Identificador único del plan de producción.';
COMMENT ON COLUMN plan_produccion.receta_id IS 'Identificador de la receta a producir.';
COMMENT ON COLUMN plan_produccion.cantidad_planificada IS 'Cantidad de unidades planificadas para producir.';
COMMENT ON COLUMN plan_produccion.demanda_proyectada IS 'Demanda proyectada estimada para la receta.';
COMMENT ON COLUMN plan_produccion.created_at IS 'Fecha y hora de creación del registro.';
COMMENT ON COLUMN plan_produccion.updated_at IS 'Fecha y hora de la última actualización del registro.';

-- Tabla: produccion
COMMENT ON COLUMN produccion.id IS 'Identificador único del registro de producción.';
COMMENT ON COLUMN produccion.receta_id IS 'Identificador de la receta que se produjo.';
COMMENT ON COLUMN produccion.cantidad IS 'Cantidad de unidades producidas en el lote.';
COMMENT ON COLUMN produccion.usuario IS 'Nombre del usuario que registró la producción.';
COMMENT ON COLUMN produccion.lote IS 'Identificador único del lote de producción.';
COMMENT ON COLUMN produccion.created_at IS 'Fecha y hora en que se registró la producción.';

-- Tabla: venta_pos
COMMENT ON COLUMN venta_pos.id IS 'Identificador único de la venta registrada en el punto de venta.';
COMMENT ON COLUMN venta_pos.ticket IS 'Número de ticket único generado para la venta.';
COMMENT ON COLUMN venta_pos.cliente IS 'Nombre del cliente registrado en la venta.';
COMMENT ON COLUMN venta_pos.metodo_pago IS 'Método de pago utilizado en la venta (Efectivo, Transferencia, Tarjeta).';
COMMENT ON COLUMN venta_pos.subtotal IS 'Subtotal de la venta antes de impuestos.';
COMMENT ON COLUMN venta_pos.iva IS 'Monto del impuesto IVA calculado sobre el subtotal.';
COMMENT ON COLUMN venta_pos.total IS 'Total pagado por el cliente (subtotal más IVA).';
COMMENT ON COLUMN venta_pos.usuario IS 'Nombre del usuario que registró la venta.';
COMMENT ON COLUMN venta_pos.necesita_factura IS 'Indica si la venta requiere emisión de factura.';
COMMENT ON COLUMN venta_pos.nit IS 'NIT del cliente para facturación.';
COMMENT ON COLUMN venta_pos.nombre_cliente IS 'Nombre completo del cliente capturado en la venta.';
COMMENT ON COLUMN venta_pos.numero_telefono IS 'Número de teléfono del cliente registrado en la venta.';
COMMENT ON COLUMN venta_pos.created_at IS 'Fecha y hora en que se registró la venta.';

-- Tabla: venta_pos_detalle
COMMENT ON COLUMN venta_pos_detalle.id IS 'Identificador único de la línea de detalle de la venta.';
COMMENT ON COLUMN venta_pos_detalle.venta_id IS 'Identificador de la venta a la que pertenece la línea.';
COMMENT ON COLUMN venta_pos_detalle.receta_id IS 'Identificador de la receta vendida; queda nulo si la receta fue eliminada después de la venta.';
COMMENT ON COLUMN venta_pos_detalle.cantidad IS 'Cantidad vendida del producto en la línea.';
COMMENT ON COLUMN venta_pos_detalle.precio_unitario IS 'Precio unitario aplicado en la línea de venta.';
COMMENT ON COLUMN venta_pos_detalle.total IS 'Total de la línea (cantidad por precio unitario).';
COMMENT ON COLUMN venta_pos_detalle.created_at IS 'Fecha y hora en que se registró la línea.';

-- Tabla: historial_clima
COMMENT ON COLUMN historial_clima.id IS 'Identificador único del registro histórico de clima.';
COMMENT ON COLUMN historial_clima.date IS 'Fecha del registro climático (un registro por día).';
COMMENT ON COLUMN historial_clima.temperature IS 'Temperatura actual registrada para la fecha del pronóstico.';
COMMENT ON COLUMN historial_clima.temperature_max IS 'Temperatura máxima proyectada para la fecha.';
COMMENT ON COLUMN historial_clima.temperature_min IS 'Temperatura mínima proyectada para la fecha.';
COMMENT ON COLUMN historial_clima.humidity IS 'Humedad relativa media proyectada para la fecha.';
COMMENT ON COLUMN historial_clima.rain_probability IS 'Probabilidad de lluvia proyectada para la fecha, en porcentaje.';
COMMENT ON COLUMN historial_clima.wind_speed IS 'Velocidad del viento proyectada para la fecha.';
COMMENT ON COLUMN historial_clima.weather_code IS 'Código del estado del tiempo (código WMO de la fuente climática).';
COMMENT ON COLUMN historial_clima.created_at IS 'Fecha y hora de creación del registro.';

-- Tabla: tabla_estructura
COMMENT ON COLUMN tabla_estructura.id IS 'Identificador único del registro de tabla del diccionario de datos.';
COMMENT ON COLUMN tabla_estructura.nombre_visible IS 'Nombre visible de la tabla para mostrar en el módulo de mantenimiento de datos.';
COMMENT ON COLUMN tabla_estructura.nombre_interno IS 'Nombre interno de la tabla en la base de datos, usado para operar sobre ella.';
COMMENT ON COLUMN tabla_estructura.descripcion IS 'Descripción funcional de la tabla.';
COMMENT ON COLUMN tabla_estructura.modulo IS 'Módulo del sistema al que pertenece la tabla.';
COMMENT ON COLUMN tabla_estructura.es_sistema IS 'Indica si la tabla pertenece a la configuración base del sistema.';
COMMENT ON COLUMN tabla_estructura.created_at IS 'Fecha y hora de creación del registro.';
COMMENT ON COLUMN tabla_estructura.updated_at IS 'Fecha y hora de la última actualización del registro.';

-- Tabla: campo_estructura
COMMENT ON COLUMN campo_estructura.id IS 'Identificador único del registro de campo del diccionario de datos.';
COMMENT ON COLUMN campo_estructura.tabla_id IS 'Identificador de la tabla a la que pertenece el campo.';
COMMENT ON COLUMN campo_estructura.nombre IS 'Nombre de la columna en la base de datos.';
COMMENT ON COLUMN campo_estructura.tipo_dato IS 'Tipo de dato de la columna.';
COMMENT ON COLUMN campo_estructura.descripcion IS 'Descripción funcional del campo.';
COMMENT ON COLUMN campo_estructura.requerido IS 'Indica si el campo es obligatorio (TRUE) u opcional (FALSE).';
COMMENT ON COLUMN campo_estructura.unico IS 'Indica si el valor del campo debe ser único entre registros.';
COMMENT ON COLUMN campo_estructura.orden IS 'Orden de visualización del campo dentro de su tabla.';
COMMENT ON COLUMN campo_estructura.created_at IS 'Fecha y hora de creación del registro.';

-- Tabla: config_empresa
COMMENT ON COLUMN config_empresa.id IS 'Identificador único de la configuración de la empresa (una sola fila).';
COMMENT ON COLUMN config_empresa.nombre_empresa IS 'Razón social o nombre comercial de la empresa.';
COMMENT ON COLUMN config_empresa.nit IS 'NIT de la empresa.';
COMMENT ON COLUMN config_empresa.direccion IS 'Dirección fiscal o física de la empresa.';
COMMENT ON COLUMN config_empresa.telefono IS 'Número de teléfono de contacto de la empresa.';
COMMENT ON COLUMN config_empresa.correo IS 'Correo electrónico de contacto de la empresa.';
COMMENT ON COLUMN config_empresa.logo_url IS 'URL del logo de la empresa utilizado en reportes y documentos.';
COMMENT ON COLUMN config_empresa.created_at IS 'Fecha y hora de creación del registro.';
COMMENT ON COLUMN config_empresa.updated_at IS 'Fecha y hora de la última actualización del registro.';

-- Tabla: config_impuestos
COMMENT ON COLUMN config_impuestos.id IS 'Identificador único de la configuración de impuestos (una sola fila).';
COMMENT ON COLUMN config_impuestos.iva_activo IS 'Indica si el IVA está habilitado en el sistema (TRUE) o deshabilitado (FALSE).';
COMMENT ON COLUMN config_impuestos.iva_porcentaje IS 'Porcentaje del IVA aplicado a las ventas.';
COMMENT ON COLUMN config_impuestos.otros_impuestos IS 'Lista JSON de otros impuestos adicionales configurados.';
COMMENT ON COLUMN config_impuestos.created_at IS 'Fecha y hora de creación del registro.';
COMMENT ON COLUMN config_impuestos.updated_at IS 'Fecha y hora de la última actualización del registro.';

-- Tabla: config_notificaciones
COMMENT ON COLUMN config_notificaciones.id IS 'Identificador único de la configuración de notificaciones (una sola fila).';
COMMENT ON COLUMN config_notificaciones.alerta_stock_bajo IS 'Indica si se notifica cuando el stock de un producto cae por debajo del nivel bajo.';
COMMENT ON COLUMN config_notificaciones.alerta_stock_critico IS 'Indica si se notifica cuando el stock de un producto alcanza el nivel crítico.';
COMMENT ON COLUMN config_notificaciones.confirmacion_ventas IS 'Indica si se notifica la confirmación de cada venta.';
COMMENT ON COLUMN config_notificaciones.alertas_mantenimiento IS 'Indica si se notifica cuando un equipo requiere mantenimiento.';
COMMENT ON COLUMN config_notificaciones.alertas_vencimiento IS 'Indica si se notifica la proximidad del vencimiento de productos.';
COMMENT ON COLUMN config_notificaciones.alertas_compras_pendientes IS 'Indica si se notifica la existencia de órdenes de compra pendientes.';
COMMENT ON COLUMN config_notificaciones.notificaciones_correo IS 'Indica si las notificaciones se envían por correo electrónico.';
COMMENT ON COLUMN config_notificaciones.created_at IS 'Fecha y hora de creación del registro.';
COMMENT ON COLUMN config_notificaciones.updated_at IS 'Fecha y hora de la última actualización del registro.';

-- Tabla: config_umbrales
COMMENT ON COLUMN config_umbrales.id IS 'Identificador único de la configuración de umbrales (una sola fila).';
COMMENT ON COLUMN config_umbrales.stock_bajo_porcentaje IS 'Porcentaje respecto al mínimo a partir del cual el stock se considera bajo.';
COMMENT ON COLUMN config_umbrales.stock_critico_porcentaje IS 'Porcentaje respecto al mínimo a partir del cual el stock se considera crítico.';
COMMENT ON COLUMN config_umbrales.dias_mantenimiento IS 'Días de anticipación para alertar el mantenimiento de equipos.';
COMMENT ON COLUMN config_umbrales.dias_vencimiento IS 'Días de anticipación para alertar el vencimiento de productos.';
COMMENT ON COLUMN config_umbrales.parametros_extra IS 'Parámetros adicionales en formato JSON para cálculos del sistema.';
COMMENT ON COLUMN config_umbrales.created_at IS 'Fecha y hora de creación del registro.';
COMMENT ON COLUMN config_umbrales.updated_at IS 'Fecha y hora de la última actualización del registro.';

-- Tabla: sucursal
COMMENT ON COLUMN sucursal.id IS 'Identificador único de la sucursal.';
COMMENT ON COLUMN sucursal.nombre IS 'Nombre de la sucursal.';
COMMENT ON COLUMN sucursal.direccion IS 'Dirección física de la sucursal.';
COMMENT ON COLUMN sucursal.telefono IS 'Número de teléfono de la sucursal.';
COMMENT ON COLUMN sucursal.encargado IS 'Nombre de la persona encargada de la sucursal.';
COMMENT ON COLUMN sucursal.activa IS 'Indica si la sucursal está operativa (TRUE) o inactiva (FALSE).';
COMMENT ON COLUMN sucursal.created_at IS 'Fecha y hora de creación del registro.';
COMMENT ON COLUMN sucursal.updated_at IS 'Fecha y hora de la última actualización del registro.';

-- Tabla: configuracion_auditoria
COMMENT ON COLUMN configuracion_auditoria.id IS 'Identificador único del registro de auditoría.';
COMMENT ON COLUMN configuracion_auditoria.modulo IS 'Módulo del sistema donde ocurrió la operación auditada.';
COMMENT ON COLUMN configuracion_auditoria.entidad IS 'Nombre de la entidad o tabla afectada por la operación.';
COMMENT ON COLUMN configuracion_auditoria.entidad_id IS 'Identificador del registro afectado dentro de la entidad.';
COMMENT ON COLUMN configuracion_auditoria.accion IS 'Acción realizada (crear, actualizar, eliminar, etc.).';
COMMENT ON COLUMN configuracion_auditoria.usuario IS 'Nombre del usuario que realizó la operación.';
COMMENT ON COLUMN configuracion_auditoria.antes IS 'Estado anterior del registro en formato JSON antes de la operación.';
COMMENT ON COLUMN configuracion_auditoria.despues IS 'Estado posterior del registro en formato JSON después de la operación.';
COMMENT ON COLUMN configuracion_auditoria.created_at IS 'Fecha y hora en que se registró la auditoría.';

-- Tabla: metodo_pago
COMMENT ON COLUMN metodo_pago.id IS 'Identificador único del método de pago.';
COMMENT ON COLUMN metodo_pago.nombre IS 'Nombre del método de pago (Efectivo, Transferencia, Tarjeta).';
COMMENT ON COLUMN metodo_pago.descripcion IS 'Descripción funcional del método de pago.';
COMMENT ON COLUMN metodo_pago.activo IS 'Indica si el método de pago está disponible para selección en el punto de venta.';
COMMENT ON COLUMN metodo_pago.es_sistema IS 'Indica si el registro pertenece a la configuración base del sistema.';
COMMENT ON COLUMN metodo_pago.orden IS 'Orden de visualización del método de pago.';
COMMENT ON COLUMN metodo_pago.created_at IS 'Fecha y hora de creación del registro.';
COMMENT ON COLUMN metodo_pago.updated_at IS 'Fecha y hora de la última actualización del registro.';

-- Tabla: catalogo_categoria_inventario
COMMENT ON COLUMN catalogo_categoria_inventario.id IS 'Identificador único de la categoría de inventario.';
COMMENT ON COLUMN catalogo_categoria_inventario.codigo IS 'Código corto de la categoría, usado como prefijo de artículos.';
COMMENT ON COLUMN catalogo_categoria_inventario.nombre IS 'Nombre visible de la categoría (Materia Prima, Suministros).';
COMMENT ON COLUMN catalogo_categoria_inventario.descripcion IS 'Descripción funcional de la categoría.';
COMMENT ON COLUMN catalogo_categoria_inventario.activo IS 'Indica si la categoría está disponible para uso.';
COMMENT ON COLUMN catalogo_categoria_inventario.es_sistema IS 'Indica si el registro pertenece a la configuración base del sistema.';
COMMENT ON COLUMN catalogo_categoria_inventario.orden IS 'Orden de visualización de la categoría.';
COMMENT ON COLUMN catalogo_categoria_inventario.created_at IS 'Fecha y hora de creación del registro.';
COMMENT ON COLUMN catalogo_categoria_inventario.updated_at IS 'Fecha y hora de la última actualización del registro.';

-- Tabla: catalogo_categoria_receta
COMMENT ON COLUMN catalogo_categoria_receta.id IS 'Identificador único de la categoría de receta.';
COMMENT ON COLUMN catalogo_categoria_receta.codigo IS 'Código corto de la categoría, usado como prefijo de recetas.';
COMMENT ON COLUMN catalogo_categoria_receta.nombre IS 'Nombre visible de la categoría de receta (Bebidas, Producto Terminado).';
COMMENT ON COLUMN catalogo_categoria_receta.descripcion IS 'Descripción funcional de la categoría de receta.';
COMMENT ON COLUMN catalogo_categoria_receta.activo IS 'Indica si la categoría está disponible para uso.';
COMMENT ON COLUMN catalogo_categoria_receta.es_sistema IS 'Indica si el registro pertenece a la configuración base del sistema.';
COMMENT ON COLUMN catalogo_categoria_receta.orden IS 'Orden de visualización de la categoría.';
COMMENT ON COLUMN catalogo_categoria_receta.created_at IS 'Fecha y hora de creación del registro.';
COMMENT ON COLUMN catalogo_categoria_receta.updated_at IS 'Fecha y hora de la última actualización del registro.';

-- Tabla: tipo_movimiento
COMMENT ON COLUMN tipo_movimiento.id IS 'Identificador único del tipo de movimiento de inventario.';
COMMENT ON COLUMN tipo_movimiento.codigo IS 'Código corto del tipo de movimiento (E, S, M, A).';
COMMENT ON COLUMN tipo_movimiento.nombre IS 'Nombre del tipo de movimiento (Entrada, Salida, Merma, Ajuste).';
COMMENT ON COLUMN tipo_movimiento.descripcion IS 'Descripción funcional del tipo de movimiento.';
COMMENT ON COLUMN tipo_movimiento.activo IS 'Indica si el tipo de movimiento está disponible para uso.';
COMMENT ON COLUMN tipo_movimiento.es_sistema IS 'Indica si el registro pertenece a la configuración base del sistema.';
COMMENT ON COLUMN tipo_movimiento.orden IS 'Orden de visualización del tipo de movimiento.';
COMMENT ON COLUMN tipo_movimiento.created_at IS 'Fecha y hora de creación del registro.';
COMMENT ON COLUMN tipo_movimiento.updated_at IS 'Fecha y hora de la última actualización del registro.';

-- Tabla: estado_producto
COMMENT ON COLUMN estado_producto.id IS 'Identificador único del estado de producto.';
COMMENT ON COLUMN estado_producto.nombre IS 'Nombre del estado de producto (Normal, Bajo, Crítico).';
COMMENT ON COLUMN estado_producto.descripcion IS 'Descripción funcional del estado de producto.';
COMMENT ON COLUMN estado_producto.activo IS 'Indica si el estado está disponible para uso.';
COMMENT ON COLUMN estado_producto.es_sistema IS 'Indica si el registro pertenece a la configuración base del sistema.';
COMMENT ON COLUMN estado_producto.orden IS 'Orden de visualización del estado.';
COMMENT ON COLUMN estado_producto.created_at IS 'Fecha y hora de creación del registro.';
COMMENT ON COLUMN estado_producto.updated_at IS 'Fecha y hora de la última actualización del registro.';

-- Tabla: catalogo_presentacion_receta
COMMENT ON COLUMN catalogo_presentacion_receta.id IS 'Identificador único de la presentación de receta.';
COMMENT ON COLUMN catalogo_presentacion_receta.codigo IS 'Código corto de la presentación (TU, P, M, G).';
COMMENT ON COLUMN catalogo_presentacion_receta.nombre IS 'Nombre visible de la presentación (Tamaño Único, Pequeño, Mediano, Grande).';
COMMENT ON COLUMN catalogo_presentacion_receta.descripcion IS 'Descripción funcional de la presentación.';
COMMENT ON COLUMN catalogo_presentacion_receta.activo IS 'Indica si la presentación está disponible para uso.';
COMMENT ON COLUMN catalogo_presentacion_receta.es_sistema IS 'Indica si el registro pertenece a la configuración base del sistema.';
COMMENT ON COLUMN catalogo_presentacion_receta.orden IS 'Orden de visualización de la presentación.';
COMMENT ON COLUMN catalogo_presentacion_receta.created_at IS 'Fecha y hora de creación del registro.';
COMMENT ON COLUMN catalogo_presentacion_receta.updated_at IS 'Fecha y hora de la última actualización del registro.';

-- Tabla: unidad_medida
COMMENT ON COLUMN unidad_medida.id IS 'Identificador único de la unidad de medida.';
COMMENT ON COLUMN unidad_medida.codigo IS 'Código corto de la unidad de medida (GR, ML, LT, KG, UN, DOC).';
COMMENT ON COLUMN unidad_medida.nombre IS 'Símbolo o nombre de la unidad de medida (g, ml, L, kg, unidad, docena).';
COMMENT ON COLUMN unidad_medida.descripcion IS 'Descripción funcional de la unidad de medida.';
COMMENT ON COLUMN unidad_medida.activo IS 'Indica si la unidad de medida está disponible para uso.';
COMMENT ON COLUMN unidad_medida.es_sistema IS 'Indica si el registro pertenece a la configuración base del sistema.';
COMMENT ON COLUMN unidad_medida.orden IS 'Orden de visualización de la unidad de medida.';
COMMENT ON COLUMN unidad_medida.created_at IS 'Fecha y hora de creación del registro.';
COMMENT ON COLUMN unidad_medida.updated_at IS 'Fecha y hora de la última actualización del registro.';

-- Tabla: proveedor
COMMENT ON COLUMN proveedor.id IS 'Identificador único del proveedor.';
COMMENT ON COLUMN proveedor.codigo IS 'Código interno único del proveedor.';
COMMENT ON COLUMN proveedor.nombre IS 'Nombre o razón social del proveedor.';
COMMENT ON COLUMN proveedor.nit IS 'NIT del proveedor.';
COMMENT ON COLUMN proveedor.contacto IS 'Persona de contacto principal del proveedor.';
COMMENT ON COLUMN proveedor.telefono IS 'Número de teléfono del proveedor.';
COMMENT ON COLUMN proveedor.correo IS 'Correo electrónico del proveedor.';
COMMENT ON COLUMN proveedor.direccion IS 'Dirección física del proveedor.';
COMMENT ON COLUMN proveedor.departamento_id IS 'Identificador del departamento donde se ubica el proveedor.';
COMMENT ON COLUMN proveedor.municipio_id IS 'Identificador del municipio donde se ubica el proveedor.';
COMMENT ON COLUMN proveedor.activo IS 'Indica si el proveedor está disponible para realizar compras.';
COMMENT ON COLUMN proveedor.es_sistema IS 'Indica si el registro pertenece a la configuración base del sistema.';
COMMENT ON COLUMN proveedor.orden IS 'Orden de visualización del proveedor.';
COMMENT ON COLUMN proveedor.created_at IS 'Fecha y hora de creación del registro.';
COMMENT ON COLUMN proveedor.updated_at IS 'Fecha y hora de la última actualización del registro.';

-- Tabla: orden_compra
COMMENT ON COLUMN orden_compra.id IS 'Identificador único de la orden de compra.';
COMMENT ON COLUMN orden_compra.numero IS 'Número correlativo único de la orden de compra.';
COMMENT ON COLUMN orden_compra.proveedor_id IS 'Identificador del proveedor al que se realiza la compra.';
COMMENT ON COLUMN orden_compra.fecha IS 'Fecha de emisión de la orden de compra.';
COMMENT ON COLUMN orden_compra.estado IS 'Estado del ciclo de vida de la orden (Pendiente, Recibida, Anulada).';
COMMENT ON COLUMN orden_compra.subtotal IS 'Subtotal de la compra antes de impuestos.';
COMMENT ON COLUMN orden_compra.iva IS 'Monto del impuesto IVA de la compra.';
COMMENT ON COLUMN orden_compra.total IS 'Total de la compra (subtotal más IVA).';
COMMENT ON COLUMN orden_compra.usuario IS 'Nombre del usuario que registró la orden.';
COMMENT ON COLUMN orden_compra.notas IS 'Observaciones generales de la orden de compra.';
COMMENT ON COLUMN orden_compra.created_at IS 'Fecha y hora de creación del registro.';
COMMENT ON COLUMN orden_compra.updated_at IS 'Fecha y hora de la última actualización del registro.';

-- Tabla: orden_compra_detalle
COMMENT ON COLUMN orden_compra_detalle.id IS 'Identificador único de la línea de la orden de compra.';
COMMENT ON COLUMN orden_compra_detalle.orden_compra_id IS 'Identificador de la orden de compra a la que pertenece la línea.';
COMMENT ON COLUMN orden_compra_detalle.producto_id IS 'Identificador del producto o insumo comprado.';
COMMENT ON COLUMN orden_compra_detalle.cantidad IS 'Cantidad del producto comprado en la línea.';
COMMENT ON COLUMN orden_compra_detalle.unidad_compra_id IS 'Identificador de la unidad de compra aplicada a la línea.';
COMMENT ON COLUMN orden_compra_detalle.costo_unitario IS 'Costo unitario del producto en la línea.';
COMMENT ON COLUMN orden_compra_detalle.total IS 'Total de la línea (cantidad por costo unitario).';
COMMENT ON COLUMN orden_compra_detalle.created_at IS 'Fecha y hora de creación del registro.';

-- Tabla: estado_orden_compra
COMMENT ON COLUMN estado_orden_compra.id IS 'Identificador único del estado de orden de compra.';
COMMENT ON COLUMN estado_orden_compra.codigo IS 'Código corto del estado (PEN, REC, ANU).';
COMMENT ON COLUMN estado_orden_compra.nombre IS 'Nombre del estado de la orden de compra (Pendiente, Recibida, Anulada).';
COMMENT ON COLUMN estado_orden_compra.descripcion IS 'Descripción funcional del estado de la orden de compra.';
COMMENT ON COLUMN estado_orden_compra.activo IS 'Indica si el estado está disponible para uso.';
COMMENT ON COLUMN estado_orden_compra.es_sistema IS 'Indica si el registro pertenece a la configuración base del sistema.';
COMMENT ON COLUMN estado_orden_compra.orden IS 'Orden de visualización del estado.';
COMMENT ON COLUMN estado_orden_compra.created_at IS 'Fecha y hora de creación del registro.';
COMMENT ON COLUMN estado_orden_compra.updated_at IS 'Fecha y hora de la última actualización del registro.';

-- Tabla: cliente
COMMENT ON COLUMN cliente.id IS 'Identificador único del cliente.';
COMMENT ON COLUMN cliente.codigo IS 'Código interno único del cliente.';
COMMENT ON COLUMN cliente.nombre IS 'Nombre completo del cliente.';
COMMENT ON COLUMN cliente.nit IS 'NIT del cliente para facturación.';
COMMENT ON COLUMN cliente.telefono IS 'Número de teléfono del cliente.';
COMMENT ON COLUMN cliente.correo IS 'Correo electrónico del cliente.';
COMMENT ON COLUMN cliente.direccion IS 'Dirección del cliente.';
COMMENT ON COLUMN cliente.departamento_id IS 'Identificador del departamento donde se ubica el cliente.';
COMMENT ON COLUMN cliente.municipio_id IS 'Identificador del municipio donde se ubica el cliente.';
COMMENT ON COLUMN cliente.activo IS 'Indica si el cliente está disponible para realizar ventas.';
COMMENT ON COLUMN cliente.es_sistema IS 'Indica si el registro pertenece a la configuración base del sistema.';
COMMENT ON COLUMN cliente.orden IS 'Orden de visualización del cliente.';
COMMENT ON COLUMN cliente.created_at IS 'Fecha y hora de creación del registro.';
COMMENT ON COLUMN cliente.updated_at IS 'Fecha y hora de la última actualización del registro.';

-- Tabla: factura
COMMENT ON COLUMN factura.id IS 'Identificador único de la factura.';
COMMENT ON COLUMN factura.numero IS 'Número de factura (serie y correlativo), único por factura.';
COMMENT ON COLUMN factura.venta_pos_id IS 'Identificador de la venta del punto de venta que origina la factura.';
COMMENT ON COLUMN factura.cliente_id IS 'Identificador del cliente al que se emite la factura.';
COMMENT ON COLUMN factura.fecha_emision IS 'Fecha de emisión de la factura.';
COMMENT ON COLUMN factura.subtotal IS 'Subtotal facturado antes de impuestos.';
COMMENT ON COLUMN factura.iva IS 'Monto del impuesto IVA de la factura.';
COMMENT ON COLUMN factura.total IS 'Total de la factura (subtotal más IVA).';
COMMENT ON COLUMN factura.usuario IS 'Nombre del usuario que emitió la factura.';
COMMENT ON COLUMN factura.created_at IS 'Fecha y hora de creación del registro.';
COMMENT ON COLUMN factura.updated_at IS 'Fecha y hora de la última actualización del registro.';
