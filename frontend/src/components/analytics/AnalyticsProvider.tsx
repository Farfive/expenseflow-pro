'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useAnalytics } from '../../hooks/useAnalytics';

interface ABTestVariant {
  name: string;
  weight: number;
}

interface ABTestConfig {
  [testName: string]: {
    variants: ABTestVariant[];
    defaultVariant: string;
  };
}

interface AnalyticsContextValue {
  trackEvent: (eventData: any) => void;
  trackFeatureUsage: (featureData: any) => void;
  getABTestVariant: (testName: string) => Promise<string>;
  abTestVariants: Record<string, string>;
  isInitialized: boolean;
}

const AnalyticsContext = createContext<AnalyticsContextValue | undefined>(undefined);

interface AnalyticsProviderProps {
  children: ReactNode;
  abTestConfig?: ABTestConfig;
}

export const AnalyticsProvider: React.FC<AnalyticsProviderProps> = ({
  children,
  abTestConfig = {}
}) => {
  const { trackEvent, trackFeatureUsage } = useAnalytics();
  const [abTestVariants, setAbTestVariants] = useState<Record<string, string>>({});
  const [isInitialized, setIsInitialized] = useState(false);

  const getABTestVariant = async (testName: string): Promise<string> => {
    // Check if we already have a variant for this test
    if (abTestVariants[testName]) {
      return abTestVariants[testName];
    }

    try {
      const response = await fetch(`/api/user-analytics/ab-test/${testName}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        const variant = data.data?.variant || abTestConfig[testName]?.defaultVariant || 'control';
        
        setAbTestVariants(prev => ({
          ...prev,
          [testName]: variant
        }));

        return variant;
      }
    } catch (error) {
      console.error('Error getting A/B test variant:', error);
    }

    // Fallback to default variant or control
    return abTestConfig[testName]?.defaultVariant || 'control';
  };

  // Initialize A/B tests on mount
  useEffect(() => {
    const initializeABTests = async () => {
      const testNames = Object.keys(abTestConfig);
      
      if (testNames.length > 0) {
        const variants: Record<string, string> = {};
        
        for (const testName of testNames) {
          const variant = await getABTestVariant(testName);
          variants[testName] = variant;
        }
        
        setAbTestVariants(variants);
      }
      
      setIsInitialized(true);
    };

    initializeABTests();
  }, [abTestConfig]);

  const contextValue: AnalyticsContextValue = {
    trackEvent,
    trackFeatureUsage,
    getABTestVariant,
    abTestVariants,
    isInitialized
  };

  return (
    <AnalyticsContext.Provider value={contextValue}>
      {children}
    </AnalyticsContext.Provider>
  );
};

export const useAnalyticsContext = () => {
  const context = useContext(AnalyticsContext);
  if (context === undefined) {
    throw new Error('useAnalyticsContext must be used within an AnalyticsProvider');
  }
  return context;
};

// Higher-order component for A/B testing
export const withABTest = <P extends object>(
  Component: React.ComponentType<P>,
  testName: string,
  variants: Record<string, React.ComponentType<P>>
) => {
  return (props: P) => {
    const { getABTestVariant, abTestVariants, isInitialized } = useAnalyticsContext();
    const [currentVariant, setCurrentVariant] = useState<string>('control');

    useEffect(() => {
      const loadVariant = async () => {
        if (abTestVariants[testName]) {
          setCurrentVariant(abTestVariants[testName]);
        } else {
          const variant = await getABTestVariant(testName);
          setCurrentVariant(variant);
        }
      };

      if (isInitialized) {
        loadVariant();
      }
    }, [testName, isInitialized, abTestVariants]);

    const VariantComponent = variants[currentVariant] || Component;
    return <VariantComponent {...props} />;
  };
};

// Hook for A/B testing
export const useABTest = (testName: string) => {
  const { getABTestVariant, abTestVariants, trackEvent } = useAnalyticsContext();
  const [variant, setVariant] = useState<string>('control');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadVariant = async () => {
      setIsLoading(true);
      try {
        if (abTestVariants[testName]) {
          setVariant(abTestVariants[testName]);
        } else {
          const testVariant = await getABTestVariant(testName);
          setVariant(testVariant);
        }
      } catch (error) {
        console.error('Error loading A/B test variant:', error);
        setVariant('control');
      } finally {
        setIsLoading(false);
      }
    };

    loadVariant();
  }, [testName, getABTestVariant, abTestVariants]);

  const trackConversion = async (conversionType: string = 'conversion', value: number = 1, metadata?: Record<string, any>) => {
    try {
      await fetch(`/api/user-analytics/ab-test/${testName}/conversion`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          eventType: conversionType,
          value,
          metadata
        })
      });

      trackEvent({
        eventType: 'ab_test_conversion',
        eventName: `A/B Test Conversion: ${testName}`,
        feature: 'experimentation',
        metadata: {
          testName,
          variant,
          conversionType,
          value,
          ...metadata
        }
      });
    } catch (error) {
      console.error('Error tracking A/B test conversion:', error);
    }
  };

  return {
    variant,
    isLoading,
    trackConversion,
    isControl: variant === 'control',
    isVariant: (variantName: string) => variant === variantName
  };
}; 