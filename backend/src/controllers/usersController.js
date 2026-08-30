import { supabaseAdmin } from '../config/supabaseAdmin.js'

const PROFILE_FIELDS = `
  id,
  primer_nombre,
  segundo_nombre,
  primer_apellido,
  segundo_apellido,
  usuario,
  email,
  departamento_id,
  municipio_id,
  rol_id,
  estado_usuario_id,
  ultimo_acceso,
  created_at,
  updated_at,
  rol:rol_id(id, nombre, descripcion, activo, orden),
  estado:estado_usuario_id(id, nombre, descripcion, activo, orden),
  departamento:departamento_id(id, nombre, codigo),
  municipio:municipio_id(id, nombre, departamento_id)
`
const NAME_REGEX = /^[A-Za-zÁÉÍÓÚáéíóúÑñÜü\s]+$/
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MIN_PASSWORD_LENGTH = 6

function buildErrorResponse(res, error, fallbackMessage, statusCode = 500) {
  return res.status(statusCode).json({
    message: error?.message || fallbackMessage,
  })
}

function mapDuplicateMessage(message = '') {
  const normalized = String(message || '').toLowerCase()

  if (
    normalized.includes('already been registered') ||
    normalized.includes('already registered') ||
    normalized.includes('users_email_key') ||
    normalized.includes('perfil_email_key')
  ) {
    return 'El email ya está registrado.'
  }

  if (normalized.includes('perfil_usuario_key')) {
    return 'El nombre de usuario ya está en uso.'
  }

  return ''
}

function validateNombre(nombre) {
  if (!NAME_REGEX.test(nombre || '')) {
    return 'El nombre solo puede contener letras, espacios y acentos.'
  }

  return ''
}

function validateEmail(email) {
  if (!EMAIL_REGEX.test(email || '')) {
    return 'El email no tiene un formato válido.'
  }

  return ''
}

function validatePassword(password) {
  if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
    return `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`
  }

  return ''
}

function composeNombre({ primerNombre, segundoNombre, primerApellido, segundoApellido }) {
  return [primerNombre, segundoNombre, primerApellido, segundoApellido]
    .filter((value) => value && String(value).trim())
    .map((value) => String(value).trim())
    .join(' ')
}

function mapProfile(row) {
  if (!row) {
    return row
  }

  const role = Array.isArray(row.rol) ? row.rol[0] : row.rol
  const state = Array.isArray(row.estado) ? row.estado[0] : row.estado
  const departamento = Array.isArray(row.departamento) ? row.departamento[0] : row.departamento
  const municipio = Array.isArray(row.municipio) ? row.municipio[0] : row.municipio

  return {
    ...row,
    nombre: composeNombre({
      primerNombre: row.primer_nombre,
      segundoNombre: row.segundo_nombre,
      primerApellido: row.primer_apellido,
      segundoApellido: row.segundo_apellido,
    }),
    rol_id: row.rol_id || role?.id || null,
    estado_usuario_id: row.estado_usuario_id || state?.id || null,
    departamento_id: row.departamento_id || departamento?.id || null,
    municipio_id: row.municipio_id || municipio?.id || null,
    rol: role?.nombre || 'Operario',
    estado: state?.nombre || 'Activo',
    departamento: departamento?.nombre || null,
    municipio: municipio?.nombre || null,
    rol_catalogo: role || null,
    estado_catalogo: state || null,
    departamento_catalogo: departamento || null,
    municipio_catalogo: municipio || null,
  }
}

async function resolveCatalogId(tableName, value, fallbackName, label) {
  if (typeof value === 'number') {
    return value
  }

  if (typeof value === 'string' && /^\d+$/.test(value)) {
    return Number(value)
  }

  const name = String(value || fallbackName).trim() || fallbackName
  const { data, error } = await supabaseAdmin
    .from(tableName)
    .select('id')
    .eq('nombre', name)
    .eq('activo', true)
    .single()

  if (error || !data?.id) {
    throw new Error(`El ${label} "${name}" no existe o esta inactivo.`)
  }

  return data.id
}

