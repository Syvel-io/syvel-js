/**
 * Result returned by the Syvel API for a domain or email check.
 */
export interface CheckResult {
  /**
   * Masked input: local part is never exposed in plain text.
   * Example: "a9****e5@yopmail.com"
   */
  email: string;

  /**
   * `true` if risk_score ≥ the project threshold (default: 65).
   * Use this as the primary signal to block or warn the user.
   */
  is_risky: boolean;

  /**
   * Risk score from 0 (safe) to 100 (confirmed disposable).
   *
   * | Range  | Meaning               | Suggested action     |
   * |--------|-----------------------|----------------------|
   * | 0–29   | Safe                  | Accept               |
   * | 30–49  | Low risk              | Accept with caution  |
   * | 50–79  | High risk             | Show a warning       |
   * | 80–99  | Very likely disposable| Block or confirm     |
   * | 100    | Confirmed disposable  | Block                |
   */
  risk_score: number;

  /**
   * Primary reason for the risk assessment.
   * - `safe` — no risk detected
   * - `disposable` — known or detected disposable domain
   * - `undeliverable` — domain has no MX records or does not exist
   * - `role_account` — local part is a role address (admin@, info@, no-reply@…)
   */
  reason: "safe" | "disposable" | "undeliverable" | "role_account";

  /**
   * Deliverability score from 0 (unlikely to be delivered) to 100 (very likely).
   */
  deliverability_score: number;

  /**
   * Typo correction suggestion, e.g. `"gmail.com"` for input `"gmial.com"`.
   * `null` if no suggestion is available.
   */
  did_you_mean: string | null;

  /** `true` for consumer webmail providers (Gmail, Yahoo, Hotmail…). */
  is_free_provider: boolean;

  /** `true` for a business domain with a professional MX configuration. */
  is_corporate_email: boolean;

  /** `true` for privacy alias services (SimpleLogin, AnonAddy, Apple Hide My Email…). */
  is_alias_email: boolean;

  /**
   * Human-readable MX provider name, e.g. `"Google Workspace"`, `"Microsoft 365"`.
   * `null` if unknown.
   */
  mx_provider_label: string | null;
}

/**
 * Configuration options for the Syvel client.
 */
export interface SyvelConfig {
  /**
   * Your Syvel API key (starts with `sv_`).
   * Create one at https://www.syvel.io/dashboard.
   */
  apiKey: string;

  /**
   * API base URL. Defaults to `"https://api.syvel.io"`.
   * Override only for testing or proxying.
   */
  baseUrl?: string;

  /**
   * Request timeout in milliseconds. Defaults to `3000`.
   * Keep this low — the Syvel API typically responds in under 300 ms.
   * A low timeout ensures a degraded service never delays your users.
   */
  timeout?: number;

  /**
   * When `true`, all errors are caught and the method returns `null` instead of throwing.
   * Use this for fire-and-forget checks where you want automatic fail-open behaviour.
   * Defaults to `false`.
   */
  silent?: boolean;
}
