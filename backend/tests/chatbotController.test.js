import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  buildChatbotContext: vi.fn(),
  getInventorySnapshot: vi.fn(),
  generateChatbotResponse: vi.fn(),
  isGeminiConfigured: vi.fn(() => true),
}))

vi.mock('../src/services/chatbotDataService.js', () => ({
  buildChatbotContext: mocks.buildChatbotContext,
  getInventorySnapshot: mocks.getInventorySnapshot,
}))

vi.mock('../src/services/geminiService.js', () => ({
  generateChatbotResponse: mocks.generateChatbotResponse,
  isGeminiConfigured: mocks.isGeminiConfigured,
}))

import { sendChatbotMessage } from '../src/controllers/chatbotController.js'

function createResponse() {
  return {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this },
    json(body) { this.body = body; return this },
  }
}

function request(message, role = 'Administrador', history = []) {
  return { body: { message, history }, auth: { profile: { rol: role } } }
}

describe('sendChatbotMessage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.isGeminiConfigured.mockReturnValue(true)
  })

  it('muestra existencias oficiales y estado basado en el mínimo real', async () => {
    mocks.buildChatbotContext.mockResolvedValue({
      intencion: 'stock',
      datos: { productos: [
        { nombre: 'Hielo 5 lb', stock: 8, minimo: 12, minimoConfigurado: true, unidad: 'bolsas', bajoMinimo: true },
        { nombre: 'Hielo 10 lb', stock: 32, minimo: 12, minimoConfigurado: true, unidad: 'bolsas', bajoMinimo: false },
      ] },
    })

    const response = createResponse()
    await sendChatbotMessage(request('inventario'), response)

    expect(response.body.message).toContain('Hielo 5 lb: 8 bolsas — BAJO MÍNIMO')
    expect(response.body.message).toContain('Hielo 10 lb: 32 bolsas')
  })

  it('no inventa una existencia para un producto que no está registrado', async () => {
    mocks.buildChatbotContext.mockResolvedValue({ intencion: 'stock', datos: { productos: [] } })

    const response = createResponse()
    await sendChatbotMessage(request('¿Cuánto hielo de 50 lb tenemos?'), response)

    expect(response.body).toEqual({ type: 'message', message: 'No encontré ese producto en el sistema.' })
  })

  it('deniega predicciones a operarios antes de consultar datos', async () => {
    const response = createResponse()
    await sendChatbotMessage(request('¿Cuánto venderemos el viernes?', 'Operario'), response)

    expect(response.statusCode).toBe(403)
    expect(mocks.buildChatbotContext).not.toHaveBeenCalled()
  })

  it('devuelve las ventas reales del día solicitado', async () => {
    mocks.buildChatbotContext.mockResolvedValue({
      intencion: 'sales',
      datos: {
        ventasDelDia: {
          fecha: '2026-10-05',
          unidades: 10,
          ingresos: 120,
          porProducto: { 'Bolsa de Hielo': 10 },
        },
        predicciones: [],
      },
    })

    const response = createResponse()
    await sendChatbotMessage(request('¿Cómo estuvieron las ventas de hoy?'), response)

    expect(response.body.type).toBe('sales_daily')
    expect(response.body.message).toContain('Unidades vendidas: **10**')
    expect(response.body.message).toContain('Ingresos: **Q120**')
    expect(response.body.message).toContain('Bolsa de Hielo: 10 unidades')
  })

  it('pide el producto si la predicción tiene varias coincidencias posibles', async () => {
    mocks.buildChatbotContext.mockResolvedValue({
      intencion: 'sales',
      datos: { predicciones: [
        { producto: 'Hielo 5 lb', fechaObjetivo: '2026-10-09', prediccionUnidades: 84, diasConVentas: 4 },
        { producto: 'Hielo 10 lb', fechaObjetivo: '2026-10-09', prediccionUnidades: 30, diasConVentas: 4 },
      ] },
    })

    const response = createResponse()
    await sendChatbotMessage(request('¿Cuánto venderemos el viernes?'), response)

    expect(response.body.message).toBe('¿Qué producto deseas consultar?')
  })

  it('rechaza predicciones cuando el historial no es suficiente', async () => {
    mocks.buildChatbotContext.mockResolvedValue({
      intencion: 'sales',
      datos: { predicciones: [{ producto: 'Hielo 5 lb', fechaObjetivo: '2026-10-09', prediccionUnidades: 84, diasConVentas: 1 }] },
    })

    const response = createResponse()
    await sendChatbotMessage(request('Predice ventas de hielo 5 lb para el viernes'), response)

    expect(response.body.message).toBe('No hay suficientes datos históricos para realizar una predicción confiable.')
    expect(response.body.message).not.toContain('84')
  })

  it('no consulta clima fuera del rango permitido', async () => {
    mocks.buildChatbotContext.mockResolvedValue({
      intencion: 'weather',
      validacion: 'Solo puedo consultar el pronóstico de los próximos 7 días.',
    })

    const response = createResponse()
    await sendChatbotMessage(request('¿Cómo estará el clima dentro de 15 días?'), response)

    expect(response.body.message).toBe('Solo puedo consultar el pronóstico de los próximos 7 días.')
  })

  it('pide aclaración de venta diaria o mensual cuando solicitan reporte de venta ambiguo', async () => {
    const response = createResponse()
    await sendChatbotMessage(request('reporte de venta'), response)

    expect(response.body.message).toContain('¿Deseas el reporte de venta diaria o del mes?')
    expect(response.body.suggestions).toContain('Reporte de venta diaria de hoy')
    expect(response.body.suggestions).toContain('Reporte de venta mensual de este mes')
  })

  it('resuelve el reporte diario tras la aclaración del usuario', async () => {
    const history = [
      { role: 'user', content: 'reporte de venta' },
      { role: 'assistant', content: '¿Deseas el reporte de venta diaria o del mes? (Si es diaria indica el día y si es mensual, especifica el mes).' },
    ]
    const response = createResponse()
    await sendChatbotMessage(request('diaria de hoy', 'Administrador', history), response)

    expect(response.body.type).toBe('report_preview')
    expect(response.body.reportPreview.reportKey).toBe('sales_daily')
    expect(response.body.reportPreview.title).toBe('Reporte de Ventas Diario')
  })

  it('pide la fecha si solicitan ventas reales sin especificar día', async () => {
    mocks.buildChatbotContext.mockResolvedValue({
      intencion: 'sales',
      datos: { ventasDelDia: { fecha: '2026-10-05', unidades: 0, ingresos: 0, porProducto: {} } },
    })

    const response = createResponse()
    await sendChatbotMessage(request('¿Cuánto vendimos?'), response)

    expect(response.body.message).toContain('¿De qué fecha deseas consultar las ventas?')
    expect(response.body.suggestions).toContain('Ventas de hoy')
  })

  it('ofrece tipos de reportes si solicitan reporte genérico', async () => {
    const response = createResponse()
    await sendChatbotMessage(request('quiero un reporte'), response)

    expect(response.body.message).toContain('¿Qué tipo de reporte deseas generar?')
    expect(response.body.suggestions).toContain('Reporte de ventas de hoy')
    expect(response.body.suggestions).toContain('Reporte de inventario')
  })

  it('devuelve un error seguro sin incluir detalles internos', async () => {
    mocks.buildChatbotContext.mockRejectedValue(new Error('SQL, token privado y stack trace'))
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})

    const response = createResponse()
    await sendChatbotMessage(request('¿Cuánto hay en inventario?'), response)

    expect(response.statusCode).toBe(502)
    expect(response.body.message).toBe('No pude obtener la información en este momento. Intenta nuevamente.')
    expect(response.body.message).not.toContain('SQL')
    log.mockRestore()
  })
})
