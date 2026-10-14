import { Database } from 'lucide-react'
import ModuleHeader from '../ModuleHeader'

function ModuloEnProceso({ module: { name, description, features } = {} }) {
  return (
    <div className="space-y-6">
      <ModuleHeader title={name} description={description} eyebrow="Módulo" icon={Database} />
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <div className="text-center py-12">
        <div className="mx-auto mb-4 w-20 h-20 rounded-2xl bg-cyan-50 text-cyan-700 flex items-center justify-center">
          <Database size={42} strokeWidth={1.8} />
        </div>
        {features && (
          <div className="max-w-md mx-auto bg-gray-50 rounded-lg p-6 mt-8">
            <p className="font-semibold text-gray-700 mb-4">Funcionalidades planeadas:</p>
            <ul className="space-y-3 text-left">
              {features.map((feature, idx) => (
                <li key={idx} className="flex items-center text-gray-700">
                  <span className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold mr-3">
                    {idx + 1}
                  </span>
                  {feature}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-8">
          <span className="inline-flex items-center gap-2 bg-yellow-100 text-yellow-800 px-4 py-2 rounded-full text-sm font-medium">
            <Database size={16} />
            Modulo en Proceso
          </span>
        </div>
      </div>
      </div>
    </div>
  )
}

export default ModuloEnProceso
