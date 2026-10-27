import { supabaseAdmin } from '../config/supabaseAdmin.js'

function buildErrorResponse(res, error, fallbackMessage, statusCode = 500) {
  return res.status(statusCode).json({
    message: error?.message || fallbackMessage,
  })
}

// Almacén en memoria de respaldo si la tabla física aún no ha sido migrada en Supabase
const memoryAuditorias = new Map()
const memoryDetalles = new Map()
let isTableChecked = false
let hasDbTable = true

async function checkTableExists() {
  if (isTableChecked) return hasDbTable
  try {
    const { error } = await supabaseAdmin
      .from('auditoria_inventario')
      .select('id')
      .limit(1)
    if (error && (error.code === '42P01' || error.message?.includes('does not exist'))) {
      hasDbTable = false
    } else {
      hasDbTable = true
    }
  } catch {
    hasDbTable = false
  }
  isTableChecked = true
  return hasDbTable
}

function normalizeAuditoriaHeader(row) {
  if (!row) return null
  return {
    id: row.id,
    codigo: row.codigo,
    nombre: row.nombre,
    periodoMes: Number(row.periodo_mes ?? row.periodoMes),
    periodoAnio: Number(row.periodo_anio ?? row.periodoAnio),
    fechaCorte: row.fecha_corte ?? row.fechaCorte,
    responsableId: row.responsable_id ?? row.responsableId,
    responsableNombre: row.responsable_nombre ?? row.responsableNombre,
    responsableRol: row.responsable_rol ?? row.responsableRol,
    descripcion: row.descripcion || '',
    tipoAlcance:
      row.tipo_alcance === 'TODO' || row.tipoAlcance === 'TODO'
        ? 'Todo el inventario'
        : row.tipo_alcance === 'CATEGORIA' || row.tipoAlcance === 'CATEGORIA'
        ? 'Por categoría'
        : row.tipo_alcance === 'ESPECIFICO' || row.tipoAlcance === 'ESPECIFICO'
        ? 'Productos específicos'
        : row.tipo_alcance ?? row.tipoAlcance ?? 'Todo el inventario',
    alcanceConfig: row.alcance_config ?? row.alcanceConfig ?? {},
    estado: row.estado || 'Borrador',
    iniciadoAt: row.iniciado_at ?? row.iniciadoAt,
    iniciadoPor: row.iniciado_por ?? row.iniciadoPor,
    enviadoRevisionAt: row.enviado_revision_at ?? row.enviadoRevisionAt,
    enviadoRevisionPor: row.enviado_revision_por ?? row.enviadoRevisionPor,
    cerradoAt: row.cerrado_at ?? row.cerradoAt,
    cerradoPor: row.cerrado_por ?? row.cerradoPor,
    resumenFinal: row.resumen_final ?? row.resumenFinal ?? {},
    createdBy: row.created_by ?? row.createdBy,
    createdAt: row.created_at ?? row.createdAt,
    updatedAt: row.updated_at ?? row.updatedAt,
    totalProductos: Number(row.resumen_final?.totalProductos ?? row.total_productos ?? row.totalProductos ?? 0),
    totalDiferencias: Number(row.resumen_final?.totalConDiferencia ?? row.total_diferencias ?? row.totalDiferencias ?? 0),
  }
}

function normalizeAuditoriaDetalle(row) {
  if (!row) return null
  const cod = row.codigo ?? row.codigo_producto ?? row.codigoProducto ?? ''
  const nom = row.nombre ?? row.nombre_producto ?? row.nombreProducto ?? ''
  const uni = row.unidad ?? row.unidad_medida ?? row.unidadMedida ?? 'Unidad'
  const teorico = Number(row.stock_teorico ?? row.stockTeorico ?? 0)
  const fisico =
    row.stock_fisico !== null && row.stock_fisico !== undefined
      ? Number(row.stock_fisico)
      : row.stockFisico !== null && row.stockFisico !== undefined
      ? Number(row.stockFisico)
      : row.stock_fisico_1 !== null && row.stock_fisico_1 !== undefined
      ? Number(row.stock_fisico_1)
      : null
  const dif =
    row.diferencia !== null && row.diferencia !== undefined
      ? Number(row.diferencia)
      : null
  const costo = Number(row.costo_unitario ?? row.costoUnitario ?? row.precio_compra ?? 0)
  const impacto = Number(row.impacto_economico ?? row.impactoEconomico ?? 0)

  return {
    id: row.id,
    auditoriaId: row.auditoria_id ?? row.auditoriaId,
    productoId: row.producto_id ?? row.productoId,
    // Propiedades accesibles con cualquier convención
    codigo: cod,
    codigo_producto: cod,
    codigoProducto: cod,
    nombre: nom,
    nombre_producto: nom,
    nombreProducto: nom,
    categoria: row.categoria || 'General',
    unidad: uni,
    unidad_medida: uni,
    unidadMedida: uni,
    presentacion: row.presentacion || '',
    ubicacion: row.ubicacion || 'Bodega Principal',
    stock_teorico: teorico,
    stockTeorico: teorico,
    stock_fisico: fisico,
    stock_fisico_1: fisico,
    stockFisico: fisico,
    diferencia: dif,
    costo_unitario: costo,
    costoUnitario: costo,
    impacto_economico: impacto,
    impactoEconomico: impacto,
    porcentaje_diferencia:
      row.porcentaje_diferencia ??
      row.porcentajeDiferencia ??
      (teorico > 0 && dif !== null ? (dif / teorico) * 100 : 0),
    motivo: row.motivo || row.motivo_discrepancia || '',
    motivo_discrepancia: row.motivo || row.motivo_discrepancia || '',
    justificacion: row.justificacion || '',
    estado_conteo: row.estado_conteo ?? row.estadoConteo ?? 'Pendiente',
    estadoConteo: row.estado_conteo ?? row.estadoConteo ?? 'Pendiente',
    estado_diferencia: row.estado_diferencia ?? row.estadoDiferencia ?? 'Conciliado',
    estadoDiferencia: row.estado_diferencia ?? row.estadoDiferencia ?? 'Conciliado',
    contadoPor: (row.contado_por ?? row.contadoPor) || null,
    contadoAt: (row.contado_at ?? row.contadoAt) || null,
    historialConteos: row.historial_conteos ?? row.historialConteos ?? [],
    ajuste_aplicado: Boolean(row.ajuste_aprobado ?? row.ajusteAprobado ?? row.ajuste_aplicado),
    ajusteAprobado: Boolean(row.ajuste_aprobado ?? row.ajusteAprobado),
    ajusteAprobadoPor: (row.ajuste_aprobado_por ?? row.ajusteAprobadoPor) || null,
    ajusteAprobadoAt: (row.ajuste_aprobado_at ?? row.ajusteAprobadoAt) || null,
    ajusteMovimientoId: (row.ajuste_movimiento_id ?? row.ajusteMovimientoId) || null,
    observaciones: row.observaciones || '',
    createdAt: row.created_at ?? row.createdAt,
    updatedAt: row.updated_at ?? row.updatedAt,
  }
}

