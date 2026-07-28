import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useCustomAlert } from '../../context/CustomAlertContext';
import { useAuth } from '@clerk/expo';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, APP } from '../../constants/theme';
import { ApiService } from '../../services/api';
import { NETWORK_CONFIG } from '../../config/network.config';

export default function NetworkErrorScreen() {
  const { signOut } = useAuth();
  const { showAlert } = useCustomAlert();
  const router = useRouter();
  const [retrying, setRetrying] = useState(false);

  const handleRetry = async () => {
    setRetrying(true);
    try {
      const isServerOnline = await ApiService.checkHealth();
      if (isServerOnline) {
        showAlert({
          title: 'Connection Restored 🎉',
          message: 'Successfully connected to MYS Server!',
          type: 'success',
          buttons: [{ text: 'Continue', onPress: () => router.replace('/') }],
        });
      } else {
        showAlert({
          title: 'Server Unreachable',
          message: `Could not connect to MYS server at:\n${NETWORK_CONFIG.baseUrl}\n\nPlease check if your backend server is running and device network is active.`,
          type: 'warning',
        });
      }
    } catch {
      showAlert({
        title: 'Connection Failed',
        message: 'Network check timed out. Please try again.',
        type: 'error',
      });
    } finally {
      setRetrying(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      router.replace('/(auth)/sign-in');
    } catch {
      router.replace('/(auth)/sign-in');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.contentCard}>
        <View style={styles.iconContainer}>
          <Ionicons name="cloud-offline-outline" size={42} color={Colors.warning.dark} />
        </View>

        <Text style={styles.title}>Connection Failed</Text>
        <Text style={styles.subtitle}>Server Unreachable or Network Down</Text>

        <Text style={styles.description}>
          We were unable to establish a secure connection to the {APP.orgName} server.
          {'\n\n'}
          To prevent displaying stale or unverified data, please check your network connection or ensure the server is online.
        </Text>

        <View style={styles.detailsBox}>
          <Text style={styles.detailsTitle}>Technical Details:</Text>
          <Text style={styles.detailsText} numberOfLines={2}>
            API Endpoint: {NETWORK_CONFIG.baseUrl}
          </Text>
        </View>

        <TouchableOpacity style={styles.primaryButton} onPress={handleRetry} disabled={retrying}>
          {retrying ? (
            <ActivityIndicator color={Colors.neutral[0]} size="small" />
          ) : (
            <View style={styles.buttonInner}>
              <Ionicons name="refresh-outline" size={18} color={Colors.neutral[0]} style={styles.buttonIcon} />
              <Text style={styles.primaryButtonText}>Retry Connection</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryButton} onPress={handleSignOut}>
          <Text style={styles.secondaryButtonText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#6B1D2A', // Deep MYS Maroon
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FEF3C7', // Soft warning yellow
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
    marginBottom: Spacing.md,
  },
  detailsBox: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: Spacing.xl,
  },
  detailsTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 2,
  },
  detailsText: {
    fontSize: 11,
    color: '#64748B',
    fontFamily: 'Platform',
  },
  primaryButton: {
    backgroundColor: '#6B1D2A',
    width: '100%',
    paddingVertical: 14,
    borderRadius: Spacing.radiusMd,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  buttonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonIcon: {
    marginRight: 6,
  },
  primaryButtonText: {
    color: Colors.neutral[0],
    fontWeight: '700',
    fontSize: 15,
  },
  secondaryButton: {
    paddingVertical: 10,
    width: '100%',
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: Colors.text.secondary,
    fontSize: 14,
    fontWeight: '600',
  },
});
