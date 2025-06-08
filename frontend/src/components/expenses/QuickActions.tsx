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
  Scan,
  Receipt
} from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function QuickActions() {
  const router = useRouter();

  const actions = [
    {
      title: 'New Expense',
      description: 'Create a new expense report',
      icon: Plus,
      color: 'bg-blue-600 hover:bg-blue-700',
      onClick: () => router.push('/dashboard/expenses/new')
    },
    {
      title: 'Upload Receipt',
      description: 'Upload receipt or invoice',
      icon: Upload,
      color: 'bg-green-600 hover:bg-green-700',
      onClick: () => router.push('/dashboard/documents')
    },
    {
      title: 'Scan Document',
      description: 'Use camera to scan receipt',
      icon: Camera,
      color: 'bg-purple-600 hover:bg-purple-700',
      onClick: () => {
        // TODO: Implement camera scanning
        alert('Camera scanning coming soon!');
      }
    },
    {
      title: 'Import Bank Statement',
      description: 'Upload bank statement',
      icon: FileText,
      color: 'bg-orange-600 hover:bg-orange-700',
      onClick: () => router.push('/dashboard/bank-statements')
    }
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
        <Receipt className="w-5 h-5 text-gray-400" />
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {actions.map((action, index) => (
          <motion.button
            key={action.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            onClick={action.onClick}
            className={`${action.color} text-white p-4 rounded-lg transition-colors group`}
          >
            <div className="flex flex-col items-center text-center">
              <action.icon className="w-8 h-8 mb-2 group-hover:scale-110 transition-transform" />
              <h3 className="font-medium text-sm mb-1">{action.title}</h3>
              <p className="text-xs opacity-90">{action.description}</p>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
} 