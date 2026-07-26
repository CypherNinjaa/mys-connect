import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  SafeAreaView,
  StatusBar,
  Alert,
  Platform,
  BackHandler,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '@clerk/expo';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ApiService } from '../../services/api';
import { EventCard, EventItemData } from '../../components/events/EventCard';
import { EventCardSkeleton } from '../../components/ui/SkeletonLoader';

type TabStatus = 'UPCOMING' | 'ONGOING' | 'COMPLETED';

const TABS: { label: string; status: TabStatus }[] = [
  { label: 'Upcoming', status: 'UPCOMING' },
  { label: 'Ongoing', status: 'ONGOING' },
  { label: 'Completed', status: 'COMPLETED' },
];

export default function EventsScreen() {
  const { getToken, isSignedIn } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<TabStatus>('UPCOMING');
  const [events, setEvents] = useState<EventItemData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [registeringEventId, setRegisteringEventId] = useState<string | null>(null);

  // Android Hardware Back Navigation Handler
  useEffect(() => {
    const onBackPress = () => {
      if (isSearching) {
        setIsSearching(false);
        setSearchQuery('');
        return true;
      }
      if (router.canGoBack()) {
        router.back();
        return true;
      }
      return false;
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, [isSearching, router]);

  const fetchEventsData = useCallback(
    async (targetPage = 1, isRefresh = false, search = searchQuery) => {
      if (isRefresh) {
        setRefreshing(true);
      } else if (targetPage === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      setHasError(false);
      setErrorMessage(null);

      try {
        const token = (await getToken()) || undefined;
        const res = await ApiService.getEvents(token, activeTab, search, targetPage, 10);

        if (res && res.events) {
          if (targetPage === 1) {
            setEvents(res.events);
          } else {
            setEvents((prev) => [...prev, ...res.events]);
          }
          setPage(targetPage);
          setHasMore(Boolean(res.pagination?.hasMore));
        } else {
          if (targetPage === 1) setEvents([]);
          setHasMore(false);
        }
      } catch (err: any) {
        console.error('Fetch events error:', err);
        setHasError(true);
        setErrorMessage(err.message || 'Could not load events from server');
        if (targetPage === 1) setEvents([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [activeTab, searchQuery, getToken]
  );

  useEffect(() => {
    void fetchEventsData(1, false, searchQuery);
  }, [activeTab, searchQuery]);

  const handleRefresh = () => {
    void fetchEventsData(1, true, searchQuery);
  };

  const handleLoadMore = () => {
    if (!loading && !loadingMore && hasMore) {
      void fetchEventsData(page + 1, false, searchQuery);
    }
  };

  // Optimistic Registration Toggle
  const handleRegisterToggle = async (event: EventItemData) => {
    if (!isSignedIn) {
      Alert.alert('Authentication Required', 'Please sign in to register for events.');
      return;
    }

    const newStatus = !event.isRegistered;
    setRegisteringEventId(event.id);

    // Optimistic Update
    setEvents((prev) =>
      prev.map((e) => (e.id === event.id ? { ...e, isRegistered: newStatus } : e))
    );

    try {
      const token = await getToken();
      if (!token) throw new Error('Authentication token unavailable');

      if (newStatus) {
        await ApiService.registerForEvent(token, event.id);
        Alert.alert('Registered 🎉', `You have registered for ${event.title}`);
      } else {
        await ApiService.cancelEventRegistration(token, event.id);
        Alert.alert('Registration Cancelled', `You unregistered from ${event.title}`);
      }
    } catch (err: any) {
      console.error('Registration toggle error:', err);
      // Revert Optimistic Update on failure
      setEvents((prev) =>
        prev.map((e) => (e.id === event.id ? { ...e, isRegistered: !newStatus } : e))
      );
      Alert.alert('Registration Error', err.message || 'Action failed. Please try again.');
    } finally {
      setRegisteringEventId(null);
    }
  };

  const statusBarHeight = Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 12;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#6B1D2A" />

      {/* Maroon Header matching wireframe */}
      <View style={[styles.headerContainer, { paddingTop: statusBarHeight + 8 }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Events</Text>

          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => setIsSearching((prev) => !prev)}
            activeOpacity={0.7}
          >
            <Ionicons name={isSearching ? 'close' : 'search'} size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Collapsible Search Input */}
        {isSearching && (
          <View style={styles.searchBarWrapper}>
            <Ionicons name="search-outline" size={18} color="#718096" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by event title or venue..."
              placeholderTextColor="#A0AEC0"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={18} color="#A0AEC0" />
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {/* Main Body */}
      <View style={styles.body}>
        {/* Tab Selector Segment Bar — Matching Wireframe */}
        <View style={styles.tabBarContainer}>
          {TABS.map((tab) => {
            const isActive = activeTab === tab.status;
            return (
              <TouchableOpacity
                key={tab.status}
                style={styles.tabItem}
                onPress={() => {
                  if (activeTab !== tab.status) {
                    setActiveTab(tab.status);
                    setSearchQuery('');
                  }
                }}
                activeOpacity={0.8}
              >
                <Text style={[styles.tabLabel, isActive && styles.activeTabLabel]}>
                  {tab.label}
                </Text>
                {isActive && <View style={styles.activeUnderline} />}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Error Banner with Retry Button */}
        {hasError && (
          <TouchableOpacity style={styles.errorBanner} onPress={handleRefresh} activeOpacity={0.8}>
            <Ionicons name="alert-circle-outline" size={20} color="#C53030" style={{ marginRight: 8 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.errorBannerTitle}>Unable to load events</Text>
              <Text style={styles.errorBannerSub}>
                {errorMessage || 'Network error. Tap here to retry.'}
              </Text>
            </View>
            <Ionicons name="refresh" size={18} color="#C53030" />
          </TouchableOpacity>
        )}

        {/* Loading Skeletons */}
        {loading ? (
          <View style={styles.skeletonList}>
            <EventCardSkeleton />
            <EventCardSkeleton />
            <EventCardSkeleton />
          </View>
        ) : (
          <FlatList
            data={events}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                colors={['#6B1D2A']}
                tintColor="#6B1D2A"
              />
            }
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.4}
            renderItem={({ item }) => (
              <EventCard
                event={item}
                activeTab={activeTab}
                onRegisterToggle={handleRegisterToggle}
                isRegistering={registeringEventId === item.id}
                onPress={() => {
                  // Route to details if available
                }}
              />
            )}
            ListFooterComponent={
              loadingMore ? (
                <View style={styles.loadingMoreBox}>
                  <ActivityIndicator color="#6B1D2A" size="small" />
                  <Text style={styles.loadingMoreText}>Loading more events...</Text>
                </View>
              ) : null
            }
            ListEmptyComponent={
              !hasError ? (
                <View style={styles.emptyStateBox}>
                  <Ionicons name="calendar-outline" size={48} color="#CBD5E0" />
                  <Text style={styles.emptyTitle}>
                    No {activeTab.toLowerCase()} events found
                  </Text>
                  <Text style={styles.emptySub}>
                    {searchQuery
                      ? `No events matching "${searchQuery}".`
                      : `There are currently no ${activeTab.toLowerCase()} community events.`}
                  </Text>
                </View>
              ) : null
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#6B1D2A',
  },
  headerContainer: {
    backgroundColor: '#6B1D2A',
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 44,
  },
  headerBtn: {
    padding: 6,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  searchBarWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#1A202C',
  },
  body: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  tabBarContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 4,
    marginBottom: 16,

    // Soft border & shadow matching wireframe
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#718096',
  },
  activeTabLabel: {
    color: '#6B1D2A',
    fontWeight: '800',
  },
  activeUnderline: {
    position: 'absolute',
    bottom: 2,
    width: '40%',
    height: 3,
    backgroundColor: '#6B1D2A',
    borderRadius: 2,
  },
  skeletonList: {
    marginTop: 8,
    gap: 12,
  },
  listContent: {
    paddingBottom: 40,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF5F5',
    borderWidth: 1,
    borderColor: '#FEB2B2',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
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
  loadingMoreBox: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  loadingMoreText: {
    fontSize: 13,
    color: '#718096',
    fontWeight: '600',
  },
  emptyStateBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    borderWidth: 1,
    borderColor: '#F0F4F8',
    elevation: 2,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#2D3748',
    marginTop: 12,
  },
  emptySub: {
    fontSize: 13,
    color: '#718096',
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 18,
  },
});
