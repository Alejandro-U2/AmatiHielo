# AMATI Backend

Backend Node.js + Express para administrar usuarios y roles con Supabase como base de datos y autenticación.

## Requisitos
- Node.js 18+

## Instalación

```bash
npm install
```

## Variables de entorno

Copia `.env.example` a `.env` y completa los valores:

```env
PORT=3001
FRONTEND_URL=http://localhost:5173
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key_secreta
```

## Ejecutar en desarrollo

```bash
npm run dev
```

## Rutas principales
- `GET /health`
- `GET /api/users`
- `POST /api/users`
- `PUT /api/users/:id`
- `DELETE /api/users/:id`

## Seguridad
Las rutas de usuarios requieren un token Bearer válido de Supabase y un perfil con rol `Superusuario` o `Administrador`.
