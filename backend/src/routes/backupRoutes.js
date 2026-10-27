import { Router } from 'express'
import {
  getConfig,
  updateConfig,
  getHistorial,
  generarBackup,
  downloadBackup,
  deleteBackup,
} from '../controllers/backupController.js'
import { requireAdmin } from '../middleware/requireAdmin.js'

const router = Router()

router.use(requireAdmin)

router.get('/config', getConfig)
router.put('/config', updateConfig)
router.get('/historial', getHistorial)
router.post('/generar', generarBackup)
router.get('/download/:id', downloadBackup)
router.delete('/:id', deleteBackup)

export default router
