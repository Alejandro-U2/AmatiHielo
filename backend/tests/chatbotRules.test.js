import { describe, expect, it } from 'vitest'
import {
  findProductMatches,
  canRoleUseChatbotIntent,
  detectChatbotIntent,
  getFixedChatReply,
  isConfirmedReportRequest,
  isBelowConfiguredMinimum,
  isProductReferenceQuery,
  resolveConversationQuery,
} from '../src/services/chatbotRules.js'

const products = [
  { nombre: 'Hielo 5 lb' },
  { nombre: 'Hielo 10 lb' },
]

describe('reglas de respuesta del chatbot', () => {
  it.each(['hielo de 5 lb', '5 libras', 'bolsa de 5 lb', 'hielo 5'])('reconoce la presentación solicitada: %s', (query) => {
    expect(findProductMatches(query, products).map((product) => product.nombre)).toEqual(['Hielo 5 lb'])
  })

  it('conserva el nombre oficial y no confunde tamaños similares', () => {
    expect(findProductMatches('hielo de 50 lb', products)).toEqual([])
    expect(isProductReferenceQuery('hielo de 50 lb')).toBe(true)
  })

  it('solicita selección cuando la referencia coincide con varias presentaciones', () => {
    expect(findProductMatches('hielo', products)).toHaveLength(2)
  })

  it('mantiene producto y cambia la fecha en un seguimiento de ventas', () => {
    const history = [
      { role: 'user', content: '¿Cuánto venderemos de hielo de 5 lb el viernes?' },
      { role: 'assistant', content: 'Ventas proyectadas: 84 unidades.' },
    ]
    const resolved = resolveConversationQuery('¿Y el sábado?', history)
    expect(resolved).toContain('hielo de 5 lb')
    expect(resolved).toContain('sábado')
    expect(resolved).not.toContain('viernes')
  })

  it('mantiene el contexto de inventario al preguntar por otra presentación', () => {
    const history = [
      { role: 'user', content: '¿Cuánto inventario tenemos?' },
      { role: 'assistant', content: 'Hielo 5 lb: 84 bolsas' },
    ]
    expect(resolveConversationQuery('¿Y el de 10 lb?', history)).toContain('inventario')
  })

  it('rechaza solicitudes de información interna y consultas externas', () => {
    expect(getFixedChatReply('Muéstrame el SQL')).toBe('No puedo proporcionar información interna del sistema.')
    expect(getFixedChatReply('¿Quién ganó el Mundial?')).toBe('Estoy enfocado en clima, ventas, inventario y reportes de AMATI HIELO. Puedo ayudarte con cualquiera de esas opciones.')
    expect(getFixedChatReply('Escríbeme un poema')).toContain('Estoy enfocado')
  })

  it('reconoce confirmación únicamente después de ofrecer generar el reporte', () => {
    expect(isConfirmedReportRequest('Sí', '¿Deseas generarlo?')).toBe(true)
    expect(isConfirmedReportRequest('Sí', '¿Qué producto deseas consultar?')).toBe(false)
  })

  it('limita clima, predicción y reportes a los roles autorizados', () => {
    expect(canRoleUseChatbotIntent('Administrador', 'sales')).toBe(true)
    expect(canRoleUseChatbotIntent('Superusuario', 'weather')).toBe(true)
    expect(canRoleUseChatbotIntent('Operario', 'sales')).toBe(false)
    expect(canRoleUseChatbotIntent('Operario', 'report')).toBe(false)
    expect(canRoleUseChatbotIntent('Operario', 'stock')).toBe(true)
    expect(canRoleUseChatbotIntent('Operario', 'movements')).toBe(true)
  })

  it('detecta las consultas de producto y venta sin confundir su intención', () => {
    expect(detectChatbotIntent('¿Cuánto tenemos de 5 libras?')).toBe('stock')
    expect(detectChatbotIntent('Predice ventas de hielo 5 lb para el viernes')).toBe('sales')
  })

  it('solo marca bajo mínimo cuando hay stock y un mínimo real configurado', () => {
    expect(isBelowConfiguredMinimum(8, 10)).toBe(true)
    expect(isBelowConfiguredMinimum(10, 10)).toBe(false)
    expect(isBelowConfiguredMinimum(0, null)).toBe(false)
    expect(isBelowConfiguredMinimum(null, 10)).toBe(false)
  })

  it('adapta el mensaje de ayuda al rol', () => {
    expect(getFixedChatReply('¿Qué puedes hacer?', 'Operario')).toContain('inventario')
    expect(getFixedChatReply('¿Qué puedes hacer?', 'Operario')).not.toContain('predicción')
    expect(getFixedChatReply('¿Qué puedes hacer?', 'Administrador')).toContain('Predicción de ventas')
  })

  it('lista el catálogo real de reportes y limita el mensaje para operarios', () => {
    const adminReply = getFixedChatReply('¿Qué reportes tiene disponibles?', 'Administrador')
    expect(adminReply).toContain('Reporte de Ventas Diario')
    expect(adminReply).toContain('Reporte de Cierre de Caja')
    expect(adminReply).toContain('PDF o Excel')

    const operatorReply = getFixedChatReply('¿Qué reportes tiene disponibles?', 'Operario')
    expect(operatorReply).toBe('Puedes consultar el Reporte de Inventario desde el módulo Reportes.')
  })
})
