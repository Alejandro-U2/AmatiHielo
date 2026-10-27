import React, { useEffect } from 'react'
import { CheckCircle2 } from 'lucide-react'

export default function SuccessModal({
  isOpen,
  title = 'Cambios guardados',
  subtitle = 'Operación completada',
  message,
  onClose,
  buttonText = 'Aceptar',
}) {
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && onClose) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen || !message) return null

  return (
    <div
      className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-[70] p-4 transition-all duration-200 animate-in fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-white shadow-2xl border border-emerald-100 p-7 text-center relative transform transition-all scale-100 dark:bg-[#18181f] dark:border-[#2b2b38]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-5 w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center dark:bg-emerald-950/40 dark:text-emerald-400">
          <CheckCircle2 size={36} strokeWidth={2.2} aria-hidden="true" />
        </div>
        {subtitle && (
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-2">
            {subtitle}
          </p>
        )}
        <h3 className="text-xl font-bold text-gray-800 dark:text-[#e4e4e7] mb-2">
          {title}
        </h3>
        <p className="text-sm text-gray-600 dark:text-[#a1a1aa] mb-6 whitespace-pre-line leading-relaxed">
          {message}
        </p>
        <button
          type="button"
          onClick={onClose}
          autoFocus
          className="w-full rounded-lg bg-gray-900 py-3 text-sm font-semibold text-white transition-colors hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 dark:bg-cyan-600 dark:hover:bg-cyan-700 dark:focus:ring-offset-[#18181f]"
        >
          {buttonText}
        </button>
      </div>
    </div>
  )
}
