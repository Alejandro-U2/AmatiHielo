import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  ArrowDownToLine,
  Bell,
  CheckCircle,
  Eye,
  FileDown,
  Package,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  TriangleAlert,
  X,
  ClipboardList,
} from 'lucide-react'
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
import { sanitizeSoloLetras, capitalizeWords } from '../../utils/validation'
import { generarReporteModulo } from '../../utils/moduloExport'
import { useTableSort, sortRows } from '../../hooks/useTableSort'
import { toast } from 'sonner'

const DEFAULT_CATEGORIAS = [
  { nombre: 'Materia Prima', codigo: 'MP' },
  { nombre: 'Suministros', codigo: 'SUM' },
]

const DEFAULT_TIPOS_MOVIMIENTO = ['Entrada', 'Merma', 'Ajuste']

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
    const matchTipo = filterTipoMov === 'todos' || mov.tipo === filterTipoMov
    const normalizedSearch = movSearchTerm.trim().toLowerCase()
    const matchSearch = !normalizedSearch
      || mov.producto.toLowerCase().includes(normalizedSearch)
      || (mov.motivo || '').toLowerCase().includes(normalizedSearch)
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
        setTiposMovimiento(tiposData.map((tipo) => tipo.nombre).filter((tipo) => tipo !== 'Salida'))
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
    setEntradaForm({
      fecha: new Date().toISOString().slice(0, 10),
      proveedorId: '',
      numeroFactura: '',
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

  const handleProductoFormChange = (field, value) => {
    const updated = { ...productoForm, [field]: value }

    if (field === 'nombre') {
      updated.nombre = capitalizeWords(sanitizeSoloLetras(value))
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
        nombre: capitalizeWords(sanitizeSoloLetras(productoForm.nombre)),
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
      handleCloseModal()
      if (modalType === 'add') {
        toast.success('Producto creado correctamente.')
      } else {
        toast.success('Producto actualizado correctamente.')
      }
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
      if (!entradaForm.proveedorId || !entradaForm.numeroFactura.trim()) throw new Error('Proveedor y número de factura son obligatorios.')
      if (entradaForm.detalles.some((detalle) => !detalle.productoId || Number(detalle.cantidad) <= 0 || Number(detalle.costoUnitario) < 0)) throw new Error('Completa producto, cantidad y costo de cada fila.')
      const documentoPath = await uploadEntradaInventarioDocumento(entradaForm.documento)
      await createEntradaInventario({
        fecha: entradaForm.fecha, proveedorId: Number(entradaForm.proveedorId), numeroFactura: entradaForm.numeroFactura,
        fechaFactura: entradaForm.fechaFactura || null, observaciones: entradaForm.observaciones, documentoPath,
        estado: confirmar ? 'Confirmada' : 'Borrador',
        detalles: entradaForm.detalles.map((detalle) => ({ productoId: Number(detalle.productoId), unidad: detalle.unidad, cantidad: Number(detalle.cantidad), costoUnitario: Number(detalle.costoUnitario) })),
      })
      if (confirmar) await Promise.all([loadProductos(), loadMovimientos()])
      handleCloseModal()
      toast.success(confirmar ? 'Entrada confirmada correctamente.' : 'Entrada guardada como borrador.')
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
      toast.success('Movimiento registrado correctamente.')
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
        toast.success(modalType === 'provider-add' ? 'Proveedor creado correctamente.' : 'Proveedor actualizado correctamente.')
      } catch (error) {
        setProveedorError(error.message || 'No fue posible guardar el proveedor.')
      } finally {
        setIsSavingProveedor(false)
      }
    }

  const handleDeleteProveedor = async (item) => {
      if (!item?.id) return
      try {
        await deleteProveedorInventario(item.id)
        await loadProveedores()
        toast.success('Proveedor desactivado correctamente.')
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
      toast.success('Producto eliminado correctamente.')
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
      <div className="bg-white rounded-xl shadow-md mb-6">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('catalogo')}
            className={`px-6 py-4 font-semibold transition-colors ${
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
            className={`px-6 py-4 font-semibold transition-colors ${
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
            className={`px-6 py-4 font-semibold transition-colors ${
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
            className={`px-6 py-4 font-semibold transition-colors relative ${
              activeTab === 'alertas'
                ? 'border-b-4 border-cyan-500 text-cyan-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <Bell size={18} aria-hidden="true" />
            Alertas de Reabastecimiento
            {alertas.length > 0 && (
              <span className="absolute top-2 right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
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
<div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setReporteOpen(true)}
                  className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-6 py-3 rounded-lg hover:from-indigo-600 hover:to-purple-700 transition-all duration-200 shadow-md hover:shadow-lg font-medium flex items-center justify-center space-x-2"
                >
                  <FileDown size={18} aria-hidden="true" />
                  <span>Reporte</span>
                </button>
                <button
                  onClick={() => handleOpenModal('add')}
                  className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white px-6 py-3 rounded-lg hover:from-cyan-600 hover:to-blue-700 transition-all duration-200 shadow-md hover:shadow-lg font-medium flex items-center justify-center space-x-2"
                >
                  <Plus size={18} aria-hidden="true" />
                  <span>Nuevo Artículo</span>
                </button>
                <button
                  onClick={loadProductos}
                  className="bg-gray-300 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-400 transition-all duration-200 shadow-md font-medium flex items-center justify-center space-x-2"
                >
                  <RefreshCw size={18} aria-hidden="true" />
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
            <div className="overflow-x-auto">
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
          <div className="relative isolate overflow-hidden rounded-3xl border border-cyan-200 bg-gradient-to-br from-cyan-100 via-sky-50 to-blue-100 p-5 shadow-sm sm:p-7">
            <h3 className="text-2xl font-bold text-slate-900 mb-4">Movimientos de Bodega</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <button
                onClick={() => handleOpenModal('entrada')}
                className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-xl hover:from-green-100 hover:to-green-200 transition-all text-center border-2 border-green-200"
              >
                <ArrowDownToLine size={32} aria-hidden="true" className="mx-auto mb-2" />
                <p className="font-semibold text-gray-800">Registro de Entrada</p>
              </button>
              <button
                onClick={() => handleOpenModal('merma')}
                className="bg-gradient-to-br from-orange-50 to-orange-100 p-6 rounded-xl hover:from-orange-100 hover:to-orange-200 transition-all text-center border-2 border-orange-200"
              >
                <TriangleAlert size={32} aria-hidden="true" className="mx-auto mb-2" />
                <p className="font-semibold text-gray-800">Gestión de Mermas</p>
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
                    {tiposMovimiento.map((tipo) => (
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
            <div className="overflow-x-auto">
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
                        {(mov.tipo === 'Entrada' || mov.tipo === 'Merma') && (
                          <button
                            type="button"
                            onClick={() => handleOpenModal('movement-view', mov)}
                            className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-cyan-700 hover:bg-cyan-50"
                            title={`Ver detalle de ${mov.tipo.toLowerCase()}`}
                          >
                            <Eye size={16} aria-hidden="true" />
                            Ver
                          </button>
                        )}
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
          <div className="overflow-x-auto">
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
                <div key={producto.id} className={`bg-white rounded-xl shadow-md p-6 border-l-8 ${
                  criticidad === 'crítico' ? 'border-red-500' : 'border-yellow-500'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        {criticidad === 'crítico' ? (
                          <TriangleAlert size={30} aria-hidden="true" className="text-red-500" />
                        ) : (
                          <AlertTriangle size={30} aria-hidden="true" className="text-yellow-500" />
                        )}
                        <div>
                          <h4 className="text-lg font-bold text-gray-800">{producto.nombre}</h4>
                          <p className="text-sm text-gray-600">Código: {producto.codigo}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-4 gap-4 mt-4">
                        <div>
                          <p className="text-xs text-gray-600 mb-1">Stock Actual</p>
                          <p className={`text-2xl font-bold ${criticidad === 'crítico' ? 'text-red-600' : 'text-yellow-600'}`}>
                            {producto.stock}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600 mb-1">Stock Mínimo</p>
                          <p className="text-2xl font-bold text-gray-800">{producto.minimo}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600 mb-1">Faltante</p>
                          <p className="text-2xl font-bold text-gray-800">{producto.minimo - producto.stock}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600 mb-1">Nivel</p>
                          <p className={`text-2xl font-bold ${criticidad === 'crítico' ? 'text-red-600' : 'text-yellow-600'}`}>
                            {porcentaje.toFixed(0)}%
                          </p>
                        </div>
                      </div>
                      <div className="mt-4 bg-gray-200 rounded-full h-3 overflow-hidden">
                        <div 
                          className={`h-full transition-all ${criticidad === 'crítico' ? 'bg-red-500' : 'bg-yellow-500'}`}
                          style={{ width: `${Math.min(porcentaje, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                    <div className="ml-6">
                      <button
                        onClick={() => handleOpenModal('entrada', producto)}
                        className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white px-6 py-3 rounded-lg hover:from-cyan-600 hover:to-blue-700 transition-all shadow-md font-medium"
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-gray-800">
                  {modalType === 'add' && 'Nuevo Artículo'}
                  {modalType === 'edit' && 'Editar Artículo'}
                  {modalType === 'view' && 'Ver Artículo'}
                  {modalType === 'entrada' && 'Registro de Entrada'}
                  {modalType === 'merma' && 'Gestión de Mermas'}
                  {modalType === 'movement-view' && `Detalle de ${selectedItem?.tipo || 'Movimiento'}`}
                  {modalType === 'provider-add' && 'Nuevo Proveedor'}
                  {modalType === 'provider-edit' && 'Editar Proveedor'}
                </h3>
                <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-600" title="Cerrar" aria-label="Cerrar">
                  <X size={22} aria-hidden="true" />
                </button>
              </div>

              {modalType === 'movement-view' && selectedItem && (
                <div className="space-y-4">
                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div><span className="text-xs font-semibold uppercase text-gray-500">Fecha</span><p className="mt-1 text-gray-800">{selectedItem.fecha}</p></div>
                      <div><span className="text-xs font-semibold uppercase text-gray-500">Tipo</span><p className="mt-1 font-semibold text-gray-800">{selectedItem.tipo}</p></div>
                      <div><span className="text-xs font-semibold uppercase text-gray-500">Producto</span><p className="mt-1 text-gray-800">{selectedItem.producto}</p></div>
                      <div><span className="text-xs font-semibold uppercase text-gray-500">Cantidad</span><p className="mt-1 font-semibold text-gray-800">{selectedItem.cantidad}</p></div>
                      <div><span className="text-xs font-semibold uppercase text-gray-500">Proveedor</span><p className="mt-1 text-gray-800">{selectedItem.proveedor || 'No aplica'}</p></div>
                      <div><span className="text-xs font-semibold uppercase text-gray-500">Usuario</span><p className="mt-1 text-gray-800">{selectedItem.usuario}</p></div>
                      <div><span className="text-xs font-semibold uppercase text-gray-500">Costo unitario</span><p className="mt-1 text-gray-800">Q{selectedItem.costoUnitario.toFixed(2)}</p></div>
                      <div><span className="text-xs font-semibold uppercase text-gray-500">Pérdida económica</span><p className="mt-1 font-semibold text-orange-600">Q{selectedItem.perdidaEconomica.toFixed(2)}</p></div>
                      <div><span className="text-xs font-semibold uppercase text-gray-500">Stock</span><p className="mt-1 text-gray-800">{selectedItem.stockAntes ?? '—'} → {selectedItem.stockDespues ?? '—'}</p></div>
                    </div>
                  </div>
                  <div>
                    <span className="text-xs font-semibold uppercase text-gray-500">Motivo / Observaciones</span>
                    <p className="mt-2 whitespace-pre-wrap rounded-lg border border-gray-200 p-3 text-sm text-gray-700">{selectedItem.motivo || 'Sin observaciones'}</p>
                  </div>
                  {selectedItem.documentoUrl && (
                    <a
                      href={selectedItem.documentoUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex w-full items-center justify-center rounded-lg bg-cyan-50 py-3 font-medium text-cyan-700 hover:bg-cyan-100"
                    >
                      Ver factura adjunta
                    </a>
                  )}
                  <button type="button" onClick={handleCloseModal} className="w-full rounded-lg bg-gray-200 py-3 font-medium text-gray-700 hover:bg-gray-300">Cerrar</button>
                </div>
              )}

              {(modalType === 'provider-add' || modalType === 'provider-edit') && (
                <form className="space-y-4" onSubmit={handleSubmitProveedor} noValidate>
                  {proveedorError && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{proveedorError}</div>}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      ['nombre', 'Nombre o razón social', 'Nombre del proveedor'],
                      ['nit', 'NIT', '000000-0'],
                      ['telefono', 'Teléfono', '5555-5555'],
                      ['correo', 'Correo electrónico', 'correo@ejemplo.com'],
                    ].map(([field, label, placeholder]) => (
                      <div key={field}>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">{label}{(field === 'codigo' || field === 'nombre') && ' *'}</label>
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
                          className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400"
                          required={field === 'nombre'}
                        />
                      </div>
                    ))}
                  </div>
                  <div className="flex space-x-3 pt-4">
                    <button type="button" onClick={handleCloseModal} className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-medium">Cancelar</button>
                    <button type="submit" disabled={isSavingProveedor} className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-600 text-white py-3 rounded-lg font-medium disabled:opacity-50">
                      {isSavingProveedor ? 'Guardando...' : 'Guardar Proveedor'}
                    </button>
                  </div>
                </form>
              )}

              {(modalType === 'add' || modalType === 'edit' || modalType === 'view') && (
                <form className="space-y-4" onSubmit={handleSubmitProducto} noValidate>
                  {errorProducto && (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                      {errorProducto}
                    </div>
                  )}
                  
                  {/* Mostrar código generado automáticamente */}
                  {productoForm.codigo && (
                    <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                      <p className="text-xs text-blue-600 font-semibold mb-1">CÓDIGO ASIGNADO</p>
                      <p className="text-xl font-bold text-blue-700 font-mono">{productoForm.codigo}</p>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Categoría</label>
                    <select
                      value={productoForm.categoria}
                      onChange={(e) => handleProductoFormChange('categoria', e.target.value)}
                      disabled={modalType === 'view'}
                      className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400"
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
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Nombre del Producto</label>
                    <input
                      type="text"
                      value={productoForm.nombre}
                      onChange={(e) => handleProductoFormChange('nombre', e.target.value)}
                      readOnly={modalType === 'view'}
                      placeholder="Bolsa Hielo Cubo 5lb"
                      className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Stock Mínimo</label>
                    <input
                      type="number"
                      step="0.01"
                      value={productoForm.minimo}
                      onChange={(e) => handleProductoFormChange('minimo', e.target.value)}
                      readOnly={modalType === 'view'}
                      placeholder="0"
                      className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400"
                      min="0"
                    />
                    <p className="mt-1 text-xs text-gray-500">Opcional. Si lo dejas vacío se guardará en 0.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Cantidad por paquete</label>
                      <input
                        type="number"
                        step="0.01"
                        value={productoForm.cantidadCompra}
                        onChange={(e) => handleProductoFormChange('cantidadCompra', e.target.value)}
                        readOnly={modalType === 'view'}
                        placeholder="50"
                        className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400"
                        min="0"
                      />
                      <p className="mt-1 text-xs text-gray-500">Ejemplo: 50 vasos por paquete.</p>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Precio por paquete (Q)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={productoForm.precioPaquete}
                        onChange={(e) => handleProductoFormChange('precioPaquete', e.target.value)}
                        readOnly={modalType === 'view'}
                        placeholder="30.00"
                        className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400"
                        min="0"
                      />
                      <p className="mt-1 text-xs text-gray-500">Ejemplo: Q30.00 por el paquete completo.</p>
                    </div>
                  </div>

                  <div className="bg-cyan-50 border border-cyan-100 rounded-lg p-4">
                    <label className="block text-sm font-semibold text-cyan-800 mb-2">Costo unitario calculado</label>
                    <div className="text-2xl font-bold text-cyan-700">
                      Q{calcularCostoUnitario().toFixed(2)}
                    </div>
                    <p className="mt-1 text-xs text-cyan-700">Este valor se guardará como costo unitario para inventario, recetas y ventas.</p>
                  </div>

                  <div className="flex space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={handleCloseModal}
                      className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                    >
                      Cancelar
                    </button>
                    {modalType === 'view' ? (
                      <button
                        type="button"
                        onClick={handleCloseModal}
                        className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-600 text-white py-3 rounded-lg hover:from-cyan-600 hover:to-blue-700 transition-all shadow-md font-medium"
                      >
                        Cerrar
                      </button>
                    ) : (
                      <button
                        type="submit"
                        disabled={isSavingProducto}
                        className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-600 text-white py-3 rounded-lg hover:from-cyan-600 hover:to-blue-700 transition-all shadow-md font-medium disabled:opacity-50"
                      >
                        {isSavingProducto ? 'Guardando...' : modalType === 'add' ? 'Crear Artículo' : 'Guardar Cambios'}
                      </button>
                    )}
                  </div>
                </form>
              )}

              {modalType === 'entrada' && (
                <form className="space-y-5" onSubmit={(event) => handleSubmitEntrada(event, true)} noValidate>
                  {errorProducto && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{errorProducto}</div>}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div><span className="block text-xs font-semibold text-gray-500">Número</span><span className="font-bold text-cyan-700">Automático</span><p className="text-[11px] text-gray-400">Se asigna al guardar</p></div>
                    <div><label className="block text-xs font-semibold text-gray-500">Fecha</label><input type="date" value={entradaForm.fecha} onChange={(e) => setEntradaForm({ ...entradaForm, fecha: e.target.value })} className="w-full px-2 py-2 border-2 border-gray-200 rounded-lg" required /></div>
                    <div><span className="block text-xs font-semibold text-gray-500">Tipo</span><span className="font-semibold text-gray-700">Compra</span></div>
                    <div><span className="block text-xs font-semibold text-gray-500">Responsable</span><span className="font-semibold text-gray-700">Usuario actual</span></div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div><label className="block text-sm font-semibold text-gray-700 mb-2">Proveedor *</label><select value={entradaForm.proveedorId} onChange={(e) => setEntradaForm({ ...entradaForm, proveedorId: e.target.value })} className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg" required><option value="">Seleccionar proveedor...</option>{proveedores.filter((p) => p.activo).map((p) => <option key={p.id} value={p.id}>{p.nombre} · NIT: {p.nit || 'Sin NIT'}</option>)}</select></div>
                    <div><label className="block text-sm font-semibold text-gray-700 mb-2">Número de factura *</label><input value={entradaForm.numeroFactura} onChange={(e) => setEntradaForm({ ...entradaForm, numeroFactura: e.target.value })} className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg" required /></div>
                    <div><label className="block text-sm font-semibold text-gray-700 mb-2">Fecha de factura</label><input type="date" value={entradaForm.fechaFactura} onChange={(e) => setEntradaForm({ ...entradaForm, fechaFactura: e.target.value })} className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg" /></div>
                  </div>
                  <div className="border border-gray-200 rounded-xl overflow-x-auto">
                    <table className="min-w-[650px] w-full text-sm"><thead className="bg-gray-50"><tr>{['Producto / unidad', 'Cantidad', 'Costo unitario', 'Total', ''].map((label) => <th key={label} className="px-3 py-2 text-left font-semibold text-gray-600">{label}</th>)}</tr></thead><tbody>
                      {entradaForm.detalles.map((detalle, index) => {
                        const totalLinea = Number(detalle.cantidad || 0) * Number(detalle.costoUnitario || 0)
                        return <tr key={`entrada-detalle-${index}`} className="border-t"><td className="px-2 py-2"><select value={detalle.productoId} onChange={(e) => handleEntradaDetailChange(index, 'productoId', e.target.value)} className="w-full px-2 py-2 border rounded-lg" required><option value="">Seleccionar...</option>{productosVigentes.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}</select><span className="text-xs text-gray-400">{detalle.unidad}</span></td><td className="px-2 py-2"><input type="number" min="0.01" step="0.01" value={detalle.cantidad} onChange={(e) => handleEntradaDetailChange(index, 'cantidad', e.target.value)} className="w-24 px-2 py-2 border rounded-lg" required /></td><td className="px-2 py-2"><input type="number" min="0" step="0.01" value={detalle.costoUnitario} onChange={(e) => handleEntradaDetailChange(index, 'costoUnitario', e.target.value)} className="w-28 px-2 py-2 border rounded-lg" required /></td><td className="px-2 py-2 font-semibold">Q{totalLinea.toFixed(2)}</td><td><button type="button" onClick={() => setEntradaForm((previous) => ({ ...previous, detalles: previous.detalles.filter((_, detailIndex) => detailIndex !== index) }))} disabled={entradaForm.detalles.length === 1} className="text-red-500 disabled:opacity-30" aria-label="Eliminar fila"><Trash2 size={17} /></button></td></tr>
                      })}</tbody></table>
                    <button type="button" onClick={() => setEntradaForm((previous) => ({ ...previous, detalles: [...previous.detalles, { productoId: '', unidad: 'unidad', cantidad: '', costoUnitario: '' }] }))} className="m-3 text-sm font-semibold text-cyan-700">+ Agregar producto</button>
                    <div className="flex justify-end gap-8 border-t bg-gray-50 px-4 py-3 text-sm">
                      <span>Subtotal: <strong>Q{entradaForm.detalles.reduce((sum, detalle) => sum + (Number(detalle.cantidad || 0) * Number(detalle.costoUnitario || 0)), 0).toFixed(2)}</strong></span>
                      <span className="text-base">Total: <strong className="text-cyan-700">Q{entradaForm.detalles.reduce((sum, detalle) => sum + (Number(detalle.cantidad || 0) * Number(detalle.costoUnitario || 0)), 0).toFixed(2)}</strong></span>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div><label className="block text-sm font-semibold text-gray-700 mb-2">Observaciones</label><textarea rows="3" value={entradaForm.observaciones} onChange={(e) => setEntradaForm({ ...entradaForm, observaciones: e.target.value })} className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg" /></div><div><label className="block text-sm font-semibold text-gray-700 mb-2">Documento adjunto</label><input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setEntradaForm({ ...entradaForm, documento: e.target.files?.[0] || null })} className="w-full text-sm" /><p className="text-xs text-gray-500 mt-1">Se almacena de forma segura en Supabase Storage.</p></div></div>
                  <div className="flex justify-end gap-3 border-t pt-4"><button type="button" onClick={handleCloseModal} className="px-5 py-2 rounded-lg bg-gray-200 text-gray-700">Cancelar</button><button type="button" onClick={(event) => handleSubmitEntrada(event, false)} disabled={isSavingMovimiento} className="px-5 py-2 rounded-lg bg-gray-500 text-white disabled:opacity-50">Guardar borrador</button><button type="submit" disabled={isSavingMovimiento} className="px-5 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 text-white disabled:opacity-50">{isSavingMovimiento ? 'Guardando...' : 'Confirmar entrada'}</button></div>
                </form>
              )}

              {(modalType === 'salida' || modalType === 'merma') && (
                <form className="space-y-4" onSubmit={handleSubmitMovimiento} noValidate>
                  {errorProducto && (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                      {errorProducto}
                    </div>
                  )}
                  {modalType === 'merma' && <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><label className="block text-sm font-semibold text-gray-700 mb-2">Motivo *</label><select value={mermaForm.motivoTipo} onChange={(event) => setMermaForm((previous) => ({ ...previous, motivoTipo: event.target.value }))} className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg" required><option value="">Seleccionar motivo...</option>{motivosMerma.map((motivo) => <option key={motivo.id} value={motivo.id}>{motivo.nombre}</option>)}</select></div>
                    <div><label className="block text-sm font-semibold text-gray-700 mb-2">Fecha de la merma *</label><input type="date" value={mermaForm.fecha} onChange={(event) => setMermaForm((previous) => ({ ...previous, fecha: event.target.value }))} className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg" required /></div>
                  </div>}
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
                  {modalType === 'entrada' && (
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Proveedor</label>
                      <select
                        value={movimientoForm.proveedorId}
                        onChange={(e) => handleMovimientoFormChange('proveedorId', e.target.value)}
                        className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400"
                        required
                      >
                        <option value="">Seleccionar proveedor...</option>
                        {proveedores.filter((proveedor) => proveedor.activo).map((proveedor) => (
                          <option key={proveedor.id} value={proveedor.id}>{proveedor.codigo} - {proveedor.nombre}</option>
                        ))}
                      </select>
                      {proveedores.filter((proveedor) => proveedor.activo).length === 0 && (
                        <p className="mt-1 text-xs text-amber-600">Registra un proveedor antes de crear una Entrada.</p>
                      )}
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4">
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
                      {(modalType === 'salida' || modalType === 'merma') && selectedMovimientoProducto && (
                        <p className="mt-1 text-xs text-gray-500">
                          Stock disponible: <span className="font-semibold text-gray-700">{selectedMovimientoProducto.stock}</span>
                        </p>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Motivo / Observaciones</label>
                    <textarea
                      value={movimientoForm.motivo}
                      onChange={(e) => handleMovimientoFormChange('motivo', e.target.value)}
                      rows="3"
                      placeholder={modalType === 'merma' ? 'Ej: Derretido por falla eléctrica' : 'Descripción del movimiento...'}
                      className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400"
                    ></textarea>
                  </div>
                  {modalType === 'merma' && (
                    <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-4">
                      <p className="text-sm font-semibold text-orange-800 mb-2 flex items-center gap-2">
                        <TriangleAlert size={16} aria-hidden="true" />
                        Pérdida Económica
                      </p>
                      <p className="text-2xl font-bold text-orange-600">Q{perdidaEconomicaMerma.toFixed(2)}</p>
                      <p className="text-xs text-orange-700 mt-1">
                        Costo unitario: Q{costoUnitarioMerma.toFixed(2)} x Cantidad: {Number.isNaN(cantidadMerma) ? 0 : cantidadMerma}
                      </p>
                    </div>
                  )}
                  {modalType === 'merma' && <div><label className="block text-sm font-semibold text-gray-700 mb-2">Evidencia opcional</label><input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(event) => setMermaForm((previous) => ({ ...previous, evidencia: event.target.files?.[0] || null }))} className="w-full text-sm" /><p className="text-xs text-gray-500 mt-1">PDF, JPG o PNG de hasta 5 MB.</p></div>}
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
                      className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-600 text-white py-3 rounded-lg hover:from-cyan-600 hover:to-blue-700 transition-all shadow-md font-medium disabled:opacity-50"
                    >
                      {isSavingMovimiento ? 'Registrando...' : 'Registrar Movimiento'}
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

      <ReporteModal
        open={reporteOpen}
        title="Reporte del inventario actual"
        filterLabel="Categoría"
        filterOptions={categoriasReporte}
        generating={generandoReporte}
        onGenerate={handleGenerarReporteInventario}
        onClose={() => setReporteOpen(false)}
      />
    </div>
  )
}

export default Inventarios
