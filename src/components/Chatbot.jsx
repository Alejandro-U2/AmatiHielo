import { createContext, createElement, useContext, useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, ArrowUp, BarChart3, CloudSun, FileText, PackageCheck, Trash2, TrendingUp, X } from 'lucide-react'
import IceCubeAssistant from './IceCube'
import logoAmati from '../assets/logo-amati.jpg'
import { generateGenericReportPdf } from '../utils/reportesExport'
import { generateSalesReportPdf } from '../utils/reportesExport'
import { buildReportData } from '../utils/reportesUtils'
import { listVentasPos, listClientesPos } from '../services/posService'
import { listProductosInventario, listMovimientosInventario, listProveedoresInventario } from '../services/inventarioService'
import { getRecetas } from '../services/recetasService'
import { listUsers } from '../services/usersService'
import { getHistoricalSales } from '../services/salesService'
import { getPredictionProducts, generateDemandPredictions } from '../services/predictionService'
import { getCurrentUser } from '../services/authService'
import { sendChatbotMessage } from '../services/chatbotService'

const ChatContext = createContext(null)

const quickActions = [
  { title: 'Consultar clima', description: 'Pronóstico próximos 7 días', prompt: '¿Cómo estará el clima esta semana?', icon: CloudSun },
  { title: 'Predecir ventas', description: 'Estimación por producto', prompt: '¿Cuánto venderemos el viernes?', icon: TrendingUp },
  { title: 'Consultar inventario', description: 'Stock y alertas', prompt: '¿Qué productos están bajo mínimo?', icon: PackageCheck },
  { title: 'Generar reporte', description: 'Resumen de inventario', prompt: 'Generar reporte de inventario', icon: FileText },
]

const quickQuestions = [
  '¿Cómo estará el clima esta semana?',
  '¿Cuánto venderemos el viernes?',
  '¿Qué productos están bajo mínimo?',
  'Generar reporte de inventario',
]

function getReportDateRange(reportKey, message = '') {
  const normalized = String(message).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  const now = new Date()
  const formatDate = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  const rangeForMonth = (year, monthIndex) => ({
    desde: formatDate(new Date(year, monthIndex, 1)),
    hasta: formatDate(new Date(year, monthIndex + 1, 0)),
  })
  const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
  const isoDate = normalized.match(/\b(20\d{2})-(\d{2})-(\d{2})\b/)
  const numericDate = normalized.match(/\b(\d{1,2})[/-](\d{1,2})(?:[/-](20\d{2}))?\b/)
  const namedDay = normalized.match(new RegExp(`\\b(\\d{1,2})\\s+de\\s+(${months.join('|')})(?:\\s+(20\\d{2}))?\\b`))
  let selectedDate = null

  if (isoDate) selectedDate = new Date(Number(isoDate[1]), Number(isoDate[2]) - 1, Number(isoDate[3]))
  else if (numericDate) selectedDate = new Date(Number(numericDate[3] || now.getFullYear()), Number(numericDate[2]) - 1, Number(numericDate[1]))
  else if (namedDay) selectedDate = new Date(Number(namedDay[3] || now.getFullYear()), months.indexOf(namedDay[2]), Number(namedDay[1]))

  const expectedDay = isoDate ? Number(isoDate[3]) : numericDate ? Number(numericDate[1]) : Number(namedDay?.[1])
  const expectedMonth = isoDate ? Number(isoDate[2]) - 1 : numericDate ? Number(numericDate[2]) - 1 : months.indexOf(namedDay?.[2])
  if (selectedDate && !Number.isNaN(selectedDate.getTime()) && selectedDate.getDate() === expectedDay && selectedDate.getMonth() === expectedMonth) {
    const day = formatDate(selectedDate)
    return { desde: day, hasta: day }
  }

  const monthMatch = normalized.match(new RegExp(`\\b(${months.join('|')})\\b`))
  if (monthMatch) {
    const yearMatch = normalized.match(/\b20\d{2}\b/)
    return rangeForMonth(Number(yearMatch?.[0] || now.getFullYear()), months.indexOf(monthMatch[1]))
  }

  const dayMatch = normalized.match(/\b(?:dia|del dia)\s+(\d{1,2})\b/)
  if (dayMatch) {
    const selected = new Date(now.getFullYear(), now.getMonth(), Number(dayMatch[1]))
    if (selected.getDate() === Number(dayMatch[1])) {
      const day = formatDate(selected)
      return { desde: day, hasta: day }
    }
  }

  if (reportKey === 'sales_daily' || (reportKey === 'sales_history' && /\b(dia|diario|hoy)\b/.test(normalized))) {
    const targetDay = /\bayer\b/.test(normalized) ? new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1) : now
    const day = formatDate(targetDay)
    return { desde: day, hasta: day }
  }
  if (reportKey === 'sales_monthly' || reportKey === 'sales_history') return rangeForMonth(now.getFullYear(), now.getMonth())
  return { desde: '', hasta: '' }
}

