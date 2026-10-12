import { supabase } from './supabaseClient'

export interface CurrentWeather {
  temperature: number
  temperatureMax: number
  temperatureMin: number
  humidity: number
  windSpeed: number
  rainProbability: number
  weatherCode: number
  weatherState: string
  date: string
}

export interface ForecastDay {
  date: string
  label: string
  temperatureMax: number
  temperatureMin: number
  humidity: number
  windSpeed: number
  rainProbability: number
  weatherCode: number
  weatherState: string
  icon: string
}

export interface WeatherForecast {
  current: CurrentWeather
  days: ForecastDay[]
  source: 'open-meteo'
  latitude: number
  longitude: number
}

interface OpenMeteoResponse {
  latitude: number
  longitude: number
  current?: {
    time?: string
    temperature_2m?: number
    relative_humidity_2m?: number
    wind_speed_10m?: number
    weather_code?: number
  }
  daily?: {
    time?: string[]
    temperature_2m_max?: number[]
    temperature_2m_min?: number[]
    precipitation_probability_max?: number[]
    relative_humidity_2m_mean?: number[]
    wind_speed_10m_max?: number[]
    weather_code?: number[]
  }
}

export interface WeatherLocation {
  latitude: number
  longitude: number
}

const OPEN_METEO_URL = 'https://api.open-meteo.com/v1/forecast'

function toNumber(value: number | undefined, fallback = 0): number {
  return Number.isFinite(value) ? Number(value) : fallback
}

function formatDayLabel(value: string): string {
  const parsed = new Date(`${value}T00:00:00`)

  if (Number.isNaN(parsed.getTime())) return value

  return parsed.toLocaleDateString('es-GT', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
  })
}

export function getWeatherState(weatherCode: number): string {
  if ([0].includes(weatherCode)) return 'Soleado'
  if ([1, 2].includes(weatherCode)) return 'Parcialmente nublado'
  if ([3].includes(weatherCode)) return 'Nublado'
  if ([45, 48].includes(weatherCode)) return 'Neblina'
  if ([51, 53, 55, 56, 57].includes(weatherCode)) return 'Llovizna'
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(weatherCode)) return 'Lluvia'
  if ([95, 96, 99].includes(weatherCode)) return 'Tormenta'

  return 'Variable'
}

export function getWeatherIcon(weatherCode: number): string {
  if ([0].includes(weatherCode)) return '☀️'
  if ([1, 2].includes(weatherCode)) return '🌤️'
  if ([3].includes(weatherCode)) return '☁️'
  if ([45, 48].includes(weatherCode)) return '🌫️'
  if ([51, 53, 55, 56, 57].includes(weatherCode)) return '🌦️'
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(weatherCode)) return '🌧️'
  if ([95, 96, 99].includes(weatherCode)) return '⛈️'

  return '🌡️'
}

function normalizeWeatherResponse(payload: OpenMeteoResponse, location: WeatherLocation): WeatherForecast {
  const daily = payload.daily || {}
  const dates = daily.time || []

  const days = dates.slice(0, 7).map((date, index) => {
    const weatherCode = toNumber(daily.weather_code?.[index])

    return {
      date,
      label: formatDayLabel(date),
      temperatureMax: toNumber(daily.temperature_2m_max?.[index]),
      temperatureMin: toNumber(daily.temperature_2m_min?.[index]),
      humidity: toNumber(daily.relative_humidity_2m_mean?.[index]),
      windSpeed: toNumber(daily.wind_speed_10m_max?.[index]),
      rainProbability: toNumber(daily.precipitation_probability_max?.[index]),
      weatherCode,
      weatherState: getWeatherState(weatherCode),
      icon: getWeatherIcon(weatherCode),
    }
  })

  const currentWeatherCode = toNumber(payload.current?.weather_code, days[0]?.weatherCode || 0)
  const current: CurrentWeather = {
    temperature: toNumber(payload.current?.temperature_2m, days[0]?.temperatureMax || 0),
    temperatureMax: days[0]?.temperatureMax || toNumber(payload.current?.temperature_2m),
    temperatureMin: days[0]?.temperatureMin || toNumber(payload.current?.temperature_2m),
    humidity: toNumber(payload.current?.relative_humidity_2m, days[0]?.humidity || 0),
    windSpeed: toNumber(payload.current?.wind_speed_10m, days[0]?.windSpeed || 0),
    rainProbability: days[0]?.rainProbability || 0,
    weatherCode: currentWeatherCode,
    weatherState: getWeatherState(currentWeatherCode),
    date: payload.current?.time || days[0]?.date || new Date().toISOString(),
  }

  return {
    current,
    days,
    source: 'open-meteo',
    latitude: payload.latitude || location.latitude,
    longitude: payload.longitude || location.longitude,
  }
}

async function saveWeatherHistory(forecast: WeatherForecast): Promise<void> {
  const rows = forecast.days.map((day) => ({
    date: day.date,
    temperature: day.date === forecast.days[0]?.date ? forecast.current.temperature : null,
    temperature_max: day.temperatureMax,
    temperature_min: day.temperatureMin,
    humidity: day.humidity,
    rain_probability: day.rainProbability,
    wind_speed: day.windSpeed,
    weather_code: day.weatherCode,
  }))

  const { error } = await supabase
    .from('historial_clima')
    .upsert(rows, { onConflict: 'date' })

  if (error) {
    console.warn('No fue posible guardar historial_clima.', error.message)
  }
}

export async function getWeatherForecast(location: WeatherLocation): Promise<WeatherForecast> {
  const params = new URLSearchParams({
    latitude: String(location.latitude),
    longitude: String(location.longitude),
    current: 'temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,relative_humidity_2m_mean,wind_speed_10m_max',
    forecast_days: '7',
    timezone: 'auto',
  })

  const response = await fetch(`${OPEN_METEO_URL}?${params.toString()}`)

  if (!response.ok) {
    throw new Error('No fue posible obtener el clima desde Open-Meteo.')
  }

  const payload = (await response.json()) as OpenMeteoResponse
  const forecast = normalizeWeatherResponse(payload, location)

  await saveWeatherHistory(forecast)

  return forecast
}
