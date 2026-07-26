# MYS CONNECT — PRD-Aligned Delivery Roadmap

**Planning baseline:** 25 July 2026  
**Source of truth:** [PRD.md](PRD.md)  
**MVP target:** 8–12 weeks for a two-person team, subject to the decisions in Phase 0.

This roadmap replaces the prior implementation-first sequence. It is organised as **vertical product slices**: each slice includes the mobile experience, API, database, permissions, administration, notifications, and tests required for it to work in production. A module is not considered complete when only a placeholder screen or an API exists.

## 1. Verified Current Baseline

| Area | Verified status | Notes |
|---|---|---|
| Workspace and local database | Implemented | npm workspaces, Docker PostgreSQL, Expo app, Express API, Next.js app, and shared TypeScript package are present. |
| Prisma schema and seed | Partial | 13 current models and seed data for cities/settings. It does not yet implement the PRD's full member, role/permission, read-tracking, download, and content schemas. No migration history exists. |
| Mobile authentication | Partial | Email/password sign-in, sign-up verification, password reset, profile completion, pending, and deactivated screens exist. The approval gate, safe routing, and current Clerk flow have been corrected. |
| User/admin backend | Partial | User profile, avatar, city list, Clerk webhook, and a limited admin user API exist. Input validation, duplicate handling, and raw Svix verification have been added. |
| Member-facing modules | Not implemented | Directory, events, and notices are placeholders; guest, gallery, notifications, settings, about/contact, detail, and search routes are absent. |
| Admin dashboard | Not implemented | The Next.js project has Clerk and a landing page only; no protected admin routes, role check, dashboard, or management screens exist. |
| Quality controls | Partial | Type-checks, Prisma validation, and lint now pass. There are no unit, API integration, E2E, load, or release tests configured. |
| Security and operations | Partial | Helmet, CORS, API rate limiting, Clerk middleware, logging, and corrected webhook verification exist. Production deployment, backups, monitoring, RBAC coverage, and dependency remediation remain. |

### Changes completed during this review

- Registration now remains `PENDING` until an admin explicitly approves it; a completed profile no longer grants member access.
- Sign-in, sign-up, and password-reset flows now finish through Clerk's supported session finalization and return through the central status guard.
- Pending, rejected, incomplete, and backend-unavailable states route safely rather than exposing the member area.
- Clerk webhooks require a configured secret and verify the original request bytes, not a re-serialized payload.
- Profile registration validates server-side data and returns useful `422`/`409` responses for invalid or duplicate data.
- Mobile lint now passes; asynchronous profile loading and web color-scheme hydration no longer trigger React lint errors.

## 2. Decisions Required Before Feature Work

The PRD is directionally complete, but its database/API sections conflict with its MVP behaviour and the current schema. Resolve these in Phase 0; do not encode conflicting assumptions in individual features.

| Decision | PRD inconsistency / current gap | Required outcome |
|---|---|---|
| Role model | The PRD defines Guest, Member, Volunteer, Executive, Admin, and Super Admin with a permission matrix. The current enum instead contains `MODERATOR` and has no permission tables. | Approve the canonical roles and whether MVP uses an enum plus permission policy or full `roles`/`permissions`/`role_permissions` tables. Preserve only approved legacy data through a migration. |
| Approval workflow | PRD Sections 2, 4, and 6 require admin approval. The prior implementation and roadmap treated completed registration as active. | Keep `PENDING → ACTIVE/REJECTED/DEACTIVATED` as the only approval state machine; define the notification and reason policy. |
| Member data contract | PRD requires member ID, profile-complete state, addresses, businesses, family members, privacy-ready contact fields, and downloads. The current schema flattens some data and omits the rest. | Approve a versioned schema/API contract before directory or profile work. Define required registration fields, optional family data, and visibility rules. |
| Event contract | PRD requires organiser, category, registration deadline/option, capacity, location coordinates, and `REGISTERED/CANCELLED/ATTENDED` registration states. Current models use a different RSVP model. | Select one registration model and lifecycle; add the missing event fields and rules. |
| Notice, gallery, and notification taxonomy | PRD uses Notice categories/read states, Album categories, and notification type/reference/is-read data. Current models use different enums and shapes. | Adopt a single taxonomy and migration plan, then generate types from it. |
| Public/guest privacy | Guests may view limited directory and events; contact data, notices, gallery, profile, and notifications remain private. No guest route or server projections exist. | Approve exact public fields and create separate safe API response projections—never reuse the member DTO. |
| Mobile navigation | PRD member tabs are Home, Events, Gallery, Notifications, Profile; Directory and Notices are quick-access screens. Current tabs include Directory and Notices instead. | Adopt the PRD navigation before building the real screens to avoid a breaking route change later. |
| Product configuration | About, contact information, hero content, cities, privacy policy, terms, and organisational details are admin-managed in the PRD. | Define a typed settings/content model and identify stakeholder-owned copy/assets. |