async function generateChatbotTableReport({ key, message, userName }) {
  const period = getReportDateRange(key, message)
  const normalized = String(message).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  const asksActive = /\bactiv[oa]s?\b/.test(normalized)
  const asksInactive = /\binactiv[oa]s?\b/.test(normalized)
  const statusFilter = asksActive && asksInactive ? '' : asksInactive ? 'inactivo' : asksActive ? 'activo' : ''
  const movementType = /\bmermas?\b/.test(normalized) ? 'Merma' : /\bsalidas?\b/.test(normalized) ? 'Salida' : /\bentradas?\b/.test(normalized) ? 'Entrada' : ''
  const metadata = {
    logoUrl: logoAmati,
    userName,
    periodLabel: period.desde && period.hasta ? `${period.desde} - ${period.hasta}` : 'Todos los registros disponibles',
  }
  const downloadTable = (fileName, title, subtitle, columns, rows, totalLabel, note) => generateGenericReportPdf({
    ...metadata,
    fileName,
    title,
    subtitle,
    columns,
    rows,
    totalLabel,
    totalValue: rows.length,
    note,
  })

  if (key === 'users') {
    const users = await listUsers()
    const filtered = statusFilter ? users.filter((user) => String(user.estado || '').toLowerCase() === statusFilter) : users
    return downloadTable('reporte_de_usuarios.pdf', 'Reporte de Usuarios', statusFilter ? `Estado: ${statusFilter}` : 'Usuarios registrados', [
      { key: 'nombre', label: 'NOMBRE', width: 46 }, { key: 'usuario', label: 'USUARIO', width: 32 },
      { key: 'email', label: 'CORREO', width: 48 }, { key: 'rol', label: 'ROL', width: 28 }, { key: 'estado', label: 'ESTADO', width: 24 },
    ], filtered.map((user) => ({ nombre: user.nombre, usuario: user.usuario, email: user.email, rol: user.rol, estado: user.estado })), 'USUARIOS', 'Incluye únicamente los usuarios que coinciden con el filtro solicitado.')
  }

  if (key === 'item_catalog' || key === 'inventory') {
    const products = await listProductosInventario()
    const columns = key === 'inventory' ? [
      { key: 'codigo', label: 'CÓDIGO', width: 28 }, { key: 'nombre', label: 'ARTÍCULO', width: 58 },
      { key: 'categoria', label: 'CATEGORÍA', width: 34 }, { key: 'stock', label: 'STOCK', width: 26 },
      { key: 'minimo', label: 'MÍNIMO', width: 26 },
    ] : [
      { key: 'codigo', label: 'CÓDIGO', width: 30 }, { key: 'nombre', label: 'ARTÍCULO', width: 58 },
      { key: 'categoria', label: 'CATEGORÍA', width: 34 }, { key: 'precioCompra', label: 'COSTO UNITARIO', width: 28 },
      { key: 'precioVenta', label: 'PRECIO VENTA', width: 28 },
    ]
    return downloadTable(key === 'inventory' ? 'reporte_de_inventario.pdf' : 'catalogo_de_articulos.pdf', key === 'inventory' ? 'Reporte de Inventario' : 'Catálogo de Artículos', 'Artículos registrados en bodega', columns, products.map((product) => ({
      codigo: product.codigo || '-', nombre: product.nombre, categoria: product.categoria || '-',
      stock: product.stock, minimo: product.minimo, precioCompra: `Q${Number(product.precioCompra || 0).toFixed(2)}`,
      precioVenta: `Q${Number(product.precioVenta || 0).toFixed(2)}`,
    })), 'ARTÍCULOS', 'Datos obtenidos del catálogo de inventario.')
  }

  if (key === 'movements') {
    const movements = await listMovimientosInventario({ tipo: movementType || undefined, ...period })
    return downloadTable('reporte_de_movimientos_de_bodega.pdf', 'Movimientos de Bodega', movementType ? `Tipo: ${movementType}` : 'Entradas, salidas y mermas', [
      { key: 'fecha', label: 'FECHA', width: 30 }, { key: 'tipo', label: 'TIPO', width: 22 },
      { key: 'producto', label: 'ARTÍCULO', width: 38 }, { key: 'cantidad', label: 'CANTIDAD', width: 22 },
      { key: 'motivo', label: 'MOTIVO', width: 44 }, { key: 'usuario', label: 'USUARIO', width: 26 },
    ], movements.map((row) => ({ fecha: row.fecha, tipo: row.tipo, producto: row.producto, cantidad: row.cantidad, motivo: row.motivo, usuario: row.usuario })), 'MOVIMIENTOS', 'El reporte puede filtrarse por entrada, salida o merma.')
  }

  if (key === 'suppliers') {
    const suppliers = await listProveedoresInventario()
    return downloadTable('reporte_de_proveedores.pdf', 'Reporte de Proveedores', 'Proveedores registrados', [
      { key: 'codigo', label: 'CÓDIGO', width: 25 }, { key: 'nombre', label: 'PROVEEDOR', width: 45 },
      { key: 'nit', label: 'NIT', width: 30 }, { key: 'telefono', label: 'TELÉFONO', width: 30 },
      { key: 'correo', label: 'CORREO', width: 52 },
    ], suppliers.map((row) => ({ ...row, codigo: row.codigo || '-', nit: row.nit || '-', telefono: row.telefono || '-', correo: row.correo || '-' })), 'PROVEEDORES', 'Listado obtenido del módulo de inventario.')
  }

  if (key === 'recipes') {
    const recipes = await getRecetas()
    return downloadTable('reporte_de_recetas_de_venta.pdf', 'Recetas de Venta', 'Costos y precios de venta registrados', [
      { key: 'codigo', label: 'CÓDIGO', width: 24 }, { key: 'nombre', label: 'RECETA', width: 40 },
      { key: 'presentacion', label: 'PRESENTACIÓN', width: 30 }, { key: 'costoTotal', label: 'COSTO', width: 25 },
      { key: 'precioVenta', label: 'PRECIO VENTA', width: 28 }, { key: 'margen', label: 'MARGEN %', width: 20 },
    ], recipes.map((row) => ({ codigo: row.codigo, nombre: row.nombre, presentacion: row.presentacion || '-', costoTotal: `Q${Number(row.costoTotal || 0).toFixed(2)}`, precioVenta: `Q${Number(row.precioVenta || 0).toFixed(2)}`, margen: `${Number(row.margen || 0).toFixed(1)}%` })), 'RECETAS', 'Datos obtenidos de las recetas de venta registradas.')
  }

  if (key === 'frequent_clients') {
    const [clients, sales] = await Promise.all([listClientesPos(), listVentasPos({ todos: true })])
    const stats = new Map()
    sales.forEach((sale) => {
      const name = sale.nombreCliente || sale.cliente || 'Cliente General'
      if (!sale.clienteId && !sale.nombreCliente && name.toLowerCase() === 'cliente general') return
      const id = sale.clienteId || name.toLowerCase()
      const current = stats.get(id) || { nombre: name, compras: 0, total: 0, ultimaCompra: sale.createdAt }
      current.compras += 1
      current.total += Number(sale.total || 0)
      if (new Date(sale.createdAt) > new Date(current.ultimaCompra)) current.ultimaCompra = sale.createdAt
      stats.set(id, current)
    })
    const clientNames = new Map(clients.map((client) => [client.id, client.nombre]))
    const rows = [...stats.entries()].filter(([, value]) => value.compras > 1).map(([id, value]) => ({
      nombre: clientNames.get(id) || value.nombre, compras: value.compras, total: `Q${value.total.toFixed(2)}`,
      ultimaCompra: value.ultimaCompra ? new Date(value.ultimaCompra).toLocaleDateString('es-GT') : '-',
    })).sort((a, b) => b.compras - a.compras)
    return downloadTable('reporte_de_clientes_frecuentes.pdf', 'Clientes Frecuentes', 'Clientes con más de una compra registrada', [
      { key: 'nombre', label: 'CLIENTE', width: 72 }, { key: 'compras', label: 'COMPRAS', width: 30 },
      { key: 'total', label: 'VENTAS ACUMULADAS', width: 42 }, { key: 'ultimaCompra', label: 'ÚLTIMA COMPRA', width: 40 },
    ], rows, 'CLIENTES FRECUENTES', 'Frecuencia calculada a partir del historial de ventas disponible.')
  }

  return false
}

