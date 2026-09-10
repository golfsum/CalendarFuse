# CalendarFuse production architecture

This document describes the recommended path from the current interactive demo to a secure multi-tenant calendar product.

## Core principle: one canonical event

CalendarFuse should not treat mirrored provider copies as independent meetings. Every logical meeting receives one internal canonical record, while provider-specific records remain linked.

```text
canonical_event
  ├── provider_record: google / event_123
  ├── provider_record: microsoft / AAMk...
  ├── provider_record: apple / caldav_uid
  └── provider_record: salesforce / 00U...
```

A provider record stores source ownership, provider revision or ETag, last observed payload hash, last mutation origin, and synchronization status. This prevents Google → Microsoft → Google copy loops.

## Suggested stack

- Web application: Next.js or equivalent server-rendered TypeScript application
- Database: PostgreSQL with row-level tenant boundaries
- Job processing: durable queue for webhook ingestion, incremental sync, mutation retries, and reconciliation
- Secrets: encrypted server-side storage or a managed secrets service; never browser local storage
- Monitoring: structured logs, provider latency, sync lag, failed mutations, webhook health, and audit events

## Main entities

- `workspace`
- `user`
- `workspace_membership`
- `executive_profile`
- `provider_connection`
- `calendar_source`
- `canonical_event`
- `provider_event_record`
- `duplicate_candidate`
- `conflict_candidate`
- `permission_policy`
- `audit_event`
- `sync_cursor`
- `webhook_subscription`

## Connection lifecycle

1. Authorized user selects a provider.
2. Backend creates signed OAuth state with workspace, actor, and return path.
3. Provider consent returns an authorization code to a server-only callback.
4. Backend exchanges the code, encrypts tokens, records granted scopes, and creates a connection audit event.
5. Initial sync imports provider metadata and events into normalized records.
6. Deduplication proposes canonical groupings without mutating provider records.
7. User reviews high-impact changes before writes are enabled.
8. Disconnect revokes or invalidates provider authorization and stops jobs.

## Duplicate scoring

Candidate generation should use bounded time windows and normalized fields. Scoring can include:

- Start and end time similarity
- Time-zone normalization
- Organizer and attendee overlap
- Normalized title tokens
- Recurrence identifiers and series position
- Conferencing URL or meeting ID
- Location similarity
- CRM account/contact/opportunity references
- Provider-specific source metadata

The UI must show the evidence behind a match and distinguish suggestions from confirmed canonical groups.

## Mutation safety

- Use idempotency keys for every outgoing mutation.
- Persist provider revision/ETag and reject stale updates.
- Identify the user or automation responsible for each mutation.
- Store before/after summaries in the audit log.
- Apply rate limiting and exponential backoff with dead-letter review.
- Reconcile after writes instead of assuming provider acceptance.
- Never delete a source record solely because a similarity model suggests a duplicate.

## Assistant access model

Permissions should be explicit capabilities rather than a single broad role:

- View availability
- View private event details
- Create events
- Edit events
- Cancel events
- Notify attendees
- Resolve duplicate groups
- Resolve conflicts
- Manage provider connections
- Invite or remove workspace members
- Export data
- Delete workspace data

## Private event handling

Store and display the minimum needed for the active permission. A user without private-detail access should receive an availability projection, not a full event payload hidden only by CSS.

## Provider notes

### Google Workspace

Use Google OAuth with Calendar scopes appropriate to the selected workflow. Follow Google API Services User Data Policy and Limited Use requirements. Use sync tokens and push notifications, then periodically reconcile because notifications are not the event payload.

### Microsoft 365

Use the Microsoft identity platform and Microsoft Graph. Track subscription expiration and renew subscriptions before expiry. Use delta queries for incremental reconciliation.

### Apple Calendar

Use supported CalDAV patterns and clearly explain any app-specific credential requirement. Expect provider behavior and recurrence semantics to differ from Google and Microsoft.

### Salesforce

Use Salesforce OAuth. Separate CRM context from calendar ownership: a Salesforce event may be the authoritative record, supporting context, or both depending on configuration.

## Launch gate

Real provider access should remain disabled until the following are tested:

- OAuth state and callback validation
- Token encryption and rotation
- Tenant isolation
- Least-privilege scope review
- Audit completeness
- Revocation and deletion
- Webhook verification
- Sync-loop prevention
- Recurrence and time-zone edge cases
- Provider error handling
- Privacy and terms updated to match actual production behavior
