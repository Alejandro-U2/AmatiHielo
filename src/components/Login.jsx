import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import logoAmati from '../assets/logo-amati.jpg'
import { forgotPassword, isAuthenticated, login } from '../services/authService'

function Login() {
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [showForgot, setShowForgot] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [forgotStatus, setForgotStatus] = useState({ type: '', message: '' })
  const [showInactive, setShowInactive] = useState(false)
  const [inactiveUser, setInactiveUser] = useState('')

  useEffect(() => {
    if (isAuthenticated()) {
      navigate('/dashboard', { replace: true })
    }
  }, [navigate])

  const handleForgotSubmit = async (e) => {
    e.preventDefault()

    if (!forgotEmail.trim()) {
      setForgotStatus({ type: 'error', message: 'Por favor ingresa tu usuario o correo.' })
      return
    }

    setForgotStatus({ type: '', message: '' })
    setIsSending(true)

    try {
      await forgotPassword({ usernameOrEmail: forgotEmail })
      setForgotStatus({
        type: 'success',
        message: 'Si el correo existe, se envió un enlace para restablecer la contraseña.',
      })
    } catch (error) {
      setForgotStatus({ type: 'error', message: error.message || 'No fue posible enviar el enlace.' })
    } finally {
      setIsSending(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!username.trim() || !password) {
      setErrorMessage('Por favor ingresa tu usuario o correo y contraseña.')
      return
    }

    setErrorMessage('')
    setIsSubmitting(true)

    try {
      await login({ username, password, rememberMe })
      navigate('/dashboard', { replace: true })
    } catch (error) {
      if (error.inactive) {
        setInactiveUser(error.userName || username.trim())
        setErrorMessage('')
        setShowInactive(true)
      } else {
        setErrorMessage(error.message || 'Error al iniciar sesión.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a2a3a 0%, #0d3d55 40%, #0a5570 70%, #0e7090 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
      position: 'relative',
      overflow: 'hidden',
      fontFamily: "'Outfit', sans-serif",
    }}>

      <style>{`
        @keyframes snowTwinkle {
          0%, 100% { opacity: var(--base-opacity); }
          50% { opacity: var(--peak-opacity); }
        }

        @keyframes snowmanBob {
          0%, 100% { transform: translateY(0) rotate(var(--rot)); }
          50% { transform: translateY(-8px) rotate(var(--rot)); }
        }
      `}</style>

      {/* Google Fonts */}
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=Space+Grotesk:wght@400;500;600&display=swap" rel="stylesheet" />

      {/* Snowflakes background */}
      {[
        { size: 200, top: '8%', left: '6%', rot: 12, opacity: 0.32 },
        { size: 100, top: '18%', right: '8%', rot: -18, opacity: 0.25 },
        { size: 100, bottom: '24%', left: '5%', rot: 26, opacity: 0.2 },
        { size: 200, bottom: '10%', right: '10%', rot: -8, opacity: 0.3 },
        { size: 100, top: '45%', left: '3%', rot: 30, opacity: 0.2 },
        { size: 100, top: '6%', right: '22%', rot: -22, opacity: 0.24 },
        { size: 100, bottom: '34%', right: '5%', rot: 8, opacity: 0.22 },
        { size: 100, top: '62%', left: '12%', rot: -12, opacity: 0.18 },
      ].map((c, i) => (
        <span key={i} style={{
          position: 'absolute',
          top: c.top, left: c.left, right: c.right, bottom: c.bottom,
          fontSize: c.size,
          lineHeight: 1,
          color: 'rgb(170, 240, 255)',
          opacity: c.opacity,
          '--base-opacity': c.opacity,
          '--peak-opacity': Math.min(c.opacity + 0.22, 0.72),
          textShadow: '0 0 16px rgba(120,220,255,0.35)',
          transform: `rotate(${c.rot}deg)`,
          animation: `snowTwinkle ${4 + (i % 3)}s ease-in-out ${i * 0.35}s infinite`,
          pointerEvents: 'none',
          userSelect: 'none',
        }}>❄</span>
      ))}

      {/* Snowmen background */}
      {[
        { size: 150, top: '40%', left: '22%', rot: -6, opacity: 0.18 },
        { size: 86, bottom: '14%', left: '46%', rot: 2, opacity: 0.2 },
        { size: 150, top: '40%', right: '20%', rot: 7, opacity: 0.17 },
      ].map((s, i) => (
        <span key={`snowman-${i}`} style={{
          position: 'absolute',
          top: s.top, left: s.left, right: s.right, bottom: s.bottom,
          fontSize: s.size,
          lineHeight: 1,
          color: `rgba(200, 245, 255, ${s.opacity})`,
          '--rot': `${s.rot}deg`,
          textShadow: '0 0 16px rgba(120,220,255,0.28)',
          transform: `rotate(${s.rot}deg)`,
          animation: `snowmanBob ${5 + i}s ease-in-out ${i * 0.4}s infinite`,
          pointerEvents: 'none',
          userSelect: 'none',
        }}>☃</span>
      ))}

      {/* Card */}
      <div style={{
        background: 'rgba(255,255,255,0.05)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        border: '1px solid rgba(255,255,255,0.13)',
        borderRadius: 24,
        padding: '2.5rem 2.25rem',
        width: '100%',
        maxWidth: 420,
        position: 'relative',
        zIndex: 1,
      }}>

        {/* Logo */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '1.75rem' }}>
          <div style={{
            width: 84,
            height: 84,
            borderRadius: 20,
            background: 'linear-gradient(135deg, #38d1f0 0%, #0aa8cc 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 12,
            boxShadow: '0 0 32px rgba(56,209,240,0.35), 0 0 0 8px rgba(56,209,240,0.08)',
            overflow: 'hidden',
            padding: 6,
          }}>
            <img
              src={logoAmati}
              alt="AMATI HIELO"
              style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: 14 }}
            />
          </div>
          <div style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 20,
            fontWeight: 600,
            color: '#ffffff',
            letterSpacing: 5,
            textTransform: 'uppercase',
          }}>AMATI</div>
          <div style={{
            fontSize: 11,
            color: 'rgba(130,230,255,0.7)',
            letterSpacing: 6,
            textTransform: 'uppercase',
            marginTop: 2,
            fontWeight: 300,
          }}>— hielo —</div>
        </div>

        {/* Welcome */}
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <h1 style={{ margin: '0 0 6px', fontSize: 26, fontWeight: 600, color: '#ffffff', letterSpacing: -0.3 }}>
            Bienvenido
          </h1>
          <p style={{ margin: 0, fontSize: 13, color: 'rgba(160,230,255,0.6)', fontWeight: 300 }}>
            Ingresa tus credenciales para acceder al sistema
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          {errorMessage && (
            <div
              style={{
                marginBottom: '1rem',
                border: '1px solid rgba(255, 100, 100, 0.5)',
                background: 'rgba(255, 80, 80, 0.1)',
                color: '#ffd9d9',
                borderRadius: 10,
                padding: '10px 12px',
                fontSize: 13,
              }}
            >
              {errorMessage}
            </div>
          )}

          {/* Usuario */}
          <div style={{ marginBottom: '1.1rem' }}>
            <label style={{
              display: 'block',
              fontSize: 11,
              fontWeight: 500,
              color: 'rgba(160,230,255,0.75)',
              letterSpacing: '0.8px',
              textTransform: 'uppercase',
              marginBottom: 6,
            }}>Usuario o correo</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Ingresa tu usuario o correo"
              disabled={isSubmitting}
              style={{
                width: '100%',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 12,
                padding: '13px 16px',
                fontSize: 15,
                color: '#ffffff',
                fontFamily: "'Outfit', sans-serif",
                outline: 'none',
                boxSizing: 'border-box',
                opacity: isSubmitting ? 0.7 : 1,
              }}
              onFocus={e => {
                e.target.style.borderColor = 'rgba(56,209,240,0.6)'
                e.target.style.background = 'rgba(56,209,240,0.07)'
                e.target.style.boxShadow = '0 0 0 3px rgba(56,209,240,0.12)'
              }}
              onBlur={e => {
                e.target.style.borderColor = 'rgba(255,255,255,0.1)'
                e.target.style.background = 'rgba(255,255,255,0.06)'
                e.target.style.boxShadow = 'none'
              }}
            />
          </div>

          {/* Contraseña */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{
              display: 'block',
              fontSize: 11,
              fontWeight: 500,
              color: 'rgba(160,230,255,0.75)',
              letterSpacing: '0.8px',
              textTransform: 'uppercase',
              marginBottom: 6,
            }}>Contraseña</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••"
                disabled={isSubmitting}
                style={{
                  width: '100%',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 12,
                  padding: '13px 44px 13px 16px',
                  fontSize: 15,
                  color: '#ffffff',
                  fontFamily: "'Outfit', sans-serif",
                  outline: 'none',
                  boxSizing: 'border-box',
                  opacity: isSubmitting ? 0.7 : 1,
                }}
                onFocus={e => {
                  e.target.style.borderColor = 'rgba(56,209,240,0.6)'
                  e.target.style.background = 'rgba(56,209,240,0.07)'
                  e.target.style.boxShadow = '0 0 0 3px rgba(56,209,240,0.12)'
                }}
                onBlur={e => {
                  e.target.style.borderColor = 'rgba(255,255,255,0.1)'
                  e.target.style.background = 'rgba(255,255,255,0.06)'
                  e.target.style.boxShadow = 'none'
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: 14,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'rgba(160,230,255,0.5)',
                  display: 'flex',
                  alignItems: 'center',
                  padding: 4,
                }}
              >
                {showPassword ? (
                  <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                ) : (
                  <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Recuérdame + Olvidaste */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '4px 0 1.5rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, color: 'rgba(160,230,255,0.6)', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                disabled={isSubmitting}
                style={{ accentColor: '#38d1f0', width: 15, height: 15, cursor: 'pointer' }}
              />
              Recuérdame
            </label>
            <button
              type="button"
              onClick={() => {
                setForgotEmail('')
                setForgotStatus({ type: '', message: '' })
                setShowForgot(true)
              }}
              style={{
                background: 'none',
                border: 'none',
                fontSize: 13,
                color: '#38d1f0',
                cursor: 'pointer',
                fontFamily: "'Outfit', sans-serif",
                fontWeight: 400,
                padding: 0,
              }}
            >
              ¿Olvidaste tu contraseña?
            </button>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              width: '100%',
              padding: '14px',
              background: 'linear-gradient(135deg, #1ab8d8 0%, #0a8fad 100%)',
              color: '#ffffff',
              border: 'none',
              borderRadius: 12,
              fontSize: 15,
              fontWeight: 600,
              fontFamily: "'Outfit', sans-serif",
              cursor: 'pointer',
              letterSpacing: '0.5px',
              boxShadow: '0 4px 20px rgba(26,184,216,0.4)',
              transition: 'opacity 0.2s, transform 0.15s',
              opacity: isSubmitting ? 0.7 : 1,
            }}
            onMouseEnter={e => { e.target.style.opacity = '0.9'; e.target.style.transform = 'translateY(-1px)' }}
            onMouseLeave={e => { e.target.style.opacity = '1'; e.target.style.transform = 'translateY(0)' }}
            onMouseDown={e => { e.target.style.transform = 'translateY(0) scale(0.98)' }}
            onMouseUp={e => { e.target.style.transform = 'translateY(-1px) scale(1)' }}
          >
            {isSubmitting ? 'Ingresando...' : 'Iniciar sesión'}
          </button>
        </form>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '1.25rem 0 1rem' }}>
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
          <span style={{ fontSize: 11, color: 'rgba(160,230,255,0.35)', letterSpacing: 1, textTransform: 'uppercase' }}>¿Sin acceso?</span>
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
        </div>

        {/* Footer */}
        <p style={{ textAlign: 'center', fontSize: 13, color: 'rgba(160,230,255,0.45)', margin: 0 }}>
          <button
            type="button"
            style={{
              background: 'none',
              border: 'none',
              color: '#38d1f0',
              cursor: 'pointer',
              fontFamily: "'Outfit', sans-serif",
              fontSize: 13,
              fontWeight: 500,
              padding: 0,
            }}
          >
            Contacta a tu administrador
          </button>
        </p>
      </div>

      {/* Modal Olvidé mi contraseña */}
      {showForgot && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(2, 12, 20, 0.7)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem',
            zIndex: 50,
          }}
          onClick={() => setShowForgot(false)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: 20,
              padding: '2rem',
              width: '100%',
              maxWidth: 440,
              boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ marginBottom: '1.25rem' }}>
              <h2 style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 600, color: '#102a38', fontFamily: "'Outfit', sans-serif" }}>
                🔑 Recuperar contraseña
              </h2>
              <p style={{ margin: 0, fontSize: 13, color: '#5a7180', fontFamily: "'Outfit', sans-serif" }}>
                Ingresa tu usuario o correo. Te enviaremos un enlace para restablecer tu contraseña.
              </p>
            </div>

            {forgotStatus.message && (
              <div
                style={{
                  marginBottom: '1rem',
                  border: `1px solid ${forgotStatus.type === 'success' ? 'rgba(16,185,129,0.4)' : 'rgba(239,68,68,0.4)'}`,
                  background: forgotStatus.type === 'success' ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
                  color: forgotStatus.type === 'success' ? '#047857' : '#b91c1c',
                  borderRadius: 10,
                  padding: '10px 12px',
                  fontSize: 13,
                  fontFamily: "'Outfit', sans-serif",
                }}
              >
                {forgotStatus.message}
              </div>
            )}

            <form onSubmit={handleForgotSubmit}>
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#334e5e', marginBottom: 6, fontFamily: "'Outfit', sans-serif" }}>
                  Usuario o correo
                </label>
                <input
                  type="text"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="Ej: jperez o jperez@correo.com"
                  disabled={isSending}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    border: '1px solid #d1dce3',
                    borderRadius: 10,
                    padding: '12px 14px',
                    fontSize: 14,
                    color: '#102a38',
                    fontFamily: "'Outfit', sans-serif",
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setShowForgot(false)}
                  disabled={isSending}
                  style={{
                    flex: 1,
                    padding: '12px',
                    background: '#eef3f6',
                    color: '#334e5e',
                    border: 'none',
                    borderRadius: 10,
                    fontSize: 14,
                    fontWeight: 500,
                    fontFamily: "'Outfit', sans-serif",
                    cursor: 'pointer',
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSending}
                  style={{
                    flex: 1,
                    padding: '12px',
                    background: 'linear-gradient(135deg, #1ab8d8 0%, #0a8fad 100%)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: 10,
                    fontSize: 14,
                    fontWeight: 600,
                    fontFamily: "'Outfit', sans-serif",
                    cursor: 'pointer',
                    opacity: isSending ? 0.7 : 1,
                  }}
                >
                  {isSending ? 'Enviando...' : 'Enviar enlace'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Modal Usuario Inactivo */}
      {showInactive && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(2, 12, 20, 0.7)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem',
            zIndex: 60,
          }}
          onClick={() => setShowInactive(false)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: 20,
              padding: '2rem',
              width: '100%',
              maxWidth: 440,
              boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              background: 'rgba(239,68,68,0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.25rem',
            }}>
              <svg width="32" height="32" fill="none" stroke="#dc2626" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
            </div>
            <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 600, color: '#102a38', fontFamily: "'Outfit', sans-serif" }}>
                Acceso denegado
              </h2>
              <p style={{ margin: 0, fontSize: 14, color: '#5a7180', fontFamily: "'Outfit', sans-serif", lineHeight: 1.5 }}>
                Tu cuenta se encuentra <strong style={{ color: '#dc2626' }}>inactiva</strong>. Contacta a tu administrador para reactivarla.
              </p>
            </div>
            {inactiveUser && (
              <div style={{
                marginBottom: '1.25rem',
                border: '1px solid rgba(239,68,68,0.3)',
                background: 'rgba(239,68,68,0.06)',
                borderRadius: 10,
                padding: '10px 14px',
                textAlign: 'center',
              }}>
                <span style={{ fontSize: 12, color: '#6b7280', fontFamily: "'Outfit', sans-serif", display: 'block' }}>
                  Usuario
                </span>
                <span style={{ fontSize: 15, fontWeight: 600, color: '#102a38', fontFamily: "'Outfit', sans-serif" }}>
                  {inactiveUser}
                </span>
              </div>
            )}
            <button
              type="button"
              onClick={() => setShowInactive(false)}
              style={{
                width: '100%',
                padding: '13px',
                background: '#eef3f6',
                color: '#334e5e',
                border: 'none',
                borderRadius: 10,
                fontSize: 14,
                fontWeight: 600,
                fontFamily: "'Outfit', sans-serif",
                cursor: 'pointer',
              }}
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default Login