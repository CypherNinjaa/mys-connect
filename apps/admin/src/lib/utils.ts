import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateTime(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getInitials(firstName?: string, lastName?: string): string {
  const f = firstName?.[0] || '';
  const l = lastName?.[0] || '';
  return (f + l).toUpperCase() || '?';
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'ACTIVE':
    case 'PUBLISHED':
      return 'bg-green-100 text-green-800';
    case 'PENDING':
    case 'DRAFT':
      return 'bg-yellow-100 text-yellow-800';
    case 'DEACTIVATED':
    case 'CANCELLED':
      return 'bg-red-100 text-red-800';
    case 'REJECTED':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

export function getRoleColor(role: string): string {
  switch (role) {
    case 'SUPER_ADMIN':
      return 'bg-purple-100 text-purple-800';
    case 'ADMIN':
      return 'bg-blue-100 text-blue-800';
    case 'EXECUTIVE':
      return 'bg-indigo-100 text-indigo-800';
    case 'VOLUNTEER':
      return 'bg-teal-100 text-teal-800';
    case 'MEMBER':
      return 'bg-gray-100 text-gray-800';
    case 'GUEST':
      return 'bg-orange-100 text-orange-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

/**
 * Human-readable label for a MysDesignation enum value.
 * Returns null when the member holds no post.
 */
export function getMysDesignationLabel(value?: string | null): string | null {
  if (!value) return null;
  const labels: Record<string, string> = {
    PRESIDENT: 'President',
    SECRETARY: 'Secretary',
    IMMEDIATE_PAST_PRESIDENT: 'Immediate Past President',
    PAST_PRESIDENT: 'Past President',
    PAST_SECRETARY: 'Past Secretary',
    EXECUTIVE_MEMBER: 'Executive Member',
    JOINT_SECRETARY: 'Joint Secretary',
    INVITEES: 'Invitees',
    VICE_PRESIDENT: 'Vice President',
    TREASURER: 'Treasurer',
    ORGANIZATION_MINISTER: 'Organization Minister',
  };
  return labels[value] ?? null;
}
