import mongoose from 'mongoose';
import { CLIENT_CANCELLABLE_STATUSES, Notification, Order, Product, Settings } from '../models/index.js';
import { sendNewOrderEmails, sendOrderStatusEmails } from '../services/email.js';

const view = (order) => ({
  _id: order._id,
  orderNumber: order.orderNumber,
  items: order.items,
  total: order.total,
  status: order.status,
  paymentMethod: order.paymentMethod,
  paymentStatus: order.paymentStatus,
  shippingAddress: order.shippingAddress,
  cancellation: order.cancellation,
  statusHistory: order.statusHistory,
  placedAt: order.placedAt,
  courier: order.courier,
});

// ─── Create Order (Guest or Registered User) ───────────────────────────────────
export const createOrder = async (req, res, next) => {
  try {
    const { items, shippingAddress, paymentMethod, guestEmail } = req.body;

    if (
      !Array.isArray(items) ||
      !items.length ||
      !shippingAddress?.name ||
      !shippingAddress?.phone ||
      !shippingAddress?.street ||
      !shippingAddress?.city
    ) {
      return res.status(400).json({
        success: false,
        message: 'Items and a complete delivery address (name, phone, street, city) are required.',
      });
    }

    const customerEmail = (req.user?.email || guestEmail || shippingAddress?.email || '').trim().toLowerCase();
    if (!customerEmail) {
      return res.status(400).json({
        success: false,
        message: 'A valid email address is required so we can send your order confirmation.',
      });
    }

    const settings = await Settings.getSettings();
    if (paymentMethod === 'COD' && !settings.codEnabled) {
      return res.status(400).json({ success: false, message: 'Cash on Delivery is currently unavailable.' });
    }

    const prepared = [];
    const stockUpdates = [];

    for (const item of items) {
      if (!item.product || !mongoose.isValidObjectId(item.product)) {
        return res.status(400).json({
          success: false,
          message: 'One or more items in your cart have an invalid or outdated product reference. Please refresh your cart.',
        });
      }
      const product = await Product.findOne({ _id: item.product, isActive: true, isDeleted: false });
      const qty = Number(item.qty);
      if (!product || !Number.isInteger(qty) || qty < 1) {
        return res.status(400).json({ success: false, message: 'One or more products are invalid.' });
      }
      if (qty > product.stock) {
        return res.status(400).json({ success: false, message: `${product.name} has only ${product.stock} piece(s) available.` });
      }
      stockUpdates.push({ product, qty });
      prepared.push({
        product: product._id,
        name: product.name,
        image: product.images?.[0]?.url || '',
        size: item.size || '',
        color: item.color || '',
        price: product.salePrice ?? product.price,
        qty,
      });
    }

    // Deduct stock
    await Promise.all(
      stockUpdates.map(({ product, qty }) =>
        Product.updateOne({ _id: product._id, stock: { $gte: qty } }, { $inc: { stock: -qty, soldCount: qty } })
      )
    );

    const subtotal = prepared.reduce((sum, item) => sum + item.price * item.qty, 0);

    const order = await Order.create({
      user: req.user?._id || null,
      guestEmail: req.user ? '' : customerEmail,
      items: prepared,
      shippingAddress: {
        ...shippingAddress,
        email: customerEmail,
      },
      subtotal,
      total: subtotal,
      paymentMethod,
      paymentStatus: 'PENDING',
      status: paymentMethod === 'COD' ? 'CONFIRMED' : 'PENDING_PAYMENT',
      statusHistory: [
        {
          status: paymentMethod === 'COD' ? 'CONFIRMED' : 'PENDING_PAYMENT',
          note: req.user ? 'Order placed by registered user' : 'Order placed as guest',
          changedBy: req.user?._id || null,
        },
      ],
    });

    // Create notifications
    const notifications = [
      {
        user: null, // Admin
        type: 'NEW_ORDER',
        title: 'New order received',
        message: `${order.orderNumber} has been placed (${req.user ? 'User' : 'Guest'}).`,
        orderId: order._id,
      },
    ];
    if (req.user?._id) {
      notifications.push({
        user: req.user._id,
        type: 'ORDER_PLACED',
        title: 'Order received',
        message: `Your order ${order.orderNumber} has been received.`,
        orderId: order._id,
      });
    }
    await Notification.create(notifications);

    // Send confirmation emails (admin + customer)
    sendNewOrderEmails(order, customerEmail).catch((err) => {
      console.error('[Email Send Error]', err.message);
    });

    res.status(201).json({ success: true, order: view(order) });
  } catch (error) {
    next(error);
  }
};

// ─── Public Track Order by Order Number ────────────────────────────────────────
export const trackOrder = async (req, res, next) => {
  try {
    const { orderNumber } = req.params;
    if (!orderNumber) {
      return res.status(400).json({ success: false, message: 'Order number is required.' });
    }

    const cleanOrderNumber = orderNumber.trim().toUpperCase();
    const order = await Order.findOne({ orderNumber: cleanOrderNumber }).lean();

    if (!order) {
      return res.status(404).json({
        success: false,
        message: `Order "${cleanOrderNumber}" not found. Please verify your order number (e.g. HYT-2026-12345).`,
      });
    }

    res.json({
      success: true,
      order: {
        _id: order._id,
        orderNumber: order.orderNumber,
        status: order.status,
        placedAt: order.placedAt,
        deliveredAt: order.deliveredAt,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        subtotal: order.subtotal,
        total: order.total,
        items: (order.items || []).map((item) => ({
          name: item.name,
          image: item.image,
          size: item.size,
          color: item.color,
          price: item.price,
          qty: item.qty,
        })),
        shippingAddress: {
          name: order.shippingAddress?.name,
          city: order.shippingAddress?.city,
          state: order.shippingAddress?.state,
        },
        courier: order.courier || {},
        statusHistory: order.statusHistory || [],
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─── Authenticated User Orders ─────────────────────────────────────────────────
export const myOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({ user: req.user._id }).sort({ placedAt: -1 }).lean();
    res.json({ success: true, orders: orders.map(view) });
  } catch (error) {
    next(error);
  }
};

// ─── Cancel Order ─────────────────────────────────────────────────────────────
export const cancelMyOrder = async (req, res, next) => {
  try {
    const order = await Order.findOne({ _id: req.params.orderId, user: req.user._id });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });
    if (!CLIENT_CANCELLABLE_STATUSES.includes(order.status)) {
      return res.status(400).json({ success: false, message: 'This order can no longer be cancelled.' });
    }

    order.status = 'CANCELLED_BY_USER';
    order.cancellation = {
      by: 'USER',
      reason: req.body.reason || 'Cancelled by customer',
      at: new Date(),
    };
    order.statusHistory.push({
      status: order.status,
      note: order.cancellation.reason,
      changedBy: req.user._id,
    });
    await order.save();

    await Notification.create([
      {
        user: null,
        type: 'ORDER_CANCELLED',
        title: 'Order cancelled by customer',
        message: `${order.orderNumber} was cancelled.`,
        orderId: order._id,
      },
      {
        user: req.user._id,
        type: 'ORDER_CANCELLED',
        title: 'Order cancelled',
        message: `Your order ${order.orderNumber} was cancelled.`,
        orderId: order._id,
      },
    ]);

    const customerEmail = req.user.email || order.guestEmail || order.shippingAddress?.email;
    if (customerEmail) {
      sendOrderStatusEmails(order, customerEmail, order.cancellation.reason).catch(() => {});
    }

    res.json({ success: true, order: view(order) });
  } catch (error) {
    next(error);
  }
};
