import { Router } from 'express'
import {
  createCompleteUser,
  deleteUser,
  listDepartamentos,
  listEstadosUsuario,
  listMunicipios,
  listRoles,
  listUsers,
  updateUser,
} from '../controllers/usersController.js'
import { requireAdmin } from '../middleware/requireAdmin.js'

const router = Router()

router.use(requireAdmin)

router.get('/departamentos', listDepartamentos)
router.get('/municipios', listMunicipios)
router.get('/estados', listEstadosUsuario)
router.get('/roles', listRoles)
router.get('/', listUsers)
router.post('/', createCompleteUser)
router.put('/:id', updateUser)
router.delete('/:id', deleteUser)

export default router
