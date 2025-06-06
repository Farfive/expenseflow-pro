'use client';

import React, { useEffect, useState, createContext, useContext, ReactNode } from 'react';
import { useAnalytics } from '../../hooks/useAnalytics';

interface OnboardingStep {
  id: number;
  name: string;
  title: string;
  description?: string;
  required: boolean;
  component?: React.ComponentType<any>;
}

interface OnboardingProgress {
  currentStep: number;
  completedSteps: number[];
  totalSteps: number;
  startedAt: Date;
  completedAt?: Date;
  totalTimeSpent: number;
}

interface OnboardingContextValue {
  steps: OnboardingStep[];
  progress: OnboardingProgress;
  currentStep: OnboardingStep | null;
  nextStep: () => void;
  previousStep: () => void;
  completeStep: (stepId: number, metadata?: Record<string, any>) => void;
  skipStep: (stepId: number, reason?: string) => void;
  restartOnboarding: () => void;
  isCompleted: boolean;
  isLoading: boolean;
}

const OnboardingContext = createContext<OnboardingContextValue | undefined>(undefined);

interface OnboardingProviderProps {
  children: ReactNode;
  steps: OnboardingStep[];
  autoStart?: boolean;
  onComplete?: (progress: OnboardingProgress) => void;
  onStepChange?: (step: OnboardingStep, progress: OnboardingProgress) => void;
}

export const OnboardingProvider: React.FC<OnboardingProviderProps> = ({
  children,
  steps,
  autoStart = true,
  onComplete,
  onStepChange
}) => {
  const { trackOnboardingStep } = useAnalytics();
  const [progress, setProgress] = useState<OnboardingProgress>({
    currentStep: 0,
    completedSteps: [],
    totalSteps: steps.length,
    startedAt: new Date(),
    totalTimeSpent: 0
  });
  const [stepStartTime, setStepStartTime] = useState<number>(Date.now());
  const [isLoading, setIsLoading] = useState(true);

  // Load saved progress from localStorage
  useEffect(() => {
    const savedProgress = localStorage.getItem('onboarding_progress');
    if (savedProgress) {
      try {
        const parsed = JSON.parse(savedProgress);
        setProgress({
          ...parsed,
          startedAt: new Date(parsed.startedAt),
          completedAt: parsed.completedAt ? new Date(parsed.completedAt) : undefined
        });
      } catch (error) {
        console.error('Error loading onboarding progress:', error);
      }
    } else if (autoStart) {
      // Start onboarding automatically
      const initialProgress = {
        currentStep: 0,
        completedSteps: [],
        totalSteps: steps.length,
        startedAt: new Date(),
        totalTimeSpent: 0
      };
      setProgress(initialProgress);
      localStorage.setItem('onboarding_progress', JSON.stringify(initialProgress));
    }
    setIsLoading(false);
  }, [autoStart, steps.length]);

  // Save progress to localStorage whenever it changes
  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem('onboarding_progress', JSON.stringify(progress));
    }
  }, [progress, isLoading]);

  // Track step changes
  useEffect(() => {
    if (!isLoading && steps[progress.currentStep]) {
      setStepStartTime(Date.now());
      onStepChange?.(steps[progress.currentStep], progress);
    }
  }, [progress.currentStep, isLoading, steps, onStepChange]);

  const currentStep = steps[progress.currentStep] || null;
  const isCompleted = progress.completedAt !== undefined;

  const completeStep = async (stepId: number, metadata: Record<string, any> = {}) => {
    const step = steps.find(s => s.id === stepId);
    if (!step) return;

    const timeSpent = Date.now() - stepStartTime;
    const newProgress = {
      ...progress,
      completedSteps: [...progress.completedSteps, stepId],
      totalTimeSpent: progress.totalTimeSpent + timeSpent
    };

    // Track the step completion
    await trackOnboardingStep({
      step: stepId,
      stepName: step.name,
      completed: true,
      timeSpent,
      metadata: {
        ...metadata,
        title: step.title,
        required: step.required
      }
    });

    // Check if all required steps are completed
    const requiredSteps = steps.filter(s => s.required);
    const completedRequiredSteps = requiredSteps.filter(s => 
      [...newProgress.completedSteps, stepId].includes(s.id)
    );

    if (completedRequiredSteps.length === requiredSteps.length) {
      // Onboarding completed
      newProgress.completedAt = new Date();
      localStorage.removeItem('onboarding_progress');
      onComplete?.(newProgress);
    }

    setProgress(newProgress);
  };

  const skipStep = async (stepId: number, reason: string = 'user_skipped') => {
    const step = steps.find(s => s.id === stepId);
    if (!step || step.required) return; // Can't skip required steps

    const timeSpent = Date.now() - stepStartTime;

    await trackOnboardingStep({
      step: stepId,
      stepName: step.name,
      completed: false,
      timeSpent,
      metadata: {
        skipped: true,
        skipReason: reason,
        title: step.title
      }
    });

    nextStep();
  };

  const nextStep = () => {
    if (progress.currentStep < steps.length - 1) {
      setProgress(prev => ({
        ...prev,
        currentStep: prev.currentStep + 1
      }));
    }
  };

  const previousStep = () => {
    if (progress.currentStep > 0) {
      setProgress(prev => ({
        ...prev,
        currentStep: prev.currentStep - 1
      }));
    }
  };

  const restartOnboarding = () => {
    const newProgress = {
      currentStep: 0,
      completedSteps: [],
      totalSteps: steps.length,
      startedAt: new Date(),
      totalTimeSpent: 0
    };
    setProgress(newProgress);
    localStorage.setItem('onboarding_progress', JSON.stringify(newProgress));
  };

  const contextValue: OnboardingContextValue = {
    steps,
    progress,
    currentStep,
    nextStep,
    previousStep,
    completeStep,
    skipStep,
    restartOnboarding,
    isCompleted,
    isLoading
  };

  return (
    <OnboardingContext.Provider value={contextValue}>
      {children}
    </OnboardingContext.Provider>
  );
};

