'use client';

/**
 * Expense Form Fields Component
 * 
 * Form inputs for expense details with validation and smart suggestions
 */

import React, { useState } from 'react';
import { Control, Controller, FieldErrors } from 'react-hook-form';
import { ChevronDown, Sparkles } from 'lucide-react';

interface ExpenseFormFieldsProps {
  control: Control<any>;
  errors: FieldErrors<any>;
  categories: any[];
  projects: any[];
  smartSuggestions: any[];
  onCategorySelect: (categoryId: string) => void;
}

const ExpenseFormFields: React.FC<ExpenseFormFieldsProps> = ({
  control,
  errors,
  categories,
  projects,
  smartSuggestions,
  onCategorySelect
}) => {
  const [showSuggestions, setShowSuggestions] = useState(true);

  const handleCategorySelect = (categoryId: string) => {
    onCategorySelect(categoryId);
    setShowSuggestions(false);
  };

  return (
    <div className="card p-6">
      <h3 className="text-lg font-semibold mb-4">Expense Details</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Title *
          </label>
          <Controller
            name="title"
            control={control}
            render={({ field }) => (
              <input
                {...field}
                type="text"
                className={`input ${errors.title ? 'border-red-500' : ''}`}
                placeholder="Expense title"
              />
            )}
          />
          {errors.title && (
            <p className="text-red-600 text-sm mt-1">{errors.title.message as string}</p>
          )}
        </div>

        {/* Amount and Currency */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Amount *
          </label>
          <div className="flex space-x-2">
            <Controller
              name="amount"
              control={control}
              render={({ field }) => (
                <input
                  {...field}
                  type="number"
                  step="0.01"
                  className={`input flex-1 ${errors.amount ? 'border-red-500' : ''}`}
                  placeholder="0.00"
                  onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                />
              )}
            />
            <Controller
              name="currency"
              control={control}
              render={({ field }) => (
                <select {...field} className="input w-20">
                  <option value="PLN">PLN</option>
                  <option value="EUR">EUR</option>
                  <option value="USD">USD</option>
                  <option value="GBP">GBP</option>
                </select>
              )}
            />
          </div>
          {errors.amount && (
            <p className="text-red-600 text-sm mt-1">{errors.amount.message as string}</p>
          )}
        </div>

        {/* Transaction Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Transaction Date *
          </label>
          <Controller
            name="transactionDate"
            control={control}
            render={({ field }) => (
              <input
                {...field}
                type="date"
                className={`input ${errors.transactionDate ? 'border-red-500' : ''}`}
              />
            )}
          />
          {errors.transactionDate && (
            <p className="text-red-600 text-sm mt-1">{errors.transactionDate.message as string}</p>
          )}
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Category *
          </label>
          <Controller
            name="categoryId"
            control={control}
            render={({ field }) => (
              <div className="relative">
                <select 
                  {...field} 
                  className={`input ${errors.categoryId ? 'border-red-500' : ''}`}
                  onChange={(e) => {
                    field.onChange(e);
                    setShowSuggestions(false);
                  }}
                >
                  <option value="">Select category</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            )}
          />
          {errors.categoryId && (
            <p className="text-red-600 text-sm mt-1">{errors.categoryId.message as string}</p>
          )}
          
          {/* Smart Suggestions */}
          {smartSuggestions.length > 0 && showSuggestions && (
            <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
              <div className="flex items-center mb-2">
                <Sparkles className="w-4 h-4 text-blue-600 mr-1" />
                <span className="text-sm font-medium text-blue-800">Smart Suggestions</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {smartSuggestions.slice(0, 3).map((suggestion) => (
                  <button
                    key={suggestion.id}
                    type="button"
                    onClick={() => handleCategorySelect(suggestion.id)}
                    className="px-3 py-1 text-sm bg-white border border-blue-300 rounded-full hover:bg-blue-100 transition-colors"
                    title={suggestion.reason}
                  >
                    {suggestion.name}
                    <span className="ml-1 text-xs text-blue-600">
                      {Math.round(suggestion.confidence * 100)}%
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Merchant Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Merchant/Vendor
          </label>
          <Controller
            name="merchantName"
            control={control}
            render={({ field }) => (
              <input
                {...field}
                type="text"
                className="input"
                placeholder="Where was this expense incurred?"
              />
            )}
          />
        </div>

        {/* Project */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Project/Cost Center
          </label>
          <Controller
            name="projectId"
            control={control}
            render={({ field }) => (
              <div className="relative">
                <select 
                  {...field} 
                  className={`input ${errors.projectId ? 'border-red-500' : ''}`}
                >
                  <option value="">Select project (optional)</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.code ? `${project.code} - ${project.name}` : project.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            )}
          />
          {errors.projectId && (
            <p className="text-red-600 text-sm mt-1">{errors.projectId.message as string}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Project
          </label>
          <Controller
            name="projectId"
            control={control}
            render={({ field }) => (
              <div className="relative">
                <select {...field} className="input">
                  <option value="">Select project (optional)</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name} ({project.code})
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            )}
          />
        </div>

        {/* Cost Center */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Cost Center
          </label>
          <Controller
            name="costCenter"
            control={control}
            render={({ field }) => (
              <input
                {...field}
                type="text"
                className="input"
                placeholder="Cost center code"
              />
            )}
          />
        </div>

        {/* Receipt Number */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Receipt Number
          </label>
          <Controller
            name="receiptNumber"
            control={control}
            render={({ field }) => (
              <input
                {...field}
                type="text"
                className="input"
                placeholder="Receipt/invoice number"
              />
            )}
          />
        </div>

        {/* Description */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <Controller
            name="description"
            control={control}
            render={({ field }) => (
              <textarea
                {...field}
                rows={3}
                className="input"
                placeholder="Additional details about this expense"
              />
            )}
          />
        </div>

        {/* Reimbursable */}
        <div className="flex items-center">
          <Controller
            name="isReimbursable"
            control={control}
            render={({ field }) => (
              <input
                {...field}
                type="checkbox"
                checked={field.value}
                className="rounded mr-2"
              />
            )}
          />
          <label className="text-sm text-gray-700">
            This expense is reimbursable
          </label>
        </div>

        {/* Tags */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tags
          </label>
          <Controller
            name="tags"
            control={control}
            render={({ field }) => (
              <input
                {...field}
                type="text"
                className="input"
                placeholder="Enter tags separated by commas"
                onChange={(e) => {
                  const tags = e.target.value.split(',').map(tag => tag.trim()).filter(Boolean);
                  field.onChange(tags);
                }}
                value={field.value?.join(', ') || ''}
              />
            )}
          />
          <p className="text-xs text-gray-500 mt-1">
            Use tags to categorize expenses for easier searching
          </p>
        </div>
      </div>
    </div>
  );
};

export default ExpenseFormFields; 