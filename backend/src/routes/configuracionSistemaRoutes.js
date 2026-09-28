import { Router } from 'express'
import {
  createSucursal,
  deleteSucursal,
  getConfiguracionSistema,
  getParametros,
  listSucursales,
  updateEmpresa,
  updateImpuestos,
  updateNotificaciones,
  updateSucursal,
  updateUmbrales,
} from '../controllers/configuracionSistemaController.js'
import { requireAdmin } from '../middleware/requireAdmin.js'

const router = Router()

router.use(requireAdmin)

router.get('/', getConfiguracionSistema)
router.get('/parametros', getParametros)
router.get('/sucursales', listSucursales)
router.post('/sucursales', createSucursal)
router.put('/sucursales/:id', updateSucursal)
router.delete('/sucursales/:id', deleteSucursal)
router.put('/empresa', updateEmpresa)
router.put('/impuestos', updateImpuestos)
router.put('/notificaciones', updateNotificaciones)
router.put('/umbrales', updateUmbrales)

export default router