export const useOnboarding = () => {
  const context = useContext(OnboardingContext);
  if (context === undefined) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
};

// Onboarding Progress Indicator Component
export const OnboardingProgressIndicator: React.FC = () => {
  const { progress, steps, isCompleted } = useOnboarding();

  if (isCompleted) return null;

  const completionPercentage = (progress.completedSteps.length / progress.totalSteps) * 100;

  return (
    <div className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-gray-900">Setup Progress</h3>
        <span className="text-sm text-gray-600">
          {progress.completedSteps.length} of {progress.totalSteps} completed
        </span>
      </div>
      
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${completionPercentage}%` }}
        />
      </div>

      <div className="mt-3 flex space-x-2">
        {steps.map((step, index) => (
          <div
            key={step.id}
            className={`flex-1 h-1 rounded ${
              progress.completedSteps.includes(step.id)
                ? 'bg-green-500'
                : index === progress.currentStep
                ? 'bg-blue-500'
                : 'bg-gray-300'
            }`}
          />
        ))}
      </div>
    </div>
  );
};

// Onboarding Step Wrapper Component
interface OnboardingStepProps {
  stepId: number;
  children: ReactNode;
  className?: string;
}

export const OnboardingStepWrapper: React.FC<OnboardingStepProps> = ({
  stepId,
  children,
  className = ''
}) => {
  const { currentStep, completeStep, skipStep, nextStep, previousStep, steps } = useOnboarding();

  if (!currentStep || currentStep.id !== stepId) {
    return null;
  }

  const step = steps.find(s => s.id === stepId);
  if (!step) return null;

  const handleComplete = (metadata?: Record<string, any>) => {
    completeStep(stepId, metadata);
    nextStep();
  };

  const handleSkip = (reason?: string) => {
    skipStep(stepId, reason);
  };

  return (
    <div className={`onboarding-step ${className}`}>
      <div className="bg-white rounded-lg shadow-lg border-2 border-blue-500 p-6">
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-gray-900">{step.title}</h2>
          {step.description && (
            <p className="text-gray-600 mt-1">{step.description}</p>
          )}
        </div>

        <div className="mb-6">
          {children}
        </div>

        <div className="flex items-center justify-between">
          <button
            onClick={previousStep}
            disabled={currentStep.id === steps[0].id}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>

          <div className="flex space-x-3">
            {!step.required && (
              <button
                onClick={() => handleSkip()}
                className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Skip
              </button>
            )}
            
            <button
              onClick={() => handleComplete()}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
            >
              {step.required ? 'Continue' : 'Complete'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Onboarding Checklist Component
export const OnboardingChecklist: React.FC = () => {
  const { steps, progress, completeStep, currentStep } = useOnboarding();

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Getting Started Checklist</h3>
      
      <div className="space-y-3">
        {steps.map((step) => {
          const isCompleted = progress.completedSteps.includes(step.id);
          const isCurrent = currentStep?.id === step.id;
          
          return (
            <div
              key={step.id}
              className={`flex items-center p-3 rounded-lg border ${
                isCompleted
                  ? 'bg-green-50 border-green-200'
                  : isCurrent
                  ? 'bg-blue-50 border-blue-200'
                  : 'bg-gray-50 border-gray-200'
              }`}
            >
              <div className="mr-3">
                {isCompleted ? (
                  <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                ) : isCurrent ? (
                  <div className="w-5 h-5 bg-blue-500 rounded-full" />
                ) : (
                  <div className="w-5 h-5 bg-gray-300 rounded-full" />
                )}
              </div>
              
              <div className="flex-1">
                <h4 className={`font-medium ${
                  isCompleted ? 'text-green-800' : isCurrent ? 'text-blue-800' : 'text-gray-700'
                }`}>
                  {step.title}
                  {step.required && <span className="text-red-500 ml-1">*</span>}
                </h4>
                {step.description && (
                  <p className={`text-sm ${
                    isCompleted ? 'text-green-600' : isCurrent ? 'text-blue-600' : 'text-gray-500'
                  }`}>
                    {step.description}
                  </p>
                )}
              </div>

              {!isCompleted && !isCurrent && step.required && (
                <span className="text-xs text-red-500 font-medium">Required</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}; 