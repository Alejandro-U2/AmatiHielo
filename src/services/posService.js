import { getAccessToken } from './authService'

const API_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

async function request(path, options = {}) {
  if (!API_URL) {
    throw new Error('Falta configurar VITE_API_URL para POS.')
  }

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

export async function listVentasPos() {
  const payload = await request('/api/pos/venta')
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

export async function createVentaPos(input) {
  const payload = await request('/api/pos/venta', {
    method: 'POST',
    body: input,
  })

  return normalizeVenta(payload?.data || {})
}
