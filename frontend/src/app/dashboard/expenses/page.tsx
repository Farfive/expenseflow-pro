/**
 * Employee Expenses Dashboard
 * 
 * Main interface for employees to manage their expenses
 */

import React from 'react';
import ExpensesList from '@/components/expenses/ExpensesList';
import ExpenseStats from '@/components/expenses/ExpenseStats';
import QuickActions from '@/components/expenses/QuickActions';

export default function ExpensesPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Expenses</h1>
          <p className="text-gray-600 mt-1">Track and manage your expense submissions</p>
        </div>
      </div>

      {/* Quick Stats */}
      <ExpenseStats />

      {/* Quick Actions */}
      <QuickActions />

      {/* Expenses List */}
      <ExpensesList />
    </div>
  );
} 