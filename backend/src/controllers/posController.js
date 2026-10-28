import { supabaseAdmin } from '../config/supabaseAdmin.js'

function buildErrorResponse(res, error, fallbackMessage, statusCode = 500) {
  return res.status(statusCode).json({
    message: error?.message || fallbackMessage,
  })
}

function normalizeVenta(row) {
  const detalles = row.detalles || row.venta_pos_detalle || []

  return {
    id: row.id,
    ticket: row.ticket,
    cliente: row.cliente || 'Cliente General',
    clienteId: row.cliente_id ?? row.clienteId ?? null,
    metodoPago: row.metodo_pago,
    subtotal: Number(row.subtotal || 0),
    iva: Number(row.iva || 0),
    total: Number(row.total || 0),
    usuario: row.usuario || 'Sistema',
    createdAt: row.created_at,
    necesitaFactura: Boolean(row.necesita_factura),
    nit: row.nit || '',
    nombreCliente: row.nombre_cliente || '',
    numeroTelefono: row.numero_telefono || '',
    detalles: detalles.map((detalle) => ({
      id: detalle.id,
      recetaId: detalle.receta_id,
      codigo: detalle.receta?.codigo || '',
      nombre: detalle.receta?.nombre || 'Producto de venta',
      presentacion: detalle.receta?.presentacion || '',
      cantidad: Number(detalle.cantidad || 0),
      precioUnitario: Number(detalle.precio_unitario || 0),
      total: Number(detalle.total || 0),
    })),
  }

}

function normalizeVentaItem(item = {}) {
  const recetaId = Number(item.recetaId ?? item.receta_id)
  const cantidad = Number(item.cantidad)
  const precioUnitario = Number(item.precioUnitario ?? item.precio_unitario ?? item.precio ?? 0)

  return {
    receta_id: Number.isNaN(recetaId) ? null : recetaId,
    cantidad: Number.isNaN(cantidad) ? null : cantidad,
    precio_unitario: Number.isNaN(precioUnitario) ? 0 : precioUnitario,
  }
}

const METODO_PAGO_FIELDS = 'id, nombre, descripcion, activo, es_sistema, orden, created_at, updated_at'

export async function listMetodosPago(req, res) {
  try {
    const { data, error } = await supabaseAdmin
      .from('metodo_pago')
      .select(METODO_PAGO_FIELDS)
      .eq('activo', true)
      .order('orden', { ascending: true })
      .order('nombre', { ascending: true })

    if (error) {
      return buildErrorResponse(res, error, 'No fue posible cargar los metodos de pago.')
    }

    return res.json({ data: data || [] })
  } catch (error) {
    return buildErrorResponse(res, error, 'No fue posible cargar los metodos de pago.')
  }
}

function isValidNombreCliente(value = '') {
  const normalized = String(value || '').trim()
  return normalized.length > 0 && /^[A-Za-zÁÉÍÓÚáéíóúÑñÜü\s]+$/.test(normalized)
}

function isValidTelefono(value = '') {
  const normalized = String(value || '').trim()
  return normalized.length > 0 && /^\d+$/.test(normalized)
}

const CLIENTE_FIELDS = 'id, codigo, nombre, nit, telefono, correo, direccion, activo, created_at, updated_at'

function normalizeClientePayload(body = {}) {
  return {
    nombre: String(body.nombre || '').trim(),
    nit: String(body.nit || '').trim() || null,
    telefono: String(body.telefono || '').trim() || null,
    correo: String(body.correo || '').trim() || null,
    direccion: String(body.direccion || '').trim() || null,
  }
}

function validateClientePayload(payload) {
  if (!payload.nombre) return 'El nombre del cliente es obligatorio.'
  if (!isValidNombreCliente(payload.nombre)) return 'El nombre del cliente solo debe contener letras y espacios.'
  if (payload.nit && !/^[A-Za-z0-9-]{1,13}$/.test(payload.nit)) return 'El NIT debe tener máximo 13 caracteres alfanuméricos.'
  if (payload.telefono && !/^\d{1,8}$/.test(payload.telefono)) return 'El teléfono debe tener máximo 8 números.'
  return null
}

export async function listClientes(req, res) {
  try {
    const { data, error } = await supabaseAdmin
      .from('cliente')
      .select(CLIENTE_FIELDS)
      .eq('activo', true)
      .order('nombre', { ascending: true })

    if (error) return buildErrorResponse(res, error, 'No fue posible cargar los clientes.')
    return res.json({ data: data || [] })
  } catch (error) {
    return buildErrorResponse(res, error, 'No fue posible cargar los clientes.')
  }
}

