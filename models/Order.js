import mongoose from 'mongoose';

export const CLIENT_CANCELLABLE_STATUSES = ['PENDING_PAYMENT', 'CONFIRMED', 'IN_WAREHOUSE'];

const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  name: { type: String, required: true },
  image: { type: String, default: '' },
  size: { type: String, default: '' },
  color: { type: String, default: '' },
  price: { type: Number, required: true },
  qty: { type: Number, required: true, min: 1 },
});

const shippingAddressSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true },
  email: { type: String, default: '' },
  street: { type: String, required: true },
  city: { type: String, required: true },
  state: { type: String, default: '' },
  postalCode: { type: String, default: '' },
  country: { type: String, default: 'Pakistan' },
});

const statusHistorySchema = new mongoose.Schema({
  status: { type: String, required: true },
  note: { type: String, default: '' },
  changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  at: { type: Date, default: Date.now },
});

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
      default: null,
      index: true,
    },
    guestEmail: {
      type: String,
      default: '',
      trim: true,
      lowercase: true,
    },
    items: [orderItemSchema],
    shippingAddress: shippingAddressSchema,
    subtotal: { type: Number, required: true, default: 0 },
    discount: { type: Number, default: 0 },
    shippingFee: { type: Number, default: 0 },
    total: { type: Number, required: true, default: 0 },
    couponCode: { type: String, default: '' },
    paymentMethod: {
      type: String,
      enum: ['COD', 'JAZZCASH', 'EASYPAISA', 'CARD', 'BANK', 'STRIPE'],
      default: 'COD',
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ['PENDING', 'PAID', 'FAILED', 'REFUNDED'],
      default: 'PENDING',
    },
    transactionId: { type: String, default: '' },
    status: {
      type: String,
      enum: [
        'PENDING_PAYMENT',
        'CONFIRMED',
        'IN_STITCHING',
        'IN_WAREHOUSE',
        'ON_THE_WAY',
        'DELIVERED',
        'CANCELLED_BY_USER',
        'CANCELLED_BY_ADMIN',
        'REFUNDED',
      ],
      default: 'PENDING_PAYMENT',
    },
    statusHistory: [statusHistorySchema],
    courier: {
      name: { type: String, default: '' },
      trackingNumber: { type: String, default: '' },
      url: { type: String, default: '' },
    },
    cancellation: {
      by: { type: String, enum: ['USER', 'ADMIN'] },
      reason: { type: String, default: '' },
      at: { type: Date },
    },
    placedAt: {
      type: Date,
      default: Date.now,
    },
    deliveredAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Pre-validate hook for orderNumber generation if not provided
orderSchema.pre('validate', function (next) {
  if (!this.orderNumber) {
    const year = new Date().getFullYear();
    const randomNum = Math.floor(10000 + Math.random() * 90000);
    this.orderNumber = `HYT-${year}-${randomNum}`;
  }
  next();
});

const Order = mongoose.models.Order || mongoose.model('Order', orderSchema);
export default Order;
