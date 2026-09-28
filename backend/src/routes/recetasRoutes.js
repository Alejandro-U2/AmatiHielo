import { Router } from 'express'
import {
  listRecetas,
  getRecetaById,
  createReceta,
  updateReceta,
  deleteReceta,
  listCategoriasReceta,
  listPresentacionesReceta,
  listUnidadesMedida,
  addIngrediente,
  updateIngrediente,
  deleteIngrediente,
  listPlanesProduccion,
  createPlanProduccion,
  deletePlanProduccion,
  listProducciones,
  createProduccion,
  getProduccionesRango,
} from '../controllers/recetasController.js'
import { requireSession } from '../middleware/requireSession.js'
import { requireAdmin } from '../middleware/requireAdmin.js'

const router = Router()

router.use(requireSession)

// Recetas
router.get('/', listRecetas)
router.post('/', requireAdmin, createReceta)
router.get('/categorias', listCategoriasReceta)
router.get('/presentaciones', listPresentacionesReceta)
router.get('/unidades-medida', listUnidadesMedida)

// Ingredientes
router.post('/:recetaId/ingrediente', requireAdmin, addIngrediente)
router.put('/:recetaId/ingrediente/:id', requireAdmin, updateIngrediente)
router.delete('/:recetaId/ingrediente/:id', requireAdmin, deleteIngrediente)

// Planes de Producción
router.get('/planes-produccion', listPlanesProduccion)
router.post('/planes-produccion', requireAdmin, createPlanProduccion)
router.delete('/planes-produccion/:id', requireAdmin, deletePlanProduccion)

// Producciones
router.get('/producciones', listProducciones)
router.post('/producciones', createProduccion)
router.post('/producciones/rango', getProduccionesRango)

router.get('/:id', getRecetaById)
router.put('/:id', requireAdmin, updateReceta)
router.delete('/:id', requireAdmin, deleteReceta)

export default router
