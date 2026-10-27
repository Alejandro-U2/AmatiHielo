import { supabaseAdmin } from '../backend/src/config/supabaseAdmin.js';

async function testBucket() {
  const BUCKET_NAME = 'recetas-imagenes';
  console.log('Verificando bucket:', BUCKET_NAME);

  const { data: bucket, error: getErr } = await supabaseAdmin.storage.getBucket(BUCKET_NAME);
  if (getErr || !bucket) {
    console.log('El bucket no existe, creándolo con public: true...');
    const { data: created, error: createErr } = await supabaseAdmin.storage.createBucket(BUCKET_NAME, {
      public: true,
      allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml'],
      fileSizeLimit: 5 * 1024 * 1024, // 5MB limit
    });
    if (createErr) {
      console.error('Error al crear bucket:', createErr);
      process.exit(1);
    }
    console.log('Bucket creado exitosamente:', created);
  } else {
    console.log('Bucket existente encontrado:', bucket);
  }

  // Verificar URL pública de prueba
  const { data: urlData } = supabaseAdmin.storage.from(BUCKET_NAME).getPublicUrl('test-probe.txt');
  console.log('Ejemplo de URL pública generada:', urlData.publicUrl);
}

testBucket().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