export async function listAuditorias(req, res) {
  try {
    const { mes, anio, estado, search } = req.query || {}
    const useDb = await checkTableExists()

    let items = []

    if (useDb) {
      let query = supabaseAdmin
        .from('auditoria_inventario')
        .select(`
          *,
          auditoria_inventario_detalle (
            id,
            diferencia,
            estado_diferencia,
            ajuste_aprobado
          )
        `)
        .order('created_at', { ascending: false })

      if (mes && mes !== 'todos') query = query.eq('periodo_mes', Number(mes))
      if (anio && anio !== 'todos') query = query.eq('periodo_anio', Number(anio))
      if (estado && estado !== 'todos') query = query.eq('estado', estado)

      const { data, error } = await query
      if (error) return buildErrorResponse(res, error, 'No fue posible cargar las auditorías.')

      items = (data || []).map((row) => {
        const detalles = row.auditoria_inventario_detalle || []
        const totalProductos = detalles.length
        const totalDiferencias = detalles.filter(
          (d) => d.diferencia !== null && Number(d.diferencia) !== 0
        ).length
        const norm = normalizeAuditoriaHeader(row)
        norm.totalProductos = totalProductos
        norm.totalDiferencias = totalDiferencias
        norm.detallesResumen = detalles
        return norm
      })
    } else {
      // Respaldo en memoria
      items = Array.from(memoryAuditorias.values()).map((row) => {
        const detalles = memoryDetalles.get(row.id) || []
        const norm = normalizeAuditoriaHeader(row)
        norm.totalProductos = detalles.length
        norm.totalDiferencias = detalles.filter(
          (d) => d.diferencia !== null && Number(d.diferencia) !== 0
        ).length
        norm.detallesResumen = detalles
        return norm
      })

      if (mes && mes !== 'todos') items = items.filter((a) => a.periodoMes === Number(mes))
      if (anio && anio !== 'todos') items = items.filter((a) => a.periodoAnio === Number(anio))
      if (estado && estado !== 'todos') items = items.filter((a) => a.estado === estado)
    }

    if (search && search.trim()) {
      const q = search.trim().toLowerCase()
      items = items.filter(
        (a) =>
          a.codigo.toLowerCase().includes(q) ||
          a.nombre.toLowerCase().includes(q) ||
          a.responsableNombre.toLowerCase().includes(q)
      )
    }

    // Calcular las 4 tarjetas KPI globales
    const allAuditorias = useDb
      ? (
          await supabaseAdmin.from('auditoria_inventario').select(`
            id, estado,
            auditoria_inventario_detalle(id, diferencia, estado_diferencia)
          `)
        ).data || []
      : Array.from(memoryAuditorias.values()).map((row) => ({
          ...row,
          auditoria_inventario_detalle: memoryDetalles.get(row.id) || [],
        }))

    const kpis = {
      pendientes: 0,
      conDiferencias: 0,
      pendientesAprobacion: 0,
      cerradas: 0,
    }

    allAuditorias.forEach((aud) => {
      const est = aud.estado
      const dets = aud.auditoria_inventario_detalle || []
      if (['Borrador', 'En conteo', 'En revisión'].includes(est)) {
        kpis.pendientes += 1
      }
      if (est === 'Pendiente de aprobación') {
        kpis.pendientesAprobacion += 1
      }
      if (est === 'Cerrada') {
        kpis.cerradas += 1
      }
      const tieneDif = dets.some((d) => d.diferencia !== null && Number(d.diferencia) !== 0)
      if (tieneDif && est !== 'Cancelada') {
        kpis.conDiferencias += 1
      }
    })

    return res.json({ data: items, kpis })
  } catch (error) {
    return buildErrorResponse(res, error, 'No fue posible consultar las auditorías.')
  }
}

