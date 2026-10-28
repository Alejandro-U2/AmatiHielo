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
  try {
    const { count, error } = await supabaseAdmin
      .from(tableName)
      .select('*', { count: 'exact', head: true })

    if (error) {
      console.warn(`[EstructuraDatos] Error contando registros de ${tableName}:`, error.message)
      return 0
    }

    return count || 0
  } catch {
    return 0
  }
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

function sanitizeRecordPayload(body = {}, campos = []) {
  const payload = {}
  const campoMap = new Map(campos.map((c) => [c.nombre, c]))

  for (const [key, val] of Object.entries(body)) {
    if (key === 'id' || key === 'created_at' || key === 'updated_at') continue
    const campo = campoMap.get(key)
    if (!campo) continue

    if (val === null || val === undefined || val === '') {
      payload[key] = null
      continue
    }

    const tipo = campo.tipoDato.toLowerCase()
    if (tipo === 'boolean') {
      payload[key] = Boolean(val)
    } else if (tipo === 'integer' || tipo === 'bigint') {
      const parsed = parseInt(val, 10)
      payload[key] = Number.isNaN(parsed) ? null : parsed
    } else if (tipo === 'numeric') {
      const parsed = parseFloat(val)
      payload[key] = Number.isNaN(parsed) ? null : parsed
    } else {
      payload[key] = String(val).trim()
    }
  }

  return payload
}

export async function listRegistrosTabla(req, res) {
  const { id } = req.params
  if (!id || Number.isNaN(Number(id))) {
    return res.status(400).json({ message: 'El id de la tabla es obligatorio.' })
  }

  const page = Math.max(1, parseInt(req.query.page, 10) || 1)
  const pageSize = Math.max(1, Math.min(100, parseInt(req.query.pageSize, 10) || 20))
  const search = String(req.query.search || '').trim()

  try {
    const tabla = await fetchTablaById(Number(id))
    let query = supabaseAdmin
      .from(tabla.nombreInterno)
      .select('*', { count: 'exact' })

    if (search) {
      const textFields = tabla.campos.filter((c) => c.tipoDato === 'text').map((c) => c.nombre)
      if (textFields.length > 0) {
        const orClause = textFields.map((f) => `${f}.ilike.%${search}%`).join(',')
        query = query.or(orClause)
      }
    }

    const hasOrden = tabla.campos.some((c) => c.nombre === 'orden')
    if (hasOrden) {
      query = query.order('orden', { ascending: true })
    } else {
      query = query.order('id', { ascending: true })
    }

    const from = (page - 1) * pageSize
    const to = from + pageSize - 1
    query = query.range(from, to)

    const { data, count, error } = await query

    if (error) {
      return buildErrorResponse(res, error, 'No fue posible consultar los registros de la tabla.')
    }

    return res.json({
      data: data || [],
      total: count || 0,
      page,
      pageSize,
      campos: tabla.campos,
    })
  } catch (error) {
    return buildErrorResponse(res, error, 'No fue posible consultar los registros de la tabla.')
  }
}

export async function createRegistroTabla(req, res) {
  const { id } = req.params
  if (!id || Number.isNaN(Number(id))) {
    return res.status(400).json({ message: 'El id de la tabla es obligatorio.' })
  }

  try {
    const tabla = await fetchTablaById(Number(id))
    const payload = sanitizeRecordPayload(req.body, tabla.campos)

    for (const campo of tabla.campos) {
      if (campo.requerido && (payload[campo.nombre] === null || payload[campo.nombre] === undefined)) {
        return res.status(400).json({
          message: `El campo "${campo.nombre}" es obligatorio.`,
        })
      }
    }

    const { data, error } = await supabaseAdmin
      .from(tabla.nombreInterno)
      .insert(payload)
      .select()
      .single()

    if (error) {
      return buildErrorResponse(res, error, 'No fue posible crear el registro.')
    }

    return res.status(201).json({
      data,
      message: 'Registro creado exitosamente.',
    })
  } catch (error) {
    return buildErrorResponse(res, error, 'No fue posible crear el registro.')
  }
}

export async function updateRegistroTabla(req, res) {
  const { id, registroId } = req.params
  if (!id || Number.isNaN(Number(id)) || !registroId) {
    return res.status(400).json({ message: 'Id de tabla y registro son obligatorios.' })
  }

  try {
    const tabla = await fetchTablaById(Number(id))
    const payload = sanitizeRecordPayload(req.body, tabla.campos)

    const { data, error } = await supabaseAdmin
      .from(tabla.nombreInterno)
      .update(payload)
      .eq('id', registroId)
      .select()
      .single()

    if (error) {
      return buildErrorResponse(res, error, 'No fue posible actualizar el registro.')
    }

    return res.json({
      data,
      message: 'Registro actualizado exitosamente.',
    })
  } catch (error) {
    return buildErrorResponse(res, error, 'No fue posible actualizar el registro.')
  }
}

export async function deleteRegistroTabla(req, res) {
  const { id, registroId } = req.params
  if (!id || Number.isNaN(Number(id)) || !registroId) {
    return res.status(400).json({ message: 'Id de tabla y registro son obligatorios.' })
  }

  try {
    const tabla = await fetchTablaById(Number(id))

    const { error } = await supabaseAdmin
      .from(tabla.nombreInterno)
      .delete()
      .eq('id', registroId)

    if (error) {
      return buildErrorResponse(res, error, 'No fue posible eliminar el registro.')
    }

    return res.json({
      message: 'Registro eliminado exitosamente.',
    })
  } catch (error) {
    return buildErrorResponse(res, error, 'No fue posible eliminar el registro.')
  }
}