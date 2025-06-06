const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // ========================================
  // Create Admin User
  // ========================================
  console.log('👤 Creating admin user...');
  
  const adminPassword = await bcrypt.hash('Admin123!', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@expenseflow.com' },
    update: {},
    create: {
      email: 'admin@expenseflow.com',
      password: adminPassword,
      firstName: 'System',
      lastName: 'Administrator',
      isVerified: true,
      isActive: true
    }
  });

  // ========================================
  // Create Demo Company
  // ========================================
  console.log('🏢 Creating demo company...');
  
  const demoCompany = await prisma.company.upsert({
    where: { vatNumber: 'PL1234567890' },
    update: {},
    create: {
      name: 'ExpenseFlow Demo Company',
      description: 'Demo company for testing ExpenseFlow Pro features',
      address: 'ul. Warszawska 123',
      city: 'Krakow',
      state: 'Lesser Poland',
      country: 'Poland',
      postalCode: '30-001',
      vatNumber: 'PL1234567890',
      taxId: '1234567890',
      regonNumber: '123456789',
      currency: 'PLN',
      subscriptionTier: 'premium'
    }
  });

  // ========================================
  // Assign Admin to Company
  // ========================================
  console.log('🔗 Assigning admin to company...');
  
  await prisma.companyUser.upsert({
    where: {
      userId_companyId: {
        userId: admin.id,
        companyId: demoCompany.id
      }
    },
    update: {},
    create: {
      userId: admin.id,
      companyId: demoCompany.id,
      role: 'ADMIN',
      permissions: ['*'] // Full permissions
    }
  });

  // ========================================
  // Create Additional Demo Users
  // ========================================
  console.log('👥 Creating demo users...');
  
  const managerPassword = await bcrypt.hash('Manager123!', 12);
  const manager = await prisma.user.upsert({
    where: { email: 'manager@expenseflow.com' },
    update: {},
    create: {
      email: 'manager@expenseflow.com',
      password: managerPassword,
      firstName: 'John',
      lastName: 'Manager',
      phone: '+48123456789',
      isVerified: true,
      isActive: true
    }
  });

  await prisma.companyUser.upsert({
    where: {
      userId_companyId: {
        userId: manager.id,
        companyId: demoCompany.id
      }
    },
    update: {},
    create: {
      userId: manager.id,
      companyId: demoCompany.id,
      role: 'MANAGER',
      permissions: [
        'expenses:read',
        'expenses:create',
        'expenses:update',
        'expenses:approve',
        'documents:read',
        'documents:upload',
        'categories:read',
        'users:read'
      ]
    }
  });

  const accountantPassword = await bcrypt.hash('Accountant123!', 12);
  const accountant = await prisma.user.upsert({
    where: { email: 'accountant@expenseflow.com' },
    update: {},
    create: {
      email: 'accountant@expenseflow.com',
      password: accountantPassword,
      firstName: 'Anna',
      lastName: 'Kowalski',
      phone: '+48987654321',
      isVerified: true,
      isActive: true
    }
  });

  await prisma.companyUser.upsert({
    where: {
      userId_companyId: {
        userId: accountant.id,
        companyId: demoCompany.id
      }
    },
    update: {},
    create: {
      userId: accountant.id,
      companyId: demoCompany.id,
      role: 'ACCOUNTANT',
      permissions: [
        'expenses:read',
        'expenses:update',
        'expenses:approve',
        'documents:read',
        'documents:reprocess',
        'categories:read',
        'categories:create',
        'reports:read'
      ]
    }
  });

  const employeePassword = await bcrypt.hash('Employee123!', 12);
  const employee = await prisma.user.upsert({
    where: { email: 'employee@expenseflow.com' },
    update: {},
    create: {
      email: 'employee@expenseflow.com',
      password: employeePassword,
      firstName: 'Piotr',
      lastName: 'Nowak',
      phone: '+48555666777',
      isVerified: true,
      isActive: true
    }
  });

  await prisma.companyUser.upsert({
    where: {
      userId_companyId: {
        userId: employee.id,
        companyId: demoCompany.id
      }
    },
    update: {},
    create: {
      userId: employee.id,
      companyId: demoCompany.id,
      role: 'EMPLOYEE',
      permissions: [
        'expenses:read',
        'expenses:create',
        'expenses:update',
        'documents:read',
        'documents:upload',
        'profile:update'
      ]
    }
  });

  // ========================================
  // Create Expense Categories
  // ========================================
  console.log('📂 Creating expense categories...');
  
  const categories = [
    {
      name: 'Travel & Transportation',
      description: 'Travel expenses, flights, trains, taxis, car rentals',
      color: '#3B82F6',
      defaultVatRate: 23.00
    },
    {
      name: 'Meals & Entertainment',
      description: 'Business meals, client entertainment, catering',
      color: '#EF4444',
      defaultVatRate: 23.00
    },
    {
      name: 'Office Supplies',
      description: 'Stationery, equipment, software licenses',
      color: '#10B981',
      defaultVatRate: 23.00
    },
    {
      name: 'Marketing & Advertising',
      description: 'Marketing campaigns, promotional materials, advertising',
      color: '#F59E0B',
      defaultVatRate: 23.00
    },
    {
      name: 'Professional Services',
      description: 'Consultancy, legal services, accounting',
      color: '#8B5CF6',
      defaultVatRate: 23.00
    },
    {
      name: 'Utilities',
      description: 'Internet, phone, electricity, heating',
      color: '#06B6D4',
      defaultVatRate: 23.00
    },
    {
      name: 'Training & Development',
      description: 'Courses, conferences, books, training materials',
      color: '#EC4899',
      defaultVatRate: 23.00
    },
    {
      name: 'Fuel',
      description: 'Vehicle fuel and related expenses',
      color: '#F97316',
      defaultVatRate: 23.00
    }
  ];

  for (const category of categories) {
    await prisma.expenseCategory.upsert({
      where: {
        companyId_name: {
          companyId: demoCompany.id,
          name: category.name
        }
      },
      update: {},
      create: {
        ...category,
        companyId: demoCompany.id
      }
    });
  }

  // ========================================
  // Create Approval Workflows
  // ========================================
  console.log('⚡ Creating approval workflows...');
  
  // Standard approval workflow
  await prisma.approvalWorkflow.upsert({
    where: {
      id: 'default-workflow'
    },
    update: {},
    create: {
      id: 'default-workflow',
      companyId: demoCompany.id,
      name: 'Standard Approval Process',
      isDefault: true,
      amountThreshold: 1000.00,
      steps: [
        {
          order: 1,
          type: 'manager_approval',
          condition: 'amount >= 100',
          approverRole: 'MANAGER',
          description: 'Manager approval required for expenses over 100 PLN'
        },
        {
          order: 2,
          type: 'admin_approval',
          condition: 'amount >= 1000',
          approverRole: 'ADMIN',
          description: 'Admin approval required for expenses over 1000 PLN'
        }
      ],
      approverId: manager.id
    }
  });

  // Fast-track approval for small expenses
  await prisma.approvalWorkflow.upsert({
    where: {
      id: 'fast-track-workflow'
    },
    update: {},
    create: {
      id: 'fast-track-workflow',
      companyId: demoCompany.id,
      name: 'Fast Track (Under 100 PLN)',
      amountThreshold: 100.00,
      steps: [
        {
          order: 1,
          type: 'auto_approve',
          condition: 'amount < 100',
          description: 'Auto-approve expenses under 100 PLN'
        }
      ]
    }
  });

  // ========================================
  // Create Sample Notifications
  // ========================================
  console.log('🔔 Creating sample notifications...');
  
  await prisma.notification.createMany({
    data: [
      {
        userId: admin.id,
        title: 'Welcome to ExpenseFlow Pro',
        message: 'Your ExpenseFlow Pro system has been successfully set up. You can now start managing expenses efficiently.',
        type: 'SUCCESS'
      },
      {
        userId: manager.id,
        title: 'Manager Access Granted',
        message: 'You have been granted manager access to ExpenseFlow Demo Company. You can now approve expenses and manage team submissions.',
        type: 'INFO'
      },
      {
        userId: accountant.id,
        title: 'Accountant Role Assigned',
        message: 'Welcome to the accounting team! You can now process expense reports and manage financial workflows.',
        type: 'INFO'
      },
      {
        userId: employee.id,
        title: 'Employee Account Ready',
        message: 'Your employee account is ready. Start by uploading your first expense receipt!',
        type: 'INFO'
      }
    ]
  });

  // ========================================
  // Log Audit Events
  // ========================================
  console.log('📝 Creating audit log entries...');
  
  await prisma.auditLog.createMany({
    data: [
      {
        userId: admin.id,
        action: 'SYSTEM_SETUP',
        resource: 'System',
        newValues: {
          message: 'ExpenseFlow Pro system initialized with demo data',
          timestamp: new Date().toISOString()
        }
      },
      {
        userId: admin.id,
        action: 'CREATE',
        resource: 'Company',
        resourceId: demoCompany.id,
        newValues: {
          name: demoCompany.name,
          vatNumber: demoCompany.vatNumber
        }
      }
    ]
  });

  console.log('✅ Database seeding completed successfully!');
  console.log('\n📋 Demo Accounts Created:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('👤 Admin:      admin@expenseflow.com     / Admin123!');
  console.log('👤 Manager:    manager@expenseflow.com   / Manager123!');
  console.log('👤 Accountant: accountant@expenseflow.com / Accountant123!');
  console.log('👤 Employee:   employee@expenseflow.com  / Employee123!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`🏢 Company: ${demoCompany.name}`);
  console.log(`💰 Created ${categories.length} expense categories`);
  console.log('⚡ Created approval workflows');
  console.log('🔔 Created sample notifications');
  console.log('\n🚀 Your ExpenseFlow Pro backend is ready to use!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 