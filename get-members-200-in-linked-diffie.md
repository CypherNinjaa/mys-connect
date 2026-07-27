# Admin Panel Overhaul Plan

## Context

The admin panel has multiple compounding issues: the dashboard shows no data (field name mismatch between server and client), the members page silently fails (response shape bug from a prior fix), performance is poor (all-client rendering, no debounce, empty Next.js config), the sidebar only collapses on mobile, event creation has no file upload (just a URL text field), and several PRD features are missing. This plan addresses all of them in priority order.

---

## Phase 1: Fix Data Display Bugs (Critical)

### 1A. Dashboard data mismatch

**Problem:** Server `getDashboardStats()` returns `{totalMembers, upcomingEvents, totalNotices, galleryImages, newRegistrations, memberGrowth, recentActivities}` but the client `DashboardData` interface expects `{totalMembers, activeMembers, pendingApprovals, totalEvents, upcomingEvents, totalNotices, totalAlbums, totalPhotos, recentMembers, recentActivity, membersByRole, membersByCity}`.

**Fix — expand the server service** (`server/src/services/admin.service.ts` `getDashboardStats`):
- Add parallel queries for: `activeMembers` (status ACTIVE), `pendingApprovals` (status PENDING), `totalEvents` (all events count), `totalAlbums` (album count), `totalPhotos` (albumPhoto count — already have `galleryImages`, rename it)
- Add `recentMembers`: `prisma.user.findMany({ orderBy: {createdAt: 'desc'}, take: 5, include: {profile: true} })` — currently absent
- Rename `recentActivities` → `recentActivities` (already exists, just needs user profile include to match `AuditLogData` shape: `user.email`, `user.profile.firstName/lastName`)
- Add `membersByRole`: `prisma.user.groupBy({ by: ['role'], _count: true, where: {status: 'ACTIVE'} })`
- Return all new fields from the service
- **No controller change needed** — controller already does `res.json({success: true, data: result})`

