const { faker } = require('@faker-js/faker');

// Set locale to Polish for more realistic data
faker.locale = 'pl';

class TestDataGenerator {
  static generateUser(overrides = {}) {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    
    return {
      firstName,
      lastName,
      email: faker.internet.email(firstName, lastName).toLowerCase(),
      password: 'TestPassword123!',
      role: faker.helpers.arrayElement(['employee', 'manager', 'finance', 'admin']),
      company: faker.company.name(),
      department: faker.commerce.department(),
      phoneNumber: faker.phone.number(),
      nip: this.generateNIP(),
      address: {
        street: faker.location.streetAddress(),
        city: faker.location.city(),
        postalCode: faker.location.zipCode(),
        country: 'Poland'
      },
      ...overrides
    };
  }

  static generateCompany(overrides = {}) {
    return {
      name: faker.company.name(),
      nip: this.generateNIP(),
      regon: this.generateREGON(),
      krs: this.generateKRS(),
      address: {
        street: faker.location.streetAddress(),
        city: faker.location.city(),
        postalCode: faker.location.zipCode(),
        country: 'Poland'
      },
      bankAccount: this.generateBankAccount(),
      taxId: this.generateNIP(),
      industry: faker.commerce.department(),
      ...overrides
    };
  }

  static generateExpense(overrides = {}) {
    const amount = faker.number.float({ min: 10, max: 5000, precision: 0.01 });
    const vatRate = faker.helpers.arrayElement([0, 5, 8, 23]); // Polish VAT rates
    const vatAmount = amount * (vatRate / 100);
    
    return {
      amount,
      currency: faker.helpers.arrayElement(['PLN', 'EUR', 'USD']),
      transactionDate: faker.date.recent({ days: 30 }),
      merchantName: faker.company.name(),
      merchantNip: this.generateNIP(),
      description: faker.commerce.productDescription(),
      category: faker.helpers.arrayElement([
        'Transport', 'Meals', 'Accommodation', 'Office Supplies', 
        'Marketing', 'Training', 'Technology', 'Utilities'
      ]),
      subcategory: faker.commerce.product(),
      vatAmount,
      vatRate,
      invoiceNumber: this.generateInvoiceNumber(),
      paymentMethod: faker.helpers.arrayElement(['cash', 'card', 'transfer']),
      project: faker.company.buzzPhrase(),
      costCenter: faker.string.alphanumeric(8).toUpperCase(),
      status: faker.helpers.arrayElement(['draft', 'submitted', 'approved', 'rejected']),
      attachments: [],
      notes: faker.lorem.sentence(),
      ...overrides
    };
  }

  static generateBankTransaction(overrides = {}) {
    const amount = faker.number.float({ min: -5000, max: 5000, precision: 0.01 });
    
    return {
      date: faker.date.recent({ days: 60 }),
      amount,
      currency: 'PLN',
      description: faker.finance.transactionDescription(),
      merchantName: faker.company.name(),
      accountNumber: this.generateBankAccount(),
      referenceNumber: faker.string.alphanumeric(16).toUpperCase(),
      balanceAfter: faker.number.float({ min: 0, max: 100000, precision: 0.01 }),
      type: amount > 0 ? 'credit' : 'debit',
      category: faker.helpers.arrayElement([
        'Transfer', 'Payment', 'Withdrawal', 'Deposit', 'Fee'
      ]),
      ...overrides
    };
  }

  static generateDocument(overrides = {}) {
    const types = ['receipt', 'invoice', 'bank_statement'];
    const type = faker.helpers.arrayElement(types);
    
    return {
      filename: `${faker.string.alphanumeric(8)}_${type}.pdf`,
      originalName: faker.system.fileName({ extensionCount: 1 }),
      mimeType: faker.helpers.arrayElement(['image/jpeg', 'image/png', 'application/pdf']),
      size: faker.number.int({ min: 1000, max: 5000000 }),
      type,
      uploadDate: faker.date.recent({ days: 7 }),
      ocrStatus: faker.helpers.arrayElement(['pending', 'processing', 'completed', 'failed']),
      ocrConfidence: faker.number.float({ min: 0.5, max: 1.0, precision: 0.01 }),
      extractedData: type === 'receipt' || type === 'invoice' ? this.generateExpense() : null,
      tags: faker.helpers.arrayElements([
        'business', 'travel', 'office', 'marketing', 'training'
      ], { min: 1, max: 3 }),
      ...overrides
    };
  }

  static generateBankStatement(overrides = {}) {
    const transactionCount = faker.number.int({ min: 5, max: 50 });
    const transactions = Array.from({ length: transactionCount }, () => 
      this.generateBankTransaction()
    );

    return {
      bankName: faker.helpers.arrayElement([
        'PKO Bank Polski', 'Bank Pekao', 'mBank', 'ING Bank Śląski', 
        'Santander Bank Polska', 'Bank Millennium'
      ]),
      accountNumber: this.generateBankAccount(),
      accountHolder: faker.person.fullName(),
      statementPeriod: {
        from: faker.date.past({ years: 1 }),
        to: faker.date.recent({ days: 1 })
      },
      openingBalance: faker.number.float({ min: 0, max: 50000, precision: 0.01 }),
      closingBalance: faker.number.float({ min: 0, max: 50000, precision: 0.01 }),
      transactions,
      currency: 'PLN',
      ...overrides
    };
  }

