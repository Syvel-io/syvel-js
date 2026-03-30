import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  Syvel,
  SyvelAuthError,
  SyvelError,
  SyvelForbiddenError,
  SyvelRateLimitError,
  SyvelTimeoutError,
  SyvelValidationError,
} from "../index.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const mockFetch = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", mockFetch);
  mockFetch.mockReset();
});

function mockResponse(status: number, body: unknown): void {
  mockFetch.mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  });
}

const SAMPLE_RESULT = {
  email: "a9****e5@yopmail.com",
  is_risky: true,
  risk_score: 100,
  reason: "disposable",
  deliverability_score: 0,
  did_you_mean: null,
  is_free_provider: false,
  is_corporate_email: false,
  is_alias_email: false,
  mx_provider_label: "Yopmail",
};

// ---------------------------------------------------------------------------
// Constructor
// ---------------------------------------------------------------------------

describe("Syvel constructor", () => {
  it("throws when apiKey is missing", () => {
    expect(() => new Syvel({ apiKey: "" })).toThrow("apiKey is required");
  });

  it("accepts a valid config", () => {
    expect(() => new Syvel({ apiKey: "sv_test" })).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// check()
// ---------------------------------------------------------------------------

describe("check()", () => {
  it("returns a CheckResult for a known disposable domain", async () => {
    mockResponse(200, SAMPLE_RESULT);
    const client = new Syvel({ apiKey: "sv_test" });
    const result = await client.check("yopmail.com");
    expect(result?.is_risky).toBe(true);
    expect(result?.risk_score).toBe(100);
    expect(result?.reason).toBe("disposable");
  });

  it("sends the domain in the URL path", async () => {
    mockResponse(200, SAMPLE_RESULT);
    const client = new Syvel({ apiKey: "sv_test" });
    await client.check("yopmail.com");
    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.syvel.io/v1/check/yopmail.com",
      expect.any(Object),
    );
  });

  it("sends the Authorization header", async () => {
    mockResponse(200, SAMPLE_RESULT);
    const client = new Syvel({ apiKey: "sv_mykey" });
    await client.check("yopmail.com");
    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer sv_mykey",
        }),
      }),
    );
  });

  it("uses a custom baseUrl when provided", async () => {
    mockResponse(200, SAMPLE_RESULT);
    const client = new Syvel({ apiKey: "sv_test", baseUrl: "https://proxy.example.com/" });
    await client.check("yopmail.com");
    expect(mockFetch).toHaveBeenCalledWith(
      "https://proxy.example.com/v1/check/yopmail.com",
      expect.any(Object),
    );
  });
});

// ---------------------------------------------------------------------------
// checkEmail()
// ---------------------------------------------------------------------------

