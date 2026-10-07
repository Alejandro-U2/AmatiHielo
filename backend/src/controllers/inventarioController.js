import { supabaseAdmin } from '../config/supabaseAdmin.js'
import { parseListQuery } from '../utils/listQuery.js'

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

export function calculateUnitCost({ precioCompra, cantidadCompra, precioPaquete }) {
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

function normalizeMovimientoTipo(value) {
  const tipo = String(value ?? '').trim()

  if (!tipo) {
    return ''
  }

  const tipoLower = tipo.toLowerCase()

  switch (tipoLower) {
    case 'entrada':
      return 'Entrada'
    case 'salida':
      return 'Salida'
    case 'merma':
      return 'Merma'
    case 'ajuste':
      return 'Ajuste'
    default:
      return tipo
  }
}

function normalizeMovimientoPayload(body = {}) {
  const productoId = Number(body.productoId ?? body.producto_id)
  const unidadCompraId = Number(body.unidadCompraId ?? body.unidad_compra_id)
  const cantidad = parseOptionalNumber(body.cantidad)
  const tipo = normalizeMovimientoTipo(body.tipo)

  return {
    producto_id: Number.isNaN(productoId) ? null : productoId,
    proveedor_id: Number.isNaN(Number(body.proveedorId ?? body.proveedor_id)) ? null : Number(body.proveedorId ?? body.proveedor_id),
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
const PROVEEDOR_FIELDS = 'id, codigo, nombre, nit, telefono, correo, activo, created_at, updated_at'

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

const MOVIMIENTO_SORT_COLUMNS = {
  fecha: 'created_at',
  tipo: 'tipo',
  cantidad: 'cantidad',
  usuario: 'usuario',
}

export async function listMovimientos(req, res) {
  try {
    const params = parseListQuery(req.query, {
      sortColumns: MOVIMIENTO_SORT_COLUMNS,
      defaultSort: 'fecha',
    })

    let productoIds = null

    if (params.search) {
      const { data: productosMatch, error: errorMatch } = await supabaseAdmin
        .from('producto')
        .select('id')
        .ilike('nombre', `%${params.search}%`)
        .or(`codigo.ilike.%${params.search}%`)

      if (errorMatch) {
        return buildErrorResponse(res, errorMatch, 'No fue posible filtrar los movimientos por producto.')
      }

      productoIds = (productosMatch || []).map((p) => p.id)

      if (productoIds.length === 0) {
        return res.json({
          data: [],
          meta: { total: 0, page: params.page, pageSize: params.pageSize },
        })
      }
    }

    let query = supabaseAdmin
      .from('movimiento_inventario')
      .select('id, producto_id, proveedor_id, tipo, cantidad, motivo, usuario, created_at')

    if (productoIds) {
      query = query.in('producto_id', productoIds)
    }
    if (typeof req.query.tipo === 'string' && req.query.tipo.trim() !== '') {
      query = query.eq('tipo', req.query.tipo.trim())
    }
    if (params.desde) {
      query = query.gte('created_at', params.desde)
    }
    if (params.hasta) {
      query = query.lte('created_at', params.hasta)
    }

    let total = null

    if (params.paginate) {
      let countQuery = supabaseAdmin
        .from('movimiento_inventario')
        .select('id', { count: 'exact', head: true })

      if (productoIds) {
        countQuery = countQuery.in('producto_id', productoIds)
      }
      if (typeof req.query.tipo === 'string' && req.query.tipo.trim() !== '') {
        countQuery = countQuery.eq('tipo', req.query.tipo.trim())
      }
      if (params.desde) {
        countQuery = countQuery.gte('created_at', params.desde)
      }
      if (params.hasta) {
        countQuery = countQuery.lte('created_at', params.hasta)
      }

      const { count, error: errorCount } = await countQuery
      if (errorCount) {
        return buildErrorResponse(res, errorCount, 'No fue posible contar los movimientos.')
      }
      total = count || 0
    }

    query = query.order(MOVIMIENTO_SORT_COLUMNS[params.sortBy] || 'created_at', { ascending: params.sortDir === 'asc' })

    if (params.paginate) {
      const offset = (params.page - 1) * params.pageSize
      query = query.range(offset, offset + params.pageSize - 1)
    }

    const { data: movimientos, error } = await query

    if (error) {
      return buildErrorResponse(res, error, 'No fue posible cargar los movimientos.')
    }

    if (!movimientos || movimientos.length === 0) {
      return res.json({
        data: [],
        meta: total === null ? undefined : { total, page: params.page, pageSize: params.pageSize },
      })
    }

    // Traer datos de productos solo para la página actual
    const ids = [...new Set(movimientos.map(m => m.producto_id))]
    const { data: productos, error: errorProductos } = await supabaseAdmin
      .from('producto')
      .select('id, codigo, nombre')
      .in('id', ids)

    if (errorProductos) {
      return buildErrorResponse(res, errorProductos, 'No fue posible cargar datos de productos.')
    }

    const proveedorIds = [...new Set(movimientos.map((movimiento) => movimiento.proveedor_id).filter(Boolean))]
    const { data: proveedores, error: errorProveedores } = proveedorIds.length
      ? await supabaseAdmin.from('proveedor').select('id, nombre, codigo').in('id', proveedorIds)
      : { data: [], error: null }

    if (errorProveedores) {
      return buildErrorResponse(res, errorProveedores, 'No fue posible cargar datos de proveedores.')
    }

    // Mapear productos a movimientos
    const productoMap = new Map()
    ;(productos || []).forEach(p => productoMap.set(p.id, p))
    const proveedorMap = new Map()
    ;(proveedores || []).forEach(p => proveedorMap.set(p.id, p))

    const dataWithProductos = movimientos.map(m => ({
      ...m,
      producto: productoMap.get(m.producto_id) || null,
      proveedor: proveedorMap.get(m.proveedor_id) || null,
    }))

    return res.json({
      data: dataWithProductos,
      meta: total === null ? undefined : { total, page: params.page, pageSize: params.pageSize },
    })
  } catch (error) {
    return buildErrorResponse(res, error, 'No fue posible cargar los movimientos.')
  }
}

export async function listProveedores(req, res) {
    try {
      const { data, error } = await supabaseAdmin
        .from('proveedor')
        .select(PROVEEDOR_FIELDS)
        .order('activo', { ascending: false })
        .order('nombre', { ascending: true })

      if (error) {
        return buildErrorResponse(res, error, 'No fue posible cargar los proveedores.')
      }

      return res.json({ data: data || [] })
    } catch (error) {
      return buildErrorResponse(res, error, 'No fue posible cargar los proveedores.')
    }
}

function normalizeProveedorPayload(body = {}) {
      const payload = {
        nombre: body.nombre?.trim(),
        nit: body.nit?.trim() || null,
        telefono: body.telefono?.trim() || null,
        correo: body.correo?.trim() || null,
        activo: body.activo !== false,
      }

      if (body.codigo?.trim()) {
        payload.codigo = body.codigo.trim()
      }

      return payload
}

function isProveedorPayloadValid(payload) {
    if (!payload.nombre) {
      return 'El nombre del proveedor es obligatorio.'
    }

    if (payload.nit && !/^[a-zA-Z0-9]{1,13}$/.test(payload.nit)) {
      return 'El NIT debe contener únicamente letras y números, con un máximo de 13 caracteres.'
    }

    if (payload.telefono && !/^\d{1,8}$/.test(payload.telefono)) {
      return 'El teléfono debe contener únicamente números, con un máximo de 8 dígitos.'
    }

    return null
}

export async function createProveedor(req, res) {
    const payload = normalizeProveedorPayload(req.body)
    const validationError = isProveedorPayloadValid(payload)
    if (validationError) {
      return res.status(400).json({ message: validationError })
    }

    try {
      const { data, error } = await supabaseAdmin
        .from('proveedor')
        .insert(payload)
        .select(PROVEEDOR_FIELDS)
        .single()

      if (error || !data) {
        return buildErrorResponse(res, error, 'No fue posible crear el proveedor.', 400)
      }
      return res.status(201).json({ data })
    } catch (error) {
      return buildErrorResponse(res, error, 'No fue posible crear el proveedor.')
    }
}

export async function updateProveedor(req, res) {
    const payload = normalizeProveedorPayload(req.body)
    const validationError = isProveedorPayloadValid(payload)
    if (!req.params.id || validationError) {
      return res.status(400).json({
        message: !req.params.id ? 'El id y nombre del proveedor son obligatorios.' : validationError,
      })
    }

    try {
      const { data, error } = await supabaseAdmin
        .from('proveedor')
        .update(payload)
        .eq('id', req.params.id)
        .select(PROVEEDOR_FIELDS)
        .single()

      if (error || !data) {
        return buildErrorResponse(res, error, 'No fue posible actualizar el proveedor.', 400)
      }
      return res.json({ data })
    } catch (error) {
      return buildErrorResponse(res, error, 'No fue posible actualizar el proveedor.')
    }
}

export async function deleteProveedor(req, res) {
    if (!req.params.id) {
      return res.status(400).json({ message: 'El id del proveedor es obligatorio.' })
    }

    try {
      const { error } = await supabaseAdmin
        .from('proveedor')
        .update({ activo: false })
        .eq('id', req.params.id)

      if (error) {
        return buildErrorResponse(res, error, 'No fue posible desactivar el proveedor.', 400)
      }
      return res.status(204).send()
    } catch (error) {
      return buildErrorResponse(res, error, 'No fue posible desactivar el proveedor.')
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

  if (payload.tipo === 'Entrada' && !payload.proveedor_id) {
    return res.status(400).json({ message: 'Debes seleccionar un proveedor para registrar una Entrada.' })
  }

  const usuario = req.auth?.profile?.nombre || req.auth?.user?.email || payload.usuario || 'Sistema'

  try {
    const rpcArgs = {
      p_producto_id: payload.producto_id,
      p_tipo: payload.tipo,
      p_cantidad: payload.cantidad,
      p_motivo: payload.motivo,
      p_usuario: usuario,
      p_unidad_compra_id: payload.unidad_compra_id ?? null,
      p_proveedor_id: payload.proveedor_id ?? null,
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

export async function createEntradaInventario(req, res) {
  const body = req.body || {}
  const detalles = Array.isArray(body.detalles) ? body.detalles : []
  const proveedorId = Number(body.proveedorId ?? body.proveedor_id)
  const numeroFactura = String(body.numeroFactura ?? body.numero_factura ?? '').trim()
  if (!Number.isInteger(proveedorId) || !numeroFactura || detalles.length === 0) {
    return res.status(400).json({ message: 'Proveedor, numero de factura y al menos un producto son obligatorios.' })
  }
  const normalizedDetalles = detalles.map((detalle) => ({
    producto_id: Number(detalle.productoId ?? detalle.producto_id),
    unidad: String(detalle.unidad || 'unidad').trim(),
    cantidad: Number(detalle.cantidad),
    costo_unitario: Number(detalle.costoUnitario ?? detalle.costo_unitario),
    lote: detalle.lote ? String(detalle.lote).trim() : null,
    fecha_vencimiento: detalle.fechaVencimiento ?? detalle.fecha_vencimiento ?? null,
  }))
  if (normalizedDetalles.some((detalle) => !Number.isInteger(detalle.producto_id)
    || detalle.cantidad <= 0 || Number.isNaN(detalle.cantidad)
    || detalle.costo_unitario < 0 || Number.isNaN(detalle.costo_unitario))) {
    return res.status(400).json({ message: 'Revisa los productos, cantidades y costos de la entrada.' })
  }
  try {
    const responsable = req.auth?.profile?.nombre || req.auth?.user?.email || 'Sistema'
    const { data, error } = await supabaseAdmin.rpc('registrar_entrada_inventario', {
      p_proveedor_id: proveedorId,
      p_numero_factura: numeroFactura,
      p_fecha: body.fecha || null,
      p_fecha_factura: body.fechaFactura || body.fecha_factura || null,
      p_responsable: responsable,
      p_observaciones: body.observaciones || null,
      p_documento_path: body.documentoPath || body.documento_path || null,
      p_detalles: normalizedDetalles,
      p_confirmar: body.estado === 'Confirmada' || body.confirmar === true,
    })
    if (error || !data) return buildErrorResponse(res, error, 'No fue posible guardar la entrada.', 400)
    return res.status(201).json({ data: Array.isArray(data) ? data[0] : data })
  } catch (error) {
    return buildErrorResponse(res, error, 'No fue posible guardar la entrada.')
  }
}

export async function uploadEntradaInventarioDocumento(req, res) {
  const { contenido, tipo, extension } = req.body || {}
  const allowedTypes = new Map([
    ['application/pdf', 'pdf'],
    ['image/jpeg', 'jpg'],
    ['image/png', 'png'],
  ])
  const normalizedExtension = allowedTypes.get(tipo)
  if (!contenido || !normalizedExtension || (extension && extension.toLowerCase() !== normalizedExtension)) {
    return res.status(400).json({ message: 'El documento debe ser PDF, JPG o PNG.' })
  }

  try {
    const buffer = Buffer.from(contenido, 'base64')
    if (buffer.length === 0 || buffer.length > 5 * 1024 * 1024) {
      return res.status(400).json({ message: 'El documento no puede superar 5 MB.' })
    }
    const path = `${new Date().getFullYear()}/entrada-${Date.now()}-${crypto.randomUUID()}.${normalizedExtension}`
    const { error } = await supabaseAdmin.storage
      .from('entrada-inventario-documentos')
      .upload(path, buffer, { upsert: false, contentType: tipo })
    if (error) return buildErrorResponse(res, error, 'No fue posible cargar el documento.', 400)
    return res.status(201).json({ data: { path } })
  } catch (error) {
    return buildErrorResponse(res, error, 'No fue posible cargar el documento.')
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
