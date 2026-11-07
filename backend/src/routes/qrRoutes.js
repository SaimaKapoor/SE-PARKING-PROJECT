import express from 'express';
import { authorize, requireAuth } from '../middleware/auth.js';
import { generateReservationQr, validateReservationQr } from '../controllers/qrController.js';

const router = express.Router();

router.post('/generate', requireAuth, authorize('customer'), generateReservationQr);
router.post('/validate', requireAuth, authorize('staff'), validateReservationQr);

export default router;
