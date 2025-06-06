'use client';

import React, { useState, useCallback, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import Webcam from 'react-webcam';
import { documentService, type DocumentUploadResponse, type BatchUploadResponse } from '../../services/documentService';
import { ocrService, type OCRResult, type ProcessingProgress } from '../../services/ocrService';

interface DocumentUploadProps {
  onUploadComplete?: (result: DocumentUploadResponse | BatchUploadResponse) => void;
  onOCRComplete?: (result: OCRResult) => void;
  allowMultiple?: boolean;
  allowCamera?: boolean;
  enableClientOCR?: boolean;
  maxFiles?: number;
  className?: string;
}

interface UploadedFile extends File {
  id: string;
  preview?: string;
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'failed';
  progress: number;
  ocrResult?: OCRResult;
  error?: string;
}

export default function DocumentUpload({
  onUploadComplete,
  onOCRComplete,
  allowMultiple = true,
  allowCamera = true,
  enableClientOCR = true,
  maxFiles = 10,
  className = '',
}: DocumentUploadProps) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [processingProgress, setProcessingProgress] = useState<Record<string, ProcessingProgress>>({});
  const [documentType, setDocumentType] = useState('receipt');
  const [description, setDescription] = useState('');
  
  const webcamRef = useRef<Webcam>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const validation = allowMultiple 
      ? documentService.validateBatch(acceptedFiles)
      : { isValid: documentService.validateFile(acceptedFiles[0]).isValid, errors: [] };

    if (!validation.isValid) {
      validation.errors.forEach(error => toast.error(error));
      return;
    }

    const newFiles: UploadedFile[] = acceptedFiles.map((file) => ({
      ...file,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
      status: 'pending',
      progress: 0,
    }));

    if (allowMultiple) {
      setFiles(prev => [...prev, ...newFiles].slice(0, maxFiles));
    } else {
      setFiles(newFiles.slice(0, 1));
    }
  }, [allowMultiple, maxFiles]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
    },
    multiple: allowMultiple,
    maxFiles: allowMultiple ? maxFiles : 1,
  });

  const capturePhoto = useCallback(() => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
      // Convert base64 to File
      fetch(imageSrc)
        .then(res => res.blob())
        .then(blob => {
          const file = new File([blob], `camera-capture-${Date.now()}.jpg`, {
            type: 'image/jpeg',
          }) as UploadedFile;
          
          file.id = `camera-${Date.now()}`;
          file.preview = imageSrc;
          file.status = 'pending';
          file.progress = 0;
          
          if (allowMultiple) {
            setFiles(prev => [...prev, file].slice(0, maxFiles));
          } else {
            setFiles([file]);
          }
          
          setShowCamera(false);
        });
    }
  }, [allowMultiple, maxFiles]);

  const processFileWithOCR = async (file: UploadedFile): Promise<OCRResult | null> => {
    if (!enableClientOCR) return null;

    try {
      setFiles(prev => prev.map(f => 
        f.id === file.id ? { ...f, status: 'processing' } : f
      ));

      const result = await ocrService.processFile(file, (progress) => {
        setProcessingProgress(prev => ({
          ...prev,
          [file.id]: progress,
        }));
        
        // Update file progress
        const progressPercent = Math.round(progress.progress);
        setFiles(prev => prev.map(f => 
          f.id === file.id ? { ...f, progress: progressPercent } : f
        ));
      });

      setFiles(prev => prev.map(f => 
        f.id === file.id ? { 
          ...f, 
          status: 'completed',
          progress: 100,
          ocrResult: result,
        } : f
      ));

      // Clean up progress
      setProcessingProgress(prev => {
        const newProgress = { ...prev };
        delete newProgress[file.id];
        return newProgress;
      });

      if (onOCRComplete) {
        onOCRComplete(result);
      }

      return result;
    } catch (error) {
      console.error('OCR processing failed:', error);
      
      setFiles(prev => prev.map(f => 
        f.id === file.id ? { 
          ...f, 
          status: 'failed',
          error: error instanceof Error ? error.message : 'OCR processing failed',
        } : f
      ));

      toast.error(`OCR failed for ${file.name}`);
      return null;
    }
  };

  const uploadFiles = async () => {
    if (files.length === 0) {
      toast.error('Please select files to upload');
      return;
    }

    setIsUploading(true);

    try {
      // Process OCR if enabled
      if (enableClientOCR) {
        for (const file of files.filter(f => f.status === 'pending')) {
          await processFileWithOCR(file);
        }
      }

      // Upload files to server
      if (allowMultiple && files.length > 1) {
        // Batch upload
        const result = await documentService.uploadBatch(files, {
          documentType,
          batchDescription: description,
        });

        toast.success(`Successfully uploaded ${files.length} documents`);
        
        if (onUploadComplete) {
          onUploadComplete(result);
        }
      } else {
        // Single file upload
        const file = files[0];
        const result = await documentService.uploadDocument(file, {
          documentType,
          description,
        });

        toast.success(`Successfully uploaded ${file.name}`);
        
        if (onUploadComplete) {
          onUploadComplete(result);
        }
      }

      // Reset form
      setFiles([]);
      setDescription('');
    } catch (error) {
      console.error('Upload failed:', error);
      toast.error('Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const removeFile = (fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const retryOCR = async (fileId: string) => {
    const file = files.find(f => f.id === fileId);
    if (file) {
      await processFileWithOCR(file);
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Upload Area */}
      <div
        {...getRootProps()}
        className={`
          relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 cursor-pointer
          ${isDragActive 
            ? 'border-blue-400 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
          }
        `}
      >
        <input {...getInputProps()} />
        <div className="space-y-4">
          <div className="text-4xl">📄</div>
          <div>
            <p className="text-lg font-medium text-gray-700">
              {isDragActive ? 'Drop files here' : 'Drag & drop documents here'}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              or click to browse • PDF, JPG, PNG • Max {maxFiles} files • 50MB each
            </p>
          </div>
          
          {allowCamera && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowCamera(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-100 rounded-lg hover:bg-blue-200 transition-colors"
            >
              📷 Use Camera
            </button>
          )}
        </div>
      </div>

      {/* Document Type & Description */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Document Type
          </label>
          <select
            value={documentType}
            onChange={(e) => setDocumentType(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="receipt">Receipt</option>
            <option value="invoice">Invoice</option>
            <option value="statement">Statement</option>
            <option value="bank_statement">Bank Statement</option>
            <option value="other">Other</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description (Optional)
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add description..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* File List */}
      <AnimatePresence>
        {files.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-3"
          >
            <h3 className="text-lg font-medium text-gray-900">
              Selected Files ({files.length})
            </h3>
            
            <div className="space-y-2">
              {files.map((file) => (
                <FilePreview
                  key={file.id}
                  file={file}
                  progress={processingProgress[file.id]}
                  onRemove={() => removeFile(file.id)}
                  onRetryOCR={() => retryOCR(file.id)}
                  enableClientOCR={enableClientOCR}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Upload Button */}
      {files.length > 0 && (
        <div className="flex justify-end">
          <button
            onClick={uploadFiles}
            disabled={isUploading}
            className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isUploading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Uploading...
              </div>
            ) : (
              `Upload ${files.length} ${files.length === 1 ? 'File' : 'Files'}`
            )}
          </button>
        </div>
      )}

      {/* Camera Modal */}
      <AnimatePresence>
        {showCamera && (
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
              className="bg-white rounded-xl p-6 max-w-2xl w-full mx-4"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Capture Document</h3>
                <button
                  onClick={() => setShowCamera(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="relative bg-gray-900 rounded-lg overflow-hidden">
                  <Webcam
                    ref={webcamRef}
                    audio={false}
                    screenshotFormat="image/jpeg"
                    className="w-full"
                    videoConstraints={{
                      facingMode: 'environment', // Use back camera on mobile
                    }}
                  />
                </div>
                
                <div className="flex justify-center gap-4">
                  <button
                    onClick={() => setShowCamera(false)}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={capturePhoto}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    📷 Capture
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface FilePreviewProps {
  file: UploadedFile;
  progress?: ProcessingProgress;
  onRemove: () => void;
  onRetryOCR: () => void;
  enableClientOCR: boolean;
}

function FilePreview({ file, progress, onRemove, onRetryOCR, enableClientOCR }: FilePreviewProps) {
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusColor = () => {
    switch (file.status) {
      case 'pending': return 'text-gray-600 bg-gray-100';
      case 'uploading': return 'text-blue-600 bg-blue-100';
      case 'processing': return 'text-purple-600 bg-purple-100';
      case 'completed': return 'text-green-600 bg-green-100';
      case 'failed': return 'text-red-600 bg-red-100';
    }
  };

  const getStatusLabel = () => {
    if (progress) {
      return `${progress.stage}: ${progress.message}`;
    }
    
    switch (file.status) {
      case 'pending': return 'Ready to upload';
      case 'uploading': return 'Uploading...';
      case 'processing': return 'Processing...';
      case 'completed': return 'Completed';
      case 'failed': return file.error || 'Failed';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg bg-white"
    >
      {/* File Preview */}
      <div className="flex-shrink-0 w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
        {file.preview ? (
          <img src={file.preview} alt="Preview" className="w-full h-full object-cover" />
        ) : (
          <span className="text-xl">📄</span>
        )}
      </div>

      {/* File Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor()}`}>
            {file.status}
          </span>
        </div>
        
        <p className="text-xs text-gray-500 mb-1">
          {formatFileSize(file.size)} • {file.type}
        </p>
        
        <p className="text-xs text-gray-600">{getStatusLabel()}</p>
        
        {/* Progress Bar */}
        {(file.status === 'processing' || file.status === 'uploading') && (
          <div className="mt-2">
            <div className="w-full bg-gray-200 rounded-full h-1.5">
              <div
                className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${file.progress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* OCR Results */}
      {enableClientOCR && file.ocrResult && (
        <div className="flex-shrink-0">
          <div className="text-xs text-gray-600">
            <div className="flex items-center gap-1 mb-1">
              <span>Confidence:</span>
              <span className={`font-medium ${
                file.ocrResult.overallConfidence >= 0.8 ? 'text-green-600' :
                file.ocrResult.overallConfidence >= 0.6 ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {Math.round(file.ocrResult.overallConfidence * 100)}%
              </span>
            </div>
            {file.ocrResult.extractedData.amount && (
              <div>Amount: {file.ocrResult.extractedData.currency}{file.ocrResult.extractedData.amount}</div>
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex-shrink-0 flex items-center gap-2">
        {file.status === 'failed' && enableClientOCR && (
          <button
            onClick={onRetryOCR}
            className="text-xs text-blue-600 hover:text-blue-800"
          >
            Retry OCR
          </button>
        )}
        
        <button
          onClick={onRemove}
          className="text-gray-400 hover:text-red-600 transition-colors"
        >
          ✕
        </button>
      </div>
    </motion.div>
  );
} 