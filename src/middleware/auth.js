const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const { AppError, asyncHandler } = require('./errorHandler');
const logger = require('../utils/logger');

const prisma = new PrismaClient();

// JWT token authentication middleware
const authenticateToken = asyncHandler(async (req, res, next) => {
  let token;

  // Get token from Authorization header
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }
  // Alternative: Get token from cookie
  else if (req.cookies?.token) {
    token = req.cookies.token;
  }

  if (!token) {
    throw new AppError('Access denied. No token provided.', 401, 'NO_TOKEN');
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user from database with company relationships
    const user = await prisma.user.findUnique({
      where: { 
        id: decoded.id,
        isActive: true 
      },
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
      throw new AppError('Token is no longer valid. User not found.', 401, 'USER_NOT_FOUND');
    }

    // Check if user is verified
    if (!user.isVerified) {
      throw new AppError('Please verify your account to continue.', 401, 'ACCOUNT_NOT_VERIFIED');
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    });

    // Attach user to request
    req.user = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      isActive: user.isActive,
      isVerified: user.isVerified,
      companies: user.companies.map(cu => ({
        id: cu.company.id,
        name: cu.company.name,
        role: cu.role,
        permissions: cu.permissions
      }))
    };

    // Set current company if specified in headers
    const companyId = req.headers['x-company-id'];
    if (companyId) {
      const userCompany = user.companies.find(cu => cu.company.id === companyId);
      if (!userCompany) {
        throw new AppError('Access denied to this company.', 403, 'COMPANY_ACCESS_DENIED');
      }
      req.currentCompany = {
        id: userCompany.company.id,
        name: userCompany.company.name,
        role: userCompany.role,
        permissions: userCompany.permissions
      };
    }

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      throw new AppError('Invalid token.', 401, 'INVALID_TOKEN');
    }
    if (error.name === 'TokenExpiredError') {
      throw new AppError('Token expired.', 401, 'TOKEN_EXPIRED');
    }
    throw error;
  }
});

// Role-based access control middleware
const requireRole = (...roles) => {
  return asyncHandler(async (req, res, next) => {
    if (!req.currentCompany) {
      throw new AppError('Company context required.', 400, 'COMPANY_CONTEXT_REQUIRED');
    }

    if (!roles.includes(req.currentCompany.role)) {
      throw new AppError(
        `Access denied. Required roles: ${roles.join(', ')}. Your role: ${req.currentCompany.role}`,
        403,
        'INSUFFICIENT_PERMISSIONS'
      );
    }

    next();
  });
};

// Permission-based access control middleware
const requirePermission = (permission) => {
  return asyncHandler(async (req, res, next) => {
    if (!req.currentCompany) {
      throw new AppError('Company context required.', 400, 'COMPANY_CONTEXT_REQUIRED');
    }

    const hasPermission = req.currentCompany.permissions.includes(permission) ||
                         req.currentCompany.permissions.includes('*') ||
                         req.currentCompany.role === 'ADMIN';

    if (!hasPermission) {
      throw new AppError(
        `Access denied. Required permission: ${permission}`,
        403,
        'INSUFFICIENT_PERMISSIONS'
      );
    }

    next();
  });
};

// Company access middleware - ensures user has access to specified company
const requireCompanyAccess = asyncHandler(async (req, res, next) => {
  const companyId = req.params.companyId || req.body.companyId || req.headers['x-company-id'];
  
  if (!companyId) {
    throw new AppError('Company ID is required.', 400, 'COMPANY_ID_REQUIRED');
  }

  const hasAccess = req.user.companies.some(company => company.id === companyId);
  
  if (!hasAccess) {
    throw new AppError('Access denied to this company.', 403, 'COMPANY_ACCESS_DENIED');
  }

  // Set current company context
  const userCompany = req.user.companies.find(company => company.id === companyId);
  req.currentCompany = userCompany;

  next();
});

// Resource ownership middleware - ensures user owns the resource or has admin access
const requireResourceOwnership = (resourceModel, resourceIdParam = 'id') => {
  return asyncHandler(async (req, res, next) => {
    const resourceId = req.params[resourceIdParam];
    
    if (!resourceId) {
      throw new AppError('Resource ID is required.', 400, 'RESOURCE_ID_REQUIRED');
    }

    // Admin can access any resource in their company
    if (req.currentCompany?.role === 'ADMIN') {
      return next();
    }

    // Check resource ownership
    const resource = await prisma[resourceModel].findUnique({
      where: { id: resourceId },
      select: { 
        userId: true,
        companyId: true 
      }
    });

    if (!resource) {
      throw new AppError('Resource not found.', 404, 'RESOURCE_NOT_FOUND');
    }

    // Check if user owns the resource
    if (resource.userId !== req.user.id) {
      throw new AppError('Access denied. You can only access your own resources.', 403, 'RESOURCE_ACCESS_DENIED');
    }

    // Check if resource belongs to current company
    if (req.currentCompany && resource.companyId !== req.currentCompany.id) {
      throw new AppError('Resource does not belong to current company.', 403, 'COMPANY_MISMATCH');
    }

    next();
  });
};

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

// Generate refresh token
const generateRefreshToken = (userId) => {
  return jwt.sign(
    { id: userId, type: 'refresh' },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d' }
  );
};

// Verify refresh token
const verifyRefreshToken = (refreshToken) => {
  return jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
};

// Optional authentication middleware (doesn't throw error if no token)
const optionalAuth = asyncHandler(async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await prisma.user.findUnique({
        where: { 
          id: decoded.id,
          isActive: true 
        },
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

      if (user) {
        req.user = {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          companies: user.companies.map(cu => ({
            id: cu.company.id,
            name: cu.company.name,
            role: cu.role,
            permissions: cu.permissions
          }))
        };
      }
    } catch (error) {
      // Silently ignore token errors for optional auth
      logger.debug('Optional auth token error:', error.message);
    }
  }

  next();
});

module.exports = {
  authenticateToken,
  requireRole,
  requirePermission,
  requireCompanyAccess,
  requireResourceOwnership,
  generateToken,
  generateRefreshToken,
  verifyRefreshToken,
  optionalAuth
}; 