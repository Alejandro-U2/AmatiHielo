import { useCallback, useEffect, useState } from 'react'
import {
  AlertTriangle,
  BookOpen,
  Boxes,
  Calculator,
  Check,
  CheckCircle2,
  Clock,
  Coins,
  DollarSign,
  Eye,
  Factory,
  FileDown,
  FlaskConical,
  ImagePlus,
  Info,
  Layers,
  Package,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Sparkles,
  Trash2,
  TrendingUp,
  X,
  Zap,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  getRecetas,
  getProducciones,
  listCategoriasReceta,
  listPresentacionesReceta,
  listUnidadesMedida,
  addIngrediente,
  deleteIngrediente,
  updateIngrediente,
  createReceta,
  updateReceta,
  deleteReceta,
} from '../../services/recetasService'
import { listProductosInventario } from '../../services/inventarioService'
import Pagination from '../../components/Pagination'
import SortableHeader from '../../components/SortableHeader'
import ReporteModal from '../../components/ReporteModal'
import { generarReporteModulo } from '../../utils/moduloExport'
import { sanitizeSoloLetras, capitalizeWords } from '../../utils/validation'
import { useTableSort, sortRows } from '../../hooks/useTableSort'
import ModuleHeader from '../ModuleHeader'
import SuccessModal from '../SuccessModal'

function compressImageFile(file, maxDimension = 480, quality = 0.82) {
  return new Promise((resolve, reject) => {
    if (!file) return resolve('')
    if (!file.type.startsWith('image/')) {
      return reject(new Error('El archivo seleccionado debe ser una imagen válida.'))
    }
    if (file.size > 8 * 1024 * 1024) {
      return reject(new Error('La imagen original no debe superar los 8MB.'))
    }
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('No fue posible leer la imagen seleccionada.'))
    reader.onload = (e) => {
      const img = new Image()
      img.onerror = () => reject(new Error('Formato de imagen inválido o no compatible.'))
      img.onload = () => {
        try {
          let { width, height } = img
          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width)
              width = maxDimension
            } else {
              width = Math.round((width * maxDimension) / height)
              height = maxDimension
            }
          }
          const canvas = document.createElement('canvas')
          canvas.width = width
          canvas.height = height
          const ctx = canvas.getContext('2d')
          if (!ctx) {
            return resolve(String(e.target?.result || ''))
          }
          ctx.drawImage(img, 0, 0, width, height)
          let compressed = canvas.toDataURL('image/webp', quality)
          if (!compressed.startsWith('data:image/webp')) {
            compressed = canvas.toDataURL('image/jpeg', quality)
          }
          resolve(compressed)
        } catch {
          resolve(String(e.target?.result || ''))
        }
      }
      img.src = String(e.target?.result || '')
    }
    reader.readAsDataURL(file)
  })
}

