const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3004/api/v1';

interface FetchOptions extends RequestInit {
  token?: string;
}

async function apiFetch<T = unknown>(path: string, opts: FetchOptions = {}): Promise<T> {
  const { token, headers: customHeaders, body, ...rest } = opts;
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
  const headers: Record<string, string> = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...((customHeaders as Record<string, string>) || {}),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, { headers, body, ...rest });

  if (!res.ok) {
    const resBody = await res.json().catch(() => ({}));
    const errorMessage =
      resBody.error?.message ||
      resBody.message ||
      (typeof resBody.error === 'string' ? resBody.error : null) ||
      `API error: ${res.status}`;
    throw new Error(errorMessage);
  }

  return res.json();
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// Dashboard
export const getDashboard = (token: string) =>
  apiFetch<ApiResponse<DashboardData>>('/admin/dashboard', { token });

// Users / Members
export const getUsers = (token: string, params?: URLSearchParams) =>
  apiFetch<ApiResponse<{ users: UserData[]; pagination: PaginationMeta }>>(`/admin/users${params ? `?${params}` : ''}`, { token });

export const getMemberStats = (token: string) =>
  apiFetch<ApiResponse<MemberStatsData>>('/admin/members/statistics', { token });

export const getMemberDetails = (token: string, id: string) =>
  apiFetch<ApiResponse<UserData>>(`/admin/members/${id}`, { token });

export const createUser = (token: string, data: { email: string; firstName: string; lastName: string; role?: string; status?: string; phone?: string }) =>
  apiFetch<ApiResponse<UserData>>('/admin/users', {
    token,
    method: 'POST',
    body: JSON.stringify(data),
  });

export const updateUserStatus = (token: string, id: string, status: string, reason?: string) =>
  apiFetch<ApiResponse<UserData>>(`/admin/users/${id}/status`, {
    token,
    method: 'POST',
    body: JSON.stringify({ status, reason }),
  });

export const updateUserRole = (token: string, id: string, role: string) =>
  apiFetch<ApiResponse<UserData>>(`/admin/users/${id}/role`, {
    token,
    method: 'POST',
    body: JSON.stringify({ role }),
  });

export const bulkUpdateStatus = (token: string, userIds: string[], status: string, reason?: string) =>
  apiFetch<ApiResponse<{ count: number }>>('/admin/members/bulk-status', {
    token,
    method: 'POST',
    body: JSON.stringify({ userIds, status, reason }),
  });

export const bulkUpdateRole = (token: string, userIds: string[], role: string) =>
  apiFetch<ApiResponse<{ count: number }>>('/admin/members/bulk-role', {
    token,
    method: 'POST',
    body: JSON.stringify({ userIds, role }),
  });

// Events
export const getEvents = (token: string, params?: URLSearchParams) =>
  apiFetch<ApiResponse<{ events: EventData[]; pagination: PaginationMeta }>>(`/admin/events${params ? `?${params}` : ''}`, { token });

export const getEventKPIs = (token: string) =>
  apiFetch<ApiResponse<{
    totalEvents: number;
    upcomingEvents: number;
    ongoingEvents: number;
    completedEvents: number;
    cancelledEvents: number;
    draftEvents: number;
    totalRegistrations: number;
  }>>('/admin/events/kpis', { token });

export const createEvent = (token: string, data: FormData | Partial<EventData>) =>
  apiFetch<ApiResponse<EventData>>('/admin/events', {
    token,
    method: 'POST',
    body: data instanceof FormData ? data : JSON.stringify(data),
  });

export const updateEvent = (token: string, id: string, data: FormData | Partial<EventData>) =>
  apiFetch<ApiResponse<EventData>>(`/admin/events/${id}`, {
    token,
    method: 'PUT',
    body: data instanceof FormData ? data : JSON.stringify(data),
  });

export const publishEvent = (token: string, id: string) =>
  apiFetch<ApiResponse<EventData>>(`/admin/events/${id}/publish`, { token, method: 'POST' });

export const unpublishEvent = (token: string, id: string) =>
  apiFetch<ApiResponse<EventData>>(`/admin/events/${id}/unpublish`, { token, method: 'POST' });

