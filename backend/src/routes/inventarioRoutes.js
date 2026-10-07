import { Router } from 'express'
import {
	createProducto,
	createMovimiento,
	deleteProducto,
	listCategorias,
	listMovimientos,
	listProductos,
	listProveedores,
	listTiposMovimiento,
	createProveedor,
	deleteProveedor,
	updateProveedor,
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
router.get('/proveedor', listProveedores)
router.post('/movimiento', createMovimiento)
router.post('/proveedor', requireAdmin, createProveedor)
router.put('/proveedor/:id', requireAdmin, updateProveedor)
router.delete('/proveedor/:id', requireAdmin, deleteProveedor)
router.post('/producto', requireAdmin, createProducto)
router.put('/producto/:id', requireAdmin, updateProducto)
router.delete('/producto/:id', requireAdmin, deleteProducto)

export default router
