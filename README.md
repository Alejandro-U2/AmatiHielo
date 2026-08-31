# AMATI HIELO - Sistema de Gestion ERP

Sistema de gestion para la empresa **AMATI HIELO**. Este repositorio expone los modulos
**funcionales** (Login, Seguridad y Acceso, Inventarios); los demas modulos estan visibles
en el menu con la etiqueta "En Proceso" y se activaran en versiones posteriores.

## Stack tecnologico

- **Frontend:** Vite 7 + React 19 + Tailwind CSS 3
- **Backend:** Node.js + Express (ES Modules)
- **Base de datos:** Supabase (PostgreSQL + Auth)
- **Librerias:** sonner (notificaciones), lucide-react (iconos)

## Estructura del proyecto

```
├── src/                  # Frontend (React)
│   ├── components/
│   │   ├── modules/      # Paginas de cada modulo
│   │   ├── Login.jsx     # Pantalla de autenticacion
│   │   ├── RecuperarContrasena.jsx  # Recuperacion / restablecimiento de contrasena
│   │   └── Dashboard.jsx # Shell principal (sidebar + contenido)
│   ├── services/         # Consumo de la API
│   └── assets/           # Recursos estaticos
├── backend/
│   └── src/
│       ├── controllers/  # Logica de cada endpoint
│       ├── routes/       # Definicion de rutas
│       ├── middleware/   # requireSession / requireAdmin
│       └── config/       # Clientes de Supabase
└── supabase/
    └── migrations/       # Historia completa de la base de datos
```

## Estado de modulos

| Modulo | Estado |
|---|---|
| Inicio (dashboard) | Activo |
| Seguridad y Acceso | Activo |
| Inventarios | Activo |
| Recetas de Venta | En Proceso |
| Punto de Venta | En Proceso |
| Mantenimiento de datos | En Proceso |
| Configuracion del Sistema | En Proceso |
| IA Predictiva | En Proceso |
| Reportes | En Proceso |

## Comandos

```bash
npm install                  # Instala dependencias del frontend (raiz)
npm install --prefix backend # Instala dependencias del backend
npm run dev:all              # Frontend (:5173) + Backend (:3001)
npm run dev:frontend         # Solo frontend
npm run dev:backend          # Solo backend
npm run build                # Build de produccion
npm run lint                 # ESLint
```

## Configuracion de entorno

1. Copia `.env.example` a `.env` (raiz) y `backend/.env.example` a `backend/.env`.
2. Completa las credenciales de Supabase.

Modo de autenticacion (`VITE_AUTH_MODE`):

- `mock` -> login local con `admin` / `admin123` (sin base de datos, ideal para probar la UI).
- `supabase` -> login real contra el backend y Supabase.

> En modo `supabase`, el backend exige `SUPABASE_URL`, `SUPABASE_ANON_KEY` y
> `SUPABASE_SERVICE_ROLE_KEY` en `backend/.env`.

## Base de datos (Supabase)

Aplica las migraciones de `supabase/migrations/` en orden numerico desde el SQL Editor de
Supabase. La historia completa (001-029 y 031-034) deja la base funcional para el login
y los modulos de usuarios e inventarios, y para los catalogos de los modulos futuros.

Ejemplo para el login real: crea un usuario en Auth de Supabase y un perfil asociado con
rol `Administrador` o `Superusuario` y estado `Activo` para poder operar modulos de gestion.

## Conectividad de los modulos activos

| Modulo | Endpoints | Tablas | Migraciones |
|---|---|---|---|
| Login | `POST /auth/login` | `perfil`, `rol`, `estado_usuario` | 001, 002 |
| Seguridad y Acceso | `/api/users` (CRUD, roles, estados, departamentos, municipios) | `perfil`, `rol`, `estado_usuario`, `departamento`, `municipio` | 016, 018, 020-026, 032 |
| Inventarios | `/api/inventario` (productos, categorias, tipos de movimiento, movimiento) | `producto`, `movimiento_inventario`, `catalogo_categoria_inventario`, `tipo_movimiento`, `unidad_compra` | 003-010, 015, 022, 027 |

## Como activar un modulo en proceso

1. Copiar el componente del modulo en `src/components/modules/`.
2. Copiar su servicio en `src/services/`.
3. Copiar controlador y rutas en `backend/src/controllers/` y `backend/src/routes/`.
4. Montar las rutas en `backend/src/server.js`.
5. Agregar la vista en `activeViews` y marcar `estado: 'activo'` en `src/components/Dashboard.jsx`.
6. Verificar con `npm run build` y `npm run lint`.