**Client:** Update `DashboardData` interface in `apps/admin/src/lib/api.ts` to match the new server response. Remove `membersByCity` (server doesn't have city grouping currently). Keep `recentMembers` as `UserData[]` and `recentActivity` as `AuditLogData[]`.

**Files:** `server/src/services/admin.service.ts` (getDashboardStats), `apps/admin/src/lib/api.ts` (DashboardData interface)

### 1B. Members page response shape

**Problem:** The `listUsers` controller sends FLAT response `{success, data: users[], pagination: {...}}` (data IS the array, pagination is a sibling) but the page reads `data?.data?.users` and `data?.data?.pagination` (expecting nested). Other list endpoints send nested `{success, data: {events, pagination}}`.

**Fix — make the server consistent:** Change `listUsers` in `server/src/controllers/admin.controller.ts` line 23-25 from:
```js
res.json({ success: true, data: result.users, pagination: result.pagination })
```
to:
```js
res.json({ success: true, data: result })
```
This makes it return `{success, data: {users, pagination}}` like all other list endpoints. The client code `data?.data?.users` and `data?.data?.pagination` will then work correctly.

**Files:** `server/src/controllers/admin.controller.ts` (listUsers method, ~3 lines)

---

## Phase 2: Performance Improvements

### 2A. Next.js config optimization

**File:** `apps/admin/next.config.ts`

Add `optimizePackageImports` for lucide-react (currently imports every icon individually, bloats the bundle):
```js
const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ['lucide-react', 'recharts', 'date-fns'],
  },
};
```

### 2B. React Query tuning

**File:** `apps/admin/src/components/Providers.tsx`

Add `refetchOnWindowFocus: false` and increase `gcTime` to reduce unnecessary refetches when switching tabs:
```js
queries: {
  staleTime: 60 * 1000,
  gcTime: 5 * 60 * 1000,
  refetchOnWindowFocus: false,
  retry: 1,
},
```

### 2C. Debounce search inputs

**Files:** `apps/admin/src/app/(dashboard)/members/page.tsx`, `events/page.tsx`, `notices/page.tsx`, `audit-logs/page.tsx`

All search inputs currently trigger a new API call on every keystroke. Add a debounced search pattern:
- Track `searchInput` (immediate) and `debouncedSearch` (delayed) separately
- Use a `useEffect` with `setTimeout` (300ms) to update `debouncedSearch` from `searchInput`
- Pass `debouncedSearch` to the query key and URL params

---

## Phase 3: Collapsible Desktop Sidebar

**Problem:** Sidebar is fixed 256px on desktop, only has mobile overlay toggle. Need a collapse/expand toggle on desktop.

**Changes:**

1. **`DashboardLayout.tsx`** — add `collapsed` state (default `false`), pass to Sidebar and Header
2. **`Sidebar.tsx`** — accept `collapsed` and `onToggleCollapse` props:
   - When collapsed: width shrinks to `w-16`, labels hidden, only icons shown, logo hides text
   - Toggle button (ChevronLeft/ChevronRight) at top or bottom, visible on `lg:` screens
   - Tooltip on hover when collapsed (using `title` attribute for simplicity)
   - Transition with `transition-all duration-200`
3. **`DashboardLayout.tsx`** — main content area adjusts: `lg:ml-16` when collapsed, `lg:ml-64` when expanded (or use flex which handles this automatically since sidebar is `lg:static`)

**Files:** `apps/admin/src/components/layout/Sidebar.tsx`, `apps/admin/src/components/layout/DashboardLayout.tsx`

---

## Phase 4: Cloudinary File Upload for Event Creation

**Problem:** Event create/edit pages use a plain text input for `coverImageUrl`. Need actual file upload via Cloudinary.

### 4A. Server — add file upload to event create/update routes

**File:** `server/src/routes/admin.routes.ts`

Change event routes to accept file uploads:
```js
router.post('/events', upload.single('coverImage'), AdminController.createEvent);
router.put('/events/:id', upload.single('coverImage'), AdminController.updateEvent);
```

**File:** `server/src/controllers/admin.controller.ts` (createEvent, updateEvent)

Before calling the service, check for `req.file`:
```js
if (req.file) {
  const url = await uploadToCloudinary(req.file.buffer, 'mys-connect/events');
  req.body.coverImageUrl = url;
}
```

**File:** `server/src/utils/cloudinary.ts`

Make transformation configurable — the current hardcoded 400x400 face-crop is wrong for event banners. Add an `uploadToCloudinaryWithTransform` or modify `uploadToCloudinary` to accept optional transform options, with banner-appropriate defaults for events (e.g., `width: 1200, height: 630, crop: 'fill', gravity: 'auto'`, `quality: 'auto'`, `fetch_format: 'auto'`).

### 4B. Client — file upload UI in event create/edit

**Files:** `apps/admin/src/app/(dashboard)/events/new/page.tsx`, `events/[id]/page.tsx`

- Replace the `coverImageUrl` text input with a file picker (`<input type="file" accept="image/*">`)
- Show image preview when file selected (or existing URL on edit)
- Change `createEvent`/`updateEvent` API calls from JSON to `FormData` (multipart)
- Update `apps/admin/src/lib/api.ts`: `createEvent` and `updateEvent` functions to send `FormData` instead of `JSON.stringify` when a file is present (remove `Content-Type: application/json` header to let browser set multipart boundary)

---

## Phase 5: Missing PRD Features

### 5A. Admin create user

**PRD:** "Admin shall be able to create users directly"

- Add `POST /api/v1/admin/users` server route + controller + service method
- Add "Create Member" button on members page with a modal form (email, firstName, lastName, role, status)
- Service creates a Clerk user + local DB record

### 5B. Event publish/unpublish toggle

**PRD:** "Admin shall be able to publish/unpublish events"

The server already has `POST /events/:id/publish` and API client has `publishEvent`. But:
- The events list page has no publish/unpublish button — add one per row
- Add unpublish endpoint: `POST /events/:id/unpublish` (server route + controller + service)
- Show publish status badge on each event row

### 5C. Event status management

**PRD:** Events should have statuses: Upcoming, Ongoing, Completed, Cancelled

- The events list page should show status badges
- Add cancel button (server `POST /events/:id/cancel` already exists, API client `cancelEvent` exists)
- Show status filter dropdown (already partially exists in events page)

### 5D. Notice publish/unpublish

Same pattern as events — server `publishNotice` exists, add unpublish + UI buttons.

---

## File Summary

| Phase | Files Modified |
|-------|---------------|
| 1A | `server/src/services/admin.service.ts`, `apps/admin/src/lib/api.ts` |
| 1B | `server/src/controllers/admin.controller.ts` |
| 2A | `apps/admin/next.config.ts` |
| 2B | `apps/admin/src/components/Providers.tsx` |
| 2C | `apps/admin/src/app/(dashboard)/members/page.tsx`, `events/page.tsx`, `notices/page.tsx`, `audit-logs/page.tsx` |
| 3 | `apps/admin/src/components/layout/Sidebar.tsx`, `DashboardLayout.tsx` |
| 4A | `server/src/routes/admin.routes.ts`, `server/src/controllers/admin.controller.ts`, `server/src/utils/cloudinary.ts` |
| 4B | `apps/admin/src/app/(dashboard)/events/new/page.tsx`, `events/[id]/page.tsx`, `apps/admin/src/lib/api.ts` |
| 5A | `server/src/routes/admin.routes.ts`, `server/src/controllers/admin.controller.ts`, `server/src/services/admin.service.ts`, `apps/admin/src/app/(dashboard)/members/page.tsx` |
| 5B-D | `apps/admin/src/app/(dashboard)/events/page.tsx`, `notices/page.tsx`, server routes/controllers as needed |

---

## Verification

1. **Dashboard:** Start server + admin, navigate to `/dashboard` — all 8 KPI cards should show real numbers, Recent Members and Recent Activity sections populated
2. **Members:** Navigate to `/members` — table loads with users, pagination works, search/filter works
3. **Sidebar:** On desktop, click collapse button — sidebar shrinks to icon-only, content area expands. Click again to restore. On mobile, hamburger overlay still works.
4. **Performance:** Search in members — typing should feel responsive (no request per keystroke). Page navigation should feel snappy.
5. **Event creation:** Go to `/events/new`, upload an image file, fill form, submit — event created with Cloudinary image URL in DB
6. **Publish toggle:** On events list, click publish/unpublish — status changes reflected
