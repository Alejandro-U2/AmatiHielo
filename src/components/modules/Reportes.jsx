import { useEffect, useMemo, useState } from 'react'
import {
  FileText,
  Download,
  Calendar,
  TrendingUp,
  Package,
  Factory,
  ShoppingCart,
  Filter,
  AlertTriangle,
} from 'lucide-react'
import { toast } from 'sonner'
import logoAmati from '../../assets/logo-amati.jpg'
import { getCurrentUser } from '../../services/authService'
import { listVentasPos } from '../../services/posService'
import { listProductosInventario, listMovimientosInventario } from '../../services/inventarioService'
import { getRecetas } from '../../services/recetasService'
import { getHistoricalSales } from '../../services/salesService'
import { generateDemandPredictions, getPredictionProducts } from '../../services/predictionService'
import { buildReportData } from '../../utils/reportesUtils'
import { generateGenericReportPdf, generateReportExcel, generateSalesReportPdf, generateTableReportExcel } from '../../utils/reportesExport'
import Pagination from '../../components/Pagination'
import ModuleHeader from '../ModuleHeader'
import SuccessModal from '../SuccessModal'

const reports = [
  {
    id: 1,
    name: 'Reporte de Ventas Diario',
    category: 'Ventas',
    description: 'Resumen de ventas, transacciones y métodos de pago del día',
    icon: ShoppingCart,
    color: 'from-green-500 to-emerald-600',
  },
  {
    id: 2,
    name: 'Reporte de Inventario',
    category: 'Inventario',
    description: 'Estado actual de stock, movimientos y alertas',
    icon: Package,
    color: 'from-blue-500 to-cyan-600',
  },
  {
    id: 3,
    name: 'Reporte de Producción',
    category: 'Producción',
    description: 'Lotes producidos, costos y rendimiento',
    icon: Factory,
    color: 'from-purple-500 to-purple-600',
  },
  {
    id: 4,
    name: 'Reporte de Cierre de Caja',
    category: 'Finanzas',
    description: 'Arqueo de caja y conciliación de pagos',
    icon: TrendingUp,
    color: 'from-orange-500 to-red-600',
  },
  {
    id: 5,
    name: 'Estimaciones de demanda semanal (reglas)',
    category: 'IA Predictiva',
    description: 'Proyecciones de demanda y recomendaciones',
    icon: TrendingUp,
    color: 'from-purple-500 to-pink-600',
  },
  {
    id: 6,
    name: 'Reporte de Ventas Mensual',
    category: 'Ventas',
    description: 'Análisis completo de ventas del mes',
    icon: ShoppingCart,
    color: 'from-green-500 to-emerald-600',
  },
]

