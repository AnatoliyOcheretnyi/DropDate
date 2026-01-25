import { useCallback, useMemo } from 'react';
import { useRouter } from 'expo-router';

import { useAuth } from '../../auth/store/authStore';

export function useProfileScreen() {
  const router = useRouter();
  const { user, isGuest, logout, resetGuest } = useAuth();

  const initials = useMemo(() => {
    return user?.email ? user.email.charAt(0).toUpperCase() : 'G';
  }, [user?.email]);

  const handleSignIn = useCallback(() => {
    router.push('/auth');
  }, [router]);

  const handleResetGuest = useCallback(() => {
    resetGuest();
    router.replace('/welcome');
  }, [resetGuest, router]);

  const handleSignOut = useCallback(async () => {
    await logout();
    router.replace('/welcome');
  }, [logout, router]);

  return {
    user,
    isGuest,
    initials,
    handleSignIn,
    handleResetGuest,
    handleSignOut,
  };
}
