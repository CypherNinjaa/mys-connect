import { ApiService, isApiError, type CurrentUser } from './api';

/**
 * Single source of truth for "where does this session belong right now".
 *
 * The splash screen and the waiting screen both used to make this decision on
 * their own, with slightly different rules, which is how a PENDING member could
 * be bounced between them forever. Both now call in here instead.
 */
export type GateRoute =
  | '/(auth)/sign-in'
  | '/(auth)/complete-profile'
  | '/(auth)/pending-approval'
  | '/(auth)/deactivated'
  | '/(auth)/network-error'
  | '/(member)/home';

export interface GateResult {
  route: GateRoute;
  /** Null when the server could not be reached or the session is invalid. */
  user: CurrentUser | null;
  /** Set when the decision came from a failed request rather than a status. */
  reason?: string;
}

/** Route a user record to its screen. Exported so screens can re-check cheaply. */
export function routeForUser(user: CurrentUser): GateRoute {
  if (user.status === 'DEACTIVATED' || user.status === 'REJECTED' || user.status === 'SUSPENDED') {
    return '/(auth)/deactivated';
  }

  // An unfinished profile always outranks approval — there is nothing for an
  // admin to review yet.
  if (!user.profileComplete) {
    return '/(auth)/complete-profile';
  }

  if (user.status === 'ACTIVE') {
    return '/(member)/home';
  }

  if (user.status === 'PENDING') {
    // If an admin turned approval off after this member registered, their row
    // can still read PENDING. A complete profile is then enough to let them in.
    return user.requiresApproval === false ? '/(member)/home' : '/(auth)/pending-approval';
  }

  // Unknown status: hold at the waiting screen rather than admitting them.
  return '/(auth)/pending-approval';
}

/**
 * Ask the server who this token belongs to and decide the destination.
 *
 * Never throws — every failure mode maps to a screen, because the caller is a
 * navigation guard and has nowhere to surface an exception.
 */
export async function resolveAuthRoute(token: string | null): Promise<GateResult> {
  if (!token) {
    return { route: '/(auth)/sign-in', user: null, reason: 'No session token' };
  }

  try {
    const user = await ApiService.getMe(token);

    if (!user) {
      return { route: '/(auth)/sign-in', user: null, reason: 'Session did not resolve to a member' };
    }

    return { route: routeForUser(user), user };
  } catch (error) {
    if (isApiError(error)) {
      // The request never reached the server — a retry is the right offer, not
      // a sign-out.
      if (error.isNetworkError) {
        return { route: '/(auth)/network-error', user: null, reason: error.message };
      }

      // userResolver throws 403 with the reason for blocked accounts.
      if (error.status === 403) {
        return { route: '/(auth)/deactivated', user: null, reason: error.message };
      }

      if (error.status === 401) {
        return { route: '/(auth)/sign-in', user: null, reason: error.message };
      }

      // 5xx or an unexpected 4xx: treat as "backend unavailable" so the member
      // gets a retry instead of being kicked out of a valid session.
      return { route: '/(auth)/network-error', user: null, reason: error.message };
    }

    return {
      route: '/(auth)/network-error',
      user: null,
      reason: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
