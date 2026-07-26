import { API } from '../constants/theme';

export interface RegisterProfileData {
  firstName: string;
  lastName: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: 'MALE' | 'FEMALE' | 'OTHER';
  bloodGroup?: 'A_POSITIVE' | 'A_NEGATIVE' | 'B_POSITIVE' | 'B_NEGATIVE' | 'AB_POSITIVE' | 'AB_NEGATIVE' | 'O_POSITIVE' | 'O_NEGATIVE';
  address?: string;
  cityId?: string;
  pinCode?: string;
  occupation?: string;
  organization?: string;
  designation?: string;
  bio?: string;
}

export class ApiService {
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
  static async getMe(token: string) {
    const res = await fetch(`${API.baseUrl}/users/me`, {
      method: 'GET',
      headers: await this.getHeaders(token),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error?.message || 'Failed to fetch user profile');
    }
    return data.data;
  }

  /**
   * Submit complete member registration
   */
  static async registerProfile(token: string, profileData: RegisterProfileData) {
    const res = await fetch(`${API.baseUrl}/users/register`, {
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
  static async uploadAvatar(token: string, imageUriOrBase64: string) {
    let bodyData: any;
    let headers: Record<string, string> = {
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

        // @ts-expect-error - React Native FormData accepts uri/name/type object
        formData.append('avatar', {
          uri: imageUriOrBase64,
          name: filename,
          type,
        });
        bodyData = formData;
      } catch {
        // Fallback to JSON payload
        headers['Content-Type'] = 'application/json';
        bodyData = JSON.stringify({ base64: imageUriOrBase64 });
      }
    }

    const res = await fetch(`${API.baseUrl}/users/avatar`, {
      method: 'POST',
      headers,
      body: bodyData,
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error?.message || 'Failed to upload avatar');
    }
    return data.data;
  }

  /**
   * Fetch list of active cities for location dropdown
   */
  static async getCities() {
    const res = await fetch(`${API.baseUrl}/users/cities`, {
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

    const res = await fetch(`${API.baseUrl}/members?${params.toString()}`, {
      method: 'GET',
      headers: await this.getHeaders(token),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || 'Failed to fetch members');
    return data.data;
  }

  static async getMemberById(token?: string, id?: string) {
    if (!id) return null;
    const res = await fetch(`${API.baseUrl}/members/${id}`, {
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

    const res = await fetch(`${API.baseUrl}/events?${params.toString()}`, {
      method: 'GET',
      headers: await this.getHeaders(token),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || 'Failed to fetch events');
    return data.data;
  }

  static async getEventById(token?: string, id?: string) {
    if (!id) return null;
    const res = await fetch(`${API.baseUrl}/events/${id}`, {
      method: 'GET',
      headers: await this.getHeaders(token),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || 'Failed to fetch event');
    return data.data;
  }

  static async registerForEvent(token: string, eventId: string) {
    const res = await fetch(`${API.baseUrl}/events/${eventId}/register`, {
      method: 'POST',
      headers: await this.getHeaders(token),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || 'Failed to register for event');
    return data.data;
  }

  static async cancelEventRegistration(token: string, eventId: string) {
    const res = await fetch(`${API.baseUrl}/events/${eventId}/register`, {
      method: 'DELETE',
      headers: await this.getHeaders(token),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || 'Failed to cancel registration');
    return data.data;
  }

  /**
   * Notices API
   */
  static async getNotices(token: string, category?: string) {
    const params = new URLSearchParams();
    if (category && category !== 'ALL') params.append('category', category);

    const res = await fetch(`${API.baseUrl}/notices?${params.toString()}`, {
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
  static async getAlbums(token: string) {
    const res = await fetch(`${API.baseUrl}/gallery/albums`, {
      method: 'GET',
      headers: await this.getHeaders(token),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || 'Failed to fetch gallery albums');
    return data.data;
  }

  static async getAlbumById(token: string, id: string) {
    const res = await fetch(`${API.baseUrl}/gallery/albums/${id}`, {
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
    const res = await fetch(`${API.baseUrl}/notifications`, {
      method: 'GET',
      headers: await this.getHeaders(token),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || 'Failed to fetch notifications');
    return data.data;
  }

  static async getUnreadNotificationCount(token: string) {
    const res = await fetch(`${API.baseUrl}/notifications/unread-count`, {
      method: 'GET',
      headers: await this.getHeaders(token),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || 'Failed to fetch unread count');
    return data.data?.unreadCount || 0;
  }

  static async markNotificationRead(token: string, id: string) {
    const res = await fetch(`${API.baseUrl}/notifications/${id}/read`, {
      method: 'PATCH',
      headers: await this.getHeaders(token),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || 'Failed to mark notification as read');
    return data.data;
  }

  static async markAllNotificationsRead(token: string) {
    const res = await fetch(`${API.baseUrl}/notifications/read-all`, {
      method: 'PATCH',
      headers: await this.getHeaders(token),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || 'Failed to mark all as read');
    return data.data;
  }
}
