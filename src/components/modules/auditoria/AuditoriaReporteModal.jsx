import React, { useRef } from 'react'
import {
  Printer,
  X,
  ClipboardCheck,
  CheckCircle2,
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  Scale,
  Calendar,
  User,
  ShieldCheck,
} from 'lucide-react'

export default function AuditoriaReporteModal({ isOpen, onClose, auditoria, detalles = [] }) {
  const printRef = useRef(null)

  if (!isOpen || !auditoria) return null

  const totalProductos = detalles.length
  const exactos = detalles.filter((d) => Number(d.diferencia || 0) === 0).length
  const faltantes = detalles.filter((d) => Number(d.diferencia || 0) < 0)
  const sobrantes = detalles.filter((d) => Number(d.diferencia || 0) > 0)

  const valorTeorico = detalles.reduce(
    (acc, d) => acc + Number(d.stock_teorico || 0) * Number(d.costo_unitario || 0),
    0
  )
  const valorFisico = detalles.reduce(
    (acc, d) =>
      acc +
      Number(d.conteo_final != null ? d.conteo_final : d.stock_fisico_1 || 0) *
        Number(d.costo_unitario || 0),
    0
  )
  const impactoNeto = detalles.reduce((acc, d) => acc + Number(d.impacto_economico || 0), 0)

  const handlePrint = () => {
    window.print()
  }

  const formatMoney = (val) => {
    const num = Number(val || 0)
    return `Q${num.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  const meses = [
    '', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ]
  const periodoTexto = `${meses[auditoria.periodoMes] || 'Mes'} ${auditoria.periodoAnio || ''}`

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-6 bg-slate-900/60 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl bg-white rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden border border-slate-200 my-auto flex flex-col max-h-[92vh]">
        {/* Barra superior de acciones (no imprimible) */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-200 bg-slate-50 no-print gap-2">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="p-2 bg-cyan-100 text-cyan-800 rounded-xl shrink-0">
              <ClipboardCheck size={20} />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-slate-800 text-sm sm:text-base md:text-lg truncate">
                Reporte Ejecutivo de Auditoría
              </h3>
              <p className="text-xs text-slate-500 truncate">
                Código: <span className="font-mono font-semibold text-slate-700">{auditoria.codigo}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handlePrint}
              type="button"
              className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white rounded-xl font-medium text-xs sm:text-sm shadow-sm transition-all shrink-0"
            >
              <Printer size={15} />
              <span><span className="hidden sm:inline">Imprimir / Guardar </span>PDF</span>
            </button>
            <button
              onClick={onClose}
              type="button"
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors shrink-0"
              title="Cerrar modal"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Contenido imprimible */}
        <div ref={printRef} className="p-4 sm:p-8 overflow-y-auto print:p-6 print:m-0 space-y-6 text-slate-800">
          {/* Membrete Oficial */}
          <div className="flex flex-col sm:flex-row items-start sm:justify-between border-b-2 border-cyan-600 pb-5 gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-black tracking-tight text-cyan-700">AMATI HIELO</span>
                <span className="text-xs font-semibold px-2 py-0.5 bg-cyan-100 text-cyan-800 rounded-md">
                  ERP
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">Control de Calidad, Inventarios & Conciliación Física</p>
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 mt-3">{auditoria.nombre}</h1>
              <p className="text-xs text-slate-500">
                Alcance: <strong className="text-slate-700">{auditoria.tipoAlcance}</strong>
              </p>
            </div>
            <div className="text-left sm:text-right space-y-1">
              <div className="inline-block px-3 py-1 bg-slate-100 text-slate-800 font-mono text-sm font-bold rounded-lg border border-slate-300">
                {auditoria.codigo}
              </div>
              <p className="text-xs text-slate-500">
                Estado:{' '}
                <span className="font-semibold text-cyan-800">{auditoria.estado}</span>
              </p>
              <p className="text-xs text-slate-500">
                Período: <strong className="text-slate-700">{periodoTexto}</strong>
              </p>
              <p className="text-xs text-slate-500">
                Fecha de Corte: <strong className="text-slate-700">{auditoria.fechaCorte}</strong>
              </p>
              <p className="text-xs text-slate-400">
                Emitido el {new Date().toLocaleDateString('es-GT', { dateStyle: 'long' })}
              </p>
            </div>
          </div>

          {/* Ficha técnica de la auditoría */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs">
            <div>
              <span className="text-slate-400 font-medium">Responsable Conteo:</span>
              <p className="font-semibold text-slate-800 mt-0.5 flex items-center gap-1">
                <User size={13} className="text-slate-400" />
                {auditoria.responsableNombre || 'Sin asignar'}
              </p>
            </div>
            <div>
              <span className="text-slate-400 font-medium">Iniciado:</span>
              <p className="font-semibold text-slate-800 mt-0.5">
                {auditoria.iniciadoAt ? new Date(auditoria.iniciadoAt).toLocaleString('es-GT') : 'En preparación'}
              </p>
            </div>
            <div>
              <span className="text-slate-400 font-medium">Cierre Formal:</span>
              <p className="font-semibold text-slate-800 mt-0.5">
                {auditoria.cerradoAt ? new Date(auditoria.cerradoAt).toLocaleString('es-GT') : 'En proceso'}
              </p>
            </div>
            <div>
              <span className="text-slate-400 font-medium">Cerrado por:</span>
              <p className="font-semibold text-slate-800 mt-0.5">
                {auditoria.cerradoPor || 'Pendiente'}
              </p>
            </div>
          </div>

          {auditoria.descripcion && (
            <div className="text-xs p-3 rounded-lg bg-sky-50 border border-sky-100 text-sky-900">
              <span className="font-semibold">Observaciones iniciales: </span>
              {auditoria.descripcion}
            </div>
          )}

          {/* Resumen Cuantitativo / Financiero */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
              Resumen de Conciliación de Existencias
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-xs">
                <span className="text-xs text-slate-500">Total Artículos</span>
                <p className="text-xl font-bold text-slate-800 mt-1">{totalProductos}</p>
                <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-1">
                  <span>100% alcance</span>
                </div>
              </div>

              <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-xs">
                <span className="text-xs text-emerald-600 font-medium">Coincidentes (Sin dif.)</span>
                <p className="text-xl font-bold text-emerald-700 mt-1">{exactos}</p>
                <div className="flex items-center gap-1 text-[11px] text-emerald-600 mt-1">
                  <CheckCircle2 size={12} />
                  <span>{totalProductos > 0 ? ((exactos / totalProductos) * 100).toFixed(0) : 0}% exactitud</span>
                </div>
              </div>

              <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-xs">
                <span className="text-xs text-rose-600 font-medium">Faltantes Detectados</span>
                <p className="text-xl font-bold text-rose-700 mt-1">{faltantes.length}</p>
                <div className="flex items-center gap-1 text-[11px] text-rose-600 mt-1">
                  <TrendingDown size={12} />
                  <span>Artículos con déficit</span>
                </div>
              </div>

              <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-xs">
                <span className="text-xs text-cyan-700 font-medium">Sobrantes Detectados</span>
                <p className="text-xl font-bold text-cyan-800 mt-1">{sobrantes.length}</p>
                <div className="flex items-center gap-1 text-[11px] text-cyan-700 mt-1">
                  <TrendingUp size={12} />
                  <span>Artículos con superávit</span>
                </div>
              </div>
            </div>

            {/* Impacto Financiero */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-xs text-slate-500">Valor Inventario Teórico</span>
                <p className="text-lg font-bold text-slate-800 mt-1">{formatMoney(valorTeorico)}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-xs text-slate-500">Valor Inventario Físico Real</span>
                <p className="text-lg font-bold text-slate-800 mt-1">{formatMoney(valorFisico)}</p>
              </div>
              <div
                className={`p-3 rounded-xl border ${
                  impactoNeto < 0
                    ? 'bg-rose-50 border-rose-200 text-rose-900'
                    : impactoNeto > 0
                    ? 'bg-cyan-50 border-cyan-200 text-cyan-900'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                }`}
              >
                <span className="text-xs font-semibold">Impacto Económico Neto</span>
                <p className="text-lg font-black mt-1">
                  {impactoNeto > 0 ? '+' : ''}
                  {formatMoney(impactoNeto)}
                </p>
              </div>
            </div>
          </div>

          {/* Tabla de Conciliación Detallada */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              Detalle Artículo por Artículo
            </h4>
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Código</th>
                    <th className="py-2.5 px-3">Producto / Presentación</th>
                    <th className="py-2.5 px-3 text-center">Unidad</th>
                    <th className="py-2.5 px-3 text-right">Teórico</th>
                    <th className="py-2.5 px-3 text-right">Físico</th>
                    <th className="py-2.5 px-3 text-right">Diferencia</th>
                    <th className="py-2.5 px-3 text-right">% Var</th>
                    <th className="py-2.5 px-3 text-right">Impacto</th>
                    <th className="py-2.5 px-3">Estado / Justificación</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {detalles.map((d, index) => {
                    const dif = Number(d.diferencia || 0)
                    const impacto = Number(d.impacto_economico || 0)
                    const conteo = d.conteo_final != null ? d.conteo_final : d.stock_fisico_1
                    const esExacto = dif === 0

                    return (
                      <tr key={d.id || index} className={esExacto ? 'hover:bg-slate-50/50' : 'bg-slate-50/70 hover:bg-slate-100/50'}>
                        <td className="py-2 px-3 font-mono text-slate-600 font-semibold">
                          {d.codigo || d.codigo_producto || d.codigoProducto || '—'}
                        </td>
                        <td className="py-2 px-3">
                          <p className="font-semibold text-slate-800">
                            {d.nombre_producto || d.nombreProducto || d.nombre || 'Producto'}
                          </p>
                          <span className="text-[10px] text-slate-400">{d.categoria}</span>
                        </td>
                        <td className="py-2 px-3 text-center text-slate-600">
                          {d.unidad_medida || d.unidadMedida || d.unidad || 'Unidad'}
                        </td>
                        <td className="py-2 px-3 text-right font-medium text-slate-700">
                          {Number(d.stock_teorico || 0).toLocaleString()}
                        </td>
                        <td className="py-2 px-3 text-right font-bold text-slate-900">
                          {conteo != null ? Number(conteo).toLocaleString() : '—'}
                        </td>
                        <td
                          className={`py-2 px-3 text-right font-bold ${
                            dif < 0 ? 'text-rose-600' : dif > 0 ? 'text-cyan-600' : 'text-emerald-600'
                          }`}
                        >
                          {dif > 0 ? `+${dif}` : dif}
                        </td>
                        <td className="py-2 px-3 text-right text-slate-500">
                          {d.porcentaje_diferencia != null ? `${Number(d.porcentaje_diferencia).toFixed(1)}%` : '0%'}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-semibold text-slate-800">
                          {formatMoney(impacto)}
                        </td>
                        <td className="py-2 px-3 text-[11px]">
                          {esExacto ? (
                            <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                              <CheckCircle2 size={12} /> Conforme
                            </span>
                          ) : (
                            <div>
                              <span
                                className={`inline-block px-1.5 py-0.5 rounded font-medium text-[10px] ${
                                  d.ajuste_aplicado
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                {d.ajuste_aplicado ? 'Ajustado en ERP' : d.estado_diferencia || 'Pendiente'}
                              </span>
                              {d.justificacion && (
                                <p className="text-[10px] text-slate-500 italic mt-0.5 line-clamp-1" title={d.justificacion}>
                                  "{d.justificacion}"
                                </p>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Firmas de Autorización y Cierre */}
          <div className="pt-8 mt-6 border-t border-slate-200">
            <h5 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-6 text-center">
              Constancia de Conformidad y Autorización
            </h5>
            <div className="grid grid-cols-2 gap-10 sm:gap-16 text-center text-xs max-w-2xl mx-auto">
              <div>
                <div className="h-14 border-b border-dashed border-slate-400 mx-auto w-4/5" />
                <p className="font-bold text-slate-800 mt-2 text-sm">
                  {auditoria.responsableNombre || 'Persona que realizó el conteo'}
                </p>
                <p className="text-[11px] font-medium text-slate-600 mt-0.5">
                  Firma de la Persona que lo realizó
                </p>
                <p className="text-[10px] text-slate-400">
                  {auditoria.responsableRol || 'Responsable de Auditoría'}
                </p>
              </div>

              <div>
                <div className="h-14 border-b border-dashed border-slate-400 mx-auto w-4/5" />
                <p className="font-bold text-slate-800 mt-2 text-sm">
                  {auditoria.cerradoPor || 'Jefe de la Empresa'}
                </p>
                <p className="text-[11px] font-medium text-slate-600 mt-0.5">
                  Firma del Jefe de la Empresa
                </p>
                <p className="text-[10px] text-slate-400">
                  Gerencia General / Dirección
                </p>
              </div>
            </div>
          </div>

          {/* Pie de página oficial */}
          <div className="text-center text-[10px] text-slate-400 pt-4 border-t border-slate-100">
            AMATI HIELO — Documento generado automáticamente por el Sistema ERP. Los ajustes de inventario registrados cuentan con trazabilidad legal y respaldo contable.
          </div>
        </div>
      </div>
    </div>
  )
}
