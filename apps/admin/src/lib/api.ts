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
    throw new Error(resBody.message || `API error: ${res.status}`);
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

export const deleteEvent = (token: string, id: string) =>
  apiFetch<ApiResponse<void>>(`/admin/events/${id}`, { token, method: 'DELETE' });

export const getEventRegistrations = (token: string, id: string) =>
  apiFetch<ApiResponse<unknown[]>>(`/admin/events/${id}/registrations`, { token });

// Notices
export const getNotices = (token: string, params?: URLSearchParams) =>
  apiFetch<ApiResponse<{ notices: NoticeData[]; pagination: PaginationMeta }>>(`/admin/notices${params ? `?${params}` : ''}`, { token });

export const createNotice = (token: string, data: Partial<NoticeData>) =>
  apiFetch<ApiResponse<NoticeData>>('/admin/notices', {
    token,
    method: 'POST',
    body: JSON.stringify(data),
  });

export const updateNotice = (token: string, id: string, data: Partial<NoticeData>) =>
  apiFetch<ApiResponse<NoticeData>>(`/admin/notices/${id}`, {
    token,
    method: 'PUT',
    body: JSON.stringify(data),
  });

export const publishNotice = (token: string, id: string) =>
  apiFetch<ApiResponse<NoticeData>>(`/admin/notices/${id}/publish`, { token, method: 'POST' });

export const unpublishNotice = (token: string, id: string) =>
  apiFetch<ApiResponse<NoticeData>>(`/admin/notices/${id}/unpublish`, { token, method: 'POST' });

export const deleteNotice = (token: string, id: string) =>
  apiFetch<ApiResponse<void>>(`/admin/notices/${id}`, { token, method: 'DELETE' });

// Gallery
export const getAlbums = (token: string, params?: URLSearchParams) =>
  apiFetch<ApiResponse<{ albums: AlbumData[]; pagination: PaginationMeta }>>(`/admin/gallery/albums${params ? `?${params}` : ''}`, { token });

export const createAlbum = (token: string, data: Partial<AlbumData>) =>
  apiFetch<ApiResponse<AlbumData>>('/admin/gallery/albums', {
    token,
    method: 'POST',
    body: JSON.stringify(data),
  });

export const updateAlbum = (token: string, id: string, data: Partial<AlbumData>) =>
  apiFetch<ApiResponse<AlbumData>>(`/admin/gallery/albums/${id}`, {
    token,
    method: 'PUT',
    body: JSON.stringify(data),
  });

export const deleteAlbum = (token: string, id: string) =>
  apiFetch<ApiResponse<void>>(`/admin/gallery/albums/${id}`, { token, method: 'DELETE' });

export const uploadPhotos = async (token: string, albumId: string, files: File[]) => {
  const formData = new FormData();
  files.forEach((file) => formData.append('photos', file));

  return apiFetch<ApiResponse<{ count: number }>>(`/admin/gallery/albums/${albumId}/photos`, {
    token,
    method: 'POST',
    body: formData,
  });
};

export const deletePhoto = (token: string, photoId: string) =>
  apiFetch<ApiResponse<void>>(`/admin/gallery/photos/${photoId}`, { token, method: 'DELETE' });

// Audit Logs
export const getAuditLogs = (token: string, params?: URLSearchParams) =>
  apiFetch<ApiResponse<{ logs: AuditLogData[]; pagination: PaginationMeta }>>(`/admin/audit-logs${params ? `?${params}` : ''}`, { token });

// Settings
export const getSettings = (token: string) =>
  apiFetch<ApiResponse<Record<string, SettingData[]>>>('/admin/settings', { token });

export const updateSettings = (token: string, settings: Record<string, string>) =>
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
  venue?: string;
  address?: string;
  startDate: string;
  endDate?: string;
  status: string;
  coverImageUrl?: string;
  maxCapacity?: number;
  maxAttendees?: number;
  registrationDeadline?: string;
  isPublished: boolean;
  createdAt: string;
  _count?: { rsvps: number };
}

export interface NoticeData {
  id: string;
  title: string;
  content: string;
  type: string;
  priority: string;
  isPublished: boolean;
  publishedAt?: string;
  expiresAt?: string;
  attachmentUrl?: string;
  createdAt: string;
  createdBy?: { profile?: { firstName: string; lastName: string } };
}

export interface AlbumData {
  id: string;
  title: string;
  description?: string;
  category: string;
  coverPhotoUrl?: string;
  isPublished: boolean;
  createdAt: string;
  photos?: PhotoData[];
  _count?: { photos: number };
}

export interface PhotoData {
  id: string;
  imageUrl: string;
  thumbnailUrl?: string;
  caption?: string;
  sortOrder: number;
}

export interface AuditLogData {
  id: string;
  action: string;
  entity: string;
  entityId?: string;
  details?: string;
  createdAt: string;
  user?: { email: string; profile?: { firstName: string; lastName: string } };
}

export interface SettingData {
  id: string;
  key: string;
  value: string;
  description?: string;
}
