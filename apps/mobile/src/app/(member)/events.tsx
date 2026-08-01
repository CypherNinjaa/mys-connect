import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  StatusBar,
  Platform,
  BackHandler,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@clerk/expo';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useCustomAlert } from '../../context/CustomAlertContext';
import { ApiService, EventRegistration } from '../../services/api';
import { EventCacheManager } from '../../services/eventCacheManager';
import { useCacheChannel } from '../../hooks/useCacheChannel';
import { EventCard, EventItemData } from '../../components/events/EventCard';
import { TicketCard } from '../../components/events/TicketCard';
import { EventCardSkeleton } from '../../components/ui/SkeletonLoader';
import { saveQrToDevice } from '../../utils/qrDownload';

/** The three tabs that filter the cached event list. */
type EventTabStatus = 'UPCOMING' | 'ONGOING' | 'COMPLETED';

/** `MY_TICKETS` reads from its own endpoint rather than the event cache. */
type TabStatus = EventTabStatus | 'MY_TICKETS';

const TABS: { label: string; status: TabStatus }[] = [
  { label: 'Upcoming', status: 'UPCOMING' },
  { label: 'Ongoing', status: 'ONGOING' },
  { label: 'Completed', status: 'COMPLETED' },
  { label: 'My Tickets', status: 'MY_TICKETS' },
];

/**
 * How long a fetched ticket list is trusted before the tab refetches.
 *
 * Kept short because the scan count on a ticket changes at the gate, and long
 * enough that flicking between tabs does not fire a request per tap.
 */
const TICKETS_TTL_MS = 60_000;

const EMPTY_COPY: Record<TabStatus, { title: string; sub: string; icon: 'calendar-outline' | 'ticket-outline' }> = {
  UPCOMING: {
    title: 'No upcoming events',
    sub: 'There are currently no upcoming community events.',
    icon: 'calendar-outline',
  },
  ONGOING: {
    title: 'Nothing happening right now',
    sub: 'No community event is currently in progress.',
    icon: 'calendar-outline',
  },
  COMPLETED: {
    title: 'No past events',
    sub: 'Completed community events will be listed here.',
    icon: 'calendar-outline',
  },
  MY_TICKETS: {
    title: 'No tickets yet',
    sub: 'Register for an event and your QR code and registration code will appear here.',
    icon: 'ticket-outline',
  },
};

