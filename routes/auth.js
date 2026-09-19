import { Router } from 'express';
import {
  register,
  login,
  getMe,
  refreshToken,
  logout,
} from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';

const router = Router();

// Public routes
router.post('/register', register);
router.post('/login', login);
router.post('/refresh', refreshToken);
router.post('/logout', logout);

// Protected routes (must be logged in)
router.get('/me', protect, getMe);

export default router;
