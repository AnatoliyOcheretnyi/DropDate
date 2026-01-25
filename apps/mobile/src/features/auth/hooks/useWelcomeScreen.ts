import { useEffect, useCallback } from 'react';
import { useRouter } from 'expo-router';

import { useAuth } from '../store/authStore';

export function useWelcomeScreen() {
  const router = useRouter();
  const { user, isGuest, isLoading, continueAsGuest } = useAuth();

  useEffect(() => {
    if (isLoading) return;
    if (user || isGuest) {
      router.replace('/(tabs)');
    }
  }, [isGuest, isLoading, router, user]);

  const handleSignIn = useCallback(() => {
    router.push('/auth');
  }, [router]);

  const handleContinueAsGuest = useCallback(() => {
    continueAsGuest();
    router.replace('/(tabs)');
  }, [continueAsGuest, router]);

  return {
    isLoading,
    handleSignIn,
    handleContinueAsGuest,
  };
}