function resolveRoleId(value = 'Operario') {
  return resolveCatalogId('rol', value, 'Operario', 'rol')
}

function resolveEstadoUsuarioId(value = 'Activo') {
  return resolveCatalogId('estado_usuario', value, 'Activo', 'estado')
}

function resolveDepartamentoId(value) {
  return resolveCatalogId('departamento', value, '', 'departamento')
}

async function resolveMunicipioId(value, departamentoId) {
  const municipioId = await resolveCatalogId('municipio', value, '', 'municipio')

  if (departamentoId) {
    const { data } = await supabaseAdmin
      .from('municipio')
      .select('departamento_id')
      .eq('id', municipioId)
      .single()

    if (data && data.departamento_id !== departamentoId) {
      throw new Error('El municipio seleccionado no pertenece al departamento elegido.')
    }
  }

  return municipioId
}

async function deleteAuthUser(userId) {
  const { error } = await supabaseAdmin.auth.admin.deleteUser(userId)
  if (error) {
    throw error
  }
}

export async function listUsers(req, res) {
  try {
    const { data, error } = await supabaseAdmin
      .from('perfil')
      .select(PROFILE_FIELDS)
      .order('created_at', { ascending: false })

    if (error) {
      return buildErrorResponse(res, error, 'No fue posible cargar los usuarios.')
    }

    return res.json({ data: (data || []).map(mapProfile) })
  } catch (error) {
    return buildErrorResponse(res, error, 'No fue posible cargar los usuarios.')
  }
}

export async function listRoles(req, res) {
  try {
    const { data, error } = await supabaseAdmin
      .from('rol')
      .select('id, nombre, descripcion, activo, orden')
      .eq('activo', true)
      .order('orden', { ascending: true })
      .order('nombre', { ascending: true })

    if (error) {
      return buildErrorResponse(res, error, 'No fue posible cargar los roles.')
    }

    return res.json({ data: data || [] })
  } catch (error) {
    return buildErrorResponse(res, error, 'No fue posible cargar los roles.')
  }
}

export async function listEstadosUsuario(req, res) {
  try {
    const { data, error } = await supabaseAdmin
      .from('estado_usuario')
      .select('id, nombre, descripcion, activo, orden')
      .eq('activo', true)
      .order('orden', { ascending: true })
      .order('nombre', { ascending: true })

    if (error) {
      return buildErrorResponse(res, error, 'No fue posible cargar los estados de usuario.')
    }

    return res.json({ data: data || [] })
  } catch (error) {
    return buildErrorResponse(res, error, 'No fue posible cargar los estados de usuario.')
  }
}

export async function listDepartamentos(req, res) {
  try {
    const { data, error } = await supabaseAdmin
      .from('departamento')
      .select('id, codigo, nombre, descripcion, activo, orden')
      .eq('activo', true)
      .order('orden', { ascending: true })
      .order('nombre', { ascending: true })

    if (error) {
      return buildErrorResponse(res, error, 'No fue posible cargar los departamentos.')
    }

    return res.json({ data: data || [] })
  } catch (error) {
    return buildErrorResponse(res, error, 'No fue posible cargar los departamentos.')
  }
}

export async function listMunicipios(req, res) {
  try {
    const { departamento_id } = req.query

    let query = supabaseAdmin
      .from('municipio')
      .select('id, departamento_id, nombre, descripcion, activo, orden')
      .eq('activo', true)
      .order('orden', { ascending: true })
      .order('nombre', { ascending: true })

    if (departamento_id) {
      query = query.eq('departamento_id', Number(departamento_id))
    }

    const { data, error } = await query

    if (error) {
      return buildErrorResponse(res, error, 'No fue posible cargar los municipios.')
    }

    return res.json({ data: data || [] })
  } catch (error) {
    return buildErrorResponse(res, error, 'No fue posible cargar los municipios.')
  }
}

