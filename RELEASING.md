# Releasing

DropDate versions frontend, backend and mobile independently. A version becomes official only after checks and deployment succeed.

## Normal release

Run releases from a clean, up-to-date `main` branch:

```bash
git checkout main
git pull --ff-only
yarn release:front:minor
yarn release:backend:minor
```

Available commands:

- `yarn release:front:major|minor|patch`
- `yarn release:backend:major|minor|patch`
- `yarn release:mobile:major|minor|patch`

The local command does not modify VERSION or create a tag. It:

1. refuses to run with uncommitted changes or outside `main`;
2. runs the full app-specific preflight suite;
3. creates and pushes a release-request commit.

CI then runs:

1. lint, typecheck, tests and build;
2. backend race detector or frontend Playwright smoke tests when applicable;
3. deployment;
4. VERSION bump;
5. release commit and app tag;
6. GitHub Release publication.

If checks or deployment fail, VERSION and tags remain unchanged.

## Local checks

```bash
yarn check:staged   # affected checks for staged files
yarn check:all      # complete workspace suite
yarn check:frontend # frontend lint, typecheck, tests and build
yarn check:backend  # backend lint, tests, build and race detector
```

`yarn install` configures `.githooks/pre-commit`. Every commit runs `yarn check:staged`; a failed check blocks the commit. Use `git commit --no-verify` only for an explicit emergency because CI still enforces the full suite.

## Version files and tags

- `apps/frontend/VERSION` → `frontend/vX.Y.Z`
- `apps/backend/VERSION` → `backend/vX.Y.Z`
- `apps/mobile/VERSION` → `mobile/vX.Y.Z`

Do not edit these files or push release tags manually during a normal release.

## Required GitHub secrets

- `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`
- `RENDER_DEPLOY_HOOK_URL`
- `MOBILE_DEPLOY_HOOK_URL` for mobile releases
