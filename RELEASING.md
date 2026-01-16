# Releasing

This repo uses per-app versions and tag-based deploys.

## Versions
Each app has its own version file:
- apps/frontend/VERSION
- apps/backend/VERSION
- apps/mobile/VERSION

Update only the app you are releasing.

## Tags
Deploys are triggered by tags:
- frontend/vX.Y.Z
- backend/vX.Y.Z
- mobile/vX.Y.Z

## Automatic version bump (optional)
If you merge a commit into `main` with one of these tags in the commit message,
the workflow will bump the VERSION file, create the tag, and deploy:

- `#release:front:major|minor|patch`
- `#release:backend:major|minor|patch`
- `#release:mobile:major|minor|patch`

You can include multiple tags in one merge commit.

## Steps
1. Update the VERSION file for the app.
2. Commit the change.
3. Create the tag and push it.

Example (frontend):
```
git checkout main
git pull
echo "0.2.0" > apps/frontend/VERSION
git add apps/frontend/VERSION
git commit -m "chore(frontend): bump version to 0.2.0"
git tag frontend/v0.2.0
git push origin main --tags
```

If you want to use the helper script:
```
chmod +x scripts/release-tag.sh
scripts/release-tag.sh frontend 0.2.0
```

For local bump + tag + push in one command:
```
chmod +x scripts/release-local.sh
scripts/release-local.sh frontend minor
```

## Deploy hooks
The tag workflows expect deploy hooks:
- VERCEL_DEPLOY_HOOK_URL (frontend)
- RENDER_DEPLOY_HOOK_URL (backend)
- MOBILE_DEPLOY_HOOK_URL (mobile, optional)

Set these as GitHub Actions secrets.
