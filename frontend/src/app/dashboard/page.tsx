'use client';

import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Receipt, 
  Clock, 
  CheckCircle,
  AlertCircle,
  FileText,
  Users,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Download,
  Filter
} from 'lucide-react';
import Link from 'next/link';
import { RootState } from '@/store';
import { formatCurrency, formatNumber, formatRelativeDate } from '@/utils/formatters';
import { ExpenseStatus, UserRole } from '@/types';

interface DashboardStats {
  totalExpenses: number;
  monthlyExpenses: number;
  pendingApproval: number;
  approvedExpenses: number;
  totalDocuments: number;
  averageProcessingTime: number;
  monthlyChange: number;
  expensesByCategory: { [key: string]: number };
  recentExpenses: any[];
  monthlyTrend: { month: string; amount: number }[];
}

// Mock data - in real app this would come from API
const mockDashboardData: DashboardStats = {
  totalExpenses: 45230.50,
  monthlyExpenses: 12450.75,
  pendingApproval: 8,
  approvedExpenses: 156,
  totalDocuments: 234,
  averageProcessingTime: 2.4,
  monthlyChange: 12.5,
  expensesByCategory: {
    'Travel': 18500,
    'Meals': 12300,
    'Office Supplies': 8900,
    'Software': 5530,
  },
  recentExpenses: [
    {
      id: '1',
      title: 'Business Lunch with Client',
      amount: 150.50,
      status: ExpenseStatus.APPROVED,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
      employee: 'John Doe',
    },
    {
      id: '2',
      title: 'Flight to Warsaw',
      amount: 450.00,
      status: ExpenseStatus.PENDING_APPROVAL,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
      employee: 'Jane Smith',
    },
    {
      id: '3',
      title: 'Software License',
      amount: 99.99,
      status: ExpenseStatus.APPROVED,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(),
      employee: 'Mike Johnson',
    },
  ],
  monthlyTrend: [
    { month: 'Jan', amount: 8500 },
    { month: 'Feb', amount: 9200 },
    { month: 'Mar', amount: 10100 },
    { month: 'Apr', amount: 11800 },
    { month: 'May', amount: 12450 },
  ],
};

interface StatCardProps {
  title: string;
  value: string;
  change?: number;
  icon: any;
  color?: 'primary' | 'success' | 'warning' | 'destructive';
  href?: string;
}

