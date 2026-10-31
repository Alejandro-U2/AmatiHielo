import { describe, expect, it } from 'vitest'
import { getNextNumeroFactura } from '../src/controllers/inventarioController.js'

describe('siguienteNumeroFactura tests', () => {
  it('retrieves the next sequential invoice number starting with FAC-000003 from the DB', async () => {
    const nextInvoice = await getNextNumeroFactura()
    expect(nextInvoice).toMatch(/^FAC-\d{6}$/)
    // With current rows { Fac-1, Fac-2 }, next must be FAC-000003
    expect(nextInvoice).toBe('FAC-000003')
  })
})
