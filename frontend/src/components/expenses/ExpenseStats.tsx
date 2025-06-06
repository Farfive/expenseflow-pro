'use client';

/**
 * Expense Statistics Component
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Receipt, 
  Clock, 
  CheckCircle, 
  DollarSign, 
  TrendingUp, 
  Calendar 
} from 'lucide-react';

interface ExpenseStatsProps {
  // Add any props if needed
}

interface StatsData {
  totalExpenses: number;
  monthlyTotal: number;
  pendingCount: number;
  approvedCount: number;
  averageAmount: number;
  monthlyChange: number;
}

const ExpenseStats: React.FC<ExpenseStatsProps> = () => {
  const [stats, setStats] = useState<StatsData>({
    totalExpenses: 0,
    monthlyTotal: 0,
    pendingCount: 0,
    approvedCount: 0,
    averageAmount: 0,
    monthlyChange: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/expenses/stats');
      const data = await response.json();
      
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Error fetching expense stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pl-PL', {
      style: 'currency',
      currency: 'PLN'
    }).format(amount);
  };

  const statCards = [
    {
      title: 'Total Expenses',
      value: formatCurrency(stats.totalExpenses),
      icon: Receipt,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      change: null,
    },
    {
      title: 'This Month',
      value: formatCurrency(stats.monthlyTotal),
      icon: Calendar,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      change: stats.monthlyChange,
    },
    {
      title: 'Pending Approval',
      value: stats.pendingCount.toString(),
      icon: Clock,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      change: null,
    },
    {
      title: 'Approved',
      value: stats.approvedCount.toString(),
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      change: null,
    },
    {
      title: 'Average Amount',
      value: formatCurrency(stats.averageAmount),
      icon: DollarSign,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      change: null,
    },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="card p-4 animate-pulse">
            <div className="h-4 bg-gray-200 rounded mb-2"></div>
            <div className="h-6 bg-gray-200 rounded mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
      {statCards.map((card, index) => (
        <motion.div
          key={card.title}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          className="card p-4"
        >
          <div className="flex items-center justify-between mb-2">
            <div className={`p-2 rounded-lg ${card.bgColor}`}>
              <card.icon className={`w-5 h-5 ${card.color}`} />
            </div>
            {card.change !== null && (
              <div className={`flex items-center text-xs ${
                card.change >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                <TrendingUp className={`w-3 h-3 mr-1 ${
                  card.change < 0 ? 'transform rotate-180' : ''
                }`} />
                {Math.abs(card.change)}%
              </div>
            )}
          </div>
          
          <div>
            <p className="text-2xl font-bold text-gray-900">{card.value}</p>
            <p className="text-sm text-gray-600">{card.title}</p>
          </div>
        </motion.div>
      ))}
    </div>
  );
};

export default ExpenseStats; 