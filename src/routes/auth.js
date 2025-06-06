const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const { asyncHandler, AppError, formatValidationErrors } = require('../middleware/errorHandler');
const { generateToken, generateRefreshToken, verifyRefreshToken, authenticateToken } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();
const prisma = new PrismaClient();

// ========================================
// Validation Rules
// ========================================

const registerValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),
  body('firstName')
    .isLength({ min: 2 })
    .trim()
    .withMessage('First name must be at least 2 characters long'),
  body('lastName')
    .isLength({ min: 2 })
    .trim()
    .withMessage('Last name must be at least 2 characters long'),
  body('phone')
    .optional()
    .isMobilePhone()
    .withMessage('Please provide a valid phone number')
];

const loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

const resetPasswordValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address')
];

const updatePasswordValidation = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('New password must contain at least one lowercase letter, one uppercase letter, and one number')
];

// ========================================
// Helper Functions
// ========================================

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formattedErrors = formatValidationErrors(errors.array());
    throw new AppError('Validation failed', 400, 'VALIDATION_ERROR', formattedErrors);
  }
  next();
};

// ========================================
// Authentication Routes
// ========================================

// Register new user
router.post('/register', registerValidation, handleValidationErrors, asyncHandler(async (req, res) => {
  const { email, password, firstName, lastName, phone } = req.body;

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email }
  });

  if (existingUser) {
    throw new AppError('User with this email already exists', 409, 'EMAIL_ALREADY_EXISTS');
  }

  // Hash password
  const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
  const hashedPassword = await bcrypt.hash(password, saltRounds);

  // Create user
  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      firstName,
      lastName,
      phone
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      isActive: true,
      isVerified: true,
      createdAt: true
    }
  });

  // Generate tokens
  const accessToken = generateToken(user.id);
  const refreshToken = generateRefreshToken(user.id);

  // Log successful registration
  logger.info('User registered', {
    userId: user.id,
    email: user.email,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  res.status(201).json({
    success: true,
    message: 'User registered successfully',
    data: {
      user,
      tokens: {
        accessToken,
        refreshToken,
        expiresIn: process.env.JWT_EXPIRES_IN || '7d'
      }
    }
  });
}));

// Login user
router.post('/login', loginValidation, handleValidationErrors, asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Find user with companies
  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      companies: {
        include: {
          company: true
        },
        where: {
          isActive: true
        }
      }
    }
  });

  if (!user) {
    throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
  }

  // Check if user is active
  if (!user.isActive) {
    throw new AppError('Account is disabled. Please contact support.', 401, 'ACCOUNT_DISABLED');
  }

  // Verify password
  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
  }

  // Update last login
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() }
  });

  // Generate tokens
  const accessToken = generateToken(user.id);
  const refreshToken = generateRefreshToken(user.id);

  // Prepare user data (exclude password)
  const userData = {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
    avatar: user.avatar,
    isActive: user.isActive,
    isVerified: user.isVerified,
    lastLoginAt: user.lastLoginAt,
    companies: user.companies.map(cu => ({
      id: cu.company.id,
      name: cu.company.name,
      role: cu.role,
      permissions: cu.permissions
    }))
  };

  // Log successful login
  logger.info('User logged in', {
    userId: user.id,
    email: user.email,
    companiesCount: user.companies.length,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  res.json({
    success: true,
    message: 'Login successful',
    data: {
      user: userData,
      tokens: {
        accessToken,
        refreshToken,
        expiresIn: process.env.JWT_EXPIRES_IN || '7d'
      }
    }
  });
}));

// Refresh access token
router.post('/refresh', asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    throw new AppError('Refresh token is required', 400, 'REFRESH_TOKEN_REQUIRED');
  }

  try {
    // Verify refresh token
    const decoded = verifyRefreshToken(refreshToken);
    
    if (decoded.type !== 'refresh') {
      throw new AppError('Invalid refresh token', 401, 'INVALID_REFRESH_TOKEN');
    }

    // Check if user exists and is active
    const user = await prisma.user.findUnique({
      where: { 
        id: decoded.id,
        isActive: true 
      }
    });

    if (!user) {
      throw new AppError('User not found or inactive', 401, 'USER_NOT_FOUND');
    }

    // Generate new access token
    const accessToken = generateToken(user.id);

    res.json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        accessToken,
        expiresIn: process.env.JWT_EXPIRES_IN || '7d'
      }
    });

  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new AppError('Refresh token expired', 401, 'REFRESH_TOKEN_EXPIRED');
    }
    if (error.name === 'JsonWebTokenError') {
      throw new AppError('Invalid refresh token', 401, 'INVALID_REFRESH_TOKEN');
    }
    throw error;
  }
}));

