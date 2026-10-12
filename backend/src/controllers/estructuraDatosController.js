import { supabaseAdmin } from '../config/supabaseAdmin.js'

const TABLE_SELECT = `
  id,
  nombre_visible,
  nombre_interno,
  descripcion,
  modulo,
  es_sistema,
  created_at,
  updated_at,
  campo_estructura (
    id,
    nombre,
    tipo_dato,
    descripcion,
    requerido,
    unico,
    orden
  )
`

function buildErrorResponse(res, error, fallbackMessage, statusCode = 500) {
  return res.status(statusCode).json({
    message: error?.message || fallbackMessage,
  })
}

function normalizeCampo(campo = {}) {
  return {
    id: campo.id,
    nombre: campo.nombre,
    tipoDato: campo.tipo_dato,
    descripcion: campo.descripcion || '',
    requerido: Boolean(campo.requerido),
    unico: Boolean(campo.unico),
    orden: Number(campo.orden || 0),
  }
}

async function countRecordsForTable(tableName) {
  const { count, error } = await supabaseAdmin
    .from(tableName)
    .select('id', { count: 'exact', head: true })

  if (error) {
    throw error
  }

  return count || 0
}

function normalizeTabla(tabla = {}, registros = 0) {
  const campos = [...(tabla.campo_estructura || [])]
    .sort((a, b) => (a.orden || 0) - (b.orden || 0))
    .map(normalizeCampo)

  return {
    id: tabla.id,
    nombreVisible: tabla.nombre_visible,
    nombreInterno: tabla.nombre_interno,
    descripcion: tabla.descripcion || '',
    modulo: tabla.modulo,
    esSistema: Boolean(tabla.es_sistema),
    createdAt: tabla.created_at,
    updatedAt: tabla.updated_at,
    totalCampos: campos.length,
    totalRegistros: registros,
    campos,
  }
}

async function fetchTablaById(id) {
  const { data, error } = await supabaseAdmin
    .from('tabla_estructura')
    .select(TABLE_SELECT)
    .eq('id', id)
    .single()

  if (error || !data) {
    throw error || new Error('No fue posible cargar la tabla.')
  }

  const registros = await countRecordsForTable(data.nombre_interno)
  return normalizeTabla(data, registros)
}

function normalizeCampoInput(campo = {}) {
  return {
    nombre: String(campo.nombre || campo.nombreCampo || '').trim().toLowerCase(),
    tipoDato: String(campo.tipoDato || campo.tipo_dato || '').trim().toLowerCase(),
    descripcion: String(campo.descripcion || '').trim(),
    requerido: Boolean(campo.requerido),
    unico: Boolean(campo.unico),
  }
}

export async function listEstructuras(req, res) {
  try {
    const { data, error } = await supabaseAdmin
      .from('tabla_estructura')
      .select(TABLE_SELECT)
      .order('es_sistema', { ascending: false })
      .order('modulo', { ascending: true })
      .order('nombre_visible', { ascending: true })

    if (error) {
      return buildErrorResponse(res, error, 'No fue posible cargar las tablas.')
    }

    const tablas = await Promise.all((data || []).map(async (tabla) => {
      const registros = await countRecordsForTable(tabla.nombre_interno)
      return normalizeTabla(tabla, registros)
    }))

    const totalRegistros = tablas.reduce((sum, tabla) => sum + tabla.totalRegistros, 0)
    const totalModulos = new Set(tablas.map((tabla) => tabla.modulo)).size

    return res.json({
      data: tablas,
      meta: {
        totalTablas: tablas.length,
        totalModulos,
        totalRegistros,
        estadoSistema: 'Operativo',
      },
    })
  } catch (error) {
    return buildErrorResponse(res, error, 'No fue posible cargar las tablas.')
  }
}

export async function getEstructuraById(req, res) {
  const { id } = req.params

  if (!id || Number.isNaN(Number(id))) {
    return res.status(400).json({ message: 'El id de la tabla es obligatorio.' })
  }

  try {
    const tabla = await fetchTablaById(Number(id))
    return res.json({ data: tabla })
  } catch (error) {
    return buildErrorResponse(res, error, 'No fue posible cargar la tabla.', 400)
  }
}

export async function createEstructura(req, res) {
  const nombreInterno = String(req.body?.nombreInterno || req.body?.nombre_interno || '').trim()
  const nombreVisible = String(req.body?.nombreVisible || req.body?.nombre_visible || '').trim()
  const modulo = String(req.body?.modulo || '').trim()
  const descripcion = String(req.body?.descripcion || '').trim()
  const campos = req.body?.campos || req.body?.fields || []

  if (!nombreInterno || !nombreVisible || !modulo) {
    return res.status(400).json({
      message: 'Nombre interno, nombre visible y módulo son obligatorios.',
    })
  }

  if (!Array.isArray(campos) || campos.length === 0) {
    return res.status(400).json({
      message: 'Debe agregar al menos un campo.',
    })
  }

  const normalizedCampos = campos.map(normalizeCampoInput)

  if (normalizedCampos.some((campo) => !campo.nombre)) {
    return res.status(400).json({
      message: 'Todos los campos deben tener nombre.',
    })
  }

  const uniqueFieldNames = new Set(normalizedCampos.map((campo) => campo.nombre))
  if (uniqueFieldNames.size !== normalizedCampos.length) {
    return res.status(400).json({
      message: 'No se permiten nombres de campos duplicados.',
    })
  }

  try {
    const { data, error } = await supabaseAdmin.rpc('crear_tabla_estructura', {
      p_nombre_interno: nombreInterno,
      p_nombre_visible: nombreVisible,
      p_modulo: modulo,
      p_descripcion: descripcion || null,
      p_campos: normalizedCampos,
    })

    if (error || !data) {
      return buildErrorResponse(res, error, 'No fue posible crear la tabla.', 400)
    }

    const tabla = await fetchTablaById(data.id)
    return res.status(201).json({ data: tabla })
  } catch (error) {
    return buildErrorResponse(res, error, 'No fue posible crear la tabla.')
  }
}

export async function deleteEstructura(req, res) {
  const { id } = req.params

  if (!id || Number.isNaN(Number(id))) {
    return res.status(400).json({ message: 'El id de la tabla es obligatorio.' })
  }

  try {
    const { error } = await supabaseAdmin.rpc('eliminar_tabla_estructura', {
      p_tabla_id: Number(id),
    })

    if (error) {
      return buildErrorResponse(res, error, 'No fue posible eliminar la tabla.', 400)
    }

    return res.json({ message: 'Tabla eliminada correctamente.' })
  } catch (error) {
    return buildErrorResponse(res, error, 'No fue posible eliminar la tabla.')
  }
}