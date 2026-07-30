import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  StatusBar,
  BackHandler,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing } from '../../constants/theme';
import { ApiService } from '../../services/api';

export default function GuestEventsScreen() {
  const router = useRouter();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');

  useEffect(() => {
    const onBackPress = () => {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/(guest)/home');
      }
      return true;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [router]);

  const fetchEvents = async () => {
    try {
      const res = await ApiService.getEvents(undefined, 'PUBLISHED', '', 1, 50);
      setEvents(res?.events || res || []);
    } catch (err) {
      console.error('Guest events error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    // Awaited inside the effect rather than called from its body, so the loader's
    // setState calls land after the first paint instead of cascading.
    async function run() {
      await fetchEvents();
    }
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const now = new Date();
  const upcoming = events.filter((e) => new Date(e.startDate) >= now);
  const past = events.filter((e) => new Date(e.startDate) < now);
  const displayed = tab === 'upcoming' ? upcoming : past;

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary[500]} />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Events</Text>
      </View>

      <View style={styles.tabRow}>
        {(['upcoming', 'past'] as const).map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.tab, tab === t && styles.tabActive]}
            onPress={() => setTab(t)}
          >
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === 'upcoming' ? 'Upcoming' : 'Past'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchEvents(); }} colors={[Colors.primary[500]]} />}
      >
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <View key={i} style={[styles.eventCard, { height: 100 }]}>
              <View style={{ height: 20, backgroundColor: '#EDF2F7', borderRadius: 6, marginBottom: 8 }} />
              <View style={{ height: 14, backgroundColor: '#EDF2F7', borderRadius: 4, width: '60%' }} />
            </View>
          ))
        ) : displayed.length > 0 ? (
          displayed.map((event) => (
            <View key={event.id} style={styles.eventCard}>
              <View style={styles.eventDateBadge}>
                <Text style={styles.eventDateDay}>{new Date(event.startDate).getDate()}</Text>
                <Text style={styles.eventDateMonth}>
                  {new Date(event.startDate).toLocaleDateString('en-IN', { month: 'short' })}
                </Text>
              </View>
              <View style={styles.eventInfo}>
                <Text style={styles.eventTitle} numberOfLines={2}>{event.title}</Text>
                {event.venue && (
                  <View style={styles.eventMeta}>
                    <Ionicons name="location-outline" size={13} color={Colors.text.tertiary} />
                    <Text style={styles.eventMetaText}>{event.venue}</Text>
                  </View>
                )}
                <View style={styles.eventMeta}>
                  <Ionicons name="time-outline" size={13} color={Colors.text.tertiary} />
                  <Text style={styles.eventMetaText}>{formatDate(event.startDate)}</Text>
                </View>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="calendar-outline" size={48} color={Colors.neutral[400]} />
            <Text style={styles.emptyTitle}>No {tab} events</Text>
          </View>
        )}

        <View style={styles.loginCta}>
          <Text style={styles.loginCtaText}>Sign in to register for events</Text>
          <TouchableOpacity
            style={styles.loginCtaBtn}
            onPress={() => router.replace('/(auth)/sign-in')}
          >
            <Text style={styles.loginCtaBtnText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  header: {
    backgroundColor: Colors.primary[500],
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: Colors.neutral[0] },
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    paddingTop: 12,
    gap: 8,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.neutral[0],
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tabActive: {
    backgroundColor: Colors.primary[500],
    borderColor: Colors.primary[500],
  },
  tabText: { fontSize: 13, fontWeight: '600', color: Colors.text.secondary },
  tabTextActive: { color: Colors.neutral[0], fontWeight: '700' },
  scrollContent: { padding: Spacing.md, paddingBottom: 40 },
  eventCard: {
    flexDirection: 'row',
    backgroundColor: Colors.neutral[0],
    borderRadius: Spacing.radiusMd,
    padding: Spacing.md,
    marginBottom: 10,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#EDF2F7',
  },
  eventDateBadge: {
    width: 48,
    height: 52,
    borderRadius: 10,
    backgroundColor: 'rgba(128, 0, 32, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  eventDateDay: { fontSize: 18, fontWeight: '800', color: Colors.primary[500] },
  eventDateMonth: { fontSize: 10, fontWeight: '600', color: Colors.primary[500], textTransform: 'uppercase' },
  eventInfo: { flex: 1 },
  eventTitle: { fontSize: 14, fontWeight: '700', color: Colors.text.primary },
  eventMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  eventMetaText: { fontSize: 12, color: Colors.text.tertiary },
  emptyContainer: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: Colors.text.primary, marginTop: 12 },
  loginCta: {
    backgroundColor: Colors.neutral[0],
    borderRadius: Spacing.radiusMd,
    padding: 20,
    alignItems: 'center',
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#EDF2F7',
  },
  loginCtaText: { fontSize: 13, color: Colors.text.secondary, marginBottom: 10 },
  loginCtaBtn: {
    backgroundColor: Colors.primary[500],
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  loginCtaBtnText: { color: Colors.neutral[0], fontSize: 13, fontWeight: '700' },
});
