import type { CheckResult, SyvelConfig } from "./types.js";
import {
  SyvelAuthError,
  SyvelError,
  SyvelForbiddenError,
  SyvelRateLimitError,
  SyvelTimeoutError,
  SyvelValidationError,
} from "./errors.js";

const DEFAULT_BASE_URL = "https://api.syvel.io";
const DEFAULT_TIMEOUT = 3000;

export class Syvel {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeout: number;
  private readonly silent: boolean;

  constructor(config: SyvelConfig) {
    if (!config.apiKey) {
      throw new Error("Syvel: apiKey is required");
    }
    this.apiKey = config.apiKey;
    this.baseUrl = (config.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, "");
    this.timeout = config.timeout ?? DEFAULT_TIMEOUT;
    this.silent = config.silent ?? false;
  }

  /**
   * Check a bare domain.
   *
   * @example
   * const result = await syvel.check("yopmail.com");
   * console.log(result?.is_risky); // true
   */
  async check(domain: string): Promise<CheckResult | null> {
    return this._request(domain);
  }

  /**
   * Check a full email address.
   *
   * Passing the full email (rather than just the domain) enables local-part
   * analysis: role accounts (admin@, info@…), random-string patterns, and
   * other suspicious signals that can only be detected from the local part.
   *
   * @example
   * const result = await syvel.checkEmail("user@yopmail.com");
   * console.log(result?.is_risky); // true
   */
  async checkEmail(email: string): Promise<CheckResult | null> {
    if (!email.includes("@")) {
      if (this.silent) return null;
      throw new SyvelError("Invalid email address: missing '@'");
    }
    return this._request(email);
  }

  private async _request(target: string): Promise<CheckResult | null> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(
        `${this.baseUrl}/v1/check/${encodeURIComponent(target)}`,
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
          },
          signal: controller.signal,
        },
      );

      clearTimeout(timer);

      return await this._handleResponse(response);
    } catch (err) {
      clearTimeout(timer);

      if (err instanceof Error && err.name === "AbortError") {
        const timeoutErr = new SyvelTimeoutError(this.timeout);
        if (this.silent) return null;
        throw timeoutErr;
      }

      if (this.silent) return null;
      throw err;
    }
  }

  private async _handleResponse(response: Response): Promise<CheckResult> {
    if (response.ok) {
      return (await response.json()) as CheckResult;
    }

    switch (response.status) {
      case 401:
        throw new SyvelAuthError();
      case 403:
        throw new SyvelForbiddenError();
      case 422: {
        const body = await response.json().catch(() => ({})) as {
          detail?: string | null;
        };
        throw new SyvelValidationError(body.detail);
      }
      case 429: {
        const body = await response.json().catch(() => ({})) as {
          reset_at?: string;
        };
        throw new SyvelRateLimitError(body.reset_at);
      }
      default: {
        const body = await response.json().catch(() => ({})) as {
          message?: string;
        };
        throw new SyvelError(
          body.message ?? `HTTP ${response.status}`,
          response.status,
        );
      }
    }
  }
}
