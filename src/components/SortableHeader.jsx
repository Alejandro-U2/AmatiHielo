import { ChevronDown, ChevronUp, ChevronsUpDown } from 'lucide-react'

function SortableHeader({ label, sortKey, sortBy, sortDir, onSort, className = '', align = 'left' }) {
  const active = sortBy === sortKey

  const alignment = align === 'center'
    ? 'justify-center text-center'
    : align === 'right'
      ? 'justify-end text-right'
      : 'justify-start text-left'

  return (
    <button
      type="button"
      onClick={() => onSort(sortKey)}
      className={`inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wider transition-colors ${
        active
          ? 'text-cyan-600'
          : 'text-gray-600 hover:text-gray-900'
      } ${alignment} ${className}`}
    >
      {label}
      {active ? (
        sortDir === 'asc'
          ? <ChevronUp size={14} aria-hidden="true" />
          : <ChevronDown size={14} aria-hidden="true" />
      ) : (
        <ChevronsUpDown size={14} aria-hidden="true" className="text-gray-300" />
      )}
    </button>
  )
}

export default SortableHeader