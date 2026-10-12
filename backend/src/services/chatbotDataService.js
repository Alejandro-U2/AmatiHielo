import { supabaseAdmin } from '../config/supabaseAdmin.js'
import { detectChatbotIntent, isBelowConfiguredMinimum } from './chatbotRules.js'

const DEFAULT_LATITUDE = Number(process.env.WEATHER_LATITUDE || 14.478381)
const DEFAULT_LONGITUDE = Number(process.env.WEATHER_LONGITUDE || -90.620385)

function startOfDay(date) {
  const value = new Date(date)
  value.setHours(0, 0, 0, 0)
  return value
}

function addDays(date, amount) {
  const value = new Date(date)
  value.setDate(value.getDate() + amount)
  return value
}

function isoDate(date) {
  return date.toISOString().slice(0, 10)
}

function resolveForecastRequest(message, availableDates) {
  const normalized = message.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  const explicitDate = normalized.match(/\b(20\d{2}-\d{2}-\d{2})\b/)
  if (explicitDate) return { date: explicitDate[1], matched: true }

  const numericDate = normalized.match(/\b(\d{1,2})[/-](\d{1,2})(?:[/-](20\d{2}))?\b/)
  const monthNames = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
  const wordDate = normalized.match(new RegExp(`\\b(\\d{1,2})\\s+de\\s+(${monthNames.join('|')})\\b`))
  const dateParts = numericDate
    ? { day: Number(numericDate[1]), month: Number(numericDate[2]), year: Number(numericDate[3] || new Date().getFullYear()) }
    : wordDate
      ? { day: Number(wordDate[1]), month: monthNames.indexOf(wordDate[2]) + 1, year: new Date().getFullYear() }
      : null
  if (dateParts) {
    const parsed = new Date(Date.UTC(dateParts.year, dateParts.month - 1, dateParts.day))
    if (parsed.getUTCDate() === dateParts.day && parsed.getUTCMonth() === dateParts.month - 1) {
      return { date: parsed.toISOString().slice(0, 10), matched: true }
    }
  }

  const weekdayNames = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado']
  const requestedWeekday = weekdayNames.find((name) => new RegExp(`\\b${name}\\b`).test(normalized))
  if (!requestedWeekday) return { date: null, matched: false }

  const date = availableDates.find((value) => weekdayNames[new Date(`${value}T12:00:00`).getDay()] === requestedWeekday)
  return { date: date || null, matched: true }
}

