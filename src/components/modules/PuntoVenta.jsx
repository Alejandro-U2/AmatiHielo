import { useEffect, useMemo, useState } from 'react'
import {
  FileDown,
  ReceiptText,
  TrendingUp,
  Wallet,
  WalletCards,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { getRecetas } from '../../services/recetasService'
import {
  createClientePos,
  createVentaPos,
  listClientesPos,
  listMetodosPago,
  listVentasPos,
  updateClientePos,
} from '../../services/posService'
import { getParametrosSistema } from '../../services/configuracionSistemaService'
import { confirmarArqueoCaja, getArqueoCaja } from '../../services/cajaService'
import { isValidNombreCliente, isValidTelefono, isValidNIT, sanitizeNombreCliente, sanitizeTelefono, sanitizeNIT, capitalizeWords } from '../../utils/validation'
import Pagination from '../../components/Pagination'
import SortableHeader from '../../components/SortableHeader'
import ReporteModal from '../../components/ReporteModal'
import { generarReporteModulo } from '../../utils/moduloExport'
import { useTableSort, sortRows } from '../../hooks/useTableSort'

function getLatestSundayBoundary(referenceDate = new Date()) {
  const boundary = new Date(referenceDate)
  boundary.setHours(18, 0, 0, 0)
  const daysSinceSunday = boundary.getDay()
  boundary.setDate(boundary.getDate() - daysSinceSunday)
  if (referenceDate < boundary) boundary.setDate(boundary.getDate() - 7)
  return boundary
}

function getArqueoPeriod(referenceDate = new Date()) {
  const periodoFin = getLatestSundayBoundary(referenceDate)
  const periodoInicio = new Date(periodoFin)
  periodoInicio.setDate(periodoInicio.getDate() - 7)
  return { periodoInicio, periodoFin }
}

function PuntoVenta() {
  const [activeTab, setActiveTab] = useState('venta')
  const [carrito, setCarrito] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [modalType, setModalType] = useState('')
  const [selectedCategoria, setSelectedCategoria] = useState('todos')
  const [productos, setProductos] = useState([])
  const [ventas, setVentas] = useState([])
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(5)
  const [filterMetodoHistorial, setFilterMetodoHistorial] = useState('todos')
  const [histFechaDesde, setHistFechaDesde] = useState('')
  const [histFechaHasta, setHistFechaHasta] = useState('')
  const historialSort = useTableSort('fecha', 'desc')

  const ventasFiltradas = useMemo(() => {
    return ventas.filter((venta) => {
      const matchMetodo = filterMetodoHistorial === 'todos' || venta.metodoPago === filterMetodoHistorial

      if (!matchMetodo) {
        return false
      }

      const fechaVenta = venta.createdAt ? new Date(venta.createdAt) : new Date(0)
      const fechaValida = !Number.isNaN(fechaVenta.getTime())

      if (histFechaDesde && fechaValida) {
        const desde = new Date(`${histFechaDesde}T00:00:00`)
        if (fechaVenta < desde) return false
      }
      if (histFechaHasta && fechaValida) {
        const hasta = new Date(`${histFechaHasta}T23:59:59`)
        if (fechaVenta > hasta) return false
      }

      return true
    })
  }, [ventas, filterMetodoHistorial, histFechaDesde, histFechaHasta])

  const sortedVentas = sortRows(ventasFiltradas, historialSort.sortBy, historialSort.sortDir, (venta) => {
    switch (historialSort.sortBy) {
      case 'fecha': return venta.createdAt ? new Date(venta.createdAt).getTime() : 0
      case 'ticket': return venta.ticket
      case 'cliente': return venta.cliente
      case 'total': return venta.total
      case 'metodo': return venta.metodoPago
      case 'factura': return venta.necesitaFactura
      case 'usuario': return venta.usuario
      default: return null
    }
  })

  const totalPages = Math.max(1, Math.ceil(sortedVentas.length / pageSize))
  const paginatedVentas = sortedVentas.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  useEffect(() => {
    setCurrentPage(1)
  }, [filterMetodoHistorial, histFechaDesde, histFechaHasta, historialSort.sortBy, historialSort.sortDir, pageSize])
  const [reporteOpen, setReporteOpen] = useState(false)
  const [generandoReporte, setGenerandoReporte] = useState(false)

  const metodosPagoReporte = useMemo(() => {
    const counts = {}
    ventas.forEach((venta) => {
      const metodo = venta.metodoPago || 'Sin método'
      counts[metodo] = (counts[metodo] || 0) + 1
    })

    const options = Object.keys(counts).map((metodo) => ({
      value: metodo,
      label: metodo,
      count: counts[metodo],
    }))

    return [{ value: '', label: 'Todos', count: ventas.length }, ...options]
  }, [ventas])

  const handleGenerarReporteVentas = async (metodoPago = '') => {
    try {
      setGenerandoReporte(true)
      const rows = metodoPago
        ? ventas.filter((venta) => (venta.metodoPago || '') === metodoPago)
        : ventas

      const columns = [
        { key: 'fecha', label: 'FECHA/HORA', width: 34, align: 'left' },
        { key: 'ticket', label: 'TICKET', width: 26, align: 'left' },
        { key: 'cliente', label: 'CLIENTE', width: 34, align: 'left' },
        { key: 'total', label: 'TOTAL', width: 26, align: 'center' },
        { key: 'metodoPago', label: 'MÉTODO PAGO', width: 28, align: 'center' },
        { key: 'factura', label: 'FACTURA', width: 18, align: 'center' },
        { key: 'vendedor', label: 'VENDEDOR', width: 20, align: 'left' },
      ]

      const totalVendido = rows.reduce((sum, venta) => sum + Number(venta.total || 0), 0)

      await generarReporteModulo({
        fileName: 'reporte_ventas_pos.pdf',
        title: 'REPORTE DE VENTAS DEL PUNTO DE VENTA',
        columns,
        rows: rows.map((venta) => ({
          fecha: venta.fecha,
          ticket: venta.ticket,
          cliente: venta.cliente || 'Consumidor final',
          total: `Q${Number(venta.total || 0).toFixed(2)}`,
          metodoPago: venta.metodoPago || '-',
          factura: venta.necesitaFactura ? 'Sí' : 'No',
          vendedor: venta.usuario || '-',
        })),
        totalLabel: 'TOTAL VENDIDO',
        totalValue: `Q${totalVendido.toFixed(2)}`,
        filterLabel: metodoPago || 'Todos',
        note: `${rows.length} transacciones registradas en el punto de venta para el período consultado.`,
      })
      toast.success('Reporte de ventas generado correctamente.')
      setReporteOpen(false)
    } catch (error) {
      toast.error(error.message || 'No fue posible generar el reporte.')
    } finally {
      setGenerandoReporte(false)
    }
  }
  const [selectedVenta, setSelectedVenta] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [arqueoResumen, setArqueoResumen] = useState(null)
  const [arqueoConfirmado, setArqueoConfirmado] = useState(false)
  const [arqueoPeriodo, setArqueoPeriodo] = useState(() => getArqueoPeriod())
  const [isConfirmingArqueo, setIsConfirmingArqueo] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [metodoPago, setMetodoPago] = useState('Efectivo')
  const [metodosPago, setMetodosPago] = useState(['Efectivo', 'Transferencia'])
  const [necesitaFactura, setNecesitaFactura] = useState(false)
  const [ivaActivo, setIvaActivo] = useState(true)
  const [ivaPorcentaje, setIvaPorcentaje] = useState(12)
  const [datosFactura, setDatosFactura] = useState({
    nit: '',
    nombreCliente: '',
    numeroTelefono: '',
  })
  const [clientes, setClientes] = useState([])
  const [clienteSeleccionadoId, setClienteSeleccionadoId] = useState('')
  const [clienteEnEdicion, setClienteEnEdicion] = useState(null)
  const [clienteForm, setClienteForm] = useState({
    nombre: '',
    nit: '',
    telefono: '',
    correo: '',
    direccion: '',
  })
  const [isSavingCliente, setIsSavingCliente] = useState(false)

  const loadData = async () => {
    try {
      setIsLoading(true)
      setErrorMsg('')
      const [recetasData, ventasData, parametrosData, metodosPagoData, clientesData] = await Promise.all([
        getRecetas(),
        listVentasPos(),
        getParametrosSistema().catch(() => null),
        listMetodosPago().catch(() => []),
        listClientesPos().catch(() => []),
      ])

      if (parametrosData?.impuestos) {
        setIvaActivo(Boolean(parametrosData.impuestos.ivaActivo))
        setIvaPorcentaje(Number(parametrosData.impuestos.ivaPorcentaje || 12))
      }
      if (metodosPagoData.length > 0) {
        setMetodosPago(metodosPagoData.map((metodo) => metodo.nombre))
      }
      setProductos(recetasData.map((receta) => ({
        id: receta.id,
        codigo: receta.codigo,
        nombre: receta.nombre,
        categoria: receta.categoria || 'General',
        presentacion: receta.presentacion,
        precio: Number(receta.precioSugerido || receta.costoTotal || 0),
        ingredientes: receta.ingredientes || [],
      })))
      setVentas(ventasData)
      setClientes(clientesData)
    } catch (error) {
      setErrorMsg(error.message || 'No fue posible cargar el POS.')
      setProductos([])
      setVentas([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const cargarArqueo = async () => {
    const periodo = getArqueoPeriod()
    try {
      const resultado = await getArqueoCaja(periodo.periodoInicio, periodo.periodoFin)
      setArqueoPeriodo(periodo)
      setArqueoResumen(resultado.data)
      setArqueoConfirmado(resultado.confirmado)
    } catch (error) {
      setErrorMsg(error.message || 'No fue posible cargar el arqueo de caja.')
    }
  }

  useEffect(() => {
    cargarArqueo()
  }, [])

  const categorias = useMemo(
    () => ['todos', ...new Set(productos.map((producto) => producto.categoria).filter(Boolean))],
    [productos],
  )

  const ventasDelDia = useMemo(() => {
    const hoy = new Date()
    return ventas.filter((venta) => {
      if (!venta.createdAt) return false
      const fechaVenta = new Date(venta.createdAt)
      return !Number.isNaN(fechaVenta.getTime())
        && fechaVenta.getFullYear() === hoy.getFullYear()
        && fechaVenta.getMonth() === hoy.getMonth()
        && fechaVenta.getDate() === hoy.getDate()
    })
  }, [ventas])

  const arqueoCaja = useMemo(() => {
    const totalVentas = arqueoResumen?.totalVentas ?? ventasDelDia.reduce((sum, venta) => sum + venta.total, 0)
    const porMetodo = metodosPago.map((nombre) => ({
      nombre,
      total: arqueoResumen
        ? nombre === 'Efectivo'
          ? arqueoResumen.totalEfectivo
          : nombre === 'Transferencia'
            ? arqueoResumen.totalTransferencia
            : 0
        : ventasDelDia
        .filter((venta) => venta.metodoPago === nombre)
        .reduce((sum, venta) => sum + venta.total, 0),
    }))
    const ventasEfectivo = porMetodo.find((metodo) => metodo.nombre === 'Efectivo')?.total || 0

    return {
      fecha: new Date().toLocaleDateString('es-GT'),
      turno: 'Actual',
      vendedor: 'Usuario actual',
      porMetodo,
      totalVentas,
      efectivoInicial: 0,
      efectivoEsperado: ventasEfectivo,
      efectivoReal: ventasEfectivo,
      diferencia: 0,
      transacciones: arqueoResumen?.transacciones ?? ventasDelDia.length,
    }
  }, [arqueoResumen, ventasDelDia, metodosPago])

  const confirmarArqueo = async () => {
    try {
      setIsConfirmingArqueo(true)
      const confirmado = await confirmarArqueoCaja(arqueoPeriodo.periodoInicio, arqueoPeriodo.periodoFin)
      setArqueoResumen(confirmado)
      setArqueoConfirmado(true)
      toast.success('Arqueo semanal confirmado correctamente.')
    } catch (error) {
      setErrorMsg(error.message || 'No fue posible confirmar el arqueo.')
    } finally {
      setIsConfirmingArqueo(false)
    }
  }

  const agregarAlCarrito = (producto) => {
    const itemExistente = carrito.find(item => item.id === producto.id)
    if (itemExistente) {
      setCarrito(carrito.map(item =>
        item.id === producto.id
          ? { ...item, cantidad: item.cantidad + 1 }
          : item
      ))
    } else {
      setCarrito([...carrito, { ...producto, cantidad: 1 }])
    }
  }

  const eliminarDelCarrito = (id) => {
    setCarrito(carrito.filter(item => item.id !== id))
  }

  const cambiarCantidad = (id, nuevaCantidad) => {
    if (nuevaCantidad <= 0) {
      eliminarDelCarrito(id)
    } else {
      setCarrito(carrito.map(item =>
        item.id === id ? { ...item, cantidad: nuevaCantidad } : item
      ))
    }
  }

  const calcularSubtotal = () => {
    return carrito.reduce((sum, item) => sum + (item.precio * item.cantidad), 0)
  }

  const calcularIVA = () => {
    return ivaActivo ? calcularSubtotal() * (ivaPorcentaje / 100) : 0
  }

  const calcularTotal = () => {
    return calcularSubtotal() + calcularIVA()
  }

  const ivaLabel = ivaActivo ? `IVA (${ivaPorcentaje.toFixed(2)}%)` : 'IVA desactivado'

  const vaciarCarrito = () => {
    setCarrito([])
  }

  const openModal = (type) => {
    setErrorMsg('')
    setSuccessMsg('')
    setModalType(type)
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setModalType('')
    setErrorMsg('')
    setSuccessMsg('')
    setNecesitaFactura(false)
    setDatosFactura({
      nit: '',
      nombreCliente: '',
      numeroTelefono: '',
    })
    setClienteSeleccionadoId('')
  }

  const resetClienteForm = () => {
    setClienteEnEdicion(null)
    setClienteForm({
      nombre: '',
      nit: '',
      telefono: '',
      correo: '',
      direccion: '',
    })
  }

  const editarCliente = (cliente) => {
    setClienteEnEdicion(cliente)
    setClienteForm({
      nombre: cliente.nombre || '',
      nit: cliente.nit || '',
      telefono: cliente.telefono || '',
      correo: cliente.correo || '',
      direccion: cliente.direccion || '',
    })
    setErrorMsg('')
  }

  const guardarCliente = async (event) => {
    event.preventDefault()
    const nombre = capitalizeWords(clienteForm.nombre)
    const nit = clienteForm.nit.trim()
    const telefono = clienteForm.telefono.trim()

    if (!isValidNombreCliente(nombre)) {
      setErrorMsg('El nombre del cliente solo debe contener letras y espacios.')
      return
    }
    if (nit && (!/^[A-Za-z0-9-]{1,13}$/.test(nit))) {
      setErrorMsg('El NIT debe tener máximo 13 caracteres alfanuméricos.')
      return
    }
    if (telefono && (!/^\d{1,8}$/.test(telefono))) {
      setErrorMsg('El teléfono debe tener máximo 8 números.')
      return
    }

    try {
      setIsSavingCliente(true)
      setErrorMsg('')
      const payload = {
        ...clienteForm,
        nombre,
        nit: nit || null,
        telefono: telefono || null,
      }
      const clienteGuardado = clienteEnEdicion
        ? await updateClientePos(clienteEnEdicion.id, payload)
        : await createClientePos(payload)
      const mensajeExito = clienteEnEdicion
        ? 'Cliente actualizado correctamente.'
        : 'Cliente creado correctamente.'

      setClientes((previous) => {
        if (!clienteEnEdicion) return [...previous, clienteGuardado].sort((a, b) => a.nombre.localeCompare(b.nombre))
        return previous
          .map((cliente) => cliente.id === clienteGuardado.id ? clienteGuardado : cliente)
          .sort((a, b) => a.nombre.localeCompare(b.nombre))
      })
      resetClienteForm()
      toast.success(mensajeExito)
    } catch (error) {
      setErrorMsg(error.message || 'No fue posible guardar el cliente.')
    } finally {
      setIsSavingCliente(false)
    }
  }

  const productosFiltrados = productos.filter(p => {
    const normalizedSearch = searchTerm.trim().toLowerCase()
    const matchSearch = !normalizedSearch
      || p.nombre.toLowerCase().includes(normalizedSearch)
      || p.codigo.toLowerCase().includes(normalizedSearch)
    const matchCategoria = selectedCategoria === 'todos' || p.categoria === selectedCategoria
    return matchSearch && matchCategoria
  })

  const hasBomCompleto = (producto) => {
    return producto.ingredientes.length > 0 && producto.ingredientes.every((ing) => ing.productoId)
  }

  const confirmarVenta = async () => {
    try {
      setIsProcessing(true)
      setErrorMsg('')

      if (necesitaFactura && (!datosFactura.nit || !datosFactura.nombreCliente || !datosFactura.numeroTelefono)) {
        setErrorMsg('Para emitir factura, debe proporcionar NIT, nombre y número de teléfono.')
        setIsProcessing(false)
        return
      }

      if (necesitaFactura && !isValidNIT(datosFactura.nit)) {
        setErrorMsg('El NIT solo debe contener números y guiones.')
        setIsProcessing(false)
        return
      }

      if (necesitaFactura && !isValidNombreCliente(datosFactura.nombreCliente)) {
        setErrorMsg('El nombre del cliente solo debe contener letras y espacios.')
        setIsProcessing(false)
        return
      }

      if (necesitaFactura && !isValidTelefono(datosFactura.numeroTelefono)) {
        setErrorMsg('El número de teléfono solo debe contener números.')
        setIsProcessing(false)
        return
      }

      const venta = await createVentaPos({
        metodoPago,
        clienteId: clienteSeleccionadoId ? Number(clienteSeleccionadoId) : null,
        cliente: clientes.find((cliente) => String(cliente.id) === String(clienteSeleccionadoId))?.nombre || datosFactura.nombreCliente || null,
        necesitaFactura,
        nit: datosFactura.nit || null,
        nombreCliente: datosFactura.nombreCliente || null,
        numeroTelefono: datosFactura.numeroTelefono || null,
        items: carrito.map((item) => ({
          recetaId: item.id,
          cantidad: item.cantidad,
          precioUnitario: item.precio,
        })),
      })

      setSuccessMsg(`Venta ${venta.ticket} registrada. Inventario descontado según BOM.`)
      vaciarCarrito()
      await loadData()
      setTimeout(() => {
        closeModal()
      }, 1800)
    } catch (error) {
      setErrorMsg(error.message || 'No fue posible confirmar la venta.')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="dashboard-shell p-4 md:p-6">
      <div className="dashboard-kpis grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-5">
        {[
          { label: 'Ventas hoy', value: `Q${arqueoCaja.totalVentas.toFixed(2)}`, change: '+12%', detail: 'vs. ayer', icon: Wallet, tone: 'green' },
          { label: 'Transacciones', value: String(arqueoCaja.transacciones), change: '+9%', detail: 'en el día', icon: ReceiptText, tone: 'blue' },
          { label: 'Ticket promedio', value: `Q${arqueoCaja.transacciones ? (arqueoCaja.totalVentas / arqueoCaja.transacciones).toFixed(2) : '0.00'}`, change: '+4%', detail: 'promedio', icon: TrendingUp, tone: 'purple' },
          { label: 'Caja actual', value: `Q${arqueoCaja.totalVentas.toFixed(2)}`, change: 'Saldado', detail: 'cerrado al día', icon: WalletCards, tone: 'orange' },
        ].map((metric) => {
          const Icon = metric.icon

          return (
            <div key={metric.label} className={`dashboard-kpi dashboard-tone-${metric.tone}`}>
              <div className="dashboard-kpi-icon"><Icon size={25} strokeWidth={2.2} /></div>
              <div className="min-w-0">
                <p className="dashboard-kpi-label">{metric.label}</p>
                <p className="dashboard-kpi-value">{metric.value}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="dashboard-kpi-change">↑ {metric.change}</span>
                  <span className="dashboard-kpi-detail">{metric.detail}</span>
                </div>
              </div>
              <div className={`dashboard-sparkline ${metric.tone === 'green' ? 'dashboard-chart-green' : metric.tone === 'blue' ? 'dashboard-chart-blue' : metric.tone === 'purple' ? 'dashboard-chart-purple' : 'dashboard-chart-orange'}`} aria-hidden="true" />
              <button type="button" className="dashboard-round-action" aria-label={`Ver ${metric.label}`}>
                <FileDown size={18} />
              </button>
            </div>
          )
        })}
      </div>

      <div className="mb-6 mt-6">
        <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-2">Punto de Venta (POS)</h2>
        <p className="text-gray-600">Venta con consumo directo de materias primas desde el BOM</p>
      </div>

      <div className="mb-6 border-b border-gray-200">
        <nav className="flex space-x-4 overflow-x-auto whitespace-nowrap">
          <button
            onClick={() => setActiveTab('venta')}
            className={`pb-3 px-2 font-medium transition-colors ${
              activeTab === 'venta'
                ? 'border-b-2 border-cyan-500 text-cyan-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Realizar Venta
          </button>
          <button
            onClick={() => setActiveTab('historial')}
            className={`pb-3 px-2 font-medium transition-colors ${
              activeTab === 'historial'
                ? 'border-b-2 border-cyan-500 text-cyan-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Historial de Ventas
          </button>
          <button
            onClick={() => setActiveTab('caja')}
            className={`pb-3 px-2 font-medium transition-colors ${
              activeTab === 'caja'
                ? 'border-b-2 border-cyan-500 text-cyan-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Arqueo de Caja
          </button>
          <button
            onClick={() => setActiveTab('clientes')}
            className={`pb-3 px-2 font-medium transition-colors ${
              activeTab === 'clientes'
                ? 'border-b-2 border-cyan-500 text-cyan-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Clientes Frecuentes
          </button>
        </nav>
      </div>

      {errorMsg && !showModal && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMsg}
        </div>
      )}

      {activeTab === 'venta' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="mb-4 flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                placeholder="Buscar producto por nombre o código..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full sm:flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              />
              <select
                value={selectedCategoria}
                onChange={(e) => setSelectedCategoria(e.target.value)}
                className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
              >
                {categorias.map((categoria) => (
                  <option key={categoria} value={categoria}>
                    {categoria === 'todos' ? 'Todas las categorías' : categoria}
                  </option>
                ))}
              </select>
              <button
                onClick={loadData}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 whitespace-nowrap"
              >
                Recargar
              </button>
            </div>

            <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800">Productos de Venta</h3>
                {isLoading && <span className="text-sm text-gray-500">Cargando...</span>}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {productosFiltrados.map((producto) => {
                  const bomCompleto = hasBomCompleto(producto)
                  return (
                    <button
                      key={producto.id}
                      type="button"
                      onClick={() => agregarAlCarrito(producto)}
                      disabled={!bomCompleto}
                      className="text-left bg-gradient-to-br from-cyan-50 to-blue-50 border-2 border-cyan-200 rounded-xl p-4 hover:shadow-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <h4 className="font-semibold text-gray-800 text-sm mb-1">{producto.nombre}</h4>
                      <p className="text-xs text-gray-500 mb-2">{producto.codigo}</p>
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-lg font-bold text-cyan-700">Q{producto.precio.toFixed(2)}</span>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          bomCompleto ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {bomCompleto ? `${producto.ingredientes.length} insumos` : 'BOM incompleto'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600">{producto.presentacion || 'Sin presentación'}</p>
                    </button>
                  )
                })}
                {productosFiltrados.length === 0 && (
                  <div className="col-span-full py-10 text-center text-sm text-gray-500">
                    No hay productos de venta disponibles.
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-4 md:p-6 sticky top-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-800">Carrito</h3>
                {carrito.length > 0 && (
                  <button
                    onClick={vaciarCarrito}
                    className="text-sm text-red-600 hover:text-red-800"
                  >
                    Vaciar
                  </button>
                )}
              </div>

              {carrito.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <p>Carrito vacío</p>
                  <p className="text-sm mt-2">Selecciona productos para vender</p>
                </div>
              ) : (
                <>
                  <div className="space-y-3 mb-6 max-h-64 overflow-y-auto">
                    {carrito.map((item) => (
                      <div key={item.id} className="bg-gray-50 rounded-lg p-3">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-800 text-sm">{item.nombre}</h4>
                            <p className="text-xs text-gray-500">Q{item.precio.toFixed(2)} c/u</p>
                          </div>
                          <button
                            onClick={() => eliminarDelCarrito(item.id)}
                            className="text-red-500 hover:text-red-700 ml-2"
                          >
                            X
                          </button>
                        </div>
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => cambiarCantidad(item.id, item.cantidad - 1)}
                              className="w-7 h-7 bg-gray-200 rounded hover:bg-gray-300 font-bold"
                            >
                              -
                            </button>
                            <span className="w-8 text-center font-semibold">{item.cantidad}</span>
                            <button
                              onClick={() => cambiarCantidad(item.id, item.cantidad + 1)}
                              className="w-7 h-7 bg-cyan-500 text-white rounded hover:bg-cyan-600 font-bold"
                            >
                              +
                            </button>
                          </div>
                          <span className="font-bold text-gray-800">
                            Q{(item.precio * item.cantidad).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="border-t pt-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Subtotal:</span>
                      <span className="font-semibold">Q{calcularSubtotal().toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">{ivaLabel}:</span>
                      <span className="font-semibold">Q{calcularIVA().toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold pt-2 border-t">
                      <span>Total:</span>
                      <span className="text-cyan-700">Q{calcularTotal().toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="mt-6 space-y-2">
                    <button
                      onClick={() => openModal('pago')}
                      className="w-full py-3 bg-gradient-to-r from-green-500 to-green-600 text-white font-bold rounded-lg hover:shadow-lg transition-shadow"
                    >
                      Procesar Pago
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'historial' && (
        <div>
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 mb-4">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setReporteOpen(true)}
                className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg hover:from-indigo-600 hover:to-purple-700 transition-colors flex items-center gap-2 text-sm font-medium"
              >
                <FileDown size={16} aria-hidden="true" />
                Reporte
              </button>
              <button
                onClick={loadData}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 self-start"
              >
                Recargar
              </button>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Total registrado</p>
              <p className="text-xl md:text-2xl font-bold text-green-600">
                Q{ventas.reduce((sum, v) => sum + v.total, 0).toFixed(2)}
              </p>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-4 md:p-6 mb-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Método de pago</label>
                <select
                  value={filterMetodoHistorial}
                  onChange={(e) => setFilterMetodoHistorial(e.target.value)}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent"
                >
                  <option value="todos">Todos los métodos</option>
                  {metodosPago.map((metodo) => (
                    <option key={metodo} value={metodo}>{metodo}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Desde</label>
                <input
                  type="date"
                  value={histFechaDesde}
                  onChange={(e) => setHistFechaDesde(e.target.value)}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Hasta</label>
                <input
                  type="date"
                  value={histFechaHasta}
                  onChange={(e) => setHistFechaHasta(e.target.value)}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent"
                />
              </div>
              <div className="flex items-end justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setFilterMetodoHistorial('todos')
                    setHistFechaDesde('')
                    setHistFechaHasta('')
                    historialSort.setSortBy('fecha')
                    historialSort.setSortDir('desc')
                  }}
                  className="text-sm text-cyan-600 hover:text-cyan-800 font-medium inline-flex items-center gap-1"
                >
                  <X size={14} aria-hidden="true" />
                  Limpiar filtros
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gradient-to-r from-cyan-50 to-blue-50">
                <tr>
                  <th className="px-4 md:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase"><SortableHeader label="Fecha/Hora" sortKey="fecha" sortBy={historialSort.sortBy} sortDir={historialSort.sortDir} onSort={historialSort.toggle} className="text-gray-700" /></th>
                  <th className="px-4 md:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase"><SortableHeader label="Ticket" sortKey="ticket" sortBy={historialSort.sortBy} sortDir={historialSort.sortDir} onSort={historialSort.toggle} className="text-gray-700" /></th>
                  <th className="px-4 md:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase hidden lg:table-cell"><SortableHeader label="Cliente" sortKey="cliente" sortBy={historialSort.sortBy} sortDir={historialSort.sortDir} onSort={historialSort.toggle} className="text-gray-700" /></th>
                  <th className="px-4 md:px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase"><SortableHeader label="Total" sortKey="total" sortBy={historialSort.sortBy} sortDir={historialSort.sortDir} onSort={historialSort.toggle} align="right" className="text-gray-700" /></th>
                  <th className="px-4 md:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase"><SortableHeader label="Método Pago" sortKey="metodo" sortBy={historialSort.sortBy} sortDir={historialSort.sortDir} onSort={historialSort.toggle} className="text-gray-700" /></th>
                  <th className="px-4 md:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase hidden sm:table-cell"><SortableHeader label="Factura" sortKey="factura" sortBy={historialSort.sortBy} sortDir={historialSort.sortDir} onSort={historialSort.toggle} className="text-gray-700" /></th>
                  <th className="px-4 md:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase hidden md:table-cell"><SortableHeader label="Vendedor" sortKey="usuario" sortBy={historialSort.sortBy} sortDir={historialSort.sortDir} onSort={historialSort.toggle} className="text-gray-700" /></th>
                  <th className="px-4 md:px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {paginatedVentas.map((venta) => (
                  <tr key={venta.id} className="hover:bg-gray-50">
                    <td className="px-4 md:px-6 py-4 text-sm text-gray-600">{venta.fecha}</td>
                    <td className="px-4 md:px-6 py-4">
                      <span className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">{venta.ticket}</span>
                    </td>
                    <td className="px-4 md:px-6 py-4 text-sm text-gray-800 hidden lg:table-cell">{venta.cliente}</td>
                    <td className="px-4 md:px-6 py-4 text-right text-sm font-bold text-green-600">Q{venta.total.toFixed(2)}</td>
                    <td className="px-4 md:px-6 py-4 text-sm text-gray-600">{venta.metodoPago}</td>
                    <td className="px-4 md:px-6 py-4 hidden sm:table-cell">
                      <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
                        venta.necesitaFactura ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {venta.necesitaFactura ? 'Solicitada' : 'No'}
                      </span>
                    </td>
                    <td className="px-4 md:px-6 py-4 text-sm text-gray-600 hidden md:table-cell">{venta.usuario}</td>
                    <td className="px-4 md:px-6 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedVenta(venta)}
                        className="px-3 py-2 bg-cyan-600 text-white text-sm font-semibold rounded-lg hover:bg-cyan-700 transition-colors whitespace-nowrap"
                      >
                        Ver ticket
                      </button>
                    </td>
                  </tr>
                ))}
                {ventas.length === 0 && (
                  <tr>
                    <td colSpan="8" className="px-4 md:px-6 py-10 text-center text-sm text-gray-500">
                      No hay ventas registradas.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <Pagination
            page={currentPage}
            totalPages={totalPages}
            onChange={setCurrentPage}
            pageSize={pageSize}
            onPageSizeChange={setPageSize}
            totalItems={sortedVentas.length}
          />
        </div>
      )}

      {activeTab === 'caja' && (
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-md p-4 md:p-8">
            <div className="flex justify-between items-center mb-6 pb-4 border-b">
              <div>
                <h3 className="text-xl font-bold text-gray-800">Arqueo de Caja</h3>
                <p className="text-sm text-gray-600">
                  Período semanal: domingo 6:00 PM a domingo 6:00 PM
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {arqueoPeriodo.periodoInicio.toLocaleString('es-GT')} — {arqueoPeriodo.periodoFin.toLocaleString('es-GT')}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  arqueoConfirmado ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                }`}>
                  {arqueoConfirmado ? 'Confirmado' : 'Pendiente'}
                </span>
                <button
                  type="button"
                  onClick={confirmarArqueo}
                  disabled={arqueoConfirmado || isConfirmingArqueo}
                  className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  {isConfirmingArqueo ? 'Confirmando...' : arqueoConfirmado ? 'Arqueo confirmado' : 'Confirmar arqueo'}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-xs text-gray-600 mb-1">Fecha</p>
                <p className="font-semibold text-gray-900">{arqueoCaja.fecha}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-xs text-gray-600 mb-1">Turno</p>
                <p className="font-semibold text-gray-900">{arqueoCaja.turno}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-xs text-gray-600 mb-1">Transacciones</p>
                <p className="font-semibold text-gray-900">{arqueoCaja.transacciones}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              {arqueoCaja.porMetodo.map((metodo) => (
                <div key={metodo.nombre} className="bg-cyan-50 border-2 border-cyan-200 rounded-lg p-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">{metodo.nombre}</p>
                  <p className="text-xl md:text-2xl font-bold text-cyan-700">Q{metodo.total.toFixed(2)}</p>
                </div>
              ))}
            </div>

            <div className="bg-gradient-to-r from-cyan-50 to-blue-50 border-2 border-cyan-300 rounded-lg p-4 md:p-6">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total de Ventas</p>
                  <p className="text-xs text-gray-500">{arqueoCaja.transacciones} transacciones</p>
                </div>
                <p className="text-2xl md:text-4xl font-bold text-cyan-700">Q{arqueoCaja.totalVentas.toFixed(2)}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'clientes' && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <form onSubmit={guardarCliente} className="bg-white rounded-lg shadow-md p-4 md:p-6 h-fit">
            <div className="flex items-center justify-between gap-3 mb-5">
              <div>
                <h3 className="text-lg font-bold text-gray-800">
                  {clienteEnEdicion ? 'Editar cliente' : 'Nuevo cliente'}
                </h3>
                <p className="text-sm text-gray-500">Datos disponibles al cobrar una venta.</p>
              </div>
              {clienteEnEdicion && (
                <button type="button" onClick={resetClienteForm} className="text-sm text-gray-500 hover:text-gray-700">
                  Cancelar
                </button>
              )}
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                <input
                  required
                  value={clienteForm.nombre}
                  onChange={(event) => setClienteForm((previous) => ({
                    ...previous,
                    nombre: sanitizeNombreCliente(event.target.value),
                  }))}
                  onBlur={(event) => setClienteForm((previous) => ({
                    ...previous,
                    nombre: capitalizeWords(event.target.value),
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">NIT</label>
                  <input
                    value={clienteForm.nit}
                    onChange={(event) => setClienteForm((previous) => ({
                      ...previous,
                      nit: sanitizeNIT(event.target.value),
                    }))}
                    maxLength={13}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                  <input
                    inputMode="numeric"
                    value={clienteForm.telefono}
                    onChange={(event) => setClienteForm((previous) => ({
                      ...previous,
                      telefono: sanitizeTelefono(event.target.value),
                    }))}
                    maxLength={8}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Correo</label>
                <input
                  type="email"
                  value={clienteForm.correo}
                  onChange={(event) => setClienteForm((previous) => ({ ...previous, correo: event.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
                <textarea
                  rows={2}
                  value={clienteForm.direccion}
                  onChange={(event) => setClienteForm((previous) => ({ ...previous, direccion: event.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                />
              </div>
              <button
                type="submit"
                disabled={isSavingCliente}
                className="w-full px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 disabled:opacity-60"
              >
                {isSavingCliente ? 'Guardando...' : clienteEnEdicion ? 'Actualizar cliente' : 'Agregar cliente'}
              </button>
            </div>
          </form>

          <div className="xl:col-span-2 bg-white rounded-lg shadow-md p-4 md:p-8">
            <div className="flex items-center justify-between gap-3 mb-5">
              <div>
                <h3 className="text-lg font-bold text-gray-800">Clientes frecuentes</h3>
                <p className="text-sm text-gray-500">Estos clientes pueden seleccionarse al cobrar una venta.</p>
              </div>
              <span className="rounded-full bg-cyan-50 px-3 py-1 text-sm font-semibold text-cyan-700">{clientes.length} activos</span>
            </div>
            {clientes.length === 0 ? (
              <p className="py-8 text-center text-gray-500">Aún no hay clientes frecuentes registrados.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="border-b bg-gray-50 text-left text-xs uppercase text-gray-600">
                    <tr><th className="px-4 py-3">Código</th><th className="px-4 py-3">Nombre</th><th className="px-4 py-3">NIT</th><th className="px-4 py-3">Teléfono</th><th className="px-4 py-3 text-right">Acciones</th></tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {clientes.map((cliente) => (
                      <tr key={cliente.id}>
                        <td className="px-4 py-3 font-semibold text-cyan-700">{cliente.codigo}</td>
                        <td className="px-4 py-3 text-gray-800">{cliente.nombre}</td>
                        <td className="px-4 py-3 text-gray-600">{cliente.nit || '—'}</td>
                        <td className="px-4 py-3 text-gray-600">{cliente.telefono || '—'}</td>
                        <td className="px-4 py-3 text-right">
                          <button type="button" onClick={() => editarCliente(cliente)} className="text-cyan-600 hover:text-cyan-800 font-medium">
                            Editar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {selectedVenta && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[92vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-cyan-600 to-blue-700 text-white px-4 md:px-6 py-5 rounded-t-lg">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm text-cyan-100">Ticket de venta</p>
                  <h3 className="text-xl md:text-2xl font-bold font-mono break-all">{selectedVenta.ticket}</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedVenta(null)}
                  className="px-3 py-2 bg-white/15 hover:bg-white/25 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap"
                >
                  Cerrar
                </button>
              </div>
            </div>

            <div className="p-4 md:p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Fecha/Hora</p>
                  <p className="text-sm font-semibold text-gray-900">{selectedVenta.fecha}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Cliente</p>
                  <p className="text-sm font-semibold text-gray-900">{selectedVenta.cliente}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Metodo pago</p>
                  <p className="text-sm font-semibold text-gray-900">{selectedVenta.metodoPago}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Vendedor</p>
                  <p className="text-sm font-semibold text-gray-900">{selectedVenta.usuario}</p>
                </div>
              </div>

              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-5 py-3 border-b border-gray-200">
                  <h4 className="font-bold text-gray-800">Detalle del ticket</h4>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-white border-b border-gray-200">
                      <tr>
                        <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Producto</th>
                        <th className="px-5 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Cantidad</th>
                        <th className="px-5 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Precio</th>
                        <th className="px-5 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {selectedVenta.detalles?.length > 0 ? selectedVenta.detalles.map((detalle) => (
                        <tr key={detalle.id || `${detalle.recetaId}-${detalle.nombre}`}>
                          <td className="px-5 py-4">
                            <p className="text-sm font-semibold text-gray-900">{detalle.nombre}</p>
                            <p className="text-xs text-gray-500">
                              {[detalle.codigo, detalle.presentacion].filter(Boolean).join(' - ') || 'Producto POS'}
                            </p>
                          </td>
                          <td className="px-5 py-4 text-right text-sm text-gray-700">{detalle.cantidad}</td>
                          <td className="px-5 py-4 text-right text-sm text-gray-700">Q{detalle.precioUnitario.toFixed(2)}</td>
                          <td className="px-5 py-4 text-right text-sm font-bold text-gray-900">Q{detalle.total.toFixed(2)}</td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan="4" className="px-5 py-8 text-center text-sm text-gray-500">
                            Esta venta no tiene detalle disponible.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className={`rounded-lg border-2 p-5 ${
                  selectedVenta.necesitaFactura ? 'border-blue-200 bg-blue-50' : 'border-gray-200 bg-gray-50'
                }`}>
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-bold text-gray-800">Datos para factura</h4>
                    <span className={`text-xs px-3 py-1 rounded-full font-semibold ${
                      selectedVenta.necesitaFactura ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'
                    }`}>
                      {selectedVenta.necesitaFactura ? 'Solicitada' : 'No solicitada'}
                    </span>
                  </div>
                  {selectedVenta.necesitaFactura ? (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <p className="text-xs text-gray-500 uppercase font-semibold">NIT</p>
                        <p className="text-sm font-bold text-gray-900">{selectedVenta.nit || 'Sin dato'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase font-semibold">Nombre</p>
                        <p className="text-sm font-bold text-gray-900">{selectedVenta.nombreCliente || 'Sin dato'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase font-semibold">Telefono</p>
                        <p className="text-sm font-bold text-gray-900">{selectedVenta.numeroTelefono || 'Sin dato'}</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-600">La venta fue registrada sin solicitud de factura.</p>
                  )}
                </div>

                <div className="rounded-lg border border-gray-200 p-5">
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Subtotal</span>
                      <span className="font-semibold text-gray-900">Q{selectedVenta.subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">{ivaLabel}</span>
                      <span className="font-semibold text-gray-900">Q{selectedVenta.iva.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-xl font-bold pt-3 border-t border-gray-200">
                      <span>Total</span>
                      <span className="text-green-600">Q{selectedVenta.total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showModal && modalType === 'pago' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start sm:items-center justify-center z-50 p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-2xl max-w-lg w-full max-h-[94vh] flex flex-col my-3 sm:my-0">
            <div className="bg-gradient-to-r from-green-500 to-green-600 text-white px-5 py-3 rounded-t-lg flex-shrink-0">
              <h3 className="text-xl font-bold">Procesar Pago</h3>
              <p className="text-sm text-green-100 mt-1">Total a cobrar: Q{calcularTotal().toFixed(2)}</p>
            </div>

            <div className="p-4 sm:p-5 space-y-3 overflow-y-auto">
              {errorMsg && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {errorMsg}
                </div>
              )}
              {successMsg && (
                <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                  {successMsg}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Método de Pago</label>
                <div className="grid grid-cols-2 gap-2">
                  {metodosPago.map((metodo) => (
                    <button
                      key={metodo}
                      type="button"
                      onClick={() => setMetodoPago(metodo)}
                      className={`py-2 px-3 border-2 rounded-lg font-medium hover:bg-green-50 transition-colors ${
                        metodoPago === metodo
                          ? 'border-green-500 bg-green-50 text-green-700'
                          : 'border-gray-300 bg-white text-gray-700'
                      }`}
                    >
                      {metodo}
                    </button>
                  ))}
                </div>
              </div>

              <div className="border-t pt-3">
                <label className="block text-sm font-medium text-gray-700 mb-2">Cliente frecuente</label>
                <select
                  value={clienteSeleccionadoId}
                  onChange={(event) => {
                    const id = event.target.value
                    const cliente = clientes.find((item) => String(item.id) === String(id))
                    setClienteSeleccionadoId(id)
                    if (cliente) {
                      setDatosFactura((previous) => ({
                        ...previous,
                        nit: cliente.nit || '',
                        nombreCliente: cliente.nombre || '',
                        numeroTelefono: cliente.telefono || '',
                      }))
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                >
                  <option value="">Cliente ocasional / ingresar manualmente</option>
                  {clientes.map((cliente) => (
                    <option key={cliente.id} value={cliente.id}>
                      {cliente.codigo} · {cliente.nombre}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  Al seleccionar un cliente se cargan los datos disponibles; puedes completar o corregir la información.
                </p>
              </div>

              <div className="border-t pt-3">
                <label className="block text-sm font-medium text-gray-700 mb-3">¿Necesita Factura?</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setNecesitaFactura(true)}
                    className={`flex-1 py-2 px-3 border-2 rounded-lg font-medium transition-colors ${
                      necesitaFactura
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Sí
                  </button>
                  <button
                    type="button"
                    onClick={() => setNecesitaFactura(false)}
                    className={`flex-1 py-2 px-3 border-2 rounded-lg font-medium transition-colors ${
                      !necesitaFactura
                        ? 'border-gray-500 bg-gray-50 text-gray-700'
                        : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    No
                  </button>
                </div>
              </div>

              {necesitaFactura && (
                <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">NIT *</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="Ej: 1234567890101"
                      value={datosFactura.nit}
                      onChange={(e) => setDatosFactura({ ...datosFactura, nit: sanitizeNIT(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Cliente *</label>
                    <input
                      type="text"
                      placeholder="Ej: Nombre del Cliente"
                      value={datosFactura.nombreCliente}
                      onChange={(e) => {
                        const cleaned = sanitizeNombreCliente(e.target.value)
                        setDatosFactura({ ...datosFactura, nombreCliente: cleaned })
                      }}
                      onBlur={(e) => setDatosFactura({ ...datosFactura, nombreCliente: capitalizeWords(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Número Teléfono *</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="Ej: 50271234567"
                      value={datosFactura.numeroTelefono}
                      onChange={(e) => {
                        const cleaned = sanitizeTelefono(e.target.value)
                        setDatosFactura({ ...datosFactura, numeroTelefono: cleaned })
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              )}

              <div className="bg-cyan-50 border-2 border-cyan-200 rounded-lg p-3">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm text-gray-700">Subtotal:</span>
                  <span className="text-base font-bold text-cyan-700">Q{calcularSubtotal().toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm text-gray-700">{ivaLabel}:</span>
                  <span className="text-base font-bold text-cyan-700">Q{calcularIVA().toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center border-t border-cyan-200 pt-2">
                  <span className="text-sm text-gray-700">Total:</span>
                  <span className="text-xl font-bold text-green-600">Q{calcularTotal().toFixed(2)}</span>
                </div>
              </div>

              <div className="bg-yellow-50 border-l-4 border-yellow-500 p-3 rounded">
                <p className="text-xs text-yellow-800">
                  Al confirmar, se validará stock suficiente de todos los insumos del BOM y se registrarán salidas automáticas de materia prima.
                </p>
              </div>
            </div>

            <div className="px-5 py-3 bg-gray-50 rounded-b-lg flex justify-end gap-3 flex-shrink-0 border-t border-gray-200">
              <button
                onClick={closeModal}
                disabled={isProcessing}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors disabled:bg-gray-400"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarVenta}
                disabled={isProcessing || carrito.length === 0}
                className="px-6 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white font-bold rounded-lg hover:shadow-lg transition-shadow disabled:from-green-300 disabled:to-green-400"
              >
                {isProcessing ? 'Validando...' : 'Confirmar Venta'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ReporteModal
        open={reporteOpen}
        title="Reporte de ventas del punto de venta"
        filterLabel="Método de pago"
        filterOptions={metodosPagoReporte}
        generating={generandoReporte}
        onGenerate={handleGenerarReporteVentas}
        onClose={() => setReporteOpen(false)}
      />
    </div>
  )
}

export default PuntoVenta
