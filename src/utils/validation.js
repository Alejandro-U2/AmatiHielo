export function sanitizeSoloLetras(value = '') {
  return String(value || '').replace(/[^A-Za-zÁÉÍÓÚáéíóúÑñÜü\s]/g, '')
}

export function isValidSoloLetras(value = '') {
  const normalized = String(value || '').trim()
  return normalized.length > 0 && /^[A-Za-zÁÉÍÓÚáéíóúÑñÜü\s]+$/.test(normalized)
}

export function sanitizeSoloNumeros(value = '') {
  return String(value || '').replace(/\D/g, '')
}

export function isValidSoloNumeros(value = '') {
  const normalized = String(value || '').trim()
  return normalized.length > 0 && /^\d+$/.test(normalized)
}

export function sanitizeNIT(value = '') {
  return String(value || '').replace(/[^\d-]/g, '')
}

export function isValidNIT(value = '') {
  const normalized = String(value || '').trim()
  return normalized.length > 0 && /^[\d-]+$/.test(normalized)
}

export function isValidEmail(value = '') {
  const normalized = String(value || '').trim()
  return normalized.length > 0 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)
}

export const sanitizeNombreCliente = sanitizeSoloLetras
export const isValidNombreCliente = isValidSoloLetras
export const sanitizeTelefono = sanitizeSoloNumeros
export const isValidTelefono = isValidSoloNumeros

export function capitalizeWords(value = '') {
  return String(value || '')
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}
