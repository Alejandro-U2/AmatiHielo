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
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-white/70">
        <div className="p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4 mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <FileDown size={20} aria-hidden="true" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-800">Reporte PDF</h3>
                <p className="text-xs md:text-sm text-gray-600">{title}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={generating}
              className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              title="Cerrar"
            >
              <X size={18} aria-hidden="true" />
            </button>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filtrar por {filterLabel}
            </label>
            <select
              value={selectedValue}
              onChange={(event) => setSelectedValue(event.target.value)}
              disabled={generating}
              className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              {filterOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                  {typeof option.count === 'number' ? ` (${option.count})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="bg-indigo-50 border border-indigo-200 rounded-lg px-4 py-3 text-sm text-indigo-800 mb-5">
            Registros a incluir: <span className="font-bold">{count}</span>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={generating}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => onGenerate(selectedValue)}
              disabled={generating}
              className="inline-flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-semibold shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {generating ? (
                <>
                  <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                  Generando...
                </>
              ) : (
                <>
                  <FileDown size={16} aria-hidden="true" />
                  Generar PDF
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ReporteModal