import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { supabaseAdmin } from '../config/supabaseAdmin.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Directorio local permanente para almacenar los backups
const BACKUP_DIR = path.resolve(__dirname, '../../../data/backups')
const CONFIG_FILE = path.join(BACKUP_DIR, 'config.json')
const HISTORY_FILE = path.join(BACKUP_DIR, 'historial.json')
const STORAGE_BUCKET = 'system-backups'

// Lista de tablas críticas de AMATI HIELO a incluir en el volcado
export const TABLAS_SISTEMA = [
  'usuarios',
  'roles',
  'permisos',
  'rol_permisos',
  'producto',
  'categoria_producto',
  'proveedor',
  'movimiento_inventario',
  'tipo_movimiento',
  'catalogo_motivos_merma',
  'receta',
  'receta_ingrediente',
  'produccion',
  'produccion_detalle',
  'ventas',
  'detalle_ventas',
  'clientes',
  'cajas',
  'sesiones_caja',
  'arqueos_caja',
  'configuracion_sistema',
  'empresa_config',
  'sucursales',
  'auditoria_inventario',
  'auditoria_inventario_detalle',
  'prediccion_demanda_historial',
  'prediccion_configuracion',
  'notificaciones',
]

// Asegurar existencia de directorio
function ensureDirectories() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true })
  }
}

// Configuración por defecto
const DEFAULT_CONFIG = {
  activo: true,
  frecuencia: 'diario', // 'diario' | 'semanal' | 'mensual'
  hora: '23:30',
  dia_semana: 0, // 0 = Domingo
  dia_mes: 1,
  dias_retencion: 30,
  ultimo_backup_at: null,
  proximo_backup_at: null,
  updated_at: new Date().toISOString(),
  updated_by: 'Sistema',
}

// Calcular próxima fecha de ejecución según frecuencia y hora
export function calcularProximaEjecucion(config = DEFAULT_CONFIG) {
  if (!config.activo) return null

  const [hours, minutes] = (config.hora || '23:30').split(':').map(Number)
  const now = new Date()
  const next = new Date(now)

  next.setHours(hours, minutes, 0, 0)

  if (config.frecuencia === 'diario') {
    if (next <= now) {
      next.setDate(next.getDate() + 1)
    }
  } else if (config.frecuencia === 'semanal') {
    const targetDay = Number(config.dia_semana ?? 0) // 0 = domingo
    let diff = (targetDay - next.getDay() + 7) % 7
    if (diff === 0 && next <= now) {
      diff = 7
    }
    next.setDate(next.getDate() + diff)
  } else if (config.frecuencia === 'mensual') {
    const targetDay = Number(config.dia_mes ?? 1)
    next.setDate(targetDay)
    if (next <= now) {
      next.setMonth(next.getMonth() + 1)
      next.setDate(targetDay)
    }
  }

  return next.toISOString()
}

// Obtener configuración guardada
export async function getBackupConfig() {
  ensureDirectories()

  // 1. Intentar desde Supabase
  try {
    const { data, error } = await supabaseAdmin
      .from('sistema_backup_config')
      .select('*')
      .eq('id', 1)
      .maybeSingle()

    if (!error && data) {
      return {
        ...DEFAULT_CONFIG,
        ...data,
        proximo_backup_at: data.activo ? (data.proximo_backup_at || calcularProximaEjecucion(data)) : null,
      }
    }
  } catch {
    // Continuar a respaldo local
  }

  // 2. Respaldo local
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const raw = fs.readFileSync(CONFIG_FILE, 'utf8')
      const parsed = JSON.parse(raw)
      return {
        ...DEFAULT_CONFIG,
        ...parsed,
        proximo_backup_at: parsed.activo ? (parsed.proximo_backup_at || calcularProximaEjecucion(parsed)) : null,
      }
    }
  } catch {
    // Retornar defaults
  }

  const initial = { ...DEFAULT_CONFIG }
  initial.proximo_backup_at = calcularProximaEjecucion(initial)
  return initial
}

