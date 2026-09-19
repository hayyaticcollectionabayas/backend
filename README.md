# Hayyatic Collection Backend API

Node.js / Express.js REST API with MongoDB Atlas for Hayyatic Collection luxury modest wear store.

## Features
- JWT Authentication & Authorization (Admin & User roles)
- Product & Category Management
- Real-time Order Placement & Tracking
- Email Notifications via Nodemailer (Gmail SMTP)
- Demo Seeder (`npm run seed` and `npm run seed:demo`)
- Cloudinary Upload support

## Setup Instructions

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create `.env` file in the root directory:
   ```env
   PORT=5000
   NODE_ENV=development
   CLIENT_URL=http://localhost:5173
   MONGO_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret
   JWT_REFRESH_SECRET=your_jwt_refresh_secret
   JWT_EXPIRE=15m
   JWT_REFRESH_EXPIRE=7d
   SMTP_USER=your_email@gmail.com
   SMTP_APP_PASSWORD=your_app_password
   ADMIN_EMAIL=your_email@gmail.com
   ```

3. Seed Demo Data:
   ```bash
   npm run seed
   npm run seed:demo
   ```

4. Start Development Server:
   ```bash
   npm run dev
   ```
