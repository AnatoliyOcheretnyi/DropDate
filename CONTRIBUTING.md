# Contributing

## Branching
- main: stable, deployable
- feat/*: new feature
- fix/*: bug fix
- chore/*: maintenance

## PRs
1. Create a feature branch.
2. Keep changes focused.
3. Fill in the PR template.

## Versioning
Each app has its own version in:
- apps/frontend/VERSION
- apps/backend/VERSION
- apps/mobile/VERSION

Use SemVer: MAJOR.MINOR.PATCH

## Tag-based deploys
Deployments are triggered by tags:
- frontend/vX.Y.Z
- backend/vX.Y.Z
- mobile/vX.Y.Z

See `RELEASING.md` for the exact steps.
