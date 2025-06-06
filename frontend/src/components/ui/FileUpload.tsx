'use client';

import { useState, useCallback, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Upload, 
  File, 
  Image, 
  FileText, 
  X, 
  CheckCircle, 
  AlertCircle,
  Loader2,
  Eye,
  Download
} from 'lucide-react';
import { FileUpload as FileUploadType, UploadConfig } from '@/types';
import { formatFileSize } from '@/utils/formatters';

interface FileUploadProps {
  onFilesUpload?: (files: FileUploadType[]) => void;
  onFileRemove?: (fileId: string) => void;
  config?: Partial<UploadConfig>;
  disabled?: boolean;
  multiple?: boolean;
  className?: string;
}

const defaultConfig: UploadConfig = {
  maxFileSize: 10 * 1024 * 1024, // 10MB
  acceptedFileTypes: ['image/jpeg', 'image/png', 'application/pdf'],
  maxFiles: 5,
};

const getFileIcon = (mimeType: string) => {
  if (mimeType.startsWith('image/')) return Image;
  if (mimeType === 'application/pdf') return FileText;
  return File;
};

export function FileUpload({
  onFilesUpload,
  onFileRemove,
  config = {},
  disabled = false,
  multiple = true,
  className = '',
}: FileUploadProps) {
  const [files, setFiles] = useState<FileUploadType[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadConfig = { ...defaultConfig, ...config };

  const processFiles = useCallback((acceptedFiles: File[]) => {
    const newFiles: FileUploadType[] = acceptedFiles.map((file) => ({
      file,
      progress: 0,
      status: 'pending',
    }));

    setFiles((prevFiles) => {
      const updatedFiles = [...prevFiles, ...newFiles];
      
      // Simulate upload progress
      newFiles.forEach((fileUpload, index) => {
        setTimeout(() => {
          setFiles((currentFiles) =>
            currentFiles.map((f) =>
              f.file === fileUpload.file
                ? { ...f, status: 'uploading', progress: 0 }
                : f
            )
          );

          // Simulate progress updates
          const progressInterval = setInterval(() => {
            setFiles((currentFiles) => {
              const file = currentFiles.find((f) => f.file === fileUpload.file);
              if (!file || file.status !== 'uploading') {
                clearInterval(progressInterval);
                return currentFiles;
              }

              const newProgress = Math.min(file.progress + Math.random() * 30, 100);
              
              if (newProgress >= 100) {
                clearInterval(progressInterval);
                // Simulate random success/failure
                const isSuccess = Math.random() > 0.1; // 90% success rate
                
                setTimeout(() => {
                  setFiles((finalFiles) =>
                    finalFiles.map((f) =>
                      f.file === fileUpload.file
                        ? {
                            ...f,
                            status: isSuccess ? 'success' : 'error',
                            progress: 100,
                            error: isSuccess ? undefined : 'Upload failed. Please try again.',
                            documentId: isSuccess ? `doc_${Date.now()}_${index}` : undefined,
                          }
                        : f
                    )
                  );
                }, 500);
                
                return currentFiles.map((f) =>
                  f.file === fileUpload.file
                    ? { ...f, progress: 100 }
                    : f
                );
              }

              return currentFiles.map((f) =>
                f.file === fileUpload.file
                  ? { ...f, progress: newProgress }
                  : f
              );
            });
          }, 200);
        }, index * 100);
      });

      onFilesUpload?.(updatedFiles);
      return updatedFiles;
    });
  }, [onFilesUpload]);

  const {
    getRootProps,
    getInputProps,
    isDragActive,
    isDragAccept,
    isDragReject,
  } = useDropzone({
    onDrop: processFiles,
    accept: uploadConfig.acceptedFileTypes.reduce((acc, type) => {
      acc[type] = [];
      return acc;
    }, {} as Record<string, string[]>),
    maxSize: uploadConfig.maxFileSize,
    maxFiles: uploadConfig.maxFiles,
    multiple,
    disabled,
    onDragEnter: () => setDragActive(true),
    onDragLeave: () => setDragActive(false),
  });

  const removeFile = (fileToRemove: FileUploadType) => {
    setFiles((prevFiles) => {
      const updatedFiles = prevFiles.filter((f) => f.file !== fileToRemove.file);
      if (fileToRemove.documentId) {
        onFileRemove?.(fileToRemove.documentId);
      }
      return updatedFiles;
    });
  };

  const retryUpload = (fileToRetry: FileUploadType) => {
    processFiles([fileToRetry.file]);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={`
          dropzone
          ${isDragActive ? 'active' : ''}
          ${isDragAccept ? 'accept' : ''}
          ${isDragReject ? 'reject' : ''}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
      >
        <input {...getInputProps()} ref={fileInputRef} />
        
        <motion.div
          animate={{
            scale: isDragActive ? 1.02 : 1,
          }}
          transition={{ duration: 0.2 }}
          className="flex flex-col items-center space-y-3"
        >
          <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
            <Upload className="w-6 h-6 text-muted-foreground" />
          </div>
          
          <div className="text-center">
            <p className="text-sm font-medium">
              {isDragActive ? 'Drop files here' : 'Drag & drop files here'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              or{' '}
              <span className="text-primary hover:text-primary/80">
                browse files
              </span>
            </p>
          </div>
          
          <div className="text-xs text-muted-foreground text-center">
            <p>
              Supports: {uploadConfig.acceptedFileTypes.map(type => {
                if (type.includes('image')) return 'Images';
                if (type.includes('pdf')) return 'PDF';
                return type.split('/')[1]?.toUpperCase();
              }).join(', ')}
            </p>
            <p>
              Max size: {formatFileSize(uploadConfig.maxFileSize)} per file
            </p>
            {multiple && (
              <p>
                Max files: {uploadConfig.maxFiles}
              </p>
            )}
          </div>
        </motion.div>
      </div>

      {/* File list */}
      <AnimatePresence>
        {files.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2"
          >
            {files.map((fileUpload, index) => {
              const IconComponent = getFileIcon(fileUpload.file.type);
              
              return (
                <motion.div
                  key={`${fileUpload.file.name}-${index}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ delay: index * 0.1 }}
                  className="card p-4"
                >
                  <div className="flex items-center space-x-3">
                    {/* File icon */}
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                        <IconComponent className="w-5 h-5 text-muted-foreground" />
                      </div>
                    </div>

                    {/* File info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {fileUpload.file.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatFileSize(fileUpload.file.size)}
                          </p>
                        </div>

                        {/* Status indicator */}
                        <div className="flex items-center space-x-2">
                          {fileUpload.status === 'uploading' && (
                            <Loader2 className="w-4 h-4 animate-spin text-primary" />
                          )}
                          {fileUpload.status === 'success' && (
                            <CheckCircle className="w-4 h-4 text-success" />
                          )}
                          {fileUpload.status === 'error' && (
                            <AlertCircle className="w-4 h-4 text-destructive" />
                          )}
                        </div>
                      </div>

                      {/* Progress bar */}
                      {fileUpload.status === 'uploading' && (
                        <div className="mt-2">
                          <div className="w-full bg-muted rounded-full h-1.5">
                            <motion.div
                              className="bg-primary h-1.5 rounded-full"
                              initial={{ width: 0 }}
                              animate={{ width: `${fileUpload.progress}%` }}
                              transition={{ duration: 0.3 }}
                            />
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {Math.round(fileUpload.progress)}% uploaded
                          </p>
                        </div>
                      )}

                      {/* Error message */}
                      {fileUpload.status === 'error' && fileUpload.error && (
                        <p className="text-xs text-destructive mt-1">
                          {fileUpload.error}
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center space-x-1">
                      {fileUpload.status === 'success' && fileUpload.file.type.startsWith('image/') && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            // Preview image logic here
                          }}
                          className="p-1 hover:bg-muted rounded"
                          title="Preview"
                        >
                          <Eye className="w-4 h-4 text-muted-foreground" />
                        </button>
                      )}
                      
                      {fileUpload.status === 'success' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            // Download logic here
                          }}
                          className="p-1 hover:bg-muted rounded"
                          title="Download"
                        >
                          <Download className="w-4 h-4 text-muted-foreground" />
                        </button>
                      )}
                      
                      {fileUpload.status === 'error' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            retryUpload(fileUpload);
                          }}
                          className="btn btn-sm btn-outline"
                        >
                          Retry
                        </button>
                      )}
                      
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFile(fileUpload);
                        }}
                        className="p-1 hover:bg-muted rounded"
                        title="Remove"
                      >
                        <X className="w-4 h-4 text-muted-foreground" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
} 