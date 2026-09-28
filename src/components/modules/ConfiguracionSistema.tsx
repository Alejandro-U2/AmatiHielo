import type { ChangeEvent, ReactNode } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import {
  Building2,
  BellRing,
  CheckCircle2,
  Eye,
  FileDown,
  FileText,
  Plus,
  Power,
  PowerOff,
  Save,
  Search,
  Settings2,
  Shield,
  SlidersHorizontal,
  Trash2,
  Upload,
  X,
} from 'lucide-react'
import { getCurrentUser } from '../../services/authService'
import { sanitizeSoloLetras, sanitizeSoloNumeros, sanitizeNIT, isValidEmail, isValidNIT, capitalizeWords } from '../../utils/validation'
import {
  createSucursal,
  deleteSucursal,
  getConfiguracionSistema,
  updateEmpresaConfig,
  updateImpuestosConfig,
  updateNotificacionesConfig,
  updateSucursal,
  updateUmbralesConfig,
  type Branch,
  type CompanyConfig,
  type NotificationConfig,
  type SystemConfig,
  type TaxConfig,
  type TaxItem,
  type ThresholdConfig,
} from '../../services/configuracionSistemaService'
import ReporteModal from '../../components/ReporteModal'
import { generarReporteModulo } from '../../utils/moduloExport'
import Pagination from '../../components/Pagination'
import SortableHeader from '../../components/SortableHeader'
import { useTableSort, sortRows } from '../../hooks/useTableSort'

type TabId = 'empresa' | 'sucursales' | 'impuestos' | 'notificaciones' | 'umbrales'

type BranchForm = Omit<Branch, 'id'>

const TAB_ORDER: Array<{ id: TabId; label: string; icon: ReactNode }> = [
  { id: 'empresa', label: 'Datos de la Empresa', icon: <Building2 size={18} /> },
  { id: 'sucursales', label: 'Gestión de Sucursales', icon: <Settings2 size={18} /> },
  { id: 'impuestos', label: 'Impuestos', icon: <SlidersHorizontal size={18} /> },
  { id: 'notificaciones', label: 'Notificaciones', icon: <BellRing size={18} /> },
  { id: 'umbrales', label: 'Umbrales', icon: <Shield size={18} /> },
]

const defaultCompany = (): CompanyConfig => ({
  nombreEmpresa: '',
  nit: '',
  direccion: '',
  telefono: '',
  correo: '',
  logoUrl: '',
})

const defaultTaxes = (): TaxConfig => ({
  ivaActivo: true,
  ivaPorcentaje: 12,
  otrosImpuestos: [],
})

const defaultNotifications = (): NotificationConfig => ({
  alertaStockBajo: true,
  alertaStockCritico: true,
  confirmacionVentas: true,
  alertasMantenimiento: true,
  alertasVencimiento: true,
  alertasComprasPendientes: true,
  notificacionesCorreo: true,
})

const defaultThresholds = (): ThresholdConfig => ({
  stockBajoPorcentaje: 20,
  stockCriticoPorcentaje: 10,
  diasMantenimiento: 30,
  diasVencimiento: 7,
  parametrosExtra: {},
})

const defaultBranch = (): BranchForm => ({
  nombre: '',
  direccion: '',
  telefono: '',
  encargado: '',
  activa: true,
})

function isAdminUser() {
  const currentUser = getCurrentUser() || {}
  const role = String(currentUser?.rol || currentUser?.role || '').toLowerCase()
  return role === 'administrador' || role === 'superusuario' || role === 'admin'
}

function formatDate(value?: string) {
  if (!value) return 'Sin registro'

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return 'Sin registro'

  return parsed.toLocaleString('es-GT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

function pairObjectToArray(value: Record<string, string>) {
  return Object.entries(value).map(([key, pairValue]) => ({ key, value: pairValue }))
}

function arrayToPairObject(value: Array<{ key: string; value: string }>) {
  return value.reduce<Record<string, string>>((accumulator, item) => {
    const key = item.key.trim()
    if (!key) return accumulator
    accumulator[key] = item.value.trim()
    return accumulator
  }, {})
}

function readLogoFile(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('No fue posible leer el logotipo.'))
    reader.readAsDataURL(file)
  })
}

function StatCard({ title, value, icon, accentClassName }: { title: string; value: ReactNode; icon: ReactNode; accentClassName: string }) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-md ring-1 ring-slate-100">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">{title}</p>
          <div className="mt-2 text-3xl font-bold text-slate-900">{value}</div>
        </div>
        <div className={`rounded-2xl p-3 ${accentClassName}`}>{icon}</div>
      </div>
    </div>
  )
}

