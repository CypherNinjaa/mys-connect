import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useAuth } from '@clerk/expo';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, APP } from '../../constants/theme';
import { ApiService } from '../../services/api';

export default function HomeScreen() {
  const { getToken, isSignedIn } = useAuth();
  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadUserData = async () => {
    try {
      if (isSignedIn) {
        const token = await getToken();
        if (token) {
          const userData = await ApiService.getMe(token);
          setUser(userData);
        }
      }
    } catch (err) {
      // Quietly swallow for guest mode / unauthenticated session
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadUserData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadUserData();
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary[500]} />
      </View>
    );
  }

  const profile = user?.profile;
  const isProfileIncomplete = !profile?.occupation || !user?.phone;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary[500]]} />}
    >
      {/* User Welcome Banner */}
      <View style={styles.welcomeBanner}>
        <View style={{ flex: 1 }}>
          <Text style={styles.welcomeText}>Jai Shree Krishna</Text>
          <Text style={styles.userNameText}>
            {profile?.firstName ? `${profile.firstName} ${profile.lastName}` : 'MYS Member'}
          </Text>
          <View style={styles.cityRow}>
            <Ionicons name="location-outline" size={14} color={Colors.primary[100]} />
            <Text style={styles.userCityText}>
              {profile?.city?.name || 'Ranchi'}, Jharkhand
            </Text>
          </View>
        </View>

        <View style={styles.roleBadge}>
          <Text style={styles.roleBadgeText}>{user?.role || 'MEMBER'}</Text>
        </View>
      </View>

      {/* Complete Profile Prompt Card */}
      {isProfileIncomplete && (
        <TouchableOpacity
          style={styles.completeProfileBanner}
          onPress={() => router.push('/(member)/profile')}
          activeOpacity={0.9}
        >
          <View style={styles.completeProfileIconWrapper}>
            <Ionicons name="sparkles" size={24} color={Colors.secondary[500]} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.completeProfileTitle}>Complete Your Member Profile</Text>
            <Text style={styles.completeProfileSub}>
              Tap to set your occupation & contact details in Profile.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={Colors.primary[500]} />
        </TouchableOpacity>
      )}

      {/* Quick Action Grid */}
      <Text style={styles.sectionHeading}>Quick Navigation</Text>
      <View style={styles.grid}>
        <TouchableOpacity
          style={styles.gridCard}
          onPress={() => router.push('/(member)/directory')}
        >
          <Ionicons name="people-outline" size={28} color={Colors.primary[500]} style={styles.cardIcon} />
          <Text style={styles.cardTitle}>Member Directory</Text>
          <Text style={styles.cardSub}>Search & Connect</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.gridCard}
          onPress={() => router.push('/(member)/events')}
        >
          <Ionicons name="calendar-outline" size={28} color={Colors.primary[500]} style={styles.cardIcon} />
          <Text style={styles.cardTitle}>Events & Meetups</Text>
          <Text style={styles.cardSub}>Upcoming & RSVP</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.gridCard}
          onPress={() => router.push('/(member)/notices')}
        >
          <Ionicons name="megaphone-outline" size={28} color={Colors.primary[500]} style={styles.cardIcon} />
          <Text style={styles.cardTitle}>Notice Board</Text>
          <Text style={styles.cardSub}>Official Circulars</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.gridCard}
          onPress={() => router.push('/(member)/profile')}
        >
          <Ionicons name="person-outline" size={28} color={Colors.primary[500]} style={styles.cardIcon} />
          <Text style={styles.cardTitle}>My Account</Text>
          <Text style={styles.cardSub}>View Profile & Details</Text>
        </TouchableOpacity>
      </View>

      {/* Announcement Banner */}
      <View style={styles.noticeBanner}>
        <View style={styles.noticeHeader}>
          <Ionicons name="information-circle-outline" size={20} color={Colors.secondary[600]} />
          <Text style={styles.noticeTitle}>Welcome to MYS CONNECT</Text>
        </View>
        <Text style={styles.noticeBody}>
          Official app of {APP.orgName}, {APP.city}. Connect with fellow members, participate in community service, and stay updated with events.
        </Text>
      </View>

      {/* Motto Footer Banner */}
      <View style={styles.mottoBanner}>
        <Text style={styles.mottoText}>{APP.mottoHindi}</Text>
      </View>
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
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  welcomeBanner: {
    backgroundColor: Colors.primary[500],
    borderRadius: Spacing.radiusLg,
    padding: Spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
    elevation: 4,
  },
  welcomeText: {
    fontSize: 13,
    color: Colors.secondary[300],
    fontWeight: '600',
  },
  userNameText: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.neutral[0],
    marginTop: 2,
  },
  cityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  userCityText: {
    fontSize: 13,
    color: Colors.primary[100],
  },
  roleBadge: {
    backgroundColor: Colors.secondary[500],
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Spacing.radiusSm,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.primary[900],
  },
  completeProfileBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8EC',
    borderRadius: Spacing.radiusMd,
    padding: Spacing.md,
    borderWidth: 1.5,
    borderColor: Colors.secondary[500],
    marginBottom: Spacing.lg,
    gap: 12,
    elevation: 2,
  },
  completeProfileIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary[500],
    justifyContent: 'center',
    alignItems: 'center',
  },
  completeProfileTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary[900],
  },
  completeProfileSub: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginTop: 2,
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: Spacing.md,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  gridCard: {
    backgroundColor: Colors.neutral[0],
    borderRadius: Spacing.radiusMd,
    padding: Spacing.md,
    width: '47%',
    elevation: 2,
    borderWidth: 1,
    borderColor: Colors.border.light,
  },
  cardIcon: {
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  cardSub: {
    fontSize: 11,
    color: Colors.text.tertiary,
    marginTop: 2,
  },
  noticeBanner: {
    backgroundColor: Colors.neutral[0],
    borderRadius: Spacing.radiusMd,
    padding: Spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: Colors.secondary[500],
    marginBottom: Spacing.lg,
    elevation: 2,
  },
  noticeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  noticeTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  noticeBody: {
    fontSize: 13,
    color: Colors.text.secondary,
    lineHeight: 18,
  },
  mottoBanner: {
    backgroundColor: Colors.primary[600],
    borderRadius: Spacing.radiusMd,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  mottoText: {
    color: Colors.secondary[500],
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 2,
  },
});
