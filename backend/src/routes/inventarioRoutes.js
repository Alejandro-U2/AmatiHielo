import { Router } from 'express'
import {
	createProducto,
	createMovimiento,
	deleteProducto,
	listCategorias,
	listMovimientos,
	listProductos,
	listTiposMovimiento,
	updateProducto,
} from '../controllers/inventarioController.js'
import { requireAdmin } from '../middleware/requireAdmin.js'
import { requireSession } from '../middleware/requireSession.js'

const router = Router()

router.use(requireSession)

router.get('/producto', listProductos)
router.get('/categorias', listCategorias)
router.get('/tipos-movimiento', listTiposMovimiento)
router.get('/movimiento', listMovimientos)
router.post('/movimiento', createMovimiento)
router.post('/producto', requireAdmin, createProducto)
router.put('/producto/:id', requireAdmin, updateProducto)
router.delete('/producto/:id', requireAdmin, deleteProducto)

export default router