export const cancelEvent = (token: string, id: string) =>
  apiFetch<ApiResponse<EventData>>(`/admin/events/${id}/cancel`, { token, method: 'POST' });

export const duplicateEvent = (token: string, id: string) =>
  apiFetch<ApiResponse<EventData>>(`/admin/events/${id}/duplicate`, { token, method: 'POST' });

export const deleteEvent = (token: string, id: string) =>
  apiFetch<ApiResponse<void>>(`/admin/events/${id}`, { token, method: 'DELETE' });

export const getEventRegistrations = (token: string, id: string) =>
  apiFetch<ApiResponse<EventRegistrationsResponse>>(`/admin/events/${id}/registrations`, { token });

/**
 * Change entries-per-ticket for an event. `applyToExisting` also rewrites the
 * quota on tickets already issued — without it, only future registrations
 * pick up the new number.
 */
export const updateEventQrScanLimit = (
  token: string,
  id: string,
  qrScanLimit: number,
  applyToExisting = false,
) =>
  apiFetch<ApiResponse<{ event: EventData; ticketsUpdated: number }>>(
    `/admin/events/${id}/qr-scan-limit`,
    { token, method: 'PUT', body: JSON.stringify({ qrScanLimit, applyToExisting }) },
  );

// Event registrations (tickets)
export const updateRegistrationScanLimit = (token: string, id: string, maxScans: number) =>
  apiFetch<ApiResponse<RegistrationData>>(`/admin/registrations/${id}/scan-limit`, {
    token,
    method: 'PUT',
    body: JSON.stringify({ maxScans }),
  });

export const cancelRegistration = (token: string, id: string, reason?: string) =>
  apiFetch<ApiResponse<RegistrationData>>(`/admin/registrations/${id}/cancel`, {
    token,
    method: 'POST',
    body: JSON.stringify({ reason }),
  });

export const restoreRegistration = (token: string, id: string) =>
  apiFetch<ApiResponse<RegistrationData>>(`/admin/registrations/${id}/restore`, {
    token,
    method: 'POST',
  });

export const checkInRegistration = (token: string, id: string) =>
  apiFetch<ApiResponse<RegistrationData>>(`/admin/registrations/${id}/check-in`, {
    token,
    method: 'POST',
  });

export const undoCheckIn = (token: string, id: string) =>
  apiFetch<ApiResponse<RegistrationData>>(`/admin/registrations/${id}/undo-check-in`, {
    token,
    method: 'POST',
  });

// Notices
export const getNoticeKPIs = (token: string) =>
  apiFetch<ApiResponse<{
    totalNotices: number;
    emergencyNotices: number;
    eventNotices: number;
    generalNotices: number;
    publishedNotices: number;
    draftNotices: number;
    totalNotifications: number;
  }>>('/admin/notices/kpis', { token });

export const getNotices = (token: string, params?: URLSearchParams) =>
  apiFetch<ApiResponse<{ notices: NoticeData[]; pagination: PaginationMeta }>>(`/admin/notices${params ? `?${params}` : ''}`, { token });

export const createNotice = (token: string, data: FormData | Partial<NoticeData>) =>
  apiFetch<ApiResponse<NoticeData>>('/admin/notices', {
    token,
    method: 'POST',
    body: data instanceof FormData ? data : JSON.stringify(data),
  });

export const updateNotice = (token: string, id: string, data: FormData | Partial<NoticeData>) =>
  apiFetch<ApiResponse<NoticeData>>(`/admin/notices/${id}`, {
    token,
    method: 'PUT',
    body: data instanceof FormData ? data : JSON.stringify(data),
  });

export const publishNotice = (token: string, id: string) =>
  apiFetch<ApiResponse<NoticeData>>(`/admin/notices/${id}/publish`, { token, method: 'POST' });

export const unpublishNotice = (token: string, id: string) =>
  apiFetch<ApiResponse<NoticeData>>(`/admin/notices/${id}/unpublish`, { token, method: 'POST' });

export const broadcastNotice = (token: string, id: string) =>
  apiFetch<ApiResponse<{ notice: NoticeData; broadcastResult: { count: number } }>>(`/admin/notices/${id}/broadcast`, { token, method: 'POST' });