async function generateInventoryReport(reportPreview) {
  const user = getCurrentUser()
  const rows = reportPreview?.rows || []
  await generateGenericReportPdf({
    fileName: 'reporte_de_inventario.pdf',
    title: 'Reporte de Inventario',
    subtitle: 'Estado actual de stock, movimientos y alertas',
    logoUrl: logoAmati,
    userName: user?.nombre || user?.username || user?.email || 'Administrador',
    periodLabel: 'Inventario actual',
    columns: [
      { key: 'codigo', label: 'CÓDIGO', width: 24, align: 'left' },
      { key: 'producto', label: 'NOMBRE DEL PRODUCTO', width: 48, align: 'left' },
      { key: 'categoria', label: 'CATEGORÍA', width: 28, align: 'center' },
      { key: 'stock', label: 'STOCK ACTUAL', width: 24, align: 'center' },
      { key: 'minimo', label: 'STOCK MÍNIMO', width: 24, align: 'center' },
      { key: 'estado', label: 'ACCIÓN', width: 36, align: 'center' },
    ],
    rows,
    totalLabel: 'PRODUCTOS TOTALES',
    totalValue: reportPreview?.totalProducts || rows.length,
    note: 'Reponer significa que el stock actual está igual o por debajo del stock mínimo configurado.',
  })
}

