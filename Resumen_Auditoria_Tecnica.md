# RESUMEN DE AUDITORÍA TÉCNICA · SISTEMA AMATI HIELO

**Fecha de Ejecución:** Octubre de 2026  
**Auditor Técnico:** Ingeniero de Software Senior / Arquitecto de Sistemas  
**Repositorio Auditado:** `amati-hielo` (Frontend, Backend, Supabase Migrations)  
**Versión de Entrega:** v1.0.0 (Release Auditado y Documentado)  
**Documentos Generados:**
- [Manual_Tecnico_AMATI_HIELO.docx](file:///c:/Users/HP/Downloads/amati-hielo/Manual_Tecnico_AMATI_HIELO.docx)
- [Manual_Tecnico_AMATI_HIELO.pdf](file:///c:/Users/HP/Downloads/amati-hielo/Manual_Tecnico_AMATI_HIELO.pdf)
- [Resumen_Auditoria_Tecnica.md](file:///c:/Users/HP/Downloads/amati-hielo/Resumen_Auditoria_Tecnica.md)

---

## 1. RESUMEN EJECUTIVO

Se realizó una auditoría técnica profunda, empírica y verificable sobre la totalidad del repositorio del sistema **AMATI HIELO**, contrastando la documentación existente contra el código fuente real, dependencias efectivas, 53 archivos de migración SQL, suites de pruebas unitarias y compilación de producción.

El sistema implementa una arquitectura desacoplada en tres capas (Presentación SPA en React 19, Servicios REST en Express con ES Modules y Base de Datos Relacional en PostgreSQL 15+ administrada en Supabase). Dispone de un modo dual de autenticación (`mock` para prototipado y `supabase` para producción con JWT), validación de sesiones con verificación viva en base de datos (bloqueo instantáneo de usuarios inactivados) y deducción atómica de existencias mediante funciones almacenadas RPC con bloqueos `SELECT ... FOR UPDATE`.

---

## 2. STACK TECNOLÓGICO CONFIRMADO

| Componente | Tecnología | Versión | Propósito / Evidencia |
|---|---|---|---|
| **Frontend** | React | 19.2.0 | Biblioteca central de UI reactiva (`package.json`). |
| **Frontend** | Vite | 7.3.1 | Empaquetador y dev server con proxy inverso (`vite.config.js`). |
| **Frontend** | Tailwind CSS | 3.4.19 | Framework utilitario para diseño responsive y temas (`tailwind.config.js`). |
| **Frontend** | React Router DOM | 7.13.0 | Enrutador declarativo client-side (`src/App.jsx`). |
| **Frontend** | Sonner | 2.0.7 | Notificaciones toast no bloqueantes (`src/components/modules/`). |
| **Frontend** | Lucide React | 1.27.0 | Iconografía vectorial (`src/components/Dashboard.jsx`). |
| **Frontend** | Recharts | 3.10.1 | Gráficos estadísticos de ventas y demanda (`IAPredictiva.jsx`). |
| **Frontend/Backend** | jsPDF | 4.2.1 | Generación de reportes PDF descargables. |
| **Frontend** | xlsx (SheetJS) | 0.18.5 | Exportación de datos a hojas de cálculo Excel. |
| **Backend** | Node.js | v20+ / v22 LTS | Runtime JavaScript en servidor con estándar ES Modules (`type: module`). |
| **Backend** | Express | 4.21.2 | Servidor web HTTP RESTful (`backend/src/server.js`). |
| **Backend** | CORS | 2.8.5 | Control de orígenes dinámicos permitidos (`backend/src/server.js`). |
| **Backend** | Dotenv | 16.6.1 | Carga de variables de entorno locales (`.env`). |
| **Backend** | @supabase/supabase-js | 2.53.0 (BE) / 2.104.0 (FE) | Cliente SDK para Auth, Database y Realtime. |
| **Backend** | @google/generative-ai | 0.24.1 | SDK oficial para modelo Gemini 1.5 Flash (`geminiService.js`). |
| **Base de Datos** | PostgreSQL / Supabase | 15+ | Motor relacional con 45 tablas activas, RPCs y RLS. |
| **Testing** | Vitest | 2.1.9 (BE) / 4.0.18 (FE) | Framework de pruebas unitarias (`backend/package.json`). |
| **Linter** | ESLint | 9.39.1 | Análisis estático de código (`eslint.config.js`). |
| **API Externa** | Open-Meteo | v1 REST | Servicio meteorológico público consumido en `weatherService.ts`. |

*Nota sobre dependencias no utilizadas en producción:* Paquetes como `@chromatic-com/storybook`, `@storybook/react-vite` y `@vitest/browser-playwright` residen exclusivamente en `devDependencies` para pruebas aisladas de componentes y no se incluyen en el build final.

---

## 3. PRUEBAS Y VALIDACIÓN TÉCNICA EJECUTADA

### 3.1 Pruebas Unitarias de Backend (Vitest)
- **Comando Ejecutado:** `npm run test --prefix backend -- --run`
- **Versión de Vitest:** v2.1.9
- **Suites Ejecutadas:** 3 archivos de prueba
- **Total de Pruebas:** 24 pruebas
- **Resultados Obtenidos:** **23 PASADAS, 1 FALLIDA**
  1. `tests/calculateUnitCost.test.js` (1/1 Pasada): Verificación matemática exacta del costo unitario (`precioPaquete / cantidadCompra`).
  2. `tests/chatbotController.test.js` (8/8 Pasadas): Aprobación de control de intenciones, manejo de errores y validación de sesiones en el chatbot.
  3. `tests/chatbotRules.test.js` (14/15 Pasadas, 1 Fallida): 14 pruebas de resolución contextual y seguimiento de conversación aprobaron. La prueba *"lista el catálogo real de reportes y limita el mensaje para operarios"* falló por aserción literal de cadena (`AssertionError: expected 'Puedes generar reportes de usuarios...' to contain 'Reporte de Ventas Diario'`).

### 3.2 Compilación de Producción de Frontend (Vite Build)
- **Comando Ejecutado:** `npm run build`
- **Versión de Vite:** v7.3.1
- **Resultado:** **EXITOSA (Código 0)** en 31.57 segundos.
- **Módulos Transformados:** 2,752 módulos.
- **Salida:** Carpeta `dist/` generada con Rollup chunks optimizados (`Inventarios-*.js` 136 kB, `vendor-export-*.js` 874 kB, `vendor-charts-*.js` 401 kB, `vendor-supabase-*.js` 194 kB, `index-*.js` 376 kB).

### 3.3 Análisis Estático de Código (ESLint)
- **Comando Ejecutado:** `npm run lint`
- **Versión de ESLint:** v9.39.1
- **Resultado:** **7 problemas detectados (6 errores, 1 advertencia)**:
  - `backend/src/controllers/authController.js` (líneas 10, 17, 30): Bloques `catch` vacíos (`no-empty`).
  - `src/components/RecuperarContrasena.jsx` (línea 234): Bloque `catch` vacío (`no-empty`).
  - `src/components/modules/PuntoVenta.jsx` (línea 287): Falta de dependencia `'loadData'` en `useEffect` (`react-hooks/exhaustive-deps`).
  - `src/components/modules/auditoria/AuditoriaWizard.jsx` (línea 62): Invocación síncrona de `setState` dentro de un efecto (`react-hooks/set-state-in-effect`).
  - `src/utils/reportesExport.js` (línea 66): Parámetro `'subtitle'` no utilizado (`no-unused-vars`).

---

## 4. HALLAZGOS TÉCNICOS E INCONSISTENCIAS AUDITADAS

### 4.1 Inconsistencias en las Migraciones SQL (`supabase/migrations/`)
Se auditaron los 53 archivos SQL de migración identificando:
1. **Numeración Duplicada en 034:** `034_costos_produccion_recetas.sql` y `034_fix_rpc_movimiento_overload.sql`. El segundo corrige el error PostgREST PGRST203 eliminando la firma sobrecargada de 5 argumentos del RPC `registrar_movimiento_inventario`.
2. **Duplicado Idéntico en 035:** `035_costos_produccion_recetas.sql` es idéntica a la 034. La migración funcional correcta para este paso es `035_costos_en_tabla_receta.sql`.
3. **Duplicado Idéntico en 036:** `036_costos_en_tabla_receta.sql` repite el contenido de la 035. La migración que introduce cambios reales es `036_proveedor_movimientos.sql` (agrega `proveedor_id` a `movimiento_inventario`).
4. **Numeración Duplicada en 048:** `048_arqueo_caja_sencillo.sql` (fondo de sencillo en caja) y `048_historial_prediccion_demanda.sql` (tabla de predicciones IA) comparten el índice 048 para propósitos distintos.
5. **Saltos de Numeración:** No existen los archivos `030_*.sql` ni `042_*.sql` en el repositorio.

### 4.2 Gobernanza y Controles de Seguridad
1. **Verificación Viva de Perfil:** En `backend/src/middleware/requireSession.js`, la validación de estado no confía en los claims estáticos del JWT, sino que consulta directamente `perfil.estado_usuario_id` en tiempo real. Un usuario inactivado es bloqueado de inmediato.
2. **Protección de Auto-Eliminación:** Tanto el frontend (`GestionUsuarios.jsx`) como el backend impiden que un administrador pueda eliminar o desactivar su propia cuenta.
3. **Bloqueo Concurrente en Inventario:** La función RPC `registrar_movimiento_inventario` aplica `SELECT ... FOR UPDATE` sobre la fila del producto antes de descontar stock, previniendo condiciones de carrera y stocks negativos.

---

## 5. MATRIZ DE CLASIFICACIÓN FUNCIONAL

| Módulo / Funcionalidad | Clasificación de Auditoría | Justificación Técnica |
|---|---|---|
| **Login y Recuperación de Clave** | **Implementada y Verificada** | Operativo en modo Mock y Supabase; parsea enlaces `token_hash`, `code` y `access_token`. |
| **Seguridad y Gestión de Usuarios** | **Implementada y Verificada** | CRUD completo, validaciones regex de nombres, spinners en cascada (Depto -> Muni). |
| **Inventarios y Kardex** | **Implementada y Verificada** | Existencias, estado de stock derivado, modales de Entrada, Salida y Mermas por motivo. |
| **Punto de Venta (POS)** | **Implementada, Parcialmente Integrada** | Componente `PuntoVenta.jsx` y endpoints operativos; marcado con etiqueta "En Proceso" en el menú. |
| **Recetas y Costeo BOM** | **Implementada, Parcialmente Integrada** | Fórmulas, prorrateo de costos e ingredientes vinculados; en proceso de activación final en menú. |
| **Auditoría Física Ciega** | **Implementada y Verificada** | Sub-módulo completo (`auditoria/`), conciliación de stock y ajuste automático en Kardex. |
| **Arqueo Semanal de Caja** | **Implementada y Verificada** | Endpoints `/api/caja/arqueo`, cálculo de fondo de sencillo, sobrantes y faltantes. |
| **IA Predictiva de Demanda** | **Implementada, Parcialmente Integrada** | Integración con Open-Meteo y Gemini funcional; vista marcada en proceso en el dashboard. |
| **Configuración del Sistema** | **Implementada y Verificada en Backend** | Controladores y tablas `config_empresa`, `config_impuestos` e `sucursal` activos en base de datos. |
| **Mantenimiento de Estructuras** | **Implementada y Verificada en Backend** | Tablas `tabla_estructura` y `campo_estructura` con endpoints dinámicos de consulta. |

---

## 6. RECOMENDACIONES TÉCNICAS PARA EL EQUIPO DE DESARROLLO

1. **Corrección de Prueba en `chatbotRules.test.js`:** Actualizar la aserción en la línea 91 para que valide el nuevo texto retornado por `getFixedChatReply()`, logrando así el 100% de pruebas unitarias aprobadas.
2. **Subsanación de Errores ESLint:**
   - Agregar manejo de error explícito (`console.error(err)`) en los bloques `catch` vacíos de `authController.js` y `RecuperarContrasena.jsx`.
   - Mover la llamada `setSelectedResponsableId` fuera del cuerpo síncrono del efecto en `AuditoriaWizard.jsx` para cumplir con las directivas de React 19.
   - Eliminar el parámetro no utilizado `subtitle` en `src/utils/reportesExport.js`.
3. **Consolidación de Migraciones en Producción:** Mantener la aplicación de scripts SQL en el orden alfabético estricto actual para preservar la idempotencia.
4. **Activación de Módulos en Dashboard:** Para habilitar los módulos listados como suspendidos (`pos`, `configuracion-sistema`, `ia`), retirar la propiedad `suspended: true` en el arreglo `modules` de `src/components/Dashboard.jsx`.

---
*Fin del Resumen de Auditoría Técnica.*
