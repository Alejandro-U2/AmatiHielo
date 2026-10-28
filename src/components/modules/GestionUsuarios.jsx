import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle,
  CheckCircle2,
  Clock3,
  Eye,
  FileDown,
  Globe,
  KeyRound,
  Lock,
  Mail,
  MapPin,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Shield,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserPlus,
  UserRound,
  Users,
  X,
} from 'lucide-react'
import ReporteModal from '../../components/ReporteModal'
import SuccessModal from '../../components/SuccessModal'
import ModuleHeader from '../ModuleHeader'
import Pagination from '../Pagination'
import {
  createCompleteUser,
  deleteUserProfile,
  listDepartamentos,
  listEstadosUsuario,
  listMunicipios,
  listRoles,
  listUsers,
  updateUserProfile,
} from '../../services/usersService'
import { generarReporteModulo } from '../../utils/moduloExport'
import { toast } from 'sonner'

const NAME_REGEX = /^[A-Za-zÁÉÍÓÚáéíóúÑñÜü\s]+$/
const MIN_PASSWORD_LENGTH = 6

const fallbackRoles = [
  { id: null, nombre: 'Superusuario' },
  { id: null, nombre: 'Administrador' },
  { id: null, nombre: 'Operario' },
]

const fallbackEstados = [
  { id: null, nombre: 'Activo' },
  { id: null, nombre: 'Inactivo' },
]

const initialFormData = {
  primerNombre: '',
  segundoNombre: '',
  primerApellido: '',
  segundoApellido: '',
  usuario: '',
  email: '',
  password: '',
  rol: 'Operario',
  estado: 'Activo',
  departamentoId: '',
  municipioId: '',
}

function splitNombre(nombre = '') {
  const words = nombre.trim().split(/\s+/).filter(Boolean)

  return {
    primerNombre: words[0] || '',
    segundoNombre: words.length >= 3 ? words[1] : '',
    primerApellido: words.length >= 2 ? words[words.length >= 3 ? 2 : 1] : '',
    segundoApellido: words.length === 4 ? words[3] : '',
  }
}