export const deleteNotice = (token: string, id: string) =>
  apiFetch<ApiResponse<void>>(`/admin/notices/${id}`, { token, method: 'DELETE' });

// Gallery
export interface AlbumListResponse {
  albums: AlbumData[];
  stats: AlbumStats;
  pagination: PaginationMeta;
}

export const getAlbums = (token: string, params?: URLSearchParams) =>
  apiFetch<ApiResponse<AlbumListResponse>>(`/admin/gallery/albums${params ? `?${params}` : ''}`, { token });

export const getAlbum = (token: string, id: string) =>
  apiFetch<ApiResponse<AlbumData>>(`/admin/gallery/albums/${id}`, { token });

export const createAlbum = (token: string, data: FormData | AlbumInput) =>
  apiFetch<ApiResponse<AlbumData>>('/admin/gallery/albums', {
    token,
    method: 'POST',
    body: data instanceof FormData ? data : JSON.stringify(data),
  });

export const updateAlbum = (token: string, id: string, data: FormData | AlbumInput) =>
  apiFetch<ApiResponse<AlbumData>>(`/admin/gallery/albums/${id}`, {
    token,
    method: 'PUT',
    body: data instanceof FormData ? data : JSON.stringify(data),
  });

export const deleteAlbum = (token: string, id: string) =>
  apiFetch<ApiResponse<{ message: string }>>(`/admin/gallery/albums/${id}`, { token, method: 'DELETE' });

export const uploadPhotos = async (token: string, albumId: string, files: File[]) => {
  const formData = new FormData();
  files.forEach((file) => formData.append('photos', file));

  return apiFetch<ApiResponse<{ count: number; photos: PhotoData[] }>>(
    `/admin/gallery/albums/${albumId}/photos`,
    { token, method: 'POST', body: formData },
  );
};

export const updatePhoto = (token: string, photoId: string, data: { caption?: string | null }) =>
  apiFetch<ApiResponse<PhotoData>>(`/admin/gallery/photos/${photoId}`, {
    token,
    method: 'PATCH',
    body: JSON.stringify(data),
  });

export const reorderAlbumPhotos = (token: string, albumId: string, photoIds: string[]) =>
  apiFetch<ApiResponse<{ count: number }>>(`/admin/gallery/albums/${albumId}/photos/reorder`, {
    token,
    method: 'PUT',
    body: JSON.stringify({ photoIds }),
  });

export const setAlbumCover = (token: string, albumId: string, photoId: string) =>
  apiFetch<ApiResponse<AlbumData>>(`/admin/gallery/albums/${albumId}/cover`, {
    token,
    method: 'PUT',
    body: JSON.stringify({ photoId }),
  });

export const deletePhoto = (token: string, photoId: string) =>
  apiFetch<ApiResponse<{ message: string }>>(`/admin/gallery/photos/${photoId}`, { token, method: 'DELETE' });

export const deletePhotos = (token: string, photoIds: string[]) =>
  apiFetch<ApiResponse<{ count: number }>>('/admin/gallery/photos/bulk-delete', {
    token,
    method: 'POST',
    body: JSON.stringify({ photoIds }),
  });

// Audit Logs
export interface AuditLogListResponse {
  logs: AuditLogData[];
  filters: {
    entities: { value: string; count: number }[];
    actions: { value: string; count: number }[];
  };
  pagination: PaginationMeta;
}

export const getAuditLogs = (token: string, params?: URLSearchParams) =>
  apiFetch<ApiResponse<AuditLogListResponse>>(`/admin/audit-logs${params ? `?${params}` : ''}`, { token });

// Settings
export const getSettings = (token: string) =>
  apiFetch<ApiResponse<Record<string, SettingData[]>>>('/admin/settings', { token });

export const updateSettings = (token: string, settings: SettingInput[]) =>
  apiFetch<ApiResponse<SettingData[]>>('/admin/settings', {
    token,
    method: 'PUT',
    body: JSON.stringify({ settings }),
  });

