import React, { useState, useEffect, useCallback } from 'react'
import {
  X,
  ClipboardCheck,
  Plus,
  RefreshCw,
  ArrowLeft,
} from 'lucide-react'
import { toast } from 'sonner'
import { getCurrentUser } from '../../../services/authService'
import {
  listAuditorias,
  getAuditoriaById,
  createAuditoria,
  updateAuditoriaEstado,
  saveConteo,
  cerrarAuditoria,
} from '../../../services/auditoriaService'
import AuditoriaListado from './AuditoriaListado'
import AuditoriaWizard from './AuditoriaWizard'
import AuditoriaOperacion from './AuditoriaOperacion'
import AuditoriaReporteModal from './AuditoriaReporteModal'
import SuccessModal from '../../SuccessModal'

export default function AuditoriaInventarioModal({
  isOpen,
  onClose,
  productos = [],
  categorias = [],
}) {
  const [currentUser, setCurrentUser] = useState(() => getCurrentUser())
  const [auditorias, setAuditorias] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

  // Vistas: 'listado' | 'wizard' | 'operacion'
  const [vista, setVista] = useState('listado')

  // Auditoría seleccionada para operación
  const [activeAuditoria, setActiveAuditoria] = useState(null)
  const [activeDetalles, setActiveDetalles] = useState([])

  // Modal de reporte
  const [reporteModalOpen, setReporteModalOpen] = useState(false)
  const [reporteAuditoria, setReporteAuditoria] = useState(null)
  const [reporteDetalles, setReporteDetalles] = useState([])

  // Cargar usuario actual
  useEffect(() => {
    const user = getCurrentUser()
    setCurrentUser(user)
  }, [])

  // Cargar lista de auditorías
  const cargarAuditorias = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await listAuditorias()
      setAuditorias(data || [])
    } catch (err) {
      toast.error('No se pudieron cargar las auditorías: ' + (err?.message || 'Error del servidor'))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isOpen) {
      cargarAuditorias()
      setVista('listado')
      setActiveAuditoria(null)
      setActiveDetalles([])
    }
  }, [isOpen, cargarAuditorias])

  // Cargar auditoría por ID para ver detalle u operar
  const cargarDetalleAuditoria = async (auditoriaId, irAVista = 'operacion') => {
    setIsLoading(true)
    try {
      const res = await getAuditoriaById(auditoriaId)
      const auditoriaObj = res?.auditoria || (res?.id ? res : null)
      const detallesList = res?.detalles || auditoriaObj?.detalles || []

      if (auditoriaObj && auditoriaObj.id) {
        setActiveAuditoria(auditoriaObj)
        setActiveDetalles(detallesList)
        if (irAVista) setVista(irAVista)
        return { auditoria: auditoriaObj, detalles: detallesList }
      } else {
        toast.error('No se pudo encontrar la información de la auditoría.')
      }
    } catch (err) {
      toast.error('Error al cargar la auditoría: ' + (err?.message || 'Error'))
    } finally {
      setIsLoading(false)
    }
    return null
  }

  // Crear auditoría desde el Wizard
  const handleCrearAuditoria = async (payload, esBorrador) => {
    setIsSaving(true)
    try {
      const nueva = await createAuditoria(payload)
      setSuccessMessage(
        esBorrador
          ? 'Auditoría guardada como borrador con éxito.'
          : '¡Auditoría creada e iniciada! Proceda con el conteo físico.'
      )
      await cargarAuditorias()
      if (nueva && nueva.id) {
        if (esBorrador) {
          setVista('listado')
        } else {
          await cargarDetalleAuditoria(nueva.id, 'operacion')
        }
      } else {
        setVista('listado')
      }
    } catch (err) {
      toast.error('No se pudo crear la auditoría: ' + (err?.message || 'Error desconocido'))
    } finally {
      setIsSaving(false)
    }
  }

  // Guardar avance de conteo físico
  const handleSaveConteo = async (items) => {
    if (!activeAuditoria) return
    setIsSaving(true)
    try {
      const res = await saveConteo(
        activeAuditoria.id,
        items,
        currentUser?.nombre || currentUser?.email || 'Operador',
        'Avance de conteo físico registrado.'
      )
      setSuccessMessage('Avance de conteo guardado exitosamente.')
      if (Array.isArray(res)) {
        setActiveDetalles(res)
      } else if (res && res.detalles) {
        setActiveDetalles(res.detalles)
      } else {
        await cargarDetalleAuditoria(activeAuditoria.id, null)
      }
      cargarAuditorias()
    } catch (err) {
      toast.error('Error al guardar el conteo: ' + (err?.message || 'Error'))
    } finally {
      setIsSaving(false)
    }
  }

  // Finalizar conteo y pasar a conciliación
  const handleFinalizarConteo = async (destinoEstado = 'En revisión', items = null) => {
    if (!activeAuditoria) return
    setIsSaving(true)
    try {
      const estadoDestinoFinal = typeof destinoEstado === 'string' ? destinoEstado : 'En revisión'

      // Si se proporcionaron los items del conteo físico, guardarlos primero
      if (Array.isArray(items) && items.length > 0) {
        const resConteo = await saveConteo(
          activeAuditoria.id,
          items,
          currentUser?.nombre || currentUser?.email || 'Operador',
          'Conteo físico registrado al finalizar conteo.'
        )
        if (Array.isArray(resConteo)) {
          setActiveDetalles(resConteo)
        }
      }

      const nuevoEstado =
        activeAuditoria.estado === 'Borrador'
          ? 'En conteo'
          : estadoDestinoFinal

      await updateAuditoriaEstado(
        activeAuditoria.id,
        nuevoEstado,
        currentUser?.nombre || currentUser?.email || 'Operador'
      )

      setSuccessMessage(
        nuevoEstado === 'En revisión'
          ? 'Conteo físico finalizado. Se han calculado las diferencias para conciliación.'
          : nuevoEstado === 'En conteo'
          ? 'Conteo físico iniciado. El personal de bodega puede registrar existencias.'
          : 'Estado actualizado a: ' + nuevoEstado
      )

      await cargarDetalleAuditoria(activeAuditoria.id, 'operacion')
      cargarAuditorias()
    } catch (err) {
      toast.error('No se pudo actualizar el estado: ' + (err?.message || 'Error'))
    } finally {
      setIsSaving(false)
    }
  }

  // Cerrar formalmente la auditoría
  const handleCerrarAuditoria = async () => {
    if (!activeAuditoria) return
    if (!window.confirm('¿Está seguro de cerrar formalmente esta auditoría? Esta acción bloqueará cualquier edición futura.')) {
      return
    }
    setIsSaving(true)
    try {
      await cerrarAuditoria(
        activeAuditoria.id,
        {
          totalProductos: activeDetalles.length,
          fechaCierre: new Date().toISOString(),
          responsable: currentUser?.nombre || currentUser?.email || 'Administrador',
        },
        currentUser?.nombre || currentUser?.email || 'Administrador'
      )
      setSuccessMessage('Auditoría cerrada formalmente con éxito.')
      await cargarDetalleAuditoria(activeAuditoria.id, 'operacion')
      cargarAuditorias()
    } catch (err) {
      toast.error('No fue posible cerrar la auditoría: ' + (err?.message || 'Error'))
    } finally {
      setIsSaving(false)
    }
  }

  // Cancelar auditoría activa
  const handleCancelarAuditoria = async (audit) => {
    if (!window.confirm(`¿Desea cancelar la auditoría ${audit.codigo}?`)) return
    try {
      await updateAuditoriaEstado(
        audit.id,
        'Cancelada',
        currentUser?.nombre || currentUser?.email || 'Administrador'
      )
      setSuccessMessage(`Auditoría ${audit.codigo} cancelada.`)
      cargarAuditorias()
    } catch (err) {
      toast.error('Error al cancelar: ' + (err?.message || 'Error'))
    }
  }

  // Ver reporte ejecutivo
  const handleAbrirReporte = async (auditoria) => {
    try {
      const res = await getAuditoriaById(auditoria.id)
      const auditoriaObj = res?.auditoria || (res?.id ? res : auditoria)
      const detallesList = res?.detalles || auditoriaObj?.detalles || []
      setReporteAuditoria(auditoriaObj)
      setReporteDetalles(detallesList)
      setReporteModalOpen(true)
    } catch (err) {
      toast.error('Error al abrir el reporte: ' + (err?.message || 'Error'))
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-6 bg-slate-900/60 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-6xl bg-slate-100 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden border border-slate-200/80 my-auto flex flex-col max-h-[92vh]">
        {/* Cabecera Principal del Modal (Fase 0) */}
        <div className="bg-white px-4 sm:px-8 py-3.5 sm:py-5 border-b border-slate-200 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
            <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 text-white flex items-center justify-center shadow-md shadow-cyan-500/20 shrink-0">
              <ClipboardCheck size={22} />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-xl md:text-2xl font-black tracking-tight text-slate-900 truncate">
                Auditoría de Inventario
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5 truncate hidden sm:block">
                Control y conciliación de existencias físicas frente al inventario registrado
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {vista === 'listado' && (
              <button
                type="button"
                onClick={() => setVista('wizard')}
                className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-2 sm:py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-cyan-600/20 transition-all active:scale-95"
              >
                <Plus size={15} />
                <span>+ Nueva auditoría</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors shrink-0"
              title="Cerrar modal"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Contenido Dinámico según la Vista */}
        <div className="p-3 sm:p-8 overflow-y-auto flex-1">
          {vista === 'listado' && (
            <AuditoriaListado
              auditorias={auditorias}
              isLoading={isLoading}
              currentUser={currentUser}
              onNuevaAuditoria={() => setVista('wizard')}
              onVerAuditoria={(a) => cargarDetalleAuditoria(a.id, 'operacion')}
              onContinuarAuditoria={(a) => cargarDetalleAuditoria(a.id, 'operacion')}
              onVerReporte={handleAbrirReporte}
              onCancelarAuditoria={handleCancelarAuditoria}
            />
          )}

          {vista === 'wizard' && (
            <AuditoriaWizard
              productos={productos}
              categorias={categorias}
              currentUser={currentUser}
              existingAuditorias={auditorias}
              onCancel={() => setVista('listado')}
              onSaveBorrador={(payload) => handleCrearAuditoria(payload, true)}
              onIniciarConteo={(payload) => handleCrearAuditoria(payload, false)}
              isSaving={isSaving}
            />
          )}

          {vista === 'operacion' && activeAuditoria && (
            <AuditoriaOperacion
              auditoria={activeAuditoria}
              detalles={activeDetalles}
              currentUser={currentUser}
              onBack={() => setVista('listado')}
              onSaveConteo={handleSaveConteo}
              onFinalizarConteo={handleFinalizarConteo}
              onCerrarAuditoria={handleCerrarAuditoria}
              onVerReporte={() => handleAbrirReporte(activeAuditoria)}
              isSaving={isSaving}
            />
          )}
        </div>
      </div>

      {/* Modal de Reporte Imprimible */}
      <AuditoriaReporteModal
        isOpen={reporteModalOpen}
        onClose={() => setReporteModalOpen(false)}
        auditoria={reporteAuditoria}
        detalles={reporteDetalles}
      />

      <SuccessModal
        isOpen={Boolean(successMessage)}
        message={successMessage}
        onClose={() => setSuccessMessage('')}
      />
    </div>
  )
}