## 3. MVP Delivery Plan

### Phase 0 — Product and Data Contract (Week 1)

**Goal:** remove contradictions before adding irreversible data or UI work.

- [ ] Close the eight decisions above with the MYS stakeholders and update the PRD decision log.
- [ ] Reconcile the Prisma schema with the chosen MVP contract: member identity, roles, address/business/family, event registration, notice reads, gallery categories, notification references, downloads, and settings.
- [ ] Introduce an initial Prisma migration and migration workflow; retire `db push` as the release path.
- [ ] Generate database-derived shared DTOs/enums and document API response projections for guest, member, executive, admin, and super admin.
- [ ] Add API input schemas, pagination/sorting conventions, consistent error codes, and OpenAPI or route-contract documentation.
- [ ] Add seed fixtures for every role and core content module; never seed real member PII.

**Exit gate:** a clean database can migrate and seed; the role/access matrix and all MVP entities have approved migrations, DTOs, and API contracts.

### Phase 1 — Secure Access, Approval, and Minimum Admin Operations (Weeks 1–2)

**PRD coverage:** FR-SPLASH-001, FR-LOGIN-001, FR-REG-001, FR-PROFILE-001 (onboarding), FR-ADM-MEM-001, Sections 7, 9.2–9.3, and 10.

- [x] Clerk provider, SecureStore token cache, user synchronization, initial profile flow, and status screens.
- [x] Enforce pending approval on registration and return every completed Clerk flow through the status guard.
- [x] Verify Clerk webhooks using raw Svix payloads; validate profile input and map unique-conflict errors.
- [ ] Add app-level protected-route guards and a separate guest route group; prevent deep links from showing member UI while signed out.
- [ ] Implement mobile login validation for email/mobile according to the enabled Clerk identifiers; do not claim mobile/password login unless Clerk configuration supports it.
- [ ] Build the first protected admin routes: sign-in, server-side role check, pending-member queue, member detail, approve/reject with reason, and deactivate/reactivate.
- [ ] Create in-app notification records for registration submitted/approved/rejected; delivery is completed in Phase 6.
- [ ] Add audit entries with actor, target, IP, user agent, reason, and immutable change details.
- [ ] Write unit and API tests for status transitions, webhook verification failures, RBAC denial, profile validation, and duplicate mobile/email handling.

**Exit gate:** an email-verified user completes a profile, remains pending, cannot access member data, and receives access only after an authorized admin approves them. Every transition is auditable.

### Phase 2 — Guest Discovery and Member Directory (Weeks 3–4)

**PRD coverage:** FR-GHOME-001, FR-MEMDIR-001, FR-MEMDET-001, FR-ABOUT-001, FR-CONTACT-001, FR-SEARCH-001, Sections 4.1, 5.1, and 7.1.

- [ ] Build a four-tab guest shell: Home, Members, Events, About, plus Contact and a clear login/register CTA.
- [ ] Deliver public directory APIs with server-enforced limited fields (name, city, profession) and public upcoming-event projections.
- [ ] Deliver member directory list/detail APIs: active users only, 20-item pagination, alphabetical default sort, two-character debounced name search, dynamic city filters, and member-only contact actions.
- [ ] Build member directory list, filters, empty/loading/error/offline states, member detail, call/WhatsApp/email actions, and own-profile routing.
- [ ] Build About and Contact from typed settings; add privacy policy and terms links required before distribution.
- [ ] Test data projection and RBAC for every guest/member detail endpoint, including direct API access.

**Exit gate:** a guest can safely discover MYS without seeing PII; an active member can search, filter, and contact eligible members; pending/deactivated accounts cannot read directory data.

### Phase 3 — Events and Registration (Weeks 5–6)

**PRD coverage:** FR-EVTLIST-001, FR-EVTDET-001, FR-EVTREG-001, FR-ADM-EVT-001, Sections 4.2, 6.8–6.10, 9.5, and 11.

