import { useEffect, useState } from 'react'
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
import { sanitizeSoloLetras, capitalizeWords } from '../../utils/validation'
import { useTableSort, sortRows } from '../../hooks/useTableSort'

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
  const [pageSize, setPageSize] = useState(5)
  const [currentPageCosteo, setCurrentPageCosteo] = useState(1)
  const [pageSizeCosteo, setPageSizeCosteo] = useState(2)
  const recetaSort = useTableSort(null)
  const recetasFiltradas = (filterCategoria === 'todos'
    ? recetas
    : recetas.filter((receta) => receta.categoria === filterCategoria))
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

  const totalPagesCosteo = Math.max(1, Math.ceil(recetas.length / pageSizeCosteo))
  const paginatedCosteo = recetas.slice((currentPageCosteo - 1) * pageSizeCosteo, currentPageCosteo * pageSizeCosteo)

  useEffect(() => {
    setCurrentPageCosteo(1)
  }, [recetas.length, pageSizeCosteo])

  useEffect(() => {
    setCurrentPage(1)
  }, [filterCategoria, searchTermReceta, recetaSort.sortBy, recetaSort.sortDir, pageSize])

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        setLoading(true)
        setErrorMsg('')
        const [recetasData, produccionesData, categoriasData, presentacionesData, unidadesData] = await Promise.all([
          getRecetas(),
          getProducciones(),
          listCategoriasReceta().catch(() => []),
          listPresentacionesReceta().catch(() => []),
          listUnidadesMedida().catch(() => []),
        ])
        setRecetas(recetasData)
        setProducciones(produccionesData)
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
    }

    cargarDatos()
  }, [])

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
      const recetasActualizadas = await getRecetas()
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
    <div className="p-4 md:p-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-2">Recetas de Venta (BOM)</h2>
        <p className="text-sm md:text-base text-gray-600">Cada producto de venta consume directamente sus materias primas al venderse en POS</p>
      </div>

      {/* Tabs Navigation */}
      <div className="mb-6 border-b border-gray-200 overflow-x-auto">
        <nav className="flex space-x-4 whitespace-nowrap">
          <button
            onClick={() => setActiveTab('recetas')}
            className={`pb-3 px-2 font-medium transition-colors ${
              activeTab === 'recetas'
                ? 'border-b-2 border-cyan-500 text-cyan-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            📋 Catálogo de Recetas
          </button>
          <button
            onClick={() => setActiveTab('costeo')}
            className={`pb-3 px-2 font-medium transition-colors ${
              activeTab === 'costeo'
                ? 'border-b-2 border-cyan-500 text-cyan-600'
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
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 mb-4">
            <div className="flex flex-col sm:flex-row gap-2 flex-1 sm:max-w-xl">
              <input
                type="text"
                placeholder="Buscar receta..."
                value={searchTermReceta}
                onChange={(e) => setSearchTermReceta(e.target.value)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-sm"
              />
              <select
                value={filterCategoria}
                onChange={(e) => setFilterCategoria(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 text-sm"
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
            <button
              onClick={() => openModal('addReceta')}
              className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg hover:shadow-lg transition-shadow text-sm whitespace-nowrap"
            >
              + Nueva Receta
            </button>
          </div>

          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="overflow-x-auto">
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
                      <div className="text-sm font-medium text-gray-900">{receta.nombre}</div>
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

          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <table className="min-w-full">
              <thead className="bg-gradient-to-r from-cyan-50 to-blue-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Fecha y Hora</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Receta</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase">Cantidad</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Lote</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Usuario</th>
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-4 md:px-6 py-4 rounded-t-lg">
              <h3 className="text-xl font-bold">✏️ Editar Receta</h3>
            </div>

            <div className="p-4 md:p-6 space-y-4">
              {errorMsg && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded text-sm">
                  {errorMsg}
                </div>
              )}
              {successMsg && (
                <div className="bg-green-50 border border-green-300 text-green-700 px-4 py-3 rounded-lg text-sm flex items-center gap-2 animate-pulse">
                  <span className="text-lg">✅</span>
                  <span className="font-medium">{successMsg}</span>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Código</label>
                  <input
                    type="text"
                    value={recetaForm.codigo}
                    readOnly
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Categoría</label>
                  <select 
                    value={recetaForm.categoria}
                    onChange={(e) => setRecetaForm({...recetaForm, categoria: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    {categoriasReceta.map((categoria) => (
                      <option key={categoria} value={categoria}>{categoria}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nombre del Producto</label>
                <input
                  type="text"
                  value={recetaForm.nombre}
                  onChange={(e) => setRecetaForm({...recetaForm, nombre: sanitizeSoloLetras(e.target.value)})}
                  onBlur={(e) => setRecetaForm({...recetaForm, nombre: capitalizeWords(e.target.value)})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Ej: Smoothie de Fresa - Grande"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Presentación</label>
                  <select 
                    value={recetaForm.presentacion}
                    onChange={(e) => setRecetaForm({...recetaForm, presentacion: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Seleccionar presentación...</option>
                    {presentaciones.map((presentacion) => (
                      <option key={presentacion} value={presentacion}>{presentacion}</option>
                    ))}
                  </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Precio de Venta (Q)</label>
                <input
                  type="number"
                  value={recetaForm.precioVenta}
                  onChange={(e) => setRecetaForm({...recetaForm, precioVenta: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Ej: 19.00"
                  step="0.01"
                  min="0"
                />
              </div>

              <div className="col-span-2">
                <h4 className="text-sm font-bold text-gray-700 mb-2">⚙️ Costos de Producción (Q)</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Electricidad</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={recetaForm.costoElectricidad}
                      onChange={(e) => setRecetaForm({...recetaForm, costoElectricidad: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Mano de Obra</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={recetaForm.costoManoObra}
                      onChange={(e) => setRecetaForm({...recetaForm, costoManoObra: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Agua</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={recetaForm.costoAgua}
                      onChange={(e) => setRecetaForm({...recetaForm, costoAgua: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Uso Local</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={recetaForm.costoLocal}
                      onChange={(e) => setRecetaForm({...recetaForm, costoLocal: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-gray-50 rounded-b-lg flex justify-end gap-3">
              <button
                onClick={closeModal}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleUpdateReceta}
                disabled={loading}
                className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:shadow-lg transition-shadow disabled:from-blue-400 disabled:to-indigo-500"
              >
                {loading ? 'Guardando...' : 'Actualizar Receta'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Ver BOM Detallado */}
      {showModal && modalType === 'verBOM' && selectedReceta && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white px-4 md:px-6 py-4 rounded-t-lg">
              <h3 className="text-xl font-bold">📋 Bill of Materials (BOM)</h3>
              <p className="text-sm text-cyan-100 mt-1">{selectedReceta.nombre}</p>
            </div>

            <div className="p-4 md:p-6">
              {/* Error display */}
              {errorMsg && (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {errorMsg}
                </div>
              )}
              {successMsg && (
                <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                  {successMsg}
                </div>
              )}

              {/* Info General */}
              <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-xs text-gray-600">Código</p>
                  <p className="font-semibold text-gray-900">{selectedReceta.codigo}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Categoría</p>
                  <p className="font-semibold text-gray-900">{selectedReceta.categoria}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Presentación</p>
                  <p className="font-semibold text-gray-900">{selectedReceta.presentacion}</p>
                </div>
                <div>
                </div>
              </div>

              {/* Lista de Ingredientes */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                    🥤 Ingredientes y Materiales
                  </h4>
                  <button
                    onClick={() => {
                      setIngredienteForm({
                        nombre: '',
                        cantidad: '',
                        unidad: '',
                        costoUnitario: '',
                      })
                      setModalType('addIngrediente')
                    }}
                    className="text-xs bg-cyan-500 text-white px-3 py-1 rounded hover:bg-cyan-600"
                  >
                    + Agregar
                  </button>
                </div>
                <div className="border border-gray-200 rounded-lg overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-gray-50">
                      <tr>
                                                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">Material</th>
                        <th className="px-4 py-2 text-right text-xs font-semibold text-gray-700">Cantidad</th>
                        <th className="px-4 py-2 text-right text-xs font-semibold text-gray-700">Costo Unit.</th>
                        <th className="px-4 py-2 text-right text-xs font-semibold text-gray-700">Costo Total</th>
                        <th className="px-4 py-2 text-center text-xs font-semibold text-gray-700">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {(selectedReceta?.ingredientes || []).map((ing) => (
                        <tr key={ing.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-900">{ing.nombre}</td>
                          <td className="px-4 py-3 text-sm text-right text-gray-700">
                            {ing.cantidad} {ing.unidad}
                          </td>
                          <td className="px-4 py-3 text-sm text-right text-gray-700">Q{(costoUnitarioEfectivo(ing) || 0).toFixed(2)}</td>
                          <td className="px-4 py-3 text-sm text-right font-semibold text-gray-900">
                            Q{costoIngredienteLibre(ing).toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-center flex gap-2 justify-center">
                            <button
                              onClick={() => handleEditIngrediente(ing)}
                              className="text-blue-600 hover:text-blue-800 text-lg hover:scale-125 transition-transform"
                              title="Editar ingrediente"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => handleDeleteIngrediente(ing.id)}
                              className="text-red-600 hover:text-red-800 text-lg hover:scale-125 transition-transform"
                              title="Eliminar ingrediente"
                            >
                              🗑️
                            </button>
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-cyan-50 font-bold">
                        <td colSpan="3" className="px-4 py-3 text-sm text-gray-900">Subtotal Materia Prima</td>
                        <td className="px-4 py-3 text-sm text-right text-cyan-700">
                          Q{((selectedReceta?.ingredientes || []).reduce((sum, ing) => sum + costoIngredienteLibre(ing), 0)).toFixed(2)}
                        </td>
                        <td></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Costos de Producción */}
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-sm font-bold text-gray-800">⚙️ Costos de Producción</h4>
                  <button
                    onClick={guardarCostosProduccion}
                    disabled={loading}
                    className="px-3 py-1 text-xs bg-cyan-500 text-white rounded-md hover:bg-cyan-600 disabled:opacity-50 transition-colors"
                  >
                    {loading ? 'Guardando...' : 'Guardar Costos'}
                  </button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Electricidad</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={bomCostosForm.costoElectricidad}
                      onChange={(e) => handleBomCostosChange('costoElectricidad', e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Mano de Obra</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={bomCostosForm.costoManoObra}
                      onChange={(e) => handleBomCostosChange('costoManoObra', e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Agua</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={bomCostosForm.costoAgua}
                      onChange={(e) => handleBomCostosChange('costoAgua', e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Uso Local</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={bomCostosForm.costoLocal}
                      onChange={(e) => handleBomCostosChange('costoLocal', e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm"
                    />
                  </div>
                </div>
                <div className="flex justify-between items-center mt-3 pt-3 border-t">
                  <span className="text-sm font-semibold text-gray-700">Total Costos de Producción</span>
                  <span className="text-base font-bold text-cyan-700">
                    Q{(bomCostosForm.costoElectricidad + bomCostosForm.costoManoObra + bomCostosForm.costoAgua + bomCostosForm.costoLocal).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Resumen de Costos */}
              <div className="bg-gradient-to-r from-cyan-50 to-blue-50 p-4 rounded-lg border-2 border-cyan-200 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-700">💵 Subtotal Materia Prima</span>
                  <span className="text-sm font-semibold text-gray-800">
                    Q{((selectedReceta?.ingredientes || []).reduce((sum, ing) => sum + costoIngredienteLibre(ing), 0)).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-700">⚙️ Costos de Producción</span>
                  <span className="text-sm font-semibold text-gray-800">
                    Q{(bomCostosForm.costoElectricidad + bomCostosForm.costoManoObra + bomCostosForm.costoAgua + bomCostosForm.costoLocal).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center border-t border-cyan-200 pt-2">
                  <span className="text-sm font-semibold text-gray-800">💰 Costo Total</span>
                  <span className="text-xl font-bold text-red-600">
                    Q{(((selectedReceta?.ingredientes || []).reduce((sum, ing) => sum + costoIngredienteLibre(ing), 0))
                      + bomCostosForm.costoElectricidad + bomCostosForm.costoManoObra + bomCostosForm.costoAgua + bomCostosForm.costoLocal).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-700">🏷️ Precio de Venta</span>
                  <span className="text-sm font-semibold text-gray-800">Q{(bomCostosForm.precioVenta || 0).toFixed(2)}</span>
                </div>
                {(() => {
                  const costoTotal = ((selectedReceta?.ingredientes || []).reduce((sum, ing) => sum + costoIngredienteLibre(ing), 0))
                    + bomCostosForm.costoElectricidad + bomCostosForm.costoManoObra + bomCostosForm.costoAgua + bomCostosForm.costoLocal
                  const utilidad = (bomCostosForm.precioVenta || 0) - costoTotal
                  const margen = (bomCostosForm.precioVenta || 0) > 0 ? (utilidad / bomCostosForm.precioVenta) * 100 : 0
                  return (
                    <>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-700">📈 Utilidad</span>
                        <span className={`text-sm font-bold ${utilidad < 0 ? 'text-red-600' : 'text-green-600'}`}>
                          Q{utilidad.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-700">🎯 Margen de Utilidad</span>
                        <span className={`text-sm font-bold ${margen < 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {margen.toFixed(2)}%
                        </span>
                      </div>
                      {utilidad < 0 && (
                        <div className="mt-1 px-3 py-2 bg-red-100 border border-red-300 rounded-md text-xs font-semibold text-red-700">
                          ⚠️ El producto genera pérdida: el precio de venta es menor al costo total.
                        </div>
                      )}
                      {utilidad === 0 && (
                        <div className="mt-1 px-3 py-2 bg-yellow-100 border border-yellow-300 rounded-md text-xs font-semibold text-yellow-700">
                          ⚠️ El producto no genera utilidad: el precio de venta es igual al costo total.
                        </div>
                      )}
                    </>
                  )
                })()}
              </div>
            </div>

            <div className="px-4 md:px-6 py-4 bg-gray-50 rounded-b-lg flex justify-end">
              <button
                onClick={closeModal}
                className="px-4 md:px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Registrar Producción */}
      {showModal && modalType === 'producir' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-lg w-full">
            <div className="bg-gradient-to-r from-green-500 to-green-600 text-white px-4 md:px-6 py-4 rounded-t-lg">
              <h3 className="text-xl font-bold">🏭 Registrar Nueva Producción</h3>
            </div>

            <div className="p-4 md:p-6 space-y-4">
              {errorMsg && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {errorMsg}
                </div>
              )}
              {successMsg && (
                <div className="bg-green-50 border border-green-300 text-green-700 px-4 py-3 rounded-lg text-sm flex items-center gap-2 animate-pulse">
                  <span className="text-lg">✅</span>
                  <span className="font-medium">{successMsg}</span>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Receta / Producto</label>
                <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500">
                  <option value="">Seleccionar receta...</option>
                  {recetas.map(r => (
                    <option key={r.id} value={r.id}>{r.nombre}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Cantidad a Producir</label>
                <input
                  type="number"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  placeholder="Ej: 50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Número de Lote</label>
                <input
                  type="text"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  placeholder="LOT-20260213-XXX"
                  defaultValue={`LOT-${new Date().toISOString().split('T')[0].replace(/-/g, '')}-`}
                />
              </div>

              <div className="bg-yellow-50 border-l-4 border-yellow-500 p-3 rounded">
                <p className="text-xs text-yellow-800">
                  ⚠️ Al confirmar, se descontarán automáticamente los ingredientes del inventario según el BOM.
                </p>
              </div>
            </div>

            <div className="px-4 md:px-6 py-4 bg-gray-50 rounded-b-lg flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
              <button
                onClick={closeModal}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  setSuccessMsg('✅ Producción registrada correctamente. Inventario actualizado.')
                  setTimeout(() => {
                    closeModal()
                  }, 2000)
                }}
                className="px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:shadow-lg transition-shadow"
              >
                Confirmar Producción
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Nueva Receta */}
      {showModal && modalType === 'addReceta' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white px-4 md:px-6 py-4 rounded-t-lg">
              <h3 className="text-xl font-bold">➕ Crear Nueva Receta (BOM)</h3>
            </div>

            <div className="p-4 md:p-6 space-y-4">
              {errorMsg && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded text-sm">
                  {errorMsg}
                </div>
              )}
              {successMsg && (
                <div className="bg-green-50 border border-green-300 text-green-700 px-4 py-3 rounded-lg text-sm flex items-center gap-2 animate-pulse">
                  <span className="text-lg">✅</span>
                  <span className="font-medium">{successMsg}</span>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Código</label>
                  <input
                    type="text"
                    value={recetaForm.codigo}
                    readOnly
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 cursor-not-allowed"
                  />
                  <p className="text-xs text-gray-500 mt-1">Generado automáticamente</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Categoría</label>
                  <select 
                    value={recetaForm.categoria}
                    onChange={(e) => setRecetaForm({...recetaForm, categoria: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
                  >
                    {categoriasReceta.map((categoria) => (
                      <option key={categoria} value={categoria}>{categoria}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nombre del Producto</label>
                <input
                  type="text"
                  value={recetaForm.nombre}
                  onChange={(e) => setRecetaForm({...recetaForm, nombre: sanitizeSoloLetras(e.target.value)})}
                  onBlur={(e) => setRecetaForm({...recetaForm, nombre: capitalizeWords(e.target.value)})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
                  placeholder="Ej: Smoothie de Fresa - Grande"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Presentación</label>
                  <select 
                    value={recetaForm.presentacion}
                    onChange={(e) => setRecetaForm({...recetaForm, presentacion: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
                  >
                    <option value="">Seleccionar presentación...</option>
                    {presentaciones.map((presentacion) => (
                      <option key={presentacion} value={presentacion}>{presentacion}</option>
                    ))}
                  </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Precio de Venta (Q)</label>
                  <input
                    type="number"
                    value={recetaForm.precioVenta}
                    onChange={(e) => setRecetaForm({...recetaForm, precioVenta: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
                    placeholder="Ej: 19.00"
                    step="0.01"
                    min="0"
                  />
              </div>

              <div>
                <h4 className="text-sm font-bold text-gray-700 mb-2">⚙️ Costos de Producción (Q)</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Electricidad</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={recetaForm.costoElectricidad}
                      onChange={(e) => setRecetaForm({...recetaForm, costoElectricidad: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Mano de Obra</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={recetaForm.costoManoObra}
                      onChange={(e) => setRecetaForm({...recetaForm, costoManoObra: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Agua</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={recetaForm.costoAgua}
                      onChange={(e) => setRecetaForm({...recetaForm, costoAgua: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Uso Local</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={recetaForm.costoLocal}
                      onChange={(e) => setRecetaForm({...recetaForm, costoLocal: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Ingredientes (BOM)</label>
                <button
                  onClick={() => setErrorMsg('Primero guarda la receta; luego se abrirá su BOM para elegir productos del inventario.')}
                  className="text-sm text-cyan-600 hover:text-cyan-800 font-medium mb-2"
                >
                  + Agregar Ingrediente
                </button>
                <div className="text-sm text-gray-500 italic">
                  Agregar ingredientes desde el inventario...
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-gray-50 rounded-b-lg flex justify-end gap-3">
              <button
                onClick={closeModal}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                Cancelar
              </button>
              <button
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
                      costoElectricidad: recetaForm.costoElectricidad ? Number(recetaForm.costoElectricidad) : 0,
                      costoManoObra: recetaForm.costoManoObra ? Number(recetaForm.costoManoObra) : 0,
                      costoAgua: recetaForm.costoAgua ? Number(recetaForm.costoAgua) : 0,
                      costoLocal: recetaForm.costoLocal ? Number(recetaForm.costoLocal) : 0,
                      precioVenta: recetaForm.precioVenta ? Number(recetaForm.precioVenta) : 0,
                    })

                    // Agregar la nueva receta al estado local
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
                className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg hover:shadow-lg transition-shadow disabled:from-cyan-400 disabled:to-blue-500"
              >
                {loading ? 'Guardando...' : 'Guardar Receta'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Agregar Ingrediente */}
      {showModal && modalType === 'addIngrediente' && selectedReceta && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white px-4 md:px-6 py-4 rounded-t-lg">
              <h3 className="text-xl font-bold">➕ Agregar Ingrediente a {selectedReceta.nombre}</h3>
              <p className="text-sm text-cyan-100 mt-1">Agrega ingredientes uno por uno. Al terminar presiona "Listo".</p>
            </div>

            <div className="p-4 md:p-6 space-y-4">
              {errorMsg && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded text-sm">
                  {errorMsg}
                </div>
              )}
              {successMsg && (
                <div className="bg-green-50 border border-green-300 text-green-700 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
                  <span className="text-lg">✅</span>
                  <span className="font-medium">{successMsg}</span>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Seleccionar desde inventario (opcional)</label>
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
                  className="w-full mb-3 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
                >
                  <option value="">-- Manual / seleccionar producto --</option>
                  {productosInventario.map(p => (
                    <option key={p.id} value={p.id}>{`${p.nombre} — stock: ${p.stock}`}</option>
                  ))}
                </select>

                <label className="block text-sm font-medium text-gray-700 mb-2">Nombre del Ingrediente *</label>
                <input
                  type="text"
                  value={ingredienteForm.nombre}
                  onChange={(e) => setIngredienteForm({...ingredienteForm, nombre: sanitizeSoloLetras(e.target.value)})}
                  onBlur={(e) => setIngredienteForm({...ingredienteForm, nombre: capitalizeWords(e.target.value)})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
                  placeholder="Ej: Harina, Azúcar, Leche..."
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Cantidad *</label>
                  <input
                    type="number"
                    value={ingredienteForm.cantidad}
                    onChange={(e) => setIngredienteForm({...ingredienteForm, cantidad: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
                    placeholder="Ej: 500"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Unidad *</label>
                  <select
                    value={ingredienteForm.unidad}
                    onChange={(e) => setIngredienteForm({...ingredienteForm, unidad: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
                  >
                    <option value="">Seleccionar...</option>
                    {unidadesMedida.map((unidad) => (
                      <option key={unidad} value={unidad}>{unidad}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Costo Unitario (Q)</label>
                  <input
                    type="number"
                    value={ingredienteForm.costoUnitario}
                    onChange={(e) => setIngredienteForm({...ingredienteForm, costoUnitario: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
                    placeholder="Ej: 15.50"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Contenido Total del Envase</label>
                  <input
                    type="number"
                    value={ingredienteForm.contenidoTotal}
                    onChange={(e) => setIngredienteForm({...ingredienteForm, contenidoTotal: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
                    placeholder="Ej: 100 (ml/g)"
                    step="0.01"
                  />
                  <p className="mt-1 text-xs text-gray-500">Si se llena, el costo se prorratea: (cantidad ÷ contenido) × costo.</p>
                </div>
              </div>

              {/* Botón agregar */}
              <div className="flex justify-end">
                <button
                  onClick={handleAddIngrediente}
                  disabled={loading}
                  className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg hover:shadow-lg transition-shadow disabled:from-cyan-400 disabled:to-blue-500"
                >
                  {loading ? 'Guardando...' : '+ Agregar este ingrediente'}
                </button>
              </div>

              {/* Lista de ingredientes actuales */}
              <div className="border-t pt-4">
                <h4 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                  🥤 Ingredientes actuales ({(selectedReceta?.ingredientes || []).length})
                </h4>
                {(selectedReceta?.ingredientes || []).length === 0 ? (
                  <p className="text-sm text-gray-500 italic">Aún no hay ingredientes en esta receta.</p>
                ) : (
                  <div className="border border-gray-200 rounded-lg overflow-x-auto">
                    <table className="min-w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">Material</th>
                          <th className="px-4 py-2 text-right text-xs font-semibold text-gray-700">Cantidad</th>
                          <th className="px-4 py-2 text-right text-xs font-semibold text-gray-700">Costo Unit.</th>
                          <th className="px-4 py-2 text-right text-xs font-semibold text-gray-700">Costo Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {(selectedReceta?.ingredientes || []).map((ing) => (
                          <tr key={ing.id} className="hover:bg-gray-50">
                            <td className="px-4 py-2 text-sm text-gray-900">{ing.nombre}</td>
                            <td className="px-4 py-2 text-sm text-right text-gray-700">
                              {ing.cantidad} {ing.unidad}
                            </td>
                            <td className="px-4 py-2 text-sm text-right text-gray-700">Q{(costoUnitarioEfectivo(ing) || 0).toFixed(2)}</td>
                            <td className="px-4 py-2 text-sm text-right font-semibold text-gray-900">
                              Q{costoIngredienteLibre(ing).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                        <tr className="bg-cyan-50 font-bold">
                          <td colSpan="3" className="px-4 py-2 text-sm text-gray-900">Subtotal Materia Prima</td>
                          <td className="px-4 py-2 text-sm text-right text-cyan-700">
                            Q{((selectedReceta?.ingredientes || []).reduce((sum, ing) => sum + costoIngredienteLibre(ing), 0)).toFixed(2)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            <div className="px-4 md:px-6 py-4 bg-gray-50 rounded-b-lg flex justify-between items-center gap-3">
              <p className="text-xs text-gray-500">
                {((selectedReceta?.ingredientes || []).length > 0)
                  ? `${selectedReceta.ingredientes.length} ingrediente(s)`
                  : 'Sin ingredientes aún'}
              </p>
              <button
                onClick={closeModal}
                className="px-4 md:px-6 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:shadow-lg transition-shadow font-semibold whitespace-nowrap"
              >
                ✓ Listo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Editar Ingrediente */}
      {showModal && modalType === 'editIngrediente' && selectedReceta && selectedIngrediente && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-lg w-full">
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-4 md:px-6 py-4 rounded-t-lg">
              <h3 className="text-xl font-bold">✏️ Editar Ingrediente</h3>
            </div>

            <div className="p-4 md:p-6 space-y-4">
              {errorMsg && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded text-sm">
                  {errorMsg}
                </div>
              )}
              {successMsg && (
                <div className="bg-green-50 border border-green-300 text-green-700 px-4 py-3 rounded-lg text-sm flex items-center gap-2 animate-pulse">
                  <span className="text-lg">✅</span>
                  <span className="font-medium">{successMsg}</span>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Producto de inventario vinculado</label>
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Sin vínculo / seleccionar producto --</option>
                  {productosInventario.map(p => (
                    <option key={p.id} value={p.id}>{`${p.nombre} - stock: ${p.stock}`}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nombre del Ingrediente *</label>
                <input
                  type="text"
                  value={ingredienteForm.nombre}
                  onChange={(e) => setIngredienteForm({...ingredienteForm, nombre: sanitizeSoloLetras(e.target.value)})}
                  onBlur={(e) => setIngredienteForm({...ingredienteForm, nombre: capitalizeWords(e.target.value)})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Ej: Harina, Azúcar, Leche..."
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Cantidad *</label>
                  <input
                    type="number"
                    value={ingredienteForm.cantidad}
                    onChange={(e) => setIngredienteForm({...ingredienteForm, cantidad: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Ej: 500"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Unidad *</label>
                  <select
                    value={ingredienteForm.unidad}
                    onChange={(e) => setIngredienteForm({...ingredienteForm, unidad: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Seleccionar...</option>
                    {unidadesMedida.map((unidad) => (
                      <option key={unidad} value={unidad}>{unidad}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Costo Unitario (Q)</label>
                  <input
                    type="number"
                    value={ingredienteForm.costoUnitario}
                    onChange={(e) => setIngredienteForm({...ingredienteForm, costoUnitario: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Ej: 15.50"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Contenido Total del Envase</label>
                  <input
                    type="number"
                    value={ingredienteForm.contenidoTotal}
                    onChange={(e) => setIngredienteForm({...ingredienteForm, contenidoTotal: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Ej: 100 (ml/g)"
                    step="0.01"
                  />
                  <p className="mt-1 text-xs text-gray-500">Si se llena, el costo se prorratea: (cantidad ÷ contenido) × costo.</p>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-gray-50 rounded-b-lg flex justify-end gap-3">
              <button
                onClick={closeModal}
                disabled={loading}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors disabled:bg-gray-400"
              >
                Cancelar
              </button>
              <button
                onClick={handleUpdateIngrediente}
                disabled={loading}
                className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:shadow-lg transition-shadow disabled:from-blue-400 disabled:to-indigo-500"
              >
                {loading ? 'Guardando...' : 'Actualizar Ingrediente'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ProduccionRecetas
