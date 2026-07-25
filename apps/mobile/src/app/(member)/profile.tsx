import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '@clerk/expo';
import { useRouter } from 'expo-router';
import { Colors, Spacing, APP } from '../../constants/theme';
import { ApiService } from '../../services/api';

export default function ProfileScreen() {
  const { getToken, signOut } = useAuth();
  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProfile() {
      try {
        const token = await getToken();
        if (token) {
          const data = await ApiService.getMe(token);
          setUser(data);
        }
      } catch (err) {
        console.error('Profile load error:', err);
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, []);

  const handleSignOut = async () => {
    await signOut();
    router.replace('/(auth)/sign-in');
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary[500]} />
      </View>
    );
  }

  const profile = user?.profile;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header Avatar & Info */}
      <View style={styles.profileHeader}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>
            {profile?.firstName ? profile.firstName[0].toUpperCase() : 'M'}
          </Text>
        </View>

        <Text style={styles.nameText}>
          {profile?.firstName ? `${profile.firstName} ${profile.lastName}` : 'Member'}
        </Text>
        <Text style={styles.emailText}>{user?.email}</Text>

        <View style={styles.statusBadge}>
          <Text style={styles.statusBadgeText}>{user?.status || 'ACTIVE'}</Text>
        </View>
      </View>

      {/* Details Card */}
      <View style={styles.card}>
        <Text style={styles.cardSectionTitle}>Personal & Contact Details</Text>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Phone Number</Text>
          <Text style={styles.infoValue}>{user?.phone || 'Not provided'}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Gender</Text>
          <Text style={styles.infoValue}>{profile?.gender || 'N/A'}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Blood Group</Text>
          <Text style={styles.infoValue}>{profile?.bloodGroup ? profile.bloodGroup.replace('_', ' ') : 'N/A'}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>City Chapter</Text>
          <Text style={styles.infoValue}>{profile?.city?.name || 'Ranchi'}</Text>
        </View>
      </View>

      {/* Cultural Card */}
      <View style={styles.card}>
        <Text style={styles.cardSectionTitle}>Cultural & Family Info</Text>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Father's Name</Text>
          <Text style={styles.infoValue}>{profile?.fatherName || 'Not specified'}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Native Place</Text>
          <Text style={styles.infoValue}>{profile?.nativePlace || 'Not specified'}</Text>
        </View>
      </View>

      {/* Professional Card */}
      <View style={styles.card}>
        <Text style={styles.cardSectionTitle}>Professional Details</Text>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Occupation</Text>
          <Text style={styles.infoValue}>{profile?.occupation || 'Not specified'}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Organization</Text>
          <Text style={styles.infoValue}>{profile?.organization || 'Not specified'}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Designation</Text>
          <Text style={styles.infoValue}>{profile?.designation || 'Not specified'}</Text>
        </View>
      </View>

      {/* Sign Out Button */}
      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
        <Text style={styles.signOutButtonText}>Sign Out Account</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  content: {
    padding: Spacing.md,
    paddingBottom: 40,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileHeader: {
    backgroundColor: Colors.primary[500],
    borderRadius: Spacing.radiusLg,
    padding: Spacing.xl,
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary[600],
    borderWidth: 3,
    borderColor: Colors.secondary[500],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '800',
    color: Colors.secondary[500],
  },
  nameText: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.neutral[0],
  },
  emailText: {
    fontSize: 13,
    color: Colors.primary[100],
    marginTop: 2,
  },
  statusBadge: {
    backgroundColor: Colors.success.light,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: Spacing.radiusSm,
    marginTop: Spacing.sm,
  },
  statusBadgeText: {
    color: Colors.success.dark,
    fontWeight: '700',
    fontSize: 12,
  },
  card: {
    backgroundColor: Colors.neutral[0],
    borderRadius: Spacing.radiusMd,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    elevation: 2,
  },
  cardSectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.primary[500],
    marginBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
    paddingBottom: 6,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral[100],
  },
  infoLabel: {
    fontSize: 13,
    color: Colors.text.tertiary,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  signOutButton: {
    backgroundColor: Colors.error.dark,
    borderRadius: Spacing.radiusMd,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  signOutButtonText: {
    color: Colors.neutral[0],
    fontWeight: '700',
    fontSize: 15,
  },
});
