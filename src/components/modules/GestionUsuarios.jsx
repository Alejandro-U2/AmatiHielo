import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Eye,
  Mail,
  MapPin,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  UserRound,
  X,
} from 'lucide-react'
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
  const [successMessage, setSuccessMessage] = useState('')

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
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))

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

    const nameFields = ['primerNombre', 'segundoNombre', 'primerApellido', 'segundoApellido']
    const hasAnyName = nameFields.some((field) => formData[field].trim().length > 0)
    const invalidNameField = nameFields.find((field) => {
      const value = formData[field].trim()
      return value.length > 0 && !NAME_REGEX.test(value)
    })

    if (!hasAnyName || !formData.primerNombre.trim() || !formData.primerApellido.trim()) {
      setModalError('Primer nombre y primer apellido son obligatorios.')
      return
    }

    if (invalidNameField) {
      setModalError('Los nombres y apellidos solo pueden contener letras, espacios y acentos.')
      return
    }

    if (!formData.usuario.trim() || !formData.email.trim()) {
      setModalError('Usuario y email son obligatorios.')
      return
    }

    if (!formData.departamentoId) {
      setModalError('El departamento es obligatorio.')
      return
    }

    if (!formData.municipioId) {
      setModalError('El municipio es obligatorio.')
      return
    }

    if (modalType === 'add' && formData.password.length < MIN_PASSWORD_LENGTH) {
      setModalError(`La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`)
      return
    }

    if (modalType === 'edit' && selectedUser?.id === currentUserId && formData.estado === 'Inactivo') {
      setModalError('No puedes desactivar tu propio usuario.')
      return
    }

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
      setModalError('No puedes eliminar tu propio usuario.')
      return
    }

    setModalError('')
    setIsSaving(true)

    try {
      await deleteUserProfile(selectedUser.id)
      await fetchUsers()
      handleCloseModal()
      setSuccessMessage('Usuario eliminado correctamente.')
    } catch (error) {
      setModalError(error.message || 'No fue posible eliminar el usuario.')
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
  const invalidNameField = nameFieldsConfig.find((field) => {
    const value = formData[field.key].trim()
    return value.length > 0 && !NAME_REGEX.test(value)
  })?.key

  const formFieldFlow = [
    { key: 'primerNombre', required: true, label: 'primer nombre' },
    { key: 'segundoNombre', required: false, label: 'segundo nombre' },
    { key: 'primerApellido', required: true, label: 'primer apellido' },
    { key: 'segundoApellido', required: false, label: 'segundo apellido' },
    { key: 'usuario', required: true, label: 'el nombre de usuario' },
    { key: 'email', required: true, label: 'el email' },
    { key: 'password', required: modalType === 'add', label: 'la contraseña' },
    { key: 'rol', required: false, label: 'el rol' },
    { key: 'estado', required: false, label: 'el estado' },
    { key: 'departamentoId', required: true, label: 'el departamento' },
    { key: 'municipioId', required: true, label: 'el municipio' },
  ]

  const isFormFieldEnabled = (fieldKey) => {
    if (modalType === 'view') return false
    if (modalType === 'edit') return true
    const index = formFieldFlow.findIndex((field) => field.key === fieldKey)
    if (index <= 0) return true
    for (let i = 0; i < index; i += 1) {
      const previous = formFieldFlow[i]
      if (previous.required && formData[previous.key].trim().length === 0) {
        return false
      }
    }
    return true
  }

  const getBlockingField = (fieldKey) => {
    const index = formFieldFlow.findIndex((field) => field.key === fieldKey)
    if (index <= 0) return null
    return formFieldFlow
      .slice(0, index)
      .find((f) => f.required && formData[f.key].trim().length === 0) || null
  }

  const blockingHint = (fieldKey) => {
    const blocking = getBlockingField(fieldKey)
    if (!blocking) return null
    return `Llena ${blocking.label} antes de continuar.`
  }

  return (
    <div>
      {/* Header con acciones */}
      <div className="bg-white rounded-xl shadow-md p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h3 className="text-2xl font-bold text-gray-800 mb-1">Gestión de Usuarios</h3>
            <p className="text-sm text-gray-600">Administra los usuarios y sus permisos en el sistema</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handleOpenModal('add')}
              className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white px-6 py-3 rounded-lg hover:from-cyan-600 hover:to-blue-700 transition-all duration-200 shadow-md hover:shadow-lg font-medium flex items-center justify-center space-x-2"
            >
              <Plus size={18} aria-hidden="true" />
              <span>Nuevo Usuario</span>
            </button>
            <button
              type="button"
              onClick={fetchUsers}
              className="bg-gray-300 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-400 transition-all duration-200 shadow-md font-medium flex items-center justify-center space-x-2"
            >
              <RefreshCw size={18} aria-hidden="true" />
              <span>Recargar</span>
            </button>
          </div>
        </div>
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

      {/* Estadísticas rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-md p-5 text-white">
          <p className="text-sm opacity-90 mb-1">Total Usuarios</p>
          <p className="text-3xl font-bold">{usuarios.length}</p>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-md p-5 text-white">
          <p className="text-sm opacity-90 mb-1">Usuarios Activos</p>
          <p className="text-3xl font-bold">{usuarios.filter(u => u.estado === 'Activo').length}</p>
        </div>
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-md p-5 text-white">
          <p className="text-sm opacity-90 mb-1">Administradores</p>
          <p className="text-3xl font-bold">{usuarios.filter(u => u.rol === 'Administrador' || u.rol === 'Superusuario').length}</p>
        </div>
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-md p-5 text-white">
          <p className="text-sm opacity-90 mb-1">Operarios</p>
          <p className="text-3xl font-bold">{usuarios.filter(u => u.rol === 'Operario').length}</p>
        </div>
      </div>

      {loadError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 text-red-700 text-sm">
          {loadError}
        </div>
      )}

      {/* Tabla de usuarios */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="overflow-x-auto">
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

              {!isLoading && filteredUsers.map((usuario) => (
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
                        title={usuario.id === currentUserId ? 'No puedes eliminar tu propio usuario' : 'Eliminar'}
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
      </div>

      {/* Modal para agregar/editar/eliminar usuario */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto border border-white/70">
            <div className="p-6 sm:p-7">
              {/* Header del modal */}
              <div className="flex items-start justify-between gap-4 mb-7">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-cyan-50 text-cyan-700 flex items-center justify-center">
                    {modalType === 'view' ? <Eye size={22} aria-hidden="true" /> : <UserRound size={22} aria-hidden="true" />}
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-cyan-600">Gestión de usuarios</p>
                    <h3 className="text-xl font-bold text-gray-800">
                      {modalType === 'add' && 'Nuevo Usuario'}
                      {modalType === 'edit' && 'Editar Usuario'}
                      {modalType === 'view' && 'Detalle del Usuario'}
                      {modalType === 'delete' && 'Eliminar Usuario'}
                    </h3>
                  </div>
                </div>
                <button
                  onClick={handleCloseModal}
                  className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                  title="Cerrar"
                  aria-label="Cerrar modal"
                >
                  <X size={22} aria-hidden="true" />
                </button>
              </div>

              {/* Contenido del modal */}
              {(modalType === 'add' || modalType === 'edit') && (
                <form className="space-y-4" onSubmit={handleSubmitUser}>
                  {modalError && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                      {modalError}
                    </div>
                  )}

                  <div>
                    <p className="block text-sm font-semibold text-gray-700 mb-2">Nombre completo</p>
                    <div className="grid grid-cols-2 gap-3">
                      {nameFieldsConfig.map((field) => {
                        const enabled = isFormFieldEnabled(field.key)
                        return (
                          <div key={field.key}>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              {field.label} {field.required && <span className="text-red-500">*</span>}
                            </label>
                            <input
                              type="text"
                              value={formData[field.key]}
                              onChange={(e) => enabled && handleFormField(field.key, e.target.value)}
                              placeholder={field.placeholder}
                              disabled={!enabled}
                              aria-invalid={invalidNameField === field.key}
                              className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-400"
                            />
                            {!enabled && blockingHint(field.key) && (
                              <p className="mt-1 text-xs text-amber-600">
                                {blockingHint(field.key)}
                              </p>
                            )}
                          </div>
                        )
                      })}
                    </div>
                    {invalidNameField && (
                      <p className="mt-1 text-sm text-red-600">
                        Los nombres y apellidos solo pueden contener letras, espacios y acentos.
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Nombre de usuario</label>
                    <input
                      type="text"
                      value={formData.usuario}
                      onChange={(e) => isFormFieldEnabled('usuario') && handleFormField('usuario', e.target.value)}
                      placeholder="Ej: jperez"
                      disabled={!isFormFieldEnabled('usuario')}
                      className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent disabled:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    {!isFormFieldEnabled('usuario') && blockingHint('usuario') && (
                      <p className="mt-1 text-xs text-amber-600">{blockingHint('usuario')}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => isFormFieldEnabled('email') && handleFormField('email', e.target.value)}
                      placeholder="usuario@amati.com"
                      disabled={!isFormFieldEnabled('email')}
                      className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent disabled:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    {!isFormFieldEnabled('email') && blockingHint('email') && (
                      <p className="mt-1 text-xs text-amber-600">{blockingHint('email')}</p>
                    )}
                  </div>

                  {modalType !== 'view' && (
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        {modalType === 'add' ? 'Contraseña' : 'Contraseña nueva (opcional)'}
                      </label>
                      <input
                        type="password"
                        value={formData.password}
                        onChange={(e) => isFormFieldEnabled('password') && handleFormField('password', e.target.value)}
                        placeholder={modalType === 'add' ? 'Mínimo 6 caracteres' : 'Deja vacío para no cambiar'}
                        disabled={!isFormFieldEnabled('password')}
                        className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent disabled:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                      {!isFormFieldEnabled('password') && blockingHint('password') && (
                        <p className="mt-1 text-xs text-amber-600">{blockingHint('password')}</p>
                      )}
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Rol</label>
                    <select
                      value={formData.rol}
                      onChange={(e) => isFormFieldEnabled('rol') && handleFormField('rol', e.target.value)}
                      disabled={!isFormFieldEnabled('rol')}
                      className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent disabled:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {roles.map((role) => (
                        <option key={role.id || role.nombre} value={role.nombre}>
                          {role.nombre}
                        </option>
                      ))}
                    </select>
                    {!isFormFieldEnabled('rol') && blockingHint('rol') && (
                      <p className="mt-1 text-xs text-amber-600">{blockingHint('rol')}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Estado</label>
                    <select
                      value={formData.estado}
                      onChange={(e) => isFormFieldEnabled('estado') && handleFormField('estado', e.target.value)}
                      disabled={!isFormFieldEnabled('estado')}
                      className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent disabled:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
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
                    {!isFormFieldEnabled('estado') && blockingHint('estado') && (
                      <p className="mt-1 text-xs text-amber-600">{blockingHint('estado')}</p>
                    )}
                    {isEditingSelf && (
                      <p className="mt-1 text-sm text-amber-600">No puedes desactivar tu propio usuario.</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      País <span className="text-red-500">*</span>
                    </label>
                    <select
                      value="Guatemala"
                      disabled
                      className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg bg-gray-100 text-gray-500 cursor-not-allowed focus:outline-none"
                    >
                      <option value="Guatemala">Guatemala</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Departamento <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.departamentoId}
                      onChange={(e) => isFormFieldEnabled('departamentoId') && handleFormField('departamentoId', e.target.value)}
                      disabled={!isFormFieldEnabled('departamentoId')}
                      className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent disabled:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <option value="">Selecciona un departamento</option>
                      {departamentos.map((departamento) => (
                        <option key={departamento.id} value={departamento.id}>
                          {departamento.nombre}
                        </option>
                      ))}
                    </select>
                    {!isFormFieldEnabled('departamentoId') && blockingHint('departamentoId') && (
                      <p className="mt-1 text-xs text-amber-600">{blockingHint('departamentoId')}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Municipio <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.municipioId}
                      onChange={(e) => isFormFieldEnabled('municipioId') && handleFormField('municipioId', e.target.value)}
                      disabled={!isFormFieldEnabled('municipioId')}
                      className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                    >
                      <option value="">{formData.departamentoId ? 'Selecciona un municipio' : 'Primero selecciona el departamento'}</option>
                      {municipios.map((municipio) => (
                        <option key={municipio.id} value={municipio.id}>
                          {municipio.nombre}
                        </option>
                      ))}
                    </select>
                    {!isFormFieldEnabled('municipioId') && blockingHint('municipioId') && (
                      <p className="mt-1 text-xs text-amber-600">{blockingHint('municipioId')}</p>
                    )}
                  </div>

                  <div className="flex space-x-3 pt-4">
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={handleCloseModal}
                      className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                    >
                      Cancelar
                    </button>
                    {modalType === 'view' ? (
                      <button
                        type="button"
                        onClick={handleCloseModal}
                        className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-600 text-white py-3 rounded-lg hover:from-cyan-600 hover:to-blue-700 transition-all shadow-md font-medium"
                      >
                        Cerrar
                      </button>
                    ) : (
                      <button
                        type="submit"
                        disabled={isSaving}
                        className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-600 text-white py-3 rounded-lg hover:from-cyan-600 hover:to-blue-700 transition-all shadow-md font-medium"
                      >
                        {isSaving ? 'Guardando...' : modalType === 'add' ? 'Crear Usuario' : 'Guardar Cambios'}
                      </button>
                    )}
                  </div>
                </form>
              )}

              {modalType === 'view' && (
                <div className="space-y-4">
                  <div className="flex items-center gap-4 rounded-xl bg-gradient-to-r from-cyan-50 to-blue-50 border border-cyan-100 p-4">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 text-white flex items-center justify-center text-xl font-bold">
                      {(selectedUser?.nombre || 'U').charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-lg font-bold text-gray-800 truncate">{selectedUser?.nombre || 'Sin registro'}</p>
                      <p className="text-sm text-gray-600">@{selectedUser?.usuario || 'sin-usuario'}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700">
                      <ShieldCheck size={14} aria-hidden="true" />
                      {selectedUser?.rol || 'Sin rol'}
                    </span>
                    <span className={`inline-flex items-center rounded-full px-3 py-1.5 text-xs font-semibold ${selectedUser?.estado === 'Activo' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                      {selectedUser?.estado || 'Sin estado'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="rounded-xl border border-gray-200 bg-white p-4">
                      <div className="flex items-center gap-2 text-gray-500">
                        <Mail size={16} aria-hidden="true" />
                        <p className="text-xs font-semibold uppercase tracking-wide">Email</p>
                      </div>
                      <p className="mt-2 text-sm font-medium text-gray-800 break-words">{selectedUser?.email || 'Sin registro'}</p>
                    </div>
                    <div className="rounded-xl border border-gray-200 bg-white p-4">
                      <div className="flex items-center gap-2 text-gray-500">
                        <MapPin size={16} aria-hidden="true" />
                        <p className="text-xs font-semibold uppercase tracking-wide">Ubicación</p>
                      </div>
                      <p className="mt-2 text-sm font-medium text-gray-800">{selectedUser?.municipio || 'Sin municipio'}</p>
                      <p className="text-xs text-gray-500">{selectedUser?.departamento || 'Sin departamento'}</p>
                    </div>
                    <div className="sm:col-span-2 rounded-xl border border-gray-200 bg-white p-4">
                      <div className="flex items-center gap-2 text-gray-500">
                        <Clock3 size={16} aria-hidden="true" />
                        <p className="text-xs font-semibold uppercase tracking-wide">Último acceso</p>
                      </div>
                      <p className="mt-2 text-sm font-medium text-gray-800">{selectedUser?.ultimoAcceso || 'Sin registro'}</p>
                    </div>
                  </div>
                  <div className="pt-4">
                    <button
                      type="button"
                      onClick={handleCloseModal}
                      className="w-full bg-gray-900 text-white py-3 rounded-lg hover:bg-gray-800 transition-colors shadow-md font-semibold"
                    >
                      Cerrar
                    </button>
                  </div>
                </div>
              )}

              {modalType === 'delete' && (
                <div>
                  {modalError && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-sm text-red-700">
                      {modalError}
                    </div>
                  )}
                  <div className="bg-red-50 rounded-lg p-4 mb-6">
                    <p className="text-gray-700 mb-2">¿Estás seguro de que deseas eliminar al usuario?</p>
                    <p className="font-bold text-gray-800">{selectedUser?.nombre}</p>
                    <p className="text-sm text-gray-600">@{selectedUser?.usuario}</p>
                  </div>
                  <p className="text-sm text-red-600 mb-6 flex items-center gap-2">
                    <AlertTriangle size={16} aria-hidden="true" />
                    Esta acción no se puede deshacer.
                  </p>
                  <div className="flex space-x-3">
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={handleCloseModal}
                      className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={handleDeleteUser}
                      className="flex-1 bg-gradient-to-r from-red-500 to-red-600 text-white py-3 rounded-lg hover:from-red-600 hover:to-red-700 transition-all shadow-md font-medium"
                    >
                      {isSaving ? 'Eliminando...' : 'Eliminar Usuario'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {successMessage && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl border border-emerald-100 p-7 text-center">
            <div className="mx-auto mb-5 w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 size={36} strokeWidth={2.2} aria-hidden="true" />
            </div>
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600 mb-2">Operación completada</p>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Cambios guardados</h3>
            <p className="text-sm text-gray-600 mb-6">{successMessage}</p>
            <button
              type="button"
              onClick={() => setSuccessMessage('')}
              className="w-full rounded-lg bg-gray-900 py-3 text-sm font-semibold text-white transition-colors hover:bg-gray-800"
            >
              Aceptar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default GestionUsuarios
