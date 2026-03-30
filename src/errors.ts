/**
 * Base error class for all Syvel SDK errors.
 */
export class SyvelError extends Error {
  /** HTTP status code returned by the API, if applicable. */
  readonly statusCode?: number;

  /** Machine-readable error code. */
  readonly code?: string;

  constructor(message: string, statusCode?: number, code?: string) {
    super(message);
    this.name = "SyvelError";
    this.statusCode = statusCode;
    this.code = code;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown when the request exceeds the configured timeout.
 * Always fail open when catching this — never block a user because of a timeout.
 */
export class SyvelTimeoutError extends SyvelError {
  constructor(timeoutMs: number) {
    super(`Syvel request timed out after ${timeoutMs}ms`, undefined, "TIMEOUT");
    this.name = "SyvelTimeoutError";
  }
}

/**
 * Thrown on HTTP 401 — the API key is missing or invalid.
 */
export class SyvelAuthError extends SyvelError {
  constructor() {
    super("Invalid or missing Syvel API key", 401, "UNAUTHORIZED");
    this.name = "SyvelAuthError";
  }
}

/**
 * Thrown on HTTP 403 — the API key is valid but the request origin is not
 * in the key's allowed origins list.
 * Add the origin in your Syvel dashboard to fix this.
 */
export class SyvelForbiddenError extends SyvelError {
  constructor() {
    super("This origin is not authorised for this API key", 403, "FORBIDDEN");
    this.name = "SyvelForbiddenError";
  }
}

/**
 * Thrown on HTTP 422 — the email or domain failed input validation.
 * This is typically a programming error (invalid format passed to the SDK).
 */
export class SyvelValidationError extends SyvelError {
  constructor(detail?: string | null) {
    super(detail ?? "Invalid email or domain format", 422, "VALIDATION_ERROR");
    this.name = "SyvelValidationError";
  }
}

/**
 * Thrown on HTTP 429 — the account's monthly quota has been reached.
 * Always fail open when catching this — never block a user because of a quota.
 */
export class SyvelRateLimitError extends SyvelError {
  /** ISO 8601 timestamp of when the quota resets. */
  readonly resetAt?: string;

  constructor(resetAt?: string) {
    super(
      "Monthly quota reached — upgrade your plan or wait for the reset",
      429,
      "RATE_LIMIT_EXCEEDED",
    );
    this.name = "SyvelRateLimitError";
    this.resetAt = resetAt;
  }
}
