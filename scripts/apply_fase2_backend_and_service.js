import fs from 'fs';

function patchFile(filePath, transforms) {
  let content = fs.readFileSync(filePath, 'utf8');
  const isCRLF = content.includes('\r\n');
  let norm = content.replace(/\r\n/g, '\n');

  for (const { target, replacement } of transforms) {
    if (!norm.includes(target)) {
      throw new Error(`Target not found in ${filePath}:\n${target}`);
    }
    norm = norm.replace(target, replacement);
  }

  if (isCRLF) {
    norm = norm.replace(/\n/g, '\r\n');
  }
  fs.writeFileSync(filePath, norm, 'utf8');
  console.log(`Successfully patched: ${filePath}`);
}

// 1. backend/src/controllers/recetasController.js
const storageHelper = `const RECETAS_STORAGE_BUCKET = 'recetas-imagenes'

function getExtensionFromMime(mime) {
  switch (mime) {
    case 'image/png': return 'png'
    case 'image/jpeg':
    case 'image/jpg': return 'jpg'
    case 'image/webp': return 'webp'
    case 'image/gif': return 'gif'
    case 'image/svg+xml': return 'svg'
    default: return 'png'
  }
}

async function processRecetaImage(rawImg, codigo = 'receta') {
  if (!rawImg || typeof rawImg !== 'string') return null
  const trimmed = rawImg.trim()
  if (!trimmed) return null

  // If already a public URL, keep it
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed
  }

  // If Base64 Data URL, upload to Supabase Storage
  if (trimmed.startsWith('data:image/')) {
    try {
      const mimeMatch = trimmed.match(/^data:([^;]+);base64,/i)
      const mime = mimeMatch ? mimeMatch[1].toLowerCase() : 'image/png'
      const ext = getExtensionFromMime(mime)
      const base64Data = trimmed.replace(/^data:[^;]+;base64,/i, '')
      const buffer = Buffer.from(base64Data, 'base64')

      const cleanCode = String(codigo || 'receta').toLowerCase().replace(/[^a-z0-9]/g, '_')
      const fileName = \`receta_\${cleanCode}_\${Date.now()}.\${ext}\`

      const { error: uploadError } = await supabaseAdmin.storage
        .from(RECETAS_STORAGE_BUCKET)
        .upload(fileName, buffer, {
          contentType: mime,
          upsert: true,
        })

      if (uploadError) {
        console.error('[Recetas] Error al subir imagen a Supabase Storage:', uploadError)
        return null
      }

      const { data: urlData } = supabaseAdmin.storage
        .from(RECETAS_STORAGE_BUCKET)
        .getPublicUrl(fileName)

      return urlData?.publicUrl || null
    } catch (err) {
      console.error('[Recetas] Excepción al procesar imagen de receta:', err)
      return null
    }
  }

  return null
}
`;

patchFile('backend/src/controllers/recetasController.js', [
  {
    target: `let hasImagenUrlCache = null`,
    replacement: `${storageHelper}\nlet hasImagenUrlCache = null`,
  },
  {
    target: `    const codigo = payload.codigo || await generarCodigoReceta()
    const { data, error } = await supabaseAdmin`,
    replacement: `    const codigo = payload.codigo || await generarCodigoReceta()
    if (insertPayload.imagen_url && insertPayload.imagen_url.startsWith('data:image/')) {
      insertPayload.imagen_url = await processRecetaImage(insertPayload.imagen_url, codigo)
    }
    const { data, error } = await supabaseAdmin`,
  },
  {
    target: `    const { data, error } = await supabaseAdmin
      .from('receta')
      .update(updatePayload)
      .eq('id', id)`,
    replacement: `    if (updatePayload.imagen_url && updatePayload.imagen_url.startsWith('data:image/')) {
      updatePayload.imagen_url = await processRecetaImage(updatePayload.imagen_url, updatePayload.codigo || id)
    }
    const { data, error } = await supabaseAdmin
      .from('receta')
      .update(updatePayload)
      .eq('id', id)`,
  },
]);

// 2. src/services/recetasService.js - Ensure localStorage only saves clean URLs
patchFile('src/services/recetasService.js', [
  {
    target: `  if (typeof localStorage !== 'undefined' && receta.codigo && input.imagenUrl) {
    localStorage.setItem(\`amati_receta_img_\${receta.codigo}\`, input.imagenUrl)
    receta.imagenUrl = input.imagenUrl
  }`,
    replacement: `  if (typeof localStorage !== 'undefined' && receta.codigo) {
    if (receta.imagenUrl && receta.imagenUrl.startsWith('http')) {
      localStorage.setItem(\`amati_receta_img_\${receta.codigo}\`, receta.imagenUrl)
    }
  }`,
  },
  {
    target: `  if (typeof localStorage !== 'undefined' && (receta.codigo || input.codigo)) {
    const code = receta.codigo || input.codigo
    if (input.imagenUrl) {
      localStorage.setItem(\`amati_receta_img_\${code}\`, input.imagenUrl)
      receta.imagenUrl = input.imagenUrl
    } else if (input.imagenUrl === '' || input.imagenUrl === null) {
      localStorage.removeItem(\`amati_receta_img_\${code}\`)
      receta.imagenUrl = null
    }
  }`,
    replacement: `  if (typeof localStorage !== 'undefined' && (receta.codigo || input.codigo)) {
    const code = receta.codigo || input.codigo
    if (receta.imagenUrl && receta.imagenUrl.startsWith('http')) {
      localStorage.setItem(\`amati_receta_img_\${code}\`, receta.imagenUrl)
    } else if (input.imagenUrl === '' || input.imagenUrl === null) {
      localStorage.removeItem(\`amati_receta_img_\${code}\`)
      receta.imagenUrl = null
    }
  }`,
  },
]);

console.log('Fase 2 backend & service modifications applied successfully!');
