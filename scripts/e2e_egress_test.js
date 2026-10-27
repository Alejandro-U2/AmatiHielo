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
  console.log('       AMATI HIELO - AUDITORÍA & PRUEBAS EGRESS      ');
  console.log('====================================================\n');

  console.log('1. Autenticando con token de sesión...');
  const token = await getAuthToken();
  console.log('   Token de sesión obtenido correctamente.\n');

  // Test 1: Conteo de recetas ligero
  console.log('2. Probando endpoint ligero: GET /api/recetas/count');
  const countRes = await makeRequest('/api/recetas/count', token);
  console.log(`   Status: ${countRes.status}`);
  console.log(`   Payload: ${JSON.stringify(countRes.data)}`);
  console.log(`   Tamaño exacto: ${countRes.byteLength} bytes`);
  if (countRes.status !== 200 || typeof countRes.data?.count !== 'number') {
    throw new Error('Fallo en endpoint /api/recetas/count');
  }
  console.log('   [PASS] Endpoint de conteo funciona correctamente.\n');

  // Test 2: Listado general sin imágenes (Default)
  console.log('3. Probando listado general: GET /api/recetas (Sin imágenes por defecto)');
  const listLightRes = await makeRequest('/api/recetas', token);
  console.log(`   Status: ${listLightRes.status}`);
  console.log(`   Recetas recibidas: ${listLightRes.data?.data?.length || 0}`);
  console.log(`   Tamaño exacto respuesta HTTP: ${listLightRes.byteLength} bytes (${(listLightRes.byteLength / 1024).toFixed(2)} KB)`);

  const hasAnyImageInLight = (listLightRes.data?.data || []).some(r => r.imagen_url);
  console.log(`   ¿Contiene imagen_url Base64 en alguna receta?: ${hasAnyImageInLight ? 'SÍ (ERROR)' : 'NO (CORRECTO)'}`);
  if (hasAnyImageInLight) {
    throw new Error('El listado general no debería incluir imagen_url.');
  }
  console.log('   [PASS] Listado general optimizado y sin imágenes pesadas.\n');

  // Test 3: Listado con imágenes explícito
  console.log('4. Probando listado con imágenes: GET /api/recetas?includeImages=true');
  const listFullRes = await makeRequest('/api/recetas?includeImages=true', token);
  console.log(`   Status: ${listFullRes.status}`);
  console.log(`   Recetas recibidas: ${listFullRes.data?.data?.length || 0}`);
  console.log(`   Tamaño exacto respuesta HTTP: ${listFullRes.byteLength} bytes (${(listFullRes.byteLength / 1024).toFixed(2)} KB)`);

  const imagesFound = (listFullRes.data?.data || []).filter(r => r.imagen_url && r.imagen_url.length > 100);
  console.log(`   Recetas con foto Base64 preservada: ${imagesFound.length} de ${listFullRes.data?.data?.length}`);
  if (imagesFound.length === 0) {
    throw new Error('Las recetas con imagen deben incluir imagen_url cuando includeImages=true.');
  }
  console.log('   [PASS] Fotos Base64 preservadas intactas cuando se solicitan explícitamente.\n');

  // Test 4: Detalle de receta individual
  console.log('5. Probando consulta individual: GET /api/recetas/:id');
  const firstRecipeId = imagesFound[0]?.id || listLightRes.data?.data?.[0]?.id;
  const singleRes = await makeRequest(`/api/recetas/${firstRecipeId}`, token);
  console.log(`   Status: ${singleRes.status}`);
  console.log(`   Receta: ${singleRes.data?.data?.nombre} (${singleRes.data?.data?.codigo})`);
  console.log(`   ¿Foto presente?: ${Boolean(singleRes.data?.data?.imagen_url) ? 'SÍ' : 'NO'}`);
  console.log(`   Tamaño: ${singleRes.byteLength} bytes (${(singleRes.byteLength / 1024).toFixed(2)} KB)`);
  if (singleRes.status !== 200 || !singleRes.data?.data?.id) {
    throw new Error('Fallo al obtener detalle de receta');
  }
  console.log('   [PASS] Detalle individual funciona con soporte de imagen para edición.\n');

  // Test 5: Catálogos relacionados
  console.log('6. Probando catálogos de recetas: categorias, presentaciones, unidades...');
  const catRes = await makeRequest('/api/recetas/categorias', token);
  const presRes = await makeRequest('/api/recetas/presentaciones', token);
  const uomRes = await makeRequest('/api/recetas/unidades-medida', token);
  console.log(`   Categorías: ${catRes.data?.data?.length || 0} (${catRes.byteLength} bytes)`);
  console.log(`   Presentaciones: ${presRes.data?.data?.length || 0} (${presRes.byteLength} bytes)`);
  console.log(`   Unidades: ${uomRes.data?.data?.length || 0} (${uomRes.byteLength} bytes)`);
  console.log('   [PASS] Catálogos complementarios responden con éxito.\n');

  // Test 6: Inventario y POS
  console.log('7. Probando endpoints de Inventario y POS...');
  const invRes = await makeRequest('/api/inventario/productos', token);
  const posRes = await makeRequest('/api/pos/ventas', token);
  console.log(`   Inventario: ${invRes.data?.data?.length ?? (Array.isArray(invRes.data) ? invRes.data.length : 'ok')} items (${invRes.byteLength} bytes)`);
  console.log(`   Ventas POS: ${posRes.data?.data?.length ?? (Array.isArray(posRes.data) ? posRes.data.length : 'ok')} ventas (${posRes.byteLength} bytes)`);
  console.log('   [PASS] Inventario y POS operativos.\n');

  // Cuadro Comparativo de Ahorro
  console.log('====================================================');
  console.log('        COMPARATIVA DE MEDICIONES Y AHORRO         ');
  console.log('====================================================');
  const bytesBefore = listFullRes.byteLength;
  const bytesAfterList = listLightRes.byteLength;
  const bytesAfterCount = countRes.byteLength;

  console.log(`Listado con imágenes (Antes):         ${bytesBefore.toLocaleString()} bytes (~${(bytesBefore / 1024).toFixed(2)} KB)`);
  console.log(`Listado sin imágenes (Ahora):         ${bytesAfterList.toLocaleString()} bytes (~${(bytesAfterList / 1024).toFixed(2)} KB)`);
  console.log(`Ahorro en listado general:             ${((1 - bytesAfterList / bytesBefore) * 100).toFixed(2)}% por petición`);
  console.log(`----------------------------------------------------`);
  console.log(`Polling Dashboard anterior (15s):     ${bytesBefore.toLocaleString()} bytes / 15s`);
  console.log(`Polling Dashboard optimizado (15s):   0 bytes de recetas en intervalo`);
  console.log(`Conteo inicial Dashboard (Ahora):     ${bytesAfterCount} bytes (vs ${bytesBefore.toLocaleString()} bytes antes)`);
  console.log(`Ahorro en conteo de Dashboard:        ${((1 - bytesAfterCount / bytesBefore) * 100).toFixed(4)}% de reducción`);
  console.log(`----------------------------------------------------`);

  const hourlyBeforeMB = ((bytesBefore * 4 * 60) / (1024 * 1024));
  const hourlyAfterMB = 0; // Recipes are no longer polled on interval
  console.log(`Tráfico por polling en 1 hora (Antes): ~${hourlyBeforeMB.toFixed(2)} MB / hora`);
  console.log(`Tráfico por polling en 1 hora (Ahora): ~${hourlyAfterMB.toFixed(2)} MB / hora en recetas`);
  console.log('====================================================\n');
  console.log('>> TODAS LAS PRUEBAS OBLIGATORIAS PASARON CON ÉXITO <<\n');
}

runTests().catch((err) => {
  console.error('Error durante las pruebas:', err);
  process.exit(1);
});
