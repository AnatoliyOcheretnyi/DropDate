import { useMemo, useState } from 'react';
import { useRouter } from 'expo-router';

import { useAuth } from '../store/authStore';
import { copy } from '../../../shared/strings';

export function useAuthScreen() {
  const router = useRouter();
  const { login, register, isLoading } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const title = mode === 'login' ? copy.auth.loginTitle : copy.auth.registerTitle;
  const submitLabel = mode === 'login' ? copy.auth.submitLogin : copy.auth.submitRegister;

  const canSubmit = useMemo(() => {
    if (!email.trim() || !password.trim()) return false;
    if (mode === 'register' && password !== confirm) return false;
    return true;
  }, [confirm, email, mode, password]);

  const handleSubmit = async () => {
    if (!canSubmit || busy) return;
    setMessage(null);
    setBusy(true);
    const action = mode === 'login' ? login : register;
    const result = await action(email.trim(), password.trim());
    setBusy(false);

    if (result.status === 'ok') {
      router.replace('/(tabs)');
      return;
    }
    if (result.status === 'verification_required') {
      setMessage(copy.auth.verifyText);
      return;
    }
    if (result.status === 'email_not_verified') {
      setMessage(copy.auth.verifyErrorExpired);
      return;
    }
    if (result.status === 'error') {
      setMessage(result.message || copy.auth.errorGeneric);
    }
  };

  const toggleMode = () => setMode((current) => (current === 'login' ? 'register' : 'login'));

  return {
    mode,
    setMode,
    email,
    setEmail,
    password,
    setPassword,
    confirm,
    setConfirm,
    message,
    busy,
    isLoading,
    title,
    submitLabel,
    canSubmit,
    handleSubmit,
    toggleMode,
  };
}
