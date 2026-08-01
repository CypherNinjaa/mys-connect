import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useCustomAlert } from '../../context/CustomAlertContext';
import { useAuth } from '@clerk/expo';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, APP } from '../../constants/theme';
import { resolveAuthRoute } from '../../services/authGate';
import { teardownSession } from '../../services/sessionTeardown';

export default function PendingApprovalScreen() {
  const { getToken, signOut } = useAuth();
  const { showAlert } = useCustomAlert();
  const router = useRouter();

  const [checking, setChecking] = useState(false);

  const handleCheckStatus = async () => {
    setChecking(true);
    try {
      const token = await getToken();
      // Same decision the splash screen makes, so the two can never disagree
      // and bounce the member back and forth.
      const result = await resolveAuthRoute(token);

      if (result.route === '/(auth)/pending-approval') {
        showAlert({
          title: 'Under Review',
          message: 'Your profile registration is still under review by MYS Ranchi administrators.',
          type: 'info',
        });
        return;
      }

      if (result.route === '/(auth)/network-error') {
        showAlert({
          title: 'Connection Problem',
          message: 'We could not reach the server. Please check your connection and try again.',
          type: 'error',
        });
        return;
      }

      router.replace(result.route as Parameters<typeof router.replace>[0]);
    } catch (err) {
      console.error('Check status error:', err);
    } finally {
      setChecking(false);
    }
  };

  const handleSignOut = async () => {
    // Release the push token first — otherwise the next account on this handset
    // keeps receiving notifications meant for this member.
    await teardownSession(getToken);
    await signOut();
    router.replace('/(auth)/sign-in');
  };

  return (
    <View style={styles.container}>
      <View style={styles.contentCard}>
        <View style={styles.iconContainer}>
          <Ionicons name="hourglass-outline" size={40} color={Colors.warning.dark} />
        </View>

        <Text style={styles.title}>Registration Submitted</Text>
        <Text style={styles.subtitle}>Awaiting Admin Verification</Text>

        <Text style={styles.description}>
          Thank you for registering with {APP.orgName}, {APP.city}.
          {'\n\n'}
          Your profile details have been received and are currently undergoing verification by the MYS executive committee.
        </Text>

        <View style={styles.badgeContainer}>
          <Text style={styles.badgeLabel}>Status:</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>PENDING APPROVAL</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleCheckStatus}
          disabled={checking}
        >
          {checking ? (
            <ActivityIndicator color={Colors.neutral[0]} />
          ) : (
            <Text style={styles.primaryButtonText}>Check Status</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primary[500],
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  contentCard: {
    backgroundColor: Colors.neutral[0],
    borderRadius: Spacing.radiusLg,
    padding: Spacing.xl,
    width: '100%',
    alignItems: 'center',
    elevation: 8,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.warning.light,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text.primary,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.warning.dark,
    marginTop: 4,
    marginBottom: Spacing.md,
  },
  description: {
    fontSize: 14,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing.lg,
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: Spacing.xl,
  },
  badgeLabel: {
    fontSize: 13,
    color: Colors.text.tertiary,
  },
  badge: {
    backgroundColor: Colors.warning.light,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: Spacing.radiusSm,
    borderWidth: 1,
    borderColor: Colors.warning.main,
  },
  badgeText: {
    color: Colors.warning.dark,
    fontWeight: '700',
    fontSize: 12,
  },
  primaryButton: {
    backgroundColor: Colors.primary[500],
    width: '100%',
    paddingVertical: 14,
    borderRadius: Spacing.radiusMd,
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  primaryButtonText: {
    color: Colors.neutral[0],
    fontWeight: '700',
    fontSize: 15,
  },
  signOutButton: {
    paddingVertical: 10,
  },
  signOutText: {
    color: Colors.text.tertiary,
    fontSize: 14,
  },
});
