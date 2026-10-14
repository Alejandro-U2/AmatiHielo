import { jsPDF } from 'jspdf'
import { generateChatbotResponse, isGeminiConfigured } from '../services/geminiService.js'
import { buildChatbotContext, getInventorySnapshot } from '../services/chatbotDataService.js'
import { canRoleUseChatbotIntent, detectChatbotIntent, findProductMatches, getFixedChatReply, isConfirmedReportRequest, isProductReferenceQuery, normalizeChatText as normalizeText, resolveConversationQuery as conversationQuery } from '../services/chatbotRules.js'

function normalizeHistory(history) {
  if (!Array.isArray(history)) return []

  return history
    .filter((item) => item && typeof item.content === 'string')
    .map((item) => ({
      role: item.role === 'assistant' ? 'model' : 'user',
      content: item.content.slice(0, 4000),
    }))
}

function formatNumber(value) {
  const number = Number(value)
  return value == null || !Number.isFinite(number)
    ? 'No disponible'
    : number.toLocaleString('en-US', { maximumFractionDigits: 2 })
}

function formatDate(value) {
  return new Date(`${value}T12:00:00Z`).toLocaleDateString('es-GT', {
    day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC',
  })
}

function weatherDescription(code) {
  if ([0].includes(code)) return 'Despejado'
  if ([1, 2].includes(code)) return 'Parcialmente nublado'
  if ([3].includes(code)) return 'Nublado'
  if ([45, 48].includes(code)) return 'Niebla'
  if ([51, 53, 55, 56, 57].includes(code)) return 'Llovizna'
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return 'Lluvia'
  if ([71, 73, 75, 77, 85, 86].includes(code)) return 'Nieve'
  if ([95, 96, 99].includes(code)) return 'Tormenta'
  return 'Condición no disponible'
}

function getRequestedReportKey(message) {
  const normalized = normalizeText(message)
  // Treat a named report as a generation request even when the user omits
  // an action verb (for example, "reporte de ventas").
  if (!/\b(reportes?|informes?)\b/.test(normalized)) return null
  if (/\b(usuario|usuarios|cuenta|cuentas)\b/.test(normalized)) return 'users'
  if (/\b(proveedor|proveedores)\b/.test(normalized)) return 'suppliers'
  if (/\b(clientes? frecuentes|frecuentes clientes|clientes habituales)\b/.test(normalized)) return 'frequent_clients'
  if (/\bhistorial\b/.test(normalized)) return 'sales_history'
  if (/\b(catalogo|articulos|articulo|productos)\b/.test(normalized)) return 'item_catalog'
  if (/\b(movimientos?|bodega|entradas|salidas|mermas?)\b/.test(normalized)) return 'movements'
  if (/\b(recetas?|formulas?)\b/.test(normalized)) return 'recipes'
  if (/\b(inventario|stock)\b/.test(normalized)) return 'inventory'
  if (/\b(produccion|producción)\b/.test(normalized)) return 'production'
  if (/\b(cierre|caja|arqueo|conciliacion)\b/.test(normalized)) return 'cash_closing'
  if (/\b(predic|demanda|ia|semanal)\b/.test(normalized)) return 'ai_weekly'
  if (/\b(mensual|mes)\b/.test(normalized)) return 'sales_monthly'
  if (/\b(venta|ventas)\b/.test(normalized)) return 'sales_daily'
  return null
}

