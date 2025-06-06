'use client';

import React from 'react';
import VerificationDashboard from '@/components/verification/VerificationDashboard';
import { useAuth } from '@/components/providers/AuthProvider';

export default function VerificationPage() {
  const { user } = useAuth();

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto p-6">
      <VerificationDashboard companyId={user.companyId} />
    </div>
  );
} 