// Guardar configuración
export async function saveBackupConfig(newConfig, usuario = 'Sistema') {
  ensureDirectories()

  const config = {
    ...DEFAULT_CONFIG,
    ...newConfig,
    updated_at: new Date().toISOString(),
    updated_by: usuario,
  }

  config.proximo_backup_at = config.activo ? calcularProximaEjecucion(config) : null

  // 1. Guardar en Supabase
  try {
    await supabaseAdmin
      .from('sistema_backup_config')
      .upsert({
        id: 1,
        activo: config.activo,
        frecuencia: config.frecuencia,
        hora: config.hora,
        dia_semana: Number(config.dia_semana || 0),
        dia_mes: Number(config.dia_mes || 1),
        dias_retencion: Number(config.dias_retencion || 30),
        ultimo_backup_at: config.ultimo_backup_at,
        proximo_backup_at: config.proximo_backup_at,
        updated_at: config.updated_at,
        updated_by: config.updated_by,
      })
  } catch {
    // Continuar a local
  }

  // 2. Guardar en archivo local
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8')
  } catch (err) {
    console.error('[BackupService] Error al escribir config local:', err)
  }

  return config
}

// Obtener historial de backups
export async function getBackupHistorial() {
  ensureDirectories()

  // 1. Intentar desde Supabase
  try {
    const { data, error } = await supabaseAdmin
      .from('sistema_backup_historial')
      .select('*')
      .order('created_at', { ascending: false })

    if (!error && Array.isArray(data) && data.length > 0) {
      return data
    }
  } catch {
    // Continuar
  }

  // 2. Desde archivo local
  try {
    if (fs.existsSync(HISTORY_FILE)) {
      const raw = fs.readFileSync(HISTORY_FILE, 'utf8')
      const items = JSON.parse(raw)
      if (Array.isArray(items)) {
        return items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      }
    }
  } catch {
    // Continuar
  }

  // 3. Reconstruir desde los archivos físicos existentes en BACKUP_DIR
  try {
    const files = fs.readdirSync(BACKUP_DIR).filter((f) => f.endsWith('.json.gz') || f.endsWith('.json'))
    const reconstructed = files.map((file, idx) => {
      const stat = fs.statSync(path.join(BACKUP_DIR, file))
      const isAuto = file.includes('_automatico')
      return {
        id: `local-${idx + 1}-${stat.mtimeMs}`,
        nombre_archivo: file,
        tipo: isAuto ? 'automatico' : 'manual',
        tamano_bytes: stat.size,
        estado: 'completado',
        total_tablas: 0,
        total_registros: 0,
        formato: file.endsWith('.gz') ? 'json_gz' : 'json',
        storage_path: file,
        created_at: stat.mtime.toISOString(),
        created_by: isAuto ? 'Cron Automático' : 'Administrador',
      }
    })
    return reconstructed.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  } catch {
    return []
  }
}

// Guardar registro en historial
async function registrarEnHistorial(registro) {
  ensureDirectories()

  // 1. En Supabase
  try {
    const { data, error } = await supabaseAdmin
      .from('sistema_backup_historial')
      .insert(registro)
      .select()
      .single()

    if (!error && data) {
      // Actualizar también local
      syncHistorialLocal(data)
      return data
    }
  } catch {
    // Continuar
  }

  // 2. En archivo local
  const localItem = {
    ...registro,
    id: `bk-${Date.now()}`,
  }
  syncHistorialLocal(localItem)
  return localItem
}

function syncHistorialLocal(item) {
  try {
    let items = []
    if (fs.existsSync(HISTORY_FILE)) {
      items = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8') || '[]')
    }
    // Evitar duplicados
    items = items.filter((i) => i.id !== item.id && i.nombre_archivo !== item.nombre_archivo)
    items.unshift(item)
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(items, null, 2), 'utf8')
  } catch (err) {
    console.error('[BackupService] Error al escribir historial local:', err)
  }
}

// Asegurar existencia del bucket de Supabase Storage
async function ensureStorageBucket() {
  try {
    const { data: bucket, error } = await supabaseAdmin.storage.getBucket(STORAGE_BUCKET)
    if (error || !bucket) {
      await supabaseAdmin.storage.createBucket(STORAGE_BUCKET, { public: false })
    }
  } catch {
    // Silencioso si no hay permisos de storage
  }
}

