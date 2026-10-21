import { Router } from 'express';
import {
  registerVehicle,
  getVehicles,
} from '../controllers/vehicleController.js';
import {
  vehicleValidation,
  validate,
} from '../middleware/validators.js';
import { protect } from '../middleware/auth.js';

const router = Router();

// All vehicle endpoints require authentication
router.use(protect);

// POST /api/vehicles - Register new vehicle linked to user
router.post('/', vehicleValidation, validate, registerVehicle);

// GET /api/vehicles - Retrieve all vehicles for authenticated user
router.get('/', getVehicles);

export default router;
