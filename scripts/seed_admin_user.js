import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Parsear variables de backend/.env manualmente sin dependencias
function loadEnv() {
  const envPath = path.resolve('backend/.env');
  if (!fs.existsSync(envPath)) return {};
  const content = fs.readFileSync(envPath, 'utf8');
  const env = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx !== -1) {
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim();
      env[key] = val;
    }
  }
  return env;
}

const env = loadEnv();
const supabaseUrl = process.env.SUPABASE_URL || env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: Debes configurar SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en backend/.env');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  const usuario = process.argv[2] || 'admin';
  const email = process.argv[3] || 'admin@amati.com';
  const password = process.argv[4] || 'AmatiHielo2026!';

  console.log(`=== Creación de Superusuario Inicial para AMATI HIELO ===`);
  console.log(`Usuario : ${usuario}`);
  console.log(`Email   : ${email}`);
  console.log(`Password: ${password}`);

  // 1. Obtener rol Superusuario y estado Activo
  const { data: rol, error: errRol } = await supabaseAdmin
    .from('rol')
    .select('id')
    .eq('nombre', 'Superusuario')
    .single();

  if (errRol || !rol) {
    console.error('Error obteniendo rol Superusuario:', errRol?.message);
    process.exit(1);
  }

  const { data: estado, error: errEstado } = await supabaseAdmin
    .from('estado_usuario')
    .select('id')
    .eq('nombre', 'Activo')
    .single();

  if (errEstado || !estado) {
    console.error('Error obteniendo estado Activo:', errEstado?.message);
    process.exit(1);
  }

  // Obtener departamento y municipio por defecto
  const { data: dep } = await supabaseAdmin.from('departamento').select('id').limit(1).single();
  const { data: mun } = await supabaseAdmin.from('municipio').select('id').eq('departamento_id', dep?.id || 1).limit(1).single();

  // 2. Crear usuario en Auth
  const { data: authUser, error: authErr } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  let userId;
  if (authErr) {
    if (authErr.message.includes('already been registered') || authErr.message.includes('already registered')) {
      console.log('El usuario ya existe en Supabase Auth, buscando ID...');
      const { data: listData } = await supabaseAdmin.auth.admin.listUsers();
      const existing = listData?.users?.find(u => u.email === email);
      if (!existing) {
        console.error('No se pudo encontrar el ID del usuario existente.');
        process.exit(1);
      }
      userId = existing.id;
    } else {
      console.error('Error creando usuario en Auth:', authErr.message);
      process.exit(1);
    }
  } else {
    userId = authUser.user.id;
    console.log(`Usuario creado exitosamente en Auth con UUID: ${userId}`);
  }

  // 3. Crear o actualizar perfil
  const { error: perfilErr } = await supabaseAdmin
    .from('perfil')
    .upsert({
      id: userId,
      usuario,
      email,
      primer_nombre: 'Administrador',
      primer_apellido: 'Sistema',
      rol_id: rol.id,
      estado_usuario_id: estado.id,
      departamento_id: dep?.id || 1,
      municipio_id: mun?.id || 1,
    }, { onConflict: 'id' });

  if (perfilErr) {
    console.error('Error creando perfil en tabla perfil:', perfilErr.message);
    process.exit(1);
  }

  console.log(`\n¡Listo! El perfil de "${usuario}" está vinculado como Superusuario (Activo).`);
  console.log(`Ya puedes iniciar sesión en el sistema con:`);
  console.log(`  Usuario: ${usuario}`);
  console.log(`  Contraseña: ${password}\n`);
}

main();
