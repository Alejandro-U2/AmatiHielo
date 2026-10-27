import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { resetPassword } from '../services/authService'
import { supabase } from '../services/supabaseClient'

function formatErrorMessage(desc = '') {
  const d = String(desc).toLowerCase()
  if (d.includes('expired') || d.includes('invalid') || d.includes('expir') || d.includes('ya fue usado') || d.includes('otp_expired')) {
    return 'El enlace de recuperación ya fue utilizado o ha expirado. Por favor, solicita uno nuevo.'
  }
  return desc || 'El enlace de recuperación no es válido o ha expirado.'
}

function RecuperarContrasena() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isValidating, setIsValidating] = useState(true)
  const [linkValido, setLinkValido] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [activeSession, setActiveSession] = useState(null)

  useEffect(() => {
    let isMounted = true

    async function validarEnlace() {
      const hashParams = new URLSearchParams(
        window.location.hash.startsWith('#') ? window.location.hash.slice(1) : window.location.hash,
      )

      // 1. Detectar si Supabase envió un error explícito (ej. enlace expirado o ya usado)
      const errorDesc = searchParams.get('error_description') || hashParams.get('error_description') || searchParams.get('error') || hashParams.get('error')
      if (errorDesc) {
        if (isMounted) {
          setErrorMessage(formatErrorMessage(decodeURIComponent(errorDesc)))
          setLinkValido(false)
          setIsValidating(false)
        }
        return
      }

      // 2. Extraer parámetros de la URL
      const code = searchParams.get('code') || hashParams.get('code') || ''
      const email = searchParams.get('email') || hashParams.get('email') || ''
      const tokenHash = searchParams.get('token_hash') || hashParams.get('token_hash') || searchParams.get('token') || hashParams.get('token') || ''
      const type = searchParams.get('type') || hashParams.get('type') || ''
      const accessToken = hashParams.get('access_token') || searchParams.get('access_token') || ''
      const refreshToken = hashParams.get('refresh_token') || searchParams.get('refresh_token') || ''

      if (email && isMounted) {
        setUserEmail(email)
      }

      // 3. Si hay código de autorización PKCE (flujo por defecto de Supabase Auth)
      if (code) {
        try {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code)
          if (!error && data?.session) {
            if (isMounted) {
              setActiveSession(data.session)
              setUserEmail(data.user?.email || email || '')
              setLinkValido(true)
              setIsValidating(false)
            }
            return
          }
          if (error) {
            console.warn('exchangeCodeForSession devolvió:', error.message)
          }
        } catch (err) {
          console.warn('Error en exchangeCodeForSession:', err)
        }
      }

      // 4. Si hay token_hash en la URL
      if (tokenHash) {
        try {
          const { data, error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: type || 'recovery',
          })
          if (!error && data?.session) {
            if (isMounted) {
              setActiveSession(data.session)
              setUserEmail(data.user?.email || email || '')
              setLinkValido(true)
              setIsValidating(false)
            }
            return
          }
        } catch (err) {
          console.warn('Error verificando token_hash:', err)
        }
      }

      // 5. Si hay access_token en el hash fragmento
      if (accessToken) {
        try {
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || '',
          })
          if (!error && data?.session) {
            if (isMounted) {
              setActiveSession(data.session)
              setUserEmail(data.user?.email || email || '')
              setLinkValido(true)
              setIsValidating(false)
            }
            return
          }
        } catch (err) {
          console.warn('Error estableciendo sesión con accessToken:', err)
        }
      }

      // 6. Verificar si el cliente de Supabase ya procesó la sesión automáticamente en segundo plano
      try {
        const { data: sessionData } = await supabase.auth.getSession()
        if (sessionData?.session) {
          if (isMounted) {
            setActiveSession(sessionData.session)
            setUserEmail(sessionData.session.user?.email || email || '')
            setLinkValido(true)
            setIsValidating(false)
          }
          return
        }
      } catch (err) {
        console.warn('Error obteniendo sesión:', err)
      }

      // 7. Si hay código o tokenHash presente aunque el canje en frontend esté pendiente, permitir envío vía backend
      if (code || tokenHash || accessToken) {
        if (isMounted) {
          setLinkValido(true)
          setIsValidating(false)
        }
        return
      }

      // Si no hay parámetros ni sesión válida tras revisar
      if (isMounted) {
        setLinkValido(false)
        setErrorMessage('El enlace de recuperación no es válido o ha expirado. Solicita uno nuevo.')
        setIsValidating(false)
      }
    }

    validarEnlace()

    // Escuchar evento PASSWORD_RECOVERY del cliente Supabase
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) {
        if (isMounted) {
          setActiveSession(session)
          setUserEmail(session?.user?.email || '')
          setLinkValido(true)
          setIsValidating(false)
        }
      }
    })

    return () => {
      isMounted = false
      authListener?.subscription?.unsubscribe()
    }
  }, [searchParams])

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
      let updated = false

      // 1. Intentar actualizar contraseña a través del cliente de Supabase con la sesión activa
      try {
        const { error: sbError } = await supabase.auth.updateUser({ password })
        if (!sbError) {
          updated = true
        } else {
          console.warn('supabase.auth.updateUser falló, intentando por backend:', sbError.message)
        }
      } catch (sbErr) {
        console.warn('Excepción en supabase.auth.updateUser:', sbErr)
      }

      // 2. Si no se actualizó directamente en frontend, enviar al backend
      if (!updated) {
        const hashParams = new URLSearchParams(
          window.location.hash.startsWith('#') ? window.location.hash.slice(1) : window.location.hash,
        )
        const code = searchParams.get('code') || hashParams.get('code') || ''
        const tokenHash = searchParams.get('token_hash') || hashParams.get('token_hash') || searchParams.get('token') || hashParams.get('token') || ''
        const type = searchParams.get('type') || hashParams.get('type') || ''
        const accessToken = hashParams.get('access_token') || searchParams.get('access_token') || activeSession?.access_token || ''
        const email = searchParams.get('email') || hashParams.get('email') || userEmail || ''

        const payload = { password }
        if (accessToken) {
          payload.accessToken = accessToken
        } else if (tokenHash) {
          payload.tokenHash = tokenHash
          payload.type = type || 'recovery'
        } else if (code) {
          payload.code = code
          if (email) payload.email = email
        }

        await resetPassword(payload)
      }

      // 3. Cerrar sesión de recuperación
      try {
        await supabase.auth.signOut()
      } catch {}

      // 4. Notificar éxito y redirigir
      setSuccessMessage('¡Contraseña actualizada con éxito! Redirigiendo al inicio de sesión...')
      setTimeout(() => {
        navigate('/', { replace: true })
      }, 2200)
    } catch (error) {
      setErrorMessage(error.message || 'No fue posible restablecer la contraseña. Solicita un nuevo enlace.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a2a3a] via-[#0d3d55] to-[#0e7090] flex items-center justify-center p-3 sm:p-6 font-['Outfit',sans-serif] relative overflow-hidden">
      <div className="bg-white dark:bg-[#18181f] rounded-2xl sm:rounded-3xl p-5 sm:p-8 w-full max-w-[440px] shadow-2xl border border-white/20 dark:border-[#2b2b38] transition-colors">
        <div className="mb-5 sm:mb-6 text-center">
          <div className="text-3xl sm:text-4xl leading-none mb-2.5">🔑</div>
          <h1 className="m-0 mb-1.5 text-xl sm:text-2xl font-semibold text-[#102a38] dark:text-[#e4e4e7]">
            Nueva contraseña
          </h1>
          <p className="m-0 text-xs sm:text-sm text-[#5a7180] dark:text-[#a1a1aa] break-words">
            {userEmail ? `Define tu nueva contraseña para ${userEmail}` : 'Define una nueva contraseña para tu cuenta'}
          </p>
        </div>

        {/* Estado de validación en curso */}
        {isValidating && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="w-9 h-9 border-3 border-cyan-500 border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-sm font-medium text-[#102a38] dark:text-[#e4e4e7]">Verificando enlace de recuperación...</p>
            <p className="text-xs text-[#5a7180] dark:text-[#a1a1aa] mt-1">Un momento por favor</p>
          </div>
        )}

        {/* Enlace no válido o expirado */}
        {!isValidating && !linkValido && (
          <div className="space-y-4">
            <div className="border border-red-500/40 bg-red-50 text-red-700 rounded-xl p-3.5 text-xs sm:text-sm">
              <p className="font-semibold mb-1">Enlace no disponible</p>
              <p>{errorMessage || 'El enlace de recuperación no es válido o ya venció.'}</p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/')}
              className="w-full py-3 px-4 bg-gradient-to-r from-[#1ab8d8] to-[#0a8fad] hover:from-[#17a3c0] hover:to-[#087b95] text-white rounded-xl text-sm font-semibold shadow-md transition-all cursor-pointer"
            >
              Solicitar nuevo enlace
            </button>
          </div>
        )}

        {/* Éxito tras actualizar */}
        {successMessage && (
          <div className="border border-emerald-500/40 bg-emerald-50 text-emerald-800 rounded-xl p-4 text-xs sm:text-sm text-center">
            <p className="font-bold text-sm mb-1">¡Listo!</p>
            <p>{successMessage}</p>
          </div>
        )}

        {/* Formulario de nueva contraseña cuando el enlace es válido */}
        {!isValidating && linkValido && !successMessage && (
          <form onSubmit={handleSubmit}>
            {errorMessage && (
              <div className="border border-red-500/40 bg-red-50 text-red-700 rounded-xl p-3 text-xs sm:text-sm mb-4">
                {errorMessage}
              </div>
            )}

            <div className="mb-4">
              <label className="block text-xs font-medium text-[#334e5e] dark:text-[#d4d4d8] mb-1.5">
                Nueva contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                disabled={isSubmitting}
                autoFocus
                className="w-full box-border border border-[#d1dce3] dark:border-[#424254] bg-white dark:bg-[#1a1a23] rounded-xl px-3.5 py-2.5 sm:py-3 text-sm text-[#102a38] dark:text-[#e4e4e7] outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all"
              />
            </div>

            <div className="mb-6">
              <label className="block text-xs font-medium text-[#334e5e] dark:text-[#d4d4d8] mb-1.5">
                Confirmar contraseña
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repite la contraseña"
                disabled={isSubmitting}
                className="w-full box-border border border-[#d1dce3] dark:border-[#424254] bg-white dark:bg-[#1a1a23] rounded-xl px-3.5 py-2.5 sm:py-3 text-sm text-[#102a38] dark:text-[#e4e4e7] outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all"
              />
            </div>

            <div className="flex flex-col-reverse sm:flex-row gap-2.5 sm:gap-3">
              <button
                type="button"
                onClick={() => navigate('/')}
                disabled={isSubmitting}
                className="w-full sm:flex-1 py-3 px-4 bg-[#eef3f6] dark:bg-[#262632] hover:bg-[#e2eaf0] dark:hover:bg-[#313140] text-[#334e5e] dark:text-[#e4e4e7] rounded-xl text-sm font-medium transition-colors cursor-pointer disabled:opacity-50"
              >
                Volver
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full sm:flex-1 py-3 px-4 bg-gradient-to-r from-[#1ab8d8] to-[#0a8fad] hover:from-[#17a3c0] hover:to-[#087b95] text-white rounded-xl text-sm font-semibold shadow-md transition-all cursor-pointer disabled:opacity-60"
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
