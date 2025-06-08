const fs = require('fs');
const path = require('path');

// Test file upload and OCR functionality
async function testFileUploadAndOCR() {
  console.log('🧪 Testing ExpenseFlow Pro File Upload & OCR Functionality');
  console.log('='.repeat(60));

  try {
    // Test 1: Check if backend is running
    console.log('\n1. Testing Backend Connection...');
    const healthResponse = await fetch('http://localhost:3003/api/health');
    if (healthResponse.ok) {
      const healthData = await healthResponse.json();
      console.log('✅ Backend is running:', healthData.status);
    } else {
      throw new Error('Backend not responding');
    }

    // Test 2: Check available endpoints
    console.log('\n2. Testing Available Endpoints...');
    const rootResponse = await fetch('http://localhost:3003/');
    if (rootResponse.ok) {
      const rootData = await rootResponse.json();
      console.log('✅ Available endpoints:', Object.keys(rootData.endpoints).length);
      
      // Check for file upload endpoints
      const hasUpload = rootData.endpoints.uploadDocument || 
                       Object.values(rootData.endpoints).some(endpoint => 
                         endpoint.includes('upload') || endpoint.includes('documents')
                       );
      console.log('📄 File upload endpoints available:', hasUpload ? 'Yes' : 'No');
    }

    // Test 3: Create a test image file (simple base64 encoded image)
    console.log('\n3. Creating Test Receipt Image...');
    const testImageData = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    
    // Convert base64 to buffer for testing
    const base64Data = testImageData.replace(/^data:image\/png;base64,/, '');
    const imageBuffer = Buffer.from(base64Data, 'base64');
    
    // Save test image
    const testImagePath = path.join(__dirname, 'test-receipt.png');
    fs.writeFileSync(testImagePath, imageBuffer);
    console.log('✅ Test receipt image created:', testImagePath);

    // Test 4: Test file upload endpoint
    console.log('\n4. Testing File Upload...');
    const FormData = require('form-data');
    const form = new FormData();
    form.append('file', fs.createReadStream(testImagePath), {
      filename: 'test-receipt.png',
      contentType: 'image/png'
    });

    try {
      const uploadResponse = await fetch('http://localhost:3003/api/documents/upload', {
        method: 'POST',
        body: form,
        headers: form.getHeaders()
      });

      if (uploadResponse.ok) {
        const uploadData = await uploadResponse.json();
        console.log('✅ File upload successful:', uploadData.data.filename);
        
        const documentId = uploadData.data.documentId;
        
        // Test 5: Test OCR processing
        console.log('\n5. Testing OCR Processing...');
        const ocrResponse = await fetch(`http://localhost:3003/api/documents/${documentId}/process`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });

        if (ocrResponse.ok) {
          const ocrData = await ocrResponse.json();
          console.log('✅ OCR processing successful');
          console.log('📊 Extracted data:');
          console.log('   - Amount:', ocrData.data.ocrData.totalAmount, ocrData.data.ocrData.currency);
          console.log('   - Merchant:', ocrData.data.ocrData.merchantName);
          console.log('   - Date:', ocrData.data.ocrData.transactionDate);
          console.log('   - Confidence:', (ocrData.data.ocrData.confidence * 100).toFixed(1) + '%');
        } else {
          console.log('❌ OCR processing failed:', await ocrResponse.text());
        }

        // Test 6: Test expense creation
        console.log('\n6. Testing Expense Creation...');
        const expenseData = {
          title: 'Test Expense from OCR',
          amount: ocrData.data.ocrData.totalAmount || 50.00,
          currency: ocrData.data.ocrData.currency || 'PLN',
          transactionDate: ocrData.data.ocrData.transactionDate || new Date().toISOString().split('T')[0],
          merchantName: ocrData.data.ocrData.merchantName || 'Test Merchant',
          description: 'Automatically created from uploaded receipt',
          categoryId: 'office-supplies',
          isReimbursable: true
        };

        const expenseResponse = await fetch('http://localhost:3003/api/expenses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(expenseData)
        });

        if (expenseResponse.ok) {
          const expenseResult = await expenseResponse.json();
          console.log('✅ Expense created successfully:', expenseResult.data.id);
        } else {
          console.log('❌ Expense creation failed:', await expenseResponse.text());
        }

        // Test 7: Test expense statistics
        console.log('\n7. Testing Expense Statistics...');
        const statsResponse = await fetch('http://localhost:3003/api/expenses/stats');
        if (statsResponse.ok) {
          const statsData = await statsResponse.json();
          console.log('✅ Expense statistics retrieved:');
          console.log('   - Total expenses:', statsData.data.totalExpenses);
          console.log('   - Total amount:', statsData.data.totalAmount.toFixed(2), 'PLN');
          console.log('   - Categories:', statsData.data.categoryBreakdown.length);
        }

      } else {
        console.log('❌ File upload failed:', await uploadResponse.text());
      }
    } catch (uploadError) {
      console.log('❌ Upload error:', uploadError.message);
    }

    // Test 8: Test frontend accessibility
    console.log('\n8. Testing Frontend Accessibility...');
    try {
      const frontendResponse = await fetch('http://localhost:3001/');
      if (frontendResponse.ok) {
        console.log('✅ Frontend is accessible at http://localhost:3001');
        console.log('📱 Expense submission page: http://localhost:3001/dashboard/expenses/new');
      } else {
        console.log('❌ Frontend not accessible');
      }
    } catch (frontendError) {
      console.log('❌ Frontend connection failed:', frontendError.message);
    }

    // Cleanup
    if (fs.existsSync(testImagePath)) {
      fs.unlinkSync(testImagePath);
      console.log('\n🧹 Test file cleaned up');
    }

    console.log('\n🎉 File Upload & OCR Test Complete!');
    console.log('\nNext Steps:');
    console.log('1. Open http://localhost:3001/dashboard/expenses/new');
    console.log('2. Upload a receipt image or PDF');
    console.log('3. Watch the OCR processing extract data automatically');
    console.log('4. Verify the data in the form fields');
    console.log('5. Submit the expense and check the dashboard');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\nTroubleshooting:');
    console.log('- Make sure backend is running on port 3003');
    console.log('- Make sure frontend is running on port 3001');
    console.log('- Check that all dependencies are installed');
  }
}

// Run the test
testFileUploadAndOCR().catch(console.error); 