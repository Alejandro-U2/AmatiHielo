import { jsPDF } from 'jspdf'
import * as XLSX from 'xlsx'

function toCurrency(value) {
  return `Q${Number(value || 0).toFixed(2)}`
}

function toDateTime(value) {
  if (!value) return new Date()

  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed
}

async function loadImageAsDataUrl(imageUrl) {
  if (!imageUrl) return null

  const response = await fetch(imageUrl)
  const blob = await response.blob()

  return await new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

function drawFooter(doc, pageNumber, totalPages) {
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()

  doc.setDrawColor(22, 72, 142)
  doc.setLineWidth(0.4)
  doc.line(12, pageHeight - 14, pageWidth - 12, pageHeight - 14)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(55, 65, 81)
  doc.text('Generado por AMATI HIELO - Sistema de Inventario y POS', 12, pageHeight - 7)
  doc.text(`Página ${pageNumber} de ${totalPages}`, pageWidth - 12, pageHeight - 7, { align: 'right' })
}

function drawHeader(doc, { title, subtitle, logoDataUrl, generatedAt, userName, periodLabel, continuation = false }) {
  const pageWidth = doc.internal.pageSize.getWidth()

  doc.setTextColor(17, 45, 96)

  if (logoDataUrl && !continuation) {
    doc.addImage(logoDataUrl, 'JPEG', 10, 10, 36, 28)
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(continuation ? 16 : 20)
  doc.text(title, pageWidth / 2, continuation ? 18 : 18, { align: 'center' })

  if (!continuation) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(82, 93, 113)
    doc.text(subtitle, pageWidth / 2, 25, { align: 'center' })

    doc.setDrawColor(190, 199, 214)
    doc.setLineWidth(0.3)
    doc.line(160, 8, 160, 36)

    const generatedDate = generatedAt.toLocaleDateString('es-GT')
    const generatedTime = generatedAt.toLocaleTimeString('es-GT', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    })

    doc.setTextColor(17, 45, 96)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.text('Fecha de generación:', 166, 14)
    doc.setFont('helvetica', 'normal')
    doc.text(generatedDate, 166, 18)

    doc.setFont('helvetica', 'bold')
    doc.text('Hora de generación:', 166, 25)
    doc.setFont('helvetica', 'normal')
    doc.text(generatedTime, 166, 29)

    doc.setFont('helvetica', 'bold')
    doc.text('Usuario:', 166, 36)
    doc.setFont('helvetica', 'normal')
    doc.text(userName || 'Administrador', 166, 40)

    doc.setDrawColor(22, 72, 142)
    doc.setLineWidth(0.8)
    doc.line(12, 49, pageWidth - 12, 49)

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.text('PERÍODO CONSULTADO', 24, 58)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.text(periodLabel || 'Sin fecha inicial - Sin fecha final', 24, 64)

    doc.setDrawColor(216, 222, 231)
    doc.setFillColor(248, 250, 252)
    doc.roundedRect(12, 70, pageWidth - 24, 14, 2, 2, 'FD')
  }
}

function drawTableHeader(doc, columns, startY) {
  const headerHeight = 14
  const totalWidth = columns.reduce((sum, column) => sum + column.width, 0)

  doc.setFillColor(22, 72, 142)
  doc.setDrawColor(22, 72, 142)
  doc.rect(12, startY, totalWidth, headerHeight, 'F')

  let currentX = 12
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.setTextColor(255, 255, 255)

  columns.forEach((column) => {
    doc.setDrawColor(255, 255, 255)
    doc.setLineWidth(0.45)
    doc.line(currentX, startY, currentX, startY + headerHeight)

    const labelLines = doc.splitTextToSize(column.label, column.width - 4)
    const textY = labelLines.length > 1 ? startY + 5 : startY + 8.8
    doc.text(labelLines, currentX + column.width / 2, textY, { align: 'center' })
    currentX += column.width
  })

  doc.line(currentX, startY, currentX, startY + headerHeight)
  doc.line(12, startY + headerHeight, 12 + totalWidth, startY + headerHeight)

  return headerHeight
}