export async function createCompleteUser(req, res) {
  const {
    email,
    password,
    nombre,
    primer_nombre,
    segundo_nombre,
    primer_apellido,
    segundo_apellido,
    usuario,
    rol = 'Operario',
    rol_id,
    estado = 'Activo',
    estado_usuario_id,
    departamento,
    departamento_id,
    municipio,
    municipio_id,
  } = req.body || {}

  const composedNombre = (nombre && nombre.trim()) || composeNombre({
    primerNombre: primer_nombre,
    segundoNombre: segundo_nombre,
    primerApellido: primer_apellido,
    segundoApellido: segundo_apellido,
  })

  if (!email || !password || !composedNombre || !usuario) {
    return res.status(400).json({
      message: 'email, password, primer nombre, primer apellido y usuario son obligatorios.',
    })
  }

  if (!nombre || !nombre.trim()) {
    if (!primer_nombre || !String(primer_nombre).trim()) {
      return res.status(400).json({ message: 'El primer nombre es obligatorio.' })
    }

    if (!primer_apellido || !String(primer_apellido).trim()) {
      return res.status(400).json({ message: 'El primer apellido es obligatorio.' })
    }
  }

  const normalizedEmail = email.trim().toLowerCase()
  const normalizedNombre = composedNombre.trim()
  const normalizedUsuario = usuario.trim()
  const emailError = validateEmail(normalizedEmail)
  const passwordError = validatePassword(password)

  if (emailError) {
    return res.status(400).json({ message: emailError })
  }

  if (passwordError) {
    return res.status(400).json({ message: passwordError })
  }

  const nameFields = [primer_nombre, segundo_nombre, primer_apellido, segundo_apellido].filter(Boolean)
  for (const field of nameFields) {
    const nameError = validateNombre(String(field).trim())

    if (nameError) {
      return res.status(400).json({ message: nameError })
    }
  }

  if (!departamento_id && !departamento) {
    return res.status(400).json({ message: 'El departamento es obligatorio.' })
  }

  if (!municipio_id && !municipio) {
    return res.status(400).json({ message: 'El municipio es obligatorio.' })
  }

  try {
    const roleId = await resolveRoleId(rol_id || rol)
    const estadoUsuarioId = await resolveEstadoUsuarioId(estado_usuario_id || estado)
    const departamentoId = await resolveDepartamentoId(departamento_id || departamento)
    const municipioId = await resolveMunicipioId(municipio_id || municipio, departamentoId)
    const roleName = rol || 'Operario'

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: true,
      user_metadata: {
        nombre: normalizedNombre,
        primer_nombre: (primer_nombre && String(primer_nombre).trim()) || null,
        segundo_nombre: (segundo_nombre && String(segundo_nombre).trim()) || null,
        primer_apellido: (primer_apellido && String(primer_apellido).trim()) || null,
        segundo_apellido: (segundo_apellido && String(segundo_apellido).trim()) || null,
        usuario: normalizedUsuario,
        rol: roleName,
      },
    })

    if (authError || !authData?.user) {
      const duplicateMessage = mapDuplicateMessage(authError?.message)
      return res.status(400).json({
        message: duplicateMessage || 'No fue posible crear el usuario en Authentication.',
      })
    }

    const userId = authData.user.id

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('perfil')
      .insert({
        id: userId,
        primer_nombre: (primer_nombre && String(primer_nombre).trim()) || null,
        segundo_nombre: (segundo_nombre && String(segundo_nombre).trim()) || null,
        primer_apellido: (primer_apellido && String(primer_apellido).trim()) || null,
        segundo_apellido: (segundo_apellido && String(segundo_apellido).trim()) || null,
        usuario: normalizedUsuario,
        email: normalizedEmail,
        rol_id: roleId,
        estado_usuario_id: estadoUsuarioId,
        departamento_id: departamentoId,
        municipio_id: municipioId,
      })
      .select(PROFILE_FIELDS)
      .single()

    if (profileError || !profile) {
      await deleteAuthUser(userId).catch(() => {})
      const duplicateMessage = mapDuplicateMessage(profileError?.message)
      return res.status(400).json({
        message: duplicateMessage || 'No fue posible crear el perfil del usuario.',
      })
    }

    return res.status(201).json({ data: mapProfile(profile) })
  } catch (error) {
    return buildErrorResponse(res, error, 'No fue posible crear el usuario.')
  }
}

