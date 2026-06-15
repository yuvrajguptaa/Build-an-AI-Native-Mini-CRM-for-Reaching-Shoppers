import { Router } from 'express';
import { aiGenerateCampaign, aiAssistantChat } from '../controllers/ai.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();
router.use(authMiddleware as any);
router.post('/generate-campaign', aiGenerateCampaign as any);
router.post('/chat', aiAssistantChat as any);
export default router;
