const fs = require('fs');
const path = require('path');

class SettingsService {
  constructor() {
    this.settingsFile = path.join(__dirname, 'data', 'settings.json');
    this.userSettingsFile = path.join(__dirname, 'data', 'user-settings.json');
    
    // Ensure data directory exists
    const dataDir = path.dirname(this.settingsFile);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    // Initialize default settings
    this.defaultSettings = {
      company: {
        name: 'ExpenseFlow Demo Corp',
        address: 'ul. Marszałkowska 123',
        city: 'Warsaw',
        country: 'Poland',
        postalCode: '00-001',
        taxId: '1234567890',
        currency: 'PLN',
        fiscalYearStart: '01-01',
        accountingMethod: 'accrual',
        timezone: 'Europe/Warsaw',
        language: 'en',
        dateFormat: 'DD/MM/YYYY',
        numberFormat: 'european'
      },
      approval: {
        defaultWorkflow: 'standard',
        autoApproveLimit: 500,
        requireReceiptAbove: 100,
        allowSelfApproval: false,
        escalationDays: 3,
        reminderDays: 1
      },
      notifications: {
        emailEnabled: true,
        pushEnabled: true,
        smsEnabled: false,
        approvalReminders: true,
        expenseSubmitted: true,
        documentProcessed: true,
        reportGenerated: true
      },
      integrations: {
        bankApi: {
          enabled: false,
          provider: null,
          apiKey: null,
          lastSync: null
        },
        accounting: {
          enabled: false,
          provider: null,
          apiKey: null,
          lastSync: null
        },
        ocr: {
          enabled: true,
          provider: 'tesseract',
          confidence: 0.7,
          autoProcess: true
        },
        email: {
          enabled: false,
          provider: 'smtp',
          host: '',
          port: 587,
          username: '',
          password: '',
          fromAddress: ''
        }
      },
      security: {
        sessionTimeout: 480, // 8 hours in minutes
        passwordPolicy: {
          minLength: 8,
          requireUppercase: true,
          requireLowercase: true,
          requireNumbers: true,
          requireSpecialChars: false
        },
        twoFactorAuth: false,
        auditLogging: true,
        ipRestrictions: []
      },
      ui: {
        theme: 'light',
        sidebarCollapsed: false,
        itemsPerPage: 25,
        defaultView: 'list',
        showTutorials: true
      }
    };

    this.defaultUserSettings = {
      profile: {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@company.com',
        phone: '+48 123 456 789',
        position: 'Senior Accountant',
        department: 'Finance',
        avatar: ''
      },
      preferences: {
        language: 'en',
        timezone: 'Europe/Warsaw',
        currency: 'PLN',
        dateFormat: 'DD/MM/YYYY',
        numberFormat: 'european',
        theme: 'light'
      },
      notifications: {
        email: true,
        push: true,
        sms: false,
        expenseApproved: true,
        expenseRejected: true,
        documentProcessed: true,
        reportReady: true,
        weeklyDigest: true
      },
      dashboard: {
        widgets: ['stats', 'recent-expenses', 'pending-approvals', 'quick-actions'],
        defaultTimeRange: 'last_30_days',
        showWelcome: true
      }
    };

    // Load existing settings or create defaults
    this.loadSettings();
  }

  // Load settings from file
  loadSettings() {
    try {
      // Load company settings
      if (fs.existsSync(this.settingsFile)) {
        const data = fs.readFileSync(this.settingsFile, 'utf8');
        this.settings = { ...this.defaultSettings, ...JSON.parse(data) };
      } else {
        this.settings = { ...this.defaultSettings };
        this.saveSettings();
      }

      // Load user settings
      if (fs.existsSync(this.userSettingsFile)) {
        const data = fs.readFileSync(this.userSettingsFile, 'utf8');
        this.userSettings = { ...this.defaultUserSettings, ...JSON.parse(data) };
      } else {
        this.userSettings = { ...this.defaultUserSettings };
        this.saveUserSettings();
      }

      console.log('Settings loaded successfully');
    } catch (error) {
      console.error('Error loading settings:', error);
      this.settings = { ...this.defaultSettings };
      this.userSettings = { ...this.defaultUserSettings };
    }
  }

  // Save company settings
  saveSettings() {
    try {
      fs.writeFileSync(this.settingsFile, JSON.stringify(this.settings, null, 2));
      console.log('Company settings saved');
      return { success: true };
    } catch (error) {
      console.error('Error saving settings:', error);
      return { success: false, error: error.message };
    }
  }

  // Save user settings
  saveUserSettings() {
    try {
      fs.writeFileSync(this.userSettingsFile, JSON.stringify(this.userSettings, null, 2));
      console.log('User settings saved');
      return { success: true };
    } catch (error) {
      console.error('Error saving user settings:', error);
      return { success: false, error: error.message };
    }
  }

  // Get all settings
  getAllSettings() {
    return {
      company: this.settings,
      user: this.userSettings
    };
  }

  // Get company settings
  getCompanySettings() {
    return this.settings;
  }

  // Get user settings
  getUserSettings() {
    return this.userSettings;
  }

