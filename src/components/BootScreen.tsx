import { useEffect, useState } from 'react';
import type { ApiError } from '../api/client';

/** Shown until the catalog arrives. Free hosting sleeps when idle, so the first request can take ~50s. */
export function BootScreen({ error, onRetry }: { error: ApiError | null; onRetry: () => void }) {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setSlow(true), 4000);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="h-14 border-b border-gray-200 bg-white" />
      <div className="mx-auto grid max-w-6xl gap-8 px-4 pt-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4" aria-busy={!error}>
          {error ? (
            <div role="alert" className="rounded-xl border border-gray-200 bg-white p-6">
              <p className="text-base font-semibold text-gray-950">We couldn’t load the store</p>
              <p className="mt-1 text-sm text-gray-600">{error.message}</p>
              <button type="button" onClick={onRetry} className="mt-4 min-h-11 rounded-lg bg-brand-600 px-4 text-sm font-medium text-white hover:bg-brand-700 sm:min-h-10">
                Try again
              </button>
            </div>
          ) : (
            <>
              <div className="h-6 w-48 animate-pulse rounded bg-gray-200" />
              <div className="h-8 w-72 animate-pulse rounded bg-gray-200" />
              <div className="h-64 animate-pulse rounded-xl bg-gray-200" />
              <div className="h-40 animate-pulse rounded-xl bg-gray-200" />
              <p className="text-sm text-gray-600" role="status">
                {slow ? 'Starting the server — this can take up to a minute on first visit…' : 'Loading plans and prices…'}
              </p>
            </>
          )}
        </div>
        <div className="hidden h-96 animate-pulse rounded-xl bg-gray-200 lg:block" />
      </div>
    </div>
  );
}
