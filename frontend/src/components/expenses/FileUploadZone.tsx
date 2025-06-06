/**
 * File Upload Zone Component
 * 
 * Handles file upload with drag-and-drop and camera integration
 */

import React, { useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Camera, X, ZoomIn, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { UploadedFile } from './ExpenseSubmissionForm';

interface FileUploadZoneProps {
  onDrop: (files: File[]) => void;
  uploadedFiles: UploadedFile[];
  onRemoveFile: (fileId: string) => void;
  onShowPreview: (index: number) => void;
}

const FileUploadZone: React.FC<FileUploadZoneProps> = ({
  onDrop,
  uploadedFiles,
  onRemoveFile,
  onShowPreview
}) => {
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png'],
      'application/pdf': ['.pdf'],
    },
    multiple: true,
    maxSize: 10 * 1024 * 1024, // 10MB
  });

  const handleCameraCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      onDrop(files);
    }
  };

  const getStatusIcon = (status: UploadedFile['processingStatus']) => {
    switch (status) {
      case 'pending':
        return <div className="w-3 h-3 bg-gray-400 rounded-full" />;
      case 'processing':
        return <Loader2 className="w-3 h-3 animate-spin text-blue-600" />;
      case 'completed':
        return <CheckCircle className="w-3 h-3 text-green-600" />;
      case 'error':
        return <AlertCircle className="w-3 h-3 text-red-600" />;
    }
  };

  const getStatusText = (status: UploadedFile['processingStatus']) => {
    switch (status) {
      case 'pending':
        return 'Pending';
      case 'processing':
        return 'Processing...';
      case 'completed':
        return 'Processed';
      case 'error':
        return 'Error';
    }
  };

  const getStatusColor = (status: UploadedFile['processingStatus']) => {
    switch (status) {
      case 'pending':
        return 'text-gray-600';
      case 'processing':
        return 'text-blue-600';
      case 'completed':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
    }
  };

  return (
    <div className="card p-6">
      <h3 className="text-lg font-semibold mb-4">Upload Receipts</h3>
      
      <div className="space-y-4">
        {/* Drop Zone */}
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
            isDragActive
              ? 'border-blue-400 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400'
          }`}
        >
          <input {...getInputProps()} />
          <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          {isDragActive ? (
            <p className="text-blue-600">Drop files here...</p>
          ) : (
            <div>
              <p className="text-gray-600 mb-2">
                Drag and drop receipts here, or click to select files
              </p>
              <p className="text-sm text-gray-500">
                Supports: JPG, PNG, PDF (max 10MB each)
              </p>
            </div>
          )}
        </div>

        {/* Camera Capture */}
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => cameraInputRef.current?.click()}
            className="btn btn-outline flex items-center"
          >
            <Camera className="w-4 h-4 mr-2" />
            Take Photo
          </button>
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            className="hidden"
            onChange={handleCameraCapture}
          />
        </div>

        {/* Uploaded Files */}
        {uploadedFiles.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium">Uploaded Files ({uploadedFiles.length})</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {uploadedFiles.map((file, index) => (
                <div
                  key={file.id}
                  className="border rounded-lg p-3 space-y-2 hover:shadow-md transition-shadow"
                >
                  {/* File Header */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium truncate flex-1">
                      {file.file.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => onRemoveFile(file.id)}
                      className="text-red-500 hover:text-red-700 p-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Image Preview */}
                  <div className="relative">
                    <img
                      src={file.preview}
                      alt="Receipt preview"
                      className="w-full h-24 object-cover rounded cursor-pointer"
                      onClick={() => onShowPreview(index)}
                    />
                    <button
                      type="button"
                      onClick={() => onShowPreview(index)}
                      className="absolute top-2 right-2 bg-black bg-opacity-50 text-white p-1 rounded"
                    >
                      <ZoomIn className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Processing Status */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(file.processingStatus)}
                      <span className={`text-xs ${getStatusColor(file.processingStatus)}`}>
                        {getStatusText(file.processingStatus)}
                      </span>
                    </div>
                    
                    {/* File Size */}
                    <span className="text-xs text-gray-500">
                      {(file.file.size / 1024 / 1024).toFixed(1)}MB
                    </span>
                  </div>

                  {/* Validation Results */}
                  {file.validationResults && (
                    <div className="text-xs">
                      <div className={`px-2 py-1 rounded ${
                        file.validationResults.quality === 'excellent' ? 'bg-green-100 text-green-800' :
                        file.validationResults.quality === 'good' ? 'bg-blue-100 text-blue-800' :
                        file.validationResults.quality === 'fair' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        Quality: {file.validationResults.quality}
                      </div>
                      
                      {file.validationResults.issues.length > 0 && (
                        <div className="mt-1 text-gray-600">
                          Issues: {file.validationResults.issues.join(', ')}
                        </div>
                      )}
                    </div>
                  )}

                  {/* OCR Results Preview */}
                  {file.ocrData && file.processingStatus === 'completed' && (
                    <div className="text-xs space-y-1 bg-gray-50 p-2 rounded">
                      {file.ocrData.amount && (
                        <div>Amount: {file.ocrData.amount} {file.ocrData.currency || 'PLN'}</div>
                      )}
                      {file.ocrData.merchantName && (
                        <div>Merchant: {file.ocrData.merchantName}</div>
                      )}
                      {file.ocrData.transactionDate && (
                        <div>Date: {file.ocrData.transactionDate}</div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FileUploadZone; 