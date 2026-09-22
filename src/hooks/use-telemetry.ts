'use client';

import useSWR from 'swr';
import type { TelemetrySummaryDTO } from '@/lib/types/telemetry';

const fetcher = (url: string) =>
  fetch(url).then((res) => res.json() as Promise<TelemetrySummaryDTO>);

export function useTelemetry(projectId: string) {
  const { data, error, isLoading, isValidating, mutate } = useSWR<TelemetrySummaryDTO>(
    projectId ? `/api/telemetry/${projectId}` : null,
    fetcher,
    {
      refreshInterval: 30000,
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
    },
  );

  return {
    data,
    error,
    isLoading,
    isValidating,
    mutate,
  };
}
