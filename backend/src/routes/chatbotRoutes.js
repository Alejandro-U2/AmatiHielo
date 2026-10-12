import { Router } from 'express'
import { downloadInventoryReport, sendChatbotMessage } from '../controllers/chatbotController.js'
import { requireSession } from '../middleware/requireSession.js'

const router = Router()

router.post('/message', requireSession, sendChatbotMessage)
router.post('/report', requireSession, downloadInventoryReport)

export default router
