import type { WeatherForecast } from './weatherService'
import type { SmartRecommendation } from './recommendationService'
import type { DemandPredictionResult } from './predictionService'
import {
  getHistoricalSales,
  getMonthSales,
  getTodaySales,
  getWeekSales,
  summarizeSales,
  type SalesPeriodSummary,
} from './salesService'

export interface AiStatistics {
  todaySales: SalesPeriodSummary
  weekSales: SalesPeriodSummary
  monthSales: SalesPeriodSummary
  previousMonthSales: SalesPeriodSummary
  topProduct: string
  lowestMovementProduct: string
  growthVsPreviousPeriod: number
  weeklyAverageTemperature: number
  recommendationCount: number
  expectedDemand: number
  suggestedProduction: number
  highGrowthProducts: number
  stockoutRiskProducts: number
  operationalRisk: 'Bajo' | 'Medio' | 'Alto'
}

function addDays(date: Date, days: number): Date {
  const copy = new Date(date)
  copy.setDate(copy.getDate() + days)
  return copy
}

function getProductName(summary: SalesPeriodSummary, sortDirection: 'asc' | 'desc'): string {
  const products = [...summary.byProduct]
  products.sort((a, b) => (
    sortDirection === 'asc'
      ? a.totalQuantity - b.totalQuantity
      : b.totalQuantity - a.totalQuantity
  ))

  return products[0]?.productName || 'Sin ventas registradas'
}

function getGrowth(current: number, previous: number): number {
  if (previous <= 0) return current > 0 ? 100 : 0
  return ((current - previous) / previous) * 100
}

export async function getAiStatistics({
  forecast,
  recommendations,
  predictionResult,
}: {
  forecast: WeatherForecast | null
  recommendations: SmartRecommendation[]
  predictionResult: DemandPredictionResult
}): Promise<AiStatistics> {
  const [todaySales, weekSales, monthSales, previousRows] = await Promise.all([
    getTodaySales(),
    getWeekSales(),
    getMonthSales(),
    getHistoricalSales(60),
  ])
  const now = new Date()
  const previousStart = addDays(now, -59)
  const previousEnd = addDays(now, -30)
  const previousMonthSales = summarizeSales(previousRows.filter((row) => {
    const createdAt = new Date(row.createdAt)
    return createdAt >= previousStart && createdAt <= previousEnd
  }))
  const weeklyAverageTemperature = forecast?.days?.length
    ? forecast.days.reduce((sum, day) => sum + day.temperatureMax, 0) / forecast.days.length
    : 0

  return {
    todaySales,
    weekSales,
    monthSales,
    previousMonthSales,
    topProduct: getProductName(monthSales, 'desc'),
    lowestMovementProduct: getProductName(monthSales, 'asc'),
    growthVsPreviousPeriod: getGrowth(monthSales.totalRevenue, previousMonthSales.totalRevenue),
    weeklyAverageTemperature,
    recommendationCount: recommendations.length,
    expectedDemand: predictionResult.summary.expectedDemand,
    suggestedProduction: predictionResult.summary.suggestedProduction,
    highGrowthProducts: predictionResult.summary.highGrowthProducts,
    stockoutRiskProducts: predictionResult.summary.stockoutRiskProducts,
    operationalRisk: predictionResult.summary.operationalRisk,
  }
}
