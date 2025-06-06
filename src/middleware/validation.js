const Joi = require('joi');
const logger = require('../utils/logger');
const { AppError } = require('../utils/errors');

/**
 * Validation middleware factory
 */
const validate = (schema, property = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      allowUnknown: false,
      stripUnknown: true
    });

    if (error) {
      const errorMessage = error.details.map(detail => detail.message).join(', ');
      logger.warn(`Validation error for ${req.method} ${req.path}: ${errorMessage}`);
      return next(new AppError(`Validation error: ${errorMessage}`, 400));
    }

    req[property] = value;
    next();
  };
};

/**
 * Common validation schemas
 */
const schemas = {
  // Authentication schemas
  register: Joi.object({
    email: Joi.string().email().required().max(255),
    password: Joi.string().min(8).max(128).required()
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .message('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
    firstName: Joi.string().trim().min(1).max(50).required(),
    lastName: Joi.string().trim().min(1).max(50).required(),
    phone: Joi.string().trim().max(20).optional(),
    tenantId: Joi.string().optional(), // For admin registration
  }),

  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
    tenantSlug: Joi.string().alphanum().optional(),
    mfaToken: Joi.string().length(6).pattern(/^\d+$/).optional()
  }),

  forgotPassword: Joi.object({
    email: Joi.string().email().required()
  }),

  resetPassword: Joi.object({
    token: Joi.string().required(),
    password: Joi.string().min(8).max(128).required()
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
  }),

  // Tenant schemas
  createTenant: Joi.object({
    slug: Joi.string().alphanum().min(3).max(30).required(),
    name: Joi.string().trim().min(1).max(100).required(),
    domain: Joi.string().domain().optional(),
    region: Joi.string().valid('eu-central', 'us-east', 'asia-pacific').default('eu-central'),
    timezone: Joi.string().default('Europe/Warsaw'),
    locale: Joi.string().valid('en-US', 'pl-PL', 'de-DE').default('pl-PL'),
    subscriptionTier: Joi.string().valid('basic', 'premium', 'enterprise').default('basic'),
    billingEmail: Joi.string().email().optional(),
    allowedDomains: Joi.array().items(Joi.string().domain()).optional(),
    enforceSSO: Joi.boolean().default(false),
    requireMFA: Joi.boolean().default(false)
  }),

  updateTenant: Joi.object({
    name: Joi.string().trim().min(1).max(100).optional(),
    domain: Joi.string().domain().allow(null).optional(),
    timezone: Joi.string().optional(),
    locale: Joi.string().valid('en-US', 'pl-PL', 'de-DE').optional(),
    billingEmail: Joi.string().email().allow(null).optional(),
    allowedDomains: Joi.array().items(Joi.string().domain()).optional(),
    enforceSSO: Joi.boolean().optional(),
    requireMFA: Joi.boolean().optional()
  }),

  // Company schemas
  createCompany: Joi.object({
    name: Joi.string().trim().min(1).max(100).required(),
    description: Joi.string().trim().max(500).optional(),
    website: Joi.string().uri().optional(),
    phone: Joi.string().trim().max(20).optional(),
    address: Joi.string().trim().max(200).optional(),
    city: Joi.string().trim().max(100).optional(),
    state: Joi.string().trim().max(100).optional(),
    country: Joi.string().trim().max(100).default('Poland'),
    postalCode: Joi.string().trim().max(20).optional(),
    vatNumber: Joi.string().trim().max(50).optional(),
    taxId: Joi.string().trim().max(50).optional(),
    regonNumber: Joi.string().trim().max(50).optional(),
    baseCurrency: Joi.string().length(3).uppercase().default('PLN'),
    supportedCurrencies: Joi.array().items(Joi.string().length(3).uppercase()).default(['PLN', 'EUR', 'USD'])
  }),

  updateCompany: Joi.object({
    name: Joi.string().trim().min(1).max(100).optional(),
    description: Joi.string().trim().max(500).allow('').optional(),
    website: Joi.string().uri().allow('').optional(),
    phone: Joi.string().trim().max(20).allow('').optional(),
    address: Joi.string().trim().max(200).allow('').optional(),
    city: Joi.string().trim().max(100).allow('').optional(),
    state: Joi.string().trim().max(100).allow('').optional(),
    country: Joi.string().trim().max(100).optional(),
    postalCode: Joi.string().trim().max(20).allow('').optional(),
    vatNumber: Joi.string().trim().max(50).allow('').optional(),
    taxId: Joi.string().trim().max(50).allow('').optional(),
    regonNumber: Joi.string().trim().max(50).allow('').optional(),
    baseCurrency: Joi.string().length(3).uppercase().optional(),
    supportedCurrencies: Joi.array().items(Joi.string().length(3).uppercase()).optional()
  }),

  // User schemas
  createUser: Joi.object({
    email: Joi.string().email().required(),
    firstName: Joi.string().trim().min(1).max(50).required(),
    lastName: Joi.string().trim().min(1).max(50).required(),
    phone: Joi.string().trim().max(20).optional(),
    role: Joi.string().valid('ADMIN', 'MANAGER', 'ACCOUNTANT', 'EMPLOYEE').default('EMPLOYEE'),
    permissions: Joi.array().items(Joi.string()).optional()
  }),

  updateUser: Joi.object({
    firstName: Joi.string().trim().min(1).max(50).optional(),
    lastName: Joi.string().trim().min(1).max(50).optional(),
    phone: Joi.string().trim().max(20).allow('').optional(),
    isActive: Joi.boolean().optional()
  }),

  updateUserRole: Joi.object({
    role: Joi.string().valid('ADMIN', 'MANAGER', 'ACCOUNTANT', 'EMPLOYEE').required(),
    permissions: Joi.array().items(Joi.string()).optional()
  }),

  // Currency schemas
  createCurrency: Joi.object({
    code: Joi.string().length(3).uppercase().required(),
    name: Joi.string().trim().min(1).max(100).required(),
    symbol: Joi.string().trim().min(1).max(10).required(),
    isBaseCurrency: Joi.boolean().default(false),
    exchangeRate: Joi.number().precision(6).positive().default(1.0),
    decimalPlaces: Joi.number().integer().min(0).max(4).default(2),
    thousandSeparator: Joi.string().length(1).default(','),
    decimalSeparator: Joi.string().length(1).default('.')
  }),

  updateCurrency: Joi.object({
    name: Joi.string().trim().min(1).max(100).optional(),
    symbol: Joi.string().trim().min(1).max(10).optional(),
    exchangeRate: Joi.number().precision(6).positive().optional(),
    decimalPlaces: Joi.number().integer().min(0).max(4).optional(),
    thousandSeparator: Joi.string().length(1).optional(),
    decimalSeparator: Joi.string().length(1).optional()
  }),

  // Expense schemas
  createExpense: Joi.object({
    title: Joi.string().trim().min(1).max(200).required(),
    description: Joi.string().trim().max(1000).optional(),
    amount: Joi.number().precision(2).positive().required(),
    currency: Joi.string().length(3).uppercase().default('PLN'),
    currencyId: Joi.string().optional(),
    originalAmount: Joi.number().precision(2).positive().optional(),
    originalCurrency: Joi.string().length(3).uppercase().optional(),
    exchangeRate: Joi.number().precision(6).positive().optional(),
    vatAmount: Joi.number().precision(2).min(0).optional(),
    transactionDate: Joi.date().iso().required(),
    merchantName: Joi.string().trim().max(200).optional(),
    merchantVatId: Joi.string().trim().max(50).optional(),
    receiptNumber: Joi.string().trim().max(100).optional(),
    categoryId: Joi.string().optional(),
    projectId: Joi.string().optional(),
    isReimbursable: Joi.boolean().default(true),
    businessPurpose: Joi.string().trim().max(500).optional(),
    receiptRequired: Joi.boolean().default(true)
  }),

  updateExpense: Joi.object({
    title: Joi.string().trim().min(1).max(200).optional(),
    description: Joi.string().trim().max(1000).allow('').optional(),
    amount: Joi.number().precision(2).positive().optional(),
    currency: Joi.string().length(3).uppercase().optional(),
    vatAmount: Joi.number().precision(2).min(0).optional(),
    transactionDate: Joi.date().iso().optional(),
    merchantName: Joi.string().trim().max(200).allow('').optional(),
    merchantVatId: Joi.string().trim().max(50).allow('').optional(),
    receiptNumber: Joi.string().trim().max(100).allow('').optional(),
    categoryId: Joi.string().allow(null).optional(),
    projectId: Joi.string().allow(null).optional(),
    isReimbursable: Joi.boolean().optional(),
    businessPurpose: Joi.string().trim().max(500).allow('').optional(),
    status: Joi.string().valid('DRAFT', 'SUBMITTED', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'REIMBURSED', 'ARCHIVED').optional()
  }),

  // Document schemas
  documentMetadata: Joi.object({
    title: Joi.string().trim().max(200).optional(),
    description: Joi.string().trim().max(1000).optional(),
    accessLevel: Joi.string().valid('company', 'department', 'user').default('company'),
    retentionUntil: Joi.date().iso().optional()
  }),

  // Query parameter schemas
  queryParams: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    sort: Joi.string().optional(),
    order: Joi.string().valid('asc', 'desc').default('desc'),
    search: Joi.string().trim().max(100).optional(),
    status: Joi.string().optional(),
    dateFrom: Joi.date().iso().optional(),
    dateTo: Joi.date().iso().optional(),
    minAmount: Joi.number().precision(2).min(0).optional(),
    maxAmount: Joi.number().precision(2).min(0).optional(),
    category: Joi.string().optional(),
    currency: Joi.string().length(3).uppercase().optional()
  }),

  // Bank statement schemas
  bankStatementUpload: Joi.object({
    bankName: Joi.string().trim().min(1).max(100).required(),
    accountNumber: Joi.string().trim().max(50).optional(),
    statementPeriod: Joi.object({
      from: Joi.date().iso().required(),
      to: Joi.date().iso().required()
    }).required(),
    currency: Joi.string().length(3).uppercase().default('PLN'),
    autoProcess: Joi.boolean().default(true)
  }),

  // Matching rules schema
  createMatchingRule: Joi.object({
    name: Joi.string().trim().min(1).max(100).required(),
    description: Joi.string().trim().max(500).optional(),
    isActive: Joi.boolean().default(true),
    priority: Joi.number().integer().min(1).max(100).default(50),
    conditions: Joi.object({
      amountTolerance: Joi.number().precision(2).min(0).max(100).default(0),
      dateTolerance: Joi.number().integer().min(0).max(30).default(3),
      merchantSimilarity: Joi.number().precision(2).min(0).max(1).default(0.8),
      requireExactAmount: Joi.boolean().default(false),
      requireExactDate: Joi.boolean().default(false)
    }).required(),
    actions: Joi.object({
      autoMatch: Joi.boolean().default(false),
      requireReview: Joi.boolean().default(true),
      assignCategory: Joi.string().optional(),
      setTags: Joi.array().items(Joi.string()).optional()
    }).required()
  })
};

