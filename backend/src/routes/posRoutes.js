import { Router } from 'express'
import {
  createCliente,
  createVenta,
  getDashboardMetrics,
  getVentaById,
  listClientes,
  listMetodosPago,
  listVentas,
  updateCliente,
} from '../controllers/posController.js'
import { requireSession } from '../middleware/requireSession.js'

const router = Router()

router.use(requireSession)

router.get('/metricas-dashboard', getDashboardMetrics)
router.get('/venta', listVentas)
router.get('/venta/:id', getVentaById)
router.post('/venta', createVenta)
router.get('/metodos-pago', listMetodosPago)
router.get('/clientes', listClientes)
router.post('/clientes', createCliente)
router.patch('/clientes/:id', updateCliente)

export default router
