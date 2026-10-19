import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { processMockPayment } from '../controllers/paymentController.js';

const router = Router();
router.use(requireAuth);
router.post('/', processMockPayment);
export default router;