export async function getAuditoriaById(req, res) {
  try {
    const id = Number(req.params.id)
    if (!Number.isInteger(id)) {
      return res.status(400).json({ message: 'El ID de la auditoría es inválido.' })
    }

    const useDb = await checkTableExists()
    if (useDb) {
      const { data: header, error: headerErr } = await supabaseAdmin
        .from('auditoria_inventario')
        .select('*')
        .eq('id', id)
        .single()

      if (headerErr || !header) {
        return res.status(404).json({ message: 'Auditoría no encontrada.' })
      }

      const { data: detalles, error: detErr } = await supabaseAdmin
        .from('auditoria_inventario_detalle')
        .select('*')
        .eq('auditoria_id', id)
        .order('id', { ascending: true })

      if (detErr) {
        return buildErrorResponse(res, detErr, 'No fue posible cargar el detalle de la auditoría.')
      }

      const normHeader = normalizeAuditoriaHeader(header)
      const mappedDetalles = (detalles || []).map(normalizeAuditoriaDetalle)
      normHeader.detalles = mappedDetalles
      return res.json({
        data: {
          ...normHeader,
          auditoria: normHeader,
          detalles: mappedDetalles,
        },
      })
    } else {
      const header = memoryAuditorias.get(id)
      if (!header) return res.status(404).json({ message: 'Auditoría no encontrada.' })
      const detalles = memoryDetalles.get(id) || []
      const normHeader = normalizeAuditoriaHeader(header)
      const mappedDetalles = detalles.map(normalizeAuditoriaDetalle)
      normHeader.detalles = mappedDetalles
      return res.json({
        data: {
          ...normHeader,
          auditoria: normHeader,
          detalles: mappedDetalles,
        },
      })
    }
  } catch (error) {
    return buildErrorResponse(res, error, 'No fue posible cargar la auditoría.')
  }
}

