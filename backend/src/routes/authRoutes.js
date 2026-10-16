import { Router } from 'express';
import { register } from '../controllers/authController.js';
import {
  registerValidation,
  validate,
} from '../middleware/validators.js';

const router = Router();

// POST /api/auth/register
router.post('/register', registerValidation, validate, register);

export default router;
