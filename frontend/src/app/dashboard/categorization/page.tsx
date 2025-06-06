'use client';

import React, { useState, useEffect } from 'react';
import { 
  ChartBarIcon,
  TagIcon,
  UsersIcon,
  LightBulbIcon,
  Cog6ToothIcon,
  DocumentTextIcon,
  TrendingUpIcon
} from '@heroicons/react/24/outline';
import CategoryManager from '../../../components/categorization/CategoryManager';
import categorizationService, { 
  CategorizationInsights, 
  VendorCategory 
} from '../../../services/categorizationService';

const CategorizationPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'categories' | 'insights' | 'vendors' | 'settings'>('categories');
  const [insights, setInsights] = useState<CategorizationInsights | null>(null);
  const [vendors, setVendors] = useState<VendorCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [insightsRes, vendorsRes] = await Promise.all([
        categorizationService.getInsights(30),
        categorizationService.getVendors({ limit: 20 })
      ]);

      if (insightsRes.success) {
        setInsights(insightsRes.insights);
      }

      if (vendorsRes.success) {
        setVendors(vendorsRes.vendors);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'categories', name: 'Categories', icon: TagIcon },
    { id: 'insights', name: 'Insights', icon: ChartBarIcon },
    { id: 'vendors', name: 'Vendors', icon: UsersIcon },
    { id: 'settings', name: 'Settings', icon: Cog6ToothIcon }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">ML Categorization</h1>
        <p className="text-gray-600 mt-2">
          Manage expense categories with machine learning-powered automatic categorization
        </p>
      </div>

      {/* Quick Stats */}
      {insights && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <TagIcon className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Active Categories
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {insights.categoryDistribution.length}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <DocumentTextIcon className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Total Expenses
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {insights.categoryDistribution.reduce((sum, cat) => sum + cat.count, 0)}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <TrendingUpIcon className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Learning Corrections
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {insights.learningCount}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <UsersIcon className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Known Vendors
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {insights.topVendors.length}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="w-5 h-5 mr-2" />
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === 'categories' && (
          <CategoryManager onCategoryChange={loadData} />
        )}

        {activeTab === 'insights' && insights && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900">Categorization Analytics</h2>
            
            {/* Category Distribution Chart */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Category Distribution (Last 30 Days)
              </h3>
              <div className="space-y-4">
                {insights.categoryDistribution.map((item, index) => (
                  <div key={index} className="flex items-center">
                    <div className="w-32 text-sm font-medium text-gray-900 truncate">
                      {categorizationService.formatCategoryName(item.category?.name || 'Unknown')}
                    </div>
                    <div className="flex-1 mx-4">
                      <div className="bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full"
                          style={{
                            width: `${(item.count / Math.max(...insights.categoryDistribution.map(c => c.count))) * 100}%`
                          }}
                        />
                      </div>
                    </div>
                    <div className="w-16 text-sm text-gray-500 text-right">
                      {item.count} expenses
                    </div>
                    <div className="w-24 text-sm text-gray-500 text-right">
                      ${item.totalAmount?.toFixed(2) || '0.00'}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Confidence Statistics */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Categorization Confidence
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {insights.confidenceStats.map((stat, index) => (
                  <div key={index} className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {stat._avg.confidenceScore ? `${Math.round(stat._avg.confidenceScore * 100)}%` : 'N/A'}
                    </div>
                    <div className="text-sm text-gray-500 capitalize">
                      {stat.status.replace('_', ' ')}
                    </div>
                    <div className="text-xs text-gray-400">
                      {stat._count} documents
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Vendors */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Most Active Vendors
              </h3>
              <div className="space-y-3">
                {insights.topVendors.slice(0, 10).map((vendor, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-sm font-medium text-blue-600">
                        {index + 1}
                      </div>
                      <div className="ml-3">
                        <div className="text-sm font-medium text-gray-900">
                          {vendor.vendorName}
                        </div>
                        <div className="text-xs text-gray-500">
                          {categorizationService.formatCategoryName(vendor.category)}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-900">
                        {vendor.usageCount} uses
                      </div>
                      <div className="text-xs text-gray-500">
                        {categorizationService.getConfidenceDisplay(vendor.confidence)} confidence
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'vendors' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">Vendor Management</h2>
              <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                Add Vendor Mapping
              </button>
            </div>

            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Known Vendors</h3>
              </div>
              <div className="divide-y divide-gray-200">
                {vendors.map((vendor) => (
                  <div key={vendor.id} className="px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                          <UsersIcon className="w-5 h-5 text-gray-500" />
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {vendor.vendorName}
                        </div>
                        <div className="text-sm text-gray-500">
                          {categorizationService.formatCategoryName(vendor.category)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <div className="text-sm text-gray-900">
                          {vendor.usageCount} uses
                        </div>
                        <div className="text-xs text-gray-500">
                          {categorizationService.getConfidenceDisplay(vendor.confidence)} confidence
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        {vendor.isVerified && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Verified
                          </span>
                        )}
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          vendor.companyId ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {vendor.companyId ? 'Company' : 'Global'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900">Categorization Settings</h2>
            
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Machine Learning Configuration
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-gray-900">Auto-categorization</div>
                    <div className="text-sm text-gray-500">
                      Automatically categorize documents with high confidence
                    </div>
                  </div>
                  <button className="relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 bg-blue-600">
                    <span className="translate-x-5 pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200"></span>
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-gray-900">Learning from corrections</div>
                    <div className="text-sm text-gray-500">
                      Improve predictions based on manual corrections
                    </div>
                  </div>
                  <button className="relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 bg-blue-600">
                    <span className="translate-x-5 pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200"></span>
                  </button>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Confidence Threshold
                  </label>
                  <div className="mt-1">
                    <input
                      type="range"
                      min="0.5"
                      max="0.95"
                      step="0.05"
                      defaultValue="0.8"
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>50%</span>
                      <span>80%</span>
                      <span>95%</span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    Documents with confidence below this threshold will require manual review
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Training Data Management
              </h3>
              <div className="space-y-4">
                <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                  Export Training Data
                </button>
                <button className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 ml-3">
                  Retrain Model
                </button>
                <p className="text-sm text-gray-500">
                  Export your company's categorization data or retrain the model with recent corrections.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CategorizationPage; 