function RecetaImageField({ value, onChange }) {
  const [dragOver, setDragOver] = useState(false)
  const [urlInput, setUrlInput] = useState('')
  const [showUrlField, setShowUrlField] = useState(false)

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const dataUrl = await compressImageFile(file)
      onChange(dataUrl)
    } catch (err) {
      toast.error(err.message || 'Error al procesar la imagen')
    }
  }

  const handleApplyUrl = () => {
    if (!urlInput.trim()) return
    onChange(urlInput.trim())
    setUrlInput('')
    setShowUrlField(false)
  }

  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
        Foto del Producto (Punto de Venta)
      </label>
      {value ? (
        <div className="relative group w-full h-44 rounded-2xl border-2 border-cyan-400/40 bg-slate-50 dark:bg-slate-800/60 overflow-hidden flex items-center justify-center shadow-inner">
          <img
            src={value}
            alt="Vista previa"
            className="w-full h-full object-contain p-2"
          />
          <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-xs opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => onChange('')}
              className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-md transition-colors"
            >
              <Trash2 size={14} /> Quitar imagen
            </button>
          </div>
        </div>
      ) : (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={async (e) => {
            e.preventDefault()
            setDragOver(false)
            const file = e.dataTransfer.files?.[0]
            if (file) {
              try {
                const dataUrl = await compressImageFile(file)
                onChange(dataUrl)
              } catch (err) {
                toast.error(err.message || 'Error al procesar la imagen')
              }
            }
          }}
          className={`border-2 border-dashed rounded-2xl p-4 text-center transition-all ${
            dragOver
              ? 'border-cyan-500 bg-cyan-50/70 dark:bg-cyan-950/30'
              : 'border-gray-200 dark:border-slate-700 hover:border-cyan-400 dark:hover:border-cyan-500 bg-gray-50/60 dark:bg-slate-800/30'
          }`}
        >
          <div className="flex flex-col items-center justify-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-cyan-50 dark:bg-cyan-950/50 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shadow-xs">
              <ImagePlus size={20} />
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-300">
              <label className="text-cyan-600 dark:text-cyan-400 font-semibold cursor-pointer hover:underline">
                <span>Subir fotografía</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </label>
              {' '}o arrastra el archivo aquí (máx. 3MB)
            </div>
            <div className="pt-0.5">
              {!showUrlField ? (
                <button
                  type="button"
                  onClick={() => setShowUrlField(true)}
                  className="text-xs text-gray-500 hover:text-cyan-600 dark:text-gray-400 dark:hover:text-cyan-400 underline font-medium"
                >
                  O pegar enlace web
                </button>
              ) : (
                <div className="flex items-center gap-1.5 mt-1.5">
                  <input
                    type="url"
                    placeholder="https://ejemplo.com/foto.jpg"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    className="text-xs px-3 py-1.5 border-2 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:ring-2 focus:ring-cyan-500 w-56 text-gray-800 dark:text-gray-200"
                  />
                  <button
                    type="button"
                    onClick={handleApplyUrl}
                    className="text-xs px-3 py-1.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl hover:shadow-md font-semibold"
                  >
                    OK
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowUrlField(false); setUrlInput('') }}
                    className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


function costoUnitarioEfectivo(ing) {
  const costoUnitario = Number(ing.costoUnitario ?? 0)
  const contenidoTotal = Number(ing.contenidoTotal ?? 0)
  if (contenidoTotal > 0 && costoUnitario > 0) {
    return costoUnitario / contenidoTotal
  }
  return costoUnitario
}

function costoIngredienteLibre(ing) {
  const cantidad = Number(ing.cantidad || 0)
  const contenidoTotal = Number(ing.contenidoTotal ?? 0)
  if (contenidoTotal > 0) {
    return cantidad * (costoUnitarioEfectivo(ing))
  }
  return cantidad * Number(ing.costoUnitario ?? 0)
}

function ProduccionRecetas() {
  const [activeTab, setActiveTab] = useState('recetas') // recetas, costeo, produccion
  const [showModal, setShowModal] = useState(false)
  const [modalType, setModalType] = useState('') // 'addReceta', 'editReceta', 'verBOM', 'producir', 'addIngrediente'
  const [selectedReceta, setSelectedReceta] = useState(null)
  const [selectedIngrediente, setSelectedIngrediente] = useState(null)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  // State management from API
  const [recetas, setRecetas] = useState([])
  const [producciones, setProducciones] = useState([])

  // Ingrediente form state
  const [ingredienteForm, setIngredienteForm] = useState({
    productoId: '',
    nombre: '',
    cantidad: '',
    unidad: '',
    contenidoTotal: '',
    costoUnitario: '',
  })
  const [productosInventario, setProductosInventario] = useState([])
  const [productoSeleccionadoId, setProductoSeleccionadoId] = useState('')
  const [reporteOpen, setReporteOpen] = useState(false)
  const [generandoReporte, setGenerandoReporte] = useState(false)
  const [bomCostosForm, setBomCostosForm] = useState({
    costoElectricidad: 0,
    costoManoObra: 0,
    costoAgua: 0,
    costoLocal: 0,
    precioVenta: 0,
  })

  // Receta form state
  const [recetaForm, setRecetaForm] = useState({
    codigo: '',
    nombre: '',
    categoria: 'Bebidas',
    presentacion: '',
    imagenUrl: '',

    costoElectricidad: '',
    costoManoObra: '',
    costoAgua: '',
    costoLocal: '',
    precioVenta: '',
  })
  const [categoriasReceta, setCategoriasReceta] = useState(['Bebidas', 'Producto Terminado'])
  const [presentaciones, setPresentaciones] = useState(['Tamaño Único', 'Pequeño', 'Mediano', 'Grande'])
  const [unidadesMedida, setUnidadesMedida] = useState(['g', 'ml', 'L', 'kg', 'unidad', 'docena'])
  const [filterCategoria, setFilterCategoria] = useState('todos')
  const [searchTermReceta, setSearchTermReceta] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [currentPageProd, setCurrentPageProd] = useState(1)
  const [pageSize, setPageSize] = useState(5)
  const [pageSizeProd, setPageSizeProd] = useState(5)
  const [currentPageCosteo, setCurrentPageCosteo] = useState(1)
  const [pageSizeCosteo, setPageSizeCosteo] = useState(2)
  const [produccionesTotal, setProduccionesTotal] = useState(0)
  const [prodFechaDesde, setProdFechaDesde] = useState('')
  const [prodFechaHasta, setProdFechaHasta] = useState('')
  const [prodSearchTerm, setProdSearchTerm] = useState('')
  const [prodReloadKey, setProdReloadKey] = useState(0)
  const recetaSort = useTableSort(null)
  const prodSort = useTableSort('fecha', 'desc')

  const recetasFiltradas = (filterCategoria === 'todos' ? recetas : recetas.filter((receta) => receta.categoria === filterCategoria))
    .filter((receta) => {
      const normalizedSearch = searchTermReceta.trim().toLowerCase()
      if (!normalizedSearch) {
        return true
      }
      return receta.codigo.toLowerCase().includes(normalizedSearch)
        || receta.nombre.toLowerCase().includes(normalizedSearch)
    })

  const sortedRecetas = sortRows(recetasFiltradas, recetaSort.sortBy, recetaSort.sortDir, (receta) => {
    switch (recetaSort.sortBy) {
      case 'codigo': return receta.codigo
      case 'nombre': return receta.nombre
      case 'categoria': return receta.categoria
      case 'presentacion': return receta.presentacion
      case 'ingredientes': return receta.ingredientes.length
      case 'materia': return receta.subtotalMateriaPrima
      case 'costosProd': return receta.costosProduccion
      case 'costoTotal': return receta.costoTotal
      default: return null
    }
  })

  const totalPages = Math.max(1, Math.ceil(sortedRecetas.length / pageSize))
  const paginatedRecetas = sortedRecetas.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  const totalPagesProd = Math.max(1, Math.ceil(produccionesTotal / pageSizeProd))

  const totalPagesCosteo = Math.max(1, Math.ceil(recetas.length / pageSizeCosteo))
  const paginatedCosteo = recetas.slice((currentPageCosteo - 1) * pageSizeCosteo, currentPageCosteo * pageSizeCosteo)

  useEffect(() => {
    setCurrentPageCosteo(1)
  }, [recetas.length, pageSizeCosteo])

  useEffect(() => {
    setCurrentPage(1)
  }, [filterCategoria, searchTermReceta, recetaSort.sortBy, recetaSort.sortDir, pageSize])

  useEffect(() => {
    setCurrentPageProd(1)
  }, [pageSizeProd, prodSort.sortBy, prodSort.sortDir, prodFechaDesde, prodFechaHasta, prodSearchTerm])

  useEffect(() => {
    let cancelled = false

    const params = {
      page: currentPageProd,
      pageSize: pageSizeProd,
      sortBy: prodSort.sortBy || undefined,
      sortDir: prodSort.sortDir,
      desde: prodFechaDesde || undefined,
      hasta: prodFechaHasta || undefined,
      search: prodSearchTerm.trim() || undefined,
    }

    getProducciones(params)
      .then((response) => {
        if (cancelled) return
        setProducciones(response.data)
        setProduccionesTotal(response.meta?.total ?? response.data.length)
      })
      .catch(() => {
        if (!cancelled) {
          setProducciones([])
          setProduccionesTotal(0)
        }
      })

    return () => {
      cancelled = true
    }
  }, [currentPageProd, pageSizeProd, prodSort.sortBy, prodSort.sortDir, prodFechaDesde, prodFechaHasta, prodSearchTerm, prodReloadKey])

  const categoriasReporte = (() => {
    const counts = {}
    recetas.forEach((receta) => {
      const categoria = receta.categoria || 'Sin categoría'
      counts[categoria] = (counts[categoria] || 0) + 1
    })

    const options = Object.keys(counts).map((categoria) => ({
      value: categoria,
      label: categoria,
      count: counts[categoria],
    }))

    return [{ value: '', label: 'Todas', count: recetas.length }, ...options]
  })()

  const handleGenerarReporteRecetas = async (categoria = '') => {
    try {
      setGenerandoReporte(true)
      const rows = categoria
        ? recetas.filter((receta) => (receta.categoria || '') === categoria)
        : recetas

      const columns = [
        { key: 'nombre', label: 'NOMBRE', width: 46, align: 'left' },
        { key: 'categoria', label: 'CATEGORÍA', width: 24, align: 'center' },
        { key: 'presentacion', label: 'PRESENTACIÓN', width: 26, align: 'center' },
        { key: 'costoTotal', label: 'COSTO TOTAL', width: 30, align: 'center' },
        { key: 'precioVenta', label: 'PRECIO VENTA', width: 30, align: 'center' },
        { key: 'utilidad', label: 'UTILIDAD', width: 30, align: 'center' },
      ]

      await generarReporteModulo({
        fileName: 'reporte_recetas.pdf',
        title: 'REPORTE DE RECETAS Y COSTOS DE PRODUCCIÓN',
        columns,
        rows: rows.map((receta) => {
          const costoTotal = Number(receta.costoTotal || 0)
          const precioVenta = Number(receta.precioVenta || 0)
          const utilidad = precioVenta - costoTotal
          return {
            nombre: receta.nombre,
            categoria: receta.categoria || '-',
            presentacion: receta.presentacion || '-',
            costoTotal: `Q${costoTotal.toFixed(2)}`,
            precioVenta: `Q${precioVenta.toFixed(2)}`,
            utilidad: `Q${utilidad.toFixed(2)}`,
          }
        }),
        totalLabel: 'TOTAL DE RECETAS',
        totalValue: rows.length,
        filterLabel: categoria || 'Todas',
        note: 'Reporte del catálogo de recetas con el desglose de costos de producción y precio de venta.',
      })
      toast.success('Reporte de recetas generado correctamente.')
      setReporteOpen(false)
    } catch (error) {
      toast.error(error.message || 'No fue posible generar el reporte.')
    } finally {
      setGenerandoReporte(false)
    }
  }

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      setErrorMsg('')
      const [recetasData, categoriasData, presentacionesData, unidadesData] = await Promise.all([
        getRecetas({ includeImages: true }),
        listCategoriasReceta().catch(() => []),
        listPresentacionesReceta().catch(() => []),
        listUnidadesMedida().catch(() => []),
      ])
      setRecetas(recetasData)
      if (categoriasData.length > 0) {
        setCategoriasReceta(categoriasData.map((categoria) => categoria.nombre))
      }
      if (presentacionesData.length > 0) {
        setPresentaciones(presentacionesData.map((presentacion) => presentacion.nombre))
      }
      if (unidadesData.length > 0) {
        setUnidadesMedida(unidadesData.map((unidad) => unidad.nombre))
      }
    } catch (error) {
      setErrorMsg(error.message || 'Error al cargar datos.')
      setRecetas([])
      setProducciones([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const getCategoriaColor = (categoria) => {
    switch(categoria) {
      case 'Bebidas': return 'bg-pink-100 text-pink-700 border-pink-300'
      case 'Producto Terminado': return 'bg-blue-100 text-blue-700 border-blue-300'
      default: return 'bg-gray-100 text-gray-700 border-gray-300'
    }
  }

  // Generar código automático para la receta
  const generarCodigoReceta = () => {
    const numeroReceta = recetas.reduce((max, receta) => {
      const match = String(receta.codigo || '').match(/^REC-(\d+)$/i)
      if (!match) {
        return max
      }

      const numero = Number(match[1])
      return Number.isFinite(numero) && numero > max ? numero : max
    }, 0) + 1
    return `REC-${numeroReceta.toString().padStart(2, '0')}`
  }

  const openModal = (type, item = null) => {
    setModalType(type)
    setSelectedReceta(item)
    setErrorMsg('')
    setSuccessMsg('')
    
    // Si es para crear nueva receta, generar código automáticamente
    if (type === 'addReceta') {
      setRecetaForm({
        codigo: generarCodigoReceta(),
        nombre: '',
        categoria: 'Bebidas',
        presentacion: '',
        imagenUrl: '',
    
        costoElectricidad: '',
        costoManoObra: '',
        costoAgua: '',
        costoLocal: '',
        precioVenta: '',
      })
    }

    if (type === 'verBOM' && item) {
      syncBomCostos(item)
    }
    
    setShowModal(true)
  }

  const resetIngredienteForm = () => {
    setIngredienteForm({
      productoId: '',
      nombre: '',
      cantidad: '',
      unidad: '',
      contenidoTotal: '',
      costoUnitario: '',
    })
    setProductoSeleccionadoId('')
  }

  const closeModal = () => {
    setShowModal(false)
    setModalType('')
    setSelectedReceta(null)
    setSelectedIngrediente(null)
    setErrorMsg('')
    setSuccessMsg('')
    resetIngredienteForm()
    setRecetaForm({
      codigo: '',
      nombre: '',
      categoria: 'Bebidas',
      presentacion: '',
      imagenUrl: '',
  
      costoElectricidad: '',
      costoManoObra: '',
      costoAgua: '',
      costoLocal: '',
      precioVenta: '',
    })
    setProductoSeleccionadoId('')
  }

  useEffect(() => {
    const cargarProductos = async () => {
      try {
        const prods = await listProductosInventario()
        setProductosInventario(prods)
      } catch (err) {
        // no bloquear modal por errores de inventario; mostrar en consola
        console.warn('No se pudo cargar inventario:', err.message || err)
        setProductosInventario([])
      }
    }

    if (modalType === 'addIngrediente' || modalType === 'editIngrediente') {
      cargarProductos()
    }
  }, [modalType])

  const handleAddIngrediente = async () => {
    if (!ingredienteForm.nombre || !ingredienteForm.cantidad || !ingredienteForm.unidad) {
      setErrorMsg('Por favor completa todos los campos requeridos.')
      return
    }

    try {
      setLoading(true)
      // if productoSeleccionadoId is set, ensure nombre/unidad/costo come del producto
      if (productoSeleccionadoId) {
        const prod = productosInventario.find(p => String(p.id) === String(productoSeleccionadoId))
        if (prod) {
          ingredienteForm.productoId = prod.id
          ingredienteForm.nombre = prod.nombre
          ingredienteForm.unidad = ingredienteForm.unidad || prod.unidad || ''
          ingredienteForm.costoUnitario = ingredienteForm.costoUnitario || prod.costoUnitario || ''
        }
      }
      const { ingrediente: newIngrediente, receta: costosReceta } = await addIngrediente(selectedReceta.id, {
        productoId: ingredienteForm.productoId || productoSeleccionadoId || null,
        nombre: ingredienteForm.nombre,
        cantidad: Number(ingredienteForm.cantidad),
        unidad: ingredienteForm.unidad,
        contenidoTotal: ingredienteForm.contenidoTotal ? Number(ingredienteForm.contenidoTotal) : null,
        costoUnitario: ingredienteForm.costoUnitario ? Number(ingredienteForm.costoUnitario) : null,
      })

      // Actualizar receta local con nuevo ingrediente y costos recalculados
      setRecetas(recetas.map(r => {
        if (r.id === selectedReceta.id) {
          return {
            ...r,
            ...costosReceta,
            ingredientes: [...(r.ingredientes || []), newIngrediente],
          }
        }
        return r
      }))

      setSelectedReceta(prev => ({
        ...prev,
        ...costosReceta,
        ingredientes: [...(prev.ingredientes || []), newIngrediente],
      }))

      setSuccessMsg('✅ Ingrediente agregado correctamente')
      resetIngredienteForm()
      setErrorMsg('')
    } catch (error) {
      setErrorMsg(error.message || 'Error al agregar ingrediente.')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteIngrediente = async (ingredienteId) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este ingrediente?')) {
      return
    }

    try {
      setLoading(true)
      const costosReceta = await deleteIngrediente(selectedReceta.id, ingredienteId)

      // Actualizar receta local
      setRecetas(recetas.map(r => {
        if (r.id === selectedReceta.id) {
          return {
            ...r,
            ...(costosReceta || {}),
            ingredientes: (r.ingredientes || []).filter(i => i.id !== ingredienteId),
          }
        }
        return r
      }))

      setSelectedReceta(prev => ({
        ...prev,
        ...(costosReceta || {}),
        ingredientes: (prev.ingredientes || []).filter(i => i.id !== ingredienteId),
      }))

      setSuccessMsg('Ingrediente eliminado correctamente.')
    } catch (error) {
      setErrorMsg(error.message || 'Error al eliminar ingrediente.')
    } finally {
      setLoading(false)
    }
  }

  const handleEditIngrediente = (ingrediente) => {
    setSelectedIngrediente(ingrediente)
    setIngredienteForm({
      productoId: ingrediente.productoId ? String(ingrediente.productoId) : '',
      nombre: ingrediente.nombre,
      cantidad: ingrediente.cantidad.toString(),
      unidad: ingrediente.unidad,
      contenidoTotal: ingrediente.contenidoTotal ? ingrediente.contenidoTotal.toString() : '',
      costoUnitario: ingrediente.costoUnitario ? ingrediente.costoUnitario.toString() : '',
    })
    setProductoSeleccionadoId(ingrediente.productoId ? String(ingrediente.productoId) : '')
    setModalType('editIngrediente')
  }

  const syncBomCostos = (receta) => {
    setBomCostosForm({
      costoElectricidad: receta.costoElectricidad ?? 0,
      costoManoObra: receta.costoManoObra ?? 0,
      costoAgua: receta.costoAgua ?? 0,
      costoLocal: receta.costoLocal ?? 0,
      precioVenta: receta.precioVenta ?? 0,
    })
  }

  const handleBomCostosChange = (campo, valor) => {
    setBomCostosForm((prev) => ({ ...prev, [campo]: Number(valor) || 0 }))
  }

  const guardarCostosProduccion = async () => {
    if (!selectedReceta) return
    if (bomCostosForm.costoElectricidad < 0 || bomCostosForm.costoManoObra < 0 || bomCostosForm.costoAgua < 0 || bomCostosForm.costoLocal < 0) {
      setErrorMsg('Los costos de producción no pueden ser negativos.')
      return
    }
    if (bomCostosForm.precioVenta < 0) {
      setErrorMsg('El precio de venta no puede ser negativo.')
      return
    }
    try {
      setLoading(true)
      setErrorMsg('')
      await updateReceta(selectedReceta.id, {
        costoElectricidad: bomCostosForm.costoElectricidad,
        costoManoObra: bomCostosForm.costoManoObra,
        costoAgua: bomCostosForm.costoAgua,
        costoLocal: bomCostosForm.costoLocal,
        precioVenta: bomCostosForm.precioVenta,
      })
      const recetasActualizadas = await getRecetas({ includeImages: true })
      const nuevaReceta = recetasActualizadas.find((r) => r.id === selectedReceta.id)
      setRecetas(recetasActualizadas)
      if (nuevaReceta) {
        setSelectedReceta(nuevaReceta)
        syncBomCostos(nuevaReceta)
      }
      setSuccessMsg('✅ Costos de producción guardados correctamente.')
    } catch (err) {
      setErrorMsg(err.message || 'Error al guardar los costos de producción.')
    } finally {
      setLoading(false)
    }
  }



  const handleDeleteReceta = async (recetaId) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar esta receta? Se eliminarán todos sus ingredientes.')) {
      return
    }

    try {
      setLoading(true)
      await deleteReceta(recetaId)
      setRecetas(recetas.filter(r => r.id !== recetaId))
      setSuccessMsg('✅ Receta eliminada correctamente')
    } catch (error) {
      setErrorMsg(error.message || 'Error al eliminar la receta.')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateReceta = async () => {
    if (!recetaForm.nombre || !recetaForm.presentacion) {
      setErrorMsg('Por favor completa todos los campos requeridos.')
      return
    }

    try {
      setLoading(true)
      setErrorMsg('')
      const recetaActualizada = await updateReceta(selectedReceta.id, {
        nombre: recetaForm.nombre,
        categoria: recetaForm.categoria,
        presentacion: recetaForm.presentacion,
        imagenUrl: recetaForm.imagenUrl || null,
        costoElectricidad: recetaForm.costoElectricidad ? Number(recetaForm.costoElectricidad) : 0,
        costoManoObra: recetaForm.costoManoObra ? Number(recetaForm.costoManoObra) : 0,
        costoAgua: recetaForm.costoAgua ? Number(recetaForm.costoAgua) : 0,
        costoLocal: recetaForm.costoLocal ? Number(recetaForm.costoLocal) : 0,
        precioVenta: recetaForm.precioVenta ? Number(recetaForm.precioVenta) : 0,
      })

      setRecetas(recetas.map(r => r.id === selectedReceta.id ? recetaActualizada : r))
      setSuccessMsg('✅ Receta actualizada correctamente')
      setTimeout(() => {
        closeModal()
      }, 2000)
    } catch (error) {
      setErrorMsg(error.message || 'Error al actualizar la receta.')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateIngrediente = async () => {
    if (!ingredienteForm.nombre || !ingredienteForm.cantidad || !ingredienteForm.unidad) {
      setErrorMsg('Por favor completa todos los campos requeridos.')
      return
    }

    try {
      setLoading(true)
      const { ingrediente: updatedIngrediente, receta: costosReceta } = await updateIngrediente(selectedReceta.id, selectedIngrediente.id, {
        productoId: ingredienteForm.productoId || productoSeleccionadoId || null,
        nombre: ingredienteForm.nombre,
        cantidad: Number(ingredienteForm.cantidad),
        unidad: ingredienteForm.unidad,
        contenidoTotal: ingredienteForm.contenidoTotal ? Number(ingredienteForm.contenidoTotal) : null,
        costoUnitario: ingredienteForm.costoUnitario ? Number(ingredienteForm.costoUnitario) : null,
      })

      // Actualizar receta local
      setRecetas(recetas.map(r => {
        if (r.id === selectedReceta.id) {
          return {
            ...r,
            ...(costosReceta || {}),
            ingredientes: (r.ingredientes || []).map(i => i.id === selectedIngrediente.id ? updatedIngrediente : i),
          }
        }
        return r
      }))

      setSelectedReceta(prev => ({
        ...prev,
        ...(costosReceta || {}),
        ingredientes: (prev.ingredientes || []).map(i => i.id === selectedIngrediente.id ? updatedIngrediente : i),
      }))

      setSuccessMsg('✅ Ingrediente actualizado correctamente')
      setTimeout(() => {
        closeModal()
      }, 1500)
    } catch (error) {
      setErrorMsg(error.message || 'Error al actualizar ingrediente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <ModuleHeader title="Recetas de Venta (BOM)" description="Cada producto de venta consume directamente sus materias primas al venderse en POS" eyebrow="Producción" />

      {/* Estadísticas rápidas */}
      <div className="dashboard-kpis grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 md:gap-5 mb-6">
        {[
          { label: 'Recetas Registradas', value: String(recetas.length), change: 'Catálogo activo', tone: 'blue', icon: BookOpen, chart: 'dashboard-chart-blue' },
          { label: 'Fichas con BOM', value: String(recetas.filter((r) => (r.ingredientes?.length || 0) > 0).length), change: 'Consumo directo POS', tone: 'green', icon: Factory, chart: 'dashboard-chart-green' },
          { label: 'Costo Promedio', value: `Q${(recetas.length ? recetas.reduce((s, r) => s + (Number(r.costoTotal) || 0), 0) / recetas.length : 0).toFixed(2)}`, change: 'Por unidad de venta', tone: 'purple', icon: Calculator, chart: 'dashboard-chart-purple' },
          { label: 'Categorías', value: String(categoriasReceta.length), change: 'Clasificaciones', tone: 'orange', icon: Layers, chart: 'dashboard-chart-orange' },
        ].map((metric) => {
          const MetricIcon = metric.icon

          return (
            <div key={metric.label} className={`dashboard-kpi dashboard-tone-${metric.tone}`}>
              <div className="dashboard-kpi-icon"><MetricIcon size={25} strokeWidth={2.2} /></div>
              <div className="min-w-0">
                <p className="dashboard-kpi-label">{metric.label}</p>
                <p className="dashboard-kpi-value">{metric.value}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="dashboard-kpi-change">{metric.change}</span>
                </div>
              </div>
              <div className={`dashboard-sparkline ${metric.chart}`} aria-hidden="true" />
            </div>
          )
        })}
      </div>

      {/* Tabs Navigation */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="flex space-x-2 sm:space-x-4 overflow-x-auto scrollbar-none touch-scroll whitespace-nowrap">
          <button
            onClick={() => setActiveTab('recetas')}
            className={`pb-3 px-2 sm:px-3 text-xs sm:text-sm font-medium transition-colors shrink-0 ${
              activeTab === 'recetas'
                ? 'border-b-2 border-cyan-500 text-cyan-600 font-semibold'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            📋 Catálogo de Recetas
          </button>
          <button
            onClick={() => setActiveTab('costeo')}
            className={`pb-3 px-2 sm:px-3 text-xs sm:text-sm font-medium transition-colors shrink-0 ${
              activeTab === 'costeo'
                ? 'border-b-2 border-cyan-500 text-cyan-600 font-semibold'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            💰 Costeo y Precios
          </button>
        </nav>
      </div>

      {/* Tab: Catálogo de Recetas */}
      {activeTab === 'recetas' && (
        <div>
          <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-3 mb-4">
            <div className="flex flex-col sm:flex-row gap-2 flex-1 w-full lg:max-w-xl">
              <input
                type="text"
                placeholder="Buscar receta..."
                value={searchTermReceta}
                onChange={(e) => setSearchTermReceta(e.target.value)}
                className="w-full sm:flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-sm"
              />
              <select
                value={filterCategoria}
                onChange={(e) => setFilterCategoria(e.target.value)}
                className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 text-sm bg-white"
              >
                <option value="todos">Todas las categorías</option>
                {categoriasReceta.map((categoria) => (
                  <option key={categoria} value={categoria}>{categoria}</option>
                ))}
              </select>
              {(searchTermReceta || filterCategoria !== 'todos') && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchTermReceta('')
                    setFilterCategoria('todos')
                    recetaSort.setSortBy(null)
                  }}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm whitespace-nowrap"
                >
                  Limpiar
                </button>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-start sm:justify-end">
              <button
                type="button"
                onClick={() => setReporteOpen(true)}
                className="flex-1 sm:flex-none px-3.5 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg hover:shadow-lg transition-shadow text-xs sm:text-sm whitespace-nowrap flex items-center gap-1.5 justify-center shadow-xs"
              >
                <FileDown size={16} aria-hidden="true" />
                Reporte
              </button>
              <button
                type="button"
                onClick={() => {
                  loadData()
                  setProdReloadKey((key) => key + 1)
                }}
                disabled={loading}
                className="flex-1 sm:flex-none px-3.5 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-xs sm:text-sm whitespace-nowrap flex items-center gap-1.5 justify-center disabled:opacity-40 disabled:cursor-not-allowed shadow-xs"
              >
                <RefreshCw size={16} aria-hidden="true" className={loading ? 'animate-spin' : ''} />
                Recargar
              </button>
              <button
                onClick={() => openModal('addReceta')}
                className="flex-1 sm:flex-none px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg hover:shadow-lg transition-shadow text-xs sm:text-sm whitespace-nowrap font-medium text-center shadow-xs"
              >
                + Nueva Receta
              </button>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="overflow-x-auto touch-scroll">
            <table className="min-w-full">
              <thead className="bg-gradient-to-r from-cyan-50 to-blue-50">
                <tr>
                  <th className="px-4 md:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase hidden sm:table-cell"><SortableHeader label="Código" sortKey="codigo" sortBy={recetaSort.sortBy} sortDir={recetaSort.sortDir} onSort={recetaSort.toggle} className="text-gray-700" /></th>
                  <th className="px-4 md:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase"><SortableHeader label="Nombre" sortKey="nombre" sortBy={recetaSort.sortBy} sortDir={recetaSort.sortDir} onSort={recetaSort.toggle} className="text-gray-700" /></th>
                  <th className="px-4 md:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase hidden md:table-cell"><SortableHeader label="Categoría" sortKey="categoria" sortBy={recetaSort.sortBy} sortDir={recetaSort.sortDir} onSort={recetaSort.toggle} className="text-gray-700" /></th>
                  <th className="px-4 md:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase hidden lg:table-cell"><SortableHeader label="Presentación" sortKey="presentacion" sortBy={recetaSort.sortBy} sortDir={recetaSort.sortDir} onSort={recetaSort.toggle} className="text-gray-700" /></th>
                  <th className="px-4 md:px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase hidden sm:table-cell"><SortableHeader label="Ingred." sortKey="ingredientes" sortBy={recetaSort.sortBy} sortDir={recetaSort.sortDir} onSort={recetaSort.toggle} align="center" className="text-gray-700" /></th>
                  <th className="px-4 md:px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase hidden lg:table-cell"><SortableHeader label="Materia Prima" sortKey="materia" sortBy={recetaSort.sortBy} sortDir={recetaSort.sortDir} onSort={recetaSort.toggle} align="right" className="text-gray-700" /></th>
                  <th className="px-4 md:px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase hidden lg:table-cell"><SortableHeader label="Costos Prod." sortKey="costosProd" sortBy={recetaSort.sortBy} sortDir={recetaSort.sortDir} onSort={recetaSort.toggle} align="right" className="text-gray-700" /></th>
                  <th className="px-4 md:px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase"><SortableHeader label="Costo Total" sortKey="costoTotal" sortBy={recetaSort.sortBy} sortDir={recetaSort.sortDir} onSort={recetaSort.toggle} align="right" className="text-gray-700" /></th>
                  <th className="px-4 md:px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {paginatedRecetas.map((receta) => (
                  <tr key={receta.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 md:px-6 py-3 md:py-4 text-sm font-medium text-gray-900 hidden sm:table-cell">{receta.codigo}</td>
                    <td className="px-4 md:px-6 py-3 md:py-4">
                      <div className="flex items-center gap-3">
                        {receta.imagenUrl ? (
                          <img
                            src={receta.imagenUrl}
                            alt={receta.nombre}
                            className="w-10 h-10 rounded-lg object-cover border border-gray-200 shadow-xs shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-400 shrink-0">
                            <Package className="w-5 h-5 text-gray-400" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-gray-900 truncate">{receta.nombre}</div>
                          <div className="text-xs text-gray-500 sm:hidden flex items-center gap-1.5 mt-0.5">
                            <span>{receta.codigo}</span>
                            <span className="md:hidden text-cyan-700 font-medium">· {receta.categoria}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 md:px-6 py-3 md:py-4 hidden md:table-cell">
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold border ${getCategoriaColor(receta.categoria)}`}>
                        {receta.categoria}
                      </span>
                    </td>
                    <td className="px-4 md:px-6 py-3 md:py-4 text-sm text-gray-600 hidden lg:table-cell">{receta.presentacion}</td>
                    <td className="px-4 md:px-6 py-3 md:py-4 text-center text-sm text-gray-800 font-medium hidden sm:table-cell">{receta.ingredientes.length}</td>
                    <td className="px-4 md:px-6 py-3 md:py-4 text-right text-sm text-gray-700 hidden lg:table-cell">Q{receta.subtotalMateriaPrima.toFixed(2)}</td>
                    <td className="px-4 md:px-6 py-3 md:py-4 text-right text-sm text-gray-700 hidden lg:table-cell">Q{receta.costosProduccion.toFixed(2)}</td>
                    <td className="px-4 md:px-6 py-3 md:py-4 text-right text-sm font-bold text-gray-900">Q{receta.costoTotal.toFixed(2)}</td>
                    <td className="px-4 md:px-6 py-3 md:py-4">
                      <div className="flex justify-center gap-1 md:gap-2">
                        <button 
                          onClick={() => openModal('verBOM', receta)}
                          className="text-cyan-600 hover:text-cyan-800 font-medium text-sm"
                        >
                          Ver BOM
                        </button>
                        <button 
                          onClick={() => {
                            setSelectedReceta(receta)
                            setRecetaForm({
                              codigo: receta.codigo,
                              nombre: receta.nombre,
                              categoria: receta.categoria,
                              presentacion: receta.presentacion,
                              imagenUrl: receta.imagenUrl || '',
                              costoElectricidad: receta.costoElectricidad ? receta.costoElectricidad.toString() : '',
                              costoManoObra: receta.costoManoObra ? receta.costoManoObra.toString() : '',
                              costoAgua: receta.costoAgua ? receta.costoAgua.toString() : '',
                              costoLocal: receta.costoLocal ? receta.costoLocal.toString() : '',
                              precioVenta: receta.precioVenta ? receta.precioVenta.toString() : '',
                            })
                            setModalType('editReceta')
                            setShowModal(true)
                          }}
                          className="text-blue-600 hover:text-blue-800 text-lg hover:scale-125 transition-transform"
                          title="Editar receta"
                        >
                          ✏️
                        </button>
                        <button 
                          onClick={() => handleDeleteReceta(receta.id)}
                          className="text-red-600 hover:text-red-800 text-lg hover:scale-125 transition-transform"
                          title="Eliminar receta"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
            <Pagination
              page={currentPage}
              totalPages={totalPages}
              onChange={setCurrentPage}
              pageSize={pageSize}
              onPageSizeChange={setPageSize}
              totalItems={sortedRecetas.length}
            />
          </div>
        </div>
      )}

      {/* Tab: Costeo y Precios */}
      {activeTab === 'costeo' && (
        <div>
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Análisis de Costos y Márgenes</h3>
            <p className="text-sm text-gray-600">Desglose detallado de costos de producción y sugerencias de precios de venta</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {paginatedCosteo.map((receta) => {
              const subtotalMateriaPrima = receta.ingredientes.reduce((sum, ing) => sum + ing.costoTotal, 0)
              const costosProduccion = (receta.costosProduccion ?? 0)
              const costoTotal = subtotalMateriaPrima + costosProduccion
              const precioVenta = receta.precioVenta ?? 0
              const utilidad = precioVenta - costoTotal
              const margen = precioVenta > 0 ? (utilidad / precioVenta) * 100 : 0

              return (
                <div key={receta.id} className="bg-white rounded-lg shadow-md p-6 border-l-4 border-cyan-500">
                  <div className="mb-4">
                    <h4 className="text-lg font-bold text-gray-800">{receta.nombre}</h4>
                    <span className={`inline-flex mt-2 px-2 py-1 rounded-full text-xs font-semibold border ${getCategoriaColor(receta.categoria)}`}>
                      {receta.categoria}
                    </span>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center pb-2 border-b">
                      <span className="text-sm text-gray-600">💵 Subtotal Materia Prima</span>
                      <span className="text-sm font-semibold text-gray-800">Q{subtotalMateriaPrima.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center pb-2 border-b">
                      <span className="text-sm text-gray-600">⚙️ Costos de Producción</span>
                      <span className="text-sm font-semibold text-gray-800">Q{costosProduccion.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center pb-2 border-b border-gray-300">
                      <span className="text-base font-semibold text-gray-800">💰 Costo Total</span>
                      <span className="text-base font-bold text-red-600">Q{costoTotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center pb-2">
                      <span className="text-sm text-gray-600">🏷️ Precio de Venta</span>
                      <span className="text-sm font-semibold text-gray-800">Q{(precioVenta || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center pb-2">
                      <span className="text-sm text-gray-600">📈 Utilidad</span>
                      <span className="text-sm font-bold text-green-600">Q{(utilidad || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">🎯 Margen de Utilidad</span>
                      <span className="text-sm font-bold text-green-600">{(margen || 0).toFixed(2)}%</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <Pagination
            page={currentPageCosteo}
            totalPages={totalPagesCosteo}
            onChange={setCurrentPageCosteo}
            pageSize={pageSizeCosteo}
            onPageSizeChange={setPageSizeCosteo}
            totalItems={recetas.length}
            pageSizeOptions={[2, 5, 10, 25]}
          />
        </div>
      )}

      {/* Tab: Registro de Producción */}
      {activeTab === 'produccion' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-800">Historial de Producción</h3>
              <p className="text-sm text-gray-600">Registro de lotes producidos con sincronización automática de inventario</p>
            </div>
            <button
              onClick={() => openModal('producir')}
              className="px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:shadow-lg transition-shadow"
            >
              ✚ Registrar Producción
            </button>
          </div>

          <div className="bg-white rounded-lg shadow-md overflow-hidden mb-4">
            <div className="p-4 border-b border-gray-200">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Buscar</label>
                  <input
                    type="text"
                    placeholder="Lote o usuario..."
                    value={prodSearchTerm}
                    onChange={(e) => setProdSearchTerm(e.target.value)}
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Desde</label>
                  <input
                    type="date"
                    value={prodFechaDesde}
                    onChange={(e) => setProdFechaDesde(e.target.value)}
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Hasta</label>
                  <input
                    type="date"
                    value={prodFechaHasta}
                    onChange={(e) => setProdFechaHasta(e.target.value)}
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent"
                  />
                </div>
                <div className="flex items-end justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setProdSearchTerm('')
                      setProdFechaDesde('')
                      setProdFechaHasta('')
                      prodSort.setSortBy('fecha')
                      prodSort.setSortDir('desc')
                    }}
                    className="text-sm text-cyan-600 hover:text-cyan-800 font-medium inline-flex items-center gap-1"
                  >
                    <X size={14} aria-hidden="true" />
                    Limpiar filtros
                  </button>
                </div>
              </div>
              <p className="text-sm text-gray-500 mt-3">
                {produccionesTotal === 1 ? '1 producción registrada' : `${produccionesTotal} producciones registradas`}
              </p>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <table className="min-w-full">
              <thead className="bg-gradient-to-r from-cyan-50 to-blue-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase"><SortableHeader label="Fecha y Hora" sortKey="fecha" sortBy={prodSort.sortBy} sortDir={prodSort.sortDir} onSort={prodSort.toggle} className="text-gray-700" /></th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Receta</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase"><SortableHeader label="Cantidad" sortKey="cantidad" sortBy={prodSort.sortBy} sortDir={prodSort.sortDir} onSort={prodSort.toggle} align="center" className="text-gray-700" /></th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Lote</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase"><SortableHeader label="Usuario" sortKey="usuario" sortBy={prodSort.sortBy} sortDir={prodSort.sortDir} onSort={prodSort.toggle} className="text-gray-700" /></th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {producciones.map((prod) => (
                  <tr key={prod.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-gray-600">{prod.fecha}</td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{prod.receta}</td>
                    <td className="px-6 py-4 text-center text-sm font-bold text-gray-800">{prod.cantidad}</td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">{prod.lote}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{prod.usuario}</td>
                    <td className="px-6 py-4 text-center">
                      <button className="text-cyan-600 hover:text-cyan-800 text-sm font-medium">
                        Ver Detalle
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination
            page={currentPageProd}
            totalPages={totalPagesProd}
            onChange={setCurrentPageProd}
            pageSize={pageSizeProd}
            onPageSizeChange={setPageSizeProd}
            totalItems={produccionesTotal}
          />

          <div className="mt-6 bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"/>
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-blue-800 font-medium">
                  💡 Sincronización Automática: Al registrar una producción, el sistema descuenta automáticamente los ingredientes del inventario según el BOM definido.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Editar Receta */}
      {showModal && modalType === 'editReceta' && selectedReceta && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col border border-gray-100 dark:border-slate-800 transition-all overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header Sticky */}
            <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-cyan-500/20 to-blue-500/20 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shadow-sm">
                  <Pencil className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    Editar Receta
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Modificación de ficha técnica y parámetros de costeo
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto space-y-5">
              {errorMsg && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs font-medium text-red-700 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
                  <span>{errorMsg}</span>
                </div>
              )}
              {successMsg && (
                <div className="rounded-xl border border-green-200 bg-green-50 p-3.5 text-xs font-medium text-green-700 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-green-600" />
                  <span>{successMsg}</span>
                </div>
              )}

              {/* Card 1: Información Básica */}
              <div className="rounded-xl border border-gray-200 dark:border-slate-700/80 bg-white dark:bg-slate-800/40 p-4 shadow-sm space-y-3.5">
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white pb-2 border-b border-gray-100 dark:border-slate-700/60">
                  <Package className="w-4 h-4 text-cyan-500" />
                  <span>Información del Producto</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wider">
                      Código Receta
                    </label>
                    <input
                      type="text"
                      value={recetaForm.codigo}
                      readOnly
                      className="w-full px-3.5 py-2.5 text-sm border-2 border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/80 rounded-xl font-mono text-gray-500 cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wider">
                      Categoría
                    </label>
                    <select
                      value={recetaForm.categoria}
                      onChange={(e) => setRecetaForm({...recetaForm, categoria: e.target.value})}
                      className="w-full px-3.5 py-2.5 text-sm border-2 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-400 text-gray-800 dark:text-gray-200"
                    >
                      {categoriasReceta.map((categoria) => (
                        <option key={categoria} value={categoria}>{categoria}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wider">
                      Nombre del Producto
                    </label>
                    <input
                      type="text"
                      value={recetaForm.nombre}
                      onChange={(e) => setRecetaForm({...recetaForm, nombre: sanitizeSoloLetras(e.target.value)})}
                      onBlur={(e) => setRecetaForm({...recetaForm, nombre: capitalizeWords(e.target.value)})}
                      placeholder="Ej: Smoothie de Fresa - Grande"
                      className="w-full px-3.5 py-2.5 text-sm border-2 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-400 text-gray-800 dark:text-gray-200"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wider">
                      Presentación
                    </label>
                    <select
                      value={recetaForm.presentacion}
                      onChange={(e) => setRecetaForm({...recetaForm, presentacion: e.target.value})}
                      className="w-full px-3.5 py-2.5 text-sm border-2 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-400 text-gray-800 dark:text-gray-200"
                    >
                      <option value="">Seleccionar presentación...</option>
                      {presentaciones.map((presentacion) => (
                        <option key={presentacion} value={presentacion}>{presentacion}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wider">
                    Precio de Venta al Público (GTQ)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400">Q</span>
                    <input
                      type="number"
                      value={recetaForm.precioVenta}
                      onChange={(e) => setRecetaForm({...recetaForm, precioVenta: e.target.value})}
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                      className="w-full pl-8 pr-3.5 py-2.5 text-sm font-semibold border-2 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-400 text-gray-800 dark:text-gray-200"
                    />
                  </div>
                </div>

                <RecetaImageField
                  value={recetaForm.imagenUrl}
                  onChange={(url) => setRecetaForm({ ...recetaForm, imagenUrl: url })}
                />
              </div>

              {/* Card 2: Costos Operativos */}
              <div className="rounded-xl border border-gray-200 dark:border-slate-700/80 bg-white dark:bg-slate-800/40 p-4 shadow-sm space-y-3.5">
                <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-slate-700/60">
                  <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
                    <Zap className="w-4 h-4 text-amber-500" />
                    <span>Costos Operativos de Producción (GTQ)</span>
                  </div>
                  <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                    Total: Q{(Number(recetaForm.costoElectricidad || 0) + Number(recetaForm.costoManoObra || 0) + Number(recetaForm.costoAgua || 0) + Number(recetaForm.costoLocal || 0)).toFixed(2)}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Electricidad</label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">Q</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={recetaForm.costoElectricidad}
                        onChange={(e) => setRecetaForm({...recetaForm, costoElectricidad: e.target.value})}
                        className="w-full pl-6 pr-2.5 py-2 text-xs font-semibold border-2 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-400 text-gray-800 dark:text-gray-200"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Mano de Obra</label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">Q</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={recetaForm.costoManoObra}
                        onChange={(e) => setRecetaForm({...recetaForm, costoManoObra: e.target.value})}
                        className="w-full pl-6 pr-2.5 py-2 text-xs font-semibold border-2 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-400 text-gray-800 dark:text-gray-200"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Agua</label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">Q</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={recetaForm.costoAgua}
                        onChange={(e) => setRecetaForm({...recetaForm, costoAgua: e.target.value})}
                        className="w-full pl-6 pr-2.5 py-2 text-xs font-semibold border-2 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-400 text-gray-800 dark:text-gray-200"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Uso Local</label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">Q</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={recetaForm.costoLocal}
                        onChange={(e) => setRecetaForm({...recetaForm, costoLocal: e.target.value})}
                        className="w-full pl-6 pr-2.5 py-2 text-xs font-semibold border-2 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-400 text-gray-800 dark:text-gray-200"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Sticky Footer */}
            <div className="px-6 py-4 border-t border-gray-100 dark:border-slate-800 bg-gray-50/80 dark:bg-slate-900/80 backdrop-blur-md sticky bottom-0 z-10 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={closeModal}
                className="px-5 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 font-semibold text-sm hover:bg-gray-50 dark:hover:bg-slate-700/60 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleUpdateReceta}
                disabled={loading}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-semibold text-sm shadow-md hover:shadow-cyan-500/25 transition-all inline-flex items-center gap-2 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {loading ? 'Guardando...' : 'Actualizar Receta'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Ver BOM Detallado */}
      {showModal && modalType === 'verBOM' && selectedReceta && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col border border-gray-100 dark:border-slate-800 transition-all overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header Sticky */}
            <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-cyan-500/20 to-blue-500/20 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shadow-sm">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    Ficha Técnica y Escandallo (BOM)
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {selectedReceta.codigo} · {selectedReceta.nombre}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto space-y-5">
              {/* Error & Success display */}
              {errorMsg && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs font-medium text-red-700 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
                  <span>{errorMsg}</span>
                </div>
              )}
              {successMsg && (
                <div className="rounded-xl border border-green-200 bg-green-50 p-3.5 text-xs font-medium text-green-700 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-green-600" />
                  <span>{successMsg}</span>
                </div>
              )}

              {/* Info General Badges */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-xl border border-gray-200 dark:border-slate-700/80 bg-gray-50/70 dark:bg-slate-800/30">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-cyan-100 dark:bg-cyan-950/50 text-cyan-700 dark:text-cyan-400 flex items-center justify-center text-xs font-bold">
                    COD
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase">Código</p>
                    <p className="text-sm font-bold font-mono text-gray-900 dark:text-white">{selectedReceta.codigo}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400 flex items-center justify-center text-xs font-bold">
                    CAT
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase">Categoría</p>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">{selectedReceta.categoria}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 flex items-center justify-center text-xs font-bold">
                    PR
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase">Presentación</p>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">{selectedReceta.presentacion}</p>
                  </div>
                </div>
              </div>

              {/* Card: Lista de Ingredientes (BOM) */}
              <div className="rounded-xl border border-gray-200 dark:border-slate-700/80 bg-white dark:bg-slate-800/40 p-4 shadow-sm space-y-3">
                <div className="flex justify-between items-center pb-2 border-b border-gray-100 dark:border-slate-700/60">
                  <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
                    <FlaskConical className="w-4 h-4 text-cyan-500" />
                    <span>Insumos y Materias Primas Requeridas</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-100 dark:bg-cyan-950/60 text-cyan-800 dark:text-cyan-300 font-bold">
                      {(selectedReceta?.ingredientes || []).length}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIngredienteForm({
                        nombre: '',
                        cantidad: '',
                        unidad: '',
                        costoUnitario: '',
                      })
                      setModalType('addIngrediente')
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-cyan-500 hover:bg-cyan-600 text-white shadow-sm transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Agregar Insumo</span>
                  </button>
                </div>

                <div className="rounded-xl border border-gray-200 dark:border-slate-700/80 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
                      <thead className="bg-gray-50 dark:bg-slate-800/70">
                        <tr>
                          <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Material / Insumo</th>
                          <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Dosificación</th>
                          <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Costo Unit.</th>
                          <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Costo Insumo</th>
                          <th className="px-4 py-2.5 text-center text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-slate-700/60 bg-white dark:bg-slate-900/40">
                        {(selectedReceta?.ingredientes || []).length === 0 ? (
                          <tr>
                            <td colSpan="5" className="px-4 py-6 text-center text-xs text-gray-500 dark:text-gray-400 italic">
                              Esta receta aún no tiene ingredientes registrados. Agrega insumos para calcular su costo.
                            </td>
                          </tr>
                        ) : (
                          (selectedReceta?.ingredientes || []).map((ing) => (
                            <tr key={ing.id} className="hover:bg-gray-50/70 dark:hover:bg-slate-800/40 transition-colors">
                              <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white">
                                {ing.nombre}
                              </td>
                              <td className="px-4 py-3 text-sm text-right text-gray-700 dark:text-gray-300">
                                <span className="font-bold">{ing.cantidad}</span> {ing.unidad}
                              </td>
                              <td className="px-4 py-3 text-sm text-right font-mono text-gray-600 dark:text-gray-400">
                                Q{(costoUnitarioEfectivo(ing) || 0).toFixed(2)}
                              </td>
                              <td className="px-4 py-3 text-sm text-right font-bold font-mono text-gray-900 dark:text-white">
                                Q{costoIngredienteLibre(ing).toFixed(2)}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <div className="flex items-center justify-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => handleEditIngrediente(ing)}
                                    className="p-1.5 rounded-lg text-blue-600 hover:text-blue-800 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors"
                                    title="Editar insumo"
                                  >
                                    <Pencil className="w-4 h-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteIngrediente(ing.id)}
                                    className="p-1.5 rounded-lg text-rose-600 hover:text-rose-800 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                                    title="Eliminar insumo"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                        <tr className="bg-cyan-50/80 dark:bg-cyan-950/30 border-t-2 border-cyan-200 dark:border-cyan-800">
                          <td colSpan="3" className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-cyan-900 dark:text-cyan-300">
                            Subtotal Materia Prima (BOM)
                          </td>
                          <td className="px-4 py-3 text-sm text-right font-black font-mono text-cyan-800 dark:text-cyan-200">
                            Q{((selectedReceta?.ingredientes || []).reduce((sum, ing) => sum + costoIngredienteLibre(ing), 0)).toFixed(2)}
                          </td>
                          <td></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Card: Costos Operativos de Producción */}
              <div className="rounded-xl border border-gray-200 dark:border-slate-700/80 bg-white dark:bg-slate-800/40 p-4 shadow-sm space-y-3.5">
                <div className="flex justify-between items-center pb-2 border-b border-gray-100 dark:border-slate-700/60">
                  <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
                    <Zap className="w-4 h-4 text-amber-500" />
                    <span>Costos Indirectos y Operación (GTQ)</span>
                  </div>
                  <button
                    type="button"
                    onClick={guardarCostosProduccion}
                    disabled={loading}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg hover:shadow-md transition-all disabled:opacity-50"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{loading ? 'Guardando...' : 'Guardar Costos'}</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Electricidad</label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">Q</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={bomCostosForm.costoElectricidad}
                        onChange={(e) => handleBomCostosChange('costoElectricidad', e.target.value)}
                        className="w-full pl-6 pr-2.5 py-2 text-xs font-semibold border-2 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-400 text-gray-800 dark:text-gray-200"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Mano de Obra</label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">Q</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={bomCostosForm.costoManoObra}
                        onChange={(e) => handleBomCostosChange('costoManoObra', e.target.value)}
                        className="w-full pl-6 pr-2.5 py-2 text-xs font-semibold border-2 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-400 text-gray-800 dark:text-gray-200"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Agua</label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">Q</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={bomCostosForm.costoAgua}
                        onChange={(e) => handleBomCostosChange('costoAgua', e.target.value)}
                        className="w-full pl-6 pr-2.5 py-2 text-xs font-semibold border-2 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-400 text-gray-800 dark:text-gray-200"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Uso Local</label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">Q</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={bomCostosForm.costoLocal}
                        onChange={(e) => handleBomCostosChange('costoLocal', e.target.value)}
                        className="w-full pl-6 pr-2.5 py-2 text-xs font-semibold border-2 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-400 text-gray-800 dark:text-gray-200"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-gray-100 dark:border-slate-700/60 text-xs">
                  <span className="font-semibold text-gray-600 dark:text-gray-400">Total Gastos Operativos:</span>
                  <span className="font-bold font-mono text-amber-700 dark:text-amber-400 text-sm">
                    Q{(bomCostosForm.costoElectricidad + bomCostosForm.costoManoObra + bomCostosForm.costoAgua + bomCostosForm.costoLocal).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Card: Resumen Financiero y Rentabilidad */}
              {(() => {
                const subtotalMP = (selectedReceta?.ingredientes || []).reduce((sum, ing) => sum + costoIngredienteLibre(ing), 0)
                const totalOperativo = bomCostosForm.costoElectricidad + bomCostosForm.costoManoObra + bomCostosForm.costoAgua + bomCostosForm.costoLocal
                const costoTotal = subtotalMP + totalOperativo
                const precioVenta = bomCostosForm.precioVenta || 0
                const utilidad = precioVenta - costoTotal
                const margen = precioVenta > 0 ? (utilidad / precioVenta) * 100 : 0

                return (
                  <div className="rounded-xl border border-gray-200 dark:border-slate-700/80 bg-white dark:bg-slate-800/40 p-4 shadow-sm space-y-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white pb-2 border-b border-gray-100 dark:border-slate-700/60">
                      <TrendingUp className="w-4 h-4 text-emerald-500" />
                      <span>Análisis Financiero y Rentabilidad por Unidad</span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="p-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50/60 dark:bg-slate-800/50">
                        <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase">Materia Prima</p>
                        <p className="text-base font-extrabold font-mono text-gray-900 dark:text-white mt-0.5">
                          Q{subtotalMP.toFixed(2)}
                        </p>
                      </div>
                      <div className="p-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50/60 dark:bg-slate-800/50">
                        <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase">Gastos Operativos</p>
                        <p className="text-base font-extrabold font-mono text-gray-900 dark:text-white mt-0.5">
                          Q{totalOperativo.toFixed(2)}
                        </p>
                      </div>
                      <div className="p-3 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/50 dark:bg-blue-950/30">
                        <p className="text-[11px] font-semibold text-blue-700 dark:text-blue-300 uppercase">Costo Total</p>
                        <p className="text-base font-black font-mono text-blue-800 dark:text-blue-200 mt-0.5">
                          Q{costoTotal.toFixed(2)}
                        </p>
                      </div>
                      <div className="p-3 rounded-xl border border-cyan-200 dark:border-cyan-900/60 bg-cyan-50/50 dark:bg-cyan-950/30">
                        <p className="text-[11px] font-semibold text-cyan-700 dark:text-cyan-300 uppercase">Precio de Venta</p>
                        <p className="text-base font-black font-mono text-cyan-800 dark:text-cyan-200 mt-0.5">
                          Q{precioVenta.toFixed(2)}
                        </p>
                      </div>
                    </div>

                    {/* Banner de Ganancia / Margen */}
                    <div className={`p-4 rounded-xl border-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 ${
                      utilidad < 0
                        ? 'border-rose-300 bg-rose-50/80 dark:bg-rose-950/30 text-rose-800 dark:text-rose-300'
                        : utilidad === 0
                        ? 'border-amber-300 bg-amber-50/80 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300'
                        : 'border-emerald-300 bg-emerald-50/80 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300'
                    }`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black ${
                          utilidad < 0 ? 'bg-rose-200 text-rose-800' : 'bg-emerald-200 text-emerald-800'
                        }`}>
                          {utilidad < 0 ? '!' : '✓'}
                        </div>
                        <div>
                          <p className="text-xs font-bold uppercase tracking-wider">
                            {utilidad < 0 ? 'Receta en Pérdida Económica' : utilidad === 0 ? 'Punto de Equilibrio (Sin Utilidad)' : 'Margen Comercial Favorable'}
                          </p>
                          <p className="text-xs opacity-80">
                            {utilidad < 0
                              ? 'El costo de producción supera el precio asignado al producto.'
                              : 'Ganancia neta estimada por unidad producida y vendida.'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 sm:text-right">
                        <div>
                          <p className="text-[10px] uppercase font-bold tracking-wider opacity-70">Utilidad Unitaria</p>
                          <p className={`text-xl font-black font-mono ${utilidad < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                            Q{utilidad.toFixed(2)}
                          </p>
                        </div>
                        <div className="pl-3 border-l border-current/20">
                          <p className="text-[10px] uppercase font-bold tracking-wider opacity-70">Margen %</p>
                          <p className={`text-xl font-black font-mono ${margen < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                            {margen.toFixed(1)}%
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })()}
            </div>

            {/* Sticky Footer */}
            <div className="px-6 py-4 border-t border-gray-100 dark:border-slate-800 bg-gray-50/80 dark:bg-slate-900/80 backdrop-blur-md sticky bottom-0 z-10 flex items-center justify-end">
              <button
                type="button"
                onClick={closeModal}
                className="px-6 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 font-semibold text-sm hover:bg-gray-50 dark:hover:bg-slate-700/60 transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Registrar Producción */}
      {showModal && modalType === 'producir' && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-lg w-full max-h-[92vh] flex flex-col border border-gray-100 dark:border-slate-800 transition-all overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header Sticky */}
            <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-emerald-500/20 to-teal-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-sm">
                  <Factory className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    Registrar Producción
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Deducción de insumos del inventario según BOM
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto space-y-4">
              {errorMsg && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs font-medium text-red-700 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
                  <span>{errorMsg}</span>
                </div>
              )}
              {successMsg && (
                <div className="rounded-xl border border-green-200 bg-green-50 p-3.5 text-xs font-medium text-green-700 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-green-600" />
                  <span>{successMsg}</span>
                </div>
              )}

              <div className="rounded-xl border border-gray-200 dark:border-slate-700/80 bg-white dark:bg-slate-800/40 p-4 shadow-sm space-y-3.5">
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white pb-2 border-b border-gray-100 dark:border-slate-700/60">
                  <Boxes className="w-4 h-4 text-emerald-500" />
                  <span>Parámetros del Lote a Fabricar</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wider">
                    Receta / Producto Terminado
                  </label>
                  <select className="w-full px-3.5 py-2.5 text-sm border-2 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400 text-gray-800 dark:text-gray-200">
                    <option value="">Seleccionar receta...</option>
                    {recetas.map(r => (
                      <option key={r.id} value={r.id}>{r.nombre}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wider">
                    Cantidad a Producir
                  </label>
                  <input
                    type="number"
                    min="1"
                    className="w-full px-3.5 py-2.5 text-sm font-semibold border-2 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400 text-gray-800 dark:text-gray-200"
                    placeholder="Ej: 50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wider">
                    Número de Lote
                  </label>
                  <input
                    type="text"
                    className="w-full px-3.5 py-2.5 text-sm font-mono border-2 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400 text-gray-800 dark:text-gray-200"
                    placeholder="LOT-20260213-XXX"
                    defaultValue={`LOT-${new Date().toISOString().split('T')[0].replace(/-/g, '')}-`}
                  />
                </div>
              </div>

              {/* Notice Banner */}
              <div className="p-3.5 rounded-xl border border-amber-200 dark:border-amber-800/80 bg-amber-50/80 dark:bg-amber-950/30 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                  Al confirmar la orden, el sistema descontará automáticamente las cantidades exactas de materias primas del inventario según la fórmula del BOM.
                </p>
              </div>
            </div>

            {/* Sticky Footer */}
            <div className="px-6 py-4 border-t border-gray-100 dark:border-slate-800 bg-gray-50/80 dark:bg-slate-900/80 backdrop-blur-md sticky bottom-0 z-10 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={closeModal}
                className="px-5 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 font-semibold text-sm hover:bg-gray-50 dark:hover:bg-slate-700/60 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  setSuccessMsg('✅ Producción registrada correctamente. Inventario actualizado.')
                  setTimeout(() => {
                    closeModal()
                  }, 2000)
                }}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-semibold text-sm shadow-md hover:shadow-emerald-500/25 transition-all inline-flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                <span>Confirmar Producción</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Nueva Receta */}
      {showModal && modalType === 'addReceta' && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col border border-gray-100 dark:border-slate-800 transition-all overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header Sticky */}
            <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-cyan-500/20 to-blue-500/20 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shadow-sm">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    Crear Nueva Receta (BOM)
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Ficha técnica de producto y costeo proyectado
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto space-y-5">
              {errorMsg && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs font-medium text-red-700 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
                  <span>{errorMsg}</span>
                </div>
              )}
              {successMsg && (
                <div className="rounded-xl border border-green-200 bg-green-50 p-3.5 text-xs font-medium text-green-700 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-green-600" />
                  <span>{successMsg}</span>
                </div>
              )}

              {/* Card 1: Identificación del Producto */}
              <div className="rounded-xl border border-gray-200 dark:border-slate-700/80 bg-white dark:bg-slate-800/40 p-4 shadow-sm space-y-3.5">
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white pb-2 border-b border-gray-100 dark:border-slate-700/60">
                  <Package className="w-4 h-4 text-cyan-500" />
                  <span>Identificación del Producto Terminado</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wider">
                      Código Receta
                    </label>
                    <input
                      type="text"
                      value={recetaForm.codigo}
                      readOnly
                      className="w-full px-3.5 py-2.5 text-sm border-2 border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/80 rounded-xl font-mono text-gray-500 cursor-not-allowed"
                    />
                    <p className="text-[11px] text-gray-400 mt-1">Generado automáticamente por el correlativo</p>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wider">
                      Categoría
                    </label>
                    <select
                      value={recetaForm.categoria}
                      onChange={(e) => setRecetaForm({...recetaForm, categoria: e.target.value})}
                      className="w-full px-3.5 py-2.5 text-sm border-2 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-400 text-gray-800 dark:text-gray-200"
                    >
                      {categoriasReceta.map((categoria) => (
                        <option key={categoria} value={categoria}>{categoria}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wider">
                      Nombre del Producto *
                    </label>
                    <input
                      type="text"
                      value={recetaForm.nombre}
                      onChange={(e) => setRecetaForm({...recetaForm, nombre: sanitizeSoloLetras(e.target.value)})}
                      onBlur={(e) => setRecetaForm({...recetaForm, nombre: capitalizeWords(e.target.value)})}
                      placeholder="Ej: Smoothie de Fresa - Grande"
                      className="w-full px-3.5 py-2.5 text-sm border-2 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-400 text-gray-800 dark:text-gray-200"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wider">
                      Presentación *
                    </label>
                    <select
                      value={recetaForm.presentacion}
                      onChange={(e) => setRecetaForm({...recetaForm, presentacion: e.target.value})}
                      className="w-full px-3.5 py-2.5 text-sm border-2 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-400 text-gray-800 dark:text-gray-200"
                    >
                      <option value="">Seleccionar presentación...</option>
                      {presentaciones.map((presentacion) => (
                        <option key={presentacion} value={presentacion}>{presentacion}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wider">
                    Precio de Venta al Público (GTQ)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400">Q</span>
                    <input
                      type="number"
                      value={recetaForm.precioVenta}
                      onChange={(e) => setRecetaForm({...recetaForm, precioVenta: e.target.value})}
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                      className="w-full pl-8 pr-3.5 py-2.5 text-sm font-semibold border-2 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-400 text-gray-800 dark:text-gray-200"
                    />
                  </div>
                </div>

                <RecetaImageField
                  value={recetaForm.imagenUrl}
                  onChange={(url) => setRecetaForm({ ...recetaForm, imagenUrl: url })}
                />
              </div>

              {/* Card 2: Costos Operativos */}
              <div className="rounded-xl border border-gray-200 dark:border-slate-700/80 bg-white dark:bg-slate-800/40 p-4 shadow-sm space-y-3.5">
                <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-slate-700/60">
                  <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
                    <Zap className="w-4 h-4 text-amber-500" />
                    <span>Costos Indirectos de Producción Estimados (GTQ)</span>
                  </div>
                  <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                    Total: Q{(Number(recetaForm.costoElectricidad || 0) + Number(recetaForm.costoManoObra || 0) + Number(recetaForm.costoAgua || 0) + Number(recetaForm.costoLocal || 0)).toFixed(2)}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Electricidad</label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">Q</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={recetaForm.costoElectricidad}
                        onChange={(e) => setRecetaForm({...recetaForm, costoElectricidad: e.target.value})}
                        className="w-full pl-6 pr-2.5 py-2 text-xs font-semibold border-2 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-400 text-gray-800 dark:text-gray-200"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Mano de Obra</label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">Q</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={recetaForm.costoManoObra}
                        onChange={(e) => setRecetaForm({...recetaForm, costoManoObra: e.target.value})}
                        className="w-full pl-6 pr-2.5 py-2 text-xs font-semibold border-2 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-400 text-gray-800 dark:text-gray-200"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Agua</label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">Q</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={recetaForm.costoAgua}
                        onChange={(e) => setRecetaForm({...recetaForm, costoAgua: e.target.value})}
                        className="w-full pl-6 pr-2.5 py-2 text-xs font-semibold border-2 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-400 text-gray-800 dark:text-gray-200"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Uso Local</label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">Q</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={recetaForm.costoLocal}
                        onChange={(e) => setRecetaForm({...recetaForm, costoLocal: e.target.value})}
                        className="w-full pl-6 pr-2.5 py-2 text-xs font-semibold border-2 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-400 text-gray-800 dark:text-gray-200"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Informative Step Notice */}
              <div className="p-3.5 rounded-xl border border-cyan-200 dark:border-cyan-800/80 bg-cyan-50/80 dark:bg-cyan-950/30 flex items-start gap-2.5">
                <Info className="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0 mt-0.5" />
                <p className="text-xs text-cyan-900 dark:text-cyan-200 leading-relaxed">
                  Al presionar <span className="font-bold">"Guardar Receta"</span>, la ficha se creará y se abrirá automáticamente el gestor del BOM para que puedas vincular los ingredientes e insumos desde el inventario.
                </p>
              </div>
            </div>

            {/* Sticky Footer */}
            <div className="px-6 py-4 border-t border-gray-100 dark:border-slate-800 bg-gray-50/80 dark:bg-slate-900/80 backdrop-blur-md sticky bottom-0 z-10 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={closeModal}
                className="px-5 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 font-semibold text-sm hover:bg-gray-50 dark:hover:bg-slate-700/60 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!recetaForm.nombre || !recetaForm.presentacion) {
                    setErrorMsg('Por favor completa todos los campos requeridos.')
                    return
                  }

                  try {
                    setLoading(true)
                    setErrorMsg('')
                    const nuevaReceta = await createReceta({
                      nombre: recetaForm.nombre,
                      categoria: recetaForm.categoria,
                      presentacion: recetaForm.presentacion,
                      imagenUrl: recetaForm.imagenUrl || null,
                      costoElectricidad: recetaForm.costoElectricidad ? Number(recetaForm.costoElectricidad) : 0,
                      costoManoObra: recetaForm.costoManoObra ? Number(recetaForm.costoManoObra) : 0,
                      costoAgua: recetaForm.costoAgua ? Number(recetaForm.costoAgua) : 0,
                      costoLocal: recetaForm.costoLocal ? Number(recetaForm.costoLocal) : 0,
                      precioVenta: recetaForm.precioVenta ? Number(recetaForm.precioVenta) : 0,
                    })

                    setRecetas([...recetas, nuevaReceta])
                    setSelectedReceta(nuevaReceta)
                    syncBomCostos(nuevaReceta)
                    setModalType('verBOM')
                    setSuccessMsg('✅ Receta creada correctamente. Ahora puedes agregar sus ingredientes desde el inventario.')
                  } catch (error) {
                    setErrorMsg(error.message || 'Error al crear la receta.')
                  } finally {
                    setLoading(false)
                  }
                }}
                disabled={loading}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-semibold text-sm shadow-md hover:shadow-cyan-500/25 transition-all inline-flex items-center gap-2 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{loading ? 'Guardando...' : 'Guardar Receta'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Agregar Ingrediente */}
      {showModal && modalType === 'addIngrediente' && selectedReceta && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col border border-gray-100 dark:border-slate-800 transition-all overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header Sticky */}
            <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-cyan-500/20 to-blue-500/20 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shadow-sm">
                  <FlaskConical className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    Agregar Insumo al BOM
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Receta: {selectedReceta.nombre}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto space-y-5">
              {errorMsg && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs font-medium text-red-700 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
                  <span>{errorMsg}</span>
                </div>
              )}
              {successMsg && (
                <div className="rounded-xl border border-green-200 bg-green-50 p-3.5 text-xs font-medium text-green-700 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-green-600" />
                  <span>{successMsg}</span>
                </div>
              )}

              {/* Card 1: Selección de Inventario */}
              <div className="rounded-xl border border-gray-200 dark:border-slate-700/80 bg-white dark:bg-slate-800/40 p-4 shadow-sm space-y-3.5">
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white pb-2 border-b border-gray-100 dark:border-slate-700/60">
                  <Package className="w-4 h-4 text-cyan-500" />
                  <span>Vincular Insumo desde Inventario (Opcional)</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wider">
                    Artículo del Catálogo
                  </label>
                  <select
                    value={productoSeleccionadoId}
                    onChange={(e) => {
                      const val = e.target.value
                      setProductoSeleccionadoId(val)
                      if (!val) return
                      const prod = productosInventario.find(p => String(p.id) === String(val))
                      if (prod) {
                        setIngredienteForm(prev => ({
                          ...prev,
                          productoId: prod.id,
                          nombre: prod.nombre,
                          unidad: prod.unidad || prev.unidad,
                          costoUnitario: prod.costoUnitario ? String(prod.costoUnitario) : prev.costoUnitario,
                        }))
                      }
                    }}
                    className="w-full px-3.5 py-2.5 text-sm border-2 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-400 text-gray-800 dark:text-gray-200"
                  >
                    <option value="">-- Ingreso manual / Seleccionar del inventario --</option>
                    {productosInventario.map(p => (
                      <option key={p.id} value={p.id}>{`${p.nombre} — Stock disponible: ${p.stock}`}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Card 2: Detalle y Dosificación */}
              <div className="rounded-xl border border-gray-200 dark:border-slate-700/80 bg-white dark:bg-slate-800/40 p-4 shadow-sm space-y-3.5">
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white pb-2 border-b border-gray-100 dark:border-slate-700/60">
                  <Calculator className="w-4 h-4 text-cyan-500" />
                  <span>Parámetros de Dosificación y Costeo</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wider">
                    Nombre del Ingrediente / Material *
                  </label>
                  <input
                    type="text"
                    value={ingredienteForm.nombre}
                    onChange={(e) => setIngredienteForm({...ingredienteForm, nombre: sanitizeSoloLetras(e.target.value)})}
                    onBlur={(e) => setIngredienteForm({...ingredienteForm, nombre: capitalizeWords(e.target.value)})}
                    placeholder="Ej: Harina, Azúcar, Leche..."
                    className="w-full px-3.5 py-2.5 text-sm border-2 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-400 text-gray-800 dark:text-gray-200"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wider">
                      Cantidad Requerida *
                    </label>
                    <input
                      type="number"
                      value={ingredienteForm.cantidad}
                      onChange={(e) => setIngredienteForm({...ingredienteForm, cantidad: e.target.value})}
                      placeholder="Ej: 500"
                      step="0.01"
                      className="w-full px-3.5 py-2.5 text-sm font-semibold border-2 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-400 text-gray-800 dark:text-gray-200"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wider">
                      Unidad de Medida *
                    </label>
                    <select
                      value={ingredienteForm.unidad}
                      onChange={(e) => setIngredienteForm({...ingredienteForm, unidad: e.target.value})}
                      className="w-full px-3.5 py-2.5 text-sm border-2 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-400 text-gray-800 dark:text-gray-200"
                    >
                      <option value="">Seleccionar unidad...</option>
                      {unidadesMedida.map((unidad) => (
                        <option key={unidad} value={unidad}>{unidad}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wider">
                      Costo Unitario (GTQ)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400">Q</span>
                      <input
                        type="number"
                        value={ingredienteForm.costoUnitario}
                        onChange={(e) => setIngredienteForm({...ingredienteForm, costoUnitario: e.target.value})}
                        placeholder="0.00"
                        step="0.01"
                        className="w-full pl-8 pr-3.5 py-2.5 text-sm font-semibold border-2 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-400 text-gray-800 dark:text-gray-200"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wider">
                      Contenido Total del Envase
                    </label>
                    <input
                      type="number"
                      value={ingredienteForm.contenidoTotal}
                      onChange={(e) => setIngredienteForm({...ingredienteForm, contenidoTotal: e.target.value})}
                      placeholder="Ej: 1000 (g/ml)"
                      step="0.01"
                      className="w-full px-3.5 py-2.5 text-sm border-2 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-400 text-gray-800 dark:text-gray-200"
                    />
                    <p className="text-[11px] text-gray-400 mt-1">Si se llena, el costo se prorratea: (cantidad ÷ contenido) × costo.</p>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={handleAddIngrediente}
                    disabled={loading}
                    className="px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-semibold text-xs rounded-xl shadow-md transition-all inline-flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{loading ? 'Guardando...' : '+ Agregar este Insumo'}</span>
                  </button>
                </div>
              </div>

              {/* Card 3: Lista de Ingredientes actuales */}
              <div className="rounded-xl border border-gray-200 dark:border-slate-700/80 bg-white dark:bg-slate-800/40 p-4 shadow-sm space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-slate-700/60">
                  <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
                    <Layers className="w-4 h-4 text-cyan-500" />
                    <span>Insumos Vinculados a esta Receta</span>
                  </div>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-100 dark:bg-cyan-950/60 text-cyan-800 dark:text-cyan-300 font-bold">
                    {(selectedReceta?.ingredientes || []).length} insumos
                  </span>
                </div>

                {(selectedReceta?.ingredientes || []).length === 0 ? (
                  <p className="text-xs text-gray-500 dark:text-gray-400 italic text-center py-4">
                    Aún no hay ingredientes agregados. Utiliza el formulario arriba para añadirlos.
                  </p>
                ) : (
                  <div className="rounded-xl border border-gray-200 dark:border-slate-700/80 overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700 text-xs">
                      <thead className="bg-gray-50 dark:bg-slate-800/70">
                        <tr>
                          <th className="px-3.5 py-2 text-left font-semibold text-gray-600 dark:text-gray-300 uppercase">Material</th>
                          <th className="px-3.5 py-2 text-right font-semibold text-gray-600 dark:text-gray-300 uppercase">Cantidad</th>
                          <th className="px-3.5 py-2 text-right font-semibold text-gray-600 dark:text-gray-300 uppercase">Costo Unit.</th>
                          <th className="px-3.5 py-2 text-right font-semibold text-gray-600 dark:text-gray-300 uppercase">Costo Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-slate-700/60 bg-white dark:bg-slate-900/40">
                        {(selectedReceta?.ingredientes || []).map((ing) => (
                          <tr key={ing.id} className="hover:bg-gray-50/70 dark:hover:bg-slate-800/40">
                            <td className="px-3.5 py-2.5 font-semibold text-gray-900 dark:text-white">{ing.nombre}</td>
                            <td className="px-3.5 py-2.5 text-right text-gray-700 dark:text-gray-300">{ing.cantidad} {ing.unidad}</td>
                            <td className="px-3.5 py-2.5 text-right font-mono text-gray-600 dark:text-gray-400">Q{(costoUnitarioEfectivo(ing) || 0).toFixed(2)}</td>
                            <td className="px-3.5 py-2.5 text-right font-bold font-mono text-gray-900 dark:text-white">Q{costoIngredienteLibre(ing).toFixed(2)}</td>
                          </tr>
                        ))}
                        <tr className="bg-cyan-50/80 dark:bg-cyan-950/30 font-bold">
                          <td colSpan="3" className="px-3.5 py-2.5 text-cyan-900 dark:text-cyan-300 uppercase">Subtotal Materia Prima</td>
                          <td className="px-3.5 py-2.5 text-right font-mono text-cyan-800 dark:text-cyan-200">
                            Q{((selectedReceta?.ingredientes || []).reduce((sum, ing) => sum + costoIngredienteLibre(ing), 0)).toFixed(2)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Sticky Footer */}
            <div className="px-6 py-4 border-t border-gray-100 dark:border-slate-800 bg-gray-50/80 dark:bg-slate-900/80 backdrop-blur-md sticky bottom-0 z-10 flex justify-between items-center gap-3">
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                {((selectedReceta?.ingredientes || []).length > 0)
                  ? `${selectedReceta.ingredientes.length} insumo(s) listos en este BOM`
                  : 'Sin insumos aún'}
              </p>
              <button
                type="button"
                onClick={closeModal}
                className="px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-semibold text-sm rounded-xl shadow-md transition-all inline-flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Listo / Finalizar</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Editar Ingrediente */}
      {showModal && modalType === 'editIngrediente' && selectedReceta && selectedIngrediente && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-lg w-full max-h-[92vh] flex flex-col border border-gray-100 dark:border-slate-800 transition-all overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header Sticky */}
            <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-cyan-500/20 to-blue-500/20 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shadow-sm">
                  <Pencil className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    Modificar Insumo del BOM
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Receta: {selectedReceta.nombre}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto space-y-4">
              {errorMsg && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs font-medium text-red-700 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
                  <span>{errorMsg}</span>
                </div>
              )}
              {successMsg && (
                <div className="rounded-xl border border-green-200 bg-green-50 p-3.5 text-xs font-medium text-green-700 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-green-600" />
                  <span>{successMsg}</span>
                </div>
              )}

              <div className="rounded-xl border border-gray-200 dark:border-slate-700/80 bg-white dark:bg-slate-800/40 p-4 shadow-sm space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wider">
                    Artículo de Inventario Vinculado
                  </label>
                  <select
                    value={productoSeleccionadoId}
                    onChange={(e) => {
                      const val = e.target.value
                      setProductoSeleccionadoId(val)
                      if (!val) {
                        setIngredienteForm(prev => ({ ...prev, productoId: '' }))
                        return
                      }
                      const prod = productosInventario.find(p => String(p.id) === String(val))
                      if (prod) {
                        setIngredienteForm(prev => ({
                          ...prev,
                          productoId: prod.id,
                          nombre: prod.nombre,
                          unidad: prod.unidad || prev.unidad,
                          costoUnitario: prod.costoUnitario ? String(prod.costoUnitario) : prev.costoUnitario,
                        }))
                      }
                    }}
                    className="w-full px-3.5 py-2.5 text-sm border-2 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-400 text-gray-800 dark:text-gray-200"
                  >
                    <option value="">-- Sin vínculo / selección manual --</option>
                    {productosInventario.map(p => (
                      <option key={p.id} value={p.id}>{`${p.nombre} — Stock: ${p.stock}`}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wider">
                    Nombre del Ingrediente *
                  </label>
                  <input
                    type="text"
                    value={ingredienteForm.nombre}
                    onChange={(e) => setIngredienteForm({...ingredienteForm, nombre: sanitizeSoloLetras(e.target.value)})}
                    onBlur={(e) => setIngredienteForm({...ingredienteForm, nombre: capitalizeWords(e.target.value)})}
                    placeholder="Ej: Harina, Azúcar..."
                    className="w-full px-3.5 py-2.5 text-sm border-2 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-400 text-gray-800 dark:text-gray-200"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wider">
                      Cantidad *
                    </label>
                    <input
                      type="number"
                      value={ingredienteForm.cantidad}
                      onChange={(e) => setIngredienteForm({...ingredienteForm, cantidad: e.target.value})}
                      placeholder="Ej: 500"
                      step="0.01"
                      className="w-full px-3.5 py-2.5 text-sm font-semibold border-2 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-400 text-gray-800 dark:text-gray-200"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wider">
                      Unidad *
                    </label>
                    <select
                      value={ingredienteForm.unidad}
                      onChange={(e) => setIngredienteForm({...ingredienteForm, unidad: e.target.value})}
                      className="w-full px-3.5 py-2.5 text-sm border-2 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-400 text-gray-800 dark:text-gray-200"
                    >
                      <option value="">Seleccionar unidad...</option>
                      {unidadesMedida.map((unidad) => (
                        <option key={unidad} value={unidad}>{unidad}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wider">
                      Costo Unitario (GTQ)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400">Q</span>
                      <input
                        type="number"
                        value={ingredienteForm.costoUnitario}
                        onChange={(e) => setIngredienteForm({...ingredienteForm, costoUnitario: e.target.value})}
                        placeholder="0.00"
                        step="0.01"
                        className="w-full pl-8 pr-3.5 py-2.5 text-sm font-semibold border-2 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-400 text-gray-800 dark:text-gray-200"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wider">
                      Contenido Total del Envase
                    </label>
                    <input
                      type="number"
                      value={ingredienteForm.contenidoTotal}
                      onChange={(e) => setIngredienteForm({...ingredienteForm, contenidoTotal: e.target.value})}
                      placeholder="Ej: 1000 (ml/g)"
                      step="0.01"
                      className="w-full px-3.5 py-2.5 text-sm border-2 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-400 text-gray-800 dark:text-gray-200"
                    />
                    <p className="text-[11px] text-gray-400 mt-1">Si se llena, el costo se prorratea: (cantidad ÷ contenido) × costo.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Sticky Footer */}
            <div className="px-6 py-4 border-t border-gray-100 dark:border-slate-800 bg-gray-50/80 dark:bg-slate-900/80 backdrop-blur-md sticky bottom-0 z-10 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={closeModal}
                disabled={loading}
                className="px-5 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 font-semibold text-sm hover:bg-gray-50 dark:hover:bg-slate-700/60 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleUpdateIngrediente}
                disabled={loading}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-semibold text-sm shadow-md hover:shadow-cyan-500/25 transition-all inline-flex items-center gap-2 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{loading ? 'Guardando...' : 'Actualizar Insumo'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <ReporteModal
        open={reporteOpen}
        title="Reporte de recetas y costos"
        filterLabel="Categoría"
        filterOptions={categoriasReporte}
        generating={generandoReporte}
        onGenerate={handleGenerarReporteRecetas}
        onClose={() => setReporteOpen(false)}
      />

      <SuccessModal
        isOpen={Boolean(successMsg)}
        message={successMsg?.replace(/^[✅\s]+/, '')}
        onClose={() => setSuccessMsg('')}
      />
    </div>
  )
}

export default ProduccionRecetas
