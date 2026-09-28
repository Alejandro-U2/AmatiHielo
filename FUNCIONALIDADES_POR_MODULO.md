# AMATI HIELO - Funcionalidades por Modulo

> Documento tecnico detallado de funcionalidades, componentes, filtros, modales, alertas y base de datos del sistema ERP.

---

## 1. SEGURIDAD

### 1.1 Autenticacion (Login)

| Funcionalidad | Detalle |
|---------------|---------|
| **Modo dual** | `VITE_AUTH_MODE=mock` (admin/admin123 sin DB) o `VITE_AUTH_MODE=supabase` (API real) |
| **Campos** | Usuario/correo + Contrasena + Checkbox "Recuerdame" |
| **Recordar sesion** | `localStorage` si marcado, `sessionStorage` si no |
| **Persistencia** | Claves: `amati_token` y `amati_user` en Storage |
| **Redireccion automatica** | Si ya hay token valido, redirige a `/dashboard` |
| **Mostrar contrasena** | Toggle ojo (show/hide) |
| **Mock mode** | Credenciales hardcodeadas: `admin` / `admin123`, token: `mock-token` |

**Validaciones client-side:**
- Campos vacios: `"Por favor ingresa tu usuario o correo y contrasena."`

**Flujo real:**
1. Frontend resuelve usuario a email via `GET /api/users` (busqueda por `ilike` en perfil)
2. Backend llama `supabasePublic.auth.signInWithPassword({ email, password })`
3. Retorna `{ token, user: { id, username, email, nombre, rol, estado } }`

### 1.2 Recuperacion de Contrasena

**Paso 1 - Solicitud (modal en Login):**
- Campo: usuario/correo
- Mensaje generico intencional (anti user-enumeration): `"Si el correo existe, se envio un enlace para restablecer la contrasena."`
- Endpoint: `POST /auth/forgot-password` -> `supabasePublic.auth.resetPasswordForEmail()`

**Paso 2 - Restablecimiento (pantalla `/recuperar`):**
- Parsea 3 formatos de URL de Supabase: `token_hash+type`, `code+email`, `access_token` (hash)
- Campos: Contrasena nueva + Confirmar contrasena
- Validaciones:
  - Contrasena < 6 chars: `"La contrasena debe tener al menos 6 caracteres."`
  - No coinciden: `"Las contraseñas no coinciden."`
  - Enlace invalido/vencido: `"El enlace de recuperacion no es valido o vencio."`
- Endpoint: `POST /auth/reset-password` -> valida OTP/token -> `supabaseAdmin.auth.admin.updateUserById()`

### 1.3 Middleware de Sesion (`requireSession`)

```
Request -> Extraer Bearer token -> Validar formato -> Validar JWT con Supabase
                                                    -> Verificar usuario ACTIVO en BD (consulta en tiempo real)
                                                    -> Attach req.auth.user
```

| Paso | Error | Status |
|------|-------|--------|
| Token ausente/invalido | `"Falta el token Bearer."` | 401 |
| JWT expirado/invalido | `"Token invalido o expirado."` | 401 |
| Usuario inactivo en BD | `"El usuario se encuentra inactivo."` | 403 |
| Error inesperado | `"No fue posible validar la sesion."` | 500 |

**Detalle critico:** La verificacion de estado "Activo" es una **consulta en tiempo real** a la tabla `perfil`, NO un claim del JWT. Un usuario desactivado en BD queda bloqueado **inmediatamente** sin esperar expiracion del token.

### 1.4 Middleware de Administrador (`requireAdmin`)

```
Request -> Validar Bearer token -> Validar JWT -> Consultar perfil con joins (rol, estado)
           -> Verificar rol en {Superusuario, Administrador} Y estado = 'Activo'
           -> Attach req.auth.user + req.auth.profile
```

| Error | Status |
|-------|--------|
| Token invalido | 401 |
| Perfil no encontrado | 403 |
| Rol no autorizado o inactivo | 403: `"No tienes permisos para realizar esta accion."` |

**Roles permitidos:** `Superusuario`, `Administrador`

### 1.5 CORS

- Origenes permitidos desde `FRONTEND_URL` (comma-separated en `.env`)
- `credentials: true`

### 1.6 Proteccion de Auto-eliminacion

- Boton de eliminar deshabilitado en la fila del usuario actual
- Mensaje tooltip: `"No puedes eliminar tu propio usuario"`
- Estado "Inactivo" deshabilitado en dropdown si editas tu propio perfil
- Warning en tiempo real: `"No puedes desactivar tu propio usuario."`

