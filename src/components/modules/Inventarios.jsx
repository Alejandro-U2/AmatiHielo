import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  Bell,
  Building2,
  Calendar,
  CheckCircle,
  Clock,
  Eye,
  FileDown,
  FileText,
  Package,
  PackageMinus,
  PackagePlus,
  Pencil,
  Plus,
  Receipt,
  RefreshCw,
  Trash2,
  TriangleAlert,
  Upload,
  User,
  X,
  ClipboardList,
  ClipboardCheck,
} from 'lucide-react'
import AuditoriaInventarioModal from './auditoria/AuditoriaInventarioModal'
import {
  createProductoInventario,
  createMovimientoInventario,
  createEntradaInventario,
  uploadEntradaInventarioDocumento,
  deleteProductoInventario,
  listCategoriasInventario,
  listMovimientosInventario,
  listProductosInventario,
  listProveedoresInventario,
  listTiposMovimiento,
  listMotivosMerma,
  createProveedorInventario,
  updateProveedorInventario,
  deleteProveedorInventario,
  updateProductoInventario,
} from '../../services/inventarioService'
import Pagination from '../../components/Pagination'
import ModuleHeader from '../ModuleHeader'
import SortableHeader from '../../components/SortableHeader'
import ReporteModal from '../../components/ReporteModal'
import SuccessModal from '../SuccessModal'
import { sanitizeSoloLetras, capitalizeWords } from '../../utils/validation'
import { getCurrentUser } from '../../services/authService'
import { generarReporteModulo } from '../../utils/moduloExport'
import { useTableSort, sortRows } from '../../hooks/useTableSort'
import { toast } from 'sonner'

const DEFAULT_CATEGORIAS = [
  { nombre: 'Materia Prima', codigo: 'MP' },
  { nombre: 'Suministros', codigo: 'SUM' },
]

const DEFAULT_TIPOS_MOVIMIENTO = ['Entrada', 'Salida', 'Merma', 'Ajuste']

