const fs = require('fs');
const path = require('path');
const logger = require('./logger');

/**
 * Internationalization utility for ExpenseFlow Pro
 * Supports English, Polish, and German languages
 */

// Default locale
const DEFAULT_LOCALE = 'en-US';

// Supported locales
const SUPPORTED_LOCALES = ['en-US', 'pl-PL', 'de-DE'];

// Cache for loaded translations
const translationCache = new Map();

/**
 * Load translations from JSON files
 */
const loadTranslations = (locale) => {
  if (translationCache.has(locale)) {
    return translationCache.get(locale);
  }

  try {
    const translationPath = path.join(__dirname, '../../locales', `${locale}.json`);
    
    if (!fs.existsSync(translationPath)) {
      logger.warn(`Translation file not found for locale: ${locale}, falling back to ${DEFAULT_LOCALE}`);
      
      // Try loading default locale
      const defaultPath = path.join(__dirname, '../../locales', `${DEFAULT_LOCALE}.json`);
      if (fs.existsSync(defaultPath)) {
        const defaultTranslations = JSON.parse(fs.readFileSync(defaultPath, 'utf8'));
        translationCache.set(locale, defaultTranslations);
        return defaultTranslations;
      }
      
      // Return empty object if no translations found
      return {};
    }

    const translations = JSON.parse(fs.readFileSync(translationPath, 'utf8'));
    translationCache.set(locale, translations);
    return translations;
  } catch (error) {
    logger.error(`Error loading translations for locale ${locale}:`, error);
    return {};
  }
};

/**
 * Get translation for a given key and locale
 */
const t = (key, locale = DEFAULT_LOCALE, params = {}) => {
  const translations = loadTranslations(locale);
  
  // Get nested value using dot notation
  const value = key.split('.').reduce((obj, k) => obj && obj[k], translations);
  
  if (!value) {
    // Fallback to default locale if key not found
    if (locale !== DEFAULT_LOCALE) {
      return t(key, DEFAULT_LOCALE, params);
    }
    
    // Return key if no translation found
    logger.warn(`Translation missing for key: ${key}, locale: ${locale}`);
    return key;
  }

  // Replace parameters in translation
  return Object.keys(params).reduce((str, param) => {
    return str.replace(new RegExp(`{{${param}}}`, 'g'), params[param]);
  }, value);
};

/**
 * Format currency based on locale
 */
const formatCurrency = (amount, currencyCode = 'PLN', locale = DEFAULT_LOCALE) => {
  try {
    const formatter = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    
    return formatter.format(amount);
  } catch (error) {
    logger.error(`Error formatting currency for locale ${locale}:`, error);
    
    // Fallback formatting
    const symbols = {
      'PLN': 'zł',
      'EUR': '€',
      'USD': '$',
      'GBP': '£'
    };
    
    const symbol = symbols[currencyCode] || currencyCode;
    const formattedAmount = Number(amount).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    
    return locale === 'pl-PL' ? `${formattedAmount} ${symbol}` : `${symbol}${formattedAmount}`;
  }
};

/**
 * Format date based on locale
 */
const formatDate = (date, locale = DEFAULT_LOCALE, options = {}) => {
  try {
    const defaultOptions = {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    };
    
    const formatter = new Intl.DateTimeFormat(locale, { ...defaultOptions, ...options });
    return formatter.format(new Date(date));
  } catch (error) {
    logger.error(`Error formatting date for locale ${locale}:`, error);
    
    // Fallback formatting
    const d = new Date(date);
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const year = d.getFullYear();
    
    switch (locale) {
      case 'pl-PL':
      case 'de-DE':
        return `${day}.${month}.${year}`;
      default:
        return `${month}/${day}/${year}`;
    }
  }
};

/**
 * Format time based on locale
 */
const formatTime = (date, locale = DEFAULT_LOCALE) => {
  try {
    const formatter = new Intl.DateTimeFormat(locale, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: locale === 'en-US'
    });
    
    return formatter.format(new Date(date));
  } catch (error) {
    logger.error(`Error formatting time for locale ${locale}:`, error);
    
    // Fallback formatting
    const d = new Date(date);
    const hours = d.getHours().toString().padStart(2, '0');
    const minutes = d.getMinutes().toString().padStart(2, '0');
    const seconds = d.getSeconds().toString().padStart(2, '0');
    
    return `${hours}:${minutes}:${seconds}`;
  }
};

/**
 * Format number based on locale
 */
const formatNumber = (number, locale = DEFAULT_LOCALE, options = {}) => {
  try {
    const formatter = new Intl.NumberFormat(locale, options);
    return formatter.format(number);
  } catch (error) {
    logger.error(`Error formatting number for locale ${locale}:`, error);
    
    // Fallback formatting
    return Number(number).toLocaleString();
  }
};

/**
 * Get locale-specific error messages
 */
