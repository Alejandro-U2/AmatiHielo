
AMATI HIELO es un **ERP en desarrollo** para administrar un negocio de hielo: usuarios, inventario, compras, clientes y facturación (varios de estos módulos están aún "en proceso"). Está dividido en dos partes:

- **Frontend:** React 19 + Vite 7 + Tailwind CSS. Se encarga de la interfaz.
- **Backend:** Express (Node.js) con arquitectura de rutas → controladores → servicios. Expone una API REST.
- **Base de datos:** Supabase (PostgreSQL) gestionada con **migraciones SQL** (del 001 al 034).

---

## 1. Backend y base de datos

### 1.1 Tecnologías
- **Node.js + Express 4** (backend, en `backend/`).
- **Supabase (PostgreSQL)** como base de datos y como proveedor de autenticación (Auth).
- Paquete `@supabase/supabase-js` para conectar desde el backend.
- `dotenv` para variables de entorno, `cors` para permitir que el frontend consuma la API.

### 1.2 Estructura del backend
```
backend/
├── package.json
├── .env                      (configuración: puerto, URLs, claves Supabase)
├── .env.example              (plantilla de variables)
└── src/
    ├── server.js             (arranque, CORS, rutas, manejo de errores 404/500)
    ├── config/
    │   ├── supabaseAdmin.js  (cliente con rol Service Role: permisos elevados)
    │   └── supabasePublic.js (cliente con clave anónima)
    ├── middleware/
    │   ├── requireSession.js (valida token Bearer y estado "Activo")
    │   └── requireAdmin.js   (solo Superusuario o Administrador)
    ├── routes/
    │   ├── authRoutes.js     (/auth)
    │   ├── usersRoutes.js    (/api/users)
    │   └── inventarioRoutes.js (/api/inventario)
    └── controllers/
        ├── authController.js
        ├── usersController.js
        └── inventarioController.js
```

### 1.3 Conexión y configuración (`.env`)
Archivo `backend/.env.example` (plantilla):
- `PORT=3001`
- `FRONTEND_URL=http://localhost:5173,http://localhost:5174` (orígenes permitidos por CORS)
- `SUPABASE_URL=https://tu-proyecto.supabase.co`
- `SUPABASE_ANON_KEY=...` (clave pública)
- `SUPABASE_SERVICE_ROLE_KEY=...` (clave secreta de servicio)

En `server.js`:
- Se configura **CORS** con los orígenes permitidos (lineas 12-22).
- Se montan las rutas: `/auth`, `/api/users`, `/api/inventario` (lineas 29-31).
- Endpoint de salud: `GET /health` devuelve `{ status: 'ok', service: 'amati-backend' }` (lineas 25-27).

### 1.4 Tablas y relaciones (base de datos)
Se crean mediante migraciones en `supabase/migrations/`. Las principales y su propósito:

| Tabla | Migración | Propósito |
|---|---|---|
| `profiles` | 001 | Perfil de usuario (nombre, usuario, email, etc.) ligado a `auth.users` |
| `rol` | 020 | Catálogo de roles (Superusuario, Administrador, Operario) |
| `estado_usuario` | 021 | Catálogo de estados (Activo, Inactivo, etc.) |
| `departamento` / `municipio` | 024 | Catálogo de ubicación de Guatemala (22 deptos. + 340 municipios) |
| `producto` / `movimiento_inventario` | 003 | Catálogo de inventario y movimientos |
| `catalogo_categoria_inventario` | 022 | Categorías de producto |
| `tipo_movimiento`, `estado_producto`, `metodo_pago`, `catalogo_categoria_receta` | 027 | Catálogos de formularios |
| `receta`, `plan_produccion`, `produccion`, `ingrediente_receta` | 011 | Producción de hielo |
| `unidad_compra` | 010 | Unidades de compra y conversión |
| `proveedor`, `orden_compra`, `orden_compra_detalle`, `estado_orden_compra` | 028 | Módulo de compras |
| `cliente`, `factura` | 029 | Clientes y facturación |
| `venta_pos`, `venta_pos_detalle` | 013 | Punto de venta |
| `config_empresa`, `config_impuestos`, `config_notificaciones`, `config_umbrales`, `sucursal`, `configuracion_auditoria` | 019 | Configuración del sistema |
| `tabla_estructura`, `campo_estructura` | 018 | Diccionario de datos del sistema |
| `weather_history` | 016 | Historial de clima |

