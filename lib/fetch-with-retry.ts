export type FetchWithRetryOptions = {
  maxRetries?: number;
  retryDelayMs?: number;
  retriableStatuses?: number[];
  onRetry?: (attempt: number, status?: number) => void;
};

const DEFAULT_RETRIABLE_STATUSES = [429, 500, 503];

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Wrapper reutilizabil pentru fetch cu retry pe statusuri de overload/server.
 * maxRetries = numărul de reîncercări după prima cerere.
 */
export async function fetchWithRetry(
  input: RequestInfo | URL,
  init?: RequestInit,
  options: FetchWithRetryOptions = {},
): Promise<Response> {
  const {
    maxRetries = 3,
    retryDelayMs = 2000,
    retriableStatuses = DEFAULT_RETRIABLE_STATUSES,
    onRetry,
  } = options;

  for (let attempt = 0; ; attempt++) {
    try {
      const response = await fetch(input, init);
      const shouldRetry =
        retriableStatuses.includes(response.status) && attempt < maxRetries;

      if (!shouldRetry) {
        return response;
      }

      onRetry?.(attempt + 1, response.status);
      await sleep(retryDelayMs);
    } catch (error) {
      if (attempt >= maxRetries) {
        throw error;
      }

      onRetry?.(attempt + 1);
      await sleep(retryDelayMs);
    }
  }
}
