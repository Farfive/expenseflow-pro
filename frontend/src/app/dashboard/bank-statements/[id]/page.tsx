'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowLeft,
  Download,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Link,
  Unlink,
  Calendar,
  DollarSign,
  Building,
  FileText,
  Eye,
  AlertTriangle,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';
import toast from 'react-hot-toast';

interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: 'credit' | 'debit';
  balance: number;
  category?: string;
  matched?: boolean;
  matchedExpenseId?: string;
  matchedExpenseTitle?: string;
}

interface BankStatement {
  id: string;
  filename: string;
  originalName: string;
  bankName: string;
  accountNumber: string;
  statementPeriod: {
    from: string;
    to: string;
  };
  status: 'processing' | 'processed' | 'failed';
  uploadedAt: string;
  processedAt?: string;
  size: number;
  transactionCount: number;
  totalCredits: number;
  totalDebits: number;
  currency: string;
  extractedTransactions: Transaction[];
}

export default function BankStatementDetailPage() {
  const router = useRouter();
  const params = useParams();
  const statementId = params.id as string;
  
  const [statement, setStatement] = useState<BankStatement | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [matchFilter, setMatchFilter] = useState<string>('all');
  const [selectedTransactions, setSelectedTransactions] = useState<string[]>([]);

  // Fetch statement details
  useEffect(() => {
    const fetchStatement = async () => {
      try {
        const response = await fetch(`/api/bank-statements/${statementId}`);
        const result = await response.json();
        if (result.success) {
          setStatement(result.data);
        } else {
          toast.error('Bank statement not found');
          router.push('/dashboard/bank-statements');
        }
      } catch (error) {
        console.error('Error fetching bank statement:', error);
        toast.error('Failed to load bank statement');
        router.push('/dashboard/bank-statements');
      } finally {
        setLoading(false);
      }
    };

    if (statementId) {
      fetchStatement();
    }
  }, [statementId, router]);

  // Filter transactions
  const filteredTransactions = statement?.extractedTransactions.filter(transaction => {
    const matchesSearch = transaction.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || transaction.type === typeFilter;
    const matchesMatch = matchFilter === 'all' || 
                        (matchFilter === 'matched' && transaction.matched) ||
                        (matchFilter === 'unmatched' && !transaction.matched);
    
    return matchesSearch && matchesType && matchesMatch;
  }) || [];

  // Handle transaction matching
  const handleMatch = async (transactionId: string, expenseId: string) => {
    try {
      const response = await fetch(`/api/bank-statements/${statementId}/transactions/${transactionId}/match`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expenseId })
      });

      const result = await response.json();
      if (result.success) {
        setStatement(prev => prev ? {
          ...prev,
          extractedTransactions: prev.extractedTransactions.map(t => 
            t.id === transactionId 
              ? { ...t, matched: true, matchedExpenseId: expenseId, matchedExpenseTitle: result.data.expenseTitle }
              : t
          )
        } : null);
        toast.success('Transaction matched successfully');
      } else {
        toast.error(result.message || 'Match failed');
      }
    } catch (error) {
      console.error('Match error:', error);
      toast.error('Match failed');
    }
  };

  // Handle transaction unmatching
  const handleUnmatch = async (transactionId: string) => {
    try {
      const response = await fetch(`/api/bank-statements/${statementId}/transactions/${transactionId}/unmatch`, {
        method: 'POST'
      });

      const result = await response.json();
      if (result.success) {
        setStatement(prev => prev ? {
          ...prev,
          extractedTransactions: prev.extractedTransactions.map(t => 
            t.id === transactionId 
              ? { ...t, matched: false, matchedExpenseId: undefined, matchedExpenseTitle: undefined }
              : t
          )
        } : null);
        toast.success('Transaction unmatched successfully');
      } else {
        toast.error(result.message || 'Unmatch failed');
      }
    } catch (error) {
      console.error('Unmatch error:', error);
      toast.error('Unmatch failed');
    }
  };

  // Auto-match transactions
  const handleAutoMatch = async () => {
    try {
      const response = await fetch(`/api/bank-statements/${statementId}/auto-match`, {
        method: 'POST'
      });

      const result = await response.json();
      if (result.success) {
        setStatement(prev => prev ? {
          ...prev,
          extractedTransactions: result.data.transactions
        } : null);
        toast.success(`${result.data.matchedCount} transactions auto-matched`);
      } else {
        toast.error(result.message || 'Auto-match failed');
      }
    } catch (error) {
      console.error('Auto-match error:', error);
      toast.error('Auto-match failed');
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Format currency
  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  // Calculate stats
  const stats = statement ? {
    total: statement.extractedTransactions.length,
    matched: statement.extractedTransactions.filter(t => t.matched).length,
    unmatched: statement.extractedTransactions.filter(t => !t.matched).length,
    credits: statement.extractedTransactions.filter(t => t.type === 'credit').length,
    debits: statement.extractedTransactions.filter(t => t.type === 'debit').length
  } : null;

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="space-y-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-4 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!statement) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="text-center py-12">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Bank statement not found</h3>
          <p className="text-gray-600 mb-4">The bank statement you're looking for doesn't exist.</p>
          <button
            onClick={() => router.push('/dashboard/bank-statements')}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Bank Statements
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => router.back()}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{statement.originalName}</h1>
            <div className="flex items-center space-x-4 mt-1">
              <div className="flex items-center text-gray-600">
                <Building className="w-4 h-4 mr-1" />
                {statement.bankName}
              </div>
              <span className="text-gray-500">•</span>
              <div className="flex items-center text-gray-600">
                <Calendar className="w-4 h-4 mr-1" />
                {formatDate(statement.statementPeriod.from)} - {formatDate(statement.statementPeriod.to)}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleAutoMatch}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors"
          >
            <Link className="w-4 h-4 mr-2" />
            Auto-Match
          </button>
          <button
            onClick={() => {
              const a = document.createElement('a');
              a.href = `/api/bank-statements/${statement.id}/download`;
              a.download = statement.originalName;
              a.click();
            }}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors"
          >
            <Download className="w-4 h-4 mr-2" />
            Download
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-6 rounded-lg shadow-sm border"
        >
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.total}</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white p-6 rounded-lg shadow-sm border"
        >
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Matched</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.matched}</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white p-6 rounded-lg shadow-sm border"
        >
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <XCircle className="w-5 h-5 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Unmatched</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.unmatched}</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white p-6 rounded-lg shadow-sm border"
        >
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Credits</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(statement.totalCredits, statement.currency)}</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white p-6 rounded-lg shadow-sm border"
        >
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <TrendingDown className="w-5 h-5 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Debits</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(statement.totalDebits, statement.currency)}</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          {/* Search */}
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search transactions..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <select
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="all">All Types</option>
              <option value="credit">Credits</option>
              <option value="debit">Debits</option>
            </select>

            <select
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={matchFilter}
              onChange={(e) => setMatchFilter(e.target.value)}
            >
              <option value="all">All Matches</option>
              <option value="matched">Matched</option>
              <option value="unmatched">Unmatched</option>
            </select>
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        {filteredTransactions.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No transactions found</h3>
            <p className="text-gray-600">
              {searchTerm || typeFilter !== 'all' || matchFilter !== 'all'
                ? 'Try adjusting your search or filters'
                : 'No transactions available in this statement'
              }
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Balance
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Match Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredTransactions.map((transaction, index) => (
                  <motion.tr
                    key={transaction.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.02 }}
                    className="hover:bg-gray-50"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(transaction.date)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900 max-w-xs truncate">
                        {transaction.description}
                      </div>
                      {transaction.category && (
                        <div className="text-xs text-gray-500">{transaction.category}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`text-sm font-medium ${
                        transaction.type === 'credit' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {transaction.type === 'credit' ? '+' : '-'}
                        {formatCurrency(Math.abs(transaction.amount), statement.currency)}
                      </div>
                      <div className="text-xs text-gray-500 capitalize">{transaction.type}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(transaction.balance, statement.currency)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {transaction.matched ? (
                        <div className="flex items-center">
                          <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                          <div>
                            <div className="text-sm font-medium text-green-800">Matched</div>
                            {transaction.matchedExpenseTitle && (
                              <div className="text-xs text-green-600 truncate max-w-xs">
                                {transaction.matchedExpenseTitle}
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center">
                          <XCircle className="w-4 h-4 text-red-500 mr-2" />
                          <span className="text-sm font-medium text-red-800">Unmatched</span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        {transaction.matched ? (
                          <>
                            {transaction.matchedExpenseId && (
                              <button
                                onClick={() => router.push(`/dashboard/expenses/${transaction.matchedExpenseId}`)}
                                className="text-gray-400 hover:text-blue-600 p-1"
                                title="View Expense"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => handleUnmatch(transaction.id)}
                              className="text-gray-400 hover:text-red-600 p-1"
                              title="Unmatch"
                            >
                              <Unlink className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => {
                              // TODO: Open expense selection modal
                              const expenseId = prompt('Enter expense ID to match:');
                              if (expenseId) {
                                handleMatch(transaction.id, expenseId);
                              }
                            }}
                            className="text-gray-400 hover:text-green-600 p-1"
                            title="Match to Expense"
                          >
                            <Link className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="bg-gray-50 rounded-lg border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Statement Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <p className="text-sm text-gray-600">Account Number</p>
            <p className="text-lg font-medium text-gray-900">{statement.accountNumber}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Statement Period</p>
            <p className="text-lg font-medium text-gray-900">
              {formatDate(statement.statementPeriod.from)} - {formatDate(statement.statementPeriod.to)}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Processing Status</p>
            <div className="flex items-center mt-1">
              <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
              <span className="text-lg font-medium text-green-800">Processed</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 