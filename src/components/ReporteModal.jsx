import { useState } from 'react'
import { FileDown, Loader2, X } from 'lucide-react'

/**
 * @typedef {{ value: string, label: string, count: number }} ReporteFilterOption
 * @param {object} props
 * @param {boolean} props.open
 * @param {string} props.title
 * @param {string} [props.filterLabel]
 * @param {Array<ReporteFilterOption>} [props.filterOptions]
 * @param {boolean} [props.generating]
 * @param {(value: string) => void} props.onGenerate
 * @param {() => void} props.onClose
 */
function ReporteModal({
  open,
  title,
  filterLabel = 'Filtro',
  filterOptions = [],
  generating = false,
  onGenerate,
  onClose,
}) {
  const [selectedValue, setSelectedValue] = useState('')
  const [prevOpen, setPrevOpen] = useState(open)

  if (prevOpen !== open) {
    setPrevOpen(open)
    if (open) {
      setSelectedValue('')
    }
  }

  if (!open) return null

  const selectedOption = filterOptions.find((option) => option.value === selectedValue)
  const count = selectedOption ? selectedOption.count : 0

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md border border-gray-100 dark:border-slate-800 transition-all overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col">
        {/* Header Sticky */}
        <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-cyan-500/20 to-blue-500/20 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shadow-sm">
              <FileDown size={22} aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Generar Reporte PDF</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{title}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={generating}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-40"
            title="Cerrar"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wider">
              Filtrar por {filterLabel}
            </label>
            <select
              value={selectedValue}
              onChange={(event) => setSelectedValue(event.target.value)}
              disabled={generating}
              className="w-full px-3.5 py-2.5 border-2 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-400 text-sm text-gray-800 dark:text-gray-200 disabled:opacity-50"
            >
              {filterOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                  {typeof option.count === 'number' ? ` (${option.count})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="rounded-xl border border-cyan-200 dark:border-cyan-800/80 bg-cyan-50/70 dark:bg-cyan-950/30 px-4 py-3 text-xs text-cyan-900 dark:text-cyan-200 flex items-center justify-between">
            <span className="font-medium">Registros a incluir en el documento:</span>
            <span className="text-sm font-bold font-mono text-cyan-800 dark:text-cyan-300">{count}</span>
          </div>
        </div>

        {/* Sticky Footer */}
        <div className="px-6 py-4 border-t border-gray-100 dark:border-slate-800 bg-gray-50/80 dark:bg-slate-900/80 backdrop-blur-md sticky bottom-0 z-10 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={generating}
            className="px-5 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 font-semibold text-sm hover:bg-gray-50 dark:hover:bg-slate-700/60 transition-colors disabled:opacity-40"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => onGenerate(selectedValue)}
            disabled={generating}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-semibold text-sm shadow-md hover:shadow-cyan-500/25 transition-all inline-flex items-center gap-2 disabled:opacity-50"
          >
            {generating ? (
              <>
                <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                <span>Generando...</span>
              </>
            ) : (
              <>
                <FileDown size={16} aria-hidden="true" />
                <span>Descargar PDF</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ReporteModal