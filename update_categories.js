import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    description: { type: String, default: '' },
    image: { type: String, default: '' },
    displayOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const Category = mongoose.models.Category || mongoose.model('Category', categorySchema);

const newCategories = [
  {
    name: 'Summer Fabric',
    slug: 'summer-fabric',
    description: 'Lightweight, feather-soft, breathable summer modest wear.',
    image: 'https://thehijabeez.com.pk/cdn/shop/files/BLACK_b6cd05ea-4450-49f6-b137-f4f17cd97338.png?v=1785438046&width=1200',
    displayOrder: 1,
    isActive: true,
  },
  {
    name: 'Winter Fabric',
    slug: 'winter-fabric',
    description: 'Warm, cozy, and structured winter modest fabrics and abayas.',
    image: '/bussines.jpg',
    displayOrder: 2,
    isActive: true,
  },
  {
    name: 'Niqab Patti',
    slug: 'niqab-patti',
    description: 'Comfortable daily wear niqab patti with tie-backs.',
    image: '/University.jpg',
    displayOrder: 3,
    isActive: true,
  },
  {
    name: 'Saudi Niqab',
    slug: 'saudi-niqab',
    description: 'Authentic Saudi style layered soft chiffon niqabs.',
    image: '/fancy.jpg',
    displayOrder: 4,
    isActive: true,
  },
  {
    name: 'Scarf & Hijab',
    slug: 'scarf-hijab',
    description: 'Premium matching georgette and chiffon scarves.',
    image: '/images/cat-party-wear-abaya.jpg',
    displayOrder: 5,
    isActive: true,
  },
];

async function updateCategories() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected successfully');

    for (const cat of newCategories) {
      await Category.findOneAndUpdate(
        { slug: cat.slug },
        { $set: cat },
        { upsert: true, new: true }
      );
      console.log(`Updated/Created: ${cat.name}`);
    }

    console.log('All 5 categories updated successfully in DB!');
    process.exit(0);
  } catch (err) {
    console.error('Error updating categories:', err.message);
    process.exit(1);
  }
}

updateCategories();
