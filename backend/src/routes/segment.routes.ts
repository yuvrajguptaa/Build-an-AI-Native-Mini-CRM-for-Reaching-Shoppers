import { Router } from 'express';
import { aiSegmentBuild, listSegments, createSegment, getSegment } from '../controllers/segment.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();
router.use(authMiddleware as any);
router.post('/ai-build', aiSegmentBuild as any);
router.get('/', listSegments as any);
router.post('/', createSegment as any);
router.get('/:id', getSegment as any);
export default router;
