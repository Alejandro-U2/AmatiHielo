import { generateClimateRecommendation } from './climateRules'
import type { ClimateRecommendation } from './climateRules'
import type { ForecastDay, WeatherForecast } from './weatherService'

export type RecommendationPriority = 'Alta' | 'Media' | 'Baja'
export type RecommendationImpact = 'Alto' | 'Medio' | 'Bajo'
export type RecommendationStatus = 'Pendiente' | 'En revisión'
export type RecommendationCategory =
  | 'Producción'
  | 'Inventario'
  | 'Distribución'
  | 'Cadena de frío'
  | 'Operaciones'
  | 'Ventas'

export interface SmartRecommendation {
  id: string
  titulo: string
  descripcion: string
  categoria: RecommendationCategory
  prioridad: RecommendationPriority
  impacto: RecommendationImpact
  icono: string
  color: 'red' | 'yellow' | 'green' | 'blue' | 'cyan' | 'purple'
  fecha: string
  estado: RecommendationStatus
  tipo: string
}

export interface RecommendationSummary {
  averageTemperature: number
  hottestDay: ForecastDay | null
  rainiestDay: ForecastDay | null
  operationalRisk: 'Bajo' | 'Medio' | 'Alto'
  operationalRiskColor: 'green' | 'yellow' | 'red'
  weatherTrend: 'Ascendente' | 'Descendente' | 'Estable'
  totalRecommendations: number
  statsByCategory: Array<{
    category: RecommendationCategory
    total: number
  }>
}

export interface RecommendationPanelData {
  recommendations: SmartRecommendation[]
  summary: RecommendationSummary
}

const CATEGORIES: RecommendationCategory[] = [
  'Producción',
  'Inventario',
  'Distribución',
  'Cadena de frío',
  'Operaciones',
  'Ventas',
]

function toShortDate(value: string): string {
  const parsed = new Date(`${value}T00:00:00`)

  if (Number.isNaN(parsed.getTime())) return value

  return parsed.toLocaleDateString('es-GT', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
  })
}

function priorityColor(priority: RecommendationPriority): SmartRecommendation['color'] {
  if (priority === 'Alta') return 'red'
  if (priority === 'Media') return 'yellow'

  return 'green'
}

function buildRecommendation(input: Omit<SmartRecommendation, 'color'> & { color?: SmartRecommendation['color'] }): SmartRecommendation {
  return {
    ...input,
    color: input.color || priorityColor(input.prioridad),
  }
}

function hasThreeHotDays(days: ForecastDay[]): boolean {
  return days.some((_, index) => {
    const window = days.slice(index, index + 3)
    return window.length === 3 && window.every((day) => day.temperatureMax > 32)
  })
}

function getWeatherTrend(days: ForecastDay[]): RecommendationSummary['weatherTrend'] {
  if (days.length < 2) return 'Estable'

  const firstHalf = days.slice(0, Math.ceil(days.length / 2))
  const secondHalf = days.slice(Math.floor(days.length / 2))
  const firstAverage = firstHalf.reduce((sum, day) => sum + day.temperatureMax, 0) / firstHalf.length
  const secondAverage = secondHalf.reduce((sum, day) => sum + day.temperatureMax, 0) / secondHalf.length
  const difference = secondAverage - firstAverage

  if (difference >= 1) return 'Ascendente'
  if (difference <= -1) return 'Descendente'

  return 'Estable'
}

function getOperationalRisk({
  maxTemperature,
  maxRain,
  maxHumidity,
}: {
  maxTemperature: number
  maxRain: number
  maxHumidity: number
}): Pick<RecommendationSummary, 'operationalRisk' | 'operationalRiskColor'> {
  if (maxTemperature >= 34 && maxHumidity > 90) {
    return { operationalRisk: 'Alto', operationalRiskColor: 'red' }
  }

  if ((maxTemperature >= 32 && maxRain > 70) || maxHumidity > 85 || maxRain > 80) {
    return { operationalRisk: 'Medio', operationalRiskColor: 'yellow' }
  }

  return { operationalRisk: 'Bajo', operationalRiskColor: 'green' }
}

function mapClimateRuleRecommendation(recommendation: ClimateRecommendation): SmartRecommendation {
  const categoryByType: Record<string, RecommendationCategory> = {
    produccion: 'Producción',
    inventario: 'Inventario',
    optimizacion: 'Operaciones',
    logistica: 'Distribución',
    marketing: 'Ventas',
  }

  const priorityByRule: Record<ClimateRecommendation['prioridad'], RecommendationPriority> = {
    alta: 'Alta',
    media: 'Media',
    baja: 'Baja',
  }

  const priority = priorityByRule[recommendation.prioridad]

  return buildRecommendation({
    id: `base-${recommendation.id}`,
    titulo: recommendation.titulo,
    descripcion: recommendation.descripcion,
    categoria: categoryByType[recommendation.tipo] || 'Operaciones',
    prioridad: priority,
    impacto: priority === 'Alta' ? 'Alto' : priority === 'Media' ? 'Medio' : 'Bajo',
    icono: recommendation.icono,
    fecha: recommendation.fechaObjetivo,
    estado: recommendation.estado === 'pendiente' ? 'Pendiente' : 'En revisión',
    tipo: recommendation.tipo,
  })
}

