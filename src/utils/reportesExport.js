import { jsPDF } from 'jspdf'
import * as XLSX from 'xlsx'

function toCurrency(value) {
  return `Q${Number(value || 0).toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function toDateTime(value) {
  if (!value) return new Date()

  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed
}

async function loadImageAsDataUrl(imageUrl) {
  if (!imageUrl) return null

  try {
    const response = await fetch(imageUrl)
    const blob = await response.blob()

    return await new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  } catch (error) {
    console.warn('No se pudo cargar el logo para el PDF:', error)
    return null
  }
}

function normalizeColumns(columns, targetWidth = 186) {
  if (!columns || !columns.length) return []
  const rawTotal = columns.reduce((sum, col) => sum + (Number(col.width) || 30), 0)
  return columns.map((col) => ({
    ...col,
    width: ((Number(col.width) || 30) / rawTotal) * targetWidth,
  }))
}

function drawFooter(doc, pageNumber, totalPages) {
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()

  // Divisor sutil Slate 200
  doc.setDrawColor(226, 232, 240)
  doc.setLineWidth(0.35)
  doc.line(12, pageHeight - 12, pageWidth - 12, pageHeight - 12)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.2)
  doc.setTextColor(148, 163, 184) // Slate 400
  doc.text(
    'AMATI HIELO — Documento generado automáticamente por el Sistema ERP. Trazabilidad legal y respaldo operativo.',
    12,
    pageHeight - 6.5
  )

  doc.setFont('helvetica', 'bold')
  doc.setTextColor(100, 116, 139) // Slate 500
  doc.text(`Página ${pageNumber} de ${totalPages}`, pageWidth - 12, pageHeight - 6.5, { align: 'right' })
}

function drawHeader(doc, { title, subtitle, logoDataUrl, generatedAt, userName, periodLabel, continuation = false }) {
  const pageWidth = doc.internal.pageSize.getWidth()

  if (continuation) {
    // Membrete compacto para hojas de continuación
    doc.setTextColor(14, 116, 144) // Cyan 700
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.text('AMATI HIELO', 12, 13)

    doc.setFillColor(207, 250, 254) // Cyan 100
    doc.roundedRect(42, 9.5, 11, 4.5, 1, 1, 'F')
    doc.setFontSize(6.5)
    doc.setTextColor(21, 94, 117) // Cyan 800
    doc.text('ERP', 47.5, 13, { align: 'center' })

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(100, 116, 139) // Slate 500
    doc.text(`—  ${title} (Continuación)`, 56, 13)

    doc.setDrawColor(8, 145, 178) // Cyan 600
    doc.setLineWidth(0.5)
    doc.line(12, 17, pageWidth - 12, 17)
    return 21
  }

  // Primera página: Membrete Ejecutivo Corporativo
  const hasLogo = Boolean(logoDataUrl)
  let textStartX = 12

  if (hasLogo) {
    try {
      const format = logoDataUrl.startsWith('data:image/png') ? 'PNG' : 'JPEG'
      doc.addImage(logoDataUrl, format, 12, 10, 20, 17)
      textStartX = 36
    } catch {
      textStartX = 12
    }
  }

  // Nombre de marca AMATI HIELO
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.setTextColor(14, 116, 144) // Cyan 700
  doc.text('AMATI HIELO', textStartX, 16.5)

  // Badge ERP
  const badgeX = textStartX + doc.getTextWidth('AMATI HIELO') + 3
  doc.setFillColor(207, 250, 254) // Cyan 100
  doc.roundedRect(badgeX, 11.5, 12, 5.5, 1.2, 1.2, 'F')
  doc.setFontSize(7)
  doc.setTextColor(21, 94, 117) // Cyan 800
  doc.text('ERP', badgeX + 6, 15.5, { align: 'center' })

  // Subtítulo
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(100, 116, 139) // Slate 500
  doc.text('Control de Calidad, Inventarios & Gestión Integral', textStartX, 21.5)

  // Título del Reporte
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(15, 23, 42) // Slate 900
  const maxTitleWidth = 105
  const titleLines = doc.splitTextToSize(String(title || 'REPORTE EJECUTIVO').toUpperCase(), maxTitleWidth)
  doc.text(titleLines, textStartX, 27.5)

  // Bloque Derecho: Folio y Fecha
  const generatedDate = generatedAt.toLocaleDateString('es-GT')
  const generatedTime = generatedAt.toLocaleTimeString('es-GT', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })

  // Folio box
  const folioBoxWidth = 48
  const folioBoxX = pageWidth - 12 - folioBoxWidth
  doc.setFillColor(241, 245, 249) // Slate 100
  doc.setDrawColor(203, 213, 225) // Slate 300
  doc.setLineWidth(0.3)
  doc.roundedRect(folioBoxX, 10, folioBoxWidth, 7, 1.5, 1.5, 'FD')

  doc.setFont('courier', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(51, 65, 85) // Slate 700
  const folioCode = `REP-${generatedAt.getFullYear()}${String(generatedAt.getMonth() + 1).padStart(2, '0')}-${String(generatedAt.getDate()).padStart(2, '0')}`
  doc.text(folioCode, folioBoxX + folioBoxWidth / 2, 14.8, { align: 'center' })

  // Metadatos de emisión a la derecha
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(100, 116, 139)
  doc.text(`Emitido: ${generatedDate} ${generatedTime}`, pageWidth - 12, 21, { align: 'right' })
  doc.text('Estado: ', pageWidth - 32, 25.5, { align: 'right' })
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(14, 116, 144) // Cyan 700
  doc.text('OFICIAL ERP', pageWidth - 12, 25.5, { align: 'right' })

  // Línea divisoria Cyan 600
  const lineY = Math.max(33, 27.5 + (titleLines.length - 1) * 4.5 + 3)
  doc.setDrawColor(8, 145, 178) // Cyan 600
  doc.setLineWidth(0.75)
  doc.line(12, lineY, pageWidth - 12, lineY)

  // Ficha técnica (3 columnas: Responsable, Alcance, Certificación)
  const cardY = lineY + 3
  const cardHeight = 13.5
  const cardWidth = pageWidth - 24

  doc.setFillColor(248, 250, 252) // Slate 50
  doc.setDrawColor(226, 232, 240) // Slate 200
  doc.setLineWidth(0.35)
  doc.roundedRect(12, cardY, cardWidth, cardHeight, 1.8, 1.8, 'FD')

  // Columna 1: Responsable
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(6.5)
  doc.setTextColor(148, 163, 184) // Slate 400
  doc.text('RESPONSABLE DEL REPORTE:', 16, cardY + 4.8)
  doc.setFontSize(8)
  doc.setTextColor(30, 41, 59) // Slate 800
  const safeUser = userName ? String(userName).slice(0, 32) : 'Administrador del Sistema'
  doc.text(safeUser, 16, cardY + 9.8)

  // Columna 2: Período / Alcance
  const col2X = 80
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(6.5)
  doc.setTextColor(148, 163, 184)
  doc.text('ALCANCE / PERÍODO:', col2X, cardY + 4.8)
  doc.setFontSize(8)
  doc.setTextColor(30, 41, 59)
  const safePeriod = periodLabel ? String(periodLabel).slice(0, 36) : 'Registro general del sistema'
  doc.text(safePeriod, col2X, cardY + 9.8)

  // Columna 3: Certificación
  const col3X = 148
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(6.5)
  doc.setTextColor(148, 163, 184)
  doc.text('CERTIFICACIÓN Y CONTROL:', col3X, cardY + 4.8)
  doc.setFontSize(8)
  doc.setTextColor(14, 116, 144) // Cyan 700
  doc.text('Conforme a Conciliación ERP', col3X, cardY + 9.8)

  return cardY + cardHeight + 4
}

function drawTableHeader(doc, columns, startY) {
  const headerHeight = 9
  const totalWidth = 186

  // Slate 800 background
  doc.setFillColor(30, 41, 59)
  doc.setDrawColor(30, 41, 59)
  doc.roundedRect(12, startY, totalWidth, headerHeight, 1, 1, 'F')

  let currentX = 12
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  doc.setTextColor(255, 255, 255)

  columns.forEach((column, index) => {
    // Divisor vertical sutil
    if (index > 0) {
      doc.setDrawColor(71, 85, 105) // Slate 600
      doc.setLineWidth(0.3)
      doc.line(currentX, startY + 1.5, currentX, startY + headerHeight - 1.5)
    }

    const label = String(column.label || column.key || '').toUpperCase()
    const labelLines = doc.splitTextToSize(label, column.width - 3)
    const textY = labelLines.length > 1 ? startY + 3.8 : startY + 5.8

    const textX = column.align === 'right'
      ? currentX + column.width - 3
      : column.align === 'center'
        ? currentX + column.width / 2
        : currentX + 3

    doc.text(labelLines, textX, textY, { align: column.align || 'left' })
    currentX += column.width
  })

  return headerHeight
}

function drawTableRow(doc, columns, row, startY, alternate = false) {
  const cellPadding = 2.5
  const lineHeight = 3.8

  const rowTextSizes = columns.map((column) => {
    const rawVal = row[column.key]
    const text = rawVal != null ? String(rawVal) : ''
    const lines = doc.splitTextToSize(text, column.width - cellPadding * 2)
    return Array.isArray(lines) && lines.length > 0 ? lines : ['']
  })

  const maxLines = Math.max(1, ...rowTextSizes.map((lines) => lines.length))
  const rowHeight = Math.max(7.5, maxLines * lineHeight + 3)

  let currentX = 12
  columns.forEach((column, index) => {
    const lines = rowTextSizes[index]
    const value = String(row[column.key] ?? '')
    const isStatus = /estado|accion|status/i.test(column.key)
    const normalizedValue = value.toLowerCase().trim()

    const isLowStatus = isStatus && (
      normalizedValue.includes('bajo') ||
      normalizedValue.includes('reponer') ||
      normalizedValue.includes('faltante') ||
      normalizedValue.includes('deficit') ||
      normalizedValue.includes('critico') ||
      normalizedValue.includes('baja')
    )
    const isOkStatus = isStatus && (
      normalizedValue === 'ok' ||
      normalizedValue.includes('suficiente') ||
      normalizedValue.includes('conforme') ||
      normalizedValue.includes('coincidente') ||
      normalizedValue.includes('activo') ||
      normalizedValue.includes('completad')
    )
    const isNeutralStatus = isStatus && (
      normalizedValue.includes('sobrante') ||
      normalizedValue.includes('superavit') ||
      normalizedValue.includes('ajuste') ||
      normalizedValue.includes('pendiente')
    )

    // Fondo de celda
    if (isLowStatus) {
      doc.setFillColor(255, 241, 242) // Rose 50
    } else if (isOkStatus) {
      doc.setFillColor(240, 253, 244) // Emerald 50
    } else if (isNeutralStatus) {
      doc.setFillColor(240, 249, 255) // Sky 50
    } else {
      doc.setFillColor(alternate ? 248 : 255, alternate ? 250 : 255, alternate ? 252 : 255)
    }

    doc.setDrawColor(226, 232, 240) // Slate 200
    doc.setLineWidth(0.25)
    doc.rect(currentX, startY, column.width, rowHeight, 'FD')

    // Estilo de texto
    if (isLowStatus) {
      doc.setTextColor(190, 18, 60) // Rose 700
      doc.setFont('helvetica', 'bold')
    } else if (isOkStatus) {
      doc.setTextColor(4, 120, 87) // Emerald 700
      doc.setFont('helvetica', 'bold')
    } else if (isNeutralStatus) {
      doc.setTextColor(14, 116, 144) // Cyan 700
      doc.setFont('helvetica', 'bold')
    } else {
      doc.setTextColor(30, 41, 59) // Slate 800
      doc.setFont('helvetica', column.bold ? 'bold' : 'normal')
    }

    doc.setFontSize(7.5)

    const textX = column.align === 'right'
      ? currentX + column.width - cellPadding
      : column.align === 'center'
        ? currentX + column.width / 2
        : currentX + cellPadding

    const textOptions = { align: column.align || 'left' }
    const startTextY = startY + (rowHeight - (lines.length * lineHeight)) / 2 + lineHeight * 0.85

    lines.forEach((line, lineIndex) => {
      doc.text(line, textX, startTextY + lineIndex * lineHeight, textOptions)
    })

    currentX += column.width
  })

  return rowHeight
}

function drawSummaryAndSignatures(doc, { totalLabel, totalValue, note, userName, startY }) {
  const pageWidth = doc.internal.pageSize.getWidth()
  let currentY = startY + 4

  // 1. Tarjeta Resumen / Total
  if (totalValue !== undefined && totalValue !== null && totalValue !== '') {
    const formattedTotal = typeof totalValue === 'number'
      ? toCurrency(totalValue)
      : String(totalValue).trim()

    const boxHeight = 13
    doc.setFillColor(240, 249, 255) // Sky 50
    doc.setDrawColor(186, 230, 253) // Sky 200
    doc.setLineWidth(0.4)
    doc.roundedRect(12, currentY, 186, boxHeight, 2, 2, 'FD')

    // Círculo insignia Cyan
    doc.setFillColor(14, 116, 144) // Cyan 700
    doc.circle(20, currentY + boxHeight / 2, 4.5, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    const badgeChar = formattedTotal.startsWith('Q') ? 'Q' : 'Σ'
    doc.text(badgeChar, 20, currentY + boxHeight / 2 + 3.2, { align: 'center' })

    // Etiqueta de total
    doc.setTextColor(30, 41, 59) // Slate 800
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.text(totalLabel || 'TOTALIZACIÓN DEL REPORTE', 28, currentY + boxHeight / 2 + 3)

    // Valor del total
    doc.setTextColor(14, 116, 144) // Cyan 700
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(13)
    doc.text(formattedTotal, pageWidth - 16, currentY + boxHeight / 2 + 3.5, { align: 'right' })

    currentY += boxHeight + 3.5
  }

  // 2. Nota Informativa
  if (note) {
    const noteLines = doc.splitTextToSize(note, 160)
    const noteHeight = Math.max(9, noteLines.length * 3.6 + 4)

    doc.setFillColor(255, 255, 255)
    doc.setDrawColor(226, 232, 240) // Slate 200
    doc.setLineWidth(0.3)
    doc.roundedRect(12, currentY, 186, noteHeight, 1.5, 1.5, 'FD')

    doc.setFillColor(14, 116, 144)
    doc.circle(18, currentY + noteHeight / 2, 3, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7)
    doc.text('i', 18, currentY + noteHeight / 2 + 2.2, { align: 'center' })

    doc.setTextColor(100, 116, 139)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.5)
    doc.text('NOTA:', 24, currentY + 5)

    doc.setFont('helvetica', 'normal')
    doc.text(noteLines, 34, currentY + 5)

    currentY += noteHeight + 4
  }

  // 3. Constancia y 2 Firmas de Autorización
  currentY += 4
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  doc.setTextColor(148, 163, 184) // Slate 400
  doc.text('CONSTANCIA DE CONFORMIDAD Y AUTORIZACIÓN', pageWidth / 2, currentY, { align: 'center' })

  currentY += 14 // Espacio para el trazo de firmas

  const sigWidth = 64

  // Firma 1 (Izquierda): Persona que lo realizó
  const sig1CenterX = 56
  doc.setDrawColor(148, 163, 184) // Slate 400
  doc.setLineWidth(0.4)
  doc.line(sig1CenterX - sigWidth / 2, currentY, sig1CenterX + sigWidth / 2, currentY)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.setTextColor(30, 41, 59) // Slate 800
  doc.text(userName || 'Persona que realizó el conteo', sig1CenterX, currentY + 4.5, { align: 'center' })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(71, 85, 105) // Slate 600
  doc.text('Firma de la Persona que lo realizó', sig1CenterX, currentY + 8.5, { align: 'center' })

  doc.setFontSize(6.8)
  doc.setTextColor(148, 163, 184) // Slate 400
  doc.text('Responsable Operativo', sig1CenterX, currentY + 12, { align: 'center' })

  // Firma 2 (Derecha): Jefe de la Empresa
  const sig2CenterX = 154
  doc.setDrawColor(148, 163, 184)
  doc.line(sig2CenterX - sigWidth / 2, currentY, sig2CenterX + sigWidth / 2, currentY)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.setTextColor(30, 41, 59)
  doc.text('Jefe de la Empresa', sig2CenterX, currentY + 4.5, { align: 'center' })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(71, 85, 105)
  doc.text('Firma del Jefe de la Empresa', sig2CenterX, currentY + 8.5, { align: 'center' })

  doc.setFontSize(6.8)
  doc.setTextColor(148, 163, 184)
  doc.text('Gerencia General / Dirección', sig2CenterX, currentY + 12, { align: 'center' })
}

function buildSalesColumns() {
  return [
    { key: 'fecha', label: 'FECHA', width: 38, align: 'left' },
    { key: 'transacciones', label: 'TRANSACCIONES', width: 34, align: 'center' },
    { key: 'totalVentas', label: 'TOTAL VENTAS', width: 38, align: 'right' },
    { key: 'ticketPromedio', label: 'TICKET PROMEDIO', width: 38, align: 'right' },
    { key: 'metodoPrincipal', label: 'MÉTODO PRINCIPAL', width: 38, align: 'center' },
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
  rows = [],
  totalLabel,
  totalValue,
  note,
}) {
  const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' })
  const generatedAt = new Date()
  const logoDataUrl = logoUrl ? await loadImageAsDataUrl(logoUrl) : null
  const normColumns = normalizeColumns(columns)

  let currentY = drawHeader(doc, {
    title,
    subtitle,
    logoDataUrl,
    generatedAt,
    userName,
    periodLabel,
    continuation: false,
  })

  currentY += drawTableHeader(doc, normColumns, currentY)

  if (!rows || rows.length === 0) {
    doc.setDrawColor(226, 232, 240)
    doc.setFillColor(248, 250, 252)
    doc.roundedRect(12, currentY, 186, 12, 1.5, 1.5, 'FD')
    doc.setTextColor(100, 116, 139)
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(8)
    doc.text('No hay datos registrados para este reporte.', 105, currentY + 7.5, { align: 'center' })
    currentY += 16
  } else {
    rows.forEach((row, index) => {
      const maxTableY = 265
      const estLineHeight = 3.8
      const maxLines = Math.max(1, ...normColumns.map((col) => {
        const txt = String(row[col.key] ?? '')
        return doc.splitTextToSize(txt, col.width - 5).length
      }))
      const estRowHeight = Math.max(7.5, maxLines * estLineHeight + 3)

      if (currentY + estRowHeight > maxTableY) {
        doc.addPage()
        currentY = drawHeader(doc, {
          title,
          subtitle,
          logoDataUrl,
          generatedAt,
          userName,
          periodLabel,
          continuation: true,
        })
        currentY += drawTableHeader(doc, normColumns, currentY)
      }

      const drawnHeight = drawTableRow(doc, normColumns, row, currentY, index % 2 === 1)
      currentY += drawnHeight
    })
  }

  // Verificar espacio para tarjeta de resumen y constancia de firmas
  const neededSummarySpace = 55 + (note ? 12 : 0)
  if (currentY + neededSummarySpace > 270) {
    doc.addPage()
    currentY = drawHeader(doc, {
      title,
      subtitle,
      logoDataUrl,
      generatedAt,
      userName,
      periodLabel,
      continuation: true,
    })
  }

  drawSummaryAndSignatures(doc, {
    totalLabel,
    totalValue,
    note,
    userName,
    startY: currentY,
  })

  // Estampar pie de página con paginación legal en todas las páginas
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

export function generateTableReportExcel({ fileName, sheetName = 'Reporte', rows = [] }) {
  const workbook = XLSX.utils.book_new()
  const worksheet = XLSX.utils.json_to_sheet(rows.length ? rows : [{ Mensaje: 'No hay datos suficientes para generar este reporte.' }])
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.slice(0, 31))
  XLSX.writeFile(workbook, fileName)
}
