import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Image } from 'react-native';
import { useAuth } from '@clerk/expo';
import { useRouter } from 'expo-router';
import { Colors, APP } from '../constants/theme';
import { ApiService } from '../services/api';

export default function IndexScreen() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const router = useRouter();
  const [loadingText, setLoadingText] = useState('Initializing MYS CONNECT...');

  useEffect(() => {
    async function checkAuthAndRedirect() {
      if (!isLoaded) return;

      if (!isSignedIn) {
        // Not signed in -> Navigate to Sign In
        router.replace('/(auth)/sign-in');
        return;
      }

      try {
        setLoadingText('Verifying profile status...');
        const token = await getToken();

        if (!token) {
          router.replace('/(auth)/sign-in');
          return;
        }

        const user = await ApiService.getMe(token);

        if (!user) {
          router.replace('/(auth)/complete-profile');
          return;
        }

        // Check DB Status
        if (user.status === 'DEACTIVATED' || user.status === 'REJECTED') {
          router.replace('/(auth)/deactivated');
        } else if (!user.profile?.firstName) {
          // Profile registration not completed yet
          router.replace('/(auth)/complete-profile');
        } else if (user.status === 'PENDING') {
          // Awaiting admin approval
          router.replace('/(auth)/pending-approval');
        } else if (user.status === 'ACTIVE') {
          // Active member -> Go to home
          router.replace('/(member)/home');
        } else {
          router.replace('/(auth)/pending-approval');
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
        // On error fallback to sign in
        router.replace('/(auth)/sign-in');
      }
    }

    checkAuthAndRedirect();
  }, [isLoaded, isSignedIn]);

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <View style={styles.logoCircle}>
          <Text style={styles.logoText}>MYS</Text>
        </View>
        <Text style={styles.title}>{APP.name}</Text>
        <Text style={styles.subtitle}>{APP.orgName}</Text>
        <Text style={styles.motto}>{APP.mottoHindi}</Text>
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
  logoCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: Colors.primary[600],
    borderWidth: 3,
    borderColor: Colors.secondary[500],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  logoText: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.secondary[500],
    letterSpacing: 1.5,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: Colors.neutral[0],
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '500',
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
