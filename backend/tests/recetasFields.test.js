import { describe, it, expect, vi } from 'vitest'
import { getRecetaFields, getRecetasCount } from '../src/controllers/recetasController.js'
import { supabaseAdmin } from '../src/config/supabaseAdmin.js'

describe('Recetas Egress Optimization Unit Tests', () => {
  it('excluye imagen_url por defecto cuando includeImages es false', async () => {
    const fields = await getRecetaFields({ includeImages: false })
    expect(fields).not.toContain('imagen_url')
    expect(fields).toContain('id')
    expect(fields).toContain('codigo')
    expect(fields).toContain('nombre')
  })

  it('incluye imagen_url cuando includeImages es true', async () => {
    const fields = await getRecetaFields({ includeImages: true })
    expect(fields).toContain('imagen_url')
  })

  it('getRecetasCount devuelve un objeto con el conteo numérico exacto', async () => {
    const jsonSpy = vi.fn()
    const res = {
      json: jsonSpy,
      status: vi.fn().mockReturnThis(),
    }
    const req = {}

    await getRecetasCount(req, res)
    expect(jsonSpy).toHaveBeenCalled()
    const callArg = jsonSpy.mock.calls[0][0]
    expect(callArg).toHaveProperty('count')
    expect(typeof callArg.count).toBe('number')
  })
})
