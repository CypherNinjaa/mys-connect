import React, { useEffect, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  RefreshControl,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { useAuth } from '@clerk/expo';
import { useRouter } from 'expo-router';
import { ApiService } from '../../services/api';
import {
  HomeService,
  FeaturedEvent,
  QuickAccessItem,
  UpcomingEvent,
  MOCK_QUICK_ACCESS,
} from '../../services/homeService';
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

  const greeting = HomeService.getGreeting();

  const loadData = async () => {
    try {
      const mockFeatured = await HomeService.getFeaturedEvents();
      const mockUpcoming = await HomeService.getUpcomingEvents();

      if (isSignedIn) {
        const token = await getToken();
        if (token) {
          const [userData, eventsRes] = await Promise.all([
            ApiService.getMe(token).catch(() => null),
            ApiService.getEvents(token, 'UPCOMING').catch(() => ({ events: [] })),
          ]);

          if (userData) setUser(userData);

          // If backend returns real events, format and merge with mock defaults
          if (eventsRes?.events && eventsRes.events.length > 0) {
            const apiFeatured: FeaturedEvent[] = eventsRes.events.map((evt: any) => ({
              id: evt.id,
              title: evt.title,
              date: evt.startDate
                ? new Date(evt.startDate).toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })
                : '15 August 2026',
              venue: evt.venue || 'Shree Maheshwari Bhawan, Jaipur',
              image: evt.bannerUrl || mockFeatured[0].image,
              actionText: 'Register Now',
            }));

            const apiUpcoming: UpcomingEvent[] = eventsRes.events.map((evt: any) => ({
              id: evt.id,
              title: evt.title,
              dateTime: `${
                evt.startDate
                  ? new Date(evt.startDate).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })
                  : '10 Nov 2026'
              } | ${evt.startTime || '09:00 AM'}`,
              venue: evt.venue || 'Shree Maheshwari Bhawan',
              iconName: 'pulse',
              iconColor: '#E53E3E',
              bgColor: '#FFEBF0',
            }));

            setFeaturedEvents(apiFeatured.length > 0 ? apiFeatured : mockFeatured);
            setUpcomingEvents(apiUpcoming.length > 0 ? apiUpcoming : mockUpcoming);
          } else {
            setFeaturedEvents(mockFeatured);
            setUpcomingEvents(mockUpcoming);
          }
        } else {
          setFeaturedEvents(mockFeatured);
          setUpcomingEvents(mockUpcoming);
        }
      } else {
        setFeaturedEvents(mockFeatured);
        setUpcomingEvents(mockUpcoming);
      }
    } catch (err) {
      console.error('Home screen load error:', err);
      // Graceful fallback to mock data
      setFeaturedEvents(await HomeService.getFeaturedEvents());
      setUpcomingEvents(await HomeService.getUpcomingEvents());
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [isSignedIn]);

  const onRefresh = () => {
    setRefreshing(true);
    void loadData();
  };

  const handleQuickAccessPress = (item: QuickAccessItem) => {
    router.push(item.route as any);
  };

  const handleRegisterPress = (_event: FeaturedEvent) => {
    router.push('/(member)/events');
  };

  const handleUpcomingEventPress = (_event: UpcomingEvent) => {
    router.push('/(member)/events');
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
});
