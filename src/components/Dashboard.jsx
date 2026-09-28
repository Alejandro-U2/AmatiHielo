import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BarChart3,
  Bot,
  Box,
  ChevronRight,
  Database,
  Factory,
  Home,
  LockKeyhole,
  ShieldAlert,
  Package,
  ShoppingCart,
  Thermometer,
  SlidersHorizontal,
  Wallet,
} from 'lucide-react'
import logoAmati from '../assets/logo-amati.jpg'
import GestionUsuarios from './modules/GestionUsuarios'
import Inventarios from './modules/Inventarios'
import ModuloEnProceso from './modules/ModuloEnProceso'
import ProduccionRecetas from './modules/ProduccionRecetas'
import PuntoVenta from './modules/PuntoVenta'
import Reportes from './modules/Reportes'
import { getCurrentUser, logout } from '../services/authService'

function ModuleAccessDenied({ moduleName }) {
  return (
    <div className="min-h-[420px] flex items-center justify-center">
      <div className="max-w-lg w-full bg-white border border-red-200 rounded-2xl shadow-md p-10 text-center">
        <div className="mx-auto mb-5 w-16 h-16 rounded-full bg-red-100 text-red-600 flex items-center justify-center">
          <ShieldAlert size={34} aria-hidden="true" />
        </div>
        <h3 className="text-2xl font-bold text-gray-800 mb-3">No tiene acceso al módulo</h3>
        <p className="text-gray-600">
          Su usuario no cuenta con permisos para ingresar a {moduleName || 'este módulo'}.
        </p>
        <p className="text-sm text-gray-500 mt-2">Contacte al administrador del sistema.</p>
      </div>
    </div>
  )
}

