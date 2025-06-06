'use client';

/**
 * New Expense Submission Page
 * 
 * Comprehensive interface for employee expense submission with:
 * - Document upload with drag-and-drop
 * - Camera integration for mobile browsers
 * - Real-time OCR processing
 * - Form validation and manual entry
 * - Smart categorization
 * - Draft saving and offline support
 */

import React from 'react';
import ExpenseSubmissionForm from '@/components/expenses/ExpenseSubmissionForm';

export default function NewExpensePage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Submit New Expense</h1>
          <p className="text-gray-600 mt-1">Upload receipts and submit expense reports quickly</p>
        </div>
      </div>

      {/* Main Form */}
      <ExpenseSubmissionForm />
    </div>
  );
} 