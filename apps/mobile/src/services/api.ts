import { API } from '../constants/theme';

const DEFAULT_TIMEOUT = 45_000; // 45 seconds
const UPLOAD_TIMEOUT = 90_000; // 90 seconds for uploads
const AUTH_TIMEOUT = 15_000; // auth gate must not hang the splash screen

/**
 * Error type that keeps the HTTP status (or the lack of one) attached.
 *
 * The auth gate has to tell "the server said 403, this account is blocked"
 * apart from "we never reached the server". A bare `Error` loses that, which is
 * how a signed-out-worthy response and a flaky wifi connection ended up on the
 * same code path.
 */
export class ApiError extends Error {
  /** HTTP status, or `0` when the request never produced a response. */
  readonly status: number;
  readonly isTimeout: boolean;

  constructor(message: string, status: number, isTimeout = false) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.isTimeout = isTimeout;
  }

  /** True when the request failed before the server answered. */
  get isNetworkError(): boolean {
    return this.status === 0;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

export type MemberStatus = 'PENDING' | 'ACTIVE' | 'DEACTIVATED' | 'REJECTED' | 'SUSPENDED';

export type Gender = 'MALE' | 'FEMALE' | 'OTHER';

export type BloodGroup =
  | 'A_POSITIVE'
  | 'A_NEGATIVE'
  | 'B_POSITIVE'
  | 'B_NEGATIVE'
  | 'AB_POSITIVE'
  | 'AB_NEGATIVE'
  | 'O_POSITIVE'
  | 'O_NEGATIVE';

/**
 * The member's post within MYS. Distinct from `MemberProfile.designation`,
 * which is their job title at their own company.
 */
export type MysDesignation =
  | 'PRESIDENT'
  | 'SECRETARY'
  | 'IMMEDIATE_PAST_PRESIDENT'
  | 'PAST_PRESIDENT'
  | 'PAST_SECRETARY'
  | 'EXECUTIVE_MEMBER'
  | 'JOINT_SECRETARY'
  | 'INVITEES'
  | 'VICE_PRESIDENT'
  | 'TREASURER'
  | 'ORGANIZATION_MINISTER';

/** Picker options for MysDesignation — array order is the order shown. */
export const MYS_DESIGNATIONS: { label: string; value: MysDesignation }[] = [
  { label: 'President', value: 'PRESIDENT' },
  { label: 'Secretary', value: 'SECRETARY' },
  { label: 'Immediate Past President', value: 'IMMEDIATE_PAST_PRESIDENT' },
  { label: 'Past President', value: 'PAST_PRESIDENT' },
  { label: 'Past Secretary', value: 'PAST_SECRETARY' },
  { label: 'Executive Member', value: 'EXECUTIVE_MEMBER' },
  { label: 'Joint Secretary', value: 'JOINT_SECRETARY' },
  { label: 'Invitees', value: 'INVITEES' },
  { label: 'Vice President', value: 'VICE_PRESIDENT' },
  { label: 'Treasurer', value: 'TREASURER' },
  { label: 'Organization Minister', value: 'ORGANIZATION_MINISTER' },
];

/** Human-readable label for a stored designation, or null when unset. */
export function mysDesignationLabel(value?: MysDesignation | null): string | null {
  if (!value) return null;
  return MYS_DESIGNATIONS.find((d) => d.value === value)?.label ?? null;
}

export interface MemberCity {
  id: string;
  name: string;
  state?: string;
}

/** Nested `profile` relation on `GET /users/me`. Every column is nullable. */
export interface MemberProfile {
  id?: string;
  firstName?: string | null;
  lastName?: string | null;
  displayName?: string | null;
  dateOfBirth?: string | null;
  gender?: Gender | null;
  bloodGroup?: BloodGroup | null;
  avatarUrl?: string | null;
  address?: string | null;
  cityId?: string | null;
  city?: MemberCity | null;
  state?: string | null;
  pinCode?: string | null;
  occupation?: string | null;
  organization?: string | null;
  designation?: string | null;
  mysDesignation?: MysDesignation | null;
  bio?: string | null;
}

/** Shape of `GET /users/me` — the user row with its profile relation included. */
export interface CurrentUser {
  id: string;
  clerkId?: string;
  email?: string;
  phone?: string | null;
  status: MemberStatus;
  role?: string;
  profileComplete?: boolean;
  memberId?: string | null;
  fullName?: string | null;
  avatarUrl?: string | null;
  profile?: MemberProfile | null;
  /** Server-side value of the `registration.requires_approval` app setting. */
  requiresApproval?: boolean;
}

export interface RegisterProfileData {
  firstName: string;
  lastName: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: Gender;
  bloodGroup?: BloodGroup;
  address?: string;
  cityId?: string;
  pinCode?: string;
  occupation?: string;
  organization?: string;
  designation?: string;
  /** `''` clears an existing post; omit the key to leave it untouched. */
  mysDesignation?: MysDesignation | '';
  bio?: string;
}

/** The event fields carried alongside a ticket by `GET /events/my-registrations`. */
export interface RegistrationEvent {
  id: string;
  title: string;
  shortDesc?: string | null;
  /** ISO strings — Prisma `DateTime` columns serialise to JSON as text. */
  startDate: string;
  endDate: string;
  startTime?: string | null;
  endTime?: string | null;
  venue?: string | null;
  address?: string | null;
  isOnline: boolean;
  meetingLink?: string | null;
  coverImageUrl?: string | null;
  status: string;
  city?: MemberCity | null;
}

/**
 * One event ticket held by the signed-in member.
 *
 * `qrDataUrl` is a ready-to-render PNG data URI built on the server, so the app
 * draws it with a plain `<Image>` instead of a native SVG renderer.
 * `registrationCode` is the same identity in spoken/typed form, used at the gate
 * when scanning fails. Both are null only for rows predating ticketing.
 */
export interface EventRegistration {
  id: string;
  eventId: string;
  status: 'REGISTERED' | 'CANCELLED' | 'ATTENDED';
  registrationCode: string | null;
  qrDataUrl: string | null;
  scanCount: number;
  maxScans: number;
  scansRemaining: number;
  firstScanAt: string | null;
  lastScanAt: string | null;
  registeredAt: string;
  event: RegistrationEvent;
}

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeout = DEFAULT_TIMEOUT): Promise<Response> {
  const controller = new AbortController();
  let timedOut = false;
  const id = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeout);

  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (error) {
    // Both an abort and a dead connection land here. Status 0 marks "the server
    // never answered" so callers can retry instead of signing the user out.
    if (timedOut) {
      throw new ApiError(`Request timed out after ${Math.round(timeout / 1000)}s`, 0, true);
    }
    throw new ApiError(error instanceof Error ? error.message : 'Network request failed', 0);
  } finally {
    clearTimeout(id);
  }
}

