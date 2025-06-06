import { useCallback, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface EventData {
  eventType: string;
  eventName: string;
  page?: string;
  feature?: string;
  metadata?: Record<string, any>;
  sessionId?: string;
}

interface PageViewData {
  page: string;
  referrer?: string;
  loadTime?: number;
  sessionId?: string;
  metadata?: Record<string, any>;
  performanceMetrics?: {
    domContentLoaded?: number;
    firstContentfulPaint?: number;
    timeToInteractive?: number;
  };
}

interface FeatureUsageData {
  feature: string;
  action: string;
  duration?: number;
  success?: boolean;
  sessionId?: string;
  metadata?: Record<string, any>;
}

interface ErrorData {
  errorType: string;
  errorMessage: string;
  errorStack?: string;
  page?: string;
  feature?: string;
  severity?: 'info' | 'warning' | 'error' | 'critical';
  metadata?: Record<string, any>;
}

interface OnboardingStepData {
  step: number;
  stepName: string;
  completed: boolean;
  timeSpent?: number;
  sessionId?: string;
  metadata?: Record<string, any>;
}

export const useAnalytics = () => {
  const router = useRouter();
  const pathname = usePathname();
  const sessionIdRef = useRef<string>('');
  const pageStartTimeRef = useRef<number>(0);
  const featureStartTimeRef = useRef<Record<string, number>>({});

  // Initialize session ID
  useEffect(() => {
    if (!sessionIdRef.current) {
      sessionIdRef.current = generateSessionId();
    }
  }, []);

  // Track page views automatically
  useEffect(() => {
    const handleRouteChange = (url: string) => {
      const loadTime = performance.now() - pageStartTimeRef.current;
      
      trackPageView({
        page: url,
        referrer: document.referrer,
        loadTime,
        sessionId: sessionIdRef.current,
        performanceMetrics: getPerformanceMetrics()
      });

      pageStartTimeRef.current = performance.now();
    };

    // Track initial page load and subsequent navigation
    pageStartTimeRef.current = performance.now();
    handleRouteChange(pathname);
  }, [pathname]);

  // Track errors automatically
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      trackError({
        errorType: 'javascript_error',
        errorMessage: event.message,
        errorStack: event.error?.stack,
        page: pathname,
        severity: 'error',
        metadata: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno
        }
      });
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      trackError({
        errorType: 'unhandled_promise_rejection',
        errorMessage: event.reason?.message || 'Unhandled promise rejection',
        errorStack: event.reason?.stack,
        page: pathname,
        severity: 'error',
        metadata: {
          reason: event.reason
        }
      });
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, [pathname]);

  const trackEvent = useCallback(async (eventData: EventData) => {
    try {
      const response = await fetch('/api/user-analytics/track-event', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          ...eventData,
          sessionId: eventData.sessionId || sessionIdRef.current,
          page: eventData.page || pathname,
          timestamp: new Date().toISOString()
        })
      });

      if (!response.ok) {
        console.warn('Failed to track event:', eventData);
      }
    } catch (error) {
      console.warn('Error tracking event:', error);
    }
  }, [pathname]);

  const trackPageView = useCallback(async (pageData: PageViewData) => {
    try {
      await fetch('/api/user-analytics/track-page-view', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          ...pageData,
          sessionId: pageData.sessionId || sessionIdRef.current,
          timestamp: new Date().toISOString()
        })
      });
    } catch (error) {
      console.warn('Error tracking page view:', error);
    }
  }, []);

  const trackFeatureUsage = useCallback(async (featureData: FeatureUsageData) => {
    try {
      await fetch('/api/user-analytics/track-feature-usage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          ...featureData,
          sessionId: featureData.sessionId || sessionIdRef.current,
          timestamp: new Date().toISOString()
        })
      });
    } catch (error) {
      console.warn('Error tracking feature usage:', error);
    }
  }, []);

  const trackError = useCallback(async (errorData: ErrorData) => {
    try {
      await fetch('/api/user-analytics/track-error', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          ...errorData,
          sessionId: sessionIdRef.current,
          page: errorData.page || pathname,
          timestamp: new Date().toISOString()
        })
      });
    } catch (error) {
      console.warn('Error tracking error:', error);
    }
  }, [pathname]);

  const trackOnboardingStep = useCallback(async (stepData: OnboardingStepData) => {
    try {
      await fetch('/api/user-analytics/track-onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          ...stepData,
          sessionId: stepData.sessionId || sessionIdRef.current,
          timestamp: new Date().toISOString()
        })
      });
    } catch (error) {
      console.warn('Error tracking onboarding step:', error);
    }
  }, []);

  // Helper functions for feature timing
  const startFeatureTimer = useCallback((feature: string) => {
    featureStartTimeRef.current[feature] = performance.now();
  }, []);

  const endFeatureTimer = useCallback((feature: string, action: string, success: boolean = true, metadata?: Record<string, any>) => {
    const startTime = featureStartTimeRef.current[feature];
    if (startTime) {
      const duration = performance.now() - startTime;
      delete featureStartTimeRef.current[feature];
      
      trackFeatureUsage({
        feature,
        action,
        duration,
        success,
        metadata
      });
    }
  }, [trackFeatureUsage]);

  // Utility functions
  const generateSessionId = (): string => {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  const getPerformanceMetrics = () => {
    if (typeof window !== 'undefined' && 'performance' in window) {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const paint = performance.getEntriesByType('paint');
      
      return {
        domContentLoaded: navigation?.domContentLoadedEventEnd - navigation?.domContentLoadedEventStart,
        firstContentfulPaint: paint.find(entry => entry.name === 'first-contentful-paint')?.startTime,
        timeToInteractive: navigation?.loadEventEnd - navigation?.navigationStart
      };
    }
    return {};
  };

  return {
    trackEvent,
    trackPageView,
    trackFeatureUsage,
    trackError,
    trackOnboardingStep,
    startFeatureTimer,
    endFeatureTimer,
    sessionId: sessionIdRef.current
  };
}; 