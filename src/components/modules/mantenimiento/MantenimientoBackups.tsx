import type { ReactNode } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import {
  Archive,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  FileArchive,
  HardDrive,
  Play,
  RefreshCw,
  Save,
  Search,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react'
import {
  deleteBackupRecord,
  downloadBackup,
  fetchBackupConfig,
  fetchBackupHistorial,
  formatBytes,
  triggerManualBackup,
  updateBackupConfig,
  type BackupConfig,
  type BackupHistorialItem,
} from '../../../services/backupService'
import Pagination from '../../../components/Pagination'
import SuccessModal from '../../SuccessModal'

const DIAS_SEMANA = [
  { value: 0, label: 'Domingo' },
  { value: 1, label: 'Lunes' },
  { value: 2, label: 'Martes' },
  { value: 3, label: 'Miércoles' },
  { value: 4, label: 'Jueves' },
  { value: 5, label: 'Viernes' },
  { value: 6, label: 'Sábado' },
]

function formatFechaCompleta(isoString: string | null | undefined): string {
  if (!isoString) return 'Sin registro'
  const date = new Date(isoString)
  if (Number.isNaN(date.getTime())) return 'Sin registro'

  return date.toLocaleString('es-GT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function MantenimientoBackups() {
  const [config, setConfig] = useState<BackupConfig>({
    activo: true,
    frecuencia: 'diario',
    hora: '23:30',
    dia_semana: 0,
    dia_mes: 1,
    dias_retencion: 30,
    ultimo_backup_at: null,
    proximo_backup_at: null,
  })
  const [historial, setHistorial] = useState<BackupHistorialItem[]>([])
  const [loading, setLoading] = useState(true)
  const [savingConfig, setSavingConfig] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [downloadingId, setDownloadingId] = useState<string | number | null>(null)
  const [itemToDelete, setItemToDelete] = useState<BackupHistorialItem | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filtroTipo, setFiltroTipo] = useState<'todos' | 'manual' | 'automatico'>('todos')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(5)
  const [successMessage, setSuccessMessage] = useState('')

  // Cargar configuración e historial
  const loadData = async () => {
    try {
      setLoading(true)
      const [confData, histData] = await Promise.all([
        fetchBackupConfig(),
        fetchBackupHistorial(),
      ])
      setConfig(confData)
      setHistorial(histData)
    } catch (error: any) {
      toast.error(error.message || 'No fue posible cargar el estado de backups.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Guardar configuración del programador
  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setSavingConfig(true)
      const updated = await updateBackupConfig(config)
      setConfig(updated)
      setSuccessMessage('Programación de backup guardada y sincronizada correctamente.')
    } catch (error: any) {
      toast.error(error.message || 'No fue posible guardar la programación.')
    } finally {
      setSavingConfig(false)
    }
  }

  // Generar backup manual inmediato
  const handleGenerarManual = async () => {
    try {
      setGenerating(true)
      const nuevo = await triggerManualBackup()
      setSuccessMessage(`Copia de seguridad completada (${formatBytes(nuevo.tamano_bytes)} - ${nuevo.total_registros} filas respaldadas).`)
      await loadData()
    } catch (error: any) {
      toast.error(error.message || 'Error al generar la copia de seguridad.')
    } finally {
      setGenerating(false)
    }
  }

  // Descargar archivo
  const handleDownload = async (item: BackupHistorialItem) => {
    try {
      setDownloadingId(item.id)
      await downloadBackup(item.id, item.nombre_archivo)
      toast.success(`Descargando ${item.nombre_archivo}`)
    } catch (error: any) {
      toast.error(error.message || 'No fue posible descargar el archivo.')
    } finally {
      setDownloadingId(null)
    }
  }

  // Confirmar eliminación
  const handleConfirmDelete = async () => {
    if (!itemToDelete) return
    try {
      setDeleting(true)
      await deleteBackupRecord(itemToDelete.id)
      setSuccessMessage('Copia de seguridad eliminada del almacenamiento.')
      setItemToDelete(null)
      await loadData()
    } catch (error: any) {
      toast.error(error.message || 'No fue posible eliminar la copia de seguridad.')
    } finally {
      setDeleting(false)
    }
  }

  // Filtrado y paginación
  const filteredHistorial = useMemo(() => {
    const q = searchTerm.trim().toLowerCase()
    return historial.filter((item) => {
      const matchSearch = !q || item.nombre_archivo.toLowerCase().includes(q) || item.created_by.toLowerCase().includes(q)
      const matchTipo = filtroTipo === 'todos' || item.tipo === filtroTipo
      return matchSearch && matchTipo
    })
  }, [historial, searchTerm, filtroTipo])

  const totalPages = Math.max(1, Math.ceil(filteredHistorial.length / pageSize))
  const paginatedHistorial = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredHistorial.slice(start, start + pageSize)
  }, [filteredHistorial, currentPage, pageSize])

  // Estadísticas KPI
  const totalEspacioBytes = useMemo(() => {
    return historial.reduce((acc, curr) => acc + (Number(curr.tamano_bytes) || 0), 0)
  }, [historial])

  return (
    <div className="space-y-6">
      {/* KPIs de Respaldo */}
      <div className="dashboard-kpis grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-5 mb-6">
        <StatCard
          title="Programador automático"
          value={config.activo ? 'Activo' : 'Inactivo'}
          icon={<Clock size={25} strokeWidth={2.2} />}
          tone={config.activo ? 'green' : 'red'}
          detail={config.activo ? `${config.frecuencia.toUpperCase()} a las ${config.hora}` : 'Respaldos detenidos'}
        />
        <StatCard
          title="Próxima ejecución"
          value={config.activo && config.proximo_backup_at ? formatFechaCompleta(config.proximo_backup_at) : 'En pausa'}
          icon={<Calendar size={25} strokeWidth={2.2} />}
          tone="cyan"
          detail={config.activo ? 'Disparo automático por Cron' : 'Activa el programador'}
        />
        <StatCard
          title="Último respaldo"
          value={config.ultimo_backup_at ? formatFechaCompleta(config.ultimo_backup_at) : (historial[0] ? formatFechaCompleta(historial[0].created_at) : 'Ninguno')}
          icon={<ShieldCheck size={25} strokeWidth={2.2} />}
          tone="purple"
          detail={historial.length > 0 ? `${historial[0].total_registros} filas respaldadas` : 'Sin ejecuciones aún'}
        />
        <StatCard
          title="Almacenamiento total"
          value={formatBytes(totalEspacioBytes)}
          icon={<HardDrive size={25} strokeWidth={2.2} />}
          tone="blue"
          detail={`${historial.length} ${historial.length === 1 ? 'copia guardada' : 'copias guardadas'}`}
        />
      </div>

      {/* Grid: Configuración de automatización y Acción manual */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Panel Izquierdo: Configuración del Cron (2 columnas en LG) */}
        <div className="lg:col-span-2 rounded-2xl bg-white p-6 shadow-md ring-1 ring-slate-100">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
            <div>
              <h4 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Clock className="text-cyan-600" size={20} />
                Programación de Copias Automáticas
              </h4>
              <p className="text-sm text-slate-500 mt-1">
                Configura la periodicidad y la hora en la que el servidor ejecutará el volcado sin interrumpir operaciones.
              </p>
            </div>
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
              config.activo ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'
            }`}>
              <span className={`w-2 h-2 rounded-full ${config.activo ? 'bg-green-500 animate-pulse' : 'bg-slate-400'}`} />
              {config.activo ? 'Servicio Activo' : 'Desactivado'}
            </span>
          </div>

          <form onSubmit={handleSaveConfig} className="space-y-5">
            {/* Switch de activación */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div>
                <p className="text-sm font-semibold text-slate-900">Habilitar ejecución automática</p>
                <p className="text-xs text-slate-500">El backend extraerá las tablas y creará el archivo comprimido automáticamente.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.activo}
                  onChange={(e) => setConfig({ ...config, activo: e.target.value === 'true' || e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-600"></div>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Frecuencia */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-2">
                  Frecuencia
                </label>
                <select
                  value={config.frecuencia}
                  onChange={(e) => setConfig({ ...config, frecuencia: e.target.value as any })}
                  disabled={!config.activo}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:bg-slate-100 disabled:opacity-60"
                >
                  <option value="diario">Todos los días (Diario)</option>
                  <option value="semanal">Una vez por semana</option>
                  <option value="mensual">Una vez al mes</option>
                </select>
              </div>

              {/* Hora de ejecución */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-2">
                  Hora de ejecución
                </label>
                <input
                  type="time"
                  value={config.hora || '23:30'}
                  onChange={(e) => setConfig({ ...config, hora: e.target.value })}
                  disabled={!config.activo}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:bg-slate-100 disabled:opacity-60"
                  required
                />
              </div>

              {/* Retención */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-2">
                  Retener archivos (Días)
                </label>
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={config.dias_retencion || 30}
                  onChange={(e) => setConfig({ ...config, dias_retencion: Math.max(1, Number(e.target.value) || 1) })}
                  disabled={!config.activo}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:bg-slate-100 disabled:opacity-60"
                  required
                />
              </div>
            </div>

            {/* Opciones según frecuencia semanal o mensual */}
            {config.frecuencia === 'semanal' && (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-2">
                  Día de la semana para el respaldo
                </label>
                <select
                  value={config.dia_semana}
                  onChange={(e) => setConfig({ ...config, dia_semana: Number(e.target.value) })}
                  disabled={!config.activo}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                >
                  {DIAS_SEMANA.map((dia) => (
                    <option key={dia.value} value={dia.value}>{dia.label}</option>
                  ))}
                </select>
              </div>
            )}

            {config.frecuencia === 'mensual' && (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-2">
                  Día del mes (1 - 28)
                </label>
                <input
                  type="number"
                  min="1"
                  max="28"
                  value={config.dia_mes || 1}
                  onChange={(e) => setConfig({ ...config, dia_mes: Math.min(28, Math.max(1, Number(e.target.value) || 1)) })}
                  disabled={!config.activo}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-slate-500">
                Los backups mayores a {config.dias_retencion || 30} días se purgan automáticamente para proteger el espacio en disco.
              </span>
              <button
                type="submit"
                disabled={savingConfig}
                className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-cyan-700 transition disabled:opacity-50"
              >
                {savingConfig ? <RefreshCw className="animate-spin" size={16} /> : <Save size={16} />}
                {savingConfig ? 'Guardando...' : 'Guardar Programación'}
              </button>
            </div>
          </form>
        </div>

        {/* Panel Derecho: Acción Inmediata (1 columna en LG) */}
        <div className="rounded-2xl bg-gradient-to-br from-indigo-900 via-slate-900 to-slate-950 p-6 text-white shadow-xl flex flex-col justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-cyan-300 mb-4">
              <Archive size={14} />
              Respaldo Inmediato
            </div>
            <h4 className="text-xl font-bold">Generar Copia de Seguridad</h4>
            <p className="mt-2 text-sm text-slate-300">
              ¿Vas a realizar una actualización crítica o cierre de periodo? Puedes forzar un respaldo manual en este instante con un solo clic.
            </p>

            <div className="mt-6 space-y-3 rounded-xl bg-white/5 p-4 border border-white/10 text-xs text-slate-300">
              <div className="flex items-center justify-between">
                <span>Tablas fijadas:</span>
                <span className="font-semibold text-cyan-300">29 tablas críticas</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Formato de salida:</span>
                <span className="font-semibold text-white">JSON Comprimido (GZIP)</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Destino:</span>
                <span className="font-semibold text-white">Servidor + Nube Supabase</span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={handleGenerarManual}
              disabled={generating}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-3.5 text-sm font-bold text-white shadow-lg hover:from-cyan-600 hover:to-blue-700 transition-all disabled:opacity-50 active:scale-[0.98]"
            >
              {generating ? (
                <>
                  <RefreshCw className="animate-spin" size={18} />
                  <span>Empaquetando datos del sistema...</span>
                </>
              ) : (
                <>
                  <Play size={18} fill="currentColor" />
                  <span>Generar Backup Ahora</span>
                </>
              )}
            </button>
            <p className="text-center text-[11px] text-slate-400 mt-2">
              No bloquea la atención de ventas ni el funcionamiento del POS.
            </p>
          </div>
        </div>
      </div>

      {/* Historial de Backups */}
      <div className="rounded-2xl bg-white p-5 shadow-md ring-1 ring-slate-100">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4">
          <div>
            <h4 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <FileArchive className="text-indigo-600" size={22} />
              Historial de Copias de Seguridad
            </h4>
            <p className="text-sm text-slate-500">
              Consulta, descarga o depura los archivos de respaldo generados en el sistema ({filteredHistorial.length} disponibles).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por archivo..."
                className="w-52 sm:w-64 rounded-xl border border-slate-200 py-2 pl-9 pr-3 text-xs outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
              />
            </div>

            <select
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value as any)}
              className="rounded-xl border border-slate-200 py-2 px-3 text-xs text-slate-700 outline-none focus:border-cyan-500"
            >
              <option value="todos">Todos los tipos</option>
              <option value="automatico">Solo Automáticos</option>
              <option value="manual">Solo Manuales</option>
            </select>

            <button
              type="button"
              onClick={loadData}
              disabled={loading}
              className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
              title="Refrescar historial"
            >
              <RefreshCw className={loading ? 'animate-spin' : ''} size={16} />
            </button>
          </div>
        </div>

        {/* Tabla responsiva de backups */}
        <div className="mt-4 overflow-x-auto touch-scroll">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                <th className="px-4 py-3">Fecha y Hora</th>
                <th className="px-4 py-3">Archivo de Respaldo</th>
                <th className="px-4 py-3 text-center">Tipo</th>
                <th className="px-4 py-3 text-right">Tamaño</th>
                <th className="px-4 py-3 text-right">Tablas / Filas</th>
                <th className="px-4 py-3 text-center">Estado</th>
                <th className="px-4 py-3 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {paginatedHistorial.map((item) => {
                const isDownloading = downloadingId === item.id
                return (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                      {formatFechaCompleta(item.created_at)}
                    </td>
                    <td className="px-4 py-3 font-mono font-medium text-slate-800">
                      <div className="flex items-center gap-2">
                        <FileArchive className="text-cyan-600 shrink-0" size={16} />
                        <span className="truncate max-w-xs sm:max-w-md" title={item.nombre_archivo}>
                          {item.nombre_archivo}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                        item.tipo === 'automatico'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-purple-100 text-purple-700'
                      }`}>
                        {item.tipo === 'automatico' ? 'Automático' : 'Manual'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-800 whitespace-nowrap">
                      {formatBytes(item.tamano_bytes)}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600 whitespace-nowrap">
                      {item.total_tablas > 0 ? (
                        <span>
                          <strong className="text-slate-800">{item.total_tablas}</strong> tablas ·{' '}
                          <strong className="text-slate-800">{item.total_registros}</strong> filas
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-green-100 text-green-700">
                        <CheckCircle2 size={12} />
                        Completado
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleDownload(item)}
                          disabled={isDownloading}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-50 text-cyan-700 hover:bg-cyan-100 font-medium transition disabled:opacity-50"
                          title="Descargar copia de seguridad"
                        >
                          {isDownloading ? (
                            <RefreshCw className="animate-spin" size={14} />
                          ) : (
                            <Download size={14} />
                          )}
                          <span>Descargar</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setItemToDelete(item)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
                          title="Eliminar este respaldo"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}

              {filteredHistorial.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                    <Archive size={40} className="mx-auto text-slate-300 mb-2" />
                    <p className="font-semibold text-slate-700">No hay copias de seguridad registradas</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Haz clic en "Generar Backup Ahora" o espera a la hora programada para que el sistema lo genere solo.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        <Pagination
          page={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          totalItems={filteredHistorial.length}
          pageSize={pageSize}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize)
            setCurrentPage(1)
          }}
        />
      </div>

      {/* Modal de Confirmación de Eliminación */}
      {itemToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-red-600 font-bold text-base">
                <ShieldAlert size={20} />
                <span>Confirmar Eliminación</span>
              </div>
              <button
                type="button"
                onClick={() => setItemToDelete(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <div className="py-4">
              <p className="text-sm text-slate-700">
                ¿Estás seguro de que deseas eliminar permanentemente el archivo de respaldo:
              </p>
              <div className="mt-3 p-3 rounded-xl bg-slate-50 border border-slate-200 font-mono text-xs text-slate-800 break-all">
                {itemToDelete.nombre_archivo}
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Esta acción liberará {formatBytes(itemToDelete.tamano_bytes)} del almacenamiento y no se podrá deshacer.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setItemToDelete(null)}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-100 transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 text-sm font-semibold text-white hover:bg-red-700 transition disabled:opacity-50"
              >
                {deleting ? <RefreshCw className="animate-spin" size={16} /> : <Trash2 size={16} />}
                {deleting ? 'Eliminando...' : 'Eliminar Respaldo'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Éxito */}
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
        <p className="dashboard-kpi-value truncate" title={String(value)}>{value}</p>
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
