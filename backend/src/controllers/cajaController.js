import { supabaseAdmin } from '../config/supabaseAdmin.js'

const PAYMENT_METHODS = ['Efectivo', 'Transferencia']
const DEFAULT_SENCILLO = 200

function buildErrorResponse(res, error, fallbackMessage, statusCode = 500) {
  return res.status(statusCode).json({
    message: error?.message || fallbackMessage,
  })
}

function normalizePeriod(value) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

async function getCajaConfig() {
  try {
    const { data } = await supabaseAdmin
      .from('config_umbrales')
      .select('parametros_extra')
      .eq('id', 1)
      .maybeSingle()
    const extra = data?.parametros_extra || {}
    return {
      defaultSencillo: Number(extra.fondo_caja_sencillo_default ?? DEFAULT_SENCILLO),
      ultimoSencilloDejado: Number(extra.ultimo_sencillo_dejado ?? DEFAULT_SENCILLO),
      arqueos: extra.arqueos_caja || {},
    }
  } catch {
    return {
      defaultSencillo: DEFAULT_SENCILLO,
      ultimoSencilloDejado: DEFAULT_SENCILLO,
      arqueos: {},
    }
  }
}

async function saveCajaConfig(updates = {}) {
  try {
    const { data } = await supabaseAdmin
      .from('config_umbrales')
      .select('parametros_extra')
      .eq('id', 1)
      .maybeSingle()
    const currentExtra = data?.parametros_extra || {}
    const newExtra = {
      ...currentExtra,
      ...updates,
      arqueos_caja: {
        ...(currentExtra.arqueos_caja || {}),
        ...(updates.arqueos_caja || {}),
      },
    }
    await supabaseAdmin
      .from('config_umbrales')
      .update({ parametros_extra: newExtra })
      .eq('id', 1)
  } catch (err) {
    console.debug('Error guardando parametros extra de caja:', err)
  }
}

function normalizeArqueo(row = {}, extraMeta = {}) {
  const meta = extraMeta[row.id] || {}
  const fondoInicial = Number(row.fondo_inicial ?? meta.fondoInicial ?? row.fondoInicial ?? 0)
  const totalEfectivo = Number(row.total_efectivo ?? row.totalEfectivo ?? 0)
  const totalEfectivoEsperado = Number(row.total_efectivo_esperado ?? meta.totalEfectivoEsperado ?? (fondoInicial + totalEfectivo))
  const sencilloDejado = Number(row.sencillo_dejado ?? meta.sencilloDejado ?? row.sencilloDejado ?? fondoInicial)
  const efectivoRetirado = Number(row.efectivo_retirado ?? meta.efectivoRetirado ?? Math.max(0, totalEfectivoEsperado - sencilloDejado))
  const efectivoReal = Number(row.efectivo_real ?? meta.efectivoReal ?? totalEfectivoEsperado)
  const diferencia = Number(row.diferencia ?? meta.diferencia ?? (efectivoReal - totalEfectivoEsperado))

  return {
    id: row.id,
    periodoInicio: row.periodo_inicio ?? row.periodoInicio,
    periodoFin: row.periodo_fin ?? row.periodoFin,
    totalVentas: Number(row.total_ventas ?? row.totalVentas ?? 0),
    totalEfectivo,
    totalTransferencia: Number(row.total_transferencia ?? row.totalTransferencia ?? 0),
    transacciones: Number(row.transacciones || 0),
    fondoInicial,
    sencilloDejado,
    totalEfectivoEsperado,
    efectivoRetirado,
    efectivoReal,
    diferencia,
    observaciones: row.observaciones || meta.observaciones || '',
    usuario: row.usuario || 'Sistema',
    confirmadoAt: row.confirmado_at ?? row.confirmadoAt,
  }
}

