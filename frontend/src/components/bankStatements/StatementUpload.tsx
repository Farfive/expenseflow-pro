'use client';

import React, { useState, useCallback, useRef } from 'react';
import { 
  CloudArrowUpIcon,
  DocumentIcon,
  XMarkIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import bankStatementService, { 
  UploadOptions, 
  BankFormat, 
  ProcessingResult 
} from '../../services/bankStatementService';

interface StatementUploadProps {
  onUploadComplete?: (result: ProcessingResult) => void;
  onUploadError?: (error: string) => void;
  maxFiles?: number;
  autoProcess?: boolean;
}

interface UploadFile {
  file: File;
  id: string;
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'error';
  progress: number;
  error?: string;
  result?: ProcessingResult;
}

const StatementUpload: React.FC<StatementUploadProps> = ({
  onUploadComplete,
  onUploadError,
  maxFiles = 5,
  autoProcess = true
}) => {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [bankFormats, setBankFormats] = useState<BankFormat[]>([]);
  const [uploadOptions, setUploadOptions] = useState<UploadOptions>({
    currency: 'USD',
    autoProcess: true
  });
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load supported bank formats on component mount
  React.useEffect(() => {
    loadBankFormats();
  }, []);

  const loadBankFormats = async () => {
    try {
      const response = await bankStatementService.getSupportedFormats();
      if (response.success) {
        setBankFormats(response.formats);
      }
    } catch (error) {
      console.error('Failed to load bank formats:', error);
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const droppedFiles = Array.from(e.dataTransfer.files);
    handleFiles(droppedFiles);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    handleFiles(selectedFiles);
    
    // Reset input value
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const handleFiles = (newFiles: File[]) => {
    const validFiles: UploadFile[] = [];
    
    newFiles.forEach((file) => {
      // Check if we've reached max files
      if (files.length + validFiles.length >= maxFiles) {
        return;
      }

      // Validate file
      const validation = bankStatementService.validateFile(file);
      if (validation.valid) {
        validFiles.push({
          file,
          id: `${Date.now()}-${Math.random()}`,
          status: 'pending',
          progress: 0
        });
      } else {
        onUploadError?.(validation.errors.join(', '));
      }
    });

    setFiles(prev => [...prev, ...validFiles]);
  };

  const removeFile = (fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const uploadFile = async (uploadFile: UploadFile) => {
    try {
      // Update status to uploading
      setFiles(prev => prev.map(f => 
        f.id === uploadFile.id 
          ? { ...f, status: 'uploading', progress: 50 }
          : f
      ));

      const options: UploadOptions = {
        ...uploadOptions,
        autoProcess
      };

      const result = await bankStatementService.uploadStatement(uploadFile.file, options);

      if (result.success) {
        // Update status to completed
        setFiles(prev => prev.map(f => 
          f.id === uploadFile.id 
            ? { 
                ...f, 
                status: 'completed', 
                progress: 100,
                result: result as ProcessingResult
              }
            : f
        ));

        onUploadComplete?.(result as ProcessingResult);
      } else {
        throw new Error('Upload failed');
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      
      setFiles(prev => prev.map(f => 
        f.id === uploadFile.id 
          ? { ...f, status: 'error', error: errorMessage }
          : f
      ));

      onUploadError?.(errorMessage);
    }
  };

  const uploadAllFiles = async () => {
    setIsLoading(true);
    
    const pendingFiles = files.filter(f => f.status === 'pending');
    
    for (const file of pendingFiles) {
      await uploadFile(file);
    }
    
    setIsLoading(false);
  };

  const retryFile = (fileId: string) => {
    const file = files.find(f => f.id === fileId);
    if (file) {
      uploadFile(file);
    }
  };

  const clearCompleted = () => {
    setFiles(prev => prev.filter(f => f.status !== 'completed'));
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.toLowerCase().split('.').pop();
    const iconClass = "w-8 h-8";
    
    switch (ext) {
      case 'pdf':
        return <DocumentIcon className={`${iconClass} text-red-500`} />;
      case 'csv':
        return <DocumentIcon className={`${iconClass} text-green-500`} />;
      case 'xlsx':
      case 'xls':
        return <DocumentIcon className={`${iconClass} text-blue-500`} />;
      default:
        return <DocumentIcon className={`${iconClass} text-gray-500`} />;
    }
  };

  const getStatusIcon = (status: UploadFile['status']) => {
    switch (status) {
      case 'uploading':
      case 'processing':
        return <ArrowPathIcon className="w-5 h-5 text-blue-500 animate-spin" />;
      case 'completed':
        return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
      case 'error':
        return <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload Options */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Upload Settings</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Account Number
            </label>
            <input
              type="text"
              value={uploadOptions.accountNumber || ''}
              onChange={(e) => setUploadOptions(prev => ({
                ...prev,
                accountNumber: e.target.value
              }))}
              className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., ****1234"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Account Name
            </label>
            <input
              type="text"
              value={uploadOptions.accountName || ''}
              onChange={(e) => setUploadOptions(prev => ({
                ...prev,
                accountName: e.target.value
              }))}
              className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              placeholder="Business Checking"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Currency
            </label>
            <select
              value={uploadOptions.currency || 'USD'}
              onChange={(e) => setUploadOptions(prev => ({
                ...prev,
                currency: e.target.value
              }))}
              className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
              <option value="CAD">CAD</option>
              <option value="AUD">AUD</option>
              <option value="PLN">PLN</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Bank Format
            </label>
            <select
              value={uploadOptions.bankFormat || ''}
              onChange={(e) => setUploadOptions(prev => ({
                ...prev,
                bankFormat: e.target.value
              }))}
              className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Auto-detect</option>
              {bankFormats.map((format) => (
                <option key={format.key} value={format.key}>
                  {format.bankName} ({format.formatType})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 flex items-center">
          <input
            type="checkbox"
            id="autoProcess"
            checked={uploadOptions.autoProcess !== false}
            onChange={(e) => setUploadOptions(prev => ({
              ...prev,
              autoProcess: e.target.checked
            }))}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="autoProcess" className="ml-2 block text-sm text-gray-900">
            Process immediately after upload
          </label>
        </div>
      </div>

      {/* Drop Zone */}
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isDragOver 
            ? 'border-blue-400 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <CloudArrowUpIcon className="mx-auto h-12 w-12 text-gray-400" />
        <div className="mt-4">
          <p className="text-lg font-medium text-gray-900">
            Drop bank statements here or{' '}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-blue-600 hover:text-blue-500 underline"
            >
              browse files
            </button>
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Supports CSV, Excel (.xlsx, .xls), and PDF files up to 50MB
          </p>
        </div>
        
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".csv,.xlsx,.xls,.pdf"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* Supported Formats Info */}
      {bankFormats.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex">
            <InformationCircleIcon className="h-5 w-5 text-blue-400" />
            <div className="ml-3">
              <h4 className="text-sm font-medium text-blue-800">
                Supported Bank Formats
              </h4>
              <div className="mt-2 text-sm text-blue-700">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  {bankFormats.map((format) => (
                    <div key={format.key} className="flex items-center">
                      <span className="font-medium">{format.bankName}</span>
                      <span className="text-xs text-blue-600 ml-1">({format.formatType})</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* File List */}
      {files.length > 0 && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900">
              Files ({files.length})
            </h3>
            <div className="flex space-x-2">
              {files.some(f => f.status === 'completed') && (
                <button
                  onClick={clearCompleted}
                  className="text-sm text-gray-600 hover:text-gray-800"
                >
                  Clear Completed
                </button>
              )}
              {files.some(f => f.status === 'pending') && (
                <button
                  onClick={uploadAllFiles}
                  disabled={isLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm"
                >
                  {isLoading ? 'Uploading...' : 'Upload All'}
                </button>
              )}
            </div>
          </div>

          <div className="divide-y divide-gray-200">
            {files.map((file) => (
              <div key={file.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center flex-1">
                    {getFileIcon(file.file.name)}
                    <div className="ml-3 flex-1">
                      <div className="flex items-center">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {file.file.name}
                        </p>
                        <div className="ml-2">
                          {getStatusIcon(file.status)}
                        </div>
                      </div>
                      <div className="flex items-center mt-1 text-sm text-gray-500">
                        <span>{bankStatementService.formatFileSize(file.file.size)}</span>
                        {file.status === 'completed' && file.result && (
                          <>
                            <span className="mx-2">•</span>
                            <span>{file.result.transactionCount} transactions</span>
                            {file.result.duplicateCount > 0 && (
                              <>
                                <span className="mx-2">•</span>
                                <span className="text-yellow-600">
                                  {file.result.duplicateCount} duplicates
                                </span>
                              </>
                            )}
                          </>
                        )}
                      </div>
                      
                      {/* Progress Bar */}
                      {(file.status === 'uploading' || file.status === 'processing') && (
                        <div className="mt-2 w-full bg-gray-200 rounded-full h-1.5">
                          <div
                            className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                            style={{ width: `${file.progress}%` }}
                          />
                        </div>
                      )}

                      {/* Error Message */}
                      {file.status === 'error' && file.error && (
                        <p className="mt-1 text-sm text-red-600">{file.error}</p>
                      )}

                      {/* Success Summary */}
                      {file.status === 'completed' && file.result && (
                        <div className="mt-2 text-sm text-green-600">
                          Successfully processed • {file.result.bankFormat} format detected
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 ml-4">
                    {file.status === 'error' && (
                      <button
                        onClick={() => retryFile(file.id)}
                        className="text-sm text-blue-600 hover:text-blue-800"
                      >
                        Retry
                      </button>
                    )}
                    <button
                      onClick={() => removeFile(file.id)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <XMarkIcon className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default StatementUpload; 