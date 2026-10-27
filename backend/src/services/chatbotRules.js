export function normalizeChatText(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

export function compactChatText(value) {
  return normalizeChatText(value).replace(/[^a-z0-9]/g, '')
}

export function isProductReferenceQuery(value) {
  return /\b(hielo|bolsa|bolsas|barra|libras?|lb)\b|\b\d+\s*(?:lb|lbs|libras?)?\b/.test(normalizeChatText(value))
}

export const MONTH_NAMES = 'enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre'
export const DAILY_CUES = new RegExp(`\\b(diari[oa]s?|hoy|ayer|dia|del dia|\\d{1,2}[/-]\\d{1,2}|20\\d{2}-\\d{2}-\d{2})\\b`, 'i')
export const MONTHLY_CUES = new RegExp(`\\b(mensual(es)?|mes|del mes|${MONTH_NAMES})\\b`, 'i')

export function isSalesReportQuery(text) {
  const normalized = normalizeChatText(text)
  return /\b(reportes?|informes?)\b/.test(normalized) && /\b(ventas?)\b/.test(normalized)
}

export function isAmbiguousSalesReport(text) {
  const normalized = normalizeChatText(text)
  if (!isSalesReportQuery(normalized)) return false
  const hasDaily = DAILY_CUES.test(normalized)
  const hasMonthly = MONTHLY_CUES.test(normalized)
  return !hasDaily && !hasMonthly
}

export function getFixedChatReply(value, role) {
  const normalized = normalizeChatText(value)
  if (/(prompt|instrucciones internas|api.?keys?|credenciales|password|contrasena|service role|\bsql\b|tokens? de acceso|estructura de la base|tablas internas|datos de otros usuarios)/.test(normalized)) {
    return 'No puedo proporcionar información interna del sistema.'
  }
  if (/(que puedes hacer|que sabes hacer|ayuda|funciones disponibles)/.test(normalized)) {
    if (!canRoleUseChatbotIntent(role, 'sales')) {
      return 'Puedo ayudarte con inventario, existencias y productos bajo mínimo.'
    }
    return 'Puedo ayudarte con:\nClima de los próximos 7 días\nPredicción de ventas\nInventario y productos bajo mínimo\nReportes de ventas, inventario y producción'
  }
  if (/(que reportes|reportes disponibles|que informes|informes disponibles|reportes tiene|informes tiene)/.test(normalized)) {
    if (!canRoleUseChatbotIntent(role, 'report')) {
      return 'Puedes consultar el Reporte de Inventario desde el módulo Reportes.'
    }
    return 'Puedes generar Reporte de Ventas Diario o mensual, Reporte de Cierre de Caja, inventario, catálogo de artículos, movimientos de bodega (entradas, salidas o mermas), proveedores, recetas de venta, usuarios (activos o inactivos) y clientes frecuentes en PDF o Excel. También están disponibles los reportes actuales de producción e IA. Indica el tipo de reporte y el filtro que necesitas.'
  }
  if (/^(hola|buenos dias|buenas tardes|buenas noches)[!. ]*$/.test(normalized)) {
    return '¿Qué necesitas consultar sobre clima, ventas, inventario o reportes?'
  }
  if (/^gracias[!. ]*$/.test(normalized)) return 'A la orden.'

  const operational = /(clima|tiempo|temperatura|pronost|ventas?|vender|vend|predic|demanda|inventario|stock|existenc|producto|reporte|informe|movimiento|kardex|produccion|despacho|ruta|merma|hielo|bolsas?|barra|libras?|\blb\b|materia prima|recomend)/.test(normalized)
  const followUp = /(por que|porque|explicame|explicalo|mas detalle|mas informacion|detalla)/.test(normalized)
  if ((!operational && !followUp) || /(mundial|quien gano|partido|noticias|presidente|capital de|pelicula|receta de cocina|poema)/.test(normalized)) {
    return 'Estoy enfocado en clima, ventas, inventario y reportes de AMATI HIELO. Puedo ayudarte con cualquiera de esas opciones.'
  }
  return null
}

export function isConfirmedReportRequest(message, previousAssistantMessage) {
  return /^(si|adelante|generalo|generar reporte)[!. ]*$/.test(normalizeChatText(message))
    && /deseas generarlo/.test(normalizeChatText(previousAssistantMessage))
}

export function detectChatbotIntent(value) {
  const text = normalizeChatText(value)
  if (/(clima|tiempo|temperatura|lluv|pronost|calor|frio)/.test(text)) return 'weather'
  if (/(reporte|reportes|generar informe)/.test(text)) return 'report'
  if (/(movimiento|entrada|salida|kardex)/.test(text)) return 'movements'
  if (/(ventas?|vender|vend|predic|demanda)/.test(text)) return 'sales'
  if (/(stock|inventario|existencia|materia prima|producto disponible|hielo|producto|bolsa|barra|libras?|\blb\b)/.test(text)) return 'stock'
  return 'general'
}

const AI_RESTRICTED_INTENTS = new Set(['weather', 'sales', 'report'])
const AI_ALLOWED_ROLES = new Set(['admin', 'administrador', 'superadmin', 'superusuario'])

export function canRoleUseChatbotIntent(role, intent) {
  if (!AI_RESTRICTED_INTENTS.has(intent)) return true
  return AI_ALLOWED_ROLES.has(normalizeChatText(role).trim())
}

export function isBelowConfiguredMinimum(stock, minimum) {
  const quantity = Number(stock)
  const threshold = Number(minimum)
  return stock != null && minimum != null
    && Number.isFinite(quantity) && Number.isFinite(threshold)
    && threshold > 0 && quantity < threshold
}

export function findProductMatches(query, products) {
  const normalized = normalizeChatText(query)
  const compactQuery = compactChatText(query)
  const hasProductCue = /\b(hielo|bolsa|bolsas|barra|libras?|lb)\b/.test(normalized)
  const requestedSizes = [...normalized.matchAll(/\b(\d+(?:[.,]\d+)?)\s*(?:lb|lbs|libras?)?\b/g)].map((match) => match[1].replace(',', '.'))

  return (products || []).filter((product) => {
    const name = String(product.nombre || product.producto || '')
    const compactName = compactChatText(name)
    if (compactName && compactQuery.includes(compactName)) return true

    const normalizedName = normalizeChatText(name)
    const nameSizes = [...normalizedName.matchAll(/\b(\d+(?:[.,]\d+)?)\s*(?:lb|lbs|libras?)\b/g)].map((match) => match[1].replace(',', '.'))
    if (nameSizes.some((size) => requestedSizes.includes(size)) && hasProductCue) return true

    return hasProductCue && !requestedSizes.length && /(hielo|bolsa|barra)/.test(normalized)
      && /(hielo|bolsa|barra)/.test(normalizedName)
  })
}

const weekdays = 'domingo|lunes|martes|miercoles|jueves|viernes|sabado'
const removeDateReferences = (value) => value
  .replace(new RegExp(`\\b(hoy|manana|${weekdays})\\b`, 'gi'), ' ')
  .replace(/\b20\d{2}-\d{2}-\d{2}\b/g, ' ')
  .replace(/\b\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?\b/g, ' ')

export function resolveConversationQuery(message, history) {
  const current = String(message || '').trim()
  if (!Array.isArray(history) || !history.length) return current

  const previous = history.slice(-4)
  const lastAssistant = [...previous].reverse().find((item) => item?.role === 'assistant')
  const assistantText = normalizeChatText(lastAssistant?.content || '')
  const waitingForDetails = /(que producto deseas consultar|para que fecha deseas|que tipo de reporte deseas|que periodo deseas|deseas el reporte de venta diaria|de que fecha deseas consultar las ventas|cual producto deseas)/.test(assistantText)
  const userMessages = previous.filter((item) => item?.role === 'user' && typeof item.content === 'string')

  if (waitingForDetails) return [...userMessages.map((item) => item.content), current].join(' ')
  if (!lastAssistant || !userMessages.length) return current

  const normalizedCurrent = normalizeChatText(current).replace(/[¿?¡!,.:;]/g, ' ').replace(/\s+/g, ' ').trim()
  const isFollowUp = new RegExp(`^(?:y\\s+)?(?:(?:para\\s+)?(?:(?:el|la)(?:\\s+de)?\\s+)?)?(?:${weekdays}|hoy|manana|\\d{1,2}[/-]\\d{1,2}|\\d+\\s*(?:lb|lbs|libras?))$`).test(normalizedCurrent)
  if (!isFollowUp) return current

  const priorQuery = userMessages[userMessages.length - 1].content
  const retainedContext = removeDateReferences(priorQuery).replace(/\s+/g, ' ').trim()
  return `${retainedContext} ${current}`.trim()
}
