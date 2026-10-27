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
import {
	listAuditorias,
	getAuditoriaById,
	createAuditoria,
	updateAuditoriaEstado,
	saveConteo,
	investigarDiferencia,
	aprobarAjustes,
	cerrarAuditoria,
	getCatalogosAuditoria,
} from '../controllers/auditoriaController.js'
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

// Rutas de Auditoría de Inventario
router.get('/auditoria/catalogos', getCatalogosAuditoria)
router.get('/auditoria', listAuditorias)
router.post('/auditoria', createAuditoria)
router.get('/auditoria/:id', getAuditoriaById)
router.patch('/auditoria/:id/estado', updateAuditoriaEstado)
router.put('/auditoria/:id/estado', updateAuditoriaEstado)
router.put('/auditoria/:id/conteo', saveConteo)
router.put('/auditoria/:id/investigar/:detalleId', investigarDiferencia)
router.post('/auditoria/:id/aprobar-ajustes', requireAdmin, aprobarAjustes)
router.post('/auditoria/:id/cerrar', cerrarAuditoria)

export default router

