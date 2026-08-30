import { getAccessToken } from './authService'

const API_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

function formatDateTime(value) {
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

async function request(path, options = {}) {
  if (!API_URL) {
    throw new Error('Falta configurar VITE_API_URL para inventario.')
  }

  const token = getAccessToken()

  if (!token) {
    throw new Error('No hay sesión activa para consultar inventario.')
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
    throw new Error('No se pudo conectar con el backend de inventario.')
  }

  let payload = null
  try {
    payload = await response.json()
  } catch {
    payload = null
  }

  if (!response.ok) {
    throw new Error(payload?.message || 'No fue posible cargar inventario.')
  }

  return payload
}

function normalizeCategoria(row) {
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

function normalizeProducto(row) {
  const cantidadCompra = Number(row.cantidad_compra ?? row.cantidadCompra ?? 1)
  const precioPaquete = Number(row.precio_paquete ?? row.precioPaquete ?? 0)
  const precioCompra = Number(row.precio_compra ?? row.precioCompra ?? row.costo_unitario ?? row.costoUnitario ?? (cantidadCompra > 0 ? precioPaquete / cantidadCompra : 0))
  const precioVenta = Number(row.precio_venta ?? row.precioVenta ?? 0)

  return {
    id: row.id,
    codigo: row.codigo,
    nombre: row.nombre,
    categoria: row.categoria,
    stock: Number(row.stock || 0),
    minimo: Number(row.minimo || 0),
    unidad: row.unidad,
    cantidadCompra,
    cantidad_compra: cantidadCompra,
    precioPaquete,
    precio_paquete: precioPaquete,
    costoUnitario: Number(row.costo_unitario ?? row.costoUnitario ?? precioCompra),
    costo_unitario: Number(row.costo_unitario ?? row.costoUnitario ?? precioCompra),
    precioCompra,
    precio_compra: precioCompra,
    precioVenta,
    precio_venta: precioVenta,
    estado: row.estado || 'normal',
  }
}

function normalizeMovimiento(row) {
  const createdAt = row.createdAt ?? row.created_at ?? row.fecha

  return {
    id: row.id,
    createdAt,
    fecha: formatDateTime(createdAt),
    tipo: row.tipo,
    producto: row.producto?.nombre || row.producto_nombre || row.producto || 'Producto',
    cantidad: Number(row.cantidad || 0),
    usuario: row.usuario || 'Sistema',
    motivo: row.motivo || 'Sin motivo',
  }
}

export async function listProductosInventario() {
  const payload = await request('/api/inventario/producto')
  return (payload?.data || []).map(normalizeProducto)
}

export async function listCategoriasInventario() {
  const payload = await request('/api/inventario/categorias')
  return (payload?.data || []).map(normalizeCategoria)
}

export async function listTiposMovimiento() {
  const payload = await request('/api/inventario/tipos-movimiento')
  return (payload?.data || []).map((row) => ({
    id: row.id,
    codigo: row.codigo,
    nombre: row.nombre,
    descripcion: row.descripcion || '',
    activo: Boolean(row.activo),
    esSistema: Boolean(row.es_sistema ?? row.esSistema),
    orden: Number(row.orden || 0),
  }))
}

export async function listMovimientosInventario() {
  const payload = await request('/api/inventario/movimiento')
  return (payload?.data || []).map(normalizeMovimiento)
}

export async function createMovimientoInventario(input) {
  const payload = await request('/api/inventario/movimiento', {
    method: 'POST',
    body: input,
  })

  return normalizeMovimiento(payload?.data || {})
}

export async function createProductoInventario(input) {
  const payload = await request('/api/inventario/producto', {
    method: 'POST',
    body: input,
  })

  return normalizeProducto(payload?.data || {})
}

export async function updateProductoInventario(id, input) {
  const payload = await request(`/api/inventario/producto/${id}`, {
    method: 'PUT',
    body: input,
  })

  return normalizeProducto(payload?.data || {})
}

export async function deleteProductoInventario(id) {
  await request(`/api/inventario/producto/${id}`, {
    method: 'DELETE',
  })
}
