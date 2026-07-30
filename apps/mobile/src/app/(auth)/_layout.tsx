import { Redirect, Stack, useSegments } from 'expo-router';
import { useAuth } from '@clerk/expo';
import { Colors } from '../../constants/theme';

/**
 * Screens in this group that only make sense while signed OUT.
 *
 * Everything else here — the waiting room, the blocked-account notice, the
 * profile form, the offline retry — is reached *because* the member is signed
 * in. Redirecting the whole group when `isSignedIn` was true is what put the
 * splash screen in a loop: the splash sent a PENDING member to
 * `pending-approval`, this layout sent them straight back to `/`, and around
 * again forever.
 */
const SIGNED_OUT_ONLY = ['sign-in', 'sign-up', 'forgot-password'];

export default function AuthLayout() {
  const { isLoaded, isSignedIn } = useAuth();
  const segments = useSegments();

  if (!isLoaded) {
    return null;
  }

  const current = segments[segments.length - 1];

  if (isSignedIn && SIGNED_OUT_ONLY.includes(current)) {
    return <Redirect href="/" />;
  }

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: Colors.primary[500],
        },
        headerTintColor: Colors.neutral[0],
        headerTitleStyle: {
          fontWeight: '600',
        },
        contentStyle: {
          backgroundColor: Colors.background.primary,
        },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="sign-in" options={{ headerShown: false }} />
      <Stack.Screen name="sign-up" options={{ headerShown: false }} />
      <Stack.Screen name="complete-profile" options={{ title: 'Complete Member Profile', headerBackVisible: false }} />
      <Stack.Screen name="pending-approval" options={{ headerShown: false }} />
      <Stack.Screen name="deactivated" options={{ headerShown: false }} />
      <Stack.Screen name="network-error" options={{ headerShown: false }} />
      <Stack.Screen name="forgot-password" options={{ title: 'Reset Password' }} />
    </Stack>
  );
}
