import { Router } from 'express';
import mongoose from 'mongoose';
import { Product } from '../models/index.js';

const router = Router();

router.get('/', async (_req, res, next) => {
  try {
    const products = await Product.find({ isActive: true, isDeleted: false }).populate('category', 'name slug').sort({ createdAt: -1 }).lean();
    res.json({ success: true, products });
  } catch (error) { next(error); }
});

router.get('/:identifier', async (req, res, next) => {
  try {
    const { identifier } = req.params;
    const query = mongoose.isValidObjectId(identifier)
      ? { $or: [{ _id: identifier }, { slug: identifier }], isActive: true, isDeleted: false }
      : { slug: identifier, isActive: true, isDeleted: false };

    const product = await Product.findOne(query).populate('category', 'name slug').lean();
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    res.json({ success: true, product });
  } catch (error) { next(error); }
});

export default router;
