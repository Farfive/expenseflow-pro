'use client';

import { motion } from 'framer-motion';

interface LoadingScreenProps {
  message?: string;
}

export function LoadingScreen({ message = 'Loading ExpenseFlow Pro...' }: LoadingScreenProps) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex flex-col items-center space-y-3">
        {/* Simplified logo - faster to render */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
          className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center shadow-md"
        >
          <span className="text-xl font-bold text-primary-foreground">E</span>
        </motion.div>

        {/* Simple loading text - no complex animations */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.2 }}
          className="text-center"
        >
          <p className="text-sm text-muted-foreground">{message}</p>
        </motion.div>

        {/* Minimal loading indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15, duration: 0.2 }}
          className="w-6 h-1 bg-primary/20 rounded-full overflow-hidden"
        >
          <motion.div
            className="h-full bg-primary rounded-full"
            animate={{
              x: ['-100%', '100%'],
            }}
            transition={{
              duration: 1,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        </motion.div>
      </div>
    </div>
  );
} 