import "server-only";

const RETRYABLE_PG_CODES = new Set([
  "53300", // too_many_connections
  "57P03", // cannot_connect_now
  "08001", // sqlclient_unable_to_establish_sqlconnection
  "08006", // connection_failure
]);

const RETRYABLE_NODE_CODES = new Set([
  "ETIMEDOUT",
  "ECONNRESET",
  "ECONNREFUSED",
  "UND_ERR_CONNECT_TIMEOUT",
]);

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const isRetryable = (error: unknown) => {
  if (!error || typeof error !== "object") return false;
  const code = "code" in error ? String(error.code) : "";
  return RETRYABLE_PG_CODES.has(code) || RETRYABLE_NODE_CODES.has(code);
};

export async function withDbRetry<T>(run: () => Promise<T>, attempts = 3): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await run();
    } catch (error) {
      lastError = error;
      if (!isRetryable(error) || attempt === attempts) {
        throw error;
      }
      await sleep(200 * attempt);
    }
  }
  throw lastError;
}
