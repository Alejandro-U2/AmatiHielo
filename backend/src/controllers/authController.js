import { supabaseAdmin } from '../config/supabaseAdmin.js'
import { supabasePublic } from '../config/supabasePublic.js'

const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173'
const MIN_PASSWORD_LENGTH = 6

function normalizeIdentifier(value = '') {
  return value.trim()
}

async function resolveEmail(identifier) {
  const normalized = normalizeIdentifier(identifier)

  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)
  if (isEmail) {
    return normalized.toLowerCase()
  }

  const { data, error } = await supabaseAdmin
    .from('perfil')
    .select('email')
    .ilike('usuario', normalized)
    .maybeSingle()

  if (error) {
    throw error
  }

  if (!data?.email) {
    return null
  }

  return data.email.toLowerCase()
}

export async function login(req, res) {
  const { usernameOrEmail, password } = req.body || {}

  if (!usernameOrEmail || !password) {
    return res.status(400).json({ message: 'usernameOrEmail y password son obligatorios.' })
  }

  try {
    const email = await resolveEmail(usernameOrEmail)

    if (!email) {
      return res.status(404).json({ message: 'No se encontro un usuario con ese correo o usuario.' })
    }

    const { data, error } = await supabasePublic.auth.signInWithPassword({
      email,
      password,
    })

    if (error || !data?.session || !data?.user) {
      return res.status(401).json({ message: error?.message || 'Credenciales invalidas.' })
    }

    const { data: profile } = await supabaseAdmin
      .from('perfil')
      .select('id, primer_nombre, segundo_nombre, primer_apellido, segundo_apellido, usuario, email, rol:rol_id(id, nombre), estado:estado_usuario_id(id, nombre)')
      .eq('id', data.user.id)
      .single()

    const role = Array.isArray(profile?.rol) ? profile.rol[0] : profile?.rol
    const state = Array.isArray(profile?.estado) ? profile.estado[0] : profile?.estado
    const profileNombre = [profile?.primer_nombre, profile?.segundo_nombre, profile?.primer_apellido, profile?.segundo_apellido]
      .filter(Boolean)
      .map((value) => String(value).trim())
      .join(' ')

    const stateName = String(state?.nombre || 'Activo').trim().toLowerCase()
    if (stateName !== 'activo') {
      return res.status(403).json({
        inactive: true,
        userName: profileNombre || profile?.usuario,
        message: 'Tu cuenta se encuentra inactiva. Contacta a tu administrador para reactivarla.',
      })
    }

    return res.json({
      token: data.session.access_token,
      user: {
        id: data.user.id,
        username: profile?.usuario || data.user.email,
        email: data.user.email,
        nombre: profileNombre || data.user.user_metadata?.nombre || data.user.email,
        rol: role?.nombre || data.user.user_metadata?.rol || 'Operario',
        estado: state?.nombre || 'Activo',
      },
    })
  } catch (error) {
    return res.status(500).json({ message: error?.message || 'No fue posible iniciar sesion.' })
  }
}

export async function forgotPassword(req, res) {
  const { usernameOrEmail } = req.body || {}

  if (!usernameOrEmail) {
    return res.status(400).json({ message: 'usernameOrEmail es obligatorio.' })
  }

  try {
    const email = await resolveEmail(usernameOrEmail)

    const genericMessage = 'Si el correo existe, se envió un enlace para restablecer la contraseña.'

    if (!email) {
      return res.json({ message: genericMessage })
    }

    const redirectTo = `${frontendUrl}/recuperar`
    const { error } = await supabasePublic.auth.resetPasswordForEmail(email, { redirectTo })

    if (error) {
      return res.status(400).json({ message: error.message })
    }

    return res.json({ message: genericMessage })
  } catch (error) {
    return res.status(500).json({ message: error?.message || 'No fue posible enviar el enlace.' })
  }
}

export async function resetPassword(req, res) {
  const { code, email, tokenHash, type, accessToken, password } = req.body || {}

  if (!tokenHash && !(code && email) && !accessToken) {
    return res.status(400).json({ message: 'El enlace no es válido o ya fue usado.' })
  }

  if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
    return res.status(400).json({
      message: `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`,
    })
  }

  try {
    let userId = null

    if (tokenHash) {
      const { data, error } = await supabasePublic.auth.verifyOtp({
        token_hash: tokenHash,
        type: type || 'recovery',
      })

      if (error || !data?.user?.id) {
        return res.status(400).json({ message: error?.message || 'El enlace no es válido o ya fue usado.' })
      }
      userId = data.user.id
    } else if (accessToken) {
      const { data, error } = await supabaseAdmin.auth.getUser(accessToken)

      if (error || !data?.user?.id) {
        return res.status(400).json({ message: error?.message || 'El enlace no es válido o ya fue usado.' })
      }
      userId = data.user.id
    } else {
      const { data, error } = await supabasePublic.auth.verifyOtp({
        email,
        token: code,
        type: 'recovery',
      })

      if (error || !data?.user?.id) {
        return res.status(400).json({ message: error?.message || 'El enlace no es válido o ya fue usado.' })
      }
      userId = data.user.id
    }

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password,
    })

    if (updateError) {
      return res.status(400).json({ message: updateError.message })
    }

    return res.json({ message: 'Contraseña actualizada correctamente. Ya puedes iniciar sesión.' })
  } catch (error) {
    return res.status(500).json({ message: error?.message || 'No fue posible restablecer la contraseña.' })
  }
}
