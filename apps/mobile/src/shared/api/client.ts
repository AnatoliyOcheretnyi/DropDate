import { getBackendURL } from '../utils/config';
import { ApiError } from './errors';

type AuthAdapter = {
  getAccessToken: () => string | null;
  refresh: () => Promise<boolean>;
  onUnauthorized: () => void;
};

type ApiRequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown;
  auth?: boolean;
  timeoutMs?: number;
  retryAuth?: boolean;
};

let authAdapter: AuthAdapter | null = null;
let refreshPromise: Promise<boolean> | null = null;

export const configureApiAuth = (adapter: AuthAdapter) => {
  authAdapter = adapter;
};

const refreshOnce = async () => {
  if (!authAdapter) return false;
  if (!refreshPromise) {
    refreshPromise = authAdapter.refresh().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
};

const parsePayload = async (response: Response) => {
  if (response.status === 204) return undefined;
  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    return response.json().catch(() => undefined);
  }
  return response.text().catch(() => undefined);
};

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const {
    auth = false,
    timeoutMs = 15_000,
    retryAuth = true,
    headers,
    body,
    signal,
    ...requestInit
  } = options;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const abort = () => controller.abort();
  signal?.addEventListener('abort', abort, { once: true });

  try {
    const token = authAdapter?.getAccessToken();
    const response = await fetch(`${getBackendURL()}${path}`, {
      ...requestInit,
      signal: controller.signal,
      headers: {
        accept: 'application/json',
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(auth && token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    if (response.status === 401 && auth && retryAuth && (await refreshOnce())) {
      return apiRequest<T>(path, { ...options, retryAuth: false });
    }

    const payload = await parsePayload(response);
    if (!response.ok) {
      if (response.status === 401 && auth) authAdapter?.onUnauthorized();
      const data = payload as { message?: string; error?: string; code?: string } | undefined;
      throw new ApiError(
        data?.message ?? data?.error ?? `Request failed (${response.status})`,
        response.status,
        data?.code,
        payload,
      );
    }
    return payload as T;
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort', abort);
  }
}