export async function getArqueoCaja(req, res) {
  const periodoInicio = normalizePeriod(req.query.periodoInicio)
  const periodoFin = normalizePeriod(req.query.periodoFin)

  if (!periodoInicio || !periodoFin || periodoFin <= periodoInicio) {
    return res.status(400).json({ message: 'El período del arqueo no es válido.' })
  }

  try {
    const cajaConfig = await getCajaConfig()

    // 1. Revisar si este período ya fue confirmado
    const { data: arqueo, error: arqueoError } = await supabaseAdmin
      .from('arqueo_caja')
      .select('*')
      .eq('periodo_inicio', periodoInicio.toISOString())
      .eq('periodo_fin', periodoFin.toISOString())
      .maybeSingle()

    if (arqueoError) return buildErrorResponse(res, arqueoError, 'No fue posible cargar el arqueo.')
    if (arqueo) {
      return res.json({ data: normalizeArqueo(arqueo, cajaConfig.arqueos), confirmado: true })
    }

    // 2. Determinar el fondo inicial (sencillo con que abrió este período)
    const { data: arqueoAnterior } = await supabaseAdmin
      .from('arqueo_caja')
      .select('*')
      .lte('periodo_fin', periodoInicio.toISOString())
      .order('periodo_fin', { ascending: false })
      .limit(1)
      .maybeSingle()

    let fondoInicial = cajaConfig.ultimoSencilloDejado
    if (arqueoAnterior) {
      const prevNorm = normalizeArqueo(arqueoAnterior, cajaConfig.arqueos)
      fondoInicial = prevNorm.sencilloDejado ?? fondoInicial
    }

    // 3. Consultar ventas del período
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

    const totalEfectivoEsperado = fondoInicial + resumen.totalEfectivo
    const sencilloSugerido = fondoInicial
    const efectivoRetirado = Math.max(0, totalEfectivoEsperado - sencilloSugerido)

    return res.json({
      data: {
        periodoInicio: periodoInicio.toISOString(),
        periodoFin: periodoFin.toISOString(),
        ...resumen,
        fondoInicial,
        sencilloDejado: sencilloSugerido,
        totalEfectivoEsperado,
        efectivoRetirado,
        efectivoReal: totalEfectivoEsperado,
        diferencia: 0,
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
  const sencilloDejadoInput = req.body?.sencilloDejado !== undefined && req.body?.sencilloDejado !== null && req.body?.sencilloDejado !== ''
    ? Number(req.body?.sencilloDejado)
    : null
  const efectivoRealInput = req.body?.efectivoReal !== undefined && req.body?.efectivoReal !== null && req.body?.efectivoReal !== ''
    ? Number(req.body?.efectivoReal)
    : null
  const observaciones = typeof req.body?.observaciones === 'string' ? req.body.observaciones.trim() : ''

  if (!periodoInicio || !periodoFin || periodoFin <= periodoInicio) {
    return res.status(400).json({ message: 'El período del arqueo no es válido.' })
  }

  try {
    const cajaConfig = await getCajaConfig()

    // 1. Determinar el fondo inicial del período
    const { data: arqueoAnterior } = await supabaseAdmin
      .from('arqueo_caja')
      .select('*')
      .lte('periodo_fin', periodoInicio.toISOString())
      .order('periodo_fin', { ascending: false })
      .limit(1)
      .maybeSingle()

    let fondoInicial = cajaConfig.ultimoSencilloDejado
    if (arqueoAnterior) {
      const prevNorm = normalizeArqueo(arqueoAnterior, cajaConfig.arqueos)
      fondoInicial = prevNorm.sencilloDejado ?? fondoInicial
    }

    // 2. Calcular ventas del período
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

    const totalEfectivoEsperado = fondoInicial + resumen.totalEfectivo
    const sencilloDejado = Number.isFinite(sencilloDejadoInput) && sencilloDejadoInput >= 0
      ? sencilloDejadoInput
      : fondoInicial
    const efectivoRetirado = Math.max(0, totalEfectivoEsperado - sencilloDejado)
    const efectivoReal = Number.isFinite(efectivoRealInput) ? efectivoRealInput : totalEfectivoEsperado
    const diferencia = efectivoReal - totalEfectivoEsperado

    // Intentar insertar con columnas completas si existen en la BD
    const fullPayload = {
      periodo_inicio: periodoInicio.toISOString(),
      periodo_fin: periodoFin.toISOString(),
      total_ventas: resumen.totalVentas,
      total_efectivo: resumen.totalEfectivo,
      total_transferencia: resumen.totalTransferencia,
      transacciones: resumen.transacciones,
      usuario,
      fondo_inicial: fondoInicial,
      sencillo_dejado: sencilloDejado,
      total_efectivo_esperado: totalEfectivoEsperado,
      efectivo_retirado: efectivoRetirado,
      efectivo_real: efectivoReal,
      diferencia,
      observaciones: observaciones || null,
    }

    let arqueo = null
    const { data: arqueoFull, error: fullError } = await supabaseAdmin
      .from('arqueo_caja')
      .insert(fullPayload)
      .select('*')
      .single()

    if (!fullError && arqueoFull) {
      arqueo = arqueoFull
    } else {
      // Fallback a inserción básica si la migración aún no fue ejecutada en Supabase
      const basicPayload = {
        periodo_inicio: periodoInicio.toISOString(),
        periodo_fin: periodoFin.toISOString(),
        total_ventas: resumen.totalVentas,
        total_efectivo: resumen.totalEfectivo,
        total_transferencia: resumen.totalTransferencia,
        transacciones: resumen.transacciones,
        usuario,
      }
      const { data: arqueoBasic, error: basicError } = await supabaseAdmin
        .from('arqueo_caja')
        .insert(basicPayload)
        .select('*')
        .single()

      if (basicError) {
        if (basicError.code === '23505') {
          return res.status(409).json({ message: 'Este período ya fue confirmado.' })
        }
        return buildErrorResponse(res, basicError, 'No fue posible confirmar el arqueo.', 400)
      }
      arqueo = arqueoBasic
    }

    // Persistir metadatos en configuración para garantizar persistencia y trazabilidad
    const metaObj = {
      fondoInicial,
      sencilloDejado,
      totalEfectivoEsperado,
      efectivoRetirado,
      efectivoReal,
      diferencia,
      observaciones,
    }
    await saveCajaConfig({
      ultimo_sencillo_dejado: sencilloDejado,
      arqueos_caja: {
        [arqueo.id]: metaObj,
      },
    })

    const normalized = normalizeArqueo(arqueo, { [arqueo.id]: metaObj })
    return res.status(201).json({ data: normalized, confirmado: true })
  } catch (error) {
    return buildErrorResponse(res, error, 'No fue posible confirmar el arqueo.')
  }
}
