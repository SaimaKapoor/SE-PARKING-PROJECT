import { Router } from 'express';
import { login, register } from '../controllers/authController.js';
import { registerValidation, validate } from '../middleware/validators.js';

const router = Router();
router.post('/register', registerValidation, validate, register);
router.post('/login', login);

export default router;