// Realizar limpieza por retención de días
async function aplicarPoliticaRetencion(diasRetencion = 30) {
  if (!diasRetencion || diasRetencion < 1) return

  const limite = new Date()
  limite.setDate(limite.getDate() - diasRetencion)

  try {
    const historial = await getBackupHistorial()
    const expirados = historial.filter((b) => new Date(b.created_at) < limite)

    for (const exp of expirados) {
      console.log(`[BackupService] Purgando backup expirado (> ${diasRetencion} días): ${exp.nombre_archivo}`)
      await eliminarBackup(exp.id, exp.nombre_archivo)
    }
  } catch (err) {
    console.error('[BackupService] Error aplicando política de retención:', err)
  }
}

// FUNCIÓN PRINCIPAL: Generar Backup Completo
export async function generarBackupCompleto({ tipo = 'manual', usuario = 'Sistema' } = {}) {
  ensureDirectories()
  const inicio = Date.now()
  const timestamp = new Date()
  const fechaStr = timestamp.toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const baseFilename = `backup_amati_${fechaStr}_${tipo}`
  const filename = `${baseFilename}.json.gz`
  const localFilePath = path.join(BACKUP_DIR, filename)

  console.log(`[BackupService] Iniciando backup (${tipo}) por ${usuario}...`)

  const payload = {
    metadata: {
      version: '1.0.0',
      sistema: 'AMATI HIELO ERP',
      timestamp: timestamp.toISOString(),
      tipo,
      generado_por: usuario,
      tablas_incluidas: [],
      estadisticas: {},
    },
    tablas: {},
  }

  let totalTablas = 0
  let totalRegistros = 0

  // 1. Obtener lista de tablas dinámicas si existen
  let tablasADescargar = [...TABLAS_SISTEMA]
  try {
    const { data: dynamicTables } = await supabaseAdmin
      .from('tabla_estructura')
      .select('nombre_interno')

    if (Array.isArray(dynamicTables)) {
      for (const dt of dynamicTables) {
        if (dt.nombre_interno && !tablasADescargar.includes(dt.nombre_interno)) {
          tablasADescargar.push(dt.nombre_interno)
        }
      }
    }
  } catch {
    // Continuar con tablas fijas
  }

  // 2. Extraer datos de cada tabla
  for (const tabla of tablasADescargar) {
    try {
      const { data, error } = await supabaseAdmin
        .from(tabla)
        .select('*')

      if (!error && Array.isArray(data)) {
        payload.tablas[tabla] = data
        payload.metadata.tablas_incluidas.push(tabla)
        payload.metadata.estadisticas[tabla] = data.length
        totalTablas++
        totalRegistros += data.length
      }
    } catch {
      // Ignorar tablas no creadas aún
    }
  }

  payload.metadata.total_tablas = totalTablas
  payload.metadata.total_registros = totalRegistros

  // 3. Serializar y comprimir con GZIP
  const rawJson = JSON.stringify(payload, null, 2)
  const hash = crypto.createHash('sha256').update(rawJson).digest('hex')
  payload.metadata.checksum_sha256 = hash

  const compressedBuffer = zlib.gzipSync(Buffer.from(rawJson, 'utf8'))
  const tamanoBytes = compressedBuffer.length

  // 4. Guardar archivo comprimido en disco local
  fs.writeFileSync(localFilePath, compressedBuffer)
  console.log(`[BackupService] Archivo guardado localmente: ${filename} (${(tamanoBytes / 1024).toFixed(1)} KB)`)

  // 5. Intentar respaldo adicional en Supabase Storage
  let storagePath = filename
  try {
    await ensureStorageBucket()
    const { error: storageError } = await supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .upload(filename, compressedBuffer, {
        contentType: 'application/gzip',
        upsert: true,
      })

    if (!storageError) {
      storagePath = `${STORAGE_BUCKET}/${filename}`
      console.log(`[BackupService] Copia sincronizada en Supabase Storage: ${storagePath}`)
    }
  } catch {
    // Si falla storage en la nube, el archivo local es 100% suficiente
  }

  // 6. Registrar en el historial
  const registro = {
    nombre_archivo: filename,
    tipo,
    tamano_bytes: tamanoBytes,
    estado: 'completado',
    total_tablas: totalTablas,
    total_registros: totalRegistros,
    formato: 'json_gz',
    checksum: hash,
    storage_path: storagePath,
    metadata: {
      duracion_ms: Date.now() - inicio,
      tablas: payload.metadata.tablas_incluidas,
    },
    created_at: timestamp.toISOString(),
    created_by: usuario,
  }

  const savedRecord = await registrarEnHistorial(registro)

  // 7. Actualizar último backup y próximo en configuración
  const currentConfig = await getBackupConfig()
  await saveBackupConfig({
    ...currentConfig,
    ultimo_backup_at: timestamp.toISOString(),
    proximo_backup_at: currentConfig.activo ? calcularProximaEjecucion(currentConfig) : null,
  }, usuario)

  // 8. Aplicar retención (purgar antiguos)
  await aplicarPoliticaRetencion(currentConfig.dias_retencion || 30)

  console.log(`[BackupService] Backup finalizado con éxito en ${Date.now() - inicio}ms. Total tablas: ${totalTablas}, registros: ${totalRegistros}`)

  return {
    ...savedRecord,
    duracionMs: Date.now() - inicio,
    tablas: payload.metadata.tablas_incluidas,
  }
}

