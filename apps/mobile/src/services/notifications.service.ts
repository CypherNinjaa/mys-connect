import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import type { ImperativeRouter } from 'expo-router';
import { ApiService } from './api';

/**
 * Marker recording which account this device last registered a push token for.
 *
 * Without it every app open re-POSTs the same token, and a second account on
 * the same handset silently inherits the first member's registration.
 */
const PUSH_REGISTRATION_KEY = 'mys.push_registration';

interface PushRegistration {
  userId: string;
  pushToken: string;
}

async function readRegistration(): Promise<PushRegistration | null> {
  try {
    const raw = await SecureStore.getItemAsync(PUSH_REGISTRATION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PushRegistration>;
    if (!parsed?.userId || !parsed?.pushToken) return null;
    return { userId: parsed.userId, pushToken: parsed.pushToken };
  } catch {
    return null;
  }
}

async function writeRegistration(registration: PushRegistration): Promise<void> {
  try {
    await SecureStore.setItemAsync(PUSH_REGISTRATION_KEY, JSON.stringify(registration));
  } catch (error) {
    // A failed write only costs us a redundant POST next launch.
    console.warn('[PUSH] Could not persist registration marker', error);
  }
}

async function clearRegistration(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(PUSH_REGISTRATION_KEY);
  } catch {
    // Nothing to do — the marker is a cache, not a source of truth.
  }
}

// Configure foreground notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Set up Android notification channels for different notification types
 */
async function setupNotificationChannels() {
  if (Platform.OS !== 'android') return;

  await Promise.all([
    Notifications.setNotificationChannelAsync('default', {
      name: 'Default Alerts',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#6B1D2A',
    }),
    Notifications.setNotificationChannelAsync('events', {
      name: 'Event Updates',
      description: 'Notifications about new, updated, or cancelled events',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#6B1D2A',
    }),
    Notifications.setNotificationChannelAsync('notices', {
      name: 'Notices & Broadcasts',
      description: 'Important announcements and broadcast notices',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#6B1D2A',
    }),
  ]);
}

/**
 * Request push notification permissions and register the Expo Push Token with the server.
 * Only works on physical devices — emulators/simulators cannot receive push notifications.
 *
 * The server round-trip is skipped when this device already registered the same
 * token for the same account, so re-opening the app costs nothing.
 */
export async function registerForPushNotificationsAsync(
  getToken: () => Promise<string | null>,
  userId: string
): Promise<string | null> {
  let pushToken: string | null = null;

  try {
    // Push notifications only work on physical devices
    if (!Device.isDevice) {
      console.log('[PUSH] Must use a physical device for push notifications');
      return null;
    }

    if (!userId) {
      return null;
    }

    // Set up Android notification channels
    await setupNotificationChannels();

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('[PUSH] Permission not granted');
      return null;
    }

    // Get Expo Push Token with projectId (required for dev builds)
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    const pushTokenData = await Notifications.getExpoPushTokenAsync({
      ...(projectId ? { projectId } : {}),
    });
    pushToken = pushTokenData.data;

    if (!pushToken) {
      return null;
    }

    // Already registered for this account on this device — nothing to send.
    const existing = await readRegistration();
    if (existing && existing.userId === userId && existing.pushToken === pushToken) {
      return pushToken;
    }

    const authToken = await getToken();
    if (!authToken) {
      return pushToken;
    }

    await ApiService.registerPushToken(authToken, pushToken, Platform.OS);
    await writeRegistration({ userId, pushToken });
    console.log('[PUSH] Registered push token for user', userId);
  } catch (error) {
    console.error('[PUSH ERROR]', error);
  }

  return pushToken;
}

/**
 * Release this device's push token before signing out.
 *
 * Clears the local marker unconditionally so the next account registers afresh
 * even if the server call fails.
 */
export async function unregisterPushNotificationsAsync(
  getToken: () => Promise<string | null>
): Promise<void> {
  try {
    const existing = await readRegistration();
    if (!existing) return;

    const authToken = await getToken();
    if (authToken) {
      await ApiService.unregisterPushToken(authToken, existing.pushToken);
    }
  } catch (error) {
    console.warn('[PUSH] Could not unregister push token', error);
  } finally {
    await clearRegistration();
  }
}

/**
 * Navigate to the correct screen based on notification data
 */
function handleNotificationNavigation(
  data: Record<string, unknown> | undefined,
  router: ImperativeRouter
) {
  if (!data) return;

  if (data.type === 'EVENT' && data.eventId) {
    router.push({ pathname: '/(member)/event-detail', params: { id: String(data.eventId) } });
  } else if (data.type === 'NOTICE' && data.noticeId) {
    router.push({ pathname: '/(member)/notices', params: { noticeId: String(data.noticeId) } });
  } else {
    router.push('/(member)/notifications');
  }
}

/**
 * Set up notification listeners for foreground and tap events.
 * Returns an object with subscription cleanup functions.
 */
export function setupNotificationListeners(
  router: ImperativeRouter,
  onNotificationReceived?: () => void
) {
  // Foreground: notification arrives while app is open
  const receivedSubscription = Notifications.addNotificationReceivedListener(
    (_notification) => {
      // Trigger badge count increment in the calling component
      onNotificationReceived?.();
    }
  );

  // User taps a notification (from foreground banner, background tray, or killed state)
  const responseSubscription = Notifications.addNotificationResponseReceivedListener(
    (response) => {
      const data = response.notification.request.content.data as Record<string, unknown> | undefined;
      handleNotificationNavigation(data, router);
    }
  );

  return {
    receivedSubscription,
    responseSubscription,
    remove: () => {
      receivedSubscription.remove();
      responseSubscription.remove();
    },
  };
}

/**
 * Handle cold-start deep linking — check if the app was opened via a notification tap.
 * Call once on mount in _layout.tsx.
 */
export async function handleInitialNotification(router: ImperativeRouter) {
  try {
    const response = await Notifications.getLastNotificationResponseAsync();
    if (response) {
      const data = response.notification.request.content.data as Record<string, unknown> | undefined;
      // Small delay to ensure navigation is ready
      setTimeout(() => {
        handleNotificationNavigation(data, router);
      }, 500);
    }
  } catch (error) {
    console.error('[PUSH] Error handling initial notification:', error);
  }
}
