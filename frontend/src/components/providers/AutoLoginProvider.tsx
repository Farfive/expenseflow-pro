'use client';

import { useEffect, ReactNode } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useRouter, usePathname } from 'next/navigation';
import { autoLogin } from '@/store/slices/authSlice';
import { RootState, AppDispatch } from '@/store';
import { LoadingScreen } from '@/components/ui/LoadingScreen';

interface AutoLoginProviderProps {
  children: ReactNode;
}

export function AutoLoginProvider({ children }: AutoLoginProviderProps) {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, loading, user } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    // Skip auto-login if already authenticated
    if (isAuthenticated && user) {
      // If on auth pages, redirect to dashboard
      if (pathname.startsWith('/auth/')) {
        router.push('/dashboard');
      }
      return;
    }

    // Skip auto-login if already on auth pages and not loading
    if (pathname.startsWith('/auth/') && !loading) {
      return;
    }

    // Perform auto-login
    const performAutoLogin = async () => {
      try {
        console.log('🚀 Attempting auto-login...');
        await dispatch(autoLogin()).unwrap();
        console.log('✅ Auto-login successful');
        
        // Redirect to dashboard after successful auto-login
        if (pathname === '/' || pathname.startsWith('/auth/')) {
          router.push('/dashboard');
        }
      } catch (error) {
        console.log('❌ Auto-login failed:', error);
        
        // Only redirect to login if not already on auth pages
        if (!pathname.startsWith('/auth/') && pathname !== '/') {
          router.push('/auth/login');
        }
      }
    };

    performAutoLogin();
  }, [dispatch, router, pathname, isAuthenticated, user, loading]);

  // Show loading screen while auto-login is in progress
  if (loading && !isAuthenticated) {
    return <LoadingScreen />;
  }

  return <>{children}</>;
} 