### 1.7 Politica de Contrasenas

- Minimo **6 caracteres** (client-side + server-side)
- Solo se actualiza si el campo tiene contenido (permite edits sin cambiar contrasena)

### 1.8 Validaciones de Entrada (Server-side)

| Campo | Regex/Validacion | Mensaje de error |
|-------|------------------|------------------|
| Nombres | `/^[A-Za-z\u00C1\u00C9\u00CD\u00D3\u00DA\u00E1\u00E9\u00ED\u00F3\u00FA\u00D1\u00F1\u00DC\u00FC\s]+$/` | `"El nombre solo puede contener letras, espacios y acentos."` |
| Email | `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` | `"El email no tiene un formato valido."` |
| Contrasena | `length >= 6` | `"La contrasena debe tener al menos 6 caracteres."` |

### 1.9 Deteccion de Duplicados (Server-side)

El backend detecta errores de constraint unico de PostgreSQL y los mapea a mensajes amigables:

| Constraint detectado | Mensaje |
|---------------------|---------|
| `users_email_key`, `perfil_email_key` | `"El email ya esta registrado."` |
| `perfil_usuario_key` | `"El nombre de usuario ya esta en uso."` |

---

## 2. BASE DE DATOS (Supabase / PostgreSQL)

### 2.1 Migraciones SQL

El schema esta versionado con **34 migraciones numeradas** (001-034, sin la 030) en `supabase/migrations/`.

### 2.2 Tablas Principales

#### `perfil` (antes `profiles`, renombrada en 032)
| Columna | Tipo | Constraints |
|---------|------|------------|
| `id` | uuid | PK, FK -> auth.users(id) ON DELETE CASCADE |
| `primer_nombre` | text | NOT NULL |
| `segundo_nombre` | text | NULL |
| `primer_apellido` | text | NOT NULL |
| `segundo_apellido` | text | NULL |
| `usuario` | text | NOT NULL, UNIQUE |
| `email` | text | NOT NULL, UNIQUE |
| `departamento_id` | bigint | NOT NULL, FK -> departamento(id) |
| `municipio_id` | bigint | NOT NULL, FK -> municipio(id) |
| `rol_id` | bigint | NOT NULL, FK -> rol(id), default 'Operario' |
| `estado_usuario_id` | bigint | NOT NULL, FK -> estado_usuario(id), default 'Activo' |
| `ultimo_acceso` | timestamptz | NULL |
| `created_at` | timestamptz | default now() |
| `updated_at` | timestamptz | trigger `trg_perfil_updated_at` |

#### `producto`
| Columna | Tipo | Constraints |
|---------|------|------------|
| `id` | bigint | PK identity |
| `codigo` | text | NOT NULL, UNIQUE |
| `nombre` | text | NOT NULL |
| `categoria` | text | NOT NULL (texto libre, NO FK) |
| `stock` | numeric(12,2) | NOT NULL, default 0 |
| `minimo` | numeric(12,2) | NOT NULL, default 0 |
| `unidad` | text | NOT NULL, default 'unidad' |
| `costo_unitario` | numeric(12,2) | NULL |
| `precio_compra` | numeric(12,2) | NULL |
| `precio_venta` | numeric(12,2) | NULL |
| `cantidad_compra` | numeric(12,2) | NULL |
| `precio_paquete` | numeric(12,2) | NULL |
| `estado` | text | NOT NULL, default 'normal' |
| `created_at` | timestamptz | default now() |
| `updated_at` | timestamptz | trigger |

#### `movimiento_inventario`
| Columna | Tipo | Constraints |
|---------|------|------------|
| `id` | bigint | PK |
| `producto_id` | bigint | NOT NULL, FK -> producto ON DELETE CASCADE |
| `tipo` | text | NOT NULL |
| `cantidad` | numeric(12,2) | NOT NULL |
| `cantidad_compra` | numeric(12,2) | NULL |
| `unidad_compra_id` | bigint | FK -> unidad_compra(id) |
| `motivo` | text | NULL |
| `usuario` | text | NULL |
| `created_at` | timestamptz | default now() |

### 2.3 Tablas de Catalogos

