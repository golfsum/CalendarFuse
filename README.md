# CalendarFuse

**Every calendar. One source of truth.**

CalendarFuse is an executive calendar command center for leaders and the assistants who manage their time. The repository includes the public marketing site, an interactive demo with fictional data, Firebase authentication scaffolding, Stripe subscription billing scaffolding, and a deterministic duplicate-event merge engine.

## Included in this build

- Unified executive day view across Google, Microsoft, Apple, and Salesforce sample sources
- Calendar health score, duplicate review, conflict resolution, source health, assistant permissions, and activity history
- Guided product tour with on-device speech synthesis, automatic natural-voice selection, visible captions, and captions-only mode
- Firebase email/password and Google sign-in UI at `/login`
- Authenticated account/billing dashboard at `/account`
- Stripe hosted Checkout, Customer Portal, and webhook endpoints
- Firestore-backed user billing state via Firebase Admin
- Deterministic duplicate-event scoring and canonical-event preservation logic with automated tests
- Privacy Policy, Terms of Service, Security, Support, and Data Deletion pages
- SEO metadata, Open Graph artwork, manifest, sitemap, robots file, security headers, and `security.txt`
- Responsive layouts for desktop, tablet, and mobile
- Vercel status function at `/api/status`

## Current product status

The public `/app` remains a realistic interactive demo so visitors can evaluate CalendarFuse without signing in. Authentication and billing code is now present, but it becomes functional only after the Firebase and Stripe environment variables are configured in Vercel.

Real Google Workspace, Microsoft 365, Apple Calendar, and Salesforce connections still require provider app registrations, OAuth credentials, secure token storage, background synchronization, and production testing before they can be enabled.

## Required environment variables

Copy `.env.example` and configure the matching values in Vercel. Firebase requires the public web-app configuration plus `FIREBASE_SERVICE_ACCOUNT_JSON`. Stripe requires `STRIPE_SECRET_KEY`, a recurring `STRIPE_PRICE_ID`, and the signing secret for the `/api/stripe-webhook` endpoint.

The intended rollout is Stripe test mode first, then live mode only after sign-in, Checkout, portal access, webhook synchronization, and cancellation flows have been verified end to end.

## Local development

Install server dependencies and run the static site plus Vercel-compatible functions using your preferred local Vercel workflow.

```bash
npm install
npm test
```

For static-only viewing you can still run:

```bash
python3 -m http.server 4173
```

## Vercel deployment

Import this repository into Vercel with the project root set to the repository root. Framework preset can remain **Other**. The included `vercel.json` enables clean URLs, caching, security headers, Firebase Auth network access, and no-store API caching.

## Production integration roadmap

1. Configure Firebase Authentication and Firestore
2. Configure Stripe test-mode price, webhook, and Customer Portal
3. Google Calendar OAuth and webhook/sync pipeline
4. Microsoft Graph OAuth and subscription pipeline
5. Canonical event store and provider mutation queue
6. Assistant role-based access controls and audit persistence
7. Apple iCloud / CalDAV connector
8. Salesforce OAuth and CRM event context
9. Monitoring, export, and account deletion automation

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the proposed technical model.

## Support

`support@calendarfuse.com`

CalendarFuse is operated by ND SOFT LLC.