// Get current user profile
router.get('/me', authenticateToken, asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    include: {
      companies: {
        include: {
          company: true
        },
        where: {
          isActive: true
        }
      }
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      avatar: true,
      isActive: true,
      isVerified: true,
      lastLoginAt: true,
      createdAt: true,
      updatedAt: true,
      companies: true
    }
  });

  if (!user) {
    throw new AppError('User not found', 404, 'USER_NOT_FOUND');
  }

  // Format companies data
  const userData = {
    ...user,
    companies: user.companies.map(cu => ({
      id: cu.company.id,
      name: cu.company.name,
      role: cu.role,
      permissions: cu.permissions,
      isActive: cu.isActive
    }))
  };

  res.json({
    success: true,
    data: { user: userData }
  });
}));

// Update user profile
router.patch('/profile', authenticateToken, [
  body('firstName').optional().isLength({ min: 2 }).trim(),
  body('lastName').optional().isLength({ min: 2 }).trim(),
  body('phone').optional().isMobilePhone()
], handleValidationErrors, asyncHandler(async (req, res) => {
  const { firstName, lastName, phone } = req.body;

  const updatedUser = await prisma.user.update({
    where: { id: req.user.id },
    data: {
      ...(firstName && { firstName }),
      ...(lastName && { lastName }),
      ...(phone && { phone })
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      avatar: true,
      updatedAt: true
    }
  });

  logger.info('User profile updated', {
    userId: req.user.id,
    updatedFields: Object.keys({ firstName, lastName, phone }).filter(key => req.body[key])
  });

  res.json({
    success: true,
    message: 'Profile updated successfully',
    data: { user: updatedUser }
  });
}));

// Change password
router.patch('/password', authenticateToken, updatePasswordValidation, handleValidationErrors, asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  // Get user with password
  const user = await prisma.user.findUnique({
    where: { id: req.user.id }
  });

  if (!user) {
    throw new AppError('User not found', 404, 'USER_NOT_FOUND');
  }

  // Verify current password
  const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
  if (!isCurrentPasswordValid) {
    throw new AppError('Current password is incorrect', 400, 'INCORRECT_CURRENT_PASSWORD');
  }

  // Hash new password
  const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
  const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

  // Update password
  await prisma.user.update({
    where: { id: req.user.id },
    data: { password: hashedNewPassword }
  });

  logger.info('User password changed', {
    userId: req.user.id,
    email: user.email
  });

  res.json({
    success: true,
    message: 'Password updated successfully'
  });
}));

// Logout (optional: for logging purposes)
router.post('/logout', authenticateToken, asyncHandler(async (req, res) => {
  logger.info('User logged out', {
    userId: req.user.id,
    email: req.user.email
  });

  res.json({
    success: true,
    message: 'Logged out successfully'
  });
}));

// Request password reset (placeholder - requires email service)
router.post('/forgot-password', resetPasswordValidation, handleValidationErrors, asyncHandler(async (req, res) => {
  const { email } = req.body;

  // Check if user exists
  const user = await prisma.user.findUnique({
    where: { email }
  });

  // Always return success for security (don't reveal if email exists)
  res.json({
    success: true,
    message: 'If an account with that email exists, a password reset link has been sent.'
  });

  // If user exists, log the password reset request
  if (user) {
    logger.info('Password reset requested', {
      userId: user.id,
      email: user.email,
      ip: req.ip
    });
    
    // TODO: Generate reset token and send email
    // This would typically involve:
    // 1. Generate a secure reset token
    // 2. Store it in database with expiration
    // 3. Send email with reset link
  }
}));

// Verify account (placeholder)
router.post('/verify/:token', asyncHandler(async (req, res) => {
  const { token } = req.params;

  // TODO: Implement email verification
  // This would typically involve:
  // 1. Verify the verification token
  // 2. Update user.isVerified = true
  // 3. Return success response

  res.json({
    success: true,
    message: 'Account verified successfully'
  });
}));

module.exports = router; 