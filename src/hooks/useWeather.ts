import { useCallback, useEffect, useState } from 'react'
import { getWeatherForecast, type WeatherForecast, type WeatherLocation } from '../services/weatherService'

interface UseWeatherOptions extends WeatherLocation {
  refreshIntervalMs?: number
}

interface UseWeatherResult {
  forecast: WeatherForecast | null
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
}

export function useWeather({
  latitude,
  longitude,
  refreshIntervalMs = 30 * 60 * 1000,
}: UseWeatherOptions): UseWeatherResult {
  const [forecast, setForecast] = useState<WeatherForecast | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const weatherForecast = await getWeatherForecast({ latitude, longitude })
      setForecast(weatherForecast)
    } catch (requestError) {
      const message = requestError instanceof Error
        ? requestError.message
        : 'No fue posible cargar el clima.'

      setError(message)
    } finally {
      setLoading(false)
    }
  }, [latitude, longitude])

  useEffect(() => {
    refresh()

    const interval = window.setInterval(refresh, refreshIntervalMs)

    return () => window.clearInterval(interval)
  }, [refresh, refreshIntervalMs])

  return {
    forecast,
    loading,
    error,
    refresh,
  }
}
