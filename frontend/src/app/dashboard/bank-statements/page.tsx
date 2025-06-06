'use client';

import React, { useState, useEffect } from 'react';
import { 
  CloudArrowUpIcon,
  DocumentIcon,
  ChartBarIcon,
  CogIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import StatementUpload from '../../../components/bankStatements/StatementUpload';
import StatementList from '../../../components/bankStatements/StatementList';
import bankStatementService, { 
  BankStatement, 
  ProcessingResult,
  StatementAnalytics 
} from '../../../services/bankStatementService';

const BankStatementsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'upload' | 'statements' | 'analytics'>('statements');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [analytics, setAnalytics] = useState<StatementAnalytics | null>(null);
  const [selectedStatement, setSelectedStatement] = useState<BankStatement | null>(null);
  const [notificationMessage, setNotificationMessage] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  useEffect(() => {
    loadAnalytics();
  }, [refreshTrigger]);

  const loadAnalytics = async () => {
    try {
      const response = await bankStatementService.getAnalytics({ days: 30 });
      if (response.success) {
        setAnalytics(response.summary);
      }
    } catch (error) {
      console.error('Error loading analytics:', error);
    }
  };

  const handleUploadComplete = (result: ProcessingResult) => {
    setNotificationMessage({
      type: 'success',
      message: `Successfully processed ${result.transactionCount} transactions from ${result.bankFormat} statement`
    });
    setRefreshTrigger(prev => prev + 1);
    setActiveTab('statements');
  };

  const handleUploadError = (error: string) => {
    setNotificationMessage({
      type: 'error',
      message: error
    });
  };

  const handleViewStatement = (statement: BankStatement) => {
    setSelectedStatement(statement);
    // In a real app, this would navigate to a detailed view
    console.log('View statement:', statement.id);
  };

  const handleDeleteStatement = (statementId: string) => {
    setNotificationMessage({
      type: 'success',
      message: 'Bank statement deleted successfully'
    });
    setRefreshTrigger(prev => prev + 1);
  };

  const dismissNotification = () => {
    setNotificationMessage(null);
  };

  const tabs = [
    {
      id: 'statements' as const,
      name: 'Statements',
      icon: DocumentIcon,
      count: analytics?.statements.total || 0
    },
    {
      id: 'upload' as const,
      name: 'Upload',
      icon: CloudArrowUpIcon
    },
    {
      id: 'analytics' as const,
      name: 'Analytics',
      icon: ChartBarIcon
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Bank Statement Processing</h1>
                <p className="mt-2 text-sm text-gray-600">
                  Upload and process bank statements from major financial institutions
                </p>
              </div>
              
              {analytics && (
                <div className="flex items-center space-x-6 text-sm">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">
                      {analytics.statements.total}
                    </div>
                    <div className="text-gray-500">Statements</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">
                      {analytics.transactions.total.toLocaleString()}
                    </div>
                    <div className="text-gray-500">Transactions</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">
                      {analytics.duplicates.total}
                    </div>
                    <div className="text-gray-500">Duplicates</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Notification */}
      {notificationMessage && (
        <div className="px-4 sm:px-6 lg:px-8 py-4">
          <div className={`rounded-md p-4 ${
            notificationMessage.type === 'success' ? 'bg-green-50 border border-green-200' :
            notificationMessage.type === 'error' ? 'bg-red-50 border border-red-200' :
            'bg-blue-50 border border-blue-200'
          }`}>
            <div className="flex">
              <div className="flex-shrink-0">
                <InformationCircleIcon className={`h-5 w-5 ${
                  notificationMessage.type === 'success' ? 'text-green-400' :
                  notificationMessage.type === 'error' ? 'text-red-400' :
                  'text-blue-400'
                }`} />
              </div>
              <div className="ml-3 flex-1">
                <p className={`text-sm font-medium ${
                  notificationMessage.type === 'success' ? 'text-green-800' :
                  notificationMessage.type === 'error' ? 'text-red-800' :
                  'text-blue-800'
                }`}>
                  {notificationMessage.message}
                </p>
              </div>
              <div className="ml-auto pl-3">
                <button
                  onClick={dismissNotification}
                  className={`inline-flex rounded-md p-1.5 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                    notificationMessage.type === 'success' ? 'text-green-500 hover:bg-green-100 focus:ring-green-600' :
                    notificationMessage.type === 'error' ? 'text-red-500 hover:bg-red-100 focus:ring-red-600' :
                    'text-blue-500 hover:bg-blue-100 focus:ring-blue-600'
                  }`}
                >
                  <span className="sr-only">Dismiss</span>
                  ×
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
                    isActive
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className={`mr-2 h-5 w-5 ${
                    isActive ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'
                  }`} />
                  {tab.name}
                  {tab.count !== undefined && (
                    <span className={`ml-2 py-0.5 px-2 rounded-full text-xs ${
                      isActive 
                        ? 'bg-blue-100 text-blue-600' 
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'upload' && (
          <StatementUpload
            onUploadComplete={handleUploadComplete}
            onUploadError={handleUploadError}
            maxFiles={5}
            autoProcess={true}
          />
        )}

        {activeTab === 'statements' && (
          <StatementList
            onViewStatement={handleViewStatement}
            onDeleteStatement={handleDeleteStatement}
            refreshTrigger={refreshTrigger}
          />
        )}

        {activeTab === 'analytics' && analytics && (
          <div className="space-y-6">
            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <DocumentIcon className="h-6 w-6 text-gray-400" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          Total Statements
                        </dt>
                        <dd className="text-lg font-medium text-gray-900">
                          {analytics.statements.total}
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
                      <ChartBarIcon className="h-6 w-6 text-gray-400" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          Total Transactions
                        </dt>
                        <dd className="text-lg font-medium text-gray-900">
                          {analytics.transactions.total.toLocaleString()}
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
                      <span className="text-green-500">$</span>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          Total Amount
                        </dt>
                        <dd className="text-lg font-medium text-gray-900">
                          {bankStatementService.formatAmount(analytics.transactions.totalAmount)}
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
                      <span className="text-yellow-500">⚠</span>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          Duplicates Detected
                        </dt>
                        <dd className="text-lg font-medium text-gray-900">
                          {analytics.duplicates.total}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Statement Status Breakdown */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Statement Status</h3>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  {analytics.statements.byStatus.map((statusStat) => {
                    const statusInfo = bankStatementService.getStatusInfo(statusStat.status);
                    return (
                      <div key={statusStat.status} className="text-center">
                        <div className="text-2xl font-bold text-gray-900">
                          {statusStat._count}
                        </div>
                        <div className={`text-sm font-medium ${statusInfo.color} inline-block px-2 py-1 rounded-full mt-1`}>
                          {statusInfo.label}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Processing Statistics */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Processing Statistics</h3>
                <p className="text-sm text-gray-600">
                  Last {analytics.period.days} days
                </p>
              </div>
              <div className="p-6">
                <dl className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">
                      Average Transactions per Statement
                    </dt>
                    <dd className="text-2xl font-bold text-gray-900">
                      {analytics.processing.averageTransactionsPerStatement.toFixed(1)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">
                      Average Transaction Amount
                    </dt>
                    <dd className="text-2xl font-bold text-gray-900">
                      {bankStatementService.formatAmount(analytics.transactions.averageAmount)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">
                      Processing Success Rate
                    </dt>
                    <dd className="text-2xl font-bold text-gray-900">
                      {analytics.statements.total > 0 
                        ? ((analytics.statements.byStatus.find(s => s.status === 'PROCESSED')?._count || 0) / analytics.statements.total * 100).toFixed(1)
                        : 0
                      }%
                    </dd>
                  </div>
                </dl>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <div className="flex">
                <div className="flex-shrink-0">
                  <InformationCircleIcon className="h-5 w-5 text-blue-400" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800">
                    Processing Tips
                  </h3>
                  <div className="mt-2 text-sm text-blue-700">
                    <ul className="list-disc list-inside space-y-1">
                      <li>CSV files from major banks are automatically detected and parsed</li>
                      <li>Excel files should have transaction data starting from row 1-2</li>
                      <li>PDF statements use OCR and may require manual review</li>
                      <li>Duplicate transactions are automatically flagged for review</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BankStatementsPage; 