'use client';

/**
 * Quick Actions Component for Expense Dashboard
 */

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { 
  Plus, 
  Upload, 
  Camera, 
  FileText, 
  History, 
  Search,
  Download,
  Settings
} from 'lucide-react';

const QuickActions: React.FC = () => {
  const actions = [
    {
      title: 'New Expense',
      description: 'Submit a new expense report',
      href: '/dashboard/expenses/new',
      icon: Plus,
      color: 'bg-blue-500 hover:bg-blue-600',
      primary: true,
    },
    {
      title: 'Upload Receipt',
      description: 'Quick receipt upload',
      href: '/dashboard/expenses/new?tab=upload',
      icon: Upload,
      color: 'bg-green-500 hover:bg-green-600',
    },
    {
      title: 'Take Photo',
      description: 'Capture receipt with camera',
      href: '/dashboard/expenses/new?tab=camera',
      icon: Camera,
      color: 'bg-purple-500 hover:bg-purple-600',
    },
    {
      title: 'View Drafts',
      description: 'Continue saved drafts',
      href: '/dashboard/expenses/drafts',
      icon: FileText,
      color: 'bg-orange-500 hover:bg-orange-600',
    },
    {
      title: 'History',
      description: 'View expense history',
      href: '/dashboard/expenses/history',
      icon: History,
      color: 'bg-gray-500 hover:bg-gray-600',
    },
    {
      title: 'Search',
      description: 'Find specific expenses',
      href: '/dashboard/expenses/search',
      icon: Search,
      color: 'bg-indigo-500 hover:bg-indigo-600',
    },
  ];

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Quick Actions</h3>
        <Link 
          href="/dashboard/expenses/settings" 
          className="text-gray-500 hover:text-gray-700"
        >
          <Settings className="w-5 h-5" />
        </Link>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {actions.map((action, index) => (
          <motion.div
            key={action.title}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
          >
            <Link
              href={action.href}
              className={`
                block p-4 rounded-lg text-white text-center transition-all duration-200 transform hover:scale-105 hover:shadow-lg
                ${action.color}
                ${action.primary ? 'md:col-span-2 lg:col-span-2' : ''}
              `}
            >
              <action.icon className={`w-6 h-6 mx-auto mb-2 ${action.primary ? 'w-8 h-8' : ''}`} />
              <h4 className={`font-medium mb-1 ${action.primary ? 'text-lg' : 'text-sm'}`}>
                {action.title}
              </h4>
              <p className={`text-xs opacity-90 ${action.primary ? 'text-sm' : ''}`}>
                {action.description}
              </p>
            </Link>
          </motion.div>
        ))}
      </div>
      
      {/* Additional Quick Stats */}
      <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-gray-200">
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">12</div>
          <div className="text-xs text-gray-600">This Month</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-yellow-600">3</div>
          <div className="text-xs text-gray-600">Pending</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">9</div>
          <div className="text-xs text-gray-600">Approved</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-purple-600">2</div>
          <div className="text-xs text-gray-600">Drafts</div>
        </div>
      </div>
    </div>
  );
};

export default QuickActions; 