import cron from 'node-cron'
import { getBackupConfig, generarBackupCompleto } from './backupService.js'

let activeCronTask = null

// Convierte la configuración de backup en una expresión cron estándar (5 campos)
export function construirExpresionCron(config) {
  const [horaRaw, minutoRaw] = (config.hora || '23:30').split(':')
  const hora = Math.max(0, Math.min(23, Number(horaRaw) || 0))
  const minuto = Math.max(0, Math.min(59, Number(minutoRaw) || 0))

  switch (config.frecuencia) {
    case 'semanal': {
      const diaSemana = Math.max(0, Math.min(6, Number(config.dia_semana ?? 0)))
      return `${minuto} ${hora} * * ${diaSemana}`
    }
    case 'mensual': {
      const diaMes = Math.max(1, Math.min(28, Number(config.dia_mes ?? 1)))
      return `${minuto} ${hora} ${diaMes} * *`
    }
    case 'diario':
    default:
      return `${minuto} ${hora} * * *`
  }
}

// Iniciar o reprogramar la tarea cron
export async function reprogramarBackup(configOverride = null) {
  try {
    const config = configOverride || await getBackupConfig()

    // Si ya había una tarea corriendo, detenerla primero
    if (activeCronTask) {
      activeCronTask.stop()
      activeCronTask = null
      console.log('[BackupScheduler] Tarea previa detenida.')
    }

    if (!config.activo) {
      console.log('[BackupScheduler] Backup automático se encuentra DESACTIVADO por configuración.')
      return false
    }

    const cronExp = construirExpresionCron(config)

    if (!cron.validate(cronExp)) {
      console.error(`[BackupScheduler] Expresión cron inválida: "${cronExp}". No se programó.`)
      return false
    }

    console.log(`[BackupScheduler] Programando backup automático (${config.frecuencia}) con cron: "${cronExp}" (Hora: ${config.hora})`)

    activeCronTask = cron.schedule(
      cronExp,
      async () => {
        console.log(`[BackupScheduler] ⏰ Disparando backup automático programado [${new Date().toISOString()}]...`)
        try {
          const resultado = await generarBackupCompleto({
            tipo: 'automatico',
            usuario: 'Programador Automático',
          })
          console.log(`[BackupScheduler] ✅ Backup automático completado: ${resultado.nombre_archivo} (${resultado.total_registros} registros)`)
        } catch (error) {
          console.error('[BackupScheduler] ❌ Error durante la ejecución del backup automático:', error)
        }
      },
      {
        scheduled: true,
      }
    )

    return true
  } catch (error) {
    console.error('[BackupScheduler] Error al programar cron de backup:', error)
    return false
  }
}

// Función de arranque al iniciar el servidor Express
export async function iniciarBackupScheduler() {
  console.log('[BackupScheduler] Inicializando servicio de backups automáticos...')
  await reprogramarBackup()
}
