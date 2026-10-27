import { supabaseAdmin } from '../backend/src/config/supabaseAdmin.js';

async function testUploadAndFetch() {
  const BUCKET_NAME = 'recetas-imagenes';
  // Small 1x1 transparent PNG buffer
  const png1x1 = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');
  const fileName = `test_probe_${Date.now()}.png`;

  console.log('Subiendo imagen de prueba a Supabase Storage...');
  const { data: uploadData, error: uploadErr } = await supabaseAdmin.storage
    .from(BUCKET_NAME)
    .upload(fileName, png1x1, {
      contentType: 'image/png',
      upsert: true,
    });

  if (uploadErr) {
    console.error('Error al subir:', uploadErr);
    process.exit(1);
  }
  console.log('Subida exitosa:', uploadData);

  const { data: urlData } = supabaseAdmin.storage.from(BUCKET_NAME).getPublicUrl(fileName);
  console.log('URL pública generada:', urlData.publicUrl);

  console.log('Verificando acceso HTTP público directo a la CDN...');
  const res = await fetch(urlData.publicUrl);
  console.log('Respuesta HTTP:', res.status, res.statusText);
  console.log('Content-Type:', res.headers.get('content-type'));
  console.log('Content-Length:', res.headers.get('content-length'));

  if (res.status === 200) {
    console.log('¡VERIFICACIÓN EXITOSA! La imagen es 100% accesible públicamente vía CDN.');
    // Clean up probe
    await supabaseAdmin.storage.from(BUCKET_NAME).remove([fileName]);
    console.log('Sonda eliminada.');
  } else {
    console.error('Fallo al obtener la imagen públicamente:', res.status);
    process.exit(1);
  }
}

testUploadAndFetch().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