export async function createAuditoria(req, res) {
  try {
    const body = req.body || {}
    const {
      nombre,
      periodoMes,
      periodoAnio,
      fechaCorte,
      responsableId,
      responsableNombre,
      responsableRol,
      descripcion,
      tipoAlcance,
      alcanceConfig,
      esBorrador,
    } = body

    if (!nombre || !periodoMes || !periodoAnio || !fechaCorte || !responsableNombre || !tipoAlcance) {
      return res.status(400).json({
        message: 'Todos los campos obligatorios del asistente deben ser completados.',
      })
    }

    // Normalizar tipo de alcance para coincidir con la BD ('TODO' | 'CATEGORIA' | 'ESPECIFICO')
    let tipoAlcanceNormalizado = 'TODO'
    const strAlcance = String(tipoAlcance || '').toLowerCase()
    if (strAlcance.includes('cat')) {
      tipoAlcanceNormalizado = 'CATEGORIA'
    } else if (strAlcance.includes('esp') || strAlcance.includes('prod')) {
      tipoAlcanceNormalizado = 'ESPECIFICO'
    } else {
      tipoAlcanceNormalizado = 'TODO'
    }

    // Cargar todos los productos de inventario elegibles
    const { data: todosProductos, error: prodErr } = await supabaseAdmin
      .from('producto')
      .select('id, codigo, nombre, categoria, stock, unidad, costo_unitario, precio_compra, estado')
      .order('nombre', { ascending: true })

    if (prodErr && !todosProductos && (!body.productosSeleccionados || body.productosSeleccionados.length === 0)) {
      return buildErrorResponse(res, prodErr, 'No fue posible leer el catálogo de productos.')
    }

    // Filtrar productos según el alcance seleccionado
    let productosSeleccionados = []

    if (Array.isArray(body.productosSeleccionados) && body.productosSeleccionados.length > 0) {
      const mapDb = new Map((todosProductos || []).map((p) => [String(p.id), p]))
      productosSeleccionados = body.productosSeleccionados.map((item) => {
        const fromDb = mapDb.get(String(item.id))
        return {
          id: item.id,
          codigo: item.codigo || fromDb?.codigo || 'ART',
          nombre: item.nombre || fromDb?.nombre || 'Producto',
          categoria: item.categoria || fromDb?.categoria || 'General',
          unidad_medida: item.unidad_medida || item.unidad || fromDb?.unidad || 'Unidad',
          presentacion: item.presentacion || fromDb?.presentacion || '',
          stock: item.stock !== undefined ? Number(item.stock) : Number(fromDb?.stock || 0),
          costo_unitario: Number(item.costo_unitario ?? fromDb?.costo_unitario ?? fromDb?.precio_compra ?? 0),
        }
      })
    } else {
      const prodsList = todosProductos || []
      if (tipoAlcanceNormalizado === 'TODO') {
        productosSeleccionados = prodsList
      } else if (tipoAlcanceNormalizado === 'CATEGORIA') {
        const categoriasElegidas = Array.isArray(alcanceConfig?.categorias)
          ? alcanceConfig.categorias
          : []
        productosSeleccionados = prodsList.filter((p) =>
          categoriasElegidas.includes(p.categoria)
        )
      } else if (tipoAlcanceNormalizado === 'ESPECIFICO') {
        const idsElegidos = Array.isArray(alcanceConfig?.productos || alcanceConfig?.productosIds)
          ? (alcanceConfig.productos || alcanceConfig.productosIds).map(String)
          : []
        productosSeleccionados = prodsList.filter((p) =>
          idsElegidos.includes(String(p.id))
        )
      }
    }

    if (productosSeleccionados.length === 0) {
      return res.status(400).json({
        message: 'El alcance seleccionado no contiene ningún producto activo para auditar.',
      })
    }

    // Generar código correlativo AUD-YYYY-MM-###
    const mm = String(periodoMes).padStart(2, '0')
    const yyyy = String(periodoAnio)
    const randomSuffix = Math.floor(100 + Math.random() * 900)
    const codigo = `AUD-${yyyy}-${mm}-${randomSuffix}`

    const userEmail = req.auth?.user?.email || req.auth?.profile?.nombre || 'Administrador'
    const nowIso = new Date().toISOString()
    const estadoInicial = esBorrador ? 'Borrador' : 'En conteo'

    const headerPayload = {
      codigo,
      nombre: nombre.trim(),
      periodo_mes: Number(periodoMes),
      periodo_anio: Number(periodoAnio),
      fecha_corte: fechaCorte,
      responsable_id: responsableId || null,
      responsable_nombre: responsableNombre.trim(),
      responsable_rol: responsableRol || 'Operador',
      descripcion: descripcion?.trim() || '',
      tipo_alcance: tipoAlcanceNormalizado,
      alcance_config: alcanceConfig || {},
      estado: estadoInicial,
      iniciado_at: !esBorrador ? nowIso : null,
      iniciado_por: !esBorrador ? (responsableNombre.trim() || userEmail) : null,
      created_by: userEmail,
      created_at: nowIso,
      updated_at: nowIso,
    }

    const useDb = await checkTableExists()

    if (useDb) {
      const { data: createdHeader, error: headInsertErr } = await supabaseAdmin
        .from('auditoria_inventario')
        .insert(headerPayload)
        .select('*')
        .single()

      if (headInsertErr || !createdHeader) {
        return buildErrorResponse(res, headInsertErr, 'No fue posible crear la auditoría en la base de datos.')
      }

      // Preparar snapshot de existencias teóricas a la fecha de corte
      const detallesPayload = productosSeleccionados.map((prod) => ({
        auditoria_id: createdHeader.id,
        producto_id: prod.id,
        codigo_producto: prod.codigo,
        nombre_producto: prod.nombre,
        categoria: prod.categoria || 'General',
        unidad_medida: prod.unidad_medida || prod.unidad || 'Unidad',
        presentacion: prod.presentacion || '',
        ubicacion: alcanceConfig?.ubicacion || 'Bodega Principal',
        stock_teorico: Number(prod.stock || 0),
        stock_fisico: null,
        diferencia: null,
        costo_unitario: Number(prod.costo_unitario ?? prod.precio_compra ?? 0),
        impacto_economico: 0,
        estado_conteo: 'Pendiente',
        estado_diferencia: 'Conciliado',
        historial_conteos: [],
        ajuste_aprobado: false,
      }))

      const { data: createdDetalles, error: detInsertErr } = await supabaseAdmin
        .from('auditoria_inventario_detalle')
        .insert(detallesPayload)
        .select('*')

      if (detInsertErr) {
        return buildErrorResponse(res, detInsertErr, 'No fue posible guardar los renglones de la auditoría.')
      }

      const result = normalizeAuditoriaHeader(createdHeader)
      result.detalles = (createdDetalles || []).map(normalizeAuditoriaDetalle)
      return res.status(201).json({ data: result })
    } else {
      // Almacenamiento en memoria resiliente
      const newId = Date.now()
      const inMemHeader = { id: newId, ...headerPayload }
      memoryAuditorias.set(newId, inMemHeader)

      const inMemDetalles = productosSeleccionados.map((prod, idx) => ({
        id: newId + idx + 1,
        auditoria_id: newId,
        producto_id: prod.id,
        codigo_producto: prod.codigo,
        nombre_producto: prod.nombre,
        categoria: prod.categoria || 'General',
        unidad_medida: prod.unidad_medida || prod.unidad || 'Unidad',
        presentacion: prod.presentacion || '',
        ubicacion: alcanceConfig?.ubicacion || 'Bodega Principal',
        stock_teorico: Number(prod.stock || 0),
        stock_fisico: null,
        diferencia: null,
        costo_unitario: Number(prod.costo_unitario ?? prod.precio_compra ?? 0),
        impacto_economico: 0,
        estado_conteo: 'Pendiente',
        estado_diferencia: 'Conciliado',
        historial_conteos: [],
        ajuste_aprobado: false,
        created_at: new Date().toISOString(),
      }))

      memoryDetalles.set(newId, inMemDetalles)
      const result = normalizeAuditoriaHeader(inMemHeader)
      result.detalles = inMemDetalles.map(normalizeAuditoriaDetalle)
      return res.status(201).json({ data: result })
    }
  } catch (error) {
    return buildErrorResponse(res, error, 'No fue posible crear la auditoría.')
  }
}

