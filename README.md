# CalendarFuse

**Every calendar. One source of truth.**

CalendarFuse is an executive calendar command center for leaders and the assistants who manage their time. The current repository contains a polished public site and an interactive private-beta demo with fictional data.

## Included in this build

- Unified executive day view across Google, Microsoft, Apple, and Salesforce sample sources
- Calendar health score, duplicate review, conflict resolution, source health, assistant permissions, and activity history
- Guided product tour with on-device speech synthesis, automatic natural-voice selection, visible captions, and captions-only mode
- Real screenshots captured from the product UI and used throughout the marketing site
- Privacy Policy, Terms of Service, Security, Support, and Data Deletion pages
- SEO metadata, Open Graph artwork, manifest, sitemap, robots file, security headers, and `security.txt`
- Responsive layouts for desktop, tablet, and mobile
- Lightweight Vercel status function at `/api/status`

## Important product status

The public app is a realistic interactive demo. It does **not** connect to or store real calendar accounts. Google Workspace, Microsoft 365, Apple Calendar, and Salesforce connections require provider app registrations, OAuth credentials, secure token storage, background synchronization, and production testing before they can be enabled.

## Local development

No package installation or build step is required.

```bash
python3 -m http.server 4173
```

Then open `http://localhost:4173`.

## Vercel deployment

Import this repository into Vercel with the project root set to the repository root. Framework preset can remain **Other**. The included `vercel.json` enables clean URLs, caching, and security headers.

## Production integration roadmap

1. Authentication and workspace model
2. Google Calendar OAuth and webhook/sync pipeline
3. Microsoft Graph OAuth and subscription pipeline
4. Canonical event store and provider mutation queue
5. Assistant role-based access controls and audit persistence
6. Duplicate fingerprinting and review engine
7. Apple iCloud / CalDAV connector
8. Salesforce OAuth and CRM event context
9. Billing, onboarding, monitoring, export, and account deletion automation

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the proposed technical model.

## Support

`support@calendarfuse.com`

CalendarFuse is operated by ND SOFT LLC.
