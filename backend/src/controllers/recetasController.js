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

function normalizeRecetaPayload(body = {}) {
  const payload = {
    codigo: body.codigo?.trim(),
    nombre: body.nombre?.trim(),
    categoria: body.categoria?.trim() || 'Bebidas',
    presentacion: body.presentacion?.trim() || null,
    costo_electricidad: parseOptionalNumber(body.costoElectricidad ?? body.costo_electricidad) ?? 0,
    costo_mano_obra: parseOptionalNumber(body.costoManoObra ?? body.costo_mano_obra) ?? 0,
    costo_agua: parseOptionalNumber(body.costoAgua ?? body.costo_agua) ?? 0,
    costo_local: parseOptionalNumber(body.costoLocal ?? body.costo_local) ?? 0,
  }

  const precioVenta = parseOptionalNumber(body.precioVenta ?? body.precioSugerido ?? body.precio_sugerido)
  if (precioVenta !== null) {
    payload.precio_sugerido = precioVenta
  }

  return payload
}

function formatRecetaCodigo(numero) {
  return `REC-${String(numero).padStart(2, '0')}`
}

async function generarCodigoReceta() {
  const { data, error } = await supabaseAdmin
    .from('receta')
    .select('codigo')

  if (error) {
    throw error
  }

  const maxNumero = (data || []).reduce((max, row) => {
    const match = String(row.codigo || '').match(/^REC-(\d+)$/i)
    if (!match) {
      return max
    }

    const numero = Number(match[1])
    return Number.isFinite(numero) && numero > max ? numero : max
  }, 0)

  return formatRecetaCodigo(maxNumero + 1)
}

const RECETA_FIELDS = 'id, codigo, nombre, categoria, presentacion, costo_electricidad, costo_mano_obra, costo_agua, costo_local, subtotal_materia_prima, costos_produccion, costo_total, precio_sugerido, created_at, updated_at'

async function recalcularCostosReceta(recetaId) {
  const { data: ingredientes } = await supabaseAdmin
    .from('ingrediente_receta')
    .select('cantidad, costo_unitario, contenido_total')
    .eq('receta_id', recetaId)

  const subtotalMateriaPrima = (ingredientes || []).reduce((sum, ing) => {
    const cantidad = Number(ing.cantidad || 0)
    const costoUnitario = Number(ing.costo_unitario || 0)
    const contenidoTotal = Number(ing.contenido_total || 0)
    if (contenidoTotal > 0 && costoUnitario > 0) {
      return sum + (cantidad * (costoUnitario / contenidoTotal))
    }
    return sum + (cantidad * costoUnitario)
  }, 0)

  const { data: receta } = await supabaseAdmin
    .from('receta')
    .select('costo_electricidad, costo_mano_obra, costo_agua, costo_local')
    .eq('id', recetaId)
    .single()

  const costosProduccion = receta
    ? Number(receta.costo_electricidad || 0)
      + Number(receta.costo_mano_obra || 0)
      + Number(receta.costo_agua || 0)
      + Number(receta.costo_local || 0)
    : 0

  const costoTotal = subtotalMateriaPrima + costosProduccion

  await supabaseAdmin
    .from('receta')
    .update({
      subtotal_materia_prima: subtotalMateriaPrima,
      costos_produccion: costosProduccion,
      costo_total: costoTotal,
    })
    .eq('id', recetaId)

  return { subtotalMateriaPrima, costosProduccion, costoTotal }
}

export async function listRecetas(req, res) {
  try {
    const { data, error } = await supabaseAdmin
      .from('receta')
      .select(RECETA_FIELDS)
      .order('created_at', { ascending: false })

    if (error) {
      return buildErrorResponse(res, error, 'No fue posible cargar las recetas.')
    }

    if (!data || data.length === 0) {
      return res.json({ data: [] })
    }

    // Cargar ingredientes para cada receta
    const recetaIds = data.map(r => r.id)
    const { data: ingredientes, error: errorIng } = await supabaseAdmin
      .from('ingrediente_receta')
      .select('*')
      .in('receta_id', recetaIds)

    if (errorIng) {
      return buildErrorResponse(res, errorIng, 'No fue posible cargar ingredientes.')
    }

    const ingredientesMap = new Map()
    ;(ingredientes || []).forEach(ing => {
      if (!ingredientesMap.has(ing.receta_id)) {
        ingredientesMap.set(ing.receta_id, [])
      }
      ingredientesMap.get(ing.receta_id).push(ing)
    })

    const dataWithIngredientes = data.map(receta => ({
      ...receta,
      ingredientes: ingredientesMap.get(receta.id) || [],
    }))

    return res.json({ data: dataWithIngredientes })
  } catch (error) {
    return buildErrorResponse(res, error, 'No fue posible cargar las recetas.')
  }
}

