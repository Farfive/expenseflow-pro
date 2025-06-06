const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const validator = require('validator');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const logger = require('../utils/logger');
const { AppError } = require('../utils/errors');

/**
 * Enhanced rate limiting with different rules for different endpoints
 */
const createRateLimit = (options = {}) => {
  const defaults = {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: {
      error: 'Too many requests from this IP, please try again later.',
      code: 'RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      logger.warn(`Rate limit exceeded for IP: ${req.ip}, path: ${req.path}`);
      res.status(429).json(options.message || defaults.message);
    },
    skip: (req) => {
      // Skip rate limiting for health checks
      return req.path === '/health';
    }
  };

  return rateLimit({ ...defaults, ...options });
};

/**
 * Strict rate limiting for authentication endpoints
 */
const authRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Only 5 login attempts per 15 minutes
  skipSuccessfulRequests: true,
  message: {
    error: 'Too many authentication attempts, please try again later.',
    code: 'AUTH_RATE_LIMIT_EXCEEDED'
  }
});

/**
 * Rate limiting for password reset endpoints
 */
const passwordResetRateLimit = createRateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Only 3 password reset attempts per hour
  message: {
    error: 'Too many password reset attempts, please try again later.',
    code: 'PASSWORD_RESET_RATE_LIMIT_EXCEEDED'
  }
});

/**
 * Rate limiting for file upload endpoints
 */
const uploadRateLimit = createRateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 uploads per minute
  message: {
    error: 'Too many file uploads, please try again later.',
    code: 'UPLOAD_RATE_LIMIT_EXCEEDED'
  }
});

/**
 * Enhanced security headers
 */
const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https:"],
      scriptSrc: ["'self'", "https:"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      connectSrc: ["'self'", "https:"],
      fontSrc: ["'self'", "https:", "data:"],
      frameSrc: ["'none'"],
      imgSrc: ["'self'", "data:", "https:"],
      manifestSrc: ["'self'"],
      mediaSrc: ["'self'"],
      workerSrc: ["'none'"]
    }
  },
  crossOriginEmbedderPolicy: false, // Disable for file uploads
  crossOriginResourcePolicy: { policy: "cross-origin" },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
});

/**
 * Input sanitization middleware
 */
const sanitizeInput = (req, res, next) => {
  const sanitizeValue = (value) => {
    if (typeof value === 'string') {
      // Remove potential XSS and script injections
      return validator.escape(value.trim());
    }
    if (typeof value === 'object' && value !== null) {
      const sanitized = {};
      for (const key in value) {
        if (value.hasOwnProperty(key)) {
          sanitized[key] = sanitizeValue(value[key]);
        }
      }
      return sanitized;
    }
    return value;
  };

  try {
    if (req.body && typeof req.body === 'object') {
      req.body = sanitizeValue(req.body);
    }
    if (req.query && typeof req.query === 'object') {
      req.query = sanitizeValue(req.query);
    }
    if (req.params && typeof req.params === 'object') {
      req.params = sanitizeValue(req.params);
    }
    next();
  } catch (error) {
    logger.error('Input sanitization error:', error);
    next(new AppError('Invalid input format', 400));
  }
};

/**
 * SQL injection protection middleware
 */
const preventSQLInjection = (req, res, next) => {
  const sqlInjectionPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/i,
    /(UNION.*SELECT)/i,
    /(OR.*=.*)/i,
    /(AND.*=.*)/i,
    /('.*OR.*'.*=.*')/i,
    /(--)/,
    /(\/\*.*\*\/)/,
    /(;.*--)/,
    /(xp_)/i
  ];

  const checkForSQLInjection = (value) => {
    if (typeof value === 'string') {
      return sqlInjectionPatterns.some(pattern => pattern.test(value));
    }
    if (typeof value === 'object' && value !== null) {
      return Object.values(value).some(checkForSQLInjection);
    }
    return false;
  };

  try {
    const inputs = [req.body, req.query, req.params];
    for (const input of inputs) {
      if (input && checkForSQLInjection(input)) {
        logger.warn(`SQL injection attempt detected from IP: ${req.ip}, path: ${req.path}`);
        return next(new AppError('Invalid request format', 400));
      }
    }
    next();
  } catch (error) {
    logger.error('SQL injection check error:', error);
    next(new AppError('Request validation failed', 500));
  }
};

/**
 * Password strength validation
 */
const validatePasswordStrength = (password) => {
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  const errors = [];
  
  if (password.length < minLength) {
    errors.push(`Password must be at least ${minLength} characters long`);
  }
  if (!hasUpperCase) {
    errors.push('Password must contain at least one uppercase letter');
  }
  if (!hasLowerCase) {
    errors.push('Password must contain at least one lowercase letter');
  }
  if (!hasNumbers) {
    errors.push('Password must contain at least one number');
  }
  if (!hasSpecialChar) {
    errors.push('Password must contain at least one special character');
  }

  return {
    isValid: errors.length === 0,
    errors,
    score: [hasUpperCase, hasLowerCase, hasNumbers, hasSpecialChar, password.length >= minLength].filter(Boolean).length
  };
};

/**
 * Enhanced password hashing
 */
const hashPassword = async (password) => {
  const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;
  return bcrypt.hash(password, saltRounds);
};

/**
 * Secure password comparison
 */
const comparePassword = async (password, hash) => {
  return bcrypt.compare(password, hash);
};

/**
 * Generate secure random token
 */
const generateSecureToken = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

