'use client';

/**
 * Approval Dashboard Component
 * 
 * Comprehensive dashboard for managing expense approvals
 */

import React, { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';

interface PendingApproval {
  id: string;
  instanceId: string;
  stepOrder: number;
  assignedAt: string;
  status: string;
  instance: {
    expense: {
      id: string;
      description: string;
      amount: number;
      currency: string;
      transactionDate: string;
      user: {
        firstName: string;
        lastName: string;
        email: string;
      };
      category: {
        name: string;
      };
    };
  };
}

interface DashboardStats {
  pendingCount: number;
  approvedToday: number;
  rejectedToday: number;
  overdueCount: number;
  totalPendingAmount: number;
  recentActivity: any[];
}

const ApprovalDashboard: React.FC = () => {
  const [pendingApprovals, setPendingApprovals] = useState<PendingApproval[]>([]);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [selectedApprovals, setSelectedApprovals] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('assignedAt');
  const [bulkComments, setBulkComments] = useState('');
  const [showBulkDialog, setShowBulkDialog] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Fetch dashboard data
  const fetchDashboardData = useCallback(async () => {
    try {
      const [approvals, stats] = await Promise.all([
        fetch('/api/approvals/pending').then(res => res.json()),
        fetch('/api/approvals/dashboard').then(res => res.json())
      ]);

      if (approvals.success) {
        setPendingApprovals(approvals.data);
      }

      if (stats.success) {
        setDashboardStats(stats.data);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setNotification({
        type: 'error',
        message: 'Failed to fetch dashboard data'
      });
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-refresh data
  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, [fetchDashboardData]);

  // Hide notification after 5 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Handle individual approval
  const handleApprove = async (stepRecordId: string, comments?: string) => {
    try {
      setProcessing(true);
      const response = await fetch(`/api/approvals/${stepRecordId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comments })
      });

      const result = await response.json();

      if (result.success) {
        setNotification({
          type: 'success',
          message: 'Expense approved successfully'
        });
        await fetchDashboardData();
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('Error approving expense:', error);
      setNotification({
        type: 'error',
        message: 'Failed to approve expense'
      });
    } finally {
      setProcessing(false);
    }
  };

  // Handle individual rejection
  const handleReject = async (stepRecordId: string, comments: string) => {
    const reason = prompt('Please provide a reason for rejection:');
    if (!reason) return;

    try {
      setProcessing(true);
      const response = await fetch(`/api/approvals/${stepRecordId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comments: reason, reason })
      });

      const result = await response.json();

      if (result.success) {
        setNotification({
          type: 'success',
          message: 'Expense rejected successfully'
        });
        await fetchDashboardData();
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('Error rejecting expense:', error);
      setNotification({
        type: 'error',
        message: 'Failed to reject expense'
      });
    } finally {
      setProcessing(false);
    }
  };

  // Handle bulk approval
  const handleBulkApprove = async () => {
    if (selectedApprovals.size === 0) {
      setNotification({
        type: 'error',
        message: 'Please select expenses to approve'
      });
      return;
    }

    try {
      setProcessing(true);
      const expenseIds = Array.from(selectedApprovals).map(id => {
        const approval = pendingApprovals.find(a => a.id === id);
        return approval?.instance.expense.id;
      }).filter(Boolean);

      const response = await fetch('/api/approvals/bulk-approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expenseIds,
          comments: bulkComments,
          batchName: `Bulk Approval - ${format(new Date(), 'yyyy-MM-dd HH:mm')}`
        })
      });

      const result = await response.json();

      if (result.success) {
        setNotification({
          type: 'success',
          message: `Bulk approval completed: ${result.data.approved} approved, ${result.data.failed} failed`
        });
        setSelectedApprovals(new Set());
        setBulkComments('');
        setShowBulkDialog(false);
        await fetchDashboardData();
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('Error bulk approving:', error);
      setNotification({
        type: 'error',
        message: 'Failed to bulk approve expenses'
      });
    } finally {
      setProcessing(false);
    }
  };

  // Toggle selection
  const toggleSelection = (approvalId: string) => {
    const newSelected = new Set(selectedApprovals);
    if (newSelected.has(approvalId)) {
      newSelected.delete(approvalId);
    } else {
      newSelected.add(approvalId);
    }
    setSelectedApprovals(newSelected);
  };

  // Select all visible approvals
  const selectAll = () => {
    const visibleApprovals = getFilteredApprovals();
    const allIds = new Set(visibleApprovals.map(a => a.id));
    setSelectedApprovals(allIds);
  };

  // Clear selection
  const clearSelection = () => {
    setSelectedApprovals(new Set());
  };

  // Filter approvals
  const getFilteredApprovals = () => {
    let filtered = pendingApprovals;

    if (filter !== 'all') {
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      switch (filter) {
        case 'overdue':
          filtered = filtered.filter(a => new Date(a.assignedAt) < oneDayAgo);
          break;
        case 'high-amount':
          filtered = filtered.filter(a => a.instance.expense.amount > 1000);
          break;
        case 'today':
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          filtered = filtered.filter(a => new Date(a.assignedAt) >= today);
          break;
      }
    }

    // Sort approvals
    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'amount':
          return b.instance.expense.amount - a.instance.expense.amount;
        case 'date':
          return new Date(b.instance.expense.transactionDate).getTime() - 
                 new Date(a.instance.expense.transactionDate).getTime();
        default:
          return new Date(b.assignedAt).getTime() - new Date(a.assignedAt).getTime();
      }
    });
  };

  // Format currency
  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency
    }).format(amount);
  };

  // Get status badge color
  const getStatusBadgeColor = (daysOverdue: number) => {
    if (daysOverdue <= 0) return 'bg-blue-100 text-blue-800';
    if (daysOverdue <= 1) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Loading approval dashboard...</span>
      </div>
    );
  }

  const filteredApprovals = getFilteredApprovals();

  return (
    <div className="space-y-6">
      {/* Notification */}
      {notification && (
        <div className={`p-4 rounded-md ${
          notification.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {notification.message}
        </div>
      )}

      {/* Statistics Cards */}
      {dashboardStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="text-2xl font-bold">{dashboardStats.pendingCount}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Approved Today</p>
                <p className="text-2xl font-bold">{dashboardStats.approvedToday}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Rejected Today</p>
                <p className="text-2xl font-bold">{dashboardStats.rejectedToday}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Overdue</p>
                <p className="text-2xl font-bold">{dashboardStats.overdueCount}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Pending</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(dashboardStats.totalPendingAmount)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium">Pending Approvals</h2>
            <div className="flex items-center space-x-2">
              {/* Filters */}
              <select 
                value={filter} 
                onChange={(e) => setFilter(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-1 text-sm"
              >
                <option value="all">All</option>
                <option value="overdue">Overdue</option>
                <option value="high-amount">High Amount</option>
                <option value="today">Assigned Today</option>
              </select>

              <select 
                value={sortBy} 
                onChange={(e) => setSortBy(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-1 text-sm"
              >
                <option value="assignedAt">Date Assigned</option>
                <option value="amount">Amount</option>
                <option value="date">Transaction Date</option>
              </select>

              <button
                onClick={fetchDashboardData}
                disabled={processing}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm hover:bg-gray-50"
              >
                Refresh
              </button>
            </div>
          </div>

          {/* Bulk Actions */}
          {selectedApprovals.size > 0 && (
            <div className="mt-4 flex items-center justify-between bg-blue-50 p-4 rounded-md">
              <span className="text-sm font-medium">
                {selectedApprovals.size} expense(s) selected
              </span>
              <div className="flex space-x-2">
                <button
                  onClick={() => setShowBulkDialog(true)}
                  className="px-3 py-1 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
                >
                  Bulk Approve
                </button>
                <button
                  onClick={clearSelection}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm hover:bg-gray-50"
                >
                  Clear Selection
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="p-6">
          {filteredApprovals.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <h3 className="text-lg font-medium">No pending approvals</h3>
              <p className="text-gray-500">All caught up! Check back later for new approvals.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Select All */}
              <div className="flex items-center space-x-2 pb-2 border-b">
                <input
                  type="checkbox"
                  checked={selectedApprovals.size === filteredApprovals.length}
                  onChange={(e) => {
                    if (e.target.checked) selectAll();
                    else clearSelection();
                  }}
                  className="rounded"
                />
                <span className="text-sm text-gray-600">Select all visible</span>
              </div>

              {/* Approvals List */}
              {filteredApprovals.map((approval) => {
                const expense = approval.instance.expense;
                const daysOverdue = Math.floor(
                  (new Date().getTime() - new Date(approval.assignedAt).getTime()) / 
                  (1000 * 60 * 60 * 24)
                );

                return (
                  <div key={approval.id} className="border border-gray-200 rounded-lg p-4 border-l-4 border-l-blue-500">
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={selectedApprovals.has(approval.id)}
                        onChange={() => toggleSelection(approval.id)}
                        className="rounded"
                      />
                      
                      <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                          <p className="font-medium">{expense.description}</p>
                          <p className="text-sm text-gray-600">
                            {expense.user.firstName} {expense.user.lastName}
                          </p>
                        </div>
                        
                        <div>
                          <p className="font-medium">
                            {formatCurrency(expense.amount, expense.currency)}
                          </p>
                          <p className="text-sm text-gray-600">{expense.category.name}</p>
                        </div>
                        
                        <div>
                          <p className="text-sm">
                            {format(new Date(expense.transactionDate), 'MMM dd, yyyy')}
                          </p>
                          <span className={`inline-block px-2 py-1 text-xs rounded-full ${getStatusBadgeColor(daysOverdue)}`}>
                            {daysOverdue > 0 ? `${daysOverdue}d overdue` : 'On time'}
                          </span>
                        </div>
                        
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleApprove(approval.id)}
                            disabled={processing}
                            className="px-3 py-1 bg-green-600 text-white rounded-md text-sm hover:bg-green-700 disabled:opacity-50"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleReject(approval.id, 'Rejected from dashboard')}
                            disabled={processing}
                            className="px-3 py-1 border border-red-600 text-red-600 rounded-md text-sm hover:bg-red-50 disabled:opacity-50"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Bulk Approval Dialog */}
      {showBulkDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-medium mb-4">
              Bulk Approve {selectedApprovals.size} Expenses
            </h3>
            <textarea
              placeholder="Optional comments for all approvals..."
              value={bulkComments}
              onChange={(e) => setBulkComments(e.target.value)}
              className="w-full border border-gray-300 rounded-md p-2 mb-4"
              rows={3}
            />
            <div className="flex justify-end space-x-2">
              <button 
                onClick={() => setShowBulkDialog(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50"
              >
                Cancel
              </button>
              <button 
                onClick={handleBulkApprove} 
                disabled={processing}
                className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:opacity-50"
              >
                {processing ? 'Processing...' : 'Approve All'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApprovalDashboard; 