export async function updateAuditoriaEstado(req, res) {
  try {
    const id = Number(req.params.id)
    const { nuevoEstado, usuario } = req.body || {}
    const estadosValidos = ['Borrador', 'En conteo', 'En revisión', 'Pendiente de aprobación', 'Cerrada', 'Cancelada']

    if (!estadosValidos.includes(nuevoEstado)) {
      return res.status(400).json({ message: 'El estado solicitado no es válido.' })
    }

    const useDb = await checkTableExists()
    const updatePayload = {
      estado: nuevoEstado,
      updated_at: new Date().toISOString(),
    }

    if (nuevoEstado === 'En conteo') {
      updatePayload.iniciado_at = new Date().toISOString()
      updatePayload.iniciado_por = usuario || req.auth?.user?.email || 'Operador'
    } else if (nuevoEstado === 'En revisión') {
      updatePayload.enviado_revision_at = new Date().toISOString()
      updatePayload.enviado_revision_por = usuario || req.auth?.user?.email || 'Operador'
    } else if (nuevoEstado === 'Cerrada') {
      updatePayload.cerrado_at = new Date().toISOString()
      updatePayload.cerrado_por = usuario || req.auth?.user?.email || 'Administrador'
    }

    if (useDb) {
      const { data, error } = await supabaseAdmin
        .from('auditoria_inventario')
        .update(updatePayload)
        .eq('id', id)
        .select('*')
        .single()

      if (error || !data) {
        return buildErrorResponse(res, error, 'No fue posible actualizar el estado de la auditoría.')
      }

      return res.json({ data: normalizeAuditoriaHeader(data) })
    } else {
      const aud = memoryAuditorias.get(id)
      if (!aud) return res.status(404).json({ message: 'Auditoría no encontrada.' })
      Object.assign(aud, updatePayload)
      return res.json({ data: normalizeAuditoriaHeader(aud) })
    }
  } catch (error) {
    return buildErrorResponse(res, error, 'No fue posible cambiar el estado de la auditoría.')
  }
}

export async function saveConteo(req, res) {
  try {
    const id = Number(req.params.id)
    const { items, usuario } = req.body || {} // items: [{ detalleId, stockFisico, observaciones, mermasDetectadas }]

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Debe proporcionar al menos un artículo para registrar el conteo.' })
    }

    const useDb = await checkTableExists()
    const userSignature = usuario || req.auth?.user?.email || 'Operador'
    const nowIso = new Date().toISOString()

    if (useDb) {
      for (const item of items) {
        const detalleId = item.detalleId || item.id
        const rawFisico = item.stockFisico ?? item.stockFisico1 ?? item.stock_fisico ?? item.conteo1
        if (rawFisico === null || rawFisico === undefined || rawFisico === '' || Number.isNaN(Number(rawFisico))) {
          continue
        }

        const numFisico = Number(rawFisico)
        if (numFisico < 0) {
          return res.status(400).json({ message: 'Las cantidades físicas no pueden ser negativas.' })
        }

        // Obtener detalle actual
        const { data: currentDet } = await supabaseAdmin
          .from('auditoria_inventario_detalle')
          .select('*')
          .eq('id', detalleId)
          .single()

        if (!currentDet) continue

        const stockTeorico = Number(currentDet.stock_teorico || 0)
        const diferencia = numFisico - stockTeorico
        const costoUnitario = Number(currentDet.costo_unitario || 0)
        const impactoEconomico = diferencia * costoUnitario

        let estadoDiferencia = 'Conciliado'
        if (diferencia !== 0) {
          estadoDiferencia = currentDet.estado_diferencia && currentDet.estado_diferencia !== 'Conciliado'
            ? currentDet.estado_diferencia
            : 'Pendiente de investigar'
        }

        const historial = Array.isArray(currentDet.historial_conteos) ? currentDet.historial_conteos : []
        historial.push({
          conteo: historial.length + 1,
          cantidad: numFisico,
          usuario: userSignature,
          fecha: nowIso,
          nota: item.observaciones || item.notas || '',
        })

        const { error: updErr } = await supabaseAdmin
          .from('auditoria_inventario_detalle')
          .update({
            stock_fisico: numFisico,
            diferencia,
            impacto_economico: impactoEconomico,
            estado_conteo: 'Contado',
            estado_diferencia: estadoDiferencia,
            contado_por: userSignature,
            contado_at: nowIso,
            observaciones: item.observaciones || item.notas || currentDet.observaciones || '',
            historial_conteos: historial,
            updated_at: nowIso,
          })
          .eq('id', detalleId)

        if (updErr) {
          console.error('Error al actualizar detalle de auditoria:', updErr)
        }
      }

      await supabaseAdmin
        .from('auditoria_inventario')
        .update({ updated_at: nowIso })
        .eq('id', id)

      const { data: updatedDetalles } = await supabaseAdmin
        .from('auditoria_inventario_detalle')
        .select('*')
        .eq('auditoria_id', id)
        .order('id', { ascending: true })

      const normalizedList = (updatedDetalles || []).map(normalizeAuditoriaDetalle)

      return res.json({
        message: 'Conteo guardado correctamente.',
        data: normalizedList,
        detalles: normalizedList,
      })
    } else {
      const detalles = memoryDetalles.get(id) || []
      for (const item of items) {
        const rawFisico = item.stockFisico ?? item.stockFisico1 ?? item.stock_fisico ?? item.conteo1
        if (rawFisico === null || rawFisico === undefined || rawFisico === '' || Number.isNaN(Number(rawFisico))) {
          continue
        }
        const det = detalles.find((d) => d.id === Number(item.detalleId || item.id))
        if (!det) continue
        const numFisico = Number(rawFisico)
        det.stock_fisico = numFisico
        det.stock_fisico_1 = numFisico
        det.stockFisico = numFisico
        det.diferencia = numFisico - det.stock_teorico
        det.impacto_economico = det.diferencia * det.costo_unitario
        det.porcentaje_diferencia = det.stock_teorico > 0 ? (det.diferencia / det.stock_teorico) * 100 : 0
        det.estado_conteo = 'Contado'
        det.estado_diferencia = det.diferencia === 0 ? 'Conciliado' : 'Pendiente de investigar'
        det.contado_por = userSignature
        det.contado_at = nowIso
        det.historial_conteos = det.historial_conteos || []
        det.historial_conteos.push({
          conteo: det.historial_conteos.length + 1,
          cantidad: numFisico,
          usuario: userSignature,
          fecha: nowIso,
          nota: item.observaciones || item.notas || '',
        })
      }

      const aud = memoryAuditorias.get(id)
      if (aud) {
        aud.total_diferencias = detalles.filter(d => d.diferencia !== null && Number(d.diferencia) !== 0).length
        aud.totalDiferencias = aud.total_diferencias
      }

      const normalizedList = detalles.map(normalizeAuditoriaDetalle)
      return res.json({
        message: 'Conteo guardado correctamente en memoria.',
        data: normalizedList,
        detalles: normalizedList,
      })
    }
  } catch (error) {
    return buildErrorResponse(res, error, 'No fue posible guardar el conteo físico.')
  }
}