function StatCard({ title, value, change, icon: Icon, color = 'primary', href }: StatCardProps) {
  const colorClasses = {
    primary: 'text-primary bg-primary/10',
    success: 'text-success bg-success/10',
    warning: 'text-warning bg-warning/10',
    destructive: 'text-destructive bg-destructive/10',
  };

  const content = (
    <div className="card p-6 hover:shadow-medium transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
          {change !== undefined && (
            <div className="flex items-center mt-2">
              {change >= 0 ? (
                <ArrowUpRight className="w-4 h-4 text-success mr-1" />
              ) : (
                <ArrowDownRight className="w-4 h-4 text-destructive mr-1" />
              )}
              <span className={`text-sm ${change >= 0 ? 'text-success' : 'text-destructive'}`}>
                {Math.abs(change)}%
              </span>
              <span className="text-sm text-muted-foreground ml-1">vs last month</span>
            </div>
          )}
        </div>
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${colorClasses[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );

  return href ? <Link href={href}>{content}</Link> : content;
}

export default function DashboardPage() {
  const { user } = useSelector((state: RootState) => state.auth);
  const [dashboardData, setDashboardData] = useState<DashboardStats>(mockDashboardData);
  const [selectedPeriod, setSelectedPeriod] = useState('thisMonth');

  useEffect(() => {
    // Load dashboard data based on user role and permissions
    // This would be an API call in a real application
    setDashboardData(mockDashboardData);
  }, [user, selectedPeriod]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const canViewAllExpenses = user?.role === UserRole.ADMIN || user?.role === UserRole.MANAGER || user?.role === UserRole.ACCOUNTANT;
  const canApproveExpenses = user?.role === UserRole.ADMIN || user?.role === UserRole.MANAGER;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {getGreeting()}, {user?.firstName}!
          </h1>
          <p className="text-muted-foreground mt-1">
            Here's what's happening with your expenses today.
          </p>
        </div>
        
        <div className="flex items-center space-x-3 mt-4 sm:mt-0">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="form-input"
          >
            <option value="thisMonth">This Month</option>
            <option value="lastMonth">Last Month</option>
            <option value="thisQuarter">This Quarter</option>
            <option value="thisYear">This Year</option>
          </select>
          
          <Link href="/dashboard/expenses/new" className="btn btn-primary btn-md">
            <Plus className="w-4 h-4 mr-2" />
            New Expense
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <StatCard
            title="Total Expenses"
            value={formatCurrency(dashboardData.totalExpenses)}
            change={dashboardData.monthlyChange}
            icon={DollarSign}
            color="primary"
            href="/dashboard/expenses"
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <StatCard
            title="This Month"
            value={formatCurrency(dashboardData.monthlyExpenses)}
            icon={Calendar}
            color="success"
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <StatCard
            title={canApproveExpenses ? "Pending Approval" : "Submitted"}
            value={dashboardData.pendingApproval.toString()}
            icon={Clock}
            color="warning"
            href="/dashboard/expenses?status=pending"
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <StatCard
            title="Documents"
            value={dashboardData.totalDocuments.toString()}
            icon={FileText}
            href="/dashboard/documents"
          />
        </motion.div>
      </div>

      {/* Charts and Recent Activity */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Expenses by Category */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="lg:col-span-2"
        >
          <div className="card p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold">Expenses by Category</h3>
              <button className="btn btn-outline btn-sm">
                <Download className="w-4 h-4 mr-2" />
                Export
              </button>
            </div>
            
            <div className="space-y-4">
              {Object.entries(dashboardData.expensesByCategory).map(([category, amount], index) => {
                const percentage = (amount / dashboardData.totalExpenses) * 100;
                
                return (
                  <div key={category} className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">{category}</span>
                      <span className="text-sm text-muted-foreground">
                        {formatCurrency(amount)} ({percentage.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <motion.div
                        className="bg-primary h-2 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        transition={{ delay: 0.5 + index * 0.1, duration: 0.8 }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>

        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <div className="card p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold">Recent Expenses</h3>
              <Link href="/dashboard/expenses" className="text-sm text-primary hover:text-primary/80">
                View all
              </Link>
            </div>
            
            <div className="space-y-4">
              {dashboardData.recentExpenses.map((expense) => (
                <div key={expense.id} className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    {expense.status === ExpenseStatus.APPROVED ? (
                      <CheckCircle className="w-5 h-5 text-success" />
                    ) : expense.status === ExpenseStatus.PENDING_APPROVAL ? (
                      <Clock className="w-5 h-5 text-warning" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-destructive" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{expense.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {expense.employee} • {formatRelativeDate(expense.createdAt)}
                    </p>
                  </div>
                  
                  <div className="text-sm font-medium">
                    {formatCurrency(expense.amount)}
                  </div>
                </div>
              ))}
            </div>
            
            {dashboardData.recentExpenses.length === 0 && (
              <div className="text-center py-8">
                <Receipt className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No recent expenses</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
      >
        <div className="card p-6">
          <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link href="/dashboard/expenses/new" className="btn btn-outline btn-md justify-start">
              <Plus className="w-4 h-4 mr-2" />
              Add Expense
            </Link>
            
            <Link href="/dashboard/documents/upload" className="btn btn-outline btn-md justify-start">
              <FileText className="w-4 h-4 mr-2" />
              Upload Document
            </Link>
            
            {canViewAllExpenses && (
              <Link href="/dashboard/reports" className="btn btn-outline btn-md justify-start">
                <TrendingUp className="w-4 h-4 mr-2" />
                View Reports
              </Link>
            )}
            
            {canApproveExpenses && (
              <Link href="/dashboard/expenses?status=pending" className="btn btn-outline btn-md justify-start">
                <CheckCircle className="w-4 h-4 mr-2" />
                Approve Expenses
              </Link>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
} 