# @syvel/js

[![npm version](https://img.shields.io/npm/v/@syvel/js)](https://www.npmjs.com/package/@syvel/js)
[![npm downloads](https://img.shields.io/npm/dm/@syvel/js)](https://www.npmjs.com/package/@syvel/js)
[![license](https://img.shields.io/npm/l/@syvel/js)](LICENSE)

Official JavaScript/TypeScript SDK for [Syvel](https://www.syvel.io) — disposable email detection API.

Works in **browser**, **Node.js 18+**, **React**, **Next.js**, and **Deno**.
Zero dependencies. TypeScript-first. Fail-open by default.

## Install

```bash
npm install @syvel/js
# or
yarn add @syvel/js
# or
pnpm add @syvel/js
```

## Quick start

```typescript
import { Syvel } from "@syvel/js";

const syvel = new Syvel({ apiKey: "sv_your_key" });

try {
  const result = await syvel.checkEmail("user@example.com");

  if (result.is_risky) {
    // block or warn the user
  }
} catch {
  // API unavailable — fail open, let the user through
}
```

> **Always wrap Syvel calls in a `try/catch`.** If the API is unreachable (network error, timeout, quota exceeded), the check should be skipped and the user let through. Never let a third-party service block a sign-up.

## Configuration

```typescript
const syvel = new Syvel({
  apiKey: "sv_your_key",

  // Timeout in ms (default: 3000).
  // Keep it low — the API typically responds in under 300 ms.
  timeout: 3000,

  // Silent mode: returns null instead of throwing on any error.
  // Ideal for fire-and-forget checks with automatic fail-open behaviour.
  silent: true,
});
```

## API

### `syvel.checkEmail(email)`

Check a full email address. Passing the full email (rather than just the domain) enables local-part analysis: role accounts (`admin@`, `info@`…), random-string patterns, and other signals that can only be detected from the local part.

```typescript
const result = await syvel.checkEmail("user@yopmail.com");
// result.is_risky        → true
// result.risk_score      → 100
// result.reason          → "disposable"
// result.did_you_mean    → null
```

### `syvel.check(domain)`

Check a bare domain.

```typescript
const result = await syvel.check("yopmail.com");
```

### Response

| Field                  | Type             | Description                                                      |
| ---------------------- | ---------------- | ---------------------------------------------------------------- |
| `email`                | `string`         | Masked input — local part is never exposed in plain text         |
| `is_risky`             | `boolean`        | `true` if `risk_score` ≥ threshold (default: 65)                 |
| `risk_score`           | `number`         | 0 (safe) to 100 (confirmed disposable)                           |
| `reason`               | `string`         | `"safe"` · `"disposable"` · `"undeliverable"` · `"role_account"` |
| `deliverability_score` | `number`         | 0 (unlikely) to 100 (very likely to be delivered)                |
| `did_you_mean`         | `string \| null` | Typo correction suggestion                                       |
| `is_free_provider`     | `boolean`        | Consumer webmail (Gmail, Yahoo…)                                 |
| `is_corporate_email`   | `boolean`        | Business domain with professional MX                             |
| `is_alias_email`       | `boolean`        | Privacy alias service (SimpleLogin, AnonAddy…)                   |
| `mx_provider_label`    | `string \| null` | Human-readable MX provider name                                  |

## Error handling

The SDK exports typed error classes so you can handle specific cases:

```typescript
import {
  Syvel,
  SyvelAuthError,
  SyvelForbiddenError,
  SyvelRateLimitError,
  SyvelTimeoutError,
  SyvelValidationError,
} from "@syvel/js";

try {
  const result = await syvel.checkEmail("user@example.com");
} catch (err) {
  if (err instanceof SyvelAuthError) {
    // Invalid API key — check your configuration
  } else if (err instanceof SyvelRateLimitError) {
    // Quota exceeded — err.resetAt contains the reset timestamp
    console.log("Quota resets at", err.resetAt);
  } else if (err instanceof SyvelTimeoutError) {
    // Request timed out — fail open, let the user through
  } else {
    // Network error or unexpected error — fail open
  }
}
```

| Error class            | Cause                                          |
| ---------------------- | ---------------------------------------------- |
| `SyvelAuthError`       | Invalid or missing API key (HTTP 401)          |
| `SyvelForbiddenError`  | Origin not whitelisted for this key (HTTP 403) |
| `SyvelValidationError` | Invalid email or domain format (HTTP 422)      |
| `SyvelRateLimitError`  | Monthly quota exceeded (HTTP 429)              |
| `SyvelTimeoutError`    | Request exceeded the configured timeout        |
| `SyvelError`           | Base class — all other API errors              |

All error classes extend `SyvelError`, which extends the native `Error`.

## Examples

### HTML form with debounced validation

```html
<form id="signup-form">
  <input type="email" id="email" placeholder="your@email.com" />
  <p id="email-error" style="color:red; display:none"></p>
  <button type="submit">Sign up</button>
</form>

<script type="module">
  import { Syvel } from "https://cdn.jsdelivr.net/npm/@syvel/js";

  const syvel = new Syvel({ apiKey: "sv_your_key" });
  const emailInput = document.getElementById("email");
  const emailError = document.getElementById("email-error");
  let timer;

  emailInput.addEventListener("input", () => {
    clearTimeout(timer);
    timer = setTimeout(async () => {
      if (!emailInput.value.includes("@")) return;
      try {
        const result = await syvel.checkEmail(emailInput.value);
        if (result?.is_risky) {
          emailError.textContent = "Please use a professional email address.";
          emailError.style.display = "block";
        } else {
          emailError.style.display = "none";
        }
      } catch {
        emailError.style.display = "none"; // fail open
      }
    }, 500);
  });
</script>
```

### React hook

```tsx
import { useState, useCallback } from "react";
import { Syvel } from "@syvel/js";

const syvel = new Syvel({ apiKey: import.meta.env.VITE_SYVEL_API_KEY });

export function useEmailCheck() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const check = useCallback(async (email: string) => {
    if (!email.includes("@")) return;
    setLoading(true);
    try {
      setResult(await syvel.checkEmail(email));
    } catch {
      setResult(null); // fail open
    } finally {
      setLoading(false);
    }
  }, []);

  return { result, loading, check };
}
```

### React Hook Form

```tsx
import { useForm } from "react-hook-form";
import { Syvel } from "@syvel/js";

const syvel = new Syvel({ apiKey: "sv_your_key" });

function SignupForm() {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm();

  const onSubmit = async (data) => {
    try {
      const result = await syvel.checkEmail(data.email);
      if (result?.is_risky) {
        setError("email", { message: "Please use a valid email address." });
        return;
      }
    } catch {
      // Syvel unavailable — fail open
    }
    // continue with registration...
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register("email")} type="email" />
      {errors.email && <p>{errors.email.message}</p>}
      <button type="submit">Sign up</button>
    </form>
  );
}
```

## Documentation

Full documentation, API reference, and more examples:
**[syvel.io/docs/integrations/javascript](https://www.syvel.io/docs/integrations/javascript)**

## License

MIT