export async function investigarDiferencia(req, res) {
  try {
    const id = Number(req.params.id)
    const detalleId = Number(req.params.detalleId)
    const body = req.body || {}
    const { usuario } = body

    const motivo = body.motivo || body.motivoTexto || body.motivo_discrepancia || ''
    const justificacion = body.justificacion || ''
    const accionPropuesta = body.accionPropuesta || ''
    let estadoDiferencia = body.estadoDiferencia || body.estado_diferencia

    if (!estadoDiferencia) {
      if (accionPropuesta === 'Ajustar inventario') {
        estadoDiferencia = 'Requiere ajuste'
      } else if (accionPropuesta === 'Justificar sin ajuste') {
        estadoDiferencia = 'Justificada sin ajuste'
      } else if (accionPropuesta === 'Solicitar reconteo físico') {
        estadoDiferencia = 'Requiere reconteo'
      }
    }

    const nuevoConteo = body.nuevoConteo ?? body.conteo2 ?? body.segundoConteo
    const notaReconteo = body.notaReconteo || body.nota || ''

    const useDb = await checkTableExists()
    const userSignature = usuario || req.auth?.user?.email || 'Auditor'
    const nowIso = new Date().toISOString()

    if (useDb) {
      const { data: currentDet, error } = await supabaseAdmin
        .from('auditoria_inventario_detalle')
        .select('*')
        .eq('id', detalleId)
        .eq('auditoria_id', id)
        .single()

      if (error || !currentDet) {
        return res.status(404).json({ message: 'Artículo de auditoría no encontrado.' })
      }

      let stockFisico = currentDet.stock_fisico
      let diferencia = currentDet.diferencia
      let impacto = currentDet.impacto_economico
      const historial = Array.isArray(currentDet.historial_conteos) ? currentDet.historial_conteos : []

      // Si se documenta un reconteo
      if (nuevoConteo !== undefined && nuevoConteo !== null && !Number.isNaN(Number(nuevoConteo))) {
        stockFisico = Number(nuevoConteo)
        diferencia = stockFisico - Number(currentDet.stock_teorico || 0)
        impacto = diferencia * Number(currentDet.costo_unitario || 0)
        historial.push({
          conteo: historial.length + 1,
          cantidad: stockFisico,
          usuario: userSignature,
          fecha: nowIso,
          nota: notaReconteo || 'Reconteo solicitado en investigación',
        })
      }

      const updatePayload = {
        motivo: motivo || currentDet.motivo,
        justificacion: justificacion || currentDet.justificacion,
        estado_diferencia: estadoDiferencia || (diferencia === 0 ? 'Conciliado' : 'Requiere ajuste'),
        stock_fisico: stockFisico,
        diferencia,
        impacto_economico: impacto,
        historial_conteos: historial,
        updated_at: nowIso,
      }

      const { data: updated, error: upErr } = await supabaseAdmin
        .from('auditoria_inventario_detalle')
        .update(updatePayload)
        .eq('id', detalleId)
        .select('*')
        .single()

      if (upErr) return buildErrorResponse(res, upErr, 'No fue posible guardar la investigación.')
      return res.json({ data: normalizeAuditoriaDetalle(updated) })
    } else {
      const detalles = memoryDetalles.get(id) || []
      const det = detalles.find((d) => d.id === detalleId)
      if (!det) return res.status(404).json({ message: 'Artículo no encontrado.' })

      if (nuevoConteo !== undefined && nuevoConteo !== null && !Number.isNaN(Number(nuevoConteo))) {
        det.stock_fisico = Number(nuevoConteo)
        det.diferencia = det.stock_fisico - det.stock_teorico
        det.impacto_economico = det.diferencia * det.costo_unitario
        det.historial_conteos = det.historial_conteos || []
        det.historial_conteos.push({
          conteo: det.historial_conteos.length + 1,
          cantidad: det.stock_fisico,
          usuario: userSignature,
          fecha: nowIso,
          nota: notaReconteo || 'Reconteo',
        })
      }

      det.motivo = motivo || det.motivo
      det.justificacion = justificacion || det.justificacion
      det.estado_diferencia = estadoDiferencia || (det.diferencia === 0 ? 'Conciliado' : 'Requiere ajuste')
      return res.json({ data: normalizeAuditoriaDetalle(det) })
    }
  } catch (error) {
    return buildErrorResponse(res, error, 'No fue posible registrar la investigación de la diferencia.')
  }
}