export async function updateUser(req, res) {
  const { id } = req.params
  const {
    email,
    password,
    nombre,
    primer_nombre,
    segundo_nombre,
    primer_apellido,
    segundo_apellido,
    usuario,
    rol,
    rol_id,
    estado,
    estado_usuario_id,
    departamento,
    departamento_id,
    municipio,
    municipio_id,
  } = req.body || {}

  if (!id) {
    return res.status(400).json({ message: 'El id del usuario es obligatorio.' })
  }

  if (nombre) {
    const nombreError = validateNombre(nombre.trim())

    if (nombreError) {
      return res.status(400).json({ message: nombreError })
    }
  }

  const partialNames = [
    primer_nombre,
    segundo_nombre,
    primer_apellido,
    segundo_apellido,
  ].filter((value) => value !== undefined && value !== null && String(value).trim() !== '')

  for (const field of partialNames) {
    const nameError = validateNombre(String(field).trim())

    if (nameError) {
      return res.status(400).json({ message: nameError })
    }
  }

  if (email) {
    const emailError = validateEmail(email.trim())

    if (emailError) {
      return res.status(400).json({ message: emailError })
    }
  }

  if (password) {
    const passwordError = validatePassword(password)

    if (passwordError) {
      return res.status(400).json({ message: passwordError })
    }
  }

  try {
    const roleId = rol || rol_id ? await resolveRoleId(rol_id || rol) : undefined
    const estadoUsuarioId = estado || estado_usuario_id
      ? await resolveEstadoUsuarioId(estado_usuario_id || estado)
      : undefined

    const hasDepartamentoInput = (departamento_id !== undefined && departamento_id !== null && departamento_id !== '') || (departamento !== undefined && departamento !== null && departamento !== '')
    const hasMunicipioInput = (municipio_id !== undefined && municipio_id !== null && municipio_id !== '') || (municipio !== undefined && municipio !== null && municipio !== '')
    const departamentoId = hasDepartamentoInput
      ? await resolveDepartamentoId(departamento_id || departamento)
      : undefined
    const municipioId = hasMunicipioInput
      ? await resolveMunicipioId(municipio_id || municipio, departamentoId)
      : undefined

    const nameFieldsProvided = [
      primer_nombre,
      segundo_nombre,
      primer_apellido,
      segundo_apellido,
    ].some((value) => value !== undefined)

    let currentName = {
      primer_nombre: null,
      segundo_nombre: null,
      primer_apellido: null,
      segundo_apellido: null,
    }

    if (nameFieldsProvided || nombre) {
      const { data: currentProfile } = await supabaseAdmin
        .from('perfil')
        .select('primer_nombre, segundo_nombre, primer_apellido, segundo_apellido')
        .eq('id', id)
        .single()

      if (currentProfile) {
        currentName = currentProfile
      }
    }

    const nextName = {
      primer_nombre: primer_nombre !== undefined ? primer_nombre : currentName.primer_nombre,
      segundo_nombre: segundo_nombre !== undefined ? segundo_nombre : currentName.segundo_nombre,
      primer_apellido: primer_apellido !== undefined ? primer_apellido : currentName.primer_apellido,
      segundo_apellido: segundo_apellido !== undefined ? segundo_apellido : currentName.segundo_apellido,
    }

    const nextNombre = (nombre && nombre.trim()) || composeNombre({
      primerNombre: nextName.primer_nombre,
      segundoNombre: nextName.segundo_nombre,
      primerApellido: nextName.primer_apellido,
      segundoApellido: nextName.segundo_apellido,
    })

    const authUpdates = {}
    if (email) authUpdates.email = email.trim().toLowerCase()
    if (password) authUpdates.password = password
    if (nombre || nameFieldsProvided || usuario || rol) {
      authUpdates.user_metadata = {
        nombre: nextNombre,
        primer_nombre: (nextName.primer_nombre && String(nextName.primer_nombre).trim()) || null,
        segundo_nombre: (nextName.segundo_nombre && String(nextName.segundo_nombre).trim()) || null,
        primer_apellido: (nextName.primer_apellido && String(nextName.primer_apellido).trim()) || null,
        segundo_apellido: (nextName.segundo_apellido && String(nextName.segundo_apellido).trim()) || null,
        ...(usuario ? { usuario: usuario.trim() } : {}),
        ...(rol ? { rol } : {}),
      }
    }

    if (Object.keys(authUpdates).length > 0) {
      const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(id, authUpdates)
      if (authError) {
        const duplicateMessage = mapDuplicateMessage(authError?.message)
        return res.status(400).json({
          message: duplicateMessage || 'No fue posible actualizar el usuario de Authentication.',
        })
      }
    }

    const profilePayload = {
      ...(email ? { email: email.trim().toLowerCase() } : {}),
      ...(usuario ? { usuario: usuario.trim() } : {}),
      ...(roleId !== undefined ? { rol_id: roleId } : {}),
      ...(estadoUsuarioId !== undefined ? { estado_usuario_id: estadoUsuarioId } : {}),
      ...(primer_nombre !== undefined
        ? { primer_nombre: (primer_nombre && String(primer_nombre).trim()) || null }
        : {}),
      ...(segundo_nombre !== undefined
        ? { segundo_nombre: (segundo_nombre && String(segundo_nombre).trim()) || null }
        : {}),
      ...(primer_apellido !== undefined
        ? { primer_apellido: (primer_apellido && String(primer_apellido).trim()) || null }
        : {}),
      ...(segundo_apellido !== undefined
        ? { segundo_apellido: (segundo_apellido && String(segundo_apellido).trim()) || null }
        : {}),
      ...(departamentoId !== undefined ? { departamento_id: departamentoId } : {}),
      ...(municipioId !== undefined ? { municipio_id: municipioId } : {}),
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('perfil')
      .update(profilePayload)
      .eq('id', id)
      .select(PROFILE_FIELDS)
      .single()

    if (profileError || !profile) {
      const duplicateMessage = mapDuplicateMessage(profileError?.message)
      return res.status(400).json({
        message: duplicateMessage || 'No fue posible actualizar el perfil.',
      })
    }

    return res.json({ data: mapProfile(profile) })
  } catch (error) {
    return buildErrorResponse(res, error, 'No fue posible actualizar el usuario.')
  }
}

export async function deleteUser(req, res) {
  const { id } = req.params

  if (!id) {
    return res.status(400).json({ message: 'El id del usuario es obligatorio.' })
  }

  try {
    const authDeletion = await supabaseAdmin.auth.admin.deleteUser(id)
    const profileDeletion = await supabaseAdmin
      .from('perfil')
      .delete()
      .eq('id', id)

    if (authDeletion.error && profileDeletion.error) {
      return buildErrorResponse(res, authDeletion.error || profileDeletion.error, 'No fue posible eliminar el usuario.', 400)
    }

    return res.json({ message: 'Usuario eliminado correctamente.' })
  } catch (error) {
    return buildErrorResponse(res, error, 'No fue posible eliminar el usuario.')
  }
}
