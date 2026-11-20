import { useCallback, useMemo } from "react";
import { useRouter } from "expo-router";

import { useToast } from "../../../shared/ui/Toast";
import { useAuth } from "../../auth/store/authStore";

export function useProfileScreen() {
  const router = useRouter();
  const { showToast } = useToast();
  const { user, isGuest, logout, resetGuest } = useAuth();

  const initials = useMemo(() => {
    return user?.email ? user.email.charAt(0).toUpperCase() : "G";
  }, [user?.email]);

  const handleSignIn = useCallback(() => {
    router.push("/auth");
  }, [router]);

  const handleResetGuest = useCallback(() => {
    resetGuest();
    router.replace("/welcome");
  }, [resetGuest, router]);

  const handleSignOut = useCallback(async () => {
    try {
      await logout();
      router.replace("/welcome");
    } catch {
      showToast("Не вдалося очистити сесію. Спробуй ще раз.");
    }
  }, [logout, router, showToast]);

  return {
    user,
    isGuest,
    initials,
    handleSignIn,
    handleResetGuest,
    handleSignOut,
  };
}
