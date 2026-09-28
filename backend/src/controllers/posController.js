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

export async function listVentas(req, res) {
  try {
    const { data: ventas, error } = await supabaseAdmin
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
      .order('created_at', { ascending: false })
      .limit(100)

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
      p_cliente: cliente,
      p_usuario: usuario,
      p_necesita_factura: necesitaFactura,
      p_nit: nit,
      p_nombre_cliente: nombreCliente,
      p_numero_telefono: numeroTelefono,
    })

    if (error || !data) {
      return buildErrorResponse(res, error, 'No fue posible registrar la venta.', 400)
    }

    return res.status(201).json({ data: normalizeVenta(data) })
  } catch (error) {
    return buildErrorResponse(res, error, 'No fue posible registrar la venta.')
  }
}
