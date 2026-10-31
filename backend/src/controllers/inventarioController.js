import { Buffer } from 'node:buffer'
import { supabaseAdmin } from '../config/supabaseAdmin.js'
import { parseListQuery } from '../utils/listQuery.js'

function buildErrorResponse(res, error, fallbackMessage, statusCode = 500) {
  return res.status(statusCode).json({
    message: error?.message || fallbackMessage,
  })
}

const ENTRADA_DOCUMENTOS_BUCKET = 'entrada-inventario-documentos'

async function ensureEntradaDocumentosBucket() {
  const { data: bucket, error: lookupError } = await supabaseAdmin.storage
    .getBucket(ENTRADA_DOCUMENTOS_BUCKET)

  if (bucket) return

  const { error: createError } = await supabaseAdmin.storage.createBucket(
    ENTRADA_DOCUMENTOS_BUCKET,
    { public: false },
  )

  if (createError && !/already exists|duplicate/i.test(createError.message || '')) {
    throw createError
  }

  if (lookupError && createError) {
    throw createError
  }
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
    motivo_tipo: body.motivoTipo?.trim() || null,
    motivo_merma_id: Number.isNaN(Number(body.motivoMermaId)) ? null : Number(body.motivoMermaId),
    fecha: body.fecha || null,
    documento_path: body.documentoPath || null,
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

const signedUrlCache = new Map()
async function getCachedSignedUrl(path) {
  if (!path) return null
  const now = Date.now()
  const cached = signedUrlCache.get(path)
  if (cached && cached.expiresAt > now + 5 * 60 * 1000) {
    return cached.url
  }
  try {
    const { data: signedUrlData } = await supabaseAdmin.storage
      .from(ENTRADA_DOCUMENTOS_BUCKET)
      .createSignedUrl(path, 60 * 60)
    if (signedUrlData?.signedUrl) {
      signedUrlCache.set(path, {
        url: signedUrlData.signedUrl,
        expiresAt: now + 50 * 60 * 1000,
      })
      return signedUrlData.signedUrl
    }
  } catch {
    // ignore
  }
  return null
}

export async function listMovimientos(req, res) {
  try {
    const params = parseListQuery(req.query, {
      sortColumns: MOVIMIENTO_SORT_COLUMNS,
      defaultSort: 'fecha',
    })
    const fromDate = /^\d{4}-\d{2}-\d{2}$/.test(params.desde || '') ? `${params.desde}T00:00:00-06:00` : params.desde
    let untilDate = params.hasta
    if (/^\d{4}-\d{2}-\d{2}$/.test(params.hasta || '')) {
      const [year, month, day] = params.hasta.split('-').map(Number)
      const nextDay = new Date(Date.UTC(year, month - 1, day + 1)).toISOString().slice(0, 10)
      untilDate = `${nextDay}T00:00:00-06:00`
    }

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
      .select('id, producto_id, proveedor_id, tipo, cantidad, motivo, usuario, created_at, motivo_tipo, fecha_movimiento, costo_unitario_movimiento, stock_antes, stock_despues, documento_path')

    if (productoIds) {
      query = query.in('producto_id', productoIds)
    }
    if (typeof req.query.tipo === 'string' && req.query.tipo.trim() !== '') {
      query = query.eq('tipo', req.query.tipo.trim())
    }
    if (fromDate) {
      query = query.gte('created_at', fromDate)
    }
    if (untilDate) {
      query = query.lt('created_at', untilDate)
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
      if (fromDate) {
        countQuery = countQuery.gte('created_at', fromDate)
      }
      if (untilDate) {
        countQuery = countQuery.lt('created_at', untilDate)
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
      .select('id, codigo, nombre, costo_unitario, precio_compra, stock, unidad')
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

    const facturaNumeros = [...new Set(movimientos
      .filter((movimiento) => movimiento.tipo === 'Entrada')
      .map((movimiento) => movimiento.motivo?.match(/^Factura\s+(.+?)(?:\s+-\s+|$)/)?.[1]?.trim())
      .filter(Boolean))]
    const { data: entradas, error: errorEntradas } = facturaNumeros.length
      ? await supabaseAdmin
        .from('entrada_inventario')
        .select('numero_factura, documento_path')
        .in('numero_factura', facturaNumeros)
      : { data: [], error: null }

    if (errorEntradas) {
      return buildErrorResponse(res, errorEntradas, 'No fue posible cargar los documentos de entradas.')
    }

    const documentoMap = new Map()
    await Promise.all((entradas || []).filter((entrada) => entrada.documento_path).map(async (entrada) => {
      const url = await getCachedSignedUrl(entrada.documento_path)
      if (url) documentoMap.set(entrada.numero_factura, url)
    }))
    await Promise.all((movimientos || []).filter((movimiento) => movimiento.documento_path).map(async (movimiento) => {
      const url = await getCachedSignedUrl(movimiento.documento_path)
      if (url) documentoMap.set(movimiento.id, url)
    }))

    const dataWithProductos = movimientos.map(m => {
      const prod = productoMap.get(m.producto_id) || null
      const numeroFactura = m.motivo?.match(/^Factura\s+(.+?)(?:\s+-\s+|$)/)?.[1]?.trim()
      const fallbackCosto = Number(prod?.costo_unitario ?? prod?.precio_compra ?? 0)
      const rawCosto = Number(m.costo_unitario_movimiento ?? 0)
      const costoUnitario = rawCosto > 0 ? rawCosto : fallbackCosto
      const cantidad = Math.abs(Number(m.cantidad ?? 0))
      return {
        ...m,
        costo_unitario_movimiento: costoUnitario,
        costo_unitario: costoUnitario,
        costoUnitario,
        producto: prod,
        proveedor: proveedorMap.get(m.proveedor_id) || null,
        perdida_economica: m.tipo === 'Merma'
          ? Number((cantidad * costoUnitario).toFixed(2))
          : 0,
        documento_url: documentoMap.get(m.id) || (numeroFactura ? documentoMap.get(numeroFactura) || null : null),
      }
    })

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
      if (!payload.codigo) {
        const { data: lastProv } = await supabaseAdmin
          .from('proveedor')
          .select('codigo')
          .ilike('codigo', 'PRV-%')
          .order('id', { ascending: false })
          .limit(1)
          .maybeSingle()

        let nextNum = 1
        if (lastProv?.codigo) {
          const match = lastProv.codigo.match(/\d+/)
          if (match) {
            nextNum = parseInt(match[0], 10) + 1
          }
        }
        payload.codigo = `PRV-${String(nextNum).padStart(3, '0')}`
      }

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

export async function listMotivosMerma(req, res) {
  try {
    const { data, error } = await supabaseAdmin
      .from('motivo_merma')
      .select('id, codigo, nombre, descripcion, activo, es_sistema, orden')
      .eq('activo', true)
      .order('orden', { ascending: true })
      .order('nombre', { ascending: true })
    if (error) return buildErrorResponse(res, error, 'No fue posible cargar los motivos de merma.')
    return res.json({ data: data || [] })
  } catch (error) {
    return buildErrorResponse(res, error, 'No fue posible cargar los motivos de merma.')
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
      p_motivo_tipo: payload.motivo_tipo,
      p_fecha: payload.fecha,
      p_documento_path: payload.documento_path,
      p_motivo_merma_id: payload.motivo_merma_id,
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

export async function getNextNumeroFactura() {
  try {
    const { data, error } = await supabaseAdmin
      .from('entrada_inventario')
      .select('numero_factura')

    if (error) {
      console.warn('Error al consultar numero_factura de entrada_inventario:', error.message)
      return 'FAC-000001'
    }

    let max = 0
    for (const row of data || []) {
      const val = String(row?.numero_factura || '').trim()
      if (!val) continue
      const matches = val.match(/\d+/g)
      if (matches && matches.length > 0) {
        const num = parseInt(matches[matches.length - 1], 10)
        if (!Number.isNaN(num) && num > max) {
          max = num
        }
      }
    }
    const next = max + 1
    return `FAC-${String(next).padStart(6, '0')}`
  } catch (err) {
    console.error('Error calculando correlativo de factura:', err)
    return 'FAC-000001'
  }
}

export async function getSiguienteNumeroFactura(req, res) {
  try {
    const siguienteNumeroFactura = await getNextNumeroFactura()
    return res.json({ siguienteNumeroFactura })
  } catch (error) {
    return buildErrorResponse(res, error, 'No fue posible obtener el siguiente número de factura.')
  }
}

export async function createEntradaInventario(req, res) {
  const body = req.body || {}
  const detalles = Array.isArray(body.detalles) ? body.detalles : []
  const proveedorId = (body.proveedorId || body.proveedor_id) ? Number(body.proveedorId ?? body.proveedor_id) : null
  let numeroFactura = String(body.numeroFactura ?? body.numero_factura ?? '').trim()

  if (!numeroFactura || numeroFactura.toUpperCase() === 'AUTO') {
    numeroFactura = await getNextNumeroFactura()
  } else {
    const digitsOnly = numeroFactura.replace(/\D/g, '')
    if (digitsOnly && /^(fac[-\s]?)?\d+$/i.test(numeroFactura)) {
      numeroFactura = `FAC-${digitsOnly.padStart(6, '0')}`
    }
  }

  if (!numeroFactura || detalles.length === 0) {
    return res.status(400).json({ message: 'El número de factura y al menos un producto son obligatorios.' })
  }
  if (proveedorId !== null && !Number.isInteger(proveedorId)) {
    return res.status(400).json({ message: 'El proveedor seleccionado no es válido.' })
  }
  const normalizedDetalles = detalles.map((detalle) => ({
    producto_id: Number(detalle.productoId ?? detalle.producto_id),
    unidad: String(detalle.unidad || 'unidad').trim(),
    cantidad: Number(detalle.cantidad),
    costo_unitario: Number(detalle.costoUnitario ?? detalle.costo_unitario),
  }))
  if (normalizedDetalles.some((detalle) => !Number.isInteger(detalle.producto_id)
    || detalle.cantidad <= 0 || Number.isNaN(detalle.cantidad)
    || detalle.costo_unitario < 0 || Number.isNaN(detalle.costo_unitario))) {
    return res.status(400).json({ message: 'Revisa los productos, cantidades y costos de la entrada.' })
  }
  try {
    const responsable = String(body.responsable || req.auth?.profile?.nombre || req.auth?.user?.email || 'Sistema').trim()
    const isConfirmar = body.estado === 'Confirmada' || body.confirmar === true

    let { data, error } = await supabaseAdmin.rpc('registrar_entrada_inventario', {
      p_proveedor_id: proveedorId,
      p_numero_factura: numeroFactura,
      p_fecha: body.fecha || null,
      p_fecha_factura: body.fechaFactura || body.fecha_factura || null,
      p_responsable: responsable,
      p_observaciones: body.observaciones || null,
      p_documento_path: body.documentoPath || body.documento_path || null,
      p_detalles: normalizedDetalles,
      p_confirmar: isConfirmar,
    })

    if (!error && data) {
      return res.status(201).json({ data: Array.isArray(data) ? data[0] : data })
    }

    // Fallback directo si la RPC no está en el schema cache (PGRST202)
    if (error && error.code === 'PGRST202') {
      const fechaEntrada = body.fecha || new Date().toISOString().slice(0, 10)
      const subtotalCalc = normalizedDetalles.reduce((acc, d) => acc + (d.cantidad * d.costo_unitario), 0)

      // Generar correlativo ENT-XXXXX si la tabla requiere numero
      const { count } = await supabaseAdmin.from('entrada_inventario').select('*', { count: 'exact', head: true })
      const numeroCorrelativo = `ENT-${String((count || 0) + 1).padStart(5, '0')}`

      const { data: entrada, error: entErr } = await supabaseAdmin
        .from('entrada_inventario')
        .insert({
          numero: numeroCorrelativo,
          fecha: fechaEntrada,
          tipo: 'Compra',
          proveedor_id: proveedorId,
          numero_factura: numeroFactura,
          fecha_factura: body.fechaFactura || body.fecha_factura || null,
          responsable,
          observaciones: body.observaciones || null,
          documento_path: body.documentoPath || body.documento_path || null,
          estado: isConfirmar ? 'Confirmada' : 'Borrador',
          subtotal: subtotalCalc,
          total: subtotalCalc,
        })
        .select()
        .single()

      if (entErr || !entrada) {
        return buildErrorResponse(res, entErr, 'No fue posible crear la entrada.', 400)
      }

      // Insertar detalles
      const detallesToInsert = normalizedDetalles.map(d => ({
        entrada_id: entrada.id,
        producto_id: d.producto_id,
        unidad: d.unidad,
        cantidad: d.cantidad,
        costo_unitario: d.costo_unitario,
        total_linea: d.cantidad * d.costo_unitario,
      }))

      await supabaseAdmin.from('entrada_inventario_detalle').insert(detallesToInsert)

      // Si se confirma, actualizar stock y registrar movimientos
      if (isConfirmar) {
        for (const d of normalizedDetalles) {
          const { data: prod } = await supabaseAdmin
            .from('producto')
            .select('id, stock')
            .eq('id', d.producto_id)
            .single()

          const stockAntes = prod ? (Number(prod.stock) || 0) : 0
          const stockDespues = stockAntes + Number(d.cantidad)

          if (prod) {
            await supabaseAdmin
              .from('producto')
              .update({
                stock: stockDespues,
                costo_unitario: Number(d.costo_unitario),
                precio_compra: Number(d.costo_unitario),
                updated_at: new Date().toISOString(),
              })
              .eq('id', d.producto_id)
          }

          await supabaseAdmin
            .from('movimiento_inventario')
            .insert({
              producto_id: d.producto_id,
              proveedor_id: proveedorId,
              tipo: 'Entrada',
              cantidad: Number(d.cantidad),
              motivo: `Factura ${numeroFactura}${body.observaciones ? ' - ' + body.observaciones : ''}`,
              usuario: responsable,
              costo_unitario_movimiento: Number(d.costo_unitario),
              stock_antes: stockAntes,
              stock_despues: stockDespues,
            })
        }
      }

      return res.status(201).json({ data: entrada })
    }

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
    await ensureEntradaDocumentosBucket()
    const path = `${new Date().getFullYear()}/entrada-${Date.now()}-${crypto.randomUUID()}.${normalizedExtension}`
    const { error } = await supabaseAdmin.storage
      .from(ENTRADA_DOCUMENTOS_BUCKET)
      .upload(path, buffer, { upsert: false, contentType: tipo, cacheControl: '31536000, private, immutable' })
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
