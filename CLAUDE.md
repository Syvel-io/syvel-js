# syvel-js

## Testing

## Formatting & Linting

- Format: `just format` (uses prettier)
- Lint: `just lint` (uses eslint, also auto-fixes)
- Lint check only: `just lint-check`

## Key Locations


## Conventions

- Multi-platform: exports for Node.js, browser, Deno, Bun, workers
- Dependencies installed via yarn
- All code must run on all supported Node versions (full list in the test section of @.github/workflows/ci.yml)

### Comments

- Comments MUST only be used to:
    1. Document a function
    2. Explain the WHY of a piece of code
    3. Explain a particularly complicated piece of code
- Comments NEVER should be used to:
    1. Say what used to be there. That's no longer relevant!
    2. Explain the WHAT of a piece of code (unless it's very non-obvious)

It's ok not to put comments on/in a function if their addition wouldn't meaningfully clarify anything.