| Tabla | Contenido | Seed |
|-------|-----------|------|
| `rol` | Roles del sistema | Superusuario, Administrador, Operario |
| `estado_usuario` | Estados de usuario | Activo, Inactivo |
| `departamento` | Departamentos de Guatemala | 22 departamentos (codigos 01-22) |
| `municipio` | Municipios de Guatemala | 340 municipios (lista INE) |
| `catalogo_categoria_inventario` | Categorias de inventario | Materia Prima (MP), Suministros (SUM) |
| `tipo_movimiento` | Tipos de movimiento | Entrada (E), Salida (S), Merma (M), Ajuste (A) |
| `estado_producto` | Estados de producto | Normal, Bajo, Critico |
| `unidad_compra` | Unidades de compra | unidad(1), ciento(100), millar(1000) |
| `metodo_pago` | Metodos de pago | Efectivo, Transferencia, Tarjeta |
| `catalogo_categoria_receta` | Categorias de receta | Bebidas (BEB), Producto Terminado (PT) |
| `catalogo_presentacion_receta` | Presentaciones | Tamano Unico (TU), Pequeno (P), Mediano (M), Grande (G) |
| `unidad_medida` | Unidades de medida | g, ml, L, kg, unidad, docena |
| `estado_orden_compra` | Estados de orden | Pendiente (PEN), Recibida (REC), Anulada (ANU) |

**Estructura estandar de catalogos:**
```sql
id          bigint PK
codigo      text UNIQUE
nombre      text UNIQUE
descripcion text
activo      boolean DEFAULT true
es_sistema  boolean DEFAULT false
orden       integer
created_at  timestamptz
updated_at  timestamptz
```

### 2.4 Tablas de Modulos Futuros

| Tabla | Modulo | Estado |
|-------|--------|--------|
| `receta` | Produccion/Recetas | Creada, sin funcionalidad UI |
| `ingrediente_receta` | Produccion/Recetas | Creada |
| `plan_produccion` | Produccion/Recetas | Creada |
| `produccion` | Produccion/Recetas | Creada |
| `venta_pos` | Punto de Venta | Creada |
| `venta_pos_detalle` | Punto de Venta | Creada |
| `tabla_estructura` | Mantenimiento de Datos | Creada (diccionario de datos) |
| `campo_estructura` | Mantenimiento de Datos | Creada |
| `config_empresa` | Configuracion | Creada (AMATI HIELO, NIT CF) |
| `config_impuestos` | Configuracion | Creada (IVA 12%) |
| `config_notificaciones` | Configuracion | Creada (7 flags boolean) |
| `config_umbrales` | Configuracion | Creada |
| `sucursal` | Configuracion | Creada |
| `configuracion_auditoria` | Auditoria | Creada |
| `proveedor` | Compras | Creada |
| `orden_compra` | Compras | Creada |
| `orden_compra_detalle` | Compras | Creada |
| `cliente` | Facturacion | Creada |
| `factura` | Facturacion | Creada |
| `historial_clima` | IA Predictiva | Creada (temperatura, humedad, etc.) |

### 2.5 Funciones RPC Principales

#### `registrar_movimiento_inventario` (6 argumentos)
```sql
registrar_movimiento_inventario(
  p_producto_id bigint,
  p_tipo text,          -- 'Entrada', 'Salida', 'Merma', 'Ajuste'
  p_cantidad numeric,
  p_motivo text NULL,
  p_usuario text NULL,
  p_unidad_compra_id bigint NULL
) RETURNS movimiento_inventario
```
**Logica:**
1. Valida: producto_id no nulo, tipo no vacio, cantidad > 0
2. Si `unidad_compra_id` dado, busca factor multiplicador en tabla `unidad_compra`
3. Calcula `v_cantidad_base = p_cantidad * factor`
4. **Lock `SELECT ... FOR UPDATE`** sobre el producto (atomicidad)
5. Aplica CASE: `Entrada` -> +, `Salida` -> -, `Merma` -> -, `Ajuste` -> +
6. Valida: stock no puede quedar negativo
7. UPDATE stock + INSERT movimiento

#### `registrar_venta_pos_consumo_directo`
- Valida items del carrito
- Verifica que cada receta tenga BOM y ingredientes vinculados a productos
- Pre-valida inventario suficiente
- Calcula subtotal + IVA (usa `config_impuestos` dinamico)
- Genera ticket `TKT-YYYYMMDDHH24MISS-{random}`
- Decrementa stock por insumo y registra movimientos tipo Salida

