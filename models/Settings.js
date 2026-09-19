import mongoose from 'mongoose';

const settingsSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: 'global',
    },
    codEnabled: {
      type: Boolean,
      default: false,
    },
    codAllowedCities: [{ type: String }],
    codMaxOrderValue: {
      type: Number,
      default: 50000,
    },
    freeShippingThreshold: {
      type: Number,
      default: 10000,
    },
    shippingRates: [
      {
        city: { type: String, required: true },
        fee: { type: Number, required: true },
      },
    ],
    storeInfo: {
      phone: { type: String, default: '' },
      email: { type: String, default: '' },
      address: { type: String, default: '' },
      socialLinks: { type: mongoose.Schema.Types.Mixed, default: {} },
    },
    banners: [
      {
        image: { type: String, required: true },
        title: { type: String, default: '' },
        link: { type: String, default: '' },
        isActive: { type: Boolean, default: true },
      },
    ],
    announcementBar: {
      type: String,
      default: '',
    },
    seoDefaults: {
      metaTitle: { type: String, default: 'Hayyatic Collection - Exclusive Abayas' },
      metaDesc: { type: String, default: 'Discover luxury and modest fashion with Hayyatic Collection.' },
    },
  },
  {
    timestamps: true,
  }
);

// Static method for getting or creating global settings
settingsSchema.statics.getSettings = async function () {
  let settings = await this.findById('global');
  if (!settings) {
    settings = await this.create({ _id: 'global' });
  }
  return settings;
};

const Settings = mongoose.models.Settings || mongoose.model('Settings', settingsSchema);
export default Settings;
