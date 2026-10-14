import { CloudRain, Droplets, Thermometer, Wind } from 'lucide-react'
import type { CurrentWeather } from '../services/weatherService'

interface WeatherCardProps {
  weather: CurrentWeather | null
  loading?: boolean
  error?: string | null
}

function formatValue(value: number | undefined, suffix: string): string {
  if (!Number.isFinite(value)) return '--'

  return `${Number(value).toFixed(0)}${suffix}`
}

function WeatherCard({ weather, loading = false, error = null }: WeatherCardProps) {
  if (loading) {
    return (
      <div className="h-full rounded-2xl border border-slate-200 border-t-4 border-cyan-500 bg-white p-5 shadow-sm">
        <p className="text-sm font-semibold text-gray-700">Clima actual</p>
        <p className="text-sm text-gray-500 mt-3">Cargando datos de Open-Meteo...</p>
      </div>
    )
  }

  if (error || !weather) {
    return (
      <div className="h-full rounded-2xl border border-red-100 border-t-4 border-red-500 bg-white p-5 shadow-sm">
        <p className="text-sm font-semibold text-gray-700">Clima actual</p>
        <p className="text-sm text-red-600 mt-3">{error || 'Sin datos climáticos disponibles.'}</p>
      </div>
    )
  }

  return (
    <div className="h-full rounded-2xl border border-slate-200 border-t-4 border-cyan-500 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-sm font-semibold text-gray-700">Clima actual</p>
          <p className="text-xs text-gray-500">{weather.weatherState}</p>
        </div>
        <Thermometer className="text-cyan-600" size={28} />
      </div>

      <p className="mb-5 text-5xl font-bold tracking-tight text-slate-900">
        {formatValue(weather.temperature, '°C')}
      </p>

      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="rounded-xl border border-orange-100 bg-orange-50/70 px-3 py-2.5">
          <span className="text-gray-600">Máx.</span>
          <p className="font-semibold text-orange-700">{formatValue(weather.temperatureMax, '°C')}</p>
        </div>
        <div className="rounded-xl border border-blue-100 bg-blue-50/70 px-3 py-2.5">
          <span className="text-gray-600">Mín.</span>
          <p className="font-semibold text-blue-700">{formatValue(weather.temperatureMin, '°C')}</p>
        </div>
        <div className="rounded-xl border border-cyan-100 bg-cyan-50/70 px-3 py-2.5">
          <div className="flex items-center gap-1 text-gray-600">
            <Droplets size={14} />
            <span>Humedad</span>
          </div>
          <p className="font-semibold text-cyan-700">{formatValue(weather.humidity, '%')}</p>
        </div>
        <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5">
          <div className="flex items-center gap-1 text-gray-600">
            <Wind size={14} />
            <span>Viento</span>
          </div>
          <p className="font-semibold text-gray-700">{formatValue(weather.windSpeed, ' km/h')}</p>
        </div>
        <div className="col-span-2 rounded-xl border border-blue-100 bg-blue-50/70 px-3 py-2.5">
          <div className="flex items-center gap-1 text-gray-600">
            <CloudRain size={14} />
            <span>Probabilidad de lluvia</span>
          </div>
          <p className="font-semibold text-blue-700">{formatValue(weather.rainProbability, '%')}</p>
        </div>
      </div>
    </div>
  )
}

export default WeatherCard