#### `crear_tabla_estructura` / `eliminar_tabla_estructura`
- Crea/elimina tablas dinamicamente desde el diccionario de datos
- Protege tablas `es_sistema` contra eliminacion

### 2.6 RLS (Row Level Security)

Las tablas `producto` y `movimiento_inventario` tienen RLS habilitado con politicas de solo SELECT para usuarios autenticados. El backend usa el **service-role client** (bypass RLS) para operaciones de escritura.

---

## 3. CAMPOS TIPO LISTA CONSULTADOS DESDE LA BASE DE DATOS (Spinners)

### 3.1 Spinners en Gestion de Usuarios

| Campo | Endpoint | Catalogo BD | Fallback local | Comportamiento |
|-------|----------|-------------|----------------|----------------|
| **Rol** | `GET /api/users/roles` | `rol` | Superusuario, Administrador, Operario | Carga al montar componente |
| **Estado** | `GET /api/users/estados` | `estado_usuario` | Activo, Inactivo | Carga al montar componente |
| **Departamento** | `GET /api/users/departamentos` | `departamento` | Array vacio | Carga al montar componente |
| **Municipio** | `GET /api/users/municipios?departamento_id=X` | `municipio` | Array vacio | **Se recarga al cambiar Departamento** |

**Comportamiento cascada Departamento -> Municipio:**
1. Usuario selecciona Departamento
2. Se limpia Municipio (`''`)
3. Se vacia array de municipios
4. Se llama `fetchMunicipios(departamentoId)`
5. Se llena dropdown con municipios del departamento seleccionado

### 3.2 Spinners en Inventarios

| Campo | Endpoint | Catalogo BD | Fallback local | Comportamiento |
|-------|----------|-------------|----------------|----------------|
| **Categoria** | `GET /api/inventario/categorias` | `catalogo_categoria_inventario` | Materia Prima (MP), Suministros (SUM) | Carga al montar; solo actualiza si `length > 0` |
| **Tipo Movimiento** | `GET /api/inventario/tipos-movimiento` | `tipo_movimiento` | Entrada, Salida, Merma, Ajuste | Carga al montar; mapea a array de nombres |
| **Producto (movimiento)** | `GET /api/inventario/producto` | `producto` | - | Muestra `"nombre - Stock: X"` en dropdown |

**Nota sobre categorias:** El frontend usa el `codigo` del catalogo como prefijo para auto-generar codigos de producto (ej: `MP-001`, `SUM-001`).

**Nota sobre tipos de movimiento:** El tipo del modal (`'entrada'`, `'salida'`, `'merma'`) se traduce al nombre del catalogo (`'Entrada'`, `'Salida'`, `'Merma'`) para enviar al RPC. Si el catalogo diverge de estos nombres, la operacion falla.

### 3.3 Catalogos Disponibles en BD (no implementados en UI)

| Catalogo | Tabla | Uso futuro |
|----------|-------|------------|
| Metodos de pago | `metodo_pago` | Punto de Venta |
| Categorias de receta | `catalogo_categoria_receta` | Recetas/Produccion |
| Presentaciones de receta | `catalogo_presentacion_receta` | Recetas/Produccion |
| Unidades de medida | `unidad_medida` | Recetas/Produccion |
| Estados de producto | `estado_producto` | Inventario (actualmente calculado en frontend) |
| Estados de orden de compra | `estado_orden_compra` | Compras |
| Unidades de compra | `unidad_compra` | Movimientos de inventario |

---

## 4. FILTROS Y BUSQUEDAS INTELIGENTES

### 4.1 Gestion de Usuarios

| Filtro | Tipo | Campo filtrado | Logica |
|--------|------|----------------|--------|
| **Busqueda por texto** | Input text | `nombre`, `usuario`, `email` | `includes()` case-insensitive (minusculas) |
| **Filtro por rol** | Select dropdown | `rol` | Comparacion exacta o `'todos'` para mostrar todos |

**Combinacion:** Ambos filtros se combinan con AND logico en un `useMemo`:
```js
const filteredUsers = usuarios.filter(u => {
  const matchesSearch = nombre.includes(search) || usuario.includes(search) || email.includes(search)
  const matchesRole = filterRole === 'todos' || u.rol === filterRole
  return matchesSearch && matchesRole
})
```

### 4.2 Inventarios