export async function sendChatbotMessage(req, res) {
  const { message, history } = req.body || {}

  if (typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ message: 'La consulta del chatbot es obligatoria.' })
  }

  if (message.length > 2000) {
    return res.status(400).json({ message: 'La consulta no puede superar 2000 caracteres.' })
  }

  try {
    const requestedReportKey = getRequestedReportKey(message)
    if (requestedReportKey && requestedReportKey !== 'inventory') {
      if (!canRoleUseChatbotIntent(req.auth?.profile?.rol, 'report')) {
        return res.status(403).json({ message: 'Tu rol no tiene permiso para generar este reporte.' })
      }
      const reportTitles = {
        users: 'Reporte de Usuarios',
        suppliers: 'Reporte de Proveedores',
        frequent_clients: 'Reporte de Clientes Frecuentes',
        sales_history: 'Historial de Ventas',
        item_catalog: 'Catálogo de Artículos',
        movements: 'Movimientos de Bodega',
        recipes: 'Recetas de Venta',
        production: 'Reporte de Producción',
        cash_closing: 'Reporte de Cierre de Caja',
        ai_weekly: 'Estimaciones de Demanda Semanal',
        sales_monthly: 'Reporte de Ventas Mensual',
        sales_daily: 'Reporte de Ventas Diario',
      }
      const normalized = normalizeText(message)
      const details = requestedReportKey === 'users' && /\binactiv/.test(normalized)
        ? 'Filtro: usuarios inactivos'
        : requestedReportKey === 'users' && /\bactiv/.test(normalized)
          ? 'Filtro: usuarios activos'
          : requestedReportKey === 'movements' && /\bmerma/.test(normalized)
            ? 'Filtro: mermas'
            : requestedReportKey === 'movements' && /\bsalida/.test(normalized)
              ? 'Filtro: salidas'
              : requestedReportKey === 'movements' && /\bentrada/.test(normalized)
                ? 'Filtro: entradas'
                : requestedReportKey === 'frequent_clients'
                  ? 'Clientes con más de una compra registrada'
                  : requestedReportKey === 'sales_history' || requestedReportKey === 'sales_monthly' || requestedReportKey === 'sales_daily'
                    ? 'Se aplicará el período indicado en tu solicitud'
                    : 'Datos actuales del sistema'
      return res.json({
        type: 'report_preview',
        message: '¿Deseas generar este reporte?',
        reportPreview: {
          reportKey: requestedReportKey,
          title: reportTitles[requestedReportKey] || 'Reporte del sistema',
          summary: details,
        },
      })
    }
    const lastAssistantMessage = Array.isArray(history)
      ? [...history].reverse().find((item) => item?.role === 'assistant')?.content || ''
      : ''
    if (isConfirmedReportRequest(message, lastAssistantMessage)) {
      return res.json({ type: 'report_confirmation', action: 'generate_inventory_report', message: 'Generando el reporte de inventario.' })
    }

    const effectiveMessage = conversationQuery(message.trim(), history)
    const fixedReply = getFixedChatReply(effectiveMessage, req.auth?.profile?.rol)
    if (fixedReply) return res.json({ type: 'message', message: fixedReply })

    const intent = detectChatbotIntent(effectiveMessage)
    if (!canRoleUseChatbotIntent(req.auth?.profile?.rol, intent)) {
      return res.status(403).json({ message: 'Tu rol no tiene permiso para consultar esta información.' })
    }

    const normalizedMessage = normalizeText(effectiveMessage)
    if (/(reporte|informe)/.test(normalizedMessage) && !/(inventario|stock|venta|produccion)/.test(normalizedMessage)) {
      return res.json({ type: 'message', message: '¿Qué tipo de reporte deseas consultar: ventas, inventario o producción?' })
    }
    const verifiedContext = await buildChatbotContext(effectiveMessage)
    if (verifiedContext.validacion) {
      return res.json({ type: 'message', message: verifiedContext.validacion })
    }

    if (verifiedContext.intencion === 'report') {
      const normalized = normalizeText(effectiveMessage)
      if (/\b(venta|ventas|produccion|despacho|ruta|merma)\b/.test(normalized)) {
        return res.json({ type: 'message', message: 'Esta información no está disponible en el sistema.' })
      }
      const products = verifiedContext.datos.productos || []
      const lowStock = products.filter((product) => product.bajoMinimo)
      const criticalStock = products.filter((product) => product.stock != null && product.minimo > 0 && product.stock <= product.minimo / 2)
      return res.json({
        type: 'report_preview',
        message: `Reporte de inventario actual: **${formatNumber(products.length)} productos**\nBajo mínimo: ${formatNumber(lowStock.length)} productos\nEn estado crítico: ${formatNumber(criticalStock.length)} productos\n\n¿Deseas generarlo?`,
        reportPreview: {
          reportKey: 'inventory',
          title: 'Inventario actual',
          generatedAt: new Date().toISOString(),
          totalProducts: products.length,
          lowStockProducts: lowStock.length,
          criticalStockProducts: criticalStock.length,
          rows: products.map((product) => ({
            codigo: product.codigo || '-',
            producto: product.nombre,
            categoria: product.categoria || '-',
            stock: product.stock,
            minimo: product.minimo ?? '-',
            unidad: product.unidad || '-',
            estado: product.stock == null ? 'Stock no disponible' : product.bajoMinimo ? 'Bajo' : product.minimoConfigurado ? 'Normal' : 'Mínimo no configurado',
          })),
        },
      })
    }

    if (verifiedContext.intencion === 'sales') {
      const normalizedSalesQuestion = normalizeText(effectiveMessage)
      const asksForActualSales = /(ventas?|vendimos|vendidas|ingresos|recaudacion|facturacion)/.test(normalizedSalesQuestion)
        && !/(predic|proyect|venderemos|demanda futura|estimacion)/.test(normalizedSalesQuestion)
      if (asksForActualSales) {
        const dailySales = verifiedContext.datos.ventasDelDia
        const productLines = Object.entries(dailySales?.porProducto || {})
          .map(([product, units]) => `${product}: ${formatNumber(units)} unidades`)
        const messageText = dailySales?.unidades
          ? `Ventas del ${formatDate(dailySales.fecha)}:\nUnidades vendidas: **${formatNumber(dailySales.unidades)}**\nIngresos: **Q${formatNumber(dailySales.ingresos)}**${productLines.length ? `\n\nPor producto:\n${productLines.join('\n')}` : ''}`
          : `No hay ventas registradas para el ${formatDate(dailySales?.fecha)}.`
        return res.json({
          type: 'sales_daily',
          message: messageText,
          salesData: dailySales,
        })
      }
      const predictions = verifiedContext.datos.predicciones || []
      const normalized = normalizedSalesQuestion
      const explicitlyAll = /\b(todos|todas|general|productos)\b/.test(normalized)
      const hasDate = /\b(hoy|manana|lunes|martes|miercoles|jueves|viernes|sabado|domingo|\d{1,2}[/-]\d{1,2})\b/.test(normalized)
      const matchingPredictions = findProductMatches(normalized, predictions)
      if (predictions.length > 1 && !explicitlyAll && !matchingPredictions.length) {
        return res.json({ type: 'message', message: '¿Qué producto deseas consultar?' })
      }
      if (matchingPredictions.length > 1 && !explicitlyAll) {
        return res.json({ type: 'message', message: 'Encontré varias presentaciones. ¿Cuál producto deseas consultar?' })
      }
      if (!hasDate) return res.json({ type: 'message', message: '¿Para qué fecha deseas consultar la predicción?' })
      const selectedPredictions = predictions.length > 1 && !explicitlyAll
        ? matchingPredictions
        : predictions
      const insufficient = selectedPredictions.filter((item) => Number(item.diasConVentas || 0) < 2)
      if (!selectedPredictions.length || insufficient.length) {
        return res.json({
          type: 'message',
          message: 'No hay suficientes datos históricos para realizar una predicción confiable.',
        })
      }
      const lines = selectedPredictions.slice(0, explicitlyAll ? 10 : 1).flatMap((prediction) => [
        `Ventas proyectadas: **${formatNumber(prediction.prediccionUnidades)} unidades**`,
        `Producto: ${prediction.producto}`,
        `Fecha: ${formatDate(prediction.fechaObjetivo)}`,
      ])
      const messageText = lines.join('\n')
      return res.json({
        type: 'sales_prediction',
        message: messageText,
        predictionData: selectedPredictions,
      })
    }

    if (verifiedContext.intencion === 'weather') {
      const days = verifiedContext.datos.dias || []
      const weekday = new Intl.DateTimeFormat('es-GT', { weekday: 'long', timeZone: 'UTC' })
      const availableDays = days.filter((day) => Number.isFinite(Number(day.temperaturaMaxima)))
      const messageText = availableDays.length
        ? availableDays.map((day) => `${weekday.format(new Date(`${day.fecha}T12:00:00Z`))} ${formatDate(day.fecha).slice(0, 5)}: ${Math.round(Number(day.temperaturaMaxima))} °C — ${weatherDescription(day.codigoClima)}`).join('\n')
        : 'Esta información no está disponible en el sistema.'
      return res.json({ type: 'weather_forecast', message: messageText, weatherData: days })
    }

    if (verifiedContext.intencion === 'stock') {
      const products = verifiedContext.datos.productos || []
      const normalizedQuestion = normalizeText(effectiveMessage)
      const filteredProducts = normalizedQuestion.includes('materia prima')
        ? products.filter((product) => String(product.categoria || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().includes('materia prima'))
        : products
      const onlyLowStock = /(bajo|baja|minimo|critico|critica)/.test(normalizedQuestion)
      const productMatches = findProductMatches(normalizedQuestion, filteredProducts)
      const allProductsRequested = /(todos|todas|inventario|listado|existencias)/.test(normalizedQuestion)
      if (!onlyLowStock && !productMatches.length && isProductReferenceQuery(normalizedQuestion)) {
        return res.json({ type: 'message', message: 'No encontré ese producto en el sistema.' })
      }
      if (productMatches.length > 1 && !allProductsRequested && !onlyLowStock) {
        return res.json({ type: 'message', message: 'Encontré varias presentaciones. ¿Cuál producto deseas consultar?' })
      }
      if (!onlyLowStock && !productMatches.length && !allProductsRequested) {
        return res.json({ type: 'message', message: '¿Qué producto deseas consultar?' })
      }
      const rows = onlyLowStock
        ? productMatches.length ? productMatches.filter((product) => product.bajoMinimo) : filteredProducts.filter((product) => product.bajoMinimo)
        : productMatches.length ? productMatches : filteredProducts
      const unknownEvaluation = (productMatches.length ? productMatches : filteredProducts).filter((product) => product.stock == null || !product.minimoConfigurado)
      const evaluationNote = unknownEvaluation.length
        ? `Sin evaluación por datos faltantes: ${unknownEvaluation.map((product) => `${product.nombre} (${product.stock == null ? 'stock no disponible' : 'mínimo no configurado'})`).join(', ')}`
        : ''
      const messageText = onlyLowStock
        ? rows.length
          ? `${rows.map((product) => `${product.nombre}: ${formatNumber(product.stock)} ${product.unidad || '(unidad no disponible)'} — BAJO MÍNIMO`).join('\n')}${evaluationNote ? `\n${evaluationNote}` : ''}`
          : unknownEvaluation.length
            ? `No puedo confirmar si los productos están bajo mínimo. ${evaluationNote}`
            : 'Actualmente no hay productos por debajo del mínimo.'
        : rows.map((product) => `${product.nombre}: ${formatNumber(product.stock)} ${product.unidad || '(unidad no disponible)'}${product.stock == null ? ' — STOCK NO DISPONIBLE' : product.bajoMinimo ? ' — BAJO MÍNIMO' : !product.minimoConfigurado ? ' — MÍNIMO NO CONFIGURADO' : ''}`).join('\n')
      return res.json({
        type: 'inventory',
        message: messageText || 'Esta información no está disponible en el sistema.',
        inventoryData: rows.map((product) => ({
          codigo: product.codigo || '-',
          producto: product.nombre,
          categoria: product.categoria || '-',
          stock: product.stock,
          minimo: product.minimo,
          minimoConfigurado: product.minimoConfigurado,
          unidad: product.unidad || '-',
          bajoMinimo: product.bajoMinimo,
        })),
      })
    }

    if (!isGeminiConfigured()) return res.status(503).json({ message: 'No pude obtener la información en este momento. Intenta nuevamente.' })

    const response = await generateChatbotResponse({
      message: message.trim(),
      history: normalizeHistory(history),
      context: {
        ...verifiedContext,
      },
    })

    return res.json({
      type: 'message',
      message: response,
      model: process.env.GEMINI_MODEL || 'gemini-3.6-flash',
    })
  } catch (error) {
    console.error('Error interno del asistente AMATI.', { code: error?.code, status: error?.status })
    return res.status(502).json({ message: 'No pude obtener la información en este momento. Intenta nuevamente.' })
  }
}

