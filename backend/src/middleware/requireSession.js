import { supabaseAdmin } from '../config/supabaseAdmin.js'

const authMode = (process.env.AUTH_MODE || process.env.VITE_AUTH_MODE || 'supabase').toLowerCase()

export async function requireSession(req, res, next) {
  try {
    const authHeader = req.headers.authorization || ''
    const [scheme, token] = authHeader.split(' ')

    if (scheme !== 'Bearer' || !token) {
      return res.status(401).json({ message: 'Falta el token Bearer.' })
    }

    if (authMode === 'mock' && token === 'mock-token') {
      req.auth = {
        user: { id: '1', email: 'admin@local.test' },
        profile: { nombre: 'Administrador', rol: 'Administrador', estado: 'Activo' },
      }
      return next()
    }

    const { data, error } = await supabaseAdmin.auth.getUser(token)

    if (error || !data?.user) {
      return res.status(401).json({ message: 'Token inválido o expirado.' })
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('perfil')
      .select('id, rol:rol_id(nombre), estado:estado_usuario_id(nombre)')
      .eq('id', data.user.id)
      .single()

    if (!profileError && profile) {
      const role = Array.isArray(profile.rol) ? profile.rol[0] : profile.rol
      const state = Array.isArray(profile.estado) ? profile.estado[0] : profile.estado
      if (state?.nombre !== 'Activo') {
        return res.status(403).json({ message: 'El usuario se encuentra inactivo. Contacta al administrador.' })
      }
      req.auth = {
        user: data.user,
        profile: {
          rol: role?.nombre || 'Operario',
          estado: state?.nombre || 'Activo',
        },
      }
    }

    if (!req.auth) req.auth = { user: data.user, profile: null }

    return next()
  } catch {
    return res.status(500).json({ message: 'No fue posible validar la sesión.' })
  }
}
