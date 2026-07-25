import { ClerkProvider } from '@clerk/expo';
import { tokenCache } from '@clerk/expo/token-cache';
import { Slot } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;

if (!publishableKey) {
  console.warn('⚠️ Missing EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY in environment variables.');
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ClerkProvider publishableKey={publishableKey || 'pk_test_placeholder'} tokenCache={tokenCache}>
        <StatusBar style="light" />
        <Slot />
      </ClerkProvider>
    </SafeAreaProvider>
  );
}
