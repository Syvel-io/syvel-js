/**
 * Integration tests — require a real Syvel API key.
 *
 * These tests make actual HTTP requests to api.syvel.io.
 * They are skipped automatically when SYVEL_API_KEY is not set.
 *
 * Run locally:
 *   SYVEL_API_KEY=sv_your_key npm run test:integration
 *
 * In CI they are triggered by the integration.yml workflow,
 * which injects the secret as an environment variable.
 */

import { beforeAll, describe, expect, it } from "vitest";
import {
  Syvel,
  SyvelAuthError,
  SyvelValidationError,
} from "../index.js";

const apiKey = process.env.SYVEL_API_KEY;

// Skips the entire suite when SYVEL_API_KEY is not set.
// Note: the client is instantiated in beforeAll (not at describe-body level)
// so that describe.skip prevents the Syvel constructor from running.
const describeIfKey = apiKey ? describe : describe.skip;

describeIfKey("Integration — check()", () => {
  let client: Syvel;

  beforeAll(() => {
    client = new Syvel({ apiKey: apiKey! });
  });

  it("returns is_risky: true for a known disposable domain (yopmail.com)", async () => {
    const result = await client.check("yopmail.com");
    expect(result).not.toBeNull();
    expect(result!.is_risky).toBe(true);
    expect(result!.risk_score).toBe(100);
    expect(result!.reason).toBe("disposable");
  });

  it("returns is_risky: false for a safe domain (gmail.com)", async () => {
    const result = await client.check("gmail.com");
    expect(result).not.toBeNull();
    expect(result!.is_risky).toBe(false);
    expect(result!.is_free_provider).toBe(true);
  });

  it("returns all expected fields in the response", async () => {
    const result = await client.check("gmail.com");
    expect(result).toMatchObject({
      email: expect.any(String),
      is_risky: expect.any(Boolean),
      risk_score: expect.any(Number),
      reason: expect.stringMatching(/^(safe|disposable|undeliverable|role_account)$/),
      deliverability_score: expect.any(Number),
      is_free_provider: expect.any(Boolean),
      is_corporate_email: expect.any(Boolean),
      is_alias_email: expect.any(Boolean),
    });
  });
});

describeIfKey("Integration — checkEmail()", () => {
  let client: Syvel;

  beforeAll(() => {
    client = new Syvel({ apiKey: apiKey! });
  });

  it("detects a disposable email from its full address", async () => {
    const result = await client.checkEmail("user@yopmail.com");
    expect(result!.is_risky).toBe(true);
    expect(result!.reason).toBe("disposable");
  });

  it("detects a role account (admin@)", async () => {
    const result = await client.checkEmail("admin@gmail.com");
    expect(result).not.toBeNull();
    // role_account is detected from the local part — only possible with full email
    expect(result!.reason).toBe("role_account");
  });

  it("suggests a correction for a typo (gmial.com)", async () => {
    const result = await client.checkEmail("user@gmial.com");
    expect(result).not.toBeNull();
    expect(result!.did_you_mean).toBe("gmail.com");
  });
});

describeIfKey("Integration — error handling", () => {
  it("throws SyvelAuthError for an invalid API key", async () => {
    const client = new Syvel({ apiKey: "sv_invalid_key_for_testing" });
    await expect(client.check("gmail.com")).rejects.toBeInstanceOf(SyvelAuthError);
  });

  it("throws SyvelValidationError for an invalid domain", async () => {
    const client = new Syvel({ apiKey: apiKey! });
    await expect(client.check("not a valid domain")).rejects.toBeInstanceOf(
      SyvelValidationError,
    );
  });
});
