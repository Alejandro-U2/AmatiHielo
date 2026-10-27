import type { ReactNode } from 'react'
import { FormEvent, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import {
  Boxes,
  Database,
  Edit3,
  Eye,
  FileDown,
  Layers3,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Table,
  Trash2,
  HardDrive,
  X,
} from 'lucide-react'
import {
  createEstructura,
  createRegistroTabla,
  deleteEstructura,
  deleteRegistroTabla,
  listEstructuras,
  listRegistrosTabla,
  updateRegistroTabla,
  type EstructuraCampo,
  type EstructuraMeta,
  type EstructuraTabla,
} from '../../services/estructuraDatosService'
import ReporteModal from '../../components/ReporteModal'
import { generarReporteModulo } from '../../utils/moduloExport'
import Pagination from '../../components/Pagination'
import SortableHeader from '../../components/SortableHeader'
import SuccessModal from '../SuccessModal'
import { useTableSort, sortRows } from '../../hooks/useTableSort'
import MantenimientoBackups from './mantenimiento/MantenimientoBackups'

type CampoForm = {
  nombre: string
  tipoDato: string
  descripcion: string
  requerido: boolean
  unico: boolean
}

type FormState = {
  nombreInterno: string
  nombreVisible: string
  modulo: string
  descripcion: string
  campos: CampoForm[]
}

const FIELD_TYPE_OPTIONS = [
  { value: 'text', label: 'Texto' },
  { value: 'integer', label: 'Entero' },
  { value: 'bigint', label: 'Entero grande' },
  { value: 'numeric', label: 'Número decimal' },
  { value: 'boolean', label: 'Booleano' },
  { value: 'date', label: 'Fecha' },
  { value: 'timestamp', label: 'Fecha y hora' },
]

const emptyField = (): CampoForm => ({
  nombre: '',
  tipoDato: 'text',
  descripcion: '',
  requerido: false,
  unico: false,
})

const emptyForm = (): FormState => ({
  nombreInterno: '',
  nombreVisible: '',
  modulo: '',
  descripcion: '',
  campos: [emptyField()],
})

function formatDate(value: string) {
  if (!value) return 'Sin registro'

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return 'Sin registro'

  return parsed.toLocaleString('es-GT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function normalizeIdentifier(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .replace(/_+/g, '_')
}

function normalizeFieldIdentifier(value: string) {
  return normalizeIdentifier(value)
}

export default function MantenimientoDatos() {
  const [mainTab, setMainTab] = useState<'tablas' | 'backups'>('tablas')
  const [tablas, setTablas] = useState<EstructuraTabla[]>([])
  const [meta, setMeta] = useState<EstructuraMeta | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(5)
  const [reporteOpen, setReporteOpen] = useState(false)
  const [generandoReporte, setGenerandoReporte] = useState(false)
  const [selectedTabla, setSelectedTabla] = useState<EstructuraTabla | null>(null)
  const [modalTab, setModalTab] = useState<'registros' | 'campos'>('registros')
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [formError, setFormError] = useState('')
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [deleteError, setDeleteError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [form, setForm] = useState<FormState>(emptyForm())

  // Estados para la consulta y gestión de registros dentro del modal
  const [registros, setRegistros] = useState<Record<string, any>[]>([])
  const [registrosCampos, setRegistrosCampos] = useState<EstructuraCampo[]>([])
  const [registrosTotal, setRegistrosTotal] = useState(0)
  const [registrosPage, setRegistrosPage] = useState(1)
  const [registrosPageSize, setRegistrosPageSize] = useState(10)
  const [registrosSearch, setRegistrosSearch] = useState('')
  const [registrosLoading, setRegistrosLoading] = useState(false)

  const [showRegistroModal, setShowRegistroModal] = useState(false)
  const [editingRegistro, setEditingRegistro] = useState<Record<string, any> | null>(null)
  const [registroFormData, setRegistroFormData] = useState<Record<string, any>>({})
  const [registroFormSaving, setRegistroFormSaving] = useState(false)
  const [registroFormError, setRegistroFormError] = useState('')
  const [deletingRegistroId, setDeletingRegistroId] = useState<string | number | null>(null)

  const loadTablas = async () => {
    try {
      setLoading(true)
      const response = await listEstructuras()
      setTablas(response.data)
      setMeta(response.meta)
    } catch (error: any) {
      toast.error(error.message || 'No fue posible cargar la estructura.')
      setTablas([])
      setMeta(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTablas()
  }, [])

  const filteredTablas = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()
    if (!query) return tablas

    return tablas.filter((tabla) => (
      tabla.nombreVisible.toLowerCase().includes(query)
      || tabla.nombreInterno.toLowerCase().includes(query)
      || tabla.modulo.toLowerCase().includes(query)
    ))
  }, [searchTerm, tablas])

  const tablaSort = useTableSort(null) as {
    sortBy: string | null
    sortDir: 'asc' | 'desc'
    toggle: (key: string) => void
    setSortBy: (key: string | null) => void
    setSortDir: (dir: 'asc' | 'desc') => void
  }

  const sortedTablas = sortRows(filteredTablas, tablaSort.sortBy, tablaSort.sortDir, (tabla: EstructuraTabla) => {
    switch (tablaSort.sortBy) {
      case 'nombre': return tabla.nombreVisible.toLowerCase()
      case 'modulo': return tabla.modulo.toLowerCase()
      case 'descripcion': return tabla.descripcion ? tabla.descripcion.toLowerCase() : ''
      default: return null
    }
  }) as EstructuraTabla[]

  const totalPages = Math.max(1, Math.ceil(sortedTablas.length / pageSize))
  const paginatedTablas = sortedTablas.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, tablaSort.sortBy, tablaSort.sortDir, pageSize])

  const modulosReporte = useMemo(() => {
    const counts: Record<string, number> = {}
    tablas.forEach((tabla) => {
      const modulo = tabla.modulo || 'Sin módulo'
      counts[modulo] = (counts[modulo] || 0) + 1
    })

    const options = Object.keys(counts).map((modulo) => ({
      value: modulo,
      label: modulo,
      count: counts[modulo],
    }))

    return [{ value: '', label: 'Todos', count: tablas.length }, ...options]
  }, [tablas])

  const handleGenerarReporteTablas = async (modulo: string = '') => {
    try {
      setGenerandoReporte(true)
      const rows = modulo
        ? tablas.filter((tabla) => (tabla.modulo || 'Sin módulo') === modulo)
        : tablas

      const columns = [
        { key: 'nombre', label: 'NOMBRE DE LA TABLA', width: 40, align: 'left' },
        { key: 'nombreInterno', label: 'NOMBRE INTERNO', width: 32, align: 'left' },
        { key: 'modulo', label: 'MÓDULO', width: 28, align: 'center' },
        { key: 'campos', label: 'CAMPOS', width: 18, align: 'center' },
        { key: 'registros', label: 'REGISTROS', width: 20, align: 'center' },
        { key: 'descripcion', label: 'DESCRIPCIÓN', width: 48, align: 'left' },
      ]

      await generarReporteModulo({
        fileName: 'reporte_estructura_datos.pdf',
        title: 'REPORTE DE MANTENIMIENTO DE DATOS (DICCIONARIO)',
        columns,
        rows: rows.map((tabla) => ({
          nombre: tabla.nombreVisible,
          nombreInterno: tabla.nombreInterno,
          modulo: tabla.modulo || '-',
          campos: String(tabla.totalCampos ?? 0),
          registros: String(tabla.totalRegistros ?? 0),
          descripcion: tabla.descripcion || 'Sin descripción',
        })),
        totalLabel: 'TOTAL DE TABLAS',
        totalValue: rows.length,
        filterLabel: modulo || 'Todos',
        note: 'Inventario de tablas registradas en el diccionario de estructura de datos del sistema.',
      })
      toast.success('Reporte de estructura de datos generado correctamente.')
      setReporteOpen(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No fue posible generar el reporte.')
    } finally {
      setGenerandoReporte(false)
    }
  }

  const activeColumns = useMemo(() => {
    const base = registrosCampos.length > 0 ? registrosCampos : (selectedTabla?.campos || [])
    const hasId = base.some((c) => c.nombre === 'id')
    if (!hasId && registros.some((r) => r.id !== undefined)) {
      return [{ nombre: 'id', tipoDato: 'bigint', descripcion: 'ID', requerido: true, unico: true, orden: 0 }, ...base]
    }
    return base
  }, [registrosCampos, selectedTabla, registros])

  const loadRegistros = async (tablaId: number, page = registrosPage, search = registrosSearch) => {
    try {
      setRegistrosLoading(true)
      const res = await listRegistrosTabla(tablaId, {
        page,
        pageSize: registrosPageSize,
        search,
      })
      setRegistros(res.data)
      setRegistrosTotal(res.total)
      setRegistrosCampos(res.campos)
    } catch (error: any) {
      toast.error(error.message || 'No fue posible cargar los registros.')
      setRegistros([])
      setRegistrosTotal(0)
      setRegistrosCampos([])
    } finally {
      setRegistrosLoading(false)
    }
  }

  useEffect(() => {
    if (selectedTabla && showDetailModal && modalTab === 'registros') {
      loadRegistros(selectedTabla.id, registrosPage, registrosSearch)
    }
  }, [selectedTabla?.id, registrosPage, registrosPageSize, registrosSearch, showDetailModal, modalTab])

  const handleOpenCreateRegistro = () => {
    if (!selectedTabla) return
    const initial: Record<string, any> = {}
    selectedTabla.campos.forEach((c) => {
      if (c.nombre === 'id' || c.nombre === 'created_at' || c.nombre === 'updated_at') return
      if (c.tipoDato.toLowerCase() === 'boolean') {
        initial[c.nombre] = true
      } else {
        initial[c.nombre] = ''
      }
    })
    setRegistroFormData(initial)
    setEditingRegistro(null)
    setRegistroFormError('')
    setShowRegistroModal(true)
  }

  const handleOpenEditRegistro = (row: Record<string, any>) => {
    if (!selectedTabla) return
    const initial: Record<string, any> = {}
    selectedTabla.campos.forEach((c) => {
      if (c.nombre === 'id' || c.nombre === 'created_at' || c.nombre === 'updated_at') return
      initial[c.nombre] = row[c.nombre] ?? ''
    })
    setRegistroFormData(initial)
    setEditingRegistro(row)
    setRegistroFormError('')
    setShowRegistroModal(true)
  }

  const handleSaveRegistro = async (e: FormEvent) => {
    e.preventDefault()
    if (!selectedTabla) return

    for (const c of selectedTabla.campos) {
      if (c.nombre === 'id' || c.nombre === 'created_at' || c.nombre === 'updated_at') continue
      if (c.requerido) {
        const val = registroFormData[c.nombre]
        if (val === null || val === undefined || String(val).trim() === '') {
          setRegistroFormError(`El campo "${c.nombre}" es obligatorio.`)
          return
        }
      }
    }

    try {
      setRegistroFormSaving(true)
      setRegistroFormError('')

      if (editingRegistro) {
        await updateRegistroTabla(selectedTabla.id, editingRegistro.id, registroFormData)
        setSuccessMessage('Registro actualizado exitosamente.')
      } else {
        await createRegistroTabla(selectedTabla.id, registroFormData)
        setSuccessMessage('Registro agregado exitosamente.')
      }

      setShowRegistroModal(false)
      await loadRegistros(selectedTabla.id)
      const res = await listEstructuras()
      setTablas(res.data)
      setMeta(res.meta)
      const updated = res.data.find((t) => t.id === selectedTabla.id)
      if (updated) {
        setSelectedTabla(updated)
      } else {
        setSelectedTabla((prev) => prev ? {
          ...prev,
          totalRegistros: editingRegistro ? prev.totalRegistros : prev.totalRegistros + 1
        } : null)
      }
    } catch (error: any) {
      setRegistroFormError(error.message || 'Error al guardar el registro.')
    } finally {
      setRegistroFormSaving(false)
    }
  }

  const handleDeleteRegistro = async (rowId: string | number) => {
    if (!selectedTabla) return
    const confirmed = window.confirm('¿Deseas eliminar este registro? Esta acción no se puede deshacer.')
    if (!confirmed) return

    try {
      setDeletingRegistroId(rowId)
      await deleteRegistroTabla(selectedTabla.id, rowId)
      setSuccessMessage('Registro eliminado correctamente.')
      await loadRegistros(selectedTabla.id)
      const res = await listEstructuras()
      setTablas(res.data)
      setMeta(res.meta)
      const updated = res.data.find((t) => t.id === selectedTabla.id)
      if (updated) {
        setSelectedTabla(updated)
      } else {
        setSelectedTabla((prev) => prev ? {
          ...prev,
          totalRegistros: Math.max(0, prev.totalRegistros - 1)
        } : null)
      }
    } catch (error: any) {
      toast.error(error.message || 'Error al eliminar el registro.')
    } finally {
      setDeletingRegistroId(null)
    }
  }

  const handleOpenDetail = (tabla: EstructuraTabla, tab: 'registros' | 'campos' = 'campos') => {
    setSelectedTabla(tabla)
    setModalTab(tab)
    setRegistrosPage(1)
    setRegistrosSearch('')
    setShowDetailModal(true)
    loadRegistros(tabla.id, 1, '')
  }

  const handleOpenCreate = () => {
    setForm(emptyForm())
    setFormError('')
    setDeleteError('')
    setShowCreateModal(true)
  }

  const handleCloseModals = () => {
    setShowDetailModal(false)
    setShowCreateModal(false)
    setShowRegistroModal(false)
    setSelectedTabla(null)
    setEditingRegistro(null)
    setFormError('')
    setDeleteError('')
    setRegistroFormError('')
  }

  const updateForm = <K extends keyof FormState>(field: K, value: FormState[K]) => {
    setForm((previous) => ({ ...previous, [field]: value }))
  }

  const updateCampo = (index: number, field: keyof CampoForm, value: string | boolean) => {
    setForm((previous) => ({
      ...previous,
      campos: previous.campos.map((campo, campoIndex) => (
        campoIndex === index ? { ...campo, [field]: value } : campo
      )),
    }))
  }

  const addCampo = () => {
    setForm((previous) => ({
      ...previous,
      campos: [...previous.campos, emptyField()],
    }))
  }

  const removeCampo = (index: number) => {
    setForm((previous) => ({
      ...previous,
      campos: previous.campos.filter((_, campoIndex) => campoIndex !== index),
    }))
  }

  const handleDelete = async (tabla: EstructuraTabla) => {
    if (tabla.esSistema) {
      setDeleteError('No se pueden eliminar tablas del sistema.')
      return
    }

    const confirmed = window.confirm(`¿Deseas eliminar la tabla ${tabla.nombreVisible}? Esta acción no se puede deshacer.`)
    if (!confirmed) return

    setDeleteError('')
    try {
      setDeleteId(tabla.id)
      await deleteEstructura(tabla.id)
      setSuccessMessage('Tabla eliminada correctamente.')
      await loadTablas()
    } catch (error: any) {
      setDeleteError(error.message || 'No fue posible eliminar la tabla.')
    } finally {
      setDeleteId(null)
    }
  }

  const validateForm = () => {
    const nombreVisible = form.nombreVisible.trim()
    const nombreInterno = normalizeIdentifier(form.nombreInterno)
    const modulo = form.modulo.trim()

    if (!nombreVisible || !nombreInterno || !modulo) {
      return 'Nombre, nombre interno y módulo son obligatorios.'
    }

    if (!/^[a-z_][a-z0-9_]*$/.test(nombreInterno)) {
      return 'El nombre interno debe usar minúsculas, números y guiones bajos.'
    }

    if (tablas.some((tabla) => tabla.nombreInterno.toLowerCase() === nombreInterno.toLowerCase())) {
      return 'El nombre interno debe ser único.'
    }

    const normalizedCampos = form.campos.map((campo) => ({
      ...campo,
      nombre: normalizeFieldIdentifier(campo.nombre),
    }))

    if (normalizedCampos.length === 0) {
      return 'Debe agregar al menos un campo.'
    }

    if (normalizedCampos.some((campo) => !campo.nombre)) {
      return 'Todos los campos deben tener nombre.'
    }

    const uniqueNames = new Set(normalizedCampos.map((campo) => campo.nombre))
    if (uniqueNames.size !== normalizedCampos.length) {
      return 'No se permiten nombres de campos duplicados.'
    }

    return ''
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const validationError = validateForm()
    if (validationError) {
      setFormError(validationError)
      return
    }

    const payloadCampos: EstructuraCampo[] = form.campos.map((campo, index) => ({
      nombre: normalizeFieldIdentifier(campo.nombre),
      tipoDato: campo.tipoDato,
      descripcion: campo.descripcion.trim(),
      requerido: campo.requerido,
      unico: campo.unico,
      orden: index + 1,
    }))

    try {
      setSaving(true)
      setFormError('')
      await createEstructura({
        nombreInterno: normalizeIdentifier(form.nombreInterno),
        nombreVisible: form.nombreVisible.trim(),
        modulo: form.modulo.trim(),
        descripcion: form.descripcion.trim(),
        campos: payloadCampos,
      })
      setSuccessMessage('Tabla creada correctamente.')
      handleCloseModals()
      await loadTablas()
    } catch (error: any) {
      setFormError(error.message || 'No fue posible crear la tabla.')
    } finally {
      setSaving(false)
    }
  }

  const totalTablas = meta?.totalTablas ?? tablas.length
  const totalModulos = meta?.totalModulos ?? new Set(tablas.map((tabla) => tabla.modulo)).size
  const totalRegistros = meta?.totalRegistros ?? tablas.reduce((sum, tabla) => sum + tabla.totalRegistros, 0)
  const estadoSistema = meta?.estadoSistema || 'Operativo'

  return (
    <div className="space-y-6">
      <div className="relative isolate overflow-hidden rounded-3xl border border-cyan-200 bg-gradient-to-br from-cyan-100 via-sky-50 to-blue-100 p-6 text-slate-900 shadow-sm md:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-100 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-800">
              {mainTab === 'tablas' ? <Database size={14} /> : <HardDrive size={14} />}
              {mainTab === 'tablas' ? 'ERP / Administración de estructura' : 'ERP / Seguridad y Respaldo'}
            </div>
            <h3 className="text-2xl md:text-3xl font-bold">
              {mainTab === 'tablas' ? 'Mantenimiento de datos' : 'Copias de Seguridad (Backups)'}
            </h3>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              {mainTab === 'tablas'
                ? 'Administra la estructura lógica de tablas, campos y definiciones del sistema desde una sola pantalla.'
                : 'Programa respaldos automáticos por Cron o genera copias manuales completas de las tablas del sistema.'}
            </p>
          </div>
          {mainTab === 'tablas' && (
            <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => setReporteOpen(true)}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-lg transition-transform hover:-translate-y-0.5"
            >
              <FileDown size={18} />
              Reporte
            </button>
            <button
              type="button"
              onClick={handleOpenCreate}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-slate-900 shadow-lg transition-transform hover:-translate-y-0.5"
            >
              <Plus size={18} />
              Nueva Tabla
            </button>
          </div>
          )}
        </div>
      </div>

      {/* Selector de Pestañas Principales */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="flex border-b border-slate-200 overflow-x-auto scrollbar-none touch-scroll whitespace-nowrap">
          <button
            type="button"
            onClick={() => setMainTab('tablas')}
            className={`flex items-center gap-2.5 px-6 py-4 font-semibold text-sm border-b-2 transition-colors ${
              mainTab === 'tablas'
                ? 'border-cyan-600 text-cyan-700 bg-cyan-50/40'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Database size={18} />
            <span>Diccionario y Estructura de Tablas</span>
          </button>
          <button
            type="button"
            onClick={() => setMainTab('backups')}
            className={`flex items-center gap-2.5 px-6 py-4 font-semibold text-sm border-b-2 transition-colors ${
              mainTab === 'backups'
                ? 'border-cyan-600 text-cyan-700 bg-cyan-50/40'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <HardDrive size={18} />
            <span>Copias de Seguridad (Backups)</span>
          </button>
        </div>
      </div>

      {mainTab === 'backups' && (
        <MantenimientoBackups />
      )}

      {mainTab === 'tablas' && (
        <>
      {deleteError && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {deleteError}
        </div>
      )}

      <div className="dashboard-kpis grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-5 mb-6">
        <StatCard title="Total de tablas" value={totalTablas} icon={<Database size={25} strokeWidth={2.2} />} tone="cyan" detail="Estructuras activas" />
        <StatCard title="Total de módulos" value={totalModulos} icon={<Layers3 size={25} strokeWidth={2.2} />} tone="purple" detail="Módulos del ERP" />
        <StatCard title="Total de registros" value={totalRegistros} icon={<Boxes size={25} strokeWidth={2.2} />} tone="blue" detail="Filas en base de datos" />
        <StatCard title="Estado del sistema" value={estadoSistema} icon={<ShieldCheck size={25} strokeWidth={2.2} />} tone="green" detail="Operación normal" />
      </div>

      {/* Explorador de tablas del diccionario */}
      <div className="rounded-2xl bg-white p-5 shadow-md ring-1 ring-slate-100">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h4 className="text-xl font-bold text-slate-900">Explorador de tablas</h4>
            <p className="text-sm text-slate-500">Busca por nombre o módulo y gestiona los registros o estructura de cada tabla.</p>
          </div>
          <div className="relative w-full max-w-md">
            <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Buscar por nombre o módulo..."
              className="w-full rounded-xl border border-slate-200 py-3 pl-11 pr-4 text-sm outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
            />
          </div>
        </div>

        <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
          <div className="overflow-x-auto touch-scroll">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600"><SortableHeader label="Nombre de la tabla" sortKey="nombre" sortBy={tablaSort.sortBy} sortDir={tablaSort.sortDir} onSort={tablaSort.toggle} className="text-slate-600" /></th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Nombre interno</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600"><SortableHeader label="Descripción" sortKey="descripcion" sortBy={tablaSort.sortBy} sortDir={tablaSort.sortDir} onSort={tablaSort.toggle} className="text-slate-600" /></th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600"><SortableHeader label="Módulo" sortKey="modulo" sortBy={tablaSort.sortBy} sortDir={tablaSort.sortDir} onSort={tablaSort.toggle} className="text-slate-600" /></th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-600">Campos</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-600">Registros</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-600">Sistema</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-600">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-sm text-slate-500">Cargando tablas...</td>
                  </tr>
                ) : filteredTablas.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-sm text-slate-500">No hay tablas que coincidan con la búsqueda.</td>
                  </tr>
                ) : (
                  paginatedTablas.map((tabla) => (
                    <tr key={tabla.id} className="transition hover:bg-slate-50">
                      <td className="px-4 py-4 text-sm font-semibold text-slate-900">{tabla.nombreVisible}</td>
                      <td className="px-4 py-4 text-sm font-mono text-slate-600">{tabla.nombreInterno}</td>
                      <td className="px-4 py-4 text-sm text-slate-600">{tabla.descripcion || 'Sin descripción'}</td>
                      <td className="px-4 py-4 text-sm text-slate-700">{tabla.modulo}</td>
                      <td className="px-4 py-4 text-center text-sm font-semibold text-slate-900">{tabla.totalCampos}</td>
                      <td className="px-4 py-4 text-center text-sm font-semibold text-slate-900">{tabla.totalRegistros}</td>
                      <td className="px-4 py-4 text-center">
                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${tabla.esSistema ? 'bg-sky-100 text-sky-700' : 'bg-emerald-100 text-emerald-700'}`}>
                          {tabla.esSistema ? 'Sí' : 'No'}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenDetail(tabla, 'registros')}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 transition hover:bg-emerald-100"
                            title="Ver y gestionar registros de esta tabla"
                          >
                            <Table size={16} />
                            Ver datos
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenDetail(tabla, 'campos')}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-cyan-50 px-3 py-2 text-sm font-medium text-cyan-700 transition hover:bg-cyan-100"
                            title="Ver estructura de campos"
                          >
                            <Eye size={16} />
                            Estructura
                          </button>
                          <button
                            type="button"
                            disabled={tabla.esSistema || deleteId === tabla.id}
                            onClick={() => handleDelete(tabla)}
                            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition ${
                              tabla.esSistema || deleteId === tabla.id
                                ? 'cursor-not-allowed bg-slate-100 text-slate-400'
                                : 'bg-red-50 text-red-700 hover:bg-red-100'
                            }`}
                            title={tabla.esSistema ? 'No se puede eliminar una tabla del sistema' : 'Eliminar tabla'}
                          >
                            <Trash2 size={16} />
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
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
            totalItems={sortedTablas.length}
          />
        </div>
      </div>
        </>
      )}

      {/* Modal de Detalle de Tabla: Tarjetas superiores, Registros (SELECT/CRUD) y Estructura (Campos) */}
      {showDetailModal && selectedTabla && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-2 sm:p-4">
          <div className="max-h-[92vh] w-full max-w-6xl overflow-y-auto rounded-2xl sm:rounded-3xl bg-white shadow-2xl">
            {/* Cabecera del Modal */}
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 sm:py-5">
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-xl sm:text-2xl font-bold text-slate-900">{selectedTabla.nombreVisible}</h4>
                  {selectedTabla.esSistema && (
                    <span className="rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-semibold text-sky-800">
                      Sistema
                    </span>
                  )}
                </div>
                <p className="text-sm font-mono text-slate-500 mt-0.5">{selectedTabla.nombreInterno}</p>
              </div>
              <button
                type="button"
                onClick={handleCloseModals}
                className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
              >
                <X size={20} />
              </button>
            </div>

            {/* Tarjetas informativas superiores (exactas al diseño del sistema) */}
            <div className="grid gap-3.5 px-6 py-5 sm:grid-cols-2 lg:grid-cols-5">
              <InfoCard label="Descripción" value={selectedTabla.descripcion || 'Sin descripción'} />
              <InfoCard label="Fecha de creación" value={formatDate(selectedTabla.createdAt)} />
              <InfoCard label="Módulo" value={selectedTabla.modulo} />
              <InfoCard label="Total de registros" value={String(selectedTabla.totalRegistros)} />
              <InfoCard label="Sistema" value={selectedTabla.esSistema ? 'Sí' : 'No'} />
            </div>

            {/* Pestañas de Navegación dentro del Modal */}
            <div className="px-6 border-b border-slate-200">
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => setModalTab('registros')}
                  className={`pb-3.5 px-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${
                    modalTab === 'registros'
                      ? 'border-cyan-600 text-cyan-700'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Table size={16} />
                  <span>Registros de la tabla</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                    modalTab === 'registros' ? 'bg-cyan-100 text-cyan-800' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {selectedTabla.totalRegistros}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setModalTab('campos')}
                  className={`pb-3.5 px-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${
                    modalTab === 'campos'
                      ? 'border-cyan-600 text-cyan-700'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Eye size={16} />
                  <span>Campos de la tabla</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                    modalTab === 'campos' ? 'bg-cyan-100 text-cyan-800' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {selectedTabla.totalCampos}
                  </span>
                </button>
              </div>
            </div>

            {/* CONTENIDO PESTAÑA 1: REGISTROS (SELECT Y GESTIÓN CRUD) */}
            {modalTab === 'registros' && (
              <div className="p-6 space-y-4">
                {/* Barra de búsqueda y acciones */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <div className="relative flex-1 max-w-md">
                    <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                      type="text"
                      value={registrosSearch}
                      onChange={(e) => {
                        setRegistrosSearch(e.target.value)
                        setRegistrosPage(1)
                      }}
                      placeholder="Buscar en registros de esta tabla..."
                      className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                    />
                  </div>
                  <div className="flex items-center gap-2 justify-end">
                    <button
                      type="button"
                      onClick={() => loadRegistros(selectedTabla.id)}
                      disabled={registrosLoading}
                      className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5"
                      title="Recargar datos"
                    >
                      <RefreshCw size={15} className={registrosLoading ? 'animate-spin' : ''} />
                      <span>Recargar</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleOpenCreateRegistro}
                      className="px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-md flex items-center gap-1.5 transition-all"
                    >
                      <Plus size={16} />
                      <span>+ Nuevo Registro</span>
                    </button>
                  </div>
                </div>

                {/* Tabla interactiva con SELECT de datos */}
                <div className="overflow-hidden rounded-2xl border border-slate-200">
                  <div className="overflow-x-auto touch-scroll">
                    <table className="min-w-full divide-y divide-slate-200">
                      <thead className="bg-slate-50">
                        <tr>
                          {activeColumns.map((campo) => (
                            <th
                              key={campo.nombre}
                              className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-600"
                            >
                              <div className="flex items-center gap-1">
                                <span>{campo.nombre}</span>
                                <span className="text-[10px] font-normal text-slate-400">({campo.tipoDato})</span>
                              </div>
                            </th>
                          ))}
                          <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider text-slate-600">
                            Acciones
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 bg-white">
                        {registrosLoading ? (
                          <tr>
                            <td
                              colSpan={activeColumns.length + 1}
                              className="px-4 py-12 text-center text-sm text-slate-500"
                            >
                              <div className="inline-flex items-center gap-2">
                                <RefreshCw size={18} className="animate-spin text-cyan-600" />
                                <span>Consultando registros de la tabla...</span>
                              </div>
                            </td>
                          </tr>
                        ) : registros.length === 0 ? (
                          <tr>
                            <td
                              colSpan={activeColumns.length + 1}
                              className="px-4 py-12 text-center text-sm text-slate-500"
                            >
                              <div className="max-w-md mx-auto space-y-2 text-center">
                                <Table size={36} className="mx-auto text-slate-300" />
                                <p className="font-semibold text-slate-700">No hay registros en esta tabla</p>
                                <p className="text-xs text-slate-400">
                                  {registrosSearch
                                    ? 'Ningún registro coincide con el filtro de búsqueda.'
                                    : 'Esta tabla está vacía. Haz clic en "+ Nuevo Registro" para insertar la primera opción.'}
                                </p>
                                {!registrosSearch && (
                                  <button
                                    type="button"
                                    onClick={handleOpenCreateRegistro}
                                    className="mt-2 inline-flex items-center gap-1.5 rounded-xl bg-cyan-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-cyan-700"
                                  >
                                    <Plus size={15} />
                                    <span>+ Agregar primer registro</span>
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ) : (
                          registros.map((row) => (
                            <tr key={row.id ?? Math.random()} className="transition hover:bg-slate-50">
                              {activeColumns.map((campo) => {
                                const val = row[campo.nombre]
                                const tipo = campo.tipoDato.toLowerCase()

                                if (val === null || val === undefined) {
                                  return (
                                    <td key={campo.nombre} className="px-4 py-3 text-xs italic text-slate-400">
                                      null
                                    </td>
                                  )
                                }

                                if (tipo === 'boolean') {
                                  return (
                                    <td key={campo.nombre} className="px-4 py-3 text-sm">
                                      <span
                                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                                          val ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                                        }`}
                                      >
                                        {val ? 'Sí / Activo' : 'No / Inactivo'}
                                      </span>
                                    </td>
                                  )
                                }

                                if (tipo.includes('timestamp') || tipo === 'date') {
                                  return (
                                    <td key={campo.nombre} className="px-4 py-3 text-xs text-slate-600 whitespace-nowrap">
                                      {formatDate(String(val))}
                                    </td>
                                  )
                                }

                                if (tipo === 'numeric' || tipo === 'integer' || tipo === 'bigint') {
                                  return (
                                    <td key={campo.nombre} className="px-4 py-3 text-sm font-semibold text-slate-800 font-mono">
                                      {val}
                                    </td>
                                  )
                                }

                                return (
                                  <td key={campo.nombre} className="px-4 py-3 text-sm text-slate-800 max-w-xs truncate" title={String(val)}>
                                    {String(val)}
                                  </td>
                                )
                              })}
                              <td className="px-4 py-3 text-center whitespace-nowrap">
                                <div className="flex items-center justify-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditRegistro(row)}
                                    className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-700 transition hover:bg-blue-100"
                                    title="Editar registro"
                                  >
                                    <Edit3 size={14} />
                                    <span>Editar</span>
                                  </button>
                                  <button
                                    type="button"
                                    disabled={deletingRegistroId === row.id}
                                    onClick={() => handleDeleteRegistro(row.id)}
                                    className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-50"
                                    title="Eliminar registro"
                                  >
                                    <Trash2 size={14} />
                                    <span>{deletingRegistroId === row.id ? '...' : 'Eliminar'}</span>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Paginación de registros */}
                <Pagination
                  page={registrosPage}
                  totalPages={Math.max(1, Math.ceil(registrosTotal / registrosPageSize))}
                  onChange={setRegistrosPage}
                  pageSize={registrosPageSize}
                  onPageSizeChange={setRegistrosPageSize}
                  totalItems={registrosTotal}
                  pageSizeOptions={[5, 10, 20, 50]}
                />
              </div>
            )}

            {/* CONTENIDO PESTAÑA 2: CAMPOS DE LA TABLA (DISEÑO EXACTO AL SOLICITADO) */}
            {modalTab === 'campos' && (
              <div className="px-6 pb-6 pt-4">
                <div className="mb-3 flex items-center justify-between">
                  <h5 className="text-lg font-bold text-slate-900">Campos de la tabla</h5>
                  <span className="text-sm text-slate-500">{selectedTabla.totalCampos} campos</span>
                </div>

                <div className="overflow-hidden rounded-2xl border border-slate-200">
                  <div className="overflow-x-auto touch-scroll">
                    <table className="min-w-full divide-y divide-slate-200">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Nombre del campo</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Tipo de dato</th>
                          <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-600">Obligatorio</th>
                          <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-600">Único</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Descripción</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 bg-white">
                        {selectedTabla.campos.map((campo) => (
                          <tr key={`${campo.nombre}-${campo.orden}`} className="hover:bg-slate-50 transition-colors">
                            <td className="px-4 py-3 text-sm font-medium text-slate-900 font-mono">{campo.nombre}</td>
                            <td className="px-4 py-3 text-sm text-slate-600">{campo.tipoDato}</td>
                            <td className="px-4 py-3 text-center text-sm text-slate-700">{campo.requerido ? 'Sí' : 'No'}</td>
                            <td className="px-4 py-3 text-center text-sm text-slate-700">{campo.unico ? 'Sí' : 'No'}</td>
                            <td className="px-4 py-3 text-sm text-slate-600">{campo.descripcion || 'Sin descripción'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-2 sm:p-4">
          <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-2xl sm:rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 sm:px-6 py-4">
              <div>
                <h4 className="text-xl sm:text-2xl font-bold text-slate-900">Nueva Tabla</h4>
                <p className="text-xs sm:text-sm text-slate-500">Define la estructura lógica y sus campos.</p>
              </div>
              <button type="button" onClick={handleCloseModals} className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 shrink-0">
                <X size={20} />
              </button>
            </div>

            <form className="space-y-6 px-4 sm:px-6 py-4 sm:py-6" onSubmit={handleSubmit}>
              {formError && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {formError}
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Nombre visible</label>
                  <input
                    type="text"
                    value={form.nombreVisible}
                    onChange={(event) => updateForm('nombreVisible', event.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                    placeholder="Clientes"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Nombre interno</label>
                  <input
                    type="text"
                    value={form.nombreInterno}
                    onChange={(event) => updateForm('nombreInterno', event.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 font-mono outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                    placeholder="clientes"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Módulo</label>
                  <input
                    type="text"
                    value={form.modulo}
                    onChange={(event) => updateForm('modulo', event.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                    placeholder="Administración"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Descripción</label>
                  <input
                    type="text"
                    value={form.descripcion}
                    onChange={(event) => updateForm('descripcion', event.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                    placeholder="Tabla para almacenar clientes"
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-cyan-100 bg-cyan-50 px-4 py-3 text-sm text-cyan-800">
                El campo ID se agrega automáticamente como clave primaria.
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h5 className="text-lg font-bold text-slate-900">Campos</h5>
                    <p className="text-sm text-slate-500">Agrega todos los campos que requiera la nueva tabla.</p>
                  </div>
                  <button
                    type="button"
                    onClick={addCampo}
                    className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                  >
                    <Plus size={16} />
                    Agregar campo
                  </button>
                </div>

                <div className="space-y-4">
                  {form.campos.map((campo, index) => (
                    <div key={index} className="rounded-2xl border border-slate-200 p-4 shadow-sm">
                      <div className="mb-4 flex items-center justify-between">
                        <p className="text-sm font-semibold text-slate-700">Campo {index + 1}</p>
                        {form.campos.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeCampo(index)}
                            className="text-sm font-medium text-red-600 hover:text-red-700"
                          >
                            Eliminar
                          </button>
                        )}
                      </div>

                      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                        <div className="xl:col-span-2">
                          <label className="mb-2 block text-sm font-semibold text-slate-700">Nombre</label>
                          <input
                            type="text"
                            value={campo.nombre}
                            onChange={(event) => updateCampo(index, 'nombre', event.target.value)}
                            className="w-full rounded-xl border border-slate-200 px-4 py-3 font-mono outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                            placeholder="codigo_cliente"
                          />
                        </div>

                        <div>
                          <label className="mb-2 block text-sm font-semibold text-slate-700">Tipo de dato</label>
                          <select
                            value={campo.tipoDato}
                            onChange={(event) => updateCampo(index, 'tipoDato', event.target.value)}
                            className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                          >
                            {FIELD_TYPE_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="mb-2 block text-sm font-semibold text-slate-700">Descripción</label>
                          <input
                            type="text"
                            value={campo.descripcion}
                            onChange={(event) => updateCampo(index, 'descripcion', event.target.value)}
                            className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                            placeholder="Opcional"
                          />
                        </div>

                        <div className="flex flex-wrap gap-4 xl:col-span-5">
                          <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                            <input
                              type="checkbox"
                              checked={campo.requerido}
                              onChange={(event) => updateCampo(index, 'requerido', event.target.checked)}
                              className="h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                            />
                            Requerido
                          </label>
                          <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                            <input
                              type="checkbox"
                              checked={campo.unico}
                              onChange={(event) => updateCampo(index, 'unico', event.target.checked)}
                              className="h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                            />
                            Único
                          </label>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={handleCloseModals}
                  className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:from-cyan-600 hover:to-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? 'Creando...' : 'Crear tabla'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showRegistroModal && selectedTabla && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 p-4">
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <h4 className="text-xl font-bold text-slate-900">
                  {editingRegistro ? `Editar Registro #${editingRegistro.id}` : 'Nuevo Registro'}
                </h4>
                <p className="text-xs text-slate-500">
                  Tabla: <span className="font-mono font-semibold text-cyan-700">{selectedTabla.nombreInterno}</span> ({selectedTabla.nombreVisible})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowRegistroModal(false)}
                className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveRegistro} className="space-y-4 p-6">
              {registroFormError && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                  {registroFormError}
                </div>
              )}

              <div className="space-y-3">
                {selectedTabla.campos
                  .filter((c) => c.nombre !== 'id' && c.nombre !== 'created_at' && c.nombre !== 'updated_at')
                  .map((campo) => {
                    const tipo = campo.tipoDato.toLowerCase()
                    const val = registroFormData[campo.nombre] ?? ''

                    return (
                      <div key={campo.nombre} className="rounded-xl border border-slate-200 bg-slate-50/50 p-3">
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                            <span>{campo.nombre}</span>
                            {campo.requerido && <span className="text-rose-500">*</span>}
                          </label>
                          <span className="text-[10px] font-mono text-slate-400 bg-white border border-slate-200 rounded px-1.5 py-0.5">
                            {campo.tipoDato}
                          </span>
                        </div>

                        {tipo === 'boolean' ? (
                          <div className="flex items-center gap-4 mt-2">
                            <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                              <input
                                type="radio"
                                name={campo.nombre}
                                checked={registroFormData[campo.nombre] === true}
                                onChange={() => setRegistroFormData((prev) => ({ ...prev, [campo.nombre]: true }))}
                                className="h-4 w-4 text-cyan-600 focus:ring-cyan-500"
                              />
                              <span>Sí / Activo</span>
                            </label>
                            <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                              <input
                                type="radio"
                                name={campo.nombre}
                                checked={registroFormData[campo.nombre] === false}
                                onChange={() => setRegistroFormData((prev) => ({ ...prev, [campo.nombre]: false }))}
                                className="h-4 w-4 text-cyan-600 focus:ring-cyan-500"
                              />
                              <span>No / Inactivo</span>
                            </label>
                          </div>
                        ) : tipo === 'integer' || tipo === 'bigint' ? (
                          <input
                            type="number"
                            step="1"
                            value={val}
                            onChange={(e) => setRegistroFormData((prev) => ({ ...prev, [campo.nombre]: e.target.value }))}
                            placeholder={campo.descripcion || `Ingresa ${campo.nombre}...`}
                            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
                          />
                        ) : tipo === 'numeric' ? (
                          <input
                            type="number"
                            step="any"
                            value={val}
                            onChange={(e) => setRegistroFormData((prev) => ({ ...prev, [campo.nombre]: e.target.value }))}
                            placeholder={campo.descripcion || `Ingresa ${campo.nombre}...`}
                            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
                          />
                        ) : tipo === 'date' ? (
                          <input
                            type="date"
                            value={val}
                            onChange={(e) => setRegistroFormData((prev) => ({ ...prev, [campo.nombre]: e.target.value }))}
                            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
                          />
                        ) : campo.nombre === 'descripcion' ? (
                          <textarea
                            rows={2}
                            value={val}
                            onChange={(e) => setRegistroFormData((prev) => ({ ...prev, [campo.nombre]: e.target.value }))}
                            placeholder={campo.descripcion || `Descripción...`}
                            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
                          />
                        ) : (
                          <input
                            type="text"
                            value={val}
                            onChange={(e) => setRegistroFormData((prev) => ({ ...prev, [campo.nombre]: e.target.value }))}
                            placeholder={campo.descripcion || `Ingresa ${campo.nombre}...`}
                            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
                          />
                        )}

                        {campo.descripcion && (
                          <p className="mt-1 text-[11px] text-slate-400">{campo.descripcion}</p>
                        )}
                      </div>
                    )
                  })}
              </div>

              <div className="flex flex-col-reverse gap-2.5 pt-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setShowRegistroModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={registroFormSaving}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:from-cyan-600 hover:to-blue-700 disabled:opacity-60"
                >
                  {registroFormSaving ? 'Guardando...' : 'Guardar Registro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ReporteModal
        open={reporteOpen}
        title="Reporte del diccionario de tablas"
        filterLabel="Módulo"
        filterOptions={modulosReporte}
        generating={generandoReporte}
        onGenerate={handleGenerarReporteTablas}
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

function StatCard({
  title,
  value,
  icon,
  tone = 'blue',
  detail,
}: {
  title: string
  value: number | string
  icon: ReactNode
  tone?: 'blue' | 'green' | 'purple' | 'orange' | 'cyan' | 'red'
  detail?: string
}) {
  return (
    <div className={`dashboard-kpi dashboard-tone-${tone}`}>
      <div className="dashboard-kpi-icon">{icon}</div>
      <div className="min-w-0">
        <p className="dashboard-kpi-label">{title}</p>
        <p className="dashboard-kpi-value">{value}</p>
        {detail && (
          <div className="flex items-center gap-2 mt-2">
            <span className="dashboard-kpi-change">{detail}</span>
          </div>
        )}
      </div>
      <div className="dashboard-sparkline" aria-hidden="true" />
    </div>
  )
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  )
}