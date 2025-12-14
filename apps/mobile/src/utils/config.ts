const DEFAULT_BACKEND_URL = 'http://localhost:8080';

export function getBackendURL(): string {
  const base = process.env.EXPO_PUBLIC_BACKEND_URL || DEFAULT_BACKEND_URL;
  return base.endsWith('/') ? base.slice(0, -1) : base;
}
