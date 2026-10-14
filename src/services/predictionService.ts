import { supabase } from './supabaseClient'
import type { ForecastDay, WeatherForecast } from './weatherService'
import type { SaleDetailRow } from './salesService'

export interface PredictionIngredient {
  id: number
  quantity: number
  inventoryProductId: number | null
  stock: number | null
  minimumStock: number | null
}

export interface PredictionProduct {
  id: number
  code: string
  name: string
  category: string
  presentation: string
  ingredients: PredictionIngredient[]
}

export interface DemandPrediction {
  productId: number
  productCode: string
  productName: string
  productCategory: string
  averageSale: number
  last30DaysSales: number
  nextWeekPrediction: number | null
  suggestedProduction: number | null
  availableStock: number | null
  recommendedStock: number | null
  confidence: number
  trend: 'up' | 'down' | 'stable'
  keyFactor: string
  stockRisk: boolean
  growthRate: number
  salesDays: number
  hasEnoughSales: boolean
  hasStockData: boolean
}

export interface PredictionSummary {
  expectedDemand: number
  suggestedProduction: number
  productsWithoutStockData: number
  highGrowthProducts: number
  stockoutRiskProducts: number
  operationalRisk: 'Bajo' | 'Medio' | 'Alto'
}

export interface DemandPredictionResult {
  predictions: DemandPrediction[]
  periodStart: string
  periodEnd: string
  summary: PredictionSummary
  chartData: Array<{
    product: string
    weeklySalesBaseline: number
    nextWeekPrediction: number
    suggestedProduction: number | null
    availableStock: number
  }>
}

function toIsoDate(value: string): string {
  return formatDateLocal(new Date(value))
}

