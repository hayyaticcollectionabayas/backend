import { v2 as cloudinary } from 'cloudinary';
import { Product } from '../models/index.js';
import { sendOrderStatusEmails } from '../services/email.js';
import { Category, Order, Settings, User } from '../models/index.js';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const activeOrderFilter = { status: { $nin: ['CANCELLED_BY_USER', 'CANCELLED_BY_ADMIN', 'REFUNDED'] } };

const serializeOrder = (order) => ({
  _id: order._id,
  orderNumber: order.orderNumber,
  customer: order.shippingAddress?.name || '—',
  phone: order.shippingAddress?.phone || '—',
  city: order.shippingAddress?.city || '—',
  items: order.items?.length || 0,
  total: order.total,
  paymentMethod: order.paymentMethod,
  paymentStatus: order.paymentStatus,
  status: order.status,
  placedAt: order.placedAt,
  createdAt: order.createdAt,
});

// ── Image Upload ──────────────────────────────────────────────────────────────
export const uploadImage = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file provided.' });

    // Check Cloudinary config
    if (!process.env.CLOUDINARY_CLOUD_NAME) {
      // Fallback: return a placeholder if Cloudinary not configured
      return res.status(503).json({ success: false, message: 'Image upload service not configured. Add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET to .env' });
    }

    // Upload buffer to Cloudinary
    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: 'hayyatic-products', resource_type: 'image', transformation: [{ width: 800, height: 1000, crop: 'fill', quality: 'auto', fetch_format: 'auto' }] },
        (error, result) => { if (error) reject(error); else resolve(result); }
      );
      stream.end(req.file.buffer);
    });

    res.json({ success: true, url: result.secure_url, publicId: result.public_id });
  } catch (error) { next(error); }
};

export const getDashboard = async (_req, res, next) => {
  try {
    const since = new Date();
    since.setDate(since.getDate() - 29);
    since.setHours(0, 0, 0, 0);

    const [products, categories, orderCount, revenue, recentOrders, dailyRows, statusRows] = await Promise.all([
      Product.countDocuments({ isDeleted: false }),
      Category.countDocuments({ isActive: true }),
      Order.countDocuments(),
      Order.aggregate([{ $match: activeOrderFilter }, { $group: { _id: null, total: { $sum: '$total' } } }]),
      Order.find().sort({ placedAt: -1, createdAt: -1 }).limit(8).lean(),
      Order.aggregate([
        { $match: { ...activeOrderFilter, placedAt: { $gte: since } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$placedAt' } }, revenue: { $sum: '$total' }, orders: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      Order.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    ]);

    const dayMap = new Map(dailyRows.map((row) => [row._id, row]));
    const daily = Array.from({ length: 30 }, (_, index) => {
      const date = new Date(since);
      date.setDate(since.getDate() + index);
      const key = date.toISOString().slice(0, 10);
      const row = dayMap.get(key);
      return { date: key, revenue: row?.revenue || 0, orders: row?.orders || 0 };
    });

    res.json({
      success: true,
      dashboard: {
        metrics: { revenue: revenue[0]?.total || 0, orders: orderCount, products, categories },
        daily,
        statuses: Object.fromEntries(statusRows.map((row) => [row._id, row.count])),
        recentOrders: recentOrders.map(serializeOrder),
      },
    });
  } catch (error) { next(error); }
};

export const listProducts = async (_req, res, next) => {
  try {
    const products = await Product.find({ isDeleted: false }).populate('category', 'name slug').sort({ createdAt: -1 }).lean();
    res.json({ success: true, products });
  } catch (error) { next(error); }
};

export const createProduct = async (req, res, next) => {
  try {
    const product = await Product.create(req.body);
    await product.populate('category', 'name slug');
    res.status(201).json({ success: true, product });
  } catch (error) { next(error); }
};

export const deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.productId, { isDeleted: true, isActive: false }, { new: true });
    if (!product) return res.status(404).json({ success: false, message: 'Product not found.' });
    res.json({ success: true, message: 'Product removed.' });
  } catch (error) { next(error); }
};

export const listOrders = async (_req, res, next) => {
  try {
    const orders = await Order.find().sort({ placedAt: -1, createdAt: -1 }).lean();
    res.json({ success: true, orders: orders.map(serializeOrder) });
  } catch (error) { next(error); }
};

export const updateOrderStatus = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.orderId);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });
    const status = req.body.status;
    const note = req.body.note || '';
    if (status === 'CANCELLED_BY_ADMIN' && !note.trim()) return res.status(400).json({ success: false, message: 'A cancellation reason is required.' });
    order.status = status;
    order.statusHistory.push({ status, note, changedBy: req.user._id });
    if (status === 'CANCELLED_BY_ADMIN') order.cancellation = { by: 'ADMIN', reason: note, at: new Date() };
    if (req.body.status === 'DELIVERED') order.deliveredAt = new Date();
    await order.save();
    const customer = await User.findById(order.user).select('email');
    sendOrderStatusEmails(order, customer?.email, note).catch(() => {});
    res.json({ success: true, order: serializeOrder(order) });
  } catch (error) { next(error); }
};

export const listCategories = async (_req, res, next) => {
  try {
    const categories = await Category.aggregate([
      { $sort: { displayOrder: 1, name: 1 } },
      { $lookup: { from: 'products', let: { categoryId: '$_id' }, pipeline: [{ $match: { $expr: { $and: [{ $eq: ['$category', '$$categoryId'] }, { $eq: ['$isDeleted', false] }] } } }, { $count: 'count' }], as: 'products' } },
      { $addFields: { productCount: { $ifNull: [{ $arrayElemAt: ['$products.count', 0] }, 0] } } },
      { $project: { products: 0 } },
    ]);
    res.json({ success: true, categories });
  } catch (error) { next(error); }
};

export const getSettings = async (_req, res, next) => {
  try { res.json({ success: true, settings: await Settings.getSettings() }); } catch (error) { next(error); }
};

export const updateSettings = async (req, res, next) => {
  try {
    const settings = await Settings.findByIdAndUpdate('global', req.body, { new: true, upsert: true, runValidators: true });
    res.json({ success: true, settings });
  } catch (error) { next(error); }
};
