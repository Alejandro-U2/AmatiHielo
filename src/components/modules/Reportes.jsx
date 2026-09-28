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
} from 'lucide-react'
import { toast } from 'sonner'
import logoAmati from '../../assets/logo-amati.jpg'
import { getCurrentUser } from '../../services/authService'
import { listVentasPos } from '../../services/posService'
import { listProductosInventario, listMovimientosInventario } from '../../services/inventarioService'
import { getRecetas } from '../../services/recetasService'
import { buildReportData } from '../../utils/reportesUtils'
import { generateGenericReportPdf, generateReportExcel, generateSalesReportPdf } from '../../utils/reportesExport'

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
    name: 'Predicciones IA - Semanal',
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
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [sales, setSales] = useState([])
  const [products, setProducts] = useState([])
  const [movements, setMovements] = useState([])
  const [recipes, setRecipes] = useState([])
  const [loading, setLoading] = useState(true)
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
        setMovements(movimientosData)
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

  const handleExport = async (report, format) => {
    try {
      const fileBase = report.name.replace(/\s+/g, '_').toLowerCase()
      const commonMeta = {
        reportName: report.name,
        logoUrl: logoAmati,
        userName: currentUser?.nombre || currentUser?.username || currentUser?.email || 'Administrador',
        dateFrom,
        dateTo,
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

      toast.success(`Exportación completada: ${report.name}`)
    } catch (error) {
      toast.error(error.message || 'No fue posible generar el archivo')
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl p-4 md:p-6 shadow-sm border border-gray-200">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-lg flex items-center justify-center">
              <FileText className="text-white" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-600">Reportes Disponibles</p>
              <p className="text-2xl font-bold text-gray-900">{reports.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 md:p-6 shadow-sm border border-gray-200">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
              <Download className="text-white" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-600">Ventas del periodo</p>
              <p className="text-2xl font-bold text-gray-900">{reportData.salesCount}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 md:p-6 shadow-sm border border-gray-200">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Calendar className="text-white" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-600">Recetas registradas</p>
              <p className="text-2xl font-bold text-gray-900">{reportData.cards[2].value}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 md:p-6 shadow-sm border border-gray-200">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg flex items-center justify-center">
              <TrendingUp className="text-white" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-600">Productos con stock bajo</p>
              <p className="text-2xl font-bold text-gray-900">{reportData.lowStockProducts}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-4 md:p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Filtros de Reporte</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
              <button className="w-full px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2">
                <Filter size={18} />
                Aplicar Filtros
              </button>
            </div>
          </div>
        </div>

        <div className="p-4 md:p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Reportes Disponibles</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredReports.map((report) => {
              const Icon = report.icon
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
                      className="flex-1 px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm font-medium"
                    >
                      <Download size={16} />
                      PDF
                    </button>
                    <button
                      onClick={() => handleExport(report, 'Excel')}
                      className="flex-1 px-3 py-2 bg-green-50 hover:bg-green-100 text-green-600 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm font-medium"
                    >
                      <Download size={16} />
                      Excel
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
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
          <div className="overflow-x-auto">
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
    </div>
  )
}

export default Reportes
