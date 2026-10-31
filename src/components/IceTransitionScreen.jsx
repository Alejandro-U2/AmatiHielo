import { useState, useEffect, useRef, useMemo } from 'react'
import PropTypes from 'prop-types'
import { Snowflake } from 'lucide-react'
import iceCubeImage from '../assets/amati-ice-cube.png'
import './IceTransitionScreen.css'

/**
 * Pantalla de transición ligera y minimalista para el paso
 * del Login hacia el Dashboard. Rápida (~1.1s), fluida y con
 * los mismos colores del diseño.
 */
export default function IceTransitionScreen({
  onComplete,
  duration = 1100,
  userName = '',
}) {
  const [progress, setProgress] = useState(0)
  const [isExiting, setIsExiting] = useState(false)
  const onCompleteRef = useRef(onComplete)

  useEffect(() => {
    onCompleteRef.current = onComplete
  }, [onComplete])

  // Partículas sutiles de fondo (con selector de texto para evitar emojis en móviles)
  const flakes = useMemo(() => {
    const symbols = ['❄\uFE0E', '✦', '•', '✧']
    return Array.from({ length: 16 }, (_, i) => ({
      id: i,
      symbol: symbols[i % symbols.length],
      left: `${(i * 6.3) % 94 + 3}%`,
      size: `${9 + (i % 4) * 3}px`,
      duration: `${4 + (i % 4) * 1.5}s`,
      delay: `${(i * 0.25) % 2.5}s`,
      opacity: (0.18 + (i % 4) * 0.12).toFixed(2),
    }))
  }, [])

  useEffect(() => {
    const startTime = Date.now()
    const intervalMs = 25

    const timer = setInterval(() => {
      const elapsed = Date.now() - startTime
      const rawProgress = Math.min(100, Math.round((elapsed / duration) * 100))

      setProgress(rawProgress)

      if (rawProgress >= 100) {
        clearInterval(timer)
        setTimeout(() => {
          setIsExiting(true)
          setTimeout(() => {
            onCompleteRef.current?.()
          }, 320)
        }, 150)
      }
    }, intervalMs)

    return () => clearInterval(timer)
  }, [duration])

  return (
    <div
      className={`ice-transition-overlay ${isExiting ? 'is-exiting' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label="Accediendo a AMATI Hielo"
    >
      {/* Nieve sutil */}
      <div className="ice-transition-snow" aria-hidden="true">
        {flakes.map((f) => (
          <span
            key={f.id}
            className="ice-transition-flake"
            style={{
              left: f.left,
              fontSize: f.size,
              animationDuration: f.duration,
              animationDelay: f.delay,
              '--flake-op': f.opacity,
            }}
          >
            {f.symbol}
          </span>
        ))}
      </div>

      {/* Tarjeta de Acceso Rápido */}
      <div className="ice-transition-card">
        <div className="ice-transition-podium">
          <div className="ice-transition-ring" />
          <img
            src={iceCubeImage}
            alt="AMATI Hielo"
            className="ice-transition-mascot"
          />
        </div>

        <div className="ice-transition-brand">AMATI HIELO</div>
        <h2 className="ice-transition-title">
          {userName ? `¡Bienvenido, ${userName}!` : 'Accediendo al sistema...'}
        </h2>

        {/* Barra de progreso fina */}
        <div className="ice-transition-track">
          <div
            className="ice-transition-fill"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="ice-transition-subtext">
          <Snowflake size={13} style={{ color: '#38d1f0' }} className="animate-spin" />
          <span>Cargando panel de control...</span>
        </div>
      </div>
    </div>
  )
}

IceTransitionScreen.propTypes = {
  onComplete: PropTypes.func,
  duration: PropTypes.number,
  userName: PropTypes.string,
}