  static generateReimbursementRequest(overrides = {}) {
    const expenses = Array.from(
      { length: faker.number.int({ min: 1, max: 5 }) }, 
      () => this.generateExpense()
    );
    
    const totalAmount = expenses.reduce((sum, expense) => sum + expense.amount, 0);

    return {
      requestId: faker.string.alphanumeric(10).toUpperCase(),
      employeeId: faker.string.uuid(),
      expenses,
      totalAmount,
      currency: 'PLN',
      submissionDate: faker.date.recent({ days: 5 }),
      status: faker.helpers.arrayElement(['draft', 'submitted', 'under_review', 'approved', 'rejected', 'paid']),
      approver: faker.person.fullName(),
      approvalDate: faker.date.recent({ days: 2 }),
      comments: faker.lorem.paragraph(),
      paymentMethod: faker.helpers.arrayElement(['bank_transfer', 'cash', 'company_card']),
      paymentDate: faker.date.recent({ days: 1 }),
      ...overrides
    };
  }

  // Polish-specific data generators
  static generateNIP() {
    // Generate valid Polish NIP (10 digits with checksum)
    const digits = Array.from({ length: 9 }, () => faker.number.int({ min: 0, max: 9 }));
    const weights = [6, 5, 7, 2, 3, 4, 5, 6, 7];
    const sum = digits.reduce((acc, digit, index) => acc + digit * weights[index], 0);
    const checksum = sum % 11;
    digits.push(checksum < 10 ? checksum : 0);
    return digits.join('');
  }

  static generateREGON() {
    // Generate Polish REGON (9 digits)
    return Array.from({ length: 9 }, () => faker.number.int({ min: 0, max: 9 })).join('');
  }

  static generateKRS() {
    // Generate Polish KRS number
    return faker.string.numeric(10);
  }

  static generateBankAccount() {
    // Generate Polish bank account number (26 digits)
    return Array.from({ length: 26 }, () => faker.number.int({ min: 0, max: 9 })).join('');
  }

  static generateInvoiceNumber() {
    const year = faker.date.recent().getFullYear();
    const sequential = faker.number.int({ min: 1, max: 9999 });
    return `FV/${sequential.toString().padStart(4, '0')}/${year}`;
  }

  // Generate test datasets for specific scenarios
  static generateTestScenarios() {
    return {
      // Authentication test data
      auth: {
        validUser: this.generateUser({ role: 'employee' }),
        adminUser: this.generateUser({ role: 'admin' }),
        managerUser: this.generateUser({ role: 'manager' }),
        invalidUser: {
          email: 'invalid@example.com',
          password: 'wrongpassword'
        }
      },

      // Expense test data
      expenses: {
        validExpense: this.generateExpense({ status: 'draft' }),
        highValueExpense: this.generateExpense({ amount: 10000, status: 'submitted' }),
        multiCurrencyExpenses: [
          this.generateExpense({ currency: 'PLN' }),
          this.generateExpense({ currency: 'EUR' }),
          this.generateExpense({ currency: 'USD' })
        ],
        expenseWithVAT: this.generateExpense({ vatRate: 23, vatAmount: 230 }),
        expenseWithoutVAT: this.generateExpense({ vatRate: 0, vatAmount: 0 })
      },

      // Document test data
      documents: {
        validReceipt: this.generateDocument({ type: 'receipt' }),
        validInvoice: this.generateDocument({ type: 'invoice' }),
        bankStatement: this.generateDocument({ type: 'bank_statement' }),
        largeFile: this.generateDocument({ size: 4900000 }), // Just under 5MB limit
        oversizedFile: this.generateDocument({ size: 6000000 }) // Over 5MB limit
      },

      // Workflow test data
      workflows: {
        approvalWorkflow: {
          submitter: this.generateUser({ role: 'employee' }),
          approver: this.generateUser({ role: 'manager' }),
          expense: this.generateExpense({ status: 'submitted' })
        }
      }
    };
  }

  // Generate realistic Polish merchant names
  static generatePolishMerchant() {
    const merchantTypes = [
      'Restauracja', 'Hotel', 'Sklep', 'Stacja paliw', 'Apteka',
      'Księgarnia', 'Market', 'Centrum handlowe', 'Biuro podróży'
    ];
    
    const merchantNames = [
      'Pod Wawelem', 'Złoty Róg', 'Biały Orzeł', 'Stary Browar',
      'Czerwona Torebka', 'Zielona Góra', 'Nowy Świat', 'Stare Miasto'
    ];

    const type = faker.helpers.arrayElement(merchantTypes);
    const name = faker.helpers.arrayElement(merchantNames);
    
    return `${type} "${name}" Sp. z o.o.`;
  }
}

module.exports = TestDataGenerator; 