// Obtener ruta del archivo para descarga
export async function getBackupFilePath(idOrFilename) {
  ensureDirectories()

  // Si pasaron nombre de archivo directo
  let filename = idOrFilename
  if (typeof idOrFilename === 'number' || !idOrFilename.includes('.json')) {
    const historial = await getBackupHistorial()
    const found = historial.find((h) => String(h.id) === String(idOrFilename) || h.nombre_archivo === idOrFilename)
    if (found) {
      filename = found.nombre_archivo
    }
  }

  const localPath = path.join(BACKUP_DIR, filename)
  if (fs.existsSync(localPath)) {
    return {
      filePath: localPath,
      filename,
      contentType: filename.endsWith('.gz') ? 'application/gzip' : 'application/json',
    }
  }

  // Si no está local, intentar descargarlo desde Supabase Storage
  try {
    const { data, error } = await supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .download(filename)

    if (!error && data) {
      const buffer = Buffer.from(await data.arrayBuffer())
      fs.writeFileSync(localPath, buffer)
      return {
        filePath: localPath,
        filename,
        contentType: filename.endsWith('.gz') ? 'application/gzip' : 'application/json',
      }
    }
  } catch {
    // Continuar
  }

  return null
}

// Eliminar un backup
export async function eliminarBackup(id, filename) {
  ensureDirectories()

  let targetFilename = filename
  if (!targetFilename && id) {
    const historial = await getBackupHistorial()
    const found = historial.find((h) => String(h.id) === String(id))
    if (found) targetFilename = found.nombre_archivo
  }

  // 1. Eliminar de disco local
  if (targetFilename) {
    const localPath = path.join(BACKUP_DIR, targetFilename)
    if (fs.existsSync(localPath)) {
      try {
        fs.unlinkSync(localPath)
      } catch (err) {
        console.error('[BackupService] Error al borrar archivo local:', err)
      }
    }
  }

  // 2. Eliminar de Supabase Storage
  if (targetFilename) {
    try {
      await supabaseAdmin.storage.from(STORAGE_BUCKET).remove([targetFilename])
    } catch {
      // Ignorar
    }
  }

  // 3. Eliminar de Supabase historial
  try {
    if (id && !String(id).startsWith('local-') && !String(id).startsWith('bk-')) {
      await supabaseAdmin
        .from('sistema_backup_historial')
        .delete()
        .eq('id', Number(id))
    }
  } catch {
    // Ignorar
  }

  // 4. Eliminar de historial local
  try {
    if (fs.existsSync(HISTORY_FILE)) {
      const items = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8') || '[]')
      const filtered = items.filter((i) => String(i.id) !== String(id) && i.nombre_archivo !== targetFilename)
      fs.writeFileSync(HISTORY_FILE, JSON.stringify(filtered, null, 2), 'utf8')
    }
  } catch {
    // Ignorar
  }

  return true
}
