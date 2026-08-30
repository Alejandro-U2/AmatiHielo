import { supabaseAdmin } from '../config/supabaseAdmin.js'

const ALLOWED_ROLES = new Set(['Superusuario', 'Administrador'])

export async function requireAdmin(req, res, next) {
  try {
    const authHeader = req.headers.authorization || ''
    const [scheme, token] = authHeader.split(' ')

    if (scheme !== 'Bearer' || !token) {
      return res.status(401).json({ message: 'Falta el token Bearer.' })
    }

    const { data, error } = await supabaseAdmin.auth.getUser(token)

    if (error || !data?.user) {
      return res.status(401).json({ message: 'Token invalido o expirado.' })
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('perfil')
      .select('id, primer_nombre, segundo_nombre, primer_apellido, segundo_apellido, usuario, email, rol:rol_id(id, nombre), estado:estado_usuario_id(id, nombre)')
      .eq('id', data.user.id)
      .single()

    if (profileError || !profile) {
      return res.status(403).json({ message: 'No se encontro perfil para este usuario.' })
    }

    const role = Array.isArray(profile.rol) ? profile.rol[0] : profile.rol
    const state = Array.isArray(profile.estado) ? profile.estado[0] : profile.estado
    const mappedProfile = {
      ...profile,
      nombre: [profile.primer_nombre, profile.segundo_nombre, profile.primer_apellido, profile.segundo_apellido]
        .filter(Boolean)
        .map((value) => String(value).trim())
        .join(' '),
      rol: role?.nombre || 'Operario',
      estado: state?.nombre || 'Activo',
      rol_catalogo: role || null,
      estado_catalogo: state || null,
    }

    if (!ALLOWED_ROLES.has(mappedProfile.rol) || mappedProfile.estado !== 'Activo') {
      return res.status(403).json({ message: 'No tienes permisos para realizar esta accion.' })
    }

    req.auth = {
      user: data.user,
      profile: mappedProfile,
    }

    return next()
  } catch (error) {
    return res.status(500).json({ message: 'No fue posible validar permisos.' })
  }
}
