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
import { Colors, Spacing, APP } from '../../constants/theme';
import { ApiService } from '../../services/api';

export default function HomeScreen() {
  const { getToken } = useAuth();
  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadUserData = async () => {
    try {
      const token = await getToken();
      if (token) {
        const userData = await ApiService.getMe(token);
        setUser(userData);
      }
    } catch (err) {
      console.error('Home screen user load error:', err);
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

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary[500]]} />}
    >
      {/* User Welcome Banner */}
      <View style={styles.welcomeBanner}>
        <View>
          <Text style={styles.welcomeText}>Jai Shree Krishna 🙏</Text>
          <Text style={styles.userNameText}>
            {profile?.firstName ? `${profile.firstName} ${profile.lastName}` : 'MYS Member'}
          </Text>
          <Text style={styles.userCityText}>
            📍 {profile?.city?.name || 'Ranchi'}, Jharkhand
          </Text>
        </View>

        <View style={styles.roleBadge}>
          <Text style={styles.roleBadgeText}>{user?.role || 'MEMBER'}</Text>
        </View>
      </View>

      {/* Quick Action Grid */}
      <Text style={styles.sectionHeading}>Quick Navigation</Text>
      <View style={styles.grid}>
        <TouchableOpacity
          style={styles.gridCard}
          onPress={() => router.push('/(member)/directory')}
        >
          <Text style={styles.cardIcon}>👥</Text>
          <Text style={styles.cardTitle}>Member Directory</Text>
          <Text style={styles.cardSub}>Search & Connect</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.gridCard}
          onPress={() => router.push('/(member)/events')}
        >
          <Text style={styles.cardIcon}>📅</Text>
          <Text style={styles.cardTitle}>Events & Meetups</Text>
          <Text style={styles.cardSub}>Upcoming & RSVP</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.gridCard}
          onPress={() => router.push('/(member)/notices')}
        >
          <Text style={styles.cardIcon}>📢</Text>
          <Text style={styles.cardTitle}>Notice Board</Text>
          <Text style={styles.cardSub}>Official Circulars</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.gridCard}
          onPress={() => router.push('/(member)/profile')}
        >
          <Text style={styles.cardIcon}>👤</Text>
          <Text style={styles.cardTitle}>My Account</Text>
          <Text style={styles.cardSub}>View Profile & Gotra</Text>
        </TouchableOpacity>
      </View>

      {/* Announcement Banner */}
      <View style={styles.noticeBanner}>
        <View style={styles.noticeHeader}>
          <Text style={styles.noticeIcon}>💡</Text>
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
    marginBottom: Spacing.lg,
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
  userCityText: {
    fontSize: 13,
    color: Colors.primary[100],
    marginTop: 4,
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
    fontSize: 28,
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
  noticeIcon: {
    fontSize: 18,
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
