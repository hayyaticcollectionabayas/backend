/**
 * seedDemo.js — Full Admin Dashboard Demo Data Seeder
 * Seeds: Users (admin + customers), Orders (30 days of realistic data), Settings
 * Run: node seed/seedDemo.js
 */

import 'dotenv/config';
import mongoose from 'mongoose';

// ─── Models ───────────────────────────────────────────────────────────────────
import User from '../models/User.js';
import Order from '../models/Order.js';
import Settings from '../models/Settings.js';
import { Category, Product } from '../models/index.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const daysAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return d; };
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const orderNum = (n) => `HYT-2026-${String(n).padStart(5, '0')}`;

// ─── Customer Names & Cities ──────────────────────────────────────────────────
const CUSTOMERS = [
  { name: 'Ayesha Zafar',     phone: '+923001112233', city: 'Lahore',     email: 'ayesha@example.com' },
  { name: 'Fatima Malik',     phone: '+923009998877', city: 'Karachi',    email: 'fatima@example.com' },
  { name: 'Sana Qureshi',     phone: '+923336667788', city: 'Islamabad',  email: 'sana@example.com' },
  { name: 'Maryam Iqbal',     phone: '+923124445566', city: 'Faisalabad', email: 'maryam@example.com' },
  { name: 'Zainab Hussain',   phone: '+923451234567', city: 'Multan',     email: 'zainab@example.com' },
  { name: 'Nadia Rehman',     phone: '+923008887766', city: 'Rawalpindi', email: 'nadia@example.com' },
  { name: 'Huma Tariq',       phone: '+923219876543', city: 'Peshawar',   email: 'huma@example.com' },
  { name: 'Rabia Shaheen',    phone: '+923441122334', city: 'Quetta',     email: 'rabia@example.com' },
  { name: 'Amna Siddiqui',    phone: '+923551234432', city: 'Sialkot',    email: 'amna@example.com' },
  { name: 'Bushra Nawaz',     phone: '+923661234321', city: 'Gujranwala', email: 'bushra@example.com' },
];

const STATUSES = ['PENDING_PAYMENT', 'CONFIRMED', 'IN_STITCHING', 'IN_WAREHOUSE', 'ON_THE_WAY', 'DELIVERED', 'CANCELLED_BY_ADMIN'];
const PAYMENT_METHODS = ['COD'];
const SIZES = ['S', 'M', 'L', 'XL', 'XXL'];
const COLORS = ['Black', 'Emerald Green', 'Navy Blue', 'Maroon', 'Dusty Pink'];

