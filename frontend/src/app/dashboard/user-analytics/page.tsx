'use client';

import React, { useState, useEffect } from 'react';
import { LineChart, BarChart, PieChart, AreaChart } from '../../../components/charts';
import { KPIWidget } from '../../../components/analytics/KPIWidget';

interface AnalyticsDashboardData {
  overview: {
    totalEvents: number;
    uniqueUsers: number;
    avgEventsPerUser: number;
  };
  pageViews: Array<{
    page: string;
    views: number;
  }>;
  featureUsage: Array<{
    feature: string;
    usage: number;
  }>;
  errors: Array<{
    type: string;
    count: number;
  }>;
  feedback: Array<{
    type: string;
    count: number;
  }>;
  performance: {
    averageLoadTime: number;
    averageDomContentLoaded: number;
    averageFirstContentfulPaint: number;
    averageTimeToInteractive: number;
  };
  onboarding: {
    totalUsers: number;
    averageTimeSpent: number;
  };
}

interface FeedbackAnalytics {
  overview: {
    totalFeedback: number;
    averageRating: number;
    surveyResponses: number;
    supportTickets: number;
  };
  feedbackBreakdown: {
    byType: Array<{ type: string; count: number; }>;
    byCategory: Array<{ category: string; count: number; }>;
  };
  supportTicketStatus: Array<{ status: string; count: number; }>;
  recentFeedback: Array<any>;
  npsMetrics: {
    npsScore: number;
    totalResponses: number;
    distribution: {
      promoters: number;
      passives: number;
      detractors: number;
    };
  };
}

