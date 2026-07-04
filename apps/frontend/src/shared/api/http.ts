"use client";

import axios, { AxiosError, type AxiosRequestConfig } from "axios";

export type ApiResult<T> = {
  ok: boolean;
  payload: T | null;
  status: number;
};

type ApiErrorPayload = {
  message?: string;
  error?: string;
};

export const webApi = axios.create({
  withCredentials: true,
  headers: {
    accept: "application/json",
  },
});

export async function requestApi<T>(
  config: AxiosRequestConfig
): Promise<ApiResult<T>> {
  const response = await webApi.request<T>({
    validateStatus: () => true,
    ...config,
  });

  return {
    ok: response.status >= 200 && response.status < 300,
    payload: (response.data as T | undefined) ?? null,
    status: response.status,
  };
}

export function getApiErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    const payload = error.response?.data as ApiErrorPayload | undefined;
    return payload?.message || payload?.error || error.message || fallback;
  }
  return error instanceof Error && error.message ? error.message : fallback;
}

export function isAxiosAbort(error: unknown) {
  return (
    (error instanceof AxiosError && error.code === "ERR_CANCELED") ||
    (error instanceof Error && error.name === "CanceledError")
  );
}