// ─── Main Seed ────────────────────────────────────────────────────────────────
const run = async () => {
  try {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) throw new Error('MONGO_URI is not set in .env');

    console.log('\n🔌  Connecting to MongoDB Atlas...');
    await mongoose.connect(mongoUri);
    console.log('✅  Connected!\n');

    // ── Step 1: Seed Admin + Demo Users ──────────────────────────────────────
    console.log('👤  Seeding users...');
    await User.deleteMany({});

    const admin = await User.create({
      name: 'Hayyatic Admin',
      email: 'admin@hayyatic.com',
      phone: '+923001000001',
      passwordHash: 'admin123',
      role: 'admin',
      isVerified: true,
    });

    // Create customer users
    const customerUsers = [];
    for (let i = 0; i < CUSTOMERS.length; i++) {
      const c = CUSTOMERS[i];
      const u = await User.create({
        name: c.name,
        email: c.email,
        phone: c.phone,
        passwordHash: 'User1234!',
        role: 'user',
        isVerified: true,
        lastLogin: daysAgo(rand(1, 15)),
      });
      customerUsers.push({ ...c, _id: u._id });
    }
    console.log(`   ✓ Admin:     admin@hayyatic.com / admin123`);
    console.log(`   ✓ Customers: ${customerUsers.length} demo customers created`);

    // ── Step 2: Get Products from DB ──────────────────────────────────────────
    console.log('\n📦  Loading products...');
    const products = await Product.find({ isDeleted: false }).lean();
    if (products.length === 0) {
      console.log('   ⚠️  No products found. Run "npm run seed" first, then re-run this script.');
      process.exit(1);
    }
    console.log(`   ✓ Found ${products.length} products`);

    // ── Step 3: Delete existing orders ───────────────────────────────────────
    console.log('\n🗑️   Clearing existing orders...');
    await Order.deleteMany({});

    // ── Step 4: Create 40 realistic demo orders ───────────────────────────────
    console.log('🛒  Creating demo orders...');

    const ordersData = [];

    // --- Last 30 days: varied statuses, good revenue ---
    for (let i = 0; i < 35; i++) {
      const customer = pick(customerUsers);
      const product1 = pick(products);
      const product2 = pick(products);
      const qty1 = rand(1, 2);
      const qty2 = rand(1, 1);
      const p1Price = product1.salePrice || product1.price;
      const p2Price = product2.salePrice || product2.price;

      const useTwo = Math.random() > 0.5;
      const items = [
        {
          product: product1._id,
          name: product1.name,
          image: product1.images?.[0]?.url || '',
          size: pick(SIZES),
          color: pick(COLORS),
          price: p1Price,
          qty: qty1,
        },
      ];
      if (useTwo && product2._id.toString() !== product1._id.toString()) {
        items.push({
          product: product2._id,
          name: product2.name,
          image: product2.images?.[0]?.url || '',
          size: pick(SIZES),
          color: pick(COLORS),
          price: p2Price,
          qty: qty2,
        });
      }

      const subtotal = items.reduce((sum, it) => sum + it.price * it.qty, 0);
      const shippingFee = subtotal >= 10000 ? 0 : 200;
      const total = subtotal + shippingFee;

      // Spread orders over 30 days — more recent orders more likely to be PENDING/CONFIRMED
      const daysOld = rand(0, 29);
      const statusWeight = daysOld < 3
        ? pick(['PENDING_PAYMENT', 'CONFIRMED', 'IN_STITCHING'])
        : daysOld < 10
        ? pick(['CONFIRMED', 'IN_STITCHING', 'IN_WAREHOUSE', 'ON_THE_WAY'])
        : pick(['DELIVERED', 'DELIVERED', 'DELIVERED', 'IN_STITCHING', 'CANCELLED_BY_ADMIN']);

      const paymentMethod = pick(PAYMENT_METHODS);
      const placedAt = daysAgo(daysOld);

      ordersData.push({
        orderNumber: orderNum(1000 + i),
        user: customer._id,
        items,
        shippingAddress: {
          name: customer.name,
          phone: customer.phone,
          email: customer.email,
          street: `${rand(1, 500)} ${pick(['Main Blvd', 'Model Town', 'Gulberg', 'DHA Phase', 'Johar Town', 'Bahria Town'])}`,
          city: customer.city,
          state: '',
          postalCode: String(rand(10000, 99999)),
          country: 'Pakistan',
        },
        subtotal,
        shippingFee,
        total,
        paymentMethod,
        paymentStatus: statusWeight === 'DELIVERED' ? 'PAID'
          : statusWeight === 'CANCELLED_BY_ADMIN' ? 'REFUNDED'
          : paymentMethod === 'COD' ? 'PENDING' : 'PAID',
        status: statusWeight,
        statusHistory: [
          { status: 'PENDING_PAYMENT', note: '', at: placedAt },
          ...(statusWeight !== 'PENDING_PAYMENT' ? [{ status: 'CONFIRMED', note: '', at: new Date(placedAt.getTime() + 3600000) }] : []),
        ],
        ...(statusWeight === 'CANCELLED_BY_ADMIN'
          ? { cancellation: { by: 'ADMIN', reason: 'Out of stock — customer informed', at: new Date(placedAt.getTime() + 86400000) } }
          : {}),
        ...(statusWeight === 'DELIVERED'
          ? { deliveredAt: new Date(placedAt.getTime() + 4 * 86400000) }
          : {}),
        placedAt,
      });
    }

    // --- 5 older orders (31-60 days ago) mostly DELIVERED ---
    for (let i = 0; i < 5; i++) {
      const customer = pick(customerUsers);
      const product = pick(products);
      const p = product.salePrice || product.price;
      const subtotal = p * rand(1, 3);
      const shippingFee = subtotal >= 10000 ? 0 : 200;
      const total = subtotal + shippingFee;
      const daysOld = rand(31, 60);
      const placedAt = daysAgo(daysOld);

      ordersData.push({
        orderNumber: orderNum(2000 + i),
        user: customer._id,
        items: [{
          product: product._id,
          name: product.name,
          image: product.images?.[0]?.url || '',
          size: pick(SIZES),
          color: pick(COLORS),
          price: p,
          qty: rand(1, 3),
        }],
        shippingAddress: {
          name: customer.name,
          phone: customer.phone,
          email: customer.email,
          street: `House ${rand(1, 200)}, Block ${pick(['A', 'B', 'C', 'D'])}`,
          city: customer.city,
          state: '',
          postalCode: String(rand(10000, 99999)),
          country: 'Pakistan',
        },
        subtotal,
        shippingFee,
        total,
        paymentMethod: pick(PAYMENT_METHODS),
        paymentStatus: 'PAID',
        status: 'DELIVERED',
        statusHistory: [{ status: 'DELIVERED', note: '', at: placedAt }],
        deliveredAt: new Date(placedAt.getTime() + 5 * 86400000),
        placedAt,
      });
    }

    const createdOrders = await Order.insertMany(ordersData);
    console.log(`   ✓ ${createdOrders.length} demo orders created`);

    // ── Step 5: Seed Store Settings ───────────────────────────────────────────
    console.log('\n⚙️   Seeding store settings...');
    await Settings.findByIdAndUpdate(
      'global',
      {
        _id: 'global',
        codEnabled: true,
        codAllowedCities: ['Lahore', 'Karachi', 'Islamabad', 'Rawalpindi', 'Faisalabad', 'Multan', 'Peshawar', 'Quetta', 'Sialkot', 'Gujranwala'],
        codMaxOrderValue: 50000,
        freeShippingThreshold: 10000,
        shippingRates: [
          { city: 'Lahore', fee: 150 },
          { city: 'Karachi', fee: 250 },
          { city: 'Islamabad', fee: 200 },
          { city: 'Rawalpindi', fee: 200 },
          { city: 'Faisalabad', fee: 200 },
          { city: 'Multan', fee: 200 },
          { city: 'Peshawar', fee: 250 },
          { city: 'Quetta', fee: 300 },
        ],
        storeInfo: {
          phone: '+92 300 1234567',
          email: 'hayyaticcollectionabayas@gmail.com',
          address: 'Lahore, Pakistan',
          socialLinks: {
            instagram: 'https://instagram.com/hayyatic',
            facebook: 'https://facebook.com/hayyatic',
            whatsapp: '+923001234567',
          },
        },
        announcementBar: '🌙 Free shipping on orders over Rs. 10,000 | COD available across Pakistan',
        seoDefaults: {
          metaTitle: 'Hayyatic Collection — Premium Abayas Pakistan',
          metaDesc: 'Discover luxury and modest fashion with Hayyatic Collection. Premium abayas delivered across Pakistan.',
        },
      },
      { upsert: true, new: true }
    );
    console.log('   ✓ Store settings configured');

    // ── Summary ───────────────────────────────────────────────────────────────
    const totalRevenue = ordersData
      .filter((o) => !['CANCELLED_BY_ADMIN', 'CANCELLED_BY_USER', 'REFUNDED'].includes(o.status))
      .reduce((sum, o) => sum + o.total, 0);

    console.log('\n╔══════════════════════════════════════════╗');
    console.log('║       DEMO SEED COMPLETE ✅              ║');
    console.log('╠══════════════════════════════════════════╣');
    console.log(`║  Admin:     admin@hayyatic.com           ║`);
    console.log(`║  Password:  admin123                     ║`);
    console.log(`║  Users:     ${customerUsers.length + 1} (1 admin + ${customerUsers.length} customers)`.padEnd(43) + '║');
    console.log(`║  Orders:    ${createdOrders.length}`.padEnd(43) + '║');
    console.log(`║  Revenue:   Rs. ${totalRevenue.toLocaleString()}`.padEnd(43) + '║');
    console.log(`║  Products:  ${products.length} (from existing seed)`.padEnd(43) + '║');
    console.log('╚══════════════════════════════════════════╝\n');

    process.exit(0);
  } catch (err) {
    console.error('\n❌  Seed failed:', err.message);
    process.exit(1);
  }
};

run();