export async function createCliente(req, res) {
  const payload = normalizeClientePayload(req.body)
  const validationError = validateClientePayload(payload)
  if (validationError) return res.status(400).json({ message: validationError })

  try {
    const { data: cliente, error } = await supabaseAdmin
      .from('cliente')
      .insert({ ...payload, codigo: `CLI-${Date.now().toString().slice(-8)}` })
      .select(CLIENTE_FIELDS)
      .single()

    if (error) return buildErrorResponse(res, error, 'No fue posible crear el cliente.', 400)
    return res.status(201).json({ data: cliente })
  } catch (error) {
    return buildErrorResponse(res, error, 'No fue posible crear el cliente.')
  }
}

export async function updateCliente(req, res) {
  const id = Number(req.params.id)
  const payload = normalizeClientePayload(req.body)
  const validationError = validateClientePayload(payload)
  if (!Number.isInteger(id) || validationError) {
    return res.status(400).json({ message: validationError || 'El cliente seleccionado no es válido.' })
  }

  try {
    const { data: cliente, error } = await supabaseAdmin
      .from('cliente')
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select(CLIENTE_FIELDS)
      .single()

    if (error) return buildErrorResponse(res, error, 'No fue posible actualizar el cliente.', 400)
    return res.json({ data: cliente })
  } catch (error) {
    return buildErrorResponse(res, error, 'No fue posible actualizar el cliente.')
  }
}

export async function getDashboardMetrics(req, res) {
  try {
    const hoy = new Date()
    const localTodayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Guatemala' }).format(hoy)
    const desde = `${localTodayStr}T00:00:00-06:00`

    // 1. Ventas de hoy: solo id y total
    const { data: ventasHoy, error: errVentas } = await supabaseAdmin
      .from('venta_pos')
      .select('id, total')
      .gte('created_at', desde)

    if (errVentas) return buildErrorResponse(res, errVentas, 'Error cargando métricas de ventas')

    const totalVentasHoy = (ventasHoy || []).reduce((sum, v) => sum + (Number(v.total) || 0), 0)
    const transaccionesHoy = ventasHoy ? ventasHoy.length : 0

    // 2. Stock total: solo columna stock
    const { data: productos, error: errProd } = await supabaseAdmin
      .from('producto')
      .select('stock')

    if (errProd) return buildErrorResponse(res, errProd, 'Error cargando métricas de inventario')
    const stockTotal = (productos || []).reduce((sum, p) => sum + (Number(p.stock) || 0), 0)

    // 3. Conteo de recetas (head: true transfiere 0 filas)
    const { count: recetasCount } = await supabaseAdmin
      .from('receta')
      .select('id', { count: 'exact', head: true })

    return res.json({
      data: {
        ventasHoy: totalVentasHoy,
        transaccionesHoy,
        stockTotal,
        recetasTotal: recetasCount || 0,
      }
    })
  } catch (error) {
    return buildErrorResponse(res, error, 'No fue posible obtener las métricas del dashboard.')
  }
}

export async function getVentaById(req, res) {
  try {
    const id = Number(req.params.id)
    if (!id) {
      return res.status(400).json({ message: 'ID de venta inválido' })
    }

    const { data, error } = await supabaseAdmin
      .from('venta_pos')
      .select(`
        id,
        ticket,
        cliente,
        metodo_pago,
        subtotal,
        iva,
        total,
        usuario,
        necesita_factura,
        cliente_id,
        nit,
        nombre_cliente,
        numero_telefono,
        created_at,
        venta_pos_detalle (
          id,
          receta_id,
          cantidad,
          precio_unitario,
          total,
          receta (
            id,
            codigo,
            nombre,
            presentacion
          )
        )
      `)
      .eq('id', id)
      .maybeSingle()

    if (error || !data) {
      return buildErrorResponse(res, error, 'Venta no encontrada', 404)
    }

    return res.json({ data: normalizeVenta(data) })
  } catch (error) {
    return buildErrorResponse(res, error, 'No fue posible obtener el detalle de la venta.')
  }
}

