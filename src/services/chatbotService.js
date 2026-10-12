import { getAccessToken } from './authService'
import { API_URL } from './apiUrl'

export async function sendChatbotMessage({ message, history = [], context = {} }) {
  const token = getAccessToken()
  const response = await fetch(`${API_URL.replace(/\/$/, '')}/api/chatbot/message`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ message, history, context }),
  })

  let payload = null
  try {
    payload = await response.json()
  } catch {
    payload = null
  }

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Tu sesión expiró o ya no es válida. Cierra sesión, vuelve a ingresar y reintenta.')
    }
    throw new Error(payload?.message || 'No fue posible consultar el chatbot.')
  }

  return payload
}

export async function downloadInventoryReport() {
  const token = getAccessToken()
  const response = await fetch(`${API_URL.replace(/\/$/, '')}/api/chatbot/report`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Tu sesión expiró o ya no es válida. Cierra sesión, vuelve a ingresar y reintenta.')
    }
    let payload = null
    try { payload = await response.json() } catch { payload = null }
    throw new Error(payload?.message || 'No fue posible generar el reporte.')
  }

  const blob = await response.blob()
  const downloadUrl = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = downloadUrl
  link.download = 'reporte_inventario_actual.pdf'
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000)
}
