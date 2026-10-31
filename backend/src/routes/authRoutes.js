import { Router } from 'express';
import { register, login } from '../controllers/authController.js';
import {
  registerValidation,
  loginValidation,
  validate,
} from '../middleware/validators.js';
import { protect } from '../middleware/auth.js';

const router = Router();

// POST /api/auth/register
router.post('/register', registerValidation, validate, register);

// POST /api/auth/login
router.post('/login', loginValidation, validate, login);

// GET /api/auth/me (Protected endpoint)
router.get('/me', protect, (req, res) => {
  res.status(200).json({
    success: true,
    data: { user: req.user },
  });
});

export default router;
