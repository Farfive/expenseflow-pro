'use client';

import React, { useState, useEffect } from 'react';
import { 
  PlusIcon, 
  PencilIcon, 
  TrashIcon, 
  TagIcon,
  ChartBarIcon,
  LightBulbIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';
import categorizationService, { 
  Category, 
  CreateCategoryData, 
  UpdateCategoryData,
  CategorizationInsights 
} from '../../services/categorizationService';

interface CategoryManagerProps {
  onCategoryChange?: () => void;
}

const CategoryManager: React.FC<CategoryManagerProps> = ({ onCategoryChange }) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [insights, setInsights] = useState<CategorizationInsights | null>(null);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showInsights, setShowInsights] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState<CreateCategoryData>({
    name: '',
    description: '',
    color: '#6366F1',
    keywords: [],
    taxCategory: '',
    accountingCode: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [categoriesRes, insightsRes, suggestionsRes] = await Promise.all([
        categorizationService.getCategories({ includeStats: true }),
        categorizationService.getInsights(30),
        categorizationService.getCategorySuggestions()
      ]);

      if (categoriesRes.success) {
        setCategories(categoriesRes.categories);
      }

      if (insightsRes.success) {
        setInsights(insightsRes.insights);
      }

      if (suggestionsRes.success) {
        setSuggestions(suggestionsRes.suggestions);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await categorizationService.createCategory(formData);
      if (response.success) {
        setCategories([...categories, response.category]);
        setShowCreateModal(false);
        resetForm();
        onCategoryChange?.();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create category');
    }
  };

  const handleUpdateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCategory) return;

    try {
      const response = await categorizationService.updateCategory(
        selectedCategory.id,
        formData
      );
      if (response.success) {
        setCategories(categories.map(cat => 
          cat.id === selectedCategory.id ? response.category : cat
        ));
        setShowEditModal(false);
        setSelectedCategory(null);
        resetForm();
        onCategoryChange?.();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update category');
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (!confirm('Are you sure you want to delete this category?')) return;

    try {
      const response = await categorizationService.deleteCategory(categoryId);
      if (response.success) {
        setCategories(categories.filter(cat => cat.id !== categoryId));
        onCategoryChange?.();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete category');
    }
  };

  const handleCreateDefaults = async () => {
    try {
      const response = await categorizationService.createDefaultCategories();
      if (response.success) {
        setCategories([...categories, ...response.categories]);
        setSuggestions([]);
        onCategoryChange?.();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create default categories');
    }
  };

  const openEditModal = (category: Category) => {
    setSelectedCategory(category);
    setFormData({
      name: category.name,
      description: category.description || '',
      color: category.color || '#6366F1',
      keywords: category.metadata?.keywords || [],
      taxCategory: category.metadata?.taxCategory || '',
      accountingCode: category.metadata?.accountingCode || ''
    });
    setShowEditModal(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      color: '#6366F1',
      keywords: [],
      taxCategory: '',
      accountingCode: ''
    });
  };

  const addKeyword = () => {
    const keyword = prompt('Enter keyword:');
    if (keyword && keyword.trim()) {
      setFormData({
        ...formData,
        keywords: [...(formData.keywords || []), keyword.trim()]
      });
    }
  };

  const removeKeyword = (index: number) => {
    setFormData({
      ...formData,
      keywords: formData.keywords?.filter((_, i) => i !== index) || []
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Category Management</h2>
          <p className="text-gray-600">Manage expense categories and ML categorization</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowInsights(!showInsights)}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <ChartBarIcon className="w-4 h-4 mr-2" />
            Insights
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            <PlusIcon className="w-4 h-4 mr-2" />
            New Category
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <XCircleIcon className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
          <div className="flex items-center justify-between">
            <div className="flex">
              <LightBulbIcon className="h-5 w-5 text-blue-400" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">
                  Suggested Categories
                </h3>
                <p className="text-sm text-blue-700 mt-1">
                  We recommend creating these standard categories for better categorization.
                </p>
              </div>
            </div>
            <button
              onClick={handleCreateDefaults}
              className="text-sm font-medium text-blue-600 hover:text-blue-500"
            >
              Create All
            </button>
          </div>
        </div>
      )}

      {/* Insights Panel */}
      {showInsights && insights && (
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Categorization Insights (Last 30 Days)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {insights.categoryDistribution.length}
              </div>
              <div className="text-sm text-blue-700">Active Categories</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {insights.learningCount}
              </div>
              <div className="text-sm text-green-700">Learning Corrections</div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {insights.topVendors.length}
              </div>
              <div className="text-sm text-purple-700">Known Vendors</div>
            </div>
            <div className="bg-orange-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">
                {insights.categoryDistribution.reduce((sum, cat) => sum + cat.count, 0)}
              </div>
              <div className="text-sm text-orange-700">Total Expenses</div>
            </div>
          </div>
        </div>
      )}

      {/* Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {categories.map((category) => (
          <div key={category.id} className="bg-white shadow rounded-lg p-6 border-l-4" 
               style={{ borderLeftColor: categorizationService.getCategoryColor(category) }}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <TagIcon 
                  className="w-5 h-5 mr-2"
                  style={{ color: categorizationService.getCategoryColor(category) }}
                />
                <h3 className="text-lg font-medium text-gray-900">
                  {categorizationService.formatCategoryName(category.name)}
                </h3>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => openEditModal(category)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <PencilIcon className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDeleteCategory(category.id)}
                  className="text-gray-400 hover:text-red-600"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>
            </div>

            {category.description && (
              <p className="text-gray-600 text-sm mb-3">{category.description}</p>
            )}

            <div className="flex items-center justify-between text-sm text-gray-500">
              <span>
                {category._count?.expenses || 0} expenses
              </span>
              {category.metadata?.taxCategory && (
                <span className="bg-gray-100 px-2 py-1 rounded text-xs">
                  {category.metadata.taxCategory}
                </span>
              )}
            </div>

            {category.metadata?.keywords && category.metadata.keywords.length > 0 && (
              <div className="mt-3">
                <div className="text-xs text-gray-500 mb-1">Keywords:</div>
                <div className="flex flex-wrap gap-1">
                  {category.metadata.keywords.slice(0, 3).map((keyword, index) => (
                    <span key={index} className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                      {keyword}
                    </span>
                  ))}
                  {category.metadata.keywords.length > 3 && (
                    <span className="text-gray-400 text-xs">
                      +{category.metadata.keywords.length - 3} more
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Create Category Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Create New Category</h3>
              <form onSubmit={handleCreateCategory} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Color</label>
                  <input
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="mt-1 block w-full h-10 border-gray-300 rounded-md shadow-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Keywords</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {formData.keywords?.map((keyword, index) => (
                      <span key={index} className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm flex items-center">
                        {keyword}
                        <button
                          type="button"
                          onClick={() => removeKeyword(index)}
                          className="ml-2 text-blue-600 hover:text-blue-800"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={addKeyword}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    + Add Keyword
                  </button>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      resetForm();
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                  >
                    Create Category
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Category Modal */}
      {showEditModal && selectedCategory && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Edit Category</h3>
              <form onSubmit={handleUpdateCategory} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Color</label>
                  <input
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="mt-1 block w-full h-10 border-gray-300 rounded-md shadow-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Keywords</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {formData.keywords?.map((keyword, index) => (
                      <span key={index} className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm flex items-center">
                        {keyword}
                        <button
                          type="button"
                          onClick={() => removeKeyword(index)}
                          className="ml-2 text-blue-600 hover:text-blue-800"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={addKeyword}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    + Add Keyword
                  </button>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditModal(false);
                      setSelectedCategory(null);
                      resetForm();
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                  >
                    Update Category
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CategoryManager; 