| Filtro | Tipo | Campo filtrado | Logica |
|--------|------|----------------|--------|
| **Busqueda por texto** | Input text | `codigo`, `nombre` | `includes()` case-insensitive |
| **Filtro por categoria** | Select dropdown | `categoria` | Comparacion exacta o `'todos'` |
| **Filtro de productos vigentes** | Interno | `categoria` | Solo categorias presentes en catalogo cargado |

**Combinacion:** AND logico de busqueda + categoria + pertenencia a categorias del catalogo.

### 4.3 Estadisticas Derivadas de Filtros

| Estadistica | Modulo | Calculo |
|-------------|--------|---------|
| Total Usuarios | Usuarios | `usuarios.length` |
| Usuarios Activos | Usuarios | `usuarios.filter(u => u.estado === 'Activo').length` |
| Administradores | Usuarios | `usuarios.filter(u => rol === 'Administrador' \|\| rol === 'Superusuario').length` |
| Operarios | Usuarios | `usuarios.filter(u => rol === 'Operario').length` |
| Total Articulos | Inventarios | `productosVigentes.length` |
| Por categoria | Inventarios | `productosVigentes.filter(p => p.categoria === cat).length` (por cada categoria) |
| Alertas de reabastecimiento | Inventarios | `productos.filter(p => p.minimo > 0 && p.stock < p.minimo).length` |

### 4.4 Determinacion de Estado de Stock (Calculo Frontend)

```javascript
function getEstadoTexto(stock, minimo) {
  if (minimo <= 0) return 'Normal'
  const porcentaje = (stock / minimo) * 100
  if (porcentaje < 50) return 'Critico'
  if (porcentaje < 100) return 'Bajo'
  return 'Normal'
}
```

| Estado | Condicion | Color UI |
|--------|-----------|----------|
| **Critico** | `stock < 50% del minimo` | Rojo con borde rojo |
| **Bajo** | `50% <= stock < 100% del minimo` | Amarillo con borde amarillo |
| **Normal** | `stock >= minimo` o `minimo = 0` | Verde con borde verde |

> **Nota:** El catalogo `estado_producto` existe en BD pero NO se usa. El frontend calcula el estado derivado.

---

## 5. COMPONENTES FUNCIONALES Y POR IMPLEMENTAR

### 5.1 Componentes Funcionales (Activos)

| Componente | Archivo | Lineas | Estado |
|------------|---------|--------|--------|
| **Login** | `src/components/Login.jsx` | 561 | Completo |
| **RecuperarContrasena** | `src/components/RecuperarContrasena.jsx` | 221 | Completo |
| **Dashboard (Shell)** | `src/components/Dashboard.jsx` | 302 | Completo |
| **GestionUsuarios** | `src/components/modules/GestionUsuarios.jsx` | 832 | Completo |
| **Inventarios** | `src/components/modules/Inventarios.jsx` | 980 | Completo |

### 5.2 Componentes por Implementar (Placeholder)

| Modulo | ID en Sidebar | Badge | Descripcion | Funcionalidades Planeadas |
|--------|--------------|-------|-------------|---------------------------|
| **Punto de Venta** | `pos` | En Proceso | Registro de ventas, sincronizacion de salidas, facturacion | Carrito, metodos de pago, facturacion, tickets |
| **Recetas de Venta** | `produccion` | En Proceso | Bill of Materials, vinculo con inventario, costeo | ABM recetas, ingredientes, costos |
| **Mantenimiento de datos** | `estructura-datos` | En Proceso | Explorador de tablas, creacion de estructuras | CRUD dinamico via diccionario de datos |
| **Configuracion del Sistema** | `configuracion-sistema` | Completo | Datos empresa, sucursales, impuestos, notificaciones, umbrales y auditoria | Solo visible para admin |
| **IA Predictiva** | `ia` | En Proceso | Analisis climatico, prediccion de demanda, recomendaciones | Tabla `historial_clima` disponible |
| **Reportes** | `reportes` | En Proceso | Ventas, inventario, produccion, finanzas | Exportacion PDF/Excel (librerias ya instaladas) |

### 5.3 Dashboard - Home Cards (Hardcoded)

| Card | Valor | Icono |
|------|-------|-------|
| Ventas Hoy | Q8,450 | Wallet |
| Stock Disponible | 1,240 | Box |
| Produccion | 850 kg | Factory |
| Temperatura | 28 C | Thermometer |

> Estos valores son estaticos y deben conectarse a datos reales.

### 5.4 ModuloEnProceso (Placeholder)

