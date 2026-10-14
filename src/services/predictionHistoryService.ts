import { supabase } from './supabaseClient'
import type { DemandPrediction } from './predictionService'
import type { SaleDetailRow } from './salesService'

interface PredictionHistoryRow {
  id: number
  producto_id: number
  periodo_inicio: string
  periodo_fin: string
  cantidad_predicha: number
  cantidad_real: number | null
}

export interface PredictionAccuracy {
  percentage: number | null
  completedPeriods: number
}

function dateOnly(value: string): string {
  const date = new Date(value)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function todayLocal(): string {
  return dateOnly(new Date().toISOString())
}

export async function savePredictionSnapshot(
  predictions: DemandPrediction[],
  periodStart: string,
  periodEnd: string,
): Promise<void> {
  const startDate = new Date(`${periodStart}T00:00:00`)
  // Keep one comparable forecast snapshot per calendar week.
  if (startDate.getDay() !== 1) return

  const rows = predictions
    .filter((prediction) => prediction.hasEnoughSales && prediction.nextWeekPrediction !== null)
    .map((prediction) => ({
      producto_id: prediction.productId,
      producto_nombre: prediction.productName,
      periodo_inicio: periodStart,
      periodo_fin: periodEnd,
      cantidad_predicha: Number(prediction.nextWeekPrediction),
    }))

  if (!rows.length) return

  const { error } = await supabase
    .from('historial_prediccion_demanda')
    .upsert(rows, {
      onConflict: 'producto_id,periodo_inicio,periodo_fin',
      ignoreDuplicates: true,
    })

  if (error) throw new Error(error.message || 'No fue posible guardar el historial de predicciones.')
}

export async function evaluateCompletedPredictions(
  sales: SaleDetailRow[],
  activeProductIds: number[],
): Promise<void> {
  const today = todayLocal()
  const { data, error } = await supabase
    .from('historial_prediccion_demanda')
    .select('id, producto_id, periodo_inicio, periodo_fin, cantidad_predicha, cantidad_real')
    .is('cantidad_real', null)
    .lt('periodo_fin', today)

  if (error) throw new Error(error.message || 'No fue posible evaluar las predicciones completadas.')

  for (const prediction of (data || []) as PredictionHistoryRow[]) {
    if (!activeProductIds.includes(prediction.producto_id)) continue

    const actual = sales
      .filter((sale) => (
        sale.productId === prediction.producto_id
        && dateOnly(sale.createdAt) >= prediction.periodo_inicio
        && dateOnly(sale.createdAt) <= prediction.periodo_fin
      ))
      .reduce((sum, sale) => sum + sale.quantity, 0)

    const { error: updateError } = await supabase
      .from('historial_prediccion_demanda')
      .update({ cantidad_real: actual, evaluado_at: new Date().toISOString() })
      .eq('id', prediction.id)

    if (updateError) throw new Error(updateError.message || 'No fue posible registrar el resultado real.')
  }
}

export async function getPredictionAccuracy(): Promise<PredictionAccuracy> {
  const { data, error } = await supabase
    .from('historial_prediccion_demanda')
    .select('periodo_inicio, cantidad_predicha, cantidad_real')
    .not('cantidad_real', 'is', null)

  if (error) throw new Error(error.message || 'No fue posible consultar la precisión histórica.')

  const rows = (data || []) as Array<Pick<PredictionHistoryRow, 'periodo_inicio' | 'cantidad_predicha' | 'cantidad_real'>>
  const completedPeriods = new Set(rows.map((row) => row.periodo_inicio)).size
  if (completedPeriods < 4) return { percentage: null, completedPeriods }

  const actualTotal = rows.reduce((sum, row) => sum + Number(row.cantidad_real || 0), 0)
  if (actualTotal <= 0) return { percentage: null, completedPeriods }

  const absoluteError = rows.reduce((sum, row) => (
    sum + Math.abs(Number(row.cantidad_predicha || 0) - Number(row.cantidad_real || 0))
  ), 0)

  return {
    percentage: Math.max(0, Math.round((1 - absoluteError / actualTotal) * 1000) / 10),
    completedPeriods,
  }
}
