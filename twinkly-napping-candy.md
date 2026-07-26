# MYS CONNECT — Full MVP Build Plan

## Context

MYS CONNECT is a community management platform for Maheshwari Yuva Sangathan, Ranchi. The monorepo has three apps: mobile (Expo/RN), admin (Next.js), server (Express/Prisma). The PRD defines a 12-week MVP with member directory, events, gallery, notices, notifications, profile management, and admin dashboard.

**Current state**: The server backend is ~70% built (all routes, controllers, services exist). The mobile app is ~60% built (auth flows, home, events, gallery, notices, notifications, directory, profile screens exist but have bugs and missing features). The admin panel is ~5% built (only Clerk auth scaffold, no actual dashboard). The shared package has basic types but is incomplete.

**Goal**: Complete the entire MVP to production quality — fix all bugs, implement missing features, build the full admin panel, ensure `npx tsc --noEmit` passes, and match the wireframe UI/UX.

---

## Build Order (8 Phases)

### Phase 1: Fix Foundation — Shared Package, Server Bugs, Type Safety
**Files to modify:**
- `packages/shared/src/index.ts` — Add missing DTOs (EventDTO, NoticeDTO, AlbumDTO, NotificationDTO, CityDTO, AuditLogDTO), align enums with Prisma schema (NoticeType uses GENERAL/IMPORTANT/CIRCULAR not URGENT/EVENT/MEETING/ANNOUNCEMENT, RSVPStatus uses REGISTERED/CANCELLED/ATTENDED not GOING/NOT_GOING/MAYBE), add EXECUTIVE/VOLUNTEER roles
- `packages/shared/tsconfig.json` — Add `composite: true`, `sourceMap: true`
- `server/src/middleware/rbac.ts` — Fix Role type to match Prisma schema (has EXECUTIVE/VOLUNTEER, not MODERATOR)
- `server/package.json` — Remove spurious `expo`, `react`, `react-native` dependencies (these shouldn't be in the server)

**What to do:**
1. Align shared enums exactly with Prisma schema enums
2. Add all missing DTO interfaces for events, notices, albums, notifications, cities
3. Fix server rbac.ts Role type to include all 6 Prisma roles
4. Remove expo/react/react-native from server package.json
5. Run `npx tsc --noEmit` in packages/shared and server to verify

### Phase 2: Server — Admin CRUD APIs for Events, Notices, Gallery, Dashboard
**Files to create/modify:**
- `server/src/controllers/admin.controller.ts` — Add event CRUD, notice CRUD, gallery CRUD, dashboard stats, audit log endpoints
- `server/src/services/admin.service.ts` — Add corresponding service methods
- `server/src/routes/admin.routes.ts` — Add all new admin routes
- `server/src/controllers/notice.controller.ts` — Add admin notice create/update/delete
- `server/src/controllers/gallery.controller.ts` — Add admin album/photo create/upload/delete
- `server/src/services/notice.service.ts` — Add admin CRUD methods
- `server/src/services/gallery.service.ts` — Add admin CRUD methods with Cloudinary upload
- `server/src/services/event.service.ts` — Add admin event CRUD (create, update, publish, cancel, delete, export registrations)

**New admin API endpoints:**
- `GET /api/v1/admin/dashboard` — KPI stats (total members, events, notices, gallery, registrations)
- `GET /api/v1/admin/events` — List all events (including drafts)
- `POST /api/v1/admin/events` — Create event
- `PUT /api/v1/admin/events/:id` — Update event
- `POST /api/v1/admin/events/:id/publish` — Publish event
- `POST /api/v1/admin/events/:id/cancel` — Cancel event
- `DELETE /api/v1/admin/events/:id` — Delete event
- `GET /api/v1/admin/events/:id/registrations` — List registrations for export
- `GET /api/v1/admin/notices` — List all notices
- `POST /api/v1/admin/notices` — Create notice
- `PUT /api/v1/admin/notices/:id` — Update notice
- `POST /api/v1/admin/notices/:id/publish` — Publish notice
- `DELETE /api/v1/admin/notices/:id` — Delete notice
- `GET /api/v1/admin/gallery/albums` — List all albums
- `POST /api/v1/admin/gallery/albums` — Create album
- `PUT /api/v1/admin/gallery/albums/:id` — Update album
- `DELETE /api/v1/admin/gallery/albums/:id` — Delete album
- `POST /api/v1/admin/gallery/albums/:id/photos` — Upload photos (multer + Cloudinary)
- `DELETE /api/v1/admin/gallery/photos/:id` — Delete photo
- `GET /api/v1/admin/audit-logs` — List audit logs
- `GET /api/v1/admin/settings` — Get app settings
- `PUT /api/v1/admin/settings` — Update app settings

### Phase 3: Admin Panel — Complete Next.js Dashboard (per wireframe screen 11)
**Files to create/modify:**
- `apps/admin/src/middleware.ts` — Rename from proxy.ts (CRITICAL: Next.js only loads middleware.ts)
- `apps/admin/src/app/layout.tsx` — Fix metadata, add Inter font, proper dark/light theme support
- `apps/admin/src/app/globals.css` — MYS brand colors, sidebar styles
- `apps/admin/src/app/page.tsx` — Redirect to /dashboard
- `apps/admin/src/lib/api.ts` — Admin API client (fetches from server with Clerk token)
- `apps/admin/src/lib/utils.ts` — cn() helper, formatters
- `apps/admin/src/components/layout/Sidebar.tsx` — Maroon sidebar with nav items per wireframe
- `apps/admin/src/components/layout/Header.tsx` — Top bar with title + admin avatar
- `apps/admin/src/components/layout/DashboardLayout.tsx` — Sidebar + header + content wrapper
- `apps/admin/src/app/(dashboard)/layout.tsx` — Protected dashboard layout with role check
- `apps/admin/src/app/(dashboard)/dashboard/page.tsx` — KPI cards, member growth chart, recent activity, members panel
- `apps/admin/src/app/(dashboard)/members/page.tsx` — Member list with search, filter, status/role actions
- `apps/admin/src/app/(dashboard)/members/[id]/page.tsx` — Member detail with approve/reject/deactivate
- `apps/admin/src/app/(dashboard)/events/page.tsx` — Event list with CRUD
- `apps/admin/src/app/(dashboard)/events/new/page.tsx` — Event create form
- `apps/admin/src/app/(dashboard)/events/[id]/page.tsx` — Event detail/edit
- `apps/admin/src/app/(dashboard)/notices/page.tsx` — Notice list with CRUD
- `apps/admin/src/app/(dashboard)/notices/new/page.tsx` — Notice create form
- `apps/admin/src/app/(dashboard)/notices/[id]/page.tsx` — Notice detail/edit
- `apps/admin/src/app/(dashboard)/gallery/page.tsx` — Album grid with CRUD
- `apps/admin/src/app/(dashboard)/gallery/[id]/page.tsx` — Album detail with photo upload
- `apps/admin/src/app/(dashboard)/notifications/page.tsx` — Send notifications
- `apps/admin/src/app/(dashboard)/reports/page.tsx` — Reports with charts
- `apps/admin/src/app/(dashboard)/settings/page.tsx` — App settings management

**Admin panel dependencies to install:** `recharts`, `clsx`, `tailwind-merge`, `lucide-react`, `@tanstack/react-query`, `date-fns`

### Phase 4: Mobile App — Bug Fixes & Missing Features
**Files to modify:**
- `apps/mobile/src/app/(auth)/_layout.tsx` — Add forgot-password to Stack.Screen declarations
- `apps/mobile/src/app/(auth)/pending-approval.tsx` — Fix `alert()` → `Alert.alert()`
- `apps/mobile/src/app/(auth)/complete-profile.tsx` — Add date picker, phone validation, better UX
- `apps/mobile/src/app/(auth)/sign-in.tsx` — Implement guest mode (navigate to guest tab group)
- `apps/mobile/src/app/index.tsx` — Fix useEffect dependency (publicMetadata object ref)
- `apps/mobile/src/components/ui/CloudinaryMedia.tsx` — Fix `alert()` → `Alert.alert()`
- `apps/mobile/src/app/(member)/directory.tsx` — Fetch cities from API instead of hardcoded list, add member detail navigation
- `apps/mobile/src/app/(member)/notifications.tsx` — Add individual mark-as-read on tap
- `apps/mobile/src/app/(member)/change-password.tsx` — Fix hardcoded paddingTop, use SafeAreaView
- `apps/mobile/src/config/network.config.ts` — Remove hardcoded fallback IP
- `apps/mobile/src/services/api.ts` — Add request timeout using AbortController

### Phase 5: Mobile App — Guest Mode (Wireframe screens 03-05)
**Files to create:**
- `apps/mobile/src/app/(guest)/_layout.tsx` — 4-tab guest layout (Home, Members, Events, About)
- `apps/mobile/src/app/(guest)/home.tsx` — Guest home with hero banner, explore grid, login CTA (wireframe 03)
- `apps/mobile/src/app/(guest)/members.tsx` — Guest member directory with limited fields (wireframe 04)
- `apps/mobile/src/app/(guest)/events.tsx` — Guest events list, upcoming/past tabs, no registration (wireframe 05)
- `apps/mobile/src/app/(guest)/about.tsx` — About Us + Contact Us static page

**Files to modify:**
- `apps/mobile/src/app/(auth)/sign-in.tsx` — Guest button navigates to /(guest)/home
- `apps/mobile/src/app/_layout.tsx` — Add (guest) route group

### Phase 6: Mobile App — Member Detail, Event Detail, About/Contact Screens
**Files to create:**
- `apps/mobile/src/app/(member)/member-detail.tsx` — Full member profile view (photo, contact, address, business)
- `apps/mobile/src/app/(member)/event-detail.tsx` — Full event detail with register button, share, map link
- `apps/mobile/src/app/(member)/about.tsx` — About Us page
- `apps/mobile/src/app/(member)/contact.tsx` — Contact Us page with tappable phone/email/address
- `apps/mobile/src/app/(member)/settings.tsx` — Settings page (notification prefs, about, privacy, terms, support, logout, delete account)
- `apps/mobile/src/app/(member)/downloads.tsx` — Downloads page (list downloadable documents)

**Files to modify:**
- `apps/mobile/src/app/(member)/_layout.tsx` — Add new routes to Stack
- `apps/mobile/src/app/(member)/directory.tsx` — Navigate to member-detail on card press
- `apps/mobile/src/app/(member)/events.tsx` — Navigate to event-detail on card press

### Phase 7: Mobile App — UI Polish & Wireframe Fidelity
**What to do:**
- Match all screens pixel-for-pixel to wireframe color scheme (deep maroon #800020 header bars, white content, gold accents)
- Smooth animations on all screen transitions (SharedElement-like transitions)
- Proper skeleton loaders on every screen
- Pull-to-refresh on all list screens
- Empty state illustrations
- Loading/error/offline states on every screen
- Haptic feedback on button presses
- Proper keyboard avoidance on all forms
- StatusBar style management per screen (light on maroon headers, dark on white backgrounds)

### Phase 8: TypeScript Verification & Cleanup
**What to do:**
1. Run `npx tsc --noEmit` in packages/shared — fix all errors
2. Run `npx tsc --noEmit` in server — fix all errors
3. Run `npx tsc --noEmit` in apps/mobile — fix all errors
4. Run `npx tsc --noEmit` in apps/admin — fix all errors
5. Remove all dead code (unused components, hooks, constants)
6. Remove all `@ts-expect-error` comments and fix the underlying type issues
7. Ensure all `any` types are replaced with proper types

---

## Verification Plan

After each phase:
1. `npx tsc --noEmit` in the modified workspace(s)
2. Server: `npm run dev` — verify API endpoints with curl/httpie
3. Mobile: `npx expo start` — verify on Android device/emulator
4. Admin: `npm run dev` — verify in browser

Final verification:
1. `npx tsc --noEmit` passes in ALL workspaces with zero errors
2. Server starts and all API endpoints respond correctly
3. Mobile app: full auth flow (sign-up → verify → complete-profile → pending → approved → home)
4. Mobile app: all member screens functional (home, events, gallery, notices, notifications, directory, profile)
5. Mobile app: guest mode works (limited access, login CTA)
6. Admin panel: dashboard shows real KPI data, all CRUD operations work for members/events/notices/gallery
7. No console errors or warnings in any app
