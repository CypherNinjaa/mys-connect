import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Image } from 'react-native';
import { useAuth, useUser } from '@clerk/expo';
import { useRouter } from 'expo-router';
import { Colors, APP } from '../constants/theme';
import { ApiService } from '../services/api';

export default function IndexScreen() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const { user: clerkUser } = useUser();
  const router = useRouter();
  const [loadingText, setLoadingText] = useState('Initializing MYS CONNECT...');

  useEffect(() => {
    let isMounted = true;

    async function checkAuthAndRedirect() {
      if (!isLoaded) return;

      if (!isSignedIn) {
        if (isMounted) router.replace('/(auth)/sign-in');
        return;
      }

      try {
        if (isMounted) setLoadingText('Verifying member status...');
        const token = await getToken({ template: undefined });

        if (!token) {
          if (isMounted) router.replace('/(auth)/sign-in');
          return;
        }

        // Try backend check with 5s timeout safety
        let dbUser = null;
        try {
          dbUser = await Promise.race([
            ApiService.getMe(token),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Network timeout')), 5000)),
          ]);
        } catch (netErr) {
          console.warn('Backend API connection warning:', netErr);
        }

        if (!isMounted) return;

        if (dbUser) {
          if (dbUser.status === 'DEACTIVATED' || dbUser.status === 'REJECTED') {
            router.replace('/(auth)/deactivated');
          } else if (!dbUser.profile?.firstName) {
            router.replace('/(auth)/complete-profile');
          } else {
            // Active or auto-verified member
            router.replace('/(member)/home');
          }
        } else {
          // Fallback to Clerk metadata if backend unreachable
          const metadata: any = clerkUser?.publicMetadata || {};
          if (metadata.status === 'DEACTIVATED') {
            router.replace('/(auth)/deactivated');
          } else {
            router.replace('/(member)/home');
          }
        }
      } catch (error) {
        console.error('Auth guard error:', error);
        if (isMounted) router.replace('/(member)/home');
      }
    }

    checkAuthAndRedirect();

    return () => {
      isMounted = false;
    };
  }, [isLoaded, isSignedIn]);

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <Image
          source={require('../../assets/images/mys-logo.jpg')}
          style={styles.logoImage}
          resizeMode="contain"
        />
        <Text style={styles.title}>{APP.name}</Text>
        <Text style={styles.subtitle}>{APP.orgName}</Text>
        <Text style={styles.motto}>"{APP.tagline}"</Text>
      </View>

      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color={Colors.secondary[500]} />
        <Text style={styles.loadingText}>{loadingText}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primary[500],
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 80,
  },
  logoImage: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 3,
    borderColor: Colors.secondary[500],
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.neutral[0],
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.secondary[300],
    marginTop: 4,
  },
  motto: {
    fontSize: 13,
    fontWeight: '400',
    color: Colors.primary[100],
    marginTop: 12,
    fontStyle: 'italic',
  },
  loaderContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  loadingText: {
    fontSize: 13,
    color: Colors.primary[100],
    marginTop: 12,
  },
});