export async function listCategoriasReceta(req, res) {
  try {
    const { data, error } = await supabaseAdmin
      .from('catalogo_categoria_receta')
      .select('id, codigo, nombre, descripcion, activo, es_sistema, orden, created_at, updated_at')
      .eq('activo', true)
      .order('orden', { ascending: true })
      .order('nombre', { ascending: true })

    if (error) {
      return buildErrorResponse(res, error, 'No fue posible cargar las categorias de recetas.')
    }

    return res.json({ data: data || [] })
  } catch (error) {
    return buildErrorResponse(res, error, 'No fue posible cargar las categorias de recetas.')
  }
}

const CATALOGO_RECETA_FIELDS = 'id, codigo, nombre, descripcion, activo, es_sistema, orden, created_at, updated_at'

export async function listPresentacionesReceta(req, res) {
  try {
    const { data, error } = await supabaseAdmin
      .from('catalogo_presentacion_receta')
      .select(CATALOGO_RECETA_FIELDS)
      .eq('activo', true)
      .order('orden', { ascending: true })
      .order('nombre', { ascending: true })

    if (error) {
      return buildErrorResponse(res, error, 'No fue posible cargar las presentaciones de recetas.')
    }

    return res.json({ data: data || [] })
  } catch (error) {
    return buildErrorResponse(res, error, 'No fue posible cargar las presentaciones de recetas.')
  }
}

export async function listUnidadesMedida(req, res) {
  try {
    const { data, error } = await supabaseAdmin
      .from('unidad_medida')
      .select(CATALOGO_RECETA_FIELDS)
      .eq('activo', true)
      .order('orden', { ascending: true })
      .order('nombre', { ascending: true })

    if (error) {
      return buildErrorResponse(res, error, 'No fue posible cargar las unidades de medida.')
    }

    return res.json({ data: data || [] })
  } catch (error) {
    return buildErrorResponse(res, error, 'No fue posible cargar las unidades de medida.')
  }
}

export async function getRecetaById(req, res) {
  const { id } = req.params

  if (!id) {
    return res.status(400).json({ message: 'El id de la receta es obligatorio.' })
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('receta')
      .select(RECETA_FIELDS)
      .eq('id', id)
      .single()

    if (error || !data) {
      return buildErrorResponse(res, error, 'Receta no encontrada.', 404)
    }

    // Cargar ingredientes
    const { data: ingredientes } = await supabaseAdmin
      .from('ingrediente_receta')
      .select('*')
      .eq('receta_id', id)

    return res.json({ data: { ...data, ingredientes: ingredientes || [] } })
  } catch (error) {
    return buildErrorResponse(res, error, 'No fue posible cargar la receta.')
  }
}

export async function createReceta(req, res) {
  const payload = normalizeRecetaPayload(req.body)

  if (!payload.nombre || !payload.categoria) {
    return res.status(400).json({
      message: 'nombre y categoria son obligatorios.',
    })
  }

  try {
    const codigo = payload.codigo || await generarCodigoReceta()
    const { data, error } = await supabaseAdmin
      .from('receta')
      .insert({
        ...payload,
        codigo,
      })
      .select(RECETA_FIELDS)
      .single()

    if (error || !data) {
      return buildErrorResponse(res, error, 'No fue posible crear la receta.', 400)
    }

    return res.status(201).json({ data: { ...data, ingredientes: [] } })
  } catch (error) {
    return buildErrorResponse(res, error, 'No fue posible crear la receta.')
  }
}

