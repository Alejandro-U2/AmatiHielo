import { generateGenericReportPdf } from './reportesExport'
import { getCurrentUser } from '../services/authService'
import logoAmati from '../assets/logo-amati.jpg'

export async function generarReporteModulo({
  fileName,
  title,
  columns,
  rows,
  totalLabel,
  totalValue,
  note,
  filterLabel,
}) {
  const currentUser = getCurrentUser()

  await generateGenericReportPdf({
    fileName,
    title,
    subtitle: 'Sistema Web de Gestión Integral de Inventario y Punto de Venta',
    logoUrl: logoAmati,
    userName: currentUser?.nombre || currentUser?.username || currentUser?.email || 'Administrador',
    periodLabel: filterLabel ? `Reporte filtrado por: ${filterLabel}` : 'Registro general del sistema',
    columns,
    rows,
    totalLabel,
    totalValue,
    note,
  })
}