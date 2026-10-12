import type { CurrentWeather } from './weatherService'

export type ClimatePriority = 'alta' | 'media' | 'baja'

export interface ClimateRecommendation {
  id: string
  tipo: string
  prioridad: ClimatePriority
  titulo: string
  descripcion: string
  impacto: string
  fechaObjetivo: string
  estado: 'pendiente' | 'revision'
  icono: string
  color: string
}

export function generateClimateRecommendation(weather?: CurrentWeather | null): ClimateRecommendation[] {
  if (!weather) return []

  const recommendations: ClimateRecommendation[] = []

  if (weather.temperature > 32) {
    recommendations.push({
      id: 'temp-32',
      tipo: 'produccion',
      prioridad: 'alta',
      titulo: 'Incrementar producción de hielo',
      descripcion: `La temperatura actual es de ${weather.temperature.toFixed(1)}°C. Se recomienda incrementar la producción de hielo en un 20%.`,
      impacto: 'Mayor disponibilidad para demanda por calor',
      fechaObjetivo: 'Hoy',
      estado: 'pendiente',
      icono: '🏭',
      color: 'red',
    })
  }

  if (weather.temperature > 34) {
    recommendations.push({
      id: 'temp-34',
      tipo: 'inventario',
      prioridad: 'alta',
      titulo: 'Preparar mayor inventario',
      descripcion: `Se detecta calor fuerte (${weather.temperature.toFixed(1)}°C). Conviene preparar inventario adicional para evitar quiebres.`,
      impacto: 'Reduce riesgo de falta de producto',
      fechaObjetivo: 'Antes del cierre',
      estado: 'pendiente',
      icono: '📦',
      color: 'red',
    })
  }

  if (weather.rainProbability > 70) {
    recommendations.push({
      id: 'rain-70',
      tipo: 'optimizacion',
      prioridad: 'media',
      titulo: 'Ajustar producción por lluvia',
      descripcion: `La probabilidad de lluvia es ${weather.rainProbability.toFixed(0)}%. Podría bajar el flujo de clientes y las ventas de bebidas frías.`,
      impacto: 'Evita excedentes de producción',
      fechaObjetivo: 'Hoy',
      estado: 'pendiente',
      icono: '⚡',
      color: 'yellow',
    })
  }

  if (weather.humidity > 85) {
    recommendations.push({
      id: 'humidity-85',
      tipo: 'inventario',
      prioridad: 'media',
      titulo: 'Revisar cadena de frío',
      descripcion: `La humedad relativa está en ${weather.humidity.toFixed(0)}%. Se recomienda revisar almacenamiento, empaque y condensación.`,
      impacto: 'Protege calidad del producto',
      fechaObjetivo: 'Durante el turno',
      estado: 'pendiente',
      icono: '📦',
      color: 'yellow',
    })
  }

  if (weather.windSpeed > 40) {
    recommendations.push({
      id: 'wind-40',
      tipo: 'logistica',
      prioridad: 'media',
      titulo: 'Anticipar posibles retrasos logísticos',
      descripcion: `El viento está en ${weather.windSpeed.toFixed(0)} km/h. Conviene confirmar rutas y tiempos de entrega.`,
      impacto: 'Mejor cumplimiento de entregas',
      fechaObjetivo: 'Antes de despachos',
      estado: 'revision',
      icono: '🚚',
      color: 'blue',
    })
  }

  if (recommendations.length === 0) {
    recommendations.push({
      id: 'stable-weather',
      tipo: 'optimizacion',
      prioridad: 'baja',
      titulo: 'Mantener planificación normal',
      descripcion: 'El clima actual no muestra alertas fuertes. Mantener producción e inventario según operación regular.',
      impacto: 'Operación estable',
      fechaObjetivo: 'Hoy',
      estado: 'revision',
      icono: '💡',
      color: 'blue',
    })
  }

  return recommendations
}
