import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { resetPassword } from '../services/authService'

function RecuperarContrasena() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const hashParams = new URLSearchParams(
    window.location.hash.startsWith('#') ? window.location.hash.slice(1) : window.location.hash,
  )

  const code = searchParams.get('code') || ''
  const email = searchParams.get('email') || ''
  const tokenHash = searchParams.get('token_hash') || ''
  const type = searchParams.get('type') || ''
  const accessToken = hashParams.get('access_token') || ''

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const linkValido = Boolean(tokenHash || (code && email) || accessToken)

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (password.length < 6) {
      setErrorMessage('La contraseña debe tener al menos 6 caracteres.')
      return
    }

    if (password !== confirmPassword) {
      setErrorMessage('Las contraseñas no coinciden.')
      return
    }

    setErrorMessage('')
    setIsSubmitting(true)

    try {
      const payload = { password }
      if (tokenHash) {
        payload.tokenHash = tokenHash
        payload.type = type || 'recovery'
      } else if (code && email) {
        payload.code = code
        payload.email = email
      } else if (accessToken) {
        payload.accessToken = accessToken
      }

      await resetPassword(payload)
      navigate('/', { replace: true })
    } catch (error) {
      setErrorMessage(error.message || 'No fue posible restablecer la contraseña.')
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
      <div style={{
        background: '#ffffff',
        borderRadius: 20,
        padding: '2.25rem',
        width: '100%',
        maxWidth: 440,
        boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
      }}>
        <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
          <div style={{
            fontSize: 40,
            lineHeight: 1,
            marginBottom: 12,
          }}>🔑</div>
          <h1 style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 600, color: '#102a38' }}>
            Nueva contraseña
          </h1>
          <p style={{ margin: 0, fontSize: 13, color: '#5a7180' }}>
            Define tu nueva contraseña para {email || 'tu cuenta'}
          </p>
        </div>

        {!linkValido && (
          <div style={{
            border: '1px solid rgba(239, 68, 68, 0.4)',
            background: 'rgba(239, 68, 68, 0.08)',
            color: '#b91c1c',
            borderRadius: 10,
            padding: '12px 14px',
            fontSize: 13,
          }}>
            El enlace de recuperación no es válido o venció. Solicita uno nuevo desde la pantalla de inicio.
          </div>
        )}

        {linkValido && (
          <form onSubmit={handleSubmit}>
            {errorMessage && (
              <div style={{
                border: '1px solid rgba(239, 68, 68, 0.4)',
                background: 'rgba(239, 68, 68, 0.08)',
                color: '#b91c1c',
                borderRadius: 10,
                padding: '10px 12px',
                fontSize: 13,
                marginBottom: '1rem',
              }}>
                {errorMessage}
              </div>
            )}

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#334e5e', marginBottom: 6 }}>
                Nueva contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                disabled={isSubmitting}
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

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#334e5e', marginBottom: 6 }}>
                Confirmar contraseña
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repite la contraseña"
                disabled={isSubmitting}
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
                onClick={() => navigate('/')}
                disabled={isSubmitting}
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
                Volver
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
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
                  opacity: isSubmitting ? 0.7 : 1,
                }}
              >
                {isSubmitting ? 'Guardando...' : 'Guardar contraseña'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

export default RecuperarContrasena