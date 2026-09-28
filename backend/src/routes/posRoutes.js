import { Router } from 'express'
import { createVenta, listMetodosPago, listVentas } from '../controllers/posController.js'
import { requireSession } from '../middleware/requireSession.js'

const router = Router()

router.use(requireSession)

router.get('/venta', listVentas)
router.post('/venta', createVenta)
router.get('/metodos-pago', listMetodosPago)

export default router