async function generateSystemReport(reportKey, message = '') {
  const user = getCurrentUser()
  const userName = user?.nombre || user?.username || user?.email || 'Administrador'
  if (['users', 'item_catalog', 'inventory', 'movements', 'suppliers', 'recipes', 'frequent_clients'].includes(reportKey)) {
    await generateChatbotTableReport({ key: reportKey, message, userName })
    return
  }

  const dateRange = getReportDateRange(reportKey, message)
  const [sales, products, movementResponse, recipes] = await Promise.all([
    listVentasPos(dateRange),
    listProductosInventario(),
    listMovimientosInventario(),
    getRecetas(),
  ])
  const movements = movementResponse?.data ?? movementResponse
  const reportData = buildReportData({ sales, products, movements, recipes, ...dateRange })
  const metadata = { logoUrl: logoAmati, userName, periodLabel: reportData.periodLabel }
  const fileName = {
    sales_daily: 'reporte_de_ventas_diario.pdf',
    sales_monthly: 'reporte_de_ventas_mensual.pdf',
    inventory: 'reporte_de_inventario.pdf',
    production: 'reporte_de_produccion.pdf',
    cash_closing: 'reporte_de_cierre_de_caja.pdf',
  }[reportKey] || 'reporte.pdf'

  if (reportKey === 'sales_history') {
    await generateGenericReportPdf({
      fileName: 'historial_de_ventas.pdf',
      title: 'Historial de Ventas',
      subtitle: 'Transacciones del período seleccionado',
      ...metadata,
      columns: [
        { key: 'ticket', label: 'TICKET', width: 28 }, { key: 'fecha', label: 'FECHA Y HORA', width: 40 },
        { key: 'cliente', label: 'CLIENTE', width: 45 }, { key: 'metodo', label: 'MÉTODO DE PAGO', width: 34 },
        { key: 'total', label: 'TOTAL', width: 30, align: 'right' },
      ],
      rows: sales.map((sale) => ({
        ticket: sale.ticket || '-',
        fecha: sale.createdAt ? new Date(sale.createdAt).toLocaleString('es-GT') : '-',
        cliente: sale.nombreCliente || sale.cliente || 'Cliente General',
        metodo: sale.metodoPago || '-',
        total: `Q${Number(sale.total || 0).toFixed(2)}`,
      })),
      totalLabel: 'VENTAS REGISTRADAS',
      totalValue: sales.length,
      note: 'El historial se filtra por el día o mes solicitado. Si no se especifica un período, se muestra el mes actual.',
    })
    return
  }

  if (reportKey === 'sales_daily' || reportKey === 'sales_monthly') {
    await generateSalesReportPdf({
      ...metadata,
      reportName: reportKey === 'sales_monthly' ? 'Reporte de Ventas Mensual' : 'Reporte de Ventas Diario',
      reportData,
    })
    return
  }

  if (reportKey === 'inventory') {
    await generateGenericReportPdf({
      fileName,
      title: 'Reporte de Inventario',
      subtitle: 'Estado actual de stock, movimientos y alertas',
      ...metadata,
      columns: [
        { key: 'codigo', label: 'CÓDIGO', width: 24, align: 'left' },
        { key: 'nombre', label: 'NOMBRE DEL PRODUCTO', width: 48, align: 'left' },
        { key: 'categoria', label: 'CATEGORÍA', width: 28, align: 'center' },
        { key: 'stock', label: 'STOCK ACTUAL', width: 24, align: 'center' },
        { key: 'minimo', label: 'STOCK MÍNIMO', width: 24, align: 'center' },
        { key: 'estado', label: 'ACCIÓN', width: 36, align: 'center' },
      ],
      rows: products.map((product) => ({
        codigo: product.codigo,
        nombre: product.nombre,
        categoria: product.categoria,
        stock: Number(product.stock || 0),
        minimo: Number(product.minimo || 0),
        estado: Number(product.stock || 0) <= Number(product.minimo || 0) ? 'Reponer' : 'Suficiente',
      })),
      totalLabel: 'PRODUCTOS TOTALES',
      totalValue: products.length,
      note: 'Reponer significa que el stock actual está igual o por debajo del stock mínimo configurado.',
    })
    return
  }

  if (reportKey === 'production') {
    await generateGenericReportPdf({
      fileName,
      title: 'Reporte de Producción',
      subtitle: 'Lotes producidos, costos y rendimiento',
      ...metadata,
      columns: [
        { key: 'codigo', label: 'CÓDIGO', width: 28, align: 'left' },
        { key: 'nombre', label: 'RECETA', width: 58, align: 'left' },
        { key: 'categoria', label: 'CATEGORÍA', width: 30, align: 'center' },
        { key: 'costoTotal', label: 'COSTO TOTAL', width: 35, align: 'center' },
        { key: 'precioSugerido', label: 'PRECIO SUGERIDO', width: 35, align: 'center' },
      ],
      rows: recipes.map((recipe) => ({
        codigo: recipe.codigo,
        nombre: recipe.nombre,
        categoria: recipe.categoria,
        costoTotal: `Q${Number(recipe.costoTotal || 0).toFixed(2)}`,
        precioSugerido: `Q${Number(recipe.precioSugerido || 0).toFixed(2)}`,
      })),
      totalLabel: 'RECETAS TOTALES',
      totalValue: recipes.length,
      note: 'El reporte muestra las recetas registradas y sus valores de costeo actuales.',
    })
    return
  }

  if (reportKey === 'ai_weekly') {
    const [predictionProducts, historicalSales] = await Promise.all([
      getPredictionProducts(),
      getHistoricalSales(30),
    ])
    const predictionResult = generateDemandPredictions({ forecast: null, sales: historicalSales, products: predictionProducts })
    const reportablePredictions = predictionResult.predictions.filter((prediction) => prediction.hasEnoughSales)
    await generateGenericReportPdf({
      fileName: 'predicciones_ia_semanal.pdf',
      title: 'Estimaciones de demanda semanales (reglas)',
      subtitle: 'Estimaciones calculadas con ventas históricas',
      ...metadata,
      columns: [
        { key: 'producto', label: 'PRODUCTO', width: 42, align: 'left' },
        { key: 'ventaReal', label: 'PROMEDIO SEMANAL (30D)', width: 34, align: 'center' },
        { key: 'prediccion', label: 'ESTIMACIÓN (7D)', width: 28, align: 'center' },
        { key: 'confianza', label: 'CONFIANZA ESTIMADA', width: 34, align: 'center' },
        { key: 'factor', label: 'FACTOR CLAVE', width: 50, align: 'left' },
      ],
      rows: reportablePredictions.map((prediction) => ({
        producto: prediction.productName,
        ventaReal: Math.round(prediction.averageSale * 7),
        prediccion: prediction.nextWeekPrediction ?? 'Datos insuficientes',
        confianza: `Estimación ${prediction.confidence}%`,
        factor: prediction.keyFactor,
      })),
      totalLabel: 'TOTAL DE PREDICCIONES',
      totalValue: reportablePredictions.length,
      note: 'Proyecciones calculadas con datos de ventas reales. El cálculo desde el chatbot usa el historial disponible y no agrega condiciones climáticas.',
    })
    return
  }

  await generateGenericReportPdf({
    fileName,
    title: 'Reporte de Cierre de Caja',
    subtitle: 'Arqueo de caja y conciliación de pagos',
    ...metadata,
    columns: [
      { key: 'fecha', label: 'FECHA', width: 44, align: 'left' },
      { key: 'detalle', label: 'DETALLE', width: 90, align: 'left' },
      { key: 'valor', label: 'VALOR', width: 52, align: 'right' },
    ],
    rows: [
      { fecha: 'Total de ventas', detalle: 'Ventas registradas en el período', valor: `Q${reportData.salesTotal.toFixed(2)}` },
      { fecha: 'Promedio', detalle: 'Ticket promedio del período', valor: `Q${reportData.salesAverage.toFixed(2)}` },
      { fecha: 'Método principal', detalle: reportData.primaryMethod, valor: '-' },
    ],
    totalLabel: 'TRANSACCIONES',
    totalValue: reportData.salesCount,
    note: 'Este resumen consolida la información principal del cierre de caja.',
  })
}