const getErrorMessage = (errorCode, locale = DEFAULT_LOCALE, params = {}) => {
  return t(`errors.${errorCode}`, locale, params);
};

/**
 * Get locale-specific validation messages
 */
const getValidationMessage = (field, rule, locale = DEFAULT_LOCALE, params = {}) => {
  return t(`validation.${field}.${rule}`, locale, params) || 
         t(`validation.general.${rule}`, locale, params);
};

/**
 * Middleware to set locale from request
 */
const localeMiddleware = (req, res, next) => {
  // Get locale from various sources
  let locale = DEFAULT_LOCALE;
  
  // 1. From query parameter
  if (req.query.locale && SUPPORTED_LOCALES.includes(req.query.locale)) {
    locale = req.query.locale;
  }
  // 2. From header
  else if (req.get('Accept-Language')) {
    const acceptLanguage = req.get('Accept-Language');
    const preferredLocale = acceptLanguage.split(',')[0].trim();
    
    if (SUPPORTED_LOCALES.includes(preferredLocale)) {
      locale = preferredLocale;
    } else {
      // Try to match language part (e.g., 'en' from 'en-GB')
      const languageCode = preferredLocale.split('-')[0];
      const matchedLocale = SUPPORTED_LOCALES.find(l => l.startsWith(languageCode));
      if (matchedLocale) {
        locale = matchedLocale;
      }
    }
  }
  // 3. From tenant settings
  else if (req.tenant && req.tenant.locale) {
    locale = req.tenant.locale;
  }
  // 4. From user preferences
  else if (req.user && req.user.locale) {
    locale = req.user.locale;
  }

  // Set locale in request object
  req.locale = locale;
  
  // Add helper functions to request
  req.t = (key, params) => t(key, locale, params);
  req.formatCurrency = (amount, currencyCode) => formatCurrency(amount, currencyCode, locale);
  req.formatDate = (date, options) => formatDate(date, locale, options);
  req.formatTime = (date) => formatTime(date, locale);
  req.formatNumber = (number, options) => formatNumber(number, locale, options);
  req.getErrorMessage = (errorCode, params) => getErrorMessage(errorCode, locale, params);
  req.getValidationMessage = (field, rule, params) => getValidationMessage(field, rule, locale, params);

  next();
};

/**
 * Get relative time format
 */
const formatRelativeTime = (date, locale = DEFAULT_LOCALE) => {
  try {
    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
    const now = new Date();
    const diff = new Date(date) - now;
    const diffInSeconds = Math.floor(diff / 1000);
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    if (Math.abs(diffInDays) > 0) {
      return rtf.format(diffInDays, 'day');
    } else if (Math.abs(diffInHours) > 0) {
      return rtf.format(diffInHours, 'hour');
    } else if (Math.abs(diffInMinutes) > 0) {
      return rtf.format(diffInMinutes, 'minute');
    } else {
      return rtf.format(diffInSeconds, 'second');
    }
  } catch (error) {
    logger.error(`Error formatting relative time for locale ${locale}:`, error);
    return formatDate(date, locale);
  }
};

/**
 * Get locale-specific OCR language codes
 */
const getOCRLanguage = (locale = DEFAULT_LOCALE) => {
  const ocrLanguageMap = {
    'en-US': 'eng',
    'pl-PL': 'pol',
    'de-DE': 'deu'
  };
  
  return ocrLanguageMap[locale] || 'eng';
};

/**
 * Clear translation cache (useful for hot reloading in development)
 */
const clearTranslationCache = () => {
  translationCache.clear();
  logger.info('Translation cache cleared');
};

/**
 * Validate if locale is supported
 */
const isValidLocale = (locale) => {
  return SUPPORTED_LOCALES.includes(locale);
};

/**
 * Get list of supported locales with their display names
 */
const getSupportedLocales = (displayLocale = DEFAULT_LOCALE) => {
  const localeNames = {
    'en-US': { en: 'English (US)', pl: 'Angielski (US)', de: 'Englisch (US)' },
    'pl-PL': { en: 'Polish', pl: 'Polski', de: 'Polnisch' },
    'de-DE': { en: 'German', pl: 'Niemiecki', de: 'Deutsch' }
  };
  
  const displayLang = displayLocale.split('-')[0];
  
  return SUPPORTED_LOCALES.map(locale => ({
    code: locale,
    name: localeNames[locale][displayLang] || localeNames[locale]['en'],
    nativeName: localeNames[locale][locale.split('-')[0]]
  }));
};

module.exports = {
  t,
  formatCurrency,
  formatDate,
  formatTime,
  formatNumber,
  formatRelativeTime,
  getErrorMessage,
  getValidationMessage,
  getOCRLanguage,
  localeMiddleware,
  clearTranslationCache,
  isValidLocale,
  getSupportedLocales,
  SUPPORTED_LOCALES,
  DEFAULT_LOCALE
}; 