import { toast } from 'react-hot-toast';

export interface Toast {
  id: string;
  title?: string;
  description?: string;
  action?: React.ReactNode;
  variant?: 'default' | 'destructive';
}

export function useToast() {
  return {
    toast: ({
      title,
      description,
      variant = 'default',
      ...props
    }: {
      title?: string;
      description?: string;
      variant?: 'default' | 'destructive' | 'warning';
    }) => {
      const message = title && description ? `${title}: ${description}` : title || description || '';
      
      if (variant === 'destructive') {
        return toast.error(message);
      } else if (variant === 'warning') {
        return toast(message, {
          icon: '⚠️',
          style: {
            background: '#fef3c7',
            color: '#92400e',
            border: '1px solid #fbbf24'
          }
        });
      } else {
        return toast.success(message);
      }
    },
    dismiss: (toastId?: string) => {
      if (toastId) {
        toast.dismiss(toastId);
      } else {
        toast.dismiss();
      }
    },
  };
}

// Export individual toast functions for direct use
export const toastSuccess = (message: string) => toast.success(message);
export const toastError = (message: string) => toast.error(message);
export const toastWarning = (message: string) => toast(message, {
  icon: '⚠️',
  style: {
    background: '#fef3c7',
    color: '#92400e',
    border: '1px solid #fbbf24'
  }
});
export const toastInfo = (message: string) => toast(message, {
  icon: 'ℹ️',
  style: {
    background: '#dbeafe',
    color: '#1e40af',
    border: '1px solid #3b82f6'
  }
}); 