import React, { useMemo, useState } from 'react'
import {
  ClipboardCheck,
  Plus,
  Search,
  Filter,
  RotateCcw,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Lock,
  ArrowRight,
  Eye,
  FileText,
  Play,
  Scale,
  ShieldAlert,
  ChevronRight,
  XCircle,
} from 'lucide-react'

export default function AuditoriaListado({
  auditorias = [],
  isLoading = false,
  onNuevaAuditoria,
  onVerAuditoria,
  onContinuarAuditoria,
  onVerReporte,
  onCancelarAuditoria,
}) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedEstado, setSelectedEstado] = useState('Todos')
  const [selectedMes, setSelectedMes] = useState('Todos')
  const [selectedAnio, setSelectedAnio] = useState(String(new Date().getFullYear()))

  const meses = [
    { value: 'Todos', label: 'Todos los meses' },
    { value: '1', label: 'Enero' },
    { value: '2', label: 'Febrero' },
    { value: '3', label: 'Marzo' },
    { value: '4', label: 'Abril' },
    { value: '5', label: 'Mayo' },
    { value: '6', label: 'Junio' },
    { value: '7', label: 'Julio' },
    { value: '8', label: 'Agosto' },
    { value: '9', label: 'Septiembre' },
    { value: '10', label: 'Octubre' },
    { value: '11', label: 'Noviembre' },
    { value: '12', label: 'Diciembre' },
  ]

  const anios = ['Todos', '2025', '2026', '2027']

  const estados = [
    'Todos',
    'Borrador',
    'En conteo',
    'En revisión',
    'Pendiente de aprobación',
    'Cerrada',
    'Cancelada',
  ]

  // Cálculo de KPIs a partir de auditorías
  const kpis = useMemo(() => {
    let pendientes = 0
    let conDiferencias = 0
    let pendientesAprobacion = 0
    let cerradas = 0

    auditorias.forEach((a) => {
      if (a.estado === 'Cerrada') {
        cerradas++
      } else if (a.estado !== 'Cancelada') {
        pendientes++
      }

      if (a.estado === 'Pendiente de aprobación') {
        pendientesAprobacion++
      }

      if (Number(a.totalDiferencias || 0) > 0) {
        conDiferencias++
      }
    })

    return { pendientes, conDiferencias, pendientesAprobacion, cerradas }
  }, [auditorias])

  // Filtro
  const filteredAuditorias = useMemo(() => {
    return auditorias.filter((a) => {
      if (selectedEstado !== 'Todos' && a.estado !== selectedEstado) return false
      if (selectedMes !== 'Todos' && String(a.periodoMes) !== selectedMes) return false
      if (selectedAnio !== 'Todos' && String(a.periodoAnio) !== selectedAnio) return false

      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase()
        const matchCodigo = a.codigo?.toLowerCase().includes(q)
        const matchNombre = a.nombre?.toLowerCase().includes(q)
        const matchResp = a.responsableNombre?.toLowerCase().includes(q)
        if (!matchCodigo && !matchNombre && !matchResp) return false
      }

      return true
    })
  }, [auditorias, selectedEstado, selectedMes, selectedAnio, searchTerm])

  const handleResetFilters = () => {
    setSearchTerm('')
    setSelectedEstado('Todos')
    setSelectedMes('Todos')
    setSelectedAnio('Todos')
  }

  const getEstadoBadge = (estado) => {
    switch (estado) {
      case 'Borrador':
        return {
          bg: 'bg-slate-100 text-slate-700 border-slate-300',
          dot: 'bg-slate-400',
        }
      case 'En conteo':
        return {
          bg: 'bg-sky-100 text-sky-800 border-sky-300',
          dot: 'bg-sky-500 animate-pulse',
        }
      case 'En revisión':
        return {
          bg: 'bg-amber-100 text-amber-800 border-amber-300',
          dot: 'bg-amber-500',
        }
      case 'Pendiente de aprobación':
        return {
          bg: 'bg-indigo-100 text-indigo-800 border-indigo-300',
          dot: 'bg-indigo-500 animate-pulse',
        }
      case 'Cerrada':
        return {
          bg: 'bg-emerald-100 text-emerald-800 border-emerald-300',
          dot: 'bg-emerald-500',
        }
      case 'Cancelada':
        return {
          bg: 'bg-rose-100 text-rose-800 border-rose-300',
          dot: 'bg-rose-500',
        }
      default:
        return {
          bg: 'bg-gray-100 text-gray-700 border-gray-300',
          dot: 'bg-gray-400',
        }
    }
  }

  return (
    <div className="space-y-6">
      {/* 4 Indicadores Resumen (KPIs) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Auditorías Pendientes */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Auditorías Pendientes
            </span>
            <div className="p-2.5 rounded-xl bg-sky-50 text-sky-600">
              <Clock size={20} />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-800">{kpis.pendientes}</span>
            <span className="text-xs text-slate-500 font-medium">en curso</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Borrador, conteo o en revisión</p>
        </div>

        {/* Card 2: Con diferencias */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Con Diferencias
            </span>
            <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600">
              <AlertTriangle size={20} />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-amber-700">{kpis.conDiferencias}</span>
            <span className="text-xs text-amber-600 font-medium">con desvíos</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Faltantes o sobrantes registrados</p>
        </div>

        {/* Card 3: Pendientes de aprobación */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Por Aprobar
            </span>
            <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600">
              <ShieldAlert size={20} />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-indigo-700">{kpis.pendientesAprobacion}</span>
            <span className="text-xs text-indigo-600 font-medium">requieren firma</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Ajustes a confirmar por Admin</p>
        </div>

        {/* Card 4: Auditorías Cerradas */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Auditorías Cerradas
            </span>
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 size={20} />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-emerald-700">{kpis.cerradas}</span>
            <span className="text-xs text-emerald-600 font-medium">finalizadas</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Conciliadas y archivadas</p>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
          {/* Buscador */}
          <div className="lg:col-span-4 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Buscar por código, nombre o responsable..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
            />
          </div>

          {/* Filtro Estado */}
          <div className="lg:col-span-3">
            <select
              value={selectedEstado}
              onChange={(e) => setSelectedEstado(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all font-medium"
            >
              {estados.map((est) => (
                <option key={est} value={est}>
                  Estado: {est}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro Mes */}
          <div className="lg:col-span-2">
            <select
              value={selectedMes}
              onChange={(e) => setSelectedMes(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all font-medium"
            >
              {meses.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro Año */}
          <div className="lg:col-span-2">
            <select
              value={selectedAnio}
              onChange={(e) => setSelectedAnio(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all font-medium"
            >
              {anios.map((a) => (
                <option key={a} value={a}>
                  Año: {a}
                </option>
              ))}
            </select>
          </div>

          {/* Botón Limpiar */}
          <div className="lg:col-span-1 flex items-center">
            <button
              onClick={handleResetFilters}
              type="button"
              className="w-full h-full flex items-center justify-center p-2.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors"
              title="Limpiar filtros"
            >
              <RotateCcw size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Tabla de Auditorías */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center text-slate-400">
            <div className="inline-block w-8 h-8 border-3 border-cyan-500 border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-sm font-medium">Cargando auditorías de inventario...</p>
          </div>
        ) : filteredAuditorias.length === 0 ? (
          /* Estado Vacío */
          <div className="py-16 px-6 text-center">
            <div className="w-16 h-16 rounded-2xl bg-cyan-50 text-cyan-600 flex items-center justify-center mx-auto mb-4 border border-cyan-100">
              <ClipboardCheck size={32} />
            </div>
            <h4 className="text-base font-bold text-slate-800">
              {auditorias.length === 0 ? 'No hay auditorías registradas' : 'No se encontraron resultados'}
            </h4>
            <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto mt-1">
              {auditorias.length === 0
                ? 'Inicia el control de inventarios físicos creando tu primera auditoría con el asistente guiado.'
                : 'Intenta ajustar los filtros de búsqueda o el período seleccionado.'}
            </p>
            {auditorias.length === 0 && (
              <button
                onClick={onNuevaAuditoria}
                type="button"
                className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-all"
              >
                <Plus size={16} />
                Crear primera auditoría
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                <tr>
                  <th className="py-3.5 px-4">Código</th>
                  <th className="py-3.5 px-4">Nombre de Auditoría</th>
                  <th className="py-3.5 px-3">Período</th>
                  <th className="py-3.5 px-3">Fecha Corte</th>
                  <th className="py-3.5 px-4">Responsable</th>
                  <th className="py-3.5 px-3 text-center">Productos</th>
                  <th className="py-3.5 px-3 text-center">Diferencias</th>
                  <th className="py-3.5 px-4">Estado</th>
                  <th className="py-3.5 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredAuditorias.map((a) => {
                  const badge = getEstadoBadge(a.estado)
                  const nombreMes =
                    meses.find((m) => m.value === String(a.periodoMes))?.label || `Mes ${a.periodoMes}`
                  const hasDif = Number(a.totalDiferencias || 0) > 0

                  return (
                    <tr
                      key={a.id}
                      className="hover:bg-cyan-50/40 transition-colors group cursor-pointer"
                      onClick={() => onVerAuditoria(a)}
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-cyan-700">
                        {a.codigo}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900 group-hover:text-cyan-700 transition-colors">
                          {a.nombre}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Alcance: {a.tipoAlcance}
                        </div>
                      </td>
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <span className="font-medium text-slate-700">{nombreMes}</span>{' '}
                        <span className="text-slate-400 text-xs">{a.periodoAnio}</span>
                      </td>
                      <td className="py-3.5 px-3 whitespace-nowrap text-xs text-slate-600 font-medium">
                        {a.fechaCorte}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-800">{a.responsableNombre || 'Sin asignar'}</div>
                        {a.responsableRol && (
                          <span className="text-[10px] text-slate-400">{a.responsableRol}</span>
                        )}
                      </td>
                      <td className="py-3.5 px-3 text-center font-bold text-slate-800">
                        {a.totalProductos || 0}
                      </td>
                      <td className="py-3.5 px-3 text-center">
                        {hasDif ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                            <AlertTriangle size={11} /> {a.totalDiferencias}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700">
                            <CheckCircle2 size={11} /> 0
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${badge.bg}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                          {a.estado}
                        </span>
                      </td>
                      <td
                        className="py-3.5 px-4 text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Botón Ver Detalle */}
                          <button
                            type="button"
                            onClick={() => onVerAuditoria(a)}
                            className="p-1.5 text-slate-400 hover:text-cyan-700 hover:bg-cyan-50 rounded-lg transition-colors"
                            title="Ver detalle"
                          >
                            <Eye size={16} />
                          </button>

                          {/* Continuar auditoría (Borrador o En conteo) */}
                          {(a.estado === 'Borrador' || a.estado === 'En conteo') && (
                            <button
                              type="button"
                              onClick={() => onContinuarAuditoria(a)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-sky-50 hover:bg-sky-100 text-sky-700 rounded-lg font-semibold text-xs transition-colors border border-sky-200"
                              title="Continuar conteo"
                            >
                              <Play size={13} />
                              <span>Contar</span>
                            </button>
                          )}

                          {/* Revisar diferencias (En revisión o Pendiente de aprobación) */}
                          {(a.estado === 'En revisión' || a.estado === 'Pendiente de aprobación') && (
                            <button
                              type="button"
                              onClick={() => onContinuarAuditoria(a)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg font-semibold text-xs transition-colors border border-amber-200"
                              title="Revisar diferencias"
                            >
                              <Scale size={13} />
                              <span>Conciliar</span>
                            </button>
                          )}

                          {/* Consultar reporte */}
                          <button
                            type="button"
                            onClick={() => onVerReporte(a)}
                            className="p-1.5 text-slate-400 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Consultar reporte ejecutivo"
                          >
                            <FileText size={16} />
                          </button>

                          {/* Cancelar auditoría si está activa */}
                          {a.estado !== 'Cerrada' && a.estado !== 'Cancelada' && (
                            <button
                              type="button"
                              onClick={() => onCancelarAuditoria(a)}
                              className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Cancelar auditoría"
                            >
                              <XCircle size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
