import { supabaseAdmin } from '../backend/src/config/supabaseAdmin.js';

async function run() {
  const { data: recetas, error } = await supabaseAdmin.from('receta').select('id, codigo, nombre, imagen_url');
  if (error) {
    console.error('Error fetching recipes:', error);
    process.exit(1);
  }

  console.log(`Total recetas: ${recetas.length}`);
  for (const r of recetas) {
    const hasImg = Boolean(r.imagen_url);
    const isBase64 = hasImg && r.imagen_url.startsWith('data:');
    const isUrl = hasImg && r.imagen_url.startsWith('http');
    const len = hasImg ? r.imagen_url.length : 0;
    const mimeMatch = isBase64 ? r.imagen_url.match(/^data:([^;]+);base64,/) : null;
    const mime = mimeMatch ? mimeMatch[1] : (isUrl ? 'url' : 'ninguno');
    console.log(`- ID: ${r.id} | Código: ${r.codigo} | Nombre: ${r.nombre}`);
    console.log(`  Tiene imagen: ${hasImg} | Tipo: ${isBase64 ? 'Base64 (' + mime + ')' : isUrl ? 'URL' : 'Sin imagen'} | Bytes aprox: ${(len * 0.75 / 1024).toFixed(1)} KB`);
  }
}

run().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