Relaciones relevantes:
- `profiles.id → auth.users.id` (on delete cascade).
- `profiles.rol_id → rol.id`.
- `profiles.estado_usuario_id → estado_usuario.id`.
- `profiles.departamento_id → departamento.id` y `profiles.municipio_id → municipio.id`.
- `municipio.departamento_id → departamento.id`.
- `movimiento_inventario.producto_id → producto.id`.

También existe una **función RPC** `registrar_movimiento_inventario` que ejecuta transaccionalmente los movimientos de inventario (ENTRADA/SALIDA) y ajusta el stock (ver 034_fix en migraciones).

### 1.5 API / endpoints

**Autenticación — `/auth`** (`authRoutes.js`):
| Método | Ruta | Descripción |
|---|---|---|
| POST | `/login` | Inicia sesión con usuario o email + contraseña |
| POST | `/forgot-password` | Envía enlace de recuperación |
| POST | `/reset-password` | Restablece la contraseña |

**Usuarios — `/api/users`** (`usersRoutes.js`; todas requieren `requireAdmin`):
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/departamentos` | Lista departamentos |
| GET | `/municipios?departamento_id=` | Lista municipios de un departamento |
| GET | `/estados` | Lista estados de usuario |
| GET | `/roles` | Lista roles |
| GET | `/` | Lista usuarios |
| POST | `/` | Crea usuario completo (auth + perfil) |
| PUT | `/:id` | Actualiza usuario |
| DELETE | `/:id` | Elimina usuario |

**Inventario — `/api/inventario`** (`inventarioRoutes.js`; requieren `requireSession`, y las de escritura además `requireAdmin`):
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/producto` | Lista productos |
| GET | `/categorias` | Lista categorías |
| GET | `/tipos-movimiento` | Lista tipos de movimiento |
| GET | `/movimiento` | Lista movimientos |
| POST | `/movimiento` | Registra un movimiento (RPC) |
| POST | `/producto` | Crea producto (admin) |
| PUT | `/producto/:id` | Actualiza producto (admin) |
| DELETE | `/producto/:id` | Elimina producto (admin) |

### 1.6 Seguridad y autenticación
- Los passwords se gestionan con **Supabase Auth** (`auth.admin.updateUserById`, `admin.createUser`, etc.).
- Middleware `requireSession` valida el **token Bearer** con `supabaseAdmin.auth.getUser(token)` y comprueba que el usuario esté **Activo**.
- Middleware `requireAdmin` limita el acceso a roles **Superusuario** o **Administrador** (y estado Activo).
- Existe un modo `mock` (controlado por `AUTH_MODE`/`VITE_AUTH_MODE`) que permite probar sin nube: token `mock-token`, usuario `admin/admin123`.
- CORS restringido a `FRONTEND_URL`.

### 1.7 CRUD implementado
- **Usuarios:** CRUD completo (crear, listar, editar, eliminar) + catálogos (roles, estados, departamentos, municipios).
- **Inventario:** CRUD de productos y movimientos (con ajuste de stock vía RPC).

### 1.8 Partes implementadas vs. pendientes
- **Implementado:** login, recuperación/restablecimiento de contraseña, gestión de usuarios, inventario (productos y movimientos).
- **Pendiente / "en proceso":** los demás módulos del ERP (compras, clientes, facturación, punto de venta, producción, etc.) que tienen **tablas de base de datos creadas** pero **interfaces en proceso** (pantalla "Módulo en Proceso"). No se puede afirmar en el video que están terminados; se presentan como planeados.

---

## 2. Estructura interna del proyecto (frontend)

