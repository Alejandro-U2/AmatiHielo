import { useState, useEffect, useRef, useMemo } from 'react'
import PropTypes from 'prop-types'
import { Volume2, VolumeX, Snowflake, Thermometer, ShieldCheck, Database, Cpu } from 'lucide-react'
import iceCubeImage from '../assets/amati-ice-cube.png'
import './IceLoadingScreen.css'

/**
 * Pantalla de carga criogénica para AMATI Hielo.
 * Diseñada para reproducirse antes de entrar al sistema,
 * transmitiendo una atmósfera fría, tecnológica y moderna.
 */
export default function IceLoadingScreen({
  onComplete,
  duration = 2200,
  userName = '',
  subtext = '',
  initialMessage = 'Iniciando sistema de refrigeración...',
  onCancel,
  showCancel = false,
}) {
  const [progress, setProgress] = useState(0)
  const [isExiting, setIsExiting] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(false)
  const [temperature, setTemperature] = useState(-5.0)
  const [statusMessage, setStatusMessage] = useState(initialMessage)
  const chimePlayedRef = useRef(false)
  const onCompleteRef = useRef(onComplete)
  const soundEnabledRef = useRef(soundEnabled)

  useEffect(() => {
    onCompleteRef.current = onComplete
  }, [onComplete])

  useEffect(() => {
    soundEnabledRef.current = soundEnabled
  }, [soundEnabled])

  // Generación memoizada de partículas de nieve y destellos de hielo
  const particles = useMemo(() => {
    const symbols = ['❄', '❅', '❆', '✦', '•', '✧', '❄']
    return Array.from({ length: 32 }, (_, i) => ({
      id: i,
      symbol: symbols[i % symbols.length],
      left: `${(i * 3.12 + (i % 5) * 4) % 96 + 2}%`,
      size: `${8 + (i % 6) * 3}px`,
      duration: `${5 + (i % 5) * 1.5}s`,
      delay: `${(i * 0.28) % 3.5}s`,
      opacity: (0.15 + (i % 5) * 0.12).toFixed(2),
      driftX: `${((i % 7) - 3) * 12}px`,
    }))
  }, [])

  // Reproducción de sonido cristalino criogénico con Web Audio API sintetizado
  const playIceChime = () => {
    if (!soundEnabledRef.current) return
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext
      if (!AudioCtx) return
      const ctx = new AudioCtx()
      const now = ctx.currentTime

      // Armónico 1: Tono de cristal agudo
      const osc1 = ctx.createOscillator()
      const gain1 = ctx.createGain()
      osc1.type = 'sine'
      osc1.frequency.setValueAtTime(1046.5, now) // C6
      osc1.frequency.exponentialRampToValueAtTime(1318.51, now + 0.3) // E6

      gain1.gain.setValueAtTime(0.06, now)
      gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.9)

      osc1.connect(gain1)
      gain1.connect(ctx.destination)

      // Armónico 2: Tono de hielo brillante
      const osc2 = ctx.createOscillator()
      const gain2 = ctx.createGain()
      osc2.type = 'triangle'
      osc2.frequency.setValueAtTime(1567.98, now) // G6
      osc2.frequency.exponentialRampToValueAtTime(2093.0, now + 0.35) // C7

      gain2.gain.setValueAtTime(0.04, now)
      gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.8)

      osc2.connect(gain2)
      gain2.connect(ctx.destination)

      osc1.start(now)
      osc2.start(now)
      osc1.stop(now + 0.9)
      osc2.stop(now + 0.9)
    } catch {
      // Ignorar si el navegador bloquea la reproducción automática
    }
  }

  // Animación del progreso y las etapas del sistema
  useEffect(() => {
    const startTime = Date.now()
    const intervalMs = 25

    const timer = setInterval(() => {
      const elapsed = Date.now() - startTime
      const rawProgress = Math.min(100, Math.round((elapsed / duration) * 100))

      setProgress(rawProgress)

      // Descenso térmico realista hacia los -18.5°C
      const currentTemp = (-5.0 - (rawProgress / 100) * 13.5).toFixed(1)
      setTemperature(Number(currentTemp))

      // Mensajes de diagnóstico contextuales según avance
      if (rawProgress < 20) {
        setStatusMessage('❄️ Inicializando núcleo criogénico AMATI...')
      } else if (rawProgress < 45) {
        setStatusMessage('🧊 Calibrando temperatura de refrigeración (-18.5°C)...')
      } else if (rawProgress < 70) {
        setStatusMessage('📦 Cargando módulos de inventario, ventas y producción...')
      } else if (rawProgress < 90) {
        setStatusMessage(
          userName
            ? `🔒 Verificando credenciales de acceso para ${userName}...`
            : '🔒 Preparando entorno seguro y portal de acceso...'
        )
      } else if (rawProgress < 100) {
        setStatusMessage('✨ Sincronizando entorno seguro y congelado...')
      } else {
        setStatusMessage(
          userName
            ? '🚀 ¡Sistema listo! Entrando a AMATI...'
            : '❄️ ¡Entorno listo! Accediendo al portal...'
        )
        clearInterval(timer)

        if (!chimePlayedRef.current) {
          chimePlayedRef.current = true
          playIceChime()
        }

        // Transición de salida suave (melt/fade-out)
        setTimeout(() => {
          setIsExiting(true)
          setTimeout(() => {
            onCompleteRef.current?.()
          }, 450)
        }, 350)
      }
    }, intervalMs)

    return () => clearInterval(timer)
  }, [duration, userName])

  return (
    <div
      className={`ice-loader-overlay ${isExiting ? 'is-exiting' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label="Cargando sistema AMATI"
    >
      {/* Aurora boreal de fondo */}
      <div className="ice-loader-aurora" aria-hidden="true" />

      {/* Rejilla criogénica */}
      <div className="ice-loader-grid" aria-hidden="true" />

      {/* Viñeta de congelación */}
      <div className="ice-loader-vignette" aria-hidden="true" />

      {/* Nieve y partículas flotantes */}
      <div className="ice-particles-canvas" aria-hidden="true">
        {particles.map((p) => (
          <span
            key={p.id}
            className="ice-particle"
            style={{
              left: p.left,
              fontSize: p.size,
              animationDuration: p.duration,
              animationDelay: p.delay,
              '--particle-opacity': p.opacity,
              '--drift-x': p.driftX,
            }}
          >
            {p.symbol}
          </span>
        ))}
      </div>

      {/* Botón de alternar audio opcional */}
      <button
        type="button"
        onClick={() => setSoundEnabled((prev) => !prev)}
        className="ice-sound-toggle"
        title={soundEnabled ? 'Silenciar efectos' : 'Activar sonido de cristal'}
        aria-label={soundEnabled ? 'Silenciar efectos' : 'Activar sonido de cristal'}
      >
        {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
      </button>

      {/* Cámara Criogénica Central */}
      <div className="ice-chamber-card">
        {/* Insignia de Temperatura */}
        <div className="ice-temp-badge">
          <span className="ice-temp-pulse-dot" />
          <Thermometer size={14} style={{ color: '#38d1f0' }} />
          <span className="ice-temp-text">
            CÁMARA TÉRMICA: {temperature}°C
          </span>
        </div>

        {/* Mascota Cubo de Hielo con resplandor y base holográfica */}
        <div className="ice-mascot-podium">
          <div className="ice-holo-ring" />
          <div className="ice-mascot-glow" />
          <span className="ice-crystal-sparkle" style={{ top: '8%', left: '10%' }}>❄</span>
          <span className="ice-crystal-sparkle" style={{ top: '22%', right: '8%', animationDelay: '0.8s' }}>✧</span>
          <span className="ice-crystal-sparkle" style={{ bottom: '15%', left: '12%', animationDelay: '1.4s' }}>✦</span>
          <img
            src={iceCubeImage}
            alt="Mascota AMATI Hielo"
            className="ice-mascot-img"
          />
        </div>

        {/* Marca AMATI HIELO */}
        <h1 className="ice-brand-heading">AMATI HIELO</h1>
        {subtext ? <p className="ice-brand-subtitle">{subtext}</p> : null}

        {/* Barra de progreso criogénica */}
        <div className="ice-progress-wrapper">
          <div className="ice-progress-header">
            <span className="ice-progress-label">
              <Snowflake size={14} style={{ color: '#38d1f0', animationDuration: '6s' }} className="animate-spin" />
              <span>{userName ? 'Accediendo al sistema...' : 'Iniciando sistema...'}</span>
            </span>
            <span className="ice-progress-percentage">{progress}%</span>
          </div>

          <div
            className="ice-progress-track"
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin="0"
            aria-valuemax="100"
          >
            <div
              className="ice-progress-fill"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Mensaje de estado dinámico */}
        <div className="ice-status-box">
          <p key={statusMessage} className="ice-status-message">
            {statusMessage}
          </p>
        </div>

        {/* Diagnóstico de Telemetría Criogénica */}
        <div className="ice-telemetry-grid">
          <div className="ice-telemetry-item">
            <span className="ice-telemetry-key">CONEXIÓN</span>
            <span className="ice-telemetry-val active">
              <Cpu size={12} style={{ color: '#38d1f0' }} />
              <span>ENLACE SSL</span>
            </span>
          </div>

          <div className="ice-telemetry-item">
            <span className="ice-telemetry-key">MÓDULOS</span>
            <span className="ice-telemetry-val active">
              <Database size={12} style={{ color: '#38d1f0' }} />
              <span>{progress > 65 ? '8/8 LISTOS' : 'CARGANDO'}</span>
            </span>
          </div>

          <div className="ice-telemetry-item">
            <span className="ice-telemetry-key">SEGURIDAD</span>
            <span className="ice-telemetry-val active">
              <ShieldCheck size={12} style={{ color: '#38d1f0' }} />
              <span>{progress > 85 ? (userName ? 'AUTORIZADO' : 'SEGURO') : 'VERIFICANDO'}</span>
            </span>
          </div>
        </div>

        {/* Botón opcional de cancelar/omitir si se requiere */}
        {showCancel && onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="mt-4 text-xs text-cyan-300 hover:text-white underline underline-offset-4 transition-colors"
          >
            Omitir animación
          </button>
        )}
      </div>
    </div>
  )
}

IceLoadingScreen.propTypes = {
  onComplete: PropTypes.func,
  duration: PropTypes.number,
  userName: PropTypes.string,
  subtext: PropTypes.string,
  initialMessage: PropTypes.string,
  onCancel: PropTypes.func,
  showCancel: PropTypes.bool,
}