export async function updateReceta(req, res) {
  const { id } = req.params
  const payload = normalizeRecetaPayload(req.body)

  if (!id) {
    return res.status(400).json({ message: 'El id de la receta es obligatorio.' })
  }

  if (!payload.nombre || !payload.categoria) {
    return res.status(400).json({
      message: 'nombre y categoria son obligatorios.',
    })
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('receta')
      .update(payload)
      .eq('id', id)
      .select(RECETA_FIELDS)
      .single()

    if (error || !data) {
      return buildErrorResponse(res, error, 'No fue posible actualizar la receta.', 400)
    }

    const costos = await recalcularCostosReceta(id)

    return res.json({ data: { ...data, ...costos } })
  } catch (error) {
    return buildErrorResponse(res, error, 'No fue posible actualizar la receta.')
  }
}

export async function deleteReceta(req, res) {
  const { id } = req.params

  if (!id) {
    return res.status(400).json({ message: 'El id de la receta es obligatorio.' })
  }

  try {
    const { error } = await supabaseAdmin
      .from('receta')
      .delete()
      .eq('id', id)

    if (error) {
      return buildErrorResponse(res, error, 'No fue posible eliminar la receta.', 400)
    }

    return res.json({ message: 'Receta eliminada exitosamente.' })
  } catch (error) {
    return buildErrorResponse(res, error, 'No fue posible eliminar la receta.')
  }
}

export async function addIngrediente(req, res) {
  const { recetaId } = req.params
  const { nombre, cantidad, unidad, costoUnitario, contenidoTotal, productoId, producto_id } = req.body

  if (!recetaId || !nombre || !cantidad || !unidad) {
    return res.status(400).json({
      message: 'recetaId, nombre, cantidad y unidad son obligatorios.',
    })
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('ingrediente_receta')
      .insert({
        receta_id: recetaId,
        producto_id: productoId ?? producto_id ?? null,
        nombre: nombre.trim(),
        cantidad: Number(cantidad),
        unidad: unidad.trim(),
        contenido_total: parseOptionalNumber(contenidoTotal),
        costo_unitario: parseOptionalNumber(costoUnitario),
      })
      .select('*')
      .single()

    if (error || !data) {
      return buildErrorResponse(res, error, 'No fue posible agregar el ingrediente.', 400)
    }

    const costos = await recalcularCostosReceta(recetaId)

    return res.status(201).json({ data, receta: costos })
  } catch (error) {
    return buildErrorResponse(res, error, 'No fue posible agregar el ingrediente.')
  }
}

export async function updateIngrediente(req, res) {
  const { id, recetaId } = req.params
  const { nombre, cantidad, unidad, costoUnitario, contenidoTotal, productoId, producto_id } = req.body

  if (!id) {
    return res.status(400).json({ message: 'El id del ingrediente es obligatorio.' })
  }

  try {
    const payload = {
      producto_id: productoId ?? producto_id ?? null,
      nombre: nombre?.trim(),
      cantidad: parseOptionalNumber(cantidad),
      unidad: unidad?.trim(),
      contenido_total: parseOptionalNumber(contenidoTotal),
      costo_unitario: parseOptionalNumber(costoUnitario),
    }

    const { data, error } = await supabaseAdmin
      .from('ingrediente_receta')
      .update(payload)
      .eq('id', id)
      .select('*')
      .single()

    if (error || !data) {
      return buildErrorResponse(res, error, 'No fue posible actualizar el ingrediente.', 400)
    }

    const costos = await recalcularCostosReceta(recetaId)

    return res.json({ data, receta: costos })
  } catch (error) {
    return buildErrorResponse(res, error, 'No fue posible actualizar el ingrediente.')
  }
}

export async function deleteIngrediente(req, res) {
  const { id, recetaId } = req.params

  if (!id) {
    return res.status(400).json({ message: 'El id del ingrediente es obligatorio.' })
  }

  try {
    const { error } = await supabaseAdmin
      .from('ingrediente_receta')
      .delete()
      .eq('id', id)

    if (error) {
      return buildErrorResponse(res, error, 'No fue posible eliminar el ingrediente.', 400)
    }

    const costos = await recalcularCostosReceta(recetaId)

    return res.json({ message: 'Ingrediente eliminado exitosamente.', receta: costos })
  } catch (error) {
    return buildErrorResponse(res, error, 'No fue posible eliminar el ingrediente.')
  }
}