export default function ConfiguracionSistema() {
  const [activeTab, setActiveTab] = useState<TabId>('empresa')
  const [loading, setLoading] = useState(true)
  const [savingSection, setSavingSection] = useState<string | null>(null)
  const [config, setConfig] = useState<SystemConfig | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(5)
  const [filterBranchEstado, setFilterBranchEstado] = useState<'todas' | 'activas' | 'inactivas'>('todas')
  const branchSort = useTableSort(null) as {
    sortBy: string | null
    sortDir: 'asc' | 'desc'
    toggle: (key: string) => void
    setSortBy: (key: string | null) => void
    setSortDir: (dir: 'asc' | 'desc') => void
  }
  const [reporteOpen, setReporteOpen] = useState(false)
  const [generandoReporte, setGenerandoReporte] = useState(false)
  const [showBranchModal, setShowBranchModal] = useState(false)
  const [editingBranchId, setEditingBranchId] = useState<number | null>(null)
  const [branchForm, setBranchForm] = useState<BranchForm>(defaultBranch())
  const [companyForm, setCompanyForm] = useState<CompanyConfig>(defaultCompany())
  const [taxForm, setTaxForm] = useState<TaxConfig>(defaultTaxes())
  const [notificationForm, setNotificationForm] = useState<NotificationConfig>(defaultNotifications())
  const [thresholdForm, setThresholdForm] = useState<ThresholdConfig>(defaultThresholds())
  const [companyLogoPreview, setCompanyLogoPreview] = useState('')
  const [branchError, setBranchError] = useState('')
  const [companyError, setCompanyError] = useState('')
  const [taxError, setTaxError] = useState('')
  const [thresholdError, setThresholdError] = useState('')

  const loadConfig = async () => {
    try {
      setLoading(true)
      setErrorMsg('')
      setCompanyError('')
      setTaxError('')
      setThresholdError('')
      const data = await getConfiguracionSistema()
      setConfig(data)
      setCompanyForm(data.empresa)
      setTaxForm(data.impuestos)
      setNotificationForm(data.notificaciones)
      setThresholdForm(data.umbrales)
      setCompanyLogoPreview(data.empresa.logoUrl || '')
    } catch (error: any) {
      setErrorMsg(error.message || 'No fue posible cargar la configuración.')
      toast.error(error.message || 'No fue posible cargar la configuración.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadConfig()
  }, [])

  const sucursales = config?.sucursales || []

  const filteredBranches = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase()

    const base = sucursales.filter((branch) => {
      if (filterBranchEstado === 'activas' && !branch.activa) return false
      if (filterBranchEstado === 'inactivas' && branch.activa) return false
      if (!normalized) return true
      return (
        branch.nombre.toLowerCase().includes(normalized)
        || branch.direccion.toLowerCase().includes(normalized)
        || branch.telefono.toLowerCase().includes(normalized)
        || branch.encargado.toLowerCase().includes(normalized)
      )
    })

    return sortRows(base, branchSort.sortBy, branchSort.sortDir, (branch: Branch) => {
      switch (branchSort.sortBy) {
        case 'nombre': return branch.nombre.toLowerCase()
        case 'direccion': return branch.direccion.toLowerCase()
        case 'telefono': return branch.telefono.toLowerCase()
        case 'encargado': return (branch.encargado || '').toLowerCase()
        case 'activa': return Number(Boolean(branch.activa))
        default: return null
      }
    }) as Branch[]
  }, [searchTerm, sucursales, filterBranchEstado, branchSort.sortBy, branchSort.sortDir])

  const totalPages = Math.max(1, Math.ceil(filteredBranches.length / pageSize))
  const paginatedBranches = filteredBranches.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, filterBranchEstado, branchSort.sortBy, branchSort.sortDir, pageSize])

  const estadosReporte = useMemo(() => [
    { value: '', label: 'Todas', count: sucursales.length },
    { value: 'activas', label: 'Activas', count: sucursales.filter((branch) => branch.activa).length },
    { value: 'inactivas', label: 'Inactivas', count: sucursales.filter((branch) => !branch.activa).length },
  ], [sucursales])

  const handleGenerarReporteSucursales = async (estado: string = '') => {
    try {
      setGenerandoReporte(true)
      const rows = estado === 'activas'
        ? sucursales.filter((branch) => branch.activa)
        : estado === 'inactivas'
          ? sucursales.filter((branch) => !branch.activa)
          : sucursales

      const columns = [
        { key: 'nombre', label: 'NOMBRE', width: 44, align: 'left' },
        { key: 'direccion', label: 'DIRECCIÓN', width: 52, align: 'left' },
        { key: 'telefono', label: 'TELÉFONO', width: 34, align: 'left' },
        { key: 'encargado', label: 'ENCARGADO', width: 30, align: 'left' },
        { key: 'estado', label: 'ESTADO', width: 26, align: 'center' },
      ]

      await generarReporteModulo({
        fileName: 'reporte_sucursales.pdf',
        title: 'REPORTE DE SUCURSALES DEL SISTEMA',
        columns,
        rows: rows.map((branch) => ({
          nombre: branch.nombre,
          direccion: branch.direccion || '-',
          telefono: branch.telefono || '-',
          encargado: branch.encargado || 'Sin encargado',
          estado: branch.activa ? 'Activa' : 'Inactiva',
        })),
        totalLabel: 'TOTAL DE SUCURSALES',
        totalValue: rows.length,
        filterLabel: estado === 'activas' ? 'Activas' : estado === 'inactivas' ? 'Inactivas' : 'Todas',
        note: 'Relación de sucursales registradas en la configuración del sistema con su estado operativo.',
      })
      toast.success('Reporte de sucursales generado correctamente.')
      setReporteOpen(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No fue posible generar el reporte.')
    } finally {
      setGenerandoReporte(false)
    }
  }

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm])

  useEffect(() => {
    setCompanyError('')
    setTaxError('')
    setThresholdError('')
  }, [activeTab])

  const openBranchModal = (branch: Branch | null = null) => {
    if (branch) {
      setEditingBranchId(branch.id)
      setBranchForm({
        nombre: branch.nombre,
        direccion: branch.direccion,
        telefono: branch.telefono,
        encargado: branch.encargado,
        activa: branch.activa,
      })
    } else {
      setEditingBranchId(null)
      setBranchForm(defaultBranch())
    }

    setBranchError('')
    setShowBranchModal(true)
  }

  const closeBranchModal = () => {
    setShowBranchModal(false)
    setEditingBranchId(null)
    setBranchForm(defaultBranch())
    setBranchError('')
  }

  const updateBranchField = (field: keyof BranchForm, value: string | boolean) => {
    setBranchForm((previous) => ({
      ...previous,
      [field]: value,
    }))
  }

  const handleCompanyChange = (field: keyof CompanyConfig, value: string) => {
    setCompanyForm((previous) => ({ ...previous, [field]: value }))
  }

  const handleLogoChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const logoUrl = await readLogoFile(file)
    setCompanyForm((previous) => ({ ...previous, logoUrl }))
    setCompanyLogoPreview(logoUrl)
  }

  const saveCompany = async () => {
    if (!companyForm.nombreEmpresa.trim() || !companyForm.nit.trim() || !companyForm.direccion.trim() || !companyForm.telefono.trim() || !companyForm.correo.trim()) {
      setCompanyError('Todos los campos obligatorios de empresa deben completarse.')
      return
    }

    if (!isValidNIT(companyForm.nit)) {
      setCompanyError('El NIT solo debe contener números y guiones.')
      return
    }

    if (!isValidEmail(companyForm.correo)) {
      setCompanyError('El correo electrónico no tiene un formato válido.')
      return
    }

    try {
      setCompanyError('')
      setSavingSection('empresa')
      const updated = await updateEmpresaConfig(companyForm)
      setCompanyForm(updated)
      toast.success('Datos de la empresa actualizados.')
      await loadConfig()
    } catch (error: any) {
      setCompanyError(error.message || 'No fue posible guardar la empresa.')
    } finally {
      setSavingSection(null)
    }
  }

  const updateTaxItem = (index: number, field: keyof TaxItem, value: string | boolean) => {
    setTaxForm((previous) => ({
      ...previous,
      otrosImpuestos: previous.otrosImpuestos.map((item, taxIndex) => (
        taxIndex === index ? { ...item, [field]: field === 'porcentaje' ? Number(value) : value } : item
      )),
    }))
  }

  const addTaxItem = () => {
    setTaxForm((previous) => ({
      ...previous,
      otrosImpuestos: [...previous.otrosImpuestos, { nombre: '', porcentaje: 0, activo: true }],
    }))
  }

  const removeTaxItem = (index: number) => {
    setTaxForm((previous) => ({
      ...previous,
      otrosImpuestos: previous.otrosImpuestos.filter((_, taxIndex) => taxIndex !== index),
    }))
  }

  const saveTaxes = async () => {
    if (taxForm.ivaPorcentaje < 0 || taxForm.ivaPorcentaje > 100) {
      setTaxError('El porcentaje de IVA debe estar entre 0 y 100.')
      return
    }

    try {
      setTaxError('')
      setSavingSection('impuestos')
      const updated = await updateImpuestosConfig(taxForm)
      setTaxForm(updated)
      toast.success('Configuración de impuestos guardada.')
      await loadConfig()
    } catch (error: any) {
      setTaxError(error.message || 'No fue posible guardar los impuestos.')
    } finally {
      setSavingSection(null)
    }
  }

  const saveNotifications = async () => {
    try {
      setSavingSection('notificaciones')
      const updated = await updateNotificacionesConfig(notificationForm)
      setNotificationForm(updated)
      toast.success('Configuración de notificaciones guardada.')
      await loadConfig()
    } catch (error: any) {
      toast.error(error.message || 'No fue posible guardar las notificaciones.')
    } finally {
      setSavingSection(null)
    }
  }

  const updateThresholdExtra = (index: number, field: 'key' | 'value', value: string) => {
    const currentPairs = pairObjectToArray(thresholdForm.parametrosExtra)
    const updatedPairs = currentPairs.map((item, pairIndex) => (
      pairIndex === index ? { ...item, [field]: value } : item
    ))
    setThresholdForm((previous) => ({
      ...previous,
      parametrosExtra: arrayToPairObject(updatedPairs),
    }))
  }

  const addThresholdExtra = () => {
    const currentPairs = pairObjectToArray(thresholdForm.parametrosExtra)
    currentPairs.push({ key: '', value: '' })
    setThresholdForm((previous) => ({
      ...previous,
      parametrosExtra: arrayToPairObject(currentPairs),
    }))
  }

  const removeThresholdExtra = (index: number) => {
    const currentPairs = pairObjectToArray(thresholdForm.parametrosExtra)
    const updatedPairs = currentPairs.filter((_, pairIndex) => pairIndex !== index)
    setThresholdForm((previous) => ({
      ...previous,
      parametrosExtra: arrayToPairObject(updatedPairs),
    }))
  }

  const saveThresholds = async () => {
    if (thresholdForm.stockCriticoPorcentaje >= thresholdForm.stockBajoPorcentaje) {
      setThresholdError('El stock crítico debe ser menor al stock bajo.')
      return
    }

    try {
      setThresholdError('')
      setSavingSection('umbrales')
      const updated = await updateUmbralesConfig(thresholdForm)
      setThresholdForm(updated)
      toast.success('Umbrales guardados correctamente.')
      await loadConfig()
    } catch (error: any) {
      setThresholdError(error.message || 'No fue posible guardar los umbrales.')
    } finally {
      setSavingSection(null)
    }
  }

  const saveBranch = async () => {
    if (!branchForm.nombre.trim() || !branchForm.direccion.trim() || !branchForm.telefono.trim()) {
      setBranchError('Nombre, dirección y teléfono son obligatorios.')
      return
    }

    try {
      setSavingSection('sucursales')
      setBranchError('')

      if (editingBranchId) {
        await updateSucursal(editingBranchId, branchForm)
        toast.success('Sucursal actualizada correctamente.')
      } else {
        await createSucursal(branchForm)
        toast.success('Sucursal creada correctamente.')
      }

      closeBranchModal()
      await loadConfig()
    } catch (error: any) {
      setBranchError(error.message || 'No fue posible guardar la sucursal.')
      toast.error(error.message || 'No fue posible guardar la sucursal.')
    } finally {
      setSavingSection(null)
    }
  }

  const toggleBranchStatus = async (branch: Branch) => {
    try {
      setSavingSection(`branch-${branch.id}`)
      await updateSucursal(branch.id, { activa: !branch.activa })
      toast.success(branch.activa ? 'Sucursal desactivada.' : 'Sucursal activada.')
      await loadConfig()
    } catch (error: any) {
      toast.error(error.message || 'No fue posible actualizar el estado de la sucursal.')
    } finally {
      setSavingSection(null)
    }
  }

  const removeBranch = async (branch: Branch) => {
    const confirmed = window.confirm(`¿Deseas eliminar la sucursal ${branch.nombre}?`)
    if (!confirmed) return

    try {
      setSavingSection(`branch-${branch.id}`)
      await deleteSucursal(branch.id)
      toast.success('Sucursal eliminada correctamente.')
      await loadConfig()
    } catch (error: any) {
      toast.error(error.message || 'No fue posible eliminar la sucursal.')
    } finally {
      setSavingSection(null)
    }
  }

  const adminAccess = isAdminUser()

  if (!adminAccess) {
    return (
      <div className="rounded-2xl bg-white p-8 shadow-md">
        <div className="text-center py-16">
          <Shield size={64} className="mx-auto mb-4 text-gray-400" />
          <h3 className="text-2xl font-bold text-gray-800 mb-2">Acceso restringido</h3>
          <p className="text-gray-600 max-w-lg mx-auto">
            Solo los usuarios con permisos de Administrador pueden acceder a esta sección.
          </p>
        </div>
      </div>
    )
  }

  const branchCount = sucursales.length
  const activeBranchCount = sucursales.filter((branch) => branch.activa).length
  const ivaValue = taxForm.ivaActivo ? `${taxForm.ivaPorcentaje.toFixed(2)}%` : 'Desactivado'
  const totalNotificationFlags = [
    notificationForm.alertaStockBajo,
    notificationForm.alertaStockCritico,
    notificationForm.confirmacionVentas,
    notificationForm.alertasMantenimiento,
    notificationForm.alertasVencimiento,
    notificationForm.alertasComprasPendientes,
    notificationForm.notificacionesCorreo,
  ].filter(Boolean).length

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-cyan-900 to-blue-900 p-6 md:p-8 text-white shadow-xl">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-100">
              <Settings2 size={14} />
              ERP / Administración global
            </div>
            <h3 className="text-2xl md:text-3xl font-bold">Configuración del Sistema</h3>
            <p className="mt-2 max-w-2xl text-sm text-cyan-100">
              Administra parámetros generales, sucursales, impuestos, notificaciones y umbrales desde una sola pantalla.
            </p>
          </div>
          <button
            type="button"
            onClick={loadConfig}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-slate-900 shadow-lg transition-transform hover:-translate-y-0.5"
          >
            <Eye size={18} />
            Actualizar datos
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMsg}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Total de sucursales" value={loading ? '...' : branchCount} icon={<Building2 size={24} />} accentClassName="bg-cyan-50 text-cyan-700" />
        <StatCard title="Sucursales activas" value={loading ? '...' : activeBranchCount} icon={<Power size={24} />} accentClassName="bg-emerald-50 text-emerald-700" />
        <StatCard title="IVA actual" value={loading ? '...' : ivaValue} icon={<FileText size={24} />} accentClassName="bg-indigo-50 text-indigo-700" />
        <StatCard title="Alertas habilitadas" value={loading ? '...' : totalNotificationFlags} icon={<BellRing size={24} />} accentClassName="bg-amber-50 text-amber-700" />
      </div>

      <div className="rounded-2xl bg-white p-4 shadow-md ring-1 ring-slate-100">
        <div className="flex flex-wrap gap-2">
          {TAB_ORDER.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-md ring-1 ring-slate-100">
        {loading ? (
          <div className="py-16 text-center text-sm text-slate-500">Cargando configuración...</div>
        ) : null}

        {activeTab === 'empresa' && !loading && (
          <div className="space-y-6">
            {companyError && <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{companyError}</div>}
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Nombre de la empresa" required>
                <input value={companyForm.nombreEmpresa} onChange={(event) => handleCompanyChange('nombreEmpresa', sanitizeSoloLetras(event.target.value))} onBlur={(event) => handleCompanyChange('nombreEmpresa', capitalizeWords(event.target.value))} className={inputClass} />
              </Field>
              <Field label="NIT" required>
                <input value={companyForm.nit} onChange={(event) => handleCompanyChange('nit', sanitizeNIT(event.target.value))} className={inputClass} />
              </Field>
              <Field label="Dirección" required className="md:col-span-2">
                <textarea value={companyForm.direccion} onChange={(event) => handleCompanyChange('direccion', event.target.value)} rows={3} className={inputClass} />
              </Field>
              <Field label="Teléfono" required>
                <input value={companyForm.telefono} onChange={(event) => handleCompanyChange('telefono', sanitizeSoloNumeros(event.target.value))} className={inputClass} />
              </Field>
              <Field label="Correo electrónico" required>
                <input value={companyForm.correo} onChange={(event) => handleCompanyChange('correo', event.target.value)} type="email" className={inputClass} />
              </Field>
              <Field label="Logotipo (opcional)" className="md:col-span-2">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                    <Upload size={16} />
                    Seleccionar archivo
                    <input type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
                  </label>
                  {companyLogoPreview && <img src={companyLogoPreview} alt="Logotipo" className="h-20 w-20 rounded-2xl border border-slate-200 object-cover" />}
                </div>
              </Field>
            </div>

            <div className="flex justify-end">
              <button type="button" onClick={saveCompany} disabled={savingSection === 'empresa'} className={primaryButtonClass}>
                <Save size={16} />
                {savingSection === 'empresa' ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          </div>
        )}

        {activeTab === 'sucursales' && !loading && (
          <div className="space-y-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h4 className="text-xl font-bold text-slate-900">Gestión de Sucursales</h4>
                <p className="text-sm text-slate-500">Crea, edita, activa o elimina sucursales desde aquí.</p>
              </div>
<div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => setReporteOpen(true)}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-lg transition-transform hover:-translate-y-0.5"
                >
                  <FileDown size={16} />
                  Reporte
                </button>
                <button type="button" onClick={() => openBranchModal()} className={primaryButtonClass}>
                  <Plus size={16} />
                  Nueva sucursal
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="relative max-w-md flex-1">
                <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Buscar por nombre, dirección, teléfono o encargado..."
                  className={`${inputClass} pl-11`}
                />
              </div>
              <select
                value={filterBranchEstado}
                onChange={(event) => setFilterBranchEstado(event.target.value as 'todas' | 'activas' | 'inactivas')}
                className={`${inputClass} max-w-xs`}
              >
                <option value="todas">Todos los estados</option>
                <option value="activas">Activas</option>
                <option value="inactivas">Inactivas</option>
              </select>
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('')
                  setFilterBranchEstado('todas')
                  branchSort.setSortBy(null)
                }}
                className="text-sm font-medium text-cyan-600 hover:text-cyan-800 inline-flex items-center gap-1 whitespace-nowrap"
              >
                <X size={14} />
                Limpiar filtros
              </button>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600"><SortableHeader label="Nombre" sortKey="nombre" sortBy={branchSort.sortBy} sortDir={branchSort.sortDir} onSort={branchSort.toggle} className="text-slate-600" /></th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600"><SortableHeader label="Dirección" sortKey="direccion" sortBy={branchSort.sortBy} sortDir={branchSort.sortDir} onSort={branchSort.toggle} className="text-slate-600" /></th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600"><SortableHeader label="Teléfono" sortKey="telefono" sortBy={branchSort.sortBy} sortDir={branchSort.sortDir} onSort={branchSort.toggle} className="text-slate-600" /></th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600"><SortableHeader label="Encargado" sortKey="encargado" sortBy={branchSort.sortBy} sortDir={branchSort.sortDir} onSort={branchSort.toggle} className="text-slate-600" /></th>
                      <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-600"><SortableHeader label="Estado" sortKey="activa" sortBy={branchSort.sortBy} sortDir={branchSort.sortDir} onSort={branchSort.toggle} align="center" className="text-slate-600" /></th>
                      <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-600">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {paginatedBranches.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-500">No hay sucursales para mostrar.</td>
                      </tr>
                    ) : paginatedBranches.map((branch) => (
                      <tr key={branch.id} className="hover:bg-slate-50">
                        <td className="px-4 py-4 text-sm font-semibold text-slate-900">{branch.nombre}</td>
                        <td className="px-4 py-4 text-sm text-slate-600">{branch.direccion}</td>
                        <td className="px-4 py-4 text-sm text-slate-600">{branch.telefono}</td>
                        <td className="px-4 py-4 text-sm text-slate-600">{branch.encargado || 'Sin encargado'}</td>
                        <td className="px-4 py-4 text-center">
                          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${branch.activa ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                            {branch.activa ? 'Activa' : 'Inactiva'}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center justify-center gap-2">
                            <button type="button" onClick={() => openBranchModal(branch)} className="rounded-lg bg-cyan-50 px-3 py-2 text-cyan-700 hover:bg-cyan-100">
                              <Eye size={16} />
                            </button>
                            <button type="button" onClick={() => toggleBranchStatus(branch)} className="rounded-lg bg-amber-50 px-3 py-2 text-amber-700 hover:bg-amber-100" title={branch.activa ? 'Desactivar' : 'Activar'}>
                              {branch.activa ? <PowerOff size={16} /> : <Power size={16} />}
                            </button>
                            <button type="button" onClick={() => removeBranch(branch)} className="rounded-lg bg-red-50 px-3 py-2 text-red-700 hover:bg-red-100" title="Eliminar">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <Pagination
              page={currentPage}
              totalPages={totalPages}
              onChange={setCurrentPage}
              pageSize={pageSize}
              onPageSizeChange={setPageSize}
              totalItems={filteredBranches.length}
            />
          </div>
        )}

        {activeTab === 'impuestos' && !loading && (
          <div className="space-y-6">
            {taxError && <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{taxError}</div>}
            <div className="grid gap-4 md:grid-cols-2">
              <ToggleCard
                title="Activar IVA"
                description="Este valor se reflejará automáticamente en ventas y facturación."
                checked={taxForm.ivaActivo}
                onChange={(checked) => setTaxForm((previous) => ({ ...previous, ivaActivo: checked }))}
              />
              <Field label="Porcentaje de IVA" required>
                <input type="number" step="0.01" min="0" max="100" value={taxForm.ivaPorcentaje} onChange={(event) => setTaxForm((previous) => ({ ...previous, ivaPorcentaje: Number(event.target.value) }))} className={inputClass} />
              </Field>
            </div>

            <div className="space-y-4 rounded-2xl border border-slate-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-lg font-bold text-slate-900">Otros impuestos</h4>
                  <p className="text-sm text-slate-500">Agrega impuestos adicionales para el futuro.</p>
                </div>
                <button type="button" onClick={addTaxItem} className={secondaryButtonClass}>
                  <Plus size={16} />
                  Agregar impuesto
                </button>
              </div>

              <div className="space-y-3">
                {taxForm.otrosImpuestos.length === 0 && <p className="text-sm text-slate-500">No hay impuestos adicionales configurados.</p>}
                {taxForm.otrosImpuestos.map((item, index) => (
                  <div key={`${index}-${item.nombre}`} className="grid gap-3 rounded-2xl border border-slate-200 p-4 md:grid-cols-12">
                    <div className="md:col-span-6">
                      <input value={item.nombre} onChange={(event) => updateTaxItem(index, 'nombre', event.target.value)} placeholder="Nombre del impuesto" className={inputClass} />
                    </div>
                    <div className="md:col-span-3">
                      <input type="number" step="0.01" min="0" max="100" value={item.porcentaje} onChange={(event) => updateTaxItem(index, 'porcentaje', event.target.value)} placeholder="0.00" className={inputClass} />
                    </div>
                    <div className="md:col-span-2">
                      <ToggleCard title="Activo" description="" checked={item.activo} onChange={(checked) => updateTaxItem(index, 'activo', checked)} compact />
                    </div>
                    <div className="md:col-span-1 flex items-center justify-end">
                      <button type="button" onClick={() => removeTaxItem(index)} className="rounded-lg bg-red-50 px-3 py-2 text-red-700 hover:bg-red-100">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end">
              <button type="button" onClick={saveTaxes} disabled={savingSection === 'impuestos'} className={primaryButtonClass}>
                <Save size={16} />
                {savingSection === 'impuestos' ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          </div>
        )}

        {activeTab === 'notificaciones' && !loading && (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              {[
                ['alertaStockBajo', 'Alertas de stock bajo'],
                ['alertaStockCritico', 'Alertas de stock crítico'],
                ['confirmacionVentas', 'Confirmación de ventas'],
                ['alertasMantenimiento', 'Alertas de mantenimiento'],
                ['alertasVencimiento', 'Alertas de vencimiento de productos'],
                ['alertasComprasPendientes', 'Alertas de compras pendientes'],
                ['notificacionesCorreo', 'Notificaciones por correo electrónico'],
              ].map(([field, label]) => (
                <ToggleCard
                  key={field}
                  title={label}
                  description=""
                  checked={notificationForm[field as keyof NotificationConfig] as boolean}
                  onChange={(checked) => setNotificationForm((previous) => ({ ...previous, [field]: checked }))}
                />
              ))}
            </div>

            <div className="flex justify-end">
              <button type="button" onClick={saveNotifications} disabled={savingSection === 'notificaciones'} className={primaryButtonClass}>
                <Save size={16} />
                {savingSection === 'notificaciones' ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          </div>
        )}

        {activeTab === 'umbrales' && !loading && (
          <div className="space-y-6">
            {thresholdError && <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{thresholdError}</div>}
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Porcentaje de stock bajo" required>
                <input type="number" step="0.01" min="0" max="100" value={thresholdForm.stockBajoPorcentaje} onChange={(event) => setThresholdForm((previous) => ({ ...previous, stockBajoPorcentaje: Number(event.target.value) }))} className={inputClass} />
              </Field>
              <Field label="Porcentaje de stock crítico" required>
                <input type="number" step="0.01" min="0" max="100" value={thresholdForm.stockCriticoPorcentaje} onChange={(event) => setThresholdForm((previous) => ({ ...previous, stockCriticoPorcentaje: Number(event.target.value) }))} className={inputClass} />
              </Field>
              <Field label="Días de anticipación para mantenimiento" required>
                <input type="number" min="0" value={thresholdForm.diasMantenimiento} onChange={(event) => setThresholdForm((previous) => ({ ...previous, diasMantenimiento: Number(event.target.value) }))} className={inputClass} />
              </Field>
              <Field label="Días de anticipación para vencimiento" required>
                <input type="number" min="0" value={thresholdForm.diasVencimiento} onChange={(event) => setThresholdForm((previous) => ({ ...previous, diasVencimiento: Number(event.target.value) }))} className={inputClass} />
              </Field>
            </div>

            <div className="space-y-4 rounded-2xl border border-slate-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-lg font-bold text-slate-900">Parámetros adicionales</h4>
                  <p className="text-sm text-slate-500">Otros valores consumidos por módulos del sistema.</p>
                </div>
                <button type="button" onClick={addThresholdExtra} className={secondaryButtonClass}>
                  <Plus size={16} />
                  Agregar parámetro
                </button>
              </div>

              {pairObjectToArray(thresholdForm.parametrosExtra).length === 0 && <p className="text-sm text-slate-500">No hay parámetros adicionales configurados.</p>}

              <div className="space-y-3">
                {pairObjectToArray(thresholdForm.parametrosExtra).map((item, index) => (
                  <div key={`${index}-${item.key}`} className="grid gap-3 md:grid-cols-12">
                    <div className="md:col-span-5">
                      <input value={item.key} onChange={(event) => updateThresholdExtra(index, 'key', event.target.value)} placeholder="Clave" className={inputClass} />
                    </div>
                    <div className="md:col-span-6">
                      <input value={item.value} onChange={(event) => updateThresholdExtra(index, 'value', event.target.value)} placeholder="Valor" className={inputClass} />
                    </div>
                    <div className="md:col-span-1 flex items-center justify-end">
                      <button type="button" onClick={() => removeThresholdExtra(index)} className="rounded-lg bg-red-50 px-3 py-2 text-red-700 hover:bg-red-100">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end">
              <button type="button" onClick={saveThresholds} disabled={savingSection === 'umbrales'} className={primaryButtonClass}>
                <Save size={16} />
                {savingSection === 'umbrales' ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          </div>
        )}
      </div>

      {showBranchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <h4 className="text-2xl font-bold text-slate-900">{editingBranchId ? 'Editar sucursal' : 'Nueva sucursal'}</h4>
                <p className="text-sm text-slate-500">Completa los datos de la sucursal.</p>
              </div>
              <button type="button" onClick={closeBranchModal} className="rounded-full p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4 px-6 py-6">
              {branchError && <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{branchError}</div>}
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Nombre" required>
                  <input value={branchForm.nombre} onChange={(event) => updateBranchField('nombre', sanitizeSoloLetras(event.target.value))} onBlur={(event) => updateBranchField('nombre', capitalizeWords(event.target.value))} className={inputClass} />
                </Field>
                <Field label="Teléfono" required>
                  <input value={branchForm.telefono} onChange={(event) => updateBranchField('telefono', sanitizeSoloNumeros(event.target.value))} className={inputClass} />
                </Field>
                <Field label="Dirección" required className="md:col-span-2">
                  <textarea value={branchForm.direccion} onChange={(event) => updateBranchField('direccion', event.target.value)} rows={3} className={inputClass} />
                </Field>
                <Field label="Encargado" className="md:col-span-2">
                  <input value={branchForm.encargado} onChange={(event) => updateBranchField('encargado', sanitizeSoloLetras(event.target.value))} onBlur={(event) => updateBranchField('encargado', capitalizeWords(event.target.value))} className={inputClass} />
                </Field>
              </div>

              <ToggleCard title="Sucursal activa" description="Las sucursales inactivas permanecen registradas pero no operativas." checked={branchForm.activa} onChange={(checked) => updateBranchField('activa', checked)} />

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={closeBranchModal} className={secondaryButtonClass}>Cancelar</button>
                <button type="button" onClick={saveBranch} disabled={savingSection === 'sucursales'} className={primaryButtonClass}>
                  <Save size={16} />
                  {savingSection === 'sucursales' ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ReporteModal
        open={reporteOpen}
        title="Reporte de sucursales del sistema"
        filterLabel="Estado"
        filterOptions={estadosReporte}
        generating={generandoReporte}
        onGenerate={handleGenerarReporteSucursales}
        onClose={() => setReporteOpen(false)}
      />
    </div>
  )
}

function Field({ label, required = false, children, className = '' }: { label: string; required?: boolean; children: ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-2 block text-sm font-semibold text-slate-700">
        {label} {required && <span className="text-red-500">*</span>}
      </span>
      {children}
    </label>
  )
}

function ToggleCard({
  title,
  description,
  checked,
  onChange,
  compact = false,
}: {
  title: string
  description: string
  checked: boolean
  onChange: (checked: boolean) => void
  compact?: boolean
}) {
  return (
    <button type="button" onClick={() => onChange(!checked)} className={`w-full rounded-2xl border px-4 py-4 text-left transition ${checked ? 'border-cyan-200 bg-cyan-50' : 'border-slate-200 bg-white hover:bg-slate-50'} ${compact ? 'h-full' : ''}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-semibold text-slate-900">{title}</p>
          {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
        </div>
        <span className={`mt-1 inline-flex h-6 w-11 items-center rounded-full p-1 transition ${checked ? 'bg-cyan-600' : 'bg-slate-300'}`}>
          <span className={`h-4 w-4 rounded-full bg-white transition ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
        </span>
      </div>
    </button>
  )
}

const inputClass = 'w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100'
const primaryButtonClass = 'inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:from-cyan-600 hover:to-blue-700 disabled:cursor-not-allowed disabled:opacity-60'
const secondaryButtonClass = 'inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60'