export async function aprobarAjustes(req, res) {
  try {
    const id = Number(req.params.id)
    const { detalleIds, usuario } = req.body || {} // Si no se pasan IDs, procesa todos los que tengan 'Requiere ajuste'

    const userSignature = usuario || req.auth?.user?.email || 'Administrador'
    const nowIso = new Date().toISOString()
    const useDb = await checkTableExists()

    let itemsAprobados = []

    if (useDb) {
      // Cargar auditoría para obtener código
      const { data: auditoria } = await supabaseAdmin
        .from('auditoria_inventario')
        .select('*')
        .eq('id', id)
        .single()

      if (!auditoria) return res.status(404).json({ message: 'Auditoría no encontrada.' })

      let query = supabaseAdmin
        .from('auditoria_inventario_detalle')
        .select('*')
        .eq('auditoria_id', id)
        .eq('ajuste_aprobado', false)

      if (Array.isArray(detalleIds) && detalleIds.length > 0) {
        query = query.in('id', detalleIds)
      } else {
        query = query.eq('estado_diferencia', 'Requiere ajuste')
      }

      const { data: itemsToAdjust, error } = await query
      if (error || !itemsToAdjust || itemsToAdjust.length === 0) {
        return res.status(400).json({ message: 'No hay ajustes pendientes de aprobación para aplicar.' })
      }

      for (const item of itemsToAdjust) {
        const dif = Number(item.diferencia)
        if (dif === 0) continue

        const tipoMovimiento = dif > 0 ? 'Entrada' : 'Salida'
        const cantidadAbs = Math.abs(dif)
        const motivoMovimiento = `Ajuste por Auditoría ${auditoria.codigo} (${dif > 0 ? 'Sobrante' : 'Faltante'}: ${item.motivo || 'Conciliación física'})`

        // Registrar movimiento de inventario en la base de datos
        // Usar registrar_movimiento_inventario o insert directo en movimiento_inventario
        let movimientoId = null
        try {
          const { data: movData, error: movErr } = await supabaseAdmin
            .from('movimiento_inventario')
            .insert({
              producto_id: item.producto_id,
              tipo: tipoMovimiento,
              cantidad: cantidadAbs,
              motivo: motivoMovimiento,
              usuario: userSignature,
              stock_antes: item.stock_teorico,
              stock_despues: item.stock_fisico,
              fecha_movimiento: new Date().toISOString().slice(0, 10),
            })
            .select('id')
            .single()

          if (!movErr && movData) {
            movimientoId = movData.id
          }

          // Actualizar stock real del producto
          await supabaseAdmin
            .from('producto')
            .update({ stock: item.stock_fisico, updated_at: nowIso })
            .eq('id', item.producto_id)
        } catch (errMov) {
          console.warn('Error al registrar movimiento de inventario:', errMov)
        }

        // Marcar detalle como ajustado
        await supabaseAdmin
          .from('auditoria_inventario_detalle')
          .update({
            ajuste_aprobado: true,
            ajuste_aprobado_por: userSignature,
            ajuste_aprobado_at: nowIso,
            ajuste_movimiento_id: movimientoId,
            estado_diferencia: 'Ajustado',
            updated_at: nowIso,
          })
          .eq('id', item.id)

        itemsAprobados.push({ id: item.id, producto: item.nombre_producto, cantidad: dif })
      }

      return res.json({
        message: `Se aplicaron ${itemsAprobados.length} ajustes en el inventario correctamente.`,
        data: itemsAprobados,
      })
    } else {
      // Memoria
      const detalles = memoryDetalles.get(id) || []
      const itemsToAdjust = detalles.filter(
        (d) =>
          !d.ajuste_aprobado &&
          (Array.isArray(detalleIds) && detalleIds.length > 0
            ? detalleIds.includes(d.id)
            : d.estado_diferencia === 'Requiere ajuste')
      )

      for (const item of itemsToAdjust) {
        item.ajuste_aprobado = true
        item.ajuste_aprobado_por = userSignature
        item.ajuste_aprobado_at = nowIso
        item.estado_diferencia = 'Ajustado'
        itemsAprobados.push({ id: item.id, producto: item.nombre_producto, cantidad: item.diferencia })
      }

      return res.json({
        message: `Se aplicaron ${itemsAprobados.length} ajustes en el inventario.`,
        data: itemsAprobados,
      })
    }
  } catch (error) {
    return buildErrorResponse(res, error, 'No fue posible aprobar y aplicar los ajustes de inventario.')
  }
}