/**
 * CSRF protection middleware
 */
const csrfProtection = (req, res, next) => {
  // Skip CSRF for GET requests and API tokens
  if (req.method === 'GET' || req.get('Authorization')?.startsWith('Bearer ')) {
    return next();
  }

  const token = req.get('X-CSRF-Token') || req.body._csrf;
  const sessionToken = req.session?.csrfToken;

  if (!token || !sessionToken || token !== sessionToken) {
    logger.warn(`CSRF token mismatch from IP: ${req.ip}, path: ${req.path}`);
    return next(new AppError('Invalid CSRF token', 403));
  }

  next();
};

/**
 * IP allowlist middleware
 */
const ipAllowlist = (allowedIPs = []) => {
  return (req, res, next) => {
    if (allowedIPs.length === 0) {
      return next(); // No restrictions if allowlist is empty
    }

    const clientIP = req.ip || req.connection.remoteAddress;
    
    if (!allowedIPs.includes(clientIP)) {
      logger.warn(`Blocked request from unauthorized IP: ${clientIP}`);
      return next(new AppError('Access denied', 403));
    }

    next();
  };
};

/**
 * Request size limiting middleware
 */
const limitRequestSize = (maxSize = '10mb') => {
  return (req, res, next) => {
    const contentLength = parseInt(req.get('Content-Length') || '0');
    const maxBytes = typeof maxSize === 'string' 
      ? parseInt(maxSize.replace(/mb|kb|gb/i, '')) * 1024 * 1024 
      : maxSize;

    if (contentLength > maxBytes) {
      logger.warn(`Request size exceeded limit: ${contentLength} bytes from IP: ${req.ip}`);
      return next(new AppError('Request entity too large', 413));
    }

    next();
  };
};

/**
 * Account lockout protection
 */
const accountLockout = async (req, res, next) => {
  try {
    if (!req.user) {
      return next();
    }

    const maxAttempts = parseInt(process.env.MAX_LOGIN_ATTEMPTS) || 5;
    const lockoutDuration = parseInt(process.env.LOCKOUT_DURATION_MINUTES) || 30;

    // Check if account is currently locked
    if (req.user.lockedUntil && req.user.lockedUntil > new Date()) {
      const remainingTime = Math.ceil((req.user.lockedUntil - new Date()) / 60000);
      return next(new AppError(
        `Account is locked. Try again in ${remainingTime} minutes.`, 
        423
      ));
    }

    // Check failed attempts
    if (req.user.failedLoginAttempts >= maxAttempts) {
      const lockUntil = new Date(Date.now() + lockoutDuration * 60000);
      
      // Update user lockout status
      await req.prisma.user.update({
        where: { id: req.user.id },
        data: { 
          lockedUntil: lockUntil,
          failedLoginAttempts: 0 
        }
      });

      logger.warn(`Account locked for user: ${req.user.email} until ${lockUntil}`);
      return next(new AppError(
        `Account locked due to too many failed attempts. Try again in ${lockoutDuration} minutes.`, 
        423
      ));
    }

    next();
  } catch (error) {
    logger.error('Account lockout check error:', error);
    next(new AppError('Authentication validation failed', 500));
  }
};

/**
 * Suspicious activity detection
 */
const detectSuspiciousActivity = (req, res, next) => {
  const suspiciousPatterns = [
    // Common attack patterns
    /\.\.\//,  // Directory traversal
    /<script>/i,  // XSS
    /eval\(/i,  // Code injection
    /onclick/i,  // Event handlers
    /javascript:/i,  // JavaScript protocol
    /vbscript:/i,  // VBScript protocol
    /data:text\/html/i,  // Data URLs
  ];

  const checkSuspiciousContent = (value) => {
    if (typeof value === 'string') {
      return suspiciousPatterns.some(pattern => pattern.test(value));
    }
    if (typeof value === 'object' && value !== null) {
      return Object.values(value).some(checkSuspiciousContent);
    }
    return false;
  };

  try {
    const inputs = [req.body, req.query, req.params];
    const userAgent = req.get('User-Agent') || '';
    
    // Check for suspicious user agents
    const suspiciousUserAgents = [
      /sqlmap/i,
      /nikto/i,
      /nessus/i,
      /openvas/i,
      /nmap/i
    ];

    if (suspiciousUserAgents.some(pattern => pattern.test(userAgent))) {
      logger.warn(`Suspicious user agent detected: ${userAgent} from IP: ${req.ip}`);
      return next(new AppError('Access denied', 403));
    }

    // Check request content for suspicious patterns
    for (const input of inputs) {
      if (input && checkSuspiciousContent(input)) {
        logger.warn(`Suspicious activity detected from IP: ${req.ip}, path: ${req.path}`);
        return next(new AppError('Invalid request content', 400));
      }
    }

    next();
  } catch (error) {
    logger.error('Suspicious activity detection error:', error);
    next(new AppError('Security validation failed', 500));
  }
};

module.exports = {
  // Rate limiting
  createRateLimit,
  authRateLimit,
  passwordResetRateLimit,
  uploadRateLimit,
  
  // Security headers and protection
  securityHeaders,
  sanitizeInput,
  preventSQLInjection,
  csrfProtection,
  ipAllowlist,
  limitRequestSize,
  
  // Account security
  validatePasswordStrength,
  hashPassword,
  comparePassword,
  generateSecureToken,
  accountLockout,
  
  // Threat detection
  detectSuspiciousActivity
}; 