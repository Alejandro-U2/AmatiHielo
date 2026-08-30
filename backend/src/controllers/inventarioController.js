import { supabaseAdmin } from '../config/supabaseAdmin.js'

function buildErrorResponse(res, error, fallbackMessage, statusCode = 500) {
  return res.status(statusCode).json({
    message: error?.message || fallbackMessage,
  })
}

function parseOptionalNumber(value) {
  if (value === undefined || value === null || value === '') {
    return null
  }

  const parsed = Number(value)
  return Number.isNaN(parsed) ? Number.NaN : parsed
}

function calculateUnitCost({ precioCompra, cantidadCompra, precioPaquete }) {
  if (cantidadCompra !== null && precioPaquete !== null) {
    if (cantidadCompra <= 0 || precioPaquete < 0) {
      return Number.NaN
    }

    return precioPaquete / cantidadCompra
  }

  return precioCompra
}

function normalizeProductoPayload(body = {}, options = {}) {
  const { includeStock = false } = options
  const precioCompra = parseOptionalNumber(body.precioCompra ?? body.precio_compra ?? body.costoUnitario ?? body.costo_unitario)
  const cantidadCompra = parseOptionalNumber(body.cantidadCompra ?? body.cantidad_compra)
  const precioPaquete = parseOptionalNumber(body.precioPaquete ?? body.precio_paquete)
  const precioVenta = parseOptionalNumber(body.precioVenta ?? body.precio_venta)
  const minimo = parseOptionalNumber(body.minimo ?? body.stockMinimo ?? body.stock_minimo)
  const costoUnitario = calculateUnitCost({ precioCompra, cantidadCompra, precioPaquete })

  const payload = {
    codigo: body.codigo?.trim(),
    nombre: body.nombre?.trim(),
    categoria: body.categoria?.trim(),
    unidad: 'unidad',
    minimo: minimo ?? 0,
    costo_unitario: costoUnitario,
    precio_compra: costoUnitario,
    cantidad_compra: cantidadCompra,
    precio_paquete: precioPaquete,
    precio_venta: precioVenta,
    estado: 'normal',
  }

  if (includeStock) {
    payload.stock = 0
  }

  return payload
}

function isProductoPayloadValid(payload) {
  if (!payload.codigo || !payload.nombre || !payload.categoria) {
    return false
  }

  if (
    (payload.cantidad_compra === null) !== (payload.precio_paquete === null)
  ) {
    return false
  }

  if (payload.cantidad_compra !== null && payload.cantidad_compra <= 0) {
    return false
  }

  if (payload.precio_paquete !== null && payload.precio_paquete < 0) {
    return false
  }

  if (Number.isNaN(payload.precio_compra) || Number.isNaN(payload.minimo)) {
    return false
  }

  if (Number.isNaN(payload.precio_venta)) {
    return false
  }

  return true
}

function normalizeMovimientoPayload(body = {}) {
  const productoId = Number(body.productoId ?? body.producto_id)
  const unidadCompraId = Number(body.unidadCompraId ?? body.unidad_compra_id)
  const cantidad = parseOptionalNumber(body.cantidad)
  const tipo = String(body.tipo || '').trim()

  return {
    producto_id: Number.isNaN(productoId) ? null : productoId,
    unidad_compra_id: Number.isNaN(unidadCompraId) ? null : unidadCompraId,
    tipo,
    cantidad,
    motivo: body.motivo?.trim() || null,
    usuario: body.usuario?.trim() || null,
  }
}

const PRODUCTO_FIELDS = 'id, codigo, nombre, categoria, stock, minimo, unidad, cantidad_compra, precio_paquete, costo_unitario, precio_compra, precio_venta, estado, created_at, updated_at'
const CATEGORIA_FIELDS = 'id, codigo, nombre, descripcion, activo, es_sistema, orden, created_at, updated_at'
const TIPO_MOVIMIENTO_FIELDS = 'id, codigo, nombre, descripcion, activo, es_sistema, orden, created_at, updated_at'

export async function listProductos(req, res) {
  try {
    const { data, error } = await supabaseAdmin
      .from('producto')
      .select(PRODUCTO_FIELDS)
      .order('created_at', { ascending: false })

    if (error) {
      return buildErrorResponse(res, error, 'No fue posible cargar los productos.')
    }

    return res.json({ data: data || [] })
  } catch (error) {
    return buildErrorResponse(res, error, 'No fue posible cargar los productos.')
  }
}

