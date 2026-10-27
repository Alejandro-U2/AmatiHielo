import fs from 'fs';

// Helper to preserve CRLF / LF line endings
function patchFile(filePath, transforms) {
  let content = fs.readFileSync(filePath, 'utf8');
  const isCRLF = content.includes('\r\n');
  let norm = content.replace(/\r\n/g, '\n');

  for (const { target, replacement } of transforms) {
    if (!norm.includes(target)) {
      throw new Error(`Target not found in ${filePath}:\n${target}`);
    }
    norm = norm.replace(target, replacement);
  }

  if (isCRLF) {
    norm = norm.replace(/\n/g, '\r\n');
  }
  fs.writeFileSync(filePath, norm, 'utf8');
  console.log(`Successfully patched: ${filePath}`);
}

// 1. src/services/recetasService.js
patchFile('src/services/recetasService.js', [
  {
    target: `export async function getRecetas() {
  const payload = await request('/api/recetas')
  return (payload?.data || []).map(normalizeReceta)
}`,
    replacement: `export async function getRecetas(options = {}) {
  const query = options?.includeImages ? '?includeImages=true' : ''
  const payload = await request(\`/api/recetas\${query}\`)
  return (payload?.data || []).map(normalizeReceta)
}

export async function getRecetasCount() {
  const payload = await request('/api/recetas/count')
  return payload?.count ?? 0
}`,
  },
]);

// 2. src/components/Dashboard.jsx
patchFile('src/components/Dashboard.jsx', [
  {
    target: `import { getRecetas } from '../services/recetasService'`,
    replacement: `import { getRecetasCount } from '../services/recetasService'`,
  },
  {
    target: `    const fetchStats = async () => {
      try {
        const [ventas, inventario, recetas] = await Promise.all([
          listVentasPos().catch(() => []),
          listProductosInventario().catch(() => []),
          getRecetas().catch(() => []),
        ])

        if (!isMounted) return

        const hoy = new Date()
        const ventasHoy = (ventas || []).filter((v) => {
          if (!v.createdAt) return false
          const f = new Date(v.createdAt)
          return (
            !Number.isNaN(f.getTime()) &&
            f.getFullYear() === hoy.getFullYear() &&
            f.getMonth() === hoy.getMonth() &&
            f.getDate() === hoy.getDate()
          )
        })

        const totalVentasHoy = ventasHoy.reduce((s, v) => s + (Number(v.total) || 0), 0)
        const stockTotal = (inventario || []).reduce((s, p) => s + (Number(p.stock) || 0), 0)

        setDashboardStats({
          ventasHoy: totalVentasHoy,
          transaccionesHoy: ventasHoy.length,
          stockTotal,
          recetasTotal: (recetas || []).length,
        })
      } catch (err) {
        console.debug('Error al cargar métricas de dashboard:', err)
      }
    }

    void fetchStats()

    const unsubscribe = subscribeToDataChanges(() => {
      void fetchStats()
    }, { intervalSeconds: 15, types: ['all', 'ventas', 'recetas', 'inventario', 'produccion'] })`,
    replacement: `    const fetchStats = async ({ updateRecetas = false } = {}) => {
      try {
        const promises = [
          listVentasPos().catch(() => []),
          listProductosInventario().catch(() => []),
        ]
        if (updateRecetas) {
          promises.push(getRecetasCount().catch(() => 0))
        }

        const [ventas, inventario, recetasTotalCount] = await Promise.all(promises)

        if (!isMounted) return

        const hoy = new Date()
        const ventasHoy = (ventas || []).filter((v) => {
          if (!v.createdAt) return false
          const f = new Date(v.createdAt)
          return (
            !Number.isNaN(f.getTime()) &&
            f.getFullYear() === hoy.getFullYear() &&
            f.getMonth() === hoy.getMonth() &&
            f.getDate() === hoy.getDate()
          )
        })

        const totalVentasHoy = ventasHoy.reduce((s, v) => s + (Number(v.total) || 0), 0)
        const stockTotal = (inventario || []).reduce((s, p) => s + (Number(p.stock) || 0), 0)

        setDashboardStats((prev) => ({
          ventasHoy: totalVentasHoy,
          transaccionesHoy: ventasHoy.length,
          stockTotal,
          recetasTotal: updateRecetas ? (recetasTotalCount ?? prev.recetasTotal) : prev.recetasTotal,
        }))
      } catch (err) {
        console.debug('Error al cargar métricas de dashboard:', err)
      }
    }

    void fetchStats({ updateRecetas: true })

    const unsubscribe = subscribeToDataChanges(({ type }) => {
      const shouldUpdateRecetas = type === 'recetas' || type === 'all'
      void fetchStats({ updateRecetas: shouldUpdateRecetas })
    }, { intervalSeconds: 15, types: ['all', 'ventas', 'recetas', 'inventario', 'produccion'] })`,
  },
]);

// 3. src/services/realtimeSync.js
patchFile('src/services/realtimeSync.js', [
  {
    target: `  // 4. Refresco al volver a enfocar la pestaña (Page Visibility / Window Focus)
  const handleVisibilityChange = () => {
    if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
      onDataChange({ type: 'visibility', timestamp: Date.now() })
    }
  }

  const handleFocus = () => {
    onDataChange({ type: 'focus', timestamp: Date.now() })
  }`,
    replacement: `  // 4. Refresco al volver a enfocar la pestaña (Page Visibility / Window Focus) con deduplicación y throttle
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
  }`,
  },
]);

