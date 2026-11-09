import { Router } from 'express';
import { authorize, requireAuth } from '../middleware/auth.js';
import { completeSession, getActiveSessions, recordEntry, recordExit, recordStaffEntry, recordStaffExit } from '../controllers/sessionController.js';

const router = Router();
router.use(requireAuth);
router.get('/active', authorize('staff'), getActiveSessions);
router.post('/staff/entry', authorize('staff'), recordStaffEntry);
router.post('/staff/:id/exit', authorize('staff'), recordStaffExit);
router.post('/entry', recordEntry);
router.post('/exit', recordExit);
router.post('/:id/complete', completeSession);

export default router;
