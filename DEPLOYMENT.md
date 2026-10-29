# Deploy the quality dashboard

The dashboard is a static site. Production files are generated in `dist/` and can be served from a domain root or a project subdirectory. No backend, API keys, or build secrets are needed by the dashboard.

## GitHub Pages

This repository includes `.github/workflows/deploy-pages.yml`, using official actions pinned to exact commits. It installs dependencies from the lockfile, builds the site with Node.js 24, and deploys `dist/` through GitHub Pages.

The repository owner must enable **Settings → Pages → Build and deployment → Source: GitHub Actions** once. The repository and account must support GitHub Pages; do not change repository visibility to work around a plan restriction.

After Pages is enabled, run **Actions → Deploy quality dashboard → Run workflow**. Future pushes to `main` deploy automatically. Use the successful deployment's **View deployment** link; a guessed URL does not confirm a successful deployment.

## Validate project-subdirectory hosting

```sh
npm run build
DASHBOARD_BASE_PATH=/quality-scorecard/ node tests/dashboard.mjs
```

This runs the functional browser suite with the same URL prefix used by a GitHub Pages project site, including asset loading, inspections, exports, persistence, and mobile navigation. The app uses hash-based navigation and relative asset paths, so it does not require server rewrite rules.

## Environment access needed to finish deployment from this chat

Git operations through the existing GitHub proxy work. The network policy currently blocks the GitHub API and the Pages hostname. Add these destinations to the existing allowed domains in environment settings, preserving the current presets and domains:

- `api.github.com` — inspect repository permissions, enable Pages, trigger and monitor deployment.
- `5y8nwmgws4-del.github.io` — check the live dashboard after deployment.

The attempted environment draft update returned `draft_not_editable`; these additions have **not** been saved or applied. `deployment/environment-access.json` preserves the required additions. Reuse the existing GitHub authentication before requesting any new credential; Git read access does not by itself confirm API administration or push permissions.

Publishing the cloud environment snapshot and publishing the dashboard to GitHub Pages are separate operations.