function Inventarios() {
  const [activeTab, setActiveTab] = useState('catalogo')
  const [showModal, setShowModal] = useState(false)
  const [modalType, setModalType] = useState('')
  const [selectedItem, setSelectedItem] = useState(null)
  const [filterCategoria, setFilterCategoria] = useState('todos')
  const [searchTerm, setSearchTerm] = useState('')
  const [movSearchTerm, setMovSearchTerm] = useState('')
  const [filterTipoMov, setFilterTipoMov] = useState('todos')
  const [movFechaDesde, setMovFechaDesde] = useState('')
  const [movFechaHasta, setMovFechaHasta] = useState('')
  const [currentPageProductos, setCurrentPageProductos] = useState(1)
  const [pageSizeProductos, setPageSizeProductos] = useState(5)
  const [currentPageMov, setCurrentPageMov] = useState(1)
  const [pageSizeMov, setPageSizeMov] = useState(5)
  const productSort = useTableSort('nombre')
  const movSort = useTableSort('fecha', 'desc')
  const [reporteOpen, setReporteOpen] = useState(false)
  const [generandoReporte, setGenerandoReporte] = useState(false)
  const [categoriasInventario, setCategoriasInventario] = useState(DEFAULT_CATEGORIAS)
  const [tiposMovimiento, setTiposMovimiento] = useState(DEFAULT_TIPOS_MOVIMIENTO)
  const [motivosMerma, setMotivosMerma] = useState([])
  const [productos, setProductos] = useState([])
  const [movimientos, setMovimientos] = useState([])
  const [proveedores, setProveedores] = useState([])
  const [isSavingProveedor, setIsSavingProveedor] = useState(false)
  const [proveedorError, setProveedorError] = useState('')
  const [isSavingProducto, setIsSavingProducto] = useState(false)
  const [isSavingMovimiento, setIsSavingMovimiento] = useState(false)
  const [errorProducto, setErrorProducto] = useState('')
  const [errorCarga, setErrorCarga] = useState('')
  const [deleteItem, setDeleteItem] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [movimientoForm, setMovimientoForm] = useState({
    productoId: '',
    proveedorId: '',
    cantidad: '',
    motivo: '',
  })
  const [entradaForm, setEntradaForm] = useState({
    fecha: new Date().toISOString().slice(0, 10),
    proveedorId: '',
    numeroFactura: '',
    numeroFacturaOnlyDigits: '',
    responsable: '',
    fechaFactura: '',
    observaciones: '',
    documento: null,
    detalles: [],
  })
  const [mermaForm, setMermaForm] = useState({
    fecha: new Date().toISOString().slice(0, 10),
    motivoTipo: '',
    evidencia: null,
  })
  const [proveedorForm, setProveedorForm] = useState({
    nombre: '',
    nit: '',
    telefono: '',
    correo: '',
  })
  const [showQuickProveedorModal, setShowQuickProveedorModal] = useState(false)
  const [quickProveedorForm, setQuickProveedorForm] = useState({
    nombre: '',
    nit: '',
    telefono: '',
    correo: '',
  })
  const [isSavingQuickProveedor, setIsSavingQuickProveedor] = useState(false)
  const [quickProveedorError, setQuickProveedorError] = useState('')
  const [productoForm, setProductoForm] = useState({
    codigo: '',
    categoria: '',
    nombre: '',
    minimo: '',
    cantidadCompra: '',
    precioPaquete: '',
    precioCompra: '',
  })

  const allowedCategorias = categoriasInventario.map((categoria) => categoria.nombre)

  const productosVigentes = productos.filter((producto) => allowedCategorias.includes(producto.categoria))

  const filteredProductos = productosVigentes.filter((producto) => {
    const matchCategoria = filterCategoria === 'todos' || producto.categoria === filterCategoria
    const normalizedSearch = searchTerm.trim().toLowerCase()

    if (!normalizedSearch) {
      return matchCategoria
    }

    return (
      matchCategoria
      && (producto.codigo.toLowerCase().includes(normalizedSearch)
      || producto.nombre.toLowerCase().includes(normalizedSearch))
    )
  })

  const filteredMovimientos = (Array.isArray(movimientos) ? movimientos : []).filter((mov) => {
    const matchTipo = filterTipoMov === 'todos' || String(mov.tipo || '').toLowerCase() === String(filterTipoMov).toLowerCase()
    const normalizedSearch = movSearchTerm.trim().toLowerCase()
    const matchSearch = !normalizedSearch
      || (mov.producto || '').toLowerCase().includes(normalizedSearch)
      || (mov.motivo || '').toLowerCase().includes(normalizedSearch)
      || (mov.motivoTipo || '').toLowerCase().includes(normalizedSearch)
      || (mov.tipo || '').toLowerCase().includes(normalizedSearch)
      || (mov.usuario || '').toLowerCase().includes(normalizedSearch)
    const rawFecha = mov.createdAt ?? mov.fecha
    const isoFecha = String(rawFecha).slice(0, 10)
    const matchDesde = !movFechaDesde || isoFecha >= movFechaDesde
    const matchHasta = !movFechaHasta || isoFecha <= movFechaHasta
    return matchTipo && matchSearch && matchDesde && matchHasta
  })

  const sortedProductos = sortRows(filteredProductos, productSort.sortBy, productSort.sortDir, (producto) => {
    switch (productSort.sortBy) {
      case 'codigo': return producto.codigo
      case 'nombre': return producto.nombre
      case 'categoria': return producto.categoria
      case 'stock': return producto.stock
      case 'minimo': return producto.minimo
      case 'precio': return Number(producto.precio_compra ?? producto.costo_unitario ?? 0)
      default: return null
    }
  })

  const totalPagesProductos = Math.max(1, Math.ceil(sortedProductos.length / pageSizeProductos))
  const paginatedProductos = sortedProductos.slice((currentPageProductos - 1) * pageSizeProductos, currentPageProductos * pageSizeProductos)

  const sortedMovimientos = sortRows(filteredMovimientos, movSort.sortBy, movSort.sortDir, (mov) => {
    switch (movSort.sortBy) {
      case 'fecha': {
        const rawFecha = mov.createdAt ?? mov.fecha
        const parsed = new Date(rawFecha)
        return Number.isFinite(parsed.getTime()) ? parsed.getTime() : 0
      }
      case 'tipo': return mov.tipo
      case 'producto': return mov.producto
      case 'cantidad': return mov.cantidad
      case 'usuario': return mov.usuario
      default: return null
    }
  })

  const totalPagesMov = Math.max(1, Math.ceil(sortedMovimientos.length / pageSizeMov))
  const paginatedMovimientos = sortedMovimientos.slice((currentPageMov - 1) * pageSizeMov, currentPageMov * pageSizeMov)

  useEffect(() => {
    setCurrentPageProductos(1)
  }, [filterCategoria, searchTerm, productSort.sortBy, productSort.sortDir, pageSizeProductos])

  useEffect(() => {
    setCurrentPageMov(1)
  }, [filterTipoMov, movSearchTerm, movFechaDesde, movFechaHasta, movSort.sortBy, movSort.sortDir, pageSizeMov])

  const resetProductoForm = () => {
    setProductoForm({
      codigo: '',
      categoria: '',
      nombre: '',
      minimo: '',
      cantidadCompra: '',
      precioPaquete: '',
      precioCompra: '',
    })
  }

  const fillProductoForm = (item) => {
    if (!item) {
      resetProductoForm()
      return
    }

    setProductoForm({
      codigo: item.codigo || '',
      categoria: item.categoria || '',
      nombre: item.nombre || '',
      minimo: String(item.minimo ?? ''),
      cantidadCompra: String(item.cantidad_compra ?? item.cantidadCompra ?? 1),
      precioPaquete: String(item.precio_paquete ?? item.precioPaquete ?? ''),
      precioCompra: String(item.costo_unitario ?? item.precio_compra ?? item.precioCompra ?? ''),
    })
  }

  const calcularCostoUnitario = (form = productoForm) => {
    const cantidadCompra = Number(form.cantidadCompra || 0)
    const precioPaquete = Number(form.precioPaquete || 0)

    if (cantidadCompra > 0 && precioPaquete >= 0) {
      return precioPaquete / cantidadCompra
    }

    return Number(form.precioCompra || 0)
  }

  const generarCodigoLibre = (categoria, prefix) => {
    const usados = new Set(
      productos
        .filter((p) => p.categoria === categoria)
        .map((p) => String(p.codigo || '').trim())
    )
    let numero = 1
    let codigo = ''
    do {
      codigo = `${prefix}-${numero.toString().padStart(3, '0')}`
      numero += 1
    } while (usados.has(codigo))
    return codigo
  }

  const loadProductos = async () => {
    const productosData = await listProductosInventario()
    setProductos(productosData)
  }

  const loadCategorias = async () => {
    try {
      const categoriasData = await listCategoriasInventario()
      if (categoriasData.length > 0) {
        setCategoriasInventario(categoriasData)
      }
    } catch {
      setCategoriasInventario(DEFAULT_CATEGORIAS)
    }
  }

  const loadTiposMovimiento = async () => {
    try {
      const tiposData = await listTiposMovimiento()
      if (tiposData.length > 0) {
        setTiposMovimiento(tiposData.map((tipo) => tipo.nombre))
      }
    } catch {
      setTiposMovimiento(DEFAULT_TIPOS_MOVIMIENTO)
    }
  }

  const loadMovimientos = async () => {
    const movimientosData = await listMovimientosInventario()
    setMovimientos(Array.isArray(movimientosData) ? movimientosData : [])
  }

  const loadProveedores = async () => {
    const proveedoresData = await listProveedoresInventario()
    setProveedores(Array.isArray(proveedoresData) ? proveedoresData : [])
  }

  const loadMotivosMerma = async () => {
    const motivos = await listMotivosMerma()
    setMotivosMerma(Array.isArray(motivos) ? motivos : [])
  }

  const resetMovimientoForm = (item = null) => {
    setMovimientoForm({
      productoId: item?.id ? String(item.id) : '',
      proveedorId: '',
      cantidad: '',
      motivo: '',
    })
  }

  const resetEntradaForm = (item = null) => {
    const currentUser = getCurrentUser()
    const nombreResponsable = currentUser?.nombre || currentUser?.username || 'Usuario actual'
    const rawDigits = String(item?.numero_factura || item?.numeroFactura || '').replace(/\D/g, '')

    setEntradaForm({
      fecha: new Date().toISOString().slice(0, 10),
      proveedorId: '',
      numeroFactura: rawDigits ? `Fac-${rawDigits}` : '',
      numeroFacturaOnlyDigits: rawDigits,
      responsable: nombreResponsable,
      fechaFactura: '',
      observaciones: '',
      documento: null,
      detalles: item?.id
        ? [{ productoId: String(item.id), unidad: item.unidad || 'unidad', cantidad: '', costoUnitario: String(item.precio_compra ?? item.costo_unitario ?? '') }]
        : [{ productoId: '', unidad: 'unidad', cantidad: '', costoUnitario: '' }],
    })
  }

  const resetProveedorForm = (item = null) => {
    setProveedorForm({
      nombre: item?.nombre || '',
      nit: item?.nit || '',
      telefono: item?.telefono || '',
      correo: item?.correo || '',
    })
  }

  useEffect(() => {
    let cancelled = false

    const cargarInventario = async () => {
      try {
        setErrorCarga('')
        setIsLoading(true)
        const [productosData, movimientosData, proveedoresData] = await Promise.all([
          listProductosInventario(),
          listMovimientosInventario(),
          listProveedoresInventario(),
        ])

        if (cancelled) {
          return
        }

        setProductos(productosData)
        setMovimientos(Array.isArray(movimientosData) ? movimientosData : [])
        setProveedores(Array.isArray(proveedoresData) ? proveedoresData : [])
      } catch (error) {
        if (!cancelled) {
          setProductos([])
          setMovimientos([])
          setProveedores([])
          setErrorCarga(error.message || 'No fue posible cargar inventario.')
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    cargarInventario()
    loadCategorias()
    loadTiposMovimiento()
    loadMotivosMerma().catch(() => setMotivosMerma([]))

    return () => {
      cancelled = true
    }
  }, [])

  const alertas = productos.filter(p => p.minimo > 0 && p.stock < p.minimo)
  const selectedMovimientoProducto = productos.find(
    (producto) => String(producto.id) === String(movimientoForm.productoId),
  )
  const costoUnitarioMerma = Number(
    selectedMovimientoProducto?.precio_compra
      ?? selectedMovimientoProducto?.costo_unitario
      ?? 0,
  )
  const cantidadMerma = Number(movimientoForm.cantidad || 0)
  const perdidaEconomicaMerma =
    modalType === 'merma' && !Number.isNaN(cantidadMerma)
      ? cantidadMerma * costoUnitarioMerma
      : 0

  const modalMaxWidth =
    modalType === 'entrada' ? 'max-w-4xl' :
    modalType === 'merma' ? 'max-w-2xl' :
    modalType === 'movement-view' ? 'max-w-2xl' :
    modalType === 'provider-add' || modalType === 'provider-edit' ? 'max-w-xl' :
    'max-w-2xl'

  const productoAsociado = useMemo(() => {
    if (!selectedItem) return null
    return (
      productos.find(
        (p) =>
          String(p.id) === String(selectedItem.productoId ?? selectedItem.producto_id) ||
          p.nombre === selectedItem.producto
      ) || null
    )
  }, [selectedItem, productos])

  const costoUnitarioEfectivo = useMemo(() => {
    if (!selectedItem) return 0
    const raw = Number(
      selectedItem.costoUnitario ??
      selectedItem.costo_unitario_movimiento ??
      selectedItem.costo_unitario ??
      0
    )
    if (raw > 0) return raw
    return Number(
      productoAsociado?.costo_unitario ??
      productoAsociado?.precio_compra ??
      0
    )
  }, [selectedItem, productoAsociado])

  const getCategoriaColor = (categoria) => {
    switch(categoria) {
      case 'Materia Prima': return 'bg-green-100 text-green-700'
      case 'Suministros': return 'bg-purple-100 text-purple-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  const getEstadoColor = (estado) => {
    switch(estado) {
      case 'critico': return 'bg-red-100 text-red-700 border-red-300'
      case 'bajo': return 'bg-yellow-100 text-yellow-700 border-yellow-300'
      case 'normal': return 'bg-green-100 text-green-700 border-green-300'
      default: return 'bg-gray-100 text-gray-700 border-gray-300'
    }
  }

  const getEstadoTexto = (stock, minimo) => {
    if (minimo <= 0) return { texto: 'Normal', estado: 'normal' }
    const porcentaje = (stock / minimo) * 100
    if (porcentaje < 50) return { texto: 'Crítico', estado: 'critico' }
    if (porcentaje < 100) return { texto: 'Bajo', estado: 'bajo' }
    return { texto: 'Normal', estado: 'normal' }
  }

  const categoriasReporte = useMemo(() => {
    const counts = {}
    productosVigentes.forEach((producto) => {
      const categoria = producto.categoria || 'Sin categoría'
      counts[categoria] = (counts[categoria] || 0) + 1
    })
    const options = Object.keys(counts).map((categoria) => ({
      value: categoria,
      label: categoria,
      count: counts[categoria],
    }))
    return [{ value: '', label: 'Todas', count: productosVigentes.length }, ...options]
  }, [productosVigentes])

  const handleGenerarReporteInventario = async (categoria = '') => {
    try {
      setGenerandoReporte(true)
      const rows = categoria
        ? productosVigentes.filter((producto) => (producto.categoria || '') === categoria)
        : productosVigentes

      const columns = [
        { key: 'codigo', label: 'CÓDIGO', width: 26, align: 'left' },
        { key: 'nombre', label: 'NOMBRE', width: 44, align: 'left' },
        { key: 'categoria', label: 'CATEGORÍA', width: 26, align: 'center' },
        { key: 'stock', label: 'STOCK', width: 18, align: 'center' },
        { key: 'minimo', label: 'MÍNIMO', width: 18, align: 'center' },
        { key: 'precio', label: 'PRECIO COMPRA', width: 28, align: 'center' },
        { key: 'estado', label: 'ESTADO', width: 26, align: 'center' },
      ]

      await generarReporteModulo({
        fileName: 'reporte_inventario.pdf',
        title: 'REPORTE DE INVENTARIO',
        columns,
        rows: rows.map((producto) => ({
          codigo: producto.codigo,
          nombre: producto.nombre,
          categoria: producto.categoria || '-',
          stock: String(producto.stock ?? 0),
          minimo: String(producto.minimo ?? 0),
          precio: `Q${Number(producto.precio_compra ?? producto.costo_unitario ?? 0).toFixed(2)}`,
          estado: getEstadoTexto(producto.stock, producto.minimo).texto,
        })),
        totalLabel: 'TOTAL DE ARTÍCULOS',
        totalValue: rows.length,
        filterLabel: categoria || 'Todas',
        note: 'Reporte del catálogo de artículos con su stock actual, mínimo y precio de compra.',
      })
      toast.success('Reporte de inventario generado correctamente.')
      setReporteOpen(false)
    } catch (error) {
      toast.error(error.message || 'No fue posible generar el reporte.')
    } finally {
      setGenerandoReporte(false)
    }
  }

  const handleOpenModal = (type, item = null) => {
    setErrorProducto('')
    setModalType(type)
    setSelectedItem(item)

    if (type === 'add') {
      resetProductoForm()
    }

    if (type === 'edit') {
      fillProductoForm(item)
    }

    if (type === 'view') {
      fillProductoForm(item)
    }

    if (type === 'provider-add') {
      resetProveedorForm()
    }

    if (type === 'provider-edit' || type === 'provider-view') {
      resetProveedorForm(item)
    }

    if (type === 'salida' || type === 'merma') {
      resetMovimientoForm(item)
    }
    if (type === 'merma') {
      setMermaForm({ fecha: new Date().toISOString().slice(0, 10), motivoTipo: '', evidencia: null })
    }

    if (type === 'entrada') {
      resetEntradaForm(item)
    }

    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setSelectedItem(null)
    setModalType('')
    setErrorProducto('')
    setProveedorError('')
    resetMovimientoForm()
    resetEntradaForm()
    setMermaForm({ fecha: new Date().toISOString().slice(0, 10), motivoTipo: '', evidencia: null })
  }

const limitDigits = (value, maxIntegerDigits = 6, maxDecimalDigits = 2) => {
  if (value === '' || value === null || value === undefined) return ''
  const str = String(value)
  const clean = str.replace(/[^0-9.]/g, '')
  const parts = clean.split('.')
  const integerPart = parts[0].slice(0, maxIntegerDigits)
  if (parts.length > 1) {
    const decimalPart = parts.slice(1).join('').slice(0, maxDecimalDigits)
    return `${integerPart}.${decimalPart}`
  }
  return integerPart
}

  const handleProductoFormChange = (field, value) => {
    const updated = { ...productoForm, [field]: value }

    if (field === 'nombre') {
      // Permitir letras, números, espacios y caracteres comunes en nombres de insumos/productos
      let clean = value.replace(/[^A-Za-z0-9ÁÉÍÓÚáéíóúÑñÜü\s\.\-\/()#\,]/g, '')
      if (clean.startsWith(' ')) {
        clean = clean.trimStart()
      }
      updated.nombre = clean.slice(0, 100)
    }

    if (field === 'cantidadCompra') {
      updated.cantidadCompra = limitDigits(value, 6, 2)
    }

    if (field === 'precioPaquete') {
      updated.precioPaquete = limitDigits(value, 6, 2)
    }

    if (field === 'minimo') {
      updated.minimo = limitDigits(value, 6, 2)
    }

    if (field === 'cantidadCompra' || field === 'precioPaquete') {
      updated.precioCompra = String(calcularCostoUnitario(updated) || '')
    }
    
    // Auto-generar código cuando cambia la categoría
    if (field === 'categoria' && value) {
      const prefix = categoriasInventario.find((categoria) => categoria.nombre === value)?.codigo || 'GEN'
      updated.codigo = generarCodigoLibre(value, prefix)
    }

    setProductoForm(updated)
  }

  const handleSubmitProducto = async (event) => {
    event.preventDefault()
    setErrorProducto('')

    if (!productoForm.categoria.trim()) {
      setErrorProducto('Campo vacío: Categoría.')
      return
    }

    if (!productoForm.nombre.trim()) {
      setErrorProducto('Campo vacío: Nombre del Producto.')
      return
    }

    setIsSavingProducto(true)

    try {
      // Generar código si no existe
      let codigo = productoForm.codigo
      if (!codigo && productoForm.categoria) {
        const prefix = categoriasInventario.find((categoria) => categoria.nombre === productoForm.categoria)?.codigo || 'GEN'
        codigo = generarCodigoLibre(productoForm.categoria, prefix)
      }

      const payload = {
        codigo,
        nombre: productoForm.nombre.trim().replace(/\s+/g, ' '),
        categoria: productoForm.categoria,
        minimo: productoForm.minimo === '' ? null : Number(productoForm.minimo),
        cantidadCompra: productoForm.cantidadCompra === '' ? null : Number(productoForm.cantidadCompra),
        precioPaquete: productoForm.precioPaquete === '' ? null : Number(productoForm.precioPaquete),
        precioCompra: calcularCostoUnitario(productoForm),
      }

      if (modalType === 'add') {
        await createProductoInventario(payload)
      } else if (modalType === 'edit' && selectedItem?.id) {
        await updateProductoInventario(selectedItem.id, payload)
      }

      await loadProductos()
      const msg = modalType === 'add' ? 'Producto creado correctamente.' : 'Producto actualizado correctamente.'
      handleCloseModal()
      setSuccessMessage(msg)
    } catch (error) {
      setErrorProducto(error.message || 'No fue posible guardar el producto.')
    } finally {
      setIsSavingProducto(false)
    }
  }

  const handleMovimientoFormChange = (field, value) => {
    setMovimientoForm((previous) => ({
      ...previous,
      [field]: value,
    }))
  }

  const handleEntradaDetailChange = (index, field, value) => {
    setEntradaForm((previous) => ({
      ...previous,
      detalles: previous.detalles.map((detalle, detailIndex) => {
        if (detailIndex !== index) return detalle
        const updated = { ...detalle, [field]: value }
        if (field === 'productoId') {
          const producto = productos.find((item) => String(item.id) === String(value))
          updated.unidad = producto?.unidad || 'unidad'
          updated.costoUnitario = producto
            ? String(producto.precio_compra ?? producto.costo_unitario ?? '')
            : ''
        }
        return updated
      }),
    }))
  }

  const handleSubmitEntrada = async (event, confirmar = false) => {
    event.preventDefault()
    setErrorProducto('')
    setIsSavingMovimiento(true)
    try {
      const rawDigits = String(entradaForm.numeroFacturaOnlyDigits || entradaForm.numeroFactura || '').replace(/\D/g, '')
      if (!rawDigits) {
        throw new Error('El número de factura es obligatorio (ingresa solo números).')
      }
      if (entradaForm.detalles.some((detalle) => !detalle.productoId || Number(detalle.cantidad) <= 0 || Number(detalle.costoUnitario) < 0)) {
        throw new Error('Completa producto, cantidad y costo de cada fila.')
      }
      const formattedFactura = `Fac-${rawDigits}`
      const currentUser = getCurrentUser()
      const responsableFinal = entradaForm.responsable || currentUser?.nombre || currentUser?.username || 'Usuario actual'

      const documentoPath = await uploadEntradaInventarioDocumento(entradaForm.documento)
      await createEntradaInventario({
        fecha: entradaForm.fecha,
        proveedorId: entradaForm.proveedorId ? Number(entradaForm.proveedorId) : null,
        numeroFactura: formattedFactura,
        responsable: responsableFinal,
        fechaFactura: entradaForm.fechaFactura || null,
        observaciones: entradaForm.observaciones,
        documentoPath,
        estado: confirmar ? 'Confirmada' : 'Borrador',
        detalles: entradaForm.detalles.map((detalle) => ({
          productoId: Number(detalle.productoId),
          unidad: detalle.unidad,
          cantidad: Number(detalle.cantidad),
          costoUnitario: Number(detalle.costoUnitario),
        })),
      })
      if (confirmar) await Promise.all([loadProductos(), loadMovimientos()])
      handleCloseModal()
      setSuccessMessage(confirmar ? 'Entrada confirmada correctamente.' : 'Entrada guardada como borrador.')
    } catch (error) {
      setErrorProducto(error.message || 'No fue posible guardar la entrada.')
    } finally {
      setIsSavingMovimiento(false)
    }
  }

  const handleSubmitMovimiento = async (event) => {
    event.preventDefault()
    setErrorProducto('')
    setIsSavingMovimiento(true)

    try {
      const tipo =
        tiposMovimiento.find((nombre) => nombre.toLowerCase() === modalType) || ''

      if (!tipo) {
        throw new Error('Tipo de movimiento no válido.')
      }

      const cantidad = Number(movimientoForm.cantidad || 0)

      if (Number.isNaN(cantidad) || cantidad <= 0) {
        throw new Error('La cantidad debe ser mayor a 0.')
      }

      if ((modalType === 'salida' || modalType === 'merma') && selectedMovimientoProducto) {
        const stockActual = Number(selectedMovimientoProducto.stock || 0)
        if (cantidad > stockActual) {
          throw new Error(`Stock insuficiente. Disponible: ${stockActual}.`)
        }
      }

      const payload = {
        productoId: Number(movimientoForm.productoId || 0),
        proveedorId: modalType === 'entrada' ? Number(movimientoForm.proveedorId || 0) || null : null,
        tipo,
        cantidad,
        motivo: movimientoForm.motivo,
      }

      if (modalType === 'merma') {
        if (!mermaForm.motivoTipo) throw new Error('Selecciona el motivo de la merma.')
        if (!mermaForm.evidencia && motivosMerma.find((motivo) => String(motivo.id) === String(mermaForm.motivoTipo))?.codigo === 'OTRO' && !movimientoForm.motivo.trim()) {
          throw new Error('Describe la merma en las observaciones.')
        }
        payload.motivoTipo = motivosMerma.find((motivo) => String(motivo.id) === String(mermaForm.motivoTipo))?.nombre || ''
        payload.motivoMermaId = Number(mermaForm.motivoTipo)
        payload.fecha = mermaForm.fecha
        payload.documentoPath = await uploadEntradaInventarioDocumento(mermaForm.evidencia)
      }

      await createMovimientoInventario(payload)
      await Promise.all([loadProductos(), loadMovimientos()])
      handleCloseModal()
      setSuccessMessage(modalType === 'merma' ? 'Merma registrada correctamente.' : 'Movimiento registrado correctamente.')
    } catch (error) {
      setErrorProducto(error.message || 'No fue posible registrar el movimiento.')
    } finally {
      setIsSavingMovimiento(false)
    }
  }

  const handleSubmitProveedor = async (event) => {
      event.preventDefault()
      setProveedorError('')

      if (!proveedorForm.nombre.trim()) {
        setProveedorError('El nombre del proveedor es obligatorio.')
        return
      }

      if (proveedorForm.nit && !/^[a-zA-Z0-9]{1,13}$/.test(proveedorForm.nit)) {
        setProveedorError('El NIT debe contener únicamente letras y números, con un máximo de 13 caracteres.')
        return
      }

      if (proveedorForm.telefono && !/^\d{1,8}$/.test(proveedorForm.telefono)) {
        setProveedorError('El teléfono debe contener únicamente números, con un máximo de 8 dígitos.')
        return
      }

      setIsSavingProveedor(true)
      try {
        if (modalType === 'provider-add') {
          await createProveedorInventario(proveedorForm)
        } else {
          await updateProveedorInventario(selectedItem.id, proveedorForm)
        }
        await loadProveedores()
        handleCloseModal()
        setSuccessMessage(modalType === 'provider-add' ? 'Proveedor creado correctamente.' : 'Proveedor actualizado correctamente.')
      } catch (error) {
        setProveedorError(error.message || 'No fue posible guardar el proveedor.')
      } finally {
        setIsSavingProveedor(false)
      }
    }

  const handleSaveQuickProveedor = async (e) => {
    if (e) e.preventDefault()
    setQuickProveedorError('')

    const nombre = quickProveedorForm.nombre.trim()
    if (!nombre) {
      setQuickProveedorError('El nombre del proveedor es obligatorio.')
      return
    }

    if (quickProveedorForm.nit && !/^[a-zA-Z0-9]{1,13}$/.test(quickProveedorForm.nit.trim())) {
      setQuickProveedorError('El NIT debe contener únicamente letras y números, con un máximo de 13 caracteres.')
      return
    }

    if (quickProveedorForm.telefono && !/^\d{1,8}$/.test(quickProveedorForm.telefono.trim())) {
      setQuickProveedorError('El teléfono debe contener únicamente números, con un máximo de 8 dígitos.')
      return
    }

    setIsSavingQuickProveedor(true)
    try {
      const created = await createProveedorInventario({
        nombre,
        nit: quickProveedorForm.nit.trim() || undefined,
        telefono: quickProveedorForm.telefono.trim() || undefined,
        correo: quickProveedorForm.correo.trim() || undefined,
      })

      await loadProveedores()

      if (created?.id) {
        setEntradaForm((prev) => ({ ...prev, proveedorId: String(created.id) }))
      }

      setQuickProveedorForm({ nombre: '', nit: '', telefono: '', correo: '' })
      setShowQuickProveedorModal(false)
      toast.success(`Proveedor "${created?.nombre || nombre}" registrado y seleccionado correctamente.`)
    } catch (error) {
      setQuickProveedorError(error.message || 'No fue posible registrar el proveedor.')
    } finally {
      setIsSavingQuickProveedor(false)
    }
  }

  const handleDeleteProveedor = async (item) => {
      if (!item?.id) return
      try {
        await deleteProveedorInventario(item.id)
        await loadProveedores()
        setSuccessMessage('Proveedor desactivado correctamente.')
      } catch (error) {
        toast.error(error.message || 'No fue posible desactivar el proveedor.')
    }
  }

  const handleDeleteProducto = async (item) => {
    if (!item?.id) {
      return
    }

    setIsDeleting(true)
    try {
      await deleteProductoInventario(item.id)
      await loadProductos()
      setSuccessMessage('Producto eliminado correctamente.')
    } catch (error) {
      toast.error(error.message || 'No fue posible eliminar el producto.')
    } finally {
      setIsDeleting(false)
      setDeleteItem(null)
    }
  }

  return (
    <div>
      {/* Tabs de navegación */}
      <div className="bg-white rounded-xl shadow-md mb-6 overflow-hidden">
        <div className="flex border-b border-gray-200 overflow-x-auto scrollbar-none touch-scroll whitespace-nowrap">
          <button
            onClick={() => setActiveTab('catalogo')}
            className={`px-4 sm:px-6 py-3.5 sm:py-4 font-semibold text-xs sm:text-sm md:text-base transition-colors shrink-0 flex items-center gap-2 ${
              activeTab === 'catalogo'
                ? 'border-b-4 border-cyan-500 text-cyan-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <Package size={18} aria-hidden="true" />
            Catálogo de Artículos
          </button>
          <button
            onClick={() => setActiveTab('movimientos')}
            className={`px-4 sm:px-6 py-3.5 sm:py-4 font-semibold text-xs sm:text-sm md:text-base transition-colors shrink-0 flex items-center gap-2 ${
              activeTab === 'movimientos'
                ? 'border-b-4 border-cyan-500 text-cyan-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <ClipboardList size={18} aria-hidden="true" />
            Movimientos de Bodega
          </button>
          <button
            onClick={() => setActiveTab('proveedores')}
            className={`px-4 sm:px-6 py-3.5 sm:py-4 font-semibold text-xs sm:text-sm md:text-base transition-colors shrink-0 flex items-center gap-2 ${
              activeTab === 'proveedores'
                ? 'border-b-4 border-cyan-500 text-cyan-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <ClipboardList size={18} aria-hidden="true" />
            Proveedores
          </button>
          <button
            onClick={() => setActiveTab('alertas')}
            className={`px-4 sm:px-6 py-3.5 sm:py-4 font-semibold text-xs sm:text-sm md:text-base transition-colors relative shrink-0 flex items-center gap-2 ${
              activeTab === 'alertas'
                ? 'border-b-4 border-cyan-500 text-cyan-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <Bell size={18} aria-hidden="true" />
            Alertas de Reabastecimiento
            {alertas.length > 0 && (
              <span className="ml-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                {alertas.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Contenido del Tab - Catálogo */}
      {activeTab === 'catalogo' && (
        <>
          {errorCarga && (
            <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorCarga}
            </div>
          )}

          {/* Header */}
          <ModuleHeader title="Cat&#225;logo de Art&#237;culos" description="Control de productos, materia prima y suministros" eyebrow="Inventario" icon={Package}>
            <div className="flex flex-wrap gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setReporteOpen(true)}
                className="flex-1 sm:flex-initial bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-3 sm:px-5 py-2.5 sm:py-3 rounded-lg hover:from-indigo-600 hover:to-purple-700 transition-all duration-200 shadow-md font-medium text-xs sm:text-sm flex items-center justify-center space-x-1.5"
              >
                <FileDown size={17} aria-hidden="true" />
                <span>Reporte</span>
              </button>
              <button
                onClick={() => handleOpenModal('add')}
                className="flex-1 sm:flex-initial bg-gradient-to-r from-cyan-500 to-blue-600 text-white px-3 sm:px-5 py-2.5 sm:py-3 rounded-lg hover:from-cyan-600 hover:to-blue-700 transition-all duration-200 shadow-md hover:shadow-lg font-medium text-xs sm:text-sm flex items-center justify-center space-x-1.5"
              >
                <Plus size={17} aria-hidden="true" />
                <span>Nuevo Artículo</span>
              </button>
              <button
                onClick={loadProductos}
                className="flex-1 sm:flex-initial bg-gray-300 text-gray-700 px-3 sm:px-5 py-2.5 sm:py-3 rounded-lg hover:bg-gray-400 transition-all duration-200 shadow-md font-medium text-xs sm:text-sm flex items-center justify-center space-x-1.5"
              >
                <RefreshCw size={17} aria-hidden="true" />
                <span>Recargar</span>
              </button>
            </div>
          </ModuleHeader>

          {/* Estadísticas y filtros */}
            <div className="dashboard-kpis grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-5 mb-6">
              {[
                { label: 'Inventario Total', value: String(productosVigentes.length), change: 'Productos activos', tone: 'blue', icon: Package },
                { label: 'Stock Bajo', value: String(alertas.length), change: 'Requieren reposición', tone: 'orange', icon: AlertTriangle, negative: alertas.length > 0 },
                { label: 'Materia Prima', value: String(productosVigentes.filter((p) => p.categoria === 'Materia Prima').length), change: 'Directa a producción', tone: 'green', icon: ArrowDownToLine },
                { label: 'Suministros', value: String(productosVigentes.filter((p) => p.categoria === 'Suministros').length), change: 'Uso operativo', tone: 'purple', icon: Bell },
              ].map((metric) => {
                const MetricIcon = metric.icon

                return (
                  <div key={metric.label} className={`dashboard-kpi dashboard-tone-${metric.tone}`}>
                    <div className="dashboard-kpi-icon"><MetricIcon size={25} strokeWidth={2.2} /></div>
                    <div className="min-w-0">
                      <p className="dashboard-kpi-label">{metric.label}</p>
                      <p className="dashboard-kpi-value">{metric.value}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className={`dashboard-kpi-change ${metric.negative ? 'is-negative' : ''}`}>{metric.change}</span>
                      </div>
                    </div>
                    <div className="dashboard-sparkline" aria-hidden="true" />
                  </div>
                )
              })}
            </div>

          {/* Búsqueda y filtros */}
          <div className="bg-white rounded-xl shadow-md p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Buscar artículo</label>
                <input
                  type="text"
                  placeholder="Buscar por código o nombre..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Filtrar por categoría</label>
                <select
                  value={filterCategoria}
                  onChange={(e) => setFilterCategoria(e.target.value)}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent"
                >
                  <option value="todos">Todas las categorías</option>
                  {categoriasInventario.map((categoria) => (
                    <option key={categoria.codigo} value={categoria.nombre}>
                      {categoria.nombre}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {(searchTerm || filterCategoria !== 'todos') && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('')
                  setFilterCategoria('todos')
                  productSort.setSortBy(null)
                }}
                className="mt-4 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm inline-flex items-center gap-2"
              >
                Limpiar
              </button>
            )}
          </div>

          {/* Tabla de productos */}
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <div className="overflow-x-auto touch-scroll">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase"><SortableHeader label="Código" sortKey="codigo" sortBy={productSort.sortBy} sortDir={productSort.sortDir} onSort={productSort.toggle} className="text-gray-700" /></th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase"><SortableHeader label="Producto" sortKey="nombre" sortBy={productSort.sortBy} sortDir={productSort.sortDir} onSort={productSort.toggle} className="text-gray-700" /></th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase"><SortableHeader label="Categoría" sortKey="categoria" sortBy={productSort.sortBy} sortDir={productSort.sortDir} onSort={productSort.toggle} className="text-gray-700" /></th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase"><SortableHeader label="Stock" sortKey="stock" sortBy={productSort.sortBy} sortDir={productSort.sortDir} onSort={productSort.toggle} align="right" className="text-gray-700" /></th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase"><SortableHeader label="Mínimo" sortKey="minimo" sortBy={productSort.sortBy} sortDir={productSort.sortDir} onSort={productSort.toggle} align="right" className="text-gray-700" /></th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase"><SortableHeader label="Precio Compra" sortKey="precio" sortBy={productSort.sortBy} sortDir={productSort.sortDir} onSort={productSort.toggle} align="right" className="text-gray-700" /></th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase">Estado</th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {paginatedProductos.map((producto) => {
                    const estadoInfo = getEstadoTexto(producto.stock, producto.minimo)
                    return (
                      <tr key={producto.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <span className="font-mono text-sm font-semibold text-gray-700">{producto.codigo}</span>
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-semibold text-gray-800">{producto.nombre}</p>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${getCategoriaColor(producto.categoria)}`}>
                            {producto.categoria}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className={`font-bold ${estadoInfo.estado === 'critico' ? 'text-red-600' : estadoInfo.estado === 'bajo' ? 'text-yellow-600' : 'text-gray-800'}`}>
                            {producto.stock}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right text-gray-600">{producto.minimo}</td>
                        <td className="px-6 py-4 text-right text-gray-800 font-medium">Q{Number(producto.precio_compra ?? producto.costo_unitario ?? 0).toFixed(2)}</td>
                        <td className="px-6 py-4">
                          <div className="flex justify-center">
                            <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold border-2 ${getEstadoColor(estadoInfo.estado)}`}>
                              {estadoInfo.texto}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center space-x-2">
                            <button
                              onClick={() => handleOpenModal('view', producto)}
                              className="bg-gray-100 text-gray-600 p-2 rounded-lg hover:bg-gray-200 transition-colors"
                              title="Ver"
                            >
                              <Eye size={16} aria-hidden="true" />
                            </button>
                            <button
                              onClick={() => handleOpenModal('edit', producto)}
                              className="bg-blue-100 text-blue-600 p-2 rounded-lg hover:bg-blue-200 transition-colors"
                              title="Editar"
                            >
                              <Pencil size={16} aria-hidden="true" />
                            </button>
                            <button
                              onClick={() => setDeleteItem(producto)}
                              className="bg-red-100 text-red-600 p-2 rounded-lg hover:bg-red-200 transition-colors"
                              title="Eliminar"
                            >
                              <Trash2 size={16} aria-hidden="true" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                  {isLoading && (
                    <tr>
                      <td colSpan="8" className="px-6 py-10 text-center text-sm text-gray-500">
                        Cargando artículos...
                      </td>
                    </tr>
                  )}
                  {!isLoading && filteredProductos.length === 0 && (
                    <tr>
                      <td colSpan="8" className="px-6 py-10 text-center text-sm text-gray-500">
                        No hay artículos registrados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <Pagination
              page={currentPageProductos}
              totalPages={totalPagesProductos}
              onChange={setCurrentPageProductos}
              pageSize={pageSizeProductos}
              onPageSizeChange={setPageSizeProductos}
              totalItems={sortedProductos.length}
            />
          </div>
        </>
      )}

      {/* Contenido del Tab - Movimientos */}
      {activeTab === 'movimientos' && (
        <>
          <div className="relative isolate overflow-hidden rounded-2xl sm:rounded-3xl border border-cyan-200 bg-gradient-to-br from-cyan-100 via-sky-50 to-blue-100 p-4 shadow-sm sm:p-7">
            <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mb-4">Movimientos de Bodega</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
              <button
                onClick={() => handleOpenModal('entrada')}
                className="bg-gradient-to-br from-green-50 to-green-100 p-4 sm:p-6 rounded-xl hover:from-green-100 hover:to-green-200 transition-all text-center border-2 border-green-200 shadow-xs"
              >
                <ArrowDownToLine size={28} aria-hidden="true" className="mx-auto mb-2 text-green-700" />
                <p className="font-semibold text-gray-800 text-sm sm:text-base">Registro de Entrada</p>
              </button>
              <button
                onClick={() => handleOpenModal('merma')}
                className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 sm:p-6 rounded-xl hover:from-orange-100 hover:to-orange-200 transition-all text-center border-2 border-orange-200 shadow-xs"
              >
                <TriangleAlert size={28} aria-hidden="true" className="mx-auto mb-2 text-orange-600" />
                <p className="font-semibold text-gray-800 text-sm sm:text-base">Gestión de Mermas</p>
              </button>
              <button
                type="button"
                onClick={() => handleOpenModal('auditoria')}
                className="bg-gradient-to-br from-cyan-50 to-blue-100 p-4 sm:p-6 rounded-xl hover:from-cyan-100 hover:to-blue-200 transition-all text-center border-2 border-cyan-200 shadow-xs sm:col-span-2 md:col-span-1"
              >
                <ClipboardCheck size={28} aria-hidden="true" className="mx-auto mb-2 text-cyan-700" />
                <p className="font-semibold text-gray-800 text-sm sm:text-base">Auditoría de Inventario</p>
              </button>
            </div>
          </div>

          {/* Historial de movimientos */}
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h4 className="text-lg font-bold text-gray-800">Historial de Movimientos</h4>
              <p className="text-sm text-gray-500 mt-1">{filteredMovimientos.length} movimientos registrados</p>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-4">
                <div className="md:col-span-2">
                  <input
                    type="text"
                    placeholder="Buscar por producto o motivo..."
                    value={movSearchTerm}
                    onChange={(e) => setMovSearchTerm(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-sm"
                  />
                </div>
                <div>
                  <select
                    value={filterTipoMov}
                    onChange={(e) => setFilterTipoMov(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 text-sm"
                  >
                    <option value="todos">Todos los tipos</option>
                    {Array.from(new Set(['Entrada', 'Salida', 'Merma', 'Ajuste', ...tiposMovimiento])).map((tipo) => (
                      <option key={tipo} value={tipo}>{tipo}</option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={movFechaDesde}
                    onChange={(e) => setMovFechaDesde(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 text-sm"
                    title="Desde"
                  />
                  <input
                    type="date"
                    value={movFechaHasta}
                    onChange={(e) => setMovFechaHasta(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 text-sm"
                    title="Hasta"
                  />
                </div>
              </div>
              {(movSearchTerm || filterTipoMov !== 'todos' || movFechaDesde || movFechaHasta) && (
                <button
                  type="button"
                  onClick={() => {
                    setMovSearchTerm('')
                    setFilterTipoMov('todos')
                    setMovFechaDesde('')
                    setMovFechaHasta('')
                    movSort.setSortBy(null)
                  }}
                  className="mt-3 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm whitespace-nowrap"
                >
                  Limpiar filtros
                </button>
              )}

            </div>
            <div className="overflow-x-auto touch-scroll">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase"><SortableHeader label="Fecha/Hora" sortKey="fecha" sortBy={movSort.sortBy} sortDir={movSort.sortDir} onSort={movSort.toggle} className="text-gray-700" /></th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase"><SortableHeader label="Tipo" sortKey="tipo" sortBy={movSort.sortBy} sortDir={movSort.sortDir} onSort={movSort.toggle} className="text-gray-700" /></th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase"><SortableHeader label="Producto" sortKey="producto" sortBy={movSort.sortBy} sortDir={movSort.sortDir} onSort={movSort.toggle} className="text-gray-700" /></th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase"><SortableHeader label="Cantidad" sortKey="cantidad" sortBy={movSort.sortBy} sortDir={movSort.sortDir} onSort={movSort.toggle} align="right" className="text-gray-700" /></th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase">Pérdida</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase">Stock final</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase"><SortableHeader label="Usuario" sortKey="usuario" sortBy={movSort.sortBy} sortDir={movSort.sortDir} onSort={movSort.toggle} className="text-gray-700" /></th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Motivo</th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {paginatedMovimientos.map((mov) => (
                    <tr key={mov.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-600">{mov.fecha}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${
                          mov.tipo === 'Entrada' ? 'bg-green-100 text-green-700' :
                          mov.tipo === 'Salida' ? 'bg-red-100 text-red-700' :
                          mov.tipo === 'Merma' ? 'bg-orange-100 text-orange-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {mov.tipo}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-medium text-gray-800">{mov.producto}</td>
                      <td className="px-6 py-4 text-right font-semibold">{mov.cantidad}</td>
                      <td className="px-6 py-4 text-right text-sm">{mov.tipo === 'Merma' ? `Q${mov.perdidaEconomica.toFixed(2)}` : '—'}</td>
                      <td className="px-6 py-4 text-right text-sm">{mov.stockDespues ?? '—'}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{mov.usuario}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{mov.motivo}</td>
                      <td className="px-6 py-4 text-center">

                          <button
                            type="button"
                            onClick={() => handleOpenModal('movement-view', mov)}
                            className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-cyan-700 hover:bg-cyan-50 dark:text-cyan-400 dark:hover:bg-cyan-950/40 transition-colors"
                            title={`Ver detalle de ${mov.tipo?.toLowerCase() || 'movimiento'}`}
                          >
                            <Eye size={16} aria-hidden="true" />
                            Ver
                          </button>

                      </td>
                    </tr>
                  ))}
                  {movimientos.length === 0 && (
                    <tr>
                      <td colSpan="9" className="px-6 py-10 text-center text-sm text-gray-500">
                        No hay movimientos registrados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <Pagination
              page={currentPageMov}
              totalPages={totalPagesMov}
              onChange={setCurrentPageMov}
              pageSize={pageSizeMov}
              onPageSizeChange={setPageSizeMov}
              totalItems={sortedMovimientos.length}
            />
          </div>
        </>
      )}

      {/* Contenido del Tab - Proveedores */}
      {activeTab === 'proveedores' && (
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="relative isolate overflow-hidden border-b border-cyan-200 bg-gradient-to-r from-cyan-100 via-sky-50 to-blue-100 p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h3 className="text-2xl font-bold text-gray-800">Proveedores</h3>
              <p className="text-sm text-gray-600 mt-1">Registra a quién se compra para seleccionar el proveedor en cada Entrada.</p>
            </div>
            <button
              type="button"
              onClick={() => handleOpenModal('provider-add')}
              className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white px-5 py-3 rounded-lg shadow-md font-medium"
            >
              <Plus size={18} aria-hidden="true" />
              Nuevo proveedor
            </button>
          </div>
          <div className="overflow-x-auto touch-scroll">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase">Código</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase">Proveedor</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase">Teléfono</th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-gray-600 uppercase">Estado</th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-gray-600 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {proveedores.map((proveedor) => (
                  <tr key={proveedor.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-mono text-sm text-gray-700">{proveedor.codigo}</td>
                    <td className="px-6 py-4">
                      <p className="font-semibold text-gray-800">{proveedor.nombre}</p>
                      {proveedor.nit && <p className="text-xs text-gray-500">NIT: {proveedor.nit}</p>}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{proveedor.telefono || '-'}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${proveedor.activo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {proveedor.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button type="button" onClick={() => handleOpenModal('provider-edit', proveedor)} className="bg-blue-100 text-blue-600 p-2 rounded-lg hover:bg-blue-200 transition-colors" title="Editar">
                          <Pencil size={16} aria-hidden="true" />
                        </button>
                        {proveedor.activo && (
                          <button type="button" onClick={() => handleDeleteProveedor(proveedor)} className="bg-red-100 text-red-600 p-2 rounded-lg hover:bg-red-200 transition-colors" title="Desactivar">
                            <Trash2 size={16} aria-hidden="true" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {proveedores.length === 0 && (
                  <tr><td colSpan="5" className="px-6 py-10 text-center text-sm text-gray-500">No hay proveedores registrados.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Contenido del Tab - Alertas */}
      {activeTab === 'alertas' && (
        <div className="space-y-4">
          <div className="relative isolate overflow-hidden rounded-3xl border border-cyan-200 bg-gradient-to-br from-cyan-100 via-sky-50 to-blue-100 p-6 text-slate-900 shadow-sm mb-6">
            <h3 className="text-2xl font-bold text-slate-900 mb-2 flex items-center gap-2"><Bell size={24} aria-hidden="true" />Alertas de Reabastecimiento</h3>
            <p>Productos que requieren atención inmediata por bajo stock</p>
          </div>

          {alertas.length === 0 ? (
            <div className="bg-white rounded-xl shadow-md p-12 text-center">
              <CheckCircle size={56} aria-hidden="true" className="mx-auto mb-4 text-green-500" />
              <h3 className="text-2xl font-bold text-gray-800 mb-2">Todo en orden</h3>
              <p className="text-gray-600">No hay productos con stock bajo en este momento</p>
            </div>
          ) : (
            alertas.map((producto) => {
              const porcentaje = (producto.stock / producto.minimo) * 100
              const criticidad = porcentaje < 50 ? 'crítico' : 'bajo'
              
              return (
                <div key={producto.id} className={`bg-white rounded-xl shadow-md p-4 sm:p-6 border-l-8 ${
                  criticidad === 'crítico' ? 'border-red-500' : 'border-yellow-500'
                }`}>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-3 mb-2">
                        {criticidad === 'crítico' ? (
                          <TriangleAlert size={28} aria-hidden="true" className="text-red-500 shrink-0" />
                        ) : (
                          <AlertTriangle size={28} aria-hidden="true" className="text-yellow-500 shrink-0" />
                        )}

                        <div className="min-w-0">
                          <h4 className="text-base sm:text-lg font-bold text-gray-800 truncate">{producto.nombre}</h4>
                          <p className="text-xs sm:text-sm text-gray-600">Código: {producto.codigo}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-4">
                        <div>
                          <p className="text-xs text-gray-600 mb-1">Stock Actual</p>
                          <p className={`text-xl sm:text-2xl font-bold ${criticidad === 'crítico' ? 'text-red-600' : 'text-yellow-600'}`}>
                            {producto.stock}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600 mb-1">Stock Mínimo</p>
                          <p className="text-xl sm:text-2xl font-bold text-gray-800">{producto.minimo}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600 mb-1">Faltante</p>
                          <p className="text-xl sm:text-2xl font-bold text-gray-800">{producto.minimo - producto.stock}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600 mb-1">Nivel</p>
                          <p className={`text-xl sm:text-2xl font-bold ${criticidad === 'crítico' ? 'text-red-600' : 'text-yellow-600'}`}>
                            {porcentaje.toFixed(0)}%
                          </p>
                        </div>
                      </div>
                      <div className="mt-4 bg-gray-200 rounded-full h-2.5 sm:h-3 overflow-hidden">
                        <div 
                          className={`h-full transition-all ${criticidad === 'crítico' ? 'bg-red-500' : 'bg-yellow-500'}`}
                          style={{ width: `${Math.min(porcentaje, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                    <div className="sm:ml-6 mt-2 sm:mt-0 flex justify-end w-full sm:w-auto">
                      <button
                        onClick={() => handleOpenModal('entrada', producto)}
                        className="w-full sm:w-auto bg-gradient-to-r from-cyan-500 to-blue-600 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg hover:from-cyan-600 hover:to-blue-700 transition-all shadow-md font-medium text-xs sm:text-sm text-center"
                      >
                        Registrar Entrada
                      </button>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}


      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4 animate-in fade-in duration-200">
          <div className={`bg-white dark:bg-slate-900 rounded-2xl shadow-2xl ${modalMaxWidth} w-full max-h-[92vh] flex flex-col border border-gray-100 dark:border-slate-800 transition-all overflow-hidden`}>
            {/* Header del Modal */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-10">
              <div className="flex items-center gap-3.5">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm ${
                  modalType === 'entrada' ? 'bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-cyan-500/20' :
                  modalType === 'merma' ? 'bg-gradient-to-br from-amber-500 to-rose-600 text-white shadow-amber-500/20' :
                  modalType === 'movement-view' && selectedItem?.tipo === 'Merma' ? 'bg-gradient-to-br from-amber-500 to-rose-600 text-white shadow-amber-500/20' :
                  modalType === 'movement-view' && selectedItem?.tipo === 'Entrada' ? 'bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-cyan-500/20' :
                  modalType === 'movement-view' ? 'bg-gradient-to-br from-slate-600 to-slate-800 text-white shadow-slate-500/20' :
                  modalType === 'add' ? 'bg-gradient-to-br from-cyan-500 to-blue-600 text-white' :
                  modalType === 'edit' ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white' :
                  modalType === 'view' ? 'bg-gradient-to-br from-slate-500 to-slate-700 text-white' :
                  'bg-gradient-to-br from-cyan-500 to-blue-600 text-white'
                }`}>
                  {modalType === 'entrada' && <PackagePlus size={22} />}
                  {modalType === 'merma' && <PackageMinus size={22} />}
                  {modalType === 'movement-view' && (
                    selectedItem?.tipo === 'Merma' ? <TriangleAlert size={22} /> :
                    selectedItem?.tipo === 'Entrada' ? <ArrowDownToLine size={22} /> :
                    <Eye size={22} />
                  )}
                  {modalType === 'add' && <Plus size={22} />}
                  {modalType === 'edit' && <Pencil size={22} />}
                  {modalType === 'view' && <Eye size={22} />}
                  {modalType === 'provider-add' && <Building2 size={22} />}
                  {modalType === 'provider-edit' && <Building2 size={22} />}
                </div>
                <div>
                  <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 leading-tight">
                    {modalType === 'add' && 'Nuevo Artículo'}
                    {modalType === 'edit' && 'Editar Artículo'}
                    {modalType === 'view' && 'Ver Artículo'}
                    {modalType === 'entrada' && 'Registro de Entrada'}
                    {modalType === 'merma' && 'Registro de Merma'}
                    {modalType === 'movement-view' && `Detalle de ${selectedItem?.tipo || 'Movimiento'}`}
                    {modalType === 'provider-add' && 'Nuevo Proveedor'}
                    {modalType === 'provider-edit' && 'Editar Proveedor'}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {modalType === 'entrada' && 'Ingreso de compras con actualización inmediata de existencias'}
                    {modalType === 'merma' && 'Baja definitiva de inventario y cálculo de impacto financiero'}
                    {modalType === 'movement-view' && 'Auditoría, trazabilidad y comprobantes de la operación'}
                    {modalType === 'add' && 'Ingresa los datos del nuevo producto o insumo'}
                    {modalType === 'edit' && 'Modifica los parámetros y límites del producto'}
                    {modalType === 'view' && 'Ficha informativa y parámetros del producto'}
                  </p>
                </div>
              </div>
              <button
                onClick={handleCloseModal}
                className="rounded-xl p-2 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
                title="Cerrar modal"
                aria-label="Cerrar modal"
              >
                <X size={20} aria-hidden="true" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(92vh-85px)] space-y-6">
              {modalType === 'movement-view' && selectedItem && (
                <div className="space-y-5">
                  {/* Banner superior con Tipo, Fecha y Responsable */}
                  <div className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                    selectedItem.tipo === 'Entrada'
                      ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900 dark:bg-emerald-950/30 dark:border-emerald-800/60 dark:text-emerald-200'
                      : selectedItem.tipo === 'Merma'
                      ? 'bg-amber-50/70 border-amber-200 text-amber-900 dark:bg-amber-950/30 dark:border-amber-800/60 dark:text-amber-200'
                      : 'bg-blue-50/70 border-blue-200 text-blue-900 dark:bg-blue-950/30 dark:border-blue-800/60 dark:text-blue-200'
                  }`}>
                    <div className="flex items-center gap-3">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                        selectedItem.tipo === 'Entrada'
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : selectedItem.tipo === 'Merma'
                          ? 'bg-rose-600 text-white shadow-sm'
                          : 'bg-blue-600 text-white shadow-sm'
                      }`}>
                        {selectedItem.tipo === 'Entrada' && <ArrowDownToLine size={13} />}
                        {selectedItem.tipo === 'Merma' && <TriangleAlert size={13} />}
                        {selectedItem.tipo}
                      </span>
                      <span className="text-xs sm:text-sm font-medium flex items-center gap-1.5 text-gray-700 dark:text-gray-300">
                        <Clock size={14} className="text-gray-400" />
                        {selectedItem.fecha}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs sm:text-sm">
                      <span className="text-gray-500 dark:text-gray-400">Operado por:</span>
                      <span className="font-semibold px-2.5 py-0.5 rounded-lg bg-white/80 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow-sm text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
                        <User size={13} className="text-cyan-600" />
                        {selectedItem.usuario || 'Sistema'}
                      </span>
                    </div>
                  </div>

                  {/* Tarjetas destacadas: Producto e Impacto Financiero */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Tarjeta Producto & Cantidad */}
                    <div className="rounded-xl border border-gray-200 dark:border-slate-700/80 bg-white dark:bg-slate-800/50 p-4 shadow-sm">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                        Producto Afectado
                      </span>
                      <div className="mt-1.5 flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-lg bg-cyan-50 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 flex items-center justify-center flex-shrink-0">
                          <Package size={18} />
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 dark:text-gray-100 text-base leading-snug">
                            {selectedItem.producto}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            Cantidad: <strong className="text-gray-800 dark:text-gray-200 font-bold">{selectedItem.cantidad} unidades</strong>
                          </p>
                        </div>
                      </div>

                      {/* Stock Flow */}
                      <div className="mt-3.5 pt-3 border-t border-gray-100 dark:border-slate-700/60 flex items-center justify-between text-xs">
                        <span className="text-gray-500 dark:text-gray-400">Transición de Stock:</span>
                        {selectedItem.stockAntes !== null && selectedItem.stockDespues !== null ? (
                          <span className="font-mono font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5 bg-gray-100 dark:bg-slate-700 px-2 py-0.5 rounded">
                            <span>{selectedItem.stockAntes}</span>
                            <ArrowRight size={12} className="text-cyan-600" />
                            <span className="text-cyan-700 dark:text-cyan-400 font-bold">{selectedItem.stockDespues}</span>
                            <span className={`text-[10px] ml-1 px-1 rounded ${
                              selectedItem.stockDespues >= selectedItem.stockAntes ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                            }`}>
                              {selectedItem.stockDespues >= selectedItem.stockAntes ? `+${selectedItem.stockDespues - selectedItem.stockAntes}` : `${selectedItem.stockDespues - selectedItem.stockAntes}`}
                            </span>
                          </span>
                        ) : (
                          <span className="text-gray-400 italic">Actualizado al confirmar</span>
                        )}
                      </div>
                    </div>

                    {/* Tarjeta Impacto Económico */}
                    {selectedItem.tipo === 'Merma' ? (
                      <div className="rounded-xl border border-rose-200 dark:border-rose-900/60 bg-gradient-to-br from-rose-50/80 to-amber-50/50 dark:from-rose-950/30 dark:to-amber-950/20 p-4 shadow-sm flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400 flex items-center gap-1">
                              <TriangleAlert size={13} />
                              Pérdida Económica
                            </span>
                            <span className="text-xs px-2 py-0.5 rounded bg-rose-200/60 dark:bg-rose-900/40 text-rose-800 dark:text-rose-300 font-bold">
                              Baja
                            </span>
                          </div>
                          <p className="mt-2 text-2xl font-black text-rose-600 dark:text-rose-400 font-mono">
                            Q{(Number(selectedItem.perdidaEconomica) > 0 ? Number(selectedItem.perdidaEconomica) : (costoUnitarioEfectivo * Number(selectedItem.cantidad || 0))).toFixed(2)}
                          </p>
                        </div>
                        <p className="mt-2 text-xs text-rose-700/80 dark:text-rose-300/80 pt-2 border-t border-rose-200/60 dark:border-rose-900/40 font-medium">
                          Costo unitario: Q{costoUnitarioEfectivo.toFixed(2)} × {selectedItem.cantidad} unidades
                        </p>
                      </div>
                    ) : (
                      <div className="rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-gradient-to-br from-emerald-50/80 to-cyan-50/50 dark:from-emerald-950/30 dark:to-cyan-950/20 p-4 shadow-sm flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                              <ArrowDownToLine size={13} />
                              Inversión / Costo Total
                            </span>
                            <span className="text-xs px-2 py-0.5 rounded bg-emerald-200/60 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 font-bold">
                              Entrada
                            </span>
                          </div>
                          <p className="mt-2 text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                            Q{(costoUnitarioEfectivo * Number(selectedItem.cantidad || 0)).toFixed(2)}
                          </p>
                        </div>
                        <p className="mt-2 text-xs text-emerald-700/80 dark:text-emerald-300/80 pt-2 border-t border-emerald-200/60 dark:border-emerald-900/40 font-medium">
                          Costo unitario: Q{costoUnitarioEfectivo.toFixed(2)} × {selectedItem.cantidad} unidades
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Proveedor y Justificación */}
                  <div className="rounded-xl border border-gray-200 dark:border-slate-700/80 bg-gray-50/70 dark:bg-slate-800/40 p-4 space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500 dark:text-gray-400 font-medium flex items-center gap-1.5">
                        <Building2 size={14} className="text-gray-400" />
                        Proveedor Asociado:
                      </span>
                      <span className="font-semibold text-gray-800 dark:text-gray-200">
                        {selectedItem.proveedor || 'Sin proveedor / No especificado'}
                      </span>
                    </div>

                    <div className="pt-2 border-t border-gray-200/70 dark:border-slate-700/60">
                      <span className="text-xs text-gray-500 dark:text-gray-400 font-medium block mb-1.5 flex items-center gap-1.5">
                        <Receipt size={14} className="text-gray-400" />
                        Motivo / Factura / Observaciones:
                      </span>
                      <div className="rounded-lg bg-white dark:bg-slate-900 p-3 border border-gray-200 dark:border-slate-700 text-sm text-gray-800 dark:text-gray-200 font-medium whitespace-pre-wrap">
                        {selectedItem.motivo || 'Sin observaciones registradas'}
                      </div>
                    </div>
                  </div>

                  {/* Documento Adjunto */}
                  {selectedItem.documentoUrl && (
                    <a
                      href={selectedItem.documentoUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-center gap-2 w-full rounded-xl bg-cyan-50 dark:bg-cyan-950/60 border border-cyan-200 dark:border-cyan-800/80 py-3 text-sm font-semibold text-cyan-800 dark:text-cyan-300 hover:bg-cyan-100 dark:hover:bg-cyan-900/60 transition-colors shadow-sm"
                    >
                      <FileText size={16} />
                      {selectedItem.tipo === 'Merma' ? 'Ver Evidencia Fotográfica / Acta Adjunta' : 'Ver Comprobante / Factura Digital'}
                    </a>
                  )}

                  {/* Botón de cierre */}
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleCloseModal}
                      className="w-full rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 py-3 font-semibold text-gray-700 dark:text-gray-200 transition-colors shadow-sm"
                    >
                      Cerrar Detalle
                    </button>
                  </div>
                </div>
              )}

              {(modalType === 'provider-add' || modalType === 'provider-edit') && (
                <form className="space-y-5" onSubmit={handleSubmitProveedor} noValidate>
                  {proveedorError && (
                    <div className="rounded-xl border border-red-200 bg-red-50/90 dark:bg-red-950/40 dark:border-red-900/60 p-4 text-sm text-red-700 dark:text-red-300 flex items-center gap-3">
                      <AlertTriangle size={18} className="flex-shrink-0 text-red-600" />
                      <span>{proveedorError}</span>
                    </div>
                  )}

                  <div className="rounded-xl border border-gray-200 dark:border-slate-700/80 bg-white dark:bg-slate-800/40 p-4 shadow-sm space-y-4">
                    <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-700/60 pb-2.5">
                      <span className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                        <Building2 size={15} className="text-cyan-600" />
                        Datos de la Empresa / Proveedor
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[
                        ['nombre', 'Nombre o razón social', 'Nombre del proveedor', true],
                        ['nit', 'NIT', '000000-0', false],
                        ['telefono', 'Teléfono', '5555-5555', false],
                        ['correo', 'Correo electrónico', 'correo@ejemplo.com', false],
                      ].map(([field, label, placeholder, isRequired]) => (
                        <div key={field}>
                          <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                            {label} {isRequired && <span className="text-red-500">*</span>}
                          </label>
                          <input
                            type={field === 'correo' ? 'email' : 'text'}
                            value={proveedorForm[field]}
                            onChange={(event) => {
                              const rawValue = event.target.value
                              const value = field === 'nit'
                                ? rawValue.replace(/[^a-zA-Z0-9]/g, '').slice(0, 13)
                                : field === 'telefono'
                                  ? rawValue.replace(/\D/g, '').slice(0, 8)
                                  : rawValue
                              setProveedorForm((previous) => ({ ...previous, [field]: value }))
                              setProveedorError('')
                            }}
                            placeholder={placeholder}
                            maxLength={field === 'nit' ? 13 : field === 'telefono' ? 8 : undefined}
                            inputMode={field === 'telefono' ? 'numeric' : field === 'nit' ? 'text' : undefined}
                            className="w-full px-3.5 py-2.5 text-sm border-2 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-400 text-gray-900 dark:text-gray-100"
                            required={isRequired}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-3 border-t border-gray-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={handleCloseModal}
                      className="px-5 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-200 font-semibold text-sm hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={isSavingProveedor}
                      className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-semibold text-sm transition-all shadow-md hover:shadow-lg disabled:opacity-50 inline-flex items-center justify-center gap-2"
                    >
                      {isSavingProveedor ? (
                        <>
                          <RefreshCw size={16} className="animate-spin" />
                          <span>Guardando...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle size={16} />
                          <span>Guardar Proveedor</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}

              {(modalType === 'add' || modalType === 'edit' || modalType === 'view') && (
                <form className="space-y-5" onSubmit={handleSubmitProducto} noValidate>
                  {errorProducto && (
                    <div className="rounded-xl border border-red-200 bg-red-50/90 dark:bg-red-950/40 dark:border-red-900/60 p-4 text-sm text-red-700 dark:text-red-300 flex items-center gap-3">
                      <AlertTriangle size={18} className="flex-shrink-0 text-red-600" />
                      <span>{errorProducto}</span>
                    </div>
                  )}

                  {/* Tarjeta 1: Clasificación y Nombre */}
                  <div className="rounded-xl border border-gray-200 dark:border-slate-700/80 bg-white dark:bg-slate-800/40 p-4 shadow-sm space-y-3.5">
                    <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-700/60 pb-2.5">
                      <span className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                        <Package size={15} className="text-cyan-600" />
                        Identificación del Producto / Insumo
                      </span>
                      {productoForm.codigo && (
                        <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300">
                          Código: {productoForm.codigo}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                          Categoría <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={productoForm.categoria}
                          onChange={(e) => handleProductoFormChange('categoria', e.target.value)}
                          disabled={modalType === 'view'}
                          className="w-full px-3.5 py-2.5 text-sm border-2 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-400 text-gray-800 dark:text-gray-200 font-medium"
                          required
                        >
                          <option value="">Seleccionar categoría...</option>
                          {categoriasInventario.map((categoria) => (
                            <option key={categoria.codigo} value={categoria.nombre}>
                              {categoria.nombre}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                          Stock Mínimo de Alerta
                        </label>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={productoForm.minimo}
                          onChange={(e) => handleProductoFormChange('minimo', e.target.value)}
                          readOnly={modalType === 'view'}
                          placeholder="0"
                          maxLength={9}
                          className="w-full px-3.5 py-2.5 text-sm border-2 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-400 text-gray-800 dark:text-gray-200 font-medium"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                        Nombre del Producto o Insumo <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={productoForm.nombre}
                        onChange={(e) => handleProductoFormChange('nombre', e.target.value)}
                        readOnly={modalType === 'view'}
                        placeholder="Ej: Bolsa Hielo Cubo 5lb, Vaso 18oz"
                        maxLength={100}
                        className="w-full px-3.5 py-2.5 text-sm border-2 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-400 text-gray-800 dark:text-gray-200 font-medium"
                        required
                      />
                      <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
                        Permite letras, números, espacios y signos comunes (ej. Bolsa 5lb, Vaso 18oz).
                      </p>
                    </div>
                  </div>

                  {/* Tarjeta 2: Empaque y Costos */}
                  <div className="rounded-xl border border-gray-200 dark:border-slate-700/80 bg-white dark:bg-slate-800/40 p-4 shadow-sm space-y-3.5">
                    <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-700/60 pb-2.5">
                      <span className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                        <Receipt size={15} className="text-cyan-600" />
                        Parámetros de Compra y Empaque
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                          Cantidad por paquete
                        </label>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={productoForm.cantidadCompra}
                          onChange={(e) => handleProductoFormChange('cantidadCompra', e.target.value)}
                          readOnly={modalType === 'view'}
                          placeholder="50"
                          maxLength={9}
                          className="w-full px-3.5 py-2.5 text-sm border-2 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-400 text-gray-800 dark:text-gray-200 font-semibold"
                        />
                        <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">Ejemplo: 50 unidades por paquete.</p>
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                          Precio por paquete (Q)
                        </label>
                        <div className="relative">
                          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs">
                            Q
                          </span>
                          <input
                            type="text"
                            inputMode="decimal"
                            value={productoForm.precioPaquete}
                            onChange={(e) => handleProductoFormChange('precioPaquete', e.target.value)}
                            readOnly={modalType === 'view'}
                            placeholder="30.00"
                            maxLength={9}
                            className="w-full pl-8 pr-3.5 py-2.5 text-sm border-2 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-400 text-gray-800 dark:text-gray-200 font-semibold"
                          />
                        </div>
                        <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">Ejemplo: Q30.00 por el fardo o paquete completo.</p>
                      </div>
                    </div>

                    {/* Tarjeta de Costo Unitario Calculado */}
                    <div className="rounded-xl border border-cyan-200 dark:border-cyan-800/80 bg-gradient-to-br from-cyan-50/80 via-blue-50/40 to-slate-50/60 dark:from-cyan-950/40 dark:via-blue-950/20 dark:to-slate-900/40 p-4 shadow-sm flex items-center justify-between">
                      <div>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-800 dark:text-cyan-300 block">
                          Costo Unitario Calculado
                        </span>
                        <p className="text-xs text-cyan-700/80 dark:text-cyan-400/80 mt-0.5">
                          Base para costeo de recetas y movimientos
                        </p>
                      </div>
                      <div className="text-3xl font-black text-cyan-800 dark:text-cyan-200 font-mono">
                        Q{calcularCostoUnitario().toFixed(2)}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-3 border-t border-gray-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={handleCloseModal}
                      className="px-5 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-200 font-semibold text-sm hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                    >
                      {modalType === 'view' ? 'Cerrar' : 'Cancelar'}
                    </button>
                    {modalType !== 'view' && (
                      <button
                        type="submit"
                        disabled={isSavingProducto}
                        className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-semibold text-sm transition-all shadow-md hover:shadow-lg disabled:opacity-50 inline-flex items-center justify-center gap-2"
                      >
                        {isSavingProducto ? (
                          <>
                            <RefreshCw size={16} className="animate-spin" />
                            <span>Guardando...</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle size={16} />
                            <span>{modalType === 'add' ? 'Crear Artículo' : 'Guardar Cambios'}</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </form>
              )}

              {modalType === 'entrada' && (
                <form className="space-y-6" onSubmit={(event) => handleSubmitEntrada(event, true)} noValidate>
                  {errorProducto && (
                    <div className="rounded-xl border border-red-200 bg-red-50/90 dark:bg-red-950/40 dark:border-red-900/60 p-4 text-sm text-red-700 dark:text-red-300 flex items-center gap-3">
                      <AlertTriangle size={18} className="flex-shrink-0 text-red-600" />
                      <span>{errorProducto}</span>
                    </div>
                  )}

                  {/* Resumen del Encabezado */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl border border-cyan-100 dark:border-cyan-900/50 bg-gradient-to-r from-cyan-50/60 via-blue-50/40 to-slate-50/60 dark:from-cyan-950/20 dark:via-blue-950/20 dark:to-slate-900/40">
                    <div>
                      <span className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        Número Correlativo
                      </span>
                      <span className="font-mono font-bold text-cyan-800 dark:text-cyan-300 text-sm mt-0.5 inline-block bg-white/80 dark:bg-slate-800 px-2.5 py-0.5 rounded border border-cyan-200 dark:border-cyan-800/60">
                        Automático (ENT-XXXXX)
                      </span>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        Fecha Operación *
                      </label>
                      <input
                        type="date"
                        value={entradaForm.fecha}
                        onChange={(e) => setEntradaForm({ ...entradaForm, fecha: e.target.value })}
                        className="w-full mt-0.5 px-2.5 py-1 text-xs sm:text-sm font-medium border border-gray-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                        required
                      />
                    </div>
                    <div>
                      <span className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        Tipo Operación
                      </span>
                      <span className="font-semibold text-emerald-800 dark:text-emerald-300 text-xs sm:text-sm mt-0.5 inline-flex items-center gap-1 bg-emerald-100/70 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                        <ArrowDownToLine size={13} />
                        Compra Directa
                      </span>
                    </div>
                    <div>
                      <span className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        Responsable
                      </span>
                      <span
                        className="font-semibold text-cyan-900 dark:text-cyan-200 bg-white/80 dark:bg-slate-800 px-2.5 py-0.5 rounded-lg border border-cyan-200 dark:border-cyan-800 text-xs sm:text-sm mt-0.5 inline-flex items-center gap-1.5 truncate max-w-full"
                        title={entradaForm.responsable || 'Usuario actual'}
                      >
                        <User size={13} className="text-cyan-600 flex-shrink-0" />
                        <span className="truncate">{entradaForm.responsable || getCurrentUser()?.nombre || getCurrentUser()?.username || 'Usuario actual'}</span>
                      </span>
                    </div>
                  </div>

                  {/* Datos del Documento / Factura */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                          Proveedor <span className="text-[11px] font-normal text-gray-400">(Opcional)</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            setQuickProveedorError('')
                            setQuickProveedorForm({ nombre: '', nit: '', telefono: '', correo: '' })
                            setShowQuickProveedorModal(true)
                          }}
                          className="text-xs font-semibold text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 flex items-center gap-1 transition-colors"
                        >
                          <Plus size={13} className="stroke-[2.5]" />
                          <span>Crear nuevo</span>
                        </button>
                      </div>
                      <select
                        value={entradaForm.proveedorId}
                        onChange={(e) => {
                          if (e.target.value === '__NEW__') {
                            setQuickProveedorError('')
                            setQuickProveedorForm({ nombre: '', nit: '', telefono: '', correo: '' })
                            setShowQuickProveedorModal(true)
                          } else {
                            setEntradaForm({ ...entradaForm, proveedorId: e.target.value })
                          }
                        }}
                        className="w-full px-3.5 py-2.5 text-sm border-2 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-400 text-gray-800 dark:text-gray-200 font-medium"
                      >
                        <option value="">Sin proveedor / No especificado</option>
                        <option value="__NEW__" className="font-bold text-cyan-600 dark:text-cyan-400">
                          ➕ + Crear nuevo proveedor...
                        </option>
                        {proveedores.filter((p) => p.activo).length > 0 && (
                          <optgroup label="Proveedores Registrados">
                            {proveedores.filter((p) => p.activo).map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.nombre} · NIT: {p.nit || 'Sin NIT'}
                              </option>
                            ))}
                          </optgroup>
                        )}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                        Número de Factura *
                      </label>
                      <div className="flex items-center">
                        <span className="inline-flex items-center px-3.5 py-2.5 rounded-l-xl border-2 border-r-0 border-gray-200 dark:border-slate-700 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 font-bold text-sm select-none">
                          Fac-
                        </span>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={entradaForm.numeroFacturaOnlyDigits || ''}
                          onKeyDown={(e) => {
                            if (!e.ctrlKey && !e.metaKey && !e.altKey && e.key.length === 1 && !/[0-9]/.test(e.key)) {
                              e.preventDefault()
                            }
                          }}
                          onChange={(e) => {
                            const digits = e.target.value.replace(/\D/g, '').slice(0, 15)
                            setEntradaForm({
                              ...entradaForm,
                              numeroFacturaOnlyDigits: digits,
                              numeroFactura: digits ? `Fac-${digits}` : '',
                            })
                          }}
                          placeholder="12345"
                          className="w-full px-3.5 py-2.5 border-2 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-r-xl focus:outline-none focus:ring-2 focus:ring-cyan-400 font-mono text-gray-900 dark:text-gray-100 text-sm font-semibold"
                          required
                        />
                      </div>
                      <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
                        Solo números. Se registrará como: <strong className="text-cyan-700 dark:text-cyan-400 font-mono">{entradaForm.numeroFactura || 'Fac-...'}</strong>
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                        Fecha de Factura
                      </label>
                      <input
                        type="date"
                        value={entradaForm.fechaFactura}
                        onChange={(e) => setEntradaForm({ ...entradaForm, fechaFactura: e.target.value })}
                        className="w-full px-3.5 py-2.5 text-sm border-2 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-400 text-gray-800 dark:text-gray-200"
                      />
                    </div>
                  </div>

                  {/* Tabla de Artículos a Ingresar */}
                  <div className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 shadow-sm overflow-hidden">
                    <div className="px-4 py-3 bg-gray-50/90 dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                        <Package size={15} className="text-cyan-600" />
                        Detalle de Artículos / Insumos
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                        {entradaForm.detalles.length} {entradaForm.detalles.length === 1 ? 'artículo' : 'artículos'}
                      </span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="min-w-[650px] w-full text-sm">
                        <thead className="bg-gray-100/60 dark:bg-slate-800/60 text-gray-600 dark:text-gray-400 text-[11px] font-bold uppercase tracking-wider border-b border-gray-200 dark:border-slate-700">
                          <tr>
                            <th className="px-4 py-2.5 text-left">Producto / Insumo</th>
                            <th className="px-4 py-2.5 text-left w-32">Cantidad</th>
                            <th className="px-4 py-2.5 text-left w-36">Costo Unit. (Q)</th>
                            <th className="px-4 py-2.5 text-right w-32">Subtotal (Q)</th>
                            <th className="px-3 py-2.5 text-center w-12"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-slate-700/60">
                          {entradaForm.detalles.map((detalle, index) => {
                            const totalLinea = Number(detalle.cantidad || 0) * Number(detalle.costoUnitario || 0)
                            return (
                              <tr key={`entrada-detalle-${index}`} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/40 transition-colors">
                                <td className="px-4 py-2.5">
                                  <select
                                    value={detalle.productoId}
                                    onChange={(e) => handleEntradaDetailChange(index, 'productoId', e.target.value)}
                                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400 text-gray-800 dark:text-gray-200 font-medium"
                                    required
                                  >
                                    <option value="">Seleccionar producto...</option>
                                    {productosVigentes.map((p) => (
                                      <option key={p.id} value={p.id}>
                                        {p.nombre} (Stock actual: {p.stock})
                                      </option>
                                    ))}
                                  </select>
                                  <span className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5 block">
                                    Unidad: {detalle.unidad || 'unidad'}
                                  </span>
                                </td>
                                <td className="px-4 py-2.5">
                                  <input
                                    type="number"
                                    min="0.01"
                                    step="0.01"
                                    placeholder="0"
                                    value={detalle.cantidad}
                                    onChange={(e) => handleEntradaDetailChange(index, 'cantidad', e.target.value)}
                                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400 font-semibold text-gray-800 dark:text-gray-200"
                                    required
                                  />
                                </td>
                                <td className="px-4 py-2.5">
                                  <div className="relative">
                                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold">
                                      Q
                                    </span>
                                    <input
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      placeholder="0.00"
                                      value={detalle.costoUnitario}
                                      onChange={(e) => handleEntradaDetailChange(index, 'costoUnitario', e.target.value)}
                                      className="w-full pl-6 pr-3 py-2 text-sm border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400 font-semibold text-gray-800 dark:text-gray-200"
                                      required
                                    />
                                  </div>
                                </td>
                                <td className="px-4 py-2.5 text-right font-bold text-gray-900 dark:text-gray-100 font-mono">
                                  Q{totalLinea.toFixed(2)}
                                </td>
                                <td className="px-3 py-2.5 text-center">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setEntradaForm((previous) => ({
                                        ...previous,
                                        detalles: previous.detalles.filter((_, detailIndex) => detailIndex !== index),
                                      }))
                                    }
                                    disabled={entradaForm.detalles.length === 1}
                                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors disabled:opacity-20 disabled:hover:bg-transparent disabled:hover:text-gray-400"
                                    title="Eliminar fila"
                                    aria-label="Eliminar fila"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>

                    <div className="p-3 bg-gray-50/70 dark:bg-slate-800/40 border-t border-gray-200 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={() =>
                          setEntradaForm((previous) => ({
                            ...previous,
                            detalles: [
                              ...previous.detalles,
                              { productoId: '', unidad: 'unidad', cantidad: '', costoUnitario: '' },
                            ],
                          }))
                        }
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-cyan-700 dark:text-cyan-400 hover:text-cyan-800 dark:hover:text-cyan-300 px-3 py-1.5 rounded-lg hover:bg-cyan-50 dark:hover:bg-cyan-950/40 transition-colors"
                      >
                        <Plus size={15} />
                        Agregar otro producto
                      </button>

                      <div className="flex items-center gap-6 text-sm">
                        <span className="text-gray-500 dark:text-gray-400">
                          Subtotal: <strong className="text-gray-700 dark:text-gray-300 font-bold">Q{entradaForm.detalles.reduce((sum, detalle) => sum + (Number(detalle.cantidad || 0) * Number(detalle.costoUnitario || 0)), 0).toFixed(2)}</strong>
                        </span>
                        <div className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-sm flex items-center gap-2">
                          <span className="text-xs uppercase tracking-wider font-semibold">Total Entrada:</span>
                          <span className="text-base font-black font-mono">
                            Q{entradaForm.detalles.reduce((sum, detalle) => sum + (Number(detalle.cantidad || 0) * Number(detalle.costoUnitario || 0)), 0).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Observaciones y Documento Digital */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                        Observaciones / Justificación
                      </label>
                      <textarea
                        rows="3"
                        placeholder="Ingresa detalles sobre la entrega, condiciones o nota de remisión..."
                        value={entradaForm.observaciones}
                        onChange={(e) => setEntradaForm({ ...entradaForm, observaciones: e.target.value })}
                        className="w-full px-3.5 py-2.5 text-sm border-2 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-400 text-gray-800 dark:text-gray-200 resize-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                        Comprobante Digital / Factura Adjunta
                      </label>
                      <div className="border-2 border-dashed border-gray-200 dark:border-slate-700 hover:border-cyan-400 dark:hover:border-cyan-500 rounded-xl p-3.5 bg-gray-50/50 dark:bg-slate-800/40 text-center transition-colors">
                        <Upload size={20} className="mx-auto text-gray-400 dark:text-gray-500 mb-1.5" />
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(e) => setEntradaForm({ ...entradaForm, documento: e.target.files?.[0] || null })}
                          className="w-full text-xs text-gray-600 dark:text-gray-300 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-cyan-50 file:text-cyan-700 dark:file:bg-cyan-950/60 dark:file:text-cyan-300 hover:file:bg-cyan-100"
                        />
                        <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">
                          Admite PDF, JPG o PNG hasta 5 MB.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Botones de Acción */}
                  <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4 border-t border-gray-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={handleCloseModal}
                      className="px-5 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-200 font-semibold text-sm hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={(event) => handleSubmitEntrada(event, false)}
                      disabled={isSavingMovimiento}
                      className="px-5 py-2.5 rounded-xl bg-slate-600 hover:bg-slate-700 text-white font-semibold text-sm transition-colors disabled:opacity-50 shadow-sm"
                    >
                      Guardar Borrador
                    </button>
                    <button
                      type="submit"
                      disabled={isSavingMovimiento}
                      className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-semibold text-sm transition-all shadow-md hover:shadow-lg disabled:opacity-50 inline-flex items-center justify-center gap-2"
                    >
                      {isSavingMovimiento ? (
                        <>
                          <RefreshCw size={16} className="animate-spin" />
                          <span>Guardando...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle size={16} />
                          <span>Confirmar Entrada</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}

              {modalType === 'merma' && (
                <form className="space-y-5" onSubmit={handleSubmitMovimiento} noValidate>
                  {errorProducto && (
                    <div className="rounded-xl border border-red-200 bg-red-50/90 dark:bg-red-950/40 dark:border-red-900/60 p-4 text-sm text-red-700 dark:text-red-300 flex items-center gap-3">
                      <AlertTriangle size={18} className="flex-shrink-0 text-red-600" />
                      <span>{errorProducto}</span>
                    </div>
                  )}

                  {/* Banner de Advertencia de Merma */}
                  <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-800/60 bg-amber-50/70 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 flex items-start gap-3">
                    <TriangleAlert size={20} className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-bold">Baja Definitiva por Merma</h4>
                      <p className="text-xs text-amber-800/80 dark:text-amber-300/80 mt-0.5">
                        Esta acción descontará las unidades de inventario de forma inmediata y registrará el impacto en la pérdida económica del período.
                      </p>
                    </div>
                  </div>

                  {/* Clasificación y Fecha */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                        Motivo de la Merma *
                      </label>
                      <select
                        value={mermaForm.motivoTipo}
                        onChange={(event) => setMermaForm((previous) => ({ ...previous, motivoTipo: event.target.value }))}
                        className="w-full px-3.5 py-2.5 text-sm border-2 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 text-gray-800 dark:text-gray-200 font-medium"
                        required
                      >
                        <option value="">Seleccionar motivo de baja...</option>
                        {motivosMerma.map((motivo) => (
                          <option key={motivo.id} value={motivo.id}>
                            {motivo.nombre}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                        Fecha de la Merma *
                      </label>
                      <input
                        type="date"
                        value={mermaForm.fecha}
                        onChange={(event) => setMermaForm((previous) => ({ ...previous, fecha: event.target.value }))}
                        className="w-full px-3.5 py-2.5 text-sm border-2 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 text-gray-800 dark:text-gray-200"
                        required
                      />
                    </div>
                  </div>

                  {/* Producto y Cantidad */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                        Producto Afectado *
                      </label>
                      <select
                        value={movimientoForm.productoId}
                        onChange={(e) => handleMovimientoFormChange('productoId', e.target.value)}
                        className="w-full px-3.5 py-2.5 text-sm border-2 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 text-gray-800 dark:text-gray-200 font-medium"
                        required
                      >
                        <option value="">Seleccionar producto...</option>
                        {productosVigentes.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.nombre} (Stock: {p.stock})
                          </option>
                        ))}
                      </select>
                      {selectedMovimientoProducto && (
                        <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                          Existencia actual: <strong className="font-bold text-gray-800 dark:text-gray-200">{selectedMovimientoProducto.stock} unidades</strong>
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                        Cantidad a Dar de Baja *
                      </label>
                      <input
                        type="number"
                        value={movimientoForm.cantidad}
                        onChange={(e) => handleMovimientoFormChange('cantidad', e.target.value)}
                        placeholder="0"
                        min="0.01"
                        step="0.01"
                        className="w-full px-3.5 py-2.5 text-sm border-2 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 text-gray-900 dark:text-gray-100 font-bold"
                        required
                      />
                      {selectedMovimientoProducto && Number(movimientoForm.cantidad || 0) > Number(selectedMovimientoProducto.stock || 0) && (
                        <p className="mt-1 text-xs text-red-600 font-medium">
                          La cantidad supera el stock disponible ({selectedMovimientoProducto.stock}).
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Tarjeta de Impacto Financiero en Tiempo Real */}
                  <div className="rounded-xl border-2 border-amber-300 dark:border-amber-800/80 bg-gradient-to-br from-amber-50 via-orange-50/60 to-rose-50/50 dark:from-amber-950/40 dark:via-orange-950/20 dark:to-rose-950/30 p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                        <TriangleAlert size={15} />
                        Impacto Financiero Estimado
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-amber-200/70 dark:bg-amber-900/50 text-amber-900 dark:text-amber-200 font-bold">
                        Pérdida Económica
                      </span>
                    </div>

                    <div className="mt-2.5 flex items-baseline justify-between">
                      <p className="text-3xl font-black text-rose-600 dark:text-rose-400 font-mono">
                        Q{perdidaEconomicaMerma.toFixed(2)}
                      </p>
                      <p className="text-xs text-amber-800 dark:text-amber-300/80 font-medium">
                        Costo unit.: Q{costoUnitarioMerma.toFixed(2)} × {Number.isNaN(cantidadMerma) ? 0 : cantidadMerma} un.
                      </p>
                    </div>
                  </div>

                  {/* Justificación y Evidencia */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                        Descripción / Justificación de la Merma *
                      </label>
                      <textarea
                        value={movimientoForm.motivo}
                        onChange={(e) => handleMovimientoFormChange('motivo', e.target.value)}
                        rows="3"
                        placeholder="Ej: Falla eléctrica en congelador 2 provocó descongelamiento total..."
                        className="w-full px-3.5 py-2.5 text-sm border-2 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 text-gray-800 dark:text-gray-200 resize-none"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                        Evidencia Fotográfica / Acta de Baja <span className="text-[11px] font-normal text-gray-400">(Opcional)</span>
                      </label>
                      <div className="border-2 border-dashed border-gray-200 dark:border-slate-700 hover:border-amber-400 rounded-xl p-3.5 bg-gray-50/50 dark:bg-slate-800/40 text-center transition-colors">
                        <Upload size={20} className="mx-auto text-gray-400 dark:text-gray-500 mb-1.5" />
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(event) => setMermaForm((previous) => ({ ...previous, evidencia: event.target.files?.[0] || null }))}
                          className="w-full text-xs text-gray-600 dark:text-gray-300 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-amber-100 file:text-amber-800 dark:file:bg-amber-950/60 dark:file:text-amber-300 hover:file:bg-amber-200"
                        />
                        <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">
                          Admite PDF, JPG o PNG hasta 5 MB.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Botones de Acción */}
                  <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={handleCloseModal}
                      className="px-5 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-200 font-semibold text-sm hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={isSavingMovimiento}
                      className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-600 hover:to-rose-700 text-white font-semibold text-sm transition-all shadow-md hover:shadow-lg disabled:opacity-50 inline-flex items-center gap-2"
                    >
                      {isSavingMovimiento ? (
                        <>
                          <RefreshCw size={16} className="animate-spin" />
                          <span>Procesando Baja...</span>
                        </>
                      ) : (
                        <>
                          <TriangleAlert size={16} />
                          <span>Confirmar Merma</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}

              {modalType === 'salida' && (
                <form className="space-y-4" onSubmit={handleSubmitMovimiento} noValidate>
                  {errorProducto && (
                    <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                      {errorProducto}
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Producto</label>
                    <select
                      value={movimientoForm.productoId}
                      onChange={(e) => handleMovimientoFormChange('productoId', e.target.value)}
                      className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400"
                      required
                    >
                      <option value="">Seleccionar producto...</option>
                      {productosVigentes.map(p => (
                        <option key={p.id} value={p.id}>{p.nombre} - Stock: {p.stock}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Cantidad</label>
                    <input
                      type="number"
                      value={movimientoForm.cantidad}
                      onChange={(e) => handleMovimientoFormChange('cantidad', e.target.value)}
                      placeholder="0"
                      className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400"
                      min="0.01"
                      step="0.01"
                      required
                    />
                    {selectedMovimientoProducto && (
                      <p className="mt-1 text-xs text-gray-500">
                        Stock disponible: <span className="font-semibold text-gray-700">{selectedMovimientoProducto.stock}</span>
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Motivo / Observaciones</label>
                    <textarea
                      value={movimientoForm.motivo}
                      onChange={(e) => handleMovimientoFormChange('motivo', e.target.value)}
                      rows="3"
                      placeholder="Descripción de la salida..."
                      className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400"
                    ></textarea>
                  </div>
                  <div className="flex space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={handleCloseModal}
                      className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={isSavingMovimiento}
                      className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-3 rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all shadow-md font-medium disabled:opacity-50"
                    >
                      {isSavingMovimiento ? 'Registrando...' : 'Registrar Salida'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {deleteItem && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-[55] p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-red-100 p-7">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-red-100 text-red-600 flex items-center justify-center flex-shrink-0">
                <AlertTriangle size={26} aria-hidden="true" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-800">Eliminar producto</h3>
                <p className="mt-1 text-sm text-gray-500">Esta acción no se puede deshacer.</p>
              </div>
            </div>

            <div className="mt-6 rounded-xl border border-gray-200 bg-gray-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Producto seleccionado</p>
              <p className="mt-1 font-semibold text-gray-800">{deleteItem.nombre}</p>
              <p className="mt-1 text-sm text-gray-500">Código: {deleteItem.codigo}</p>
            </div>

            <p className="mt-5 text-sm text-gray-600">
              ¿Está seguro de que desea eliminar este producto del inventario?
            </p>

            <div className="mt-7 flex gap-3">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeleteItem(null)}
                className="flex-1 rounded-lg bg-gray-100 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-200 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => handleDeleteProducto(deleteItem)}
                className="flex-1 rounded-lg bg-red-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
              >
                {isDeleting ? 'Eliminando...' : 'Eliminar producto'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Rápido de Nuevo Proveedor (Invocable directamente desde el Form de Entrada) */}
      {showQuickProveedorModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center z-[70] p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg border border-gray-100 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header Sticky */}
            <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-800 bg-gradient-to-r from-cyan-600 via-cyan-500 to-blue-600 flex items-center justify-between text-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shadow-inner">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base leading-tight">Nuevo Proveedor Rápido</h3>
                  <p className="text-xs text-cyan-100 mt-0.5">Se creará y seleccionará automáticamente en esta entrada</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowQuickProveedorModal(false)
                  setQuickProveedorError('')
                }}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Formulario */}
            <form onSubmit={handleSaveQuickProveedor} className="p-6 space-y-4">
              {quickProveedorError && (
                <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/40 dark:border-red-900/60 p-3 text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
                  <AlertTriangle size={15} className="flex-shrink-0 text-red-600" />
                  <span>{quickProveedorError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                  Nombre del Proveedor *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={quickProveedorForm.nombre}
                  onChange={(e) => setQuickProveedorForm({ ...quickProveedorForm, nombre: e.target.value })}
                  placeholder="Ej: Distribuidora de Plásticos S.A."
                  className="w-full px-3.5 py-2.5 text-sm border-2 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-400 text-gray-800 dark:text-gray-200 font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                    NIT (Opcional)
                  </label>
                  <input
                    type="text"
                    maxLength={13}
                    value={quickProveedorForm.nit}
                    onChange={(e) => setQuickProveedorForm({ ...quickProveedorForm, nit: e.target.value.replace(/[^a-zA-Z0-9]/g, '') })}
                    placeholder="Ej: 12345678K"
                    className="w-full px-3.5 py-2.5 text-sm border-2 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-400 text-gray-800 dark:text-gray-200 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                    Teléfono (Opcional)
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={8}
                    value={quickProveedorForm.telefono}
                    onChange={(e) => setQuickProveedorForm({ ...quickProveedorForm, telefono: e.target.value.replace(/\D/g, '') })}
                    placeholder="Ej: 55551234"
                    className="w-full px-3.5 py-2.5 text-sm border-2 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-400 text-gray-800 dark:text-gray-200 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                  Correo Electrónico (Opcional)
                </label>
                <input
                  type="email"
                  value={quickProveedorForm.correo}
                  onChange={(e) => setQuickProveedorForm({ ...quickProveedorForm, correo: e.target.value })}
                  placeholder="ventas@proveedor.com"
                  className="w-full px-3.5 py-2.5 text-sm border-2 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-400 text-gray-800 dark:text-gray-200"
                />
              </div>

              {/* Botones de Acción */}
              <div className="pt-3 border-t border-gray-100 dark:border-slate-800 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setShowQuickProveedorModal(false)
                    setQuickProveedorError('')
                  }}
                  disabled={isSavingQuickProveedor}
                  className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 text-xs sm:text-sm font-semibold hover:bg-gray-50 dark:hover:bg-slate-700/60 transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingQuickProveedor}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-semibold text-xs sm:text-sm shadow-md hover:shadow-cyan-500/25 transition-all inline-flex items-center gap-2 disabled:opacity-50"
                >
                  {isSavingQuickProveedor ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      <span>Guardar y Seleccionar</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <AuditoriaInventarioModal
        isOpen={modalType === 'auditoria'}
        onClose={handleCloseModal}
        productos={productos}
        categorias={categoriasInventario}
      />

      <ReporteModal
        open={reporteOpen}
        title="Reporte del inventario actual"
        filterLabel="Categoría"
        filterOptions={categoriasReporte}
        generating={generandoReporte}
        onGenerate={handleGenerarReporteInventario}
        onClose={() => setReporteOpen(false)}
      />

      <SuccessModal
        isOpen={Boolean(successMessage)}
        message={successMessage}
        onClose={() => setSuccessMessage('')}
      />
    </div>
  )
}

export default Inventarios
