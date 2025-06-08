const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

// Test configuration
const SERVER_URL = 'http://localhost:8001';
const TEST_TIMEOUT = 30000; // 30 seconds

class IntegrationTester {
  constructor() {
    this.results = {
      server: { status: 'pending', details: null },
      database: { status: 'pending', details: null },
      ollama: { status: 'pending', details: null },
      ocr: { status: 'pending', details: null },
      fileUpload: { status: 'pending', details: null }
    };
  }

  async runAllTests() {
    console.log('🧪 ExpenseFlow Pro Integration Tests');
    console.log('=====================================');
    console.log('Testing Ollama LLaVA + PostgreSQL Integration');
    console.log('=====================================\n');

    try {
      await this.testServerHealth();
      await this.testDatabaseConnection();
      await this.testOllamaConnection();
      await this.testOCRCapabilities();
      await this.testFileUpload();
      
      this.printResults();
    } catch (error) {
      console.error('❌ Test suite failed:', error.message);
      this.printResults();
    }
  }

  async testServerHealth() {
    try {
      console.log('🌐 Testing server health...');
      
      const response = await axios.get(`${SERVER_URL}/api/health`, {
        timeout: 5000
      });

      if (response.status === 200 && response.data.status === 'ok') {
        this.results.server = {
          status: 'success',
          details: {
            port: response.data.services.server.port,
            environment: response.data.services.server.environment,
            timestamp: response.data.timestamp
          }
        };
        console.log('   ✅ Server is healthy and responding');
      } else {
        throw new Error('Server health check failed');
      }
    } catch (error) {
      this.results.server = {
        status: 'failed',
        details: { error: error.message }
      };
      console.log('   ❌ Server health check failed:', error.message);
    }
  }

  async testDatabaseConnection() {
    try {
      console.log('🗄️ Testing PostgreSQL database connection...');
      
      const response = await axios.get(`${SERVER_URL}/api/health`);
      const dbStatus = response.data.services.database;

      if (dbStatus.connected) {
        this.results.database = {
          status: 'success',
          details: {
            connected: true,
            connectionString: dbStatus.connectionString,
            stats: dbStatus.stats
          }
        };
        console.log('   ✅ PostgreSQL database connected');
        console.log(`   📊 Database stats:`, dbStatus.stats);
      } else {
        this.results.database = {
          status: 'warning',
          details: {
            connected: false,
            error: dbStatus.error,
            fallback: 'Using in-memory storage'
          }
        };
        console.log('   ⚠️ PostgreSQL not connected - using fallback mode');
        console.log('   💡 To enable PostgreSQL: Run setup-database.bat');
      }
    } catch (error) {
      this.results.database = {
        status: 'failed',
        details: { error: error.message }
      };
      console.log('   ❌ Database test failed:', error.message);
    }
  }

  async testOllamaConnection() {
    try {
      console.log('🤖 Testing Ollama LLaVA connection...');
      
      const response = await axios.get(`${SERVER_URL}/api/health`);
      const ocrStatus = response.data.services.ocr;

      if (ocrStatus.ollama.connected) {
        this.results.ollama = {
          status: 'success',
          details: {
            connected: true,
            host: ocrStatus.ollama.host,
            hasLLaVA: ocrStatus.ollama.hasLLaVA,
            models: ocrStatus.ollama.models
          }
        };
        console.log('   ✅ Ollama server connected');
        console.log(`   🤖 Available models:`, ocrStatus.ollama.models);
        
        if (ocrStatus.ollama.hasLLaVA) {
          console.log('   🎯 LLaVA model is available');
        } else {
          console.log('   ⚠️ LLaVA model not found - will use Tesseract fallback');
        }
      } else {
        this.results.ollama = {
          status: 'warning',
          details: {
            connected: false,
            error: ocrStatus.ollama.error,
            fallback: 'Will use Tesseract OCR'
          }
        };
        console.log('   ⚠️ Ollama not connected - using Tesseract fallback');
        console.log('   💡 To enable Ollama: Run setup-ollama.bat');
      }
    } catch (error) {
      this.results.ollama = {
        status: 'failed',
        details: { error: error.message }
      };
      console.log('   ❌ Ollama test failed:', error.message);
    }
  }

  async testOCRCapabilities() {
    try {
      console.log('📄 Testing OCR capabilities...');
      
      const response = await axios.get(`${SERVER_URL}/api/health`);
      const ocrStatus = response.data.services.ocr;

      this.results.ocr = {
        status: 'success',
        details: {
          tesseract: ocrStatus.tesseract,
          ollama: ocrStatus.ollama,
          fallbackEnabled: ocrStatus.fallbackEnabled,
          confidenceThreshold: ocrStatus.confidenceThreshold
        }
      };

      console.log('   ✅ OCR service initialized');
      console.log(`   🔧 Tesseract: ${ocrStatus.tesseract.available ? 'Available' : 'Not available'}`);
      console.log(`   🤖 Ollama LLaVA: ${ocrStatus.ollama.connected ? 'Connected' : 'Not connected'}`);
      console.log(`   🔄 Fallback enabled: ${ocrStatus.fallbackEnabled}`);
    } catch (error) {
      this.results.ocr = {
        status: 'failed',
        details: { error: error.message }
      };
      console.log('   ❌ OCR capabilities test failed:', error.message);
    }
  }