function ChatbotProvider({ children }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [reportGenerating, setReportGenerating] = useState(false)
  const [cubeState, setCubeState] = useState('normal')

  const sendMessage = async (rawValue) => {
    const content = rawValue.trim()
    if (!content || loading) return

    setMessages((current) => [...current, { role: 'user', type: 'text', content }])
    setInput('')
    setLoading(true)
    setCubeState('processing')

    try {
      const history = messages.map(({ role, content: messageContent }) => ({ role, content: messageContent }))
      const response = await sendChatbotMessage({ message: content, history })
      let assistantMessage = {
        role: 'assistant',
        type: response.type === 'report_preview' ? 'report' : 'message',
        content: response.message || 'Esta información no está disponible en el sistema.',
        reportPreview: response.reportPreview ? { ...response.reportPreview, requestMessage: content } : null,
      }
      if (response.action === 'generate_inventory_report') {
        const previousReport = [...messages].reverse().find((item) => item.reportPreview)?.reportPreview
        await generateInventoryReport(previousReport)
        assistantMessage = { role: 'assistant', type: 'message', content: 'Reporte de inventario generado y descargado.' }
      }
      setMessages((current) => [...current, {
        ...assistantMessage,
      }])
      setCubeState('responding')
      window.setTimeout(() => setCubeState((current) => current === 'responding' ? 'normal' : current), 850)
    } catch (error) {
      setMessages((current) => [...current, {
        role: 'assistant',
        type: 'error',
        content: error.message || 'No pude obtener la información en este momento. Intenta nuevamente.',
      }])
      setCubeState('error')
      window.setTimeout(() => setCubeState((current) => current === 'error' ? 'normal' : current), 850)
    } finally {
      setLoading(false)
    }
  }

  const handleReport = async (reportPreview) => {
    if (!reportPreview || reportGenerating) return
    setReportGenerating(true)
    try {
      if (reportPreview.reportKey === 'inventory') {
        await generateInventoryReport(reportPreview)
      } else {
        await generateSystemReport(reportPreview.reportKey, reportPreview.requestMessage)
      }
      setMessages((current) => [...current, { role: 'assistant', type: 'message', content: 'Reporte generado y descargado correctamente.' }])
    } catch (error) {
      setMessages((current) => [...current, { role: 'assistant', type: 'error', content: error.message || 'No pude generar el reporte en este momento. Intenta nuevamente.' }])
    } finally {
      setReportGenerating(false)
    }
  }

  const clearChat = () => {
    if (loading) return
    setMessages([])
    setInput('')
    setCubeState('normal')
  }

  const value = {
    messages, input, setInput, loading, reportGenerating, cubeState,
    sendMessage, handleReport, clearChat,
  }

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>
}