- [ ] Implement event CRUD, publication/cancellation state machine, public/member list projections, search, date-status tabs, and pagination.
- [ ] Enforce registration-required, deadline, capacity, duplicate, cancellation, and attendance rules at the API layer.
- [ ] Build event list/detail, share/maps links, registration confirmation/cancellation, and resilient image states in mobile.
- [ ] Build the admin event editor, publish/cancel actions, registration list, and CSV export. Permit Executive versus Admin actions only as approved in Phase 0.
- [ ] Create notification records and realtime events for event publication, updates, cancellations, confirmations, and 24-hour reminders.
- [ ] Test date/status calculations, capacity races, duplicate registration, cancellation, and role permissions.

**Exit gate:** an authorized admin can publish an event; guests can view permitted information; active members can register once and administrators can view/export registrations.

### Phase 4 — Notices, Gallery, and Admin Content Workflows (Weeks 6–8)

**PRD coverage:** FR-NOTICE-001, FR-GALLERY-001, FR-ADM-NOTICE-001, FR-ADM-GAL-001, Sections 6.11–6.12, 9.6–9.7, 11–12.

- [ ] Implement scheduled/published notices, category and priority filters, read tracking, pinning, attachments, and member read APIs.
- [ ] Build notice list/detail with unread treatment, category tabs, attachment download, pull-to-refresh, and mark-as-read behaviour.
- [ ] Implement albums, categories, photo counts, maximum-50 batch uploads, order changes, deletion, Cloudinary resource validation, and derived image URLs.
- [ ] Build gallery album grid, search/category filters, photo grid/viewer, lazy loading, and permitted save/download action.
- [ ] Build admin notice and gallery editors with draft/publish, scheduling, rich-text sanitisation, Cloudinary upload error handling, and audit logs.
- [ ] Test untrusted file handling, draft visibility, scheduled publication, notice reads, album/photo limits, and content RBAC.

**Exit gate:** admins can publish notices and albums safely; member mobile experiences show only published content and correctly record reads.

### Phase 5 — Complete Member Profile and Settings (Weeks 8–9)

**PRD coverage:** remaining FR-PROFILE-001, FR-SETTINGS-001, downloads, Sections 6.14–6.17 and 12.

- [ ] Split profile editing into personal, address, business, and family forms with server-side validation, verification rules for email/mobile, and updated timestamps.
- [ ] Generate and display the immutable `MYS/XXXXX` member ID according to the approved sequence strategy.
- [ ] Implement avatar camera/gallery upload with exact size/dimension/type checks and Cloudinary transformations.
- [ ] Implement family member CRUD, downloads list, password-change handoff to Clerk, notification preferences, support, delete-account request, about-app metadata, and logout cache cleanup.
- [ ] Add an admin downloads/content workflow and relevant audit entries.

**Exit gate:** an active member can manage the full PRD profile without exposing private data; all profile mutation and media restrictions are enforced server-side.

### Phase 6 — Notifications, Realtime, and Offline Read Cache (Weeks 9–10)

**PRD coverage:** FR-NOTIF-001, Sections 4.7, 6.13, 9.8, 9.11, 11, 13, and 14.

- [ ] Integrate Expo notification permissions, push-token registration/revocation, secure token storage, delivery receipts, and retry/error policy.
- [ ] Build notification inbox, unread count, mark-one/all-read, 90-day archival job, deep links, and navigation badge.
- [ ] Add authenticated Socket.io connections with reconnect behaviour and events for notices, published events, approvals, gallery albums, and unread counts.
- [ ] Add scheduled jobs for event and incomplete-profile reminders with idempotency safeguards.
- [ ] Add React Query plus persistent offline cache using the PRD TTLs; show offline states and reject all offline writes explicitly.
- [ ] Test push token ownership, notification targeting, deep links, socket authorization, offline cache expiry, and reconnection.

**Exit gate:** every MVP notification trigger has a persistent in-app record, delivery path, navigation target, and a degraded offline/retry behaviour.

### Phase 7 — Admin Analytics, Reports, and System Control (Weeks 10–11)

**PRD coverage:** FR-ADM-RPT-001, FR-ADM-SET-001, FR-ADM-AUDIT-001, and Sections 6.23–6.25 and 17.

- [ ] Build dashboard KPIs, member-growth chart, recent activity feed, and recent-member panel from real data.
- [ ] Implement reports for member growth, event attendance, registration trends, and city distribution with date filters and CSV/PDF export.
- [ ] Implement Super Admin settings for organisation content, cities, approved role/permission model, audit-log filters/export, and bulk import/export.
- [ ] Add CSV import preview, validation/error download, idempotency, confirmation, and complete audit coverage before any write.
- [ ] Add keyboard navigation, semantic HTML, responsive sidebar/header, and web accessibility tests.

