import React, { useState, useEffect, useMemo } from 'react'
import {
  ClipboardCheck,
  Check,
  ArrowRight,
  ArrowLeft,
  X,
  Info,
  Layers,
  Box,
  FileCheck,
  AlertTriangle,
  Printer,
  Calendar,
  User,
  CheckCircle2,
  Search,
} from 'lucide-react'
import { getCatalogosAuditoria } from '../../../services/auditoriaService'
import { getCurrentUser } from '../../../services/authService'

export default function AuditoriaWizard({
  productos = [],
  categorias = [],
  currentUser,
  existingAuditorias = [],
  onCancel,
  onSaveBorrador,
  onIniciarConteo,
  isSaving = false,
}) {
  const [currentStep, setCurrentStep] = useState(1)

  // Usuario autenticado activo (prop o sesión local)
  const activeUser = currentUser || getCurrentUser()
  const detectedNombreInicial = activeUser?.nombre || activeUser?.username || activeUser?.email || ''
  const detectedRolInicial = activeUser?.rol || (activeUser?.role === 'admin' ? 'Administrador' : 'Operador de Bodega')

  // Catálogos dinámicos desde Base de Datos
  const [catalogosDb, setCatalogosDb] = useState({
    categorias: [],
    responsables: [],
    estados: [],
    tiposAlcance: [],
  })
  const [selectedResponsableId, setSelectedResponsableId] = useState(activeUser?.id || '')
  const [responsableNombre, setResponsableNombre] = useState(detectedNombreInicial)
  const [responsableRol, setResponsableRol] = useState(detectedRolInicial)

  // Sincronizar automáticamente el usuario reconocido con la base de datos de perfiles
  useEffect(() => {
    const user = currentUser || getCurrentUser()
    if (!user) return

    const dbMatch = (catalogosDb.responsables || []).find((u) =>
      (user.id && String(u.id) === String(user.id)) ||
      (user.username && u.usuario && u.usuario.toLowerCase() === user.username.toLowerCase()) ||
      (user.email && u.email && u.email.toLowerCase() === user.email.toLowerCase())
    )

    if (dbMatch) {
      setSelectedResponsableId(dbMatch.id)
      setResponsableNombre(dbMatch.nombre)
      setResponsableRol(dbMatch.rol || 'Operador de Bodega')
    } else {
      const nombreFinal = user.nombre || user.username || user.email || ''
      if (nombreFinal) {
        setResponsableNombre(nombreFinal)
      }
      if (user.rol || user.role) {
        setResponsableRol(user.rol || (user.role === 'admin' ? 'Administrador' : 'Operador de Bodega'))
      }
    }
  }, [currentUser, catalogosDb.responsables])

  useEffect(() => {
    let mounted = true
    const fetchCatalogos = async () => {
      try {
        const cats = await getCatalogosAuditoria()
        if (mounted && cats) {
          setCatalogosDb({
            categorias: Array.isArray(cats.categorias) ? cats.categorias : [],
            responsables: Array.isArray(cats.responsables) ? cats.responsables : [],
            estados: Array.isArray(cats.estados) ? cats.estados : [],
            tiposAlcance: Array.isArray(cats.tiposAlcance) ? cats.tiposAlcance : [],
          })
        }
      } catch (err) {
        console.warn('No se pudieron cargar catálogos desde la BD:', err)
      }
    }
    fetchCatalogos()
    return () => {
      mounted = false
    }
  }, [])

  // Mes y Año actuales para valores por defecto
  const hoy = new Date()
  const mesActual = hoy.getMonth() + 1
  const anioActual = hoy.getFullYear()
  const hoyIso = hoy.toISOString().split('T')[0]

  const meses = [
    { num: 1, nombre: 'Enero' },
    { num: 2, nombre: 'Febrero' },
    { num: 3, nombre: 'Marzo' },
    { num: 4, nombre: 'Abril' },
    { num: 5, nombre: 'Mayo' },
    { num: 6, nombre: 'Junio' },
    { num: 7, nombre: 'Julio' },
    { num: 8, nombre: 'Agosto' },
    { num: 9, nombre: 'Septiembre' },
    { num: 10, nombre: 'Octubre' },
    { num: 11, nombre: 'Noviembre' },
    { num: 12, nombre: 'Diciembre' },
  ]

  // FASE 1: Formulario General
  const [nombre, setNombre] = useState(
    `Auditoría de inventario - ${meses.find((m) => m.num === mesActual)?.nombre} ${anioActual}`
  )
  const [periodoMes, setPeriodoMes] = useState(mesActual)
  const [periodoAnio, setPeriodoAnio] = useState(anioActual)
  const [fechaCorte, setFechaCorte] = useState(hoyIso)
  const [descripcion, setDescripcion] = useState(
    'Conteo físico de existencias de bodega al cierre del período para conciliación.'
  )

  // FASE 2: Alcance
  const [tipoAlcance, setTipoAlcance] = useState('Todo el inventario') // 'Todo el inventario' | 'Por categoría' | 'Productos específicos'
  const [selectedCategorias, setSelectedCategorias] = useState([])
  const [selectedProductoIds, setSelectedProductoIds] = useState([])
  const [searchProducto, setSearchProducto] = useState('')

  // Categorías efectivas (desde BD, o prop de respaldo)
  const categoriasEfectivas = useMemo(() => {
    if (catalogosDb.categorias.length > 0) {
      return catalogosDb.categorias
    }
    return categorias || []
  }, [catalogosDb.categorias, categorias])

  // FASE 3: Checklist manual
  const [checklist, setChecklist] = useState({
    periodoCorrecto: true,
    responsableAsignado: true,
    alcanceVerificado: true,
    unidadesVerificadas: true,
    movimientosAlDia: true,
  })

  // Actualizar nombre automático al cambiar mes o año
  const handlePeriodoChange = (mes, anio) => {
    setPeriodoMes(mes)
    setPeriodoAnio(anio)
    const mesNombre = meses.find((m) => m.num === mes)?.nombre || ''
    setNombre(`Auditoría de inventario - ${mesNombre} ${anio}`)
  }

  // Filtrado de productos para Fase 2
  const productosFiltradosParaPicker = useMemo(() => {
    if (!searchProducto.trim()) return productos
    const q = searchProducto.toLowerCase()
    return productos.filter(
      (p) =>
        p.nombre?.toLowerCase().includes(q) ||
        p.codigo?.toLowerCase().includes(q) ||
        p.categoria?.toLowerCase().includes(q)
    )
  }, [productos, searchProducto])

  // Artículos resultantes del alcance
  const productosSeleccionadosFinal = useMemo(() => {
    if (tipoAlcance === 'Todo el inventario') {
      return productos
    }
    if (tipoAlcance === 'Por categoría') {
      if (selectedCategorias.length === 0) return []
      return productos.filter((p) => selectedCategorias.includes(p.categoria))
    }
    if (tipoAlcance === 'Productos específicos') {
      return productos.filter((p) => selectedProductoIds.includes(String(p.id)))
    }
    return []
  }, [tipoAlcance, selectedCategorias, selectedProductoIds, productos])

  // Detección de posibles duplicados o advertencias
  const advertencias = useMemo(() => {
    const list = []
    const auditMismoPeriodo = existingAuditorias.find(
      (a) =>
        a.estado !== 'Cancelada' &&
        a.estado !== 'Cerrada' &&
        Number(a.periodoMes) === Number(periodoMes) &&
        Number(a.periodoAnio) === Number(periodoAnio)
    )
    if (auditMismoPeriodo) {
      list.push(
        `Ya existe una auditoría activa (${auditMismoPeriodo.codigo} - "${auditMismoPeriodo.nombre}") para el mismo período.`
      )
    }

    if (productosSeleccionadosFinal.length === 0) {
      list.push('No hay artículos incluidos en el alcance seleccionado.')
    }

    const fechaObj = new Date(fechaCorte)
    const hoyObj = new Date(hoyIso)
    if (fechaObj > hoyObj) {
      list.push('La fecha de corte es posterior al día de hoy.')
    }

    return list
  }, [existingAuditorias, periodoMes, periodoAnio, productosSeleccionadosFinal, fechaCorte, hoyIso])

  // Validación por paso
  const isStepValid = (step) => {
    if (step === 1) {
      return (
        nombre.trim().length > 0 &&
        periodoMes &&
        periodoAnio &&
        fechaCorte &&
        responsableNombre.trim().length > 0 &&
        new Date(fechaCorte) <= new Date(hoyIso)
      )
    }
    if (step === 2) {
      return productosSeleccionadosFinal.length > 0
    }
    if (step === 3) {
      return (
        checklist.periodoCorrecto &&
        checklist.responsableAsignado &&
        checklist.alcanceVerificado &&
        checklist.unidadesVerificadas &&
        checklist.movimientosAlDia
      )
    }
    return true
  }

  // Empaquetar datos de la nueva auditoría
  const prepareAuditoriaPayload = (esBorrador) => {
    return {
      nombre: nombre.trim(),
      periodoMes: Number(periodoMes),
      periodoAnio: Number(periodoAnio),
      fechaCorte,
      responsableId: selectedResponsableId || currentUser?.id || null,
      responsableNombre: responsableNombre.trim(),
      responsableRol: responsableRol.trim(),
      tipoAlcance:
        tipoAlcance === 'Por categoría'
          ? 'CATEGORIA'
          : tipoAlcance === 'Productos específicos'
          ? 'ESPECIFICO'
          : 'TODO',
      tipoAlcanceTexto: tipoAlcance,
      alcanceConfig: {
        categorias: selectedCategorias,
        productos: selectedProductoIds,
        productosIds: selectedProductoIds,
      },
      productosSeleccionados: productosSeleccionadosFinal.map((p) => ({
        id: p.id,
        codigo: p.codigo,
        nombre: p.nombre,
        categoria: p.categoria,
        unidad_medida: p.unidad_medida || 'Unidad',
        presentacion: p.presentacion || '',
        stock: Number(p.stock || 0),
        costo_unitario: Number(p.precio_compra || p.costo_unitario || 0),
      })),
      usuario: currentUser?.nombre || currentUser?.email || 'Administrador',
      esBorrador,
    }
  }

  const handleNext = () => {
    if (isStepValid(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, 4))
    }
  }

  const handlePrev = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1))
  }

  const stepsInfo = [
    { num: 1, title: 'Información general', desc: 'Identificación y responsable' },
    { num: 2, title: 'Alcance', desc: 'Selección de productos' },
    { num: 3, title: 'Revisión', desc: 'Verificación preventiva' },
    { num: 4, title: 'Confirmación', desc: 'Apertura de auditoría' },
  ]

  return (
    <div className="space-y-6">
      {/* Indicador de Progreso (Stepper) */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 relative">
          {stepsInfo.map((s) => {
            const isCompleted = currentStep > s.num
            const isActive = currentStep === s.num
            return (
              <div
                key={s.num}
                className="flex items-center gap-3 cursor-pointer select-none"
                onClick={() => {
                  if (isCompleted || isStepValid(currentStep)) {
                    // Solo permitir saltar a pasos alcanzables
                    if (s.num <= currentStep || isStepValid(s.num - 1)) {
                      setCurrentStep(s.num)
                    }
                  }
                }}
              >
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm transition-all shrink-0 ${
                    isCompleted
                      ? 'bg-cyan-600 text-white shadow-xs'
                      : isActive
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md ring-4 ring-cyan-100'
                      : 'bg-slate-100 text-slate-400 border border-slate-200'
                  }`}
                >
                  {isCompleted ? <Check size={18} /> : s.num}
                </div>
                <div className="min-w-0">
                  <p
                    className={`text-xs sm:text-sm font-bold truncate ${
                      isActive ? 'text-cyan-800' : isCompleted ? 'text-slate-800' : 'text-slate-400'
                    }`}
                  >
                    {s.title}
                  </p>
                  <p className="text-[11px] text-slate-400 truncate hidden sm:block">{s.desc}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* CONTENIDO DEL PASO */}
      <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200/80 shadow-xs">
        {/* ================= FASE 1: INFORMACIÓN GENERAL ================= */}
        {currentStep === 1 && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Fase 1: Información General</h3>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Define el período, la fecha de corte y el responsable a cargo del conteo físico.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Tarjeta Datos de Auditoría */}
              <div className="space-y-4 p-5 rounded-2xl bg-slate-50/70 border border-slate-200">
                <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Calendar size={16} className="text-cyan-600" />
                  Datos de la Auditoría
                </h4>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nombre de la Auditoría *
                  </label>
                  <input
                    type="text"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    placeholder="Ej. Auditoría de inventario - Octubre 2026"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    Sugerido automáticamente según el período seleccionado.
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Mes *</label>
                    <select
                      value={periodoMes}
                      onChange={(e) => handlePeriodoChange(Number(e.target.value), periodoAnio)}
                      className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    >
                      {meses.map((m) => (
                        <option key={m.num} value={m.num}>
                          {m.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Año *</label>
                    <select
                      value={periodoAnio}
                      onChange={(e) => handlePeriodoChange(periodoMes, Number(e.target.value))}
                      className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    >
                      {[2025, 2026, 2027].map((yr) => (
                        <option key={yr} value={yr}>
                          {yr}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Fecha de Corte *
                  </label>
                  <input
                    type="date"
                    value={fechaCorte}
                    max={hoyIso}
                    onChange={(e) => setFechaCorte(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    Momento exacto al que corresponden las existencias teóricas (no posterior a hoy).
                  </span>
                </div>
              </div>

              {/* Tarjeta Responsable y Observaciones */}
              <div className="space-y-4 p-5 rounded-2xl bg-slate-50/70 border border-slate-200">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <User size={16} className="text-cyan-600" />
                    Responsable del Conteo
                  </h4>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800">
                    <CheckCircle2 size={12} />
                    Usuario reconocido
                  </span>
                </div>

                {/* Tarjeta del usuario autenticado reconocido automáticamente */}
                <div className="p-4 bg-white border border-emerald-200/80 rounded-xl flex items-center gap-3.5 shadow-xs">
                  <div className="w-11 h-11 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 text-white font-bold flex items-center justify-center text-sm shadow-sm shrink-0">
                    {(responsableNombre || 'U').charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-bold text-slate-900 truncate">
                        {responsableNombre || 'Identificando usuario...'}
                      </p>
                      <span className="text-[10px] font-semibold px-2 py-0.5 bg-cyan-100 text-cyan-800 rounded-md shrink-0">
                        {responsableRol || 'Operador'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 truncate mt-0.5">
                      Usuario que realiza la auditoría: <span className="font-medium text-slate-700">{activeUser?.username || activeUser?.email || responsableNombre}</span>
                    </p>
                  </div>
                </div>

                {catalogosDb.responsables.length > 0 && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Cambiar o delegar responsable (opcional)
                    </label>
                    <select
                      value={selectedResponsableId}
                      onChange={(e) => {
                        const selId = e.target.value
                        setSelectedResponsableId(selId)
                        const userFound = catalogosDb.responsables.find((u) => String(u.id) === String(selId))
                        if (userFound) {
                          setResponsableNombre(userFound.nombre)
                          setResponsableRol(userFound.rol || 'Operador de Bodega')
                        }
                      }}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    >
                      <option value="">-- Mantener usuario actual ({responsableNombre}) --</option>
                      {catalogosDb.responsables.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.nombre} ({u.rol || 'Operador'})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Descripción u Observaciones Iniciales
                  </label>
                  <textarea
                    rows={3}
                    value={descripcion}
                    onChange={(e) => setDescripcion(e.target.value)}
                    placeholder="Añade notas iniciales, justificación o indicaciones..."
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Panel Informativo de Buenas Prácticas */}
            <div className="p-4 rounded-xl bg-cyan-50/70 border border-cyan-200 text-cyan-900 flex items-start gap-3">
              <Info size={20} className="text-cyan-600 shrink-0 mt-0.5" />
              <div className="text-xs sm:text-sm">
                <span className="font-bold">Propósito de la Auditoría:</span> Esta auditoría permitirá
                comparar las existencias registradas en el sistema con las cantidades físicas encontradas en
                bodega, identificar diferencias y documentar su resolución sin alterar el inventario hasta la
                fase final de aprobación.
              </div>
            </div>
          </div>
        )}

        {/* ================= FASE 2: ALCANCE DE LA AUDITORÍA ================= */}
        {currentStep === 2 && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Fase 2: Alcance de la Auditoría</h3>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Define qué productos y categorías formarán parte del conteo físico.
              </p>
            </div>

            {/* 3 Tarjetas de Opción de Alcance */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Opción A: Todo */}
              <div
                onClick={() => setTipoAlcance('Todo el inventario')}
                className={`p-5 rounded-2xl border-2 cursor-pointer transition-all ${
                  tipoAlcance === 'Todo el inventario'
                    ? 'border-cyan-600 bg-cyan-50/40 shadow-sm ring-2 ring-cyan-200'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2.5 rounded-xl bg-cyan-100 text-cyan-800">
                    <Box size={22} />
                  </div>
                  <input
                    type="radio"
                    checked={tipoAlcance === 'Todo el inventario'}
                    onChange={() => setTipoAlcance('Todo el inventario')}
                    className="w-4 h-4 text-cyan-600"
                  />
                </div>
                <h4 className="font-bold text-slate-800 text-sm">Todo el inventario</h4>
                <p className="text-xs text-slate-500 mt-1">
                  Incluye todos los productos y presentaciones activos del catálogo de AMATI HIELO.
                </p>
                <div className="mt-3 text-[11px] font-bold text-cyan-700">
                  {productos.length} artículos disponibles
                </div>
              </div>

              {/* Opción B: Por Categoría */}
              <div
                onClick={() => setTipoAlcance('Por categoría')}
                className={`p-5 rounded-2xl border-2 cursor-pointer transition-all ${
                  tipoAlcance === 'Por categoría'
                    ? 'border-cyan-600 bg-cyan-50/40 shadow-sm ring-2 ring-cyan-200'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2.5 rounded-xl bg-sky-100 text-sky-800">
                    <Layers size={22} />
                  </div>
                  <input
                    type="radio"
                    checked={tipoAlcance === 'Por categoría'}
                    onChange={() => setTipoAlcance('Por categoría')}
                    className="w-4 h-4 text-cyan-600"
                  />
                </div>
                <h4 className="font-bold text-slate-800 text-sm">Por categoría</h4>
                <p className="text-xs text-slate-500 mt-1">
                  Permite auditar una o varias familias de productos específicas (MP, PT, suministros).
                </p>
                <div className="mt-3 text-[11px] font-bold text-sky-700">
                  {categoriasEfectivas.length} familias existentes
                </div>
              </div>

              {/* Opción C: Específicos */}
              <div
                onClick={() => setTipoAlcance('Productos específicos')}
                className={`p-5 rounded-2xl border-2 cursor-pointer transition-all ${
                  tipoAlcance === 'Productos específicos'
                    ? 'border-cyan-600 bg-cyan-50/40 shadow-sm ring-2 ring-cyan-200'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2.5 rounded-xl bg-blue-100 text-blue-800">
                    <Search size={22} />
                  </div>
                  <input
                    type="radio"
                    checked={tipoAlcance === 'Productos específicos'}
                    onChange={() => setTipoAlcance('Productos específicos')}
                    className="w-4 h-4 text-cyan-600"
                  />
                </div>
                <h4 className="font-bold text-slate-800 text-sm">Productos específicos</h4>
                <p className="text-xs text-slate-500 mt-1">
                  Selecciona manualmente artículos puntuales para auditorías selectivas o de control.
                </p>
                <div className="mt-3 text-[11px] font-bold text-blue-700">
                  {selectedProductoIds.length} seleccionados
                </div>
              </div>
            </div>

            {/* Subpanel de Configuración según el alcance elegido */}
            {tipoAlcance === 'Por categoría' && (
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Selecciona las categorías a incluir:
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {categoriasEfectivas.map((cat) => {
                    const nombreCat = cat.nombre || cat
                    const isChecked = selectedCategorias.includes(nombreCat)
                    const countInCat = productos.filter((p) => p.categoria === nombreCat).length
                    return (
                      <label
                        key={nombreCat}
                        className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                          isChecked
                            ? 'bg-white border-cyan-500 shadow-xs ring-1 ring-cyan-400'
                            : 'bg-white/60 border-slate-200 hover:bg-white'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedCategorias([...selectedCategorias, nombreCat])
                            } else {
                              setSelectedCategorias(selectedCategorias.filter((c) => c !== nombreCat))
                            }
                          }}
                          className="w-4 h-4 text-cyan-600 rounded"
                        />
                        <div className="min-w-0">
                          <span className="text-xs font-bold text-slate-800 block truncate">
                            {nombreCat}
                          </span>
                          <span className="text-[10px] text-slate-400">{countInCat} artículos</span>
                        </div>
                      </label>
                    )
                  })}
                </div>
              </div>
            )}

            {tipoAlcance === 'Productos específicos' && (
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                    Selecciona los productos individuales:
                  </h4>
                  <div className="w-full sm:w-64 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                    <input
                      type="text"
                      placeholder="Filtrar por código o nombre..."
                      value={searchProducto}
                      onChange={(e) => setSearchProducto(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-xl bg-white divide-y divide-slate-100">
                  {productosFiltradosParaPicker.map((p) => {
                    const isChecked = selectedProductoIds.includes(String(p.id))
                    return (
                      <label
                        key={p.id}
                        className={`flex items-center justify-between p-2.5 sm:px-4 hover:bg-slate-50 cursor-pointer text-xs ${
                          isChecked ? 'bg-cyan-50/50' : ''
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedProductoIds([...selectedProductoIds, String(p.id)])
                              } else {
                                setSelectedProductoIds(
                                  selectedProductoIds.filter((id) => id !== String(p.id))
                                )
                              }
                            }}
                            className="w-4 h-4 text-cyan-600 rounded"
                          />
                          <div>
                            <span className="font-semibold text-slate-800">{p.nombre}</span>
                            <span className="text-[10px] text-slate-400 ml-2 font-mono">
                              ({p.codigo})
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-medium text-[10px]">
                            {p.categoria}
                          </span>
                        </div>
                      </label>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Resumen Dinámico del Alcance Configurado */}
            <div className="p-4 rounded-xl bg-cyan-50/60 border border-cyan-200 text-xs space-y-2">
              <span className="font-bold text-cyan-900 block text-sm">Resumen del Alcance Configurado:</span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div className="bg-white/90 p-3 rounded-lg border border-cyan-200/60">
                  <span className="text-slate-500 block text-[11px]">Tipo de alcance:</span>
                  <strong className="text-cyan-950 font-bold text-sm">{tipoAlcance}</strong>
                </div>
                <div className="bg-white/90 p-3 rounded-lg border border-cyan-200/60">
                  <span className="text-slate-500 block text-[11px]">Productos a auditar:</span>
                  <strong className="text-cyan-950 font-bold text-sm">{productosSeleccionadosFinal.length} artículos</strong>
                </div>
                <div className="bg-white/90 p-3 rounded-lg border border-cyan-200/60">
                  <span className="text-slate-500 block text-[11px]">Fecha de corte:</span>
                  <strong className="text-cyan-950 font-bold text-sm">{fechaCorte}</strong>
                </div>
              </div>
            </div>

            {/* Panel de recomendaciones */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1">
              <p className="font-semibold text-slate-800">Recomendaciones de inventario AMATI HIELO:</p>
              <ul className="list-disc list-inside space-y-0.5 text-slate-500">
                <li>Verifica que los productos seleccionados correspondan a las familias y artículos deseados.</li>
                <li>Respeta las unidades de medida (libras para materia prima vs bolsas o barras para producto final).</li>
                <li>Si una materia prima se usa en varias recetas BOM, se contará como una existencia física única.</li>
              </ul>
            </div>
          </div>
        )}

        {/* ================= FASE 3: REVISIÓN DE LA AUDITORÍA ================= */}
        {currentStep === 3 && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Fase 3: Revisión Preventiva</h3>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Verifica todos los datos y completa la lista de preparación antes de confirmar la auditoría.
              </p>
            </div>

            {/* Advertencias */}
            {advertencias.length > 0 && (
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 space-y-1">
                <div className="flex items-center gap-2 font-bold text-xs sm:text-sm text-amber-800">
                  <AlertTriangle size={18} />
                  Condiciones a tener en cuenta:
                </div>
                <ul className="list-disc list-inside text-xs text-amber-800 space-y-0.5">
                  {advertencias.map((adv, idx) => (
                    <li key={idx}>{adv}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Sección A: Datos Generales */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                  Datos Generales
                </h4>
                <div className="flex justify-between border-b border-slate-200/60 pb-1.5">
                  <span className="text-slate-500">Nombre:</span>
                  <strong className="text-slate-800 text-right">{nombre}</strong>
                </div>
                <div className="flex justify-between border-b border-slate-200/60 pb-1.5">
                  <span className="text-slate-500">Período:</span>
                  <strong className="text-slate-800">
                    {meses.find((m) => m.num === periodoMes)?.nombre} {periodoAnio}
                  </strong>
                </div>
                <div className="flex justify-between border-b border-slate-200/60 pb-1.5">
                  <span className="text-slate-500">Fecha de corte:</span>
                  <strong className="text-slate-800">{fechaCorte}</strong>
                </div>
                <div className="flex justify-between border-b border-slate-200/60 pb-1.5">
                  <span className="text-slate-500">Responsable:</span>
                  <strong className="text-slate-800">{responsableNombre}</strong>
                </div>
                {descripcion && (
                  <div className="pt-1">
                    <span className="text-slate-500 block">Observaciones:</span>
                    <p className="text-slate-700 italic mt-0.5">{descripcion}</p>
                  </div>
                )}
              </div>

              {/* Sección B: Alcance Seleccionado */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                  Alcance Seleccionado
                </h4>
                <div className="flex justify-between border-b border-slate-200/60 pb-1.5">
                  <span className="text-slate-500">Tipo:</span>
                  <strong className="text-slate-800">{tipoAlcance}</strong>
                </div>
                <div className="flex justify-between border-b border-slate-200/60 pb-1.5">
                  <span className="text-slate-500">Total Artículos:</span>
                  <strong className="text-cyan-700 font-bold">
                    {productosSeleccionadosFinal.length} productos
                  </strong>
                </div>
                {tipoAlcance === 'Por categoría' && (
                  <div>
                    <span className="text-slate-500 block">Categorías:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {selectedCategorias.map((c) => (
                        <span key={c} className="px-2 py-0.5 bg-cyan-100 text-cyan-800 rounded font-semibold text-[10px]">
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Sección C: Lista de Verificación (Checklist) */}
            <div className="p-5 rounded-2xl bg-white border border-slate-200 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <FileCheck size={16} className="text-cyan-600" />
                Lista de Verificación de Preparación
              </h4>
              <p className="text-xs text-slate-500">
                Marca cada punto para confirmar que las condiciones operativas de bodega están listas:
              </p>

              <div className="space-y-2">
                {[
                  ['periodoCorrecto', 'El período y la fecha de corte han sido verificados.'],
                  ['responsableAsignado', 'El responsable asignado está notificado y disponible para el conteo.'],
                  ['alcanceVerificado', 'Los productos incluidos corresponden fielmente al alcance deseado.'],
                  ['unidadesVerificadas', 'Las unidades de medida y presentaciones están normalizadas.'],
                  ['movimientosAlDia', 'Se han registrado todas las entradas y mermas previas a la fecha de corte.'],
                ].map(([key, label]) => (
                  <label
                    key={key}
                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      checklist[key]
                        ? 'bg-cyan-50/40 border-cyan-300'
                        : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checklist[key]}
                      onChange={(e) => setChecklist({ ...checklist, [key]: e.target.checked })}
                      className="w-4 h-4 text-cyan-600 rounded"
                    />
                    <span className="text-xs font-semibold text-slate-800">{label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ================= FASE 4: CONFIRMACIÓN Y PREPARACIÓN ================= */}
        {currentStep === 4 && (
          <div className="space-y-6 text-center py-4 animate-in fade-in duration-200">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 text-white flex items-center justify-center mx-auto shadow-md">
              <ClipboardCheck size={32} />
            </div>

            <div>
              <h3 className="text-xl font-bold text-slate-900">¡Auditoría Lista para Creación!</h3>
              <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto mt-1">
                Se han configurado <strong className="text-slate-800">{productosSeleccionadosFinal.length} productos</strong>{' '}
                para conciliar bajo la responsabilidad de{' '}
                <strong className="text-slate-800">{responsableNombre}</strong>.
              </p>
            </div>

            <div className="max-w-md mx-auto p-4 rounded-xl bg-sky-50 border border-sky-200 text-left text-xs text-sky-900 space-y-1">
              <span className="font-bold flex items-center gap-1.5">
                <Info size={14} /> Modo de Conteo Ciego AMATI HIELO:
              </span>
              <p className="text-sky-800">
                Durante el conteo físico, las existencias teóricas permanecerán ocultas para el operador
                garantizando un conteo totalmente imparcial y fidedigno.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4 max-w-lg mx-auto">
              {/* Guardar como Borrador */}
              <button
                type="button"
                disabled={isSaving}
                onClick={() => onSaveBorrador(prepareAuditoriaPayload(true))}
                className="w-full sm:w-1/2 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-sm transition-all border border-slate-300 disabled:opacity-50"
              >
                Guardar como borrador
              </button>

              {/* Iniciar Conteo Ahora */}
              <button
                type="button"
                disabled={isSaving}
                onClick={() => onIniciarConteo(prepareAuditoriaPayload(false))}
                className="w-full sm:w-1/2 py-3 px-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white rounded-xl font-bold text-sm shadow-md transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <span>Iniciar conteo ahora</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Barra de Navegación Inferior */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl text-xs sm:text-sm font-semibold transition-colors"
        >
          Cancelar
        </button>

        <div className="flex items-center gap-3">
          {currentStep > 1 && (
            <button
              type="button"
              onClick={handlePrev}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs sm:text-sm font-semibold transition-colors"
            >
              <ArrowLeft size={16} />
              Anterior
            </button>
          )}

          {currentStep < 4 && (
            <button
              type="button"
              disabled={!isStepValid(currentStep)}
              onClick={handleNext}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-xs transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Siguiente
              <ArrowRight size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
