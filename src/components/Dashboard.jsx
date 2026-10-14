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
  Menu,
  Moon,
  Package,
  ShieldAlert,
  ShoppingCart,
  SlidersHorizontal,
  Sun,
  Thermometer,
  Wallet,
  X,
} from 'lucide-react'
import logoAmati from '../assets/logo-amati.jpg'
import GestionUsuarios from './modules/GestionUsuarios'
import Inventarios from './modules/Inventarios'
import MantenimientoEstructuraDatos from './modules/MantenimientoEstructuraDatos'
import ConfiguracionSistema from './modules/ConfiguracionSistema'
import ProduccionRecetas from './modules/ProduccionRecetas'
import PuntoVenta from './modules/PuntoVenta'
import IAPredictiva from './modules/IAPredictiva'
import Reportes from './modules/Reportes'
import { getCurrentUser, logout } from '../services/authService'
import { useTheme } from '../theme/useTheme'

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
  const { theme, toggleTheme } = useTheme()
  const currentUser = getCurrentUser()
  const userRole = String(currentUser?.rol || currentUser?.role || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  const [user] = useState(
    currentUser?.nombre || currentUser?.username || currentUser?.email || 'Usuario',
  )
  const [activeModule, setActiveModule] = useState('inicio')
  const [sidebarOpen, setSidebarOpen] = useState(false)

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
    },
    {
      id: 'seguridad',
      name: 'Seguridad y Acceso',
      icon: LockKeyhole,
      description: 'Gestion de usuarios y permisos',
      allowedRoles: ['administrador', 'superusuario', 'admin'],
      features: ['Gestion de Usuarios', 'Bitacora de Eventos', 'Niveles de Acceso'],
    },
    {
      id: 'inventarios',
      name: 'Inventarios',
      icon: Package,
      description: 'Control de stock y almacen',
      features: ['Control de Stock', 'Alertas de Reabastecimiento', 'Gestion de Mermas'],
    },
    {
      id: 'produccion',
      name: 'Recetas de Venta',
      icon: Factory,
      description: 'BOM para consumo directo en POS',
      features: ['Bill of Materials (BOM)', 'Vinculo con Inventario', 'Costeo de Venta'],
    },
    {
      id: 'pos',
      name: 'Punto de Venta',
      icon: ShoppingCart,
      description: 'Sistema POS integrado',
      suspended: true,
      features: ['Registro de Ventas', 'Sincronizacion de Salidas', 'Facturacion'],
    },
    {
      id: 'estructura-datos',
      name: 'Mantenimiento de datos',
      icon: Database,
      description: 'Administración de tablas y campos del sistema',
      allowedRoles: ['administrador', 'superusuario', 'admin'],
      features: ['Explorador de Tablas', 'Creación de Estructuras', 'Eliminación Controlada'],
    },
    {
      id: 'configuracion-sistema',
      name: 'Configuración del Sistema',
      icon: SlidersHorizontal,
      description: 'Parámetros globales, sucursales e impuestos',
      allowedRoles: ['administrador', 'superusuario', 'admin'],
      suspended: true,
      features: ['Datos de la Empresa', 'Sucursales', 'Notificaciones', 'Umbrales'],
    },
    {
      id: 'ia',
      name: 'IA Predictiva',
      icon: Bot,
      description: 'Analisis inteligente de datos',
      allowedRoles: ['administrador', 'superusuario', 'admin'],
      suspended: true,
      features: ['Analisis Climatico', 'Prediccion de Demanda', 'Recomendaciones'],
    },
    {
      id: 'reportes',
      name: 'Reportes',
      icon: BarChart3,
      description: 'Gestion y exportacion de reportes del sistema',
      allowedRoles: ['administrador', 'superusuario', 'admin'],
      features: ['Ventas', 'Inventario', 'Produccion', 'Finanzas'],
    },
  ]

  const activeModuleInfo = modules.find((module) => module.id === activeModule)

  const hasModuleAccess = (module) => {
    if (!module?.allowedRoles) {
      return true
    }

    return module.allowedRoles.some((role) => {
      const normalizedRole = String(role).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
      return normalizedRole === userRole || (userRole === 'superadmin' && normalizedRole === 'superusuario')
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className={`fixed md:static inset-y-0 left-0 z-50 w-64 bg-white shadow-xl flex flex-col transform transition-transform duration-200 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <img src={logoAmati} alt="AMATI HIELO" className="h-12 w-12 rounded-full ring-2 ring-cyan-500" />
              <div>
                <h1 className="text-lg font-bold bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">
                  AMATI HIELO
                </h1>
                <p className="text-xs text-gray-600">Sistema de Gestion</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              className="md:hidden p-1 rounded-lg hover:bg-gray-100"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <nav className="flex-1 p-4 overflow-y-auto">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Modulos</p>
          {modules.filter((module) => hasModuleAccess(module)).map((module) => {
            const ModuleIcon = module.icon

            return (
              <button
                key={module.id}
                type="button"
                disabled={false}
                onClick={() => {
                  setActiveModule(module.id)
                  setSidebarOpen(false)
                }}
                className={`w-full text-left px-4 py-3 rounded-lg mb-2 transition-all duration-200 flex items-center gap-3 ${
                  activeModule === module.id
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <ModuleIcon size={22} strokeWidth={2} className="flex-shrink-0" />
                <span className="font-medium text-sm flex-1">{module.name}</span>
              </button>
            )
          })}
        </nav>

        <div className="p-4 border-t border-gray-200">
          <button
            type="button"
            onClick={toggleTheme}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 mb-3 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors text-sm font-medium"
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            {theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
          </button>
          <div className="bg-gray-50 rounded-lg p-3 mb-3">
            <p className="text-xs text-gray-600 mb-1">Sesion activa</p>
            <p className="font-semibold text-gray-800 truncate">{user}</p>
          </div>
          <button
            onClick={handleLogout}
            className="w-full bg-gradient-to-r from-red-500 to-red-600 text-white px-4 py-2 rounded-lg hover:from-red-600 hover:to-red-700 transition-all duration-200 shadow-md hover:shadow-lg text-sm font-medium"
          >
            Cerrar Sesion
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto min-w-0">
        <header className="border-b border-cyan-200 bg-gradient-to-r from-cyan-100 via-sky-50 to-blue-100 shadow-sm">
          <div className="px-4 py-4 md:px-8 flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="md:hidden p-2 rounded-lg hover:bg-gray-100"
            >
              <Menu size={22} />
            </button>
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-slate-900">
                {activeModuleInfo?.name}
              </h2>
              <p className="text-sm text-gray-600">
                {activeModuleInfo?.description}
              </p>
            </div>
          </div>
        </header>

        <div className="p-4 md:p-8">
          {activeModule === 'inicio' && (
            <>
              <div className="dashboard-kpis grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-5 mb-5 md:mb-6">
                {[
                  { label: 'Ventas Hoy', value: 'Q8,450', change: '+12%', detail: 'vs. ayer', icon: Wallet, tone: 'green', chart: 'dashboard-chart-green' },
                  { label: 'Stock Disponible', value: '1,240', change: '-5%', detail: 'vs. semana anterior', icon: Box, tone: 'blue', chart: 'dashboard-chart-blue', negative: true },
                  { label: 'Producción', value: '850 kg', change: '+8%', detail: 'vs. ayer', icon: Factory, tone: 'purple', chart: 'dashboard-chart-purple' },
                  { label: 'Temperatura', value: '28°C', change: 'En rango', detail: '', icon: Thermometer, tone: 'orange', chart: 'dashboard-chart-orange' },
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
                      <div className={`dashboard-sparkline ${metric.chart}`} aria-hidden="true" />
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
                  const canOpen = hasModuleAccess(module)

                  return (
                    <button
                      key={module.id}
                      type="button"
                      disabled={!canOpen}
                      className={`dashboard-module-card dashboard-module-${module.id} ${!canOpen ? 'is-disabled' : ''}`}
                      onClick={() => canOpen && setActiveModule(module.id)}
                    >
                      <div className="dashboard-module-copy">
                        <h3>{module.name}</h3>
                        <p>{module.description}</p>
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

          {activeModule === 'seguridad' && (
            hasModuleAccess(activeModuleInfo)
              ? <GestionUsuarios currentUserId={currentUser?.id} />
              : <ModuleAccessDenied moduleName={activeModuleInfo?.name} />
          )}

          {activeModule === 'inventarios' && (
            <Inventarios />
          )}

          {activeModule === 'produccion' && (
            <ProduccionRecetas />
          )}

          {activeModule === 'pos' && (
            <PuntoVenta />
          )}

          {activeModule === 'ia' && (
            <IAPredictiva />
          )}

          {activeModule === 'estructura-datos' && (
            <MantenimientoEstructuraDatos />
          )}

          {activeModule === 'configuracion-sistema' && (
            <ConfiguracionSistema />
          )}

          {activeModule === 'reportes' && (
            <Reportes />
          )}

          {!['inicio', 'seguridad', 'inventarios', 'produccion', 'pos', 'ia', 'estructura-datos', 'configuracion-sistema', 'reportes'].includes(activeModule) && (
            <div className="bg-white rounded-xl shadow-md p-8">
              <div className="text-center py-12">
                <div className="mx-auto mb-4 w-20 h-20 rounded-2xl bg-cyan-50 text-cyan-700 flex items-center justify-center">
                  <Database size={42} strokeWidth={1.8} />
                </div>
                <h3 className="text-2xl font-bold text-gray-800 mb-3">
                  {activeModuleInfo?.name}
                </h3>
                <p className="text-gray-600 mb-6">
                  {activeModuleInfo?.description}
                </p>

                {activeModuleInfo?.features && (
                  <div className="max-w-md mx-auto bg-gray-50 rounded-lg p-6 mt-8">
                    <p className="font-semibold text-gray-700 mb-4">Funcionalidades incluidas:</p>
                    <ul className="space-y-3 text-left">
                      {activeModuleInfo.features.map((feature, idx) => (
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
                    Modulo disponible desde el menu lateral
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default Dashboard