function useChat() {
  const context = useContext(ChatContext)
  if (!context) throw new Error('Chatbot debe estar dentro de ChatbotProvider.')
  return context
}

function ChatHeader({ compact = false, onBack, onClose }) {
  const { cubeState, messages, loading, clearChat } = useChat()
  return (
    <header className={`flex shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4 ${compact ? 'py-3' : 'py-3.5 sm:px-6'}`}>
      <div className="flex min-w-0 items-center gap-3">
        {onBack && <button type="button" onClick={onBack} aria-label="Regresar a IA Predictiva" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-gray-600 transition hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"><ArrowLeft size={19} /></button>}
        <IceCubeAssistant size="avatar" state={cubeState} />
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold text-gray-800 sm:text-base">Asistente AMATI</h2>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-gray-500">
            {!compact && <><span>IA Predictiva</span><span className="text-gray-300">·</span></>}
            <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-green-500" />Disponible</span>
          </p>
        </div>
      </div>
      <div className="ml-2 flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={clearChat}
          disabled={loading || messages.length === 0}
          aria-label="Limpiar chat"
          title="Limpiar chat"
          className="flex h-9 items-center justify-center gap-1.5 rounded-lg px-2 text-xs font-medium text-gray-600 transition hover:bg-red-50 hover:text-red-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Trash2 size={16} aria-hidden="true" />
          <span>Limpiar</span>
        </button>
        {onClose && <button type="button" onClick={onClose} aria-label="Cerrar asistente" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-gray-600 transition hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"><X size={19} /></button>}
      </div>
    </header>
  )
}

function ChatQuickActions() {
  const { sendMessage, loading } = useChat()
  return (
    <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
      {quickActions.map(({ title, description, prompt, icon }) => (
        <button key={title} type="button" disabled={loading} onClick={() => sendMessage(prompt)} className="group flex min-h-[76px] items-center gap-3 rounded-lg border border-gray-200 bg-white px-3.5 py-3 text-left shadow-sm transition duration-150 hover:-translate-y-0.5 hover:border-cyan-200 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:opacity-60 sm:px-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-cyan-50 text-cyan-700 transition-colors group-hover:bg-cyan-100 group-hover:text-blue-700">{createElement(icon, { size: 19, strokeWidth: 1.9, 'aria-hidden': true })}</span>
          <span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-gray-800">{title}</span><span className="mt-0.5 block text-xs text-gray-500">{description}</span></span>
          <ArrowRight size={16} className="shrink-0 text-gray-400 transition group-hover:translate-x-0.5 group-hover:text-cyan-700" aria-hidden="true" />
        </button>
      ))}
    </div>
  )
}

function ChatEmptyState() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-1 py-4 text-center sm:px-5 sm:py-6">
      <div className="flex h-[170px] shrink-0 items-center justify-center sm:h-[205px]"><IceCubeAssistant size="hero" state="normal" /></div>
      <h3 className="mt-2 text-xl font-semibold tracking-tight text-gray-800 sm:text-2xl">Asistente AMATI</h3>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-gray-500">Consulta información de tu operación de forma rápida.</p>
      <div className="mt-6 w-full"><ChatQuickActions /></div>
      <ChatSuggestions />
    </div>
  )
}

