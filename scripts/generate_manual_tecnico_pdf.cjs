const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

async function generateManualTecnicoPdf() {
  console.log('Iniciando generador de Manual Técnico en PDF para AMATI HIELO...');

  let logoBase64 = '';
  const logoPath = path.join(__dirname, '..', 'src', 'assets', 'logo-amati.jpg');
  if (fs.existsSync(logoPath)) {
    const logoBuffer = fs.readFileSync(logoPath);
    logoBase64 = `data:image/jpeg;base64,${logoBuffer.toString('base64')}`;
  }

  const htmlContent = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Manual Técnico - AMATI HIELO</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');

    @page {
      size: letter;
      margin: 18mm 15mm 18mm 15mm;
      @bottom-right {
        content: counter(page);
      }
    }

    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    body {
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      font-size: 9.5pt;
      line-height: 1.55;
      color: #1e293b;
      margin: 0;
      padding: 0;
      background: #ffffff;
    }

    h1, h2, h3, h4, h5, h6 {
      font-family: 'Outfit', sans-serif;
      color: #0f172a;
      margin-top: 1.3em;
      margin-bottom: 0.45em;
      font-weight: 700;
      page-break-after: avoid;
    }

    h1 {
      font-size: 18pt;
      color: #0369a1;
      border-bottom: 2pt solid #0284c7;
      padding-bottom: 4px;
      margin-top: 1.5em;
    }

    h2 {
      font-size: 13.5pt;
      color: #0f766e;
      border-bottom: 1pt solid #cbd5e1;
      padding-bottom: 3px;
      margin-top: 1.3em;
    }

    h3 {
      font-size: 11pt;
      color: #1e293b;
      margin-top: 1.1em;
    }

    h4 {
      font-size: 10pt;
      color: #334155;
      margin-top: 0.9em;
    }

    p {
      margin-top: 0;
      margin-bottom: 0.75em;
      text-align: justify;
    }

    ul, ol {
      margin-top: 0;
      margin-bottom: 0.85em;
      padding-left: 22px;
    }

    li {
      margin-bottom: 0.35em;
      text-align: justify;
    }

    .page-break {
      page-break-before: always;
    }

    .avoid-break {
      page-break-inside: avoid;
    }

    /* Portada */
    .portada-container {
      height: 94vh;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      text-align: center;
      padding: 15px 10px;
    }

    .portada-header {
      border-bottom: 2px solid #0284c7;
      padding-bottom: 15px;
    }

    .portada-univ {
      font-size: 14.5pt;
      font-weight: 800;
      color: #0f172a;
      text-transform: uppercase;
      letter-spacing: 1.2px;
    }

    .portada-fac {
      font-size: 11.5pt;
      font-weight: 600;
      color: #475569;
      margin-top: 4px;
    }

    .portada-carrera {
      font-size: 10.5pt;
      color: #0284c7;
      font-weight: 600;
      margin-top: 3px;
    }

    .portada-body {
      margin: 25px 0;
    }

    .portada-logo {
      width: 110px;
      height: 110px;
      border-radius: 50%;
      border: 3px solid #0284c7;
      margin: 0 auto 16px auto;
      object-fit: cover;
      box-shadow: 0 4px 14px rgba(2, 132, 199, 0.25);
    }

    .portada-proyecto-label {
      font-size: 8.5pt;
      text-transform: uppercase;
      letter-spacing: 2px;
      color: #64748b;
      font-weight: 700;
    }

    .portada-titulo {
      font-size: 15pt;
      font-weight: 800;
      color: #0c4a6e;
      margin: 12px 20px;
      line-height: 1.35;
    }

    .portada-doc-tipo {
      display: inline-block;
      background: linear-gradient(135deg, #0284c7, #0369a1);
      color: white;
      padding: 7px 24px;
      border-radius: 20px;
      font-size: 12.5pt;
      font-weight: 700;
      letter-spacing: 1.5px;
      margin-top: 12px;
      text-transform: uppercase;
    }

    .portada-empresa {
      font-size: 12.5pt;
      font-weight: 700;
      color: #0f766e;
      margin-top: 14px;
    }

    .portada-footer {
      border-top: 1px solid #cbd5e1;
      padding-top: 16px;
      font-size: 9pt;
      color: #334155;
      display: grid;
      grid-template-columns: 1fr 1fr;
      text-align: left;
    }

    .portada-footer-right {
      text-align: right;
    }

    /* Carátula */
    .caratula-box {
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 20px;
      background: #f8fafc;
      margin: 20px 0;
    }

    .caratula-row {
      display: flex;
      margin-bottom: 10px;
      border-bottom: 1px dashed #e2e8f0;
      padding-bottom: 7px;
    }

    .caratula-label {
      width: 32%;
      font-weight: 700;
      color: #334155;
      font-size: 8.5pt;
      text-transform: uppercase;
    }

    .caratula-val {
      width: 68%;
      color: #0f172a;
      font-weight: 500;
      font-size: 9pt;
    }

    /* Tablas */
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 10px 0 14px 0;
      font-size: 8.5pt;
      page-break-inside: avoid;
    }

    th {
      background: #0f766e;
      color: #ffffff;
      font-weight: 600;
      text-align: left;
      padding: 6px 8px;
      border: 1px solid #0d9488;
      font-size: 8.5pt;
      letter-spacing: 0.2px;
    }

    td {
      padding: 5.5px 8px;
      border: 1px solid #cbd5e1;
      vertical-align: top;
    }

    tr:nth-child(even) td {
      background-color: #f8fafc;
    }

    /* Bloques de código */
    pre {
      background-color: #0f172a;
      color: #f1f5f9;
      padding: 10px 12px;
      border-radius: 6px;
      font-family: 'JetBrains Mono', Consolas, Monaco, monospace;
      font-size: 8pt;
      overflow-x: auto;
      line-height: 1.45;
      margin: 8px 0 12px 0;
      border-left: 3px solid #0284c7;
      page-break-inside: avoid;
    }

    code {
      font-family: 'JetBrains Mono', Consolas, Monaco, monospace;
      font-size: 8.5pt;
      background-color: #f1f5f9;
      color: #0369a1;
      padding: 1px 4px;
      border-radius: 4px;
      border: 1px solid #e2e8f0;
    }

    pre code {
      background-color: transparent;
      color: inherit;
      padding: 0;
      border: none;
      font-size: 8pt;
    }

    /* Alertas / Cajas destacadas */
    .alert-box {
      border-radius: 6px;
      padding: 9px 12px;
      margin: 10px 0 14px 0;
      font-size: 8.5pt;
      page-break-inside: avoid;
      display: flex;
      gap: 10px;
    }

    .alert-icon {
      font-size: 13pt;
      line-height: 1;
      font-weight: bold;
    }

    .alert-content {
      flex: 1;
    }

    .alert-content p:last-child {
      margin-bottom: 0;
    }

    .alert-note {
      background-color: #eff6ff;
      border-left: 4px solid #3b82f6;
      color: #1e40af;
    }

    .alert-important {
      background-color: #fefce8;
      border-left: 4px solid #eab308;
      color: #854d0e;
    }

    .alert-security {
      background-color: #fef2f2;
      border-left: 4px solid #ef4444;
      color: #991b1b;
    }

    .alert-tech {
      background-color: #f0fdf4;
      border-left: 4px solid #10b981;
      color: #065f46;
    }

    /* Índice */
    .toc {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 16px 20px;
      margin: 14px 0 20px 0;
    }

    .toc-item {
      display: flex;
      justify-content: space-between;
      margin-bottom: 5px;
      font-size: 9pt;
      border-bottom: 1px dotted #cbd5e1;
      padding-bottom: 2px;
    }

    .toc-item.level-1 {
      font-weight: 700;
      color: #0369a1;
      margin-top: 7px;
      border-bottom: 1px solid #cbd5e1;
    }

    .toc-item.level-2 {
      padding-left: 15px;
      color: #334155;
      font-weight: 500;
    }

    .toc-item.level-3 {
      padding-left: 28px;
      color: #64748b;
      font-size: 8.5pt;
    }

    /* Insignias de verificación */
    .badge-verified {
      display: inline-block;
      background: #dcfce7;
      color: #166534;
      font-weight: 600;
      padding: 2px 7px;
      border-radius: 10px;
      font-size: 7.5pt;
      border: 1px solid #bbf7d0;
    }

    .badge-pending {
      display: inline-block;
      background: #fef3c7;
      color: #92400e;
      font-weight: 600;
      padding: 2px 7px;
      border-radius: 10px;
      font-size: 7.5pt;
      border: 1px solid #fde68a;
    }

    .tree-view {
      font-family: 'JetBrains Mono', Consolas, monospace;
      font-size: 8pt;
      background: #0f172a;
      color: #38bdf8;
      padding: 12px;
      border-radius: 6px;
      line-height: 1.4;
      white-space: pre;
    }
  </style>
</head>
<body>

  <!-- ==================== 1. PORTADA ==================== -->
  <div class="portada-container">
    <div class="portada-header">
      <div class="portada-univ">[UNIVERSIDAD DE SAN CARLOS DE GUATEMALA - CAMPO EDITABLE]</div>
      <div class="portada-fac">FACULTAD DE INGENIERÍA · ESCUELA DE CIENCIAS Y SISTEMAS</div>
      <div class="portada-carrera">INGENIERÍA EN CIENCIAS Y SISTEMAS · PROYECTO DE GRADUACIÓN</div>
    </div>

    <div class="portada-body">
      ${logoBase64 ? `<img src="${logoBase64}" class="portada-logo" alt="Logo AMATI HIELO" />` : ''}
      <div class="portada-proyecto-label">PROYECTO DE SISTEMA DE INFORMACIÓN Y TRAZABILIDAD</div>
      <div class="portada-titulo">
        Sistema web para la gestión integral de trazabilidad y control de inventarios en plantas de productos perecederos bajo cadena de frío
      </div>
      <div>
        <span class="portada-doc-tipo">MANUAL TÉCNICO</span>
      </div>
      <div class="portada-empresa">EMPRESA BENEFICIARIA: AMATI HIELO</div>
    </div>

    <div class="portada-footer">
      <div>
        <strong>Integrantes del Equipo:</strong><br>
        [Nombre del Estudiante 1 - Carné - Editable]<br>
        [Nombre del Estudiante 2 - Carné - Editable]<br>
        <strong>Carrera:</strong> Ingeniería en Ciencias y Sistemas
      </div>
      <div class="portada-footer-right">
        <strong>Asesor / Catedrático:</strong><br>
        [Nombre del Asesor Metodológico / Técnico - Editable]<br>
        <strong>Lugar y Fecha:</strong><br>
        Guatemala, Octubre de 2026
      </div>
    </div>
  </div>

  <div class="page-break"></div>

  <!-- ==================== 2. CARÁTULA ==================== -->
  <h1>2. Carátula Institucional</h1>
  <p>
    El presente documento corresponde al <strong>Manual Técnico Oficial</strong> del software de gestión integral y trazabilidad, desarrollado con fines académicos y de transferencia tecnológica directa para la empresa productora y distribuidora de hielo purificado <strong>AMATI HIELO</strong>.
  </p>

  <div class="caratula-box">
    <div class="caratula-row">
      <div class="caratula-label">Institución Académica:</div>
      <div class="caratula-val">[Universidad de San Carlos de Guatemala / Institución Universitaria]</div>
    </div>
    <div class="caratula-row">
      <div class="caratula-label">Unidad Académica:</div>
      <div class="caratula-val">Facultad de Ingeniería · Escuela de Ciencias y Sistemas</div>
    </div>
    <div class="caratula-row">
      <div class="caratula-label">Título del Proyecto:</div>
      <div class="caratula-val">Sistema web para la gestión integral de trazabilidad y control de inventarios en plantas de productos perecederos bajo cadena de frío</div>
    </div>
    <div class="caratula-row">
      <div class="caratula-label">Tipo de Documento:</div>
      <div class="caratula-val">Manual Técnico de Arquitectura, Despliegue, Base de Datos y Mantenimiento</div>
    </div>
    <div class="caratula-row">
      <div class="caratula-label">Entidad Beneficiaria:</div>
      <div class="caratula-val">AMATI HIELO (Planta de producción y distribución de hielo envasado)</div>
    </div>
    <div class="caratula-row">
      <div class="caratula-label">Equipo de Desarrollo:</div>
      <div class="caratula-val">[Nombres y Apellidos de los Autores / Carnés de Estudiantes]</div>
    </div>
    <div class="caratula-row">
      <div class="caratula-label">Asesor del Proyecto:</div>
      <div class="caratula-val">[Nombre del Asesor de Graduación o Docente Revisor]</div>
    </div>
    <div class="caratula-row">
      <div class="caratula-label">Versión del Sistema:</div>
      <div class="caratula-val">v1.0.0 (Release de Implementación y Evaluación)</div>
    </div>
    <div class="caratula-row">
      <div class="caratula-label">Fecha de Emisión:</div>
      <div class="caratula-val">Octubre de 2026</div>
    </div>
  </div>

  <div class="alert-box alert-tech">
    <div class="alert-icon">ℹ</div>
    <div class="alert-content">
      <strong>Propósito de Transferencia:</strong> Este manual proporciona toda la información de ingeniería de software requerida para la instalación en servidores limpios, aprovisionamiento de bases de datos relacionales, compilación de artefactos de interfaz, mantenimiento correctivo y evolución funcional del sistema sin requerir la presencia del equipo de desarrollo inicial.
    </div>
  </div>

  <div class="page-break"></div>

  <!-- ==================== 3. ÍNDICE ==================== -->
  <h1>3. Índice General del Manual</h1>

  <div class="toc">
    <div class="toc-item level-1"><span>1. Portada Institucional</span><span>Pág. 1</span></div>
    <div class="toc-item level-1"><span>2. Carátula Institucional y Académica</span><span>Pág. 2</span></div>
    <div class="toc-item level-1"><span>3. Índice General</span><span>Pág. 3</span></div>
    <div class="toc-item level-1"><span>4. Introducción y Resumen de Tecnologías</span><span>Pág. 4</span></div>
    <div class="toc-item level-2"><span>4.1 Finalidad del Manual Técnico</span><span>Pág. 4</span></div>
    <div class="toc-item level-2"><span>4.2 Importancia de la Documentación para el Mantenimiento</span><span>Pág. 4</span></div>
    <div class="toc-item level-2"><span>4.3 Alcance y Audiencia Objetivo</span><span>Pág. 4</span></div>
    <div class="toc-item level-2"><span>4.4 Resumen Técnico del Sistema AMATI HIELO</span><span>Pág. 5</span></div>
    <div class="toc-item level-2"><span>4.5 Síntesis del Ecosistema Tecnológico</span><span>Pág. 5</span></div>
    <div class="toc-item level-1"><span>5. Objetivos</span><span>Pág. 6</span></div>
    <div class="toc-item level-2"><span>5.1 Objetivo General</span><span>Pág. 6</span></div>
    <div class="toc-item level-2"><span>5.2 Objetivos Específicos</span><span>Pág. 6</span></div>
    <div class="toc-item level-1"><span>6. Stack de Tecnologías Verificado</span><span>Pág. 7</span></div>
    <div class="toc-item level-2"><span>6.1 Matriz Comparativa de Tecnologías</span><span>Pág. 7</span></div>
    <div class="toc-item level-2"><span>6.2 Fichas Técnicas por Componente</span><span>Pág. 8</span></div>
    <div class="toc-item level-1"><span>7. Arquitectura de Carpetas del Proyecto</span><span>Pág. 10</span></div>
    <div class="toc-item level-2"><span>7.1 Árbol de Directorios del Repositorio</span><span>Pág. 10</span></div>
    <div class="toc-item level-2"><span>7.2 Responsabilidad y Componentes por Directorio</span><span>Pág. 11</span></div>
    <div class="toc-item level-1"><span>8. Requisitos Mínimos para los Servidores</span><span>Pág. 13</span></div>
    <div class="toc-item level-2"><span>8.1 Matriz de Especificaciones de Servidores</span><span>Pág. 13</span></div>
    <div class="toc-item level-2"><span>8.2 Configuración de Red, SSL y Cortafuegos</span><span>Pág. 14</span></div>
    <div class="toc-item level-2"><span>8.3 Estrategia de Respaldos, Monitoreo y Escalabilidad</span><span>Pág. 14</span></div>
    <div class="toc-item level-1"><span>9. Requisitos Mínimos para el Cliente</span><span>Pág. 15</span></div>
    <div class="toc-item level-2"><span>9.1 Especificaciones de Estaciones de Trabajo</span><span>Pág. 15</span></div>
    <div class="toc-item level-2"><span>9.2 Compatibilidad de Navegadores y Red</span><span>Pág. 15</span></div>
    <div class="toc-item level-1"><span>10. Configuración e Implementación de la Base de Datos</span><span>Pág. 16</span></div>
    <div class="toc-item level-2"><span>10.1 Arquitectura de Datos y Motor Relacional</span><span>Pág. 16</span></div>
    <div class="toc-item level-2"><span>10.2 Estructura y Diccionario de Datos del Esquema Público</span><span>Pág. 17</span></div>
    <div class="toc-item level-2"><span>10.3 Requisitos Previos y Herramientas</span><span>Pág. 21</span></div>
    <div class="toc-item level-2"><span>10.4 Procedimiento de Configuración Paso a Paso (Migraciones 001 - 051)</span><span>Pág. 22</span></div>
    <div class="toc-item level-2"><span>10.5 Procedimientos Almacenados y Funciones RPC Atómicas</span><span>Pág. 23</span></div>
    <div class="toc-item level-2"><span>10.6 Conexión Segura y Administración de Credenciales</span><span>Pág. 24</span></div>
    <div class="toc-item level-2"><span>10.7 Seguridad de Datos, Roles y Políticas RLS</span><span>Pág. 25</span></div>
    <div class="toc-item level-2"><span>10.8 Procedimientos de Verificación, Respaldos y Restauración</span><span>Pág. 26</span></div>
    <div class="toc-item level-1"><span>11. Configuración e Implementación del Backend</span><span>Pág. 27</span></div>
    <div class="toc-item level-2"><span>11.1 Arquitectura Node.js + Express en Capas</span><span>Pág. 27</span></div>
    <div class="toc-item level-2"><span>11.2 Requisitos Previos y Dependencias</span><span>Pág. 28</span></div>
    <div class="toc-item level-2"><span>11.3 Comandos de Instalación y Configuración</span><span>Pág. 28</span></div>
    <div class="toc-item level-2"><span>11.4 Matriz de Variables de Entorno del Backend</span><span>Pág. 29</span></div>
    <div class="toc-item level-2"><span>11.5 Modos de Ejecución (Desarrollo y Producción)</span><span>Pág. 30</span></div>
    <div class="toc-item level-2"><span>11.6 Integración con Supabase y Conexión de Capas</span><span>Pág. 30</span></div>
    <div class="toc-item level-2"><span>11.7 Políticas de Seguridad, CORS y Middlewares Críticos</span><span>Pág. 31</span></div>
    <div class="toc-item level-2"><span>11.8 Catálogo de Endpoints REST y Pruebas Unitarias</span><span>Pág. 32</span></div>
    <div class="toc-item level-1"><span>12. Configuración e Implementación del Frontend</span><span>Pág. 35</span></div>
    <div class="toc-item level-2"><span>12.1 Arquitectura React 19 + Vite 7 SPA</span><span>Pág. 35</span></div>
    <div class="toc-item level-2"><span>12.2 Requisitos Previos</span><span>Pág. 36</span></div>
    <div class="toc-item level-2"><span>12.3 Instalación de Dependencias del Frontend</span><span>Pág. 36</span></div>
    <div class="toc-item level-2"><span>12.4 Matriz de Variables de Entorno del Cliente</span><span>Pág. 36</span></div>
    <div class="toc-item level-2"><span>12.5 Ejecución en Entorno Local de Desarrollo</span><span>Pág. 37</span></div>
    <div class="toc-item level-2"><span>12.6 Compilación (Build) y Publicación en Producción</span><span>Pág. 37</span></div>
    <div class="toc-item level-2"><span>12.7 Protocolo de Integración con el Backend REST</span><span>Pág. 38</span></div>
    <div class="toc-item level-2"><span>12.8 Guía de Verificación Funcional Módulo por Módulo</span><span>Pág. 38</span></div>
    <div class="toc-item level-2"><span>12.9 Mantenimiento y Actualización de Dependencias</span><span>Pág. 40</span></div>
    <div class="toc-item level-1"><span>13. Verificación Técnica del Sistema</span><span>Pág. 41</span></div>
  </div>

  <div class="page-break"></div>

  <!-- ==================== 4. INTRODUCCIÓN ==================== -->
  <h1>4. Introducción y Resumen de las Tecnologías Utilizadas</h1>

  <h2>4.1. Finalidad del Manual Técnico</h2>
  <p>
    El propósito primordial de este manual es constituir la referencia arquitectónica y técnica definitiva para la puesta en marcha, administración de infraestructura, despliegue, configuración de bases de datos, aprovisionamiento de servicios de backend y mantenimiento evolutivo del <strong>Sistema web para la gestión integral de trazabilidad y control de inventarios en plantas de productos perecederos bajo cadena de frío</strong>, concebido e implementado para la empresa <strong>AMATI HIELO</strong>.
  </p>

  <h2>4.2. Importancia de la Documentación Técnica para la Mantenibilidad</h2>
  <p>
    En el ciclo de vida del software comercial e industrial, los costos y esfuerzos asociados a la fase de mantenimiento superan frecuentemente el 70% del costo total de propiedad (TCO). En empresas con requerimientos de alta disponibilidad como plantas de hielo purificado, donde la interrupción de despacho de producto en frío genera mermas irreversibles e incumplimiento comercial, contar con una documentación exhaustiva de esquemas relacionales, flujos de autenticación desacoplados, contratos de API REST y variables de entorno minimiza la deuda técnica, elimina la dependencia de programadores específicos y asegura la continuidad operativa.
  </p>

  <h2>4.3. Alcance y Perfil del Lector Objetivo</h2>
  <p>
    El alcance comprende la totalidad de los módulos de software implementados en el repositorio: control de autenticación y seguridad por roles, administración de usuarios y catálogo geográfico, inventarios con control de entradas, salidas, mermas por lote y auditoría física ciega con conciliación de stock, recetas de producción con lista de materiales (BOM) para deducción en punto de venta (POS), punto de venta con arqueos semanales de caja, módulo predictivo de demanda asistido por variables climáticas y asistente conversacional basado en modelos de lenguaje natural (LLM).
  </p>
  <p>
    <strong>Perfil del lector objetivo:</strong> Ingenieros de software, desarrolladores full-stack, administradores de bases de datos (DBA), ingenieros de infraestructura / DevOps y personal técnico responsable de la gobernanza de TI de AMATI HIELO o evaluadores universitarios de graduación.
  </p>

  <h2>4.4. Resumen Técnico del Sistema AMATI HIELO</h2>
  <p>
    AMATI HIELO opera una arquitectura desacoplada en tres niveles principales:
  </p>
  <ul>
    <li><strong>Capa de Presentación (Frontend):</strong> Single Page Application (SPA) construida en React 19 sobre el empaquetador ultrarrápido Vite 7, estructurada bajo componentes funcionales y utilidades CSS mediante Tailwind CSS. Incluye interfaces reactivas para inventarios, POS con teclado numérico, visualización de predicciones con gráficos de Recharts y un asistente chatbot embebido.</li>
    <li><strong>Capa de Servicios y Lógica de Negocio (Backend):</strong> Servidor RESTful desarrollado en Node.js 22 utilizando Express 4.21 en estándar de módulos nativos ECMAScript (ES Modules). Administra los flujos de autenticación, verificación de permisos mediante middlewares autoritativos, cálculo de costos unitarios de insumos, auditorías de inventario y canalización segura de solicitudes hacia servicios de inteligencia artificial.</li>
    <li><strong>Capa de Persistencia y Gobernanza de Datos (Base de Datos):</strong> Instancia PostgreSQL relacional gestionada en Supabase Cloud. Aloja más de 30 tablas relacionales, catálogos paramétricos, llaves foráneas con integridad referencial, índices optimizados y funciones almacenadas (RPC) con bloqueos atómicos por fila (<code>FOR UPDATE</code>) para evitar condiciones de carrera en el stock de inventario.</li>
  </ul>

  <h2>4.5. Ecosistema Tecnológico Confirmado</h2>
  <p>
    A continuación se clasifican las tecnologías confirmadas en los archivos fuente del proyecto, diferenciando estrictamente las necesarias para la ejecución en producción de aquellas herramientas empleadas exclusivamente durante la fase de desarrollo y prueba:
  </p>
  <ul>
    <li><strong>Runtimes y Motores de Producción:</strong> Node.js (v20+ / v22 LTS), PostgreSQL 15+ (alojado en infraestructura Supabase), Google Generative AI API (Gemini Flash).</li>
    <li><strong>Frameworks y Bibliotecas de Producción (Frontend):</strong> React 19.2.0, React Router DOM 7.13.0, Tailwind CSS 3.4.19, Lucide React 1.27.0, Sonner 2.0.7, Recharts 3.10.1, XLSX 0.18.5, jsPDF 4.2.1.</li>
    <li><strong>Frameworks y Bibliotecas de Producción (Backend):</strong> Express 4.21.2, @supabase/supabase-js 2.53.0 / 2.104.0, @google/generative-ai 0.24.1, cors 2.8.5, dotenv 16.6.1, jsPDF 4.2.1.</li>
    <li><strong>Herramientas de Desarrollo y Calidad (DevTools):</strong> Vite 7.3.1, PostCSS 8.5.6, Autoprefixer 10.4.24, ESLint 9.39.1, Vitest 2.1.9 / 4.0.18, Storybook 10.2.8, Playwright 1.58.2, Concurrently 9.2.1, TypeScript 6.0.3 (para tipado en archivos de predicción y servicios TS).</li>
  </ul>

  <div class="page-break"></div>

  <!-- ==================== 5. OBJETIVOS ==================== -->
  <h1>5. Objetivos del Manual Técnico</h1>

  <h2>5.1. Objetivo General</h2>
  <p>
    Documentar formalmente la arquitectura de software, el stack tecnológico verificado, el esquema relacional de base de datos, los contratos de comunicación API y los procedimientos técnicos de despliegue, configuración y mantenimiento del sistema web de inventarios y trazabilidad de AMATI HIELO, garantizando su transferibilidad y sostenibilidad operativa en entornos académicos e industriales.
  </p>

  <h2>5.2. Objetivos Específicos</h2>
  <ol>
    <li><strong>Identificar y caracterizar el stack tecnológico real</strong> utilizado en la construcción de los módulos de cliente, servidor y persistencia, detallando versiones comprobadas, compatibilidad y dependencias críticas.</li>
    <li><strong>Detallar la estructura de carpetas y distribución de archivos del repositorio</strong>, definiendo las responsabilidades funcionales de cada componente frontend, middleware y servicio backend.</li>
    <li><strong>Establecer los requerimientos mínimos y recomendados de infraestructura</strong> tanto a nivel de hardware, red y sistemas operativos para servidores de alojamiento, servicios gestionados y terminales clientes.</li>
    <li><strong>Documentar la arquitectura, esquema relacional, diccionario de datos y procedimientos de migración de la base de datos PostgreSQL</strong> en Supabase, incluyendo procedimientos almacenados (RPC) con bloqueos de concurrencia y políticas de seguridad por fila (RLS).</li>
    <li><strong>Definir los procesos de instalación, configuración por variables de entorno y ejecución del backend en Node.js/Express</strong>, detallando sus middlewares de sesión y permisos administrativos.</li>
    <li><strong>Describir la compilación, empaquetado, integración y despliegue del frontend SPA en React 19 / Vite</strong>, proveyendo guías de verificación funcional módulo por módulo.</li>
    <li><strong>Proporcionar directrices de mantenimiento preventivo y correctivo</strong>, gestión de secretos, políticas de respaldos y procedimientos para solventar incidencias en producción.</li>
    <li><strong>Consolidar el estado de verificación técnica del proyecto</strong>, señalando con transparencia los artefactos confirmados, elementos pendientes de validación y pruebas de entrega.</li>
  </ol>

  <div class="page-break"></div>

  <!-- ==================== 6. STACK DE TECNOLOGÍAS ==================== -->
  <h1>6. Stack de Tecnologías Verificado</h1>

  <h2>6.1. Matriz Técnica de Tecnologías Utilizadas</h2>
  <p>
    La siguiente tabla sintetiza los componentes comprobados en los archivos <code>package.json</code> raíz y <code>backend/package.json</code>:
  </p>

  <table>
    <thead>
      <tr>
        <th style="width: 22%;">Tecnología o Componente</th>
        <th style="width: 18%;">Nombre y Versión</th>
        <th style="width: 30%;">Función dentro del Sistema</th>
        <th style="width: 30%;">Justificación de Elección</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Lenguaje Frontend</strong></td>
        <td>JavaScript (ES2023) / TypeScript 6.0.3</td>
        <td>Lógica cliente en componentes React y tipado estricto en algoritmos predictivos.</td>
        <td>Ecosistema estándar web con soporte nativo de asincronía y tipado opcional en servicios matemáticos.</td>
      </tr>
      <tr>
        <td><strong>Framework Frontend</strong></td>
        <td>React 19.2.0 + React Router DOM 7.13.0</td>
        <td>Renderizado reactivo de la interfaz, ciclo de vida de componentes y enrutamiento SPA.</td>
        <td>React 19 ofrece concurrencia optimizada, alto rendimiento y compatibilidad con bibliotecas gráficas.</td>
      </tr>
      <tr>
        <td><strong>Herramienta de Build</strong></td>
        <td>Vite 7.3.1</td>
        <td>Servidor de desarrollo HMR ultrarrápido y empaquetador para producción (Rollup).</td>
        <td>Compilaciones hasta 10 veces más veloces que Webpack tradicional y soporte de variables <code>import.meta.env</code>.</td>
      </tr>
      <tr>
        <td><strong>Diseño y Estilos</strong></td>
        <td>Tailwind CSS 3.4.19 + PostCSS 8.5.6</td>
        <td>Estilización utilitaria de vistas, componentes adaptables (responsive) y tema claro/oscuro.</td>
        <td>Elimina la sobrecarga de archivos CSS masivos y facilita consistencia visual con clases predecibles.</td>
      </tr>
      <tr>
        <td><strong>Lenguaje Backend</strong></td>
        <td>Node.js (v20+ / v22.18.0 comprobado)</td>
        <td>Runtime de ejecución del servidor API en arquitectura orientada a eventos sin bloqueo.</td>
        <td>Excelente rendimiento en operaciones I/O intensivas (consultas REST y agregaciones JSON).</td>
      </tr>
      <tr>
        <td><strong>Framework Backend</strong></td>
        <td>Express 4.21.2 (ES Modules)</td>
        <td>Enrutador HTTP, control de middlewares (auth, cors, json) y controladores de endpoints.</td>
        <td>Estabilidad de grado empresarial, bajo overhead y total compatibilidad con estándares ESM.</td>
      </tr>
      <tr>
        <td><strong>Motor de Base de Datos</strong></td>
        <td>PostgreSQL 15+</td>
        <td>Persistencia relacional ACID, llaves foráneas, índices B-Tree, triggers y funciones RPC.</td>
        <td>Robustez en integridad de datos, soporte JSONB para auditoría y funciones atómicas de stock.</td>
      </tr>
      <tr>
        <td><strong>Alojamiento de Base de Datos y Auth</strong></td>
        <td>Supabase Cloud (@supabase/supabase-js 2.53 / 2.104)</td>
        <td>Aprovisionamiento gestionado de PostgreSQL, motor de autenticación JWT y Storage.</td>
        <td>Reduce la carga operativa de administrar servidores DB locales y provee clientes SDK seguros.</td>
      </tr>
      <tr>
        <td><strong>Servicio de Inteligencia Artificial</strong></td>
        <td>Google Generative AI SDK 0.24.1 (Gemini Flash)</td>
        <td>Motor cognitivo para el Chatbot asistente y soporte en análisis de demanda.</td>
        <td>Procesamiento veloz de consultas con baja latencia y costo altamente eficiente por llamada.</td>
      </tr>
      <tr>
        <td><strong>Bibliotecas de Utilidad</strong></td>
        <td>Recharts 3.10.1, Sonner 2.0.7, Lucide React 1.27, jsPDF 4.2.1, XLSX 0.18.5</td>
        <td>Gráficos interactivos de predicción, alertas flotantes, iconografía, exportación PDF/Excel.</td>
        <td>Permiten al operario exportar reportes y visualizar pronósticos de ventas sin recargar páginas.</td>
      </tr>
      <tr>
        <td><strong>Calidad y Testing</strong></td>
        <td>Vitest 2.1.9, Playwright 1.58.2, ESLint 9.39</td>
        <td>Pruebas unitarias de controladores/reglas de negocio y generación automatizada de manuales.</td>
        <td>Ejecución veloz de pruebas sobre ES Modules y automatización fiable con navegador Headless.</td>
      </tr>
    </tbody>
  </table>

  <div class="page-break"></div>

  <h2>6.2. Fichas Técnicas por Tecnología Principal</h2>

  <h3>1. React 19.2.0</h3>
  <ul>
    <li><strong>Propósito dentro de la arquitectura:</strong> Núcleo del frontend para construir interfaces de usuario interactivas mediante el patrón de componentes jerárquicos basados en funciones y hooks (<code>useState</code>, <code>useEffect</code>, <code>useMemo</code>, <code>useTheme</code>).</li>
    <li><strong>Componentes dependientes:</strong> Todas las vistas en <code>src/components/modules/</code> (Inventarios, Usuarios, Recetas, POS, Auditoría, Reportes, Dashboard).</li>
    <li><strong>Requisitos de compatibilidad:</strong> Node.js >= 18 para la etapa de construcción; navegadores con soporte ECMAScript 2020+ para ejecución cliente.</li>
    <li><strong>Consideraciones de actualización:</strong> Al actualizar versiones mayores de React, debe validarse la compatibilidad con <code>recharts</code> y librerías auxiliares que usen contextos de React DOM.</li>
  </ul>

  <h3>2. Express 4.21.2</h3>
  <ul>
    <li><strong>Propósito dentro de la arquitectura:</strong> Servidor HTTP RESTful estructurado como capa intermedia de seguridad y lógica de negocio. Desacopla la base de datos de los navegadores clientes, centralizando la autorización de roles.</li>
    <li><strong>Componentes dependientes:</strong> Todos los controladores en <code>backend/src/controllers/</code>, middlewares <code>requireSession</code> y <code>requireAdmin</code>.</li>
    <li><strong>Requisitos de compatibilidad:</strong> Node.js v18.0.0 o superior con flag <code>"type": "module"</code> en <code>package.json</code>.</li>
    <li><strong>Consideraciones de actualización:</strong> Migraciones hacia Express v5 requerirán revisar el manejo de promesas asíncronas en controladores donde no se use bloque <code>try/catch</code> manual.</li>
  </ul>

  <h3>3. Supabase & PostgreSQL 15+</h3>
  <ul>
    <li><strong>Propósito dentro de la arquitectura:</strong> Persistencia transaccional de datos y gestión de usuarios (esquema <code>auth.users</code> y <code>public.perfil</code>). Ejecución de transacciones complejas mediante RPC.</li>
    <li><strong>Componentes dependientes:</strong> Modelos y servicios del backend a través de <code>supabaseAdmin.js</code> y sincronización cliente.</li>
    <li><strong>Requisitos de compatibilidad:</strong> Acceso a Internet vía HTTPS (puerto 443) y compatibilidad con estándar de conexión de Supabase JS v2.</li>
    <li><strong>Consideraciones de actualización:</strong> Las extensiones y versiones mayores de PostgreSQL en Supabase se actualizan desde la consola web; las migraciones de esquemas deben ser rigurosamente idempotentes.</li>
  </ul>

  <h3>4. Google Generative AI SDK (@google/generative-ai 0.24.1)</h3>
  <ul>
    <li><strong>Propósito dentro de la arquitectura:</strong> Interfaz de comunicación con los modelos de lenguaje Gemini (<code>gemini-3.6-flash</code> o fallbacks) para procesar consultas de usuarios con contexto de inventario en tiempo real.</li>
    <li><strong>Componentes dependientes:</strong> <code>backend/src/services/geminiService.js</code>, <code>chatbotController.js</code> y componente flotante <code>Chatbot.jsx</code>.</li>
    <li><strong>Requisitos de compatibilidad:</strong> Llave de API válida (<code>GEMINI_API_KEY</code>) con cuotas de uso habilitadas en Google AI Studio o Cloud Console.</li>
    <li><strong>Consideraciones de actualización:</strong> Supervisar la deprecación de identificadores de modelos (por ejemplo, transición de nombres de modelos experimentales a estables).</li>
  </ul>

  <div class="page-break"></div>

  <!-- ==================== 7. ARQUITECTURA DE CARPETAS ==================== -->
  <h1>7. Arquitectura de Carpetas del Proyecto</h1>

  <h2>7.1. Árbol de Directorios del Repositorio</h2>
  <p>
    La siguiente estructura representa la jerarquía real del código fuente del sistema AMATI HIELO:
  </p>

  <div class="tree-view">
amati-hielo/
├── backend/                             # Servidor Backend (Node.js + Express)
│   ├── src/
│   │   ├── config/                      # Configuración de clientes Supabase
│   │   │   ├── supabaseAdmin.js         # Cliente privilegiado con Service Role Key
│   │   │   └── supabasePublic.js        # Cliente público con Anon Key
│   │   ├── controllers/                 # Controladores de endpoints REST
│   │   │   ├── auditoriaController.js   # Lógica de auditoría de inventario físico
│   │   │   ├── authController.js        # Login, recuperación y reseteo de claves
│   │   │   ├── cajaController.js        # Arqueos semanales y balances de caja
│   │   │   ├── chatbotController.js     # Procesamiento conversacional de IA
│   │   │   ├── configuracionSistemaController.js # Parámetros globales y sucursales
│   │   │   ├── estructuraDatosController.js      # Diccionario dinámico de tablas
│   │   │   ├── inventarioController.js  # CRUD de productos, stock, mermas y entradas
│   │   │   ├── posController.js         # Ventas directas, clientes y deducción BOM
│   │   │   ├── recetasController.js     # Fórmulas BOM, costeo y producción
│   │   │   └── usersController.js       # CRUD de usuarios, roles y catálogos
│   │   ├── middleware/                  # Filtros y validación de sesiones HTTP
│   │   │   ├── requireAdmin.js          # Control estricto de roles administrativos
│   │   │   └── requireSession.js        # Validación de JWT Bearer y usuario activo
│   │   ├── routes/                      # Definición de rutas Express
│   │   │   ├── authRoutes.js            # Rutas /auth/...
│   │   │   ├── cajaRoutes.js            # Rutas /api/caja/...
│   │   │   ├── chatbotRoutes.js         # Rutas /api/chatbot/...
│   │   │   ├── configuracionSistemaRoutes.js
│   │   │   ├── estructuraDatosRoutes.js
│   │   │   ├── inventarioRoutes.js      # Rutas /api/inventario/...
│   │   │   ├── posRoutes.js             # Rutas /api/pos/...
│   │   │   ├── recetasRoutes.js         # Rutas /api/recetas/...
│   │   │   └── usersRoutes.js           # Rutas /api/users/...
│   │   ├── services/                    # Lógica de negocio e integraciones externas
│   │   │   ├── chatbotDataService.js    # Consultas de inventario para el contexto de IA
│   │   │   ├── chatbotRules.js          # Reglas fijas y respuestas controladas
│   │   │   └── geminiService.js         # Llamadas a la API de Google Gemini
│   │   ├── utils/
│   │   │   └── listQuery.js             # Ayudante de paginación y ordenamiento
│   │   └── server.js                    # Punto de entrada HTTP y montaje de middlewares
│   ├── tests/                           # Pruebas automatizadas del backend (Vitest)
│   │   ├── calculateUnitCost.test.js
│   │   ├── chatbotController.test.js
│   │   └── chatbotRules.test.js
│   ├── .env.example                     # Plantilla de variables de servidor
│   └── package.json                     # Metadatos y scripts del backend
├── scripts/                             # Scripts automatizados de soporte y utilidades
│   ├── generate_manual_pdf.cjs          # Script Playwright para Manual de Usuario
│   └── generate_manual_tecnico_pdf.cjs  # Script Playwright para Manual Técnico
├── src/                                 # Aplicación Cliente Frontend (React 19 + Vite)
│   ├── assets/                          # Recursos gráficos (logos corporativos, iconos)
│   ├── components/                      # Componentes visuales de interfaz
│   │   ├── modules/                     # Vistas modulares completas del sistema
│   │   │   ├── auditoria/               # Submódulo wizard de auditoría de inventario
│   │   │   ├── ConfiguracionSistema.tsx
│   │   │   ├── GestionUsuarios.jsx
│   │   │   ├── IAPredictiva.jsx
│   │   │   ├── Inventarios.jsx
│   │   │   ├── MantenimientoEstructuraDatos.tsx
│   │   │   ├── ProduccionRecetas.jsx
│   │   │   ├── PuntoVenta.jsx
│   │   │   └── Reportes.jsx
│   │   ├── Chatbot.jsx                  # Widget asistente flotante de IA
│   │   ├── Dashboard.jsx                # Layout contenedor con navegación y sidebar
│   │   ├── Login.jsx                    # Formulario de inicio de sesión
│   │   ├── RecuperarContrasena.jsx      # Flujo de recuperación de credenciales
│   │   ├── WeatherCard.tsx              # Componente meteorológico en vivo
│   │   └── [Modales y Encabezados]      # ReporteModal, SortableHeader, Pagination
│   ├── hooks/                           # Hooks personalizados (useWeather, useTableSort)
│   ├── services/                        # Capa cliente de consumo HTTP hacia la API REST
│   │   ├── apiUrl.js                    # Resolución dinámica de la URL del backend
│   │   ├── authService.js               # Manejo de token en localStorage/sessionStorage
│   │   ├── inventarioService.js         # Consumo de endpoints de stock y almacén
│   │   ├── posService.js                # Consumo de ventas y facturación
│   │   ├── predictionService.ts         # Algoritmos de proyección y cálculo de demanda
│   │   └── weatherService.ts            # Consulta a Open-Meteo y persistencia histórica
│   ├── theme/                           # Manejo de modo claro/oscuro (Context API)
│   ├── utils/                           # Exportación a Excel, PDF y validaciones
│   ├── App.jsx                          # Configuración de rutas principales (React Router)
│   └── main.jsx                         # Punto de montaje del árbol DOM en React
├── supabase/                            # Persistencia y gobernanza de datos
│   └── migrations/                      # 51 scripts de migración ordenados secuencialmente
│       ├── 001_create_profiles.sql      # Perfiles y roles iniciales
│       ├── 009_registrar_movimiento_inventario.sql # Procedimiento RPC de stock atómico
│       ├── 013_pos_consumo_directo_bom.sql         # Deducción de insumos por venta
│       ├── 033_comentarios_todas_las_tablas.sql    # Diccionario de datos en BD
│       ├── 047_arqueos_caja_semanales.sql          # Conciliación financiera
│       └── 050_auditoria_inventario.sql            # Conteo físico ciego y balance
├── index.html                           # Contenedor HTML base de la aplicación
├── package.json                         # Dependencias del frontend y scripts npm
├── tailwind.config.js                   # Configuración del motor de diseño utilitario
└── vite.config.js                       # Configuración de compilación Vite y Vitest
  </div>

  <div class="page-break"></div>

  <h2>7.2. Responsabilidad por Categoría Estructural</h2>

  <table>
    <thead>
      <tr>
        <th style="width: 25%;">Categoría</th>
        <th style="width: 35%;">Ubicación Relativa</th>
        <th style="width: 40%;">Responsabilidad e Importancia Operativa</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Código Frontend</strong></td>
        <td><code>src/components/</code>, <code>src/services/</code>, <code>src/hooks/</code></td>
        <td>Gestiona la experiencia de usuario, interfaz reactiva, validaciones en formularios, consumo de endpoints HTTP y visualización analítica.</td>
      </tr>
      <tr>
        <td><strong>Código Backend</strong></td>
        <td><code>backend/src/</code> (controllers, routes, middleware, services)</td>
        <td>Ejecuta la lógica de negocio autoritativa, autoriza peticiones con JWT Bearer, calcula fórmulas de costos y centraliza transacciones seguras con la base de datos.</td>
      </tr>
      <tr>
        <td><strong>Configuración de BD</strong></td>
        <td><code>backend/src/config/</code> (supabaseAdmin.js, supabasePublic.js)</td>
        <td>Aprovisiona los clientes de comunicación con Supabase aislando la llave maestra <code>SERVICE_ROLE_KEY</code> dentro del servidor privado.</td>
      </tr>
      <tr>
        <td><strong>Migraciones SQL</strong></td>
        <td><code>supabase/migrations/</code> (001_... a 051_...)</td>
        <td>Historial cronológico de cambios DDL/DML que permite recrear de forma idéntica la base de datos completa en cualquier proyecto de Supabase.</td>
      </tr>
      <tr>
        <td><strong>Archivos de Configuración</strong></td>
        <td><code>vite.config.js</code>, <code>tailwind.config.js</code>, <code>.env.example</code></td>
        <td>Definen el comportamiento del compilador, políticas de orígenes permitidos (CORS) y esquemas de parámetros requeridos para ejecución.</td>
      </tr>
      <tr>
        <td><strong>Pruebas Automatizadas</strong></td>
        <td><code>backend/tests/</code>, <code>src/stories/</code></td>
        <td>Aseguran la fiabilidad del cálculo de costos unitarios, respuestas del chatbot ante diferentes roles de usuario y componentes aislados.</td>
      </tr>
      <tr>
        <td><strong>Recursos Estáticos</strong></td>
        <td><code>public/</code>, <code>src/assets/</code></td>
        <td>Imágenes institucionales (logo-amati.jpg), íconos de cubo de hielo y favicon corporativo.</td>
      </tr>
    </tbody>
  </table>

  <div class="page-break"></div>

  <!-- ==================== 8. REQUISITOS SERVIDORES ==================== -->
  <h1>8. Requisitos Mínimos para los Servidores</h1>

  <h2>8.1. Matriz de Infraestructura y Servidores</h2>
  <p>
    El sistema AMATI HIELO fue diseñado bajo el paradigma de servicios desacoplados en la nube. A continuación se presentan los requisitos técnicos para hospedar cada capa de software:
  </p>

  <table>
    <thead>
      <tr>
        <th style="width: 15%;">Componente</th>
        <th style="width: 15%;">SO Compatible</th>
        <th style="width: 12%;">CPU Mínima</th>
        <th style="width: 12%;">Memoria RAM</th>
        <th style="width: 12%;">Disco</th>
        <th style="width: 18%;">Software / Runtime</th>
        <th style="width: 16%;">Puertos / Seguridad</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Servidor Frontend (SPA)</strong></td>
        <td>Linux (Ubuntu 22.04 LTS / Alpine) o Vercel / Netlify</td>
        <td>1 vCPU (0.5 GHz)</td>
        <td>512 MB</td>
        <td>1 GB SSD</td>
        <td>Nginx 1.24+ o CDN estática con soporte SPA</td>
        <td>80 (HTTP redirección), 443 (HTTPS TLS 1.3)</td>
      </tr>
      <tr>
        <td><strong>Servidor Backend (API REST)</strong></td>
        <td>Linux (Ubuntu 22.04 LTS, Debian 12) o Windows Server</td>
        <td>1 vCPU (1.5 GHz o superior)</td>
        <td>1 GB (2 GB recomendado)</td>
        <td>10 GB SSD</td>
        <td>Node.js >= 20.x, npm >= 10.x, gestor PM2 / Docker</td>
        <td>3001 (Interno / Reverse Proxy), 443 (Externo HTTPS)</td>
      </tr>
      <tr>
        <td><strong>Base de Datos y Auth (Supabase)</strong></td>
        <td>Gestionado Cloud (Linux Kernel Subyacente)</td>
        <td>2 vCPU (Tier Free / Pro)</td>
        <td>1 GB RAM compartida</td>
        <td>500 MB a 8 GB SSD</td>
        <td>PostgreSQL 15+, Supabase Auth (GoTrue), PostgREST</td>
        <td>443 (HTTPS REST y WebSockets para Realtime)</td>
      </tr>
    </tbody>
  </table>

  <h2>8.2. Requisitos de Red, Certificados SSL y Cortafuegos</h2>
  <ul>
    <li><strong>Dominio y Certificado Digital:</strong> Obligatorio disponer de un Nombre de Dominio Cualificado (FQDN) con certificado SSL/TLS (emitido gratuitamente mediante Let's Encrypt o proveedor CDN) para forzar protocolo HTTPS en todas las transacciones cliente-servidor.</li>
    <li><strong>Configuración de Firewall:</strong> En el servidor backend, únicamente debe exponerse el puerto seguro 443 a través de un proxy inverso como Nginx. El puerto interno <code>3001</code> debe permanecer cerrado a conexiones públicas no autorizadas.</li>
    <li><strong>Acceso Administrativo:</strong> Acceso SSH exclusivo mediante llaves criptográficas RSA/ED25519; deshabilitar autenticación por contraseña para usuarios root.</li>
  </ul>

  <h2>8.3. Respaldos, Monitoreo y Consideraciones de Escalabilidad</h2>
  <ul>
    <li><strong>Respaldos de Base de Datos:</strong> Al operar sobre Supabase Cloud, el tier gratuito ofrece snapshots periódicos, mientras que el plan Pro habilita <em>Point-in-Time Recovery (PITR)</em> con hasta 7 días de retención continua. Adicionalmente, se recomienda programar un cron job semanal que ejecute <code>pg_dump</code> hacia almacenamiento externo S3 o Google Cloud Storage.</li>
    <li><strong>Monitoreo:</strong> Utilizar las métricas integradas de Supabase Dashboard (consumo de CPU, conexiones al pool, I/O de disco) y herramientas ligeras en el backend como <em>PM2 Monitor</em> o <em>Uptime Kuma</em> apuntando al endpoint de salud <code>GET /health</code>.</li>
    <li><strong>Escalabilidad Horizontal:</strong> Al no guardar estado en memoria local el backend Express (estado manejado mediante JWT y persistencia en BD), pueden instanciarse múltiples contenedores o procesos Node.js detrás de un balanceador de carga Nginx mediante el módulo <code>cluster</code> o Docker Swarm / Kubernetes.</li>
  </ul>

  <div class="page-break"></div>

  <!-- ==================== 9. REQUISITOS CLIENTE ==================== -->
  <h1>9. Requisitos Mínimos para el Cliente</h1>

  <h2>9.1. Especificaciones para Estaciones de Trabajo</h2>
  <p>
    El sistema AMATI HIELO opera enteramente bajo el modelo <strong>Zero-Install</strong> (no requiere software residente, instalación de ejecutables locales ni permisos de administrador en las terminales operativas). Las terminales de venta (POS) y equipos de supervisión de bodega se conectan directamente desde el navegador web.
  </p>

  <table>
    <thead>
      <tr>
        <th style="width: 25%;">Elemento de Hardware / Software</th>
        <th style="width: 35%;">Requisito Mínimo Comprobado</th>
        <th style="width: 40%;">Recomendación para Producción Óptima</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Sistema Operativo</strong></td>
        <td>Windows 10 (64-bit), macOS 11+, Ubuntu Desktop 20.04+, Android 10+ (Tablets)</td>
        <td>Windows 11 (64-bit) o ChromeOS / Ubuntu 22.04 LTS con actualizaciones al día.</td>
      </tr>
      <tr>
        <td><strong>Navegador Web</strong></td>
        <td>Google Chrome 100+, Microsoft Edge 100+, Mozilla Firefox 100+, Safari 15+</td>
        <td>Google Chrome o Microsoft Edge en sus versiones estables más recientes.</td>
      </tr>
      <tr>
        <td><strong>Procesador (CPU)</strong></td>
        <td>Intel Core i3 (4ta Gen) / AMD Ryzen 3 / ARM Cortex-A53 a 1.8 GHz</td>
        <td>Intel Core i5 (8va Gen+) / AMD Ryzen 5 o procesador Apple Silicon M-Series.</td>
      </tr>
      <tr>
        <td><strong>Memoria RAM</strong></td>
        <td>4 GB de RAM disponibles</td>
        <td>8 GB de RAM (para operar múltiples pestañas de auditoría y reportes pesados).</td>
      </tr>
      <tr>
        <td><strong>Resolución de Pantalla</strong></td>
        <td>1024 x 768 píxeles (resolución adaptable responsive)</td>
        <td>1920 x 1080 píxeles (Full HD) para visualización cómoda de matrices de stock.</td>
      </tr>
      <tr>
        <td><strong>Conectividad a Red</strong></td>
        <td>Conexión de banda ancha de 2 Mbps simétricos</td>
        <td>Conexión de 10 Mbps o superior (cableada Ethernet o Wi-Fi 5 GHz).</td>
      </tr>
      <tr>
        <td><strong>Permisos del Navegador</strong></td>
        <td>Habilitación de JavaScript, LocalStorage y SessionStorage</td>
        <td>Permitir descargas automáticas para exportación de archivos Excel y reportes PDF.</td>
      </tr>
      <tr>
        <td><strong>Periféricos Opcionales</strong></td>
        <td>Teclado y ratón estándar</td>
        <td>Lector de código de barras USB/Bluetooth e impresora térmica de tickets (POS).</td>
      </tr>
    </tbody>
  </table>

  <div class="alert-box alert-note">
    <div class="alert-icon">💡</div>
    <div class="alert-content">
      <strong>Operación Móvil en Planta:</strong> El submódulo de Auditoría de Inventario cuenta con un asistente interactivo diseñado específicamente con botones táctiles grandes, permitiendo a los operarios realizar el conteo ciego de barras de hielo y bolsas directamente desde tabletas o teléfonos móviles conectados a la red local.
    </div>
  </div>

  <div class="page-break"></div>

  <!-- ==================== 10. BASE DE DATOS ==================== -->
  <h1>10. Configuración e Implementación de la Base de Datos</h1>

  <h2>10.1. Arquitectura de Datos y Motor Relacional</h2>
  <p>
    El sistema implementa un motor relacional <strong>PostgreSQL 15+</strong> hospedado en la plataforma de servicios en la nube de <strong>Supabase</strong>. La persistencia garantiza cumplimiento estricto de principios ACID (Atomicidad, Consistencia, Aislamiento y Durabilidad), indispensable para evitar discrepancias en conteos de inventario físico y transacciones monetarias de venta.
  </p>
  <p>
    <strong>Modelo de Conexión:</strong> La base de datos es accedida de manera segura y privada por el servidor backend utilizando el protocolo HTTPS RESTful y conexiones directas de Postgres mediante el cliente oficial <code>@supabase/supabase-js</code>, autenticado mediante la llave privada <code>SUPABASE_SERVICE_ROLE_KEY</code>.
  </p>

  <h2>10.2. Estructura y Diccionario de Datos del Esquema Público</h2>
  <p>
    A continuación se documentan las tablas fundamentales del sistema, sus llaves primarias (PK), foráneas (FK) y restricciones:
  </p>

  <h3>1. Tabla: <code>perfil</code> (Extensión de Usuarios)</h3>
  <table>
    <thead>
      <tr><th>Columna</th><th>Tipo de Dato</th><th>Restricciones</th><th>Descripción</th></tr>
    </thead>
    <tbody>
      <tr><td><code>id</code></td><td>UUID</td><td>PK, FK (auth.users)</td><td>Identificador del usuario en el sistema de autenticación de Supabase.</td></tr>
      <tr><td><code>primer_nombre</code></td><td>TEXT</td><td>NOT NULL</td><td>Primer nombre del colaborador.</td></tr>
      <tr><td><code>segundo_nombre</code></td><td>TEXT</td><td>NULL</td><td>Segundo nombre (opcional).</td></tr>
      <tr><td><code>primer_apellido</code></td><td>TEXT</td><td>NOT NULL</td><td>Primer apellido del colaborador.</td></tr>
      <tr><td><code>segundo_apellido</code></td><td>TEXT</td><td>NULL</td><td>Segundo apellido (opcional).</td></tr>
      <tr><td><code>usuario</code></td><td>TEXT</td><td>UNIQUE, NOT NULL</td><td>Nombre de usuario para inicio de sesión en el sistema.</td></tr>
      <tr><td><code>email</code></td><td>TEXT</td><td>UNIQUE, NOT NULL</td><td>Correo electrónico institucional.</td></tr>
      <tr><td><code>rol_id</code></td><td>BIGINT</td><td>FK (rol.id)</td><td>Nivel de privilegios (Superusuario, Administrador, Operario).</td></tr>
      <tr><td><code>estado_usuario_id</code></td><td>BIGINT</td><td>FK (estado_usuario.id)</td><td>Estado del usuario (Activo o Inactivo). Bloquea accesos de inmediato.</td></tr>
      <tr><td><code>departamento_id</code></td><td>BIGINT</td><td>FK (departamento.id)</td><td>Ubicación geográfica administrativa.</td></tr>
      <tr><td><code>municipio_id</code></td><td>BIGINT</td><td>FK (municipio.id)</td><td>Municipio de residencia o asignación.</td></tr>
    </tbody>
  </table>

  <h3>2. Tabla: <code>producto</code> (Catálogo e Inventario de Artículos)</h3>
  <table>
    <thead>
      <tr><th>Columna</th><th>Tipo de Dato</th><th>Restricciones</th><th>Descripción</th></tr>
    </thead>
    <tbody>
      <tr><td><code>id</code></td><td>BIGINT</td><td>PK, IDENTITY</td><td>Identificador único del producto en almacén.</td></tr>
      <tr><td><code>codigo</code></td><td>TEXT</td><td>UNIQUE, NOT NULL</td><td>Código único de inventario (ej. ART-001, MP-01).</td></tr>
      <tr><td><code>nombre</code></td><td>TEXT</td><td>NOT NULL</td><td>Descripción comercial (ej. Hielo en Cubo 5kg, Colorante).</td></tr>
      <tr><td><code>categoria</code></td><td>TEXT</td><td>NOT NULL</td><td>Categoría: Materia Prima, Suministros o Producto Terminado.</td></tr>
      <tr><td><code>stock</code></td><td>NUMERIC(12,2)</td><td>NOT NULL, CHECK (stock >= 0)</td><td>Existencia física actual en unidades base.</td></tr>
      <tr><td><code>minimo</code></td><td>NUMERIC(12,2)</td><td>NOT NULL, CHECK (minimo >= 0)</td><td>Umbral mínimo de existencia antes de disparar alerta de desabastecimiento.</td></tr>
      <tr><td><code>unidad</code></td><td>TEXT</td><td>NOT NULL</td><td>Unidad de medida base (bolsa, kg, litro, unidad).</td></tr>
      <tr><td><code>costo_unitario</code></td><td>NUMERIC(12,2)</td><td>DEFAULT 0</td><td>Costo real ponderado de adquisición por unidad.</td></tr>
      <tr><td><code>precio_compra</code></td><td>NUMERIC(12,2)</td><td>NULL</td><td>Último precio de compra unitario registrado.</td></tr>
      <tr><td><code>precio_venta</code></td><td>NUMERIC(12,2)</td><td>NULL</td><td>Precio de venta directo al público.</td></tr>
      <tr><td><code>estado</code></td><td>TEXT</td><td>CHECK (normal, bajo, crítico)</td><td>Estado calculado del stock según el umbral mínimo.</td></tr>
      <tr><td><code>cantidad_compra</code></td><td>NUMERIC(12,2)</td><td>DEFAULT 1</td><td>Factor de unidades contenidas en el paquete de compra habitual.</td></tr>
      <tr><td><code>precio_paquete</code></td><td>NUMERIC(12,2)</td><td>DEFAULT 0</td><td>Costo de compra del bulto o paquete mayorista.</td></tr>
    </tbody>
  </table>

  <div class="page-break"></div>

  <h3>3. Tabla: <code>movimiento_inventario</code> (Kardex Transaccional)</h3>
  <table>
    <thead>
      <tr><th>Columna</th><th>Tipo de Dato</th><th>Restricciones</th><th>Descripción</th></tr>
    </thead>
    <tbody>
      <tr><td><code>id</code></td><td>BIGINT</td><td>PK, IDENTITY</td><td>Identificador correlativo del movimiento en el Kardex.</td></tr>
      <tr><td><code>producto_id</code></td><td>BIGINT</td><td>FK (producto.id)</td><td>Producto que experimenta la alteración de stock.</td></tr>
      <tr><td><code>tipo</code></td><td>TEXT</td><td>NOT NULL</td><td>Tipo: 'Entrada', 'Salida', 'Merma' o 'Ajuste'.</td></tr>
      <tr><td><code>cantidad</code></td><td>NUMERIC(12,2)</td><td>CHECK (cantidad > 0)</td><td>Magnitud del movimiento en unidades base de inventario.</td></tr>
      <tr><td><code>cantidad_compra</code></td><td>NUMERIC(12,2)</td><td>NULL</td><td>Cantidad expresada en la unidad de bulto de adquisición.</td></tr>
      <tr><td><code>unidad_compra_id</code></td><td>BIGINT</td><td>FK (unidad_compra.id)</td><td>Unidad de compra aplicada al movimiento (ciento, fardo).</td></tr>
      <tr><td><code>proveedor_id</code></td><td>BIGINT</td><td>FK (proveedor.id)</td><td>Proveedor asociado en caso de entradas por compra.</td></tr>
      <tr><td><code>motivo</code></td><td>TEXT</td><td>NULL</td><td>Explicación o causa del movimiento de almacén.</td></tr>
      <tr><td><code>usuario</code></td><td>TEXT</td><td>NULL</td><td>Nombre del colaborador responsable del registro.</td></tr>
      <tr><td><code>created_at</code></td><td>TIMESTAMPTZ</td><td>DEFAULT now()</td><td>Sello temporal inmutable del registro.</td></tr>
    </tbody>
  </table>

  <h3>4. Tablas: <code>receta</code> e <code>ingrediente_receta</code> (Bill of Materials - BOM)</h3>
  <table>
    <thead>
      <tr><th>Tabla / Columna</th><th>Tipo de Dato</th><th>Restricciones</th><th>Descripción</th></tr>
    </thead>
    <tbody>
      <tr><td><code>receta.id</code></td><td>BIGINT</td><td>PK, IDENTITY</td><td>Identificador único del producto elaborado o paquete de venta.</td></tr>
      <tr><td><code>receta.codigo</code></td><td>TEXT</td><td>UNIQUE, NOT NULL</td><td>Código del producto terminado (ej. REC-01).</td></tr>
      <tr><td><code>receta.nombre</code></td><td>TEXT</td><td>NOT NULL</td><td>Nombre comercial (ej. Cubo Purificado Gourmet 20 lbs).</td></tr>
      <tr><td><code>receta.categoria</code></td><td>TEXT</td><td>NOT NULL</td><td>Clasificación (ej. Hielo Envasado, Barras Industriales).</td></tr>
      <tr><td><code>receta.costo_total</code></td><td>NUMERIC(12,2)</td><td>DEFAULT 0</td><td>Costo acumulado de ingredientes de la fórmula BOM.</td></tr>
      <tr><td><code>receta.precio_sugerido</code></td><td>NUMERIC(12,2)</td><td>DEFAULT 0</td><td>Precio base sugerido al cliente en punto de venta.</td></tr>
      <tr><td><code>ingrediente_receta.id</code></td><td>BIGINT</td><td>PK, IDENTITY</td><td>Identificador único de la línea de ingrediente.</td></tr>
      <tr><td><code>ingrediente_receta.receta_id</code></td><td>BIGINT</td><td>FK (receta.id) ON DELETE CASCADE</td><td>Vínculo hacia la receta padre.</td></tr>
      <tr><td><code>ingrediente_receta.producto_id</code></td><td>BIGINT</td><td>FK (producto.id)</td><td>Insumo de inventario a deducir en cada venta.</td></tr>
      <tr><td><code>ingrediente_receta.cantidad</code></td><td>NUMERIC(12,2)</td><td>NOT NULL</td><td>Cantidad exacta requerida del insumo por receta.</td></tr>
      <tr><td><code>ingrediente_receta.costo_unitario</code></td><td>NUMERIC(12,2)</td><td>DEFAULT 0</td><td>Costo unitario del ingrediente para el balance de receta.</td></tr>
    </tbody>
  </table>

  <h3>5. Tablas: <code>venta_pos</code> y <code>venta_pos_detalle</code> (Punto de Venta)</h3>
  <table>
    <thead>
      <tr><th>Tabla / Columna</th><th>Tipo de Dato</th><th>Restricciones</th><th>Descripción</th></tr>
    </thead>
    <tbody>
      <tr><td><code>venta_pos.id</code></td><td>BIGINT</td><td>PK, IDENTITY</td><td>Identificador correlativo de la venta.</td></tr>
      <tr><td><code>venta_pos.ticket</code></td><td>TEXT</td><td>UNIQUE, NOT NULL</td><td>Número de comprobante fiscal o ticket interno.</td></tr>
      <tr><td><code>venta_pos.cliente_id</code></td><td>BIGINT</td><td>FK (cliente.id)</td><td>Identificador del cliente registrado o frecuente.</td></tr>
      <tr><td><code>venta_pos.metodo_pago</code></td><td>TEXT</td><td>NOT NULL</td><td>Modalidad: 'Efectivo', 'Transferencia' o 'Tarjeta'.</td></tr>
      <tr><td><code>venta_pos.subtotal</code></td><td>NUMERIC(12,2)</td><td>NOT NULL</td><td>Importe de venta antes del cálculo de impuestos.</td></tr>
      <tr><td><code>venta_pos.iva</code></td><td>NUMERIC(12,2)</td><td>NOT NULL</td><td>Monto correspondiente al impuesto del valor agregado (IVA).</td></tr>
      <tr><td><code>venta_pos.total</code></td><td>NUMERIC(12,2)</td><td>NOT NULL</td><td>Monto final cancelado por el cliente.</td></tr>
      <tr><td><code>venta_pos_detalle.venta_id</code></td><td>BIGINT</td><td>FK (venta_pos.id) ON DELETE CASCADE</td><td>Vínculo hacia la cabecera de la transacción.</td></tr>
      <tr><td><code>venta_pos_detalle.receta_id</code></td><td>BIGINT</td><td>FK (receta.id) ON DELETE SET NULL</td><td>Receta vendida para deducción automática de BOM.</td></tr>
      <tr><td><code>venta_pos_detalle.cantidad</code></td><td>INTEGER</td><td>CHECK (cantidad > 0)</td><td>Unidades despachadas del producto terminado.</td></tr>
      <tr><td><code>venta_pos_detalle.precio_unitario</code></td><td>NUMERIC(12,2)</td><td>NOT NULL</td><td>Precio pactado por unidad en la transacción.</td></tr>
    </tbody>
  </table>

  <div class="page-break"></div>

  <h3>6. Tablas: <code>auditoria_inventario</code> y <code>auditoria_inventario_detalle</code></h3>
  <table>
    <thead>
      <tr><th>Columna</th><th>Tipo de Dato</th><th>Restricciones</th><th>Descripción</th></tr>
    </thead>
    <tbody>
      <tr><td><code>auditoria.codigo</code></td><td>TEXT</td><td>UNIQUE, NOT NULL</td><td>Código del proceso de auditoría (ej. AUD-2026-10-001).</td></tr>
      <tr><td><code>auditoria.estado</code></td><td>TEXT</td><td>CHECK (...)</td><td>Estados: 'Borrador', 'En conteo', 'En revisión', 'Pendiente de aprobación', 'Cerrada', 'Cancelada'.</td></tr>
      <tr><td><code>auditoria.tipo_alcance</code></td><td>TEXT</td><td>CHECK (...)</td><td>Alcance del proceso: 'TODO', 'CATEGORIA' o 'ESPECIFICO'.</td></tr>
      <tr><td><code>detalle.producto_id</code></td><td>BIGINT</td><td>FK (producto.id)</td><td>Artículo auditado en almacén.</td></tr>
      <tr><td><code>detalle.stock_teorico</code></td><td>NUMERIC(12,2)</td><td>NOT NULL</td><td>Existencia registrada por el sistema antes del corte físico.</td></tr>
      <tr><td><code>detalle.stock_fisico</code></td><td>NUMERIC(12,2)</td><td>NULL</td><td>Cantidad real física contada por el personal en bodega.</td></tr>
      <tr><td><code>detalle.diferencia</code></td><td>NUMERIC(12,2)</td><td>GENERATED / CALC</td><td>Varianza entre físico y teórico (Físico - Teórico).</td></tr>
      <tr><td><code>detalle.impacto_economico</code></td><td>NUMERIC(12,2)</td><td>DEFAULT 0</td><td>Impacto monetario de la diferencia (Diferencia * Costo Unitario).</td></tr>
      <tr><td><code>detalle.estado_diferencia</code></td><td>TEXT</td><td>CHECK (...)</td><td>'Conciliado', 'Pendiente de investigar', 'Aprobado para ajuste'.</td></tr>
    </tbody>
  </table>

  <h3>7. Otras Tablas del Esquema Relacional</h3>
  <ul>
    <li><code>arqueo_caja</code>: Registra balances semanales consolidados de caja, separando transacciones en efectivo y transferencias electrónicas.</li>
    <li><code>historial_clima</code>: Bitácora meteorológica diaria (temperatura máxima, mínima, humedad, velocidad de viento y probabilidad de precipitación) obtenida de Open-Meteo.</li>
    <li><code>historial_prediccion_demanda</code>: Almacena los resultados proyectados de ventas y producción sugerida calculados por los algoritmos analíticos.</li>
    <li><code>proveedor</code> y <code>cliente</code>: Catálogos de terceros vinculados a compras de suministros y facturación en punto de venta.</li>
    <li><code>config_empresa</code>, <code>config_impuestos</code>, <code>config_notificaciones</code> y <code>config_umbrales</code>: Tablas singulares de gobernanza global del sistema.</li>
    <li><code>tabla_estructura</code> y <code>campo_estructura</code>: Metadatos para el módulo de mantenimiento dinámico del diccionario de datos.</li>
  </ul>

  <h2>10.3. Requisitos Previos de la Base de Datos</h2>
  <ol>
    <li>Una organización y proyecto activo en <strong>Supabase</strong> (nodo us-east-1 o sa-east-1 para mínima latencia con Centroamérica).</li>
    <li>Acceso al <strong>SQL Editor</strong> de Supabase o credenciales de conexión directa PostgreSQL (<code>postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres</code>).</li>
    <li>Disponibilidad de las credenciales maestras: <code>SUPABASE_URL</code>, <code>SUPABASE_ANON_KEY</code> y <code>SUPABASE_SERVICE_ROLE_KEY</code>.</li>
  </ol>

  <h2>10.4. Procedimiento de Configuración Paso a Paso (Migraciones 001 a 051)</h2>
  <p>
    Para garantizar la correcta inicialización del esquema en un entorno limpio sin fallos de integridad referencial, las migraciones contenidas en la carpeta <code>supabase/migrations/</code> deben ejecutarse estrictamente en su orden numérico secuencial:
  </p>
  <ol>
    <li><strong>Fase 1 - Autenticación y Catálogos Base (001 a 002):</strong> Ejecutar <code>001_create_profiles.sql</code> y <code>002_fix_profiles_rls_recursion.sql</code>. Se crean las tablas de perfiles vinculadas al esquema <code>auth.users</code> y se configuran políticas de acceso no recursivas.</li>
    <li><strong>Fase 2 - Núcleo de Inventarios (003 a 010):</strong> Ejecutar migraciones de creación de productos, unidades de compra y la función almacenada atómica <code>009_registrar_movimiento_inventario.sql</code>.</li>
    <li><strong>Fase 3 - Recetas y Consumo BOM (011 a 015):</strong> Crear tablas de recetas, ingredientes vinculados al inventario y deducción directa en ventas.</li>
    <li><strong>Fase 4 - Servicios de Clima y Mantenimiento de Datos (016 a 019):</strong> Configurar el historial climático y tablas del diccionario de datos y parámetros del sistema.</li>
    <li><strong>Fase 5 - Catálogos Paramétricos y Geografía (020 a 027):</strong> Cargar roles del sistema, estados de usuario, categorías de inventario y los 22 departamentos y municipios de Guatemala.</li>
    <li><strong>Fase 6 - Facturación, Proveedores y Compras (028 a 043):</strong> Configurar proveedores, órdenes de compra y facturación POS.</li>
    <li><strong>Fase 7 - Mermas, Arqueos y Auditoría Avanzada (044 a 051):</strong> Aplicar catálogos de motivos de merma, <code>047_arqueos_caja_semanales.sql</code> y la estructura de auditoría física de inventario <code>050_auditoria_inventario.sql</code>.</li>
  </ol>

  <div class="page-break"></div>

  <h2>10.5. Procedimientos Almacenados y Funciones RPC Atómicas</h2>
  <p>
    El sistema delega las operaciones críticas de concurrencia al motor de base de datos a través de funciones almacenadas en PL/pgSQL. El procedimiento más relevante es <code>registrar_movimiento_inventario</code>:
  </p>

  <pre><code>CREATE OR REPLACE FUNCTION public.registrar_movimiento_inventario(
  p_producto_id BIGINT,
  p_tipo TEXT,
  p_cantidad NUMERIC,
  p_motivo TEXT DEFAULT NULL,
  p_usuario TEXT DEFAULT NULL
)
RETURNS public.movimiento_inventario
LANGUAGE plpgsql
AS $$
DECLARE
  v_producto public.producto%ROWTYPE;
  v_movimiento public.movimiento_inventario%ROWTYPE;
  v_delta NUMERIC(12,2);
BEGIN
  -- 1. Validaciones preventivas de entrada
  IF p_producto_id IS NULL THEN RAISE EXCEPTION 'El producto es obligatorio.'; END IF;
  IF p_cantidad IS NULL OR p_cantidad <= 0 THEN RAISE EXCEPTION 'La cantidad debe ser mayor a 0.'; END IF;

  -- 2. Bloqueo exclusivo de fila (FOR UPDATE) para prevenir condiciones de carrera
  SELECT * INTO v_producto FROM public.producto WHERE id = p_producto_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'No se encontró el producto seleccionado.'; END IF;

  -- 3. Determinación de la dirección del flujo de existencias
  CASE btrim(p_tipo)
    WHEN 'Entrada' THEN v_delta := p_cantidad;
    WHEN 'Salida'  THEN v_delta := -p_cantidad;
    WHEN 'Merma'   THEN v_delta := -p_cantidad;
    WHEN 'Ajuste'  THEN v_delta := p_cantidad;
    ELSE RAISE EXCEPTION 'Tipo de movimiento inválido.';
  END CASE;

  -- 4. Salvaguarda estricta de no negatividad de existencias
  IF v_producto.stock + v_delta < 0 THEN
    RAISE EXCEPTION 'El stock no puede quedar negativo. Existencia actual: %, intento de salida: %', v_producto.stock, p_cantidad;
  END IF;

  -- 5. Actualización atómica de existencias y registro en el Kardex
  UPDATE public.producto SET stock = stock + v_delta, updated_at = now() WHERE id = p_producto_id;

  INSERT INTO public.movimiento_inventario (producto_id, tipo, cantidad, motivo, usuario)
  VALUES (p_producto_id, p_tipo, p_cantidad, p_motivo, p_usuario)
  RETURNING * INTO v_movimiento;

  RETURN v_movimiento;
END;
$$;</code></pre>

  <h2>10.6. Conexión Segura y Administración de Credenciales</h2>
  <div class="alert-box alert-security">
    <div class="alert-icon">🔒</div>
    <div class="alert-content">
      <strong>Regla Crítica de Seguridad:</strong> La llave maestra <code>SUPABASE_SERVICE_ROLE_KEY</code> tiene privilegios de superadministrador y salta las políticas RLS. <strong>NUNCA</strong> debe compilarse en el código del frontend ni subirse a repositorios públicos de control de versiones. Debe configurarse exclusivamente en el archivo <code>.env</code> privado del servidor backend.
    </div>
  </div>

  <h2>10.7. Seguridad de Datos, Roles y Políticas RLS</h2>
  <p>
    En la capa de base de datos se habilitó <em>Row Level Security (RLS)</em> en la tabla <code>perfil</code> mediante la migración <code>002_fix_profiles_rls_recursion.sql</code> para evitar que consultas no autorizadas expongan información de usuarios. Sin embargo, dado que toda la lógica de negocio de la aplicación transcurre a través del servidor backend Express, este actúa como guardián centralizado (Gatekeeper), validando los tokens JWT y aplicando los roles <code>Administrador</code>, <code>Superusuario</code> y <code>Operario</code> en código antes de interactuar con PostgreSQL.
  </p>

  <h2>10.8. Verificación y Procedimiento de Respaldos (Backups)</h2>
  <p>
    Para generar una copia de respaldo manual e íntegra del esquema y datos del sistema AMATI HIELO desde cualquier terminal autorizada:
  </p>
  <pre><code># Generar respaldo completo con pg_dump
pg_dump --clean --if-exists --no-owner --no-privileges \
  -h db.[TU_PROYECTO].supabase.co -U postgres -d postgres -F c \
  -f backup_amati_hielo_$(date +%Y%m%d).dump

# Restaurar en una base de datos limpia de contingencia
pg_restore --clean --no-owner -h db.[NUEVO_PROYECTO].supabase.co -U postgres -d postgres backup_amati_hielo_20261018.dump</code></pre>

  <div class="page-break"></div>

  <!-- ==================== 11. BACKEND ==================== -->
  <h1>11. Configuración e Implementación del Backend</h1>

  <h2>11.1. Arquitectura del Backend en Capas</h2>
  <p>
    El backend de AMATI HIELO es una aplicación en Node.js construida sobre el framework Express 4.21, estructurada bajo una arquitectura por capas desacopladas:
  </p>
  <ul>
    <li><strong>Capa de Enrutamiento (<code>src/routes/</code>):</strong> Define los puntos de contacto HTTP RESTful, aplica middlewares de autenticación previa y mapea verbos (GET, POST, PUT, DELETE) hacia sus controladores correspondientes.</li>
    <li><strong>Capa de Controladores (<code>src/controllers/</code>):</strong> Valida los datos recibidos en el cuerpo (body) y parámetros de la solicitud, maneja excepciones y orquesta las respuestas JSON con códigos de estado HTTP semánticos (200, 201, 400, 401, 403, 404, 500).</li>
    <li><strong>Capa de Middlewares (<code>src/middleware/</code>):</strong> Valida la presencia e integridad del token Bearer JWT con el servicio de autenticación y comprueba en tiempo real que el usuario no se encuentre en estado "Inactivo" en la base de datos antes de permitir la ejecución.</li>
    <li><strong>Capa de Servicios e Integración (<code>src/services/</code>):</strong> Administra la comunicación con APIs externas como Google Gemini y consolida las estructuras de datos de auditoría e inventario.</li>
  </ul>

  <h2>11.2. Requisitos Previos y Dependencias</h2>
  <ul>
    <li><strong>Runtime:</strong> Node.js versión 20.x LTS o 22.x LTS instalado.</li>
    <li><strong>Gestor de Paquetes:</strong> npm versión 10.x o superior.</li>
    <li><strong>Dependencias de Producción:</strong> <code>@google/generative-ai</code> (^0.24.1), <code>@supabase/supabase-js</code> (^2.53.0), <code>cors</code> (^2.8.5), <code>dotenv</code> (^16.6.1), <code>express</code> (^4.21.2), <code>jspdf</code> (^4.2.1).</li>
    <li><strong>Dependencias de Desarrollo:</strong> <code>vitest</code> (^2.1.9).</li>
  </ul>

  <h2>11.3. Instalación y Configuración del Servidor</h2>
  <p>
    Para instalar las dependencias y preparar el backend desde el directorio raíz del proyecto:
  </p>
  <pre><code># 1. Navegar al repositorio e instalar dependencias del backend
cd c:\Users\HP\Downloads\amati-hielo
npm install --prefix backend

# 2. Configurar el archivo de variables de entorno del servidor
cp backend/.env.example backend/.env</code></pre>

  <h2>11.4. Matriz de Variables de Entorno del Backend</h2>
  <p>
    A continuación se documentan las variables requeridas en <code>backend/.env</code>:
  </p>

  <table>
    <thead>
      <tr>
        <th style="width: 25%;">Variable</th>
        <th style="width: 12%;">Obligatoria</th>
        <th style="width: 30%;">Propósito Funcional</th>
        <th style="width: 33%;">Ejemplo Ficticio Seguro</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><code>PORT</code></td>
        <td>No (Default 3001)</td>
        <td>Puerto TCP en el cual escucha el servidor Express.</td>
        <td><code>3001</code></td>
      </tr>
      <tr>
        <td><code>FRONTEND_URL</code></td>
        <td>Sí</td>
        <td>Lista de orígenes permitidos por la política CORS (separados por coma).</td>
        <td><code>http://localhost:5173,https://erp.amati.com</code></td>
      </tr>
      <tr>
        <td><code>AUTH_MODE</code></td>
        <td>Sí</td>
        <td>Modo de autenticación: <code>mock</code> (pruebas locales) o <code>supabase</code> (producción).</td>
        <td><code>supabase</code></td>
      </tr>
      <tr>
        <td><code>SUPABASE_URL</code></td>
        <td>Sí (en modo supabase)</td>
        <td>URL base del proyecto en Supabase Cloud.</td>
        <td><code>https://abcdefghijklm.supabase.co</code></td>
      </tr>
      <tr>
        <td><code>SUPABASE_ANON_KEY</code></td>
        <td>Sí</td>
        <td>Llave pública para validación de tokens de clientes.</td>
        <td><code>eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...</code></td>
      </tr>
      <tr>
        <td><code>SUPABASE_SERVICE_ROLE_KEY</code></td>
        <td>Sí</td>
        <td>Llave secreta privilegiada para transacciones y bypass de RLS en el servidor.</td>
        <td><code>eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.sRole...</code></td>
      </tr>
      <tr>
        <td><code>GEMINI_API_KEY</code></td>
        <td>Opcional</td>
        <td>Clave de acceso a la API de Google Generative AI para el Chatbot.</td>
        <td><code>AIzaSyD-Ficticia_ClaveSegura-XyZ123</code></td>
      </tr>
      <tr>
        <td><code>GEMINI_MODEL</code></td>
        <td>No (Default gemini-3.6-flash)</td>
        <td>Identificador del modelo cognitivo de Google a consultar.</td>
        <td><code>gemini-3.6-flash</code></td>
      </tr>
    </tbody>
  </table>

  <div class="page-break"></div>

  <h2>11.5. Modos de Ejecución</h2>
  <pre><code># Modo Desarrollo (con recarga automática de cambios de archivo)
npm run dev:backend

# Modo Producción Directo
npm run start --prefix backend

# Modo Producción con Gestor de Procesos PM2 (Recomendado para servidores Linux)
pm2 start backend/src/server.js --name "amati-backend" --watch=false
pm2 save
pm2 startup</code></pre>

  <h2>11.6. Integración con la Base de Datos</h2>
  <p>
    El servidor inicializa una conexión administrativa mediante <code>backend/src/config/supabaseAdmin.js</code> utilizando el cliente oficial de Supabase con persistencia de sesiones desactivada (<code>persistSession: false</code>), asegurando que cada llamada entrante al API opere de manera aislada e independiente.
  </p>

  <h2>11.7. Políticas de Seguridad, CORS y Middlewares Críticos</h2>
  <ul>
    <li><strong>Verificación en Tiempo Real de Usuario Activo:</strong> El middleware <code>requireSession</code> no confía únicamente en la firma del token JWT; consulta en cada petición la tabla <code>perfil</code>. Si un colaborador es marcado como "Inactivo" por un administrador, su sesión es revocada de forma inmediata devolviendo un código <code>403 Forbidden</code>.</li>
    <li><strong>Protección de Endpoints Sensibles:</strong> El middleware <code>requireAdmin</code> restringe las operaciones de creación de usuarios, alteración de recetas, modificación de proveedores y eliminación de auditorías a los roles <code>Superusuario</code> y <code>Administrador</code>.</li>
    <li><strong>Control de Orígenes Cruzados (CORS):</strong> Implementado en <code>server.js</code> mediante una función de filtrado dinámico que admite localhost, redes privadas locales (192.168.x.x, 10.x.x.x) y los dominios de producción registrados en <code>FRONTEND_URL</code>.</li>
    <li><strong>Límites de Payload:</strong> El parseador de cuerpos JSON está limitado a <code>8mb</code> (<code>express.json({ limit: '8mb' })</code>) para permitir la carga segura de comprobantes de compras o firmas de auditoría sin vulnerabilidades de Denegación de Servicio (DoS).</li>
  </ul>

  <h2>11.8. Catálogo Completo de Endpoints REST del Backend</h2>

  <table>
    <thead>
      <tr>
        <th style="width: 12%;">Método</th>
        <th style="width: 32%;">Endpoint</th>
        <th style="width: 18%;">Middleware</th>
        <th style="width: 38%;">Descripción de la Operación</th>
      </tr>
    </thead>
    <tbody>
      <tr><td><code>POST</code></td><td><code>/auth/login</code></td><td>Público</td><td>Autenticación de credenciales y emisión de token JWT.</td></tr>
      <tr><td><code>POST</code></td><td><code>/auth/forgot-password</code></td><td>Público</td><td>Solicitud de restablecimiento de contraseña vía email.</td></tr>
      <tr><td><code>POST</code></td><td><code>/auth/reset-password</code></td><td>Público</td><td>Actualización final de contraseña con token OTP.</td></tr>
      <tr><td><code>GET</code></td><td><code>/api/users</code></td><td>requireAdmin</td><td>Listado paginado de usuarios con rol y estado.</td></tr>
      <tr><td><code>POST</code></td><td><code>/api/users</code></td><td>requireAdmin</td><td>Creación atómica de usuario en Auth y Perfil.</td></tr>
      <tr><td><code>PUT/DEL</code></td><td><code>/api/users/:id</code></td><td>requireAdmin</td><td>Modificación o baja de un usuario (con protección de auto-baja).</td></tr>
      <tr><td><code>GET</code></td><td><code>/api/inventario/producto</code></td><td>requireSession</td><td>Consulta de existencias, costos y umbrales de stock.</td></tr>
      <tr><td><code>POST</code></td><td><code>/api/inventario/movimiento</code></td><td>requireSession</td><td>Registro de entradas, salidas y mermas (ejecuta RPC atómico).</td></tr>
      <tr><td><code>POST</code></td><td><code>/api/inventario/producto</code></td><td>requireAdmin</td><td>Alta de nuevo artículo en el inventario.</td></tr>
      <tr><td><code>GET</code></td><td><code>/api/inventario/auditoria</code></td><td>requireSession</td><td>Listado de procesos de auditoría y conciliación de stock.</td></tr>
      <tr><td><code>POST</code></td><td><code>/api/inventario/auditoria</code></td><td>requireSession</td><td>Apertura de nueva auditoría con congelamiento de stock teórico.</td></tr>
      <tr><td><code>PUT</code></td><td><code>/api/inventario/auditoria/:id/conteo</code></td><td>requireSession</td><td>Registro de conteos físicos ciegos por parte de los operarios.</td></tr>
      <tr><td><code>POST</code></td><td><code>/api/inventario/auditoria/:id/aprobar-ajustes</code></td><td>requireAdmin</td><td>Aprobación y ajuste automático del Kardex por varianza.</td></tr>
      <tr><td><code>GET</code></td><td><code>/api/pos/venta</code></td><td>requireSession</td><td>Listado histórico de comprobantes y ventas POS.</td></tr>
      <tr><td><code>POST</code></td><td><code>/api/pos/venta</code></td><td>requireSession</td><td>Registro de venta con deducción automática de recetas BOM.</td></tr>
      <tr><td><code>GET/POST</code></td><td><code>/api/caja/arqueo</code></td><td>requireSession</td><td>Consulta y confirmación de arqueos semanales de caja.</td></tr>
      <tr><td><code>GET/POST</code></td><td><code>/api/recetas</code></td><td>requireSession/Admin</td><td>Gestión de fórmulas de productos terminados (BOM).</td></tr>
      <tr><td><code>POST</code></td><td><code>/api/chatbot/message</code></td><td>requireSession</td><td>Consulta al asistente conversacional integrado con Gemini.</td></tr>
    </tbody>
  </table>

  <div class="page-break"></div>

  <!-- ==================== 12. FRONTEND ==================== -->
  <h1>12. Configuración e Implementación del Frontend</h1>

  <h2>12.1. Arquitectura de la Interfaz de Usuario (React 19 SPA)</h2>
  <p>
    La aplicación cliente de AMATI HIELO está concebida como una <strong>Single Page Application (SPA)</strong> altamente responsiva, optimizada para terminales de punto de venta táctiles, escritorios de supervisión y dispositivos móviles de operarios en bodega.
  </p>
  <ul>
    <li><strong>Enrutamiento Protegido (<code>App.jsx</code>):</strong> Utiliza <code>react-router-dom</code> para gestionar rutas declarativas. Las vistas internas como <code>/dashboard</code> están envueltas en el componente <code>ProtectedRoute</code>, el cual verifica la presencia de credenciales activas antes de renderizar la aplicación.</li>
    <li><strong>Shell Principal (<code>Dashboard.jsx</code>):</strong> Centraliza la navegación a través de un menú lateral (sidebar) plegable, control de acceso por roles visual (deshabilitando opciones a operarios), métricas del día en tiempo real y selector de tema claro/oscuro.</li>
    <li><strong>Gestión de Notificaciones (Sonner):</strong> Provee retroalimentación visual no invasiva ante el éxito de transacciones de inventario, errores de conexión o avisos de stock bajo.</li>
    <li><strong>Visualización de Datos (Recharts):</strong> Genera gráficos interactivos de barras y líneas para el pronóstico de demanda semanal y comparación de tendencias de venta en relación con temperaturas climáticas.</li>
  </ul>

  <h2>12.2. Requisitos Previos</h2>
  <ul>
    <li>Node.js versión 20.x o superior y npm versión 10.x instalados en la máquina de compilación.</li>
    <li>Conexión de red hacia el servidor backend (<code>VITE_API_URL</code>) y base de datos Supabase.</li>
  </ul>

  <h2>12.3. Instalación de Dependencias del Frontend</h2>
  <pre><code># Instalar paquetes desde la raíz del proyecto
cd c:\Users\HP\Downloads\amati-hielo
npm install</code></pre>

  <h2>12.4. Matriz de Variables de Entorno del Cliente (.env)</h2>
  <table>
    <thead>
      <tr>
        <th style="width: 25%;">Variable</th>
        <th style="width: 15%;">Obligatoria</th>
        <th style="width: 30%;">Propósito</th>
        <th style="width: 30%;">Valor de Ejemplo</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><code>VITE_API_URL</code></td>
        <td>Sí</td>
        <td>URL base del servidor backend Express.</td>
        <td><code>http://localhost:3001</code> o <code>https://api.amati.com</code></td>
      </tr>
      <tr>
        <td><code>VITE_AUTH_MODE</code></td>
        <td>Sí</td>
        <td>Modo de autenticación (<code>mock</code> o <code>supabase</code>).</td>
        <td><code>supabase</code></td>
      </tr>
      <tr>
        <td><code>VITE_SUPABASE_URL</code></td>
        <td>Sí</td>
        <td>URL pública del endpoint de Supabase.</td>
        <td><code>https://abcdefghijklm.supabase.co</code></td>
      </tr>
      <tr>
        <td><code>VITE_SUPABASE_PUBLISHABLE_KEY</code></td>
        <td>Sí</td>
        <td>Clave anónima pública de cliente de Supabase.</td>
        <td><code>eyJhbGciOiJIUzI1NiIsInR5cCI...</code></td>
      </tr>
      <tr>
        <td><code>VITE_ENV</code></td>
        <td>No</td>
        <td>Identificador de entorno (development / production).</td>
        <td><code>development</code></td>
      </tr>
    </tbody>
  </table>

  <div class="page-break"></div>

  <h2>12.5. Ejecución en Entorno Local de Desarrollo</h2>
  <pre><code># Iniciar solo el cliente frontend (Vite en puerto 5173)
npm run dev:frontend

# Iniciar frontend y backend en paralelo (con concurrencia)
npm run dev:all</code></pre>

  <h2>12.6. Compilación y Publicación en Producción</h2>
  <p>
    Para generar el compilado estático optimizado y minificado de producción:
  </p>
  <pre><code># Generar bundle de producción
npm run build</code></pre>
  <p>
    Este comando ejecuta Rollup y genera el directorio <code>dist/</code>, el cual contiene archivos HTML, CSS purgado y JavaScript optimizado listos para desplegarse en cualquier servidor web estático.
  </p>
  <p><strong>Configuración de Nginx para enrutamiento SPA:</strong></p>
  <pre><code>server {
    listen 80;
    server_name erp.amati.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name erp.amati.com;

    ssl_certificate /etc/letsencrypt/live/erp.amati.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/erp.amati.com/privkey.pem;

    root /var/www/amati-hielo/dist;
    index index.html;

    location / {
        # Esencial para evitar errores 404 al recargar rutas en React Router
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}</code></pre>

  <h2>12.7. Protocolo de Integración Frontend-Backend</h2>
  <p>
    Cada llamada realizada por los módulos de cliente a través de los servicios en <code>src/services/</code> (por ejemplo, <code>inventarioService.js</code>) implementa la función utilitaria <code>request()</code>, la cual extrae de forma transparente el token de sesión almacenado (vía <code>getAccessToken()</code>) e inyecta el encabezado estándar:
  </p>
  <pre><code>Authorization: Bearer [TOKEN_JWT_DEL_USUARIO]</code></pre>

  <div class="page-break"></div>

  <h2>12.8. Guía de Verificación Funcional Módulo por Módulo</h2>

  <table>
    <thead>
      <tr>
        <th style="width: 20%;">Módulo</th>
        <th style="width: 40%;">Comprobación Funcional Clave</th>
        <th style="width: 40%;">Resultado Esperado Comprobado</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Autenticación</strong></td>
        <td>Ingreso con credenciales válidas e inválidas en <code>/</code>.</td>
        <td>Redirección a <code>/dashboard</code> con credenciales correctas; mensaje de error semántico ante claves erróneas.</td>
      </tr>
      <tr>
        <td><strong>Seguridad y Acceso</strong></td>
        <td>Creación de nuevo usuario y cambio de estado a Inactivo.</td>
        <td>El usuario inactivo no puede iniciar sesión; el sistema impide auto-desactivarse o auto-eliminarse.</td>
      </tr>
      <tr>
        <td><strong>Inventarios</strong></td>
        <td>Registro de entrada de insumos y mermas por merma física.</td>
        <td>Aumento o disminución inmediata en el Kardex; bloqueo de operaciones si el stock resultante fuese menor a cero.</td>
      </tr>
      <tr>
        <td><strong>Auditoría de Almacén</strong></td>
        <td>Apertura de proceso, registro de conteo físico y cierre.</td>
        <td>Cálculo automático de varianza económica; ajuste atómico del stock si el administrador aprueba las diferencias.</td>
      </tr>
      <tr>
        <td><strong>Punto de Venta (POS)</strong></td>
        <td>Generación de ticket de venta con producto BOM.</td>
        <td>Impresión del comprobante, aumento en ingresos diarios y deducción simultánea de ingredientes en inventario.</td>
      </tr>
      <tr>
        <td><strong>Arqueo de Caja</strong></td>
        <td>Cierre y balance semanal de caja chica y terminal.</td>
        <td>Totalización de efectivo contra transferencias y bloqueo del periodo auditado para evitar duplicaciones.</td>
      </tr>
      <tr>
        <td><strong>IA Predictiva</strong></td>
        <td>Consulta de proyección semanal y factores climáticos.</td>
        <td>Presentación de curva de demanda sugerida basada en temperatura y disponibilidad de insumos en bodega.</td>
      </tr>
      <tr>
        <td><strong>Asistente Chatbot</strong></td>
        <td>Consulta de existencias críticas al botón flotante.</td>
        <td>Respuesta directa de 4 a 6 líneas con datos de stock reales de la base de datos en formato legible.</td>
      </tr>
    </tbody>
  </table>

  <h2>12.9. Procedimiento de Mantenimiento y Actualización</h2>
  <ol>
    <li>Verificar periódicamente las vulnerabilidades de dependencias con <code>npm audit</code>.</li>
    <li>Probar compilaciones locales mediante <code>npm run build</code> antes de subir cambios al repositorio principal.</li>
    <li>Ejecutar el linter estático <code>npm run lint</code> para asegurar cumplimiento de buenas prácticas de código limpio y accesibilidad.</li>
  </ol>

  <div class="page-break"></div>

  <!-- ==================== 13. VERIFICACIÓN TÉCNICA ==================== -->
  <h1>13. Verificación Técnica Final del Sistema</h1>

  <h2>13.1. Información Confirmada a Partir del Código Fuente del Proyecto</h2>
  <ul>
    <li><span class="badge-verified">CONFIRMADO</span> <strong>Arquitectura Cliente-Servidor Desacoplada:</strong> Frontend en React 19 / Vite 7 y Backend independiente en Express 4.21 / Node.js con módulos ES nativos.</li>
    <li><span class="badge-verified">CONFIRMADO</span> <strong>Motor de Persistencia:</strong> PostgreSQL 15+ administrado en Supabase con 51 migraciones SQL ejecutadas cronológicamente.</li>
    <li><span class="badge-verified">CONFIRMADO</span> <strong>Gobernanza de Concurrencia:</strong> Implementación de la función almacenada <code>registrar_movimiento_inventario</code> con bloqueos a nivel de fila (<code>FOR UPDATE</code>) y restricción de stock no negativo.</li>
    <li><span class="badge-verified">CONFIRMADO</span> <strong>Seguridad en Tiempo Real:</strong> Middleware de backend que comprueba el estado 'Activo' en base de datos en cada petición, impidiendo accesos rezagados por JWT.</li>
    <li><span class="badge-verified">CONFIRMADO</span> <strong>Inteligencia Artificial y Pronósticos:</strong> Integración dual: Google Generative AI (Gemini Flash) para consultas operativas en lenguaje natural y Open-Meteo API para correlación de demanda climática.</li>
    <li><span class="badge-verified">CONFIRMADO</span> <strong>Herramientas de Exportación:</strong> Generación de reportes de auditoría y facturación en formatos Excel (XLSX) y PDF (jsPDF).</li>
  </ul>

  <h2>13.2. Configuraciones Pendientes de Validar en el Entorno Final</h2>
  <ul>
    <li><span class="badge-pending">PENDIENTE DE VERIFICACIÓN</span> <strong>Alineación de Pruebas Unitarias del Chatbot:</strong> La prueba <code>tests/chatbotRules.test.js</code> espera la frase literal <code>'Reporte de Ventas Diario'</code>, requiriendo sincronizar la cadena devuelta por <code>getFixedChatReply</code> en el backend.</li>
    <li><span class="badge-pending">PENDIENTE DE VERIFICACIÓN</span> <strong>Cuotas de Google Gemini en Producción:</strong> Validar el límite de peticiones por minuto (RPM) de la llave <code>GEMINI_API_KEY</code> en la consola de Google Cloud para prevenir errores 429 bajo tráfico elevado de operarios.</li>
    <li><span class="badge-pending">PENDIENTE DE VERIFICACIÓN</span> <strong>Parámetros SMTP para Correos de Restablecimiento:</strong> Verificar si el servicio de correo de Supabase Auth utiliza el proveedor predeterminado o si se configurará un servidor SMTP transaccional dedicado (ej. SendGrid o Amazon SES).</li>
    <li><span class="badge-pending">PENDIENTE DE VERIFICACIÓN</span> <strong>Hardware POS Específico:</strong> Comprobar los modelos exactos de impresoras térmicas de tickets (Epson TM-T20 o similares) y gavetas de dinero conectadas vía puerto RJ11/USB.</li>
  </ul>

  <h2>13.3. Archivos y Scripts que Deben Adjuntarse como Anexos Técnicos</h2>
  <ul>
    <li><strong>Anexo A:</strong> Archivo consolidado de migraciones SQL (<code>supabase/migrations/001_...</code> a <code>051_...</code>).</li>
    <li><strong>Anexo B:</strong> Plantillas maestras de configuración (<code>.env.example</code> y <code>backend/.env.example</code>).</li>
    <li><strong>Anexo C:</strong> Archivo de configuración de proxy inverso Nginx para servidores de producción.</li>
    <li><strong>Anexo D:</strong> Scripts automatizados de respaldo y restauración de base de datos.</li>
  </ul>

  <h2>13.4. Diagramas y Capturas Sugeridas para la Versión Impresa</h2>
  <ul>
    <li><strong>Diagrama 1:</strong> Arquitectura global del sistema (Navegador -> Nginx -> Express API -> Supabase PostgreSQL & Gemini AI).</li>
    <li><strong>Diagrama 2:</strong> Diagrama Entidad-Relación (DER) de las tablas de inventario, recetas BOM, ventas POS y auditoría física.</li>
    <li><strong>Diagrama 3:</strong> Diagrama de secuencia del flujo de autenticación, validación de estado activo y verificación de roles.</li>
    <li><strong>Capturas de Pantalla:</strong> Interfaz del Dashboard principal, módulo de Auditoría con conteo ciego, Punto de Venta táctil y panel de IA Predictiva con gráfica de clima.</li>
  </ul>

  <h2>13.5. Pruebas que Deben Ejecutarse Antes de la Entrega Final del Sistema</h2>
  <ol>
    <li><strong>Prueba de Concurrencia de Inventario:</strong> Simular 10 transacciones simultáneas de salida sobre un producto con stock crítico para verificar que la función RPC bloquee intentos que provoquen saldo negativo.</li>
    <li><strong>Prueba de Desactivación de Usuario en Sesión Activa:</strong> Desactivar un usuario en la tabla <code>perfil</code> y comprobar que su siguiente clic en el sistema sea rechazado inmediatamente con código 403.</li>
    <li><strong>Prueba de Deducción de Insumos BOM en Ventas POS:</strong> Registrar una venta de 5 bolsas de producto terminado y verificar en el Kardex que se hayan descontado automáticamente las cantidades proporcionales de bolsa plástica, agua tratada y sellos de seguridad.</li>
    <li><strong>Prueba de Caída de Red:</strong> Desconectar la conexión a internet en la terminal cliente y corroborar que la aplicación informe el estado sin congelar la interfaz ni generar pérdidas de datos inconsistentes.</li>
  </ol>

  <div style="text-align: center; margin-top: 40px; font-size: 8.5pt; color: #64748b; font-style: italic; border-top: 1px solid #cbd5e1; padding-top: 15px;">
    Manual Técnico Oficial · Sistema Web de Trazabilidad y Control de Inventarios · AMATI HIELO · Proyecto de Graduación Universitaria · Octubre de 2026
  </div>

</body>
</html>`;

  const outputPathHtml = path.join(__dirname, '..', 'manual_tecnico.html');
  fs.writeFileSync(outputPathHtml, htmlContent, 'utf-8');
  console.log('Documento HTML del Manual Técnico generado con éxito en:', outputPathHtml);

  // Compilar con Playwright usando el navegador Edge de Windows
  const outputPathPdf = path.join(__dirname, '..', 'Manual_Tecnico_AMATI_HIELO.pdf');
  console.log('Lanzando navegador Chromium/Edge con Playwright...');
  const browser = await chromium.launch({ channel: 'msedge' });
  const page = await browser.newPage();
  
  await page.setContent(htmlContent, { waitUntil: 'networkidle' });
  
  console.log('Renderizando PDF con márgenes y estilos de alta calidad...');
  await page.pdf({
    path: outputPathPdf,
    format: 'Letter',
    printBackground: true,
    margin: {
      top: '12mm',
      bottom: '12mm',
      left: '12mm',
      right: '12mm',
    },
  });

  await browser.close();
  console.log('¡PDF del Manual Técnico generado exitosamente!');
  console.log('Ruta del PDF:', outputPathPdf);

  const stats = fs.statSync(outputPathPdf);
  console.log(`Tamaño final del PDF: ${(stats.size / 1024).toFixed(2)} KB`);
}

generateManualTecnicoPdf().catch(err => {
  console.error('Error generando PDF del Manual Técnico:', err);
  process.exit(1);
});
