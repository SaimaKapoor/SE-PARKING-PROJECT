import { Router } from 'express';
import {
  createReservation,
  getReservations,
  getReservationById,
  cancelReservation,
} from '../controllers/reservationController.js';
import { protect } from '../middleware/auth.js';

const router = Router();

// All reservation endpoints require authentication
router.use(protect);

// POST /api/reservations - Create a new reservation
router.post('/', createReservation);

// GET /api/reservations - Retrieve user's reservations
router.get('/', getReservations);

// GET /api/reservations/:id - Retrieve specific reservation
router.get('/:id', getReservationById);

// PUT /api/reservations/:id/cancel - Cancel reservation
router.put('/:id/cancel', cancelReservation);

// DELETE /api/reservations/:id - Also support delete as cancel
router.delete('/:id', cancelReservation);

export default router;

