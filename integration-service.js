const axios = require('axios');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

class IntegrationService {
  constructor() {
    this.integrationsFile = path.join(__dirname, 'data', 'integrations.json');
    this.loadIntegrations();
    
    // Available integrations
    this.availableIntegrations = {
      quickbooks: {
        name: 'QuickBooks Online',
        description: 'Sync expenses with QuickBooks accounting software',
        category: 'accounting',
        authType: 'oauth2',
        status: 'available',
        features: ['expense_sync', 'chart_of_accounts', 'vendors', 'reports'],
        setupUrl: 'https://developer.intuit.com/app/developer/qbo/docs/get-started',
        icon: 'quickbooks.png'
      },
      xero: {
        name: 'Xero',
        description: 'Connect with Xero accounting platform',
        category: 'accounting',
        authType: 'oauth2',
        status: 'available',
        features: ['expense_sync', 'bank_feeds', 'invoicing', 'reports'],
        setupUrl: 'https://developer.xero.com/documentation/',
        icon: 'xero.png'
      },
      sage: {
        name: 'Sage Business Cloud',
        description: 'Integrate with Sage accounting software',
        category: 'accounting',
        authType: 'api_key',
        status: 'available',
        features: ['expense_sync', 'suppliers', 'purchase_orders'],
        setupUrl: 'https://developer.sage.com/',
        icon: 'sage.png'
      },
      chase: {
        name: 'Chase Bank',
        description: 'Import transactions from Chase bank accounts',
        category: 'banking',
        authType: 'oauth2',
        status: 'beta',
        features: ['transaction_import', 'account_balance', 'statements'],
        setupUrl: 'https://developer.chase.com/',
        icon: 'chase.png'
      },
      wells_fargo: {
        name: 'Wells Fargo',
        description: 'Connect Wells Fargo business accounts',
        category: 'banking',
        authType: 'oauth2',
        status: 'beta',
        features: ['transaction_import', 'account_info'],
        setupUrl: 'https://developer.wellsfargo.com/',
        icon: 'wells_fargo.png'
      },
      pko: {
        name: 'PKO Bank Polski',
        description: 'Import transactions from PKO bank accounts',
        category: 'banking',
        authType: 'api_key',
        status: 'available',
        features: ['transaction_import', 'account_balance'],
        setupUrl: 'https://developer.pkobp.pl/',
        icon: 'pko.png'
      },
      mbank: {
        name: 'mBank',
        description: 'Connect mBank business accounts',
        category: 'banking',
        authType: 'oauth2',
        status: 'available',
        features: ['transaction_import', 'statements'],
        setupUrl: 'https://developer.mbank.pl/',
        icon: 'mbank.png'
      },
      gmail: {
        name: 'Gmail',
        description: 'Send notifications via Gmail SMTP',
        category: 'email',
        authType: 'oauth2',
        status: 'available',
        features: ['email_notifications', 'receipt_forwarding'],
        setupUrl: 'https://developers.google.com/gmail/api',
        icon: 'gmail.png'
      },
      outlook: {
        name: 'Outlook',
        description: 'Send emails through Microsoft Outlook',
        category: 'email',
        authType: 'oauth2',
        status: 'available',
        features: ['email_notifications', 'calendar_integration'],
        setupUrl: 'https://docs.microsoft.com/en-us/graph/',
        icon: 'outlook.png'
      },
      smtp: {
        name: 'SMTP Server',
        description: 'Configure custom SMTP server for emails',
        category: 'email',
        authType: 'credentials',
        status: 'available',
        features: ['email_notifications', 'custom_templates'],
        setupUrl: null,
        icon: 'email.png'
      },
      slack: {
        name: 'Slack',
        description: 'Send notifications to Slack channels',
        category: 'notifications',
        authType: 'webhook',
        status: 'available',
        features: ['expense_notifications', 'approval_alerts'],
        setupUrl: 'https://api.slack.com/messaging/webhooks',
        icon: 'slack.png'
      },
      teams: {
        name: 'Microsoft Teams',
        description: 'Send notifications to Teams channels',
        category: 'notifications',
        authType: 'webhook',
        status: 'available',
        features: ['expense_notifications', 'approval_alerts'],
        setupUrl: 'https://docs.microsoft.com/en-us/microsoftteams/platform/webhooks-and-connectors/',
        icon: 'teams.png'
      }
    };
  }

