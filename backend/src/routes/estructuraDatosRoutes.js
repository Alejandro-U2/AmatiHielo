import { Router } from 'express'
import {
  createEstructura,
  createRegistroTabla,
  deleteEstructura,
  deleteRegistroTabla,
  getEstructuraById,
  listEstructuras,
  listRegistrosTabla,
  updateRegistroTabla,
} from '../controllers/estructuraDatosController.js'
import { requireAdmin } from '../middleware/requireAdmin.js'

const router = Router()

router.use(requireAdmin)

router.get('/', listEstructuras)
router.get('/:id', getEstructuraById)
router.post('/', createEstructura)
router.delete('/:id', deleteEstructura)

router.get('/:id/registros', listRegistrosTabla)
router.post('/:id/registros', createRegistroTabla)
router.put('/:id/registros/:registroId', updateRegistroTabla)
router.delete('/:id/registros/:registroId', deleteRegistroTabla)

export default router