/**
 * Processing Indicator Component
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, Save } from 'lucide-react';

interface ProcessingIndicatorProps {
  draftSaved: boolean;
}

const ProcessingIndicator: React.FC<ProcessingIndicatorProps> = ({ draftSaved }) => {
  return (
    <AnimatePresence>
      {draftSaved && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="fixed top-4 right-4 bg-green-50 border border-green-200 rounded-md p-3 z-50 shadow-lg"
        >
          <div className="flex items-center">
            <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
            <span className="text-green-800 text-sm font-medium">Draft saved</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ProcessingIndicator; 