  // Load integrations from file
  loadIntegrations() {
    try {
      if (fs.existsSync(this.integrationsFile)) {
        const data = fs.readFileSync(this.integrationsFile, 'utf8');
        this.integrations = JSON.parse(data);
      } else {
        this.integrations = {};
        this.saveIntegrations();
      }
    } catch (error) {
      console.error('Error loading integrations:', error);
      this.integrations = {};
    }
  }

  // Save integrations to file
  saveIntegrations() {
    try {
      const dataDir = path.dirname(this.integrationsFile);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      
      fs.writeFileSync(this.integrationsFile, JSON.stringify(this.integrations, null, 2));
      return { success: true };
    } catch (error) {
      console.error('Error saving integrations:', error);
      return { success: false, error: error.message };
    }
  }

  // Get all available integrations
  getAvailableIntegrations() {
    return Object.keys(this.availableIntegrations).map(key => ({
      id: key,
      ...this.availableIntegrations[key],
      isConfigured: !!this.integrations[key]?.enabled,
      lastSync: this.integrations[key]?.lastSync || null
    }));
  }

  // Get integrations by category
  getIntegrationsByCategory(category) {
    return this.getAvailableIntegrations().filter(integration => 
      integration.category === category
    );
  }

  // Get configured integrations
  getConfiguredIntegrations() {
    return Object.keys(this.integrations)
      .filter(key => this.integrations[key].enabled)
      .map(key => ({
        id: key,
        ...this.availableIntegrations[key],
        ...this.integrations[key]
      }));
  }

