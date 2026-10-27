const configuredApiUrl = import.meta.env.VITE_API_URL?.trim()

function resolveApiUrl() {
  if (typeof window === 'undefined') {
    return configuredApiUrl || 'http://localhost:3001'
  }

  const hostname = window.location.hostname
  const isTunnel = hostname.endsWith('.devtunnels.ms') ||
    hostname.endsWith('.app.github.dev') ||
    hostname.endsWith('.githubpreview.dev') ||
    hostname.endsWith('.ngrok-free.app') ||
    hostname.endsWith('.loca.lt')

  // En túneles externos (como VS Code devtunnels) o acceso remoto, usar el origin actual mediante el proxy de Vite
  if (isTunnel) {
    return window.location.origin
  }

  if (!configuredApiUrl) {
    return `${window.location.protocol}//${window.location.hostname}:3001`
  }

  try {
    const configuredUrl = new URL(configuredApiUrl)
    const browserIsRemote = !['localhost', '127.0.0.1'].includes(window.location.hostname)
    const configuredIsLocal = ['localhost', '127.0.0.1'].includes(configuredUrl.hostname)

    if (browserIsRemote && configuredIsLocal) {
      return window.location.origin
    }
  } catch {
    return configuredApiUrl
  }

  return configuredApiUrl
}

export const API_URL = resolveApiUrl()
