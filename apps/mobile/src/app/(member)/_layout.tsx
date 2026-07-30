import React, { useEffect, useState } from 'react';
import { Redirect, Tabs, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@clerk/expo';
import { Colors } from '../../constants/theme';
import { ApiService } from '../../services/api';

import {
  registerForPushNotificationsAsync,
  setupNotificationListeners,
  handleInitialNotification,
} from '../../services/notifications.service';

export default function MemberLayout() {
  const { isLoaded, isSignedIn, getToken, userId } = useAuth();
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState<number>(0);

  useEffect(() => {
    let isMounted = true;

    async function initNotifications() {
      if (!isSignedIn || !userId) return;

      try {
        // 1. Request push permission & register push token. The service skips
        //    the network call when this device already registered this token
        //    for this account, so re-opening the app costs nothing.
        void registerForPushNotificationsAsync(getToken, userId);

        // 2. Fetch unread notification count
        const token = await getToken();
        if (token) {
          const count = await ApiService.getUnreadNotificationCount(token);
          if (isMounted) setUnreadCount(count);
        }
      } catch {
        // Quietly swallow if offline
      }
    }

    initNotifications();

    // 3. Set up notification listeners for foreground + tap events
    const listeners = setupNotificationListeners(router, () => {
      // On foreground notification received, increment badge count
      if (isMounted) setUnreadCount((prev) => prev + 1);
    });

    // 4. Handle cold-start deep linking (app opened from notification tap)
    void handleInitialNotification(router);

    return () => {
      isMounted = false;
      listeners.remove();
    };
    // `getToken` and `router` are recreated on every render; including them would
    // tear down and re-attach the notification listeners continuously.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSignedIn, userId]);

  if (!isLoaded) {
    return null;
  }

  if (!isSignedIn) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.primary[500],
        tabBarInactiveTintColor: Colors.neutral[500],
        tabBarStyle: {
          backgroundColor: Colors.neutral[0],
          borderTopColor: Colors.border.light,
          height: 60,
          paddingBottom: 8,
          paddingTop: 6,
        },
        headerStyle: {
          backgroundColor: Colors.primary[500],
        },
        headerTintColor: Colors.neutral[0],
        headerTitleStyle: {
          fontWeight: '700',
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          headerShown: false,
          tabBarLabel: 'Home',
          tabBarIcon: ({ color }) => <Ionicons name="home-outline" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="events"
        options={{
          headerShown: false,
          tabBarLabel: 'Events',
          tabBarIcon: ({ color }) => <Ionicons name="calendar-outline" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="gallery"
        options={{
          headerShown: false,
          tabBarLabel: 'Gallery',
          tabBarIcon: ({ color }) => <Ionicons name="images-outline" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Notifications',
          tabBarLabel: 'Notifications',
          tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
          tabBarIcon: ({ color }) => <Ionicons name="notifications-outline" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'My Profile',
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color }) => <Ionicons name="person-outline" size={22} color={color} />,
        }}
      />

      {/* Hidden sub-routes inside member layout — NOT shown on bottom tab bar */}
      <Tabs.Screen
        name="change-password"
        options={{
          href: null,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="directory"
        options={{
          href: null,
          title: 'Member Directory',
        }}
      />
      <Tabs.Screen
        name="notices"
        options={{
          href: null,
          title: 'Notice Board',
        }}
      />
      <Tabs.Screen
        name="member-detail"
        options={{
          href: null,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="event-detail"
        options={{
          href: null,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="about"
        options={{
          href: null,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="contact"
        options={{
          href: null,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          href: null,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="downloads"
        options={{
          href: null,
          headerShown: false,
        }}
      />
    </Tabs>
  );
}
