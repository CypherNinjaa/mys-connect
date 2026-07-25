import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  Image,
  Dimensions,
  StatusBar,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth, useUser } from '@clerk/expo';
import { useRouter } from 'expo-router';
import { Colors, APP } from '../constants/theme';
import { ApiService } from '../services/api';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function SplashScreen() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const { user: clerkUser } = useUser();
  const router = useRouter();
  const [loadingText, setLoadingText] = useState('Verifying Credentials...');

  useEffect(() => {
    let isMounted = true;

    async function checkAuthAndRedirect() {
      if (!isLoaded) return;

      // Small delay for smooth splash display
      await new Promise((resolve) => setTimeout(resolve, 800));

      if (!isSignedIn) {
        if (isMounted) router.replace('/(auth)/sign-in');
        return;
      }

      try {
        if (isMounted) setLoadingText('Syncing Profile...');
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
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Network timeout')), 5000)
            ),
          ]);
        } catch (netErr) {
          console.warn('Backend connection warning during splash:', netErr);
        }

        if (!isMounted) return;

        if (dbUser) {
          if (dbUser.status === 'DEACTIVATED' || dbUser.status === 'REJECTED') {
            router.replace('/(auth)/deactivated');
          } else {
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
        console.error('Splash auth guard error:', error);
        if (isMounted) router.replace('/(member)/home');
      }
    }

    checkAuthAndRedirect();

    return () => {
      isMounted = false;
    };
  }, [isLoaded, isSignedIn]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAF6F0" />

      {/* Main Content Area */}
      <View style={styles.centerContent}>
        {/* Official MYS Logo with Gold Ring */}
        <View style={styles.logoWrapper}>
          <Image
            source={require('../../assets/images/mys-logo.jpg')}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </View>

        {/* Main Title & Tagline */}
        <Text style={styles.mainTitle}>{APP.name}</Text>
        <Text style={styles.tagline}>{APP.tagline}</Text>

        {/* Subtle Loading Spinner */}
        <View style={styles.loadingBox}>
          <ActivityIndicator size="small" color={Colors.secondary[500]} />
          <Text style={styles.loadingText}>{loadingText}</Text>
        </View>
      </View>

      {/* Architectural Background Image (Mahal) */}
      <View style={styles.mahalWrapper} pointerEvents="none">
        <Image
          source={require('../../assets/images/mahal-bg.png')}
          style={styles.mahalImage}
          resizeMode="cover"
        />
      </View>

      {/* Bottom Royal Wave Banner */}
      <View style={styles.bottomWaveContainer} pointerEvents="none">
        <View style={styles.goldLine} />
        <View style={styles.maroonWave} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF6F0', // Warm cream background matching wireframe
    justifyContent: 'space-between',
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    paddingHorizontal: 24,
    marginTop: -40,
  },
  logoWrapper: {
    shadowColor: Colors.primary[500],
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    marginBottom: 20,
  },
  logoImage: {
    width: 150,
    height: 150,
    borderRadius: 75,
  },
  mainTitle: {
    fontSize: 34,
    fontWeight: '800',
    color: Colors.primary[500], // Royal Maroon #6B1D2A
    letterSpacing: 1.5,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  tagline: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2C3E50', // Slate Navy
    marginTop: 8,
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  loadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 36,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(212, 160, 65, 0.3)',
  },
  loadingText: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.text.secondary,
  },
  mahalWrapper: {
    position: 'absolute',
    bottom: 70,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT * 0.38,
    alignItems: 'center',
    justifyContent: 'flex-end',
    opacity: 0.65,
    zIndex: 1,
  },
  mahalImage: {
    width: SCREEN_WIDTH,
    height: '100%',
  },
  bottomWaveContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 90,
    zIndex: 5,
  },
  goldLine: {
    height: 4,
    backgroundColor: Colors.secondary[500], // MYS Gold #D4A041
    borderTopLeftRadius: 50,
    borderTopRightRadius: 50,
    shadowColor: Colors.secondary[500],
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  maroonWave: {
    flex: 1,
    backgroundColor: Colors.primary[500], // Royal Maroon #6B1D2A
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
  },
});
