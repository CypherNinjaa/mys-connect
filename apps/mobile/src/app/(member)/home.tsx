import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  RefreshControl,
} from 'react-native';
import { useAuth } from '@clerk/expo';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, APP } from '../../constants/theme';
import { ApiService } from '../../services/api';
import { SkeletonItem } from '../../components/ui/SkeletonLoader';

export default function HomeScreen() {
  const { getToken, isSignedIn } = useAuth();
  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [featuredEvent, setFeaturedEvent] = useState<any>(null);
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadHomeData = async () => {
    if (!isSignedIn) return;
    try {
      const token = await getToken();
      if (token) {
        const [userData, eventsData] = await Promise.all([
          ApiService.getMe(token).catch(() => null),
          ApiService.getEvents(token, 'UPCOMING').catch(() => ({ events: [] })),
        ]);

        if (userData) setUser(userData);
        if (eventsData?.events?.length) {
          setFeaturedEvent(eventsData.events[0]);
          setUpcomingEvents(eventsData.events.slice(1, 4));
        }
      }
    } catch (err) {
      console.error('Home load error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (isSignedIn) {
      void loadHomeData();
    } else {
      setLoading(false);
    }
  }, [isSignedIn]);

  const onRefresh = () => {
    setRefreshing(true);
    void loadHomeData();
  };

  const getTimeGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning,';
    if (hour < 17) return 'Good Afternoon,';
    return 'Good Evening,';
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <SkeletonItem width="100%" height={100} borderRadius={16} style={{ marginBottom: 16 }} />
        <SkeletonItem width="100%" height={160} borderRadius={16} style={{ marginBottom: 20 }} />
        <SkeletonItem width="40%" height={20} borderRadius={6} style={{ marginBottom: 12 }} />
        <View style={styles.gridRow}>
          <SkeletonItem width="48%" height={90} borderRadius={12} />
          <SkeletonItem width="48%" height={90} borderRadius={12} />
        </View>
      </View>
    );
  }

  const profile = user?.profile;
  const isProfileIncomplete = !user?.profileComplete;
  const displayName = user?.fullName || (profile?.firstName ? `${profile.firstName} ${profile.lastName}` : 'Member');

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary[500]]} />}
    >
      {/* Header Greeting Banner — Wireframe 06 */}
      <View style={styles.headerBanner}>
        <View style={styles.avatarWrapper}>
          {user?.avatarUrl || profile?.avatarUrl ? (
            <Image source={{ uri: user?.avatarUrl || profile?.avatarUrl }} style={styles.avatarImage} />
          ) : (
            <Text style={styles.avatarInitials}>{displayName[0]?.toUpperCase()}</Text>
          )}
        </View>
        <View style={styles.greetingTextContainer}>
          <Text style={styles.greetingTitle}>{getTimeGreeting()}</Text>
          <Text style={styles.userName}>{displayName} 👋</Text>
        </View>
        <TouchableOpacity style={styles.settingsIconBtn} onPress={() => router.push('/(member)/profile')}>
          <Ionicons name="settings-outline" size={22} color={Colors.neutral[0]} />
        </TouchableOpacity>
      </View>

      {/* Complete Profile Banner (Only if profile incomplete) */}
      {isProfileIncomplete && (
        <TouchableOpacity
          style={styles.completeProfileCard}
          onPress={() => router.push('/(member)/profile')}
          activeOpacity={0.9}
        >
          <View style={styles.completeProfileIcon}>
            <Ionicons name="person-add" size={20} color={Colors.secondary[500]} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.completeProfileTitle}>Complete Your Member Profile</Text>
            <Text style={styles.completeProfileSub}>Add your contact & occupation details</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={Colors.primary[500]} />
        </TouchableOpacity>
      )}

      {/* Featured Event Card — Matching Wireframe 06 */}
      <View style={styles.featuredEventCard}>
        <Image
          source={require('../../../assets/images/mys-logo.jpg')}
          style={styles.featuredEventBg}
          resizeMode="cover"
        />
        <View style={styles.featuredEventOverlay}>
          <View style={styles.featuredEventHeader}>
            <View style={styles.featuredTag}>
              <Text style={styles.featuredTagText}>FEATURED EVENT</Text>
            </View>
            <Text style={styles.eventDateText}>
              {featuredEvent?.startDate ? new Date(featuredEvent.startDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '15 August 2026'}
            </Text>
          </View>

          <Text style={styles.featuredEventTitle}>
            {featuredEvent?.title || 'Annual General Meeting'}
          </Text>
          <Text style={styles.featuredEventVenue}>
            📍 {featuredEvent?.venue || 'Shree Maheshwari Bhawan, Jaipur'}
          </Text>

          <TouchableOpacity
            style={styles.registerCtaBtn}
            onPress={() => router.push('/(member)/events')}
          >
            <Text style={styles.registerCtaBtnText}>Register Now</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Quick Access Grid — Matching Wireframe 06 */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Quick Access</Text>
      </View>

      <View style={styles.gridRow}>
        <TouchableOpacity
          style={styles.gridCard}
          onPress={() => router.push('/(member)/directory')}
        >
          <View style={[styles.iconCircle, { backgroundColor: '#EBF8FF' }]}>
            <Ionicons name="people" size={24} color="#3182CE" />
          </View>
          <Text style={styles.gridTitle}>Members</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.gridCard}
          onPress={() => router.push('/(member)/events')}
        >
          <View style={[styles.iconCircle, { backgroundColor: '#FEFCBF' }]}>
            <Ionicons name="calendar" size={24} color="#D69E2E" />
          </View>
          <Text style={styles.gridTitle}>Events</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.gridCard}
          onPress={() => router.push('/(member)/gallery')}
        >
          <View style={[styles.iconCircle, { backgroundColor: '#E6FFFA' }]}>
            <Ionicons name="images" size={24} color="#319795" />
          </View>
          <Text style={styles.gridTitle}>Gallery</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.gridCard}
          onPress={() => router.push('/(member)/notices')}
        >
          <View style={[styles.iconCircle, { backgroundColor: '#FED7D7' }]}>
            <Ionicons name="megaphone" size={24} color="#E53E3E" />
          </View>
          <Text style={styles.gridTitle}>Notices</Text>
        </TouchableOpacity>
      </View>

      {/* Upcoming Events List — Wireframe 06 */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Upcoming Events</Text>
        <TouchableOpacity onPress={() => router.push('/(member)/events')}>
          <Text style={styles.viewAllText}>View All</Text>
        </TouchableOpacity>
      </View>

      {upcomingEvents.length > 0 ? (
        upcomingEvents.map((evt) => {
          const dateObj = new Date(evt.startDate);
          const day = dateObj.getDate().toString().padStart(2, '0');
          const month = dateObj.toLocaleString('default', { month: 'short' }).toUpperCase();

          return (
            <TouchableOpacity
              key={evt.id}
              style={styles.eventItemCard}
              onPress={() => router.push('/(member)/events')}
            >
              <View style={styles.dateBadge}>
                <Text style={styles.dateBadgeDay}>{day}</Text>
                <Text style={styles.dateBadgeMonth}>{month}</Text>
              </View>
              <View style={styles.eventItemInfo}>
                <Text style={styles.eventItemTitle}>{evt.title}</Text>
                <Text style={styles.eventItemSub}>
                  {evt.startTime || '10:00 AM'} · {evt.venue || 'Shree Maheshwari Bhawan'}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.miniRegisterBtn}
                onPress={() => router.push('/(member)/events')}
              >
                <Text style={styles.miniRegisterBtnText}>RSVP</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          );
        })
      ) : (
        <View style={styles.eventItemCard}>
          <View style={styles.dateBadge}>
            <Text style={styles.dateBadgeDay}>10</Text>
            <Text style={styles.dateBadgeMonth}>NOV</Text>
          </View>
          <View style={styles.eventItemInfo}>
            <Text style={styles.eventItemTitle}>Blood Donation Camp</Text>
            <Text style={styles.eventItemSub}>10 November 2026 · 09:00 AM</Text>
          </View>
          <TouchableOpacity
            style={styles.miniRegisterBtn}
            onPress={() => router.push('/(member)/events')}
          >
            <Text style={styles.miniRegisterBtnText}>RSVP</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Motto Footer Banner */}
      <View style={styles.mottoFooter}>
        <Text style={styles.mottoText}>{APP.mottoHindi}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  content: {
    padding: Spacing.md,
    paddingBottom: 32,
  },
  loadingContainer: {
    padding: Spacing.md,
  },
  headerBanner: {
    backgroundColor: Colors.primary[500],
    borderRadius: Spacing.radiusLg,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
    elevation: 3,
  },
  avatarWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary[600],
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.secondary[500],
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarInitials: {
    color: Colors.secondary[500],
    fontSize: 20,
    fontWeight: '800',
  },
  greetingTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  greetingTitle: {
    fontSize: 12,
    color: Colors.secondary[300],
    fontWeight: '600',
  },
  userName: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.neutral[0],
  },
  settingsIconBtn: {
    padding: 6,
  },
  completeProfileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8EC',
    borderRadius: Spacing.radiusMd,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.secondary[500],
    marginBottom: Spacing.md,
    gap: 10,
  },
  completeProfileIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary[500],
    justifyContent: 'center',
    alignItems: 'center',
  },
  completeProfileTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary[900],
  },
  completeProfileSub: {
    fontSize: 11,
    color: Colors.text.secondary,
  },
  featuredEventCard: {
    height: 180,
    borderRadius: Spacing.radiusLg,
    overflow: 'hidden',
    marginBottom: Spacing.lg,
    elevation: 4,
  },
  featuredEventBg: {
    ...StyleSheet.absoluteFill,
    opacity: 0.25,
    backgroundColor: Colors.primary[900],
  },
  featuredEventOverlay: {
    flex: 1,
    backgroundColor: 'rgba(107, 29, 42, 0.88)',
    padding: Spacing.md,
    justifyContent: 'space-between',
  },
  featuredEventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  featuredTag: {
    backgroundColor: Colors.secondary[500],
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  featuredTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.primary[900],
  },
  eventDateText: {
    fontSize: 12,
    color: Colors.secondary[300],
    fontWeight: '600',
  },
  featuredEventTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.neutral[0],
    marginTop: 4,
  },
  featuredEventVenue: {
    fontSize: 12,
    color: Colors.neutral[200],
    marginTop: 2,
  },
  registerCtaBtn: {
    backgroundColor: Colors.neutral[0],
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  registerCtaBtnText: {
    color: Colors.primary[500],
    fontWeight: '700',
    fontSize: 13,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary[500],
  },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  gridCard: {
    width: '23%',
    backgroundColor: Colors.neutral[0],
    borderRadius: Spacing.radiusMd,
    paddingVertical: 12,
    alignItems: 'center',
    elevation: 2,
    borderWidth: 1,
    borderColor: '#EDF2F7',
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  gridTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  eventItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.neutral[0],
    padding: Spacing.md,
    borderRadius: Spacing.radiusMd,
    marginBottom: 10,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#EDF2F7',
  },
  dateBadge: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: '#FFF5F5',
    borderWidth: 1,
    borderColor: '#FEB2B2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateBadgeDay: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.primary[500],
  },
  dateBadgeMonth: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.primary[500],
  },
  eventItemInfo: {
    flex: 1,
    marginLeft: 12,
  },
  eventItemTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  eventItemSub: {
    fontSize: 12,
    color: Colors.text.tertiary,
    marginTop: 2,
  },
  miniRegisterBtn: {
    backgroundColor: Colors.primary[500],
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  miniRegisterBtnText: {
    color: Colors.neutral[0],
    fontSize: 12,
    fontWeight: '700',
  },
  mottoFooter: {
    marginTop: 16,
    backgroundColor: Colors.primary[500],
    borderRadius: Spacing.radiusMd,
    paddingVertical: 12,
    alignItems: 'center',
  },
  mottoText: {
    color: Colors.secondary[500],
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 2,
  },
});