export async function listMovimientos(req, res) {
  try {
    const { data: movimientos, error } = await supabaseAdmin
      .from('movimiento_inventario')
      .select('id, producto_id, tipo, cantidad, motivo, usuario, created_at')
      .order('created_at', { ascending: false })

    if (error) {
      return buildErrorResponse(res, error, 'No fue posible cargar los movimientos.')
    }

    if (!movimientos || movimientos.length === 0) {
      return res.json({ data: [] })
    }

    // Traer datos de productos en una segunda query
    const productoIds = [...new Set(movimientos.map(m => m.producto_id))]
    const { data: productos, error: errorProductos } = await supabaseAdmin
      .from('producto')
      .select('id, codigo, nombre')
      .in('id', productoIds)

    if (errorProductos) {
      return buildErrorResponse(res, errorProductos, 'No fue posible cargar datos de productos.')
    }

    // Mapear productos a movimientos
    const productoMap = new Map()
    ;(productos || []).forEach(p => productoMap.set(p.id, p))

    const dataWithProductos = movimientos.map(m => ({
      ...m,
      producto: productoMap.get(m.producto_id) || null,
    }))

    return res.json({ data: dataWithProductos })
  } catch (error) {
    return buildErrorResponse(res, error, 'No fue posible cargar los movimientos.')
  }
}

export async function listCategorias(req, res) {
  try {
    const { data, error } = await supabaseAdmin
      .from('catalogo_categoria_inventario')
      .select(CATEGORIA_FIELDS)
      .eq('activo', true)
      .order('orden', { ascending: true })
      .order('nombre', { ascending: true })

    if (error) {
      return buildErrorResponse(res, error, 'No fue posible cargar las categorias de inventario.')
    }

    return res.json({ data: data || [] })
  } catch (error) {
    return buildErrorResponse(res, error, 'No fue posible cargar las categorias de inventario.')
  }
}

export async function listTiposMovimiento(req, res) {
  try {
    const { data, error } = await supabaseAdmin
      .from('tipo_movimiento')
      .select(TIPO_MOVIMIENTO_FIELDS)
      .eq('activo', true)
      .order('orden', { ascending: true })
      .order('nombre', { ascending: true })

    if (error) {
      return buildErrorResponse(res, error, 'No fue posible cargar los tipos de movimiento.')
    }

    return res.json({ data: data || [] })
  } catch (error) {
    return buildErrorResponse(res, error, 'No fue posible cargar los tipos de movimiento.')
  }
}

export async function createMovimiento(req, res) {
  const payload = normalizeMovimientoPayload(req.body)

  if (!payload.producto_id || !payload.tipo || payload.cantidad === null || Number.isNaN(payload.cantidad) || payload.cantidad <= 0) {
    return res.status(400).json({
      message: 'productoId, tipo y cantidad son obligatorios.',
    })
  }

  const usuario = req.auth?.profile?.nombre || req.auth?.user?.email || payload.usuario || 'Sistema'

  try {
    const rpcArgs = {
      p_producto_id: payload.producto_id,
      p_tipo: payload.tipo,
      p_cantidad: payload.cantidad,
      p_motivo: payload.motivo,
      p_usuario: usuario,
    }

    if (payload.unidad_compra_id !== null) {
      rpcArgs.p_unidad_compra_id = payload.unidad_compra_id
    }

    const { data, error } = await supabaseAdmin.rpc('registrar_movimiento_inventario', rpcArgs)

    if (error || !data) {
      return buildErrorResponse(res, error, 'No fue posible registrar el movimiento.', 400)
    }

    const movimiento = Array.isArray(data) ? data[0] : data

    return res.status(201).json({ data: movimiento })
  } catch (error) {
    return buildErrorResponse(res, error, 'No fue posible registrar el movimiento.')
  }
}

export async function createProducto(req, res) {
  const payload = normalizeProductoPayload(req.body, { includeStock: true })

  if (!isProductoPayloadValid(payload)) {
    return res.status(400).json({
      message: 'codigo, nombre y categoria son obligatorios. Los precios son opcionales.',
    })
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('producto')
      .insert(payload)
      .select(PRODUCTO_FIELDS)
      .single()

    if (error || !data) {
      return buildErrorResponse(res, error, 'No fue posible crear el producto.', 400)
    }

    return res.status(201).json({ data })
  } catch (error) {
    return buildErrorResponse(res, error, 'No fue posible crear el producto.')
  }
}

export async function updateProducto(req, res) {
  const { id } = req.params
  const payload = normalizeProductoPayload(req.body)

  if (!id) {
    return res.status(400).json({ message: 'El id del producto es obligatorio.' })
  }

  if (!isProductoPayloadValid(payload)) {
    return res.status(400).json({
      message: 'codigo, nombre y categoria son obligatorios. Los precios son opcionales.',
    })
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('producto')
      .update(payload)
      .eq('id', id)
      .select(PRODUCTO_FIELDS)
      .single()

    if (error || !data) {
      return buildErrorResponse(res, error, 'No fue posible actualizar el producto.', 400)
    }

    return res.json({ data })
  } catch (error) {
    return buildErrorResponse(res, error, 'No fue posible actualizar el producto.')
  }
}

export async function deleteProducto(req, res) {
  const { id } = req.params

  if (!id) {
    return res.status(400).json({ message: 'El id del producto es obligatorio.' })
  }

  try {
    const { error } = await supabaseAdmin
      .from('producto')
      .delete()
      .eq('id', id)

    if (error) {
      return buildErrorResponse(res, error, 'No fue posible eliminar el producto.', 400)
    }

    return res.status(204).send()
  } catch (error) {
    return buildErrorResponse(res, error, 'No fue posible eliminar el producto.')
  }
}
