const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

async function generatePdf() {
  console.log('Iniciando generador de Manual de Usuario en PDF...');

  // Cargar logotipo de AMATI en base64
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
  <title>Manual de Usuario - AMATI HIELO</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

    @page {
      size: letter;
      margin: 20mm 15mm 20mm 15mm;
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
      font-size: 10pt;
      line-height: 1.55;
      color: #1e293b;
      margin: 0;
      padding: 0;
      background: #ffffff;
    }

    h1, h2, h3, h4, h5, h6 {
      font-family: 'Outfit', sans-serif;
      color: #0f172a;
      margin-top: 1.4em;
      margin-bottom: 0.5em;
      font-weight: 700;
      page-break-after: avoid;
    }

    h1 { font-size: 20pt; color: #0369a1; border-bottom: 2pt solid #0284c7; padding-bottom: 4px; }
    h2 { font-size: 15pt; color: #0f766e; border-bottom: 1pt solid #cbd5e1; padding-bottom: 3px; }
    h3 { font-size: 12pt; color: #1e293b; }
    h4 { font-size: 10.5pt; color: #334155; }

    p { margin-top: 0; margin-bottom: 0.8em; text-align: justify; }

    .page-break { page-break-before: always; }
    .avoid-break { page-break-inside: avoid; }

    /* Portada */
    .portada-container {
      height: 92vh;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      text-align: center;
      padding: 20px 10px;
    }

    .portada-header {
      border-bottom: 2px solid #0284c7;
      padding-bottom: 20px;
    }
    .portada-univ { font-size: 15pt; font-weight: 700; color: #0f172a; text-transform: uppercase; letter-spacing: 1px; }
    .portada-fac { font-size: 12pt; font-weight: 600; color: #475569; margin-top: 4px; }
    .portada-carrera { font-size: 11pt; color: #0284c7; font-weight: 600; margin-top: 4px; }

    .portada-body {
      margin: 40px 0;
    }
    .portada-logo {
      width: 110px;
      height: 110px;
      border-radius: 50%;
      border: 3px solid #0284c7;
      margin: 0 auto 20px auto;
      object-fit: cover;
      box-shadow: 0 4px 14px rgba(2, 132, 199, 0.25);
    }
    .portada-proyecto-label { font-size: 9pt; text-transform: uppercase; letter-spacing: 2px; color: #64748b; font-weight: 700; }
    .portada-titulo { font-size: 15pt; font-weight: 700; color: #0c4a6e; margin: 12px 25px; line-height: 1.35; }
    .portada-doc-tipo {
      display: inline-block;
      background: linear-gradient(135deg, #0284c7, #0369a1);
      color: white;
      padding: 8px 26px;
      border-radius: 20px;
      font-size: 13pt;
      font-weight: 700;
      letter-spacing: 1px;
      margin-top: 15px;
    }
    .portada-empresa { font-size: 13pt; font-weight: 700; color: #0f766e; margin-top: 15px; }

    .portada-footer {
      border-top: 1px solid #cbd5e1;
      padding-top: 20px;
      font-size: 9.5pt;
      color: #334155;
      display: grid;
      grid-template-columns: 1fr 1fr;
      text-align: left;
    }
    .portada-footer-right { text-align: right; }

    /* Carátula */
    .caratula-box {
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 24px;
      background: #f8fafc;
      margin: 25px 0;
    }
    .caratula-row {
      display: flex;
      margin-bottom: 12px;
      border-bottom: 1px dashed #e2e8f0;
      padding-bottom: 8px;
    }
    .caratula-label { width: 32%; font-weight: 700; color: #334155; font-size: 9pt; text-transform: uppercase; }
    .caratula-val { width: 68%; color: #0f172a; font-weight: 500; font-size: 9.5pt; }

    /* Tablas */
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 12px 0 16px 0;
      font-size: 8.5pt;
      page-break-inside: avoid;
    }
    th {
      background: #0f766e;
      color: #ffffff;
      font-weight: 600;
      text-align: left;
      padding: 7px 9px;
      border: 1px solid #0d9488;
      font-size: 8.5pt;
      letter-spacing: 0.3px;
    }
    td {
      padding: 6px 9px;
      border: 1px solid #cbd5e1;
      vertical-align: top;
    }
    tr:nth-child(even) td { background: #f8fafc; }

    /* Alerts */
    .alert {
      border-radius: 6px;
      padding: 10px 14px;
      margin: 12px 0;
      font-size: 9pt;
      page-break-inside: avoid;
    }
    .alert-info { background: #f0f9ff; border-left: 4px solid #0284c7; color: #0369a1; }
    .alert-warning { background: #fffbeb; border-left: 4px solid #f59e0b; color: #b45309; }
    .alert-danger { background: #fef2f2; border-left: 4px solid #ef4444; color: #b91c1c; }
    .alert-success { background: #f0fdf4; border-left: 4px solid #10b981; color: #047857; }

    /* Badges */
    .badge {
      display: inline-block;
      padding: 2px 7px;
      border-radius: 10px;
      font-size: 7.5pt;
      font-weight: 600;
    }
    .badge-green { background: #dcfce7; color: #15803d; border: 1px solid #86efac; }
    .badge-yellow { background: #fef9c3; color: #a16207; border: 1px solid #fde047; }
    .badge-red { background: #fee2e2; color: #b91c1c; border: 1px solid #fca5a5; }
    .badge-blue { background: #e0f2fe; color: #0369a1; border: 1px solid #7dd3fc; }

    /* Module Box */
    .module-card {
      border: 1px solid #e2e8f0;
      border-top: 3px solid #0284c7;
      border-radius: 6px;
      padding: 14px;
      margin-bottom: 20px;
      background: #ffffff;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
      page-break-inside: avoid;
    }
    .module-card-title {
      font-size: 11pt;
      font-weight: 700;
      color: #0369a1;
      margin: 0 0 6px 0;
    }

    /* Screenshot placeholder */
    .screenshot-box {
      border: 2px dashed #94a3b8;
      background: #f8fafc;
      border-radius: 6px;
      padding: 16px;
      margin: 12px 0;
      text-align: center;
      page-break-inside: avoid;
    }
    .screenshot-title {
      font-weight: 700;
      color: #334155;
      font-size: 8.5pt;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .screenshot-desc {
      font-size: 8pt;
      color: #64748b;
      margin-top: 4px;
      font-style: italic;
    }

    /* Listas numeradas y bullets */
    ol, ul {
      margin-top: 0;
      margin-bottom: 10px;
      padding-left: 20px;
    }
    li { margin-bottom: 4px; }

    /* Índice */
    .toc-item {
      display: flex;
      justify-content: space-between;
      border-bottom: 1px dotted #cbd5e1;
      margin-bottom: 6px;
      font-size: 9pt;
    }
    .toc-title { font-weight: 500; color: #1e293b; }
    .toc-page { font-weight: 600; color: #0284c7; }
    .toc-subitem { padding-left: 18px; font-size: 8.5pt; color: #475569; }

    .header-rule {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #cbd5e1;
      padding-bottom: 6px;
      margin-bottom: 16px;
      font-size: 7.5pt;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
  </style>
</head>
<body>

  <!-- ================= PORTADA ================= -->
  <div class="portada-container">
    <div class="portada-header">
      <div class="portada-univ">[NOMBRE DE LA UNIVERSIDAD]</div>
      <div class="portada-fac">[FACULTAD DE INGENIERÍA / CIENCIAS]</div>
      <div class="portada-carrera">[NOMBRE DE LA CARRERA PROFESIONAL]</div>
    </div>

    <div class="portada-body">
      ${logoBase64 ? `<img src="${logoBase64}" class="portada-logo" alt="Logo AMATI">` : ''}
      <div class="portada-proyecto-label">Proyecto de Graduación</div>
      <div class="portada-titulo">“Sistema web para la gestión integral de trazabilidad y control de inventarios en plantas de productos perecederos bajo cadena de frío”</div>
      <div class="portada-empresa">Empresa Beneficiaria: AMATI HIELO</div>
      <div>
        <span class="portada-doc-tipo">MANUAL DE USUARIO</span>
      </div>
    </div>

    <div class="portada-footer">
      <div>
        <strong>Integrantes del Equipo:</strong><br>
        [Nombre del Estudiante 1] - Carné: [0000-00-0000]<br>
        [Nombre del Estudiante 2] - Carné: [0000-00-0000]
      </div>
      <div class="portada-footer-right">
        <strong>Asesor o Docente Guía:</strong><br>
        [Nombre del Asesor / Docente Guía]<br><br>
        <strong>Lugar y Fecha:</strong><br>
        Guatemala, Octubre de 2026
      </div>
    </div>
  </div>

  <div class="page-break"></div>

  <!-- ================= CARÁTULA ================= -->
  <div class="header-rule">
    <span>AMATI HIELO · Sistema de Gestión ERP</span>
    <span>Manual de Usuario</span>
  </div>

  <h1>Carátula y Datos del Proyecto</h1>
  <p>El presente documento constituye el Manual Oficial de Operación y Usuario del software desarrollado para la empresa AMATI HIELO, orientado a normar y estandarizar los procesos operativos, el registro de inventarios y el despacho comercial bajo cadena de frío.</p>

  <div class="caratula-box">
    <div class="caratula-row">
      <div class="caratula-label">Título del Sistema</div>
      <div class="caratula-val"><strong>Sistema web para la gestión integral de trazabilidad y control de inventarios en plantas de productos perecederos bajo cadena de frío</strong></div>
    </div>
    <div class="caratula-row">
      <div class="caratula-label">Empresa Beneficiaria</div>
      <div class="caratula-val">AMATI HIELO</div>
    </div>
    <div class="caratula-row">
      <div class="caratula-label">Institución Académica</div>
      <div class="caratula-val">[Nombre de la Universidad] · [Facultad de Ingeniería]</div>
    </div>
    <div class="caratula-row">
      <div class="caratula-label">Responsables del Proyecto</div>
      <div class="caratula-val">[Nombres y Apellidos de los Integrantes del Equipo]</div>
    </div>
    <div class="caratula-row">
      <div class="caratula-label">Asesor Metodológico / Técnico</div>
      <div class="caratula-val">[Nombre del Docente Guía o Asesor Institucional]</div>
    </div>
    <div class="caratula-row">
      <div class="caratula-label">Tipo de Documento</div>
      <div class="caratula-val">Manual Técnico de Usuario y Guía de Operación en Planta</div>
    </div>
    <div class="caratula-row" style="border-bottom: none;">
      <div class="caratula-label">Fecha y Versión</div>
      <div class="caratula-val">Octubre 2026 · Versión 1.0.0 (Producción / Piloto)</div>
    </div>
  </div>

  <div class="alert alert-info">
    <strong>Nota de Adaptación Universitaria:</strong> Si el reglamento interno de graduación de la institución exige una carátula específica, este apartado puede ajustarse al formato institucional conservando los campos definidos para evitar duplicidades innecesarias.
  </div>

  <div class="page-break"></div>

  <!-- ================= ÍNDICE ================= -->
  <div class="header-rule">
    <span>AMATI HIELO · Sistema de Gestión ERP</span>
    <span>Manual de Usuario</span>
  </div>

  <h1>Índice de Contenido</h1>

  <div class="toc-item"><span class="toc-title">1. INTRODUCCIÓN Y RESUMEN DEL SISTEMA</span><span class="toc-page">Pág. 4</span></div>
  <div class="toc-item toc-subitem"><span class="toc-title">1.1. Propósito del Manual</span><span class="toc-page">4</span></div>
  <div class="toc-item toc-subitem"><span class="toc-title">1.2. Importancia del Sistema para AMATI HIELO</span><span class="toc-page">4</span></div>
  <div class="toc-item toc-subitem"><span class="toc-title">1.3. Problemática Operativa que Resuelve</span><span class="toc-page">4</span></div>
  <div class="toc-item toc-subitem"><span class="toc-title">1.4. Audiencia y Usuarios Destinatarios</span><span class="toc-page">5</span></div>
  <div class="toc-item toc-subitem"><span class="toc-title">1.5. Alcance General de la Guía</span><span class="toc-page">5</span></div>
  <div class="toc-item toc-subitem"><span class="toc-title">1.6. Resumen Funcional del Sistema AMATI HIELO</span><span class="toc-page">5</span></div>

  <div class="toc-item" style="margin-top: 10px;"><span class="toc-title">2. OBJETIVOS</span><span class="toc-page">Pág. 6</span></div>
  <div class="toc-item toc-subitem"><span class="toc-title">2.1. Objetivo General</span><span class="toc-page">6</span></div>
  <div class="toc-item toc-subitem"><span class="toc-title">2.2. Objetivos Específicos</span><span class="toc-page">6</span></div>

  <div class="toc-item" style="margin-top: 10px;"><span class="toc-title">3. EXPLICACIÓN DEL SISTEMA MÓDULO POR MÓDULO</span><span class="toc-page">Pág. 7</span></div>
  <div class="toc-item toc-subitem"><span class="toc-title">3.1. Inicio de Sesión y Navegación Global</span><span class="toc-page">7</span></div>
  <div class="toc-item toc-subitem"><span class="toc-title">3.2. Panel Principal (Dashboard y Métricas en Tiempo Real)</span><span class="toc-page">8</span></div>
  <div class="toc-item toc-subitem"><span class="toc-title">3.3. Módulo de Seguridad y Acceso (Usuarios y Roles)</span><span class="toc-page">9</span></div>
  <div class="toc-item toc-subitem"><span class="toc-title">3.4. Catálogo de Artículos de Inventario</span><span class="toc-page">11</span></div>
  <div class="toc-item toc-subitem"><span class="toc-title">3.5. Movimientos de Bodega: Registro de Entradas y Facturas</span><span class="toc-page">13</span></div>
  <div class="toc-item toc-subitem"><span class="toc-title">3.6. Gestión de Mermas y Pérdidas Económicas</span><span class="toc-page">15</span></div>
  <div class="toc-item toc-subitem"><span class="toc-title">3.7. Gestión de Proveedores de Inventario</span><span class="toc-page">17</span></div>
  <div class="toc-item toc-subitem"><span class="toc-title">3.8. Alertas de Reabastecimiento y Stock Mínimo</span><span class="toc-page">18</span></div>
  <div class="toc-item toc-subitem"><span class="toc-title">3.9. Auditoría de Inventario y Conteos Físicos</span><span class="toc-page">19</span></div>
  <div class="toc-item toc-subitem"><span class="toc-title">3.10. Recetas de Venta y Fichas Técnicas (BOM)</span><span class="toc-page">20</span></div>
  <div class="toc-item toc-subitem"><span class="toc-title">3.11. Punto de Venta (POS) y Descuento Automático de Insumos</span><span class="toc-page">22</span></div>
  <div class="toc-item toc-subitem"><span class="toc-title">3.12. Arqueo y Control Semanal de Caja</span><span class="toc-page">24</span></div>
  <div class="toc-item toc-subitem"><span class="toc-title">3.13. Módulo de Reportes y Exportación (PDF y Excel)</span><span class="toc-page">25</span></div>
  <div class="toc-item toc-subitem"><span class="toc-title">3.14. Módulos de Administración Avanzada (Configuración, Datos e IA)</span><span class="toc-page">26</span></div>

  <div class="toc-item" style="margin-top: 10px;"><span class="toc-title">4. CÓMO INGRESAR AL SISTEMA EN MODO USUARIO (OPERATIVO)</span><span class="toc-page">Pág. 27</span></div>
  <div class="toc-item toc-subitem"><span class="toc-title">4.1. Requisitos Técnicos y URL de Acceso</span><span class="toc-page">27</span></div>
  <div class="toc-item toc-subitem"><span class="toc-title">4.2. Flujo de Acceso para Operarios y Cajeros</span><span class="toc-page">27</span></div>
  <div class="toc-item toc-subitem"><span class="toc-title">4.3. Opciones Habilitadas y Buenas Prácticas</span><span class="toc-page">27</span></div>
  <div class="toc-item toc-subitem"><span class="toc-title">4.4. Solución a Preguntas y Problemas Frecuentes</span><span class="toc-page">28</span></div>

  <div class="toc-item" style="margin-top: 10px;"><span class="toc-title">5. CÓMO INGRESAR AL SISTEMA EN MODO ADMINISTRADOR</span><span class="toc-page">Pág. 29</span></div>
  <div class="toc-item toc-subitem"><span class="toc-title">5.1. Requisitos y Opciones Administrativas</span><span class="toc-page">29</span></div>
  <div class="toc-item toc-subitem"><span class="toc-title">5.2. Tabla Comparativa de Permisos: Modo Usuario vs. Modo Administrador</span><span class="toc-page">29</span></div>
  <div class="toc-item toc-subitem"><span class="toc-title">5.3. Políticas de Protección de Cuentas y Soporte</span><span class="toc-page">30</span></div>

  <div class="toc-item" style="margin-top: 10px;"><span class="toc-title">6. ANEXO: ELEMENTOS Y DATOS PENDIENTES DE VERIFICACIÓN EN PLANTA</span><span class="toc-page">Pág. 31</span></div>

  <div class="page-break"></div>

  <!-- ================= CAPÍTULO 1 ================= -->
  <div class="header-rule">
    <span>AMATI HIELO · Sistema de Gestión ERP</span>
    <span>1. Introducción y Resumen del Sistema</span>
  </div>

  <h1>1. Introducción y Resumen del Sistema</h1>

  <h2>1.1. Propósito del Manual</h2>
  <p>El propósito fundamental de este manual es constituirse en una guía didáctica, clara y de consulta rápida para todo el personal que interviene en las operaciones diarias de la empresa <strong>AMATI HIELO</strong>. Se ha redactado evitando terminologías informáticas innecesarias, con el objetivo de que cualquier colaborador, sin importar su nivel de destreza técnica, comprenda con exactitud cómo realizar sus labores diarias en el sistema: registrar insumos recibidos, descartar mermas, despachar ventas en mostrador y realizar cierres de caja.</p>

  <h2>1.2. Importancia del Sistema para AMATI HIELO</h2>
  <p>La fabricación y comercialización de hielo y bebidas purificadas se enmarca dentro de la industria de alimentos y productos perecederos bajo <strong>cadena de frío</strong>. El hielo es un producto vulnerable a condiciones ambientales externas; su preservación exige cámaras de congelación continuas y el abastecimiento ininterrumpido de insumos específicos (bolsas plásticas de calibre alimenticio, precintos de inviolabilidad, agua purificada y consumo eléctrico constante).</p>
  <p>El sistema informático de AMATI HIELO centraliza el control de la planta, asegurando que cada movimiento físico en bodega tenga un respaldo digital instantáneo, garantizando la trazabilidad total desde la compra del fardo de bolsas hasta la entrega del producto embolsado al cliente final.</p>

  <h2>1.3. Problemática Operativa que Resuelve</h2>
  <p>Previo a la puesta en marcha de este sistema web, la planta experimentaba debilidades operativas recurrentes:</p>
  <ul>
    <li><strong>Descuadres en bodega:</strong> Los conteos manuales en papel diferían del inventario real, detectándose faltantes tardíos de bolsas o precintos al momento de empacar.</li>
    <li><strong>Pérdida de trazabilidad en las mermas:</strong> Las bolsas dañadas o el hielo derretido por desconexiones o manipulación se desechaban sin cuantificar su impacto económico real ni dejar registro del motivo causante.</li>
    <li><strong>Cálculo inexacto de costos de venta:</strong> No se conocía con precisión el costo real unitario por bolsa vendida considerando el costo de materia prima sumado al consumo energético de congelación.</li>
    <li><strong>Desconexión entre ventas e inventario:</strong> La salida de producto en mostrador requería un descargo manual en libros, lo que provocaba atrasos y registros desfasados.</li>
  </ul>
  <p>El software resuelve estas deficiencias al enlazar el Punto de Venta directamente con las recetas técnicas (BOM): <em>cada venta en mostrador descuenta en milisegundos las materias primas consumidas</em>, manteniendo el stock siempre al día.</p>

  <h2>1.4. Audiencia y Usuarios Destinatarios</h2>
  <p>El manual está orientado a tres perfiles fundamentales de la empresa:</p>
  <ol>
    <li><strong>Operarios de Bodega y Planta:</strong> Encargados de recepcionar insumos de proveedores, dar de baja mermas y registrar conteos físicos de auditoría.</li>
    <li><strong>Cajeros y Vendedores de Mostrador:</strong> Responsables del cobro ágil a clientes, emisión de comprobantes, facturación y arqueo de caja.</li>
    <li><strong>Supervisores y Administradores:</strong> Responsables de autorizar nuevos artículos, formular recetas, dar de alta colaboradores y emitir reportes gerenciales en PDF y Excel.</li>
  </ol>

  <h2>1.5. Alcance General de la Guía</h2>
  <p>Este documento abarca desde los procedimientos iniciales de autenticación hasta la administración avanzada del sistema, describiendo de forma secuencial y detallada cada formulario, botón y validación disponible en la plataforma.</p>

  <h2>1.6. Resumen Funcional del Sistema AMATI HIELO</h2>
  <p>La solución implementada para AMATI HIELO se estructura en módulos interconectados que interactúan en tiempo real:</p>
  <ul>
    <li><strong>Módulo de Inventarios:</strong> Administra el catálogo de materias primas y suministros, calcula costos unitarios por paquete y registra recepciones de proveedores con factura.</li>
    <li><strong>Gestión de Mermas:</strong> Permite desincorporar producto deteriorado con justificación y cálculo de pérdida monetaria.</li>
    <li><strong>Recetas de Venta (BOM):</strong> Modela la estructura técnica de cada producto comercial y sus costos indirectos (electricidad, agua, mano de obra).</li>
    <li><strong>Punto de Venta (POS):</strong> Terminal de cobro táctil con descuento automático de materias primas e insumos.</li>
    <li><strong>Arqueo de Caja:</strong> Conciliación de turnos y cierre semanal de caja cada domingo a las 18:00 horas.</li>
    <li><strong>Reportes Gerenciales:</strong> Exportación ejecutiva de ventas, inventarios y finanzas en formato PDF y Microsoft Excel.</li>
    <li><strong>Seguridad y Configuración:</strong> Control estricto de roles, gestión de usuarios, auditoría de tablas y proyecciones de demanda.</li>
  </ul>

  <div class="page-break"></div>

  <!-- ================= CAPÍTULO 2 ================= -->
  <div class="header-rule">
    <span>AMATI HIELO · Sistema de Gestión ERP</span>
    <span>2. Objetivos del Manual</span>
  </div>

  <h1>2. Objetivos</h1>

  <h2>2.1. Objetivo General</h2>
  <p>Brindar al personal operativo, administrativo y gerencial de <strong>AMATI HIELO</strong> un instrumento de referencia completo, formal y de fácil asimilación que garantice el uso correcto, seguro y eficiente de todas las funcionalidades del sistema web, fortaleciendo el control de inventarios, la trazabilidad de insumos y la exactitud en los puntos de venta bajo condiciones de cadena de frío.</p>

  <h2>2.2. Objetivos Específicos</h2>
  <ol>
    <li><strong>Explicar detalladamente el funcionamiento operativo</strong> de cada uno de los módulos que integran el sistema, detallando el acceso, los procedimientos paso a paso, los campos requeridos y el resultado esperado de cada acción.</li>
    <li><strong>Delimitar con precisión las funciones según el rol asignado</strong>, diferenciando claramente las operaciones que corresponden al Operario (bodega y venta) de las facultades exclusivas del Administrador y Superusuario (seguridad, costeo y reportes).</li>
    <li><strong>Estandarizar el registro de operaciones clave en planta</strong>, tales como la recepción formal de mercadería respaldada por facturas de proveedores, el reporte justificado de mermas y la conciliación física de inventarios.</li>
    <li><strong>Capacitar al personal en la interpretación de alertas e indicadores</strong>, facilitando la comprensión visual de los niveles de stock (Normal, Bajo y Crítico) para evitar desabastecimientos de bolsas o materias primas.</li>
    <li><strong>Fomentar una disciplina de seguridad de la información</strong>, concienciando a los colaboradores sobre la confidencialidad de sus credenciales, el cierre de sesión seguro y la preservación de la evidencia digital ante auditorías internas.</li>
  </ol>

  <div class="page-break"></div>

  <!-- ================= CAPÍTULO 3 ================= -->
  <div class="header-rule">
    <span>AMATI HIELO · Sistema de Gestión ERP</span>
    <span>3. Explicación del Sistema Módulo por Módulo</span>
  </div>

  <h1>3. Explicación del Sistema Módulo por Módulo</h1>

  <!-- 3.1 -->
  <div class="module-card">
    <div class="module-card-title">3.1. Inicio de Sesión, Recuperación y Navegación Global</div>
    <p><strong>1. Descripción del Módulo:</strong> Es la pantalla de acceso donde se verifica la identidad de los colaboradores y se comprueba que su cuenta esté activa en la base de datos de la empresa antes de permitirles el ingreso.</p>
    <p><strong>2. Objetivo:</strong> Autenticar al usuario de forma segura y abrir una sesión adaptada estrictamente a su rol de trabajo.</p>
    <p><strong>3. Acceso:</strong> Al abrir el navegador web en la dirección designada para la planta de AMATI HIELO.</p>
    <p><strong>4. Procedimiento paso a paso:</strong>
      <ol>
        <li>Ingrese en la casilla <strong>Usuario o correo</strong> su nombre de cuenta asignado o correo registrado.</li>
        <li>Escriba su clave en la casilla <strong>Contraseña</strong>. Puede presionar el icono del ojo para verificar lo que escribió.</li>
        <li>(Opcional) Marque la casilla <strong>Recuérdame</strong> si el equipo de cómputo es de uso exclusivo de su persona.</li>
        <li>Haga clic en el botón celeste <strong>Iniciar sesión</strong>.</li>
        <li>Si olvidó su clave, haga clic en <em>¿Olvidaste tu contraseña?</em>, escriba su correo y presione <em>Enviar enlace</em> para recibir el vínculo de restablecimiento.</li>
      </ol>
    </p>
    <p><strong>5. Campos del Formulario:</strong></p>
    <table>
      <thead><tr><th>Campo</th><th>Tipo</th><th>Obligatorio</th><th>Descripción</th></tr></thead>
      <tbody>
        <tr><td>Usuario o Correo</td><td>Texto</td><td>Sí</td><td>Identificador de cuenta único o correo institucional.</td></tr>
        <tr><td>Contraseña</td><td>Clave</td><td>Sí</td><td>Clave secreta personal (mínimo 6 caracteres).</td></tr>
        <tr><td>Recuérdame</td><td>Casilla</td><td>No</td><td>Conserva la sesión abierta en el equipo.</td></tr>
        <tr><td>Tema Visual</td><td>Botón</td><td>No</td><td>Permite cambiar entre Modo Claro y Modo Oscuro.</td></tr>
      </tbody>
    </table>
    <p><strong>6. Resultado Esperado:</strong> Ingreso inmediato al panel de trabajo con el nombre del usuario activo visible en la parte superior.</p>
    <p><strong>7. Validaciones y Mensajes:</strong> Si omite un dato: <em>"Por favor ingresa tu usuario o correo y contraseña."</em>. Si la clave no coincide: <em>"Error al iniciar sesión."</em>. Si fue desactivado: <em>"El usuario se encuentra inactivo."</em>.</p>
    <p><strong>8. Recomendaciones de Uso:</strong> No deje su sesión abierta al retirarse del mostrador y nunca use contraseñas obvias.</p>
    <div class="screenshot-box">
      <div class="screenshot-title">[Captura de Pantalla: Pantalla de Login AMATI HIELO]</div>
      <div class="screenshot-desc">Debe mostrar el logotipo central de AMATI HIELO, casillas de usuario y contraseña, botón Iniciar Sesión y selector de tema claro/oscuro.</div>
    </div>
  </div>

  <!-- 3.2 -->
  <div class="module-card">
    <div class="module-card-title">3.2. Panel Principal (Dashboard y Métricas en Tiempo Real)</div>
    <p><strong>1. Descripción del Módulo:</strong> Pantalla ejecutiva de bienvenida que consolida las cifras operativas, financieras y de almacenamiento del día.</p>
    <p><strong>2. Objetivo:</strong> Brindar a los supervisores y encargados una visión instantánea del ritmo de la planta sin necesidad de emitir reportes complejos.</p>
    <p><strong>3. Acceso:</strong> Menú lateral izquierdo -> opción <strong>Inicio</strong> (icono de casa).</p>
    <p><strong>4. Procedimiento paso a paso:</strong>
      <ol>
        <li>Al iniciar sesión, el sistema carga el Dashboard de forma predeterminada.</li>
        <li>Inspeccione las cuatro tarjetas superiores de métricas (se actualizan automáticamente cada 15 segundos).</li>
        <li>Utilice las tarjetas de acceso rápido inferiores para dirigirse al módulo que requiera operar.</li>
      </ol>
    </p>
    <p><strong>5. Componentes e Indicadores:</strong></p>
    <table>
      <thead><tr><th>Indicador</th><th>Unidad</th><th>Descripción Operativa</th></tr></thead>
      <tbody>
        <tr><td>Ventas Hoy</td><td>Quetzales (Q)</td><td>Total recaudado en el día y conteo de clientes atendidos.</td></tr>
        <tr><td>Stock Disponible</td><td>Unidades</td><td>Existencias globales sumadas de todos los artículos en bodega.</td></tr>
        <tr><td>Catálogo Recetas</td><td>Conteo</td><td>Número de recetas listas para despacho en Punto de Venta.</td></tr>
        <tr><td>Temperatura</td><td>Grados (°C)</td><td>Monitoreo térmico de las cámaras frigoríficas (cadena de frío).</td></tr>
      </tbody>
    </table>
    <p><strong>6. Resultado Esperado:</strong> Información veraz y sincronizada en tiempo real con las ventas de mostrador y movimientos de bodega.</p>
    <p><strong>7. Validaciones:</strong> Si no hubo transacciones en el día, marcará Q0.00 con 0 ventas de forma consistente.</p>
    <p><strong>8. Recomendaciones de Uso:</strong> Coteje el indicador de Ventas Hoy antes de iniciar el conteo de dinero al cierre de caja.</p>
    <div class="screenshot-box">
      <div class="screenshot-title">[Captura de Pantalla: Dashboard Principal con Métricas en Tiempo Real]</div>
      <div class="screenshot-desc">Debe mostrar las 4 tarjetas de KPIs superiores (Ventas, Stock, Recetas, Temperatura) y las tarjetas de acceso rápido a los módulos.</div>
    </div>
  </div>

  <div class="page-break"></div>

  <!-- 3.3 -->
  <div class="module-card">
    <div class="module-card-title">3.3. Módulo de Seguridad y Acceso (Usuarios y Roles)</div>
    <div class="alert alert-danger" style="margin: 6px 0 10px 0; padding: 6px 10px;">
      <strong>Acceso Restringido:</strong> Módulo exclusivo para Administradores y Superusuarios. Los operarios tienen el acceso denegado.
    </div>
    <p><strong>1. Descripción del Módulo:</strong> Permite administrar las cuentas del personal de la empresa, asignar roles jerárquicos y controlar los accesos.</p>
    <p><strong>2. Objetivo:</strong> Garantizar que cada colaborador cuente con su usuario personal con los permisos que corresponden a su puesto.</p>
    <p><strong>3. Acceso:</strong> Menú lateral -> <strong>Seguridad y Acceso</strong> (icono de candado).</p>
    <p><strong>4. Procedimiento paso a paso (Crear Usuario):</strong>
      <ol>
        <li>Presione el botón celeste superior <strong>+ Nuevo Usuario</strong>.</li>
        <li>Complete el formulario secuencial: Primer Nombre, Primer Apellido (solo letras).</li>
        <li>Defina el <strong>Usuario</strong> (sin espacios) y el <strong>Correo electrónico</strong>.</li>
        <li>Escriba una contraseña provisional de al menos 6 caracteres.</li>
        <li>Seleccione el <strong>Rol</strong> (Operario, Administrador o Superusuario) y el <strong>Estado</strong> (Activo).</li>
        <li>Elija el <strong>Departamento</strong>; la casilla de <strong>Municipio</strong> se cargará automáticamente con las opciones de esa región.</li>
        <li>Presione <strong>Guardar Usuario</strong>. El sistema confirmará con un aviso verde.</li>
      </ol>
    </p>
    <p><strong>5. Campos del Formulario de Usuario:</strong></p>
    <table>
      <thead><tr><th>Campo</th><th>Tipo</th><th>Obligatorio</th><th>Reglas y Validaciones</th></tr></thead>
      <tbody>
        <tr><td>Nombres y Apellidos</td><td>Texto</td><td>Sí</td><td>Solo letras y acentos. Primera letra en mayúscula automática.</td></tr>
        <tr><td>Usuario</td><td>Texto</td><td>Sí</td><td>Identificador único sin espacios en blanco.</td></tr>
        <tr><td>Correo Electrónico</td><td>Email</td><td>Sí</td><td>Formato válido. No puede repetirse en la base de datos.</td></tr>
        <tr><td>Contraseña</td><td>Clave</td><td>Sí (alta)</td><td>Mínimo 6 caracteres. Al editar se deja en blanco si no cambia.</td></tr>
        <tr><td>Rol</td><td>Selector</td><td>Sí</td><td>Operario, Administrador o Superusuario.</td></tr>
        <tr><td>Estado</td><td>Selector</td><td>Sí</td><td>Activo (puede ingresar) o Inactivo (bloqueado inmediatamente).</td></tr>
        <tr><td>Departamento / Municipio</td><td>Cascada</td><td>Sí</td><td>Catálogo geográfico oficial de Guatemala.</td></tr>
      </tbody>
    </table>
    <p><strong>6. Resultado Esperado:</strong> Alta inmediata del colaborador en el sistema para que pueda comenzar a laborar.</p>
    <p><strong>7. Validaciones y Seguridad:</strong> No es posible eliminar o desactivar la propia cuenta con la que se está navegando (protección de auto-eliminación). La desactivación es instantánea en el servidor.</p>
    <p><strong>8. Recomendaciones de Uso:</strong> Al retirarse un empleado, cámbielo a estado "Inactivo" en vez de borrarlo para preservar el historial de movimientos firmados.</p>
    <div class="screenshot-box">
      <div class="screenshot-title">[Captura de Pantalla: Gestión de Usuarios y Modal de Creación]</div>
      <div class="screenshot-desc">Debe mostrar la tabla de usuarios con badges de rol y estado, y la ventana modal con los selectores de departamento y municipio en cascada.</div>
    </div>
  </div>

  <!-- 3.4 -->
  <div class="module-card">
    <div class="module-card-title">3.4. Catálogo de Artículos de Inventario</div>
    <p><strong>1. Descripción del Módulo:</strong> Registro maestro de todos los insumos, materias primas y suministros de empaque utilizados en la planta de AMATI HIELO.</p>
    <p><strong>2. Objetivo:</strong> Centralizar los insumos de bodega calculando automáticamente el costo unitario a partir de los fardos o paquetes de compra.</p>
    <p><strong>3. Acceso:</strong> Menú lateral -> <strong>Inventarios</strong> -> pestaña <strong>Catálogo de Artículos</strong>.</p>
    <p><strong>4. Procedimiento paso a paso (Nuevo Artículo):</strong>
      <ol>
        <li>Presione el botón celeste <strong>+ Nuevo Artículo</strong>.</li>
        <li>Seleccione la <strong>Categoría</strong> (<em>Materia Prima</em> o <em>Suministros</em>).</li>
        <li>Verifique el <strong>Código Asignado</strong> generado automáticamente por el sistema (ejemplo: MP-001 o SUM-003).</li>
        <li>Ingrese el <strong>Nombre del Producto</strong> (ejemplo: Bolsa Hielo Cubo 5lb).</li>
        <li>Defina el <strong>Stock Mínimo</strong> (nivel para encender alertas de compra).</li>
        <li>Ingrese la <strong>Cantidad por paquete</strong> (unidades por bulto) y el <strong>Precio por paquete (Q)</strong>.</li>
        <li>El sistema calculará automáticamente el <strong>Costo Unitario</strong> en Quetzales.</li>
        <li>Presione <strong>Crear Artículo</strong>. El producto se agregará a la lista con stock inicial en 0.</li>
      </ol>
    </p>
    <p><strong>5. Campos del Formulario de Artículo:</strong></p>
    <table>
      <thead><tr><th>Campo</th><th>Tipo</th><th>Obligatorio</th><th>Descripción</th></tr></thead>
      <tbody>
        <tr><td>Código</td><td>Texto</td><td>Automático</td><td>Correlativo único con prefijo de categoría (no editable).</td></tr>
        <tr><td>Categoría</td><td>Selector</td><td>Sí</td><td>Materia Prima o Suministros.</td></tr>
        <tr><td>Nombre</td><td>Texto</td><td>Sí</td><td>Nombre descriptivo del insumo o producto.</td></tr>
        <tr><td>Stock Mínimo</td><td>Numérico</td><td>No</td><td>Umbral para disparar la alerta preventiva de compras.</td></tr>
        <tr><td>Cantidad por Paquete</td><td>Numérico</td><td>No</td><td>Unidades contenidas en el fardo/bulto comercial.</td></tr>
        <tr><td>Precio por Paquete (Q)</td><td>Numérico</td><td>No</td><td>Precio pagado al distribuidor por el paquete completo.</td></tr>
        <tr><td>Costo Unitario</td><td>Calculado</td><td>Informativo</td><td>Precio de costo por unidad individual que se aplica a recetas.</td></tr>
      </tbody>
    </table>
    <p><strong>6. Resultado Esperado:</strong> Artículo habilitado para recibir compras de proveedores y vincularse a recetas de venta.</p>
    <p><strong>7. Validaciones:</strong> No permite guardar artículos sin nombre ni sin categoría. No se aceptan cantidades negativas.</p>
    <p><strong>8. Recomendaciones de Uso:</strong> Si el proveedor modifica el tamaño del bulto, actualice de inmediato la cantidad por paquete para mantener exactos los costos.</p>
    <div class="screenshot-box">
      <div class="screenshot-title">[Captura de Pantalla: Catálogo de Artículos y Cálculo de Costo]</div>
      <div class="screenshot-desc">Debe mostrar la tabla con códigos, nombres, categorías, stock y el formulario modal con el recuadro celeste de Costo Unitario Calculado.</div>
    </div>
  </div>

  <div class="page-break"></div>

  <!-- 3.5 -->
  <div class="module-card">
    <div class="module-card-title">3.5. Movimientos de Bodega: Registro de Entradas y Facturas</div>
    <p><strong>1. Descripción del Módulo:</strong> Gestiona la recepción de insumos físicos que ingresan a las bodegas y cámaras frías de la empresa.</p>
    <p><strong>2. Objetivo:</strong> Incrementar el inventario de manera transparente, asociando la factura fiscal del proveedor y su documento digital.</p>
    <p><strong>3. Acceso:</strong> Menú lateral -> <strong>Inventarios</strong> -> pestaña <strong>Movimientos de Bodega</strong> -> tarjeta verde <strong>Registro de Entrada</strong>.</p>
    <p><strong>4. Procedimiento paso a paso:</strong>
      <ol>
        <li>Presione la tarjeta verde superior <strong>Registro de Entrada</strong>.</li>
        <li>Seleccione el <strong>Proveedor</strong> en el menú desplegable.</li>
        <li>Escriba el <strong>Número de factura</strong> entregado por el transportista o proveedor.</li>
        <li>Confirme la <strong>Fecha</strong> de recepción física en planta.</li>
        <li>En la tabla de productos, elija el insumo recibido, escriba la cantidad y verifique el costo unitario. Si ingresaron varios productos, presione <em>+ Agregar producto</em>.</li>
        <li>En <strong>Documento adjunto</strong>, suba la fotografía o archivo PDF de la factura escaneada.</li>
        <li>Presione el botón celeste <strong>Confirmar entrada</strong>. El inventario se actualizará al instante.</li>
      </ol>
    </p>
    <p><strong>5. Campos del Formulario de Entrada:</strong></p>
    <table>
      <thead><tr><th>Campo</th><th>Tipo</th><th>Obligatorio</th><th>Descripción</th></tr></thead>
      <tbody>
        <tr><td>Proveedor</td><td>Selector</td><td>Sí</td><td>Empresa distribuidora registrada en el sistema.</td></tr>
        <tr><td>Número de Factura</td><td>Texto</td><td>Sí</td><td>Número de comprobante tributario o remisión de entrega.</td></tr>
        <tr><td>Fecha de Entrada</td><td>Fecha</td><td>Sí</td><td>Día en que la carga entra físicamente al almacén.</td></tr>
        <tr><td>Detalle de Productos</td><td>Tabla</td><td>Sí</td><td>Listado de artículos con cantidad y costo pactado.</td></tr>
        <tr><td>Observaciones</td><td>Texto</td><td>No</td><td>Notas sobre el estado del camión o precintos del lote.</td></tr>
        <tr><td>Documento Adjunto</td><td>Archivo</td><td>No</td><td>Comprobante digital escaneado (PDF, JPG, PNG).</td></tr>
      </tbody>
    </table>
    <p><strong>6. Resultado Esperado:</strong> Suma inmediata de las cantidades recibidas al stock disponible de bodega y registro histórico de la compra.</p>
    <p><strong>7. Validaciones:</strong> Exige obligatoriamente seleccionar un proveedor y escribir el número de factura para evitar ingresos anónimos.</p>
    <p><strong>8. Recomendaciones de Uso:</strong> Tome la fotografía de la factura con buena iluminación antes de archivar el papel físico.</p>
    <div class="screenshot-box">
      <div class="screenshot-title">[Captura de Pantalla: Modal de Registro de Entrada con Factura]</div>
      <div class="screenshot-desc">Debe mostrar el selector de proveedor, número de factura, tabla de productos con cálculo de total en Quetzales y selector de archivo adjunto.</div>
    </div>
  </div>

  <!-- 3.6 -->
  <div class="module-card">
    <div class="module-card-title">3.6. Gestión de Mermas y Pérdidas Económicas</div>
    <p><strong>1. Descripción del Módulo:</strong> Herramienta técnica para reportar descartes de producto terminado o insumos debido a incidentes de cadena de frío, rotura de empaques o contaminación.</p>
    <p><strong>2. Objetivo:</strong> Rebajar el stock deteriorado del inventario y calcular inmediatamente el impacto monetario de la pérdida.</p>
    <p><strong>3. Acceso:</strong> Menú lateral -> <strong>Inventarios</strong> -> pestaña <strong>Movimientos de Bodega</strong> -> tarjeta anaranjada <strong>Gestión de Mermas</strong>.</p>
    <p><strong>4. Procedimiento paso a paso:</strong>
      <ol>
        <li>Haga clic en la tarjeta anaranjada <strong>Gestión de Mermas</strong>.</li>
        <li>Seleccione el <strong>Motivo</strong> en el catálogo de causas (rotura, descongelamiento, etc.).</li>
        <li>Elija el <strong>Producto</strong> dañado y confirme la fecha del suceso.</li>
        <li>Escriba la <strong>Cantidad</strong> que resultó inutilizable.</li>
        <li>Observe el recuadro anaranjado que calcula automáticamente la <strong>Pérdida Económica (Q)</strong> multiplicando el costo unitario por las unidades perdidas.</li>
        <li>En <em>Motivo / Observaciones</em> explique lo ocurrido (ejemplo: falla en ventilador de cámara 1).</li>
        <li>Adjunte la fotografía de respaldo si se requiere y presione <strong>Registrar Movimiento</strong>.</li>
      </ol>
    </p>
    <p><strong>5. Campos del Formulario de Merma:</strong></p>
    <table>
      <thead><tr><th>Campo</th><th>Tipo</th><th>Obligatorio</th><th>Descripción</th></tr></thead>
      <tbody>
        <tr><td>Motivo de Merma</td><td>Selector</td><td>Sí</td><td>Causa formal del descarte aprobada por la empresa.</td></tr>
        <tr><td>Fecha de la Merma</td><td>Fecha</td><td>Sí</td><td>Día en que se detectó el incidente.</td></tr>
        <tr><td>Producto</td><td>Selector</td><td>Sí</td><td>Artículo de bodega que sufrió el daño.</td></tr>
        <tr><td>Cantidad</td><td>Numérico</td><td>Sí</td><td>Unidades a retirar (debe ser menor o igual al stock).</td></tr>
        <tr><td>Pérdida Económica</td><td>Calculado</td><td>Informativo</td><td>Costo real en Quetzales que la pérdida representa para la planta.</td></tr>
        <tr><td>Observaciones y Foto</td><td>Texto / Archivo</td><td>No</td><td>Descripción del evento y fotografía de respaldo.</td></tr>
      </tbody>
    </table>
    <p><strong>6. Resultado Esperado:</strong> Disminución inmediata del stock en bodega sin generar cobro comercial, quedando constancia para auditoría.</p>
    <p><strong>7. Validaciones:</strong> Si la cantidad supera las existencias en bodega, el sistema bloquea con: <em>"Stock insuficiente. Disponible: [N]"</em>.</p>
    <p><strong>8. Recomendaciones de Uso:</strong> Reporte la merma de inmediato para evitar que producto no apto sea despachado accidentalmente.</p>
    <div class="screenshot-box">
      <div class="screenshot-title">[Captura de Pantalla: Modal de Gestión de Mermas y Pérdida Económica]</div>
      <div class="screenshot-desc">Debe mostrar el selector de causa de merma, campo de producto, recuadro de Pérdida Económica en Quetzales y campo de evidencia adjunta.</div>
    </div>
  </div>

  <div class="page-break"></div>

  <!-- 3.7 -->
  <div class="module-card">
    <div class="module-card-title">3.7. Gestión de Proveedores de Inventario</div>
    <p><strong>1. Descripción del Módulo:</strong> Directorio de empresas y distribuidores comerciales autorizados para surtir insumos a la planta.</p>
    <p><strong>2. Objetivo:</strong> Mantener al día la información tributaria y de contacto de los proveedores para vincularlos en cada entrada de mercadería.</p>
    <p><strong>3. Acceso:</strong> Menú lateral -> <strong>Inventarios</strong> -> pestaña <strong>Proveedores</strong>.</p>
    <p><strong>4. Procedimiento paso a paso:</strong>
      <ol>
        <li>Presione el botón celeste <strong>+ Nuevo Proveedor</strong>.</li>
        <li>Complete el <strong>Nombre o razón social</strong> (obligatorio).</li>
        <li>Ingrese el <strong>NIT</strong> (máximo 13 caracteres, solo números y letras, sin guiones ni caracteres extraños).</li>
        <li>Ingrese el <strong>Teléfono</strong> de contacto (máximo 8 dígitos estrictamente numéricos).</li>
        <li>Ingrese el <strong>Correo electrónico</strong> para solicitudes de pedidos.</li>
        <li>Presione <strong>Guardar Proveedor</strong>. El nuevo proveedor aparecerá disponible de inmediato en el formulario de entradas.</li>
      </ol>
    </p>
    <p><strong>5. Validaciones:</strong> Si el NIT supera 13 caracteres o tiene signos: <em>"El NIT debe contener únicamente letras y números, con un máximo de 13 caracteres."</em>. Si el teléfono tiene más de 8 números: <em>"El teléfono debe contener únicamente números, con un máximo de 8 dígitos."</em>.</p>
    <div class="screenshot-box">
      <div class="screenshot-title">[Captura de Pantalla: Directorio de Proveedores AMATI HIELO]</div>
      <div class="screenshot-desc">Debe mostrar la tabla de proveedores registrados con NIT, teléfono y el modal de creación de proveedor.</div>
    </div>
  </div>

  <!-- 3.8 -->
  <div class="module-card">
    <div class="module-card-title">3.8. Alertas de Reabastecimiento y Stock Mínimo</div>
    <p><strong>1. Descripción del Módulo:</strong> Sistema preventivo de supervisión que detecta insumos que están por agotarse en bodega.</p>
    <p><strong>2. Objetivo:</strong> Evitar paros operativos en el envasado de hielo o desabastecimiento de materias primas críticas.</p>
    <p><strong>3. Acceso:</strong> Menú lateral -> <strong>Inventarios</strong> -> pestaña <strong>Alertas de Reabastecimiento</strong> (muestra un contador rojo).</p>
    <p><strong>4. Interpretación de Estados Visuales:</strong>
      <ul>
        <li><span class="badge badge-green">Normal (Verde)</span>: El stock actual es mayor o igual al mínimo requerido. Todo en orden.</li>
        <li><span class="badge badge-yellow">Bajo (Amarillo)</span>: El stock se encuentra entre el 50% y el 99% del mínimo. Requiere programar pedido.</li>
        <li><span class="badge badge-red">Crítico (Rojo)</span>: El stock cayó por debajo del 50% del mínimo. Requiere compra urgente.</li>
      </ul>
    </p>
    <p><strong>5. Acción Rápida:</strong> Cada tarjeta de alerta contiene un botón directo <strong>Registrar Entrada</strong> que abre el formulario de compra con el producto ya cargado para agilizar la reposición.</p>
    <div class="screenshot-box">
      <div class="screenshot-title">[Captura de Pantalla: Alertas de Reabastecimiento y Stock Crítico]</div>
      <div class="screenshot-desc">Debe mostrar las tarjetas de productos con stock en amarillo y rojo, barra de progreso y botón directo Registrar Entrada.</div>
    </div>
  </div>

  <!-- 3.9 -->
  <div class="module-card">
    <div class="module-card-title">3.9. Auditoría de Inventario y Conteos Físicos</div>
    <p><strong>1. Descripción del Módulo:</strong> Instrumento de control interno para comparar el stock teórico del sistema con el conteo físico en cámaras frías.</p>
    <p><strong>2. Objetivo:</strong> Identificar mermas no reportadas, sobrantes o errores de conteo, ajustando las existencias de forma autorizada.</p>
    <p><strong>3. Acceso:</strong> Menú lateral -> <strong>Inventarios</strong> -> pestaña <strong>Movimientos de Bodega</strong> -> botón <strong>Auditoría de Inventario</strong>.</p>
    <p><strong>4. Procedimiento paso a paso:</strong>
      <ol>
        <li>Presione el botón <strong>Auditoría de Inventario</strong>.</li>
        <li>Recorra las bodegas e ingrese en la columna <strong>Conteo Físico</strong> la cantidad real contada de cada producto.</li>
        <li>Observe la columna <strong>Diferencia</strong> calculada automáticamente (rojo si falta, azul si sobra, neutro si coincide).</li>
        <li>Ingrese la <strong>Justificación del Ajuste</strong> y presione <strong>Aplicar Ajuste de Auditoría</strong> previa confirmación.</li>
      </ol>
    </p>
    <div class="screenshot-box">
      <div class="screenshot-title">[Captura de Pantalla: Modal de Auditoría de Inventario]</div>
      <div class="screenshot-desc">Debe mostrar la tabla comparativa de stock en sistema vs. conteo físico con cálculo automático de diferencias.</div>
    </div>
  </div>

  <div class="page-break"></div>

  <!-- 3.10 -->
  <div class="module-card">
    <div class="module-card-title">3.10. Recetas de Venta y Fichas Técnicas (BOM)</div>
    <p><strong>1. Descripción del Módulo:</strong> Define la composición técnica de cada producto que se vende en mostrador (ejemplo: Bolsa Hielo 5lb) vinculándolo con sus insumos de bodega.</p>
    <p><strong>2. Objetivo:</strong> Establecer los componentes de cada producto terminado y calcular el costo unitario de producción (materia prima + electricidad + agua + mano de obra).</p>
    <p><strong>3. Acceso:</strong> Menú lateral -> opción <strong>Recetas de Venta</strong> (icono de fábrica).</p>
    <p><strong>4. Procedimiento paso a paso:</strong>
      <ol>
        <li>Presione <strong>+ Nueva Receta</strong>, asigne el nombre del producto, la categoría y suba la foto para el punto de venta.</li>
        <li>Presione <strong>Ver BOM / Ingredientes</strong> en la receta creada y presione <em>+ Agregar Ingrediente</em>.</li>
        <li>En <em>Vincular con inventario</em> elija el insumo real de bodega (ejemplo: Bolsa Hielo 5lb), la cantidad consumida por unidad (ej: 1) y guarde.</li>
        <li>En la pestaña <em>Costeo y Precios</em> ingrese los costos indirectos (electricidad de congelación, agua, mano de obra) y el <strong>Precio de Venta al público (Q)</strong>.</li>
        <li>Presione <strong>Guardar Costos</strong>. La receta quedará lista para comercializarse en mostrador.</li>
      </ol>
    </p>
    <p><strong>5. Campos Principales de la Ficha Técnica:</strong></p>
    <table>
      <thead><tr><th>Campo</th><th>Tipo</th><th>Descripción</th></tr></thead>
      <tbody>
        <tr><td>Nombre y Presentación</td><td>Texto / Selector</td><td>Nombre comercial del producto y tamaño (ej: Pequeño, Mediano).</td></tr>
        <tr><td>Foto del Producto</td><td>Imagen</td><td>Fotografía para la pantalla táctil de ventas (máximo 3 MB).</td></tr>
        <tr><td>Vínculo con Inventario</td><td>Selector</td><td>Insumo de bodega que se rebajará automáticamente en cada venta.</td></tr>
        <tr><td>Cantidad de Insumo</td><td>Numérico</td><td>Proporción exacta que se consume por unidad vendida.</td></tr>
        <tr><td>Costos Indirectos</td><td>Numérico</td><td>Costo atribuido de electricidad, agua, mano de obra y local en Quetzales.</td></tr>
        <tr><td>Precio de Venta (Q)</td><td>Numérico</td><td>Precio final cobrado al cliente en el mostrador.</td></tr>
      </tbody>
    </table>
    <div class="screenshot-box">
      <div class="screenshot-title">[Captura de Pantalla: Ficha Técnica BOM de Recetas de Venta]</div>
      <div class="screenshot-desc">Debe mostrar el catálogo de recetas con fotos, panel de desglose BOM de materias primas y cálculo de costos de producción.</div>
    </div>
  </div>

  <!-- 3.11 -->
  <div class="module-card">
    <div class="module-card-title">3.11. Punto de Venta (POS) y Descuento Automático de Insumos</div>
    <p><strong>1. Descripción del Módulo:</strong> Terminal de ventas rápida para mostrador con botones gráficos y emisión inmediata de tickets.</p>
    <p><strong>2. Objetivo:</strong> Atender a los clientes con rapidez, cobrar en efectivo o transferencia y descontar en el mismo segundo los insumos de bodega.</p>
    <p><strong>3. Acceso:</strong> Menú lateral -> <strong>Punto de Venta</strong> -> pestaña <strong>Realizar Venta</strong>.</p>
    <p><strong>4. Procedimiento paso a paso:</strong>
      <ol>
        <li>Haga clic sobre las tarjetas de los productos solicitados por el cliente para agregarlos al carrito derecho.</li>
        <li>Ajuste las cantidades usando los botones '+' o '-' del carrito.</li>
        <li>Seleccione el <strong>Método de Pago</strong> (Efectivo, Transferencia o Tarjeta).</li>
        <li>Si el cliente solicita factura contable, marque <em>¿Requiere Factura?</em> e ingrese su NIT, Nombre y Teléfono.</li>
        <li>Presione el botón verde grande <strong>Confirmar Venta (Q [Total])</strong>.</li>
        <li>El sistema emitirá el ticket numerado (ej: TKT-20261018...) y <strong>descontará automáticamente de bodega</strong> las bolsas y materias primas vinculadas a la receta vendida.</li>
      </ol>
    </p>
    <p><strong>5. Validación Crítica:</strong> Si no hay existencia suficiente de alguno de los insumos en bodega, el sistema bloquea la venta alertando qué insumo está agotado, impidiendo vender producto que no se puede entregar.</p>
    <div class="screenshot-box">
      <div class="screenshot-title">[Captura de Pantalla: Punto de Venta (POS) con Carrito y Facturación]</div>
      <div class="screenshot-desc">Debe mostrar el catálogo visual de productos a la izquierda, el carrito de compras a la derecha y el botón Confirmar Venta.</div>
    </div>
  </div>

  <div class="page-break"></div>

  <!-- 3.12 -->
  <div class="module-card">
    <div class="module-card-title">3.12. Arqueo y Control Semanal de Caja</div>
    <p><strong>1. Descripción del Módulo:</strong> Control financiero del dinero recaudado en mostrador por turnos y semanas operativas.</p>
    <p><strong>2. Objetivo:</strong> Comprobar que el dinero en efectivo de la gaveta coincida exactamente con lo vendido según el sistema.</p>
    <p><strong>3. Acceso:</strong> Menú lateral -> <strong>Punto de Venta</strong> -> pestaña <strong>Arqueo de Caja</strong>.</p>
    <p><strong>4. Procedimiento paso a paso:</strong>
      <ol>
        <li>Ingrese a la pestaña Arqueo de Caja y revise el desglose: Total Ventas, Total Efectivo, Total Transferencias y Transacciones.</li>
        <li>Cuente físicamente los billetes y monedas de la gaveta y verifique que coincidan con el valor de Efectivo Esperado.</li>
        <li>Al finalizar el turno dominical (18:00 horas), presione <strong>Confirmar Arqueo Semanal</strong> para cerrar el ciclo de caja.</li>
      </ol>
    </p>
    <div class="screenshot-box">
      <div class="screenshot-title">[Captura de Pantalla: Pestaña de Arqueo y Cierre de Caja]</div>
      <div class="screenshot-desc">Debe mostrar el resumen de ventas en efectivo vs. transferencias y el botón de confirmación de arqueo semanal.</div>
    </div>
  </div>

  <!-- 3.13 -->
  <div class="module-card">
    <div class="module-card-title">3.13. Módulo de Reportes y Exportación (PDF y Excel)</div>
    <p><strong>1. Descripción del Módulo:</strong> Centro de generación de informes oficiales y consolidados ejecutivos para gerencia.</p>
    <p><strong>2. Objetivo:</strong> Proveer información estructurada y lista para imprimir o analizar en hojas de cálculo.</p>
    <p><strong>3. Acceso:</strong> Menú lateral -> opción <strong>Reportes</strong> (icono de gráfica de barras).</p>
    <p><strong>4. Procedimiento paso a paso:</strong>
      <ol>
        <li>Defina el rango de fechas en las casillas <em>Fecha Desde</em> y <em>Fecha Hasta</em>.</li>
        <li>Localice el reporte deseado (Ventas Diario, Inventario Actual, Producción, Cierre de Caja o Mermas).</li>
        <li>Haga clic en el botón <strong>PDF</strong> para generar un documento listo para imprimir con el logotipo de AMATI HIELO.</li>
        <li>Haga clic en el botón <strong>Excel</strong> si necesita procesar los datos en una hoja de cálculo (.xlsx).</li>
      </ol>
    </p>
    <div class="screenshot-box">
      <div class="screenshot-title">[Captura de Pantalla: Módulo de Reportes con Opciones PDF y Excel]</div>
      <div class="screenshot-desc">Debe mostrar el catálogo de reportes ejecutivos con sus botones de exportación a PDF y Excel.</div>
    </div>
  </div>

  <!-- 3.14 -->
  <div class="module-card">
    <div class="module-card-title">3.14. Módulos de Administración Avanzada (Configuración, Datos e IA)</div>
    <p><strong>1. Configuración del Sistema:</strong> Administra los datos fiscales de AMATI HIELO (nombre comercial, NIT), sucursales de distribución, el porcentaje de IVA (12% vigente en Guatemala) y los umbrales de alerta de stock.</p>
    <p><strong>2. Mantenimiento de Estructura de Datos:</strong> Diccionario de datos para analistas de sistemas que permite inspeccionar y crear tablas dinámicas protegiendo las estructuras esenciales de la empresa.</p>
    <p><strong>3. IA Predictiva de Demanda:</strong> Cruza datos meteorológicos de la planta en Guatemala con el historial de ventas para anticipar olas de calor y proyectar compras oportunas de bolsas e insumos.</p>
  </div>

  <div class="page-break"></div>

  <!-- ================= CAPÍTULO 4 ================= -->
  <div class="header-rule">
    <span>AMATI HIELO · Sistema de Gestión ERP</span>
    <span>4. Cómo Ingresar en Modo Usuario (Operativo)</span>
  </div>

  <h1>4. Cómo Ingresar al Sistema en Modo Usuario (Operativo)</h1>
  <p>Esta sección está dirigida a todo el personal de planta, bodegueros, encargados de empaque y cajeros de mostrador.</p>

  <h2>4.1. Requisitos Técnicos y URL de Acceso</h2>
  <ul>
    <li>Cualquier computadora, laptop o tableta conectada a la red de la planta.</li>
    <li>Navegador web moderno: Google Chrome, Microsoft Edge o Mozilla Firefox.</li>
    <li>Dirección URL de acceso: <code>[PENDIENTE DE VERIFICACIÓN: URL DE PRODUCCIÓN]</code>.</li>
  </ul>

  <h2>4.2. Flujo de Acceso para Operarios y Cajeros</h2>
  <ol>
    <li>Abra su navegador de internet e ingrese la dirección del sistema.</li>
    <li>En la casilla de usuario, escriba su identificador asignado (ejemplo: <code>operario1</code>).</li>
    <li>Escriba su contraseña secreta personal.</li>
    <li>Presione el botón celeste <strong>Iniciar sesión</strong>.</li>
  </ol>

  <h2>4.3. Opciones Habilitadas y Buenas Prácticas</h2>
  <p>Al iniciar sesión con el rol de <strong>Operario</strong>, el sistema simplifica automáticamente el menú para mostrar únicamente sus herramientas de trabajo:</p>
  <ul>
    <li><strong>Inicio (Dashboard):</strong> Visualización general del estado de la jornada.</li>
    <li><strong>Inventarios:</strong> Consulta de existencias, registro de entradas de camiones de proveedores, reporte justificado de mermas y participación en conteos de auditoría.</li>
    <li><strong>Recetas de Venta:</strong> Consulta de ingredientes y fórmulas de empaque.</li>
    <li><strong>Punto de Venta (POS):</strong> Cobro a clientes en mostrador, emisión de tickets y control de su propio turno de caja.</li>
  </ul>

  <div class="alert alert-warning">
    <strong>Buenas Prácticas de Turno:</strong> Al finalizar su jornada, diríjase a la parte inferior del menú lateral y presione el botón rojo <strong>Cerrar Sesión</strong>. Esto previene que el siguiente turno registre ventas o movimientos bajo su nombre.
  </div>

  <h2>4.4. Solución a Preguntas y Problemas Frecuentes</h2>
  <table>
    <thead><tr><th>Situación o Mensaje</th><th>Causa Probable</th><th>Solución Recomendada</th></tr></thead>
    <tbody>
      <tr><td>"El usuario se encuentra inactivo"</td><td>Su cuenta fue desactivada por la administración.</td><td>Solicite a su supervisor que reactive su perfil en el módulo de Seguridad.</td></tr>
      <tr><td>"Stock insuficiente al intentar vender"</td><td>Uno de los insumos de la receta se agotó en bodega.</td><td>Solicite al bodeguero que registre la entrada de las bolsas o insumos faltantes.</td></tr>
      <tr><td>"Olvidé mi clave de acceso"</td><td>Extravío de contraseña.</td><td>Presione "¿Olvidaste tu contraseña?" o solicite al Administrador una clave provisional.</td></tr>
      <tr><td>"No veo el módulo de Seguridad"</td><td>Restricción por rol de Operario.</td><td>Es el comportamiento normal del sistema; ese módulo solo es visible para Administradores.</td></tr>
    </tbody>
  </table>

  <div class="page-break"></div>

  <!-- ================= CAPÍTULO 5 ================= -->
  <div class="header-rule">
    <span>AMATI HIELO · Sistema de Gestión ERP</span>
    <span>5. Cómo Ingresar en Modo Administrador</span>
  </div>

  <h1>5. Cómo Ingresar al Sistema en Modo Administrador</h1>
  <p>Esta sección está reservada para el personal directivo, gerentes de planta y administradores del sistema.</p>

  <h2>5.1. Requisitos y Opciones Administrativas</h2>
  <p>El Administrador accede con una cuenta con rol de <code>Administrador</code> o <code>Superusuario</code>. Al ingresar, el menú lateral izquierdo se despliega en su totalidad, habilitando la supervisión global de usuarios, configuraciones impositivas y reportes.</p>

  <h2>5.2. Tabla Comparativa de Permisos: Modo Usuario vs. Modo Administrador</h2>
  <table>
    <thead><tr><th>Funcionalidad / Módulo</th><th style="text-align: center;">Modo Operario</th><th style="text-align: center;">Modo Administrador</th><th>Regla de Seguridad</th></tr></thead>
    <tbody>
      <tr><td>Dashboard y Métricas en Vivo</td><td style="text-align: center;"><span class="badge badge-green">Sí</span></td><td style="text-align: center;"><span class="badge badge-green">Sí</span></td><td>Ambos consultan el estado general de la planta.</td></tr>
      <tr><td>Consulta de Catálogo de Artículos</td><td style="text-align: center;"><span class="badge badge-green">Sí</span></td><td style="text-align: center;"><span class="badge badge-green">Sí</span></td><td>Todos deben conocer el stock disponible.</td></tr>
      <tr><td>Crear / Editar / Eliminar Artículos</td><td style="text-align: center;"><span class="badge badge-red">No</span></td><td style="text-align: center;"><span class="badge badge-green">Sí</span></td><td>Solo la administración autoriza nuevos ítems o precios.</td></tr>
      <tr><td>Registrar Entradas de Mercadería</td><td style="text-align: center;"><span class="badge badge-green">Sí</span></td><td style="text-align: center;"><span class="badge badge-green">Sí</span></td><td>El bodeguero recibe la carga física del camión.</td></tr>
      <tr><td>Registrar Mermas con Pérdida Económica</td><td style="text-align: center;"><span class="badge badge-green">Sí</span></td><td style="text-align: center;"><span class="badge badge-green">Sí</span></td><td>El operario debe reportar el producto roto al instante.</td></tr>
      <tr><td>Auditoría y Ajustes de Inventario</td><td style="text-align: center;">Conteo</td><td style="text-align: center;">Aprobación</td><td>El operario cuenta; el administrador autoriza el ajuste.</td></tr>
      <tr><td>Gestión de Proveedores de Insumos</td><td style="text-align: center;">Consulta</td><td style="text-align: center;">Edición / Alta</td><td>Control formal de los proveedores de la empresa.</td></tr>
      <tr><td>Creación y Costeo de Recetas (BOM)</td><td style="text-align: center;">Consulta</td><td style="text-align: center;">Total</td><td>La fórmula y costeo es potestad administrativa.</td></tr>
      <tr><td>Punto de Venta (POS de Mostrador)</td><td style="text-align: center;"><span class="badge badge-green">Sí</span></td><td style="text-align: center;"><span class="badge badge-green">Sí</span></td><td>Operación de cobro diaria.</td></tr>
      <tr><td>Confirmar Arqueo Semanal de Caja</td><td style="text-align: center;">Turno</td><td style="text-align: center;">Cierre Oficial</td><td>Supervisión de balances de efectivo y transferencias.</td></tr>
      <tr><td>Módulo Seguridad y Gestión de Usuarios</td><td style="text-align: center;"><span class="badge badge-red">Bloqueado</span></td><td style="text-align: center;"><span class="badge badge-green">Acceso Total</span></td><td>Protección de accesos, roles y contraseñas.</td></tr>
      <tr><td>Configuración del Sistema y Datos Fiscales</td><td style="text-align: center;"><span class="badge badge-red">Bloqueado</span></td><td style="text-align: center;"><span class="badge badge-green">Acceso Total</span></td><td>Razón social, NIT, sucursales y porcentaje de IVA.</td></tr>
      <tr><td>Mantenimiento de Estructura de Datos</td><td style="text-align: center;"><span class="badge badge-red">Bloqueado</span></td><td style="text-align: center;"><span class="badge badge-green">Acceso Total</span></td><td>Diccionario técnico de tablas del sistema.</td></tr>
      <tr><td>IA Predictiva y Reportes en PDF/Excel</td><td style="text-align: center;"><span class="badge badge-red">Bloqueado</span></td><td style="text-align: center;"><span class="badge badge-green">Acceso Total</span></td><td>Información estratégica y fiscal reservada para gerencia.</td></tr>
    </tbody>
  </table>

  <h2>5.3. Políticas de Protección de Cuentas y Soporte</h2>
  <ul>
    <li><strong>Regla de Auto-Protección:</strong> El software deshabilita la opción de eliminar o desactivar la cuenta propia del administrador en sesión. Para delegar el puesto, cree primero al nuevo administrador e ingrese con esa cuenta para aplicar los cambios.</li>
    <li><strong>Integridad Referencial:</strong> La base de datos protege los registros históricos; ningún artículo o usuario que posea ventas o movimientos pasados puede ser eliminado físicamente, garantizando la inalterabilidad de los reportes contables.</li>
  </ul>

  <div class="page-break"></div>

  <!-- ================= CAPÍTULO 6 ================= -->
  <div class="header-rule">
    <span>AMATI HIELO · Sistema de Gestión ERP</span>
    <span>6. Anexo de Elementos Pendientes de Verificación</span>
  </div>

  <h1>6. Anexo: Elementos y Datos Pendientes de Verificación en Planta</h1>
  <p>A fin de consolidar la versión final del manual para la defensa universitaria de graduación y entrega a la junta directiva de AMATI HIELO, se presenta la siguiente lista de verificación:</p>

  <div class="caratula-box" style="background: #ffffff;">
    <div style="font-weight: 700; color: #0f172a; font-size: 10pt; margin-bottom: 12px; border-bottom: 2px solid #0284c7; padding-bottom: 4px;">
      LISTA DE CONTROL PARA VALIDACIÓN EN PLANTA
    </div>

    <div style="margin-bottom: 14px;">
      <strong>1. Datos Institucionales y Universitarios:</strong>
      <ul>
        <li>[ ] Nombre oficial completo de la Universidad y Facultad.</li>
        <li>[ ] Título exacto de la Carrera Profesional.</li>
        <li>[ ] Nombres completos y números de carné de los integrantes del equipo.</li>
        <li>[ ] Nombre del Asesor o Docente Guía asignado.</li>
        <li>[ ] Fecha formal programada para la evaluación de graduación.</li>
      </ul>
    </div>

    <div style="margin-bottom: 14px;">
      <strong>2. Parámetros Técnicos y de Conectividad:</strong>
      <ul>
        <li>[ ] Dirección web oficial o IP definitiva del servidor en la planta de AMATI HIELO.</li>
        <li>[ ] Tipo de terminales físicas utilizadas en mostrador (pantallas táctiles POS, teclados industriales o tabletas).</li>
      </ul>
    </div>

    <div style="margin-bottom: 14px;">
      <strong>3. Reemplazo de Marcadores por Capturas de Pantalla Reales:</strong>
      <ul>
        <li>[ ] Pantalla de Login con logotipo oficial.</li>
        <li>[ ] Dashboard con las 4 tarjetas de KPIs operativas.</li>
        <li>[ ] Formulario modal de creación de usuario en cascada (Departamento y Municipio).</li>
        <li>[ ] Catálogo de Artículos mostrando alertas en color verde, amarillo y rojo.</li>
        <li>[ ] Registro de Entrada de mercadería con factura y archivo adjunto.</li>
        <li>[ ] Formulario de Merma con el recuadro de Pérdida Económica calculada.</li>
        <li>[ ] Modal de Auditoría de Inventario con diferencias de conteo físico.</li>
        <li>[ ] Ficha técnica BOM de Recetas de Venta y desglose de costos.</li>
        <li>[ ] Pantalla del Punto de Venta (POS) en plena operación de venta.</li>
        <li>[ ] Pestaña de Arqueo de Caja y comprobante impreso de ticket de venta.</li>
        <li>[ ] Módulo de Reportes con opciones de exportación a PDF y Excel.</li>
      </ul>
    </div>

    <div>
      <strong>4. Parámetros Comerciales de AMATI HIELO:</strong>
      <ul>
        <li>[ ] NIT oficial de la empresa para el encabezado de los reportes.</li>
        <li>[ ] Rango operativo de temperatura configurado en las cámaras frías (-18°C a -22°C o según estándar de planta).</li>
        <li>[ ] Catálogo oficial de motivos de merma aprobados por la gerencia de planta.</li>
      </ul>
    </div>
  </div>

  <div style="text-align: center; margin-top: 30px; font-size: 8.5pt; color: #64748b; font-style: italic;">
    Manual de Usuario emitido para el Sistema Web de Trazabilidad y Control de Inventarios · AMATI HIELO · Octubre 2026
  </div>

</body>
</html>`;

  const outputPathHtml = path.join(__dirname, '..', 'manual_usuario.html');
  fs.writeFileSync(outputPathHtml, htmlContent, 'utf-8');
  console.log('HTML generado con éxito en:', outputPathHtml);

  // Compilar con Playwright usando el navegador Edge de Windows
  const outputPathPdf = path.join(__dirname, '..', 'Manual_de_Usuario_AMATI_HIELO.pdf');
  const browser = await chromium.launch({ channel: 'msedge' });
  const page = await browser.newPage();
  
  await page.setContent(htmlContent, { waitUntil: 'networkidle' });
  
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
  console.log('¡PDF generado exitosamente!');
  console.log('Ruta del PDF:', outputPathPdf);

  const stats = fs.statSync(outputPathPdf);
  console.log(`Tamaño del PDF: ${(stats.size / 1024).toFixed(2)} KB`);
}

generatePdf().catch(err => {
  console.error('Error generando PDF:', err);
  process.exit(1);
});
