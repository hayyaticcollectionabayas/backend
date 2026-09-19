import jwt from 'jsonwebtoken';
import User from '../models/User.js';

// Helper: sign tokens
const signAccessToken = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '15m',
  });

const signRefreshToken = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d',
  });

// Helper: send tokens as cookie + body
const sendTokens = (res, user, statusCode = 200) => {
  const accessToken = signAccessToken(user._id);
  const refreshToken = signRefreshToken(user._id);

  // Refresh token in httpOnly cookie
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  res.status(statusCode).json({
    success: true,
    accessToken,
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      isVerified: user.isVerified,
    },
  });
};

// ─── REGISTER ────────────────────────────────────────────────────────────────
// POST /api/auth/register
// Body: { name, email, phone, password }
// New users always get role: 'user' — admin must be set manually in DB
export const register = async (req, res, next) => {
  try {
    const { name, email, phone, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email and password are required.' });
    }

    // Check duplicate email
    const existingEmail = await User.findOne({ email: email.toLowerCase() });
    if (existingEmail) {
      return res.status(409).json({ success: false, message: 'An account with this email already exists.' });
    }

    // Check duplicate phone (if provided)
    if (phone) {
      const existingPhone = await User.findOne({ phone });
      if (existingPhone) {
        return res.status(409).json({ success: false, message: 'This phone number is already registered.' });
      }
    }

    // Create user — role defaults to 'user' in schema
    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone: phone || `temp-${Date.now()}`, // phone required in schema, use placeholder if not given
      passwordHash: password, // bcrypt pre-save hook hashes this
      role: 'user', // explicitly set
    });

    sendTokens(res, user, 201);
  } catch (err) {
    next(err);
  }
};

// ─── LOGIN ────────────────────────────────────────────────────────────────────
// POST /api/auth/login
// Body: { email, password }
// Works for both users AND admins — role is read from MongoDB
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    // Find user, include passwordHash for comparison
    const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordHash');
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    // Check if account is blocked
    if (user.isBlocked) {
      return res.status(403).json({ success: false, message: 'Your account has been suspended. Contact support.' });
    }

    // Check lockout
    if (user.lockUntil && user.lockUntil > Date.now()) {
      const mins = Math.ceil((user.lockUntil - Date.now()) / 60000);
      return res.status(429).json({ success: false, message: `Too many failed attempts. Try again in ${mins} minute(s).` });
    }

    // Verify password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      // Increment failed attempts
      user.loginAttempts = (user.loginAttempts || 0) + 1;
      if (user.loginAttempts >= 5) {
        user.lockUntil = new Date(Date.now() + 10 * 60 * 1000); // lock 10 min
        user.loginAttempts = 0;
      }
      await user.save({ validateBeforeSave: false });
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    // Reset attempts on success
    user.loginAttempts = 0;
    user.lockUntil = undefined;
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    sendTokens(res, user);
  } catch (err) {
    next(err);
  }
};

// ─── ME (get current user) ────────────────────────────────────────────────────
// GET /api/auth/me  — protected, requires valid JWT
export const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    res.json({ success: true, user });
  } catch (err) {
    next(err);
  }
};

// ─── REFRESH TOKEN ────────────────────────────────────────────────────────────
// POST /api/auth/refresh
export const refreshToken = async (req, res, next) => {
  try {
    const token = req.cookies?.refreshToken;
    if (!token) return res.status(401).json({ success: false, message: 'No refresh token.' });

    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.id);
    if (!user || user.isBlocked) {
      return res.status(401).json({ success: false, message: 'Invalid session.' });
    }

    const accessToken = signAccessToken(user._id);
    res.json({ success: true, accessToken });
  } catch {
    res.status(401).json({ success: false, message: 'Session expired. Please login again.' });
  }
};

// ─── LOGOUT ────────────────────────────────────────────────────────────────────
// POST /api/auth/logout
export const logout = async (req, res) => {
  res.clearCookie('refreshToken');
  res.json({ success: true, message: 'Logged out successfully.' });
};
