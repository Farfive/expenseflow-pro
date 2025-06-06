'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import DocumentUpload from '../../../components/documents/DocumentUpload';
import { documentService, type Document, type DocumentFilters } from '../../../services/documentService';
import { formatFileSize, formatDate, formatCurrency } from '../../../utils/formatters';

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<DocumentFilters>({
    page: 1,
    limit: 20,
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  });
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [queueStats, setQueueStats] = useState<any>(null);

  // Load documents
  const loadDocuments = async () => {
    try {
      setLoading(true);
      const response = await documentService.getDocuments(filters);
      setDocuments(response.data.documents);
      setPagination(response.data.pagination);
    } catch (error) {
      console.error('Failed to load documents:', error);
      toast.error('Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  // Load queue statistics
  const loadQueueStats = async () => {
    try {
      const response = await documentService.getQueueStats();
      setQueueStats(response.data.stats);
    } catch (error) {
      console.error('Failed to load queue stats:', error);
    }
  };

  useEffect(() => {
    loadDocuments();
    loadQueueStats();
  }, [filters]);

  // Auto-refresh for processing documents
  useEffect(() => {
    const hasProcessingDocs = documents.some(doc => 
      doc.status === 'queued' || doc.status === 'processing'
    );

    if (hasProcessingDocs) {
      const interval = setInterval(() => {
        loadDocuments();
        loadQueueStats();
      }, 5000); // Refresh every 5 seconds

      return () => clearInterval(interval);
    }
  }, [documents]);

  const handleUploadComplete = () => {
    setShowUpload(false);
    loadDocuments();
    loadQueueStats();
    toast.success('Documents uploaded successfully!');
  };

  const handleDocumentAction = async (action: string, documentId: string) => {
    try {
      switch (action) {
        case 'reprocess':
          await documentService.reprocessDocument(documentId);
          toast.success('Document queued for reprocessing');
          loadDocuments();
          break;
        case 'delete':
          await documentService.deleteDocument(documentId);
          toast.success('Document deleted');
          loadDocuments();
          break;
        case 'view':
          const response = await documentService.getDocument(documentId);
          setSelectedDocument(response.data.document);
          break;
      }
    } catch (error) {
      console.error(`Failed to ${action} document:`, error);
      toast.error(`Failed to ${action} document`);
    }
  };

  const updateFilters = (newFilters: Partial<DocumentFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters, page: 1 }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Documents</h1>
          <p className="text-gray-600">Manage and process your expense documents</p>
        </div>
        
        <button
          onClick={() => setShowUpload(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          📄 Upload Documents
        </button>
      </div>

      {/* Queue Statistics */}
      {queueStats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <StatCard
            title="Total"
            value={queueStats.total}
            icon="📊"
            color="bg-gray-100 text-gray-600"
          />
          <StatCard
            title="Waiting"
            value={queueStats.waiting}
            icon="⏳"
            color="bg-yellow-100 text-yellow-600"
          />
          <StatCard
            title="Processing"
            value={queueStats.active}
            icon="⚙️"
            color="bg-blue-100 text-blue-600"
          />
          <StatCard
            title="Completed"
            value={queueStats.completed}
            icon="✅"
            color="bg-green-100 text-green-600"
          />
          <StatCard
            title="Failed"
            value={queueStats.failed}
            icon="❌"
            color="bg-red-100 text-red-600"
          />
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={filters.status || ''}
              onChange={(e) => updateFilters({ status: e.target.value || undefined })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Statuses</option>
              <option value="uploaded">Uploaded</option>
              <option value="queued">Queued</option>
              <option value="processing">Processing</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
              <option value="requires_review">Requires Review</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Document Type
            </label>
            <select
              value={filters.documentType || ''}
              onChange={(e) => updateFilters({ documentType: e.target.value || undefined })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Types</option>
              <option value="receipt">Receipt</option>
              <option value="invoice">Invoice</option>
              <option value="statement">Statement</option>
              <option value="bank_statement">Bank Statement</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search
            </label>
            <input
              type="text"
              value={filters.search || ''}
              onChange={(e) => updateFilters({ search: e.target.value || undefined })}
              placeholder="Search documents..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="flex items-end">
            <label className="inline-flex items-center">
              <input
                type="checkbox"
                checked={filters.requiresReview || false}
                onChange={(e) => updateFilters({ requiresReview: e.target.checked || undefined })}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">Requires Review</span>
            </label>
          </div>
        </div>
      </div>

      {/* Documents List */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600">Loading documents...</p>
          </div>
        ) : documents.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-4xl mb-4">📄</div>
            <p className="text-gray-600 mb-4">No documents found</p>
            <button
              onClick={() => setShowUpload(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Upload Your First Document
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {documents.map((document) => (
              <DocumentRow
                key={document.id}
                document={document}
                onAction={handleDocumentAction}
              />
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex justify-center items-center gap-2">
          <button
            onClick={() => updateFilters({ page: Math.max(1, filters.page! - 1) })}
            disabled={filters.page === 1}
            className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            Previous
          </button>
          
          <span className="px-4 py-2 text-sm text-gray-600">
            Page {pagination.page} of {pagination.pages}
          </span>
          
          <button
            onClick={() => updateFilters({ page: Math.min(pagination.pages, filters.page! + 1) })}
            disabled={filters.page === pagination.pages}
            className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            Next
          </button>
        </div>
      )}

      {/* Upload Modal */}
      <AnimatePresence>
        {showUpload && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-xl p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold">Upload Documents</h2>
                <button
                  onClick={() => setShowUpload(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              
              <DocumentUpload
                onUploadComplete={handleUploadComplete}
                allowMultiple={true}
                allowCamera={true}
                enableClientOCR={true}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Document Detail Modal */}
      <AnimatePresence>
        {selectedDocument && (
          <DocumentDetailModal
            document={selectedDocument}
            onClose={() => setSelectedDocument(null)}
            onAction={handleDocumentAction}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: number;
  icon: string;
  color: string;
}

function StatCard({ title, value, icon, color }: StatCardProps) {
  return (
    <div className={`p-4 rounded-lg ${color}`}>
      <div className="flex items-center gap-2">
        <span className="text-lg">{icon}</span>
        <div>
          <p className="text-sm font-medium">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
      </div>
    </div>
  );
}

interface DocumentRowProps {
  document: Document;
  onAction: (action: string, documentId: string) => void;
}

function DocumentRow({ document, onAction }: DocumentRowProps) {
  const statusBadge = documentService.getStatusBadge(document.status);
  const documentIcon = documentService.getDocumentTypeIcon(document.documentType);
  const confidenceLevel = document.ocrConfidence 
    ? documentService.getConfidenceLevel(document.ocrConfidence)
    : null;

  return (
    <div className="p-4 hover:bg-gray-50 transition-colors">
      <div className="flex items-center gap-4">
        {/* Document Icon */}
        <div className="flex-shrink-0">
          <span className="text-2xl">{documentIcon}</span>
        </div>

        {/* Document Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-medium text-gray-900 truncate">
              {document.originalName}
            </h3>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusBadge.color}`}>
              {statusBadge.icon} {statusBadge.label}
            </span>
            {document.requiresReview && (
              <span className="px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-600">
                👁️ Review Required
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span>{formatFileSize(document.fileSize)}</span>
            <span className="capitalize">{document.documentType.replace('_', ' ')}</span>
            <span>{formatDate(document.createdAt)}</span>
            {document.user && <span>by {document.user.name}</span>}
          </div>
          
          {document.description && (
            <p className="text-xs text-gray-600 mt-1 truncate">{document.description}</p>
          )}
        </div>

        {/* OCR Data */}
        {document.ocrData && (
          <div className="flex-shrink-0 text-right">
            <div className="text-xs text-gray-600 mb-1">
              {document.ocrData.extractedData.amount && (
                <div className="font-medium">
                  {formatCurrency(
                    document.ocrData.extractedData.amount,
                    document.ocrData.extractedData.currency || 'USD'
                  )}
                </div>
              )}
              {document.ocrData.extractedData.vendor && (
                <div className="truncate max-w-32">{document.ocrData.extractedData.vendor}</div>
              )}
            </div>
            
            {confidenceLevel && (
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${confidenceLevel.color}`}>
                {Math.round(document.ocrConfidence! * 100)}%
              </span>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex-shrink-0 flex items-center gap-2">
          <button
            onClick={() => onAction('view', document.id)}
            className="text-blue-600 hover:text-blue-800 text-sm"
            title="View Details"
          >
            👁️
          </button>
          
          {(document.status === 'failed' || document.status === 'requires_review') && (
            <button
              onClick={() => onAction('reprocess', document.id)}
              className="text-green-600 hover:text-green-800 text-sm"
              title="Reprocess"
            >
              🔄
            </button>
          )}
          
          <button
            onClick={() => onAction('delete', document.id)}
            className="text-red-600 hover:text-red-800 text-sm"
            title="Delete"
          >
            🗑️
          </button>
        </div>
      </div>
    </div>
  );
}

interface DocumentDetailModalProps {
  document: Document;
  onClose: () => void;
  onAction: (action: string, documentId: string) => void;
}

function DocumentDetailModal({ document, onClose, onAction }: DocumentDetailModalProps) {
  const [activeTab, setActiveTab] = useState('details');

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{document.originalName}</h2>
            <p className="text-sm text-gray-600">
              {documentService.getStatusBadge(document.status).label} • 
              {formatDate(document.createdAt)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex">
            {['details', 'ocr', 'preview'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-3 text-sm font-medium capitalize ${
                  activeTab === tab
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="p-6 max-h-96 overflow-y-auto">
          {activeTab === 'details' && (
            <DocumentDetails document={document} />
          )}
          
          {activeTab === 'ocr' && (
            <OCRResults document={document} />
          )}
          
          {activeTab === 'preview' && (
            <DocumentPreview document={document} />
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
          {(document.status === 'failed' || document.status === 'requires_review') && (
            <button
              onClick={() => {
                onAction('reprocess', document.id);
                onClose();
              }}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              🔄 Reprocess
            </button>
          )}
          
          <button
            onClick={() => {
              onAction('delete', document.id);
              onClose();
            }}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            🗑️ Delete
          </button>
          
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            Close
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function DocumentDetails({ document }: { document: Document }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Document Information</h3>
        <dl className="space-y-3">
          <div>
            <dt className="text-sm font-medium text-gray-500">File Name</dt>
            <dd className="text-sm text-gray-900">{document.originalName}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">File Size</dt>
            <dd className="text-sm text-gray-900">{formatFileSize(document.fileSize)}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Document Type</dt>
            <dd className="text-sm text-gray-900 capitalize">
              {document.documentType.replace('_', ' ')}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Status</dt>
            <dd className="text-sm text-gray-900">{document.status}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Uploaded By</dt>
            <dd className="text-sm text-gray-900">{document.user?.name || 'Unknown'}</dd>
          </div>
        </dl>
      </div>

      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Processing Information</h3>
        <dl className="space-y-3">
          <div>
            <dt className="text-sm font-medium text-gray-500">OCR Confidence</dt>
            <dd className="text-sm text-gray-900">
              {document.ocrConfidence 
                ? `${Math.round(document.ocrConfidence * 100)}%`
                : 'Not processed'
              }
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Requires Review</dt>
            <dd className="text-sm text-gray-900">
              {document.requiresReview ? 'Yes' : 'No'}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Created</dt>
            <dd className="text-sm text-gray-900">{formatDate(document.createdAt)}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Last Updated</dt>
            <dd className="text-sm text-gray-900">{formatDate(document.updatedAt)}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}

function OCRResults({ document }: { document: Document }) {
  if (!document.ocrData) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">OCR processing not completed</p>
      </div>
    );
  }

  const { extractedData, confidenceScores } = document.ocrData;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Extracted Data</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(extractedData).map(([field, value]) => (
            <div key={field} className="border border-gray-200 rounded-lg p-3">
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-medium text-gray-700 capitalize">
                  {field.replace(/([A-Z])/g, ' $1').trim()}
                </span>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  confidenceScores[field] >= 0.8 ? 'bg-green-100 text-green-600' :
                  confidenceScores[field] >= 0.6 ? 'bg-yellow-100 text-yellow-600' :
                  'bg-red-100 text-red-600'
                }`}>
                  {Math.round((confidenceScores[field] || 0) * 100)}%
                </span>
              </div>
              <p className="text-sm text-gray-900">
                {value?.toString() || 'Not detected'}
              </p>
            </div>
          ))}
        </div>
      </div>

      {document.extractedText && (
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Full OCR Text</h3>
          <div className="bg-gray-50 rounded-lg p-4 max-h-64 overflow-y-auto">
            <pre className="text-sm text-gray-700 whitespace-pre-wrap">
              {document.extractedText}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

function DocumentPreview({ document }: { document: Document }) {
  const documentUrl = documentService.getDocumentUrl(document.filename);
  
  return (
    <div className="text-center">
      {document.mimeType.startsWith('image/') ? (
        <img
          src={documentUrl}
          alt="Document preview"
          className="max-w-full max-h-96 mx-auto rounded-lg border border-gray-200"
        />
      ) : (
        <div className="border border-gray-200 rounded-lg p-8">
          <div className="text-4xl mb-4">📄</div>
          <p className="text-gray-600 mb-4">PDF Preview</p>
          <a
            href={documentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            🔗 Open in New Tab
          </a>
        </div>
      )}
    </div>
  );
} 