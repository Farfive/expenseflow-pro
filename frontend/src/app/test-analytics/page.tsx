'use client';

import React, { useState } from 'react';
import { FeedbackWidget } from '../../components/feedback/FeedbackWidget';
import { AnalyticsProvider } from '../../components/analytics/AnalyticsProvider';
import { useAnalytics } from '../../hooks/useAnalytics';
import { OnboardingProvider, OnboardingChecklist, OnboardingProgressIndicator } from '../../components/onboarding/OnboardingTracker';

const TestAnalyticsContent: React.FC = () => {
  const { trackEvent, trackFeatureUsage, trackError, startFeatureTimer, endFeatureTimer } = useAnalytics();
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    setLogs(prev => [`${new Date().toLocaleTimeString()}: ${message}`, ...prev.slice(0, 9)]);
  };

  const testTrackEvent = async () => {
    try {
      await trackEvent({
        eventType: 'test_event',
        eventName: 'Manual Test Event',
        feature: 'analytics_testing',
        metadata: {
          testType: 'manual',
          userAction: 'button_click'
        }
      });
      addLog('✅ Event tracked successfully');
    } catch (error) {
      addLog(`❌ Error tracking event: ${error}`);
    }
  };

  const testFeatureUsage = async () => {
    try {
      startFeatureTimer('test_feature');
      
      // Simulate some work
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      endFeatureTimer('test_feature', 'test_action', true, {
        testData: 'success'
      });
      addLog('✅ Feature usage tracked successfully');
    } catch (error) {
      addLog(`❌ Error tracking feature usage: ${error}`);
    }
  };

  const testErrorTracking = async () => {
    try {
      await trackError({
        errorType: 'test_error',
        errorMessage: 'This is a test error for analytics testing',
        severity: 'warning',
        metadata: {
          testError: true,
          context: 'manual_testing'
        }
      });
      addLog('✅ Error tracked successfully');
    } catch (error) {
      addLog(`❌ Error tracking error: ${error}`);
    }
  };

  const testJavaScriptError = () => {
    try {
      // This will cause a JavaScript error
      (window as any).nonExistentFunction();
    } catch (error) {
      addLog('✅ JavaScript error should be automatically tracked');
    }
  };

  const testFeedbackSubmission = () => {
    addLog('💬 Feedback widget opened - try submitting feedback');
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Analytics System Test Page</h1>
        
        {/* Test Controls */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Test Controls</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <button
              onClick={testTrackEvent}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Test Event Tracking
            </button>
            
            <button
              onClick={testFeatureUsage}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Test Feature Usage
            </button>
            
            <button
              onClick={testErrorTracking}
              className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
            >
              Test Error Tracking
            </button>
            
            <button
              onClick={testJavaScriptError}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Test JS Error Capture
            </button>
            
            <button
              onClick={testFeedbackSubmission}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              Test Feedback Widget
            </button>

            <button
              onClick={() => {
                localStorage.clear();
                setLogs([]);
                addLog('🗑️ Local storage cleared and logs reset');
              }}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              Clear Storage & Logs
            </button>
          </div>
        </div>

        {/* Activity Log */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Activity Log</h2>
          <div className="bg-gray-100 rounded-lg p-4 h-64 overflow-y-auto">
            {logs.length === 0 ? (
              <p className="text-gray-500 italic">No activity yet. Click the test buttons above to start tracking events.</p>
            ) : (
              <div className="space-y-1">
                {logs.map((log, index) => (
                  <div key={index} className="text-sm font-mono text-gray-800">
                    {log}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Performance Metrics Display */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Performance Metrics</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-medium text-blue-900">Page Load Time</h3>
              <p className="text-2xl font-bold text-blue-600">
                {typeof window !== 'undefined' && window.performance ? 
                  `${Math.round(window.performance.now())}ms` : 'N/A'
                }
              </p>
            </div>
            
            <div className="bg-green-50 p-4 rounded-lg">
              <h3 className="font-medium text-green-900">Navigation Timing</h3>
              <p className="text-2xl font-bold text-green-600">
                {typeof window !== 'undefined' && window.performance?.navigation ? 
                  window.performance.navigation.type === 0 ? 'Navigate' : 'Reload' : 'N/A'
                }
              </p>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-blue-900 mb-4">Testing Instructions</h2>
          <ol className="list-decimal list-inside space-y-2 text-blue-800">
            <li>Click the test buttons above to verify analytics tracking is working</li>
            <li>Check the Activity Log to see the results of each test</li>
            <li>Open browser Developer Tools → Network tab to see API calls being made</li>
            <li>Try the feedback widget by clicking the "Test Feedback Widget" button and then the floating button</li>
            <li>The JavaScript error test will trigger automatic error tracking</li>
            <li>Check the backend logs to see server-side processing</li>
            <li>Visit the Analytics Dashboard at <code className="bg-white px-2 py-1 rounded">/dashboard/user-analytics</code></li>
          </ol>
        </div>
      </div>

      {/* Feedback Widget */}
      <FeedbackWidget position="bottom-right" />
    </div>
  );
};

const onboardingSteps = [
  {
    id: 1,
    name: 'welcome',
    title: 'Welcome to ExpenseFlow Pro',
    description: 'Get started with your expense management journey',
    required: true
  },
  {
    id: 2,
    name: 'profile_setup',
    title: 'Set Up Your Profile',
    description: 'Complete your profile information',
    required: true
  },
  {
    id: 3,
    name: 'first_expense',
    title: 'Submit Your First Expense',
    description: 'Learn how to submit expenses',
    required: false
  }
];

export default function TestAnalyticsPage() {
  return (
    <AnalyticsProvider>
      <OnboardingProvider steps={onboardingSteps} autoStart={false}>
        <div>
          <OnboardingProgressIndicator />
          <TestAnalyticsContent />
          
          {/* Onboarding Demo */}
          <div className="max-w-4xl mx-auto px-4 mt-8">
            <OnboardingChecklist />
          </div>
        </div>
      </OnboardingProvider>
    </AnalyticsProvider>
  );
} 