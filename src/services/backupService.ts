import { getAccessToken } from './authService'
import { API_URL as configuredApiUrl } from './apiUrl'

const API_URL = configuredApiUrl.replace(/\/$/, '')

export type BackupConfig = {
  activo: boolean
  frecuencia: 'diario' | 'semanal' | 'mensual'
  hora: string
  dia_semana: number // 0 = Domingo
  dia_mes: number
  dias_retencion: number
  ultimo_backup_at: string | null
  proximo_backup_at: string | null
  updated_at?: string
  updated_by?: string
}

export type BackupHistorialItem = {
  id: string | number
  nombre_archivo: string
  tipo: 'manual' | 'automatico'
  tamano_bytes: number
  estado: 'completado' | 'error' | 'en_proceso'
  total_tablas: number
  total_registros: number
  formato: string
  checksum?: string
  storage_path?: string
  error_mensaje?: string
  created_at: string
  created_by: string
  metadata?: {
    duracion_ms?: number
    tablas?: string[]
  }
}

type RequestOptions = {
  method?: string
  body?: unknown
}

async function request(path: string, options: RequestOptions = {}) {
  const token = getAccessToken()

  if (!token) {
    throw new Error('No hay sesión activa para gestionar copias de seguridad.')
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
    throw new Error('No se pudo conectar con el servidor de backups.')
  }

  let payload: any = null
  try {
    payload = await response.json()
  } catch {
    payload = null
  }

  if (!response.ok) {
    throw new Error(payload?.message || 'Error en la operación de backup.')
  }

  return payload
}

export async function fetchBackupConfig(): Promise<BackupConfig> {
  const payload = await request('/api/backup/config')
  return payload.data
}

export async function updateBackupConfig(config: Partial<BackupConfig>): Promise<BackupConfig> {
  const payload = await request('/api/backup/config', {
    method: 'PUT',
    body: config,
  })
  return payload.data
}

export async function fetchBackupHistorial(): Promise<BackupHistorialItem[]> {
  const payload = await request('/api/backup/historial')
  return payload.data || []
}

export async function triggerManualBackup(): Promise<BackupHistorialItem> {
  const payload = await request('/api/backup/generar', {
    method: 'POST',
  })
  return payload.data
}

export async function deleteBackupRecord(id: string | number): Promise<void> {
  await request(`/api/backup/${id}`, {
    method: 'DELETE',
  })
}

export async function downloadBackup(id: string | number, filename: string): Promise<void> {
  const token = getAccessToken()
  if (!token) throw new Error('No hay sesión activa para descargar el archivo.')

  const response = await fetch(`${API_URL}/api/backup/download/${id}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    let msg = 'Error al descargar la copia de seguridad.'
    try {
      const err = await response.json()
      if (err?.message) msg = err.message
    } catch {
      // Ignorar
    }
    throw new Error(msg)
  }

  const blob = await response.blob()
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename || `backup_${id}.json.gz`
  document.body.appendChild(a)
  a.click()
  window.URL.revokeObjectURL(url)
  document.body.removeChild(a)
}

export function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}
