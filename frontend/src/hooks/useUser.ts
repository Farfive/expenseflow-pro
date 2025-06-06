import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { User } from '@/types';

export const useUser = () => {
  const { user, isAuthenticated, loading } = useSelector((state: RootState) => state.auth);
  
  return {
    user: user as User | null,
    isAuthenticated,
    loading,
    isLoggedIn: isAuthenticated && !!user,
    userId: user?.id || null,
    userRole: user?.role || null,
    userEmail: user?.email || null,
    userFullName: user ? `${user.firstName} ${user.lastName}` : null,
  };
}; 