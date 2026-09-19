import mongoose from 'mongoose';

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
    },
    slug: {
      type: String,
      required: [true, 'Product slug is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    description: {
      type: String,
      required: [true, 'Product description is required'],
    },
    shortDescription: {
      type: String,
      default: '',
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'Product category is required'],
      index: true,
    },
    price: {
      type: Number,
      required: [true, 'Product price is required'],
      min: [0, 'Price must be non-negative'],
    },
    salePrice: {
      type: Number,
      validate: {
        validator: function (value) {
          if (value === undefined || value === null || value === '') return true;
          return value < this.price;
        },
        message: 'Sale price must be strictly less than the regular price',
      },
    },
    sku: {
      type: String,
      required: [true, 'Product SKU is required'],
      unique: true,
      trim: true,
    },
    stock: {
      type: Number,
      required: [true, 'Stock quantity is required'],
      default: 0,
      min: [0, 'Stock cannot be negative'],
    },
    lowStockThreshold: {
      type: Number,
      default: 5,
    },
    sizes: [{ type: String }],
    colors: [{ type: String }],
    fabric: {
      type: String,
      default: '',
    },
    careInstructions: {
      type: String,
      default: '',
    },
    images: [
      {
        url: { type: String, required: true },
        publicId: { type: String, default: '' },
        alt: { type: String, default: '' },
        order: { type: Number, default: 0 },
      },
    ],
    isFeatured: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    tags: [{ type: String }],
    ratingAvg: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    ratingCount: {
      type: Number,
      default: 0,
    },
    soldCount: {
      type: Number,
      default: 0,
    },
    seo: {
      metaTitle: { type: String, default: '' },
      metaDesc: { type: String, default: '' },
      focusKeyword: { type: String, default: '' },
      ogImage: { type: String, default: '' },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Compound Index
productSchema.index({ category: 1, isActive: 1, isDeleted: 1 });

// Text Index
productSchema.index({ name: 'text', description: 'text', tags: 'text', fabric: 'text' });

// Pre-save hook: auto-generate slug from name if not provided
productSchema.pre('validate', function (next) {
  if (!this.slug && this.name) {
    const baseSlug = this.name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    this.slug = baseSlug ? `${baseSlug}-${randomSuffix}` : `product-${randomSuffix}`;
  }
  next();
});

// Virtual inStock
productSchema.virtual('inStock').get(function () {
  return this.stock > 0;
});

// Virtual stockLabel
productSchema.virtual('stockLabel').get(function () {
  if (this.stock <= 0) {
    return 'Out of Stock';
  }
  if (this.stock <= this.lowStockThreshold) {
    return `Only ${this.stock} left!`;
  }
  return `In Stock — ${this.stock} pieces`;
});

const Product = mongoose.models.Product || mongoose.model('Product', productSchema);
export default Product;
