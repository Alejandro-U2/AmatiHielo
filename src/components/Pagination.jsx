import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'

function Pagination({
  page,
  totalPages,
  onChange,
  pageSize,
  onPageSizeChange,
  totalItems,
  pageSizeOptions = [5, 10, 25, 50],
}) {
  const showBar = totalPages > 1 || (totalItems !== undefined && totalItems > 0) || Boolean(pageSize)

  if (!showBar) return null

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-lg bg-gray-50 mt-4">
      <div className="flex flex-wrap items-center gap-3">
        {pageSize && onPageSizeChange && (
          <label className="flex items-center gap-2 text-sm text-gray-600">
            Mostrar
            <select
              value={pageSize}
              onChange={(event) => onPageSizeChange(Number(event.target.value))}
              className="px-2 py-1 border border-gray-300 rounded-lg bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
            por página
          </label>
        )}
        <p className="text-sm text-gray-600">
          Página {page} de {totalPages}
          {totalItems !== undefined ? ` · Total: ${totalItems}` : ''}
        </p>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onChange(1)}
          disabled={page === 1}
          title="Primera página"
          className="p-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronsLeft size={16} aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => onChange(Math.max(1, page - 1))}
          disabled={page === 1}
          title="Anterior"
          className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Anterior
        </button>
        <button
          type="button"
          onClick={() => onChange(Math.min(totalPages, page + 1))}
          disabled={page === totalPages}
          title="Siguiente"
          className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Siguiente
        </button>
        <button
          type="button"
          onClick={() => onChange(totalPages)}
          disabled={page === totalPages}
          title="Última página"
          className="p-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronsRight size={16} aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}

export default Pagination