/** Parse a JSON response, raising an {@link ApiError} that keeps the status. */
async function parseJson(res: Response, fallbackMessage: string) {
  let body: { error?: { message?: string }; data?: unknown } | null = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }

  if (!res.ok) {
    throw new ApiError(body?.error?.message || fallbackMessage, res.status);
  }
  return body;
}

export class ApiService {
  /**
   * Ping server health check endpoint
   */
  static async checkHealth(): Promise<boolean> {
    try {
      const healthUrl = API.baseUrl.endsWith('/api/v1')
        ? API.baseUrl.replace('/api/v1', '/health')
        : `${API.baseUrl}/health`;
      const res = await fetchWithTimeout(healthUrl, { method: 'GET' }, 8000);
      const data = await res.json();
      return data.status === 'ok';
    } catch {
      return false;
    }
  }
  private static async getHeaders(token?: string | null): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  /**
   * Fetch current authenticated user DB profile & approval status
   */
  static async getMe(token: string): Promise<CurrentUser | null> {
    const res = await fetchWithTimeout(
      `${API.baseUrl}/users/me`,
      {
        method: 'GET',
        headers: await this.getHeaders(token),
      },
      AUTH_TIMEOUT
    );
    const data = await parseJson(res, 'Failed to fetch user profile');
    return (data?.data as CurrentUser) ?? null;
  }

  /**
   * Fetch ban/deactivation reason note for a user by email
   */
  static async getBanReason(email: string): Promise<{ banned: boolean; reasonNote?: string } | null> {
    try {
      const res = await fetchWithTimeout(
        `${API.baseUrl}/users/ban-reason?email=${encodeURIComponent(email.trim())}`,
        { method: 'GET' },
        8000
      );
      if (!res.ok) return null;
      const data = await res.json();
      return data;
    } catch {
      return null;
    }
  }

  /**
   * Submit complete member registration
   */
  static async registerProfile(token: string, profileData: RegisterProfileData) {
    const res = await fetchWithTimeout(`${API.baseUrl}/users/register`, {
      method: 'POST',
      headers: await this.getHeaders(token),
      body: JSON.stringify(profileData),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error?.message || 'Failed to submit registration profile');
    }
    return data.data;
  }

