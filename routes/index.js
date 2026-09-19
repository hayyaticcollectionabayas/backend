import { Router } from 'express';
import authRoutes from './auth.js';
import adminRoutes from './admin.js';
import orderRoutes from './orders.js';
import productRoutes from './products.js';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({ success: true, message: 'Hayyatic Collection API is running' });
});

// Auth routes — /api/auth/*
router.use('/auth', authRoutes);
router.use('/admin', adminRoutes);
router.use('/orders', orderRoutes);
router.use('/products', productRoutes);

export default router;
