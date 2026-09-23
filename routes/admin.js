import { Router } from 'express';
import multer from 'multer';
import { authorize, protect } from '../middleware/auth.js';
import {
  createCategory, createProduct, deleteCategory, deleteProduct, getDashboard, getSettings,
  listCategories, listOrders, listProducts, updateCategory, updateOrderStatus, updateSettings, uploadImage,
} from '../controllers/adminController.js';

const router = Router();
router.use(protect, authorize('admin', 'superadmin'));

// Image upload — memory storage (buffer sent to Cloudinary)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 }, // 8 MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed.'));
  },
});

router.post('/upload', upload.single('image'), uploadImage);

router.get('/dashboard', getDashboard);
router.get('/products', listProducts);
router.post('/products', createProduct);
router.delete('/products/:productId', deleteProduct);
router.get('/orders', listOrders);
router.patch('/orders/:orderId/status', updateOrderStatus);
router.get('/categories', listCategories);
router.post('/categories', createCategory);
router.patch('/categories/:categoryId', updateCategory);
router.delete('/categories/:categoryId', deleteCategory);
router.get('/settings', getSettings);
router.patch('/settings', updateSettings);

export default router;
