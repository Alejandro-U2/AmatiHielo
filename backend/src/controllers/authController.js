import { supabaseAdmin } from '../config/supabaseAdmin.js'
import { supabasePublic } from '../config/supabasePublic.js'

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