// 4. src/components/modules/PuntoVenta.jsx
patchFile('src/components/modules/PuntoVenta.jsx', [
  {
    target: `  const loadData = async (forceFull = false) => {
    try {
      setIsLoading(true)
      setErrorMsg('')
      const shouldLoadCatalogs = forceFull || metodosPago.length === 0 || clientes.length === 0
      const [recetasData, ventasData, parametrosData, metodosPagoData, clientesData] = await Promise.all([
        getRecetas(),
        listVentasPos(),
        shouldLoadCatalogs ? getParametrosSistema().catch(() => null) : Promise.resolve(null),
        shouldLoadCatalogs ? listMetodosPago().catch(() => []) : Promise.resolve([]),
        shouldLoadCatalogs ? listClientesPos().catch(() => []) : Promise.resolve([]),
      ])

      if (parametrosData?.impuestos) {
        setIvaActivo(Boolean(parametrosData.impuestos.ivaActivo))
        setIvaPorcentaje(Number(parametrosData.impuestos.ivaPorcentaje || 12))
      }
      if (metodosPagoData.length > 0) {
        setMetodosPago(metodosPagoData.map((metodo) => metodo.nombre))
      }
      setProductos(recetasData.map((receta) => ({
        id: receta.id,
        codigo: receta.codigo,
        nombre: receta.nombre,
        categoria: receta.categoria || 'General',
        presentacion: receta.presentacion,
        precio: Number(receta.precioSugerido || receta.costoTotal || 0),
        imagenUrl: receta.imagenUrl || null,
        ingredientes: receta.ingredientes || [],
      })))
      setVentas(ventasData)
      if (clientesData.length > 0) {
        setClientes(clientesData)
      }
    } catch (error) {
      setErrorMsg(error.message || 'No fue posible cargar el POS.')
      setProductos([])
      setVentas([])
    } finally {
      setIsLoading(false)
    }
  }`,
    replacement: `  const loadData = async (forceFull = false, { updateRecetas = true } = {}) => {
    try {
      setIsLoading(true)
      setErrorMsg('')
      const shouldLoadCatalogs = forceFull || metodosPago.length === 0 || clientes.length === 0
      const [recetasData, ventasData, parametrosData, metodosPagoData, clientesData] = await Promise.all([
        updateRecetas ? getRecetas({ includeImages: true }) : Promise.resolve(null),
        listVentasPos(),
        shouldLoadCatalogs ? getParametrosSistema().catch(() => null) : Promise.resolve(null),
        shouldLoadCatalogs ? listMetodosPago().catch(() => []) : Promise.resolve([]),
        shouldLoadCatalogs ? listClientesPos().catch(() => []) : Promise.resolve([]),
      ])

      if (parametrosData?.impuestos) {
        setIvaActivo(Boolean(parametrosData.impuestos.ivaActivo))
        setIvaPorcentaje(Number(parametrosData.impuestos.ivaPorcentaje || 12))
      }
      if (metodosPagoData.length > 0) {
        setMetodosPago(metodosPagoData.map((metodo) => metodo.nombre))
      }
      if (recetasData) {
        setProductos(recetasData.map((receta) => ({
          id: receta.id,
          codigo: receta.codigo,
          nombre: receta.nombre,
          categoria: receta.categoria || 'General',
          presentacion: receta.presentacion,
          precio: Number(receta.precioSugerido || receta.costoTotal || 0),
          imagenUrl: receta.imagenUrl || null,
          ingredientes: receta.ingredientes || [],
        })))
      }
      setVentas(ventasData)
      if (clientesData.length > 0) {
        setClientes(clientesData)
      }
    } catch (error) {
      setErrorMsg(error.message || 'No fue posible cargar el POS.')
      if (updateRecetas) {
        setProductos([])
      }
      setVentas([])
    } finally {
      setIsLoading(false)
    }
  }`,
  },
  {
    target: `  useEffect(() => {
    loadData()
    cargarArqueo()

    // Suscripción en tiempo real: sincroniza cambios de recetas, ventas e inventario
    const unsubscribe = subscribeToDataChanges(({ type }) => {
      loadData()
      if (type === 'ventas' || type === 'caja' || type === 'all') {
        cargarArqueo()
      }
    }, { intervalSeconds: 15, types: ['all', 'ventas', 'recetas', 'caja', 'inventario'] })

    return () => unsubscribe()
  }, [])`,
    replacement: `  useEffect(() => {
    loadData(false, { updateRecetas: true })
    cargarArqueo()

    // Suscripción en tiempo real: sincroniza cambios de recetas, ventas e inventario
    const unsubscribe = subscribeToDataChanges(({ type }) => {
      const isPeriodic = type === 'interval' || type === 'focus' || type === 'visibility'
      loadData(false, { updateRecetas: !isPeriodic })
      if (type === 'ventas' || type === 'caja' || type === 'all') {
        cargarArqueo()
      }
    }, { intervalSeconds: 15, types: ['all', 'ventas', 'recetas', 'caja', 'inventario'] })

    return () => unsubscribe()
  }, [])`,
  },
]);

// 5. src/components/modules/ProduccionRecetas.jsx
patchFile('src/components/modules/ProduccionRecetas.jsx', [
  {
    target: `      const [recetasData, categoriasData, presentacionesData, unidadesData] = await Promise.all([
        getRecetas(),
        listCategoriasReceta().catch(() => []),
        listPresentacionesReceta().catch(() => []),
        listUnidadesMedida().catch(() => []),
      ])`,
    replacement: `      const [recetasData, categoriasData, presentacionesData, unidadesData] = await Promise.all([
        getRecetas({ includeImages: true }),
        listCategoriasReceta().catch(() => []),
        listPresentacionesReceta().catch(() => []),
        listUnidadesMedida().catch(() => []),
      ])`,
  },
  {
    target: `      const recetasActualizadas = await getRecetas()`,
    replacement: `      const recetasActualizadas = await getRecetas({ includeImages: true })`,
  },
]);

console.log('All frontend optimizations applied successfully!');