function GestionUsuarios({ currentUserId }) {
  const [searchTerm, setSearchTerm] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [modalType, setModalType] = useState('') // 'add', 'edit', 'delete'
  const [selectedUser, setSelectedUser] = useState(null)
  const [filterRole, setFilterRole] = useState('todos')
  const [usuarios, setUsuarios] = useState([])
  const [roles, setRoles] = useState(fallbackRoles)
  const [estados, setEstados] = useState(fallbackEstados)
  const [departamentos, setDepartamentos] = useState([])
  const [municipios, setMunicipios] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [formData, setFormData] = useState(initialFormData)
  const [isSaving, setIsSaving] = useState(false)
  const [modalError, setModalError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [successMessage, setSuccessMessage] = useState('')
  const [reporteOpen, setReporteOpen] = useState(false)
  const [generandoReporte, setGenerandoReporte] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const fetchUsers = async () => {
    setIsLoading(true)
    setLoadError('')

    try {
      const data = await listUsers()
      setUsuarios(data)
    } catch (error) {
      setLoadError(error.message || 'No fue posible cargar los usuarios.')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchRoles = async () => {
    try {
      const data = await listRoles()
      setRoles(data?.length ? data : fallbackRoles)
    } catch {
      setRoles(fallbackRoles)
    }
  }

  const fetchEstados = async () => {
    try {
      const data = await listEstadosUsuario()
      setEstados(data?.length ? data : fallbackEstados)
    } catch {
      setEstados(fallbackEstados)
    }
  }

  const fetchDepartamentos = async () => {
    try {
      const data = await listDepartamentos()
      setDepartamentos(data || [])
    } catch {
      setDepartamentos([])
    }
  }

  const fetchMunicipios = async (departamentoId) => {
    if (!departamentoId) {
      setMunicipios([])
      return
    }

    try {
      const data = await listMunicipios(departamentoId)
      setMunicipios(data || [])
    } catch {
      setMunicipios([])
    }
  }

  useEffect(() => {
    fetchUsers()
    fetchRoles()
    fetchEstados()
    fetchDepartamentos()
  }, [])

  const filteredUsers = useMemo(() => {
    const normalizedTerm = searchTerm.trim().toLowerCase()

    return usuarios.filter((user) => {
      const matchesRole = filterRole === 'todos' || user.rol === filterRole
      const matchesSearch =
        normalizedTerm.length === 0 ||
        user.nombre.toLowerCase().includes(normalizedTerm) ||
        user.usuario.toLowerCase().includes(normalizedTerm) ||
        user.email.toLowerCase().includes(normalizedTerm)

      return matchesRole && matchesSearch
    })
  }, [usuarios, filterRole, searchTerm])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, filterRole])

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize))

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [totalPages, currentPage])

  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredUsers.slice(start, start + pageSize)
  }, [filteredUsers, currentPage, pageSize])

  const estadosReporte = useMemo(() => [
    { value: '', label: 'Todos los estados', count: usuarios.length },
    ...estados.map((estado) => ({
      value: estado.nombre,
      label: estado.nombre,
      count: usuarios.filter((user) => user.estado === estado.nombre).length,
    })),
  ], [usuarios, estados])

  const handleGenerarReporteUsuarios = async (estado = '') => {
    try {
      setGenerandoReporte(true)
      const rows = estado ? usuarios.filter((user) => user.estado === estado) : usuarios
      await generarReporteModulo({
        fileName: 'reporte_usuarios.pdf',
        title: 'REPORTE DE USUARIOS DEL SISTEMA',
        columns: [
          { key: 'nombre', label: 'NOMBRE', width: 42, align: 'left' },
          { key: 'usuario', label: 'USUARIO', width: 32, align: 'left' },
          { key: 'email', label: 'CORREO', width: 48, align: 'left' },
          { key: 'rol', label: 'ROL', width: 30, align: 'center' },
          { key: 'estado', label: 'ESTADO', width: 25, align: 'center' },
          { key: 'ultimoAcceso', label: 'ÚLTIMO ACCESO', width: 36, align: 'center' },
        ],
        rows: rows.map((user) => ({
          nombre: user.nombre || '-',
          usuario: user.usuario || '-',
          email: user.email || '-',
          rol: user.rol || '-',
          estado: user.estado || '-',
          ultimoAcceso: user.ultimoAcceso || '-',
        })),
        totalLabel: 'TOTAL DE USUARIOS',
        totalValue: rows.length,
        filterLabel: estado || 'Todos los estados',
        note: 'Listado de usuarios, roles, estado de acceso y último ingreso al sistema.',
      })
      toast.success('Reporte de usuarios generado correctamente.')
      setReporteOpen(false)
    } catch (error) {
      toast.error(error.message || 'No fue posible generar el reporte.')
    } finally {
      setGenerandoReporte(false)
    }
  }

  const handleOpenModal = (type, user = null) => {
    setModalType(type)
    setSelectedUser(user)
    setModalError('')

    if ((type === 'edit' || type === 'view') && user) {
      setFormData({
        ...(user.primerNombre || user.primerApellido
          ? {
              primerNombre: user.primerNombre || '',
              segundoNombre: user.segundoNombre || '',
              primerApellido: user.primerApellido || '',
              segundoApellido: user.segundoApellido || '',
            }
          : splitNombre(user.nombre)),
        usuario: user.usuario,
        email: user.email,
        password: '',
        rol: user.rol,
        estado: user.estado,
        departamentoId: user.departamentoId || '',
        municipioId: user.municipioId || '',
      })

      if (user.departamentoId) {
        fetchMunicipios(user.departamentoId)
      }
    } else {
      setFormData(initialFormData)
    }

    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setSelectedUser(null)
    setModalType('')
    setIsSaving(false)
    setModalError('')
    setFormData(initialFormData)
  }

  const handleFormField = (field, value) => {
    let cleanVal = value
    // Restricción: nombres y apellidos no permiten números
    if (['primerNombre', 'segundoNombre', 'primerApellido', 'segundoApellido'].includes(field)) {
      cleanVal = value.replace(/[0-9]/g, '')
    }

    setFormData((prev) => ({
      ...prev,
      [field]: cleanVal,
    }))

    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const next = { ...prev }
        delete next[field]
        return next
      })
    }

    if (field === 'departamentoId') {
      setFormData((prev) => ({
        ...prev,
        departamentoId: value,
        municipioId: '',
      }))
      setMunicipios([])
      fetchMunicipios(value)
    }
  }

  const handleSubmitUser = async (event) => {
    event.preventDefault()

    const errors = {}

    // Primer nombre y segundo nombre
    if (!formData.primerNombre.trim()) {
      errors.primerNombre = 'El primer nombre es obligatorio.'
    } else if (/\d/.test(formData.primerNombre)) {
      errors.primerNombre = 'No se permiten números en el nombre.'
    } else if (!NAME_REGEX.test(formData.primerNombre.trim())) {
      errors.primerNombre = 'Solo se permiten letras, espacios y acentos.'
    }

    if (formData.segundoNombre.trim()) {
      if (/\d/.test(formData.segundoNombre)) {
        errors.segundoNombre = 'No se permiten números en el nombre.'
      } else if (!NAME_REGEX.test(formData.segundoNombre.trim())) {
        errors.segundoNombre = 'Solo se permiten letras, espacios y acentos.'
      }
    }

    // Primer apellido y segundo apellido
    if (!formData.primerApellido.trim()) {
      errors.primerApellido = 'El primer apellido es obligatorio.'
    } else if (/\d/.test(formData.primerApellido)) {
      errors.primerApellido = 'No se permiten números en el apellido.'
    } else if (!NAME_REGEX.test(formData.primerApellido.trim())) {
      errors.primerApellido = 'Solo se permiten letras, espacios y acentos.'
    }

    if (formData.segundoApellido.trim()) {
      if (/\d/.test(formData.segundoApellido)) {
        errors.segundoApellido = 'No se permiten números en el apellido.'
      } else if (!NAME_REGEX.test(formData.segundoApellido.trim())) {
        errors.segundoApellido = 'Solo se permiten letras, espacios y acentos.'
      }
    }

    // Nombre de usuario
    if (!formData.usuario.trim()) {
      errors.usuario = 'El nombre de usuario es obligatorio.'
    }

    // Email
    if (!formData.email.trim()) {
      errors.email = 'El email es obligatorio.'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      errors.email = 'El email no tiene un formato válido.'
    }

    // Contraseña
    if (modalType === 'add') {
      if (!formData.password) {
        errors.password = 'La contraseña es obligatoria.'
      } else if (formData.password.length < MIN_PASSWORD_LENGTH) {
        errors.password = `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`
      }
    } else if (modalType === 'edit' && formData.password && formData.password.length < MIN_PASSWORD_LENGTH) {
      errors.password = `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`
    }

    // Departamento y Municipio
    if (!formData.departamentoId) {
      errors.departamentoId = 'El departamento es obligatorio.'
    }

    if (!formData.municipioId) {
      errors.municipioId = 'El municipio es obligatorio.'
    }

    // Restricción de auto-desactivación
    if (modalType === 'edit' && selectedUser?.id === currentUserId && formData.estado === 'Inactivo') {
      errors.estado = 'No puedes desactivar tu propio usuario.'
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      setModalError('Faltan campos por completar o contienen errores. Por favor revisa los campos en rojo.')
      return
    }

    setFieldErrors({})
    setModalError('')
    setIsSaving(true)

    const namePayload = {
      primerNombre: formData.primerNombre,
      segundoNombre: formData.segundoNombre,
      primerApellido: formData.primerApellido,
      segundoApellido: formData.segundoApellido,
    }

    try {
      if (modalType === 'add') {
        await createCompleteUser({
          ...namePayload,
          usuario: formData.usuario,
          email: formData.email,
          password: formData.password,
          rol: formData.rol,
          estado: formData.estado,
          departamentoId: formData.departamentoId,
          municipioId: formData.municipioId,
        })
      }

      if (modalType === 'edit' && selectedUser?.id) {
        await updateUserProfile(selectedUser.id, {
          ...namePayload,
          usuario: formData.usuario,
          email: formData.email,
          password: formData.password,
          rol: formData.rol,
          estado: formData.estado,
          departamentoId: formData.departamentoId,
          municipioId: formData.municipioId,
        })
      }

      await fetchUsers()
      const successMessage = modalType === 'add'
        ? 'Usuario creado correctamente.'
        : 'Usuario actualizado correctamente.'
      handleCloseModal()
      setSuccessMessage(successMessage)
    } catch (error) {
      setModalError(error.message || 'No fue posible guardar el usuario.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteUser = async () => {
    if (!selectedUser?.id) {
      return
    }

    if (selectedUser.id === currentUserId) {
      setModalError('No puedes desactivar tu propio usuario.')
      return
    }

    setModalError('')
    setIsSaving(true)

    try {
      await deleteUserProfile(selectedUser.id)
      await fetchUsers()
      handleCloseModal()
      setSuccessMessage('Usuario desactivado correctamente.')
    } catch (error) {
      setModalError(error.message || 'No fue posible desactivar el usuario.')
      setIsSaving(false)
    }
  }

  const isEditingSelf = modalType === 'edit' && selectedUser?.id === currentUserId
  const nameFieldsConfig = [
    { key: 'primerNombre', label: 'Primer nombre', placeholder: 'Ej: Juan', required: true },
    { key: 'segundoNombre', label: 'Segundo nombre', placeholder: 'Ej: Antonio', required: false },
    { key: 'primerApellido', label: 'Primer apellido', placeholder: 'Ej: Pérez', required: true },
    { key: 'segundoApellido', label: 'Segundo apellido', placeholder: 'Ej: López', required: false },
  ]

  const getInputClass = (fieldKey) => {
    const hasError = Boolean(fieldErrors[fieldKey])
    if (hasError) {
      return 'w-full px-3.5 py-2.5 text-sm border-2 border-red-500 bg-red-50/50 dark:bg-red-950/30 rounded-xl text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-red-500 disabled:bg-gray-100 dark:disabled:bg-slate-800 disabled:cursor-not-allowed transition-colors'
    }
    return 'w-full px-3.5 py-2.5 text-sm border-2 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 disabled:bg-gray-100 dark:disabled:bg-slate-800 disabled:cursor-not-allowed transition-colors'
  }

  return (
    <div>
      {/* Header con acciones */}
      <ModuleHeader title="Gestion de Usuarios" description="Administra los usuarios y sus permisos en el sistema" eyebrow="Seguridad y acceso" icon={UserRound}>
          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setReporteOpen(true)}
              className="flex-1 sm:flex-initial bg-indigo-600 text-white px-3 sm:px-5 py-2.5 sm:py-3 rounded-lg hover:bg-indigo-700 transition-colors shadow-md font-medium text-xs sm:text-sm flex items-center justify-center gap-1.5"
            >
              <FileDown size={17} aria-hidden="true" />
              <span>Reporte</span>
            </button>
            <button
              onClick={() => handleOpenModal('add')}
              className="flex-1 sm:flex-initial bg-gradient-to-r from-cyan-500 to-blue-600 text-white px-3 sm:px-5 py-2.5 sm:py-3 rounded-lg hover:from-cyan-600 hover:to-blue-700 transition-all duration-200 shadow-md hover:shadow-lg font-medium text-xs sm:text-sm flex items-center justify-center space-x-1.5"
            >
              <Plus size={17} aria-hidden="true" />
              <span>Nuevo Usuario</span>
            </button>
            <button
              type="button"
              onClick={fetchUsers}
              className="flex-1 sm:flex-initial bg-gray-300 text-gray-700 px-3 sm:px-5 py-2.5 sm:py-3 rounded-lg hover:bg-gray-400 transition-all duration-200 shadow-md font-medium text-xs sm:text-sm flex items-center justify-center space-x-1.5"
            >
              <RefreshCw size={17} aria-hidden="true" />
              <span>Recargar</span>
            </button>
          </div>
      </ModuleHeader>

      {/* Estadísticas rápidas */}
      <div className="dashboard-kpis grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-5 mb-6">
        {[
          { label: 'Total Usuarios', value: String(usuarios.length), change: 'Registrados', tone: 'blue', icon: Users, chart: 'dashboard-chart-blue' },
          { label: 'Usuarios Activos', value: String(usuarios.filter((u) => u.estado === 'Activo').length), change: 'En operación', tone: 'green', icon: UserCheck, chart: 'dashboard-chart-green' },
          { label: 'Administradores', value: String(usuarios.filter((u) => u.rol === 'Administrador' || u.rol === 'Superusuario').length), change: 'Acceso total', tone: 'purple', icon: ShieldCheck, chart: 'dashboard-chart-purple' },
          { label: 'Operarios', value: String(usuarios.filter((u) => u.rol === 'Operario').length), change: 'Acceso operativo', tone: 'orange', icon: UserRound, chart: 'dashboard-chart-orange' },
        ].map((metric) => {
          const MetricIcon = metric.icon

          return (
            <div key={metric.label} className={`dashboard-kpi dashboard-tone-${metric.tone}`}>
              <div className="dashboard-kpi-icon"><MetricIcon size={25} strokeWidth={2.2} /></div>
              <div className="min-w-0">
                <p className="dashboard-kpi-label">{metric.label}</p>
                <p className="dashboard-kpi-value">{metric.value}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="dashboard-kpi-change">{metric.change}</span>
                </div>
              </div>
              <div className={`dashboard-sparkline ${metric.chart}`} aria-hidden="true" />
            </div>
          )
        })}
      </div>

      {/* Filtros y búsqueda */}
      <div className="bg-white rounded-xl shadow-md p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Búsqueda */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">Buscar usuario</label>
            <div className="relative">
              <input
                type="text"
                placeholder="Buscar por nombre, usuario o email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 pl-10 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent"
              />
              <Search size={18} aria-hidden="true" className="absolute left-3 top-3 text-gray-400" />
            </div>
          </div>

          {/* Filtro por rol */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Filtrar por rol</label>
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent"
            >
              <option value="todos">Todos los roles</option>
              {roles.map((role) => (
                <option key={role.id || role.nombre} value={role.nombre}>{role.nombre}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {loadError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 text-red-700 text-sm">
          {loadError}
        </div>
      )}

      {/* Tabla de usuarios */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="overflow-x-auto touch-scroll">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Usuario</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Rol</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Email</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Estado</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Último Acceso</th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {isLoading && (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-gray-500">
                    Cargando usuarios...
                  </td>
                </tr>
              )}

              {!isLoading && filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-gray-500">
                    No hay usuarios para mostrar con los filtros actuales.
                  </td>
                </tr>
              )}

              {!isLoading && paginatedUsers.map((usuario) => (
                <tr key={usuario.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full flex items-center justify-center text-white font-bold mr-3">
                        {usuario.nombre.charAt(0)}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800">{usuario.nombre}</p>
                        <p className="text-sm text-gray-500">@{usuario.usuario}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${
                      usuario.rol === 'Superusuario'
                        ? 'bg-indigo-100 text-indigo-700'
                        : usuario.rol === 'Administrador'
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-blue-100 text-blue-700'
                    }`}>
                      {usuario.rol}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">{usuario.email}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${
                      usuario.estado === 'Activo' 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {usuario.estado}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{usuario.ultimoAcceso}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center space-x-2">
                      <button
                        type="button"
                        onClick={() => handleOpenModal('view', usuario)}
                        className="bg-gray-100 text-gray-600 p-2 rounded-lg hover:bg-gray-200 transition-colors"
                        title="Ver"
                        aria-label={`Ver usuario ${usuario.usuario}`}
                      >
                        <Eye size={16} aria-hidden="true" />
                      </button>
                      <button
                        onClick={() => handleOpenModal('edit', usuario)}
                        className="bg-blue-100 text-blue-600 p-2 rounded-lg hover:bg-blue-200 transition-colors"
                        title="Editar"
                      >
                        <Pencil size={16} aria-hidden="true" />
                      </button>
                      <button
                        onClick={() => handleOpenModal('delete', usuario)}
                        disabled={usuario.id === currentUserId}
                        title={usuario.id === currentUserId ? 'No puedes desactivar tu propio usuario' : 'Desactivar'}
                        className="bg-red-100 text-red-600 p-2 rounded-lg hover:bg-red-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <Trash2 size={16} aria-hidden="true" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t border-gray-100">
          <Pagination
            page={currentPage}
            totalPages={totalPages}
            onChange={setCurrentPage}
            pageSize={pageSize}
            onPageSizeChange={setPageSize}
            totalItems={filteredUsers.length}
            pageSizeOptions={[5, 10, 25, 50]}
          />
        </div>
      </div>

      {/* Modal para agregar/editar/desactivar usuario */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col border border-gray-100 dark:border-slate-800 transition-all overflow-hidden">
            {/* Header del modal */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-10">
              <div className="flex items-center gap-3.5">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm ${
                  modalType === 'add' ? 'bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-cyan-500/20' :
                  modalType === 'edit' ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-blue-500/20' :
                  modalType === 'view' ? 'bg-gradient-to-br from-slate-600 to-slate-800 text-white shadow-slate-500/20' :
                  'bg-gradient-to-br from-red-500 to-rose-600 text-white shadow-red-500/20'
                }`}>
                  {modalType === 'add' && <UserPlus size={22} />}
                  {modalType === 'edit' && <Pencil size={22} />}
                  {modalType === 'view' && <Eye size={22} />}
                  {modalType === 'delete' && <AlertTriangle size={22} />}
                </div>
                <div>
                  <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 leading-tight">
                    {modalType === 'add' && 'Nuevo Usuario'}
                    {modalType === 'edit' && 'Editar Usuario'}
                    {modalType === 'view' && 'Detalle del Usuario'}
                    {modalType === 'delete' && 'Desactivar Usuario'}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {modalType === 'add' && 'Crea credenciales de acceso y asigna rol en el sistema'}
                    {modalType === 'edit' && 'Modifica datos de perfil, permisos y estado de la cuenta'}
                    {modalType === 'view' && 'Ficha técnica completa y trazabilidad de accesos'}
                    {modalType === 'delete' && 'Inhabilitación de credenciales para inicio de sesión'}
                  </p>
                </div>
              </div>
              <button
                onClick={handleCloseModal}
                className="rounded-xl p-2 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
                title="Cerrar modal"
                aria-label="Cerrar modal"
              >
                <X size={20} aria-hidden="true" />
              </button>
            </div>

            {/* Contenido del modal */}
            <div className="p-6 overflow-y-auto max-h-[calc(92vh-85px)] space-y-5">
              {(modalType === 'add' || modalType === 'edit') && (
                <form className="space-y-5" onSubmit={handleSubmitUser} noValidate>
                  {modalError && (
                    <div className="rounded-xl border border-red-200 bg-red-50/90 dark:bg-red-950/40 dark:border-red-900/60 p-4 text-sm text-red-700 dark:text-red-300 flex items-center gap-3">
                      <AlertTriangle size={18} className="flex-shrink-0 text-red-600" />
                      <span>{modalError}</span>
                    </div>
                  )}

                  {/* Tarjeta 1: Datos Personales (Nombre Completo) */}
                  <div className="rounded-xl border border-gray-200 dark:border-slate-700/80 bg-white dark:bg-slate-800/40 p-4 shadow-sm space-y-3">
                    <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-700/60 pb-2.5">
                      <span className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                        <UserRound size={15} className="text-cyan-600" />
                        Datos Personales
                      </span>
                      <span className="text-[11px] text-cyan-700 dark:text-cyan-400 font-semibold bg-cyan-50 dark:bg-cyan-950/60 px-2.5 py-0.5 rounded-full border border-cyan-200 dark:border-cyan-800/60">
                        Solo letras (sin números)
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      {nameFieldsConfig.map((field) => (
                        <div key={field.key}>
                          <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                            {field.label} {field.required && <span className="text-red-500">*</span>}
                          </label>
                          <input
                            type="text"
                            value={formData[field.key]}
                            onKeyDown={(e) => {
                              // Bloquear números al presionar teclas (0-9 teclado normal o numpad)
                              if (!e.ctrlKey && !e.metaKey && !e.altKey && e.key.length === 1 && /[0-9]/.test(e.key)) {
                                e.preventDefault()
                              }
                            }}
                            onChange={(e) => {
                              // Sanitizar en caso de pegar texto con números
                              const sanitized = e.target.value.replace(/[0-9]/g, '')
                              handleFormField(field.key, sanitized)
                            }}
                            placeholder={field.placeholder}
                            disabled={modalType === 'view'}
                            aria-invalid={Boolean(fieldErrors[field.key])}
                            className={getInputClass(field.key)}
                          />
                          {fieldErrors[field.key] && (
                            <p className="mt-1 text-xs text-red-600 font-medium">
                              {fieldErrors[field.key]}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Tarjeta 2: Credenciales de Acceso */}
                  <div className="rounded-xl border border-gray-200 dark:border-slate-700/80 bg-white dark:bg-slate-800/40 p-4 shadow-sm space-y-3.5">
                    <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-700/60 pb-2.5">
                      <span className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                        <KeyRound size={15} className="text-cyan-600" />
                        Credenciales de Acceso
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                          Nombre de usuario <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm select-none">
                            @
                          </span>
                          <input
                            type="text"
                            value={formData.usuario}
                            onChange={(e) => handleFormField('usuario', e.target.value)}
                            placeholder="jperez"
                            disabled={modalType === 'view'}
                            aria-invalid={Boolean(fieldErrors.usuario)}
                            className={`${getInputClass('usuario')} pl-8`}
                          />
                        </div>
                        {fieldErrors.usuario && (
                          <p className="mt-1 text-xs text-red-600 font-medium">{fieldErrors.usuario}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                          Correo electrónico <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                            <Mail size={16} />
                          </span>
                          <input
                            type="email"
                            value={formData.email}
                            onChange={(e) => handleFormField('email', e.target.value)}
                            placeholder="usuario@amati.com"
                            disabled={modalType === 'view'}
                            aria-invalid={Boolean(fieldErrors.email)}
                            className={`${getInputClass('email')} pl-10`}
                          />
                        </div>
                        {fieldErrors.email && (
                          <p className="mt-1 text-xs text-red-600 font-medium">{fieldErrors.email}</p>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                        {modalType === 'add' ? (
                          <>Contraseña de Acceso <span className="text-red-500">*</span></>
                        ) : (
                          'Nueva Contraseña (Opcional)'
                        )}
                      </label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                          <Lock size={16} />
                        </span>
                        <input
                          type="password"
                          value={formData.password}
                          onChange={(e) => handleFormField('password', e.target.value)}
                          placeholder={modalType === 'add' ? 'Mínimo 6 caracteres' : 'Dejar en blanco para conservar la actual'}
                          disabled={modalType === 'view'}
                          aria-invalid={Boolean(fieldErrors.password)}
                          className={`${getInputClass('password')} pl-10`}
                        />
                      </div>
                      {fieldErrors.password && (
                        <p className="mt-1 text-xs text-red-600 font-medium">{fieldErrors.password}</p>
                      )}
                    </div>
                  </div>

                  {/* Tarjeta 3: Rol y Estado en el Sistema */}
                  <div className="rounded-xl border border-gray-200 dark:border-slate-700/80 bg-white dark:bg-slate-800/40 p-4 shadow-sm space-y-3.5">
                    <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-700/60 pb-2.5">
                      <span className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                        <ShieldCheck size={15} className="text-cyan-600" />
                        Rol y Estado de la Cuenta
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                          Rol en el Sistema <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={formData.rol}
                          onChange={(e) => handleFormField('rol', e.target.value)}
                          disabled={modalType === 'view'}
                          className={getInputClass('rol')}
                        >
                          {roles.map((role) => (
                            <option key={role.id || role.nombre} value={role.nombre}>
                              {role.nombre}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                          Estado del Usuario <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={formData.estado}
                          onChange={(e) => handleFormField('estado', e.target.value)}
                          disabled={modalType === 'view'}
                          className={getInputClass('estado')}
                        >
                          {estados.map((estado) => (
                            <option
                              key={estado.id || estado.nombre}
                              value={estado.nombre}
                              disabled={isEditingSelf && estado.nombre === 'Inactivo'}
                            >
                              {estado.nombre}
                            </option>
                          ))}
                        </select>
                        {isEditingSelf && (
                          <p className="mt-1 text-xs text-amber-600">No puedes desactivar tu propia cuenta.</p>
                        )}
                        {fieldErrors.estado && (
                          <p className="mt-1 text-xs text-red-600 font-medium">{fieldErrors.estado}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Tarjeta 4: Ubicación Geográfica */}
                  <div className="rounded-xl border border-gray-200 dark:border-slate-700/80 bg-white dark:bg-slate-800/40 p-4 shadow-sm space-y-3.5">
                    <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-700/60 pb-2.5">
                      <span className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                        <MapPin size={15} className="text-cyan-600" />
                        Ubicación Geográfica
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                          País <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                            <Globe size={16} />
                          </span>
                          <select
                            value="Guatemala"
                            disabled
                            className="w-full pl-10 pr-3.5 py-2.5 text-sm border-2 border-gray-200 dark:border-slate-700 rounded-xl bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-400 font-semibold cursor-not-allowed focus:outline-none"
                          >
                            <option value="Guatemala">Guatemala</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                          Departamento <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={formData.departamentoId}
                          onChange={(e) => handleFormField('departamentoId', e.target.value)}
                          disabled={modalType === 'view'}
                          aria-invalid={Boolean(fieldErrors.departamentoId)}
                          className={getInputClass('departamentoId')}
                        >
                          <option value="">Selecciona departamento...</option>
                          {departamentos.map((departamento) => (
                            <option key={departamento.id} value={departamento.id}>
                              {departamento.nombre}
                            </option>
                          ))}
                        </select>
                        {fieldErrors.departamentoId && (
                          <p className="mt-1 text-xs text-red-600 font-medium">{fieldErrors.departamentoId}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                          Municipio <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={formData.municipioId}
                          onChange={(e) => handleFormField('municipioId', e.target.value)}
                          disabled={modalType === 'view' || !formData.departamentoId}
                          aria-invalid={Boolean(fieldErrors.municipioId)}
                          className={getInputClass('municipioId')}
                        >
                          <option value="">
                            {formData.departamentoId ? 'Selecciona municipio...' : 'Primero el departamento'}
                          </option>
                          {municipios.map((municipio) => (
                            <option key={municipio.id} value={municipio.id}>
                              {municipio.nombre}
                            </option>
                          ))}
                        </select>
                        {fieldErrors.municipioId && (
                          <p className="mt-1 text-xs text-red-600 font-medium">{fieldErrors.municipioId}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Botones de Acción */}
                  <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4 border-t border-gray-100 dark:border-slate-800">
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={handleCloseModal}
                      className="px-5 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-200 font-semibold text-sm hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-semibold text-sm transition-all shadow-md hover:shadow-lg disabled:opacity-50 inline-flex items-center justify-center gap-2"
                    >
                      {isSaving ? (
                        <>
                          <RefreshCw size={16} className="animate-spin" />
                          <span>Guardando...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle size={16} />
                          <span>{modalType === 'add' ? 'Crear Usuario' : 'Guardar Cambios'}</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}

              {modalType === 'view' && (
                <div className="space-y-5">
                  {/* Avatar y encabezado de perfil */}
                  <div className="flex items-center gap-4 rounded-xl bg-gradient-to-r from-cyan-50/80 via-blue-50/50 to-slate-50/70 dark:from-cyan-950/30 dark:via-blue-950/20 dark:to-slate-900/40 border border-cyan-100 dark:border-cyan-900/50 p-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white flex items-center justify-center text-2xl font-black shadow-md flex-shrink-0">
                      {(selectedUser?.nombre || 'U').charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-lg font-bold text-gray-900 dark:text-gray-100 truncate">
                        {selectedUser?.nombre || 'Sin nombre registrado'}
                      </h4>
                      <p className="text-xs text-cyan-700 dark:text-cyan-400 font-semibold mt-0.5">
                        @{selectedUser?.usuario || 'sin-usuario'}
                      </p>
                    </div>
                  </div>

                  {/* Badges de Rol y Estado */}
                  <div className="flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-50 dark:bg-cyan-950/60 border border-cyan-200 dark:border-cyan-800/60 px-3 py-1 text-xs font-bold text-cyan-800 dark:text-cyan-300">
                      <ShieldCheck size={14} />
                      {selectedUser?.rol || 'Sin rol'}
                    </span>
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold border ${
                      selectedUser?.estado === 'Activo'
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300'
                        : 'bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-900/60 text-rose-800 dark:text-rose-300'
                    }`}>
                      <span className={`w-2 h-2 rounded-full ${selectedUser?.estado === 'Activo' ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                      {selectedUser?.estado || 'Sin estado'}
                    </span>
                  </div>

                  {/* Cuadrantes de Información */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="rounded-xl border border-gray-200 dark:border-slate-700/80 bg-white dark:bg-slate-800/40 p-4 shadow-sm">
                      <div className="flex items-center gap-2 text-gray-400 dark:text-gray-500">
                        <Mail size={16} className="text-cyan-600" />
                        <span className="text-xs font-bold uppercase tracking-wider">Correo Electrónico</span>
                      </div>
                      <p className="mt-2 text-sm font-semibold text-gray-800 dark:text-gray-200 break-words">
                        {selectedUser?.email || 'Sin registro'}
                      </p>
                    </div>

                    <div className="rounded-xl border border-gray-200 dark:border-slate-700/80 bg-white dark:bg-slate-800/40 p-4 shadow-sm">
                      <div className="flex items-center gap-2 text-gray-400 dark:text-gray-500">
                        <MapPin size={16} className="text-cyan-600" />
                        <span className="text-xs font-bold uppercase tracking-wider">Ubicación Geográfica</span>
                      </div>
                      <p className="mt-2 text-sm font-semibold text-gray-800 dark:text-gray-200">
                        {selectedUser?.municipio || 'Sin municipio'}, {selectedUser?.departamento || 'Sin departamento'}
                      </p>
                      <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">Guatemala</p>
                    </div>

                    <div className="sm:col-span-2 rounded-xl border border-gray-200 dark:border-slate-700/80 bg-white dark:bg-slate-800/40 p-4 shadow-sm">
                      <div className="flex items-center gap-2 text-gray-400 dark:text-gray-500">
                        <Clock3 size={16} className="text-cyan-600" />
                        <span className="text-xs font-bold uppercase tracking-wider">Última Actividad / Acceso</span>
                      </div>
                      <p className="mt-2 text-sm font-semibold text-gray-800 dark:text-gray-200">
                        {selectedUser?.ultimoAcceso || 'Sin registro de actividad reciente'}
                      </p>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleCloseModal}
                      className="w-full rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 py-3 font-semibold text-gray-700 dark:text-gray-200 transition-colors shadow-sm"
                    >
                      Cerrar Ficha
                    </button>
                  </div>
                </div>
              )}

              {modalType === 'delete' && (
                <div className="space-y-5">
                  {modalError && (
                    <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 flex items-center gap-3">
                      <AlertTriangle size={18} className="flex-shrink-0 text-red-600" />
                      <span>{modalError}</span>
                    </div>
                  )}

                  {/* Banner de confirmación destructiva */}
                  <div className="p-4 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/70 dark:bg-rose-950/30 text-rose-900 dark:text-rose-200 flex items-start gap-3.5">
                    <AlertTriangle size={22} className="text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-bold">¿Desactivar acceso de este colaborador?</h4>
                      <p className="text-xs text-rose-800/80 dark:text-rose-300/80 mt-1">
                        El usuario conservará todo su historial y trazabilidad en el sistema, pero ya no podrá iniciar sesión.
                      </p>
                    </div>
                  </div>

                  {/* Ficha rápida del usuario */}
                  <div className="rounded-xl border border-gray-200 dark:border-slate-700/80 bg-white dark:bg-slate-800/50 p-4 shadow-sm flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-xl bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-200 flex items-center justify-center font-bold text-lg flex-shrink-0">
                      {(selectedUser?.nombre || 'U').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 dark:text-gray-100">{selectedUser?.nombre}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">@{selectedUser?.usuario} · {selectedUser?.email}</p>
                    </div>
                  </div>

                  <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-3 border-t border-gray-100 dark:border-slate-800">
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={handleCloseModal}
                      className="px-5 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-200 font-semibold text-sm hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={handleDeleteUser}
                      className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 text-white font-semibold text-sm transition-all shadow-md hover:shadow-lg disabled:opacity-50 inline-flex items-center justify-center gap-2"
                    >
                      {isSaving ? (
                        <>
                          <RefreshCw size={16} className="animate-spin" />
                          <span>Desactivando...</span>
                        </>
                      ) : (
                        <>
                          <AlertTriangle size={16} />
                          <span>Confirmar Desactivación</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <SuccessModal
        isOpen={Boolean(successMessage)}
        message={successMessage}
        onClose={() => setSuccessMessage('')}
      />

      <ReporteModal
        open={reporteOpen}
        title="Reporte de usuarios"
        filterLabel="estado"
        filterOptions={estadosReporte}
        generating={generandoReporte}
        onGenerate={handleGenerarReporteUsuarios}
        onClose={() => setReporteOpen(false)}
      />
    </div>
  )
}

export default GestionUsuarios