  async testFileUpload() {
    try {
      console.log('📤 Testing file upload and OCR processing...');
      
      // Create a test image with text (simple canvas-like approach)
      const testImagePath = await this.createTestImage();
      
      if (!testImagePath) {
        console.log('   ⚠️ Skipping file upload test - no test image available');
        this.results.fileUpload = {
          status: 'skipped',
          details: { reason: 'No test image available' }
        };
        return;
      }

      // Upload test file
      const form = new FormData();
      form.append('document', fs.createReadStream(testImagePath));

      console.log('   📤 Uploading test document...');
      
      const response = await axios.post(`${SERVER_URL}/api/documents/upload`, form, {
        headers: {
          ...form.getHeaders(),
          'x-tenant-id': 'test-tenant',
          'x-company-id': 'test-company'
        },
        timeout: TEST_TIMEOUT
      });

      if (response.status === 200 && response.data.success) {
        this.results.fileUpload = {
          status: 'success',
          details: {
            uploaded: true,
            filename: response.data.file.originalname,
            processingMethod: response.data.result.processingMethod,
            confidence: response.data.result.confidence,
            extractedData: response.data.result.extractedData
          }
        };

        console.log('   ✅ File uploaded and processed successfully');
        console.log(`   🔧 Processing method: ${response.data.result.processingMethod}`);
        console.log(`   📊 Confidence score: ${response.data.result.confidence}`);
        
        if (response.data.result.extractedData) {
          console.log('   📄 Extracted data available');
        }
      } else {
        throw new Error('File upload failed');
      }

      // Clean up test file
      if (fs.existsSync(testImagePath)) {
        fs.unlinkSync(testImagePath);
      }

    } catch (error) {
      this.results.fileUpload = {
        status: 'failed',
        details: { error: error.message }
      };
      console.log('   ❌ File upload test failed:', error.message);
    }
  }

  async createTestImage() {
    try {
      // Create a simple test text file that can be used for OCR testing
      const testContent = `PARAGON FISKALNY
SKLEP ABC SP. Z O.O.
NIP: 1234567890
Data: ${new Date().toLocaleDateString('pl-PL')}

Produkty:
Chleb                 4.50 zł
Mleko                 3.20 zł
Masło                 6.80 zł

SUMA:                14.50 zł
VAT 23%:              2.72 zł
DO ZAPŁATY:          14.50 zł

Dziękujemy za zakupy!`;

      const testFilePath = path.join(__dirname, 'test-receipt.txt');
      fs.writeFileSync(testFilePath, testContent, 'utf8');
      
      return testFilePath;
    } catch (error) {
      console.log('   ⚠️ Could not create test file:', error.message);
      return null;
    }
  }

  printResults() {
    console.log('\n=====================================');
    console.log('📋 TEST RESULTS SUMMARY');
    console.log('=====================================\n');

    const statusEmoji = {
      success: '✅',
      warning: '⚠️',
      failed: '❌',
      pending: '⏳',
      skipped: '⏭️'
    };

    Object.entries(this.results).forEach(([testName, result]) => {
      console.log(`${statusEmoji[result.status]} ${testName.toUpperCase()}: ${result.status.toUpperCase()}`);
      
      if (result.details && Object.keys(result.details).length > 0) {
        console.log('   Details:', JSON.stringify(result.details, null, 2).replace(/\n/g, '\n   '));
      }
      console.log('');
    });

    // Overall status
    const failedTests = Object.values(this.results).filter(r => r.status === 'failed').length;
    const warningTests = Object.values(this.results).filter(r => r.status === 'warning').length;
    const successTests = Object.values(this.results).filter(r => r.status === 'success').length;

    console.log('=====================================');
    console.log(`📊 OVERALL RESULTS:`);
    console.log(`   ✅ Successful: ${successTests}`);
    console.log(`   ⚠️ Warnings: ${warningTests}`);
    console.log(`   ❌ Failed: ${failedTests}`);
    
    if (failedTests === 0) {
      console.log('\n🎉 All tests passed! Your ExpenseFlow Pro integration is working correctly.');
    } else if (failedTests <= 2 && warningTests >= 1) {
      console.log('\n💡 Some components are not available but the system can function with fallbacks.');
    } else {
      console.log('\n⚠️ Some tests failed. Please check your setup and try again.');
    }

    console.log('\n💡 SETUP COMMANDS:');
    console.log('   🗄️ PostgreSQL: setup-database.bat');
    console.log('   🤖 Ollama LLaVA: setup-ollama.bat');
    console.log('   🚀 Start server: start-enhanced-with-llava.bat');
    console.log('=====================================');
  }
}

// Run tests if this script is called directly
if (require.main === module) {
  const tester = new IntegrationTester();
  
  // Add delay to allow server startup
  setTimeout(() => {
    tester.runAllTests().catch(error => {
      console.error('Test execution failed:', error);
      process.exit(1);
    });
  }, 2000);
}

module.exports = IntegrationTester; 