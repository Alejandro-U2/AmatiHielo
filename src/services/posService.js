import { getAccessToken } from './authService'
import { API_URL as configuredApiUrl } from './apiUrl'

const API_URL = configuredApiUrl.replace(/\/$/, '')

async function request(path, options = {}) {
  const token = getAccessToken()

  if (!token) {
    throw new Error('No hay sesión activa para registrar ventas.')
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
    throw new Error('No se pudo conectar con el backend de POS.')
  }

  let payload = null
  try {
    payload = await response.json()
  } catch {
    payload = null
  }

  if (!response.ok) {
    throw new Error(payload?.message || 'No fue posible procesar la venta.')
  }

  return payload
}

function normalizeVenta(row = {}) {
  const createdAt = row.createdAt ?? row.created_at
  const detalles = row.detalles || row.venta_pos_detalle || []

  return {
    id: row.id,
    ticket: row.ticket,
    cliente: row.cliente || 'Cliente General',
    metodoPago: row.metodoPago ?? row.metodo_pago ?? 'Efectivo',
    subtotal: Number(row.subtotal || 0),
    iva: Number(row.iva || 0),
    total: Number(row.total || 0),
    usuario: row.usuario || 'Sistema',
    createdAt,
    necesitaFactura: Boolean(row.necesitaFactura ?? row.necesita_factura),
    nit: row.nit || '',
    nombreCliente: row.nombreCliente ?? row.nombre_cliente ?? '',
    numeroTelefono: row.numeroTelefono ?? row.numero_telefono ?? '',
    detalles: detalles.map((detalle) => ({
      id: detalle.id,
      recetaId: detalle.recetaId ?? detalle.receta_id,
      codigo: detalle.codigo || detalle.receta?.codigo || '',
      nombre: detalle.nombre || detalle.receta?.nombre || 'Producto de venta',
      presentacion: detalle.presentacion || detalle.receta?.presentacion || '',
      cantidad: Number(detalle.cantidad || 0),
      precioUnitario: Number(detalle.precioUnitario ?? detalle.precio_unitario ?? 0),
      total: Number(detalle.total || 0),
    })),
    fecha: createdAt
      ? new Date(createdAt).toLocaleString('es-GT', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        })
      : 'Sin registro',
  }
}

export async function listVentasPos({ desde, hasta, todos = false } = {}) {
  const query = new URLSearchParams()
  if (desde) query.set('desde', desde)
  if (hasta) query.set('hasta', hasta)
  if (todos) query.set('todos', 'true')
  const queryString = query.toString()
  const payload = await request(`/api/pos/venta${queryString ? `?${queryString}` : ''}`)
  return (payload?.data || []).map(normalizeVenta)
}

export async function listMetodosPago() {
  const payload = await request('/api/pos/metodos-pago')
  return (payload?.data || []).map((row) => ({
    id: row.id,
    nombre: row.nombre,
    descripcion: row.descripcion || '',
    activo: Boolean(row.activo),
    esSistema: Boolean(row.es_sistema ?? row.esSistema),
    orden: Number(row.orden || 0),
  }))
}

function normalizeCliente(row = {}) {
  return {
    id: row.id,
    codigo: row.codigo || '',
    nombre: row.nombre || '',
    nit: row.nit || '',
    telefono: row.telefono || '',
    correo: row.correo || '',
    direccion: row.direccion || '',
    activo: Boolean(row.activo ?? true),
  }
}

export async function listClientesPos() {
  const payload = await request('/api/pos/clientes')
  return (payload?.data || []).map(normalizeCliente)
}

export async function createClientePos(input) {
  const payload = await request('/api/pos/clientes', {
    method: 'POST',
    body: input,
  })
  return normalizeCliente(payload?.data || {})
}

export async function updateClientePos(id, input) {
  const payload = await request(`/api/pos/clientes/${id}`, {
    method: 'PATCH',
    body: input,
  })
  return normalizeCliente(payload?.data || {})
}

export async function createVentaPos(input) {
  const payload = await request('/api/pos/venta', {
    method: 'POST',
    body: input,
  })

  return normalizeVenta(payload?.data || {})
}
