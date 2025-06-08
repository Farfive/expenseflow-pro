'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowLeft,
  Edit,
  Trash2,
  Download,
  Send,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  Calendar,
  DollarSign,
  Tag,
  Building,
  User,
  CreditCard,
  MessageSquare,
  Eye,
  ExternalLink
} from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';
import toast from 'react-hot-toast';

interface Expense {
  id: string;
  title: string;
  description: string;
  amount: number;
  currency: string;
  category: string;
  date: string;
  status: 'draft' | 'pending' | 'approved' | 'rejected';
  submittedAt?: string;
  approvedAt?: string;
  rejectedAt?: string;
  approvedBy?: string;
  rejectedBy?: string;
  rejectionReason?: string;
  merchant?: string;
  paymentMethod?: string;
  department?: string;
  project?: string;
  notes?: string;
  employeeName?: string;
  employeeEmail?: string;
  receipts: {
    id: string;
    filename: string;
    originalName: string;
    size: number;
    mimeType: string;
    uploadedAt: string;
    url: string;
  }[];
  comments: {
    id: string;
    author: string;
    authorRole: string;
    message: string;
    createdAt: string;
  }[];
  auditLog: {
    id: string;
    action: string;
    performedBy: string;
    performedAt: string;
    details?: string;
  }[];
}

