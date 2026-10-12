import { supabaseAdmin } from '../config/supabaseAdmin.js'

const PAYMENT_METHODS = ['Efectivo', 'Transferencia']

function buildErrorResponse(res, error, fallbackMessage, statusCode = 500) {
  return res.status(statusCode).json({
    message: error?.message || fallbackMessage,
  })
}

function normalizePeriod(value) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function normalizeArqueo(row) {
  return {
    id: row.id,
    periodoInicio: row.periodo_inicio,
    periodoFin: row.periodo_fin,
    totalVentas: Number(row.total_ventas || 0),
    totalEfectivo: Number(row.total_efectivo || 0),
    totalTransferencia: Number(row.total_transferencia || 0),
    transacciones: Number(row.transacciones || 0),
    usuario: row.usuario || 'Sistema',
    confirmadoAt: row.confirmado_at,
  }
}

export async function getArqueoCaja(req, res) {
  const periodoInicio = normalizePeriod(req.query.periodoInicio)
  const periodoFin = normalizePeriod(req.query.periodoFin)

  if (!periodoInicio || !periodoFin || periodoFin <= periodoInicio) {
    return res.status(400).json({ message: 'El período del arqueo no es válido.' })
  }

  try {
    const { data: arqueo, error: arqueoError } = await supabaseAdmin
      .from('arqueo_caja')
      .select('*')
      .eq('periodo_inicio', periodoInicio.toISOString())
      .eq('periodo_fin', periodoFin.toISOString())
      .maybeSingle()

    if (arqueoError) return buildErrorResponse(res, arqueoError, 'No fue posible cargar el arqueo.')
    if (arqueo) return res.json({ data: normalizeArqueo(arqueo), confirmado: true })

    const { data: ventas, error: ventasError } = await supabaseAdmin
      .from('venta_pos')
      .select('total, metodo_pago')
      .gte('created_at', periodoInicio.toISOString())
      .lt('created_at', periodoFin.toISOString())

    if (ventasError) return buildErrorResponse(res, ventasError, 'No fue posible calcular el arqueo.')

    const resumen = (ventas || []).reduce((result, venta) => {
      const total = Number(venta.total || 0)
      result.totalVentas += total
      result.transacciones += 1
      if (venta.metodo_pago === 'Efectivo') result.totalEfectivo += total
      if (venta.metodo_pago === 'Transferencia') result.totalTransferencia += total
      return result
    }, {
      totalVentas: 0,
      totalEfectivo: 0,
      totalTransferencia: 0,
      transacciones: 0,
    })

    return res.json({
      data: {
        periodoInicio: periodoInicio.toISOString(),
        periodoFin: periodoFin.toISOString(),
        ...resumen,
        metodosPago: PAYMENT_METHODS,
      },
      confirmado: false,
    })
  } catch (error) {
    return buildErrorResponse(res, error, 'No fue posible cargar el arqueo.')
  }
}

export async function confirmarArqueoCaja(req, res) {
  const periodoInicio = normalizePeriod(req.body?.periodoInicio)
  const periodoFin = normalizePeriod(req.body?.periodoFin)
  const usuario = req.auth?.profile?.nombre || req.auth?.user?.email || 'Sistema'

  if (!periodoInicio || !periodoFin || periodoFin <= periodoInicio) {
    return res.status(400).json({ message: 'El período del arqueo no es válido.' })
  }

  try {
    const { data: ventas, error: ventasError } = await supabaseAdmin
      .from('venta_pos')
      .select('total, metodo_pago')
      .gte('created_at', periodoInicio.toISOString())
      .lt('created_at', periodoFin.toISOString())

    if (ventasError) return buildErrorResponse(res, ventasError, 'No fue posible calcular el arqueo.', 400)

    const resumen = (ventas || []).reduce((result, venta) => {
      const total = Number(venta.total || 0)
      result.totalVentas += total
      result.transacciones += 1
      if (venta.metodo_pago === 'Efectivo') result.totalEfectivo += total
      if (venta.metodo_pago === 'Transferencia') result.totalTransferencia += total
      return result
    }, {
      totalVentas: 0,
      totalEfectivo: 0,
      totalTransferencia: 0,
      transacciones: 0,
    })

    const { data: arqueo, error } = await supabaseAdmin
      .from('arqueo_caja')
      .insert({
        periodo_inicio: periodoInicio.toISOString(),
        periodo_fin: periodoFin.toISOString(),
        total_ventas: resumen.totalVentas,
        total_efectivo: resumen.totalEfectivo,
        total_transferencia: resumen.totalTransferencia,
        transacciones: resumen.transacciones,
        usuario,
      })
      .select('*')
      .single()

    if (error) {
      if (error.code === '23505') {
        return res.status(409).json({ message: 'Este período ya fue confirmado.' })
      }
      return buildErrorResponse(res, error, 'No fue posible confirmar el arqueo.', 400)
    }

    return res.status(201).json({ data: normalizeArqueo(arqueo), confirmado: true })
  } catch (error) {
    return buildErrorResponse(res, error, 'No fue posible confirmar el arqueo.')
  }
}