function drawTableRow(doc, columns, row, startY, alternate = false) {
  const cellPadding = 2
  const lineHeight = 4.2
  const rowTextSizes = columns.map((column) => {
    const text = String(row[column.key] ?? '')
    const lines = doc.splitTextToSize(text, column.width - cellPadding * 2)
    return Array.isArray(lines) ? lines : [String(text)]
  })
  const rowHeight = Math.max(8, ...rowTextSizes.map((lines) => lines.length * lineHeight + 2))

  let currentX = 12
  columns.forEach((column, index) => {
    const lines = rowTextSizes[index]
    const value = String(row[column.key] ?? '')
    const isStatus = column.key === 'estado'
    const normalizedValue = value.toLowerCase()
    const isLowStatus = isStatus && (normalizedValue.includes('bajo') || normalizedValue.includes('reponer'))
    const isOkStatus = isStatus && (normalizedValue === 'ok' || normalizedValue.includes('suficiente'))

    if (isLowStatus) {
      doc.setFillColor(254, 226, 226)
    } else if (isOkStatus) {
      doc.setFillColor(220, 252, 231)
    } else {
      doc.setFillColor(alternate ? 249 : 255, alternate ? 250 : 255, alternate ? 252 : 255)
    }

    doc.setDrawColor(214, 220, 228)
    doc.rect(currentX, startY, column.width, rowHeight, 'FD')

    if (isLowStatus) {
      doc.setTextColor(153, 27, 27)
      doc.setFont('helvetica', 'bold')
    } else if (isOkStatus) {
      doc.setTextColor(22, 101, 52)
      doc.setFont('helvetica', 'bold')
    } else {
      doc.setTextColor(31, 41, 55)
      doc.setFont('helvetica', 'normal')
    }

    doc.setFontSize(8.5)

    const textX = column.align === 'right'
      ? currentX + column.width - cellPadding
      : column.align === 'center'
        ? currentX + column.width / 2
        : currentX + cellPadding

    const textOptions = { align: column.align || 'left' }
    const textY = startY + 5.5

    if (column.align === 'right') {
      lines.slice(0, 2).forEach((line, lineIndex) => {
        doc.text(line, textX, textY + lineIndex * lineHeight, textOptions)
      })
    } else {
      lines.slice(0, 2).forEach((line, lineIndex) => {
        doc.text(line, textX, textY + lineIndex * lineHeight, textOptions)
      })
    }

    currentX += column.width
  })

  return rowHeight
}