export default function ExpenseDetailPage() {
  const router = useRouter();
  const params = useParams();
  const expenseId = params.id as string;
  
  const [expense, setExpense] = useState<Expense | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [showComments, setShowComments] = useState(false);

  // Fetch expense details
  useEffect(() => {
    const fetchExpense = async () => {
      try {
        const response = await fetch(`/api/expenses/${expenseId}`);
        const result = await response.json();
        if (result.success) {
          setExpense(result.data);
        } else {
          toast.error('Expense not found');
          router.push('/dashboard/expenses');
        }
      } catch (error) {
        console.error('Error fetching expense:', error);
        toast.error('Failed to load expense');
        router.push('/dashboard/expenses');
      } finally {
        setLoading(false);
      }
    };

    if (expenseId) {
      fetchExpense();
    }
  }, [expenseId, router]);

  // Handle actions
  const handleSubmit = async () => {
    if (!expense) return;
    setActionLoading(true);

    try {
      const response = await fetch(`/api/expenses/${expense.id}/submit`, {
        method: 'POST',
      });

      const result = await response.json();
      if (result.success) {
        setExpense(prev => prev ? {
          ...prev,
          status: 'pending',
          submittedAt: new Date().toISOString()
        } : null);
        toast.success('Expense submitted for approval');
      } else {
        toast.error(result.message || 'Submit failed');
      }
    } catch (error) {
      console.error('Submit error:', error);
      toast.error('Submit failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!expense) return;
    setActionLoading(true);

    try {
      const response = await fetch(`/api/expenses/${expense.id}/approve`, {
        method: 'POST',
      });

      const result = await response.json();
      if (result.success) {
        setExpense(prev => prev ? {
          ...prev,
          status: 'approved',
          approvedAt: new Date().toISOString(),
          approvedBy: 'Current User' // TODO: Get from auth context
        } : null);
        toast.success('Expense approved');
      } else {
        toast.error(result.message || 'Approval failed');
      }
    } catch (error) {
      console.error('Approval error:', error);
      toast.error('Approval failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!expense) return;
    const reason = prompt('Please provide a reason for rejection:');
    if (!reason) return;

    setActionLoading(true);

    try {
      const response = await fetch(`/api/expenses/${expense.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason })
      });

      const result = await response.json();
      if (result.success) {
        setExpense(prev => prev ? {
          ...prev,
          status: 'rejected',
          rejectedAt: new Date().toISOString(),
          rejectedBy: 'Current User', // TODO: Get from auth context
          rejectionReason: reason
        } : null);
        toast.success('Expense rejected');
      } else {
        toast.error(result.message || 'Rejection failed');
      }
    } catch (error) {
      console.error('Rejection error:', error);
      toast.error('Rejection failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!expense) return;
    if (!confirm('Are you sure you want to delete this expense?')) return;

    setActionLoading(true);

    try {
      const response = await fetch(`/api/expenses/${expense.id}`, {
        method: 'DELETE',
      });

      const result = await response.json();
      if (result.success) {
        toast.success('Expense deleted');
        router.push('/dashboard/expenses');
      } else {
        toast.error(result.message || 'Delete failed');
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Delete failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddComment = async () => {
    if (!expense || !newComment.trim()) return;

    try {
      const response = await fetch(`/api/expenses/${expense.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: newComment })
      });

      const result = await response.json();
      if (result.success) {
        setExpense(prev => prev ? {
          ...prev,
          comments: [...prev.comments, result.data]
        } : null);
        setNewComment('');
        toast.success('Comment added');
      } else {
        toast.error(result.message || 'Failed to add comment');
      }
    } catch (error) {
      console.error('Comment error:', error);
      toast.error('Failed to add comment');
    }
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { icon: FileText, color: 'bg-gray-100 text-gray-800', label: 'Draft' },
      pending: { icon: Clock, color: 'bg-yellow-100 text-yellow-800', label: 'Pending Approval' },
      approved: { icon: CheckCircle, color: 'bg-green-100 text-green-800', label: 'Approved' },
      rejected: { icon: XCircle, color: 'bg-red-100 text-red-800', label: 'Rejected' }
    };

    const config = statusConfig[status as keyof typeof statusConfig];
    if (!config) return null;

    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${config.color}`}>
        <config.icon className="w-4 h-4 mr-2" />
        {config.label}
      </span>
    );
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
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

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
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

  if (!expense) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="text-center py-12">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Expense not found</h3>
          <p className="text-gray-600 mb-4">The expense you're looking for doesn't exist.</p>
          <button
            onClick={() => router.push('/dashboard/expenses')}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Expenses
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
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
            <h1 className="text-2xl font-bold text-gray-900">{expense.title}</h1>
            <div className="flex items-center space-x-4 mt-1">
              {getStatusBadge(expense.status)}
              <span className="text-gray-500">•</span>
              <span className="text-gray-600">
                Created {formatDate(expense.date)}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-3">
          {expense.status === 'draft' && (
            <>
              <button
                onClick={() => router.push(`/dashboard/expenses/${expense.id}/edit`)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors"
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </button>
              <button
                onClick={handleSubmit}
                disabled={actionLoading}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                <Send className="w-4 h-4 mr-2" />
                Submit
              </button>
            </>
          )}

          {expense.status === 'pending' && (
            <>
              <button
                onClick={handleApprove}
                disabled={actionLoading}
                className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Approve
              </button>
              <button
                onClick={handleReject}
                disabled={actionLoading}
                className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                <XCircle className="w-4 h-4 mr-2" />
                Reject
              </button>
            </>
          )}

          <button
            onClick={handleDelete}
            disabled={actionLoading}
            className="inline-flex items-center px-4 py-2 border border-red-300 rounded-lg text-red-700 bg-white hover:bg-red-50 transition-colors disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Expense Details */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-lg shadow-sm border p-6"
          >
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Expense Details</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Amount</label>
                  <div className="flex items-center">
                    <DollarSign className="w-5 h-5 text-gray-400 mr-2" />
                    <span className="text-2xl font-bold text-gray-900">
                      {formatCurrency(expense.amount, expense.currency)}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Category</label>
                  <div className="flex items-center">
                    <Tag className="w-4 h-4 text-gray-400 mr-2" />
                    <span className="text-gray-900">{expense.category}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Date</label>
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                    <span className="text-gray-900">{formatDate(expense.date)}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {expense.merchant && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Merchant</label>
                    <div className="flex items-center">
                      <Building className="w-4 h-4 text-gray-400 mr-2" />
                      <span className="text-gray-900">{expense.merchant}</span>
                    </div>
                  </div>
                )}

                {expense.paymentMethod && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Payment Method</label>
                    <div className="flex items-center">
                      <CreditCard className="w-4 h-4 text-gray-400 mr-2" />
                      <span className="text-gray-900">{expense.paymentMethod}</span>
                    </div>
                  </div>
                )}

                {expense.department && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Department</label>
                    <div className="flex items-center">
                      <User className="w-4 h-4 text-gray-400 mr-2" />
                      <span className="text-gray-900">{expense.department}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {expense.description && (
              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-500 mb-2">Description</label>
                <p className="text-gray-900">{expense.description}</p>
              </div>
            )}

            {expense.notes && (
              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-500 mb-2">Notes</label>
                <p className="text-gray-900">{expense.notes}</p>
              </div>
            )}

            {expense.rejectionReason && (
              <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <label className="block text-sm font-medium text-red-800 mb-2">Rejection Reason</label>
                <p className="text-red-700">{expense.rejectionReason}</p>
              </div>
            )}
          </motion.div>

          {/* Receipts */}
          {expense.receipts.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-lg shadow-sm border p-6"
            >
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Receipts ({expense.receipts.length})
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {expense.receipts.map((receipt) => (
                  <div
                    key={receipt.id}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center">
                        <FileText className="w-5 h-5 text-gray-400 mr-2" />
                        <span className="text-sm font-medium text-gray-900 truncate">
                          {receipt.originalName}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => window.open(receipt.url, '_blank')}
                          className="text-gray-400 hover:text-blue-600 p-1"
                          title="View"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            const a = document.createElement('a');
                            a.href = receipt.url;
                            a.download = receipt.originalName;
                            a.click();
                          }}
                          className="text-gray-400 hover:text-green-600 p-1"
                          title="Download"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatFileSize(receipt.size)} • {formatDate(receipt.uploadedAt)}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status Timeline */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-lg shadow-sm border p-6"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Status Timeline</h3>
            
            <div className="space-y-4">
              <div className="flex items-center">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <FileText className="w-4 h-4 text-blue-600" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900">Created</p>
                  <p className="text-xs text-gray-500">{formatDate(expense.date)}</p>
                </div>
              </div>

              {expense.submittedAt && (
                <div className="flex items-center">
                  <div className="flex-shrink-0 w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                    <Send className="w-4 h-4 text-yellow-600" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900">Submitted</p>
                    <p className="text-xs text-gray-500">{formatDate(expense.submittedAt)}</p>
                  </div>
                </div>
              )}

              {expense.approvedAt && (
                <div className="flex items-center">
                  <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900">Approved</p>
                    <p className="text-xs text-gray-500">
                      {formatDate(expense.approvedAt)}
                      {expense.approvedBy && ` by ${expense.approvedBy}`}
                    </p>
                  </div>
                </div>
              )}

              {expense.rejectedAt && (
                <div className="flex items-center">
                  <div className="flex-shrink-0 w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                    <XCircle className="w-4 h-4 text-red-600" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900">Rejected</p>
                    <p className="text-xs text-gray-500">
                      {formatDate(expense.rejectedAt)}
                      {expense.rejectedBy && ` by ${expense.rejectedBy}`}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </motion.div>

          {/* Employee Info */}
          {expense.employeeName && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white rounded-lg shadow-sm border p-6"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Employee</h3>
              <div className="flex items-center">
                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-gray-600" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900">{expense.employeeName}</p>
                  {expense.employeeEmail && (
                    <p className="text-xs text-gray-500">{expense.employeeEmail}</p>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* Comments */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-lg shadow-sm border p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Comments ({expense.comments.length})
              </h3>
              <button
                onClick={() => setShowComments(!showComments)}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                {showComments ? 'Hide' : 'Show'}
              </button>
            </div>

            {showComments && (
              <div className="space-y-4">
                {expense.comments.map((comment) => (
                  <div key={comment.id} className="border-l-2 border-blue-200 pl-4">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-900">{comment.author}</span>
                      <span className="text-xs text-gray-500">{formatDate(comment.createdAt)}</span>
                    </div>
                    <p className="text-sm text-gray-700">{comment.message}</p>
                  </div>
                ))}

                <div className="mt-4 pt-4 border-t border-gray-200">
                  <textarea
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Add a comment..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                  />
                  <button
                    onClick={handleAddComment}
                    disabled={!newComment.trim()}
                    className="mt-2 inline-flex items-center px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    <MessageSquare className="w-3 h-3 mr-1" />
                    Add Comment
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
} 