export default function UserAnalyticsDashboard() {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsDashboardData | null>(null);
  const [feedbackData, setFeedbackData] = useState<FeedbackAnalytics | null>(null);
  const [featureAdoption, setFeatureAdoption] = useState<Array<any>>([]);
  const [errorLogs, setErrorLogs] = useState<Array<any>>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [dateRange, setDateRange] = useState({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchAnalyticsData();
  }, [dateRange]);

  const fetchAnalyticsData = async () => {
    setLoading(true);
    try {
      const [analyticsRes, feedbackRes, adoptionRes, errorsRes] = await Promise.all([
        fetch(`/api/user-analytics/dashboard?dateFrom=${dateRange.from}&dateTo=${dateRange.to}`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        }),
        fetch(`/api/user-analytics/feedback-analytics?dateFrom=${dateRange.from}&dateTo=${dateRange.to}`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        }),
        fetch(`/api/user-analytics/feature-adoption?dateFrom=${dateRange.from}&dateTo=${dateRange.to}`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        }),
        fetch('/api/user-analytics/error-logs?limit=50', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        })
      ]);

      const [analytics, feedback, adoption, errors] = await Promise.all([
        analyticsRes.ok ? analyticsRes.json() : null,
        feedbackRes.ok ? feedbackRes.json() : null,
        adoptionRes.ok ? adoptionRes.json() : null,
        errorsRes.ok ? errorsRes.json() : null
      ]);

      if (analytics?.success) setAnalyticsData(analytics.data);
      if (feedback?.success) setFeedbackData(feedback.data);
      if (adoption?.success) setFeatureAdoption(adoption.data);
      if (errors?.success) setErrorLogs(errors.data.errors);

    } catch (error) {
      console.error('Error fetching analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format: 'pdf' | 'excel') => {
    try {
      const response = await fetch('/api/user-analytics/feedback-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          reportType: 'custom',
          format,
          dateFrom: dateRange.from,
          dateTo: dateRange.to
        })
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `user-analytics-${dateRange.from}-${dateRange.to}.${format}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Error exporting report:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Analytics Dashboard</h1>
          <p className="text-gray-600">Track user behavior, feedback, and product performance</p>
        </div>

        <div className="flex items-center space-x-4 mt-4 md:mt-0">
          {/* Date Range Picker */}
          <div className="flex items-center space-x-2">
            <input
              type="date"
              value={dateRange.from}
              onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
            <span className="text-gray-500">to</span>
            <input
              type="date"
              value={dateRange.to}
              onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>

          {/* Export Buttons */}
          <div className="flex space-x-2">
            <button
              onClick={() => handleExport('excel')}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
            >
              Export Excel
            </button>
            <button
              onClick={() => handleExport('pdf')}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
            >
              Export PDF
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', name: 'Overview', icon: '📊' },
            { id: 'behavior', name: 'User Behavior', icon: '👥' },
            { id: 'feedback', name: 'Feedback & Support', icon: '💬' },
            { id: 'performance', name: 'Performance', icon: '⚡' },
            { id: 'errors', name: 'Error Tracking', icon: '🐛' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.name}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {activeTab === 'overview' && analyticsData && (
          <>
            {/* KPI Widgets */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <KPIWidget
                title="Total Events"
                value={analyticsData.overview.totalEvents}
                format="number"
                icon="📈"
                trend={{ value: 12, isPositive: true }}
              />
              <KPIWidget
                title="Unique Users"
                value={analyticsData.overview.uniqueUsers}
                format="number"
                icon="👥"
                trend={{ value: 8, isPositive: true }}
              />
              <KPIWidget
                title="Avg Events/User"
                value={analyticsData.overview.avgEventsPerUser}
                format="decimal"
                icon="⚡"
                trend={{ value: 5, isPositive: true }}
              />
              <KPIWidget
                title="Avg Load Time"
                value={analyticsData.performance.averageLoadTime}
                format="decimal"
                suffix="ms"
                icon="🚀"
                trend={{ value: 10, isPositive: false }}
              />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Page Views */}
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Popular Pages</h3>
                <BarChart
                  data={{
                    labels: analyticsData.pageViews.map(p => p.page),
                    datasets: [{
                      label: 'Page Views',
                      data: analyticsData.pageViews.map(p => p.views),
                      backgroundColor: '#3B82F6'
                    }]
                  }}
                  options={{
                    responsive: true,
                    plugins: {
                      legend: { display: false }
                    }
                  }}
                />
              </div>

              {/* Feature Usage */}
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Feature Usage</h3>
                <PieChart
                  data={{
                    labels: analyticsData.featureUsage.map(f => f.feature),
                    datasets: [{
                      data: analyticsData.featureUsage.map(f => f.usage),
                      backgroundColor: [
                        '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'
                      ]
                    }]
                  }}
                />
              </div>
            </div>
          </>
        )}

        {activeTab === 'behavior' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Feature Adoption */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Feature Adoption</h3>
              <div className="space-y-4">
                {featureAdoption.map((feature, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">{feature.feature}</span>
                    <div className="flex items-center space-x-3">
                      <div className="w-32 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${feature.adoptionRate}%` }}
                        />
                      </div>
                      <span className="text-sm text-gray-600">{feature.adoptionRate.toFixed(1)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Onboarding Stats */}
            {analyticsData && (
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Onboarding Metrics</h3>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Users</span>
                    <span className="font-semibold">{analyticsData.onboarding.totalUsers}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Avg Time Spent</span>
                    <span className="font-semibold">{Math.round(analyticsData.onboarding.averageTimeSpent / 60)} min</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'feedback' && feedbackData && (
          <>
            {/* Feedback KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <KPIWidget
                title="Total Feedback"
                value={feedbackData.overview.totalFeedback}
                format="number"
                icon="💬"
              />
              <KPIWidget
                title="Avg Rating"
                value={feedbackData.overview.averageRating}
                format="decimal"
                suffix="/5"
                icon="⭐"
              />
              <KPIWidget
                title="NPS Score"
                value={feedbackData.npsMetrics.npsScore}
                format="number"
                icon="📊"
                trend={{
                  value: feedbackData.npsMetrics.npsScore > 0 ? 5 : -3,
                  isPositive: feedbackData.npsMetrics.npsScore > 0
                }}
              />
              <KPIWidget
                title="Support Tickets"
                value={feedbackData.overview.supportTickets}
                format="number"
                icon="🎫"
              />
            </div>

            {/* Feedback Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Feedback by Type</h3>
                <PieChart
                  data={{
                    labels: feedbackData.feedbackBreakdown.byType.map(f => f.type),
                    datasets: [{
                      data: feedbackData.feedbackBreakdown.byType.map(f => f.count),
                      backgroundColor: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444']
                    }]
                  }}
                />
              </div>

              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Support Ticket Status</h3>
                <BarChart
                  data={{
                    labels: feedbackData.supportTicketStatus.map(s => s.status),
                    datasets: [{
                      label: 'Tickets',
                      data: feedbackData.supportTicketStatus.map(s => s.count),
                      backgroundColor: '#10B981'
                    }]
                  }}
                />
              </div>
            </div>

            {/* Recent Feedback */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Feedback</h3>
              <div className="space-y-4">
                {feedbackData.recentFeedback.slice(0, 5).map((feedback, index) => (
                  <div key={index} className="border-l-4 border-blue-500 pl-4 py-2">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="text-sm font-medium text-gray-900">{feedback.type}</span>
                      {feedback.rating && (
                        <div className="flex text-yellow-400">
                          {Array.from({ length: feedback.rating }).map((_, i) => (
                            <span key={i}>⭐</span>
                          ))}
                        </div>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">{feedback.content}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {feedback.user?.firstName} {feedback.user?.lastName} • {new Date(feedback.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {activeTab === 'performance' && analyticsData && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Metrics</h3>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">Average Load Time</span>
                  <span className="font-semibold">{analyticsData.performance.averageLoadTime.toFixed(2)}ms</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">DOM Content Loaded</span>
                  <span className="font-semibold">{analyticsData.performance.averageDomContentLoaded.toFixed(2)}ms</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">First Contentful Paint</span>
                  <span className="font-semibold">{analyticsData.performance.averageFirstContentfulPaint.toFixed(2)}ms</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Time to Interactive</span>
                  <span className="font-semibold">{analyticsData.performance.averageTimeToInteractive.toFixed(2)}ms</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'errors' && (
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Errors</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Error Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Message
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Page
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Severity
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Time
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {errorLogs.map((error, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {error.errorType}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {error.errorMessage.substring(0, 100)}...
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {error.page}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          error.severity === 'critical' ? 'bg-red-100 text-red-800' :
                          error.severity === 'error' ? 'bg-orange-100 text-orange-800' :
                          error.severity === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {error.severity}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(error.timestamp).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 