- Sin estado, sin efectos, sin handlers
- Muestra: icono, nombre del modulo, descripcion, lista de funcionalidades planeadas
- Badge amarillo: "Modulo en Proceso"

---

## 6. MODALES

### 6.1 Modales del Sistema Completo

| Modulo | Tipo Modal | Titulo | Campos | Accion Principal |
|--------|-----------|--------|--------|------------------|
| **Login** | `forgot` | Recuperar contrasena | 1: email/usuario | Enviar enlace de reset |
| **Usuarios** | `add` | Nuevo Usuario | 11 campos (4 nombre, usuario, email, password, rol, estado, depto, muni) | Crear usuario en Auth + perfil |
| **Usuarios** | `edit` | Editar Usuario | 11 campos (password opcional) | Actualizar perfil y/o auth |
| **Usuarios** | `delete` | Confirmar Eliminacion | Mensaje de confirmacion | Eliminar auth + perfil |
| **Inventarios** | `add` | Nuevo Articulo | 6 campos (codigo auto, categoria, nombre, minimo, cantidad paquete, precio paquete) | Crear producto |
| **Inventarios** | `edit` | Editar Articulo | 6 campos | Actualizar producto |
| **Inventarios** | `entrada` | Registro de Entrada | 3 campos (producto, cantidad, motivo) | RPC registrar movimiento |
| **Inventarios** | `salida` | Registro de Salida | 3 campos (producto, cantidad, motivo) + validacion stock | RPC registrar movimiento |
| **Inventarios** | `merma` | Gestion de Mermas | 3 campos + box perdida economica | RPC registrar movimiento |

### 6.2 Detalle de Formularios por Modal

#### Modal: Nuevo/Editar Usuario
| Campo | Tipo | Requerido | Validacion | Habilitacion |
|-------|------|-----------|------------|--------------|
| Primer Nombre | text | Si | Regex: solo letras y acentos | Progresivo (add) / Siempre (edit) |
| Segundo Nombre | text | No | Regex | Progresivo |
| Primer Apellido | text | Si | Regex | Progresivo |
| Segundo Apellido | text | No | Regex | Progresivo |
| Usuario | text | Si | Trim | Despues de apellidos |
| Email | email | Si | Regex email | Despues de usuario |
| Contrasena | password | Si (add) / No (edit) | Min 6 chars | Despues de email |
| Rol | select (spinner DB) | Si | Catalogo `rol` | Despues de contrasena |
| Estado | select (spinner DB) | Si | Catalogo `estado_usuario` | Despues de rol |
| Departamento | select (spinner DB) | Si | Catalogo `departamento` | Despues de estado |
| Municipio | select (spinner DB, cascada) | Si | Catalogo `municipio` filtrado | Despues de departamento |
| Pais | select (disabled) | Si | "Guatemala" hardcodeado | Siempre |

**Habilitacion progresiva (modo add):** Los campos se habilitan secuencialmente. Cada campo muestra hint: `"Llena [campo] antes de continuar."` cuando esta deshabilitado.

**En modo edit:** Todos los campos se habilitan inmediatamente.

#### Modal: Nuevo/Editar Articulo
| Campo | Tipo | Requerido | Validacion |
|-------|------|-----------|------------|
| Codigo | display (auto-generado) | Auto | `{prefijo_categoria}-NNN`, unico |
| Categoria | select (spinner DB) | Si | Catalogo `catalogo_categoria_inventario` |
| Nombre del Producto | text | Si | Trim |
| Stock Minimo | number | No | Min 0, step 0.01 |
| Cantidad por Paquete | number | No | Step 0.01 |
| Precio por Paquete (Q) | number | No | Min 0, step 0.01 |
| Costo Unitario | display (calculado) | - | `precioPaquete / cantidadCompra` |

**Auto-generacion de codigo:** Al seleccionar categoria, genera `{codigo_categoria}-001`, incrementa hasta encontrar uno libre.

#### Modal: Registro de Entrada/Salida/Merma
| Campo | Tipo | Requerido | Validacion |
|-------|------|-----------|------------|
| Producto | select (spinner) | Si | Muestra `"nombre - Stock: X"` |
| Cantidad | number | Si | Min 0.01, step 0.01 |
| Motivo/Observaciones | textarea | No | 3 filas |

**Validaciones adicionales:**
- Salida/Merma: `cantidad <= stock actual` -> `"Stock insuficiente. Disponible: {n}."`
- Merma: Muestra box naranja con perdida economica: `"Perdida Economica: Q{costo_unitario * cantidad}"`

