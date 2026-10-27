import React, { useState, useMemo, useEffect } from 'react'
import {
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Play,
  Save,
  Scale,
  ShieldCheck,
  Lock,
  Printer,
  FileText,
  Search,
  RotateCcw,
  User,
  Calendar,
  Clock,
  Eye,
  ChevronDown,
  Info,
  Check,
  TrendingDown,
  TrendingUp,
  XCircle,
} from 'lucide-react'

export default function AuditoriaOperacion({
  auditoria,
  detalles = [],
  currentUser,
  onBack,
  onSaveConteo,
  onFinalizarConteo,
  onCerrarAuditoria,
  onVerReporte,
  isSaving = false,
}) {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterEstadoConteo, setFilterEstadoConteo] = useState('Todos') // 'Todos' | 'Contados' | 'Pendientes' | 'ConDiferencia'

  // Estado local para los valores de conteo físico en edición
  const [conteosLocales, setConteosLocales] = useState(() => {
    const map = {}
    detalles.forEach((d) => {
      const valFisico = d.stock_fisico ?? d.stock_fisico_1 ?? d.stockFisico ?? d.conteo_final
      const valFisicoStr = valFisico !== null && valFisico !== undefined ? String(valFisico) : ''
      map[d.id] = {
        fisico1: valFisicoStr,
        fisico2: d.stock_fisico_2 ?? '',
        mermas: d.mermas_detectadas ?? 0,
        notas: d.notas_conteo ?? d.observaciones ?? '',
      }
    })
    return map
  })

  // Sincronizar conteosLocales cuando los detalles cambian desde el servidor
  useEffect(() => {
    if (Array.isArray(detalles) && detalles.length > 0) {
      setConteosLocales((prev) => {
        const next = { ...prev }
        detalles.forEach((d) => {
          const valFisico = d.stock_fisico ?? d.stock_fisico_1 ?? d.stockFisico ?? d.conteo_final
          const valFisicoStr = valFisico !== null && valFisico !== undefined ? String(valFisico) : ''
          const prevVal = prev[d.id]?.fisico1
          next[d.id] = {
            fisico1: prevVal !== undefined && prevVal !== '' ? prevVal : valFisicoStr,
            fisico2: d.stock_fisico_2 ?? prev[d.id]?.fisico2 ?? '',
            mermas: d.mermas_detectadas ?? prev[d.id]?.mermas ?? 0,
            notas: d.notas_conteo ?? d.observaciones ?? prev[d.id]?.notas ?? '',
          }
        })
        return next
      })
    }
  }, [detalles])

  const isBorrador = auditoria.estado === 'Borrador'
  const isEnConteo = auditoria.estado === 'En conteo'
  const isEnRevision = auditoria.estado === 'En revisión'
  const isPendienteAprobacion = auditoria.estado === 'Pendiente de aprobación'
  const isCerrada = auditoria.estado === 'Cerrada'

  // El conteo es ciego mientras esté en Borrador o En conteo: el stock teórico no se muestra
  const isConteoCiego = isBorrador || isEnConteo

  // Manejador de cambio en conteo físico
  const handleConteoChange = (detalleId, field, val) => {
    setConteosLocales((prev) => ({
      ...prev,
      [detalleId]: {
        ...(prev[detalleId] || {}),
        [field]: val,
      },
    }))
  }

  // Filtrado de detalles para la tabla
  const filteredDetalles = useMemo(() => {
    return detalles.filter((d) => {
      const c = conteosLocales[d.id]
      const tieneConteo = c && c.fisico1 !== '' && c.fisico1 !== null

      if (filterEstadoConteo === 'Contados' && !tieneConteo) return false
      if (filterEstadoConteo === 'Pendientes' && tieneConteo) return false
      if (filterEstadoConteo === 'ConDiferencia') {
        const dif = Number(d.diferencia || 0)
        if (dif === 0) return false
      }

      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase()
        const matchCode = (d.codigo || d.codigo_producto || d.codigoProducto || '')
          .toLowerCase()
          .includes(q)
        const matchName = (d.nombre_producto || d.nombreProducto || d.nombre || '')
          .toLowerCase()
          .includes(q)
        const matchCat = (d.categoria || '').toLowerCase().includes(q)
        if (!matchCode && !matchName && !matchCat) return false
      }

      return true
    })
  }, [detalles, conteosLocales, filterEstadoConteo, searchTerm])

  // Estadísticas cuantitativas para conciliación
  const stats = useMemo(() => {
    let contados = 0
    let exactos = 0
    let faltantes = 0
    let sobrantes = 0
    let porInvestigar = 0
    let porAprobar = 0

    detalles.forEach((d) => {
      const c = conteosLocales[d.id]
      const tieneConteoFisico =
        (c && c.fisico1 !== '' && c.fisico1 !== null && c.fisico1 !== undefined) ||
        (d.stock_fisico !== null && d.stock_fisico !== undefined)

      if (tieneConteoFisico) {
        contados++
      }

      const tieneDifCalculada =
        d.diferencia !== null &&
        d.diferencia !== undefined &&
        (d.stock_fisico !== null || (c && c.fisico1 !== ''))

      if (tieneDifCalculada) {
        const dif = Number(d.diferencia)
        if (dif === 0) {
          exactos++
        } else if (dif < 0) {
          faltantes++
        } else {
          sobrantes++
        }
      }

      if (d.estado_diferencia === 'Pendiente de investigar') {
        porInvestigar++
      }
      if (d.estado_diferencia === 'Requiere ajuste' && !d.ajuste_aplicado) {
        porAprobar++
      }
    })

    const impactoNeto = detalles.reduce((acc, d) => acc + Number(d.impacto_economico || 0), 0)

    return {
      total: detalles.length,
      contados,
      pendientes: Math.max(0, detalles.length - contados),
      exactos,
      faltantes,
      sobrantes,
      porInvestigar,
      porAprobar,
      impactoNeto,
    }
  }, [detalles, conteosLocales])

  // Guardar avance de conteo físico
  const handleGuardarProgreso = () => {
    const items = detalles.map((d) => {
      const c = conteosLocales[d.id] || {}
      const valFisico =
        c.fisico1 !== '' && c.fisico1 !== null && c.fisico1 !== undefined
          ? Number(c.fisico1)
          : d.stock_fisico !== null && d.stock_fisico !== undefined
          ? Number(d.stock_fisico)
          : null
      return {
        detalleId: d.id,
        stockFisico: valFisico,
        stockFisico1: valFisico,
        stock_fisico: valFisico,
        stockFisico2: c.fisico2 !== '' ? Number(c.fisico2) : null,
        mermas: Number(c.mermas || 0),
        notas: c.notas || '',
      }
    })
    onSaveConteo(items)
  }

  // Guardar y pasar a conciliación
  const handleFinalizarClick = () => {
    const items = detalles.map((d) => {
      const c = conteosLocales[d.id] || {}
      const valFisico =
        c.fisico1 !== '' && c.fisico1 !== null && c.fisico1 !== undefined
          ? Number(c.fisico1)
          : d.stock_fisico !== null && d.stock_fisico !== undefined
          ? Number(d.stock_fisico)
          : null
      return {
        detalleId: d.id,
        stockFisico: valFisico,
        stockFisico1: valFisico,
        stock_fisico: valFisico,
        stockFisico2: c.fisico2 !== '' ? Number(c.fisico2) : null,
        mermas: Number(c.mermas || 0),
        notas: c.notas || '',
      }
    })

    const sinContar = items.filter((i) => i.stockFisico === null)
    if (sinContar.length > 0) {
      const confirma = window.confirm(
        `Hay ${sinContar.length} producto(s) sin conteo físico registrado. ¿Deseas registrarlos con existencia 0 y finalizar el conteo?`
      )
      if (!confirma) return
      items.forEach((i) => {
        if (i.stockFisico === null) {
          i.stockFisico = 0
          i.stockFisico1 = 0
          i.stock_fisico = 0
        }
      })
    }

    onFinalizarConteo('En revisión', items)
  }



  // Formato de moneda
  const formatMoney = (val) => {
    const num = Number(val || 0)
    return `Q${num.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  return (
    <div className="space-y-6">
      {/* Barra Superior de Navegación y Encabezado de la Auditoría */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors border border-slate-200 shrink-0"
            title="Volver a la lista de auditorías"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono font-bold text-cyan-700 bg-cyan-50 px-2.5 py-0.5 rounded-lg border border-cyan-200 text-xs">
                {auditoria.codigo}
              </span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                  isCerrada
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                    : isPendienteAprobacion
                    ? 'bg-indigo-100 text-indigo-800 border-indigo-300'
                    : isEnRevision
                    ? 'bg-amber-100 text-amber-800 border-amber-300'
                    : isEnConteo
                    ? 'bg-sky-100 text-sky-800 border-sky-300'
                    : 'bg-slate-100 text-slate-700 border-slate-300'
                }`}
              >
                {auditoria.estado}
              </span>
              <span className="text-xs text-slate-400">
                Alcance: <strong>{auditoria.tipoAlcance}</strong>
              </span>
            </div>
            <h2 className="text-lg font-bold text-slate-900 mt-1">{auditoria.nombre}</h2>
            <div className="flex items-center gap-4 text-xs text-slate-500 mt-0.5 flex-wrap">
              <span className="flex items-center gap-1">
                <User size={12} className="text-slate-400" />
                {auditoria.responsableNombre}
              </span>
              <span className="flex items-center gap-1">
                <Calendar size={12} className="text-slate-400" />
                Corte: {auditoria.fechaCorte}
              </span>
              {currentUser && (
                <span className="flex items-center gap-1 text-slate-400">
                  Usuario activo: <strong className="text-slate-600">{currentUser.nombre || currentUser.email}</strong>
                </span>
              )}
              <span className="flex items-center gap-1">
                <Clock size={12} className="text-slate-400" />
                {detalles.length} artículos incluidos
              </span>
            </div>
          </div>
        </div>

        {/* Acciones principales de la cabecera */}
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <button
            type="button"
            onClick={onVerReporte}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors border border-slate-200"
          >
            <FileText size={15} />
            <span>Reporte / PDF</span>
          </button>

          {/* Si está en conteo, botón de guardar y finalizar */}
          {isEnConteo && (
            <>
              <button
                type="button"
                disabled={isSaving}
                onClick={handleGuardarProgreso}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-800 rounded-xl text-xs font-semibold border border-slate-300 transition-colors disabled:opacity-50"
              >
                <Save size={15} className="text-cyan-600" />
                <span>Guardar avance</span>
              </button>

              <button
                type="button"
                disabled={isSaving}
                onClick={handleFinalizarClick}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all disabled:opacity-50"
              >
                <Scale size={15} />
                <span>Finalizar Conteo y Conciliar</span>
              </button>
            </>
          )}

          {/* Si está en borrador, botón de iniciar */}
          {isBorrador && (
            <button
              type="button"
              disabled={isSaving}
              onClick={() => onFinalizarConteo('En conteo')}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all"
            >
              <Play size={15} />
              <span>Comenzar Conteo Físico</span>
            </button>
          )}

          {/* Si está en revisión: Reabrir Conteo o Cerrar Auditoría */}
          {isEnRevision && (
            <>
              <button
                type="button"
                disabled={isSaving}
                onClick={() => onFinalizarConteo('En conteo')}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors border border-slate-300"
                title="Volver a la pantalla de conteo físico si deseas corregir cantidades"
              >
                <RotateCcw size={14} className="text-slate-600" />
                <span>Reabrir Conteo</span>
              </button>

              <button
                type="button"
                disabled={isSaving}
                onClick={onCerrarAuditoria}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all disabled:opacity-50"
                title="Cerrar formalmente y dar por terminada la auditoría"
              >
                <Lock size={15} />
                <span>Cerrar Auditoría</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Aviso de Modo Conteo Ciego si aplica */}
      {isConteoCiego && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-sky-50 to-cyan-50 border border-sky-200 flex items-start gap-3">
          <Info size={20} className="text-cyan-700 shrink-0 mt-0.5" />
          <div className="text-xs sm:text-sm text-cyan-950">
            <span className="font-bold">Modo Conteo Ciego AMATI HIELO Activado:</span> El stock registrado
            en el sistema está oculto deliberadamente para evitar sesgos en el conteo de bodega. Ingresa la
            cantidad física contada en estantería o cámara fría. El sistema revelará las diferencias una vez
            finalizado el conteo.
          </div>
        </div>
      )}

      {/* Aviso si la auditoría está Cerrada (Read-Only) */}
      {isCerrada && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between gap-4 text-emerald-900 text-xs sm:text-sm">
          <div className="flex items-center gap-2 font-semibold">
            <Lock size={18} className="text-emerald-700" />
            Auditoría Cerrada Formalmente el{' '}
            {auditoria.cerradoAt ? new Date(auditoria.cerradoAt).toLocaleString('es-GT') : 'recientemente'}{' '}
            por {auditoria.cerradoPor || 'Administración'}. Este registro es de sólo lectura.
          </div>
          <button
            onClick={onVerReporte}
            type="button"
            className="px-3 py-1.5 bg-emerald-700 text-white rounded-lg font-bold text-xs hover:bg-emerald-800 transition-colors shrink-0"
          >
            Ver Reporte Oficial
          </button>
        </div>
      )}



      {/* Indicadores de Conciliación (visibles una vez revelado el conteo) */}
      {!isConteoCiego && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
            <span className="text-xs text-emerald-600 font-semibold uppercase tracking-wider">
              Exactos (Sin Dif.)
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold text-emerald-700">{stats.exactos}</span>
              <span className="text-xs text-slate-400">de {stats.total}</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
            <span className="text-xs text-rose-600 font-semibold uppercase tracking-wider">
              Con Faltante
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold text-rose-700">{stats.faltantes}</span>
              <span className="text-xs text-rose-500">artículos</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
            <span className="text-xs text-cyan-600 font-semibold uppercase tracking-wider">
              Con Sobrante
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold text-cyan-700">{stats.sobrantes}</span>
              <span className="text-xs text-cyan-600">artículos</span>
            </div>
          </div>

          <div
            className={`p-4 rounded-2xl border shadow-xs ${
              stats.impactoNeto < 0
                ? 'bg-rose-50/70 border-rose-200 text-rose-900'
                : stats.impactoNeto > 0
                ? 'bg-cyan-50/70 border-cyan-200 text-cyan-900'
                : 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
            }`}
          >
            <span className="text-xs font-semibold uppercase tracking-wider">
              Impacto Económico Neto
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black">{formatMoney(stats.impactoNeto)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Barra de Búsqueda y Filtros de la Tabla Operativa */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="w-full sm:w-80 relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Buscar por código o producto..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={filterEstadoConteo}
            onChange={(e) => setFilterEstadoConteo(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-cyan-500"
          >
            <option value="Todos">Ver todos ({detalles.length})</option>
            {isConteoCiego ? (
              <>
                <option value="Contados">Solo Contados ({stats.contados})</option>
                <option value="Pendientes">Pendientes de Contar ({stats.pendientes})</option>
              </>
            ) : (
              <>
                <option value="ConDiferencia">Solo con Diferencias ({stats.faltantes + stats.sobrantes})</option>
              </>
            )}
          </select>
        </div>
      </div>

      {/* Tabla Operativa de Conteo y Conciliación */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
              <tr>
                <th className="py-3 px-3">Código</th>
                <th className="py-3 px-3">Producto</th>
                <th className="py-3 px-3 text-center">Unidad</th>

                {/* Si no es ciego, mostrar stock teórico */}
                {!isConteoCiego && (
                  <th className="py-3 px-3 text-right">Teórico</th>
                )}

                <th className="py-3 px-3 text-right">
                  {isConteoCiego ? 'Conteo Físico *' : 'Físico Final'}
                </th>

                {/* Si no es ciego, mostrar diferencias */}
                {!isConteoCiego && (
                  <>
                    <th className="py-3 px-3 text-right">Diferencia</th>
                    <th className="py-3 px-3 text-right">% Var</th>
                    <th className="py-3 px-3 text-right">Impacto (Q)</th>
                    <th className="py-3 px-3">Estado / Cuadre</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredDetalles.map((d) => {
                const c = conteosLocales[d.id] || {}
                const tieneFisicoRegistrado =
                  (d.stock_fisico !== null && d.stock_fisico !== undefined) ||
                  (d.stockFisico !== null && d.stockFisico !== undefined) ||
                  (d.stock_fisico_1 !== null && d.stock_fisico_1 !== undefined) ||
                  (c.fisico1 !== '' && c.fisico1 !== null && c.fisico1 !== undefined)
                const dif =
                  d.diferencia !== null && d.diferencia !== undefined
                    ? Number(d.diferencia)
                    : tieneFisicoRegistrado && c.fisico1 !== ''
                    ? Number(c.fisico1) - Number(d.stock_teorico || 0)
                    : null
                const hasDif = dif !== null && dif !== 0

                return (
                  <tr
                    key={d.id}
                    className={`transition-colors ${
                      hasDif && !isConteoCiego
                        ? 'bg-rose-50/70 hover:bg-rose-100/70 border-l-4 border-l-rose-500'
                        : 'hover:bg-slate-50/70'
                    }`}
                  >
                    <td className="py-3.5 px-3 font-mono font-semibold text-slate-600">
                      {d.codigo || d.codigo_producto || d.codigoProducto || '—'}
                    </td>

                    <td className="py-3.5 px-3">
                      <p className="font-semibold text-slate-800">
                        {d.nombre_producto || d.nombreProducto || d.nombre || 'Producto'}
                      </p>
                      <span className="text-[10px] text-slate-400">{d.categoria}</span>
                    </td>

                    <td className="py-3.5 px-3 text-center text-slate-600 font-medium">
                      {d.unidad_medida || d.unidadMedida || d.unidad || 'Unidad'}
                    </td>

                    {/* Stock Teórico (revelado post-conteo) */}
                    {!isConteoCiego && (
                      <td className="py-3.5 px-3 text-right font-medium text-slate-700">
                        {Number(d.stock_teorico || 0).toLocaleString()}
                      </td>
                    )}

                    {/* Input o valor de Conteo Físico */}
                    <td className="py-3.5 px-3 text-right">
                      {isEnConteo ? (
                        <div className="flex items-center justify-end gap-1">
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={c.fisico1 ?? ''}
                            placeholder="0"
                            onChange={(e) => handleConteoChange(d.id, 'fisico1', e.target.value)}
                            className="w-24 px-2 py-1.5 text-right font-bold text-slate-900 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:outline-none text-xs sm:text-sm"
                          />
                        </div>
                      ) : (
                        <span className="font-bold text-slate-900">
                          {d.stock_fisico != null
                            ? Number(d.stock_fisico).toLocaleString()
                            : d.stockFisico != null
                            ? Number(d.stockFisico).toLocaleString()
                            : d.stock_fisico_1 != null
                            ? Number(d.stock_fisico_1).toLocaleString()
                            : d.conteo_final != null
                            ? Number(d.conteo_final).toLocaleString()
                            : '—'}
                        </span>
                      )}
                    </td>

                    {/* Columnas de Conciliación */}
                    {!isConteoCiego && (
                      <>
                        <td className="py-3.5 px-3 text-right">
                          {dif === null ? (
                            <span className="text-slate-300">—</span>
                          ) : dif !== 0 ? (
                            <span className="font-black text-rose-600 bg-rose-100/90 border border-rose-300 px-2.5 py-0.5 rounded-md text-xs sm:text-sm shadow-xs inline-block">
                              {dif > 0 ? `+${dif}` : dif}
                            </span>
                          ) : (
                            <span className="font-bold text-emerald-600">0</span>
                          )}
                        </td>

                        <td className="py-3.5 px-3 text-right text-slate-500 font-medium">
                          {d.porcentaje_diferencia != null
                            ? `${Number(d.porcentaje_diferencia).toFixed(1)}%`
                            : '0%'}
                        </td>

                        <td className="py-3.5 px-3 text-right font-mono font-semibold text-slate-800">
                          {formatMoney(d.impacto_economico)}
                        </td>

                        <td className="py-3.5 px-3">
                          {!tieneFisicoRegistrado ? (
                            <span className="inline-flex items-center gap-1 text-slate-400 text-xs font-medium">
                              Pendiente de conteo
                            </span>
                          ) : dif === 0 ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                              <CheckCircle2 size={13} className="text-emerald-600" /> Cuadrado
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300 shadow-xs">
                              <AlertTriangle size={13} className="text-rose-600 shrink-0" />
                              No cuadra ({dif > 0 ? `Sobrante +${dif}` : `Faltante ${Math.abs(dif)}`})
                            </span>
                          )}
                        </td>
                      </>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

