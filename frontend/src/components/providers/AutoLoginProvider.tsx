'use client';

import { useEffect, ReactNode, useRef } from 'react';
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
  
  // Prevent multiple autologin attempts
  const autoLoginAttempted = useRef(false);
  const isInitializing = useRef(true);

  useEffect(() => {
    // Fast path: Skip if already authenticated
    if (isAuthenticated && user) {
      isInitializing.current = false;
      
      // Only redirect if on auth pages to avoid unnecessary navigation
      if (pathname.startsWith('/auth/')) {
        router.push('/dashboard');
      }
      return;
    }

    // Fast path: Skip if on auth pages and not loading (manual login flow)
    if (pathname.startsWith('/auth/') && !loading && !isInitializing.current) {
      return;
    }

    // Prevent duplicate autologin attempts
    if (autoLoginAttempted.current) {
      return;
    }

    // Check if we have cached tokens first (faster than API call)
    const cachedToken = localStorage.getItem('token');
    const cachedUser = localStorage.getItem('persist:auth');
    
    // If we have cached auth data, let Redux handle it instead of calling API
    if (cachedToken && cachedUser && !loading) {
      console.log('🚀 Using cached authentication data');
      isInitializing.current = false;
      return;
    }

    // Only perform autologin if we don't have cached data
    autoLoginAttempted.current = true;

    const performAutoLogin = async () => {
      try {
        console.log('🚀 Attempting auto-login...');
        await dispatch(autoLogin()).unwrap();
        console.log('✅ Auto-login successful');
        
        isInitializing.current = false;
        
        // Smart redirect: only redirect if needed
        if (pathname === '/' || pathname.startsWith('/auth/')) {
          router.push('/dashboard');
        }
      } catch (error) {
        console.log('❌ Auto-login failed:', error);
        autoLoginAttempted.current = false; // Allow retry
        isInitializing.current = false;
        
        // Only redirect to login if not already on auth pages
        if (!pathname.startsWith('/auth/') && pathname !== '/') {
          router.push('/auth/login');
        }
      }
    };

    // Add small delay to prevent flash of loading screen if auth is instant
    const timeoutId = setTimeout(performAutoLogin, 50);
    
    return () => clearTimeout(timeoutId);
  }, [dispatch, router, pathname, isAuthenticated, user, loading]);

  // Show loading screen only during initial authentication check
  if ((loading && !isAuthenticated) || isInitializing.current) {
    return <LoadingScreen message="Initializing ExpenseFlow Pro..." />;
  }

  return <>{children}</>;
} 