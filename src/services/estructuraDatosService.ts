import { getAccessToken } from './authService'
import { API_URL as configuredApiUrl } from './apiUrl'

const API_URL = configuredApiUrl.replace(/\/$/, '')

type RequestOptions = {
  method?: string
  body?: unknown
}

async function request(path: string, options: RequestOptions = {}) {
  const token = getAccessToken()

  if (!token) {
    throw new Error('No hay sesión activa para consultar la estructura.')
  }

  let response: Response
  try {
    response = await fetch(`${API_URL}${path}`, {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    })
  } catch {
    throw new Error('No se pudo conectar con el backend de estructura.')
  }

  let payload: any = null
  try {
    payload = await response.json()
  } catch {
    payload = null
  }

  if (!response.ok) {
    throw new Error(payload?.message || 'No fue posible cargar la estructura.')
  }

  return payload
}

export type EstructuraCampo = {
  id?: number
  nombre: string
  tipoDato: string
  descripcion: string
  requerido: boolean
  unico: boolean
  orden: number
}

export type EstructuraTabla = {
  id: number
  nombreVisible: string
  nombreInterno: string
  descripcion: string
  modulo: string
  esSistema: boolean
  createdAt: string
  updatedAt: string
  totalCampos: number
  totalRegistros: number
  campos: EstructuraCampo[]
}

export type EstructuraMeta = {
  totalTablas: number
  totalModulos: number
  totalRegistros: number
  estadoSistema: string
}

function normalizeCampo(campo: any): EstructuraCampo {
  return {
    id: campo.id,
    nombre: campo.nombre,
    tipoDato: campo.tipoDato || campo.tipo_dato,
    descripcion: campo.descripcion || '',
    requerido: Boolean(campo.requerido),
    unico: Boolean(campo.unico),
    orden: Number(campo.orden || 0),
  }
}

function normalizeTabla(tabla: any): EstructuraTabla {
  const campos = (tabla.campos || tabla.campo_estructura || []).map(normalizeCampo)

  return {
    id: tabla.id,
    nombreVisible: tabla.nombreVisible || tabla.nombre_visible,
    nombreInterno: tabla.nombreInterno || tabla.nombre_interno,
    descripcion: tabla.descripcion || '',
    modulo: tabla.modulo,
    esSistema: Boolean(tabla.esSistema ?? tabla.es_sistema),
    createdAt: tabla.createdAt || tabla.created_at,
    updatedAt: tabla.updatedAt || tabla.updated_at,
    totalCampos: Number(tabla.totalCampos ?? tabla.total_campos ?? campos.length),
    totalRegistros: Number(tabla.totalRegistros ?? tabla.total_registros ?? 0),
    campos: campos.sort((a, b) => a.orden - b.orden),
  }
}

export async function listEstructuras() {
  const payload = await request('/api/estructura-datos')

  return {
    data: (payload?.data || []).map(normalizeTabla),
    meta: payload?.meta || null,
  }
}

export async function getEstructuraById(id: number) {
  const payload = await request(`/api/estructura-datos/${id}`)
  return normalizeTabla(payload?.data || {})
}

export async function createEstructura(input: {
  nombreInterno: string
  nombreVisible: string
  modulo: string
  descripcion: string
  campos: EstructuraCampo[]
}) {
  const payload = await request('/api/estructura-datos', {
    method: 'POST',
    body: input,
  })

  return normalizeTabla(payload?.data || {})
}

export async function deleteEstructura(id: number) {
  await request(`/api/estructura-datos/${id}`, {
    method: 'DELETE',
  })
}