  // Update company settings
  updateCompanySettings(updates) {
    try {
      this.settings = this.deepMerge(this.settings, updates);
      const result = this.saveSettings();
      
      if (result.success) {
        return {
          success: true,
          message: 'Company settings updated successfully',
          data: this.settings
        };
      } else {
        return result;
      }
    } catch (error) {
      console.error('Error updating company settings:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Update user settings
  updateUserSettings(updates) {
    try {
      this.userSettings = this.deepMerge(this.userSettings, updates);
      const result = this.saveUserSettings();
      
      if (result.success) {
        return {
          success: true,
          message: 'User settings updated successfully',
          data: this.userSettings
        };
      } else {
        return result;
      }
    } catch (error) {
      console.error('Error updating user settings:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Update specific setting section
  updateSettingSection(section, updates) {
    try {
      if (this.settings[section]) {
        this.settings[section] = { ...this.settings[section], ...updates };
        const result = this.saveSettings();
        
        if (result.success) {
          return {
            success: true,
            message: `${section} settings updated successfully`,
            data: this.settings[section]
          };
        } else {
          return result;
        }
      } else {
        return {
          success: false,
          error: `Settings section '${section}' not found`
        };
      }
    } catch (error) {
      console.error(`Error updating ${section} settings:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Reset settings to defaults
  resetToDefaults(section = null) {
    try {
      if (section) {
        if (this.defaultSettings[section]) {
          this.settings[section] = { ...this.defaultSettings[section] };
        } else {
          return {
            success: false,
            error: `Settings section '${section}' not found`
          };
        }
      } else {
        this.settings = { ...this.defaultSettings };
      }

      const result = this.saveSettings();
      
      if (result.success) {
        return {
          success: true,
          message: section ? `${section} settings reset to defaults` : 'All settings reset to defaults',
          data: section ? this.settings[section] : this.settings
        };
      } else {
        return result;
      }
    } catch (error) {
      console.error('Error resetting settings:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Validate settings
  validateSettings(settings) {
    const errors = [];

    // Validate company settings
    if (settings.company) {
      if (!settings.company.name || settings.company.name.trim().length < 2) {
        errors.push('Company name must be at least 2 characters long');
      }
      
      if (settings.company.currency && !['PLN', 'EUR', 'USD', 'GBP'].includes(settings.company.currency)) {
        errors.push('Invalid currency code');
      }
      
      if (settings.company.taxId && !/^\d{10}$/.test(settings.company.taxId.replace(/\D/g, ''))) {
        errors.push('Tax ID must be 10 digits');
      }
    }

    // Validate approval settings
    if (settings.approval) {
      if (settings.approval.autoApproveLimit && (settings.approval.autoApproveLimit < 0 || settings.approval.autoApproveLimit > 10000)) {
        errors.push('Auto-approve limit must be between 0 and 10,000');
      }
      
      if (settings.approval.escalationDays && (settings.approval.escalationDays < 1 || settings.approval.escalationDays > 30)) {
        errors.push('Escalation days must be between 1 and 30');
      }
    }

    // Validate email settings
    if (settings.integrations?.email?.enabled) {
      const email = settings.integrations.email;
      if (!email.host || !email.port || !email.username || !email.fromAddress) {
        errors.push('Email configuration is incomplete');
      }
      
      if (email.port && (email.port < 1 || email.port > 65535)) {
        errors.push('Email port must be between 1 and 65535');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Deep merge objects
  deepMerge(target, source) {
    const result = { ...target };
    
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(result[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
    
    return result;
  }

  // Export settings to file
  exportSettings() {
    try {
      const exportData = {
        company: this.settings,
        user: this.userSettings,
        exportedAt: new Date().toISOString(),
        version: '1.0'
      };

      const exportPath = path.join(__dirname, 'exports', `settings_export_${Date.now()}.json`);
      
      // Ensure exports directory exists
      const exportsDir = path.dirname(exportPath);
      if (!fs.existsSync(exportsDir)) {
        fs.mkdirSync(exportsDir, { recursive: true });
      }

      fs.writeFileSync(exportPath, JSON.stringify(exportData, null, 2));

      return {
        success: true,
        message: 'Settings exported successfully',
        filepath: exportPath,
        filename: path.basename(exportPath)
      };
    } catch (error) {
      console.error('Error exporting settings:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Import settings from file
  importSettings(filePath) {
    try {
      if (!fs.existsSync(filePath)) {
        return {
          success: false,
          error: 'Import file not found'
        };
      }

      const data = fs.readFileSync(filePath, 'utf8');
      const importData = JSON.parse(data);

      // Validate import data structure
      if (!importData.company || !importData.user) {
        return {
          success: false,
          error: 'Invalid import file format'
        };
      }

      // Validate settings
      const validation = this.validateSettings(importData);
      if (!validation.isValid) {
        return {
          success: false,
          error: 'Invalid settings data',
          details: validation.errors
        };
      }

      // Import settings
      this.settings = { ...this.defaultSettings, ...importData.company };
      this.userSettings = { ...this.defaultUserSettings, ...importData.user };

      // Save imported settings
      const companySaveResult = this.saveSettings();
      const userSaveResult = this.saveUserSettings();

      if (companySaveResult.success && userSaveResult.success) {
        return {
          success: true,
          message: 'Settings imported successfully',
          importedAt: new Date().toISOString()
        };
      } else {
        return {
          success: false,
          error: 'Failed to save imported settings'
        };
      }
    } catch (error) {
      console.error('Error importing settings:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = new SettingsService(); 