function dedupeRecommendations(recommendations: SmartRecommendation[]): SmartRecommendation[] {
  const byTitle = new Map<string, SmartRecommendation>()

  recommendations.forEach((recommendation) => {
    const key = `${recommendation.categoria}-${recommendation.titulo}`
    const existing = byTitle.get(key)

    if (!existing || existing.prioridad !== 'Alta') {
      byTitle.set(key, recommendation)
    }
  })

  return Array.from(byTitle.values())
}

export function buildRecommendationPanelData(forecast: WeatherForecast | null): RecommendationPanelData {
  const days = forecast?.days || []
  const current = forecast?.current || null
  const hottestDay = days.reduce<ForecastDay | null>(
    (selected, day) => (!selected || day.temperatureMax > selected.temperatureMax ? day : selected),
    null,
  )
  const rainiestDay = days.reduce<ForecastDay | null>(
    (selected, day) => (!selected || day.rainProbability > selected.rainProbability ? day : selected),
    null,
  )
  const averageTemperature = days.length
    ? days.reduce((sum, day) => sum + day.temperatureMax, 0) / days.length
    : 0
  const maxTemperature = hottestDay?.temperatureMax || current?.temperatureMax || 0
  const maxRain = rainiestDay?.rainProbability || current?.rainProbability || 0
  const maxHumidity = Math.max(...days.map((day) => day.humidity), current?.humidity || 0)
  const maxWind = Math.max(...days.map((day) => day.windSpeed), current?.windSpeed || 0)
  const trend = getWeatherTrend(days)
  const risk = getOperationalRisk({ maxTemperature, maxRain, maxHumidity })

  const recommendations: SmartRecommendation[] = current
    ? generateClimateRecommendation(current).map(mapClimateRuleRecommendation)
    : []

  if (maxTemperature >= 34) {
    recommendations.push(buildRecommendation({
      id: 'production-heat-25',
      titulo: 'Aumentar producción 25%',
      descripcion: `El pronóstico marca hasta ${maxTemperature.toFixed(1)}°C. Preparar producción adicional para cubrir la demanda por calor fuerte.`,
      categoria: 'Producción',
      prioridad: 'Alta',
      impacto: 'Alto',
      icono: 'thermometer',
      fecha: hottestDay ? toShortDate(hottestDay.date) : 'Esta semana',
      estado: 'Pendiente',
      tipo: 'produccion',
    }))
  } else if (maxTemperature >= 32) {
    recommendations.push(buildRecommendation({
      id: 'production-heat-15',
      titulo: 'Aumentar producción 15%',
      descripcion: `La temperatura máxima prevista es ${maxTemperature.toFixed(1)}°C. Conviene aumentar producción sin sobrecargar inventario.`,
      categoria: 'Producción',
      prioridad: 'Media',
      impacto: 'Medio',
      icono: 'thermometer',
      fecha: hottestDay ? toShortDate(hottestDay.date) : 'Esta semana',
      estado: 'Pendiente',
      tipo: 'produccion',
    }))
  }

  if (hasThreeHotDays(days)) {
    recommendations.push(buildRecommendation({
      id: 'production-extra-shifts',
      titulo: 'Planificar turnos adicionales',
      descripcion: 'Hay tres días consecutivos por encima de 32°C. Revisar capacidad de producción y turnos para evitar faltantes.',
      categoria: 'Producción',
      prioridad: 'Alta',
      impacto: 'Alto',
      icono: 'factory',
      fecha: 'Próximos 3 días',
      estado: 'Pendiente',
      tipo: 'produccion',
    }))
  }

  if (maxTemperature > 32) {
    recommendations.push(buildRecommendation({
      id: 'inventory-ice-stock',
      titulo: 'Aumentar stock de hielo',
      descripcion: 'El calor previsto puede elevar la rotación de hielo. Preparar stock adicional antes del día más cálido.',
      categoria: 'Inventario',
      prioridad: maxTemperature >= 34 ? 'Alta' : 'Media',
      impacto: maxTemperature >= 34 ? 'Alto' : 'Medio',
      icono: 'package',
      fecha: hottestDay ? toShortDate(hottestDay.date) : 'Esta semana',
      estado: 'Pendiente',
      tipo: 'inventario',
    }))
  }

  if (trend === 'Ascendente') {
    recommendations.push(buildRecommendation({
      id: 'inventory-temperature-trend',
      titulo: 'Preparar inventario adicional',
      descripcion: 'La tendencia de temperatura es ascendente. Anticipar insumos y producto terminado antes del pico de calor.',
      categoria: 'Inventario',
      prioridad: 'Media',
      impacto: 'Medio',
      icono: 'trending-up',
      fecha: 'Esta semana',
      estado: 'Pendiente',
      tipo: 'inventario',
    }))
  }

  if (maxHumidity > 90) {
    recommendations.push(buildRecommendation({
      id: 'cold-chain-constant-monitoring',
      titulo: 'Monitoreo constante de cadena de frío',
      descripcion: `La humedad máxima prevista supera el 90% (${maxHumidity.toFixed(0)}%). Supervisar cámaras, sellos y condensación durante el turno.`,
      categoria: 'Cadena de frío',
      prioridad: 'Alta',
      impacto: 'Alto',
      icono: 'snowflake',
      fecha: 'Durante el turno',
      estado: 'Pendiente',
      tipo: 'cadena_frio',
    }))
  } else if (maxHumidity > 85) {
    recommendations.push(buildRecommendation({
      id: 'cold-chain-review',
      titulo: 'Revisar cámaras frigoríficas',
      descripcion: `La humedad máxima prevista es ${maxHumidity.toFixed(0)}%. Revisar temperatura interna, puertas y empaques.`,
      categoria: 'Cadena de frío',
      prioridad: 'Media',
      impacto: 'Medio',
      icono: 'snowflake',
      fecha: 'Hoy',
      estado: 'Pendiente',
      tipo: 'cadena_frio',
    }))
  }

  if (maxWind > 40) {
    recommendations.push(buildRecommendation({
      id: 'distribution-wind-delay',
      titulo: 'Advertir posibles retrasos logísticos',
      descripcion: `El viento puede llegar a ${maxWind.toFixed(0)} km/h. Confirmar rutas, tiempos de entrega y comunicación con clientes.`,
      categoria: 'Distribución',
      prioridad: 'Media',
      impacto: 'Medio',
      icono: 'truck',
      fecha: 'Antes de despachos',
      estado: 'En revisión',
      tipo: 'distribucion',
    }))
  }

  if (maxRain > 80) {
    recommendations.push(buildRecommendation({
      id: 'distribution-rain-routes',
      titulo: 'Reprogramar rutas de reparto',
      descripcion: `La lluvia máxima prevista es ${maxRain.toFixed(0)}%. Priorizar entregas críticas y mover rutas flexibles.`,
      categoria: 'Distribución',
      prioridad: 'Alta',
      impacto: 'Alto',
      icono: 'cloud-rain',
      fecha: rainiestDay ? toShortDate(rainiestDay.date) : 'Esta semana',
      estado: 'Pendiente',
      tipo: 'distribucion',
    }))
  }

  if (maxTemperature >= 32 && maxRain < 40) {
    recommendations.push(buildRecommendation({
      id: 'sales-hot-dry-promos',
      titulo: 'Promocionar agua y hielo',
      descripcion: 'El clima combina temperatura alta y baja probabilidad de lluvia. Activar promociones de agua, hielo y bebidas frías.',
      categoria: 'Ventas',
      prioridad: 'Media',
      impacto: 'Medio',
      icono: 'megaphone',
      fecha: hottestDay ? toShortDate(hottestDay.date) : 'Esta semana',
      estado: 'Pendiente',
      tipo: 'ventas',
    }))
  }

  if (maxRain > 80) {
    recommendations.push(buildRecommendation({
      id: 'sales-rain-sensitive-products',
      titulo: 'Disminuir productos sensibles a demanda',
      descripcion: 'La lluvia muy alta puede reducir visitas. Ajustar producción de productos con baja rotación en días lluviosos.',
      categoria: 'Ventas',
      prioridad: 'Media',
      impacto: 'Medio',
      icono: 'chart-down',
      fecha: rainiestDay ? toShortDate(rainiestDay.date) : 'Esta semana',
      estado: 'Pendiente',
      tipo: 'ventas',
    }))
  }

  if (!recommendations.length) {
    recommendations.push(buildRecommendation({
      id: 'operations-stable-plan',
      titulo: 'Mantener operación planificada',
      descripcion: 'El pronóstico no muestra riesgos importantes. Mantener producción, inventario y rutas según planificación normal.',
      categoria: 'Operaciones',
      prioridad: 'Baja',
      impacto: 'Bajo',
      icono: 'check-circle',
      fecha: 'Esta semana',
      estado: 'En revisión',
      tipo: 'operaciones',
    }))
  }

  const uniqueRecommendations = dedupeRecommendations(recommendations)
  const statsByCategory = CATEGORIES.map((category) => ({
    category,
    total: uniqueRecommendations.filter((recommendation) => recommendation.categoria === category).length,
  }))

  return {
    recommendations: uniqueRecommendations,
    summary: {
      averageTemperature,
      hottestDay,
      rainiestDay,
      ...risk,
      weatherTrend: trend,
      totalRecommendations: uniqueRecommendations.length,
      statsByCategory,
    },
  }
}
