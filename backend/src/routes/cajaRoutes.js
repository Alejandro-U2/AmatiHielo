import { Router } from 'express'
import { confirmarArqueoCaja, getArqueoCaja } from '../controllers/cajaController.js'
import { requireSession } from '../middleware/requireSession.js'

const router = Router()

router.use(requireSession)
router.get('/arqueo', getArqueoCaja)
router.post('/arqueo', confirmarArqueoCaja)

export default router
