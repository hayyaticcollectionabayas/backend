import mongoose from 'mongoose';

const stockLogSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true,
    },
    change: {
      type: Number,
      required: true,
    },
    reason: {
      type: String,
      required: true,
    },
    previousStock: {
      type: Number,
      required: true,
    },
    newStock: {
      type: Number,
      required: true,
    },
    by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const StockLog = mongoose.models.StockLog || mongoose.model('StockLog', stockLogSchema);
export default StockLog;
