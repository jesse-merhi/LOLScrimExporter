
const BASE_DELAY = 1000; // 1 second
export const getBackoffDelay = (retryCount: number) => {
    const exponentialDelay = BASE_DELAY * Math.pow(2, retryCount);
    const jitter = Math.random() * 1000; // Add up to 1 second of random jitter
    return exponentialDelay + jitter;
};

// In your "@/lib/api.ts" file:
export async function fetchWithRetry(
    url: string,
    options: RequestInit,
    attempt = 0,
    onRetry?: (attempt: number, delay: number) => void
): Promise<Response> {
    const response = await fetch(url, options);
    if (response.status === 429) {
        const delay = getBackoffDelay(attempt);
        // Call the callback so the UI can update:
        if (onRetry) {
            onRetry(attempt, delay);
        }
        await new Promise((resolve) => setTimeout(resolve, delay));
        return fetchWithRetry(url, options, attempt + 1, onRetry);
    }
    return response;
}
