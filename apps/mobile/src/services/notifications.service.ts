import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import type { ImperativeRouter } from 'expo-router';
import { ApiService } from './api';

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
 */
export async function registerForPushNotificationsAsync(
  getToken: () => Promise<string | null>
): Promise<string | null> {
  let pushToken: string | null = null;

  try {
    // Push notifications only work on physical devices
    if (!Device.isDevice) {
      console.log('[PUSH] Must use a physical device for push notifications');
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

    // Register token with backend server via ApiService
    if (pushToken) {
      const authToken = await getToken();
      if (authToken) {
        await ApiService.registerPushToken(authToken, pushToken, Platform.OS);
        console.log('[PUSH] Registered push token:', pushToken);
      }
    }
  } catch (error) {
    console.error('[PUSH ERROR]', error);
  }

  return pushToken;
}

/**
 * Navigate to the correct screen based on notification data
 */
function handleNotificationNavigation(
  data: Record<string, any> | undefined,
  router: ImperativeRouter
) {
  if (!data) return;

  if (data.type === 'EVENT' && data.eventId) {
    router.push({ pathname: '/(member)/event-detail', params: { id: data.eventId } });
  } else if (data.type === 'NOTICE' && data.noticeId) {
    router.push({ pathname: '/(member)/notices', params: { noticeId: data.noticeId } });
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
      const data = response.notification.request.content.data as Record<string, any> | undefined;
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
      const data = response.notification.request.content.data as Record<string, any> | undefined;
      // Small delay to ensure navigation is ready
      setTimeout(() => {
        handleNotificationNavigation(data, router);
      }, 500);
    }
  } catch (error) {
    console.error('[PUSH] Error handling initial notification:', error);
  }
}
