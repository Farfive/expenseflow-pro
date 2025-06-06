const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');
const { AppError } = require('../utils/errors');

// Global Prisma instance
let globalPrisma = null;

/**
 * Initialize Prisma Client with proper configuration
 */
function initializePrisma() {
  if (!globalPrisma) {
    globalPrisma = new PrismaClient({
      log: process.env.NODE_ENV === 'development' 
        ? ['query', 'info', 'warn', 'error']
        : ['warn', 'error'],
      errorFormat: 'pretty',
    });
  }
  return globalPrisma;
}

/**
 * Multi-tenant middleware that extracts tenant information and sets context
 */
const tenancyMiddleware = async (req, res, next) => {
  try {
    const prisma = initializePrisma();
    req.prisma = prisma;

    // Extract tenant information from various sources
    let tenantId = null;
    let tenantSlug = null;

    // 1. Try to get tenant from subdomain (e.g., acme.expenseflow.com)
    const host = req.get('host');
    if (host) {
      const subdomain = host.split('.')[0];
      if (subdomain && subdomain !== 'www' && subdomain !== 'api') {
        tenantSlug = subdomain;
      }
    }

    // 2. Try to get tenant from custom domain mapping
    if (!tenantSlug && host) {
      const tenant = await prisma.tenant.findFirst({
        where: { domain: host },
        select: { id: true, slug: true, name: true, subscriptionStatus: true }
      });
      if (tenant) {
        tenantId = tenant.id;
        tenantSlug = tenant.slug;
        req.tenant = tenant;
      }
    }

    // 3. Try to get tenant from header (for API clients)
    if (!tenantId) {
      const tenantHeader = req.get('x-tenant-id') || req.get('x-tenant-slug');
      if (tenantHeader) {
        const tenant = await prisma.tenant.findFirst({
          where: {
            OR: [
              { id: tenantHeader },
              { slug: tenantHeader }
            ]
          },
          select: { id: true, slug: true, name: true, subscriptionStatus: true }
        });
        if (tenant) {
          tenantId = tenant.id;
          tenantSlug = tenant.slug;
          req.tenant = tenant;
        }
      }
    }

    // 4. For authenticated requests, try to get tenant from user context
    if (!tenantId && req.user) {
      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        include: { 
          tenant: {
            select: { id: true, slug: true, name: true, subscriptionStatus: true }
          }
        }
      });
      if (user && user.tenant) {
        tenantId = user.tenant.id;
        tenantSlug = user.tenant.slug;
        req.tenant = user.tenant;
      }
    }

    // 5. Default tenant for development/testing
    if (!tenantId && process.env.NODE_ENV === 'development') {
      const defaultTenant = await prisma.tenant.findFirst({
        where: { slug: 'default' },
        select: { id: true, slug: true, name: true, subscriptionStatus: true }
      });
      if (defaultTenant) {
        tenantId = defaultTenant.id;
        tenantSlug = defaultTenant.slug;
        req.tenant = defaultTenant;
      }
    }

    // Validate tenant exists and is active
    if (!req.tenant && tenantId) {
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { 
          id: true, 
          slug: true, 
          name: true, 
          subscriptionStatus: true,
          maxUsers: true,
          maxStorageGB: true,
          allowedDomains: true
        }
      });

      if (!tenant) {
        return next(new AppError('Tenant not found', 404));
      }

      if (tenant.subscriptionStatus !== 'active') {
        return next(new AppError('Tenant subscription is not active', 403));
      }

      req.tenant = tenant;
    }

    // Set tenant context for database queries
    if (req.tenant) {
      req.tenantId = req.tenant.id;
      
      // Add tenant isolation to Prisma queries
      req.prisma = prisma.$extends({
        query: {
          $allModels: {
            async findMany({ args, query }) {
              if (args.where) {
                args.where = { ...args.where, tenantId: req.tenantId };
              } else {
                args.where = { tenantId: req.tenantId };
              }
              return query(args);
            },
            async findFirst({ args, query }) {
              if (args.where) {
                args.where = { ...args.where, tenantId: req.tenantId };
              } else {
                args.where = { tenantId: req.tenantId };
              }
              return query(args);
            },
            async findUnique({ args, query }) {
              // For findUnique, we need to be careful about unique constraints
              // Only add tenantId if the model has it and it's not already specified
              const modelName = query.model || args.model;
              if (modelName && ['user', 'company', 'expense', 'document', 'bankTransaction'].includes(modelName.toLowerCase())) {
                if (args.where && !args.where.tenantId) {
                  args.where = { ...args.where, tenantId: req.tenantId };
                }
              }
              return query(args);
            },
            async create({ args, query }) {
              if (args.data && typeof args.data === 'object') {
                args.data = { ...args.data, tenantId: req.tenantId };
              }
              return query(args);
            },
            async createMany({ args, query }) {
              if (args.data && Array.isArray(args.data)) {
                args.data = args.data.map(item => ({ ...item, tenantId: req.tenantId }));
              }
              return query(args);
            },
            async update({ args, query }) {
              if (args.where) {
                args.where = { ...args.where, tenantId: req.tenantId };
              }
              return query(args);
            },
            async updateMany({ args, query }) {
              if (args.where) {
                args.where = { ...args.where, tenantId: req.tenantId };
              } else {
                args.where = { tenantId: req.tenantId };
              }
              return query(args);
            },
            async delete({ args, query }) {
              if (args.where) {
                args.where = { ...args.where, tenantId: req.tenantId };
              }
              return query(args);
            },
            async deleteMany({ args, query }) {
              if (args.where) {
                args.where = { ...args.where, tenantId: req.tenantId };
              } else {
                args.where = { tenantId: req.tenantId };
              }
              return query(args);
            }
          }
        }
      });

      // Update tenant last active time
      await prisma.tenant.update({
        where: { id: req.tenantId },
        data: { lastActiveAt: new Date() }
      }).catch(err => {
        logger.warn('Failed to update tenant lastActiveAt:', err);
      });

      logger.debug(`Request processed for tenant: ${req.tenant.slug} (${req.tenantId})`);
    }

    next();
  } catch (error) {
    logger.error('Tenancy middleware error:', error);
    next(new AppError('Tenant resolution failed', 500));
  }
};

