'use client';

import React from 'react';
import { useUser } from '@/hooks/useUser';
import { AnalyticsDashboard } from '@/components/analytics/AnalyticsDashboard';
import { Card, CardContent } from '@/components/ui/card';
import { ChartBarIcon } from 'lucide-react';

export default function AnalyticsPage() {
  const { user, isLoading } = useUser();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user?.companyId) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center h-64">
          <ChartBarIcon className="h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Company Access</h3>
          <p className="text-gray-500 text-center">
            You need to be associated with a company to view analytics.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <AnalyticsDashboard companyId={user.companyId} />
    </div>
  );
} 