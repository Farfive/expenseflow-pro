import { format, formatDistanceToNow, isToday, isYesterday, parseISO } from 'date-fns';

/**
 * Format file size in bytes to human readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Format currency with Polish złoty
 */
export function formatCurrency(
  amount: number,
  currency: string = 'PLN',
  locale: string = 'pl-PL'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(amount);
}

/**
 * Format percentage
 */
export function formatPercentage(value: number, decimals: number = 2): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Format large numbers with abbreviations (K, M, B)
 */
export function formatNumber(num: number): string {
  if (num >= 1000000000) {
    return (num / 1000000000).toFixed(1) + 'B';
  }
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

/**
 * Format date in various formats
 */
export function formatDate(
  date: Date | string,
  formatString: string = 'MMM dd, yyyy'
): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, formatString);
}

/**
 * Format date relative to now (e.g., "2 hours ago", "yesterday")
 */
export function formatRelativeDate(date: Date | string): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  
  if (isToday(dateObj)) {
    return `Today at ${format(dateObj, 'HH:mm')}`;
  }
  
  if (isYesterday(dateObj)) {
    return `Yesterday at ${format(dateObj, 'HH:mm')}`;
  }
  
  return formatDistanceToNow(dateObj, { addSuffix: true });
}

/**
 * Format full date with time
 */
export function formatDateTime(
  date: Date | string,
  locale: string = 'en-US'
): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(dateObj);
}

/**
 * Format phone number
 */
export function formatPhoneNumber(phone: string): string {
  // Remove all non-digits
  const cleaned = phone.replace(/\D/g, '');
  
  // Polish phone number format
  if (cleaned.length === 9) {
    return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6)}`;
  }
  
  if (cleaned.length === 11 && cleaned.startsWith('48')) {
    const withoutCountryCode = cleaned.slice(2);
    return `+48 ${withoutCountryCode.slice(0, 3)} ${withoutCountryCode.slice(3, 6)} ${withoutCountryCode.slice(6)}`;
  }
  
  return phone;
}

/**
 * Format NIP (Polish tax identification number)
 */
export function formatNIP(nip: string): string {
  const cleaned = nip.replace(/\D/g, '');
  
  if (cleaned.length === 10) {
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6, 8)}-${cleaned.slice(8)}`;
  }
  
  return nip;
}

/**
 * Format REGON (Polish statistical number)
 */
export function formatREGON(regon: string): string {
  const cleaned = regon.replace(/\D/g, '');
  
  if (cleaned.length === 9) {
    return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6)}`;
  }
  
  if (cleaned.length === 14) {
    return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6, 8)} ${cleaned.slice(8)}`;
  }
  
  return regon;
}

/**
 * Format bank account number (Polish format)
 */
export function formatBankAccount(account: string): string {
  const cleaned = account.replace(/\D/g, '');
  
  if (cleaned.length === 26) {
    return cleaned.replace(/(.{2})(.{4})(.{4})(.{4})(.{4})(.{4})(.{4})/, '$1 $2 $3 $4 $5 $6 $7');
  }
  
  return account;
}

/**
 * Truncate text with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

/**
 * Format initials from name
 */
export function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

/**
 * Format full name
 */
export function formatFullName(firstName: string, lastName: string): string {
  return `${firstName} ${lastName}`;
}

/**
 * Capitalize first letter of each word
 */
export function capitalize(text: string): string {
  return text
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Format address for display
 */
export function formatAddress(address: {
  street?: string;
  city?: string;
  postalCode?: string;
  country?: string;
}): string {
  const parts = [];
  
  if (address.street) parts.push(address.street);
  if (address.postalCode && address.city) {
    parts.push(`${address.postalCode} ${address.city}`);
  } else if (address.city) {
    parts.push(address.city);
  }
  if (address.country) parts.push(address.country);
  
  return parts.join(', ');
}

/**
 * Format time duration in seconds to human readable format
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  
  if (hours > 0) {
    return `${hours}h ${minutes}m ${remainingSeconds}s`;
  }
  
  if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`;
  }
  
  return `${remainingSeconds}s`;
}

/**
 * Format VAT rate for display
 */
export function formatVATRate(rate: number): string {
  if (rate === 0) return 'VAT 0%';
  return `VAT ${rate}%`;
}

/**
 * Format expense status for display
 */
export function formatExpenseStatus(status: string): string {
  const statusMap: Record<string, string> = {
    'DRAFT': 'Draft',
    'SUBMITTED': 'Submitted',
    'PENDING_APPROVAL': 'Pending Approval',
    'APPROVED': 'Approved',
    'REJECTED': 'Rejected',
    'PAID': 'Paid',
  };
  
  return statusMap[status] || status;
}

/**
 * Format user role for display
 */
export function formatUserRole(role: string): string {
  const roleMap: Record<string, string> = {
    'ADMIN': 'Administrator',
    'MANAGER': 'Manager',
    'ACCOUNTANT': 'Accountant',
    'EMPLOYEE': 'Employee',
  };
  
  return roleMap[role] || role;
}

/**
 * Validate and format email
 */
export function formatEmail(email: string): string {
  return email.toLowerCase().trim();
}

/**
 * Format document type for display
 */
export function formatDocumentType(type: string): string {
  const typeMap: Record<string, string> = {
    'RECEIPT': 'Receipt',
    'INVOICE': 'Invoice',
    'BANK_STATEMENT': 'Bank Statement',
    'OTHER': 'Other',
  };
  
  return typeMap[type] || type;
}

/**
 * Format confidence score as percentage
 */
export function formatConfidence(confidence: number): string {
  return `${Math.round(confidence * 100)}%`;
}

/**
 * Format OCR status for display
 */
export function formatOCRStatus(status: string): string {
  const statusMap: Record<string, string> = {
    'PENDING': 'Pending',
    'PROCESSING': 'Processing',
    'COMPLETED': 'Completed',
    'FAILED': 'Failed',
  };
  
  return statusMap[status] || status;
}

export default {
  formatFileSize,
  formatCurrency,
  formatPercentage,
  formatNumber,
  formatDate,
  formatRelativeDate,
  formatDateTime,
  formatPhoneNumber,
  formatNIP,
  formatREGON,
  formatBankAccount,
  truncateText,
  getInitials,
  formatFullName,
  capitalize,
  formatAddress,
  formatDuration,
  formatVATRate,
  formatExpenseStatus,
  formatUserRole,
  formatEmail,
  formatDocumentType,
  formatConfidence,
  formatOCRStatus,
}; 