```
amati-hielo/
├── package.json                (dependencias y scripts)
├── vite.config.js              (configuración Vite, incluye Storybook/Vitest)
├── tailwind.config.js          (configuración Tailwind)
├── index.html
├── .env                        (VITE_AUTH_MODE, VITE_API_URL)
├── README.md
├── GUION_VIDEO_PROYECTO.md     (este documento)
├── backend/                    (API Express, ver sección 1)
├── supabase/
│   └── migrations/             (001 a 034: esquema de la base de datos)
└── src/
    ├── main.jsx                (punto de entrada de React)
    ├── App.jsx                 (rutas de la aplicación)
    ├── index.css
    ├── services/
    │   ├── authService.js      (login, logout, forgot/reset, sesión)
    │   ├── usersService.js     (llamadas a /api/users)
    │   └── inventarioService.js (llamadas a /api/inventario)
    └── components/
        ├── Login.jsx           (pantalla de inicio de sesión)
        ├── RecuperarContrasena.jsx (recuperación de contraseña)
        ├── Dashboard.jsx       (menú principal y protección por rol)
        └── modules/
            ├── GestionUsuarios.jsx (módulo de usuarios)
            ├── Inventarios.jsx     (módulo de inventario)
            └── ModuloEnProceso.jsx (pantalla de módulos futuros)
```

### Dependencias principales del frontend (`package.json`)
- React 19, React Router DOM 7, Tailwind CSS 3, Vite 7.
- `@supabase/supabase-js`, `lucide-react` (íconos), `recharts` (gráficas), `sonner` (notificaciones), `xlsx` (Excel), `jspdf` (PDF).

### Scripts disponibles (`package.json`)
```json
"scripts": {
  "dev": "vite",
  "dev:frontend": "vite",
  "dev:backend": "npm run dev --prefix backend",
  "dev:all": "concurrently \"npm run dev:frontend\" \"npm run dev:backend\"",
  "build": "vite build",
  "lint": "eslint .",
  "preview": "vite preview",
  "storybook": "storybook dev -p 6006",
  "build-storybook": "storybook build"
}
```

---

## 3. Cómo ejecutar el proyecto

1. **Instalar dependencias** en la raíz y en `backend`:
   ```bash
   npm install
   npm install --prefix backend
   ```
2. **Configurar variables de entorno**:
   - Raíz `.env`: `VITE_AUTH_MODE=supabase`, `VITE_API_URL=http://localhost:3001`.
   - `backend/.env`: `PORT=3001`, `FRONTEND_URL=http://localhost:5173`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
3. **Levantar backend y frontend** (juntos):
   ```bash
   npm run dev:all
   ```
   (o por separado: `npm run dev:frontend` + `npm run dev:backend`)
4. **Abrir** el frontend en `http://localhost:5173`.
5. **Login**: en producción con Supabase usar las credenciales reales; en modo `mock` el acceso de prueba es **admin / admin123**.

*Importante para la demo:* el backend debe estar corriendo en `http://localhost:3001` para que login, usuarios e inventario funcionen, porque el frontend consume la API en esa URL.

---

## 4. Avances del LOGIN

- Pantalla: `src/components/Login.jsx`. Servicio: `src/services/authService.js`.
- Opciones de sesión:
  - **Recordar sesión:** si se marca "recordarme" guarda token/usuario en `localStorage`; si no, en `sessionStorage` (se limpia al cerrar el navegador). Ver `getStorage` / `persistSession`.
  - **Recuperar contraseña:** modal que llama a `forgotPassword` → `POST /auth/forgot-password`.
- Lógica de validación:
  - En `login()` se exige usuario y contraseña no vacíos (líneas 44-49).
  - Modo `mock`: `admin / admin123` (líneas 51-63).
  - Modo `supabase`: `POST ${API_URL}/auth/login` con `usernameOrEmail` y `password` (líneas 69-99).
  - Tras el login se guarda el token y los datos del usuario.
- Cierre de sesión: `logout()` borra las claves de sesión (local/session).
- Utilidades: `isAuthenticated()`, `getCurrentUser()`, `getAccessToken()`.

**Qué funciona hoy:** login (mock y Supabase), persistencia según "recordarme", y recuperación de contraseña. **Rutas protegidas** por rol desde el `Dashboard` (`isAdminUser`).

---

## 5. Avances del MÓDULO DE USUARIOS

- Pantalla: `src/components/modules/GestionUsuarios.jsx`. Servicio: `src/services/usersService.js`. Controlador: `backend/src/controllers/usersController.js`.
- **Funcionalidades reales detectadas:**
  - **Listado** de usuarios con columnas (nombre, usuario, email, rol, departamento/municipio, último acceso, estado).
  - **Filtros** por rol y **búsqueda**.
  - **Crear usuario** completo: nombre (primer/segundo nombre y apellidos), usuario, email, contraseña, rol, estado y ubicación (departamento/municipio). Se hace en dos pasos: crear en Supabase Auth y luego el perfil en `profiles`.
  - **Editar usuario**: actualizar datos del perfil y opcionalmente la contraseña (`updateUserById`).
  - **Eliminar usuario**.
  - **Selección de departamento → municipio** encadenada (los catálogos vienen de `/api/users/departamentos` y `/api/users/municipios`).
  - Formulario con **validaciones** (campos requeridos y bloqueo según modo: se habilitan en modo "nuevo" y edición, y se bloquean en "ver").

