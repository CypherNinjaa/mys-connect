// ─────────────────────────────────────────────────────────
// MYS CONNECT — Shared Types & Constants
// ─────────────────────────────────────────────────────────

export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  MODERATOR = 'MODERATOR',
  MEMBER = 'MEMBER',
  GUEST = 'GUEST',
}

export enum UserStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  DEACTIVATED = 'DEACTIVATED',
  REJECTED = 'REJECTED',
}

export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  OTHER = 'OTHER',
}

export enum BloodGroup {
  A_POSITIVE = 'A_POSITIVE',
  A_NEGATIVE = 'A_NEGATIVE',
  B_POSITIVE = 'B_POSITIVE',
  B_NEGATIVE = 'B_NEGATIVE',
  AB_POSITIVE = 'AB_POSITIVE',
  AB_NEGATIVE = 'AB_NEGATIVE',
  O_POSITIVE = 'O_POSITIVE',
  O_NEGATIVE = 'O_NEGATIVE',
}

export enum EventStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED',
}

export enum RSVPStatus {
  GOING = 'GOING',
  NOT_GOING = 'NOT_GOING',
  MAYBE = 'MAYBE',
}

export enum NoticeType {
  GENERAL = 'GENERAL',
  URGENT = 'URGENT',
  EVENT = 'EVENT',
  MEETING = 'MEETING',
  ANNOUNCEMENT = 'ANNOUNCEMENT',
}

export enum NoticePriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export interface UserDTO {
  id: string;
  clerkId: string;
  email: string;
  phone?: string | null;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
  profile?: ProfileDTO | null;
}

export interface ProfileDTO {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  displayName?: string | null;
  dateOfBirth?: string | null;
  gender?: Gender | null;
  bloodGroup?: BloodGroup | null;
  avatarUrl?: string | null;
  address?: string | null;
  cityId?: string | null;
  state?: string | null;
  pinCode?: string | null;
  occupation?: string | null;
  organization?: string | null;
  designation?: string | null;
  bio?: string | null;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    statusCode: number;
  };
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
