import { Router } from 'express'
import {
	createProducto,
	createMovimiento,
	createEntradaInventario,
	uploadEntradaInventarioDocumento,
	deleteProducto,
	listCategorias,
	listMovimientos,
	listProductos,
	listProveedores,
	listTiposMovimiento,
	listMotivosMerma,
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
router.get('/motivos-merma', listMotivosMerma)
router.get('/movimiento', listMovimientos)
router.get('/proveedor', listProveedores)
router.post('/movimiento', createMovimiento)
router.post('/entrada', createEntradaInventario)
router.post('/entrada/documento', uploadEntradaInventarioDocumento)
router.post('/proveedor', requireAdmin, createProveedor)
router.put('/proveedor/:id', requireAdmin, updateProveedor)
router.delete('/proveedor/:id', requireAdmin, deleteProveedor)
router.post('/producto', requireAdmin, createProducto)
router.put('/producto/:id', requireAdmin, updateProducto)
router.delete('/producto/:id', requireAdmin, deleteProducto)

export default router
