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
        className="w-full max-w-sm rounded-2xl bg-white shadow-2xl border border-emerald-100 dark:border-emerald-950 p-7 text-center relative transform transition-all scale-100 dark:bg-slate-900 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-5 w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-500/20 to-teal-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-xs">
          <CheckCircle2 size={36} strokeWidth={2.2} aria-hidden="true" />
        </div>
        {subtitle && (
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-2">
            {subtitle}
          </p>
        )}
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          {title}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-6 whitespace-pre-line leading-relaxed">
          {message}
        </p>
        <button
          type="button"
          onClick={onClose}
          autoFocus
          className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 py-3 text-sm font-bold text-white shadow-md hover:shadow-emerald-500/25 transition-all focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
        >
          {buttonText}
        </button>
      </div>
    </div>
  )
}
