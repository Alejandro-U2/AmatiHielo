import { getAccessToken } from './authService'

const API_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

type RequestOptions = {
  method?: string
  body?: unknown
}

async function request(path: string, options: RequestOptions = {}) {
  const token = getAccessToken()

  if (!token) {
    throw new Error('No hay sesión activa para consultar la configuración.')
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
    throw new Error('No se pudo conectar con el backend de configuración.')
  }

  let payload: any = null
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

export type CompanyConfig = {
  id?: number
  nombreEmpresa: string
  nit: string
  direccion: string
  telefono: string
  correo: string
  logoUrl: string
}

export type TaxItem = {
  nombre: string
  porcentaje: number
  activo: boolean
}

export type TaxConfig = {
  id?: number
  ivaActivo: boolean
  ivaPorcentaje: number
  otrosImpuestos: TaxItem[]
}

export type NotificationConfig = {
  id?: number
  alertaStockBajo: boolean
  alertaStockCritico: boolean
  confirmacionVentas: boolean
  alertasMantenimiento: boolean
  alertasVencimiento: boolean
  alertasComprasPendientes: boolean
  notificacionesCorreo: boolean
}

export type ThresholdConfig = {
  id?: number
  stockBajoPorcentaje: number
  stockCriticoPorcentaje: number
  diasMantenimiento: number
  diasVencimiento: number
  parametrosExtra: Record<string, string>
}

export type Branch = {
  id: number
  nombre: string
  direccion: string
  telefono: string
  encargado: string
  activa: boolean
}

export type SystemConfig = {
  empresa: CompanyConfig
  impuestos: TaxConfig
  notificaciones: NotificationConfig
  umbrales: ThresholdConfig
  sucursales: Branch[]
}

function normalizeCompany(row: any): CompanyConfig {
  return {
    id: row.id,
    nombreEmpresa: row.nombreEmpresa || row.nombre_empresa || '',
    nit: row.nit || '',
    direccion: row.direccion || '',
    telefono: row.telefono || '',
    correo: row.correo || '',
    logoUrl: row.logoUrl || row.logo_url || '',
  }
}

function normalizeTaxItem(item: any): TaxItem {
  return {
    nombre: item.nombre || '',
    porcentaje: Number(item.porcentaje || 0),
    activo: Boolean(item.activo),
  }
}

function normalizeTaxes(row: any): TaxConfig {
  return {
    id: row.id,
    ivaActivo: Boolean(row.ivaActivo ?? row.iva_activo),
    ivaPorcentaje: Number(row.ivaPorcentaje ?? row.iva_porcentaje ?? 0),
    otrosImpuestos: (row.otrosImpuestos || row.otros_impuestos || []).map(normalizeTaxItem),
  }
}

function normalizeNotifications(row: any): NotificationConfig {
  return {
    id: row.id,
    alertaStockBajo: Boolean(row.alertaStockBajo ?? row.alerta_stock_bajo),
    alertaStockCritico: Boolean(row.alertaStockCritico ?? row.alerta_stock_critico),
    confirmacionVentas: Boolean(row.confirmacionVentas ?? row.confirmacion_ventas),
    alertasMantenimiento: Boolean(row.alertasMantenimiento ?? row.alertas_mantenimiento),
    alertasVencimiento: Boolean(row.alertasVencimiento ?? row.alertas_vencimiento),
    alertasComprasPendientes: Boolean(row.alertasComprasPendientes ?? row.alertas_compras_pendientes),
    notificacionesCorreo: Boolean(row.notificacionesCorreo ?? row.notificaciones_correo),
  }
}

function normalizeThresholds(row: any): ThresholdConfig {
  return {
    id: row.id,
    stockBajoPorcentaje: Number(row.stockBajoPorcentaje ?? row.stock_bajo_porcentaje ?? 0),
    stockCriticoPorcentaje: Number(row.stockCriticoPorcentaje ?? row.stock_critico_porcentaje ?? 0),
    diasMantenimiento: Number(row.diasMantenimiento ?? row.dias_mantenimiento ?? 0),
    diasVencimiento: Number(row.diasVencimiento ?? row.dias_vencimiento ?? 0),
    parametrosExtra: row.parametrosExtra || row.parametros_extra || {},
  }
}

function normalizeBranch(row: any): Branch {
  return {
    id: row.id,
    nombre: row.nombre || '',
    direccion: row.direccion || '',
    telefono: row.telefono || '',
    encargado: row.encargado || '',
    activa: Boolean(row.activa),
  }
}

export async function getConfiguracionSistema() {
  const payload = await request('/api/configuracion-sistema')
  const data = payload?.data || {}

  return {
    empresa: normalizeCompany(data.empresa || {}),
    impuestos: normalizeTaxes(data.impuestos || {}),
    notificaciones: normalizeNotifications(data.notificaciones || {}),
    umbrales: normalizeThresholds(data.umbrales || {}),
    sucursales: (data.sucursales || []).map(normalizeBranch),
  } as SystemConfig
}

export async function getParametrosSistema() {
  const payload = await request('/api/configuracion-sistema/parametros')
  const data = payload?.data || {}

  return {
    impuestos: normalizeTaxes(data.impuestos || {}),
    notificaciones: normalizeNotifications(data.notificaciones || {}),
    umbrales: normalizeThresholds(data.umbrales || {}),
  }
}

export async function updateEmpresaConfig(input: CompanyConfig) {
  const payload = await request('/api/configuracion-sistema/empresa', {
    method: 'PUT',
    body: input,
  })

  return normalizeCompany(payload?.data || {})
}

export async function updateImpuestosConfig(input: TaxConfig) {
  const payload = await request('/api/configuracion-sistema/impuestos', {
    method: 'PUT',
    body: input,
  })

  return normalizeTaxes(payload?.data || {})
}

export async function updateNotificacionesConfig(input: NotificationConfig) {
  const payload = await request('/api/configuracion-sistema/notificaciones', {
    method: 'PUT',
    body: input,
  })

  return normalizeNotifications(payload?.data || {})
}

export async function updateUmbralesConfig(input: ThresholdConfig) {
  const payload = await request('/api/configuracion-sistema/umbrales', {
    method: 'PUT',
    body: input,
  })

  return normalizeThresholds(payload?.data || {})
}

export async function createSucursal(input: Omit<Branch, 'id'>) {
  const payload = await request('/api/configuracion-sistema/sucursales', {
    method: 'POST',
    body: input,
  })

  return normalizeBranch(payload?.data || {})
}

export async function updateSucursal(id: number, input: Partial<Omit<Branch, 'id'>>) {
  const payload = await request(`/api/configuracion-sistema/sucursales/${id}`, {
    method: 'PUT',
    body: input,
  })

  return normalizeBranch(payload?.data || {})
}

export async function deleteSucursal(id: number) {
  await request(`/api/configuracion-sistema/sucursales/${id}`, {
    method: 'DELETE',
  })
}