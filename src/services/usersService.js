import { getAccessToken } from './authService'

const API_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

function getApiUrl(path) {
  if (!API_URL) {
    throw new Error('Falta configurar VITE_API_URL para conectar con el backend.')
  }

  return `${API_URL}${path}`
}

async function request(path, options = {}) {
  const token = getAccessToken()

  if (!token) {
    throw new Error('No hay sesión activa para consultar el backend.')
  }

  let response
  try {
    response = await fetch(getApiUrl(path), {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...(options.headers || {}),
      },
    })
  } catch {
    throw new Error('No se pudo conectar al backend. Verifica que la API esté ejecutándose en VITE_API_URL.')
  }

  let payload = null
  try {
    payload = await response.json()
  } catch {
    payload = null
  }

  if (!response.ok) {
    throw new Error(payload?.message || 'No fue posible completar la operación.')
  }

  return payload
}

function formatDateTime(value) {
  if (!value) {
    return 'Sin registro'
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return 'Sin registro'
  }

  return parsed.toLocaleString('es-GT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

export async function listUsers() {
  const payload = await request('/api/users', { method: 'GET' })
  const data = payload?.data || []

  return (data || []).map((row) => ({
    id: row.id,
    nombre: row.nombre,
    primerNombre: row.primer_nombre,
    segundoNombre: row.segundo_nombre,
    primerApellido: row.primer_apellido,
    segundoApellido: row.segundo_apellido,
    usuario: row.usuario,
    rol: row.rol,
    email: row.email,
    estado: row.estado,
    pais: 'Guatemala',
    departamentoId: row.departamento_id,
    departamento: row.departamento,
    municipioId: row.municipio_id,
    municipio: row.municipio,
    ultimoAcceso: formatDateTime(row.ultimo_acceso),
  }))
}

export async function listDepartamentos() {
  const payload = await request('/api/users/departamentos', { method: 'GET' })
  return payload?.data || []
}

export async function listMunicipios(departamentoId) {
  const query = departamentoId ? `?departamento_id=${encodeURIComponent(departamentoId)}` : ''
  const payload = await request(`/api/users/municipios${query}`, { method: 'GET' })
  return payload?.data || []
}

export async function listRoles() {
  const payload = await request('/api/users/roles', { method: 'GET' })
  return payload?.data || []
}

export async function listEstadosUsuario() {
  const payload = await request('/api/users/estados', { method: 'GET' })
  return payload?.data || []
}

function buildNamePayload({ primerNombre, segundoNombre, primerApellido, segundoApellido }) {
  const trimmed = [
    (primerNombre ?? '').trim(),
    (segundoNombre ?? '').trim(),
    (primerApellido ?? '').trim(),
    (segundoApellido ?? '').trim(),
  ]

  return {
    primer_nombre: trimmed[0] || null,
    segundo_nombre: trimmed[1] || null,
    primer_apellido: trimmed[2] || null,
    segundo_apellido: trimmed[3] || null,
  }
}

export async function createCompleteUser({
  primerNombre,
  segundoNombre,
  primerApellido,
  segundoApellido,
  usuario,
  email,
  password,
  rol,
  estado,
  departamentoId,
  municipioId,
}) {
  const payload = {
    ...buildNamePayload({ primerNombre, segundoNombre, primerApellido, segundoApellido }),
    usuario: usuario?.trim(),
    email: email?.trim().toLowerCase(),
    password,
    rol,
    estado,
    departamento_id: departamentoId,
    municipio_id: municipioId,
  }

  await request('/api/users', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function updateUserProfile(
  id,
  {
    primerNombre,
    segundoNombre,
    primerApellido,
    segundoApellido,
    usuario,
    email,
    password,
    rol,
    estado,
    departamentoId,
    municipioId,
  },
) {
  const payload = {
    ...buildNamePayload({ primerNombre, segundoNombre, primerApellido, segundoApellido }),
    usuario: usuario?.trim(),
    email: email?.trim().toLowerCase(),
    ...(password ? { password } : {}),
    rol,
    estado,
    departamento_id: departamentoId,
    municipio_id: municipioId,
  }

  await request(`/api/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export async function deleteUserProfile(id) {
  await request(`/api/users/${id}`, {
    method: 'DELETE',
  })
}
