const configuredApiUrl = import.meta.env.VITE_API_URL?.trim()

function resolveApiUrl() {
  if (typeof window === 'undefined') {
    return configuredApiUrl || 'http://localhost:3001'
  }

  if (!configuredApiUrl) {
    return `${window.location.protocol}//${window.location.hostname}:3001`
  }

  try {
    const configuredUrl = new URL(configuredApiUrl)
    const browserIsRemote = !['localhost', '127.0.0.1'].includes(window.location.hostname)
    const configuredIsLocal = ['localhost', '127.0.0.1'].includes(configuredUrl.hostname)

    if (browserIsRemote && configuredIsLocal) {
      configuredUrl.hostname = window.location.hostname
      return configuredUrl.toString().replace(/\/$/, '')
    }
  } catch {
    return configuredApiUrl
  }

  return configuredApiUrl
}

export const API_URL = resolveApiUrl()