/**
 * Middleware to require a valid tenant context
 */
const requireTenant = (req, res, next) => {
  if (!req.tenant || !req.tenantId) {
    return next(new AppError('Tenant context required', 400));
  }
  next();
};

/**
 * Middleware to validate tenant subscription limits
 */
const validateTenantLimits = (limitType) => {
  return async (req, res, next) => {
    try {
      if (!req.tenant) {
        return next(new AppError('Tenant context required', 400));
      }

      const prisma = req.prisma || initializePrisma();

      switch (limitType) {
        case 'users':
          const userCount = await prisma.user.count({
            where: { tenantId: req.tenantId }
          });
          if (userCount >= req.tenant.maxUsers) {
            return next(new AppError('User limit exceeded for this subscription', 403));
          }
          break;

        case 'storage':
          // This would require calculating actual storage usage
          // For now, we'll skip this check
          break;

        default:
          logger.warn(`Unknown limit type: ${limitType}`);
      }

      next();
    } catch (error) {
      logger.error('Tenant limits validation error:', error);
      next(new AppError('Failed to validate tenant limits', 500));
    }
  };
};

/**
 * Get tenant-scoped Prisma client
 */
const getTenantPrisma = (tenantId) => {
  const prisma = initializePrisma();
  
  return prisma.$extends({
    query: {
      $allModels: {
        async findMany({ args, query }) {
          args.where = { ...args.where, tenantId };
          return query(args);
        },
        async findFirst({ args, query }) {
          args.where = { ...args.where, tenantId };
          return query(args);
        },
        async create({ args, query }) {
          args.data = { ...args.data, tenantId };
          return query(args);
        },
        // Add other operations as needed
      }
    }
  });
};

module.exports = {
  tenancyMiddleware,
  requireTenant,
  validateTenantLimits,
  getTenantPrisma,
  initializePrisma
}; 