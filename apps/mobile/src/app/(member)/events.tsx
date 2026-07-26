import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
} from 'react-native';
import { useAuth } from '@clerk/expo';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing } from '../../constants/theme';
import { ApiService } from '../../services/api';
import { EventCardSkeleton } from '../../components/ui/SkeletonLoader';

type TabStatus = 'UPCOMING' | 'ONGOING' | 'COMPLETED';

export default function EventsScreen() {
  const { getToken, isSignedIn } = useAuth();
  const [activeTab, setActiveTab] = useState<TabStatus>('UPCOMING');
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [registeringId, setRegisteringId] = useState<string | null>(null);

  const fetchEvents = useCallback(async () => {
    try {
      if (isSignedIn) {
        const token = await getToken();
        if (token) {
          const res = await ApiService.getEvents(token, activeTab);
          setEvents(res?.events || []);
        }
      }
    } catch (err: any) {
      console.error('Fetch events error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTab, getToken, isSignedIn]);

  useEffect(() => {
    setLoading(true);
    void fetchEvents();
  }, [fetchEvents]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchEvents();
  };

  const handleRegister = async (eventId: string, isRegistered: boolean) => {
    try {
      const token = await getToken();
      if (!token) return;

      setRegisteringId(eventId);
      if (isRegistered) {
        await ApiService.cancelEventRegistration(token, eventId);
        Alert.alert('RSVP Updated', 'Your event registration has been cancelled.');
      } else {
        await ApiService.registerForEvent(token, eventId);
        Alert.alert('Success 🎉', 'You have registered for this event!');
      }
      await fetchEvents();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update registration.');
    } finally {
      setRegisteringId(null);
    }
  };

  return (
    <View style={styles.container}>
      {/* Category Tabs Header — Matching Wireframe 07 */}
      <View style={styles.tabContainer}>
        {(['UPCOMING', 'ONGOING', 'COMPLETED'] as TabStatus[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tabButton, activeTab === tab && styles.tabButtonActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab.charAt(0) + tab.slice(1).toLowerCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Events List */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary[500]]} />}
      >
        {loading ? (
          <>
            <EventCardSkeleton />
            <EventCardSkeleton />
            <EventCardSkeleton />
          </>
        ) : events.length > 0 ? (
          events.map((evt) => {
            const dateObj = new Date(evt.startDate);
            const day = dateObj.getDate().toString().padStart(2, '0');
            const month = dateObj.toLocaleString('default', { month: 'short' }).toUpperCase();
            const fullDateStr = dateObj.toLocaleDateString('en-IN', {
              day: '2-digit',
              month: 'long',
              year: 'numeric',
            });

            return (
              <View key={evt.id} style={styles.eventCard}>
                <View style={styles.cardHeader}>
                  {/* Date Badge */}
                  <View style={styles.dateBadge}>
                    <Text style={styles.dateDay}>{day}</Text>
                    <Text style={styles.dateMonth}>{month}</Text>
                  </View>

                  <View style={styles.eventInfo}>
                    <Text style={styles.eventTitle}>{evt.title}</Text>
                    <Text style={styles.eventDate}>
                      {fullDateStr} {evt.startTime ? `| ${evt.startTime}` : ''}
                    </Text>
                    <Text style={styles.eventVenue}>
                      📍 {evt.venue || 'Shree Maheshwari Bhawan'}
                    </Text>
                  </View>
                </View>

                {/* RSVP Button */}
                {activeTab === 'UPCOMING' && (
                  <TouchableOpacity
                    style={[
                      styles.registerBtn,
                      evt.isRegistered && styles.registeredBtn,
                      registeringId === evt.id && styles.btnDisabled,
                    ]}
                    onPress={() => handleRegister(evt.id, Boolean(evt.isRegistered))}
                    disabled={registeringId === evt.id}
                  >
                    <Text style={[styles.registerBtnText, evt.isRegistered && styles.registeredBtnText]}>
                      {evt.isRegistered ? 'Registered ✓' : 'Register Now'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="calendar-outline" size={48} color={Colors.neutral[400]} />
            <Text style={styles.emptyTitle}>No {activeTab.toLowerCase()} events</Text>
            <Text style={styles.emptySub}>Check back later for upcoming community events</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.neutral[0],
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
    marginHorizontal: 4,
  },
  tabButtonActive: {
    backgroundColor: Colors.primary[500],
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text.secondary,
  },
  tabTextActive: {
    color: Colors.neutral[0],
    fontWeight: '700',
  },
  scrollContent: {
    padding: Spacing.md,
  },
  eventCard: {
    backgroundColor: Colors.neutral[0],
    borderRadius: Spacing.radiusMd,
    padding: Spacing.md,
    marginBottom: 14,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#EDF2F7',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  dateBadge: {
    width: 54,
    height: 54,
    borderRadius: 12,
    backgroundColor: '#FFF5F5',
    borderWidth: 1,
    borderColor: '#FEB2B2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateDay: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.primary[500],
  },
  dateMonth: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primary[500],
  },
  eventInfo: {
    flex: 1,
    marginLeft: 14,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  eventDate: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginTop: 4,
  },
  eventVenue: {
    fontSize: 12,
    color: Colors.text.tertiary,
    marginTop: 2,
  },
  registerBtn: {
    backgroundColor: Colors.primary[500],
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 12,
  },
  registeredBtn: {
    backgroundColor: '#E6FFFA',
    borderWidth: 1,
    borderColor: '#319795',
  },
  btnDisabled: {
    opacity: 0.6,
  },
  registerBtnText: {
    color: Colors.neutral[0],
    fontWeight: '700',
    fontSize: 13,
  },
  registeredBtnText: {
    color: '#319795',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text.primary,
    marginTop: 12,
  },
  emptySub: {
    fontSize: 13,
    color: Colors.text.tertiary,
    marginTop: 4,
  },
});
