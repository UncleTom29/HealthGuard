// backend/src/utils.ts
export async function retry<T>(
    fn: () => Promise<T>,
    attempts: number,
    backoff: number
  ): Promise<T> {
    let lastError: any;
    for (let i = 0; i < attempts; i++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        console.warn(`Attempt ${i + 1} failed: ${error.message}`);
        if (i === attempts - 1) break;
        await new Promise((resolve) => setTimeout(resolve, Math.pow(backoff, i + 1) * 1000));
      }
    }
    throw lastError;
  }
  