import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import WeatherCard from '../WeatherCard'
import { useWeather } from '../../hooks/useWeather'
import { buildRecommendationPanelData } from '../../services/recommendationService'
import { getDateRange, getHistoricalSales } from '../../services/salesService'
import { generateDemandPredictions, getPredictionProducts } from '../../services/predictionService'
import { evaluateCompletedPredictions, getPredictionAccuracy, savePredictionSnapshot } from '../../services/predictionHistoryService'
import { getAiStatistics } from '../../services/statisticsService'
import { BarChart3, Bot, CloudSun, FileDown, Lightbulb, RefreshCw, Sparkles, TrendingUp } from 'lucide-react'
import { toast } from 'sonner'
import Pagination from '../../components/Pagination'
import SortableHeader from '../../components/SortableHeader'
import ReporteModal from '../../components/ReporteModal'
import { generarReporteModulo } from '../../utils/moduloExport'
import { useTableSort, sortRows } from '../../hooks/useTableSort'
import { Chatbot } from '../Chatbot'

const WEATHER_LOCATION = {
  latitude: Number(import.meta.env.VITE_WEATHER_LATITUDE || 14.478381 ),
  longitude: Number(import.meta.env.VITE_WEATHER_LONGITUDE || -90.620385),
}

const EMPTY_PREDICTION_RESULT = {
  predictions: [],
  summary: {
    expectedDemand: 0,
    suggestedProduction: 0,
    productsWithoutStockData: 0,
    highGrowthProducts: 0,
    stockoutRiskProducts: 0,
    operationalRisk: 'Bajo',
  },
  chartData: [],
}
const EMPTY_ACCURACY = { percentage: null, completedPeriods: 0 }
function IAPredictiva() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [predictionResult, setPredictionResult] = useState(EMPTY_PREDICTION_RESULT)
  const [aiStats, setAiStats] = useState(null)
  const [predictionLoading, setPredictionLoading] = useState(true)
  const [predictionError, setPredictionError] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(5)
  const [reporteOpen, setReporteOpen] = useState(false)
  const [generandoReporte, setGenerandoReporte] = useState(false)
  const [predictionAccuracy, setPredictionAccuracy] = useState(EMPTY_ACCURACY)
  const [accuracyHistoryError, setAccuracyHistoryError] = useState(false)
  const {
    forecast,
    loading: weatherLoading,
    error: weatherError,
    refresh,
  } = useWeather(WEATHER_LOCATION)

  const datosClimaticos = useMemo(() => forecast?.days || [], [forecast])
  const currentWeather = forecast?.current || null

  const recommendationPanel = useMemo(
    () => buildRecommendationPanelData(forecast),
    [forecast],
  )
  const recomendaciones = recommendationPanel.recommendations
  const recommendationSummary = recommendationPanel.summary
  const recomendacionesVisibles = useMemo(() => (
    priorityFilter === 'all'
      ? recomendaciones
      : recomendaciones.filter((item) => item.prioridad === priorityFilter)
  ), [recomendaciones, priorityFilter])

  const forecastStats = useMemo(() => {
    const days = datosClimaticos

    if (!days.length) {
      return {
        avgTemperature: 0,
        maxTemperature: 0,
        avgRain: 0,
        avgHumidity: 0,
        demandFactor: 1,
      }
    }

    const avgTemperature = days.reduce((sum, day) => sum + day.temperatureMax, 0) / days.length
    const maxTemperature = Math.max(...days.map((day) => day.temperatureMax))
    const avgRain = days.reduce((sum, day) => sum + day.rainProbability, 0) / days.length
    const avgHumidity = days.reduce((sum, day) => sum + day.humidity, 0) / days.length
    const heatFactor = avgTemperature > 32 ? 1 + Math.min((avgTemperature - 32) * 0.06, 0.35) : 1
    const rainFactor = avgRain > 65 ? 0.9 : 1

    return {
      avgTemperature,
      maxTemperature,
      avgRain,
      avgHumidity,
      demandFactor: heatFactor * rainFactor,
    }
  }, [datosClimaticos])

  const loadPredictionData = useCallback(async () => {
    setPredictionLoading(true)
    setPredictionError('')

    try {
      const [products, historySales] = await Promise.all([
        getPredictionProducts(),
        getHistoricalSales(90),
      ])

      const salesRange = getDateRange(30)
      const sales = historySales.filter((sale) => sale.createdAt >= salesRange.from && sale.createdAt < salesRange.to)

      const result = generateDemandPredictions({ forecast, sales, products })
      setPredictionResult(result)

      try {
        await evaluateCompletedPredictions(historySales, products.map((product) => product.id))
        if (!weatherLoading && (forecast || weatherError)) {
          await savePredictionSnapshot(result.predictions, result.periodStart, result.periodEnd)
        }
        setPredictionAccuracy(await getPredictionAccuracy())
        setAccuracyHistoryError(false)
      } catch {
        setPredictionAccuracy(EMPTY_ACCURACY)
        setAccuracyHistoryError(true)
      }

      try {
        const stats = await getAiStatistics({
          forecast,
          recommendations: recomendaciones,
          predictionResult: result,
        })
        setAiStats(stats)
      } catch {
        setAiStats(null)
      }
    } catch (error) {
      setPredictionError(error.message || 'No fue posible calcular las predicciones.')
    } finally {
      setPredictionLoading(false)
    }
  }, [forecast, recomendaciones, weatherLoading, weatherError])

  useEffect(() => {
    loadPredictionData()
  }, [loadPredictionData])

  const prediccionesDemanda = useMemo(() => (
    predictionResult.predictions.map((item) => ({
      producto: item.productName,
      ventaRealSemanaAnterior: Math.round(item.averageSale * 7),
      prediccionSemana: item.nextWeekPrediction,
      tendencia: item.trend,
      confianza: item.confidence,
      factorClave: item.keyFactor,
      stockRisk: item.stockRisk,
      sugerida: item.suggestedProduction,
      salesDays: item.salesDays,
      hasEnoughSales: item.hasEnoughSales,
      hasStockData: item.hasStockData,
    }))
  ), [predictionResult])

  const prediccionSort = useTableSort(null)

  const sortedPredicciones = sortRows(prediccionesDemanda, prediccionSort.sortBy, prediccionSort.sortDir, (pred) => {
    switch (prediccionSort.sortBy) {
      case 'producto': return pred.producto
      case 'ventaReal': return Number(pred.ventaRealSemanaAnterior ?? 0)
      case 'prediccion': return Number(pred.prediccionSemana ?? 0)
      case 'confianza': return Number(pred.confianza ?? 0)
      default: return null
    }
  })

  const totalPages = Math.max(1, Math.ceil(sortedPredicciones.length / pageSize))
  const paginatedPredicciones = sortedPredicciones.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  useEffect(() => {
    setCurrentPage(1)
  }, [prediccionesDemanda, prediccionSort.sortBy, prediccionSort.sortDir, pageSize])

  const tendenciasReporte = useMemo(() => {
    const labels = {
      up: 'Al alza',
      down: 'A la baja',
      stable: 'Estable',
    }
    const counts = {}
    prediccionesDemanda.filter((pred) => pred.hasEnoughSales).forEach((pred) => {
      const tendencia = pred.tendencia || 'stable'
      counts[labels[tendencia] || 'Estable'] = (counts[labels[tendencia] || 'Estable'] || 0) + 1
    })

    const options = Object.keys(counts).map((tendencia) => ({
      value: tendencia,
      label: tendencia,
      count: counts[tendencia],
    }))

    return [{ value: '', label: 'Todas las estimaciones confiables', count: prediccionesDemanda.filter((pred) => pred.hasEnoughSales).length }, ...options]
  }, [prediccionesDemanda])

  const handleGenerarReportePredicciones = async (tendencia = '') => {
    try {
      setGenerandoReporte(true)
      const labels = {
        up: 'Al alza',
        down: 'A la baja',
        stable: 'Estable',
      }
      const reliablePredictions = prediccionesDemanda.filter((pred) => pred.hasEnoughSales)
      const rows = tendencia
        ? reliablePredictions.filter((pred) => (labels[pred.tendencia] || 'Estable') === tendencia)
        : reliablePredictions

      const columns = [
        { key: 'producto', label: 'PRODUCTO', width: 38, align: 'left' },
        { key: 'ventaReal', label: 'PROMEDIO SEMANAL (30D)', width: 34, align: 'center' },
        { key: 'prediccion', label: 'ESTIMACIÓN (7D)', width: 28, align: 'center' },
        { key: 'tendencia', label: 'TENDENCIA', width: 24, align: 'center' },
        { key: 'confianza', label: 'CONFIANZA ESTIMADA', width: 32, align: 'center' },
        { key: 'factorClave', label: 'FACTOR CLAVE', width: 46, align: 'left' },
      ]

      await generarReporteModulo({
        fileName: 'reporte_estimaciones_demanda.pdf',
        title: 'REPORTE DE ESTIMACIONES DE DEMANDA (REGLAS)',
        columns,
        rows: rows.map((pred) => {
          const diferencia = (pred.prediccionSemana ?? 0) - pred.ventaRealSemanaAnterior
          const porcentaje = pred.ventaRealSemanaAnterior > 0 && pred.prediccionSemana !== null
            ? ((diferencia / pred.ventaRealSemanaAnterior) * 100).toFixed(1)
            : null
          return {
            producto: pred.producto,
            ventaReal: String(pred.ventaRealSemanaAnterior ?? 0),
            prediccion: String(pred.prediccionSemana ?? 'Datos insuficientes'),
            tendencia: `${pred.tendencia === 'up' ? '↗ Al alza' : pred.tendencia === 'down' ? '↘ A la baja' : '→ Estable'} (${porcentaje}%)`,
            confianza: `Estimación ${pred.confianza}%`,
            factorClave: pred.factorClave || '-',
          }
        }),
        totalLabel: 'TOTAL DE PREDICCIONES',
        totalValue: rows.length,
        filterLabel: tendencia || 'Todas',
        note: forecast
          ? 'Estimaciones por reglas con ventas reales, condiciones climáticas de los próximos 7 días y datos de stock. La confianza es heurística y no equivale a precisión histórica.'
          : 'Estimaciones por reglas basadas solo en ventas históricas; el pronóstico del clima no está disponible. La confianza es heurística y no equivale a precisión histórica.',
      })
      toast.success('Reporte de predicciones generado correctamente.')
      setReporteOpen(false)
    } catch (error) {
      toast.error(error.message || 'No fue posible generar el reporte.')
    } finally {
      setGenerandoReporte(false)
    }
  }

  const historicoVentas = useMemo(() => {
    const chartData = predictionResult.chartData

    if (!chartData.length) {
      return []
    }

    return chartData.map((item, index) => ({
      semana: item.product,
      ventaReal: item.weeklySalesBaseline,
      prediccionIA: item.nextWeekPrediction,
      sugerida: item.suggestedProduction,
      temperatura: index === 0 ? Math.round(forecastStats.maxTemperature || currentWeather?.temperature || 0) : undefined,
    }))
  }, [predictionResult, forecastStats, currentWeather])

  const kpis = useMemo(() => {
    const ventasSemanaActual = aiStats?.weekSales?.totalQuantity ?? 0
    const hasReliablePredictions = predictionResult.predictions.some((item) => item.hasEnoughSales)
    const prediccionProximaSemana = hasReliablePredictions ? predictionResult.summary.expectedDemand : null
    const incrementoEsperado = hasReliablePredictions && ventasSemanaActual > 0
      ? ((predictionResult.summary.expectedDemand / ventasSemanaActual) - 1) * 100
      : null

    return {
      precisionModelo: predictionAccuracy.percentage,
      ventasSemanaActual,
      prediccionProximaSemana,
      incrementoEsperado,
      cobertura: predictionResult.predictions.length
        ? predictionResult.predictions.filter((item) => item.hasEnoughSales).length
        : 0,
      alertasActivas: recomendaciones.filter((item) => item.prioridad !== 'baja').length,
    }
  }, [aiStats, predictionResult, predictionAccuracy, recomendaciones])

  const getTipoIcon = (tipo) => {
    switch (tipo) {
      case 'produccion': return '🏭'
      case 'optimizacion': return '⚡'
      case 'inventario': return '📦'
      case 'marketing': return '📢'
      case 'logistica': return '🚚'
      default: return '💡'
    }
  }

  const getRecommendationIcon = (icono, tipo) => {
    switch (icono) {
      case 'thermometer': return '🌡️'
      case 'factory': return '🏭'
      case 'package': return '📦'
      case 'trending-up': return '📈'
      case 'snowflake': return '❄️'
      case 'truck': return '🚚'
      case 'cloud-rain': return '🌧️'
      case 'megaphone': return '📢'
      case 'chart-down': return '📉'
      case 'check-circle': return '✅'
      default: return getTipoIcon(tipo)
    }
  }

  const getSmartPriorityColor = (prioridad) => {
    switch (prioridad) {
      case 'Alta': return 'bg-red-100 text-red-700 border-red-300'
      case 'Media': return 'bg-yellow-100 text-yellow-700 border-yellow-300'
      case 'Baja': return 'bg-green-100 text-green-700 border-green-300'
      default: return 'bg-gray-100 text-gray-700 border-gray-300'
    }
  }

  const getImpactColor = (impacto) => {
    switch (impacto) {
      case 'Alto': return 'text-red-700 bg-red-50'
      case 'Medio': return 'text-yellow-700 bg-yellow-50'
      case 'Bajo': return 'text-green-700 bg-green-50'
      default: return 'text-gray-700 bg-gray-50'
    }
  }

  const getBorderColor = (prioridad) => {
    switch (prioridad) {
      case 'Alta': return 'border-red-500'
      case 'Media': return 'border-yellow-500'
      case 'Baja': return 'border-green-500'
      default: return 'border-cyan-500'
    }
  }

  const forecastChartData = datosClimaticos.map((day) => ({
    fecha: day.label,
    max: Math.round(day.temperatureMax),
    min: Math.round(day.temperatureMin),
    lluvia: Math.round(day.rainProbability),
    humedad: Math.round(day.humidity),
  }))

  return (
<div className="min-h-full bg-slate-50/80 p-4 md:p-6 lg:p-8">
      <div className="relative mb-6 overflow-hidden rounded-3xl border border-cyan-200 bg-gradient-to-br from-cyan-100 via-sky-50 to-blue-100 px-5 py-6 text-slate-900 shadow-sm sm:px-8 sm:py-8">
        <div className="pointer-events-none absolute -right-12 -top-20 h-64 w-64 rounded-full bg-cyan-300/45 blur-3xl" />
        <div className="pointer-events-none absolute bottom-[-6rem] right-1/3 h-48 w-48 rounded-full bg-blue-300/40 blur-3xl" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-white/80 px-3 py-1.5 text-xs font-medium text-cyan-800">
              <Sparkles size={14} /> Analisis operativo
            </div>
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Inteligencia Artificial Predictiva</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">Pronostico, demanda y recomendaciones para planificar la operacion con datos actuales.</p>
          </div>
          <div className="flex items-center gap-2 self-start rounded-xl border border-cyan-200 bg-white/80 px-3 py-2 text-xs text-slate-700 sm:self-auto">
            <span className={`h-2 w-2 rounded-full ${weatherLoading ? 'animate-pulse bg-amber-500' : forecast ? 'bg-emerald-500' : 'bg-slate-400'}`} />
            {weatherLoading ? 'Actualizando datos' : forecast ? 'Datos conectados' : 'Clima sin actualizar'}
          </div>
        </div>
      </div>

      {weatherError && (
        <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded">
          <p className="text-sm text-red-800">
            No se pudieron actualizar los datos climáticos: {weatherError}
          </p>
        </div>
      )}

      <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
        <nav className="flex gap-2 overflow-x-auto" aria-label="Apartados de IA predictiva">
          {[
            { id: 'dashboard', label: 'Resumen', icon: BarChart3 },
            { id: 'clima', label: 'Clima', icon: CloudSun },
            { id: 'predicciones', label: 'Predicciones', icon: TrendingUp },
            { id: 'recomendaciones', label: 'Recomendaciones', icon: Lightbulb },
            { id: 'chatbot', label: 'Asistente', icon: Bot },
          ].map((tab) => {
            const Icon = tab.icon
            const selected = activeTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                aria-current={selected ? 'page' : undefined}
                className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-cyan-500 ${selected ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-blue-900/15' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'}`}
              >
                <Icon size={17} strokeWidth={2} />
                {tab.label}
              </button>
            )
          })}
        </nav>
      </div>

      {activeTab === 'dashboard' && (
        <div>
          <div className="grid grid-cols-1 gap-4 mb-6 sm:grid-cols-2 2xl:grid-cols-6">
            <div className="group rounded-2xl border border-purple-200/80 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl">🎯</span>
                <span className="text-xs font-semibold text-purple-700 bg-purple-200 px-2 py-1 rounded-full">
                  Precisión medida
                </span>
              </div>
<p className="text-xl md:text-3xl font-bold text-purple-700">{kpis.precisionModelo === null ? '—' : `${kpis.precisionModelo}%`}</p>
              <p className="text-xs text-purple-600 mt-1">
                {kpis.precisionModelo === null
                  ? predictionAccuracy.completedPeriods < 4
                    ? `Midiendo · ${predictionAccuracy.completedPeriods}/4 periodos completos`
                    : 'Sin ventas reales suficientes para medir'
                  : 'Precisión histórica (1 − WAPE)'}
              </p>
            </div>

            <div className="group rounded-2xl border border-blue-200/80 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl">📈</span>
                <span className="text-xs font-semibold text-blue-700 bg-blue-200 px-2 py-1 rounded-full">
                  Actual
                </span>
              </div>
              <p className="text-xl md:text-3xl font-bold text-blue-700">{kpis.ventasSemanaActual}</p>
              <p className="text-xs text-blue-600 mt-1">Ventas Sem. Actual</p>
            </div>

            <div className="group rounded-2xl border border-emerald-200/80 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl">🔮</span>
                <span className="text-xs font-semibold text-green-700 bg-green-200 px-2 py-1 rounded-full">
                  Predicción
                </span>
              </div>
              <p className="text-xl md:text-3xl font-bold text-green-700">{kpis.prediccionProximaSemana ?? '—'}</p>
              <p className="text-xs text-green-600 mt-1">Próxima Semana</p>
            </div>

            <div className="group rounded-2xl border border-orange-200/80 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl">📊</span>
                <span className="text-xs font-semibold text-orange-700 bg-orange-200 px-2 py-1 rounded-full">
                  Tendencia
                </span>
              </div>
              <p className="text-xl md:text-3xl font-bold text-orange-700">
                {kpis.incrementoEsperado === null ? '—' : `${kpis.incrementoEsperado >= 0 ? '+' : ''}${kpis.incrementoEsperado.toFixed(1)}%`}
              </p>
              <p className="text-xs text-orange-600 mt-1">Incremento Esperado</p>
            </div>

            <div className="group rounded-2xl border border-cyan-100/80 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl">⚡</span>
                <span className="text-xs font-semibold text-cyan-700 bg-cyan-200 px-2 py-1 rounded-full">
                  Cobertura
                </span>
              </div>
              <p className="text-xl md:text-3xl font-bold text-cyan-700">{kpis.cobertura}/{predictionResult.predictions.length}</p>
              <p className="text-xs text-cyan-600 mt-1">Productos con ventas suficientes</p>
            </div>

            <div className="group rounded-2xl border border-rose-200/80 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl">🔔</span>
                <span className="text-xs font-semibold text-red-700 bg-red-200 px-2 py-1 rounded-full">
                  Alertas
                </span>
              </div>
              <p className="text-xl md:text-3xl font-bold text-red-700">{kpis.alertasActivas}</p>
              <p className="text-xs text-red-600 mt-1">Pendientes</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 md:p-6 mb-6">
            <div className="flex flex-col gap-4 mb-5 xl:flex-row xl:items-start xl:justify-between">
              <h3 className="text-lg font-semibold text-gray-800">Estimación de demanda vs promedio histórico</h3>
              <div className="flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-blue-500 rounded"></div>
                  <span className="text-gray-600">Promedio semanal (últimos 30 días)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-green-500 rounded"></div>
                  <span className="text-gray-600">Predicción (7 días)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-purple-500 rounded"></div>
                  <span className="text-gray-600">Producción sugerida</span>
                </div>
              </div>
            </div>

            <div className="h-72">
              {historicoVentas.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={historicoVentas}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="semana" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="ventaReal" name="Promedio semanal (30 días)" fill="#3b82f6" />
                    <Bar dataKey="prediccionIA" name="Estimación por reglas (7 días)" fill="#22c55e" />
                    <Bar dataKey="sugerida" name="Producción sugerida" fill="#a855f7" />
                  </ComposedChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-sm text-gray-500">
                  {predictionLoading
                    ? 'Calculando estimaciones...'
                    : predictionResult.predictions.length
                      ? 'No hay productos con ventas en cinco días distintos para estimar demanda.'
                      : 'Sin datos de ventas o recetas para estimar demanda.'}
                </div>
              )}
            </div>

            <div className="mt-4 bg-green-50 border-l-4 border-green-500 p-3 rounded">
              <p className="text-sm text-green-800">
                <span className="font-bold">✅ Fase 1 activa:</span> las decisiones usan clima real de Open-Meteo y reglas de negocio preparadas para una futura capa de Machine Learning.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">🔔 Acciones Recomendadas Prioritarias</h3>
            <div className="space-y-3">
              {weatherLoading && (
                <div className="py-6 text-center text-sm text-gray-500">Cargando recomendaciones climáticas...</div>
              )}
              {!weatherLoading && recomendaciones.filter((item) => item.prioridad === 'Alta').map((rec) => (
                <div key={rec.id} className="bg-red-50 border-l-4 border-red-500 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <span className="text-3xl">{getRecommendationIcon(rec.icono, rec.tipo)}</span>
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-semibold text-gray-900">{rec.titulo}</h4>
                        <span className="text-xs bg-red-200 text-red-700 px-2 py-1 rounded-full font-semibold">
                          URGENTE
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 mb-2">{rec.descripcion}</p>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-600">📅 {rec.fecha}</span>
                        <span className="font-semibold text-green-600">{rec.impacto}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {!weatherLoading && recomendaciones.filter((item) => item.prioridad === 'Alta').length === 0 && (
                <div className="py-6 text-center text-sm text-gray-500">
                  {!forecast ? 'Sin pronóstico climático para generar alertas.' : 'No hay acciones urgentes con el clima actual.'}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'clima' && (
        <div>
          <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-800">Pronóstico del Tiempo - Próximos 7 días</h3>
              <p className="text-sm text-gray-600">Datos obtenidos de Open-Meteo en tiempo real</p>
            </div>
            <button
              onClick={refresh}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:shadow-md focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2"
            >
              <><RefreshCw size={16} aria-hidden="true" /> Actualizar pronostico</>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
            <WeatherCard weather={currentWeather} loading={weatherLoading} error={weatherError} />

            <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 shadow-sm p-4 md:p-6 border-t-4 border-cyan-500">
              <h4 className="font-semibold text-gray-800 mb-4">📊 Temperatura y lluvia semanal</h4>
              <div className="h-72">
                {forecastChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={forecastChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="fecha" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="max" name="Máx. °C" stroke="#f97316" strokeWidth={2} />
                      <Line type="monotone" dataKey="min" name="Mín. °C" stroke="#3b82f6" strokeWidth={2} />
                      <Line type="monotone" dataKey="lluvia" name="Lluvia %" stroke="#06b6d4" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-sm text-gray-500">
                    Sin pronóstico disponible.
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 mb-6 sm:grid-cols-2 xl:grid-cols-4">
            {weatherLoading && (
              <div className="col-span-full py-8 text-center text-sm text-gray-500">Cargando pronóstico...</div>
            )}
            {!weatherLoading && datosClimaticos.map((dia) => (
<div key={dia.date} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 md:p-6 border-t-4 border-cyan-500">
                <div className="text-center">
                  <p className="text-sm font-semibold text-gray-700 mb-2">{dia.label}</p>
                  <div className="text-6xl mb-3">{dia.icon}</div>
                  <p className="text-xs text-gray-500 mb-3">{dia.weatherState}</p>

                  <div className="mb-4">
                    <p className="text-3xl md:text-4xl font-bold text-gray-800">{Math.round(dia.temperatureMax)}°C</p>
                    <p className="text-sm text-gray-500">Máxima</p>
                    <p className="text-xl md:text-2xl font-semibold text-gray-600 mt-1">{Math.round(dia.temperatureMin)}°C</p>
                    <p className="text-xs text-gray-500">Mínima</p>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between items-center bg-blue-50 px-3 py-2 rounded">
                      <span className="text-gray-600">💧 Lluvia:</span>
                      <span className="font-semibold text-blue-700">{Math.round(dia.rainProbability)}%</span>
                    </div>
                    <div className="flex justify-between items-center bg-cyan-50 px-3 py-2 rounded">
                      <span className="text-gray-600">💨 Humedad:</span>
                      <span className="font-semibold text-cyan-700">{Math.round(dia.humidity)}%</span>
                    </div>
                    <div className="flex justify-between items-center bg-gray-50 px-3 py-2 rounded">
                      <span className="text-gray-600">Viento:</span>
                      <span className="font-semibold text-gray-700">{Math.round(dia.windSpeed)} km/h</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

<div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 md:p-6">
            <h4 className="font-semibold text-gray-800 mb-3">📊 Análisis de Correlación Clima-Ventas</h4>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">🌡️</span>
                  <span className="text-sm font-medium text-gray-700">Temperatura máxima</span>
                </div>
                <p className="text-sm text-gray-600 mb-2">Mayor pronóstico:</p>
                <p className="text-2xl font-bold text-orange-700">{datosClimaticos.length ? `${forecastStats.maxTemperature.toFixed(1)}°C` : 'Sin datos'}</p>
                <p className="text-xs text-orange-600">Open-Meteo</p>
              </div>

              <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">☀️</span>
                  <span className="text-sm font-medium text-gray-700">Demanda esperada</span>
                </div>
                <p className="text-sm text-gray-600 mb-2">Factor climático:</p>
                <p className="text-2xl font-bold text-blue-700">{datosClimaticos.length ? `${((forecastStats.demandFactor - 1) * 100).toFixed(1)}%` : 'Sin datos'}</p>
                <p className="text-xs text-blue-600">calculado por reglas</p>
              </div>

              <div className="bg-gray-50 border-2 border-gray-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">🌧️</span>
                  <span className="text-sm font-medium text-gray-700">Lluvia promedio</span>
                </div>
                <p className="text-sm text-gray-600 mb-2">Próximos 7 días:</p>
                <p className="text-2xl font-bold text-gray-700">{datosClimaticos.length ? `${forecastStats.avgRain.toFixed(0)}%` : 'Sin datos'}</p>
                <p className="text-xs text-gray-600">probabilidad máxima diaria</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'predicciones' && (
        <div>
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">🔮 Predicciones de Demanda Semanal</h3>
        <p className="text-sm text-gray-600">
          {forecast
            ? 'Estimación por reglas con ventas de 30 días, clima y stock disponible; no es un modelo de IA entrenado.'
            : 'Estimación por reglas con ventas de 30 días; clima no disponible. No es un modelo de IA entrenado.'}
        </p>
            </div>

      {accuracyHistoryError && (
        <div className="mb-4 bg-amber-50 border-l-4 border-amber-500 p-4 rounded text-sm text-amber-900">
          No se pudo consultar el historial de precisión. Verifica que esté aplicada la migración 048.
        </div>
      )}
            <button
              type="button"
              onClick={() => setReporteOpen(true)}
              className="self-start inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              <FileDown size={16} aria-hidden="true" />
              Reporte
            </button>
          </div>

          {predictionError && !predictionLoading && (
            <div className="mb-4 bg-red-50 border-l-4 border-red-500 p-4 rounded">
              <p className="text-sm text-red-800">
                No se pudieron calcular las predicciones: {predictionError}
              </p>
            </div>
          )}

<div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 md:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase"><SortableHeader label="Producto" sortKey="producto" sortBy={prediccionSort.sortBy} sortDir={prediccionSort.sortDir} onSort={prediccionSort.toggle} className="text-gray-700" /></th>
      <th className="px-4 md:px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase hidden md:table-cell"><SortableHeader label="Promedio semanal (30 días)" sortKey="ventaReal" sortBy={prediccionSort.sortBy} sortDir={prediccionSort.sortDir} onSort={prediccionSort.toggle} align="center" className="text-gray-700" /></th>
                  <th className="px-4 md:px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase"><SortableHeader label="Predicción (Próxima Sem.)" sortKey="prediccion" sortBy={prediccionSort.sortBy} sortDir={prediccionSort.sortDir} onSort={prediccionSort.toggle} align="center" className="text-gray-700" /></th>
                  <th className="px-4 md:px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase hidden sm:table-cell">Tendencia</th>
                  <th className="px-4 md:px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase"><SortableHeader label="Confianza estimada" sortKey="confianza" sortBy={prediccionSort.sortBy} sortDir={prediccionSort.sortDir} onSort={prediccionSort.toggle} align="center" className="text-gray-700" /></th>
                  <th className="px-4 md:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase hidden lg:table-cell">Factor Clave</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {predictionLoading && (
                  <tr>
                    <td colSpan={6} className="px-4 md:px-6 py-10 text-center text-sm text-gray-500">
                      Calculando predicciones con datos reales...
                    </td>
                  </tr>
                )}
                {!predictionLoading && prediccionesDemanda.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 md:px-6 py-10 text-center text-sm text-gray-500">
                      {predictionError
                        ? predictionError
                        : 'No hay recetas o ventas registradas para generar predicciones.'}
                    </td>
                  </tr>
                )}
                {!predictionLoading && paginatedPredicciones.map((pred) => {
                  const diferencia = (pred.prediccionSemana ?? 0) - pred.ventaRealSemanaAnterior
                  const porcentaje = pred.ventaRealSemanaAnterior > 0 && pred.prediccionSemana !== null
                    ? ((diferencia / pred.ventaRealSemanaAnterior) * 100).toFixed(1)
                    : null
                  const esEstable = pred.tendencia === 'stable'

                  return (
                    <tr key={pred.producto} className="hover:bg-cyan-50/40">
                      <td className="px-4 md:px-6 py-4 text-sm font-medium text-gray-900">{pred.producto}</td>
                      <td className="px-4 md:px-6 py-4 text-center text-lg font-semibold text-gray-700 hidden md:table-cell">{pred.ventaRealSemanaAnterior}</td>
                      <td className="px-4 md:px-6 py-4 text-center">
                        <span className="text-lg font-bold text-cyan-700">
                          {pred.hasEnoughSales ? pred.prediccionSemana : 'Sin datos suficientes'}
                        </span>
                        {porcentaje !== null && (
                          <span className={`block text-xs font-semibold ${esEstable ? 'text-gray-500' : pred.tendencia === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                            {esEstable ? '→' : pred.tendencia === 'up' ? '↗' : '↘'} {porcentaje}%
                          </span>
                        )}
                      </td>
                      <td className="px-4 md:px-6 py-4 text-center hidden sm:table-cell">
                        <span className={`text-3xl ${esEstable ? 'text-gray-400' : pred.tendencia === 'up' ? 'text-green-500' : 'text-red-500'}`}>
                          {!pred.hasEnoughSales ? '—' : esEstable ? '➡️' : pred.tendencia === 'up' ? '📈' : '📉'}
                        </span>
                      </td>
                      <td className="px-4 md:px-6 py-4 text-center">
                        <div className="flex flex-col items-center">
                          <span
                            className="text-sm font-bold text-purple-700"
                            title="Indicador heurístico basado en cantidad y regularidad de ventas y disponibilidad de clima; no es precisión medida."
                          >
                            {pred.hasEnoughSales ? `Estimado ${pred.confianza}%` : `Insuficiente · ${pred.salesDays}/5 días`}
                          </span>
                          <div className="w-20 bg-gray-200 rounded-full h-2 mt-1">
                            <div
                              className="bg-purple-500 h-2 rounded-full"
                              style={{ width: `${pred.hasEnoughSales ? pred.confianza : 0}%` }}
                            ></div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 md:px-6 py-4 text-sm text-gray-600 hidden lg:table-cell">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">🎯</span>
                          <span>{pred.factorClave}{pred.hasEnoughSales && !pred.hasStockData ? ' · Sin sugerencia de producción por datos de stock incompletos' : ''}</span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
</tbody>
            </table>
          </div>
          <Pagination
            page={currentPage}
            totalPages={totalPages}
            onChange={setCurrentPage}
            pageSize={pageSize}
            onPageSizeChange={setPageSize}
            totalItems={sortedPredicciones.length}
          />

          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm md:p-6">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-4xl">📈</span>
                <div>
                  <h4 className="font-bold text-gray-800">Total Predicción Semanal</h4>
                  <p className="text-sm text-gray-600">Todas las categorías</p>
                </div>
              </div>
<p className="text-3xl md:text-5xl font-bold text-green-700">
                {kpis.cobertura
                  ? prediccionesDemanda.reduce((sum, item) => sum + (item.prediccionSemana || 0), 0)
                  : 'Sin ventas suficientes'}
              </p>
              <p className="text-sm text-green-600 mt-2">
                Estimación por reglas con ventas reales y Open-Meteo
              </p>
            </div>

<div className="rounded-2xl border border-violet-200 bg-white p-5 shadow-sm md:p-6">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-4xl">🧠</span>
                <div>
                  <h4 className="font-bold text-gray-800">Producción sugerida</h4>
                  <p className="text-sm text-gray-600">Solo con ventas y stock completos</p>
                </div>
              </div>
              <p className="text-3xl md:text-5xl font-bold text-purple-700">
                {kpis.cobertura ? predictionResult.summary.suggestedProduction : '—'}
              </p>
              <p className="text-sm text-purple-600 mt-2">
                {predictionResult.summary.productsWithoutStockData
                  ? `${predictionResult.summary.productsWithoutStockData} productos sin stock completo`
                  : 'Unidades estimadas con ventas y stock registrados'}
              </p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'recomendaciones' && (
        <div>
<div className="mb-5 flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-800">💡 Recomendaciones Inteligentes</h3>
              <p className="text-sm text-gray-600">Reglas operativas activadas por condiciones observadas en el pronóstico</p>
            </div>
            <select value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value)} aria-label="Filtrar recomendaciones por prioridad" className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 sm:w-auto">
              <option value="all">Todas las prioridades</option>
              <option value="Alta">Alta prioridad</option>
              <option value="Media">Media prioridad</option>
              <option value="Baja">Baja prioridad</option>
            </select>
          </div>

<div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 md:p-6 mb-6 border-l-4 border-cyan-500">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5 text-wrap">
              <div>
                <h4 className="text-lg font-bold text-gray-900">Resumen Inteligente</h4>
                <p className="text-sm text-gray-600">Lectura operativa del pronóstico de los próximos 7 días</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                recommendationSummary.operationalRiskColor === 'red'
                  ? 'bg-red-100 text-red-700'
                  : recommendationSummary.operationalRiskColor === 'yellow'
                    ? 'bg-yellow-100 text-yellow-700'
                    : 'bg-green-100 text-green-700'
              }`}>
                {!forecast ? 'Sin datos climáticos' : `${recommendationSummary.operationalRisk === 'Alto' ? '🔴' : recommendationSummary.operationalRisk === 'Medio' ? '🟡' : '🟢'} Riesgo ${recommendationSummary.operationalRisk}`}
              </span>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
              <div className="rounded-xl border border-orange-100 bg-orange-50/70 p-4">
                <p className="text-xs text-orange-700 font-semibold mb-1">Temp. promedio</p>
                <p className="text-2xl font-bold text-orange-700">{forecast ? `${recommendationSummary.averageTemperature.toFixed(1)}°C` : 'Sin datos'}</p>
              </div>
              <div className="rounded-xl border border-red-100 bg-red-50/70 p-4">
                <p className="text-xs text-red-700 font-semibold mb-1">Día más cálido</p>
                <p className="text-sm font-bold text-red-700">{recommendationSummary.hottestDay ? `${recommendationSummary.hottestDay.label} · ${Math.round(recommendationSummary.hottestDay.temperatureMax)}°C` : 'Sin datos'}</p>
              </div>
              <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-4">
                <p className="text-xs text-blue-700 font-semibold mb-1">Mayor lluvia</p>
                <p className="text-sm font-bold text-blue-700">{recommendationSummary.rainiestDay ? `${recommendationSummary.rainiestDay.label} · ${Math.round(recommendationSummary.rainiestDay.rainProbability)}%` : 'Sin datos'}</p>
              </div>
              <div className="rounded-xl border border-cyan-100 bg-cyan-50/70 p-4">
                <p className="text-xs text-cyan-700 font-semibold mb-1">Tendencia</p>
                <p className="text-xl font-bold text-cyan-700">{forecast ? recommendationSummary.weatherTrend : 'Sin datos'}</p>
              </div>
              <div className="rounded-xl border border-purple-100 bg-purple-50/70 p-4">
                <p className="text-xs text-purple-700 font-semibold mb-1">Recomendaciones</p>
                <p className="text-2xl font-bold text-purple-700">{recommendationSummary.totalRecommendations}</p>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <p className="text-xs text-gray-700 font-semibold mb-1">Actualización</p>
                <p className="text-sm font-bold text-gray-700">{weatherLoading ? 'Cargando' : 'En tiempo real'}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 mb-6 sm:grid-cols-2 lg:grid-cols-3">
            {recommendationSummary.statsByCategory.map((stat) => (
              <div key={stat.category} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
                <p className="text-xs font-semibold text-gray-500 uppercase">{stat.category}</p>
                <p className="text-2xl font-bold text-gray-800 mt-1">{stat.total}</p>
                <p className="text-xs text-gray-500">{stat.total === 1 ? 'recomendación' : 'recomendaciones'}</p>
              </div>
            ))}
          </div>

          <div className="space-y-4">
            {weatherLoading && (
<div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 text-center text-sm text-gray-500">
                Cargando recomendaciones...
              </div>
            )}
            {!weatherLoading && recomendacionesVisibles.map((rec) => (
              <div key={rec.id} className={`bg-white rounded-2xl border border-slate-200 shadow-sm p-4 md:p-6 border-l-4 ${getBorderColor(rec.prioridad)}`}>
                <div className="flex items-start gap-3 md:gap-4">
                  <div className="text-4xl md:text-5xl">{getRecommendationIcon(rec.icono, rec.tipo)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 sm:gap-3 mb-3">
                      <div>
                        <h4 className="text-lg font-bold text-gray-900 mb-1">{rec.titulo}</h4>
                        <div className="flex flex-wrap gap-2">
                          <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold border ${getSmartPriorityColor(rec.prioridad)}`}>
                            {rec.prioridad.toUpperCase()}
                          </span>
                          <span className="inline-flex px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-300">
                            {rec.categoria}
                          </span>
                          <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${getImpactColor(rec.impacto)}`}>
                            Impacto {rec.impacto}
                          </span>
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        rec.estado === 'Pendiente'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}>
                        {rec.estado === 'Pendiente' ? '⏳ Pendiente' : '👁️ En revisión'}
                      </span>
                    </div>

                    <div className="mb-4 rounded-lg bg-slate-50 border border-slate-200 p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">Motivo y dato que activa la regla</p>
                      <p className="text-gray-700">{rec.descripcion}</p>
                    </div>

<div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-3">
                      <div className="flex flex-wrap gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500">📅</span>
                          <span className="text-gray-700 font-medium">{rec.fecha}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500">💰</span>
                          <span className="text-green-600 font-semibold">Impacto {rec.impacto}</span>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm font-medium whitespace-nowrap">
                          ✓ Aplicar
                        </button>
                        <button className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium whitespace-nowrap">
                          Posponer
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {!weatherLoading && recomendacionesVisibles.length === 0 && (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center shadow-sm">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-600">
                  <Lightbulb size={22} aria-hidden="true" />
                </div>
                <p className="font-semibold text-slate-800">No hay recomendaciones para este filtro</p>
                <p className="mt-1 text-sm text-slate-500">Prueba otra prioridad o vuelve a mostrar todas.</p>
                <button type="button" onClick={() => setPriorityFilter('all')} className="mt-4 rounded-xl px-4 py-2 text-sm font-semibold text-cyan-700 transition hover:bg-cyan-50">
                  Mostrar todas
                </button>
              </div>
            )}
          </div>

          <div className="mt-6 bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"/>
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-blue-800 font-medium">
                  🤖 Fase 1 activa: las recomendaciones se generan con Open-Meteo y reglas de negocio desacopladas para reemplazarlas luego por un servicio de Machine Learning.
                </p>
              </div>
            </div>
</div>
        </div>
      )}

      {activeTab === 'chatbot' && <Chatbot variant="embedded" onBack={() => setActiveTab('dashboard')} />}

      <ReporteModal
        open={reporteOpen}
        title="Reporte de estimaciones de demanda"
        filterLabel="Tendencia"
        filterOptions={tendenciasReporte}
        generating={generandoReporte}
        onGenerate={handleGenerarReportePredicciones}
        onClose={() => setReporteOpen(false)}
      />
    </div>
  )
}

export default IAPredictiva

