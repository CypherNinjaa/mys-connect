import React, { useEffect, useState } from 'react';
import { Redirect, Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@clerk/expo';
import { Colors } from '../../constants/theme';
import { ApiService } from '../../services/api';

import { registerForPushNotificationsAsync } from '../../services/notifications.service';

export default function MemberLayout() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const [unreadCount, setUnreadCount] = useState<number>(0);

  useEffect(() => {
    let isMounted = true;
    async function initNotifications() {
      if (isSignedIn) {
        try {
          // 1. Request push permission & register push token
          void registerForPushNotificationsAsync(getToken);

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
    }
    initNotifications();
    return () => {
      isMounted = false;
    };
  }, [isSignedIn]);

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
