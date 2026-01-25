import { Redirect } from 'expo-router';

import { useAuth } from '../src/features/auth/store/authStore';

export default function IndexRoute() {
  const { user, isGuest, isLoading } = useAuth();

  if (isLoading) {
    return null;
  }

  if (user || isGuest) {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/welcome" />;
}
