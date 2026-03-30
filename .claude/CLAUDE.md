# syvel-js

## Testing

- Unit tests (offline, no API key needed): `npm test`
- Integration tests (requires SYVEL_API_KEY): `npm run test:integration`
- Watch mode: `npm run test:watch`

## Formatting & Linting

- Format: `just format` (uses prettier)
- Lint: `just lint` (uses eslint, also auto-fixes)
- Lint check only: `just lint-check`

## Key Locations

- `src/client.ts` — classe Syvel, méthodes check() et checkEmail()
- `src/types.ts` — interfaces TypeScript publiques (CheckResult, SyvelConfig)
- `src/errors.ts` — hiérarchie d'erreurs (SyvelError et sous-classes)
- `src/index.ts` — exports publics du package
- `src/__tests__/client.test.ts` — tests unitaires (fetch mocké)
- `src/__tests__/integration.test.ts` — tests d'intégration (API réelle)
- `.github/workflows/ci.yml` — CI typecheck + lint + tests unitaires sur chaque push
- `.github/workflows/release.yml` — CI Changesets : crée la Release PR ou publie sur npm
- `.github/workflows/integration.yml` — CI tests d'intégration sur push main
- `.changeset/config.json` — configuration Changesets (access, baseBranch…)

## Conventions

- Multi-platform: exports pour Node.js 18+, browser, Deno, Bun, workers
- Zero dépendances runtime (fetch natif uniquement)
- Dependencies installed via npm
- All code must run on Node 18+ (see `engines` in package.json)

### Comments

- Comments MUST only be used to:
  1. Document a function
  2. Explain the WHY of a piece of code
  3. Explain a particularly complicated piece of code
- Comments NEVER should be used to:
  1. Say what used to be there. That's no longer relevant!
  2. Explain the WHAT of a piece of code (unless it's very non-obvious)

It's ok not to put comments on/in a function if their addition wouldn't meaningfully clarify anything.