function drawSummarySection(doc, totalValue, totalLabel, note) {
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()

  const boxY = pageHeight - 57
  doc.setDrawColor(190, 209, 237)
  doc.setFillColor(240, 246, 255)
  doc.roundedRect(12, boxY, pageWidth - 24, 18, 2, 2, 'FD')

  doc.setFillColor(21, 67, 130)
  doc.circle(22, boxY + 9, 6.5, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  const formattedTotal = typeof totalValue === 'number'
    ? totalValue.toLocaleString('es-GT')
    : String(totalValue ?? '0')
  const summarySymbol = formattedTotal.trim().startsWith('Q') ? 'Q' : '#'

  doc.text(summarySymbol, 22, boxY + 11.2, { align: 'center' })

  doc.setTextColor(17, 45, 96)
  doc.setFontSize(11)
  doc.text(totalLabel || 'TOTAL DE VENTAS', 32, boxY + 11.5)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(17)
  doc.text(formattedTotal, pageWidth - 18, boxY + 11.5, { align: 'right' })

  doc.setDrawColor(190, 199, 214)
  doc.setFillColor(255, 255, 255)
  doc.roundedRect(12, boxY + 24, pageWidth - 24, 16, 2, 2, 'FD')
  doc.setFillColor(21, 67, 130)
  doc.circle(22, boxY + 32, 6.2, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(11)
  doc.text('i', 22, boxY + 34.1, { align: 'center' })
  doc.setTextColor(17, 45, 96)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text('NOTA:', 32, boxY + 33)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  const wrapped = doc.splitTextToSize(note || 'El reporte presenta los datos agrupados por día. Los totales incluyen todas las transacciones del período consultado.', pageWidth - 56)
  doc.text(wrapped, 45, boxY + 33)
}

function buildSalesColumns() {
  return [
    { key: 'fecha', label: 'FECHA', width: 42, align: 'left' },
    { key: 'transacciones', label: 'TRANSACCIONES', width: 36, align: 'center' },
    { key: 'totalVentas', label: 'TOTAL VENTAS', width: 36, align: 'center' },
    { key: 'ticketPromedio', label: 'TICKET PROMEDIO', width: 36, align: 'center' },
    { key: 'metodoPrincipal', label: 'MÉTODO PRINCIPAL', width: 36, align: 'center' },
  ]
}

async function generateTabularPdf({
  fileName,
  title,
  subtitle,
  logoUrl,
  userName,
  periodLabel,
  columns,
  rows,
  totalLabel,
  totalValue,
  note,
}) {
  const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' })
  const generatedAt = new Date()
  const logoDataUrl = logoUrl ? await loadImageAsDataUrl(logoUrl) : null

  drawHeader(doc, {
    title,
    subtitle,
    logoDataUrl,
    generatedAt,
    userName,
    periodLabel,
    continuation: false,
  })

  let currentY = 84
  currentY += drawTableHeader(doc, columns, currentY)

  if (!rows.length) {
    doc.setDrawColor(214, 220, 228)
    doc.setFillColor(255, 255, 255)
    doc.roundedRect(12, currentY, 186, 14, 2, 2, 'FD')
    doc.setTextColor(107, 114, 128)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.text('No hay datos registrados para este reporte.', 105, currentY + 9, { align: 'center' })
    currentY += 18
  } else {
    rows.forEach((row, index) => {
      const rowHeight = Math.max(
        10,
        ...columns.map((column) => {
          const text = String(row[column.key] ?? '')
          const lines = doc.splitTextToSize(text, column.width - 4)
          return (Array.isArray(lines) ? lines.length : 1) * 4.2 + 2
        }),
      )

      const maxTableY = 235
      if (currentY + rowHeight > maxTableY) {
        doc.addPage()
        drawHeader(doc, {
          title,
          subtitle,
          logoDataUrl,
          generatedAt,
          userName,
          periodLabel,
          continuation: true,
        })
        currentY = 26
        currentY += drawTableHeader(doc, columns, currentY)
      }

      const drawnHeight = drawTableRow(doc, columns, row, currentY, index % 2 === 1)
      currentY += drawnHeight
    })
  }

  if (currentY > 240) {
    doc.addPage()
  }

  drawSummarySection(doc, totalValue, totalLabel, note)

  const totalPages = doc.getNumberOfPages()
  for (let page = 1; page <= totalPages; page += 1) {
    doc.setPage(page)
    drawFooter(doc, page, totalPages)
  }

  doc.save(fileName)
}

export async function generateSalesReportPdf({
  reportName,
  reportData,
  logoUrl,
  userName,
  dateFrom,
  dateTo,
}) {
  const columns = buildSalesColumns()
  const rows = reportData?.dailyRows || []
  const totalValue = reportData?.salesTotal || 0
  const periodLabel = `${dateFrom ? toDateTime(`${dateFrom}T00:00:00`).toLocaleDateString('es-GT') : 'Sin fecha inicial'} - ${dateTo ? toDateTime(`${dateTo}T00:00:00`).toLocaleDateString('es-GT') : 'Sin fecha final'}`

  await generateTabularPdf({
    fileName: `${(reportName || 'reporte').replace(/\s+/g, '_').toLowerCase()}.pdf`,
    title: reportName || 'REPORTE DE VENTAS DIARIO',
    subtitle: 'Sistema Web de Gestión Integral de Inventario y Punto de Venta',
    logoUrl,
    userName,
    periodLabel,
    columns,
    rows,
    totalLabel: 'TOTAL DE VENTAS',
    totalValue: toCurrency(totalValue),
    note: 'El reporte presenta las ventas agrupadas por día. Los totales incluyen todas las transacciones del período consultado.',
  })
}

export async function generateGenericReportPdf({
  fileName,
  title,
  subtitle,
  logoUrl,
  userName,
  periodLabel,
  columns,
  rows,
  totalLabel,
  totalValue,
  note,
}) {
  await generateTabularPdf({
    fileName,
    title,
    subtitle,
    logoUrl,
    userName,
    periodLabel,
    columns,
    rows,
    totalLabel,
    totalValue,
    note,
  })
}

export async function generateReportExcel({
  reportName,
  reportData,
  products = [],
  recipes = [],
  movements = [],
  dateFrom = '',
  dateTo = '',
}) {
  const workbook = XLSX.utils.book_new()
  const reportTitle = reportName || 'Reporte'
  const summarySheet = [
    ['Reporte', reportTitle],
    ['Fecha de generación', new Date().toLocaleString('es-GT')],
    ['Período consultado', reportData?.periodLabel || `${dateFrom || 'Sin fecha inicial'} - ${dateTo || 'Sin fecha final'}`],
    ['Ventas del periodo', reportData?.salesCount || 0],
    ['Total de ventas', reportData?.salesTotal || 0],
    ['Ticket promedio', reportData?.salesAverage || 0],
    ['Recetas registradas', recipes.length],
    ['Productos activos', products.length],
    ['Movimientos recientes', movements.length],
  ]

  const summarySheetData = XLSX.utils.aoa_to_sheet(summarySheet)
  summarySheetData['!cols'] = [{ wch: 24 }, { wch: 36 }]
  XLSX.utils.book_append_sheet(workbook, summarySheetData, 'Resumen')

  const salesRows = (reportData?.dailyRows || []).map((row) => ({
    Fecha: row.fecha,
    Transacciones: row.transacciones,
    'Total Ventas': Number(row.totalVentasValue || 0),
    'Ticket Promedio': row.ticketPromedio,
    'Método Principal': row.metodoPrincipal,
  }))

  const salesSheet = XLSX.utils.json_to_sheet(salesRows.length ? salesRows : [{ Mensaje: 'Sin ventas registradas para el período' }])
  salesSheet['!cols'] = [
    { wch: 24 },
    { wch: 16 },
    { wch: 18 },
    { wch: 18 },
    { wch: 18 },
  ]
  XLSX.utils.book_append_sheet(workbook, salesSheet, 'Ventas Diarias')

  if (products.length) {
    const inventoryRows = products.map((product) => ({
      Código: product.codigo,
      Producto: product.nombre,
      Categoría: product.categoria,
      Stock: Number(product.stock || 0),
      Mínimo: Number(product.minimo || 0),
      Acción: Number(product.stock || 0) <= Number(product.minimo || 0) ? 'Reponer' : 'Suficiente',
    }))
    const inventorySheet = XLSX.utils.json_to_sheet(inventoryRows)
    inventorySheet['!cols'] = [
      { wch: 16 },
      { wch: 34 },
      { wch: 20 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
    ]
    XLSX.utils.book_append_sheet(workbook, inventorySheet, 'Inventario')
  }

  if (recipes.length) {
    const recipeRows = recipes.map((recipe) => ({
      Código: recipe.codigo,
      Receta: recipe.nombre,
      Categoría: recipe.categoria,
      'Costo Total': Number(recipe.costoTotal || 0),
      'Precio Sugerido': Number(recipe.precioSugerido || 0),
    }))
    const recipeSheet = XLSX.utils.json_to_sheet(recipeRows)
    recipeSheet['!cols'] = [
      { wch: 16 },
      { wch: 34 },
      { wch: 20 },
      { wch: 16 },
      { wch: 18 },
    ]
    XLSX.utils.book_append_sheet(workbook, recipeSheet, 'Producción')
  }

  XLSX.writeFile(workbook, `${reportTitle.replace(/\s+/g, '_').toLowerCase()}.xlsx`)
}