### 6.3 Patrones de Cierre de Modales

| Modal | Cierre por | Cierre por | Cierre por |
|-------|-----------|-----------|-----------|
| Forgot Password | Click en backdrop | Boton "Cancelar" | - |
| Usuarios (add/edit) | Click en backdrop | Boton "Cancelar" / "X" | Exito al guardar |
| Usuarios (delete) | Click en backdrop | Boton "Cancelar" / "X" | Exito al eliminar |
| Inventarios (all) | Click en backdrop | Boton "Cancelar" / "X" | Exito al guardar |

---

## 7. ALERTAS

### 7.1 Toast Notifications (Sonner)

| Componente | Tipo | Mensaje | Trigger |
|------------|------|---------|---------|
| GestionUsuarios | `toast.success` | `"Usuario creado correctamente."` | Creacion exitosa |
| GestionUsuarios | `toast.success` | `"Usuario actualizado correctamente."` | Edicion exitosa |
| GestionUsuarios | `toast.success` | `"Usuario eliminado correctamente."` | Eliminacion exitosa |

### 7.2 Errores Inline (Banners rojos en UI)

| Componente | Ubicacion | Mensajes |
|------------|-----------|----------|
| Login | Arriba del form | `"Por favor ingresa tu usuario o correo y contrasena."` |
| Login | Arriba del form | `"Error al iniciar seson."` / mensaje del server |
| RecuperarContrasena | Arriba del form | `"La contrasena debe tener al menos 6 caracteres."` |
| RecuperarContrasena | Arriba del form | `"Las contraseñas no coinciden."` |
| RecuperarContrasena | Banner rojo completo | `"El enlace de recuperacion no es valido o vencio."` |
| GestionUsuarios | Arriba de la tabla | `errorCarga` (fallo al cargar usuarios) |
| GestionUsuarios | Dentro del modal | `modalError` (fallo al crear/editar/eliminar) |
| Inventarios | Arriba de la tabla | `errorCarga` (fallo al cargar productos/movimientos) |
| Inventarios | Dentro del modal | `errorProducto` (fallo al crear/editar/eliminar producto o movimiento) |

### 7.3 Alertas de Reabastecimiento (Tab "Alertas")

**Condicion:** `productos.filter(p => p.minimo > 0 && p.stock < p.minimo)`

**Cards de alerta por producto con stock bajo:**
- Borde rojo (critico) o amarillo (bajo)
- Barra de progreso visual (stock/minimo * 100%)
- Boton "Registrar Entrada" que abre modal pre-seleccionando el producto
- Badge counter en el tab: cantidad de alertas activas

**Texto alternativo cuando no hay alertas:**
- `"Todo en orden"` (verde)
- `"No hay productos con stock bajo en este momento"`

### 7.4 Confirmaciones Nativas (window.confirm / window.alert)

| Componente | Tipo | Mensaje | Uso |
|------------|------|---------|-----|
| Inventarios | `window.confirm` | `"Se eliminara {nombre}. ¿Deseas continuar?"` | Antes de eliminar producto |
| Inventarios | `window.alert` | Mensaje de error del server | Si falla la eliminacion |

### 7.5 Errores del Backend (Mensajes amigables)

| Endpoint | Mensaje fallback |
|----------|-----------------|
| `GET /api/users` | `"No fue posible cargar los usuarios."` |
| `POST /api/users` | `"No fue posible crear el usuario."` |
| `PUT /api/users/:id` | `"No fue posible actualizar el usuario."` |
| `DELETE /api/users/:id` | `"No fue posible eliminar el usuario."` |
| `GET /api/inventario/producto` | `"No fue posible cargar los productos."` |
| `POST /api/inventario/producto` | `"No fue posible crear el producto."` |
| `PUT /api/inventario/producto/:id` | `"No fue posible actualizar el producto."` |
| `DELETE /api/inventario/producto/:id` | `"No fue posible eliminar el producto."` |
| `POST /api/inventario/movimiento` | `"No fue posible registrar el movimiento."` |

---

## 8. RESUMEN DE SERVICIOS (Service Layer)

### 8.1 authService.js

