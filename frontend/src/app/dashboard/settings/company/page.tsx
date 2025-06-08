'use client';

import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Save, 
  RefreshCw, 
  Upload, 
  MapPin,
  Phone,
  Mail,
  CreditCard,
  Globe,
  Calendar,
  Palette,
  Settings as SettingsIcon
} from 'lucide-react';
import { toast } from 'react-hot-toast';

interface CompanySettings {
  id: string;
  companyName: string;
  companyEmail: string;
  companyPhone: string;
  companyAddress: {
    street: string;
    city: string;
    postalCode: string;
    country: string;
  };
  taxId: string;
  currency: string;
  timezone: string;
  fiscalYearStart: string;
  logo: string | null;
  theme: {
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
  };
  features: {
    ocrEnabled: boolean;
    multiCurrency: boolean;
    advancedReporting: boolean;
    apiAccess: boolean;
    customCategories: boolean;
    bulkOperations: boolean;
  };
  notifications: {
    emailNotifications: boolean;
    pushNotifications: boolean;
    weeklyReports: boolean;
    monthlyReports: boolean;
  };
  security: {
    twoFactorAuth: boolean;
    sessionTimeout: number;
    passwordPolicy: {
      minLength: number;
      requireUppercase: boolean;
      requireNumbers: boolean;
      requireSpecialChars: boolean;
    };
  };
}

const CompanySettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await fetch('http://localhost:3003/api/settings/company');
      const data = await response.json();
      
      if (data.success) {
        setSettings(data.data);
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      console.error('Error loading company settings:', error);
      toast.error('Failed to load company settings');
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    if (!settings) return;
    
    try {
      setSaving(true);
      const response = await fetch('http://localhost:3003/api/settings/company', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });

      const data = await response.json();
      if (data.success) {
        toast.success('Company settings saved successfully');
        setSettings(data.data);
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      console.error('Error saving company settings:', error);
      toast.error('Failed to save company settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-6 h-6 animate-spin text-blue-600 mr-2" />
          <span className="text-gray-600">Loading company settings...</span>
        </div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center py-12">
          <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No company settings found</h3>
          <p className="text-gray-600">Unable to load company settings.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Company Settings</h1>
          <p className="text-gray-600 mt-1">Manage your company information and configuration</p>
        </div>
        
        <button
          onClick={saveSettings}
          disabled={saving}
          className="btn btn-primary"
        >
          {saving ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </>
          )}
        </button>
      </div>

      {/* Company Information */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center mb-6">
          <Building2 className="w-5 h-5 text-gray-400 mr-2" />
          <h2 className="text-lg font-medium text-gray-900">Company Information</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Company Name *
            </label>
            <input
              type="text"
              value={settings.companyName}
              onChange={(e) => setSettings({
                ...settings,
                companyName: e.target.value
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter company name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Mail className="w-4 h-4 inline mr-1" />
              Email Address *
            </label>
            <input
              type="email"
              value={settings.companyEmail}
              onChange={(e) => setSettings({
                ...settings,
                companyEmail: e.target.value
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="company@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Phone className="w-4 h-4 inline mr-1" />
              Phone Number
            </label>
            <input
              type="tel"
              value={settings.companyPhone}
              onChange={(e) => setSettings({
                ...settings,
                companyPhone: e.target.value
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="+48 123 456 789"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <CreditCard className="w-4 h-4 inline mr-1" />
              Tax ID / VAT Number
            </label>
            <input
              type="text"
              value={settings.taxId}
              onChange={(e) => setSettings({
                ...settings,
                taxId: e.target.value
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="PL1234567890"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Globe className="w-4 h-4 inline mr-1" />
              Default Currency
            </label>
            <select
              value={settings.currency}
              onChange={(e) => setSettings({
                ...settings,
                currency: e.target.value
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="PLN">PLN - Polish Złoty</option>
              <option value="EUR">EUR - Euro</option>
              <option value="USD">USD - US Dollar</option>
              <option value="GBP">GBP - British Pound</option>
              <option value="CZK">CZK - Czech Koruna</option>
              <option value="HUF">HUF - Hungarian Forint</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Globe className="w-4 h-4 inline mr-1" />
              Timezone
            </label>
            <select
              value={settings.timezone}
              onChange={(e) => setSettings({
                ...settings,
                timezone: e.target.value
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="Europe/Warsaw">Europe/Warsaw (CET)</option>
              <option value="Europe/London">Europe/London (GMT)</option>
              <option value="Europe/Berlin">Europe/Berlin (CET)</option>
              <option value="Europe/Prague">Europe/Prague (CET)</option>
              <option value="America/New_York">America/New_York (EST)</option>
              <option value="Asia/Tokyo">Asia/Tokyo (JST)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="w-4 h-4 inline mr-1" />
              Fiscal Year Start
            </label>
            <select
              value={settings.fiscalYearStart}
              onChange={(e) => setSettings({
                ...settings,
                fiscalYearStart: e.target.value
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="01-01">January 1st</option>
              <option value="04-01">April 1st</option>
              <option value="07-01">July 1st</option>
              <option value="10-01">October 1st</option>
            </select>
          </div>
        </div>
      </div>

      {/* Address Information */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center mb-6">
          <MapPin className="w-5 h-5 text-gray-400 mr-2" />
          <h2 className="text-lg font-medium text-gray-900">Address Information</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Street Address
            </label>
            <input
              type="text"
              value={settings.companyAddress.street}
              onChange={(e) => setSettings({
                ...settings,
                companyAddress: {
                  ...settings.companyAddress,
                  street: e.target.value
                }
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="ul. Przykładowa 123"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              City
            </label>
            <input
              type="text"
              value={settings.companyAddress.city}
              onChange={(e) => setSettings({
                ...settings,
                companyAddress: {
                  ...settings.companyAddress,
                  city: e.target.value
                }
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Warszawa"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Postal Code
            </label>
            <input
              type="text"
              value={settings.companyAddress.postalCode}
              onChange={(e) => setSettings({
                ...settings,
                companyAddress: {
                  ...settings.companyAddress,
                  postalCode: e.target.value
                }
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="00-001"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Country
            </label>
            <select
              value={settings.companyAddress.country}
              onChange={(e) => setSettings({
                ...settings,
                companyAddress: {
                  ...settings.companyAddress,
                  country: e.target.value
                }
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="Poland">Poland</option>
              <option value="Germany">Germany</option>
              <option value="Czech Republic">Czech Republic</option>
              <option value="Slovakia">Slovakia</option>
              <option value="Hungary">Hungary</option>
              <option value="United Kingdom">United Kingdom</option>
              <option value="United States">United States</option>
            </select>
          </div>
        </div>
      </div>

      {/* Features & Capabilities */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center mb-6">
          <SettingsIcon className="w-5 h-5 text-gray-400 mr-2" />
          <h2 className="text-lg font-medium text-gray-900">Features & Capabilities</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(settings.features).map(([key, value]) => (
            <label key={key} className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
              <input
                type="checkbox"
                checked={value}
                onChange={(e) => setSettings({
                  ...settings,
                  features: {
                    ...settings.features,
                    [key]: e.target.checked
                  }
                })}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <div className="ml-3">
                <span className="text-sm font-medium text-gray-900">
                  {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                </span>
                <p className="text-xs text-gray-500">
                  {getFeatureDescription(key)}
                </p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Theme Customization */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center mb-6">
          <Palette className="w-5 h-5 text-gray-400 mr-2" />
          <h2 className="text-lg font-medium text-gray-900">Theme Customization</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Primary Color
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="color"
                value={settings.theme.primaryColor}
                onChange={(e) => setSettings({
                  ...settings,
                  theme: {
                    ...settings.theme,
                    primaryColor: e.target.value
                  }
                })}
                className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
              />
              <input
                type="text"
                value={settings.theme.primaryColor}
                onChange={(e) => setSettings({
                  ...settings,
                  theme: {
                    ...settings.theme,
                    primaryColor: e.target.value
                  }
                })}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="#3B82F6"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Secondary Color
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="color"
                value={settings.theme.secondaryColor}
                onChange={(e) => setSettings({
                  ...settings,
                  theme: {
                    ...settings.theme,
                    secondaryColor: e.target.value
                  }
                })}
                className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
              />
              <input
                type="text"
                value={settings.theme.secondaryColor}
                onChange={(e) => setSettings({
                  ...settings,
                  theme: {
                    ...settings.theme,
                    secondaryColor: e.target.value
                  }
                })}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="#10B981"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Accent Color
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="color"
                value={settings.theme.accentColor}
                onChange={(e) => setSettings({
                  ...settings,
                  theme: {
                    ...settings.theme,
                    accentColor: e.target.value
                  }
                })}
                className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
              />
              <input
                type="text"
                value={settings.theme.accentColor}
                onChange={(e) => setSettings({
                  ...settings,
                  theme: {
                    ...settings.theme,
                    accentColor: e.target.value
                  }
                })}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="#F59E0B"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const getFeatureDescription = (key: string): string => {
  const descriptions: Record<string, string> = {
    ocrEnabled: 'Automatically extract data from receipts and invoices',
    multiCurrency: 'Support for multiple currencies in expenses',
    advancedReporting: 'Access to detailed analytics and custom reports',
    apiAccess: 'Enable API access for third-party integrations',
    customCategories: 'Create and manage custom expense categories',
    bulkOperations: 'Perform bulk actions on multiple items'
  };
  
  return descriptions[key] || 'Feature description not available';
};

export default CompanySettingsPage; 