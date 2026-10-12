import { supabase } from './supabaseClient'

export interface SaleDetailRow {
  id: number
  saleId: number
  productId: number
  productCode: string
  productName: string
  productCategory: string
  productPresentation: string
  quantity: number
  unitPrice: number
  total: number
  createdAt: string
}

export interface ProductSalesAggregate {
  productId: number
  productCode: string
  productName: string
  productCategory: string
  totalQuantity: number
  totalRevenue: number
  salesCount: number
  averageDailyQuantity: number
}

export interface SalesPeriodSummary {
  totalQuantity: number
  totalRevenue: number
  transactionCount: number
  byProduct: ProductSalesAggregate[]
  byDate: Array<{
    date: string
    totalQuantity: number
    totalRevenue: number
    transactionCount: number
  }>
}

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function startOfDay(date: Date): Date {
  const copy = new Date(date)
  copy.setHours(0, 0, 0, 0)
  return copy
}

function addDays(date: Date, days: number): Date {
  const copy = new Date(date)
  copy.setDate(copy.getDate() + days)
  return copy
}

function daysBetween(startDate: string, endDate: string): number {
  const start = new Date(`${startDate}T00:00:00`)
  const end = new Date(`${endDate}T00:00:00`)
  const diff = Math.round((end.getTime() - start.getTime()) / 86_400_000)
  return Math.max(diff + 1, 1)
}

function normalizeSaleDetail(row: any): SaleDetailRow {
  const receta = row.receta || {}

  return {
    id: Number(row.id),
    saleId: Number(row.venta_id),
    productId: Number(row.receta_id),
    productCode: receta.codigo || '',
    productName: receta.nombre || 'Producto de venta',
    productCategory: receta.categoria || 'General',
    productPresentation: receta.presentacion || '',
    quantity: Number(row.cantidad || 0),
    unitPrice: Number(row.precio_unitario || 0),
    total: Number(row.total || 0),
    createdAt: row.created_at,
  }
}

export function getDateRange(daysBack: number): { from: string; to: string } {
  const today = startOfDay(new Date())
  return {
    from: addDays(today, -Math.max(daysBack - 1, 0)).toISOString(),
    to: addDays(today, 1).toISOString(),
  }
}

export async function getHistoricalSales(daysBack = 90): Promise<SaleDetailRow[]> {
  const range = getDateRange(daysBack)

  const { data, error } = await supabase
    .from('venta_pos_detalle')
    .select(`
      id,
      venta_id,
      receta_id,
      cantidad,
      precio_unitario,
      total,
      created_at,
      receta (
        id,
        codigo,
        nombre,
        categoria,
        presentacion
      )
    `)
    .gte('created_at', range.from)
    .lt('created_at', range.to)
    .order('created_at', { ascending: true })

  if (error) {
    throw new Error(error.message || 'No fue posible obtener ventas historicas.')
  }

  return (data || []).map(normalizeSaleDetail)
}

export async function getSalesForRange(from: Date, to: Date): Promise<SaleDetailRow[]> {
  const { data, error } = await supabase
    .from('venta_pos_detalle')
    .select(`
      id,
      venta_id,
      receta_id,
      cantidad,
      precio_unitario,
      total,
      created_at,
      receta (
        id,
        codigo,
        nombre,
        categoria,
        presentacion
      )
    `)
    .gte('created_at', from.toISOString())
    .lt('created_at', to.toISOString())
    .order('created_at', { ascending: true })

  if (error) {
    throw new Error(error.message || 'No fue posible obtener ventas del periodo.')
  }

  return (data || []).map(normalizeSaleDetail)
}

export function summarizeSales(rows: SaleDetailRow[]): SalesPeriodSummary {
  const byProduct = new Map<number, ProductSalesAggregate>()
  const byDate = new Map<string, SalesPeriodSummary['byDate'][number]>()
  const saleIds = new Set<number>()

  rows.forEach((row) => {
    saleIds.add(row.saleId)
    const date = toIsoDate(new Date(row.createdAt))
    const product = byProduct.get(row.productId) || {
      productId: row.productId,
      productCode: row.productCode,
      productName: row.productName,
      productCategory: row.productCategory,
      totalQuantity: 0,
      totalRevenue: 0,
      salesCount: 0,
      averageDailyQuantity: 0,
    }
    const day = byDate.get(date) || {
      date,
      totalQuantity: 0,
      totalRevenue: 0,
      transactionCount: 0,
    }

    product.totalQuantity += row.quantity
    product.totalRevenue += row.total
    product.salesCount += 1

    day.totalQuantity += row.quantity
    day.totalRevenue += row.total
    day.transactionCount += 1

    byProduct.set(row.productId, product)
    byDate.set(date, day)
  })

  const dates = rows.map((row) => toIsoDate(new Date(row.createdAt)))
  const spanDays = dates.length ? daysBetween(dates[0], dates[dates.length - 1]) : 1

  return {
    totalQuantity: rows.reduce((sum, row) => sum + row.quantity, 0),
    totalRevenue: rows.reduce((sum, row) => sum + row.total, 0),
    transactionCount: saleIds.size,
    byProduct: Array.from(byProduct.values()).map((product) => ({
      ...product,
      averageDailyQuantity: product.totalQuantity / spanDays,
    })),
    byDate: Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date)),
  }
}

export async function getTodaySales(): Promise<SalesPeriodSummary> {
  const today = startOfDay(new Date())
  return summarizeSales(await getSalesForRange(today, addDays(today, 1)))
}

export async function getWeekSales(): Promise<SalesPeriodSummary> {
  const today = startOfDay(new Date())
  return summarizeSales(await getSalesForRange(addDays(today, -6), addDays(today, 1)))
}

export async function getMonthSales(): Promise<SalesPeriodSummary> {
  const today = startOfDay(new Date())
  return summarizeSales(await getSalesForRange(addDays(today, -29), addDays(today, 1)))
}
