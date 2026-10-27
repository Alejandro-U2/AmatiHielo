import { useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  ArrowRight,
  Banknote,
  CheckCircle2,
  Coins,
  ExternalLink,
  FileDown,
  Lock,
  Minus,
  Package,
  Plus,
  ReceiptText,
  ShoppingCart,
  Trash2,
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
import { subscribeToDataChanges, notifyDataChange } from '../../services/realtimeSync'
import { isValidNombreCliente, isValidTelefono, isValidNIT, sanitizeNombreCliente, sanitizeTelefono, sanitizeNIT, capitalizeWords } from '../../utils/validation'
import Pagination from '../../components/Pagination'
import SortableHeader from '../../components/SortableHeader'
import ReporteModal from '../../components/ReporteModal'
import { generarReporteModulo } from '../../utils/moduloExport'
import { useTableSort, sortRows } from '../../hooks/useTableSort'
import ModuleHeader from '../ModuleHeader'
import SuccessModal from '../SuccessModal'

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
  const [arqueoForm, setArqueoForm] = useState({
    sencilloDejado: '200',
    efectivoReal: '',
    observaciones: '',
  })
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [successTitle, setSuccessTitle] = useState('Operación completada')
  const [successSubtitle, setSuccessSubtitle] = useState('Punto de Venta')
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

  const loadData = async (forceFull = false, { updateRecetas = true } = {}) => {
    try {
      setIsLoading(true)
      setErrorMsg('')
      const shouldLoadCatalogs = forceFull || metodosPago.length === 0 || clientes.length === 0
      const [recetasData, ventasData, parametrosData, metodosPagoData, clientesData] = await Promise.all([
        updateRecetas ? getRecetas({ includeImages: true }) : Promise.resolve(null),
        listVentasPos(),
        shouldLoadCatalogs ? getParametrosSistema().catch(() => null) : Promise.resolve(null),
        shouldLoadCatalogs ? listMetodosPago().catch(() => []) : Promise.resolve([]),
        shouldLoadCatalogs ? listClientesPos().catch(() => []) : Promise.resolve([]),
      ])

      if (parametrosData?.impuestos) {
        setIvaActivo(Boolean(parametrosData.impuestos.ivaActivo))
        setIvaPorcentaje(Number(parametrosData.impuestos.ivaPorcentaje || 12))
      }
      if (metodosPagoData.length > 0) {
        setMetodosPago(metodosPagoData.map((metodo) => metodo.nombre))
      }
      if (recetasData) {
        setProductos(recetasData.map((receta) => ({
          id: receta.id,
          codigo: receta.codigo,
          nombre: receta.nombre,
          categoria: receta.categoria || 'General',
          presentacion: receta.presentacion,
          precio: Number(receta.precioSugerido || receta.costoTotal || 0),
          imagenUrl: receta.imagenUrl || null,
          ingredientes: receta.ingredientes || [],
        })))
      }
      setVentas(ventasData)
      if (clientesData.length > 0) {
        setClientes(clientesData)
      }
    } catch (error) {
      setErrorMsg(error.message || 'No fue posible cargar el POS.')
      if (updateRecetas) {
        setProductos([])
      }
      setVentas([])
    } finally {
      setIsLoading(false)
    }
  }

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
    loadData(false, { updateRecetas: true })
    cargarArqueo()

    // Suscripción en tiempo real: sincroniza cambios de recetas, ventas e inventario
    const unsubscribe = subscribeToDataChanges(({ type }) => {
      const isPeriodic = type === 'interval' || type === 'focus' || type === 'visibility'
      loadData(false, { updateRecetas: !isPeriodic })
      if (type === 'ventas' || type === 'caja' || type === 'all') {
        cargarArqueo()
      }
    }, { intervalSeconds: 15, types: ['all', 'ventas', 'recetas', 'caja', 'inventario'] })

    return () => unsubscribe()
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

  // Métricas en tiempo real del día para las cards superiores
  const kpisHoy = useMemo(() => {
    const totalVentas = ventasDelDia.reduce((sum, venta) => sum + (Number(venta.total) || 0), 0)
    const transacciones = ventasDelDia.length
    const ticketPromedio = transacciones > 0 ? totalVentas / transacciones : 0
    const ventasEfectivo = ventasDelDia
      .filter((venta) => (venta.metodoPago || '').toLowerCase() === 'efectivo')
      .reduce((sum, venta) => sum + (Number(venta.total) || 0), 0)
    const fondoCaja = Number(arqueoResumen?.fondoInicial ?? arqueoResumen?.sencilloDejado ?? 0)
    const cajaActual = ventasEfectivo + fondoCaja

    return {
      totalVentas,
      transacciones,
      ticketPromedio,
      cajaActual,
      fondoCaja,
      ventasEfectivo,
    }
  }, [ventasDelDia, arqueoResumen])

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
    const fondoInicial = Number(arqueoResumen?.fondoInicial ?? 0)
    const totalEfectivoEsperado = Number(arqueoResumen?.totalEfectivoEsperado ?? (fondoInicial + ventasEfectivo))
    const sencilloDejado = Number(arqueoResumen?.sencilloDejado ?? fondoInicial)
    const efectivoRetirado = Number(arqueoResumen?.efectivoRetirado ?? Math.max(0, totalEfectivoEsperado - sencilloDejado))
    const efectivoReal = Number(arqueoResumen?.efectivoReal ?? totalEfectivoEsperado)
    const diferencia = Number(arqueoResumen?.diferencia ?? (efectivoReal - totalEfectivoEsperado))

    return {
      fecha: new Date().toLocaleDateString('es-GT'),
      turno: 'Semanal',
      vendedor: arqueoResumen?.usuario || 'Usuario actual',
      porMetodo,
      totalVentas,
      ventasEfectivo,
      fondoInicial,
      totalEfectivoEsperado,
      sencilloDejado,
      efectivoRetirado,
      efectivoReal,
      diferencia,
      observaciones: arqueoResumen?.observaciones || '',
      transacciones: arqueoResumen?.transacciones ?? ventasDelDia.length,
    }
  }, [arqueoResumen, ventasDelDia, metodosPago])

  const openArqueoModal = () => {
    const defaultSencillo = arqueoCaja.sencilloDejado > 0
      ? arqueoCaja.sencilloDejado
      : (arqueoCaja.fondoInicial > 0 ? arqueoCaja.fondoInicial : 200)
    setArqueoForm({
      sencilloDejado: String(defaultSencillo),
      efectivoReal: String(arqueoCaja.totalEfectivoEsperado || ''),
      observaciones: '',
    })
    openModal('arqueo')
  }

  const handleConfirmarArqueo = async (e) => {
    e?.preventDefault()
    try {
      setIsConfirmingArqueo(true)
      setErrorMsg('')
      const sencilloDejadoNum = Number(arqueoForm.sencilloDejado || 0)
      if (Number.isNaN(sencilloDejadoNum) || sencilloDejadoNum < 0) {
        setErrorMsg('El sencillo a dejar en caja debe ser un número mayor o igual a 0.')
        return
      }

      const efectivoRealNum = arqueoForm.efectivoReal !== '' && !Number.isNaN(Number(arqueoForm.efectivoReal))
        ? Number(arqueoForm.efectivoReal)
        : null

      const confirmado = await confirmarArqueoCaja(arqueoPeriodo.periodoInicio, arqueoPeriodo.periodoFin, {
        sencilloDejado: sencilloDejadoNum,
        efectivoReal: efectivoRealNum,
        observaciones: arqueoForm.observaciones,
      })

      setArqueoResumen(confirmado)
      setArqueoConfirmado(true)
      closeModal()
      setSuccessTitle('Arqueo semanal confirmado')
      setSuccessSubtitle('Cierre de caja semanal')
      setSuccessMsg(`Arqueo semanal confirmado correctamente. Se reservaron Q${sencilloDejadoNum.toFixed(2)} de sencillo en caja para la siguiente semana.`)
      toast.success('Arqueo semanal confirmado correctamente.')
      notifyDataChange('caja')
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
    return carrito.reduce((sum, item) => sum + (Number(item.precio || 0) * Number(item.cantidad || 0)), 0)
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
    if (type === 'pago') {
      setClienteSeleccionadoId('')
      setNecesitaFactura(false)
      setDatosFactura({
        nit: '',
        nombreCliente: '',
        numeroTelefono: '',
      })
    }
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setModalType('')
    setErrorMsg('')
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
      closeModal()
      setSuccessTitle('Cliente guardado')
      setSuccessSubtitle('Directorio de clientes')
      setSuccessMsg(mensajeExito)
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
        cliente: clientes.find((cliente) => String(cliente.id) === String(clienteSeleccionadoId))?.nombre || (necesitaFactura ? datosFactura.nombreCliente : null) || null,
        necesitaFactura,
        nit: necesitaFactura ? (datosFactura.nit || null) : null,
        nombreCliente: necesitaFactura ? (datosFactura.nombreCliente || null) : null,
        numeroTelefono: necesitaFactura ? (datosFactura.numeroTelefono || null) : null,
        items: carrito.map((item) => ({
          recetaId: item.id,
          cantidad: item.cantidad,
          precioUnitario: item.precio,
        })),
      })

      closeModal()
      setSuccessTitle('¡Venta realizada con éxito!')
      setSuccessSubtitle(venta?.ticket ? `Ticket ${venta.ticket}` : 'Punto de Venta')
      const totalFormateado = Number(venta?.total || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      const clienteNombre = venta?.cliente || (clienteSeleccionadoId ? clientes.find((c) => String(c.id) === String(clienteSeleccionadoId))?.nombre : null) || (necesitaFactura ? datosFactura.nombreCliente : null) || 'Cliente General'
      const itemsCount = carrito.reduce((sum, item) => sum + (item.cantidad || 0), 0)

      setSuccessMsg(`Total: Q${totalFormateado}\n${itemsCount} ${itemsCount === 1 ? 'unidad vendida' : 'unidades vendidas'} · Método: ${metodoPago}\nCliente: ${clienteNombre}\n\nInventario descontado correctamente según BOM.`)
      toast.success(`Venta ${venta?.ticket || ''} registrada con éxito.`)
      vaciarCarrito()
      setVentas((prev) => [venta, ...prev])
      setIsProcessing(false)
      notifyDataChange('ventas')
      // Sincronización en segundo plano sin bloquear la pantalla
      loadData(false).catch(() => {})
      cargarArqueo().catch(() => {})
      return
    } catch (error) {
      setErrorMsg(error.message || 'No fue posible confirmar la venta.')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="dashboard-shell space-y-6">
      <ModuleHeader title="Punto de Venta (POS)" description="Venta con consumo directo de materias primas desde el BOM" eyebrow="Ventas" icon={ReceiptText} />

      <div className="dashboard-kpis grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 md:gap-5 mb-6">
        {[
          { label: 'Ventas hoy', value: `Q${kpisHoy.totalVentas.toFixed(2)}`, change: '+12%', detail: 'vs. ayer', icon: Wallet, tone: 'green' },
          { label: 'Transacciones', value: String(kpisHoy.transacciones), change: '+9%', detail: 'en el día', icon: ReceiptText, tone: 'blue' },
          { label: 'Ticket promedio', value: `Q${kpisHoy.ticketPromedio.toFixed(2)}`, change: '+4%', detail: 'promedio', icon: TrendingUp, tone: 'purple' },
          { label: 'Caja actual', value: `Q${kpisHoy.cajaActual.toFixed(2)}`, change: 'Saldado', detail: 'efectivo en caja', icon: WalletCards, tone: 'orange' },
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

      <div className="mb-6 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <nav className="flex space-x-2 sm:space-x-4 overflow-x-auto scrollbar-none touch-scroll whitespace-nowrap">
          <button
            onClick={() => setActiveTab('venta')}
            className={`pb-3 px-2 sm:px-3 text-xs sm:text-sm font-medium transition-colors shrink-0 ${
              activeTab === 'venta'
                ? 'border-b-2 border-cyan-500 text-cyan-600 font-semibold'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Realizar Venta
          </button>
          <button
            onClick={() => setActiveTab('historial')}
            className={`pb-3 px-2 sm:px-3 text-xs sm:text-sm font-medium transition-colors shrink-0 ${
              activeTab === 'historial'
                ? 'border-b-2 border-cyan-500 text-cyan-600 font-semibold'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Historial de Ventas
          </button>
          <button
            onClick={() => setActiveTab('caja')}
            className={`pb-3 px-2 sm:px-3 text-xs sm:text-sm font-medium transition-colors shrink-0 ${
              activeTab === 'caja'
                ? 'border-b-2 border-cyan-500 text-cyan-600 font-semibold'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Arqueo de Caja
          </button>
          <button
            onClick={() => setActiveTab('clientes')}
            className={`pb-3 px-2 sm:px-3 text-xs sm:text-sm font-medium transition-colors shrink-0 ${
              activeTab === 'clientes'
                ? 'border-b-2 border-cyan-500 text-cyan-600 font-semibold'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Clientes Frecuentes
          </button>
        </nav>

        <a
          href="https://farm3.sat.gob.gt/menu/login.jsf"
          target="_blank"
          rel="noopener noreferrer"
          className="self-start sm:self-auto mb-2 sm:mb-1.5 inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white rounded-xl text-xs font-bold shadow-xs hover:shadow-md transition-all active:scale-95 shrink-0"
          title="Acceso directo a la Agencia Virtual de la SAT para facturación FEL"
        >
          <ExternalLink size={14} />
          <span>Portal SAT</span>
        </a>
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {productosFiltrados.map((producto) => {
                  const bomCompleto = hasBomCompleto(producto)
                  return (
                    <button
                      key={producto.id}
                      type="button"
                      onClick={() => agregarAlCarrito(producto)}
                      disabled={!bomCompleto}
                      className="group text-left bg-white border border-gray-200 hover:border-cyan-500 rounded-2xl p-3 sm:p-4 hover:shadow-lg transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-3 sm:gap-4 relative min-h-[110px] sm:min-h-[120px]"
                    >
                      {/* Imagen del producto al lado izquierdo - tamaño ampliado */}
                      <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-xl bg-gray-50 border border-gray-200/80 shrink-0 overflow-hidden relative flex items-center justify-center shadow-xs">
                        {producto.imagenUrl ? (
                          <img
                            src={producto.imagenUrl}
                            alt={producto.nombre}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center text-gray-400 gap-1.5 p-2">
                            <Package className="w-7 h-7 sm:w-8 sm:h-8 text-gray-300" />
                            <span className="text-[11px] sm:text-xs text-gray-400 font-medium">Sin foto</span>
                          </div>
                        )}
                      </div>

                      {/* Información del producto al lado derecho */}
                      <div className="flex-1 min-w-0 flex flex-col justify-between self-stretch py-0.5">
                        <div>
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <span className="text-xs font-mono text-gray-400 truncate">{producto.codigo}</span>
                            <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full shrink-0 ${
                              bomCompleto ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {bomCompleto ? `${producto.ingredientes.length} insumos` : 'BOM incompleto'}
                            </span>
                          </div>
                          <h4 className="font-bold text-gray-900 text-base leading-snug line-clamp-2 group-hover:text-cyan-600 transition-colors">
                            {producto.nombre}
                          </h4>
                          {producto.presentacion && (
                            <p className="text-xs text-gray-500 mt-1 font-medium truncate">{producto.presentacion}</p>
                          )}
                        </div>

                        <div className="flex justify-between items-baseline mt-3 pt-2 border-t border-gray-100">
                          <span className="text-xs text-gray-400 font-medium">Precio</span>
                          <span className="text-lg sm:text-xl font-extrabold text-cyan-700">Q{producto.precio.toFixed(2)}</span>
                        </div>
                      </div>
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
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-4 md:p-5 sticky top-6">
              {/* Header del carrito */}
              <div className="flex justify-between items-center pb-3.5 mb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-cyan-50 border border-cyan-100 flex items-center justify-center text-cyan-600">
                    <ShoppingCart className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-800 leading-none">Carrito</h3>
                    {carrito.length > 0 && (
                      <span className="text-[11px] text-slate-400 font-medium mt-0.5 block">
                        {carrito.reduce((acc, item) => acc + item.cantidad, 0)} {carrito.reduce((acc, item) => acc + item.cantidad, 0) === 1 ? 'artículo' : 'artículos'}
                      </span>
                    )}
                  </div>
                </div>

                {carrito.length > 0 && (
                  <button
                    type="button"
                    onClick={vaciarCarrito}
                    className="text-xs font-semibold text-rose-500 hover:text-rose-700 hover:bg-rose-50 px-2.5 py-1.5 rounded-lg transition-colors inline-flex items-center gap-1 active:scale-95"
                    title="Vaciar todo el carrito"
                  >
                    <Trash2 size={13} />
                    <span>Vaciar</span>
                  </button>
                )}
              </div>

              {carrito.length === 0 ? (
                <div className="text-center py-10 px-4 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50 my-2">
                  <div className="w-12 h-12 rounded-xl bg-cyan-50 border border-cyan-100 flex items-center justify-center mx-auto mb-2.5 text-cyan-600">
                    <ShoppingCart className="w-6 h-6 opacity-80" />
                  </div>
                  <p className="font-bold text-slate-700 text-sm">Tu carrito está vacío</p>
                  <p className="text-xs text-slate-400 mt-1 max-w-[200px] mx-auto">
                    Selecciona productos del catálogo para agregarlos a la orden
                  </p>
                </div>
              ) : (
                <>
                  {/* Lista de productos */}
                  <div className="space-y-2.5 mb-4 max-h-[340px] overflow-y-auto pr-1 touch-scroll">
                    {carrito.map((item) => (
                      <div
                        key={item.id}
                        className="bg-slate-50/70 hover:bg-slate-50 border border-slate-200/80 rounded-xl p-3 transition-all duration-150 shadow-2xs"
                      >
                        <div className="flex items-start justify-between gap-2.5 mb-2.5">
                          <div className="flex items-center gap-2.5 flex-1 min-w-0">
                            {item.imagenUrl ? (
                              <img
                                src={item.imagenUrl}
                                alt={item.nombre}
                                className="w-11 h-11 rounded-lg object-cover border border-slate-200/90 bg-white shrink-0"
                              />
                            ) : (
                              <div className="w-11 h-11 rounded-lg bg-slate-200/80 border border-slate-200 flex items-center justify-center text-slate-400 shrink-0">
                                <Package className="w-5 h-5 text-slate-400" />
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <h4 className="font-bold text-slate-800 text-sm leading-snug line-clamp-1">
                                {item.nombre}
                              </h4>
                              <p className="text-xs text-slate-500 font-medium mt-0.5">
                                Q{Number(item.precio || 0).toFixed(2)} c/u
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => eliminarDelCarrito(item.id)}
                            className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors ml-1 shrink-0"
                            title="Eliminar producto"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>

                        <div className="flex justify-between items-center pt-2 border-t border-slate-200/60">
                          {/* Selector de cantidad */}
                          <div className="inline-flex items-center bg-white border border-slate-200 rounded-lg shadow-2xs p-0.5 gap-1">
                            <button
                              type="button"
                              onClick={() => cambiarCantidad(item.id, item.cantidad - 1)}
                              className="w-7 h-7 flex items-center justify-center rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 active:scale-90 transition-all font-bold cursor-pointer"
                              title="Restar"
                            >
                              <Minus size={13} strokeWidth={2.5} />
                            </button>
                            <span className="min-w-[28px] text-center text-xs font-extrabold text-slate-800">
                              {item.cantidad}
                            </span>
                            <button
                              type="button"
                              onClick={() => cambiarCantidad(item.id, item.cantidad + 1)}
                              className="w-7 h-7 flex items-center justify-center rounded-md bg-cyan-500 hover:bg-cyan-600 text-white shadow-2xs active:scale-90 transition-all font-bold cursor-pointer"
                              title="Sumar"
                            >
                              <Plus size={13} strokeWidth={2.5} />
                            </button>
                          </div>

                          {/* Subtotal del ítem */}
                          <div className="text-right">
                            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block leading-tight">
                              Subtotal
                            </span>
                            <span className="text-sm font-black text-slate-900">
                              Q{(Number(item.precio || 0) * Number(item.cantidad || 0)).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Resumen de totales */}
                  <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 space-y-2">
                    <div className="flex justify-between items-center text-xs text-slate-600">
                      <span className="font-medium">Subtotal</span>
                      <span className="font-bold text-slate-800">Q{calcularSubtotal().toFixed(2)}</span>
                    </div>

                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-600 font-medium flex items-center gap-1.5">
                        <span>{ivaActivo ? `IVA (${ivaPorcentaje.toFixed(1)}%)` : 'IVA'}</span>
                        {!ivaActivo && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-200/80 text-slate-500 font-semibold">
                            Desactivado
                          </span>
                        )}
                      </span>
                      <span className={`font-bold ${ivaActivo ? 'text-slate-800' : 'text-slate-400'}`}>
                        Q{calcularIVA().toFixed(2)}
                      </span>
                    </div>

                    <div className="border-t border-slate-200/90 pt-2.5 flex justify-between items-baseline">
                      <div>
                        <span className="text-[10px] uppercase font-extrabold tracking-wider text-slate-500 block">
                          Total a cobrar
                        </span>
                        <span className="text-[11px] text-slate-400 font-medium">GTQ (Quetzales)</span>
                      </div>
                      <span className="text-2xl font-black text-cyan-700 tracking-tight">
                        Q{calcularTotal().toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Botón de acción */}
                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={() => openModal('pago')}
                      className="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-600 hover:from-emerald-600 hover:via-emerald-700 hover:to-teal-700 text-white font-extrabold text-sm rounded-xl shadow-md shadow-emerald-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 group cursor-pointer"
                    >
                      <WalletCards className="w-5 h-5 transition-transform group-hover:scale-110" />
                      <span>Procesar Pago</span>
                      <ArrowRight className="w-4 h-4 ml-auto opacity-70 group-hover:translate-x-1 transition-transform" />
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
            <div className="flex flex-wrap gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setReporteOpen(true)}
                className="flex-1 sm:flex-initial px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg hover:from-indigo-600 hover:to-purple-700 transition-colors flex items-center justify-center gap-2 text-xs sm:text-sm font-medium"
              >
                <FileDown size={16} aria-hidden="true" />
                Reporte
              </button>
              <button
                onClick={loadData}
                className="flex-1 sm:flex-initial px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-xs sm:text-sm font-medium"
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

          <div className="bg-white rounded-lg shadow-md overflow-x-auto touch-scroll">
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
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-5 md:p-8">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6 pb-5 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-cyan-50 border border-cyan-100 flex items-center justify-center text-cyan-600">
                    <Coins className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-800">Arqueo y Liquidación Semanal</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Período: {arqueoPeriodo.periodoInicio.toLocaleDateString('es-GT')} al {arqueoPeriodo.periodoFin.toLocaleDateString('es-GT')} (6:00 PM)
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`rounded-full px-3 py-1 text-xs font-bold inline-flex items-center gap-1.5 ${
                  arqueoConfirmado ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                }`}>
                  {arqueoConfirmado ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      Arqueo Confirmado
                    </>
                  ) : (
                    <>
                      <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                      Pendiente de Cierre
                    </>
                  )}
                </span>
                {!arqueoConfirmado ? (
                  <button
                    type="button"
                    onClick={openArqueoModal}
                    disabled={isConfirmingArqueo}
                    className="px-5 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <Coins className="w-4 h-4" />
                    <span>Realizar Arqueo y Liquidación</span>
                  </button>
                ) : (
                  <span className="text-xs text-slate-400 font-medium italic">
                    Período cerrado
                  </span>
                )}
              </div>
            </div>

            {/* Resumen de Ventas */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mb-6">
              <div className="bg-slate-50 border border-slate-200/80 p-4 rounded-xl">
                <p className="text-xs font-medium text-slate-500 mb-1">Total de Ventas</p>
                <p className="text-2xl font-black text-cyan-700">Q{arqueoCaja.totalVentas.toFixed(2)}</p>
                <p className="text-[11px] text-slate-400 mt-1">{arqueoCaja.transacciones} transacciones</p>
              </div>
              <div className="bg-slate-50 border border-slate-200/80 p-4 rounded-xl">
                <p className="text-xs font-medium text-slate-500 mb-1">Ventas en Efectivo</p>
                <p className="text-2xl font-black text-emerald-700">Q{arqueoCaja.ventasEfectivo.toFixed(2)}</p>
                <p className="text-[11px] text-slate-400 mt-1">Cobrado en ventanilla</p>
              </div>
              <div className="bg-slate-50 border border-slate-200/80 p-4 rounded-xl">
                <p className="text-xs font-medium text-slate-500 mb-1">Ventas Transferencia</p>
                <p className="text-2xl font-black text-indigo-700">
                  Q{(arqueoCaja.porMetodo.find(m => m.nombre === 'Transferencia')?.total || 0).toFixed(2)}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">Directo a cuenta</p>
              </div>
            </div>

            {/* SECCIÓN CLAVE: Control de Efectivo y Sencillo */}
            <div className="bg-gradient-to-br from-slate-50 via-slate-50 to-cyan-50/40 border border-slate-200 rounded-2xl p-5 md:p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <WalletCards className="w-5 h-5 text-cyan-600" />
                  <h4 className="font-bold text-slate-800 text-base">Control de Gaveta y Sencillo (Fondo para Cambio)</h4>
                </div>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-cyan-100 text-cyan-800">
                  Efectivo Físico
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mb-4">
                {/* 1. Sencillo Inicial */}
                <div className="bg-white border border-slate-200/90 rounded-xl p-3.5 shadow-2xs">
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                    <span className="font-medium">Sencillo de Apertura</span>
                    <Coins className="w-3.5 h-3.5 text-amber-500" />
                  </div>
                  <p className="text-xl font-black text-slate-800">Q{arqueoCaja.fondoInicial.toFixed(2)}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Fondo dejado la semana anterior</p>
                </div>

                {/* 2. Ventas Efectivo */}
                <div className="bg-white border border-slate-200/90 rounded-xl p-3.5 shadow-2xs">
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                    <span className="font-medium">(+) Ventas en Efectivo</span>
                    <Banknote className="w-3.5 h-3.5 text-emerald-500" />
                  </div>
                  <p className="text-xl font-black text-emerald-600">Q{arqueoCaja.ventasEfectivo.toFixed(2)}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Ingresado por cobros</p>
                </div>

                {/* 3. Total Esperado */}
                <div className="bg-white border-2 border-cyan-300 rounded-xl p-3.5 shadow-2xs bg-gradient-to-br from-cyan-50/50 to-white">
                  <div className="flex items-center justify-between text-xs text-cyan-700 mb-1">
                    <span className="font-bold">(=) Total Efectivo en Caja</span>
                    <Wallet className="w-3.5 h-3.5 text-cyan-600" />
                  </div>
                  <p className="text-xl font-black text-cyan-700">Q{arqueoCaja.totalEfectivoEsperado.toFixed(2)}</p>
                  <p className="text-[10px] text-cyan-600 font-medium mt-0.5">Dinero total en gaveta</p>
                </div>
              </div>

              {/* Resultado del Cierre (Confirmado vs Pendiente) */}
              {arqueoConfirmado ? (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <h5 className="font-bold text-emerald-900 text-sm">Liquidación Confirmada</h5>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <div className="bg-white/80 rounded-lg p-3 border border-emerald-200/60">
                      <span className="text-xs text-slate-500 block">Sencillo que se quedó en caja (para cambio):</span>
                      <span className="text-lg font-black text-amber-700">Q{arqueoCaja.sencilloDejado.toFixed(2)}</span>
                      <span className="text-[11px] text-slate-400 block mt-0.5">Fondo disponible para la siguiente semana</span>
                    </div>
                    <div className="bg-white/80 rounded-lg p-3 border border-emerald-200/60">
                      <span className="text-xs text-slate-500 block">Efectivo retirado / liquidado (depósito):</span>
                      <span className="text-lg font-black text-emerald-700">Q{arqueoCaja.efectivoRetirado.toFixed(2)}</span>
                      <span className="text-[11px] text-slate-400 block mt-0.5">Entregado / depositado en banco</span>
                    </div>
                  </div>
                  <div className="mt-3 pt-2.5 border-t border-emerald-200/60 flex flex-wrap justify-between items-center text-xs text-emerald-800">
                    <span>Responsable: <strong>{arqueoCaja.vendedor}</strong></span>
                    {arqueoCaja.observaciones && (
                      <span className="italic">Nota: {arqueoCaja.observaciones}</span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-amber-900">Período listo para arqueo</p>
                      <p className="text-xs text-amber-800 mt-0.5">
                        Al confirmar el arqueo podrás indicar cuánto sencillo dejas en la gaveta para dar cambio la próxima semana y cuánto efectivo retiras para liquidar.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={openArqueoModal}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs shrink-0 cursor-pointer active:scale-95 transition-all"
                  >
                    Abrir Arqueo
                  </button>
                </div>
              )}
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
              <div className="overflow-x-auto touch-scroll">
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
                <div className="overflow-x-auto touch-scroll">
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
                      setDatosFactura({
                        nit: cliente.nit || '',
                        nombreCliente: cliente.nombre || '',
                        numeroTelefono: cliente.telefono || '',
                      })
                      if (cliente.nit) {
                        setNecesitaFactura(true)
                      }
                    } else {
                      setDatosFactura({
                        nit: '',
                        nombreCliente: '',
                        numeroTelefono: '',
                      })
                      setNecesitaFactura(false)
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
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-medium text-gray-700">¿Necesita Factura?</label>
                  <a
                    href="https://farm3.sat.gob.gt/menu/login.jsf"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-semibold hover:underline"
                    title="Abrir portal de la SAT para emitir factura"
                  >
                    <span>Portal SAT FEL</span>
                    <ExternalLink size={12} />
                  </a>
                </div>
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
                  <div className="sm:col-span-2 flex items-center justify-between pb-1 border-b border-blue-200/60">
                    <span className="text-xs font-semibold text-blue-800">Datos para Facturación Electrónica</span>
                    <a
                      href="https://farm3.sat.gob.gt/menu/login.jsf"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-medium shadow-xs transition-colors"
                      title="Ir a SAT Agencia Virtual"
                    >
                      <ExternalLink size={11} />
                      <span>Ir a SAT</span>
                    </a>
                  </div>
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

      {showModal && modalType === 'arqueo' && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[95vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header del modal */}
            <div className="bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-700 text-white px-6 py-4 flex-shrink-0">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2">
                    <Coins className="w-5 h-5 text-cyan-200" />
                    <h3 className="text-lg font-bold">Arqueo y Liquidación Semanal</h3>
                  </div>
                  <p className="text-xs text-cyan-100 mt-0.5">
                    Período: {arqueoPeriodo.periodoInicio.toLocaleDateString('es-GT')} al {arqueoPeriodo.periodoFin.toLocaleDateString('es-GT')}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeModal}
                  className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Cuerpo del formulario */}
            <form onSubmit={handleConfirmarArqueo} className="p-5 sm:p-6 space-y-4 overflow-y-auto">
              {errorMsg && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700">
                  {errorMsg}
                </div>
              )}

              {/* Resumen del dinero disponible */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Sencillo de apertura (Fondo anterior):</span>
                  <span className="font-bold text-slate-800">Q{arqueoCaja.fondoInicial.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Ventas en efectivo de la semana:</span>
                  <span className="font-bold text-emerald-700">+Q{arqueoCaja.ventasEfectivo.toFixed(2)}</span>
                </div>
                <div className="border-t border-slate-200 pt-2 flex justify-between text-sm font-black text-cyan-800">
                  <span>Total Efectivo en Gaveta:</span>
                  <span>Q{arqueoCaja.totalEfectivoEsperado.toFixed(2)}</span>
                </div>
              </div>

              {/* Campo 1: Sencillo a dejar en caja */}
              <div className="bg-cyan-50/70 border border-cyan-200 rounded-xl p-4">
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Sencillo a dejar en caja para cambio (GTQ) *
                </label>
                <p className="text-[11px] text-slate-500 mb-2">
                  Dinero que permanecerá en la gaveta como fondo de cambio para la siguiente semana.
                </p>
                <div className="relative mb-2">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">Q</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max={arqueoCaja.totalEfectivoEsperado}
                    required
                    value={arqueoForm.sencilloDejado}
                    onChange={(e) => setArqueoForm({ ...arqueoForm, sencilloDejado: e.target.value })}
                    className="w-full pl-8 pr-4 py-2 bg-white border border-slate-300 rounded-lg text-base font-extrabold text-slate-900 focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                    placeholder="200.00"
                  />
                </div>
                {/* Accesos rápidos */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] text-slate-500 font-semibold mr-1">Sugeridos:</span>
                  {[100, 200, 300, 500].map((monto) => (
                    <button
                      key={monto}
                      type="button"
                      onClick={() => setArqueoForm({ ...arqueoForm, sencilloDejado: String(monto) })}
                      className={`text-xs px-2.5 py-1 rounded-lg font-bold border transition-colors cursor-pointer ${
                        Number(arqueoForm.sencilloDejado) === monto
                          ? 'bg-cyan-600 text-white border-cyan-600'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      Q{monto}
                    </button>
                  ))}
                </div>
              </div>

              {/* Cálculo en vivo de Efectivo a Retirar */}
              <div className="bg-emerald-50 border-2 border-emerald-300 rounded-xl p-4">
                <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">
                  Efectivo neto a retirar / liquidar
                </span>
                <div className="flex justify-between items-baseline mt-1">
                  <span className="text-2xl font-black text-emerald-700">
                    Q{Math.max(0, arqueoCaja.totalEfectivoEsperado - Number(arqueoForm.sencilloDejado || 0)).toFixed(2)}
                  </span>
                  <span className="text-xs text-emerald-700 font-medium">
                    (Ventas retiradas para depósito)
                  </span>
                </div>
              </div>

              {/* Campo 2: Efectivo físico contado (Opcional) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Efectivo físico contado en gaveta (Opcional para cuadre)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">Q</span>
                  <input
                    type="number"
                    step="0.01"
                    value={arqueoForm.efectivoReal}
                    onChange={(e) => setArqueoForm({ ...arqueoForm, efectivoReal: e.target.value })}
                    className="w-full pl-8 pr-4 py-2 border border-slate-300 rounded-lg text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-cyan-500"
                    placeholder={`Esperado: Q${arqueoCaja.totalEfectivoEsperado.toFixed(2)}`}
                  />
                </div>
                {arqueoForm.efectivoReal !== '' && !Number.isNaN(Number(arqueoForm.efectivoReal)) && (
                  <div className="mt-1.5 flex items-center gap-1.5 text-xs font-semibold">
                    {Number(arqueoForm.efectivoReal) === arqueoCaja.totalEfectivoEsperado ? (
                      <span className="text-emerald-600 flex items-center gap-1">
                        <CheckCircle2 size={13} /> Cuadre exacto (sin diferencias)
                      </span>
                    ) : Number(arqueoForm.efectivoReal) > arqueoCaja.totalEfectivoEsperado ? (
                      <span className="text-blue-600 flex items-center gap-1">
                        <ArrowRight size={13} /> Sobrante: +Q{(Number(arqueoForm.efectivoReal) - arqueoCaja.totalEfectivoEsperado).toFixed(2)}
                      </span>
                    ) : (
                      <span className="text-rose-600 flex items-center gap-1">
                        <AlertCircle size={13} /> Faltante: -Q{(arqueoCaja.totalEfectivoEsperado - Number(arqueoForm.efectivoReal)).toFixed(2)}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Campo 3: Observaciones */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Observaciones (Opcional)</label>
                <textarea
                  rows={2}
                  value={arqueoForm.observaciones}
                  onChange={(e) => setArqueoForm({ ...arqueoForm, observaciones: e.target.value })}
                  placeholder="Notas sobre el cierre, denominaciones de billetes en sencillo, etc."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-800 focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              {/* Botones de acción */}
              <div className="pt-2 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={isConfirmingArqueo}
                  className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isConfirmingArqueo}
                  className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs rounded-xl shadow-md active:scale-95 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Lock className="w-4 h-4" />
                  <span>{isConfirmingArqueo ? 'Confirmando...' : 'Confirmar Arqueo y Guardar Sencillo'}</span>
                </button>
              </div>
            </form>
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

      <SuccessModal
        isOpen={Boolean(successMsg)}
        title={successTitle}
        subtitle={successSubtitle}
        message={successMsg}
        buttonText="Aceptar"
        onClose={() => {
          setSuccessMsg('')
          setSuccessTitle('Operación completada')
          setSuccessSubtitle('Punto de Venta')
        }}
      />
    </div>
  )
}

export default PuntoVenta
