import React, { useEffect, useRef, useState } from 'react';
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
import { useAuth } from '@clerk/expo';
import { useRouter } from 'expo-router';
import { Colors, APP } from '../constants/theme';
import { resolveAuthRoute } from '../services/authGate';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

/** How long the brand is held on screen, at minimum. Runs alongside the auth
 *  check rather than before it — the old code slept first, then started the
 *  request, so every cold start cost 2s plus the round-trip. */
const MIN_SPLASH_MS = 1200;

/** When the round-trip outlasts this, say so instead of spinning silently. */
const SLOW_NETWORK_MS = 6000;

export default function SplashScreen() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const router = useRouter();
  const [loadingText, setLoadingText] = useState('Verifying Credentials...');
  // One decision per mount. Without this a re-render mid-flight could fire a
  // second `router.replace`, and two racing redirects look exactly like a loop.
  const hasRedirected = useRef(false);

  useEffect(() => {
    if (!isLoaded || hasRedirected.current) return;

    let isMounted = true;
    let slowTimer: ReturnType<typeof setTimeout> | undefined;

    async function decide() {
      const brandDelay = new Promise((resolve) => setTimeout(resolve, MIN_SPLASH_MS));

      if (!isSignedIn) {
        await brandDelay;
        if (!isMounted || hasRedirected.current) return;
        hasRedirected.current = true;
        router.replace('/(auth)/sign-in');
        return;
      }

      let target: string;
      try {
        const token = await getToken();
        if (isMounted) setLoadingText('Syncing Profile...');

        slowTimer = setTimeout(() => {
          if (isMounted) setLoadingText('Still connecting...');
        }, SLOW_NETWORK_MS);

        // `resolveAuthRoute` maps every outcome — bad status, blocked account,
        // dead network, expired session — to a screen and never throws.
        const result = await resolveAuthRoute(token);
        if (result.reason) {
          console.warn('[SPLASH]', result.reason);
        }
        target = result.route;
      } catch (error) {
        // Only Clerk's `getToken` can land here.
        console.warn('[SPLASH] Could not read session token', error);
        target = '/(auth)/sign-in';
      } finally {
        if (slowTimer) clearTimeout(slowTimer);
      }

      await brandDelay;
      if (!isMounted || hasRedirected.current) return;
      hasRedirected.current = true;
      router.replace(target as Parameters<typeof router.replace>[0]);
    }

    void decide();

    return () => {
      isMounted = false;
      if (slowTimer) clearTimeout(slowTimer);
    };
    // `getToken` and `router` are new objects on every render; depending on them
    // would restart the auth check continuously.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, isSignedIn]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAF6F0" />

      {/* Main Content Area */}
      <View style={styles.centerContent}>
        {/* Official MYS Logo */}
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
    backgroundColor: '#FAF6F0',
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
    color: Colors.primary[500],
    letterSpacing: 1.5,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  tagline: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2C3E50',
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
    backgroundColor: Colors.secondary[500],
    borderTopLeftRadius: 50,
    borderTopRightRadius: 50,
    elevation: 4,
  },
  maroonWave: {
    flex: 1,
    backgroundColor: Colors.primary[500],
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
  },
});
