import { Router } from 'express';
import { getAdminTransactionRecords } from '../controllers/adminController.js';
import {
  createAdminSlot,
  deleteAdminSlot,
  getSlotById,
  getSlots,
  updateAdminSlot,
  updateAdminSlotRate,
} from '../controllers/slotController.js';
import { authorize, requireAuth } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth, authorize('admin'));
router.get('/transactions', getAdminTransactionRecords);
router.get('/slots', getSlots);
router.post('/slots', createAdminSlot);
router.get('/slots/:id', getSlotById);
router.put('/slots/:id/rate', updateAdminSlotRate);
router.put('/slots/:id', updateAdminSlot);
router.delete('/slots/:id', deleteAdminSlot);

export default router;
