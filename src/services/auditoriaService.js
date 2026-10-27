import { getAccessToken } from './authService'
import { notifyDataChange } from './realtimeSync'
import { API_URL as configuredApiUrl } from './apiUrl'

const API_URL = (configuredApiUrl || 'http://localhost:3001').replace(/\/$/, '')

async function request(path, options = {}) {
  if (!API_URL) {
    throw new Error('Falta configurar VITE_API_URL para auditorías.')
  }

  const token = getAccessToken()
  if (!token) {
    throw new Error('No hay sesión activa para realizar esta operación de auditoría.')
  }

  let stringBody = undefined
  if (options.body !== undefined) {
    try {
      stringBody = JSON.stringify(options.body)
    } catch (serErr) {
      console.error('Error al serializar cuerpo de solicitud:', serErr)
      throw new Error('Error en el formato de datos a enviar: ' + (serErr?.message || ''))
    }
  }

  let response
  try {
    response = await fetch(`${API_URL}${path}`, {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...(options.headers || {}),
      },
      body: stringBody,
    })
  } catch (err) {
    console.error('Fetch error en auditoriaService:', err)
    throw new Error('No se pudo conectar con el servidor de auditoría: ' + (err?.message || 'Error de red'))
  }

  let payload = null
  try {
    payload = await response.json()
  } catch {
    payload = null
  }

  if (!response.ok) {
    throw new Error(payload?.message || 'Error en la solicitud de auditoría.')
  }

  return payload
}

export async function listAuditorias(filters = {}) {
  const query = new URLSearchParams()
  if (filters.mes) query.append('mes', filters.mes)
  if (filters.anio) query.append('anio', filters.anio)
  if (filters.estado && filters.estado !== 'Todos') query.append('estado', filters.estado)
  if (filters.q) query.append('q', filters.q)

  const queryString = query.toString() ? `?${query.toString()}` : ''
  const payload = await request(`/api/inventario/auditoria${queryString}`)
  return payload?.data || []
}

export async function getAuditoriaById(id) {
  const payload = await request(`/api/inventario/auditoria/${id}`)
  return payload?.data || null
}

export async function createAuditoria(data) {
  const payload = await request('/api/inventario/auditoria', {
    method: 'POST',
    body: data,
  })
  notifyDataChange('inventario')
  return payload?.data || null
}

export async function updateAuditoriaEstado(id, nuevoEstado, usuario) {
  const estadoStr = typeof nuevoEstado === 'string' ? nuevoEstado : 'En revisión'
  const payload = await request(`/api/inventario/auditoria/${id}/estado`, {
    method: 'PATCH',
    body: { nuevoEstado: estadoStr, usuario: typeof usuario === 'string' ? usuario : 'Operador' },
  })
  notifyDataChange('inventario')
  return payload?.data || null
}

export async function saveConteo(id, items, usuario, notas = '') {
  const payload = await request(`/api/inventario/auditoria/${id}/conteo`, {
    method: 'PUT',
    body: { items, usuario, notas },
  })
  return payload?.data || null
}

export async function investigarDiferencia(id, detalleId, data) {
  const payload = await request(`/api/inventario/auditoria/${id}/investigar/${detalleId}`, {
    method: 'PUT',
    body: data,
  })
  return payload?.data || null
}

export async function aprobarAjustes(id, itemsAprobados, comentarios, usuario) {
  const payload = await request(`/api/inventario/auditoria/${id}/aprobar-ajustes`, {
    method: 'POST',
    body: { itemsAprobados, comentarios, usuario },
  })
  notifyDataChange('inventario')
  return payload?.data || null
}

export async function cerrarAuditoria(id, resumen, usuario) {
  const payload = await request(`/api/inventario/auditoria/${id}/cerrar`, {
    method: 'POST',
    body: { resumen, usuario },
  })
  notifyDataChange('inventario')
  return payload?.data || null
}

export async function getCatalogosAuditoria() {
  const payload = await request('/api/inventario/auditoria/catalogos')
  return payload?.data || null
}