// Types
export interface DashboardData {
  totalMembers: number;
  activeMembers: number;
  pendingApprovals: number;
  totalEvents: number;
  upcomingEvents: number;
  totalNotices: number;
  totalAlbums: number;
  totalPhotos: number;
  totalRegistrations?: number;
  recentMembers: UserData[];
  pendingUsersList?: UserData[];
  upcomingEventsList?: EventData[];
  recentActivity: AuditLogData[];
  membersByRole: { role: string; _count: number }[];
  monthlyGrowth?: { month: string; members: number; events: number }[];
  eventParticipation?: { month: string; rsvps: number; events: number }[];
  systemHealth?: {
    api: string;
    database: string;
    storage: string;
    socket: string;
    jobs: string;
    uptime: string;
  };
  trendMetrics?: {
    membersChange: string;
    activeChange: string;
    pendingChange: string;
    eventsChange: string;
    noticesChange: string;
    photosChange: string;
    albumsChange: string;
    registrationsChange: string;
  };
}

export interface MemberStatsData {
  totalMembers: number;
  activeMembers: number;
  pendingApprovals: number;
  suspendedMembers: number;
  guestMembers: number;
  recentlyJoined: number;
}

export interface UserData {
  id: string;
  clerkId: string;
  email: string;
  phone?: string;
  fullName?: string;
  memberId?: string;
  avatarUrl?: string;
  role: string;
  status: string;
  profileComplete: boolean;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
  profile?: {
    id: string;
    firstName?: string;
    lastName?: string;
    displayName?: string;
    phone?: string;
    dateOfBirth?: string;
    gender?: string;
    bloodGroup?: string;
    avatarUrl?: string;
    address?: string;
    cityId?: string;
    city?: { id: string; name: string; state?: string };
    state?: string;
    pinCode?: string;
    occupation?: string;
    organization?: string;
    designation?: string;
    mysDesignation?: string;
    bio?: string;
  };
  completionScore?: number;
  auditLogs?: AuditLogData[];
  eventRSVPs?: Array<{
    id: string;
    status: string;
    createdAt: string;
    event?: { id: string; title: string; startDate: string; status: string; venue?: string };
  }>;
  _count?: { eventRSVPs: number };
}

export interface EventData {
  id: string;
  title: string;
  description?: string;
  shortDesc?: string;
  venue?: string;
  address?: string;
  cityId?: string;
  mapUrl?: string;
  isOnline?: boolean;
  meetingLink?: string;
  latitude?: number;
  longitude?: number;
  chapter?: string;
  category?: string;
  startDate: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  isAllDay?: boolean;
  registrationDeadline?: string;
  status: string;
  coverImageUrl?: string;
  maxCapacity?: number;
  maxAttendees?: number;
  allowWaitlist?: boolean;
  registrationOpen?: boolean;
  /** Entries allowed per issued ticket. Defaults to 1 server-side. */
  qrScanLimit?: number;
  isPublished: boolean;
  isPublic?: boolean;
  contactName?: string;
  contactPhone?: string;
  shareImage?: string;
  shareDescription?: string;
  createdAt: string;
  photos?: Array<{ id: string; imageUrl: string; caption?: string }>;
  _count?: { rsvps: number };
}

export type RSVPStatus = 'REGISTERED' | 'CANCELLED' | 'ATTENDED';

/** One member's ticket for an event, as the admin console sees it. */
export interface RegistrationData {
  id: string;
  userId: string;
  eventId: string;
  status: RSVPStatus;
  note?: string | null;
  /** Human-readable ticket code (MYS-XXXX-XXXX). Null on legacy rows. */
  registrationCode: string | null;
  scanCount: number;
  maxScans: number;
  firstScanAt: string | null;
  lastScanAt: string | null;
  scannedById: string | null;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    email: string;
    phone?: string | null;
    fullName?: string | null;
    memberId?: string | null;
    profile?: {
      firstName?: string | null;
      lastName?: string | null;
      occupation?: string | null;
      organization?: string | null;
      city?: { name: string } | null;
    } | null;
  };
  scannedBy?: { id: string; fullName?: string | null; email: string } | null;
}

export interface RegistrationStats {
  total: number;
  registered: number;
  attended: number;
  cancelled: number;
  checkedIn: number;
  notCheckedIn: number;
  attendanceRate: number;
  totalScans: number;
  exhaustedTickets: number;
  missingCodes: number;
}

export interface EventRegistrationsResponse {
  event: EventData;
  registrations: RegistrationData[];
  stats: RegistrationStats;
}

