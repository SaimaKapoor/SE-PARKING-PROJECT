import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { completeSession, recordEntry, recordExit } from '../controllers/sessionController.js';

const router = Router();
router.use(requireAuth);
router.post('/entry', recordEntry);
router.post('/exit', recordExit);
router.post('/:id/complete', completeSession);

export default router;