export async function listPlanesProduccion(req, res) {
  try {
    const { data, error } = await supabaseAdmin
      .from('plan_produccion')
      .select('id, receta_id, cantidad_planificada, demanda_proyectada, created_at')
      .order('created_at', { ascending: false })

    if (error) {
      return buildErrorResponse(res, error, 'No fue posible cargar los planes.')
    }

    return res.json({ data: data || [] })
  } catch (error) {
    return buildErrorResponse(res, error, 'No fue posible cargar los planes.')
  }
}

export async function createPlanProduccion(req, res) {
  const { recetaId, cantidadPlanificada, demandaProyectada } = req.body

  if (!recetaId || !cantidadPlanificada) {
    return res.status(400).json({
      message: 'recetaId y cantidadPlanificada son obligatorios.',
    })
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('plan_produccion')
      .insert({
        receta_id: recetaId,
        cantidad_planificada: Number(cantidadPlanificada),
        demanda_proyectada: parseOptionalNumber(demandaProyectada),
      })
      .select('*')
      .single()

    if (error || !data) {
      return buildErrorResponse(res, error, 'No fue posible crear el plan.', 400)
    }

    return res.status(201).json({ data })
  } catch (error) {
    return buildErrorResponse(res, error, 'No fue posible crear el plan.')
  }
}

export async function deletePlanProduccion(req, res) {
  const { id } = req.params

  if (!id) {
    return res.status(400).json({ message: 'El id del plan es obligatorio.' })
  }

  try {
    const { error } = await supabaseAdmin
      .from('plan_produccion')
      .delete()
      .eq('id', id)

    if (error) {
      return buildErrorResponse(res, error, 'No fue posible eliminar el plan.', 400)
    }

    return res.json({ message: 'Plan eliminado exitosamente.' })
  } catch (error) {
    return buildErrorResponse(res, error, 'No fue posible eliminar el plan.')
  }
}

export async function listProducciones(req, res) {
  try {
    const { data, error } = await supabaseAdmin
      .from('produccion')
      .select('id, receta_id, cantidad, usuario, lote, created_at')
      .order('created_at', { ascending: false })

    if (error) {
      return buildErrorResponse(res, error, 'No fue posible cargar las producciones.')
    }

    return res.json({ data: data || [] })
  } catch (error) {
    return buildErrorResponse(res, error, 'No fue posible cargar las producciones.')
  }
}

export async function createProduccion(req, res) {
  const { recetaId, cantidad, usuario, lote } = req.body

  if (!recetaId || !cantidad) {
    return res.status(400).json({
      message: 'recetaId y cantidad son obligatorios.',
    })
  }

  try {
    const usuarioRegistro = usuario || req.auth?.profile?.nombre || req.auth?.user?.email || 'Sistema'

    const { data, error } = await supabaseAdmin
      .from('produccion')
      .insert({
        receta_id: recetaId,
        cantidad: Number(cantidad),
        usuario: usuarioRegistro,
        lote: lote || null,
      })
      .select('*')
      .single()

    if (error || !data) {
      return buildErrorResponse(res, error, 'No fue posible registrar la producción.', 400)
    }

    return res.status(201).json({ data })
  } catch (error) {
    return buildErrorResponse(res, error, 'No fue posible registrar la producción.')
  }
}

export async function getProduccionesRango(req, res) {
  const { fechaInicio, fechaFin } = req.body

  if (!fechaInicio || !fechaFin) {
    return res.status(400).json({
      message: 'fechaInicio y fechaFin son obligatorios.',
    })
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('produccion')
      .select('id, receta_id, cantidad, usuario, lote, created_at')
      .gte('created_at', fechaInicio)
      .lte('created_at', fechaFin)
      .order('created_at', { ascending: false })

    if (error) {
      return buildErrorResponse(res, error, 'No fue posible cargar las producciones.')
    }

    return res.json({ data: data || [] })
  } catch (error) {
    return buildErrorResponse(res, error, 'No fue posible cargar las producciones.')
  }
}
