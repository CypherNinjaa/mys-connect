import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@clerk/expo';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ApiService } from '../../services/api';
import {
  HomeService,
  FeaturedEvent,
  QuickAccessItem,
  UpcomingEvent,
  MOCK_QUICK_ACCESS,
} from '../../services/homeService';
import { HomeCacheManager } from '../../services/homeCacheManager';
import { useCacheChannel } from '../../hooks/useCacheChannel';
import { HomeHeader } from '../../components/home/HomeHeader';
import { EventCarousel } from '../../components/home/EventCarousel';
import { QuickAccessCard } from '../../components/home/QuickAccessCard';
import { UpcomingEventCard } from '../../components/home/UpcomingEventCard';
import { SkeletonItem } from '../../components/ui/SkeletonLoader';

export default function HomeScreen() {
  const { getToken, isSignedIn } = useAuth();
  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [featuredEvents, setFeaturedEvents] = useState<FeaturedEvent[]>([]);
  const [quickAccessItems] = useState<QuickAccessItem[]>(MOCK_QUICK_ACCESS);
  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [cooldownMessage, setCooldownMessage] = useState<string | null>(null);

  const greeting = HomeService.getGreeting();

  const loadData = useCallback(
    async (isForceRefresh = false) => {
      // 1. Check local in-memory cache if not forcing refresh
      if (!isForceRefresh) {
        const cached = HomeCacheManager.getCachedData();
        if (cached) {
          setUser(cached.user);
          setFeaturedEvents(cached.featuredEvents);
          setUpcomingEvents(cached.upcomingEvents);
          setLoading(false);
          setRefreshing(false);
          return;
        }
      }

      if (isForceRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setHasError(false);
      setErrorMessage(null);
      setCooldownMessage(null);

      try {
        let fetchedUser: any = user;
        let finalFeatured: FeaturedEvent[] = [];
        let finalUpcoming: UpcomingEvent[] = [];

        if (isSignedIn) {
          const token = await getToken();
          if (token) {
            const [userData, eventsRes] = await Promise.all([
              ApiService.getMe(token).catch((err) => {
                console.warn('Home getMe error:', err?.message || err);
                return null;
              }),
              ApiService.getEvents(token, 'UPCOMING', undefined, 1, 10).catch((err) => {
                console.warn('Home getEvents error:', err?.message || err);
                return null;
              }),
            ]);

            if (userData) fetchedUser = userData;

            if (eventsRes && Array.isArray(eventsRes.events) && eventsRes.events.length > 0) {
              const apiEvents = eventsRes.events;

              finalFeatured = apiEvents.slice(0, 4).map((evt: any) => ({
                id: evt.id,
                title: evt.title,
                date: evt.startDate
                  ? new Date(evt.startDate).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })
                  : 'Upcoming Date',
                venue: evt.venue || 'Shree Maheshwari Bhawan',
                image:
                  evt.coverImageUrl ||
                  evt.bannerUrl ||
                  'https://images.unsplash.com/photo-1548013146-72479768bada?auto=format&fit=crop&w=800&q=80',
                actionText: 'Register Now',
              }));

              finalUpcoming = apiEvents.slice(0, 4).map((evt: any) => ({
                id: evt.id,
                title: evt.title,
                dateTime: `${
                  evt.startDate
                    ? new Date(evt.startDate).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })
                    : 'Upcoming'
                } | ${evt.startTime || '09:00 AM'}`,
                venue: evt.venue || 'Shree Maheshwari Bhawan',
                iconName: 'pulse',
                iconColor: '#E53E3E',
                bgColor: '#FFEBF0',
              }));
            }
          }
        }

        setUser(fetchedUser);
        setFeaturedEvents(finalFeatured);
        setUpcomingEvents(finalUpcoming);

        // Store in local cache
        HomeCacheManager.setCachedData({
          user: fetchedUser,
          featuredEvents: finalFeatured,
          upcomingEvents: finalUpcoming,
        });
      } catch (err: any) {
        console.error('Home load error:', err);
        setHasError(true);
        setErrorMessage(err.message || 'Unable to connect to server');

        const mockFeatured = await HomeService.getFeaturedEvents();
        const mockUpcoming = await HomeService.getUpcomingEvents();
        setFeaturedEvents(mockFeatured.slice(0, 4));
        setUpcomingEvents(mockUpcoming.slice(0, 4));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [isSignedIn, getToken, user]
  );

  useEffect(() => {
    // Awaited inside the effect rather than called from its body, so the loader's
    // setState calls land after the first paint instead of cascading.
    async function run() {
      await loadData(false);
    }
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSignedIn]);

  // Realtime: re-read the patched cache instead of refetching. Only the slices
  // that actually changed will differ, so React bails out of the rest.
  useCacheChannel('home', () => {
    const cached = HomeCacheManager.getCachedData();
    if (!cached) return;
    setUser(cached.user);
    setFeaturedEvents(cached.featuredEvents);
    setUpcomingEvents(cached.upcomingEvents);
  });

  // Rate-Limited Manual Refresh
  const onRefresh = () => {
    const { allowed, remainingSeconds } = HomeCacheManager.canManualRefresh();
    if (!allowed) {
      setRefreshing(false);
      setCooldownMessage(`Already up to date. Please wait ${remainingSeconds}s before refreshing again.`);
      setTimeout(() => setCooldownMessage(null), 3000);
      return;
    }

    HomeCacheManager.recordManualRefresh();
    void loadData(true);
  };

  const handleQuickAccessPress = (item: QuickAccessItem) => {
    router.push(item.route as any);
  };

  const handleRegisterPress = (event: FeaturedEvent) => {
    router.push(`/(member)/event-detail?id=${event.id}&from=home`);
  };

  const handleUpcomingEventPress = (event: UpcomingEvent) => {
    router.push(`/(member)/event-detail?id=${event.id}&from=home`);
  };

  const handleViewAllEvents = () => {
    router.push('/(member)/events');
  };

  const profile = user?.profile;
  const userName =
    user?.fullName ||
    (profile?.firstName ? `${profile.firstName} ${profile.lastName}` : 'Rajesh Kumar');
  const avatarUrl = user?.avatarUrl || profile?.avatarUrl;

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor="#6B1D2A" />
        <View style={styles.loadingContainer}>
          <SkeletonItem width="100%" height={120} borderRadius={0} style={{ marginBottom: 16 }} />
          <SkeletonItem width="100%" height={180} borderRadius={20} style={{ marginHorizontal: 16, marginBottom: 24 }} />
          <View style={styles.skeletonGrid}>
            <SkeletonItem width="22%" height={80} borderRadius={16} />
            <SkeletonItem width="22%" height={80} borderRadius={16} />
            <SkeletonItem width="22%" height={80} borderRadius={16} />
            <SkeletonItem width="22%" height={80} borderRadius={16} />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#6B1D2A" />
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#6B1D2A']}
            tintColor="#6B1D2A"
          />
        }
      >
        {/* 1. Header Banner */}
        <HomeHeader
          greeting={greeting}
          userName={userName}
          avatarUrl={avatarUrl}
          fallbackInitial={userName[0] || 'R'}
          onNotificationPress={() => router.push('/(member)/notifications')}
          onProfilePress={() => router.push('/(member)/profile')}
        />

        {/* Main Content Area */}
        <View style={styles.contentPadding}>
          {/* Refresh Cooldown Notification Toast */}
          {cooldownMessage && (
            <View style={styles.cooldownBanner}>
              <Ionicons name="information-circle" size={18} color="#2B6CB0" style={{ marginRight: 6 }} />
              <Text style={styles.cooldownText}>{cooldownMessage}</Text>
            </View>
          )}

          {/* Network Error Notification Banner */}
          {hasError && (
            <TouchableOpacity style={styles.errorBanner} onPress={() => loadData(true)} activeOpacity={0.8}>
              <Ionicons name="wifi-outline" size={20} color="#C53030" style={{ marginRight: 8 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.errorBannerTitle}>Network Connection Notice</Text>
                <Text style={styles.errorBannerSub}>
                  {errorMessage || 'Showing cached data. Tap to refresh.'}
                </Text>
              </View>
              <Ionicons name="refresh" size={18} color="#C53030" />
            </TouchableOpacity>
          )}

          {/* 2. Featured Event Carousel */}
          <EventCarousel
            events={featuredEvents}
            onRegisterPress={handleRegisterPress}
          />

          {/* 3. Quick Access Grid */}
          <QuickAccessCard
            items={quickAccessItems}
            onItemPress={handleQuickAccessPress}
          />

          {/* 4. Upcoming Events */}
          <UpcomingEventCard
            events={upcomingEvents}
            onEventPress={handleUpcomingEventPress}
            onViewAllPress={handleViewAllEvents}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#6B1D2A',
  },
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  contentPadding: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  skeletonGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  cooldownBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EBF8FF',
    borderWidth: 1,
    borderColor: '#BEE3F8',
    borderRadius: 10,
    padding: 10,
    marginTop: -40,
    marginBottom: 16,
    zIndex: 10,
  },
  cooldownText: {
    fontSize: 12.5,
    color: '#2B6CB0',
    fontWeight: '600',
    flex: 1,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF5F5',
    borderWidth: 1,
    borderColor: '#FEB2B2',
    borderRadius: 12,
    padding: 12,
    marginTop: -40,
    marginBottom: 16,
    zIndex: 10,
  },
  errorBannerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#9B2C2C',
  },
  errorBannerSub: {
    fontSize: 11.5,
    color: '#C53030',
    marginTop: 2,
  },
});
