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
import { getCurrentUser, logout } from '../services/authService'

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
      estado: 'en_proceso',
      features: ['Bill of Materials (BOM)', 'Vinculo con Inventario', 'Costeo de Venta'],
    },
    {
      id: 'pos',
      name: 'Punto de Venta',
      icon: ShoppingCart,
      description: 'Sistema POS integrado',
      estado: 'en_proceso',
      features: ['Registro de Ventas', 'Sincronizacion de Salidas', 'Facturacion'],
    },
    {
      id: 'estructura-datos',
      name: 'Mantenimiento de datos',
      icon: Database,
      description: 'Administración de tablas y campos del sistema',
      estado: 'en_proceso',
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
      features: ['Analisis Climatico', 'Prediccion de Demanda', 'Recomendaciones'],
    },
    {
      id: 'reportes',
      name: 'Reportes',
      icon: BarChart3,
      description: 'Gestion y exportacion de reportes del sistema',
      estado: 'en_proceso',
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
          {modules.map((module) => {
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

              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-xl transition-shadow">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-600 text-sm font-medium">Ventas Hoy</p>
                      <p className="text-3xl font-bold text-gray-800 mt-2">Q8,450</p>
                    </div>
                    <div className="bg-green-100 p-4 rounded-full">
                      <Wallet className="text-green-700" size={28} />
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-xl transition-shadow">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-600 text-sm font-medium">Stock Disponible</p>
                      <p className="text-3xl font-bold text-gray-800 mt-2">1,240</p>
                    </div>
                    <div className="bg-blue-100 p-4 rounded-full">
                      <Box className="text-blue-700" size={28} />
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-xl transition-shadow">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-600 text-sm font-medium">Produccion</p>
                      <p className="text-3xl font-bold text-gray-800 mt-2">850 kg</p>
                    </div>
                    <div className="bg-purple-100 p-4 rounded-full">
                      <Factory className="text-purple-700" size={28} />
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-xl transition-shadow">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-600 text-sm font-medium">Temperatura</p>
                      <p className="text-3xl font-bold text-gray-800 mt-2">28°C</p>
                    </div>
                    <div className="bg-orange-100 p-4 rounded-full">
                      <Thermometer className="text-orange-700" size={28} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {modules.filter((module) => module.id !== 'inicio').map((module) => {
                  const ModuleIcon = module.icon

                  return (
                    <div
                      key={module.id}
                      className="bg-white rounded-xl shadow-md p-6 hover:shadow-xl transition-all duration-200 cursor-pointer"
                      onClick={() => setActiveModule(module.id)}
                    >
                      <div className="flex items-start mb-4">
                        <div className="w-14 h-14 mr-4 rounded-xl bg-cyan-50 text-cyan-700 flex items-center justify-center flex-shrink-0">
                          <ModuleIcon size={30} strokeWidth={1.9} />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-gray-800 mb-1 flex items-center gap-2">
                            {module.name}
                            {module.estado === 'en_proceso' && (
                              <span className="text-[10px] px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full font-semibold">
                                En Proceso
                              </span>
                            )}
                          </h3>
                          <p className="text-sm text-gray-600">{module.description}</p>
                        </div>
                      </div>
                      {module.features && (
                        <ul className="space-y-2">
                          {module.features.map((feature, idx) => (
                            <li key={idx} className="text-sm text-gray-700 flex items-center">
                              <ChevronRight className="text-cyan-500 mr-2 flex-shrink-0" size={16} />
                              {feature}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )
                })}
              </div>
            </>
          )}

          {activeModule !== 'inicio' && (
            activeViews[activeModule] || <ModuloEnProceso module={activeModuleInfo} />
          )}
        </div>
      </main>
    </div>
  )
}

export default Dashboard