  // Configure integration
  async configureIntegration(integrationId, config) {
    try {
      if (!this.availableIntegrations[integrationId]) {
        return {
          success: false,
          error: 'Integration not found'
        };
      }

      const integration = this.availableIntegrations[integrationId];
      
      // Validate configuration based on auth type
      const validation = this.validateIntegrationConfig(integration, config);
      if (!validation.isValid) {
        return {
          success: false,
          error: 'Invalid configuration',
          details: validation.errors
        };
      }

      // Test connection
      const testResult = await this.testIntegrationConnection(integrationId, config);
      if (!testResult.success) {
        return {
          success: false,
          error: 'Connection test failed',
          details: testResult.error
        };
      }

      // Encrypt sensitive data
      const encryptedConfig = this.encryptSensitiveData(config);

      // Save configuration
      this.integrations[integrationId] = {
        ...encryptedConfig,
        enabled: true,
        configuredAt: new Date().toISOString(),
        lastSync: null,
        syncStatus: 'ready'
      };

      const saveResult = this.saveIntegrations();
      if (!saveResult.success) {
        return saveResult;
      }

      return {
        success: true,
        message: `${integration.name} configured successfully`,
        data: {
          id: integrationId,
          name: integration.name,
          status: 'configured'
        }
      };
    } catch (error) {
      console.error('Error configuring integration:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Test integration connection
  async testIntegrationConnection(integrationId, config) {
    try {
      const integration = this.availableIntegrations[integrationId];
      
      switch (integration.authType) {
        case 'api_key':
          return await this.testApiKeyConnection(integrationId, config);
        case 'oauth2':
          return await this.testOAuth2Connection(integrationId, config);
        case 'credentials':
          return await this.testCredentialsConnection(integrationId, config);
        case 'webhook':
          return await this.testWebhookConnection(integrationId, config);
        default:
          return {
            success: false,
            error: 'Unsupported authentication type'
          };
      }
    } catch (error) {
      console.error('Connection test error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Test API key connection
  async testApiKeyConnection(integrationId, config) {
    try {
      // Simulate API key validation
      if (!config.apiKey || config.apiKey.length < 10) {
        return {
          success: false,
          error: 'Invalid API key format'
        };
      }

      // Mock API call based on integration
      switch (integrationId) {
        case 'pko':
          // Simulate PKO Bank API test
          return {
            success: true,
            message: 'PKO Bank connection successful',
            accountInfo: {
              accountNumber: '****1234',
              accountName: 'Business Account',
              balance: 15420.50
            }
          };
        case 'sage':
          // Simulate Sage API test
          return {
            success: true,
            message: 'Sage Business Cloud connection successful',
            companyInfo: {
              companyId: 'demo123',
              companyName: 'Demo Company Ltd'
            }
          };
        default:
          return {
            success: true,
            message: 'API key validated successfully'
          };
      }
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Test OAuth2 connection
  async testOAuth2Connection(integrationId, config) {
    try {
      if (!config.clientId || !config.clientSecret) {
        return {
          success: false,
          error: 'OAuth2 credentials incomplete'
        };
      }

      // Simulate OAuth2 validation
      return {
        success: true,
        message: 'OAuth2 configuration valid',
        authUrl: `https://auth.${integrationId}.com/oauth/authorize?client_id=${config.clientId}&response_type=code&scope=read_write`
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Test credentials connection
  async testCredentialsConnection(integrationId, config) {
    try {
      if (integrationId === 'smtp') {
        // Test SMTP connection
        if (!config.host || !config.port || !config.username || !config.password) {
          return {
            success: false,
            error: 'SMTP configuration incomplete'
          };
        }

        // Simulate SMTP test
        return {
          success: true,
          message: 'SMTP connection successful',
          serverInfo: {
            host: config.host,
            port: config.port,
            secure: config.port === 465
          }
        };
      }

      return {
        success: true,
        message: 'Credentials validated successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Test webhook connection
  async testWebhookConnection(integrationId, config) {
    try {
      if (!config.webhookUrl) {
        return {
          success: false,
          error: 'Webhook URL required'
        };
      }

      // Test webhook by sending a test message
      const testPayload = {
        text: `Test message from ExpenseFlow Pro - ${integrationId} integration configured successfully`,
        timestamp: new Date().toISOString()
      };

      const response = await axios.post(config.webhookUrl, testPayload, {
        timeout: 5000,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.status >= 200 && response.status < 300) {
        return {
          success: true,
          message: 'Webhook test successful',
          responseStatus: response.status
        };
      } else {
        return {
          success: false,
          error: `Webhook returned status ${response.status}`
        };
      }
    } catch (error) {
      return {
        success: false,
        error: `Webhook test failed: ${error.message}`
      };
    }
  }

  // Validate integration configuration
  validateIntegrationConfig(integration, config) {
    const errors = [];

    switch (integration.authType) {
      case 'api_key':
        if (!config.apiKey) {
          errors.push('API key is required');
        } else if (config.apiKey.length < 10) {
          errors.push('API key must be at least 10 characters');
        }
        break;

      case 'oauth2':
        if (!config.clientId) errors.push('Client ID is required');
        if (!config.clientSecret) errors.push('Client Secret is required');
        if (config.redirectUri && !this.isValidUrl(config.redirectUri)) {
          errors.push('Invalid redirect URI');
        }
        break;

      case 'credentials':
        if (integration.id === 'smtp') {
          if (!config.host) errors.push('SMTP host is required');
          if (!config.port) errors.push('SMTP port is required');
          if (!config.username) errors.push('SMTP username is required');
          if (!config.password) errors.push('SMTP password is required');
          if (config.port && (config.port < 1 || config.port > 65535)) {
            errors.push('Invalid port number');
          }
        }
        break;

      case 'webhook':
        if (!config.webhookUrl) {
          errors.push('Webhook URL is required');
        } else if (!this.isValidUrl(config.webhookUrl)) {
          errors.push('Invalid webhook URL');
        }
        break;
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Encrypt sensitive data
  encryptSensitiveData(config) {
    const sensitiveFields = ['apiKey', 'clientSecret', 'password', 'webhookUrl'];
    const encrypted = { ...config };

    sensitiveFields.forEach(field => {
      if (encrypted[field]) {
        encrypted[field] = this.encrypt(encrypted[field]);
      }
    });

    return encrypted;
  }

  // Decrypt sensitive data
  decryptSensitiveData(config) {
    const sensitiveFields = ['apiKey', 'clientSecret', 'password', 'webhookUrl'];
    const decrypted = { ...config };

    sensitiveFields.forEach(field => {
      if (decrypted[field]) {
        try {
          decrypted[field] = this.decrypt(decrypted[field]);
        } catch (error) {
          console.error(`Error decrypting ${field}:`, error);
        }
      }
    });

    return decrypted;
  }

  // Simple encryption (in production, use proper encryption)
  encrypt(text) {
    const algorithm = 'aes-256-cbc';
    const key = crypto.scryptSync('expenseflow-secret-key', 'salt', 32);
    const iv = crypto.randomBytes(16);
    
    const cipher = crypto.createCipher(algorithm, key);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return iv.toString('hex') + ':' + encrypted;
  }

  // Simple decryption
  decrypt(encryptedText) {
    const algorithm = 'aes-256-cbc';
    const key = crypto.scryptSync('expenseflow-secret-key', 'salt', 32);
    
    const parts = encryptedText.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    
    const decipher = crypto.createDecipher(algorithm, key);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  // Validate URL
  isValidUrl(string) {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  }

  // Disable integration
  disableIntegration(integrationId) {
    try {
      if (!this.integrations[integrationId]) {
        return {
          success: false,
          error: 'Integration not found'
        };
      }

      this.integrations[integrationId].enabled = false;
      this.integrations[integrationId].disabledAt = new Date().toISOString();

      const saveResult = this.saveIntegrations();
      if (!saveResult.success) {
        return saveResult;
      }

      return {
        success: true,
        message: 'Integration disabled successfully'
      };
    } catch (error) {
      console.error('Error disabling integration:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Remove integration
  removeIntegration(integrationId) {
    try {
      if (!this.integrations[integrationId]) {
        return {
          success: false,
          error: 'Integration not found'
        };
      }

      delete this.integrations[integrationId];

      const saveResult = this.saveIntegrations();
      if (!saveResult.success) {
        return saveResult;
      }

      return {
        success: true,
        message: 'Integration removed successfully'
      };
    } catch (error) {
      console.error('Error removing integration:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Sync integration data
  async syncIntegration(integrationId) {
    try {
      if (!this.integrations[integrationId]?.enabled) {
        return {
          success: false,
          error: 'Integration not configured or disabled'
        };
      }

      // Update sync status
      this.integrations[integrationId].syncStatus = 'syncing';
      this.integrations[integrationId].lastSyncAttempt = new Date().toISOString();

      // Simulate sync process
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Update sync completion
      this.integrations[integrationId].syncStatus = 'completed';
      this.integrations[integrationId].lastSync = new Date().toISOString();
      this.integrations[integrationId].lastSyncResult = {
        recordsProcessed: Math.floor(Math.random() * 50) + 10,
        errors: 0,
        warnings: 0
      };

      this.saveIntegrations();

      return {
        success: true,
        message: 'Sync completed successfully',
        data: this.integrations[integrationId].lastSyncResult
      };
    } catch (error) {
      console.error('Sync error:', error);
      
      // Update sync error status
      this.integrations[integrationId].syncStatus = 'error';
      this.integrations[integrationId].lastSyncError = error.message;
      this.saveIntegrations();

      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = new IntegrationService(); 