### Ordenamientos, paginación, reportes y ficha
- **Ordenamiento:** la pantalla muestra el listado; no se confirmó un ordenamiento/columna configurable en el código. Se debe presentar el listado tal cual.
- **Paginación:** no se detectó paginación en el listado actual.
- **Reporte de activos/de baja:** la base de datos tiene catálogos y estados, pero **no se encontró una función de reporte implementada** (ni en el controlador ni en la pantalla). Si el profesor pregunta, indicar que es una mejora pendiente, no algo listo.
- **Ficha de usuario:** no se detectó una vista/ficha detallada separada; la edición se hace en un modal o en el mismo formulario. Presentar lo existente sin afirmar que hay ficha.

*(Nota de transparencia: el alcance de "reporte" y "ficha" no se definió con el usuario; se documenta aquí lo que el código muestra realmente, para no inventar funcionalidad.)*

---

## 6. Guion completo (inicio a fin)

| # | Sección | Qué debo decir (resumen) | Qué debo mostrar | Qué debo destacar | Duración aprox. |
|---|---|---|---|---|---|
| 1 | Introducción | "Hoy les presento AMATI HIELO, un ERP para administrar un negocio de hielo." | Portada / pantalla inicial del proyecto | Nombre del proyecto y propósito | 0:30 |
| 2 | Stack tecnológico | "Frontend en React 19 + Vite + Tailwind, backend en Node/Express, base de datos PostgreSQL con Supabase." | `package.json`, `backend/package.json` | Separación frontend/backend y uso de Supabase | 1:00 |
| 3 | Estructura del proyecto | Recorrer carpetas principales. | Explorador de archivos: `src/`, `backend/src/`, `supabase/migrations/` | Cómo está organizado el código | 1:00 |
| 4 | Base de datos | "El esquema se gestiona con migraciones SQL." | `supabase/migrations/` (001 a 034) y una migración de ejemplo (`001`, `020`, `024`) | Tablas, relaciones y catálogos (roles, estados, departamentos/municipios) | 2:00 |
| 5 | Cómo se ejecuta | "Se instala, se configuran variables de entorno y se ejecuta `npm run dev:all`." | Terminal con `npm run dev:all`, `.env`, `.env.example` | Backend en 3001, frontend en 5173 | 1:30 |
| 6 | Login | "Inicia sesión; la sesión se guarda según 'recordarme'." | Pantalla `Login.jsx`, proceso de login (mock o Supabase) | Persistencia de sesión y recuperación de contraseña | 1:30 |
| 7 | Módulo de usuarios | "Permite administrar usuarios: crear, listar, editar, eliminar, con roles y ubicación." | `GestionUsuarios.jsx`, crear un usuario, filtrar, editar | CRUD completo + catálogos (rol, estado, departamento/municipio) | 2:30 |
| 8 | Módulo de inventario | "Administra productos y movimientos con ajuste automático de stock." | `Inventarios.jsx`, listar productos, registrar un movimiento | RPC `registrar_movimiento_inventario` y validación de stock | 2:00 |
| 9 | Seguridad | "Hay middleware que valida token y roles." | `requireSession.js`, `requireAdmin.js`, rutas protegidas | Solo Superusuario/Administrador acceden a ciertas rutas | 1:00 |
| 10 | Estado del proyecto y próximos pasos | "El núcleo está listo; hay módulos planeados que se muestran 'en proceso'." | Pantalla `ModuloEnProceso.jsx`, tablas de compras/clientes/facturación | Qué está terminado y qué es mejora pendiente (reportes, paginación, ficha) | 1:00 |

**Duración total recomendada: ~14 minutos.**

---

## 7. Lista de pantallas a grabar

