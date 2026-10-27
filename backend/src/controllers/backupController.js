import {
  getBackupConfig,
  saveBackupConfig,
  getBackupHistorial,
  generarBackupCompleto,
  getBackupFilePath,
  eliminarBackup,
} from '../services/backupService.js'
import { reprogramarBackup } from '../services/backupScheduler.js'

function buildErrorResponse(res, error, fallbackMessage = 'Error en el servidor', statusCode = 500) {
  console.error('[BackupController]', error)
  return res.status(statusCode).json({
    message: error?.message || fallbackMessage,
  })
}

// GET /api/backup/config
export async function getConfig(req, res) {
  try {
    const config = await getBackupConfig()
    return res.json({ data: config })
  } catch (error) {
    return buildErrorResponse(res, error, 'No fue posible obtener la configuración de backup.')
  }
}

// PUT /api/backup/config
export async function updateConfig(req, res) {
  try {
    const body = req.body || {}
    const usuario = req.user?.nombre || req.user?.email || body.usuario || 'Administrador'

    if (body.hora && !/^([01]\d|2[0-3]):([0-5]\d)$/.test(body.hora)) {
      return res.status(400).json({ message: 'El formato de hora debe ser HH:MM (24 horas).' })
    }

    if (body.frecuencia && !['diario', 'semanal', 'mensual'].includes(body.frecuencia)) {
      return res.status(400).json({ message: 'La frecuencia debe ser diario, semanal o mensual.' })
    }

    if (body.dias_retencion && (Number(body.dias_retencion) < 1 || Number(body.dias_retencion) > 365)) {
      return res.status(400).json({ message: 'Los días de retención deben estar entre 1 y 365 días.' })
    }

    const updatedConfig = await saveBackupConfig(body, usuario)

    // Reprogramar inmediatamente la tarea cron
    await reprogramarBackup(updatedConfig)

    return res.json({
      data: updatedConfig,
      message: 'Configuración de backup guardada y programador actualizado.',
    })
  } catch (error) {
    return buildErrorResponse(res, error, 'No fue posible guardar la configuración de backup.')
  }
}

// GET /api/backup/historial
export async function getHistorial(req, res) {
  try {
    const historial = await getBackupHistorial()
    return res.json({ data: historial })
  } catch (error) {
    return buildErrorResponse(res, error, 'No fue posible obtener el historial de backups.')
  }
}

// POST /api/backup/generar
export async function generarBackup(req, res) {
  try {
    const usuario = req.user?.nombre || req.user?.email || req.body?.usuario || 'Administrador'
    const resultado = await generarBackupCompleto({
      tipo: 'manual',
      usuario,
    })

    return res.status(201).json({
      data: resultado,
      message: 'Copia de seguridad generada exitosamente.',
    })
  } catch (error) {
    return buildErrorResponse(res, error, 'No fue posible generar la copia de seguridad.')
  }
}

// GET /api/backup/download/:id
export async function downloadBackup(req, res) {
  try {
    const { id } = req.params
    if (!id) {
      return res.status(400).json({ message: 'El id o nombre del archivo es obligatorio.' })
    }

    const fileInfo = await getBackupFilePath(id)
    if (!fileInfo || !fileInfo.filePath) {
      return res.status(404).json({ message: 'El archivo de respaldo no existe o fue depurado.' })
    }

    res.setHeader('Content-Type', fileInfo.contentType)
    res.setHeader('Content-Disposition', `attachment; filename="${fileInfo.filename}"`)

    return res.download(fileInfo.filePath, fileInfo.filename, (err) => {
      if (err && !res.headersSent) {
        return buildErrorResponse(res, err, 'Error al transferir el archivo.')
      }
    })
  } catch (error) {
    return buildErrorResponse(res, error, 'Error al descargar la copia de seguridad.')
  }
}

// DELETE /api/backup/:id
export async function deleteBackup(req, res) {
  try {
    const { id } = req.params
    if (!id) {
      return res.status(400).json({ message: 'El id del backup es obligatorio.' })
    }

    await eliminarBackup(id)
    return res.json({ message: 'Copia de seguridad eliminada correctamente.' })
  } catch (error) {
    return buildErrorResponse(res, error, 'No fue posible eliminar la copia de seguridad.')
  }
}
