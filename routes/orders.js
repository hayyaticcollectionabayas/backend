import { Router } from 'express';
import { cancelMyOrder, createOrder, myOrders, trackOrder } from '../controllers/orderController.js';
import { protect, optionalAuth } from '../middleware/auth.js';

const router = Router();

// Public: Track order by order number (e.g. HYT-2026-12345)
router.get('/track/:orderNumber', trackOrder);

// Create order: Supports both Guests (no account needed) and Authenticated Users
router.post('/', optionalAuth, createOrder);

// Authenticated user order history & cancellation
router.get('/mine', protect, myOrders);
router.patch('/:orderId/cancel', protect, cancelMyOrder);

export default router;
