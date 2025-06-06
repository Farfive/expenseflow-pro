/**
 * Offline Indicator Component
 */

import React from 'react';
import { AlertCircle, Wifi, WifiOff } from 'lucide-react';

interface OfflineIndicatorProps {
  isOnline: boolean;
}

const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({ isOnline }) => {
  if (isOnline) {
    return null;
  }

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
      <div className="flex items-center">
        <WifiOff className="w-5 h-5 text-yellow-600 mr-2" />
        <div>
          <span className="text-yellow-800 font-medium">Working offline</span>
          <p className="text-yellow-700 text-sm">
            Changes will be saved locally and submitted when you're back online
          </p>
        </div>
      </div>
    </div>
  );
};

export default OfflineIndicator; 