export interface NoticeData {
  id: string;
  title: string;
  content: string;
  type: string;
  priority: string;
  isPublished: boolean;
  isPinned?: boolean;
  imageUrl?: string;
  publishedAt?: string;
  expiresAt?: string;
  attachmentUrl?: string;
  createdAt: string;
  createdBy?: { profile?: { firstName: string; lastName: string } };
}

export interface TestimonyData {
  id: string;
  authorName: string;
  designation?: string | null;
  content: string;
  imageUrl?: string | null;
  sortOrder: number;
  isPublished: boolean;
  createdById?: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Album categories mirror the Prisma `AlbumCategory` enum, which in turn maps
 * 1:1 onto the mobile gallery's tab bar. Keep the three in sync.
 */
export const ALBUM_CATEGORIES = ['EVENTS', 'CELEBRATIONS', 'OTHERS'] as const;
export type AlbumCategory = (typeof ALBUM_CATEGORIES)[number];

export const ALBUM_CATEGORY_LABELS: Record<AlbumCategory, string> = {
  EVENTS: 'Events',
  CELEBRATIONS: 'Celebrations',
  OTHERS: 'Others',
};

export interface AlbumData {
  id: string;
  title: string;
  description?: string | null;
  category: AlbumCategory;
  coverImageUrl?: string | null;
  /** false when coverImageUrl was borrowed from the first photo rather than set explicitly */
  hasExplicitCover?: boolean;
  isPublished: boolean;
  sortOrder: number;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  photos?: PhotoData[];
  _count?: { photos: number };
}

export interface AlbumStats {
  totalAlbums: number;
  publishedAlbums: number;
  draftAlbums: number;
  totalPhotos: number;
}

export interface AlbumInput {
  title?: string;
  description?: string | null;
  category?: AlbumCategory;
  coverImageUrl?: string | null;
  isPublished?: boolean;
  sortOrder?: number;
}

export interface PhotoData {
  id: string;
  albumId: string;
  imageUrl: string;
  thumbnailUrl?: string | null;
  caption?: string | null;
  sortOrder: number;
  createdAt: string;
}

export interface AuditLogUser {
  id: string;
  email: string;
  fullName?: string | null;
  role?: string;
  avatarUrl?: string | null;
}

export interface AuditLogData {
  id: string;
  userId: string;
  action: string;
  entity: string;
  entityId?: string | null;
  /** Free-form JSON captured at write time — the source for the Details column */
  metadata?: Record<string, unknown> | null;
  ipAddress?: string | null;
  createdAt: string;
  user?: AuditLogUser | null;
}

export type SettingType = 'string' | 'number' | 'boolean' | 'json';

export interface SettingData {
  id: string;
  key: string;
  value: string;
  type: string;
  group: string;
  createdAt: string;
  updatedAt: string;
}

export interface SettingInput {
  key: string;
  value: string;
  type?: string;
  group?: string;
}

// Testimonials API
export const getTestimonies = (token: string, search?: string) =>
  apiFetch<ApiResponse<TestimonyData[]>>(`/admin/testimonies${search ? `?search=${encodeURIComponent(search)}` : ''}`, { token });

export const getTestimonyById = (token: string, id: string) =>
  apiFetch<ApiResponse<TestimonyData>>(`/admin/testimonies/${id}`, { token });

export const createTestimony = (token: string, formData: FormData) =>
  apiFetch<ApiResponse<TestimonyData>>('/admin/testimonies', {
    token,
    method: 'POST',
    body: formData,
  });

export const updateTestimony = (token: string, id: string, formData: FormData) =>
  apiFetch<ApiResponse<TestimonyData>>(`/admin/testimonies/${id}`, {
    token,
    method: 'PUT',
    body: formData,
  });

export const deleteTestimony = (token: string, id: string) =>
  apiFetch<ApiResponse<{ id: string; success: boolean }>>(`/admin/testimonies/${id}`, {
    token,
    method: 'DELETE',
  });

export const reorderTestimonies = (token: string, ids: string[]) =>
  apiFetch<ApiResponse<{ success: boolean; count: number }>>('/admin/testimonies/reorder', {
    token,
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids }),
  });
