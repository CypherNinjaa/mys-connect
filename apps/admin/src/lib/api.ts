const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3004/api/v1';

interface FetchOptions extends RequestInit {
  token?: string;
}

async function apiFetch<T = unknown>(path: string, opts: FetchOptions = {}): Promise<T> {
  const { token, headers: customHeaders, ...rest } = opts;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((customHeaders as Record<string, string>) || {}),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, { headers, ...rest });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || `API error: ${res.status}`);
  }

  return res.json();
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Dashboard
export const getDashboard = (token: string) =>
  apiFetch<ApiResponse<DashboardData>>('/admin/dashboard', { token });

// Users
export const getUsers = (token: string, params?: URLSearchParams) =>
  apiFetch<ApiResponse<UserData[]>>(`/admin/users${params ? `?${params}` : ''}`, { token });

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

// Events
export const getEvents = (token: string, params?: URLSearchParams) =>
  apiFetch<ApiResponse<EventData[]>>(`/admin/events${params ? `?${params}` : ''}`, { token });

export const createEvent = (token: string, data: Partial<EventData>) =>
  apiFetch<ApiResponse<EventData>>('/admin/events', {
    token,
    method: 'POST',
    body: JSON.stringify(data),
  });

export const updateEvent = (token: string, id: string, data: Partial<EventData>) =>
  apiFetch<ApiResponse<EventData>>(`/admin/events/${id}`, {
    token,
    method: 'PUT',
    body: JSON.stringify(data),
  });

export const publishEvent = (token: string, id: string) =>
  apiFetch<ApiResponse<EventData>>(`/admin/events/${id}/publish`, { token, method: 'POST' });

export const cancelEvent = (token: string, id: string) =>
  apiFetch<ApiResponse<EventData>>(`/admin/events/${id}/cancel`, { token, method: 'POST' });

export const deleteEvent = (token: string, id: string) =>
  apiFetch<ApiResponse<void>>(`/admin/events/${id}`, { token, method: 'DELETE' });

export const getEventRegistrations = (token: string, id: string) =>
  apiFetch<ApiResponse<unknown[]>>(`/admin/events/${id}/registrations`, { token });

// Notices
export const getNotices = (token: string, params?: URLSearchParams) =>
  apiFetch<ApiResponse<NoticeData[]>>(`/admin/notices${params ? `?${params}` : ''}`, { token });

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

export const deleteNotice = (token: string, id: string) =>
  apiFetch<ApiResponse<void>>(`/admin/notices/${id}`, { token, method: 'DELETE' });

// Gallery
export const getAlbums = (token: string, params?: URLSearchParams) =>
  apiFetch<ApiResponse<AlbumData[]>>(`/admin/gallery/albums${params ? `?${params}` : ''}`, { token });

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

  const res = await fetch(`${API_URL}/admin/gallery/albums/${albumId}/photos`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || `Upload failed: ${res.status}`);
  }

  return res.json();
};

export const deletePhoto = (token: string, id: string) =>
  apiFetch<ApiResponse<void>>(`/admin/gallery/photos/${id}`, { token, method: 'DELETE' });

// Audit Logs
export const getAuditLogs = (token: string, params?: URLSearchParams) =>
  apiFetch<ApiResponse<AuditLogData[]>>(`/admin/audit-logs${params ? `?${params}` : ''}`, { token });

// Settings
export const getSettings = (token: string) =>
  apiFetch<ApiResponse<SettingData[]>>('/admin/settings', { token });

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
  recentMembers: UserData[];
  recentActivity: AuditLogData[];
  membersByRole: { role: string; _count: number }[];
  membersByCity: { cityId: string; city: { name: string }; _count: number }[];
}

export interface UserData {
  id: string;
  clerkId: string;
  email: string;
  role: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  profile?: ProfileData;
}

export interface ProfileData {
  id: string;
  firstName: string;
  lastName: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: string;
  avatarUrl?: string;
  address?: string;
  city?: { id: string; name: string };
  occupation?: string;
  organization?: string;
  bio?: string;
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
