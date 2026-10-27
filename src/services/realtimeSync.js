import { supabase } from './supabaseClient'

const CHANNEL_NAME = 'amati_realtime_bus'

/**
 * Notifica a todos los componentes y pestañas abiertas que un dato cambió.
 * @param {'ventas' | 'recetas' | 'inventario' | 'caja' | 'all'} type
 */
export function notifyDataChange(type = 'all') {
  try {
    // 1. Notificar en la pestaña actual (CustomEvent en window)
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('amati:data-changed', {
          detail: { type, timestamp: Date.now() },
        })
      )
    }

    // 2. Notificar a otras pestañas del navegador (BroadcastChannel)
    if (typeof BroadcastChannel !== 'undefined') {
      const bc = new BroadcastChannel(CHANNEL_NAME)
      bc.postMessage({ type, timestamp: Date.now() })
      bc.close()
    }
  } catch (err) {
    console.debug('Error al emitir evento de cambio en tiempo real:', err)
  }
}

/**
 * Suscribe un componente a cambios en tiempo real (mismo navegador, otras pestañas o Supabase).
 * @param {(event: { type: string, timestamp: number }) => void} onDataChange
 * @param {{ intervalSeconds?: number, types?: string[] }} [options]
 * @returns {() => void} Función para desuscribir
 */
export function subscribeToDataChanges(onDataChange, options = {}) {
  const { intervalSeconds = 15, types = ['all'] } = options

  const shouldTrigger = (eventType) => {
    if (types.includes('all') || types.includes(eventType) || eventType === 'all') {
      return true
    }
    return false
  }

  // 1. Escuchar CustomEvent en la misma pestaña
  const handleLocalEvent = (e) => {
    const eventType = e?.detail?.type || 'all'
    if (shouldTrigger(eventType)) {
      onDataChange({ type: eventType, timestamp: e?.detail?.timestamp || Date.now() })
    }
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('amati:data-changed', handleLocalEvent)
  }

  // 2. Escuchar BroadcastChannel (otras pestañas)
  let bc = null
  if (typeof BroadcastChannel !== 'undefined') {
    try {
      bc = new BroadcastChannel(CHANNEL_NAME)
      bc.onmessage = (event) => {
        const eventType = event?.data?.type || 'all'
        if (shouldTrigger(eventType)) {
          onDataChange({ type: eventType, timestamp: event?.data?.timestamp || Date.now() })
        }
      }
    } catch (e) {
      console.debug('BroadcastChannel no soportado:', e)
    }
  }

  // 3. Suscribirse a Supabase Realtime si está configurado
  let supabaseChannel = null
  try {
    if (supabase && typeof supabase.channel === 'function') {
      supabaseChannel = supabase
        .channel(`amati-live-${Math.random().toString(36).substring(2, 9)}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'venta_pos' },
          () => {
            if (shouldTrigger('ventas')) {
              onDataChange({ type: 'ventas', timestamp: Date.now() })
            }
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'receta' },
          () => {
            if (shouldTrigger('recetas')) {
              onDataChange({ type: 'recetas', timestamp: Date.now() })
            }
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'producto' },
          () => {
            if (shouldTrigger('inventario')) {
              onDataChange({ type: 'inventario', timestamp: Date.now() })
            }
          }
        )
        .subscribe()
    }
  } catch (err) {
    console.debug('Supabase Realtime no inicializado:', err)
  }

  // 4. Refresco al volver a enfocar la pestaña (Page Visibility / Window Focus) con deduplicación y throttle
  let lastWindowActiveTrigger = 0
  const WINDOW_COOLDOWN_MS = 20000

  const handleWindowActive = (source) => {
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
      return
    }
    const now = Date.now()
    if (now - lastWindowActiveTrigger >= WINDOW_COOLDOWN_MS) {
      lastWindowActiveTrigger = now
      onDataChange({ type: source, timestamp: now })
    }
  }

  const handleVisibilityChange = () => {
    handleWindowActive('visibility')
  }

  const handleFocus = () => {
    handleWindowActive('focus')
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', handleVisibilityChange)
  }
  if (typeof window !== 'undefined') {
    window.addEventListener('focus', handleFocus)
  }

  // 5. Polling inteligente como respaldo seguro
  let timerId = null
  if (intervalSeconds > 0) {
    timerId = setInterval(() => {
      // Solo refrescar si la pestaña está activa para ahorrar recursos
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        onDataChange({ type: 'interval', timestamp: Date.now() })
      }
    }, intervalSeconds * 1000)
  }

  // Función de limpieza
  return () => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('amati:data-changed', handleLocalEvent)
      window.removeEventListener('focus', handleFocus)
    }
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
    if (bc) {
      try {
        bc.close()
      } catch (err) {
        void err
      }
    }
    if (supabaseChannel && typeof supabase.removeChannel === 'function') {
      try {
        supabase.removeChannel(supabaseChannel)
      } catch (err) {
        void err
      }
    }
    if (timerId) {
      clearInterval(timerId)
    }
  }
}
