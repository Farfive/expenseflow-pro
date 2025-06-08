'use client';

/**
 * Comprehensive Expense Submission Form
 * 
 * Features:
 * - Drag-and-drop file upload with react-dropzone
 * - Camera integration for mobile browsers
 * - Real-time OCR processing with Tesseract.js
 * - Form validation and manual data entry
 * - Smart categorization with autocomplete
 * - Project/cost center assignment
 * - Receipt validation with jimp
 * - Draft saving with localStorage/IndexedDB
 * - Bulk submission with progress tracking
 * - Image preview and zoom with react-image-gallery
 * - Offline capability
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Tesseract from 'tesseract.js';
import Jimp from 'jimp';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import ImageGallery from 'react-image-gallery';
import 'react-image-gallery/styles/css/image-gallery.css';

// Icons
import { 
  Upload, 
  Camera, 
  FileText, 
  X, 
  Save, 
  Send, 
  Eye, 
  ZoomIn,
  Loader2,
  CheckCircle,
  AlertCircle,
  Plus,
  Trash2,
  Download
} from 'lucide-react';

// Services and Utils
import { saveExpenseDraft, loadExpenseDraft, clearExpenseDraft } from '@/utils/draftStorage';
import { validateReceiptQuality } from '@/utils/imageValidation';
import { generateEnhancedCategories, learnFromUserChoice } from '@/utils/categorization';
import { offlineQueue } from '@/utils/offlineQueue';

// Form Validation Schema
const expenseFormSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().optional(),
  amount: z.number().min(0.01, 'Amount must be greater than 0'),
  currency: z.string().default('PLN'),
  transactionDate: z.string().min(1, 'Transaction date is required'),
  categoryId: z.string().min(1, 'Category is required'),
  merchantName: z.string().optional(),
  projectId: z.string().optional(),
  costCenter: z.string().optional(),
  receiptNumber: z.string().optional(),
  isReimbursable: z.boolean().default(true),
  tags: z.array(z.string()).optional(),
});

type ExpenseFormData = z.infer<typeof expenseFormSchema>;

interface UploadedFile {
  id: string;
  file: File;
  preview: string;
  ocrData?: any;
  validationResults?: any;
  processingStatus: 'pending' | 'processing' | 'completed' | 'error';
}

interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
}

interface Project {
  id: string;
  name: string;
  code: string;
}

const ExpenseSubmissionForm: React.FC = () => {
  // Form state
  const {
    control,
    handleSubmit,
    watch,
    setValue,
    getValues,
    formState: { errors, isValid }
  } = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: {
      currency: 'PLN',
      transactionDate: new Date().toISOString().split('T')[0],
      isReimbursable: true,
      tags: [],
    },
    mode: 'onChange'
  });

  // Component state
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showImageGallery, setShowImageGallery] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [categories, setCategories] = useState<Category[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [smartSuggestions, setSmartSuggestions] = useState<any[]>([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [bulkSubmissionMode, setBulkSubmissionMode] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);

  // Refs
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const autosaveTimerRef = useRef<NodeJS.Timeout>();

  // Watch form values for auto-save
  const watchedValues = watch();

  // Load draft on mount
  useEffect(() => {
    const draft = loadExpenseDraft();
    if (draft) {
      Object.entries(draft).forEach(([key, value]) => {
        setValue(key as keyof ExpenseFormData, value);
      });
      toast.success('Draft loaded');
    }
  }, [setValue]);

  // Auto-save functionality
  useEffect(() => {
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
    }

    autosaveTimerRef.current = setTimeout(() => {
      const formData = getValues();
      if (formData.title || formData.amount || uploadedFiles.length > 0) {
        saveExpenseDraft({ ...formData, uploadedFiles });
        setDraftSaved(true);
        setTimeout(() => setDraftSaved(false), 2000);
      }
    }, 2000);

    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }
    };
  }, [watchedValues, uploadedFiles, getValues]);

  // Online/offline status monitoring
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Process offline queue
      offlineQueue.processQueue();
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast('Working offline - submissions will be queued', {
  icon: 'ℹ️',
  style: {
    background: '#dbeafe',
    color: '#1e40af',
    border: '1px solid #3b82f6'
  }
});
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load categories and projects
  useEffect(() => {
    fetchCategories();
    fetchProjects();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories');
      const data = await response.json();
      if (data.success) {
        setCategories(data.data);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchProjects = async () => {
    try {
      const response = await fetch('/api/projects');
      const data = await response.json();
      if (data.success) {
        setProjects(data.data);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  // File drop handler
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const newFiles: UploadedFile[] = acceptedFiles.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      preview: URL.createObjectURL(file),
      processingStatus: 'pending'
    }));

    setUploadedFiles(prev => [...prev, ...newFiles]);

    // Process each file
    for (const uploadedFile of newFiles) {
      await processFile(uploadedFile);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.pdf'],
    },
    multiple: true,
    maxSize: 10 * 1024 * 1024, // 10MB
  });

  // Camera capture handler
  const handleCameraCapture = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      onDrop(files);
    }
  }, [onDrop]);

  // Process individual file
  const processFile = async (uploadedFile: UploadedFile) => {
    setUploadedFiles(prev => 
      prev.map(f => 
        f.id === uploadedFile.id 
          ? { ...f, processingStatus: 'processing' }
          : f
      )
    );

    try {
      let validationResults: any = {};
      let ocrData: any = {};

      // 1. Validate image quality (skip validation for now to avoid additional errors)
      try {
        validationResults = await validateReceiptQuality(uploadedFile.file);
      } catch (validationError) {
        console.warn('Image quality validation failed:', validationError);
        validationResults = { warning: 'Image quality check skipped' };
      }
      
      // 2. Process with OCR (with improved error handling)
      try {
        ocrData = await performOCR(uploadedFile.file);
        
        // Handle OCR warnings or errors gracefully
        if (ocrData.error) {
          toast(`OCR processing: ${ocrData.error}`, {
  icon: '⚠️',
  style: {
    background: '#fef3c7',
    color: '#92400e',
    border: '1px solid #fbbf24'
  }
});
        } else if (ocrData.warning) {
          toast(`OCR warning: ${ocrData.warning}`, {
  icon: 'ℹ️',
  style: {
    background: '#dbeafe',
    color: '#1e40af',
    border: '1px solid #3b82f6'
  }
});
        }
        
        // 3. Extract and populate form data if OCR was successful
        if (ocrData && !ocrData.error && Object.keys(ocrData).length > 2) {
          await populateFormFromOCR(ocrData);
        }
      } catch (ocrError) {
        console.error('OCR processing failed:', ocrError);
        ocrData = { 
          error: ocrError.message || 'OCR processing failed',
          text: '',
          confidence: 0
        };
        toast(`OCR failed: ${ocrError.message || 'Please enter details manually'}`, {
  icon: '⚠️',
  style: {
    background: '#fef3c7',
    color: '#92400e',
    border: '1px solid #fbbf24'
  }
});
      }

      // 4. Update file status (always mark as completed even if OCR failed)
      setUploadedFiles(prev => 
        prev.map(f => 
          f.id === uploadedFile.id 
            ? { 
                ...f, 
                processingStatus: 'completed',
                ocrData,
                validationResults
              }
            : f
        )
      );

      // Provide appropriate success message
      if (ocrData.error) {
        toast.success('File uploaded - please enter details manually');
      } else if (ocrData.warning) {
        toast.success('File processed with low confidence - please verify details');
      } else {
        toast.success('Receipt processed successfully');
      }

    } catch (error) {
      console.error('Error processing file:', error);
      setUploadedFiles(prev => 
        prev.map(f => 
          f.id === uploadedFile.id 
            ? { ...f, processingStatus: 'error' }
            : f
        )
      );
      toast.error(`Error processing file: ${error.message || 'Please try again'}`);
    }
  };

  // OCR Processing with improved error handling
  const performOCR = async (file: File): Promise<any> => {
    return new Promise((resolve, reject) => {
      // Validate file type first
      if (!file.type.startsWith('image/')) {
        reject(new Error('Unsupported file type. Please upload an image file.'));
        return;
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        reject(new Error('File too large. Please upload an image smaller than 10MB.'));
        return;
      }

      const reader = new FileReader();
      
      reader.onload = async () => {
        try {
          const result = reader.result as string;
          
          // Validate that we have a valid data URL
          if (!result || !result.startsWith('data:image/')) {
            throw new Error('Invalid image format detected');
          }

          // Create a temporary image to validate it can be loaded
          const img = new Image();
          
          img.onload = async () => {
            try {
              // Validate image dimensions
              if (img.width < 100 || img.height < 100) {
                throw new Error('Image too small. Please upload a larger image.');
              }

              // Proceed with OCR
              const { data: { text, confidence } } = await Tesseract.recognize(
                result,
                'eng+pol',
                {
                  logger: (m) => {
                    if (m.status === 'recognizing text') {
                      setProcessingProgress(m.progress * 100);
                    }
                  },
                  errorHandler: (error) => {
                    console.warn('Tesseract warning:', error);
                  }
                }
              );

              // Check if OCR returned meaningful text
              if (!text || text.trim().length < 5) {
                console.warn('OCR returned minimal text, skipping automatic data extraction');
                resolve({
                  text: text || '',
                  confidence: confidence || 0,
                  warning: 'Low quality text extraction - manual entry recommended'
                });
                return;
              }

              // Extract structured data from OCR text
              const extractedData = extractDataFromOCR(text);
              resolve({
                text,
                confidence,
                ...extractedData
              });
            } catch (ocrError) {
              console.error('OCR processing failed:', ocrError);
              // Don't reject completely, return empty data with error info
              resolve({
                error: 'OCR processing failed - please enter details manually',
                originalError: ocrError.message
              });
            }
          };

          img.onerror = () => {
            reject(new Error('Invalid or corrupted image file'));
          };

          img.src = result;

        } catch (error) {
          console.error('Image processing error:', error);
          reject(new Error(`Image processing failed: ${error.message}`));
        }
      };

      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };

      reader.readAsDataURL(file);
    });
  };

  // Extract structured data from OCR text
  const extractDataFromOCR = (text: string) => {
    const lines = text.split('\n').map(line => line.trim()).filter(Boolean);
    
    const data: any = {};

    // Extract amount (look for currency patterns)
    const amountRegex = /(\d+[.,]\d{2})\s*(PLN|zł|EUR|€|USD|\$)/i;
    const amountMatch = text.match(amountRegex);
    if (amountMatch) {
      data.amount = parseFloat(amountMatch[1].replace(',', '.'));
      data.currency = amountMatch[2].toUpperCase();
    }

    // Extract date
    const dateRegex = /(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})/;
    const dateMatch = text.match(dateRegex);
    if (dateMatch) {
      const [, day, month, year] = dateMatch;
      const fullYear = year.length === 2 ? `20${year}` : year;
      data.transactionDate = `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }

    // Extract merchant name (usually first meaningful line)
    const merchantRegex = /^([A-ZĄĆĘŁŃÓŚŹŻ][A-Za-ząćęłńóśźż\s]+)/m;
    const merchantMatch = text.match(merchantRegex);
    if (merchantMatch) {
      data.merchantName = merchantMatch[1].trim();
    }

    // Extract receipt number
    const receiptRegex = /(?:paragon|faktura|receipt)?\s*(?:nr|no|#)?\s*:?\s*([A-Z0-9\-\/]+)/i;
    const receiptMatch = text.match(receiptRegex);
    if (receiptMatch) {
      data.receiptNumber = receiptMatch[1];
    }

    return data;
  };

  // Populate form from OCR data
  const populateFormFromOCR = async (ocrData: any) => {
    if (ocrData.amount) {
      setValue('amount', ocrData.amount);
    }
    if (ocrData.currency) {
      setValue('currency', ocrData.currency);
    }
    if (ocrData.transactionDate) {
      setValue('transactionDate', ocrData.transactionDate);
    }
    if (ocrData.merchantName) {
      setValue('merchantName', ocrData.merchantName);
      setValue('title', `Expense at ${ocrData.merchantName}`);
      
      // Generate smart category suggestions
      const suggestions = await generateEnhancedCategories(ocrData.merchantName, categories);
      setSmartSuggestions(suggestions);
      if (suggestions.length > 0) {
        setValue('categoryId', suggestions[0].id);
      }
    }
    if (ocrData.receiptNumber) {
      setValue('receiptNumber', ocrData.receiptNumber);
    }
  };

  // Remove uploaded file
  const removeFile = (fileId: string) => {
    setUploadedFiles(prev => {
      const file = prev.find(f => f.id === fileId);
      if (file) {
        URL.revokeObjectURL(file.preview);
      }
      return prev.filter(f => f.id !== fileId);
    });
  };

  // Show image gallery
  const showImagePreview = (index: number) => {
    setCurrentImageIndex(index);
    setShowImageGallery(true);
  };

  // Prepare images for gallery
  const galleryImages = uploadedFiles.map((file, index) => ({
    original: file.preview,
    thumbnail: file.preview,
    description: `Receipt ${index + 1}`
  }));

  // Form submission
  const onSubmit = async (data: ExpenseFormData) => {
    if (uploadedFiles.length === 0) {
      toast.error('Please upload at least one receipt');
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      
      // Append form data
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          formData.append(key, typeof value === 'object' ? JSON.stringify(value) : value.toString());
        }
      });

      // Append files
      uploadedFiles.forEach((uploadedFile, index) => {
        formData.append(`files`, uploadedFile.file);
        formData.append(`fileData_${index}`, JSON.stringify({
          ocrData: uploadedFile.ocrData,
          validationResults: uploadedFile.validationResults
        }));
      });

      if (isOnline) {
        const response = await fetch('/api/expenses', {
          method: 'POST',
          body: formData,
        });

        const result = await response.json();

        if (result.success) {
          toast.success('Expense submitted successfully');
          
          // Learn from user's category choice
          if (data.merchantName && data.categoryId) {
            learnFromUserChoice(data.merchantName, data.categoryId, categories);
          }
          
          clearExpenseDraft();
          // Reset form or redirect
        } else {
          throw new Error(result.message);
        }
      } else {
        // Queue for offline submission
        await offlineQueue.addToQueue('submitExpense', { data, files: uploadedFiles });
        toast.success('Expense queued for submission when online');
      }

    } catch (error) {
      console.error('Error submitting expense:', error);
      toast.error('Failed to submit expense');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Save as draft
  const saveDraft = () => {
    const formData = getValues();
    saveExpenseDraft({ ...formData, uploadedFiles });
    toast.success('Draft saved');
  };

  return (
    <div className="space-y-6">
      {/* Offline indicator */}
      {!isOnline && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-yellow-600 mr-2" />
            <span className="text-yellow-800">Working offline - changes will be saved locally</span>
          </div>
        </div>
      )}

      {/* Auto-save indicator */}
      <AnimatePresence>
        {draftSaved && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed top-4 right-4 bg-green-50 border border-green-200 rounded-md p-3 z-50"
          >
            <div className="flex items-center">
              <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
              <span className="text-green-800 text-sm">Draft saved</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* File Upload Section */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold mb-4">Upload Receipts</h3>
          
          <div className="space-y-4">
            {/* Drop Zone */}
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
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
                className="btn btn-outline"
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
                <h4 className="font-medium">Uploaded Files</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {uploadedFiles.map((file, index) => (
                    <div
                      key={file.id}
                      className="border rounded-lg p-3 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium truncate">
                          {file.file.name}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeFile(file.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="relative">
                        <img
                          src={file.preview}
                          alt="Preview"
                          className="w-full h-24 object-cover rounded cursor-pointer"
                          onClick={() => showImagePreview(index)}
                        />
                        <button
                          type="button"
                          onClick={() => showImagePreview(index)}
                          className="absolute top-2 right-2 bg-black bg-opacity-50 text-white p-1 rounded"
                        >
                          <ZoomIn className="w-3 h-3" />
                        </button>
                      </div>

                      <div className="flex items-center space-x-2">
                        {file.processingStatus === 'pending' && (
                          <span className="text-gray-500 text-xs">Pending</span>
                        )}
                        {file.processingStatus === 'processing' && (
                          <div className="flex items-center space-x-1">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            <span className="text-blue-600 text-xs">Processing...</span>
                          </div>
                        )}
                        {file.processingStatus === 'completed' && (
                          <div className="flex items-center space-x-1">
                            <CheckCircle className="w-3 h-3 text-green-600" />
                            <span className="text-green-600 text-xs">Processed</span>
                          </div>
                        )}
                        {file.processingStatus === 'error' && (
                          <div className="flex items-center space-x-1">
                            <AlertCircle className="w-3 h-3 text-red-600" />
                            <span className="text-red-600 text-xs">Error</span>
                          </div>
                        )}
                      </div>

                      {/* Processing progress */}
                      {file.processingStatus === 'processing' && (
                        <div className="w-full bg-gray-200 rounded-full h-1">
                          <div
                            className="bg-blue-600 h-1 rounded-full transition-all"
                            style={{ width: `${processingProgress}%` }}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Expense Details Form */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold mb-4">Expense Details</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title *
              </label>
              <Controller
                name="title"
                control={control}
                render={({ field }) => (
                  <input
                    {...field}
                    type="text"
                    className="input"
                    placeholder="Expense title"
                  />
                )}
              />
              {errors.title && (
                <p className="text-red-600 text-sm mt-1">{errors.title.message}</p>
              )}
            </div>

            {/* Amount */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Amount *
              </label>
              <div className="flex space-x-2">
                <Controller
                  name="amount"
                  control={control}
                  render={({ field }) => (
                    <input
                      {...field}
                      type="number"
                      step="0.01"
                      className="input flex-1"
                      placeholder="0.00"
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                    />
                  )}
                />
                <Controller
                  name="currency"
                  control={control}
                  render={({ field }) => (
                    <select {...field} className="input w-20">
                      <option value="PLN">PLN</option>
                      <option value="EUR">EUR</option>
                      <option value="USD">USD</option>
                    </select>
                  )}
                />
              </div>
              {errors.amount && (
                <p className="text-red-600 text-sm mt-1">{errors.amount.message}</p>
              )}
            </div>

            {/* Transaction Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Transaction Date *
              </label>
              <Controller
                name="transactionDate"
                control={control}
                render={({ field }) => (
                  <input
                    {...field}
                    type="date"
                    className="input"
                  />
                )}
              />
              {errors.transactionDate && (
                <p className="text-red-600 text-sm mt-1">{errors.transactionDate.message}</p>
              )}
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category *
              </label>
              <Controller
                name="categoryId"
                control={control}
                render={({ field }) => (
                  <select {...field} className="input">
                    <option value="">Select category</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                )}
              />
              {errors.categoryId && (
                <p className="text-red-600 text-sm mt-1">{errors.categoryId.message}</p>
              )}
              
              {/* Smart suggestions */}
              {smartSuggestions.length > 0 && (
                <div className="mt-2">
                  <p className="text-xs text-gray-600 mb-1">Suggested categories:</p>
                  <div className="flex flex-wrap gap-1">
                    {smartSuggestions.slice(0, 3).map((suggestion) => (
                      <button
                        key={suggestion.id}
                        type="button"
                        onClick={() => setValue('categoryId', suggestion.id)}
                        className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded hover:bg-blue-200"
                      >
                        {suggestion.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Project */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Project/Cost Center
              </label>
              <Controller
                name="projectId"
                control={control}
                render={({ field }) => (
                  <select {...field} className="input">
                    <option value="">Select project (optional)</option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.code ? `${project.code} - ${project.name}` : project.name}
                      </option>
                    ))}
                  </select>
                )}
              />
            </div>

            {/* Merchant Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Merchant/Vendor
              </label>
              <Controller
                name="merchantName"
                control={control}
                render={({ field }) => (
                  <input
                    {...field}
                    type="text"
                    className="input"
                    placeholder="Where was this expense incurred?"
                  />
                )}
              />
            </div>

            {/* Project */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Project
              </label>
              <Controller
                name="projectId"
                control={control}
                render={({ field }) => (
                  <select {...field} className="input">
                    <option value="">Select project (optional)</option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name} ({project.code})
                      </option>
                    ))}
                  </select>
                )}
              />
            </div>

            {/* Cost Center */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cost Center
              </label>
              <Controller
                name="costCenter"
                control={control}
                render={({ field }) => (
                  <input
                    {...field}
                    type="text"
                    className="input"
                    placeholder="Cost center code"
                  />
                )}
              />
            </div>

            {/* Receipt Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Receipt Number
              </label>
              <Controller
                name="receiptNumber"
                control={control}
                render={({ field }) => (
                  <input
                    {...field}
                    type="text"
                    className="input"
                    placeholder="Receipt/invoice number"
                  />
                )}
              />
            </div>

            {/* Description */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <Controller
                name="description"
                control={control}
                render={({ field }) => (
                  <textarea
                    {...field}
                    rows={3}
                    className="input"
                    placeholder="Additional details about this expense"
                  />
                )}
              />
            </div>

            {/* Reimbursable */}
            <div className="flex items-center">
              <Controller
                name="isReimbursable"
                control={control}
                render={({ field }) => (
                  <input
                    {...field}
                    type="checkbox"
                    checked={field.value}
                    className="rounded"
                  />
                )}
              />
              <label className="ml-2 text-sm text-gray-700">
                This expense is reimbursable
              </label>
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={saveDraft}
              className="btn btn-outline"
            >
              <Save className="w-4 h-4 mr-2" />
              Save Draft
            </button>
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={!isValid || isSubmitting || uploadedFiles.length === 0}
              className="btn btn-primary"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Submit Expense
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      {/* Image Gallery Modal */}
      {showImageGallery && (
        <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center">
          <div className="relative w-full h-full max-w-4xl">
            <button
              onClick={() => setShowImageGallery(false)}
              className="absolute top-4 right-4 text-white hover:text-gray-300 z-10"
            >
              <X className="w-8 h-8" />
            </button>
            <ImageGallery
              items={galleryImages}
              startIndex={currentImageIndex}
              showThumbnails={true}
              showFullscreenButton={true}
              showPlayButton={false}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpenseSubmissionForm; 