function formatDateLocal(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function round(value: number, decimals = 0): number {
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}

function average(values: number[]): number {
  if (!values.length) return 0
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function standardDeviation(values: number[]): number {
  if (values.length < 2) return 0
  const mean = average(values)
  const variance = average(values.map((value) => (value - mean) ** 2))
  return Math.sqrt(variance)
}

function getWeatherFactor(day: ForecastDay): { factor: number; reason: string } {
  let factor = 1
  const reasons: string[] = []

  if (day.temperatureMax >= 34) {
    factor += 0.24
    reasons.push('calor fuerte')
  } else if (day.temperatureMax >= 32) {
    factor += 0.14
    reasons.push('temperatura alta')
  }

  if (day.rainProbability >= 75) {
    factor -= 0.18
    reasons.push('lluvia alta')
  } else if (day.rainProbability >= 60) {
    factor -= 0.1
    reasons.push('probabilidad de lluvia')
  }

  if (day.humidity >= 88) {
    factor -= 0.04
    reasons.push('humedad elevada')
  }

  return {
    factor: Math.max(0.55, factor),
    reason: reasons[0] || 'clima estable',
  }
}

function getProductCapacity(product: PredictionProduct): number | null {
  if (!product.ingredients.length || product.ingredients.some((ingredient) => (
    ingredient.inventoryProductId === null || ingredient.stock === null || ingredient.quantity <= 0
  ))) return null

  const capacities = product.ingredients
    .filter((ingredient) => ingredient.quantity > 0)
    .map((ingredient) => Math.floor(ingredient.stock / ingredient.quantity))

  return capacities.length ? Math.max(0, Math.min(...capacities)) : null
}

function hasLowIngredientStock(product: PredictionProduct): boolean {
  return product.ingredients.some((ingredient) => (
    ingredient.minimumStock !== null && ingredient.minimumStock > 0
      && ingredient.stock !== null && ingredient.stock <= ingredient.minimumStock
  ))
}

function groupSalesByProduct(sales: SaleDetailRow[]): Map<number, SaleDetailRow[]> {
  const grouped = new Map<number, SaleDetailRow[]>()

  sales.forEach((sale) => {
    const rows = grouped.get(sale.productId) || []
    rows.push(sale)
    grouped.set(sale.productId, rows)
  })

  return grouped
}

function getDailySales(rows: SaleDetailRow[]): Map<string, number> {
  const daily = new Map<string, number>()

  rows.forEach((row) => {
    const date = toIsoDate(row.createdAt)
    daily.set(date, (daily.get(date) || 0) + row.quantity)
  })

  return daily
}

function getSameWeekdayAverage(rows: SaleDetailRow[], targetDate: string): number {
  const targetDay = new Date(`${targetDate}T00:00:00`).getDay()
  const matchingDays = new Map<string, number>()

  rows.forEach((row) => {
    const date = toIsoDate(row.createdAt)
    if (new Date(`${date}T00:00:00`).getDay() === targetDay) {
      matchingDays.set(date, (matchingDays.get(date) || 0) + row.quantity)
    }
  })

  return average(Array.from(matchingDays.values()))
}

function calculateConfidence({
  dataPoints,
  dailyValues,
  hasWeather,
}: {
  dataPoints: number
  dailyValues: number[]
  hasWeather: boolean
}): number {
  const dataScore = Math.min(dataPoints / 30, 1) * 45
  const mean = average(dailyValues)
  const deviation = standardDeviation(dailyValues)
  const consistency = mean > 0 ? Math.max(0, 1 - deviation / mean) : 0
  const consistencyScore = consistency * 35
  const weatherScore = hasWeather ? 20 : 0

  return Math.round(Math.max(10, Math.min(95, dataScore + consistencyScore + weatherScore)))
}

export async function getPredictionProducts(): Promise<PredictionProduct[]> {
  const { data, error } = await supabase
    .from('receta')
    .select(`
      id,
      codigo,
      nombre,
      categoria,
      presentacion,
      ingrediente_receta (
        id,
        cantidad,
        producto_id,
        producto (
          id,
          stock,
          minimo
        )
      )
    `)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(error.message || 'No fue posible obtener productos para prediccion.')
  }

  return (data || []).map((row: any) => ({
    id: Number(row.id),
    code: row.codigo || '',
    name: row.nombre || 'Producto de venta',
    category: row.categoria || 'General',
    presentation: row.presentacion || '',
    ingredients: (row.ingrediente_receta || []).map((ingredient: any) => ({
      id: Number(ingredient.id),
      quantity: Number(ingredient.cantidad || 0),
      inventoryProductId: ingredient.producto_id === null ? null : Number(ingredient.producto_id),
      stock: ingredient.producto?.stock == null ? null : Number(ingredient.producto.stock),
      minimumStock: ingredient.producto?.minimo == null ? null : Number(ingredient.producto.minimo),
    })),
  }))
}

export function generateDemandPredictions({
  forecast,
  sales,
  products,
}: {
  forecast: WeatherForecast | null
  sales: SaleDetailRow[]
  products: PredictionProduct[]
}): DemandPredictionResult {
  const salesByProduct = groupSalesByProduct(sales)
  const weatherDays = forecast?.days?.slice(0, 7) || []
  const periodDays = weatherDays.length
    ? weatherDays
    : Array.from({ length: 7 }, (_, index) => {
      const date = new Date()
      date.setDate(date.getDate() + index)
      return { date: formatDateLocal(date) }
    })
  const weatherByDate = new Map(weatherDays.map((day) => [day.date, day]))
  const hasWeather = weatherDays.length > 0

  const predictions = products.map((product) => {
    const rows = salesByProduct.get(product.id) || []
    const dailySales = getDailySales(rows)
    const dailyValues = Array.from(dailySales.values())
    const last30DaysSales = rows.reduce((sum, row) => sum + row.quantity, 0)
    const averageSale = last30DaysSales / 30
    const availableStock = getProductCapacity(product)
    const stockRisk = hasLowIngredientStock(product)
    const salesDays = dailySales.size
    const hasEnoughSales = salesDays >= 5
    const hasStockData = availableStock !== null
    let weatherReason = hasWeather ? 'clima estable' : 'clima no disponible; solo tendencia histórica'

    const nextWeekPrediction = periodDays.reduce((sum, day) => {
      const weekdayAverage = getSameWeekdayAverage(rows, day.date)
      const baseDemand = weekdayAverage > 0 ? (weekdayAverage * 0.6) + (averageSale * 0.4) : averageSale
      const forecastDay = weatherByDate.get(day.date)
      const weather = forecastDay
        ? getWeatherFactor(forecastDay)
        : { factor: 1, reason: 'clima no disponible; solo tendencia histórica' }
      weatherReason = weather.reason !== 'clima estable' ? weather.reason : weatherReason
      return sum + (baseDemand * weather.factor)
    }, 0)

    const projectedDemand = Math.max(0, round(nextWeekPrediction))
    const recommendedStock = Math.ceil(projectedDemand * 1.15)
    const suggestedProduction = hasEnoughSales && hasStockData
      ? Math.max(0, recommendedStock - availableStock)
      : null
    const growthRate = last30DaysSales > 0
      ? ((projectedDemand - (last30DaysSales / 30 * 7)) / (last30DaysSales / 30 * 7)) * 100
      : 0
    const trend = growthRate > 5 ? 'up' : growthRate < -5 ? 'down' : 'stable'

    return {
      productId: product.id,
      productCode: product.code,
      productName: product.name,
      productCategory: product.category,
      averageSale: round(averageSale, 2),
      last30DaysSales: round(last30DaysSales, 2),
      nextWeekPrediction: hasEnoughSales ? projectedDemand : null,
      suggestedProduction,
      availableStock,
      recommendedStock: hasEnoughSales ? recommendedStock : null,
      confidence: calculateConfidence({
        dataPoints: dailySales.size,
        dailyValues,
        hasWeather,
      }),
      trend,
      keyFactor: !hasEnoughSales
        ? `Historial insuficiente: ${salesDays} de 5 días con ventas requeridos`
        : !hasStockData
          ? 'Stock de ingredientes incompleto; no se sugiere producción'
          : stockRisk
            ? 'Stock bajo en ingredientes de receta'
            : weatherReason,
      stockRisk: stockRisk || (availableStock !== null && availableStock < projectedDemand),
      growthRate: round(growthRate, 1),
      salesDays,
      hasEnoughSales,
      hasStockData,
    }
  })

  const reliablePredictions = predictions.filter((item) => item.hasEnoughSales)
  const expectedDemand = reliablePredictions.reduce((sum, item) => sum + (item.nextWeekPrediction || 0), 0)
  const suggestedProduction = reliablePredictions.reduce((sum, item) => sum + (item.suggestedProduction || 0), 0)
  const productsWithoutStockData = reliablePredictions.filter((item) => !item.hasStockData).length
  const stockoutRiskProducts = reliablePredictions.filter((item) => item.hasStockData && item.stockRisk).length
  const highGrowthProducts = reliablePredictions.filter((item) => item.growthRate > 10).length
  const operationalRisk = stockoutRiskProducts > 2 || suggestedProduction > expectedDemand * 0.6
    ? 'Alto'
    : stockoutRiskProducts > 0 || suggestedProduction > expectedDemand * 0.3
      ? 'Medio'
      : 'Bajo'

  return {
    predictions: predictions.sort((a, b) => (b.nextWeekPrediction || 0) - (a.nextWeekPrediction || 0)),
    periodStart: periodDays[0]?.date || formatDateLocal(new Date()),
    periodEnd: periodDays[periodDays.length - 1]?.date || formatDateLocal(new Date()),
    summary: {
      expectedDemand,
      suggestedProduction,
      productsWithoutStockData,
      highGrowthProducts,
      stockoutRiskProducts,
      operationalRisk,
    },
    chartData: reliablePredictions.map((item) => ({
      product: item.productName,
      weeklySalesBaseline: round(item.averageSale * 7),
      nextWeekPrediction: item.nextWeekPrediction || 0,
      suggestedProduction: item.suggestedProduction,
      availableStock: item.availableStock || 0,
    })),
  }
}
