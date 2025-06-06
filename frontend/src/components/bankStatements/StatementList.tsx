'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  MagnifyingGlassIcon,
  FunnelIcon,
  EyeIcon,
  TrashIcon,
  ArrowPathIcon,
  DocumentIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import bankStatementService, { 
  BankStatement, 
  StatementFilters,
  BankStatementStatus 
} from '../../services/bankStatementService';

interface StatementListProps {
  onViewStatement?: (statement: BankStatement) => void;
  onDeleteStatement?: (statementId: string) => void;
  refreshTrigger?: number;
}

const StatementList: React.FC<StatementListProps> = ({
  onViewStatement,
  onDeleteStatement,
  refreshTrigger
}) => {
  const [statements, setStatements] = useState<BankStatement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  });

  const [filters, setFilters] = useState<StatementFilters>({
    page: 1,
    limit: 20
  });

  const [showFilters, setShowFilters] = useState(false);
  const [selectedStatements, setSelectedStatements] = useState<string[]>([]);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Load statements
  const loadStatements = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await bankStatementService.getStatements(filters);
      
      if (response.success) {
        setStatements(response.statements);
        setPagination(response.pagination);
      } else {
        throw new Error('Failed to load statements');
      }
    } catch (error) {
      console.error('Error loading statements:', error);
      setError(error instanceof Error ? error.message : 'Failed to load statements');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadStatements();
  }, [loadStatements, refreshTrigger]);

  const handleFilterChange = (key: keyof StatementFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: 1 // Reset to first page when filters change
    }));
  };

  const handlePageChange = (newPage: number) => {
    setFilters(prev => ({
      ...prev,
      page: newPage
    }));
  };

  const handleDelete = async (statementId: string) => {
    try {
      await bankStatementService.deleteStatement(statementId);
      setStatements(prev => prev.filter(s => s.id !== statementId));
      onDeleteStatement?.(statementId);
      setDeleteConfirm(null);
    } catch (error) {
      console.error('Error deleting statement:', error);
      setError(error instanceof Error ? error.message : 'Failed to delete statement');
    }
  };

  const handleSelectStatement = (statementId: string) => {
    setSelectedStatements(prev => 
      prev.includes(statementId)
        ? prev.filter(id => id !== statementId)
        : [...prev, statementId]
    );
  };

  const handleSelectAll = () => {
    if (selectedStatements.length === statements.length) {
      setSelectedStatements([]);
    } else {
      setSelectedStatements(statements.map(s => s.id));
    }
  };

  const getStatusBadge = (status: BankStatementStatus) => {
    const statusInfo = bankStatementService.getStatusInfo(status);
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo.color}`}>
        {status === 'PROCESSING' && <ArrowPathIcon className="w-3 h-3 mr-1 animate-spin" />}
        {status === 'PROCESSED' && <CheckCircleIcon className="w-3 h-3 mr-1" />}
        {status === 'FAILED' && <ExclamationTriangleIcon className="w-3 h-3 mr-1" />}
        {status === 'PENDING' && <ClockIcon className="w-3 h-3 mr-1" />}
        {statusInfo.label}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading && statements.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <ArrowPathIcon className="w-8 h-8 text-gray-400 animate-spin" />
        <span className="ml-2 text-gray-600">Loading statements...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Bank Statements</h2>
          <p className="text-sm text-gray-600 mt-1">
            {pagination.total} statements found
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <FunnelIcon className="w-4 h-4 mr-2" />
            Filters
          </button>
          
          <button
            onClick={loadStatements}
            disabled={loading}
            className="inline-flex items-center px-3 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
          >
            <ArrowPathIcon className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-white shadow rounded-lg p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={filters.status || ''}
                onChange={(e) => handleFilterChange('status', e.target.value || undefined)}
                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Statuses</option>
                <option value="PENDING">Pending</option>
                <option value="PROCESSING">Processing</option>
                <option value="PROCESSED">Processed</option>
                <option value="FAILED">Failed</option>
                <option value="NEEDS_REVIEW">Needs Review</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Account Number
              </label>
              <input
                type="text"
                value={filters.accountNumber || ''}
                onChange={(e) => handleFilterChange('accountNumber', e.target.value || undefined)}
                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                placeholder="Search account..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bank Name
              </label>
              <input
                type="text"
                value={filters.bankName || ''}
                onChange={(e) => handleFilterChange('bankName', e.target.value || undefined)}
                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                placeholder="Search bank..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date Range
              </label>
              <div className="flex space-x-2">
                <input
                  type="date"
                  value={filters.startDate || ''}
                  onChange={(e) => handleFilterChange('startDate', e.target.value || undefined)}
                  className="flex-1 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
                <input
                  type="date"
                  value={filters.endDate || ''}
                  onChange={(e) => handleFilterChange('endDate', e.target.value || undefined)}
                  className="flex-1 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <button
              onClick={() => {
                setFilters({ page: 1, limit: 20 });
                setShowFilters(false);
              }}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
            >
              Clear Filters
            </button>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Statements Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {statements.length === 0 ? (
          <div className="text-center py-12">
            <DocumentIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No statements found</h3>
            <p className="mt-1 text-sm text-gray-500">
              Upload your first bank statement to get started.
            </p>
          </div>
        ) : (
          <>
            {/* Table Header */}
            <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={selectedStatements.length === statements.length}
                  onChange={handleSelectAll}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-3 text-sm text-gray-600">
                  {selectedStatements.length > 0 && `${selectedStatements.length} selected`}
                </span>
              </div>
            </div>

            {/* Table Body */}
            <div className="divide-y divide-gray-200">
              {statements.map((statement) => (
                <div key={statement.id} className="px-6 py-4 hover:bg-gray-50">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={selectedStatements.includes(statement.id)}
                      onChange={() => handleSelectStatement(statement.id)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    
                    <div className="ml-4 flex-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <DocumentIcon className="w-8 h-8 text-gray-400" />
                          <div>
                            <div className="flex items-center space-x-2">
                              <h3 className="text-sm font-medium text-gray-900">
                                {statement.originalName}
                              </h3>
                              {getStatusBadge(statement.status)}
                            </div>
                            <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
                              {statement.accountNumber && (
                                <span>Account: {statement.accountNumber}</span>
                              )}
                              {statement.bankName && (
                                <span>Bank: {statement.bankName}</span>
                              )}
                              <span>
                                {bankStatementService.formatFileSize(statement.fileSize)}
                              </span>
                              <span>{formatDate(statement.createdAt)}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-3">
                          {statement.processed && statement._count && (
                            <div className="text-right text-sm">
                              <div className="text-gray-900 font-medium">
                                {statement._count.transactions} transactions
                              </div>
                              <div className="text-gray-500">
                                {statement.currency} {bankStatementService.formatAmount(
                                  (statement.totalCredits || 0) - (statement.totalDebits || 0),
                                  statement.currency
                                )}
                              </div>
                            </div>
                          )}

                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => onViewStatement?.(statement)}
                              className="p-2 text-gray-400 hover:text-gray-600"
                              title="View Statement"
                            >
                              <EyeIcon className="w-5 h-5" />
                            </button>
                            
                            <button
                              onClick={() => setDeleteConfirm(statement.id)}
                              className="p-2 text-gray-400 hover:text-red-600"
                              title="Delete Statement"
                            >
                              <TrashIcon className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Error Message */}
                      {statement.status === 'FAILED' && statement.processingError && (
                        <div className="mt-2 text-sm text-red-600 bg-red-50 rounded p-2">
                          Error: {statement.processingError}
                        </div>
                      )}

                      {/* Processing Summary */}
                      {statement.processed && statement.duplicateFlags && (
                        <div className="mt-2 flex items-center space-x-4 text-sm">
                          {statement.duplicateFlags.total > 0 && (
                            <span className="text-yellow-600">
                              {statement.duplicateFlags.total} duplicates detected
                            </span>
                          )}
                          {statement.duplicateFlags.reviewRequired > 0 && (
                            <span className="text-orange-600">
                              {statement.duplicateFlags.reviewRequired} need review
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-700">
                    Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                    {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                    {pagination.total} results
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handlePageChange(pagination.page - 1)}
                      disabled={pagination.page <= 1}
                      className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50"
                    >
                      <ChevronLeftIcon className="w-5 h-5" />
                    </button>
                    
                    <span className="text-sm text-gray-700">
                      Page {pagination.page} of {pagination.pages}
                    </span>
                    
                    <button
                      onClick={() => handlePageChange(pagination.page + 1)}
                      disabled={pagination.page >= pagination.pages}
                      className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50"
                    >
                      <ChevronRightIcon className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3 text-center">
              <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-500" />
              <h3 className="text-lg font-medium text-gray-900 mt-4">
                Delete Statement
              </h3>
              <p className="text-sm text-gray-500 mt-2">
                Are you sure you want to delete this bank statement? This action cannot be undone 
                and will also delete all associated transactions.
              </p>
              <div className="flex justify-center space-x-3 mt-6">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(deleteConfirm)}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StatementList; 