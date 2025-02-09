"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.retry = void 0;
// backend/src/utils.ts
async function retry(fn, attempts, backoff) {
    let lastError;
    for (let i = 0; i < attempts; i++) {
        try {
            return await fn();
        }
        catch (error) {
            lastError = error;
            console.warn(`Attempt ${i + 1} failed: ${error.message}`);
            if (i === attempts - 1)
                break;
            await new Promise((resolve) => setTimeout(resolve, Math.pow(backoff, i + 1) * 1000));
        }
    }
    throw lastError;
}
exports.retry = retry;
