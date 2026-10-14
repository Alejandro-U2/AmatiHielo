import { createElement } from 'react'
import { Sparkles } from 'lucide-react'

function ModuleHeader({ title, description, eyebrow = 'Amati · Gestión operativa', icon, children }) {
  return (
    <header className="relative isolate mb-6 overflow-hidden rounded-3xl border border-cyan-200 bg-gradient-to-br from-cyan-100 via-sky-50 to-blue-100 px-5 py-6 shadow-sm sm:px-8 sm:py-7">
      <div className="pointer-events-none absolute -right-12 -top-20 h-56 w-56 rounded-full bg-cyan-300/40 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 right-1/3 h-48 w-48 rounded-full bg-blue-300/35 blur-3xl" />
      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <div className="mt-1 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-cyan-200 bg-white/80 text-cyan-700 shadow-sm">
            {createElement(icon || Sparkles, { size: 23, strokeWidth: 1.9, 'aria-hidden': true })}
          </div>
          <div className="min-w-0">
            <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-cyan-200 bg-white/75 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-cyan-800">
              <Sparkles size={12} aria-hidden="true" />
              {eyebrow}
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{title}</h1>
            {description && <p className="mt-1.5 max-w-2xl text-sm leading-6 text-slate-600">{description}</p>}
          </div>
        </div>
        {children && <div className="relative flex flex-wrap items-center gap-2 sm:justify-end">{children}</div>}
      </div>
    </header>
  )
}

export default ModuleHeader