function Dashboard() {
  const navigate = useNavigate()
  const currentUser = getCurrentUser()
  const userRole = String(currentUser?.rol || currentUser?.role || '').toLowerCase()
  const isAdminUser = ['administrador', 'superusuario', 'admin'].includes(userRole)
  const [user] = useState(
    currentUser?.nombre || currentUser?.username || currentUser?.email || 'Usuario',
  )
  const [activeModule, setActiveModule] = useState('inicio')

  const activeViews = {
    seguridad: <GestionUsuarios currentUserId={currentUser?.id} />,
    inventarios: <Inventarios />,
    produccion: <ProduccionRecetas />,
    pos: <PuntoVenta />,
    reportes: <Reportes />,
  }

  const hasModuleAccess = (module) => {
    if (!module?.allowedRoles) {
      return true
    }

    return module.allowedRoles.includes(userRole)
  }

  const handleLogout = () => {
    logout()
    navigate('/', { replace: true })
  }

  const modules = [
    {
      id: 'inicio',
      name: 'Inicio',
      icon: Home,
      description: 'Panel de control principal',
      estado: 'activo',
    },
    {
      id: 'seguridad',
      name: 'Seguridad y Acceso',
      icon: LockKeyhole,
      description: 'Gestion de usuarios y permisos',
      estado: 'activo',
      allowedRoles: ['administrador', 'superusuario', 'admin'],
      features: ['Gestion de Usuarios', 'Bitacora de Eventos', 'Niveles de Acceso'],
    },
    {
      id: 'inventarios',
      name: 'Inventarios',
      icon: Package,
      description: 'Control de stock y almacen',
      estado: 'activo',
      features: ['Control de Stock', 'Alertas de Reabastecimiento', 'Gestion de Mermas'],
    },
    {
      id: 'produccion',
      name: 'Recetas de Venta',
      icon: Factory,
      description: 'BOM para consumo directo en POS',
      estado: 'activo',
      features: ['Bill of Materials (BOM)', 'Vinculo con Inventario', 'Costeo de Venta'],
    },
    {
      id: 'pos',
      name: 'Punto de Venta',
      icon: ShoppingCart,
      description: 'Sistema POS integrado',
      estado: 'activo',
      features: ['Registro de Ventas', 'Sincronizacion de Salidas', 'Facturacion'],
    },
    {
      id: 'estructura-datos',
      name: 'Mantenimiento de datos',
      icon: Database,
      description: 'Administración de tablas y campos del sistema',
      estado: 'en_proceso',
      allowedRoles: ['administrador', 'superusuario', 'admin'],
      features: ['Explorador de Tablas', 'Creación de Estructuras', 'Eliminación Controlada'],
    },
    ...(isAdminUser ? [{
      id: 'configuracion-sistema',
      name: 'Configuración del Sistema',
      icon: SlidersHorizontal,
      description: 'Parámetros globales, sucursales e impuestos',
      estado: 'en_proceso',
      features: ['Datos de la Empresa', 'Sucursales', 'Notificaciones', 'Umbrales'],
    }] : []),
    {
      id: 'ia',
      name: 'IA Predictiva',
      icon: Bot,
      description: 'Analisis inteligente de datos',
      estado: 'en_proceso',
      allowedRoles: ['administrador', 'superusuario', 'admin'],
      features: ['Analisis Climatico', 'Prediccion de Demanda', 'Recomendaciones'],
    },
    {
      id: 'reportes',
      name: 'Reportes',
      icon: BarChart3,
      description: 'Gestion y exportacion de reportes del sistema',
      estado: 'activo',
      allowedRoles: ['administrador', 'superusuario', 'admin'],
      features: ['Ventas', 'Inventario', 'Produccion', 'Finanzas'],
    },
  ]

  const activeModuleInfo = modules.find((module) => module.id === activeModule)

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex">
      <aside className="w-64 bg-white shadow-xl flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <img src={logoAmati} alt="AMATI HIELO" className="h-12 w-12 rounded-full ring-2 ring-cyan-500" />
            <div>
              <h1 className="text-lg font-bold bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">
                AMATI HIELO
              </h1>
              <p className="text-xs text-gray-600">Sistema de Gestion</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 overflow-y-auto">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Modulos</p>
                    {modules.filter((module) => hasModuleAccess(module)).map((module) => {
            const ModuleIcon = module.icon

            return (
              <button
                key={module.id}
                onClick={() => setActiveModule(module.id)}
                className={`w-full text-left px-4 py-3 rounded-lg mb-2 transition-all duration-200 flex items-center space-x-3 ${
                  activeModule === module.id
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <ModuleIcon size={22} strokeWidth={2} className="flex-shrink-0" />
                <span className="font-medium text-sm">{module.name}</span>
                {module.estado === 'en_proceso' && (
                  <span
                    className={`ml-auto text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                      activeModule === module.id ? 'bg-white/20 text-white' : 'bg-yellow-100 text-yellow-700'
                    }`}
                  >
                    En Proceso
                  </span>
                )}
              </button>
            )
          })}
        </nav>

        <div className="p-4 border-t border-gray-200">
          <div className="bg-gray-50 rounded-lg p-3 mb-3">
            <p className="text-xs text-gray-600 mb-1">Sesion activa</p>
            <p className="font-semibold text-gray-800">{user}</p>
          </div>
          <button
            onClick={handleLogout}
            className="w-full bg-gradient-to-r from-red-500 to-red-600 text-white px-4 py-2 rounded-lg hover:from-red-600 hover:to-red-700 transition-all duration-200 shadow-md hover:shadow-lg text-sm font-medium"
          >
            Cerrar Sesion
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="px-8 py-4">
            <h2 className="text-2xl font-bold text-gray-800">
              {activeModuleInfo?.name}
            </h2>
            <p className="text-sm text-gray-600">
              {activeModuleInfo?.description}
            </p>
          </div>
        </header>

        <div className="p-8">
          {activeModule === 'inicio' && (
            <>
              <div className="bg-gradient-to-r from-cyan-500 to-blue-600 rounded-2xl shadow-xl p-8 mb-8 text-white">
                <h2 className="text-3xl font-bold mb-2">Bienvenido al sistema, {user}</h2>
                <p className="text-cyan-100">Panel de control centralizado - Selecciona un modulo del menu lateral</p>
              </div>

              <div className="dashboard-kpis grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-5 mb-5 md:mb-6">
                {[
                  { label: 'Ventas Hoy', value: 'Q8,450', change: '+12%', detail: 'vs. ayer', icon: Wallet, tone: 'green' },
                  { label: 'Stock Disponible', value: '1,240', change: '-5%', detail: 'vs. semana anterior', icon: Box, tone: 'blue', negative: true },
                  { label: 'Producción', value: '850 kg', change: '+8%', detail: 'vs. ayer', icon: Factory, tone: 'purple' },
                  { label: 'Temperatura', value: '28°C', change: 'En rango', detail: '', icon: Thermometer, tone: 'orange' },
                ].map((metric) => {
                  const MetricIcon = metric.icon

                  return (
                    <div key={metric.label} className={`dashboard-kpi dashboard-tone-${metric.tone}`}>
                      <div className="dashboard-kpi-icon"><MetricIcon size={25} strokeWidth={2.2} /></div>
                      <div className="min-w-0">
                        <p className="dashboard-kpi-label">{metric.label}</p>
                        <p className="dashboard-kpi-value">{metric.value}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className={`dashboard-kpi-change ${metric.negative ? 'is-negative' : ''}`}>{metric.negative ? '↓' : metric.label === 'Temperatura' ? '' : '↑'} {metric.change}</span>
                          {metric.detail && <span className="dashboard-kpi-detail">{metric.detail}</span>}
                        </div>
                      </div>
                      <div className="dashboard-sparkline" aria-hidden="true" />
                      <button type="button" className="dashboard-round-action" aria-label={`Ver ${metric.label}`}>
                        <ChevronRight size={18} />
                      </button>
                    </div>
                  )
                })}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
                {modules
                  .filter((module) => module.id !== 'inicio' && hasModuleAccess(module))
                  .map((module) => {
                    const ModuleIcon = module.icon

                    return (
                      <button
                        key={module.id}
                        type="button"
                        className={`dashboard-module-card dashboard-module-${module.id}`}
                        onClick={() => setActiveModule(module.id)}
                      >
                        <div className="dashboard-module-copy">
                          <h3>{module.name}</h3>
                          <p>{module.description}</p>
                          {module.estado === 'en_proceso' && (
                            <span className="text-[10px] px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full font-semibold">
                              En Proceso
                            </span>
                          )}
                        </div>
                        <span className="dashboard-module-hero-icon" aria-hidden="true">
                          <ModuleIcon size={88} strokeWidth={1.45} />
                        </span>
                        <span className="dashboard-module-arrow"><ChevronRight size={19} /></span>
                      </button>
                    )
                  })}
                <div className="dashboard-brand-card">
                  <img src={logoAmati} alt="AMATI HIELO" />
                  <strong>AMATI HIELO</strong>
                  <span>Control hoy, crecimiento mañana.</span>
                </div>
              </div>
            </>
          )}

          {activeModule !== 'inicio' && (
            hasModuleAccess(activeModuleInfo)
              ? activeViews[activeModule] || <ModuloEnProceso module={activeModuleInfo} />
              : <ModuleAccessDenied moduleName={activeModuleInfo?.name} />
          )}
        </div>
      </main>
    </div>
  )
}

export default Dashboard