function Reportes() {
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(5)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [sales, setSales] = useState([])
  const [products, setProducts] = useState([])
  const [movements, setMovements] = useState([])
  const [recipes, setRecipes] = useState([])
  const [loading, setLoading] = useState(true)
  const [exportingKey, setExportingKey] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [successModalData, setSuccessModalData] = useState({
    title: 'Reporte generado',
    subtitle: 'Operación completada',
  })
  const currentUser = getCurrentUser()

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        const [ventasData, productosData, movimientosData, recetasData] = await Promise.all([
          listVentasPos(),
          listProductosInventario(),
          listMovimientosInventario(),
          getRecetas(),
        ])

        setSales(ventasData)
        setProducts(productosData)
        setMovements(movimientosData?.data ?? movimientosData)
        setRecipes(recetasData)
      } catch (error) {
        toast.error(error.message || 'No fue posible cargar los reportes')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  const reportData = useMemo(() => buildReportData({
    sales,
    products,
    movements,
    recipes,
    dateFrom,
    dateTo,
  }), [sales, products, movements, recipes, dateFrom, dateTo])

  const filteredReports = useMemo(() => {
    if (selectedCategory === 'all') {
      return reports
    }

    return reports.filter((report) => report.category === selectedCategory)
  }, [selectedCategory])

  const totalPages = Math.max(1, Math.ceil(filteredReports.length / pageSize))
  const paginatedReports = filteredReports.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  useEffect(() => {
    setCurrentPage(1)
  }, [selectedCategory])

  const handleExport = async (report, format) => {
    try {
      setExportingKey(`${report.id}-${format}`)
      const fileBase = report.name.replace(/\s+/g, '_').toLowerCase()
      const commonMeta = {
        reportName: report.name,
        logoUrl: logoAmati,
        userName: currentUser?.nombre || currentUser?.username || currentUser?.email || 'Administrador',
        dateFrom,
        dateTo,
      }

      if (report.id === 5) {
        const [predictionProducts, historicalSales] = await Promise.all([
          getPredictionProducts(),
          getHistoricalSales(30),
        ])
        const result = generateDemandPredictions({ forecast: null, sales: historicalSales, products: predictionProducts })
        const rows = result.predictions
          .filter((prediction) => prediction.hasEnoughSales)
          .map((prediction) => ({
            Producto: prediction.productName,
            'Promedio semanal (30 días)': Math.round(prediction.averageSale * 7),
            'Estimación (7 días)': prediction.nextWeekPrediction,
            Tendencia: prediction.trend === 'up' ? 'Al alza' : prediction.trend === 'down' ? 'A la baja' : 'Estable',
            'Confianza estimada': `${prediction.confidence}%`,
            Motivo: prediction.keyFactor,
          }))

        if (format === 'PDF') {
          await generateGenericReportPdf({
            fileName: `${fileBase}.pdf`,
            title: report.name.toUpperCase(),
            subtitle: 'Estimaciones calculadas con ventas históricas y reglas de negocio',
            logoUrl: logoAmati,
            userName: commonMeta.userName,
            periodLabel: 'Historial de ventas de los últimos 30 días; sin ajuste climático',
            columns: [
              { key: 'Producto', label: 'PRODUCTO', width: 38, align: 'left' },
              { key: 'Promedio semanal (30 días)', label: 'PROM. SEMANAL (30D)', width: 32, align: 'center' },
              { key: 'Estimación (7 días)', label: 'ESTIMACIÓN (7D)', width: 28, align: 'center' },
              { key: 'Tendencia', label: 'TENDENCIA', width: 25, align: 'center' },
              { key: 'Confianza estimada', label: 'CONF. ESTIMADA', width: 28, align: 'center' },
              { key: 'Motivo', label: 'FACTOR CLAVE', width: 45, align: 'left' },
            ],
            rows,
            totalLabel: 'ESTIMACIONES CON DATOS SUFICIENTES',
            totalValue: rows.length,
            note: 'Estimaciones por reglas, no por un modelo entrenado. Solo se incluyen productos con ventas en al menos cinco días distintos. La confianza es heurística, no precisión medida.',
          })
        } else {
          generateTableReportExcel({
            fileName: `${fileBase}.xlsx`,
            sheetName: 'Estimaciones',
            rows,
          })
        }

        setSuccessModalData({
          title: 'Reporte generado',
          subtitle: 'Operación completada',
        })
        setSuccessMessage(`El reporte "${report.name}" (${format}) ha sido generado y descargado exitosamente.`)
        return
      }

      if (format === 'PDF') {
        if (report.category === 'Ventas') {
          await generateSalesReportPdf({
            ...commonMeta,
            reportData,
            reportName: report.name,
          })
        } else if (report.category === 'Inventario') {
          await generateGenericReportPdf({
            fileName: `${fileBase}.pdf`,
            title: report.name,
            subtitle: report.description,
            logoUrl: logoAmati,
            userName: commonMeta.userName,
            periodLabel: reportData.periodLabel,
            columns: [
              { key: 'codigo', label: 'CÓDIGO', width: 28, align: 'left' },
              { key: 'nombre', label: 'NOMBRE DEL PRODUCTO', width: 52, align: 'left' },
              { key: 'categoria', label: 'CATEGORÍA', width: 28, align: 'center' },
              { key: 'stock', label: 'STOCK ACTUAL', width: 24, align: 'center' },
              { key: 'minimo', label: 'STOCK MÍNIMO', width: 24, align: 'center' },
              { key: 'estado', label: 'ACCIÓN', width: 30, align: 'center' },
            ],
            rows: products.map((product) => ({
              codigo: product.codigo,
              nombre: product.nombre,
              categoria: product.categoria,
              stock: Number(product.stock || 0),
              minimo: Number(product.minimo || 0),
              estado: Number(product.stock || 0) <= Number(product.minimo || 0) ? 'Reponer' : 'Suficiente',
            })),
            totalLabel: 'PRODUCTOS TOTALES',
            totalValue: products.length,
            note: 'Reponer significa que el stock actual está igual o por debajo del stock mínimo configurado.',
          })
        } else if (report.category === 'Producción') {
          await generateGenericReportPdf({
            fileName: `${fileBase}.pdf`,
            title: report.name,
            subtitle: report.description,
            logoUrl: logoAmati,
            userName: commonMeta.userName,
            periodLabel: reportData.periodLabel,
            columns: [
              { key: 'codigo', label: 'CÓDIGO', width: 28, align: 'left' },
              { key: 'nombre', label: 'RECETA', width: 58, align: 'left' },
              { key: 'categoria', label: 'CATEGORÍA', width: 30, align: 'center' },
              { key: 'costoTotal', label: 'COSTO TOTAL', width: 35, align: 'center' },
              { key: 'precioSugerido', label: 'PRECIO SUGERIDO', width: 35, align: 'center' },
            ],
            rows: recipes.map((recipe) => ({
              codigo: recipe.codigo,
              nombre: recipe.nombre,
              categoria: recipe.categoria,
              costoTotal: `Q${Number(recipe.costoTotal || 0).toFixed(2)}`,
              precioSugerido: `Q${Number(recipe.precioSugerido || 0).toFixed(2)}`,
            })),
            totalLabel: 'RECETAS TOTALES',
            totalValue: recipes.length,
            note: 'El reporte muestra las recetas registradas y sus valores de costeo actuales.',
          })
        } else {
          await generateGenericReportPdf({
            fileName: `${fileBase}.pdf`,
            title: report.name,
            subtitle: report.description,
            logoUrl: logoAmati,
            userName: commonMeta.userName,
            periodLabel: reportData.periodLabel,
            columns: [
              { key: 'fecha', label: 'FECHA', width: 44, align: 'left' },
              { key: 'detalle', label: 'DETALLE', width: 90, align: 'left' },
              { key: 'valor', label: 'VALOR', width: 52, align: 'right' },
            ],
            rows: [
              { fecha: 'Total de ventas', detalle: 'Ventas registradas en el período', valor: `Q${reportData.salesTotal.toFixed(2)}` },
              { fecha: 'Promedio', detalle: 'Ticket promedio del período', valor: `Q${reportData.salesAverage.toFixed(2)}` },
              { fecha: 'Método principal', detalle: reportData.primaryMethod, valor: '-' },
            ],
            totalLabel: 'REGISTROS',
            totalValue: reportData.salesCount,
            note: 'Este resumen consolida la información principal del reporte seleccionado.',
          })
        }
      } else {
        await generateReportExcel({
          reportName: report.name,
          reportData,
          products,
          recipes,
          movements,
          sales,
          dateFrom,
          dateTo,
        })
      }

      setSuccessModalData({
        title: 'Reporte generado',
        subtitle: 'Operación completada',
      })
      setSuccessMessage(`El reporte "${report.name}" (${format}) ha sido generado y descargado exitosamente.`)
    } catch (error) {
      toast.error(error.message || 'No fue posible generar el archivo')
    } finally {
      setExportingKey('')
    }
  }

  return (
    <div className="dashboard-shell space-y-6">
      <ModuleHeader title="Reportes" description="Consulta y genera reportes operativos de ventas, inventario, producción y demanda" eyebrow="Análisis e información" icon={FileText} />
      <div className="dashboard-kpis grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 md:gap-5">
        {[
          { label: 'Reportes disponibles', value: String(reports.length), change: '+3', detail: 'reportes activos', icon: FileText, tone: 'blue' },
          { label: 'Ventas del periodo', value: String(reportData.salesCount), change: '+12%', detail: 'transacciones', icon: Download, tone: 'green' },
          { label: 'Recetas registradas', value: String(reportData.cards[2].value), change: '+4%', detail: 'catalogo', icon: Calendar, tone: 'purple' },
          { label: 'Stock bajo', value: String(reportData.lowStockProducts), change: 'Revisión', detail: 'requiere atención', icon: TrendingUp, tone: 'orange', negative: true },
        ].map((metric) => {
          const MetricIcon = metric.icon

          return (
            <div key={metric.label} className={`dashboard-kpi dashboard-tone-${metric.tone}`}>
              <div className="dashboard-kpi-icon"><MetricIcon size={25} strokeWidth={2.2} /></div>
              <div className="min-w-0">
                <p className="dashboard-kpi-label">{metric.label}</p>
                <p className="dashboard-kpi-value">{metric.value}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`dashboard-kpi-change ${metric.negative ? 'is-negative' : ''}`}>{metric.negative ? '↓' : '↑'} {metric.change}</span>
                  <span className="dashboard-kpi-detail">{metric.detail}</span>
                </div>
              </div>
              <div className={`dashboard-sparkline ${metric.tone === 'blue' ? 'dashboard-chart-blue' : metric.tone === 'green' ? 'dashboard-chart-green' : metric.tone === 'purple' ? 'dashboard-chart-purple' : 'dashboard-chart-orange'}`} aria-hidden="true" />
              <button type="button" className="dashboard-round-action" aria-label={`Ver ${metric.label}`}>
                <FileText size={18} />
              </button>
            </div>
          )
        })}
      </div>

      {reportData.lowStockProducts > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-xs">
          <div className="flex items-start sm:items-center gap-3">
            <div className="p-2 bg-amber-100 text-amber-700 rounded-lg shrink-0">
              <AlertTriangle size={20} />
            </div>
            <div>
              <p className="font-bold text-sm text-amber-900">
                Alerta de Existencias: {reportData.lowStockProducts} {reportData.lowStockProducts === 1 ? 'producto requiere' : 'productos requieren'} reposición
              </p>
              <p className="text-xs text-amber-700 mt-0.5">
                Existen artículos que han alcanzado o descendido de su nivel mínimo configurado en bodega.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setSelectedCategory('Inventario')
              setCurrentPage(1)
            }}
            className="inline-flex items-center justify-center px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors shrink-0"
          >
            Ver Reporte de Inventario
          </button>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-4 md:p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Filtros de Reporte</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Categoría</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              >
                <option value="all">Todas las categorías</option>
                <option value="Ventas">Ventas</option>
                <option value="Inventario">Inventario</option>
                <option value="Producción">Producción</option>
                <option value="Finanzas">Finanzas</option>
                <option value="IA Predictiva">IA Predictiva</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Fecha Desde</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Fecha Hasta</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              />
            </div>
            <div className="flex items-end">
              <button
                type="button"
                onClick={() => {
                  setCurrentPage(1)
                  setSuccessModalData({
                    title: 'Filtros aplicados',
                    subtitle: 'Consulta actualizada',
                  })
                  setSuccessMessage('Los filtros se han aplicado correctamente al catálogo de reportes.')
                }}
                className="w-full px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2 font-medium"
              >
                <Filter size={18} />
                Aplicar Filtros
              </button>
            </div>
          </div>
        </div>

        <div className="p-4 md:p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Reportes Disponibles</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedReports.map((report) => {
              const Icon = report.icon
              const isPdfExporting = exportingKey === `${report.id}-PDF`
              const isExcelExporting = exportingKey === `${report.id}-Excel`

              return (
                <div
                  key={report.id}
                  className="border border-gray-200 rounded-xl p-4 md:p-6 hover:border-cyan-300 hover:shadow-lg transition-all"
                >
                  <div className="flex items-start gap-4 mb-4">
                    <div className={`w-14 h-14 bg-gradient-to-br ${report.color} rounded-xl flex items-center justify-center flex-shrink-0`}>
                      <Icon className="text-white" size={28} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-gray-900 mb-1">{report.name}</h4>
                      <span className="inline-block px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs font-medium">
                        {report.category}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mb-4">{report.description}</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleExport(report, 'PDF')}
                      disabled={isPdfExporting || Boolean(exportingKey)}
                      className="flex-1 px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Download size={16} />
                      {isPdfExporting ? 'Generando...' : 'PDF'}
                    </button>
                    <button
                      onClick={() => handleExport(report, 'Excel')}
                      disabled={isExcelExporting || Boolean(exportingKey)}
                      className="flex-1 px-3 py-2 bg-green-50 hover:bg-green-100 text-green-600 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Download size={16} />
                      {isExcelExporting ? 'Generando...' : 'Excel'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
          <Pagination
            page={currentPage}
            totalPages={totalPages}
            onChange={setCurrentPage}
            pageSize={pageSize}
            onPageSizeChange={setPageSize}
            totalItems={filteredReports.length}
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-4 md:p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Vista Previa - Reporte de Ventas</h3>
          <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
            <span className="font-semibold">Período consultado:</span> {reportData.periodLabel}
          </div>
          {loading ? (
            <div className="py-8 text-center text-sm text-gray-500">Cargando datos reales del sistema...</div>
          ) : (
            <div className="overflow-x-auto touch-scroll">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Fecha</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Transacciones</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Total Ventas</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Ticket Promedio</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Método Principal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {reportData.previewRows.length > 0 ? reportData.previewRows.map((row) => (
                    <tr key={row.fecha} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-900">{row.fecha}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{row.transacciones}</td>
                      <td className="px-6 py-4 text-sm font-semibold text-green-600">{row.totalVentas}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{row.ticketPromedio}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{row.metodoPrincipal}</td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan="5" className="px-6 py-8 text-center text-sm text-gray-500">No hay ventas registradas para este rango.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <SuccessModal
        isOpen={Boolean(successMessage)}
        title={successModalData.title}
        subtitle={successModalData.subtitle}
        message={successMessage}
        onClose={() => setSuccessMessage('')}
      />
    </div>
  )
}

export default Reportes
