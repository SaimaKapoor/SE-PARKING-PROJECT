import { Router } from 'express';
import { register, login } from '../controllers/authController.js';
import {
  registerValidation,
  loginValidation,
  validate,
} from '../middleware/validators.js';

const router = Router();

// POST /api/auth/register
router.post('/register', registerValidation, validate, register);

// POST /api/auth/login
router.post('/login', loginValidation, validate, login);

export default router;