export async function downloadInventoryReport(req, res) {
  try {
    const snapshot = await getInventorySnapshot()
    const products = snapshot.productos || []
    const lowStock = products.filter((product) => product.bajoMinimo)
    const criticalStock = products.filter((product) => product.stock != null && product.minimo > 0 && product.stock <= product.minimo / 2)
    const reportDate = new Date().toLocaleString('es-GT', {
      day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
    })
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' })
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const columns = [
      { key: 'codigo', label: 'CÓDIGO', x: 36, width: 70 },
      { key: 'nombre', label: 'PRODUCTO', x: 112, width: 195 },
      { key: 'categoria', label: 'CATEGORÍA', x: 316, width: 130 },
      { key: 'stock', label: 'STOCK', x: 454, width: 52 },
      { key: 'minimo', label: 'MÍNIMO', x: 514, width: 52 },
      { key: 'unidad', label: 'UNIDAD', x: 574, width: 64 },
      { key: 'estado', label: 'ESTADO', x: 648, width: 76 },
    ]
    const rowsPerPage = 25

    for (let offset = 0; offset < products.length || offset === 0; offset += rowsPerPage) {
      if (offset > 0) doc.addPage()
      doc.setFillColor(239, 249, 252)
      doc.rect(0, 0, pageWidth, 112, 'F')
      doc.setTextColor(17, 77, 101)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(19)
      doc.text('AMATI HIELO', 36, 38)
      doc.setFontSize(13)
      doc.text('REPORTE DE INVENTARIO ACTUAL', 36, 62)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.setTextColor(85, 104, 117)
      doc.text(`Corte: ${reportDate}   |   Fuente: inventario actual de Supabase`, 36, 80)
      doc.text(`${products.length} productos   ·   ${lowStock.length} bajo mínimo   ·   ${criticalStock.length} críticos`, 36, 96)

      const headerY = 132
      doc.setFillColor(16, 105, 132)
      doc.roundedRect(32, headerY - 15, pageWidth - 64, 24, 5, 5, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8)
      columns.forEach((column) => doc.text(column.label, column.x, headerY))

      const pageRows = products.slice(offset, offset + rowsPerPage)
      pageRows.forEach((product, index) => {
        const y = headerY + 24 + index * 21
        if (index % 2 === 0) {
          doc.setFillColor(246, 250, 252)
          doc.rect(32, y - 12, pageWidth - 64, 20, 'F')
        }
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(8)
        doc.setTextColor(51, 65, 85)
        const values = {
          codigo: String(product.codigo || '-'),
          nombre: String(product.nombre || 'Producto').slice(0, 32),
          categoria: String(product.categoria || '-').slice(0, 21),
          stock: product.stock == null ? 'No disponible' : String(product.stock),
          minimo: product.minimo == null ? 'No configurado' : String(product.minimo),
          unidad: String(product.unidad || '-').slice(0, 10),
          estado: product.stock == null ? 'Stock no disponible' : product.bajoMinimo ? 'Bajo' : product.minimoConfigurado ? 'Normal' : 'Mínimo no configurado',
        }
        columns.forEach((column) => {
          const value = values[column.key]
          if (column.key === 'estado' && product.bajoMinimo) doc.setTextColor(180, 83, 9)
          else doc.setTextColor(51, 65, 85)
          doc.text(value, column.x, y, { maxWidth: column.width })
        })
      })

      doc.setFontSize(8)
      doc.setTextColor(120, 135, 145)
      doc.text(`Página ${Math.floor(offset / rowsPerPage) + 1}`, pageWidth - 65, pageHeight - 24)
    }

    const buffer = Buffer.from(doc.output('arraybuffer'))
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', 'attachment; filename="reporte_inventario_actual.pdf"')
    return res.send(buffer)
  } catch (error) {
    console.error('Error al generar reporte de inventario:', error)
    return res.status(500).json({ message: 'No fue posible generar el reporte de inventario.' })
  }
}
