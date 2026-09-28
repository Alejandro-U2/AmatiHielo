import { supabaseAdmin } from '../config/supabaseAdmin.js'

const MODULE_NAME = 'Configuración del Sistema'

function buildErrorResponse(res, error, fallbackMessage, statusCode = 500) {
  return res.status(statusCode).json({
    message: error?.message || fallbackMessage,
  })
}

function cleanText(value) {
  return String(value ?? '').trim()
}

function cleanEmail(value) {
  return cleanText(value).toLowerCase()
}

function toNumber(value, fallback = 0) {
  const parsed = Number(value)
  return Number.isNaN(parsed) ? fallback : parsed
}

function toBoolean(value, fallback = false) {
  if (typeof value === 'boolean') return value
  if (value === 'true' || value === '1' || value === 1) return true
  if (value === 'false' || value === '0' || value === 0) return false
  return fallback
}

function normalizeCompany(row = {}) {
  return {
    id: row.id,
    nombreEmpresa: row.nombre_empresa,
    nit: row.nit,
    direccion: row.direccion,
    telefono: row.telefono,
    correo: row.correo,
    logoUrl: row.logo_url || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function normalizeTaxItem(item = {}) {
  return {
    nombre: cleanText(item.nombre),
    porcentaje: toNumber(item.porcentaje, 0),
    activo: toBoolean(item.activo, true),
  }
}

function normalizeTaxes(row = {}) {
  return {
    id: row.id,
    ivaActivo: Boolean(row.iva_activo),
    ivaPorcentaje: Number(row.iva_porcentaje ?? 0),
    otrosImpuestos: Array.isArray(row.otros_impuestos)
      ? row.otros_impuestos.map(normalizeTaxItem)
      : [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function normalizeNotifications(row = {}) {
  return {
    id: row.id,
    alertaStockBajo: Boolean(row.alerta_stock_bajo),
    alertaStockCritico: Boolean(row.alerta_stock_critico),
    confirmacionVentas: Boolean(row.confirmacion_ventas),
    alertasMantenimiento: Boolean(row.alertas_mantenimiento),
    alertasVencimiento: Boolean(row.alertas_vencimiento),
    alertasComprasPendientes: Boolean(row.alertas_compras_pendientes),
    notificacionesCorreo: Boolean(row.notificaciones_correo),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function normalizeThresholds(row = {}) {
  return {
    id: row.id,
    stockBajoPorcentaje: Number(row.stock_bajo_porcentaje ?? 0),
    stockCriticoPorcentaje: Number(row.stock_critico_porcentaje ?? 0),
    diasMantenimiento: Number(row.dias_mantenimiento ?? 0),
    diasVencimiento: Number(row.dias_vencimiento ?? 0),
    parametrosExtra: row.parametros_extra || {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function normalizeSucursal(row = {}) {
  return {
    id: row.id,
    nombre: row.nombre,
    direccion: row.direccion,
    telefono: row.telefono,
    encargado: row.encargado || '',
    activa: Boolean(row.activa),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

async function logAudit({ entidad, entidadId, accion, beforeData = null, afterData = null, req }) {
  const usuario = req.auth?.profile?.nombre || req.auth?.user?.email || 'Sistema'

  await supabaseAdmin.from('configuracion_auditoria').insert({
    modulo: MODULE_NAME,
    entidad,
    entidad_id: entidadId !== undefined && entidadId !== null ? String(entidadId) : null,
    accion,
    usuario,
    antes: beforeData,
    despues: afterData,
  })
}

async function getSingleton(tableName, fallbackRow = {}) {
  const { data, error } = await supabaseAdmin
    .from(tableName)
    .select('*')
    .eq('id', 1)
    .maybeSingle()

  if (error) {
    throw error
  }

  return data || fallbackRow
}

async function upsertSingleton(tableName, payload) {
  const { data, error } = await supabaseAdmin
    .from(tableName)
    .upsert({ id: 1, ...payload }, { onConflict: 'id' })
    .select('*')
    .single()

  if (error || !data) {
    throw error || new Error('No fue posible guardar la configuración.')
  }

  return data
}

function validateEmail(value) {
  if (!value) return false
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function validatePercentage(value) {
  return Number.isFinite(value) && value >= 0 && value <= 100
}

export async function getConfiguracionSistema(req, res) {
  try {
    const [empresa, impuestos, notificaciones, umbrales, sucursales] = await Promise.all([
      getSingleton('config_empresa'),
      getSingleton('config_impuestos'),
      getSingleton('config_notificaciones'),
      getSingleton('config_umbrales'),
      supabaseAdmin.from('sucursal').select('*').order('created_at', { ascending: false }),
    ])

    return res.json({
      data: {
        empresa: normalizeCompany(empresa),
        impuestos: normalizeTaxes(impuestos),
        notificaciones: normalizeNotifications(notificaciones),
        umbrales: normalizeThresholds(umbrales),
        sucursales: (sucursales.data || []).map(normalizeSucursal),
      },
    })
  } catch (error) {
    return buildErrorResponse(res, error, 'No fue posible cargar la configuración.')
  }
}

export async function getParametros(req, res) {
  try {
    const [impuestos, notificaciones, umbrales] = await Promise.all([
      getSingleton('config_impuestos'),
      getSingleton('config_notificaciones'),
      getSingleton('config_umbrales'),
    ])

    return res.json({
      data: {
        impuestos: normalizeTaxes(impuestos),
        notificaciones: normalizeNotifications(notificaciones),
        umbrales: normalizeThresholds(umbrales),
      },
    })
  } catch (error) {
    return buildErrorResponse(res, error, 'No fue posible cargar los parámetros.')
  }
}

export async function updateEmpresa(req, res) {
  const nombreEmpresa = cleanText(req.body?.nombreEmpresa || req.body?.nombre_empresa)
  const nit = cleanText(req.body?.nit)
  const direccion = cleanText(req.body?.direccion)
  const telefono = cleanText(req.body?.telefono)
  const correo = cleanEmail(req.body?.correo)
  const logoUrl = cleanText(req.body?.logoUrl || req.body?.logo_url) || null

  if (!nombreEmpresa || !nit || !direccion || !telefono || !correo) {
    return res.status(400).json({ message: 'Todos los campos de empresa excepto el logotipo son obligatorios.' })
  }

  if (!validateEmail(correo)) {
    return res.status(400).json({ message: 'El correo electrónico no es válido.' })
  }

  try {
    const beforeData = await getSingleton('config_empresa')
    const data = await upsertSingleton('config_empresa', {
      nombre_empresa: nombreEmpresa,
      nit,
      direccion,
      telefono,
      correo,
      logo_url: logoUrl,
      updated_at: new Date().toISOString(),
    })

    await logAudit({
      entidad: 'config_empresa',
      entidadId: data.id,
      accion: 'ACTUALIZAR',
      beforeData,
      afterData: data,
      req,
    })

    return res.json({ data: normalizeCompany(data) })
  } catch (error) {
    return buildErrorResponse(res, error, 'No fue posible guardar los datos de la empresa.')
  }
}

export async function updateImpuestos(req, res) {
  const ivaActivo = toBoolean(req.body?.ivaActivo ?? req.body?.iva_activo, true)
  const ivaPorcentaje = toNumber(req.body?.ivaPorcentaje ?? req.body?.iva_porcentaje, 0)
  const otrosImpuestosInput = req.body?.otrosImpuestos ?? req.body?.otros_impuestos ?? []

  if (!validatePercentage(ivaPorcentaje)) {
    return res.status(400).json({ message: 'El porcentaje de IVA debe estar entre 0 y 100.' })
  }

  if (!Array.isArray(otrosImpuestosInput)) {
    return res.status(400).json({ message: 'Los impuestos adicionales deben enviarse como una lista.' })
  }

  const otrosImpuestos = otrosImpuestosInput.map(normalizeTaxItem).filter((item) => item.nombre)

  if (otrosImpuestos.some((item) => !validatePercentage(item.porcentaje))) {
    return res.status(400).json({ message: 'Los porcentajes de impuestos adicionales deben estar entre 0 y 100.' })
  }

  try {
    const beforeData = await getSingleton('config_impuestos')
    const data = await upsertSingleton('config_impuestos', {
      iva_activo: ivaActivo,
      iva_porcentaje: ivaPorcentaje,
      otros_impuestos: otrosImpuestos,
      updated_at: new Date().toISOString(),
    })

    await logAudit({
      entidad: 'config_impuestos',
      entidadId: data.id,
      accion: 'ACTUALIZAR',
      beforeData,
      afterData: data,
      req,
    })

    return res.json({ data: normalizeTaxes(data) })
  } catch (error) {
    return buildErrorResponse(res, error, 'No fue posible actualizar los impuestos.')
  }
}

export async function updateNotificaciones(req, res) {
  const payload = {
    alerta_stock_bajo: toBoolean(req.body?.alertaStockBajo ?? req.body?.alerta_stock_bajo, true),
    alerta_stock_critico: toBoolean(req.body?.alertaStockCritico ?? req.body?.alerta_stock_critico, true),
    confirmacion_ventas: toBoolean(req.body?.confirmacionVentas ?? req.body?.confirmacion_ventas, true),
    alertas_mantenimiento: toBoolean(req.body?.alertasMantenimiento ?? req.body?.alertas_mantenimiento, true),
    alertas_vencimiento: toBoolean(req.body?.alertasVencimiento ?? req.body?.alertas_vencimiento, true),
    alertas_compras_pendientes: toBoolean(req.body?.alertasComprasPendientes ?? req.body?.alertas_compras_pendientes, true),
    notificaciones_correo: toBoolean(req.body?.notificacionesCorreo ?? req.body?.notificaciones_correo, true),
    updated_at: new Date().toISOString(),
  }

  try {
    const beforeData = await getSingleton('config_notificaciones')
    const data = await upsertSingleton('config_notificaciones', payload)

    await logAudit({
      entidad: 'config_notificaciones',
      entidadId: data.id,
      accion: 'ACTUALIZAR',
      beforeData,
      afterData: data,
      req,
    })

    return res.json({ data: normalizeNotifications(data) })
  } catch (error) {
    return buildErrorResponse(res, error, 'No fue posible actualizar las notificaciones.')
  }
}

export async function updateUmbrales(req, res) {
  const stockBajoPorcentaje = toNumber(req.body?.stockBajoPorcentaje ?? req.body?.stock_bajo_porcentaje, 0)
  const stockCriticoPorcentaje = toNumber(req.body?.stockCriticoPorcentaje ?? req.body?.stock_critico_porcentaje, 0)
  const diasMantenimiento = toNumber(req.body?.diasMantenimiento ?? req.body?.dias_mantenimiento, 0)
  const diasVencimiento = toNumber(req.body?.diasVencimiento ?? req.body?.dias_vencimiento, 0)
  const parametrosExtra = req.body?.parametrosExtra ?? req.body?.parametros_extra ?? {}

  if (!validatePercentage(stockBajoPorcentaje) || !validatePercentage(stockCriticoPorcentaje)) {
    return res.status(400).json({ message: 'Los porcentajes de umbral deben estar entre 0 y 100.' })
  }

  if (stockCriticoPorcentaje >= stockBajoPorcentaje) {
    return res.status(400).json({ message: 'El stock crítico debe ser menor al stock bajo.' })
  }

  if (diasMantenimiento < 0 || diasVencimiento < 0) {
    return res.status(400).json({ message: 'Los días de anticipación no pueden ser negativos.' })
  }

  if (parametrosExtra && typeof parametrosExtra !== 'object') {
    return res.status(400).json({ message: 'Los parámetros adicionales deben ser un objeto.' })
  }

  try {
    const beforeData = await getSingleton('config_umbrales')
    const data = await upsertSingleton('config_umbrales', {
      stock_bajo_porcentaje: stockBajoPorcentaje,
      stock_critico_porcentaje: stockCriticoPorcentaje,
      dias_mantenimiento: diasMantenimiento,
      dias_vencimiento: diasVencimiento,
      parametros_extra: parametrosExtra || {},
      updated_at: new Date().toISOString(),
    })

    await logAudit({
      entidad: 'config_umbrales',
      entidadId: data.id,
      accion: 'ACTUALIZAR',
      beforeData,
      afterData: data,
      req,
    })

    return res.json({ data: normalizeThresholds(data) })
  } catch (error) {
    return buildErrorResponse(res, error, 'No fue posible actualizar los umbrales.')
  }
}

export async function listSucursales(req, res) {
  try {
    const { data, error } = await supabaseAdmin
      .from('sucursal')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      return buildErrorResponse(res, error, 'No fue posible cargar las sucursales.')
    }

    const sucursales = (data || []).map(normalizeSucursal)
    const activas = sucursales.filter((sucursal) => sucursal.activa).length

    return res.json({
      data: sucursales,
      meta: {
        total: sucursales.length,
        activas,
        inactivas: sucursales.length - activas,
      },
    })
  } catch (error) {
    return buildErrorResponse(res, error, 'No fue posible cargar las sucursales.')
  }
}

export async function createSucursal(req, res) {
  const nombre = cleanText(req.body?.nombre)
  const direccion = cleanText(req.body?.direccion)
  const telefono = cleanText(req.body?.telefono)
  const encargado = cleanText(req.body?.encargado) || null
  const activa = toBoolean(req.body?.activa, true)

  if (!nombre || !direccion || !telefono) {
    return res.status(400).json({ message: 'Nombre, dirección y teléfono son obligatorios.' })
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('sucursal')
      .insert({ nombre, direccion, telefono, encargado, activa })
      .select('*')
      .single()

    if (error || !data) {
      return buildErrorResponse(res, error, 'No fue posible crear la sucursal.', 400)
    }

    await logAudit({
      entidad: 'sucursal',
      entidadId: data.id,
      accion: 'CREAR',
      beforeData: null,
      afterData: data,
      req,
    })

    return res.status(201).json({ data: normalizeSucursal(data) })
  } catch (error) {
    return buildErrorResponse(res, error, 'No fue posible crear la sucursal.')
  }
}

export async function updateSucursal(req, res) {
  const { id } = req.params
  const nombre = req.body?.nombre !== undefined ? cleanText(req.body.nombre) : undefined
  const direccion = req.body?.direccion !== undefined ? cleanText(req.body.direccion) : undefined
  const telefono = req.body?.telefono !== undefined ? cleanText(req.body.telefono) : undefined
  const encargado = req.body?.encargado !== undefined ? cleanText(req.body.encargado) || null : undefined
  const activa = req.body?.activa !== undefined ? toBoolean(req.body.activa) : undefined

  if (!id || Number.isNaN(Number(id))) {
    return res.status(400).json({ message: 'El id de la sucursal es obligatorio.' })
  }

  try {
    const { data: beforeData, error: readError } = await supabaseAdmin
      .from('sucursal')
      .select('*')
      .eq('id', Number(id))
      .single()

    if (readError || !beforeData) {
      return buildErrorResponse(res, readError, 'No fue posible encontrar la sucursal.', 404)
    }

    const payload = {
      ...(nombre !== undefined ? { nombre } : {}),
      ...(direccion !== undefined ? { direccion } : {}),
      ...(telefono !== undefined ? { telefono } : {}),
      ...(encargado !== undefined ? { encargado } : {}),
      ...(activa !== undefined ? { activa } : {}),
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await supabaseAdmin
      .from('sucursal')
      .update(payload)
      .eq('id', Number(id))
      .select('*')
      .single()

    if (error || !data) {
      return buildErrorResponse(res, error, 'No fue posible actualizar la sucursal.', 400)
    }

    await logAudit({
      entidad: 'sucursal',
      entidadId: data.id,
      accion: activa !== undefined ? (activa ? 'ACTIVAR' : 'DESACTIVAR') : 'ACTUALIZAR',
      beforeData,
      afterData: data,
      req,
    })

    return res.json({ data: normalizeSucursal(data) })
  } catch (error) {
    return buildErrorResponse(res, error, 'No fue posible actualizar la sucursal.')
  }
}

export async function deleteSucursal(req, res) {
  const { id } = req.params

  if (!id || Number.isNaN(Number(id))) {
    return res.status(400).json({ message: 'El id de la sucursal es obligatorio.' })
  }

  try {
    const { data: beforeData, error: readError } = await supabaseAdmin
      .from('sucursal')
      .select('*')
      .eq('id', Number(id))
      .single()

    if (readError || !beforeData) {
      return buildErrorResponse(res, readError, 'No fue posible encontrar la sucursal.', 404)
    }

    const { data: hasRelations, error: relationError } = await supabaseAdmin.rpc('sucursal_tiene_relaciones', {
      p_sucursal_id: Number(id),
    })

    if (relationError) {
      return buildErrorResponse(res, relationError, 'No fue posible validar relaciones de la sucursal.', 400)
    }

    if (hasRelations) {
      return res.status(400).json({ message: 'No se puede eliminar la sucursal porque tiene registros relacionados.' })
    }

    const { error } = await supabaseAdmin
      .from('sucursal')
      .delete()
      .eq('id', Number(id))

    if (error) {
      return buildErrorResponse(res, error, 'No fue posible eliminar la sucursal.', 400)
    }

    await logAudit({
      entidad: 'sucursal',
      entidadId: id,
      accion: 'ELIMINAR',
      beforeData,
      afterData: null,
      req,
    })

    return res.json({ message: 'Sucursal eliminada correctamente.' })
  } catch (error) {
    return buildErrorResponse(res, error, 'No fue posible eliminar la sucursal.')
  }
}