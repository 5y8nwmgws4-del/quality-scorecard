# Qualis — Quality dashboard

A responsive quality-management dashboard built with React, TypeScript, and Vite.

## Run locally

Requires Node.js 22.12+ (validated with Node.js 24).

```sh
npm ci
npm run dev
```

The development server uses port 5173 by default. To select another port, run `npm run dev -- --port 3000`.

## Included workflows

- Quality scores, inspection volume, pass rates, and open-issue metrics.
- Interactive score/pass-rate trends and inspection outcome breakdowns.
- Location and date filters, inspection search, sorting, status filters, and pagination.
- Create a scheduled inspection, enter a score, and complete it.
- Investigate, resolve, and reopen issues through corrective-action details.
- Location and category scorecards, plus filtered CSV downloads.
- Local team management, workspace settings, notifications, and a help guide.
- Responsive mobile navigation, keyboard controls, and accessible dialogs.

## Demo data

This is a standalone frontend with deterministic sample data, anchored to **October 29, 2026**. No backend or live integrations are connected. Added inspections, issue updates, team members, and workspace settings are stored in this browser's `localStorage`; they are not shared between users or browsers. Adding a team member does not send an invitation.

## Validation

```sh
npm run build
npm run test:e2e
```

The browser checks run against the production build. They require Chromium at `/usr/bin/chromium`; use `CHROMIUM_PATH=/path/to/chromium npm run test:e2e` to override it. Tests cover filtering, search, pagination, inspection creation and completion, persistence, filtered CSV exports, issue resolution, reports, team management, settings, and mobile layouts. Screenshots are written to the ignored `test-results/` directory.

## Hosting

See [DEPLOYMENT.md](DEPLOYMENT.md) for GitHub Pages deployment, required access, and validation under a project URL. A running development server is internal to the cloud workspace; it does not create a public link.
