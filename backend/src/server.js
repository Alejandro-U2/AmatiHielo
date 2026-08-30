import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'
import authRoutes from './routes/authRoutes.js'

dotenv.config()

const app = express()
const port = process.env.PORT || 3001
const frontendOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

app.use(
  cors({
    origin: frontendOrigins,
    credentials: true,
  }),
)
app.use(express.json())

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'amati-backend' })
})

app.use('/auth', authRoutes)

app.use((req, res) => {
  res.status(404).json({ message: 'Ruta no encontrada.' })
})

app.use((error, req, res, next) => {
  console.error(error)
  res.status(500).json({ message: 'Error interno del servidor.' })
})

app.listen(port, () => {
  console.log(`AMATI backend escuchando en http://localhost:${port}`)
})