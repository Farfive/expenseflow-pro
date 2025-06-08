'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  Upload,
  Download,
  Eye,
  Trash2,
  FileText,
  Calendar,
  DollarSign,
  Building,
  Search,
  Filter,
  CheckCircle,
  Clock,
  AlertTriangle,
  Plus,
  RefreshCw
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

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
  transactionCount?: number;
  totalCredits?: number;
  totalDebits?: number;
  currency: string;
  extractedTransactions?: {
    id: string;
    date: string;
    description: string;
    amount: number;
    type: 'credit' | 'debit';
    balance: number;
    category?: string;
    matched?: boolean;
  }[];
}

export default function BankStatementsPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [statements, setStatements] = useState<BankStatement[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [bankFilter, setBankFilter] = useState<string>('all');

  // Fetch bank statements
  useEffect(() => {
    const fetchStatements = async () => {
      try {
        const response = await fetch('/api/bank-statements');
        const result = await response.json();
        if (result.success) {
          setStatements(result.data);
        }
      } catch (error) {
        console.error('Error fetching bank statements:', error);
        toast.error('Failed to load bank statements');
      } finally {
        setLoading(false);
      }
    };

    fetchStatements();
  }, []);

  // Filter statements
  const filteredStatements = statements.filter(statement => {
    const matchesSearch = statement.originalName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         statement.bankName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         statement.accountNumber.includes(searchTerm);
    const matchesStatus = statusFilter === 'all' || statement.status === statusFilter;
    const matchesBank = bankFilter === 'all' || statement.bankName === bankFilter;
    
    return matchesSearch && matchesStatus && matchesBank;
  });

  // Handle file upload
  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const file = files[0];
    const validTypes = ['application/pdf', 'text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
    const maxSize = 50 * 1024 * 1024; // 50MB

    if (!validTypes.includes(file.type)) {
      toast.error('Invalid file type. Please upload PDF, CSV, or Excel files.');
      return;
    }

    if (file.size > maxSize) {
      toast.error('File too large. Maximum size is 50MB.');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('statement', file);

      const response = await fetch('/api/bank-statements/upload', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();
      if (result.success) {
        setStatements(prev => [result.data, ...prev]);
        toast.success('Bank statement uploaded successfully');
        
        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } else {
        toast.error(result.message || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  // Handle delete
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this bank statement?')) return;

    try {
      const response = await fetch(`/api/bank-statements/${id}`, {
        method: 'DELETE',
      });

      const result = await response.json();
      if (result.success) {
        setStatements(prev => prev.filter(statement => statement.id !== id));
        toast.success('Bank statement deleted successfully');
      } else {
        toast.error(result.message || 'Delete failed');
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Delete failed');
    }
  };

  // Handle reprocess
  const handleReprocess = async (id: string) => {
    try {
      const response = await fetch(`/api/bank-statements/${id}/reprocess`, {
        method: 'POST',
      });

      const result = await response.json();
      if (result.success) {
        setStatements(prev => prev.map(statement => 
          statement.id === id 
            ? { ...statement, status: 'processing' as const }
            : statement
        ));
        toast.success('Reprocessing started');
      } else {
        toast.error(result.message || 'Reprocess failed');
      }
    } catch (error) {
      console.error('Reprocess error:', error);
      toast.error('Reprocess failed');
    }
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    const statusConfig = {
      processing: { icon: Clock, color: 'bg-yellow-100 text-yellow-800', label: 'Processing' },
      processed: { icon: CheckCircle, color: 'bg-green-100 text-green-800', label: 'Processed' },
      failed: { icon: AlertTriangle, color: 'bg-red-100 text-red-800', label: 'Failed' }
    };

    const config = statusConfig[status as keyof typeof statusConfig];
    if (!config) return null;

    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        <config.icon className="w-3 h-3 mr-1" />
        {config.label}
      </span>
    );
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

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Get unique banks for filter
  const uniqueBanks = Array.from(new Set(statements.map(s => s.bankName))).sort();

  // Calculate stats
  const stats = {
    total: statements.length,
    processed: statements.filter(s => s.status === 'processed').length,
    processing: statements.filter(s => s.status === 'processing').length,
    failed: statements.filter(s => s.status === 'failed').length,
    totalTransactions: statements.reduce((sum, s) => sum + (s.transactionCount || 0), 0)
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-20 bg-gray-200 rounded"></div>
              ))}
            </div>
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bank Statements</h1>
          <p className="text-gray-600 mt-1">Upload and process bank statements for expense matching</p>
        </div>
        <div className="flex items-center space-x-3 mt-4 sm:mt-0">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            <Upload className="w-4 h-4 mr-2" />
            {uploading ? 'Uploading...' : 'Upload Statement'}
          </button>
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.csv,.xls,.xlsx"
        className="hidden"
        onChange={(e) => handleFileUpload(e.target.files)}
      />

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
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
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
              <p className="text-sm font-medium text-gray-600">Processed</p>
              <p className="text-2xl font-bold text-gray-900">{stats.processed}</p>
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
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Processing</p>
              <p className="text-2xl font-bold text-gray-900">{stats.processing}</p>
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
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Failed</p>
              <p className="text-2xl font-bold text-gray-900">{stats.failed}</p>
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
            <div className="p-2 bg-purple-100 rounded-lg">
              <DollarSign className="w-5 h-5 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Transactions</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalTransactions}</p>
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
                placeholder="Search statements..."
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
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="processing">Processing</option>
              <option value="processed">Processed</option>
              <option value="failed">Failed</option>
            </select>

            <select
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={bankFilter}
              onChange={(e) => setBankFilter(e.target.value)}
            >
              <option value="all">All Banks</option>
              {uniqueBanks.map(bank => (
                <option key={bank} value={bank}>{bank}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Statements List */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        {filteredStatements.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No bank statements found</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm || statusFilter !== 'all' || bankFilter !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Upload your first bank statement to get started'
              }
            </p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload Statement
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredStatements.map((statement, index) => (
              <motion.div
                key={statement.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="p-6 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <FileText className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-sm font-medium text-gray-900 truncate">
                          {statement.originalName}
                        </h3>
                        <div className="flex items-center space-x-4 mt-1">
                          <div className="flex items-center text-xs text-gray-500">
                            <Building className="w-3 h-3 mr-1" />
                            {statement.bankName}
                          </div>
                          <div className="flex items-center text-xs text-gray-500">
                            <Calendar className="w-3 h-3 mr-1" />
                            {formatDate(statement.statementPeriod.from)} - {formatDate(statement.statementPeriod.to)}
                          </div>
                          <span className="text-xs text-gray-500">
                            {formatFileSize(statement.size)}
                          </span>
                          {statement.transactionCount && (
                            <span className="text-xs text-gray-500">
                              {statement.transactionCount} transactions
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      {statement.status === 'processed' && statement.totalCredits && statement.totalDebits && (
                        <div className="text-sm">
                          <div className="text-green-600 font-medium">
                            +{formatCurrency(statement.totalCredits, statement.currency)}
                          </div>
                          <div className="text-red-600 font-medium">
                            -{formatCurrency(statement.totalDebits, statement.currency)}
                          </div>
                        </div>
                      )}
                      {getStatusBadge(statement.status)}
                    </div>

                    <div className="flex items-center space-x-2">
                      {statement.status === 'processed' && (
                        <button
                          onClick={() => router.push(`/dashboard/bank-statements/${statement.id}`)}
                          className="text-gray-400 hover:text-blue-600 p-1"
                          title="View Transactions"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      )}
                      {statement.status === 'failed' && (
                        <button
                          onClick={() => handleReprocess(statement.id)}
                          className="text-gray-400 hover:text-green-600 p-1"
                          title="Reprocess"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => {
                          const a = document.createElement('a');
                          a.href = `/api/bank-statements/${statement.id}/download`;
                          a.download = statement.originalName;
                          a.click();
                        }}
                        className="text-gray-400 hover:text-green-600 p-1"
                        title="Download"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(statement.id)}
                        className="text-gray-400 hover:text-red-600 p-1"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Upload Instructions */}
      <div className="bg-blue-50 rounded-lg border border-blue-200 p-6">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <FileText className="w-5 h-5 text-blue-600 mt-0.5" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-semibold text-blue-900 mb-2">Supported File Formats</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• PDF bank statements (most common format)</li>
              <li>• CSV files exported from online banking</li>
              <li>• Excel files (.xls, .xlsx) with transaction data</li>
              <li>• Maximum file size: 50MB</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
} 