/**
 * Validate file upload
 */
const validateFileUpload = (allowedTypes = [], maxSize = 10 * 1024 * 1024) => {
  return (req, res, next) => {
    if (!req.file && !req.files) {
      return next(new AppError('No file uploaded', 400));
    }

    const files = req.files || [req.file];
    
    for (const file of files) {
      // Check file type
      if (allowedTypes.length > 0 && !allowedTypes.includes(file.mimetype)) {
        return next(new AppError(
          `Invalid file type. Allowed types: ${allowedTypes.join(', ')}`, 
          400
        ));
      }

      // Check file size
      if (file.size > maxSize) {
        return next(new AppError(
          `File too large. Maximum size: ${Math.round(maxSize / 1024 / 1024)}MB`, 
          400
        ));
      }

      // Check for malicious file extensions
      const dangerousExtensions = ['.exe', '.bat', '.cmd', '.scr', '.pif', '.vbs', '.js'];
      const fileExtension = file.originalname.toLowerCase().slice(file.originalname.lastIndexOf('.'));
      
      if (dangerousExtensions.includes(fileExtension)) {
        return next(new AppError('File type not allowed for security reasons', 400));
      }
    }

    next();
  };
};

/**
 * Validate pagination parameters
 */
const validatePagination = validate(schemas.queryParams, 'query');

