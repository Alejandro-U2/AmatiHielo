import { describe, it, expect } from 'vitest'
import { calculateUnitCost } from '../src/controllers/inventarioController.js'

describe('calculateUnitCost', () => {
  it('debe calcular el costo unitario correctamente', () => {
    const resultado = calculateUnitCost({
      precioCompra: 100,
      cantidadCompra: 10,
      precioPaquete: 100
    })

    expect(resultado).toBe(10)
  })
})