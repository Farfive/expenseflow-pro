'use client';

import React, { useState, useEffect } from 'react';
import { 
  SparklesIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowPathIcon,
  LightBulbIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';
import categorizationService, { 
  CategorizationResult, 
  Category, 
  DocumentData 
} from '../../services/categorizationService';

interface DocumentCategorizationProps {
  documentData: DocumentData;
  selectedCategory?: string;
  onCategorySelect: (category: string, confidence?: number) => void;
  onLearningComplete?: () => void;
  autoPredict?: boolean;
  showRecommendations?: boolean;
}

const DocumentCategorization: React.FC<DocumentCategorizationProps> = ({
  documentData,
  selectedCategory,
  onCategorySelect,
  onLearningComplete,
  autoPredict = true,
  showRecommendations = true
}) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [prediction, setPrediction] = useState<CategorizationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLearning, setIsLearning] = useState(false);
  const [showAllPredictions, setShowAllPredictions] = useState(false);
  const [userOverride, setUserOverride] = useState(false);

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    if (autoPredict && documentData && (documentData.vendor || documentData.description || documentData.extractedText)) {
      predictCategory();
    }
  }, [documentData, autoPredict]);

  const loadCategories = async () => {
    try {
      const response = await categorizationService.getCategories();
      if (response.success) {
        setCategories(response.categories);
      }
    } catch (err) {
      setError('Failed to load categories');
    }
  };

  const predictCategory = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await categorizationService.categorizeDocument(documentData);
      if (response.success) {
        setPrediction(response);
        
        // Auto-select if high confidence
        if (response.confidence >= 0.8 && !userOverride) {
          onCategorySelect(response.category, response.confidence);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to predict category');
    } finally {
      setLoading(false);
    }
  };

  const handleCategorySelect = async (categoryName: string) => {
    // If user manually selects a different category than predicted, learn from it
    if (prediction && categoryName !== prediction.category && prediction.confidence > 0.5) {
      await learnFromCorrection(categoryName);
    }
    
    setUserOverride(true);
    onCategorySelect(categoryName);
  };

  const learnFromCorrection = async (userCategory: string) => {
    if (!prediction) return;
    
    setIsLearning(true);
    try {
      await categorizationService.learnFromCorrection({
        ...documentData,
        userCategory,
        originalPrediction: prediction.category
      });
      
      onLearningComplete?.();
    } catch (err) {
      console.error('Learning failed:', err);
    } finally {
      setIsLearning(false);
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600 bg-green-50 border-green-200';
    if (confidence >= 0.6) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const getConfidenceIcon = (level: string) => {
    switch (level) {
      case 'high':
        return <CheckCircleIcon className="w-4 h-4 text-green-500" />;
      case 'medium':
        return <ExclamationTriangleIcon className="w-4 h-4 text-yellow-500" />;
      case 'low':
        return <ExclamationTriangleIcon className="w-4 h-4 text-red-500" />;
      default:
        return null;
    }
  };

  const recommendations = showRecommendations ? 
    categorizationService.getCategoryRecommendations(documentData) : [];

  return (
    <div className="space-y-4">
      {/* AI Prediction Section */}
      {prediction && (
        <div className={`p-4 border rounded-lg ${getConfidenceColor(prediction.confidence)}`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center">
              <SparklesIcon className="w-5 h-5 mr-2" />
              <span className="font-medium">AI Suggestion</span>
              {getConfidenceIcon(prediction.confidenceLevel)}
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm">
                {categorizationService.getConfidenceDisplay(prediction.confidence)} confidence
              </span>
              {isLearning && <ArrowPathIcon className="w-4 h-4 animate-spin" />}
            </div>
          </div>
          
          <div className="mb-2">
            <span className="text-lg font-medium">
              {categorizationService.formatCategoryName(prediction.category)}
            </span>
          </div>
          
          <div className="text-sm opacity-75 mb-3">
            {prediction.reasoning}
          </div>

          {prediction.suggested && (
            <div className="bg-white bg-opacity-50 p-3 rounded border">
              <div className="text-sm">
                <strong>Recommendation:</strong> Please review this categorization as the confidence is lower than usual.
              </div>
            </div>
          )}

          {/* Alternative Predictions */}
          {prediction.predictions.length > 1 && (
            <div className="mt-3">
              <button
                onClick={() => setShowAllPredictions(!showAllPredictions)}
                className="text-sm underline hover:no-underline"
              >
                {showAllPredictions ? 'Hide' : 'Show'} alternative suggestions
              </button>
              
              {showAllPredictions && (
                <div className="mt-2 space-y-1">
                  {prediction.predictions.slice(1, 3).map((pred, index) => (
                    <div key={index} className="flex justify-between items-center text-sm bg-white bg-opacity-50 p-2 rounded">
                      <span>{categorizationService.formatCategoryName(pred.category)}</span>
                      <span>{categorizationService.getConfidenceDisplay(pred.confidence)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center p-4 bg-gray-50 rounded-lg">
          <ArrowPathIcon className="w-5 h-5 animate-spin mr-2" />
          <span>Analyzing document...</span>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex">
            <ExclamationTriangleIcon className="w-5 h-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Categorization Error</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Manual Category Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Category Selection
        </label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => handleCategorySelect(category.name)}
              className={`p-3 text-left border rounded-lg transition-colors ${
                selectedCategory === category.name
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center">
                <div 
                  className="w-3 h-3 rounded-full mr-2"
                  style={{ backgroundColor: categorizationService.getCategoryColor(category) }}
                />
                <span className="text-sm font-medium">
                  {categorizationService.formatCategoryName(category.name)}
                </span>
              </div>
              {category.description && (
                <div className="text-xs text-gray-500 mt-1 truncate">
                  {category.description}
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center mb-2">
            <LightBulbIcon className="w-5 h-5 text-blue-500 mr-2" />
            <span className="font-medium text-blue-800">Recommendations</span>
          </div>
          <ul className="space-y-1">
            {recommendations.map((rec, index) => (
              <li key={index} className="text-sm text-blue-700">
                • {rec}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Quick Actions */}
      <div className="flex justify-between items-center pt-2">
        <button
          onClick={predictCategory}
          disabled={loading}
          className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          <SparklesIcon className="w-4 h-4 mr-1" />
          Re-analyze
        </button>

        {selectedCategory && prediction && selectedCategory !== prediction.category && (
          <div className="text-sm text-green-600 flex items-center">
            <CheckCircleIcon className="w-4 h-4 mr-1" />
            Learning applied
          </div>
        )}
      </div>

      {/* Category Statistics (if available) */}
      {selectedCategory && (
        <div className="p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">
              Selected: {categorizationService.formatCategoryName(selectedCategory)}
            </span>
            {prediction && (
              <span className="text-xs text-gray-500">
                {prediction.confidence >= 0.8 ? 'High confidence' : 
                 prediction.confidence >= 0.6 ? 'Medium confidence' : 'Low confidence'}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentCategorization; 