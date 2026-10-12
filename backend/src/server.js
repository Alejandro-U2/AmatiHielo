import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'
import authRoutes from './routes/authRoutes.js'
import configuracionSistemaRoutes from './routes/configuracionSistemaRoutes.js'
import chatbotRoutes from './routes/chatbotRoutes.js'
import estructuraDatosRoutes from './routes/estructuraDatosRoutes.js'
import inventarioRoutes from './routes/inventarioRoutes.js'
import posRoutes from './routes/posRoutes.js'
import recetasRoutes from './routes/recetasRoutes.js'
import usersRoutes from './routes/usersRoutes.js'

dotenv.config()

const app = express()
const port = process.env.PORT || 3001
const frontendOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

const isAllowedOrigin = (origin) => {
  if (!origin || frontendOrigins.includes(origin)) return true

  try {
    const url = new URL(origin)
    const isLocalhost = url.hostname === 'localhost' || url.hostname === '127.0.0.1'
    const isPrivateNetwork = /^192\.168\.|^10\.|^172\.(1[6-9]|2\d|3[0-1])\./.test(url.hostname)
    const isPortForward = url.hostname.endsWith('.app.github.dev') || url.hostname.endsWith('.githubpreview.dev')
    return isLocalhost || isPrivateNetwork || isPortForward
  } catch {
    return false
  }
}

app.use(
  cors({
    origin: (origin, callback) => {
      callback(null, isAllowedOrigin(origin))
    },
    credentials: true,
  }),
)
app.use(express.json({ limit: '8mb' }))

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'amati-backend' })
})

app.use('/auth', authRoutes)
app.use('/api/users', usersRoutes)
app.use('/api/configuracion-sistema', configuracionSistemaRoutes)
app.use('/api/chatbot', chatbotRoutes)
app.use('/api/estructura-datos', estructuraDatosRoutes)
app.use('/api/inventario', inventarioRoutes)
app.use('/api/pos', posRoutes)
app.use('/api/recetas', recetasRoutes)

app.use((req, res) => {
  res.status(404).json({ message: 'Ruta no encontrada.' })
})

app.use((error, req, res, _next) => {
  console.error(error)
  res.status(500).json({ message: 'Error interno del servidor.' })
})

app.listen(port, '0.0.0.0', () => {
  console.log(`AMATI backend escuchando en el puerto ${port}`)
})
