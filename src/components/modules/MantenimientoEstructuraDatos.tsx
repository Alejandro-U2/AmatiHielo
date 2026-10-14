import type { ReactNode } from 'react'
import { FormEvent, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import {
  Boxes,
  Database,
  Eye,
  FileDown,
  Layers3,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react'
import {
  createEstructura,
  deleteEstructura,
  listEstructuras,
  type EstructuraCampo,
  type EstructuraMeta,
  type EstructuraTabla,
} from '../../services/estructuraDatosService'
import ReporteModal from '../../components/ReporteModal'
import { generarReporteModulo } from '../../utils/moduloExport'
import Pagination from '../../components/Pagination'
import SortableHeader from '../../components/SortableHeader'
import { useTableSort, sortRows } from '../../hooks/useTableSort'

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
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [formError, setFormError] = useState('')
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [deleteError, setDeleteError] = useState('')
  const [form, setForm] = useState<FormState>(emptyForm())

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

  const handleOpenDetail = (tabla: EstructuraTabla) => {
    setSelectedTabla(tabla)
    setShowDetailModal(true)
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
    setSelectedTabla(null)
    setFormError('')
    setDeleteError('')
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
      toast.success('Tabla eliminada correctamente.')
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
      toast.success('Tabla creada correctamente.')
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
              <Database size={14} />
              ERP / Administración de estructura
            </div>
            <h3 className="text-2xl md:text-3xl font-bold">Mantenimiento de datos</h3>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Administra la estructura lógica de tablas, campos y definiciones del sistema desde una sola pantalla.
            </p>
          </div>
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
        </div>
      </div>

      {deleteError && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {deleteError}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Total de tablas registradas" value={totalTablas} icon={<Database size={24} />} iconClassName="bg-cyan-50 text-cyan-700" />
        <StatCard title="Total de módulos existentes" value={totalModulos} icon={<Layers3 size={24} />} iconClassName="bg-indigo-50 text-indigo-700" />
        <StatCard title="Total de registros" value={totalRegistros} icon={<Boxes size={24} />} iconClassName="bg-emerald-50 text-emerald-700" />
        <StatCard title="Estado del sistema" value={estadoSistema} icon={<ShieldCheck size={24} />} iconClassName="bg-amber-50 text-amber-700" />
      </div>

      <div className="rounded-2xl bg-white p-5 shadow-md ring-1 ring-slate-100">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h4 className="text-xl font-bold text-slate-900">Explorador de tablas</h4>
            <p className="text-sm text-slate-500">Busca por nombre o módulo y revisa la estructura de cada tabla.</p>
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
          <div className="overflow-x-auto">
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
                            onClick={() => handleOpenDetail(tabla)}
                            className="inline-flex items-center gap-2 rounded-lg bg-cyan-50 px-3 py-2 text-sm font-medium text-cyan-700 transition hover:bg-cyan-100"
                          >
                            <Eye size={16} />
                            Ver estructura
                          </button>
                          <button
                            type="button"
                            disabled={tabla.esSistema || deleteId === tabla.id}
                            onClick={() => handleDelete(tabla)}
                            className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
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

      {showDetailModal && selectedTabla && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <h4 className="text-2xl font-bold text-slate-900">{selectedTabla.nombreVisible}</h4>
                <p className="text-sm text-slate-500">{selectedTabla.nombreInterno}</p>
              </div>
              <button type="button" onClick={handleCloseModals} className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800">
                <X size={20} />
              </button>
            </div>

            <div className="grid gap-4 px-6 py-6 md:grid-cols-2 xl:grid-cols-5">
              <InfoCard label="Descripción" value={selectedTabla.descripcion || 'Sin descripción'} />
              <InfoCard label="Fecha de creación" value={formatDate(selectedTabla.createdAt)} />
              <InfoCard label="Módulo" value={selectedTabla.modulo} />
              <InfoCard label="Total de registros" value={String(selectedTabla.totalRegistros)} />
              <InfoCard label="Sistema" value={selectedTabla.esSistema ? 'Sí' : 'No'} />
            </div>

            <div className="px-6 pb-6">
              <div className="mb-3 flex items-center justify-between">
                <h5 className="text-lg font-bold text-slate-900">Campos de la tabla</h5>
                <span className="text-sm text-slate-500">{selectedTabla.totalCampos} campos</span>
              </div>

              <div className="overflow-hidden rounded-2xl border border-slate-200">
                <div className="overflow-x-auto">
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
                        <tr key={`${campo.nombre}-${campo.orden}`} className="hover:bg-slate-50">
                          <td className="px-4 py-3 text-sm font-medium text-slate-900">{campo.nombre}</td>
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
          </div>
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <h4 className="text-2xl font-bold text-slate-900">Nueva Tabla</h4>
                <p className="text-sm text-slate-500">Define la estructura lógica y sus campos.</p>
              </div>
              <button type="button" onClick={handleCloseModals} className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800">
                <X size={20} />
              </button>
            </div>

            <form className="space-y-6 px-6 py-6" onSubmit={handleSubmit}>
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

      <ReporteModal
        open={reporteOpen}
        title="Reporte del diccionario de tablas"
        filterLabel="Módulo"
        filterOptions={modulosReporte}
        generating={generandoReporte}
        onGenerate={handleGenerarReporteTablas}
        onClose={() => setReporteOpen(false)}
      />
    </div>
  )
}

function StatCard({
  title,
  value,
  icon,
  iconClassName,
}: {
  title: string
  value: number | string
  icon: ReactNode
  iconClassName: string
}) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-md ring-1 ring-slate-100">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">{title}</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
        </div>
        <div className={`rounded-2xl p-3 ${iconClassName}`}>
          {icon}
        </div>
      </div>
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