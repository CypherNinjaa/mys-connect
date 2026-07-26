// ─────────────────────────────────────────────────────────
// MYS CONNECT — Shared Types & Constants
// Aligned with Prisma schema enums and models
// ─────────────────────────────────────────────────────────

// ═══════════════════════════════════════════════════════════
// ENUMS (match Prisma schema exactly)
// ═══════════════════════════════════════════════════════════

export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  EXECUTIVE = 'EXECUTIVE',
  VOLUNTEER = 'VOLUNTEER',
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
  REGISTERED = 'REGISTERED',
  CANCELLED = 'CANCELLED',
  ATTENDED = 'ATTENDED',
}

export enum NoticeType {
  GENERAL = 'GENERAL',
  IMPORTANT = 'IMPORTANT',
  CIRCULAR = 'CIRCULAR',
}

export enum NoticePriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum NotificationChannel {
  PUSH = 'PUSH',
  IN_APP = 'IN_APP',
  EMAIL = 'EMAIL',
}

export enum NotificationStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  READ = 'READ',
  FAILED = 'FAILED',
}

// ═══════════════════════════════════════════════════════════
// DTOs — Data Transfer Objects
// ═══════════════════════════════════════════════════════════

export interface CityDTO {
  id: string;
  name: string;
  state: string;
  isActive: boolean;
  sortOrder: number;
}

export interface ProfileDTO {
  id: string;
  userId: string;
  firstName: string | null;
  lastName: string | null;
  displayName: string | null;
  dateOfBirth: string | null;
  gender: Gender | null;
  bloodGroup: BloodGroup | null;
  avatarUrl: string | null;
  address: string | null;
  cityId: string | null;
  state: string | null;
  pinCode: string | null;
  occupation: string | null;
  organization: string | null;
  designation: string | null;
  bio: string | null;
  city?: CityDTO | null;
}

export interface UserDTO {
  id: string;
  clerkId: string;
  email: string;
  phone: string | null;
  fullName: string | null;
  memberId: string | null;
  avatarUrl: string | null;
  role: UserRole;
  status: UserStatus;
  profileComplete: boolean;
  expoPushToken: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
  profile?: ProfileDTO | null;
}

export interface EventDTO {
  id: string;
  title: string;
  description: string;
  shortDesc: string | null;
  startDate: string;
  endDate: string | null;
  startTime: string | null;
  endTime: string | null;
  isAllDay: boolean;
  venue: string | null;
  address: string | null;
  cityId: string | null;
  mapUrl: string | null;
  isOnline: boolean;
  meetingLink: string | null;
  coverImageUrl: string | null;
  status: EventStatus;
  isPublic: boolean;
  maxAttendees: number | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  city?: CityDTO | null;
  _count?: { rsvps: number };
  isRegistered?: boolean;
}

export interface EventRSVPDTO {
  id: string;
  userId: string;
  eventId: string;
  status: RSVPStatus;
  note: string | null;
  createdAt: string;
  updatedAt: string;
  user?: Pick<UserDTO, 'id' | 'fullName' | 'email' | 'phone' | 'avatarUrl'>;
}

export interface NoticeDTO {
  id: string;
  title: string;
  content: string;
  type: NoticeType;
  priority: NoticePriority;
  publishedAt: string | null;
  expiresAt: string | null;
  isPublished: boolean;
  isPinned: boolean;
  imageUrl: string | null;
  attachmentUrl: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  isRead?: boolean;
}

export interface AlbumDTO {
  id: string;
  title: string;
  description: string | null;
  coverImageUrl: string | null;
  isPublished: boolean;
  sortOrder: number;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  photos?: AlbumPhotoDTO[];
  _count?: { photos: number };
}

export interface AlbumPhotoDTO {
  id: string;
  albumId: string;
  imageUrl: string;
  thumbnailUrl: string | null;
  caption: string | null;
  sortOrder: number;
  createdAt: string;
}

export interface NotificationDTO {
  id: string;
  userId: string;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  channel: NotificationChannel;
  status: NotificationStatus;
  sentAt: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface AuditLogDTO {
  id: string;
  userId: string;
  action: string;
  entity: string;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
}

export interface AppSettingDTO {
  id: string;
  key: string;
  value: string;
  type: string;
  group: string;
}

export interface DownloadDTO {
  id: string;
  title: string;
  description: string | null;
  fileUrl: string;
  fileType: string | null;
  fileSize: number | null;
  isActive: boolean;
  createdAt: string;
}

// ═══════════════════════════════════════════════════════════
// API Response Wrapper
// ═══════════════════════════════════════════════════════════

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext?: boolean;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    message: string;
    statusCode: number;
  };
  pagination?: PaginationMeta;
}

// ═══════════════════════════════════════════════════════════
// Dashboard / Admin Types
// ═══════════════════════════════════════════════════════════

export interface DashboardStats {
  totalMembers: number;
  upcomingEvents: number;
  totalNotices: number;
  galleryImages: number;
  newRegistrations: number;
  memberGrowth: { month: string; count: number }[];
  recentActivities: {
    id: string;
    action: string;
    entity: string;
    description: string;
    createdAt: string;
  }[];
}
