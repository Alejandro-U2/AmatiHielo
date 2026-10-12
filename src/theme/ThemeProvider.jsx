import { useEffect, useState } from 'react'
import { ThemeContext } from './ThemeContext'
import { applyTheme, getInitialTheme, setStoredTheme } from './theme'

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(getInitialTheme)

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  const toggleTheme = () => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark'
      setStoredTheme(next)
      return next
    })
  }

  const value = {
    theme,
    toggleTheme,
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}