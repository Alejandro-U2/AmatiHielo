import { getAccessToken } from './authService'

import { API_URL as configuredApiUrl } from './apiUrl'

const API_URL = (configuredApiUrl || 'http://localhost:3001').replace(/\/$/, '')

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
    productoId: row.producto_id ?? row.producto?.id ?? null,
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
  const cantidad = Math.abs(Number(row.cantidad || 0))
  const rawCosto = Number(row.costo_unitario_movimiento ?? row.costo_unitario ?? row.costoUnitario ?? 0)
  const fallbackCosto = Number(row.producto?.costo_unitario ?? row.producto?.precio_compra ?? 0)
  const costoUnitario = rawCosto > 0 ? rawCosto : fallbackCosto
  const perdidaEconomica = row.perdida_economica === null || row.perdida_economica === undefined
    ? (row.tipo === 'Merma' ? Number((cantidad * costoUnitario).toFixed(2)) : 0)
    : Number(row.perdida_economica)

  return {
    id: row.id,
    createdAt,
    fecha: formatDateTime(createdAt),
    tipo: row.tipo,
    producto: row.producto?.nombre || row.producto_nombre || row.producto || 'Producto',
    proveedor: row.proveedor?.nombre || row.proveedor_nombre || '',
    cantidad,
    usuario: row.usuario || 'Sistema',
    motivo: row.motivo_tipo ? (row.motivo ? `${row.motivo_tipo} - ${row.motivo}` : row.motivo_tipo) : (row.motivo || 'Sin motivo'),
    documentoUrl: row.documento_url || row.documentoUrl || '',
    motivoTipo: row.motivo_tipo || row.motivoTipo || '',
    fechaMovimiento: row.fecha_movimiento || row.fechaMovimiento || row.created_at,
    costoUnitario,
    perdidaEconomica,
    stockAntes: row.stock_antes === null || row.stock_antes === undefined ? null : Number(row.stock_antes),
    stockDespues: row.stock_despues === null || row.stock_despues === undefined ? null : Number(row.stock_despues),
  }
}

function normalizeProveedor(row) {
  return {
    id: row.id,
    codigo: row.codigo || '',
    nombre: row.nombre || '',
    nit: row.nit || '',
    telefono: row.telefono || '',
    correo: row.correo || '',
    activo: Boolean(row.activo ?? true),
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

export async function listMotivosMerma() {
  const payload = await request('/api/inventario/motivos-merma')
  return (payload?.data || []).map((row) => ({
    id: row.id,
    codigo: row.codigo,
    nombre: row.nombre,
    descripcion: row.descripcion || '',
  }))
}

export async function listMovimientosInventario({ tipo, desde, hasta } = {}) {
  const query = new URLSearchParams()
  if (tipo) query.set('tipo', tipo)
  if (desde) query.set('desde', desde)
  if (hasta) query.set('hasta', hasta)
  const queryString = query.toString()
  const payload = await request(`/api/inventario/movimiento${queryString ? `?${queryString}` : ''}`)
  return (payload?.data || []).map(normalizeMovimiento)
}

export async function listProveedoresInventario() {
  const payload = await request('/api/inventario/proveedor')
  return (payload?.data || []).map(normalizeProveedor)
}

export async function createProveedorInventario(input) {
  const payload = await request('/api/inventario/proveedor', {
    method: 'POST',
    body: input,
  })
  return normalizeProveedor(payload?.data || {})
}

export async function updateProveedorInventario(id, input) {
  const payload = await request(`/api/inventario/proveedor/${id}`, {
    method: 'PUT',
    body: input,
  })
  return normalizeProveedor(payload?.data || {})
}

export async function deleteProveedorInventario(id) {
  await request(`/api/inventario/proveedor/${id}`, {
    method: 'DELETE',
  })
}

export async function createMovimientoInventario(input) {
  const payload = await request('/api/inventario/movimiento', {
    method: 'POST',
    body: input,
  })

  return normalizeMovimiento(payload?.data || {})
}

export async function uploadEntradaInventarioDocumento(file) {
  if (!file) return null
  const extension = file.name.includes('.') ? file.name.split('.').pop().toLowerCase() : 'bin'
  const bytes = new Uint8Array(await file.arrayBuffer())
  let binary = ''
  bytes.forEach((byte) => { binary += String.fromCharCode(byte) })
  const payload = await request('/api/inventario/entrada/documento', {
    method: 'POST',
    body: { contenido: btoa(binary), tipo: file.type, extension },
  })
  return payload?.data?.path || null
}

export async function createEntradaInventario(input) {
  const payload = await request('/api/inventario/entrada', {
    method: 'POST',
    body: input,
  })
  return payload?.data || {}
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