/**
 * Validate ID parameter
 */
const validateId = (paramName = 'id') => {
  return validate(
    Joi.object({
      [paramName]: Joi.string().required()
    }), 
    'params'
  );
};

/**
 * Validate multiple IDs
 */
const validateIds = Joi.object({
  ids: Joi.array().items(Joi.string()).min(1).max(100).required()
});

/**
 * Custom validation for business rules
 */
const businessRuleValidators = {
  expenseAmountLimit: (maxAmount = 10000) => {
    return (req, res, next) => {
      if (req.body.amount && req.body.amount > maxAmount) {
        return next(new AppError(
          `Expense amount cannot exceed ${maxAmount} ${req.body.currency || 'PLN'}`, 
          400
        ));
      }
      next();
    };
  },

  futureDate: (fieldName = 'transactionDate') => {
    return (req, res, next) => {
      if (req.body[fieldName]) {
        const date = new Date(req.body[fieldName]);
        const today = new Date();
        today.setHours(23, 59, 59, 999); // End of today
        
        if (date > today) {
          return next(new AppError(
            `${fieldName} cannot be in the future`, 
            400
          ));
        }
      }
      next();
    };
  },

  uniqueEmail: async (req, res, next) => {
    if (req.body.email && req.prisma) {
      const existingUser = await req.prisma.user.findFirst({
        where: { 
          email: req.body.email,
          tenantId: req.tenantId 
        }
      });
      
      if (existingUser && existingUser.id !== req.params.id) {
        return next(new AppError('Email already exists in this tenant', 409));
      }
    }
    next();
  }
};

module.exports = {
  validate,
  schemas,
  validateFileUpload,
  validatePagination,
  validateId,
  validateIds,
  businessRuleValidators
}; 