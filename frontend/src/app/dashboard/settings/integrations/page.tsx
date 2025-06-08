'use client';

import React, { useState, useEffect } from 'react';
import { 
  Plug, 
  Check, 
  X, 
  RefreshCw, 
  Settings, 
  ExternalLink,
  AlertCircle,
  Info,
  Zap,
  Database,
  Mail,
  BarChart3,
  MessageSquare
} from 'lucide-react';
import { toast } from 'react-hot-toast';

interface Integration {
  enabled: boolean;
  provider: string | null;
  config: Record<string, any>;
  lastSync: string | null;
  status: 'connected' | 'disconnected' | 'error';
}

interface Integrations {
  accounting: Integration;
  banking: Integration;
  storage: Integration;
  notifications: {
    email: Integration;
    slack: Integration;
  };
  analytics: Integration;
}

const IntegrationsPage: React.FC = () => {
  const [integrations, setIntegrations] = useState<Integrations | null>(null);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState<string | null>(null);

  useEffect(() => {
    loadIntegrations();
  }, []);

  const loadIntegrations = async () => {
    try {
      const response = await fetch('http://localhost:3003/api/settings/integrations');
      const data = await response.json();
      
      if (data.success) {
        setIntegrations(data.data);
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      console.error('Error loading integrations:', error);
      toast.error('Failed to load integrations');
    } finally {
      setLoading(false);
    }
  };

  const testConnection = async (type: string) => {
    try {
      setTesting(type);
      const response = await fetch(`http://localhost:3003/api/settings/integrations/${type}/test`, {
        method: 'POST'
      });

      const data = await response.json();
      if (data.success) {
        toast.success(`${type} connection test successful`);
      } else {
        toast.error(`${type} connection test failed: ${data.error}`);
      }
    } catch (error) {
      console.error('Error testing integration:', error);
      toast.error('Connection test failed');
    } finally {
      setTesting(null);
    }
  };

  const updateIntegration = async (type: string, updates: Partial<Integration>) => {
    try {
      const response = await fetch(`http://localhost:3003/api/settings/integrations/${type}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });

      const data = await response.json();
      if (data.success) {
        toast.success(`${type} integration updated successfully`);
        loadIntegrations(); // Reload to get updated data
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      console.error('Error updating integration:', error);
      toast.error('Failed to update integration');
    }
  };

  const getIntegrationIcon = (type: string) => {
    const icons: Record<string, any> = {
      accounting: BarChart3,
      banking: Database,
      storage: Database,
      email: Mail,
      slack: MessageSquare,
      analytics: BarChart3
    };
    return icons[type] || Plug;
  };

  const getIntegrationDescription = (type: string) => {
    const descriptions: Record<string, string> = {
      accounting: 'Connect with accounting software like QuickBooks, Xero, or SAP',
      banking: 'Sync with bank accounts for automatic transaction import',
      storage: 'Configure cloud storage for document backup and archiving',
      email: 'Set up email notifications and SMTP configuration',
      slack: 'Send notifications and updates to Slack channels',
      analytics: 'Connect with analytics platforms for advanced reporting'
    };
    return descriptions[type] || 'Integration description not available';
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-6 h-6 animate-spin text-blue-600 mr-2" />
          <span className="text-gray-600">Loading integrations...</span>
        </div>
      </div>
    );
  }

  if (!integrations) {
    return (
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="text-center py-12">
          <Plug className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No integrations found</h3>
          <p className="text-gray-600">Unable to load integration settings.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Integrations</h1>
          <p className="text-gray-600 mt-1">Connect ExpenseFlow Pro with your favorite tools and services</p>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <Info className="w-5 h-5 text-blue-400 flex-shrink-0" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">
              Integration Status
            </h3>
            <p className="mt-1 text-sm text-blue-700">
              Integrations help automate your expense management workflow. Test connections regularly to ensure data sync is working properly.
            </p>
          </div>
        </div>
      </div>

      {/* Core Integrations */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Core Integrations</h2>
          <p className="text-sm text-gray-600">Essential integrations for expense management</p>
        </div>

        <div className="p-6 space-y-6">
          {/* Accounting Integration */}
          <div className="border border-gray-200 rounded-lg p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <BarChart3 className="w-10 h-10 text-blue-600" />
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-gray-900">Accounting Software</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {getIntegrationDescription('accounting')}
                  </p>
                  <div className="mt-2 flex items-center">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      integrations.accounting.status === 'connected' 
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {integrations.accounting.status === 'connected' ? (
                        <Check className="w-3 h-3 mr-1" />
                      ) : (
                        <X className="w-3 h-3 mr-1" />
                      )}
                      {integrations.accounting.status}
                    </span>
                    {integrations.accounting.lastSync && (
                      <span className="ml-2 text-xs text-gray-500">
                        Last sync: {new Date(integrations.accounting.lastSync).toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => testConnection('accounting')}
                  disabled={testing === 'accounting'}
                  className="btn btn-outline btn-sm"
                >
                  {testing === 'accounting' ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
                      Testing...
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 mr-1" />
                      Test Connection
                    </>
                  )}
                </button>
                <button className="btn btn-outline btn-sm">
                  <Settings className="w-4 h-4 mr-1" />
                  Configure
                </button>
              </div>
            </div>
          </div>

          {/* Banking Integration */}
          <div className="border border-gray-200 rounded-lg p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <Database className="w-10 h-10 text-green-600" />
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-gray-900">Banking & Financial</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {getIntegrationDescription('banking')}
                  </p>
                  <div className="mt-2 flex items-center">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      integrations.banking.status === 'connected' 
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {integrations.banking.status === 'connected' ? (
                        <Check className="w-3 h-3 mr-1" />
                      ) : (
                        <X className="w-3 h-3 mr-1" />
                      )}
                      {integrations.banking.status}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => testConnection('banking')}
                  disabled={testing === 'banking'}
                  className="btn btn-outline btn-sm"
                >
                  {testing === 'banking' ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
                      Testing...
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 mr-1" />
                      Test Connection
                    </>
                  )}
                </button>
                <button className="btn btn-outline btn-sm">
                  <Settings className="w-4 h-4 mr-1" />
                  Configure
                </button>
              </div>
            </div>
          </div>

          {/* Storage Integration */}
          <div className="border border-gray-200 rounded-lg p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <Database className="w-10 h-10 text-purple-600" />
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-gray-900">Cloud Storage</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {getIntegrationDescription('storage')}
                  </p>
                  <div className="mt-2 flex items-center">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      integrations.storage.status === 'connected' 
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {integrations.storage.status === 'connected' ? (
                        <Check className="w-3 h-3 mr-1" />
                      ) : (
                        <X className="w-3 h-3 mr-1" />
                      )}
                      {integrations.storage.status}
                    </span>
                    <span className="ml-2 text-xs text-gray-500">
                      Provider: {integrations.storage.provider || 'Not configured'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => testConnection('storage')}
                  disabled={testing === 'storage'}
                  className="btn btn-outline btn-sm"
                >
                  {testing === 'storage' ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
                      Testing...
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 mr-1" />
                      Test Connection
                    </>
                  )}
                </button>
                <button className="btn btn-outline btn-sm">
                  <Settings className="w-4 h-4 mr-1" />
                  Configure
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Communication Integrations */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Communication & Notifications</h2>
          <p className="text-sm text-gray-600">Keep your team informed with automated notifications</p>
        </div>

        <div className="p-6 space-y-6">
          {/* Email Integration */}
          <div className="border border-gray-200 rounded-lg p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <Mail className="w-10 h-10 text-red-600" />
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-gray-900">Email Notifications</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {getIntegrationDescription('email')}
                  </p>
                  <div className="mt-2 flex items-center">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      integrations.notifications.email.status === 'connected' 
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {integrations.notifications.email.status === 'connected' ? (
                        <Check className="w-3 h-3 mr-1" />
                      ) : (
                        <X className="w-3 h-3 mr-1" />
                      )}
                      {integrations.notifications.email.status}
                    </span>
                    <span className="ml-2 text-xs text-gray-500">
                      SMTP: {integrations.notifications.email.config?.host || 'Not configured'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => testConnection('email')}
                  disabled={testing === 'email'}
                  className="btn btn-outline btn-sm"
                >
                  {testing === 'email' ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
                      Testing...
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 mr-1" />
                      Test Connection
                    </>
                  )}
                </button>
                <button className="btn btn-outline btn-sm">
                  <Settings className="w-4 h-4 mr-1" />
                  Configure
                </button>
              </div>
            </div>
          </div>

          {/* Slack Integration */}
          <div className="border border-gray-200 rounded-lg p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <MessageSquare className="w-10 h-10 text-purple-600" />
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-gray-900">Slack Integration</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {getIntegrationDescription('slack')}
                  </p>
                  <div className="mt-2 flex items-center">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      integrations.notifications.slack.status === 'connected' 
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {integrations.notifications.slack.status === 'connected' ? (
                        <Check className="w-3 h-3 mr-1" />
                      ) : (
                        <X className="w-3 h-3 mr-1" />
                      )}
                      {integrations.notifications.slack.status}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => testConnection('slack')}
                  disabled={testing === 'slack'}
                  className="btn btn-outline btn-sm"
                >
                  {testing === 'slack' ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
                      Testing...
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 mr-1" />
                      Test Connection
                    </>
                  )}
                </button>
                <button className="btn btn-outline btn-sm">
                  <Settings className="w-4 h-4 mr-1" />
                  Configure
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Analytics Integration */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Analytics & Reporting</h2>
          <p className="text-sm text-gray-600">Advanced analytics and business intelligence</p>
        </div>

        <div className="p-6">
          <div className="border border-gray-200 rounded-lg p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <BarChart3 className="w-10 h-10 text-orange-600" />
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-gray-900">Analytics Platform</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {getIntegrationDescription('analytics')}
                  </p>
                  <div className="mt-2 flex items-center">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      integrations.analytics.status === 'connected' 
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {integrations.analytics.status === 'connected' ? (
                        <Check className="w-3 h-3 mr-1" />
                      ) : (
                        <X className="w-3 h-3 mr-1" />
                      )}
                      {integrations.analytics.status}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => testConnection('analytics')}
                  disabled={testing === 'analytics'}
                  className="btn btn-outline btn-sm"
                >
                  {testing === 'analytics' ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
                      Testing...
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 mr-1" />
                      Test Connection
                    </>
                  )}
                </button>
                <button className="btn btn-outline btn-sm">
                  <Settings className="w-4 h-4 mr-1" />
                  Configure
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Help Section */}
      <div className="bg-gray-50 rounded-lg p-6">
        <div className="flex items-start">
          <AlertCircle className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-gray-900">
              Need Help with Integrations?
            </h3>
            <p className="mt-1 text-sm text-gray-600">
              Check our integration guides and documentation for step-by-step setup instructions.
            </p>
            <div className="mt-3">
              <button className="btn btn-outline btn-sm">
                <ExternalLink className="w-4 h-4 mr-1" />
                View Documentation
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IntegrationsPage; 