export async function listVentas(req, res) {
  try {
    const includeDetalles = req.query.includeDetalles === 'true'
    const selectProjection = includeDetalles
      ? `
        id,
        ticket,
        cliente,
        metodo_pago,
        subtotal,
        iva,
        total,
        usuario,
        necesita_factura,
        cliente_id,
        nit,
        nombre_cliente,
        numero_telefono,
        created_at,
        venta_pos_detalle (
          id,
          receta_id,
          cantidad,
          precio_unitario,
          total,
          receta (
            id,
            codigo,
            nombre,
            presentacion
          )
        )
      `
      : `
        id,
        ticket,
        cliente,
        metodo_pago,
        subtotal,
        iva,
        total,
        usuario,
        necesita_factura,
        cliente_id,
        nit,
        nombre_cliente,
        numero_telefono,
        created_at
      `

    let query = supabaseAdmin
      .from('venta_pos')
      .select(selectProjection)
      .order('created_at', { ascending: false })

    const desde = typeof req.query.desde === 'string' ? req.query.desde.trim() : ''
    const hasta = typeof req.query.hasta === 'string' ? req.query.hasta.trim() : ''
    if (/^\d{4}-\d{2}-\d{2}$/.test(desde)) query = query.gte('created_at', `${desde}T00:00:00-06:00`)
    if (/^\d{4}-\d{2}-\d{2}$/.test(hasta)) {
      const [year, month, day] = hasta.split('-').map(Number)
      const nextDay = new Date(Date.UTC(year, month - 1, day + 1)).toISOString().slice(0, 10)
      query = query.lt('created_at', `${nextDay}T00:00:00-06:00`)
    }
    if (!desde && !hasta && req.query.todos !== 'true') query = query.limit(100)

    const { data: ventas, error } = await query

    if (error) {
      return buildErrorResponse(res, error, 'No fue posible cargar las ventas.')
    }

    return res.json({ data: (ventas || []).map(normalizeVenta) })
  } catch (error) {
    return buildErrorResponse(res, error, 'No fue posible cargar las ventas.')
  }
}

export async function createVenta(req, res) {
  const items = (req.body?.items || []).map(normalizeVentaItem)
  const metodoPago = req.body?.metodoPago || req.body?.metodo_pago || 'Efectivo'
  const cliente = req.body?.cliente || null
  const clienteId = Number(req.body?.clienteId ?? req.body?.cliente_id)
  const usuario = req.auth?.profile?.nombre || req.auth?.user?.email || 'Sistema'
  const necesitaFactura = req.body?.necesitaFactura || req.body?.necesita_factura || false
  const nit = req.body?.nit || null
  const nombreCliente = req.body?.nombreCliente || req.body?.nombre_cliente || null
  const numeroTelefono = req.body?.numeroTelefono || req.body?.numero_telefono || null

  if (items.length === 0) {
    return res.status(400).json({ message: 'La venta debe incluir al menos un producto.' })
  }

  if (items.some((item) => !item.receta_id || !item.cantidad || item.cantidad <= 0)) {
    return res.status(400).json({
      message: 'Cada producto vendido debe tener recetaId y cantidad mayor a 0.',
    })
  }

  if (necesitaFactura && (!nit || !nombreCliente || !numeroTelefono)) {
    return res.status(400).json({
      message: 'Si necesita factura, debe proporcionar NIT, nombre y número de teléfono.',
    })
  }

  if (necesitaFactura && !isValidNombreCliente(nombreCliente)) {
    return res.status(400).json({
      message: 'El nombre del cliente solo debe contener letras y espacios.',
    })
  }

  if (necesitaFactura && !isValidTelefono(numeroTelefono)) {
    return res.status(400).json({
      message: 'El número de teléfono solo debe contener números.',
    })
  }

  try {
    const { data, error } = await supabaseAdmin.rpc('registrar_venta_pos_consumo_directo', {
      p_items: items,
      p_metodo_pago: metodoPago,
      p_cliente: cliente || null,
      p_usuario: usuario,
      p_necesita_factura: necesitaFactura,
      p_nit: nit,
      p_nombre_cliente: nombreCliente,
      p_numero_telefono: numeroTelefono,
    })

    if (error || !data) {
      return buildErrorResponse(res, error, 'No fue posible registrar la venta.', 400)
    }

    let venta = data
    if (Number.isInteger(clienteId) && clienteId > 0) {
      const { data: ventaActualizada, error: errorCliente } = await supabaseAdmin
        .from('venta_pos')
        .update({ cliente_id: clienteId })
        .eq('id', data.id)
        .select('*')
        .single()

      if (errorCliente) return buildErrorResponse(res, errorCliente, 'La venta se registró, pero no fue posible asociar el cliente.', 400)
      venta = ventaActualizada
    }

    return res.status(201).json({ data: normalizeVenta(venta) })
  } catch (error) {
    return buildErrorResponse(res, error, 'No fue posible registrar la venta.')
  }
}