export async function cerrarAuditoria(req, res) {
  try {
    const id = Number(req.params.id)
    const { usuario, resumen } = req.body || {}

    const useDb = await checkTableExists()
    const userSignature = usuario || req.auth?.user?.email || 'Administrador'
    const nowIso = new Date().toISOString()

    if (useDb) {
      // Cargar detalles para calcular resumen final
      const { data: detalles } = await supabaseAdmin
        .from('auditoria_inventario_detalle')
        .select('*')
        .eq('auditoria_id', id)

      const dets = detalles || []
      const totalProductos = dets.length
      const totalConDiferencia = dets.filter((d) => d.diferencia !== null && Number(d.diferencia) !== 0).length
      const totalExactos = totalProductos - totalConDiferencia
      const impactoEconomicoTotal = dets.reduce((acc, d) => acc + Number(d.impacto_economico || 0), 0)

      const resumenFinal = {
        ...(resumen || {}),
        totalProductos,
        totalConDiferencia,
        totalExactos,
        impactoEconomicoTotal,
        cerradoPor: userSignature,
        cerradoAt: nowIso,
      }

      const { data: cerrada, error } = await supabaseAdmin
        .from('auditoria_inventario')
        .update({
          estado: 'Cerrada',
          cerrado_at: nowIso,
          cerrado_por: userSignature,
          resumen_final: resumenFinal,
          updated_at: nowIso,
        })
        .eq('id', id)
        .select('*')
        .single()

      if (error || !cerrada) {
        return buildErrorResponse(res, error, 'No fue posible cerrar la auditoría.')
      }

      return res.json({
        message: 'Auditoría cerrada formalmente con éxito.',
        data: normalizeAuditoriaHeader(cerrada),
      })
    } else {
      const aud = memoryAuditorias.get(id)
      if (!aud) return res.status(404).json({ message: 'Auditoría no encontrada.' })
      aud.estado = 'Cerrada'
      aud.cerrado_at = nowIso
      aud.cerrado_por = userSignature
      aud.resumen_final = resumen || {}
      return res.json({
        message: 'Auditoría cerrada con éxito.',
        data: normalizeAuditoriaHeader(aud),
      })
    }
  } catch (error) {
    return buildErrorResponse(res, error, 'No fue posible cerrar la auditoría.')
  }
}

export async function getCatalogosAuditoria(req, res) {
  try {
    // 1. Categorías activas desde catalogo_categoria_inventario en DB
    const { data: dbCategorias } = await supabaseAdmin
      .from('catalogo_categoria_inventario')
      .select('id, codigo, nombre, descripcion, orden')
      .eq('activo', true)
      .order('orden', { ascending: true })

    // 2. Usuarios autorizados desde tabla perfil en DB
    const { data: dbUsuarios } = await supabaseAdmin
      .from('perfil')
      .select('id, primer_nombre, primer_apellido, usuario, email, rol:rol_id(nombre)')

    const responsables = (dbUsuarios || []).map((u) => {
      const nombreCompleto =
        [u.primer_nombre, u.primer_apellido].filter(Boolean).join(' ') ||
        u.usuario ||
        u.email
      const rolNombre = u.rol?.nombre || 'Operador'
      return {
        id: u.id,
        nombre: nombreCompleto,
        usuario: u.usuario,
        email: u.email,
        rol: rolNombre,
      }
    })

    // 3. Estados de auditoría desde BD o catálogo estándar
    let dbEstados = []
    try {
      const { data } = await supabaseAdmin
        .from('catalogo_auditoria_estado')
        .select('*')
        .eq('activo', true)
        .order('orden', { ascending: true })
      dbEstados = data || []
    } catch {
      dbEstados = []
    }

    if (dbEstados.length === 0) {
      dbEstados = [
        { id: 1, codigo: 'BORRADOR', nombre: 'Borrador' },
        { id: 2, codigo: 'EN_CONTEO', nombre: 'En conteo' },
        { id: 3, codigo: 'EN_REVISION', nombre: 'En revisión' },
        { id: 4, codigo: 'PENDIENTE_APROBACION', nombre: 'Pendiente de aprobación' },
        { id: 5, codigo: 'CERRADA', nombre: 'Cerrada' },
        { id: 6, codigo: 'CANCELADA', nombre: 'Cancelada' },
      ]
    }

    // 4. Tipos de alcance desde BD o catálogo estándar
    let dbTiposAlcance = []
    try {
      const { data } = await supabaseAdmin
        .from('catalogo_auditoria_tipo_alcance')
        .select('*')
        .eq('activo', true)
        .order('orden', { ascending: true })
      dbTiposAlcance = data || []
    } catch {
      dbTiposAlcance = []
    }

    if (dbTiposAlcance.length === 0) {
      dbTiposAlcance = [
        { id: 1, codigo: 'TODO', nombre: 'Todo el inventario' },
        { id: 2, codigo: 'CATEGORIA', nombre: 'Por categoría' },
        { id: 3, codigo: 'ESPECIFICO', nombre: 'Productos específicos' },
      ]
    }

    return res.json({
      data: {
        categorias:
          dbCategorias && dbCategorias.length > 0
            ? dbCategorias
            : [
                { codigo: 'MP', nombre: 'Materia Prima' },
                { codigo: 'SUM', nombre: 'Suministros' },
                { codigo: 'PT', nombre: 'Producto Terminado' },
              ],
        responsables,
        estados: dbEstados,
        tiposAlcance: dbTiposAlcance,
      },
    })
  } catch (error) {
    return buildErrorResponse(res, error, 'No fue posible cargar los catálogos de auditoría.')
  }
}