  /**
   * Upload profile image to Cloudinary via base64 or FormData
   */
  static async uploadAvatar(token: string, imageUriOrBase64: string): Promise<{ avatarUrl?: string } | null> {
    let bodyData: BodyInit;
    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
    };

    if (imageUriOrBase64.startsWith('data:') || !imageUriOrBase64.startsWith('file://')) {
      // Base64 string payload
      headers['Content-Type'] = 'application/json';
      bodyData = JSON.stringify({ base64: imageUriOrBase64 });
    } else {
      // Try multipart formData for file:// URIs
      try {
        const formData = new FormData();
        const filename = imageUriOrBase64.split('/').pop() || 'avatar.jpg';
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : `image/jpeg`;

        // React Native's FormData accepts a {uri,name,type} object where the DOM
        // typings only allow a Blob.
        formData.append('avatar', {
          uri: imageUriOrBase64,
          name: filename,
          type,
        } as unknown as Blob);
        bodyData = formData;
      } catch {
        // Fallback to JSON payload
        headers['Content-Type'] = 'application/json';
        bodyData = JSON.stringify({ base64: imageUriOrBase64 });
      }
    }

    const res = await fetchWithTimeout(`${API.baseUrl}/users/avatar`, {
      method: 'POST',
      headers,
      body: bodyData,
    }, UPLOAD_TIMEOUT);

