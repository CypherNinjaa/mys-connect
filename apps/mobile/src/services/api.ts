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
   * Upload profile image to Cloudinary
   */
  static async uploadAvatar(token: string, imageUri: string) {
    const formData = new FormData();
    const filename = imageUri.split('/').pop() || 'avatar.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : `image/jpeg`;

    // @ts-expect-error - React Native FormData accepts uri/name/type object
    formData.append('avatar', {
      uri: imageUri,
      name: filename,
      type,
    });

    const res = await fetch(`${API.baseUrl}/users/avatar`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
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
}
