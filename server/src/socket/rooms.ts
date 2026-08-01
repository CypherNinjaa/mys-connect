/**
 * Room naming and membership rules.
 *
 * Nothing is ever broadcast with a bare `io.emit()`. Every emission targets at
 * least one room so a member's device never receives admin-only traffic and a
 * Ranchi member is not woken by a Jaipur-only change.
 *
 * Room taxonomy
 *   user:{userId}      one member, all their devices (phone + tablet + web)
 *   role:{ROLE}        every connection holding that exact role
 *   role:admin         SUPER_ADMIN + ADMIN + EXECUTIVE — the console audience
 *   role:member        everyone who sees member-facing content
 *   chapter:{slug}     geographic scope, derived from the member's profile city
 *   event:{eventId}    opt-in, for live registration counters on one event
 */

import type { Socket } from 'socket.io';
import type {
  ClientToServerEvents,
  InterServerEvents,
  ServerToClientEvents,
  SocketData,
} from './events';

export type AppSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

/** Roles that may see the admin console stream. */
const ADMIN_ROLES = new Set(['SUPER_ADMIN', 'ADMIN', 'EXECUTIVE']);

/** Roles that see member-facing content. Admins are members too — they use the app. */
const MEMBER_ROLES = new Set([
  'SUPER_ADMIN',
  'ADMIN',
  'EXECUTIVE',
  'VOLUNTEER',
  'MEMBER',
]);

export const ROOM = {
  user: (userId: string) => `user:${userId}`,
  role: (role: string) => `role:${role.toUpperCase()}`,
  admin: () => 'role:admin',
  member: () => 'role:member',
  chapter: (chapter: string) => `chapter:${slugifyChapter(chapter)}`,
  event: (eventId: string) => `event:${eventId}`,
} as const;

/** `Ranchi` → `ranchi`, `New Delhi` → `new-delhi`. Keeps room names predictable. */
export function slugifyChapter(chapter: string): string {
  return chapter
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function isAdminRole(role: string): boolean {
  return ADMIN_ROLES.has(role.toUpperCase());
}

export function isMemberRole(role: string): boolean {
  return MEMBER_ROLES.has(role.toUpperCase());
}

/**
 * Work out every room a freshly authenticated connection belongs in.
 * Pure function — easy to unit test, and the socket layer stays declarative.
 */
export function roomsForUser(params: {
  userId: string;
  role: string;
  chapter: string | null;
}): string[] {
  const rooms: string[] = [ROOM.user(params.userId), ROOM.role(params.role)];

  if (isAdminRole(params.role)) {
    rooms.push(ROOM.admin());
  }
  if (isMemberRole(params.role)) {
    rooms.push(ROOM.member());
  }
  if (params.chapter) {
    rooms.push(ROOM.chapter(params.chapter));
  }

  // A GUEST lands in role:GUEST only — no member content, no admin stream.
  return Array.from(new Set(rooms));
}

/** Join every room for this connection and record them on socket.data. */
export function joinUserRooms(socket: AppSocket): string[] {
  const rooms = roomsForUser({
    userId: socket.data.userId,
    role: socket.data.role,
    chapter: socket.data.chapter,
  });

  socket.join(rooms);
  socket.data.rooms = rooms;
  return rooms;
}

/**
 * Rooms that should receive a member-facing change.
 *
 * A chapter-scoped item goes to that chapter plus the admin console (admins
 * supervise every chapter). A global item goes to all members. Admins always
 * get their own copy so the console stays live regardless of geography.
 */
export function audienceForContent(chapter?: string | null): string[] {
  if (chapter) {
    return [ROOM.chapter(chapter), ROOM.admin()];
  }
  return [ROOM.member(), ROOM.admin()];
}
