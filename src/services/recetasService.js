import { getAccessToken } from './authService'
import { buildQueryString } from '../utils/queryString'
import { API_URL as configuredApiUrl } from './apiUrl'
import { notifyDataChange } from './realtimeSync'

const API_URL = configuredApiUrl.replace(/\/$/, '')

async function request(path, options = {}) {
  const token = getAccessToken()

  if (!token) {
    throw new Error('No hay sesión activa para consultar recetas.')
  }

  let response
  try {
    response = await fetch(`${API_URL}${path}`, {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...(options.headers || {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    })
  } catch {
    throw new Error('No se pudo conectar con el backend de recetas.')
  }

  let payload = null
  try {
    payload = await response.json()
  } catch {
    payload = null
  }

  if (!response.ok) {
    throw new Error(payload?.message || 'No fue posible cargar recetas.')
  }

  return payload
}

function costoIngrediente(ing) {
  const cantidad = Number(ing.cantidad || 0)
  const costoUnitario = Number(ing.costo_unitario ?? ing.costoUnitario ?? 0)
  const contenidoTotal = Number(ing.contenido_total ?? ing.contenidoTotal ?? 0)

  if (contenidoTotal > 0) {
    const costoPorUnidad = costoUnitario / contenidoTotal
    return cantidad * costoPorUnidad
  }

  return cantidad * costoUnitario
}

function normalizeReceta(row) {
  const ingredientes = (row.ingredientes || []).map((ing) => {
    const cantidad = Number(ing.cantidad || 0)
    const costoUnitario = Number(ing.costo_unitario ?? ing.costoUnitario ?? 0)
    const contenidoTotal = Number(ing.contenido_total ?? ing.contenidoTotal ?? 0)
    return {
      id: ing.id,
      recetaId: ing.receta_id ?? ing.recetaId,
      productoId: ing.producto_id ?? ing.productoId ?? null,
      nombre: ing.nombre,
      cantidad,
      unidad: ing.unidad,
      costoUnitario,
      contenidoTotal,
      costoTotal: costoIngrediente(ing),
      createdAt: ing.created_at ?? ing.createdAt,
    }
  })

  const costoElectricidad = Number(row.costo_electricidad ?? row.costoElectricidad ?? 0)
  const costoManoObra = Number(row.costo_mano_obra ?? row.costoManoObra ?? 0)
  const costoAgua = Number(row.costo_agua ?? row.costoAgua ?? 0)
  const costoLocal = Number(row.costo_local ?? row.costoLocal ?? 0)
  const costosProduccionCalc = costoElectricidad + costoManoObra + costoAgua + costoLocal

  const subtotalMateriaPrima = Number(row.subtotal_materia_prima ?? row.subtotalMateriaPrima) || ingredientes.reduce((sum, ing) => sum + ing.costoTotal, 0)
  const costosProduccion = Number(row.costos_produccion ?? row.costosProduccion) || costosProduccionCalc
  const costoTotal = Number(row.costo_total ?? row.costoTotal) || (subtotalMateriaPrima + costosProduccion)
  const precioVenta = Number(row.precio_sugerido ?? row.precioSugerido ?? 0)
  const utilidad = precioVenta - costoTotal
  const margen = precioVenta > 0 ? (utilidad / precioVenta) * 100 : 0

  const cachedImg = typeof localStorage !== 'undefined' && row.codigo
    ? localStorage.getItem(`amati_receta_img_${row.codigo}`)
    : null
  const imagenUrl = row.imagen_url || row.imagenUrl || cachedImg || null

  return {
    id: row.id,
    codigo: row.codigo,
    nombre: row.nombre,
    categoria: row.categoria || 'Bebidas',
    presentacion: row.presentacion,
    imagenUrl,
    costoElectricidad,
    costoManoObra,
    costoAgua,
    costoLocal,
    costosProduccion,
    subtotalMateriaPrima,
    costoTotal,
    precioVenta,
    precioSugerido: precioVenta,
    utilidad,
    margen,
    ingredientes,
    createdAt: row.created_at,
  }
}

function normalizeIngrediente(row) {
  const cantidad = Number(row.cantidad || 0)
  const costoUnitario = Number(row.costo_unitario ?? row.costoUnitario ?? 0)
  const contenidoTotal = Number(row.contenido_total ?? row.contenidoTotal ?? 0)

  return {
    id: row.id,
    recetaId: row.receta_id ?? row.recetaId,
    productoId: row.producto_id ?? row.productoId ?? null,
    nombre: row.nombre,
    cantidad,
    unidad: row.unidad,
    costoUnitario,
    contenidoTotal,
    costoTotal: costoIngrediente(row),
    createdAt: row.created_at ?? row.createdAt,
  }
}

function normalizePlan(row) {
  return {
    id: row.id,
    recetaId: row.receta_id,
    cantidadPlanificada: Number(row.cantidad_planificada || 0),
    demandaProyectada: Number(row.demanda_proyectada || 0),
    createdAt: row.created_at,
  }
}

function formatFecha(value) {
  if (!value) return 'Sin registro'

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return 'Sin registro'

  return parsed.toLocaleString('es-GT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

function normalizeProduccion(row) {
  return {
    id: row.id,
    recetaId: row.receta_id,
    receta: row.receta?.nombre || row.receta || 'Sin receta',
    cantidad: Number(row.cantidad || 0),
    usuario: row.usuario,
    lote: row.lote,
    createdAt: row.created_at,
    fecha: formatFecha(row.created_at),
  }
}

export async function getRecetas(options = {}) {
  const query = options?.includeImages ? '?includeImages=true' : ''
  const payload = await request(`/api/recetas${query}`)
  return (payload?.data || []).map(normalizeReceta)
}

export async function getRecetasCount() {
  const payload = await request('/api/recetas/count')
  return payload?.count ?? 0
}

export async function listCategoriasReceta() {
  const payload = await request('/api/recetas/categorias')
  return (payload?.data || []).map(normalizeCatalogoRow)
}

function normalizeCatalogoRow(row) {
  return {
    id: row.id,
    codigo: row.codigo,
    nombre: row.nombre,
    descripcion: row.descripcion || '',
    activo: Boolean(row.activo),
    esSistema: Boolean(row.es_sistema ?? row.esSistema),
    orden: Number(row.orden || 0),
  }
}

export async function listPresentacionesReceta() {
  const payload = await request('/api/recetas/presentaciones')
  return (payload?.data || []).map(normalizeCatalogoRow)
}

export async function listUnidadesMedida() {
  const payload = await request('/api/recetas/unidades-medida')
  return (payload?.data || []).map(normalizeCatalogoRow)
}

export async function getRecetaById(id) {
  const payload = await request(`/api/recetas/${id}`)
  return normalizeReceta(payload?.data || {})
}

export async function createReceta(input) {
  const payload = await request('/api/recetas', {
    method: 'POST',
    body: input,
  })
  const receta = normalizeReceta(payload?.data || {})
  if (typeof localStorage !== 'undefined' && receta.codigo) {
    if (receta.imagenUrl && receta.imagenUrl.startsWith('http')) {
      localStorage.setItem(`amati_receta_img_${receta.codigo}`, receta.imagenUrl)
    }
  }
  notifyDataChange('recetas')
  return receta
}

export async function updateReceta(id, input) {
  const payload = await request(`/api/recetas/${id}`, {
    method: 'PUT',
    body: input,
  })
  const receta = normalizeReceta(payload?.data || {})
  if (typeof localStorage !== 'undefined' && (receta.codigo || input.codigo)) {
    const code = receta.codigo || input.codigo
    if (receta.imagenUrl && receta.imagenUrl.startsWith('http')) {
      localStorage.setItem(`amati_receta_img_${code}`, receta.imagenUrl)
    } else if (input.imagenUrl === '' || input.imagenUrl === null) {
      localStorage.removeItem(`amati_receta_img_${code}`)
      receta.imagenUrl = null
    }
  }
  notifyDataChange('recetas')
  return receta
}

export async function deleteReceta(id) {
  await request(`/api/recetas/${id}`, {
    method: 'DELETE',
  })
  notifyDataChange('recetas')
}

export async function addIngrediente(recetaId, input) {
  const payload = await request(`/api/recetas/${recetaId}/ingrediente`, {
    method: 'POST',
    body: input,
  })
  return {
    ingrediente: normalizeIngrediente(payload?.data || {}),
    receta: payload?.receta || null,
  }
}

export async function deleteIngrediente(recetaId, ingredienteId) {
  const payload = await request(`/api/recetas/${recetaId}/ingrediente/${ingredienteId}`, {
    method: 'DELETE',
  })
  return payload?.receta || null
}

export async function updateIngrediente(recetaId, ingredienteId, input) {
  const payload = await request(`/api/recetas/${recetaId}/ingrediente/${ingredienteId}`, {
    method: 'PUT',
    body: input,
  })
  return {
    ingrediente: normalizeIngrediente(payload?.data || {}),
    receta: payload?.receta || null,
  }
}

export async function getPlanesProduccion() {
  const payload = await request('/api/recetas/planes-produccion')
  return (payload?.data || []).map(normalizePlan)
}

export async function createPlanProduccion(input) {
  const payload = await request('/api/recetas/planes-produccion', {
    method: 'POST',
    body: input,
  })
  return normalizePlan(payload?.data || {})
}

export async function updatePlanProduccion(id, input) {
  const payload = await request(`/api/recetas/planes-produccion/${id}`, {
    method: 'PUT',
    body: input,
  })
  return normalizePlan(payload?.data || {})
}

export async function deletePlanProduccion(id) {
  await request(`/api/recetas/planes-produccion/${id}`, {
    method: 'DELETE',
  })
}

export async function getProducciones(params) {
  const payload = await request(`/api/recetas/producciones${buildQueryString(params)}`)
  return {
    data: (payload?.data || []).map(normalizeProduccion),
    meta: payload?.meta || null,
  }
}

export async function createProduccion(input) {
  const payload = await request('/api/recetas/producciones', {
    method: 'POST',
    body: input,
  })
  const produccion = normalizeProduccion(payload?.data || {})
  notifyDataChange('produccion')
  return produccion
}

export async function getProduccionesRango(fechaInicio, fechaFin) {
  const payload = await request('/api/recetas/producciones/rango', {
    method: 'POST',
    body: { fechaInicio, fechaFin },
  })
  return (payload?.data || []).map(normalizeProduccion)
}
