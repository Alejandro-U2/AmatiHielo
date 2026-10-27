import { getAccessToken } from './authService'
import { API_URL as configuredApiUrl } from './apiUrl'

const API_URL = configuredApiUrl.replace(/\/$/, '')

async function request(path, options = {}) {
  const token = getAccessToken()
  if (!token) throw new Error('No hay sesión activa para consultar el arqueo.')

  const response = await fetch(`${API_URL}${path}`, {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  })
  const payload = await response.json().catch(() => null)
  if (!response.ok) throw new Error(payload?.message || 'No fue posible procesar el arqueo.')
  return payload
}

function normalizeArqueo(row = {}) {
  const fondoInicial = Number(row.fondoInicial ?? row.fondo_inicial ?? 0)
  const totalEfectivo = Number(row.totalEfectivo ?? row.total_efectivo ?? 0)
  const sencilloDejado = Number(row.sencilloDejado ?? row.sencillo_dejado ?? fondoInicial)
  const totalEfectivoEsperado = Number(row.totalEfectivoEsperado ?? row.total_efectivo_esperado ?? (fondoInicial + totalEfectivo))
  const efectivoRetirado = Number(row.efectivoRetirado ?? row.efectivo_retirado ?? Math.max(0, totalEfectivoEsperado - sencilloDejado))
  const efectivoReal = Number(row.efectivoReal ?? row.efectivo_real ?? totalEfectivoEsperado)
  const diferencia = Number(row.diferencia ?? (efectivoReal - totalEfectivoEsperado))

  return {
    id: row.id,
    periodoInicio: row.periodoInicio ?? row.periodo_inicio,
    periodoFin: row.periodoFin ?? row.periodo_fin,
    totalVentas: Number(row.totalVentas ?? row.total_ventas ?? 0),
    totalEfectivo,
    totalTransferencia: Number(row.totalTransferencia ?? row.total_transferencia ?? 0),
    transacciones: Number(row.transacciones || 0),
    fondoInicial,
    sencilloDejado,
    totalEfectivoEsperado,
    efectivoRetirado,
    efectivoReal,
    diferencia,
    observaciones: row.observaciones || '',
    usuario: row.usuario || 'Sistema',
    confirmadoAt: row.confirmadoAt ?? row.confirmado_at,
  }
}

export async function getArqueoCaja(periodoInicio, periodoFin) {
  const query = new URLSearchParams({
    periodoInicio: periodoInicio.toISOString(),
    periodoFin: periodoFin.toISOString(),
  })
  const payload = await request(`/api/caja/arqueo?${query.toString()}`)
  return { data: normalizeArqueo(payload?.data), confirmado: Boolean(payload?.confirmado) }
}

export async function confirmarArqueoCaja(periodoInicio, periodoFin, options = {}) {
  const payload = await request('/api/caja/arqueo', {
    method: 'POST',
    body: {
      periodoInicio: periodoInicio.toISOString(),
      periodoFin: periodoFin.toISOString(),
      sencilloDejado: Number(options.sencilloDejado ?? options.sencillo ?? 0),
      efectivoReal: options.efectivoReal !== undefined && options.efectivoReal !== null && options.efectivoReal !== '' ? Number(options.efectivoReal) : null,
      observaciones: options.observaciones || '',
    },
  })
  return normalizeArqueo(payload?.data)
}