describe("checkEmail()", () => {
  it("passes the full email to the API (not just the domain)", async () => {
    mockResponse(200, SAMPLE_RESULT);
    const client = new Syvel({ apiKey: "sv_test" });
    await client.checkEmail("user@yopmail.com");
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("user%40yopmail.com"),
      expect.any(Object),
    );
  });

  it("throws SyvelError when email is missing @", async () => {
    const client = new Syvel({ apiKey: "sv_test" });
    await expect(client.checkEmail("notanemail")).rejects.toBeInstanceOf(SyvelError);
  });

  it("returns null for missing @ when silent: true", async () => {
    const client = new Syvel({ apiKey: "sv_test", silent: true });
    const result = await client.checkEmail("notanemail");
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Error handling
// ---------------------------------------------------------------------------

describe("error handling", () => {
  it("throws SyvelAuthError on 401", async () => {
    mockResponse(401, { error: "unauthorized", message: "Missing or invalid API key." });
    const client = new Syvel({ apiKey: "sv_bad" });
    await expect(client.check("test.com")).rejects.toBeInstanceOf(SyvelAuthError);
  });

  it("SyvelAuthError has statusCode 401", async () => {
    mockResponse(401, {});
    const client = new Syvel({ apiKey: "sv_bad" });
    await expect(client.check("test.com")).rejects.toMatchObject({ statusCode: 401 });
  });

  it("throws SyvelForbiddenError on 403", async () => {
    mockResponse(403, { error: "forbidden", message: "This origin is not authorised." });
    const client = new Syvel({ apiKey: "sv_test" });
    await expect(client.check("test.com")).rejects.toBeInstanceOf(SyvelForbiddenError);
  });

  it("throws SyvelValidationError on 422", async () => {
    mockResponse(422, {
      error: "validation_error",
      message: "Invalid email or domain format.",
      detail: "Value must be a valid email address or hostname.",
    });
    const client = new Syvel({ apiKey: "sv_test" });
    await expect(client.check("not valid")).rejects.toBeInstanceOf(SyvelValidationError);
  });

  it("throws SyvelRateLimitError on 429", async () => {
    mockResponse(429, {
      error: "quota_exceeded",
      message: "Monthly quota reached.",
      reset_at: "2026-04-01T00:00:00Z",
    });
    const client = new Syvel({ apiKey: "sv_test" });
    const err = await client.check("test.com").catch((e) => e);
    expect(err).toBeInstanceOf(SyvelRateLimitError);
    expect((err as SyvelRateLimitError).resetAt).toBe("2026-04-01T00:00:00Z");
  });

  it("throws SyvelError with message on 500", async () => {
    mockResponse(500, { message: "An unexpected error occurred." });
    const client = new Syvel({ apiKey: "sv_test" });
    const err = await client.check("test.com").catch((e) => e);
    expect(err).toBeInstanceOf(SyvelError);
    expect(err.message).toBe("An unexpected error occurred.");
    expect(err.statusCode).toBe(500);
  });

  it("throws SyvelError with fallback message when 500 body is unparseable", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () => Promise.reject(new Error("not json")),
    });
    const client = new Syvel({ apiKey: "sv_test" });
    const err = await client.check("test.com").catch((e) => e);
    expect(err.message).toBe("HTTP 500");
  });
});

// ---------------------------------------------------------------------------
// Silent mode
// ---------------------------------------------------------------------------

describe("silent mode", () => {
  it("returns null on network error", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));
    const client = new Syvel({ apiKey: "sv_test", silent: true });
    const result = await client.check("test.com");
    expect(result).toBeNull();
  });

  it("returns null on 401", async () => {
    mockResponse(401, {});
    const client = new Syvel({ apiKey: "sv_bad", silent: true });
    expect(await client.check("test.com")).toBeNull();
  });

  it("returns null on 429", async () => {
    mockResponse(429, { reset_at: "2026-04-01T00:00:00Z" });
    const client = new Syvel({ apiKey: "sv_test", silent: true });
    expect(await client.check("test.com")).toBeNull();
  });

  it("returns null on timeout", async () => {
    vi.useFakeTimers();
    mockFetch.mockImplementationOnce((_url: string, opts: { signal: AbortSignal }) => {
      return new Promise((_resolve, reject) => {
        opts.signal.addEventListener("abort", () => {
          const err = new Error("Aborted");
          err.name = "AbortError";
          reject(err);
        });
      });
    });

    const client = new Syvel({ apiKey: "sv_test", silent: true, timeout: 100 });
    const promise = client.check("test.com");
    vi.advanceTimersByTime(150);
    expect(await promise).toBeNull();
    vi.useRealTimers();
  });
});

// ---------------------------------------------------------------------------
// Timeout — throwing mode
// ---------------------------------------------------------------------------

describe("timeout (throwing mode)", () => {
  it("throws SyvelTimeoutError after the configured timeout", async () => {
    vi.useFakeTimers();
    mockFetch.mockImplementationOnce((_url: string, opts: { signal: AbortSignal }) => {
      return new Promise((_resolve, reject) => {
        opts.signal.addEventListener("abort", () => {
          const err = new Error("Aborted");
          err.name = "AbortError";
          reject(err);
        });
      });
    });

    const client = new Syvel({ apiKey: "sv_test", timeout: 100 });
    const promise = client.check("test.com");
    vi.advanceTimersByTime(150);
    await expect(promise).rejects.toBeInstanceOf(SyvelTimeoutError);
    vi.useRealTimers();
  });
});
