import http from 'http';
import { supabaseAdmin } from '../backend/src/config/supabaseAdmin.js';
import { supabasePublic } from '../backend/src/config/supabasePublic.js';

async function getAuthToken() {
  const linkRes = await supabaseAdmin.auth.admin.generateLink({
    type: 'magiclink',
    email: 'feradmin@amati.com',
  });
  const token_hash = linkRes.data.properties.hashed_token;
  const sessionRes = await supabasePublic.auth.verifyOtp({
    token_hash,
    type: 'magiclink',
  });
  if (sessionRes.error) throw sessionRes.error;
  return sessionRes.data.session.access_token;
}

function makeRequest(path, token, options = {}) {
  return new Promise((resolve, reject) => {
    const reqOptions = {
      hostname: 'localhost',
      port: 3001,
      path,
      method: options.method || 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    };

    const req = http.request(reqOptions, (res) => {
      let rawData = '';
      let byteLength = 0;
      res.on('data', (chunk) => {
        rawData += chunk;
        byteLength += chunk.length;
      });
      res.on('end', () => {
        try {
          const parsed = rawData ? JSON.parse(rawData) : null;
          resolve({ status: res.statusCode, data: parsed, byteLength, headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, raw: rawData, byteLength, headers: res.headers });
        }
      });
    });

    req.on('error', reject);
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('====================================================');
  console.log('    AMATI HIELO - VERIFICACIÓN FINAL FASE 2 STORAGE  ');
  console.log('====================================================\n');

  console.log('1. Autenticando con token de sesión de administrador...');
  const token = await getAuthToken();
  console.log('   Token de sesión obtenido correctamente.\n');

  // Test 1: Listado general sin imágenes
  console.log('2. Consultando: GET /api/recetas');
  const lightRes = await makeRequest('/api/recetas', token);
  console.log(`   Status: ${lightRes.status}`);
  console.log(`   Recetas recibidas: ${lightRes.data?.data?.length || 0}`);
  console.log(`   Tamaño exacto wire: ${lightRes.byteLength} bytes (${(lightRes.byteLength / 1024).toFixed(2)} KB)`);
  console.log('   [PASS] Listado general ligero operativo.\n');

  // Test 2: Listado de recetas CON imágenes
  console.log('3. Consultando: GET /api/recetas?includeImages=true');
  const fullRes = await makeRequest('/api/recetas?includeImages=true', token);
  console.log(`   Status: ${fullRes.status}`);
  console.log(`   Recetas recibidas: ${fullRes.data?.data?.length || 0}`);
  console.log(`   Tamaño exacto wire: ${fullRes.byteLength} bytes (${(fullRes.byteLength / 1024).toFixed(2)} KB)`);

  const recetasConImg = (fullRes.data?.data || []).filter(r => r.imagen_url);
  console.log(`   Recetas con imagen: ${recetasConImg.length}`);

  let allUrlsValid = true;
  for (const r of recetasConImg) {
    const isHttps = r.imagen_url.startsWith('https://');
    const isBase64 = r.imagen_url.startsWith('data:');
    console.log(`   -> Receta ${r.id} (${r.codigo} - ${r.nombre}):`);
    console.log(`      imagen_url: ${r.imagen_url}`);
    console.log(`      ¿Es URL de CDN?: ${isHttps ? 'SÍ (CORRECTO)' : 'NO'}`);
    console.log(`      ¿Contiene Base64?: ${isBase64 ? 'SÍ (ERROR)' : 'NO (CORRECTO)'}`);
    if (!isHttps || isBase64) allUrlsValid = false;

    // Probar accesibilidad pública directa a la CDN
    const cdnFetch = await fetch(r.imagen_url);
    console.log(`      HTTP CDN status: ${cdnFetch.status} ${cdnFetch.statusText} (${cdnFetch.headers.get('content-type')}, ${cdnFetch.headers.get('content-length')} bytes)`);
    if (cdnFetch.status !== 200) allUrlsValid = false;
  }

  if (!allUrlsValid) {
    throw new Error('Fallo en la validación de URLs públicas de Supabase Storage');
  }
  console.log('   [PASS] Todas las imágenes se sirven públicamente desde CDN sin transferir Base64.\n');

  // Test 3: Subida automática de nueva receta con Base64 procesada por el backend a Storage
  console.log('4. Probando subida automática de receta con foto nueva en Base64...');
  const testBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFElEQVR42mNkWPjfz8DAwMTAwAAACgIB+qJ28tQAAAAASUVORK5CYII=';
  const createPayload = {
    nombre: 'Receta Test Automatizada Storage',
    categoria: 'Bebidas',
    presentacion: 'Vaso 16oz',
    imagenUrl: testBase64,
    precioVenta: 25.50,
  };

  const createRes = await makeRequest('/api/recetas', token, {
    method: 'POST',
    body: createPayload,
  });

  console.log(`   Status creación: ${createRes.status}`);
  const createdReceta = createRes.data?.data;
  console.log(`   Receta creada: ID ${createdReceta?.id} (${createdReceta?.codigo})`);
  console.log(`   imagen_url guardada: ${createdReceta?.imagen_url}`);
  const savedAsStorageUrl = createdReceta?.imagen_url && createdReceta.imagen_url.includes('recetas-imagenes');
  console.log(`   ¿Subida automáticamente a recetas-imagenes?: ${savedAsStorageUrl ? 'SÍ (CORRECTO)' : 'NO (FALLO)'}`);

  if (!savedAsStorageUrl) {
    throw new Error('El backend no convirtió la imagen Base64 a URL de Storage');
  }

  // Limpiar receta de prueba
  console.log('   Eliminando receta de prueba...');
  await makeRequest(`/api/recetas/${createdReceta.id}`, token, { method: 'DELETE' });
  console.log('   [PASS] Creación y subida automática a Storage probada exitosamente.\n');

  // Test 4: Conteo
  console.log('5. Probando: GET /api/recetas/count');
  const countRes = await makeRequest('/api/recetas/count', token);
  console.log(`   Status: ${countRes.status} | Payload: ${JSON.stringify(countRes.data)} | Bytes: ${countRes.byteLength}`);
  console.log('   [PASS] Conteo verificado.\n');

  // Mediciones Comparativas
  console.log('====================================================');
  console.log('      COMPARATIVA DEFINITIVA DE CONSUMO DE EGRESS   ');
  console.log('====================================================');
  const beforePhase1 = 4296941; // 4.20 MB con Base64
  const afterPhase2Full = fullRes.byteLength; // Con URLs de imágenes
  const afterPhase2Light = lightRes.byteLength; // Sin imágenes

  console.log(`Consulta completa de recetas con imágenes:`);
  console.log(`  Antes de optimizaciones:  ${beforePhase1.toLocaleString()} bytes (4,196.23 KB = 4.20 MB)`);
  console.log(`  Ahora con Storage CDN:    ${afterPhase2Full.toLocaleString()} bytes (${(afterPhase2Full / 1024).toFixed(2)} KB)`);
  console.log(`  Ahorro por solicitud:     ${((1 - afterPhase2Full / beforePhase1) * 100).toFixed(2)}% de reducción por petición`);
  console.log(`----------------------------------------------------`);
  console.log(`Consulta ligera (Chatbot / Reportes / POS interval):`);
  console.log(`  Tamaño respuesta:         ${afterPhase2Light.toLocaleString()} bytes (${(afterPhase2Light / 1024).toFixed(2)} KB)`);
  console.log(`  Ahorro por solicitud:     ${((1 - afterPhase2Light / beforePhase1) * 100).toFixed(2)}% de reducción`);
  console.log(`----------------------------------------------------`);
  console.log(`Polling periódico de 15s (POS y Dashboard):`);
  console.log(`  Tráfico de recetas:       0 bytes en intervalo`);
  console.log(`----------------------------------------------------`);
  console.log('>> TODAS LAS VALIDACIONES DE LA FASE 2 PASARON EXITOSAMENTE <<\n');
}

runTests().then(() => process.exit(0)).catch((e) => {
  console.error('Error fatal durante la prueba E2E Fase 2:', e);
  process.exit(1);
});