1. Pantalla de login (`src/components/Login.jsx`).
2. Modal de recuperación de contraseña.
3. Dashboard / menú principal (`src/components/Dashboard.jsx`).
4. Módulo de Usuarios: listado con filtros y búsqueda (`GestionUsuarios.jsx`).
5. Módulo de Usuarios: formulario de crear/editar (con departamento/municipio y validaciones).
6. Módulo de Inventario: listado de productos (`Inventarios.jsx`).
7. Módulo de Inventario: registrar movimiento y ver la alerta de reabastecimiento.
8. Pantalla "Módulo en Proceso" (`ModuloEnProceso.jsx`).

---

## 8. Lista de archivos a mostrar en el video

**Estructura / configuración:**
- `package.json` (raíz y `backend/package.json`).
- `.env` (raíz) y `backend/.env.example`.
- `vite.config.js`.

**Backend:**
- `backend/src/server.js`.
- `backend/src/routes/authRoutes.js`, `usersRoutes.js`, `inventarioRoutes.js`.
- `backend/src/middleware/requireSession.js`, `requireAdmin.js`.
- `backend/src/controllers/authController.js`, `usersController.js`, `inventarioController.js`.
- `backend/src/config/supabaseAdmin.js`, `supabasePublic.js`.

**Frontend:**
- `src/services/authService.js`, `usersService.js`, `inventarioService.js`.
- `src/components/Login.jsx`, `Dashboard.jsx`, `modules/GestionUsuarios.jsx`, `modules/Inventarios.jsx`, `modules/ModuloEnProceso.jsx`.
- `src/App.jsx`, `src/main.jsx`.

**Base de datos:**
- `supabase/migrations/001_create_profiles.sql`.
- `supabase/migrations/020_catalogo_roles_profiles.sql`.
- `supabase/migrations/024_departamentos_municipios.sql`.
- `supabase/migrations/003_create_inventory.sql` y la migración del RPC (034).
- (opcional) `028_modulo_compras.sql`, `029_clientes_facturacion.sql` para mostrar módulos planeados.

---

## 9. Posibles preguntas del profesor (con respuestas)

**1. ¿Cómo se conecta el frontend con el backend?**
El frontend envía peticiones con `fetch` a `${API_URL}/api/...` (definida en `VITE_API_URL`). Cada servicio (`authService`, `usersService`, `inventarioService`) agrega el token de sesión en el header `Authorization: Bearer <token>`. La API expone rutas en `/auth`, `/api/users` y `/api/inventario`.

**2. ¿Cómo se maneja la seguridad y la autenticación?**
Las contraseñas y sesiones las gestiona Supabase Auth. El backend valida el token con `requireSession` (y `requireAdmin` para acciones administrativas). Las rutas protegidas devuelven 401 si falta el token y 403 si el rol no es permitido o el usuario está inactivo.

**3. ¿Cómo se administra la base de datos?**
Con **migraciones SQL** en `supabase/migrations/` (001 a 034). Cada migración crea/ajusta tablas y catálogos. El acceso se hace desde el backend con el cliente de Supabase (`supabaseAdmin` para operaciones con permisos elevados).

**4. ¿Qué es el modo "mock"?**
Es un modo de desarrollo (controlado por `VITE_AUTH_MODE`/`AUTH_MODE`) para probar sin depender de la nube. Permite entrar con `admin/admin123` y usa un token falso `mock-token`. En producción se usa `supabase`.

**5. ¿Qué falta o qué mejoras hay pendientes?**
Del análisis del código: no hay paginación en el listado de usuarios, no hay un "reporte de activos/de baja" implementado, ni una ficha de usuario separada. Los módulos de compras, clientes, facturación, POS y producción están **planeados** (tablas creadas) pero sus interfaces están "en proceso". Esto se debe presentar como trabajo futuro, no como terminado.

**6. ¿Cómo se hace el inventario y el control de stock?**
Los movimientos se registran mediante la función RPC `registrar_movimiento_inventario`, que ejecuta la operación y ajusta el `stock` del producto en una transacción. La pantalla de inventario valida el stock antes de permitir una salida.

**7. ¿Con qué se levanta el proyecto?**
`npm install` (raíz y backend), configurar `.env` y `.env.example`, y ejecutar `npm run dev:all` (levanta frontend en 5173 y backend en 3001).

---
*Documento generado a partir del código real del repositorio; no incluye funcionalidades inventadas.*