async function getWeatherContext(message) {
  const params = new URLSearchParams({
    latitude: String(DEFAULT_LATITUDE),
    longitude: String(DEFAULT_LONGITUDE),
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max',
    forecast_days: '7',
    timezone: 'auto',
  })
  const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`)
  if (!response.ok) throw new Error('No fue posible consultar el clima.')
  const payload = await response.json()
  const days = (payload.daily?.time || []).map((date, index) => ({
    fecha: date,
    temperaturaMaxima: payload.daily?.temperature_2m_max?.[index],
    temperaturaMinima: payload.daily?.temperature_2m_min?.[index],
    probabilidadLluvia: payload.daily?.precipitation_probability_max?.[index],
    codigoClima: payload.daily?.weather_code?.[index],
  }))
  const requested = resolveForecastRequest(message, days.map((day) => day.fecha))

  if (requested.matched && !days.some((day) => day.fecha === requested.date)) {
    return {
      validacion: 'Solo puedo consultar el pronóstico de los próximos 7 días.',
      dias: [],
    }
  }

  return {
    fuente: 'Open-Meteo',
    ubicacion: { latitud: DEFAULT_LATITUDE, longitud: DEFAULT_LONGITUDE },
    dias: requested.date ? days.filter((day) => day.fecha === requested.date) : days,
  }
}

export async function getInventorySnapshot() {
  const { data, error } = await supabaseAdmin
    .from('producto')
    .select('id, codigo, nombre, categoria, stock, minimo, unidad, estado')
    .order('nombre', { ascending: true })

  if (error) throw new Error(error.message || 'No fue posible consultar el inventario.')
  const products = data || []
  return {
    fuente: 'Supabase.producto',
    totalProductos: products.length,
    productos: products.map((product) => {
      const stock = product.stock == null ? null : Number(product.stock)
      const minimo = product.minimo == null ? null : Number(product.minimo)
      return {
        codigo: product.codigo,
        nombre: product.nombre,
        categoria: product.categoria,
        stock: Number.isFinite(stock) ? stock : null,
        minimo: Number.isFinite(minimo) ? minimo : null,
        minimoConfigurado: product.minimo != null && Number.isFinite(Number(product.minimo)),
        unidad: product.unidad,
        estado: product.estado,
        bajoMinimo: isBelowConfiguredMinimum(stock, minimo),
      }
    }),
  }
}

async function getMovementsContext(message) {
  const today = startOfDay(new Date())
  const from = addDays(today, -30)
  const { data, error } = await supabaseAdmin
    .from('movimiento_inventario')
    .select('producto_id, tipo, cantidad, motivo, usuario, created_at, producto:producto_id(nombre, codigo)')
    .gte('created_at', from.toISOString())
    .lt('created_at', addDays(today, 1).toISOString())
    .order('created_at', { ascending: false })
    .limit(500)

  if (error) throw new Error(error.message || 'No fue posible consultar movimientos.')
  return {
    fuente: 'Supabase.movimiento_inventario',
    periodo: { desde: isoDate(from), hasta: isoDate(today) },
    movimientos: (data || []).map((item) => ({
      fecha: item.created_at,
      tipo: item.tipo,
      cantidad: Number(item.cantidad || 0),
      producto: item.producto?.nombre || item.producto?.codigo || item.producto_id,
      motivo: item.motivo,
      usuario: item.usuario,
    })),
    nota: 'Se consultaron los últimos 30 días. Si necesitas otro rango, indícalo con fechas.',
    consulta: message,
  }
}

function normalizeText(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

function compactText(value) {
  return normalizeText(value).replace(/[^a-z0-9]/g, '')
}

function getNextRequestedDate(message, today) {
  const weekdayNames = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado']
  const normalized = normalizeText(message)
  if (/\bhoy\b/.test(normalized)) return new Date(today)
  if (/\bmanana\b/.test(normalized)) return addDays(today, 1)
  const isoDateMatch = normalized.match(/\b(20\d{2})-(\d{2})-(\d{2})\b/)
  const regionalDateMatch = normalized.match(/\b(\d{1,2})[/-](\d{1,2})(?:[/-](20\d{2}))?\b/)
  const dateParts = isoDateMatch
    ? { year: Number(isoDateMatch[1]), month: Number(isoDateMatch[2]), day: Number(isoDateMatch[3]) }
    : regionalDateMatch
      ? { year: Number(regionalDateMatch[3] || today.getFullYear()), month: Number(regionalDateMatch[2]), day: Number(regionalDateMatch[1]) }
      : null
  if (dateParts) {
    const requestedDate = new Date(dateParts.year, dateParts.month - 1, dateParts.day)
    if (requestedDate.getFullYear() === dateParts.year && requestedDate.getMonth() === dateParts.month - 1 && requestedDate.getDate() === dateParts.day) {
      return startOfDay(requestedDate)
    }
  }
  const requestedWeekday = weekdayNames.find((weekday) => new RegExp(`\\b${weekday}\\b`).test(normalized))
  const target = new Date(today)
  target.setDate(target.getDate() + 1)
  if (requestedWeekday) {
    while (weekdayNames[target.getDay()] !== requestedWeekday) target.setDate(target.getDate() + 1)
  }
  return target
}

async function getSalesContext(message) {
  const today = startOfDay(new Date())
  const from = addDays(today, -27)
  const targetDate = getNextRequestedDate(message, today)
  const { data, error } = await supabaseAdmin
    .from('venta_pos_detalle')
    .select('cantidad, total, created_at, receta:receta_id(nombre, codigo)')
    .gte('created_at', from.toISOString())
    .lt('created_at', addDays(today, 1).toISOString())
    .order('created_at', { ascending: true })

  if (error) throw new Error(error.message || 'No fue posible consultar ventas.')
  const rows = data || []
  const byProduct = new Map()
  const dailySales = new Map()
  rows.forEach((row) => {
    const name = row.receta?.nombre || row.receta?.codigo || 'Producto'
    const date = String(row.created_at).slice(0, 10)
    const daily = dailySales.get(date) || { unidades: 0, ingresos: 0, porProducto: new Map() }
    const quantity = Number(row.cantidad || 0)
    const total = Number(row.total || 0)
    daily.unidades += quantity
    daily.ingresos += total
    daily.porProducto.set(name, (daily.porProducto.get(name) || 0) + quantity)
    dailySales.set(date, daily)
    if (!byProduct.has(name)) byProduct.set(name, new Map())
    const byDate = byProduct.get(name)
    byDate.set(date, (byDate.get(date) || 0) + quantity)
  })

  const requestedProduct = normalizeText(message)
  const compactRequest = compactText(requestedProduct)
  const matchingProducts = [...byProduct.entries()].filter(([name]) => compactRequest.includes(compactText(name)))
  const selectedProducts = matchingProducts.length ? matchingProducts : [...byProduct.entries()]
  const targetIso = isoDate(targetDate)
  const requestedDay = dailySales.get(targetIso)
  const ventasDelDia = {
    fecha: targetIso,
    unidades: requestedDay?.unidades || 0,
    ingresos: requestedDay?.ingresos || 0,
    porProducto: Object.fromEntries(requestedDay
      ? [...requestedDay.porProducto.entries()].map(([producto, unidades]) => [producto, unidades])
      : []),
  }
  const predictions = selectedProducts.slice(0, 20).map(([product, byDate]) => {
    const references = [1, 2, 3, 4].map((weeksAgo) => {
      const sampleDate = addDays(targetDate, -7 * weeksAgo)
      return { fecha: isoDate(sampleDate), unidades: Number(byDate.get(isoDate(sampleDate)) || 0) }
    })
    const average = references.reduce((total, item) => total + item.unidades, 0) / references.length
    const positiveDays = references.filter((item) => item.unidades > 0).length
    const deviation = Math.sqrt(references.reduce((total, item) => total + (item.unidades - average) ** 2, 0) / references.length)
    const consistency = average > 0 ? Math.max(0, 1 - deviation / average) : 0
    const confidence = positiveDays ? Math.round((positiveDays / references.length) * (55 + 45 * consistency)) : 0
    return {
      producto: product,
      fechaObjetivo: targetIso,
      prediccionUnidades: Math.round(average),
      ventasReferencia: references,
      diasConVentas: positiveDays,
      confianzaPorcentaje: confidence,
    }
  })

  return {
    fuente: 'Supabase.venta_pos_detalle',
    historialConsultado: { desde: isoDate(from), hasta: isoDate(today) },
    ventasDelDia,
    predicciones: predictions,
    nota: 'Estimación calculada en backend con el promedio de ventas reales del mismo día de semana durante las últimas cuatro semanas. Confianza basada en cobertura y variación de esa muestra; no incluye clima.',
  }
}

export async function buildChatbotContext(message) {
  const intent = detectChatbotIntent(message)
  if (intent === 'weather') {
    const datos = await getWeatherContext(message)
    return datos.validacion
      ? { intencion: intent, validacion: datos.validacion, datos }
      : { intencion: intent, datos }
  }
  if (intent === 'report') return { intencion: intent, datos: await getInventorySnapshot() }
  if (intent === 'stock') return { intencion: intent, datos: await getInventorySnapshot() }
  if (intent === 'movements') return { intencion: intent, datos: await getMovementsContext(message) }
  if (intent === 'sales') return { intencion: intent, datos: await getSalesContext(message) }
  return {
    intencion: 'general',
    datos: {},
    nota: 'No se detectó una consulta de datos. Pide clima, predicción de ventas, stock o movimientos.',
  }
}
