import { supabaseAdmin } from '../backend/src/config/supabaseAdmin.js';

const BUCKET_NAME = 'recetas-imagenes';

function getExtensionFromMime(mime) {
  switch (mime) {
    case 'image/png': return 'png';
    case 'image/jpeg':
    case 'image/jpg': return 'jpg';
    case 'image/webp': return 'webp';
    case 'image/gif': return 'gif';
    case 'image/svg+xml': return 'svg';
    default: return 'png';
  }
}

async function migrateImages() {
  console.log('====================================================');
  console.log('    MIGRACIÓN DE IMÁGENES A SUPABASE STORAGE (FASE 2)  ');
  console.log('====================================================\n');

  // 1. Asegurar bucket público
  console.log('1. Verificando bucket de destino:', BUCKET_NAME);
  const { data: bucket, error: bucketErr } = await supabaseAdmin.storage.getBucket(BUCKET_NAME);
  if (bucketErr || !bucket) {
    console.log('   Creando bucket público...');
    const { error: createErr } = await supabaseAdmin.storage.createBucket(BUCKET_NAME, {
      public: true,
      allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml'],
      fileSizeLimit: 5 * 1024 * 1024,
    });
    if (createErr) throw createErr;
    console.log('   Bucket creado exitosamente.');
  } else {
    console.log('   Bucket existente verificado (Público: ' + bucket.public + ').');
  }

  // 2. Consultar recetas con imágenes Base64
  console.log('\n2. Consultando recetas con imágenes Base64 en la base de datos...');
  const { data: recetas, error: queryErr } = await supabaseAdmin
    .from('receta')
    .select('id, codigo, nombre, imagen_url')
    .order('id', { ascending: true });

  if (queryErr) throw queryErr;

  const base64Recetas = recetas.filter(r => r.imagen_url && r.imagen_url.startsWith('data:image/'));
  console.log(`   Total recetas encontradas: ${recetas.length}`);
  console.log(`   Recetas con Base64 a migrar: ${base64Recetas.length}\n`);

  if (base64Recetas.length === 0) {
    console.log('No hay recetas con imágenes en Base64 pendientes de migrar.');
    return;
  }

  // 3. Procesar y migrar cada imagen
  console.log('3. Subiendo imágenes a Supabase Storage y actualizando referencias...');
  for (const r of base64Recetas) {
    const mimeMatch = r.imagen_url.match(/^data:([^;]+);base64,/i);
    const mime = mimeMatch ? mimeMatch[1].toLowerCase() : 'image/png';
    const ext = getExtensionFromMime(mime);
    const base64Data = r.imagen_url.replace(/^data:[^;]+;base64,/i, '');
    const buffer = Buffer.from(base64Data, 'base64');

    const cleanCodigo = String(r.codigo || 'rec').toLowerCase().replace(/[^a-z0-9]/g, '_');
    const fileName = `receta_${r.id}_${cleanCodigo}.${ext}`;

    console.log(`   -> Procesando Receta ID ${r.id} (${r.codigo} - ${r.nombre}):`);
    console.log(`      Tamaño Base64: ${r.imagen_url.length.toLocaleString()} caracteres`);
    console.log(`      Tamaño binario: ${(buffer.length / 1024).toFixed(1)} KB`);
    console.log(`      Destino: ${BUCKET_NAME}/${fileName}`);

    // Subir a Storage
    const { error: uploadErr } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .upload(fileName, buffer, {
        contentType: mime,
        upsert: true,
      });

    if (uploadErr) {
      console.error(`      ERROR al subir archivo ${fileName}:`, uploadErr);
      throw uploadErr;
    }

    // Obtener URL pública
    const { data: urlData } = supabaseAdmin.storage.from(BUCKET_NAME).getPublicUrl(fileName);
    const publicUrl = urlData.publicUrl;
    console.log(`      URL pública: ${publicUrl}`);

    // Verificar accesibilidad HTTP
    const testFetch = await fetch(publicUrl);
    if (testFetch.status !== 200) {
      throw new Error(`      Error: La URL no es accesible públicamente (HTTP ${testFetch.status})`);
    }
    console.log(`      Verificación HTTP CDN: 200 OK (${testFetch.headers.get('content-type')})`);

    // Actualizar tabla receta
    const { error: updateErr } = await supabaseAdmin
      .from('receta')
      .update({ imagen_url: publicUrl })
      .eq('id', r.id);

    if (updateErr) {
      console.error(`      ERROR al actualizar tabla receta para ID ${r.id}:`, updateErr);
      throw updateErr;
    }

    console.log(`      [MIGRADO EXITOSAMENTE]\n`);
  }

  console.log('====================================================');
  console.log('   MIGRACIÓN DE IMÁGENES COMPLETADA EXITOSAMENTE    ');
  console.log('====================================================');
}

migrateImages().then(() => process.exit(0)).catch((e) => {
  console.error('Error fatal durante la migración:', e);
  process.exit(1);
});
