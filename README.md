# AMATI HIELO - Sistema de Gestion ERP

Repositorio publico del sistema de gestion para la empresa **AMATI HIELO**.

## Stack tecnologico

- **Frontend:** Vite 7 + React 19 + Tailwind CSS 3
- **Backend:** Node.js + Express (ES Modules)
- **Base de datos:** Supabase (PostgreSQL + Auth)
- **Librerias:** sonner (notificaciones), lucide-react (iconos)

## Estructura del proyecto

```
├── src/                # Frontend (React)
│   ├── components/     # Componentes de interfaz y modulos
│   ├── services/       # Servicios de comunicacion con el backend
│   └── assets/         # Recursos estaticos
├── backend/            # API (Express)
│   └── src/
│       ├── controllers/  # Logica de cada endpoint
│       ├── routes/       # Definicion de rutas
│       ├── middleware/   # Validacion de sesion y permisos
│       └── config/       # Clientes de Supabase
└── supabase/
    └── migrations/     # Historia de la base de datos
```

## Comandos

```bash
npm run dev:all        # Frontend (:5173) + Backend (:3001)
npm run dev:frontend   # Solo frontend
npm run dev:backend    # Solo backend
npm run build          # Build de produccion
npm run lint           # ESLint
```

## Configuracion de entorno

Copia `.env.example` a `.env` (raiz) y `backend/.env.example` a `backend/.env` y completa las credenciales de Supabase.

Modo de autenticacion (`VITE_AUTH_MODE`):

- `mock` -> login local con `admin` / `admin123` (sin base de datos)
- `supabase` -> login real contra el backend y Supabase