'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui';
import { TrendingUpIcon, TrendingDownIcon, MinusIcon, LucideIcon } from 'lucide-react';
import { formatPercentage } from '@/utils/formatting';

interface KPIWidgetProps {
  title: string;
  value: string | number;
  change?: number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: 'up' | 'down' | 'neutral';
  color?: 'blue' | 'green' | 'purple' | 'orange' | 'red';
  onClick?: () => void;
}

export const KPIWidget: React.FC<KPIWidgetProps> = ({
  title,
  value,
  change,
  subtitle,
  icon: Icon,
  trend = 'neutral',
  color = 'blue',
  onClick
}) => {
  const colorClasses = {
    blue: {
      bg: 'bg-blue-50',
      icon: 'text-blue-600',
      accent: 'border-blue-200'
    },
    green: {
      bg: 'bg-green-50',
      icon: 'text-green-600',
      accent: 'border-green-200'
    },
    purple: {
      bg: 'bg-purple-50',
      icon: 'text-purple-600',
      accent: 'border-purple-200'
    },
    orange: {
      bg: 'bg-orange-50',
      icon: 'text-orange-600',
      accent: 'border-orange-200'
    },
    red: {
      bg: 'bg-red-50',
      icon: 'text-red-600',
      accent: 'border-red-200'
    }
  };

  const getTrendIcon = () => {
    if (trend === 'up') return TrendingUpIcon;
    if (trend === 'down') return TrendingDownIcon;
    return MinusIcon;
  };

  const getTrendColor = () => {
    if (trend === 'up') return 'text-green-600';
    if (trend === 'down') return 'text-red-600';
    return 'text-gray-600';
  };

  const TrendIcon = getTrendIcon();
  const classes = colorClasses[color];

  return (
    <Card 
      className={`${classes.accent} hover:shadow-md transition-shadow ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-bold text-gray-900">{value}</p>
              {change !== undefined && (
                <div className={`flex items-center gap-1 ${getTrendColor()}`}>
                  <TrendIcon className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    {formatPercentage(Math.abs(change))}
                  </span>
                </div>
              )}
            </div>
            {subtitle && (
              <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
            )}
          </div>
          <div className={`p-3 rounded-lg ${classes.bg}`}>
            <Icon className={`h-6 w-6 ${classes.icon}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default KPIWidget; 