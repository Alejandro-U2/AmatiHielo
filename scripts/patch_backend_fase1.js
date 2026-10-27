import fs from 'fs';

// 1. Update backend/src/controllers/recetasController.js
let controller = fs.readFileSync('backend/src/controllers/recetasController.js', 'utf8');

// Replace getRecetaFields
const oldGetRecetaFields = `export async function getRecetaFields() {
  if (hasImagenUrlCache === null) {
    const { error } = await supabaseAdmin.from('receta').select('imagen_url').limit(1)
    hasImagenUrlCache = !error
  }
  const base = 'id, codigo, nombre, categoria, presentacion, costo_electricidad, costo_mano_obra, costo_agua, costo_local, subtotal_materia_prima, costos_produccion, costo_total, precio_sugerido, created_at, updated_at'
  return hasImagenUrlCache ? \`\${base}, imagen_url\` : base
}`;

const newGetRecetaFields = `export async function getRecetaFields(options = {}) {
  const includeImages = options.includeImages === true
  if (hasImagenUrlCache === null) {
    const { error } = await supabaseAdmin.from('receta').select('imagen_url').limit(1)
    hasImagenUrlCache = !error
  }
  const base = 'id, codigo, nombre, categoria, presentacion, costo_electricidad, costo_mano_obra, costo_agua, costo_local, subtotal_materia_prima, costos_produccion, costo_total, precio_sugerido, created_at, updated_at'
  return (includeImages && hasImagenUrlCache) ? \`\${base}, imagen_url\` : base
}`;

// Normalize CRLF to LF temporarily for robust string replacement
const isCRLF = controller.includes('\r\n');
let normController = controller.replace(/\r\n/g, '\n');

if (!normController.includes(oldGetRecetaFields)) {
  console.error('Could not find oldGetRecetaFields in recetasController.js');
  process.exit(1);
}
normController = normController.replace(oldGetRecetaFields, newGetRecetaFields);

// Replace listRecetas fields
const oldListFields = `export async function listRecetas(req, res) {
  try {
    const fields = await getRecetaFields()`;
const newListFields = `export async function listRecetas(req, res) {
  try {
    const includeImages = req.query?.includeImages === 'true'
    const fields = await getRecetaFields({ includeImages })`;

if (!normController.includes(oldListFields)) {
  console.error('Could not find oldListFields in recetasController.js');
  process.exit(1);
}
normController = normController.replace(oldListFields, newListFields);

// Add getRecetasCount before getRecetaById
const oldGetById = `export async function getRecetaById(req, res) {
  const { id } = req.params

  if (!id) {
    return res.status(400).json({ message: 'El id de la receta es obligatorio.' })
  }

  try {
    const fields = await getRecetaFields()`;

const newGetByIdWithCount = `export async function getRecetasCount(req, res) {
  try {
    const { count, error } = await supabaseAdmin
      .from('receta')
      .select('id', { count: 'exact', head: true })

    if (error) {
      return buildErrorResponse(res, error, 'No fue posible contar las recetas.')
    }

    return res.json({ count: count || 0 })
  } catch (error) {
    return buildErrorResponse(res, error, 'No fue posible contar las recetas.')
  }
}

export async function getRecetaById(req, res) {
  const { id } = req.params

  if (!id) {
    return res.status(400).json({ message: 'El id de la receta es obligatorio.' })
  }

  try {
    const includeImages = req.query?.includeImages !== 'false'
    const fields = await getRecetaFields({ includeImages })`;

if (!normController.includes(oldGetById)) {
  console.error('Could not find oldGetById in recetasController.js');
  process.exit(1);
}
normController = normController.replace(oldGetById, newGetByIdWithCount);

// Ensure createReceta and updateReceta include images when returning single recipe
normController = normController.replace(
  'const fields = await getRecetaFields()\n    const insertPayload = { ...payload }',
  'const fields = await getRecetaFields({ includeImages: true })\n    const insertPayload = { ...payload }'
);
normController = normController.replace(
  'const fields = await getRecetaFields()\n    const updatePayload = { ...payload }',
  'const fields = await getRecetaFields({ includeImages: true })\n    const updatePayload = { ...payload }'
);

if (isCRLF) {
  normController = normController.replace(/\n/g, '\r\n');
}

fs.writeFileSync('backend/src/controllers/recetasController.js', normController, 'utf8');
console.log('Successfully updated backend/src/controllers/recetasController.js');

// 2. Update backend/src/routes/recetasRoutes.js
let routes = fs.readFileSync('backend/src/routes/recetasRoutes.js', 'utf8');
let normRoutes = routes.replace(/\r\n/g, '\n');

// Import getRecetasCount
normRoutes = normRoutes.replace(
  `import {
  listRecetas,`,
  `import {
  listRecetas,
  getRecetasCount,`
);

// Register /count before /:id
normRoutes = normRoutes.replace(
  `// Recetas
router.get('/', listRecetas)`,
  `// Recetas
router.get('/', listRecetas)
router.get('/count', getRecetasCount)`
);

if (routes.includes('\r\n')) {
  normRoutes = normRoutes.replace(/\n/g, '\r\n');
}

fs.writeFileSync('backend/src/routes/recetasRoutes.js', normRoutes, 'utf8');
console.log('Successfully updated backend/src/routes/recetasRoutes.js');
