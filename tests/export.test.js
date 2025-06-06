/**
 * Comprehensive Export System Tests
 * 
 * Tests all export formats, accounting integrations, and advanced features
 */

const request = require('supertest');
const fs = require('fs').promises;
const path = require('path');
const app = require('../src/server');
const ComprehensiveExportService = require('../src/services/exportService');

describe('Comprehensive Export System', () => {
  let exportService;
  let authToken;
  let testCompanyId;
  let testUserId;

  beforeAll(async () => {
    // Initialize export service
    exportService = new ComprehensiveExportService();

    // Setup test authentication
    const authResponse = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'test@example.com',
        password: 'password123'
      });

    authToken = authResponse.body.token;
    testCompanyId = authResponse.body.user.companyId;
    testUserId = authResponse.body.user.id;
  });

  afterAll(async () => {
    // Cleanup test files
    const exportDir = path.join(process.cwd(), 'exports');
    try {
      const files = await fs.readdir(exportDir);
      for (const file of files) {
        if (file.startsWith('test_')) {
          await fs.unlink(path.join(exportDir, file));
        }
      }
    } catch (error) {
      // Directory might not exist
    }
  });

  describe('Standard Export Formats', () => {
    test('should export data as CSV', async () => {
      const exportOptions = {
        format: 'csv',
        period: {
          start: new Date('2024-01-01'),
          end: new Date('2024-01-31')
        },
        csvOptions: {
          delimiter: ',',
          includeHeaders: true,
          fieldMapping: {
            'Date': 'transactionDate',
            'Amount': 'amount',
            'Description': 'description',
            'Category': 'category.name'
          }
        }
      };

      const result = await exportService.exportData(exportOptions);

      expect(result.success).toBe(true);
      expect(result.format).toBe('csv');
      expect(result.fileName).toMatch(/\.csv$/);
      expect(result.recordCount).toBeGreaterThan(0);

      // Verify file exists
      const fileExists = await fs.access(result.filePath).then(() => true).catch(() => false);
      expect(fileExists).toBe(true);
    });

    test('should export data as Excel', async () => {
      const exportOptions = {
        format: 'excel',
        period: {
          start: new Date('2024-01-01'),
          end: new Date('2024-01-31')
        },
        excelOptions: {
          sheetName: 'Expenses',
          includeHeaders: true,
          formatting: {
            columnWidths: [15, 30, 10, 20, 15]
          }
        }
      };

      const result = await exportService.exportData(exportOptions);

      expect(result.success).toBe(true);
      expect(result.format).toBe('excel');
      expect(result.fileName).toMatch(/\.xlsx$/);
      expect(result.sheets).toContain('Expenses');
    });

    test('should export data as JSON', async () => {
      const exportOptions = {
        format: 'json',
        period: {
          start: new Date('2024-01-01'),
          end: new Date('2024-01-31')
        },
        jsonOptions: {
          pretty: true,
          metadata: true,
          groupBy: 'category'
        }
      };

      const result = await exportService.exportData(exportOptions);

      expect(result.success).toBe(true);
      expect(result.format).toBe('json');
      expect(result.fileName).toMatch(/\.json$/);
      expect(result.pretty).toBe(true);
    });

    test('should export data as XML', async () => {
      const exportOptions = {
        format: 'xml',
        period: {
          start: new Date('2024-01-01'),
          end: new Date('2024-01-31')
        },
        xmlOptions: {
          rootElement: 'ExpenseData',
          recordElement: 'Expense'
        }
      };

      const result = await exportService.exportData(exportOptions);

      expect(result.success).toBe(true);
      expect(result.format).toBe('xml');
      expect(result.fileName).toMatch(/\.xml$/);
      expect(result.rootElement).toBe('ExpenseData');
    });

    test('should export data as PDF', async () => {
      const exportOptions = {
        format: 'pdf',
        period: {
          start: new Date('2024-01-01'),
          end: new Date('2024-01-31')
        },
        pdfOptions: {
          template: 'default',
          orientation: 'portrait',
          format: 'A4'
        }
      };

      const result = await exportService.exportData(exportOptions);

      expect(result.success).toBe(true);
      expect(result.format).toBe('pdf');
      expect(result.fileName).toMatch(/\.pdf$/);
      expect(result.orientation).toBe('portrait');
    }, 30000); // PDF generation can take longer
  });

  describe('Accounting Software Integration', () => {
    test('should create QuickBooks export via API', async () => {
      const response = await request(app)
        .post('/api/v1/exports/quickbooks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          period: {
            start: '2024-01-01T00:00:00Z',
            end: '2024-01-31T23:59:59Z'
          },
          includeExpenses: true,
          includeTransactions: false
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.format).toBe('csv');
    });

    test('should create Xero export via API', async () => {
      const response = await request(app)
        .post('/api/v1/exports/xero')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          period: {
            start: '2024-01-01T00:00:00Z',
            end: '2024-01-31T23:59:59Z'
          },
          accountCode: '200'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.format).toBe('csv');
    });

    test('should create Sage export via API', async () => {
      const response = await request(app)
        .post('/api/v1/exports/sage')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          period: {
            start: '2024-01-01T00:00:00Z',
            end: '2024-01-31T23:59:59Z'
          },
          nominalCodes: ['7500', '7600']
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.format).toBe('xml');
    });
  });

  describe('Custom Templates', () => {
    test('should export using custom Handlebars template', async () => {
      const customTemplate = `{{#each data}}{{formatDate transactionDate "YYYY-MM-DD"}},{{amount}},"{{description}}"
{{/each}}`;

      const exportOptions = {
        format: 'custom',
        period: {
          start: new Date('2024-01-01'),
          end: new Date('2024-01-31')
        },
        customOptions: {
          templateSource: customTemplate,
          outputFormat: 'csv'
        }
      };

      const result = await exportService.exportData(exportOptions);

      expect(result.success).toBe(true);
      expect(result.format).toBe('custom');
      expect(result.outputFormat).toBe('csv');
    });

    test('should create custom template via API', async () => {
      const response = await request(app)
        .post('/api/v1/exports/custom-template')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Custom Template',
          description: 'Test template for unit tests',
          templateSource: '{{#each data}}{{formatDate transactionDate "YYYY-MM-DD"}},{{amount}}\n{{/each}}',
          outputFormat: 'csv',
          category: 'testing'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Test Custom Template');
    });
  });

  describe('Batch and Scheduled Exports', () => {
    test('should create batch export for multiple periods', async () => {
      const batchOptions = {
        periods: [
          {
            start: new Date('2024-01-01'),
            end: new Date('2024-01-31')
          },
          {
            start: new Date('2024-02-01'),
            end: new Date('2024-02-29')
          }
        ],
        format: 'csv',
        zipOutput: true,
        options: {
          csvOptions: {
            includeHeaders: true
          }
        }
      };

      const result = await exportService.batchExport(batchOptions);

      expect(result.success).toBe(true);
      expect(result.totalPeriods).toBe(2);
      expect(result.results).toHaveLength(2);
      expect(result.zipFile).toBeDefined();
    });

    test('should schedule export via API', async () => {
      const response = await request(app)
        .post('/api/v1/exports/schedule')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Scheduled Export',
          schedule: '0 0 1 * *', // Monthly
          exportConfig: {
            format: 'csv',
            period: {
              start: '{{previousMonth.start}}',
              end: '{{previousMonth.end}}'
            }
          },
          enabled: true
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.taskId).toBeDefined();
    });

    test('should get scheduled exports', async () => {
      const response = await request(app)
        .get('/api/v1/exports/scheduled')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('Export Management', () => {
    test('should get active exports', async () => {
      const response = await request(app)
        .get('/api/v1/exports/active')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    test('should get export history', async () => {
      const response = await request(app)
        .get('/api/v1/exports/history?limit=10')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.exports).toBeDefined();
      expect(response.body.data.pagination).toBeDefined();
    });

    test('should get available templates', async () => {
      const response = await request(app)
        .get('/api/v1/exports/templates')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      
      // Check for built-in templates
      const templateNames = response.body.data.map(t => t.id);
      expect(templateNames).toContain('quickbooks_csv');
      expect(templateNames).toContain('xero_csv');
      expect(templateNames).toContain('sage_xml');
    });
  });

  describe('Data Validation', () => {
    test('should validate export request format', async () => {
      const response = await request(app)
        .post('/api/v1/exports/create')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          format: 'invalid_format',
          period: {
            start: '2024-01-01T00:00:00Z',
            end: '2024-01-31T23:59:59Z'
          }
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });

    test('should validate date range', async () => {
      const response = await request(app)
        .post('/api/v1/exports/create')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          format: 'csv',
          period: {
            start: '2024-02-01T00:00:00Z',
            end: '2024-01-01T23:59:59Z' // End before start
          }
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/v1/exports/create')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          format: 'csv'
          // Missing period
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid template', async () => {
      const exportOptions = {
        format: 'custom',
        period: {
          start: new Date('2024-01-01'),
          end: new Date('2024-01-31')
        },
        customOptions: {
          templateSource: '{{invalidHelper data}}', // Invalid helper
          outputFormat: 'csv'
        }
      };

      const result = await exportService.exportData(exportOptions);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Helper');
    });

    test('should handle empty data set', async () => {
      const exportOptions = {
        format: 'csv',
        period: {
          start: new Date('2030-01-01'), // Future date with no data
          end: new Date('2030-01-31')
        }
      };

      const result = await exportService.exportData(exportOptions);

      expect(result.success).toBe(true);
      expect(result.recordCount).toBe(0);
    });

    test('should handle file system errors gracefully', async () => {
      // Mock fs.writeFile to simulate error
      const originalWriteFile = fs.writeFile;
      fs.writeFile = jest.fn().mockRejectedValue(new Error('Disk full'));

      const exportOptions = {
        format: 'csv',
        period: {
          start: new Date('2024-01-01'),
          end: new Date('2024-01-31')
        }
      };

      const result = await exportService.exportData(exportOptions);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();

      // Restore original function
      fs.writeFile = originalWriteFile;
    });
  });

  describe('Performance and Concurrency', () => {
    test('should handle multiple concurrent exports', async () => {
      const exportPromises = [];

      for (let i = 0; i < 3; i++) {
        const promise = request(app)
          .post('/api/v1/exports/create')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            format: 'csv',
            period: {
              start: '2024-01-01T00:00:00Z',
              end: '2024-01-31T23:59:59Z'
            }
          });
        
        exportPromises.push(promise);
      }

      const results = await Promise.all(exportPromises);

      results.forEach(result => {
        expect(result.status).toBe(200);
        expect(result.body.success).toBe(true);
      });
    });

    test('should handle large datasets efficiently', async () => {
      const startTime = Date.now();

      const exportOptions = {
        format: 'csv',
        period: {
          start: new Date('2024-01-01'),
          end: new Date('2024-12-31')
        }
      };

      const result = await exportService.exportData(exportOptions);
      const processingTime = Date.now() - startTime;

      expect(result.success).toBe(true);
      expect(processingTime).toBeLessThan(30000); // Should complete within 30 seconds
    }, 35000);
  });

  describe('Integration Tests', () => {
    test('should complete full export workflow', async () => {
      // 1. Create export
      const createResponse = await request(app)
        .post('/api/v1/exports/create')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          format: 'csv',
          period: {
            start: '2024-01-01T00:00:00Z',
            end: '2024-01-31T23:59:59Z'
          }
        });

      expect(createResponse.status).toBe(200);
      const exportId = createResponse.body.data.exportId;

      // 2. Check status (should be completed quickly for small dataset)
      await new Promise(resolve => setTimeout(resolve, 1000));

      const statusResponse = await request(app)
        .get(`/api/v1/exports/status/${exportId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(statusResponse.status).toBe(200);

      // 3. Download export (if completed)
      if (statusResponse.body.data.status === 'COMPLETED') {
        const downloadResponse = await request(app)
          .get(`/api/v1/exports/download/${exportId}`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(downloadResponse.status).toBe(200);
        expect(downloadResponse.headers['content-type']).toContain('text/csv');
      }
    });
  });
});

// Performance benchmarks
describe('Export Performance Benchmarks', () => {
  let exportService;

  beforeAll(() => {
    exportService = new ComprehensiveExportService();
  });

  test('CSV export benchmark', async () => {
    const startTime = process.hrtime.bigint();

    const result = await exportService.exportData({
      format: 'csv',
      period: {
        start: new Date('2024-01-01'),
        end: new Date('2024-01-31')
      }
    });

    const endTime = process.hrtime.bigint();
    const durationMs = Number(endTime - startTime) / 1000000;

    console.log(`CSV Export Performance: ${durationMs.toFixed(2)}ms for ${result.recordCount} records`);
    
    expect(result.success).toBe(true);
    expect(durationMs).toBeLessThan(5000); // Should complete within 5 seconds
  });

  test('Excel export benchmark', async () => {
    const startTime = process.hrtime.bigint();

    const result = await exportService.exportData({
      format: 'excel',
      period: {
        start: new Date('2024-01-01'),
        end: new Date('2024-01-31')
      }
    });

    const endTime = process.hrtime.bigint();
    const durationMs = Number(endTime - startTime) / 1000000;

    console.log(`Excel Export Performance: ${durationMs.toFixed(2)}ms for ${result.recordCount} records`);
    
    expect(result.success).toBe(true);
    expect(durationMs).toBeLessThan(10000); // Should complete within 10 seconds
  });
}); 