| Funcion | Modo Mock | Modo Supabase |
|---------|-----------|---------------|
| `login()` | Hardcoded admin/admin123 | `POST /auth/login` |
| `forgotPassword()` | Lanza error | `POST /auth/forgot-password` |
| `resetPassword()` | Lanza error | `POST /auth/reset-password` |
| `logout()` | Limpia storage | Limpia storage |
| `isAuthenticated()` | Checa token | Checa token |
| `getCurrentUser()` | Lee user de storage | Lee user de storage |
| `getAccessToken()` | Lee token de storage | Lee token de storage |

### 8.2 usersService.js

| Funcion | Metodo | Endpoint |
|---------|--------|----------|
| `listUsers()` | GET | `/api/users` |
| `listDepartamentos()` | GET | `/api/users/departamentos` |
| `listMunicipios(id)` | GET | `/api/users/municipios?departamento_id=X` |
| `listRoles()` | GET | `/api/users/roles` |
| `listEstadosUsuario()` | GET | `/api/users/estados` |
| `createCompleteUser(data)` | POST | `/api/users` |
| `updateUserProfile(id, data)` | PUT | `/api/users/{id}` |
| `deleteUserProfile(id)` | DELETE | `/api/users/{id}` |

### 8.3 inventarioService.js

| Funcion | Metodo | Endpoint |
|---------|--------|----------|
| `listProductosInventario()` | GET | `/api/inventario/producto` |
| `listCategoriasInventario()` | GET | `/api/inventario/categorias` |
| `listTiposMovimiento()` | GET | `/api/inventario/tipos-movimiento` |
| `listMovimientosInventario()` | GET | `/api/inventario/movimiento` |
| `createProductoInventario(data)` | POST | `/api/inventario/producto` |
| `updateProductoInventario(id, data)` | PUT | `/api/inventario/producto/{id}` |
| `deleteProductoInventario(id)` | DELETE | `/api/inventario/producto/{id}` |
| `createMovimientoInventario(data)` | POST | `/api/inventario/movimiento` |

**Patron comun:** Cada servicio tiene un helper `request(path, options)` que:
1. Obtiene token via `getAccessToken()`
2. Agrega header `Authorization: Bearer {token}`
3. Normaliza errores de red
4. Mapea snake_case (DB) a camelCase (UI)

---

## 9. ENDPOINTS API COMPLETOS

### 9.1 Rutas Publicas (sin middleware)

| Metodo | Ruta | Controlador | Descripcion |
|--------|------|-------------|-------------|
| POST | `/auth/login` | `authController.login` | Inicio de sesion |
| POST | `/auth/forgot-password` | `authController.forgotPassword` | Solicitar reset de contrasena |
| POST | `/auth/reset-password` | `authController.resetPassword` | Restablecer contrasena |
| GET | `/health` | inline | Health check del servidor |

### 9.2 Rutas de Admin (requireAdmin)

| Metodo | Ruta | Controlador | Descripcion |
|--------|------|-------------|-------------|
| GET | `/api/users` | `listUsers` | Listar todos los usuarios |
| GET | `/api/users/departamentos` | `listDepartamentos` | Catalogo de departamentos |
| GET | `/api/users/municipios` | `listMunicipios` | Municipios por departamento |
| GET | `/api/users/roles` | `listRoles` | Catalogo de roles |
| GET | `/api/users/estados` | `listEstadosUsuario` | Catalogo de estados |
| POST | `/api/users` | `createCompleteUser` | Crear usuario completo |
| PUT | `/api/users/:id` | `updateUser` | Actualizar usuario |
| DELETE | `/api/users/:id` | `deleteUser` | Eliminar usuario |

### 9.3 Rutas de Inventario (requireSession + requireAdmin en escritura)

| Metodo | Ruta | Controlador | Descripcion |
|--------|------|-------------|-------------|
| GET | `/api/inventario/producto` | `listProductos` | Listar productos |
| GET | `/api/inventario/categorias` | `listCategorias` | Catalogo de categorias |
| GET | `/api/inventario/tipos-movimiento` | `listTiposMovimiento` | Catalogo de tipos de movimiento |
| GET | `/api/inventario/movimiento` | `listMovimientos` | Historial de movimientos |
| POST | `/api/inventario/movimiento` | `createMovimiento` | Registrar movimiento (RPC) |
| POST | `/api/inventario/producto` | `createProducto` | Crear producto |
| PUT | `/api/inventario/producto/:id` | `updateProducto` | Actualizar producto |
| DELETE | `/api/inventario/producto/:id` | `deleteProducto` | Eliminar producto |

---

