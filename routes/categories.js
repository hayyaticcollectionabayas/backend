import { Router } from 'express';
import { Category } from '../models/index.js';

const router = Router();

router.get('/', async (_req, res, next) => {
  try {
    const categories = await Category.find({ isActive: true }).sort({ displayOrder: 1, name: 1 }).lean();
    res.json({ success: true, categories });
  } catch (error) {
    next(error);
  }
});

export default router;
