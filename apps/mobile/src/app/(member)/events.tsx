import React, { useEffect, useState, useMemo, useCallback } from 'react';
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
} from 'react-native';
import { useAuth } from '@clerk/expo';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ApiService } from '../../services/api';
import { EventCacheManager } from '../../services/eventCacheManager';
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
  const [allEvents, setAllEvents] = useState<EventItemData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [cooldownMessage, setCooldownMessage] = useState<string | null>(null);
  const [registeringEventId, setRegisteringEventId] = useState<string | null>(null);

  // Android Hardware Back Navigation Handler
  useEffect(() => {
    const onBackPress = () => {
      if (isSearching) {
        setIsSearching(false);
        setSearchQuery('');
        setDebouncedQuery('');
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

  // Debounce search query (300ms) to avoid unnecessary operations
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Initial Load & Cache Retrieval
  const loadEventsData = useCallback(async (isForceRefresh = false) => {
    // 1. Check local cache first if not forcing refresh
    if (!isForceRefresh) {
      const cached = EventCacheManager.getCachedEvents();
      if (cached && cached.length > 0) {
        setAllEvents(cached);
        setLoading(false);
        setRefreshing(false);
        return;
      }
    }

    // 2. Fetch all events from API server once
    if (isForceRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setHasError(false);
    setErrorMessage(null);
    setCooldownMessage(null);

    try {
      const token = (await getToken()) || undefined;
      // Fetch up to 50 events across all statuses at once for client-side caching & instant tab filtering
      const res = await ApiService.getEvents(token, undefined, undefined, 1, 50);

      if (res && Array.isArray(res.events)) {
        setAllEvents(res.events);
        EventCacheManager.setCachedEvents(res.events);
      } else {
        setAllEvents([]);
      }
    } catch (err: any) {
      console.error('Fetch events error:', err);
      setHasError(true);
      setErrorMessage(err.message || 'Could not load events from server');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [getToken]);

  useEffect(() => {
    void loadEventsData(false);
  }, [loadEventsData]);

  // Rate-Limited Manual Pull-to-Refresh
  const handleRefresh = () => {
    const { allowed, remainingSeconds } = EventCacheManager.canManualRefresh();
    if (!allowed) {
      setRefreshing(false);
      setCooldownMessage(`Already up to date. Please wait ${remainingSeconds}s before refreshing again.`);
      setTimeout(() => setCooldownMessage(null), 3000);
      return;
    }

    EventCacheManager.recordManualRefresh();
    void loadEventsData(true);
  };

  // Client-side filtering by active tab and search query (0 API requests)
  const filteredEvents = useMemo(() => {
    const now = new Date();

    return allEvents.filter((evt) => {
      const startDate = new Date(evt.startDate);
      const endDate = evt.endDate ? new Date(evt.endDate) : new Date(startDate.getTime() + 4 * 60 * 60 * 1000);

      // Status Filter
      let matchesTab = false;
      if (activeTab === 'UPCOMING') {
        matchesTab = startDate >= now && evt.status !== 'COMPLETED';
      } else if (activeTab === 'ONGOING') {
        matchesTab = startDate <= now && endDate >= now && evt.status !== 'COMPLETED';
      } else if (activeTab === 'COMPLETED') {
        matchesTab = endDate < now || evt.status === 'COMPLETED';
      }

      if (!matchesTab) return false;

      // Search Query Filter
      if (debouncedQuery.trim()) {
        const q = debouncedQuery.trim().toLowerCase();
        const titleMatch = evt.title?.toLowerCase().includes(q);
        const venueMatch = evt.venue?.toLowerCase().includes(q);
        const cityMatch = evt.city?.name?.toLowerCase().includes(q);
        return titleMatch || venueMatch || cityMatch;
      }

      return true;
    });
  }, [allEvents, activeTab, debouncedQuery]);

  // Optimistic Registration Toggle
  const handleRegisterToggle = async (event: EventItemData) => {
    if (!isSignedIn) {
      Alert.alert('Authentication Required', 'Please sign in to register for events.');
      return;
    }

    const newStatus = !event.isRegistered;
    setRegisteringEventId(event.id);

    // 1. Optimistically update local UI state
    setAllEvents((prev) =>
      prev.map((e) => (e.id === event.id ? { ...e, isRegistered: newStatus } : e))
    );

    // 2. Optimistically update Cache
    EventCacheManager.updateRegistrationInCache(event.id, newStatus);

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
      setAllEvents((prev) =>
        prev.map((e) => (e.id === event.id ? { ...e, isRegistered: !newStatus } : e))
      );
      EventCacheManager.updateRegistrationInCache(event.id, !newStatus);
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
            onPress={() => {
              if (isSearching) {
                setIsSearching(false);
                setSearchQuery('');
                setDebouncedQuery('');
              } else {
                setIsSearching(true);
              }
            }}
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
              placeholder="Search by title or venue..."
              placeholderTextColor="#A0AEC0"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => {
                  setSearchQuery('');
                  setDebouncedQuery('');
                }}
              >
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

        {/* Refresh Cooldown Notification Toast */}
        {cooldownMessage && (
          <View style={styles.cooldownBanner}>
            <Ionicons name="information-circle" size={18} color="#2B6CB0" style={{ marginRight: 6 }} />
            <Text style={styles.cooldownText}>{cooldownMessage}</Text>
          </View>
        )}

        {/* Error Banner with Retry Button */}
        {hasError && (
          <TouchableOpacity
            style={styles.errorBanner}
            onPress={() => loadEventsData(true)}
            activeOpacity={0.8}
          >
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

        {/* Loading Skeletons on initial fetch */}
        {loading ? (
          <View style={styles.skeletonList}>
            <EventCardSkeleton />
            <EventCardSkeleton />
            <EventCardSkeleton />
          </View>
        ) : (
          <FlatList
            data={filteredEvents}
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
            renderItem={({ item }) => (
              <EventCard
                event={item}
                activeTab={activeTab}
                onRegisterToggle={handleRegisterToggle}
                isRegistering={registeringEventId === item.id}
              />
            )}
            ListEmptyComponent={
              !hasError ? (
                <View style={styles.emptyStateBox}>
                  <Ionicons name="calendar-outline" size={48} color="#CBD5E0" />
                  <Text style={styles.emptyTitle}>
                    No {activeTab.toLowerCase()} events found
                  </Text>
                  <Text style={styles.emptySub}>
                    {debouncedQuery
                      ? `No events matching "${debouncedQuery}".`
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
  cooldownBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EBF8FF',
    borderWidth: 1,
    borderColor: '#BEE3F8',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
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
