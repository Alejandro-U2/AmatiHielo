export function normalizeChatText(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

export function compactChatText(value) {
  return normalizeChatText(value).replace(/[^a-z0-9]/g, '')
}

export function isProductReferenceQuery(value) {
  return /\b(hielo|bolsa|bolsas|barra|libras?|lb)\b|\b\d+\s*(?:lb|lbs|libras?)?\b/.test(normalizeChatText(value))
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
    return 'Reportes disponibles en AMATI HIELO:\n1. Reporte de Ventas Diario\n2. Reporte de Inventario\n3. Reporte de Producción\n4. Reporte de Cierre de Caja\n5. Predicciones IA - Semanal\n6. Reporte de Ventas Mensual\n\nPuedes generarlos en PDF o Excel desde el módulo Reportes. Desde este chat también puedes solicitar cualquiera de los seis reportes indicando: Generar reporte de ventas, inventario, producción, cierre de caja, predicciones IA o ventas mensual.'
  }
  if (/^(hola|buenos dias|buenas tardes|buenas noches)[!. ]*$/.test(normalized)) {
    return '¿Qué necesitas consultar sobre clima, ventas, inventario o reportes?'
  }
  if (/^gracias[!. ]*$/.test(normalized)) return 'A la orden.'

  const operational = /(clima|tiempo|temperatura|pronost|venta|vender|predic|demanda|inventario|stock|existenc|producto|reporte|informe|movimiento|kardex|produccion|despacho|ruta|merma|hielo|bolsas?|barra|libras?|\blb\b|materia prima|recomend)/.test(normalized)
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
  if (/(venta|ventas|vender|predic|demanda)/.test(text)) return 'sales'
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
  const waitingForDetails = /(que producto deseas consultar|para que fecha deseas|que tipo de reporte deseas|que periodo deseas)/.test(assistantText)
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
