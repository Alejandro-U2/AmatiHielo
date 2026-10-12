export const THEME_KEY = 'amati_theme'

export function getInitialTheme() {
  try {
    const stored = localStorage.getItem(THEME_KEY)
    if (stored === 'dark' || stored === 'light') return stored
  } catch {
    // localStorage no disponible (modo privado, etc.)
  }

  try {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light'
  } catch {
    return 'light'
  }
}

export function applyTheme(theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark')
}

export function setStoredTheme(theme) {
  try {
    localStorage.setItem(THEME_KEY, theme)
  } catch {
    // localStorage no disponible
  }
}