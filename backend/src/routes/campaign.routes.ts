import { Router } from 'express';
import { listCampaigns, createCampaign, getCampaign, sendCampaign } from '../controllers/campaign.controller';
import { getDashboardStats } from '../controllers/analytics.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();
router.use(authMiddleware as any);
router.get('/', listCampaigns as any);
router.post('/', createCampaign as any);
router.get('/analytics/dashboard', getDashboardStats as any);
router.get('/:id', getCampaign as any);
router.post('/:id/send', sendCampaign as any);
export default router;