    const data = await parseJson(res, 'Failed to upload avatar');
    return (data?.data as { avatarUrl?: string }) ?? null;
  }

  /**
   * Clear the member's profile photo.
   */
  static async removeAvatar(token: string): Promise<{ avatarUrl?: string | null } | null> {
    const res = await fetchWithTimeout(`${API.baseUrl}/users/avatar`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await parseJson(res, 'Failed to remove profile photo');
    return (data?.data as { avatarUrl?: string | null }) ?? null;
  }

  /**
   * Fetch list of active cities for location dropdown
   */
  static async getCities() {
    const res = await fetchWithTimeout(`${API.baseUrl}/users/cities`, {
      method: 'GET',
      headers: await this.getHeaders(),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error?.message || 'Failed to fetch cities');
    }
    return data.data || [];
  }

  /**
   * Member Directory API
   */
  static async getMembers(token?: string, search?: string, cityName?: string, page = 1) {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (cityName && cityName !== 'All') params.append('cityName', cityName);
    params.append('page', String(page));

    const res = await fetchWithTimeout(`${API.baseUrl}/members?${params.toString()}`, {
      method: 'GET',
      headers: await this.getHeaders(token),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || 'Failed to fetch members');
    return data.data;
  }

  static async getMemberById(token?: string, id?: string) {
    if (!id) return null;
    const res = await fetchWithTimeout(`${API.baseUrl}/members/${id}`, {
      method: 'GET',
      headers: await this.getHeaders(token),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || 'Failed to fetch member details');
    return data.data;
  }

  /**
   * Events API
   */
  static async getEvents(token?: string, status?: string, search?: string, page = 1, limit = 10) {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (search) params.append('search', search);
    params.append('page', String(page));
    params.append('limit', String(limit));

    const res = await fetchWithTimeout(`${API.baseUrl}/events?${params.toString()}`, {
      method: 'GET',
      headers: await this.getHeaders(token),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || 'Failed to fetch events');
    return data.data;
  }

  static async getEventById(token?: string, id?: string) {
    if (!id) return null;
    const res = await fetchWithTimeout(`${API.baseUrl}/events/${id}`, {
      method: 'GET',
      headers: await this.getHeaders(token),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || 'Failed to fetch event');
    return data.data;
  }

  static async registerForEvent(token: string, eventId: string) {
    const res = await fetchWithTimeout(`${API.baseUrl}/events/${eventId}/register`, {
      method: 'POST',
      headers: await this.getHeaders(token),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || 'Failed to register for event');
    return data.data;
  }

  static async cancelEventRegistration(token: string, eventId: string) {
    const res = await fetchWithTimeout(`${API.baseUrl}/events/${eventId}/register`, {
      method: 'DELETE',
      headers: await this.getHeaders(token),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || 'Failed to cancel registration');
    return data.data;
  }

  /**
   * Every event ticket held by the signed-in member, newest event first.
   *
   * One request returns the codes and the rendered QR images together, so the
   * My Tickets tab does not fan out per registration.
   */
  static async getMyRegistrations(token: string): Promise<EventRegistration[]> {
    const res = await fetchWithTimeout(`${API.baseUrl}/events/my-registrations`, {
      method: 'GET',
      headers: await this.getHeaders(token),
    });
    const data = await parseJson(res, 'Failed to fetch your tickets');
    return (data?.data as { registrations?: EventRegistration[] })?.registrations ?? [];
  }

  /**
   * Notices API
   */
  static async getNotices(token: string, category?: string) {
    const params = new URLSearchParams();
    if (category && category !== 'ALL') params.append('category', category);

    const res = await fetchWithTimeout(`${API.baseUrl}/notices?${params.toString()}`, {
      method: 'GET',
      headers: await this.getHeaders(token),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || 'Failed to fetch notices');
    return data.data;
  }

  /**
   * Gallery API
   */
  static async getGallery(token?: string, category?: string, search?: string, page = 1, limit = 100) {
    const params = new URLSearchParams();
    if (category && category !== 'All') params.append('category', category);
    if (search) params.append('search', search);
    params.append('page', String(page));
    params.append('limit', String(limit));

    const res = await fetchWithTimeout(`${API.baseUrl}/gallery?${params.toString()}`, {
      method: 'GET',
      headers: await this.getHeaders(token),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || 'Failed to fetch gallery items');
    return data.data;
  }

  static async getAlbums(token: string) {
    const res = await fetchWithTimeout(`${API.baseUrl}/gallery/albums`, {
      method: 'GET',
      headers: await this.getHeaders(token),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || 'Failed to fetch gallery albums');
    return data.data;
  }

  static async getAlbumById(token: string, id: string) {
    const res = await fetchWithTimeout(`${API.baseUrl}/gallery/albums/${id}`, {
      method: 'GET',
      headers: await this.getHeaders(token),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || 'Failed to fetch album photos');
    return data.data;
  }

  /**
   * Notifications API
   */
  static async getNotifications(token: string) {
    const res = await fetchWithTimeout(`${API.baseUrl}/notifications`, {
      method: 'GET',
      headers: await this.getHeaders(token),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || 'Failed to fetch notifications');
    return data.data;
  }

  static async getUnreadNotificationCount(token: string) {
    const res = await fetchWithTimeout(`${API.baseUrl}/notifications/unread-count`, {
      method: 'GET',
      headers: await this.getHeaders(token),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || 'Failed to fetch unread count');
    return data.data?.unreadCount || 0;
  }

  static async markNotificationRead(token: string, id: string) {
    const res = await fetchWithTimeout(`${API.baseUrl}/notifications/${id}/read`, {
      method: 'PATCH',
      headers: await this.getHeaders(token),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || 'Failed to mark notification as read');
    return data.data;
  }

  static async markAllNotificationsRead(token: string) {
    const res = await fetchWithTimeout(`${API.baseUrl}/notifications/read-all`, {
      method: 'PATCH',
      headers: await this.getHeaders(token),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || 'Failed to mark all as read');
    return data.data;
  }

  /**
   * Register an Expo Push Token with the backend server
   */
  static async registerPushToken(token: string, pushToken: string, platform: string) {
    const res = await fetchWithTimeout(`${API.baseUrl}/notifications/push-token`, {
      method: 'POST',
      headers: await this.getHeaders(token),
      body: JSON.stringify({ token: pushToken, platform }),
    });
    const data = await parseJson(res, 'Failed to register push token');
    return data?.data;
  }

  /**
   * Detach an Expo Push Token from the signed-in account.
   *
   * Called on sign-out so the next account on this device does not inherit the
   * previous member's notifications.
   */
  static async unregisterPushToken(token: string, pushToken: string) {
    const res = await fetchWithTimeout(`${API.baseUrl}/notifications/push-token`, {
      method: 'DELETE',
      headers: await this.getHeaders(token),
      body: JSON.stringify({ token: pushToken }),
    });
    const data = await parseJson(res, 'Failed to unregister push token');
    return data?.data;
  }

  /**
   * Testimonials API
   */
  static async getTestimonies(token?: string) {
    const res = await fetchWithTimeout(`${API.baseUrl}/testimonies`, {
      method: 'GET',
      headers: await this.getHeaders(token),
    });
    const data = await parseJson(res, 'Failed to fetch testimonials');
    return data?.data || [];
  }
}