function ChatSuggestions() {
  const { sendMessage, loading } = useChat()
  return (
    <div className="mt-5 w-full">
      <p className="mb-2.5 text-center text-xs font-medium text-gray-500">También puedes preguntar:</p>
      <div className="flex flex-wrap justify-center gap-2">
        {quickQuestions.map((question) => <button key={question} type="button" disabled={loading} onClick={() => sendMessage(question)} className="max-w-full rounded-full border border-gray-200 bg-white px-3 py-2 text-left text-xs leading-4 text-gray-600 transition hover:border-cyan-200 hover:bg-cyan-50 hover:text-cyan-800 focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:opacity-60">{question}</button>)}
      </div>
    </div>
  )
}

function FormattedResponse({ content }) {
  return <div className="space-y-1 whitespace-normal">
    {String(content || '').split('\n').filter(Boolean).map((line, index) => <p key={`${index}-${line}`}>
      {line.split(/(\*\*[^*]+\*\*)/g).map((part, partIndex) => part.startsWith('**') && part.endsWith('**')
        ? <strong key={partIndex} className="font-semibold text-gray-900">{part.slice(2, -2)}</strong>
        : part)}
    </p>)}
  </div>
}

function ChatMessage({ message, cubeState = 'normal', onReport, reportGenerating = false }) {
  const isUser = message.role === 'user'
  return (
    <div className={`flex items-end gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && <IceCubeAssistant size="avatar" state={cubeState} />}
      <div className={`max-w-[min(84%,680px)] ${isUser ? 'text-right' : ''}`}>
        <p className="mb-1 px-1 text-[10px] font-semibold uppercase tracking-[.12em] text-gray-400">{isUser ? 'Tú' : 'AMATI'}</p>
        <div className={`rounded-2xl px-4 py-3 text-left text-sm leading-relaxed ${isUser ? 'rounded-br-md bg-cyan-50 text-gray-800' : 'rounded-bl-md border border-gray-200 bg-white text-gray-700 shadow-sm'}`}>
          <FormattedResponse content={message.content} />
          {message.reportPreview && <div className="mt-3 rounded-xl border border-gray-200 bg-gray-50 p-3.5">
            <div className="flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-100 text-cyan-700"><BarChart3 size={16} /></span><div><p className="text-xs font-semibold text-gray-800">{message.reportPreview.title}</p><p className="text-[10px] text-gray-500">{message.reportPreview.totalProducts != null ? `${message.reportPreview.totalProducts} productos \u00b7 ${message.reportPreview.lowStockProducts} bajo m\u00ednimo` : message.reportPreview.summary}</p></div></div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2"><span className="text-xs text-gray-600">{'\u00bfDeseas generarlo?'}</span><button type="button" onClick={() => onReport(message.reportPreview)} disabled={reportGenerating} className="rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 px-3 py-2 text-xs font-medium text-white transition hover:from-cyan-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:cursor-wait disabled:opacity-60">{reportGenerating ? 'Generando\u2026' : 'Generar reporte'}</button></div>
          </div>}
        </div>
      </div>
    </div>
  )
}

function ChatLoadingState() {
  return <div className="flex items-end gap-2.5" role="status" aria-live="polite">
    <IceCubeAssistant size="avatar" state="processing" />
    <div className="rounded-2xl rounded-bl-md border border-gray-200 bg-white px-4 py-3 text-sm text-gray-600 shadow-sm">Analizando tu consulta...</div>
  </div>
}

function ChatMessages() {
  const { messages, loading, reportGenerating, cubeState, handleReport } = useChat()
  const scrollRef = useRef(null)

  useEffect(() => {
    const container = scrollRef.current
    if (container) container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' })
  }, [messages, loading])

  return <div ref={scrollRef} className="flex-1 space-y-5 overflow-y-auto bg-gray-50/70 px-4 py-5 sm:px-6 sm:py-6">
    {messages.map((message, index) => <ChatMessage key={`${message.role}-${index}`} message={message} cubeState={index === messages.length - 1 && message.role === 'assistant' ? cubeState : 'normal'} onReport={handleReport} reportGenerating={reportGenerating} />)}
    {loading && <ChatLoadingState />}
  </div>
}

function ChatInput({ compact = false, inputRef }) {
  const { input, setInput, loading, sendMessage } = useChat()
  const inputId = compact ? 'amati-chat-compact-input' : 'amati-chat-input'

  const handleSubmit = (event) => {
    event.preventDefault()
    sendMessage(input)
  }
  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      sendMessage(input)
    }
  }

  return <form onSubmit={handleSubmit} className={`shrink-0 border-t border-gray-200 bg-white ${compact ? 'p-3' : 'px-4 py-3.5 sm:px-6 sm:py-4'}`}>
    <div className="mx-auto flex w-full max-w-3xl items-end gap-2.5 rounded-xl border border-gray-200 bg-white p-2 shadow-sm transition focus-within:border-cyan-400 focus-within:ring-2 focus-within:ring-cyan-100">
      <label className="sr-only" htmlFor={inputId}>Escribe tu consulta</label>
      <textarea ref={inputRef} id={inputId} value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={handleKeyDown} placeholder="Escribe tu consulta..." rows={1} maxLength={2000} className="max-h-28 min-h-10 min-w-0 flex-1 resize-y border-0 bg-transparent px-2 py-2 text-sm text-gray-800 outline-none placeholder:text-gray-400 focus:ring-0" />
      <button type="submit" disabled={loading || !input.trim()} aria-label="Enviar consulta" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-sm transition hover:from-cyan-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40"><ArrowUp size={19} strokeWidth={2.2} /></button>
    </div>
    {!compact && <p className="mt-2 text-center text-[10px] text-gray-400">Enter para enviar · Shift + Enter para nueva línea</p>}
  </form>
}

export function Chatbot({ variant = 'embedded', onBack }) {
  const { messages } = useChat()
  const hasConversation = messages.length > 0

  if (variant === 'embedded') {
    return <section className="mx-auto flex h-[min(740px,calc(100dvh-250px))] min-h-[540px] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-md md:h-[min(760px,calc(100vh-230px))] md:min-h-[620px]">
      <ChatHeader onBack={onBack} />
      {hasConversation ? <ChatMessages /> : <div className="flex-1 overflow-y-auto bg-gradient-to-br from-gray-50 via-white to-cyan-50/60 px-4 py-4 sm:px-7"><ChatEmptyState /></div>}
      <ChatInput />
    </section>
  }

  return null
}

export function FloatingChatWindow({ open, onClose, currentModule }) {
  const { messages, cubeState } = useChat()
  const inputRef = useRef(null)
  const hasConversation = messages.length > 0

  useEffect(() => {
    if (!open) return undefined
    const frame = window.requestAnimationFrame(() => inputRef.current?.focus())
    return () => window.cancelAnimationFrame(frame)
  }, [open])

  return <section
    role="dialog"
    aria-modal="false"
    aria-label="Asistente AMATI"
    aria-hidden={!open}
    inert={!open}
    data-current-module={currentModule || undefined}
    id="amati-floating-chat-window"
    className={`amati-chat-pop fixed bottom-[5.5rem] right-2 z-40 flex h-[calc(100dvh-6.5rem)] w-[calc(100vw-1rem)] flex-col overflow-hidden rounded-[24px] border border-white/80 bg-white shadow-[0_22px_70px_-18px_rgba(15,48,70,.34)] sm:bottom-24 sm:right-5 sm:h-[min(640px,calc(100dvh-7rem))] sm:w-[min(410px,calc(100vw-2.5rem))] ${open ? 'is-open' : 'is-closed'}`}
  >
    <ChatHeader compact onClose={onClose} />
    {hasConversation
      ? <ChatMessages />
      : <div className="flex flex-1 flex-col items-center justify-center gap-4 overflow-y-auto bg-gradient-to-b from-cyan-50/50 to-gray-50 px-4 py-5 text-center"><IceCubeAssistant size="floating" state={cubeState} /><p className="text-sm text-gray-600">Hola, ¿en qué puedo ayudarte?</p><div className="w-full"><ChatQuickActions /></div><ChatSuggestions /></div>}
    <ChatInput compact inputRef={inputRef} />
  </section>
}

export function FloatingChatbot({ showFloatingChatbot = true, currentModule }) {
  const { cubeState } = useChat()
  const [open, setOpen] = useState(false)
  const [hasOpened, setHasOpened] = useState(false)
  const triggerRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setOpen(false)
        window.requestAnimationFrame(() => triggerRef.current?.focus())
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open])

  if (!showFloatingChatbot) return null

  return <>
    {hasOpened && <FloatingChatWindow open={open} onClose={() => {
      setOpen(false)
      window.requestAnimationFrame(() => triggerRef.current?.focus())
    }} currentModule={currentModule} />}
    <button
      ref={triggerRef}
      type="button"
      onClick={() => { setHasOpened(true); setOpen((current) => !current) }}
      className="ice-launcher group fixed bottom-4 right-4 z-40 flex h-[68px] w-[68px] items-center justify-center rounded-[22px] border border-white/90 bg-white/90 shadow-[0_10px_30px_rgba(35,116,160,.20)] backdrop-blur transition duration-200 hover:scale-[1.04] hover:shadow-[0_12px_34px_rgba(35,116,160,.28)] focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2"
      aria-label={open ? 'Cerrar asistente AMATI' : 'Abrir asistente AMATI'}
      aria-haspopup="dialog"
      aria-expanded={open}
      aria-controls="amati-floating-chat-window"
    >
      <span className="pointer-events-none absolute -top-10 right-0 translate-y-1 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white opacity-0 shadow-lg transition group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100">Asistente AMATI</span>
      <IceCubeAssistant size="floating" state={cubeState} />
    </button>
  </>
}

export { ChatbotProvider }
export default Chatbot
