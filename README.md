# AssetTrack Pro

A professional, single-page **Asset Management System** built with vanilla HTML/CSS/JS, Bootstrap 5, and Chart.js. Track hardware, software licenses, and equipment across your organization — assign assets to people, monitor maintenance and warranty status, and generate reports, all from a fast, responsive dashboard.

This build is localized for **Ghana** 🇬🇭: all monetary values are displayed in **Ghanaian Cedi (GH₵ / GHS)**, sample locations are Kitchen, Office, and Church, and sample data uses Ghanaian names and vendors.

🔗 **Live demo:** published via GitHub Pages (see below for the link once deployed).

## Features

- **Dashboard** — KPIs (total assets, total value, assigned count, in-maintenance count), status/category/value charts, upcoming warranty expirations, and recent activity feed.
- **Assets** — searchable, sortable, paginated inventory table with filters by category, status, and location. Full create/edit/delete workflow via a modal form.
- **Assignments** — view and manage who has which asset, with one-click unassign.
- **Maintenance** — track assets currently under maintenance and mark them resolved.
- **Reports** — estimated straight-line depreciation per asset, assets acquired over time, and a category-level inventory summary (count, total value, estimated book value).
- **Settings** — manage the categories/locations used across the app; reset to sample data or clear everything.
- **Import / Export** — export the current (filtered) asset list to CSV or JSON, and import assets back in from either format.

## Tech stack

- HTML5 + CSS3 (custom styles in `css/styles.css`)
- [Bootstrap 5](https://getbootstrap.com/) + [Bootstrap Icons](https://icons.getbootstrap.com/) (via CDN)
- [Chart.js](https://www.chartjs.org/) (via CDN)
- Vanilla JavaScript (no build step, no framework)
- **Data persistence:** browser `localStorage` — there is no backend server, so the app works entirely client-side. This makes it fully compatible with static hosting like GitHub Pages. Sample data is seeded automatically on first load.

> Because GitHub Pages only serves static files, this app intentionally has no server-side component. All data lives in your browser's local storage. Use the Export/Import feature to back up or move data between browsers/devices.

## Running locally

No build step is required. Any static file server works, for example:

```bash
# Python
python -m http.server 8080

# Node
npx serve .
```

Then open `http://localhost:8080` in your browser.

## Project structure

```
asset-manager/
├── index.html              # Single-page app shell (dashboard, assets, assignments, maintenance, reports, settings)
├── css/
│   └── styles.css          # App styling (sidebar, cards, tables, responsive layout)
├── js/
│   ├── store.js            # localStorage-backed data layer + sample data seeding
│   ├── charts.js           # Chart.js rendering helpers
│   └── app.js               # UI logic: routing, CRUD, filters, sorting, import/export
└── .github/workflows/pages.yml  # GitHub Actions workflow that deploys to GitHub Pages
```

## Deployment

This repository is configured to automatically deploy to **GitHub Pages** via GitHub Actions on every push to `main`. See `.github/workflows/pages.yml`.

## License

MIT — feel free to use and adapt this project.
