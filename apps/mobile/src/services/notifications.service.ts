import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { NETWORK_CONFIG } from '../config/network.config';

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

export async function registerForPushNotificationsAsync(getToken: () => Promise<string | null>): Promise<string | null> {
  let token: string | null = null;

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('[PUSH NOTIFICATION] Permission not granted');
      return null;
    }

    // Get Expo Push Token
    const pushTokenData = await Notifications.getExpoPushTokenAsync();
    token = pushTokenData.data;

    // Register token with backend server
    if (token) {
      const authToken = await getToken();
      if (authToken) {
        await fetch(`${NETWORK_CONFIG.baseUrl}/notifications/push-token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            token,
            platform: Platform.OS,
          }),
        });
        console.log('[PUSH NOTIFICATION] Registered push token with server:', token);
      }
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default Alerts',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#6B1D2A',
      });
    }
  } catch (error) {
    console.error('[PUSH NOTIFICATION ERROR]', error);
  }

  return token;
}