export default function EventsScreen() {
  const { getToken, isSignedIn } = useAuth();
  const { showAlert } = useCustomAlert();
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

  // My Tickets — fetched separately from the event cache, since a ticket carries
  // a rendered QR image and a code that must never be served from a stale copy.
  const [tickets, setTickets] = useState<EventRegistration[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [ticketsError, setTicketsError] = useState<string | null>(null);
  /** Epoch ms of the last successful ticket fetch; null means never loaded. */
  const [ticketsFetchedAt, setTicketsFetchedAt] = useState<number | null>(null);

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
    // Awaited inside the effect rather than called from its body, so the loader's
    // setState calls land after the first paint instead of cascading.
    async function run() {
      await loadEventsData(false);
    }
    void run();
  }, [loadEventsData]);

  // Realtime: a socket event has patched the cache, so re-read it. No API call —
  // the patch already carries the server's new values.
  useCacheChannel('events', () => {
    const cached = EventCacheManager.getCachedEvents();
    if (cached) setAllEvents(cached);
  });

  // My Tickets loader — deliberately not cached to disk. A ticket's scan count
  // changes at the gate, so the number of entries left has to come from the
  // server every time the member opens the tab.
  const loadTickets = useCallback(async () => {
    if (!isSignedIn) {
      setTickets([]);
      setTicketsFetchedAt(Date.now());
      setTicketsError('Sign in to see your event tickets.');
      return;
    }

    setTicketsLoading(true);
    setTicketsError(null);

    try {
      const token = await getToken();
      if (!token) throw new Error('Authentication token unavailable');

      const list = await ApiService.getMyRegistrations(token);
      setTickets(list);
      setTicketsFetchedAt(Date.now());
    } catch (err) {
      console.error('Fetch tickets error:', err);
      setTicketsError(err instanceof Error ? err.message : 'Could not load your tickets');
    } finally {
      setTicketsLoading(false);
      setRefreshing(false);
    }
  }, [getToken, isSignedIn]);

  useEffect(() => {
    if (activeTab !== 'MY_TICKETS') return;

    // A short window rather than a load-once flag: registering from the event
    // detail screen also changes this list, and that screen has no way to tell
    // this one. Re-opening the tab a minute later picks the change up.
    const isFresh = ticketsFetchedAt !== null && Date.now() - ticketsFetchedAt < TICKETS_TTL_MS;
    if (isFresh) return;

    // Same shape as the events loader above — declared inside the effect so the
    // setState calls are not reached from an outer callback.
    async function run() {
      await loadTickets();
    }
    void run();
  }, [activeTab, ticketsFetchedAt, loadTickets]);

  // Rate-Limited Manual Pull-to-Refresh
  const handleRefresh = () => {
    // Tickets bypass the event-cache cooldown: the scan count is the point of
    // pulling to refresh, and it is a single lightweight request.
    if (activeTab === 'MY_TICKETS') {
      setRefreshing(true);
      void loadTickets();
      return;
    }

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
    if (activeTab === 'MY_TICKETS') return [];

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

  // The header search box stays live on the tickets tab, matching by event.
  const filteredTickets = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    if (!q) return tickets;

    return tickets.filter((reg) => {
      const titleMatch = reg.event.title?.toLowerCase().includes(q);
      const venueMatch = reg.event.venue?.toLowerCase().includes(q);
      const cityMatch = reg.event.city?.name?.toLowerCase().includes(q);
      const codeMatch = reg.registrationCode?.toLowerCase().includes(q);
      return titleMatch || venueMatch || cityMatch || codeMatch;
    });
  }, [tickets, debouncedQuery]);

  const handleDownloadQr = useCallback(
    async (registration: EventRegistration) => {
      try {
        await saveQrToDevice(registration.qrDataUrl, registration.registrationCode);
      } catch (err) {
        showAlert({
          title: 'Download Failed',
          message: err instanceof Error ? err.message : 'Could not save the QR code.',
          type: 'error',
        });
      }
    },
    [showAlert]
  );

  // Optimistic Registration Toggle
  const handleRegisterToggle = async (event: EventItemData) => {
    if (!isSignedIn) {
      showAlert({ title: 'Authentication Required', message: 'Please sign in to register for events.', type: 'warning' });
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
        showAlert({ title: 'Registered 🎉', message: `You have registered for ${event.title}`, type: 'success' });
      } else {
        await ApiService.cancelEventRegistration(token, event.id);
        showAlert({ title: 'Registration Cancelled', message: `You unregistered from ${event.title}`, type: 'info' });
      }

      // The ticket list just changed — drop the freshness stamp so the next
      // visit to My Tickets refetches. A member who never opens that tab pays
      // nothing for this.
      setTicketsFetchedAt(null);
    } catch (err: any) {
      console.error('Registration toggle error:', err);
      // Revert Optimistic Update on failure
      setAllEvents((prev) =>
        prev.map((e) => (e.id === event.id ? { ...e, isRegistered: !newStatus } : e))
      );
      EventCacheManager.updateRegistrationInCache(event.id, !newStatus);
      showAlert({ title: 'Registration Error', message: err.message || 'Action failed. Please try again.', type: 'error' });
    } finally {
      setRegisteringEventId(null);
    }
  };

  const statusBarHeight = Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 12;

  const isTicketsTab = activeTab === 'MY_TICKETS';
  const emptyCopy = EMPTY_COPY[activeTab];

  // EventCard only knows the three event states; on the tickets tab its list is
  // empty anyway, so COMPLETED is a harmless stand-in that keeps the prop typed.
  const eventTabStatus: EventTabStatus = isTicketsTab ? 'COMPLETED' : activeTab;

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(member)/home');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#6B1D2A" />

      {/* Maroon Header matching wireframe */}
      <View style={[styles.headerContainer, { paddingTop: statusBarHeight + 8 }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={handleBack}
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
              placeholder={isTicketsTab ? 'Search your tickets...' : 'Search by title or venue...'}
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
                <Text
                  style={[styles.tabLabel, isActive && styles.activeTabLabel]}
                  numberOfLines={1}
                >
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
        {!isTicketsTab && hasError && (
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

        {isTicketsTab && ticketsError && (
          <TouchableOpacity
            style={styles.errorBanner}
            onPress={() => loadTickets()}
            activeOpacity={0.8}
          >
            <Ionicons name="alert-circle-outline" size={20} color="#C53030" style={{ marginRight: 8 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.errorBannerTitle}>Unable to load your tickets</Text>
              <Text style={styles.errorBannerSub}>{ticketsError}</Text>
            </View>
            <Ionicons name="refresh" size={18} color="#C53030" />
          </TouchableOpacity>
        )}

        {/* My Tickets */}
        {isTicketsTab ? (
          ticketsLoading && ticketsFetchedAt === null ? (
            <View style={styles.skeletonList}>
              <EventCardSkeleton />
              <EventCardSkeleton />
            </View>
          ) : (
            <FlatList
              data={filteredTickets}
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
                <TicketCard
                  registration={item}
                  onPress={() =>
                    router.push(`/(member)/event-detail?id=${item.eventId}&from=events`)
                  }
                  onDownload={handleDownloadQr}
                />
              )}
              ListEmptyComponent={
                !ticketsError ? (
                  <View style={styles.emptyStateBox}>
                    <Ionicons name={emptyCopy.icon} size={48} color="#CBD5E0" />
                    <Text style={styles.emptyTitle}>
                      {debouncedQuery ? 'No matching tickets' : emptyCopy.title}
                    </Text>
                    <Text style={styles.emptySub}>
                      {debouncedQuery
                        ? `No ticket matches "${debouncedQuery}".`
                        : emptyCopy.sub}
                    </Text>
                  </View>
                ) : null
              }
            />
          )
        ) : loading ? (
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
                activeTab={eventTabStatus}
                onPress={() => router.push(`/(member)/event-detail?id=${item.id}&from=events`)}
                onRegisterToggle={handleRegisterToggle}
                isRegistering={registeringEventId === item.id}
              />
            )}
            ListEmptyComponent={
              !hasError ? (
                <View style={styles.emptyStateBox}>
                  <Ionicons name={emptyCopy.icon} size={48} color="#CBD5E0" />
                  <Text style={styles.emptyTitle}>
                    {debouncedQuery ? 'No matching events' : emptyCopy.title}
                  </Text>
                  <Text style={styles.emptySub}>
                    {debouncedQuery
                      ? `No events matching "${debouncedQuery}".`
                      : emptyCopy.sub}
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
    paddingHorizontal: 2,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  tabLabel: {
    // 12.5 rather than 14: four segments share the row now, and "Completed"
    // must not wrap on a narrow handset.
    fontSize: 12.5,
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