**Exit gate:** the admin dashboard uses live data, exposes only authorised actions, and creates a durable audit record for every operational write.

### Phase 8 — Release Readiness and Launch (Weeks 11–12)

**PRD coverage:** Sections 10, 14–16, 19–20, and UAT checklist.

- [ ] Add test infrastructure: Jest/Vitest for units, Supertest + isolated database for APIs, Playwright for admin flows, and Detox/Expo tests for critical mobile journeys.
- [ ] Implement CI for lint, type-check, migrations, unit/API tests, admin build, mobile build validation, dependency audit, and secret scanning.
- [ ] Perform OWASP/RBAC/file-upload review, dependency upgrade assessment, CORS production review, rate-limit tests, and a privacy/data-retention review.
- [ ] Add structured logs, request IDs, health/readiness checks, error tracking, uptime checks, database backup/restore scripts, and a tested restore runbook.
- [ ] Create production Dockerfiles and deployment configuration; configure TLS, environment validation, migration deployment, staging, and rollback.
- [ ] Configure EAS Android/iOS builds, store assets, privacy policy, UAT, accessibility review, low-end Android performance profiling, and release checklist.

**Exit gate:** every Section 20 UAT flow passes in a production-like environment; backups restore successfully; release owners sign off on privacy, security, and app-store material.

## 4. MVP Requirement Coverage

| PRD capability | Delivery phase | Completion evidence |
|---|---|---|
| Auth, registration, pending approval, logout | 1 | Status-transition API tests and manual Clerk test-mode journey |
| Guest mode, About, Contact | 2 | Safe public API projection and guest navigation E2E test |
| Directory, search, filters, member details | 2 | Pagination/filter API tests and member/guest privacy test |
| Events and registrations | 3 | Publish-to-registration E2E, capacity/duplicate tests, CSV export |
| Notices and gallery | 4 | Publish/read/upload E2E plus file/content authorization tests |
| Full profile, settings, downloads | 5 | Profile edit, media validation, logout/cache-clear tests |
| Push, inbox, realtime, offline cache | 6 | Trigger-to-deep-link tests and offline-read acceptance test |
| Dashboard, reports, settings, audit | 7 | Role-by-role admin E2E and export/import tests |
| Security, accessibility, performance, deployment | 8 | CI evidence, OWASP checklist, WCAG review, load/restore/release sign-off |

## 5. Continuous Tracks (Start in Phase 0)

- **Security:** threat model, least-privilege API policy, Clerk configuration review, secret rotation procedure, input validation, upload controls, and monthly dependency review. The latest audit currently reports 3 high and 23 moderate advisories; npm has no safe automatic fix for the current dependency set, so upgrades must be assessed and tested deliberately.
- **Testing:** every feature adds its unit, integration, authorization, and E2E cases before it can pass its exit gate. Use the PRD Section 20 UAT checklist as the release acceptance suite.
- **Accessibility and performance:** review each screen for 44dp touch targets, labels, font scaling, contrast, reduced motion, keyboard navigation on web, loading/empty/error states, pagination, and image sizing—not as a final polish phase.
- **Documentation and operations:** maintain architecture/API/migration notes, environment templates, runbooks, stakeholder content ownership, and a decision log with each phase.

## 6. Post-MVP (Do Not Pull Into the 12-Week MVP)

These map directly to PRD Section 21 and begin only after Phase 8 acceptance.

| PRD horizon | Features |
|---|---|
| Phase 2 — Engagement & Growth | Payments/donations, chat, SMS OTP, Hindi/English, advanced scheduled reports, QR attendance, birthday reminders, dark mode, video gallery, and privacy controls. |
| Phase 3 — Scale & Intelligence | Multi-chapter tenancy, blood-donation registry, matrimonial/community features, forums, cloud auto-scaling, analytics, Sentry, CI/CD maturity, and the listed AI capabilities. |

## 7. Definition of Done for Any Roadmap Item

A roadmap checkbox may be marked complete only when it has:

1. Approved data/API/permission contract and an applied migration where data changes.
2. Server-side authentication, authorization, validation, error handling, and audit logging where applicable.
3. Finished mobile/admin UI with loading, empty, offline, error, and accessibility states.
4. Required notification/realtime/cache behaviour, or an explicit documented non-applicability.
5. Automated tests and role/privacy tests passing in CI.
6. Updated documentation plus a demonstrable acceptance flow for the product owner.
