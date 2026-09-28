function parseDate(value) {
  if (!value) return null

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function isWithinRange(value, dateFrom, dateTo) {
  const parsed = parseDate(value)
  if (!parsed) return true

  const start = dateFrom ? parseDate(`${dateFrom}T00:00:00`) : null
  const end = dateTo ? parseDate(`${dateTo}T23:59:59`) : null

  if (start && parsed < start) return false
  if (end && parsed > end) return false

  return true
}

function toCurrency(value) {
  return `Q${Number(value || 0).toFixed(2)}`
}

function getDayKey(value) {
  const parsed = parseDate(value)
  if (!parsed) return null

  return parsed.toISOString().slice(0, 10)
}

function formatDayLabel(value) {
  const parsed = parseDate(value)
  if (!parsed) return 'Sin fecha'

  return parsed.toLocaleDateString('es-GT', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

function formatDateTimeShort(value) {
  const parsed = parseDate(value)
  if (!parsed) return 'Sin registro'

  return parsed.toLocaleString('es-GT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

export function buildReportData({
  sales = [],
  products = [],
  movements = [],
  recipes = [],
  productions = [],
  dateFrom = '',
  dateTo = '',
} = {}) {
  const filteredSales = sales.filter((sale) => isWithinRange(sale.createdAt || sale.fecha, dateFrom, dateTo))
  const filteredProducts = products.filter((product) => product && product.id)
  const filteredMovements = movements.filter((movement) => isWithinRange(movement.createdAt || movement.fecha, dateFrom, dateTo))
  const filteredRecipes = recipes.filter((recipe) => recipe && recipe.id)
  const filteredProductions = productions.filter((production) => production && production.id)

  const salesTotal = filteredSales.reduce((sum, sale) => sum + Number(sale.total || 0), 0)
  const salesAverage = filteredSales.length > 0 ? salesTotal / filteredSales.length : 0
  const paymentMethods = filteredSales.reduce((acc, sale) => {
    const method = sale.metodoPago || 'Efectivo'
    acc[method] = (acc[method] || 0) + 1
    return acc
  }, {})

  const salesByDay = filteredSales.reduce((acc, sale) => {
    const key = getDayKey(sale.createdAt || sale.fecha)
    if (!key) return acc

    if (!acc[key]) {
      acc[key] = {
        fecha: key,
        label: formatDayLabel(sale.createdAt || sale.fecha),
        transacciones: 0,
        totalVentas: 0,
        pagos: {},
      }
    }

    acc[key].transacciones += 1
    acc[key].totalVentas += Number(sale.total || 0)
    const method = sale.metodoPago || 'Efectivo'
    acc[key].pagos[method] = (acc[key].pagos[method] || 0) + 1
    return acc
  }, {})

  const dailyRows = Object.values(salesByDay)
    .sort((a, b) => b.fecha.localeCompare(a.fecha))
    .map((row) => {
      const primaryMethod = Object.entries(row.pagos).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Efectivo'
      return {
        fecha: row.label,
        transacciones: row.transacciones,
        totalVentas: toCurrency(row.totalVentas),
        totalVentasValue: row.totalVentas,
        ticketPromedio: toCurrency(row.transacciones > 0 ? row.totalVentas / row.transacciones : 0),
        metodoPrincipal: primaryMethod,
      }
    })

  const primaryMethod = Object.entries(paymentMethods).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Efectivo'
  const lowStockProducts = filteredProducts.filter((product) => Number(product.stock || 0) <= Number(product.minimo || 0)).length

  return {
    cards: [
      { label: 'Ventas del periodo', value: filteredSales.length, accent: 'green' },
      { label: 'Productos activos', value: filteredProducts.length, accent: 'blue' },
      { label: 'Recetas registradas', value: filteredRecipes.length, accent: 'purple' },
      { label: 'Movimientos recientes', value: filteredMovements.length, accent: 'orange' },
    ],
    previewRows: dailyRows.length > 0 ? dailyRows : filteredSales.slice(0, 8).map((sale) => ({
      fecha: formatDateTimeShort(sale.createdAt || sale.fecha),
      transacciones: 1,
      totalVentas: toCurrency(sale.total || 0),
      totalVentasValue: Number(sale.total || 0),
      ticketPromedio: toCurrency(salesAverage),
      metodoPrincipal: sale.metodoPago || 'Efectivo',
    })),
    dailyRows,
    salesCount: filteredSales.length,
    salesTotal,
    salesAverage,
    primaryMethod,
    lowStockProducts,
    productionsCount: filteredProductions.length,
    categories: Array.from(new Set(filteredProducts.map((product) => product.categoria).filter(Boolean))),
    periodLabel: `${dateFrom ? formatDayLabel(`${dateFrom}T00:00:00`) : 'Sin fecha inicial'} - ${dateTo ? formatDayLabel(`${dateTo}T00:00:00`) : 'Sin fecha final'}`,
  }
}
