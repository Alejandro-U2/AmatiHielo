import { describe, it, expect } from 'vitest'
import { construirExpresionCron } from '../src/services/backupScheduler.js'
import { calcularProximaEjecucion } from '../src/services/backupService.js'

describe('Backup Scheduler Unit Tests', () => {
  it('debe construir expresión cron diaria correcta', () => {
    const cron = construirExpresionCron({ frecuencia: 'diario', hora: '23:30' })
    expect(cron).toBe('30 23 * * *')
  })

  it('debe construir expresión cron semanal en domingo por defecto', () => {
    const cron = construirExpresionCron({ frecuencia: 'semanal', hora: '02:00', dia_semana: 0 })
    expect(cron).toBe('0 2 * * 0')
  })

  it('debe construir expresión cron mensual el día 1', () => {
    const cron = construirExpresionCron({ frecuencia: 'mensual', hora: '04:15', dia_mes: 1 })
    expect(cron).toBe('15 4 1 * *')
  })

  it('debe calcular la próxima fecha de ejecución cuando está activo', () => {
    const nextDate = calcularProximaEjecucion({ activo: true, frecuencia: 'diario', hora: '23:30' })
    expect(nextDate).toBeDefined()
    expect(new Date(nextDate).getTime()).toBeGreaterThan(0)
  })

  it('debe retornar null para próxima ejecución si está inactivo', () => {
    const nextDate = calcularProximaEjecucion({ activo: false, frecuencia: 'diario', hora: '23:30' })
    expect(nextDate).toBeNull()
  })
})
