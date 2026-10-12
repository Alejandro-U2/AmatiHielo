import { Router } from 'express'
import {
  createEstructura,
  deleteEstructura,
  getEstructuraById,
  listEstructuras,
} from '../controllers/estructuraDatosController.js'
import { requireAdmin } from '../middleware/requireAdmin.js'

const router = Router()

router.use(requireAdmin)

router.get('/', listEstructuras)
router.get('/:id', getEstructuraById)
router.post('/', createEstructura)
router.delete('/:id', deleteEstructura)

export default router