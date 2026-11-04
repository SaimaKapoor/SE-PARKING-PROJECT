import { Router } from 'express';
import { getSlots, getSlotById, updateSlotStatus } from '../controllers/slotController.js';

const router = Router();

// GET /api/slots - List slots with optional filtering (?status=AVAILABLE&type=4-wheeler&floor=1)
router.get('/', getSlots);

// GET /api/slots/:id - Get specific slot by MongoDB _id or slotNumber/slotId
router.get('/:id', getSlotById);

// PUT /api/slots/:id/status - Update slot status (AVAILABLE / RESERVED / OCCUPIED)
router.put('/:id/status', updateSlotStatus);

export default router;

