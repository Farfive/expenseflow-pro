// User types
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  role: UserRole;
  status: UserStatus;
  emailVerifiedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export enum UserRole {
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  ACCOUNTANT = 'ACCOUNTANT',
  EMPLOYEE = 'EMPLOYEE',
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  PENDING = 'PENDING',
  SUSPENDED = 'SUSPENDED',
}

// Company types
export interface Company {
  id: string;
  name: string;
  nipNumber: string;
  address: string;
  logoUrl?: string;
  settings: CompanySettings;
  createdAt: Date;
  updatedAt: Date;
}

export interface CompanySettings {
  currency: string;
  timezone: string;
  approvalWorkflow: boolean;
  autoProcessOCR: boolean;
  maxFileSize: number;
  allowedFileTypes: string[];
}

export interface CompanyUser {
  id: string;
  userId: string;
  companyId: string;
  role: UserRole;
  permissions: Permission[];
  user: User;
  company: Company;
}

// Document types
export interface Document {
  id: string;
  originalName: string;
  filename: string;
  mimeType: string;
  size: number;
  path: string;
  hash: string;
  uploadedById: string;
  companyId: string;
  ocrStatus: OCRStatus;
  ocrData?: OCRData;
  createdAt: Date;
  updatedAt: Date;
}

export enum OCRStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export interface OCRData {
  documentType: DocumentType;
  totalAmount: number;
  currency: string;
  transactionDate: Date;
  merchantName: string;
  nipNumber?: string;
  vatAmount?: number;
  items?: OCRItem[];
  confidence: number;
}

export interface OCRItem {
  description: string;
  quantity: number;
  price: number;
  vatRate?: number;
}

export enum DocumentType {
  RECEIPT = 'RECEIPT',
  INVOICE = 'INVOICE',
  BANK_STATEMENT = 'BANK_STATEMENT',
  OTHER = 'OTHER',
}

// Expense types
export interface Expense {
  id: string;
  title: string;
  description?: string;
  amount: number;
  currency: string;
  transactionDate: Date;
  categoryId: string;
  merchantName?: string;
  employeeId: string;
  companyId: string;
  documentId?: string;
  status: ExpenseStatus;
  approvalWorkflowId?: string;
  approvalRecords: ApprovalRecord[];
  category: ExpenseCategory;
  employee: User;
  document?: Document;
  createdAt: Date;
  updatedAt: Date;
}

export enum ExpenseStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  PAID = 'PAID',
}

export interface ExpenseCategory {
  id: string;
  name: string;
  description?: string;
  color: string;
  icon: string;
  companyId: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Approval types
export interface ApprovalWorkflow {
  id: string;
  name: string;
  description?: string;
  companyId: string;
  steps: ApprovalStep[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ApprovalStep {
  id: string;
  order: number;
  name: string;
  approverRole: UserRole;
  approverIds?: string[];
  requiredApprovals: number;
  conditions?: ApprovalCondition[];
}

export interface ApprovalCondition {
  field: string;
  operator: 'eq' | 'gt' | 'lt' | 'gte' | 'lte';
  value: string | number;
}

export interface ApprovalRecord {
  id: string;
  expenseId: string;
  workflowId: string;
  stepId: string;
  approverId: string;
  status: ApprovalStatus;
  comments?: string;
  approvedAt?: Date;
  approver: User;
  createdAt: Date;
  updatedAt: Date;
}

export enum ApprovalStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

// Notification types
export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  data?: Record<string, any>;
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export enum NotificationType {
  EXPENSE_SUBMITTED = 'EXPENSE_SUBMITTED',
  EXPENSE_APPROVED = 'EXPENSE_APPROVED',
  EXPENSE_REJECTED = 'EXPENSE_REJECTED',
  DOCUMENT_PROCESSED = 'DOCUMENT_PROCESSED',
  SYSTEM_UPDATE = 'SYSTEM_UPDATE',
}

// API types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: Record<string, string[]>;
}

export interface PaginatedResponse<T = any> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface QueryParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  filters?: Record<string, any>;
}

// Form types
export interface LoginForm {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterForm {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  companyName?: string;
  acceptTerms: boolean;
}

export interface ExpenseForm {
  title: string;
  description?: string;
  amount: number;
  transactionDate: Date;
  categoryId: string;
  merchantName?: string;
  documentIds?: string[];
}

export interface ProfileForm {
  firstName: string;
  lastName: string;
  email: string;
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
}

// Theme types
export interface ThemeConfig {
  mode: 'light' | 'dark' | 'system';
  primaryColor: string;
  accentColor: string;
}

// Permission types
export enum Permission {
  // Company permissions
  MANAGE_COMPANY = 'MANAGE_COMPANY',
  VIEW_COMPANY_SETTINGS = 'VIEW_COMPANY_SETTINGS',
  
  // User permissions
  MANAGE_USERS = 'MANAGE_USERS',
  VIEW_ALL_USERS = 'VIEW_ALL_USERS',
  
  // Expense permissions
  CREATE_EXPENSE = 'CREATE_EXPENSE',
  VIEW_OWN_EXPENSES = 'VIEW_OWN_EXPENSES',
  VIEW_ALL_EXPENSES = 'VIEW_ALL_EXPENSES',
  EDIT_OWN_EXPENSES = 'EDIT_OWN_EXPENSES',
  EDIT_ALL_EXPENSES = 'EDIT_ALL_EXPENSES',
  DELETE_OWN_EXPENSES = 'DELETE_OWN_EXPENSES',
  DELETE_ALL_EXPENSES = 'DELETE_ALL_EXPENSES',
  
  // Approval permissions
  APPROVE_EXPENSES = 'APPROVE_EXPENSES',
  MANAGE_APPROVAL_WORKFLOWS = 'MANAGE_APPROVAL_WORKFLOWS',
  
  // Document permissions
  UPLOAD_DOCUMENTS = 'UPLOAD_DOCUMENTS',
  VIEW_ALL_DOCUMENTS = 'VIEW_ALL_DOCUMENTS',
  
  // Category permissions
  MANAGE_CATEGORIES = 'MANAGE_CATEGORIES',
  
  // Report permissions
  VIEW_REPORTS = 'VIEW_REPORTS',
  EXPORT_REPORTS = 'EXPORT_REPORTS',
}

// File upload types
export interface FileUpload {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
  documentId?: string;
}

export interface UploadConfig {
  maxFileSize: number;
  acceptedFileTypes: string[];
  maxFiles: number;
}

// Error types
export interface AppError extends Error {
  code?: string;
  statusCode?: number;
  details?: Record<string, any>;
}

// Loading states
export interface LoadingState {
  loading: boolean;
  error?: string | null;
}

export interface AsyncState<T = any> extends LoadingState {
  data?: T;
}

// Chart/Analytics types
export interface ChartData {
  labels: string[];
  datasets: ChartDataset[];
}

export interface ChartDataset {
  label: string;
  data: number[];
  backgroundColor?: string | string[];
  borderColor?: string | string[];
  borderWidth?: number;
}

export interface ExpenseAnalytics {
  totalAmount: number;
  totalCount: number;
  averageAmount: number;
  byCategory: Record<string, number>;
  byMonth: Record<string, number>;
  byStatus: Record<ExpenseStatus, number>;
}

// Export default to avoid import issues
export default {}; 