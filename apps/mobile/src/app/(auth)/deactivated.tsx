import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useAuth, useUser } from '@clerk/expo';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, APP } from '../../constants/theme';
import { unregisterPushNotificationsAsync } from '../../services/notifications.service';

export default function DeactivatedScreen() {
  const { signOut, getToken } = useAuth();
  const { user: clerkUser } = useUser();
  const router = useRouter();

  const metadata = clerkUser?.publicMetadata as
    | { statusReason?: string; reasonNote?: string }
    | undefined;
  const reason = metadata?.statusReason || metadata?.reasonNote;

  const handleSignOut = async () => {
    // Best effort — the server rejects requests from a blocked account, but the
    // local marker still has to go so the next account registers cleanly.
    await unregisterPushNotificationsAsync(getToken);
    await signOut();
    router.replace('/(auth)/sign-in');
  };

  return (
    <View style={styles.container}>
      <View style={styles.contentCard}>
        <View style={styles.iconContainer}>
          <Ionicons name="ban-outline" size={40} color={Colors.error.main} />
        </View>

        <Text style={styles.title}>Account Inactive</Text>
        <Text style={styles.subtitle}>Access Suspended or Declined</Text>

        {reason ? (
          <View style={styles.reasonBox}>
            <Text style={styles.reasonLabel}>Reason given by Admin:</Text>
            <Text style={styles.reasonText}>&quot;{reason}&quot;</Text>
          </View>
        ) : (
          <Text style={styles.description}>
            Your member account for {APP.orgName} has been deactivated or rejected by the administration team.
            {'\n\n'}
            If you believe this is an error or would like to request reinstatement, please contact the executive committee.
          </Text>
        )}

        <TouchableOpacity style={styles.primaryButton} onPress={handleSignOut}>
          <Text style={styles.primaryButtonText}>Sign Out & Return</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.error.dark,
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
    backgroundColor: Colors.error.light,
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
    color: Colors.error.main,
    marginTop: 4,
    marginBottom: Spacing.md,
  },
  description: {
    fontSize: 14,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing.xl,
  },
  reasonBox: {
    width: '100%',
    backgroundColor: '#FFF5F5',
    borderWidth: 1,
    borderColor: '#FEB2B2',
    borderRadius: Spacing.radiusMd,
    padding: Spacing.md,
    marginBottom: Spacing.xl,
    alignItems: 'center',
  },
  reasonLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.error.dark,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  reasonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.error.main,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  primaryButton: {
    backgroundColor: Colors.error.dark,
    width: '100%',
    paddingVertical: 14,
    borderRadius: Spacing.radiusMd,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: Colors.neutral[0],
    fontWeight: '700',
    fontSize: 15,
  },
});
