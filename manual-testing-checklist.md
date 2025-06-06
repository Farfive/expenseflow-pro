# ExpenseFlow Pro - Manual Testing Checklist

## 🚀 Quick Setup Verification
- [ ] Backend running: http://localhost:3002
- [ ] Frontend accessible: http://localhost:3000  
- [ ] Auto-login working (no login page shown)
- [ ] Dashboard loads without errors

---

## 📋 SCENARIO 1: Business Professional - Monthly Expense Report
**User:** Sarah Johnson (Sales Manager)

### Upload & Process Documents
- [ ] Navigate to: http://localhost:3000/dashboard/expenses/new
- [ ] Upload restaurant receipt (Amount: $125.50, Merchant: "Elegant Bistro")
- [ ] Verify OCR extracts data automatically
- [ ] Select Category: "Business Meals"
- [ ] Submit expense successfully

- [ ] Upload hotel receipt (Amount: $340.00, Merchant: "Grand Hotel Warsaw")  
- [ ] Select Category: "Accommodation"
- [ ] Submit expense successfully

- [ ] Upload transportation receipt (Amount: $45.30, Merchant: "Uber Technologies")
- [ ] Select Category: "Transportation"
- [ ] Submit expense successfully

### Verify Data & Analytics
- [ ] Check expenses list: http://localhost:3000/dashboard/expenses
- [ ] Verify all 3 expenses appear with correct amounts
- [ ] Check analytics: http://localhost:3000/dashboard/analytics
- [ ] Verify charts show category breakdown
- [ ] Confirm total amount matches submissions ($510.80)

---

## 📋 SCENARIO 2: IT Consultant - Equipment Purchase  
**User:** Michael Chen (IT Consultant)

### Upload High-Value Equipment
- [ ] Navigate to new expense form
- [ ] Upload equipment invoice (Amount: $1299.99, Merchant: "TechStore Pro")
- [ ] Select Category: "Equipment"
- [ ] Verify high-value validation (if any)
- [ ] Submit successfully

- [ ] Upload software receipt (Amount: $199.00, Merchant: "Microsoft Store")
- [ ] Select Category: "Software"  
- [ ] Submit successfully

### Verify Processing
- [ ] Check total equipment expenses ($1498.99)
- [ ] Verify equipment categories in analytics
- [ ] Check approval workflow (if triggered)

---

## 📋 SCENARIO 3: Marketing Manager - Conference & Travel
**User:** Lisa Rodriguez (Marketing Manager)

### Upload Travel Expenses
- [ ] Upload flight ticket (Amount: $650.00, Merchant: "LOT Polish Airlines")
- [ ] Category: "Transportation"
- [ ] Submit successfully

- [ ] Upload conference receipt (Amount: $399.00, Merchant: "MarketingPro Conference")
- [ ] Category: "Training & Development" 
- [ ] Submit successfully

- [ ] Upload parking receipt (Amount: $25.00, Merchant: "Airport Parking")
- [ ] Category: "Transportation"
- [ ] Submit successfully

### Verify Travel Analytics
- [ ] Check travel total ($1074.00)
- [ ] Verify transportation category shows multiple entries
- [ ] Confirm training/development category appears
- [ ] Check if related expenses are grouped

---

## 🔧 Functionality Testing

### Core Features
- [ ] File drag-and-drop works
- [ ] Image preview displays correctly
- [ ] OCR processing shows progress indicator
- [ ] Form auto-populates from OCR data
- [ ] Category dropdown is populated
- [ ] Date picker functions correctly
- [ ] Amount validation works
- [ ] Success messages appear after submission

### Navigation & UI
- [ ] Sidebar navigation works smoothly
- [ ] Dashboard widgets display data
- [ ] Charts update with new expenses
- [ ] Responsive design (test different browser sizes)
- [ ] Loading states are clear
- [ ] Error messages are helpful (test invalid data)

### Analytics & Charts
- [ ] Expense by category chart updates
- [ ] Monthly trends show activity
- [ ] Department breakdown is accurate
- [ ] Total amounts match submissions
- [ ] Export functionality works (if available)

---

## ✅ Success Criteria

**All scenarios should demonstrate:**
- ✅ Document upload without errors
- ✅ OCR processing completes successfully  
- ✅ Data reconciliation and categorization works
- ✅ Charts and analytics update in real-time
- ✅ All buttons and navigation functional
- ✅ No console errors in browser developer tools

---

## 🚨 Issues to Watch For
- ❌ Upload failures or timeouts
- ❌ OCR not extracting data
- ❌ Form validation errors
- ❌ Charts not updating
- ❌ Navigation broken links
- ❌ Console errors or warnings

---

## 📊 Expected Totals After All Scenarios
- **Total Expenses:** 8 documents
- **Total Amount:** ~$3,083.79
- **Categories Used:** Business Meals, Accommodation, Transportation, Equipment, Software, Training & Development
- **Users Represented:** Sales, IT, Marketing departments

## 🎉 Test Completion
When all checkboxes are marked ✅, ExpenseFlow Pro has passed comprehensive user scenario testing and is ready for production use! 