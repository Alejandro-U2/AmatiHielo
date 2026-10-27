import { useEffect, useState, lazy, Suspense } from 'react'
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
import { getCurrentUser, logout } from '../services/authService'
import { listVentasPos } from '../services/posService'
import { listProductosInventario } from '../services/inventarioService'
import { getRecetasCount } from '../services/recetasService'
import { subscribeToDataChanges } from '../services/realtimeSync'
import { useTheme } from '../theme/useTheme'
import IceTransitionScreen from './IceTransitionScreen'

// Carga perezosa (Lazy loading) de módulos para máxima velocidad inicial
const GestionUsuarios = lazy(() => import('./modules/GestionUsuarios'))
const Inventarios = lazy(() => import('./modules/Inventarios'))
const MantenimientoEstructuraDatos = lazy(() => import('./modules/MantenimientoEstructuraDatos'))
const ConfiguracionSistema = lazy(() => import('./modules/ConfiguracionSistema'))
const ProduccionRecetas = lazy(() => import('./modules/ProduccionRecetas'))
const PuntoVenta = lazy(() => import('./modules/PuntoVenta'))
const IAPredictiva = lazy(() => import('./modules/IAPredictiva'))
const Reportes = lazy(() => import('./modules/Reportes'))

function ModuleLoading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[380px] p-8 text-center animate-fade-in">
      <div className="w-14 h-14 rounded-2xl bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-800 flex items-center justify-center text-cyan-600 mb-3 shadow-md shadow-cyan-500/10 relative">
        <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
        <span className="absolute text-xs select-none">❄</span>
      </div>
      <p className="text-sm font-bold text-slate-700 dark:text-slate-200">Cargando módulo criogénico...</p>
      <p className="text-xs text-slate-400 dark:text-slate-400 mt-1">Optimizando recursos de AMATI Hielo</p>
    </div>
  )
}

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
  const [desktopCollapsed, setDesktopCollapsed] = useState(false)
  const [initialLoading, setInitialLoading] = useState(() => {
    if (sessionStorage.getItem('amati_just_logged_in') === 'true') {
      sessionStorage.removeItem('amati_just_logged_in')
      return false
    }
    const alreadyShown = sessionStorage.getItem('amati_dashboard_entry_shown') === 'true'
    return !alreadyShown
  })

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setSidebarOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const [dashboardStats, setDashboardStats] = useState({
    ventasHoy: 0,
    transaccionesHoy: 0,
    stockTotal: 0,
    recetasTotal: 0,
  })

  useEffect(() => {
    let isMounted = true

    const fetchStats = async ({ updateRecetas = false } = {}) => {
      try {
        const promises = [
          listVentasPos().catch(() => []),
          listProductosInventario().catch(() => []),
        ]
        if (updateRecetas) {
          promises.push(getRecetasCount().catch(() => 0))
        }

        const [ventas, inventario, recetasTotalCount] = await Promise.all(promises)

        if (!isMounted) return

        const hoy = new Date()
        const ventasHoy = (ventas || []).filter((v) => {
          if (!v.createdAt) return false
          const f = new Date(v.createdAt)
          return (
            !Number.isNaN(f.getTime()) &&
            f.getFullYear() === hoy.getFullYear() &&
            f.getMonth() === hoy.getMonth() &&
            f.getDate() === hoy.getDate()
          )
        })

        const totalVentasHoy = ventasHoy.reduce((s, v) => s + (Number(v.total) || 0), 0)
        const stockTotal = (inventario || []).reduce((s, p) => s + (Number(p.stock) || 0), 0)

        setDashboardStats((prev) => ({
          ventasHoy: totalVentasHoy,
          transaccionesHoy: ventasHoy.length,
          stockTotal,
          recetasTotal: updateRecetas ? (recetasTotalCount ?? prev.recetasTotal) : prev.recetasTotal,
        }))
      } catch (err) {
        console.debug('Error al cargar métricas de dashboard:', err)
      }
    }

    void fetchStats({ updateRecetas: true })

    const unsubscribe = subscribeToDataChanges(({ type }) => {
      const shouldUpdateRecetas = type === 'recetas' || type === 'all'
      void fetchStats({ updateRecetas: shouldUpdateRecetas })
    }, { intervalSeconds: 15, types: ['all', 'ventas', 'recetas', 'inventario', 'produccion'] })

    return () => {
      isMounted = false
      unsubscribe()
    }
  }, [])

  const handleLogout = () => {
    sessionStorage.removeItem('amati_dashboard_entry_shown')
    sessionStorage.removeItem('amati_just_logged_in')
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

  if (initialLoading) {
    return (
      <IceTransitionScreen
        userName={user}
        duration={1100}
        onComplete={() => {
          sessionStorage.setItem('amati_dashboard_entry_shown', 'true')
          setInitialLoading(false)
        }}
      />
    )
  }

  return (
    <div className="min-h-screen bg-slate-100 flex overflow-x-hidden relative">
      {/* Overlay para móviles y tablets (< lg) */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-40 lg:hidden transition-opacity duration-300"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Menú lateral (Sidebar) */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 bg-white border-r border-slate-200 shadow-2xl lg:shadow-none flex flex-col transition-all duration-300 ease-in-out ${
          sidebarOpen ? 'translate-x-0 w-72' : '-translate-x-full lg:translate-x-0'
        } ${desktopCollapsed ? 'lg:w-20' : 'lg:w-64'}`}
      >
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center space-x-3 overflow-hidden">
            <img
              src={logoAmati}
              alt="AMATI HIELO"
              className="h-10 w-10 sm:h-11 sm:w-11 rounded-full ring-2 ring-cyan-500 shrink-0 object-cover"
            />
            {(!desktopCollapsed || sidebarOpen) && (
              <div className="min-w-0">
                <h1 className="text-base sm:text-lg font-bold bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent truncate">
                  AMATI HIELO
                </h1>
                <p className="text-[11px] sm:text-xs text-slate-500 truncate">Sistema de Gestión</p>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
            aria-label="Cerrar menú"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 p-3 overflow-y-auto space-y-1">
          {(!desktopCollapsed || sidebarOpen) && (
            <p className="px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Módulos
            </p>
          )}
          {modules
            .filter((module) => hasModuleAccess(module))
            .map((module) => {
              const ModuleIcon = module.icon
              const isActive = activeModule === module.id

              return (
                <button
                  key={module.id}
                  type="button"
                  title={module.name}
                  onClick={() => {
                    setActiveModule(module.id)
                    setSidebarOpen(false)
                  }}
                  className={`w-full text-left px-3.5 py-2.5 rounded-xl transition-all duration-200 flex items-center gap-3 ${
                    desktopCollapsed && !sidebarOpen ? 'justify-center px-2' : ''
                  } ${
                    isActive
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md font-semibold'
                      : 'text-slate-700 hover:bg-slate-100 font-medium'
                  }`}
                >
                  <ModuleIcon size={20} strokeWidth={2} className="shrink-0" />
                  {(!desktopCollapsed || sidebarOpen) && (
                    <span className="text-sm truncate">{module.name}</span>
                  )}
                </button>
              )
            })}
        </nav>

        <div className="p-3 border-t border-slate-200 space-y-2">
          <button
            type="button"
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors text-xs font-medium ${
              desktopCollapsed && !sidebarOpen ? 'justify-center px-2' : ''
            }`}
          >
            {theme === 'dark' ? <Sun size={17} className="shrink-0" /> : <Moon size={17} className="shrink-0" />}
            {(!desktopCollapsed || sidebarOpen) && (
              <span>{theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}</span>
            )}
          </button>

          {(!desktopCollapsed || sidebarOpen) && (
            <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-2.5">
              <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Sesión</p>
              <p className="text-xs font-semibold text-slate-800 truncate">{user}</p>
            </div>
          )}

          <button
            type="button"
            onClick={handleLogout}
            title="Cerrar Sesión"
            className={`w-full bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded-xl transition-all shadow-xs text-xs font-medium flex items-center justify-center gap-2 ${
              desktopCollapsed && !sidebarOpen ? 'px-2' : ''
            }`}
          >
            <LockKeyhole size={15} className="shrink-0" />
            {(!desktopCollapsed || sidebarOpen) && <span>Cerrar Sesión</span>}
          </button>
        </div>
      </aside>

      {/* Contenido principal */}
      <main className="flex-1 flex flex-col min-w-0 max-w-full overflow-y-auto">
        <header className="border-b border-slate-200 bg-white/95 backdrop-blur-xs sticky top-0 z-30 shadow-xs">
          <div className="px-3 sm:px-4 md:px-6 lg:px-8 py-2.5 sm:py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <button
                type="button"
                onClick={() => {
                  if (typeof window !== 'undefined' && window.innerWidth < 1024) {
                    setSidebarOpen((prev) => !prev)
                  } else {
                    setDesktopCollapsed((prev) => !prev)
                  }
                }}
                className="p-2 -ml-1 rounded-xl text-slate-700 hover:bg-slate-100 active:bg-slate-200 transition-colors shrink-0"
                aria-label="Alternar menú lateral"
                title={desktopCollapsed ? "Expandir menú" : "Colapsar menú"}
              >
                <Menu size={22} />
              </button>
              <div className="min-w-0">
                <h2 className="text-base sm:text-lg md:text-xl font-bold text-slate-900 truncate">
                  {activeModuleInfo?.name}
                </h2>
                <p className="hidden sm:block text-xs text-slate-500 truncate">
                  {activeModuleInfo?.description}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={toggleTheme}
                className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors"
                aria-label="Cambiar tema"
                title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
              >
                {theme === 'dark' ? <Sun size={19} /> : <Moon size={19} />}
              </button>
              <div className="hidden md:flex items-center gap-2 pl-3 border-l border-slate-200 text-xs text-slate-600">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="font-semibold text-slate-800 truncate max-w-[140px]">{user}</span>
              </div>
            </div>
          </div>
        </header>

        <div className="p-3 sm:p-4 md:p-6 lg:p-8">
          {activeModule === 'inicio' && (
            <>
              <div className="dashboard-kpis grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 md:gap-5 mb-5 md:mb-6">
                {[
                  {
                    label: 'Ventas Hoy',
                    value: `Q${dashboardStats.ventasHoy.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                    change: `${dashboardStats.transaccionesHoy} ventas`,
                    detail: 'en el día',
                    icon: Wallet,
                    tone: 'green',
                    chart: 'dashboard-chart-green',
                  },
                  {
                    label: 'Stock Disponible',
                    value: `${dashboardStats.stockTotal.toLocaleString('es-GT')}`,
                    change: 'Total',
                    detail: 'unidades en stock',
                    icon: Box,
                    tone: 'blue',
                    chart: 'dashboard-chart-blue',
                  },
                  {
                    label: 'Catálogo Recetas',
                    value: `${dashboardStats.recetasTotal}`,
                    change: 'Activas',
                    detail: 'para venta POS',
                    icon: Factory,
                    tone: 'purple',
                    chart: 'dashboard-chart-purple',
                  },
                  {
                    label: 'Temperatura',
                    value: '28°C',
                    change: 'En rango',
                    detail: 'cámaras frías',
                    icon: Thermometer,
                    tone: 'orange',
                    chart: 'dashboard-chart-orange',
                  },
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

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-5">
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

          <Suspense fallback={<ModuleLoading />}>
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
          </Suspense>

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
