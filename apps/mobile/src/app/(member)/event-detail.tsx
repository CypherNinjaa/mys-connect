import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Linking,
  Alert,
  Share,
  BackHandler,
  StatusBar,
} from 'react-native';
import { useCustomAlert } from '../../context/CustomAlertContext';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@clerk/expo';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing } from '../../constants/theme';
import { ApiService } from '../../services/api';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getToken } = useAuth();
  const { showAlert } = useCustomAlert();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(member)/events');
    }
  };

  useEffect(() => {
    const onBackPress = () => {
      handleBack();
      return true;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [router]);

  useEffect(() => {
    async function fetchEvent() {
      try {
        const token = (await getToken()) || undefined;
        const data = await ApiService.getEventById(token, id);
        setEvent(data);
        setIsRegistered(data?.isRegistered || false);
      } catch (err) {
        console.error('Fetch event error:', err);
      } finally {
        setLoading(false);
      }
    }
    if (id) void fetchEvent();
  }, [id]);

  const handleRegister = async () => {
    try {
      setRegistering(true);
      const token = await getToken();
      if (!token) {
        showAlert({ title: 'Sign In Required', message: 'Please sign in to register for events.', type: 'warning' });
        return;
      }
      if (isRegistered) {
        showAlert({
          title: 'Cancel Registration',
          message: 'Are you sure you want to cancel your registration?',
          type: 'confirm',
          buttons: [
            { text: 'No', style: 'cancel' },
            {
              text: 'Yes, Cancel',
              style: 'destructive',
              onPress: async () => {
                try {
                  await ApiService.cancelEventRegistration(token, id);
                  setIsRegistered(false);
                  showAlert({ title: 'Cancelled', message: 'Your registration has been cancelled.', type: 'info' });
                } catch (err: any) {
                  showAlert({ title: 'Error', message: err.message || 'Failed to cancel registration.', type: 'error' });
                }
              },
            },
          ],
        });
      } else {
        await ApiService.registerForEvent(token, id);
        setIsRegistered(true);
        showAlert({ title: 'Registered! 🎉', message: 'You have been registered for this event.', type: 'success' });
      }
    } catch (err: any) {
      showAlert({ title: 'Error', message: err.message || 'Failed to register.', type: 'error' });
    } finally {
      setRegistering(false);
    }
  };

  const handleShare = async () => {
    if (!event) return;
    try {
      await Share.share({
        message: `Check out "${event.title}" on MYS CONNECT!\n\nDate: ${formatDate(event.startDate)}\nVenue: ${event.venue || 'TBD'}`,
        title: event.title,
      });
    } catch {
      // User cancelled share
    }
  };

  const openMap = () => {
    if (!event?.venue) return;
    const query = encodeURIComponent(event.venue);
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${query}`);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary[500]} />
      </View>
    );
  }

  if (!event) {
    return (
      <View style={styles.loadingContainer}>
        <Ionicons name="calendar-outline" size={48} color={Colors.neutral[400]} />
        <Text style={styles.emptyText}>Event not found</Text>
      </View>
    );
  }

  const isPast = new Date(event.endDate || event.startDate) < new Date();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={[styles.headerBar, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.neutral[0]} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>Event Details</Text>
        <TouchableOpacity onPress={handleShare} style={styles.backBtn}>
          <Ionicons name="share-outline" size={22} color={Colors.neutral[0]} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Date Badge */}
        <View style={styles.dateBanner}>
          <View style={styles.dateBadge}>
            <Text style={styles.dateDay}>{new Date(event.startDate).getDate()}</Text>
            <Text style={styles.dateMonth}>
              {new Date(event.startDate).toLocaleDateString('en-IN', { month: 'short' })}
            </Text>
          </View>
          <View style={styles.dateTitleSection}>
            <Text style={styles.eventTitle}>{event.title}</Text>
            <View style={[styles.statusPill, isPast ? styles.pastPill : styles.upcomingPill]}>
              <Text style={[styles.statusText, isPast ? styles.pastText : styles.upcomingText]}>
                {isPast ? 'Completed' : event.status === 'PUBLISHED' ? 'Upcoming' : event.status}
              </Text>
            </View>
          </View>
        </View>

        {/* Info Rows */}
        <View style={styles.infoCard}>
          <InfoRow icon="calendar-outline" label="Date" value={formatDate(event.startDate)} />
          {event.endDate && (
            <InfoRow icon="calendar-outline" label="End Date" value={formatDate(event.endDate)} />
          )}
          {event.venue && (
            <InfoRow
              icon="location-outline"
              label="Venue"
              value={event.venue}
              onPress={openMap}
              actionIcon="navigate-outline"
            />
          )}
          {event.organizer && (
            <InfoRow icon="person-outline" label="Organizer" value={event.organizer} />
          )}
          {event._count?.registrations !== undefined && (
            <InfoRow
              icon="people-outline"
              label="Registrations"
              value={`${event._count.registrations} registered`}
            />
          )}
        </View>

        {/* Description */}
        {event.description && (
          <View style={styles.descriptionCard}>
            <Text style={styles.sectionLabel}>About this Event</Text>
            <Text style={styles.descriptionText}>{event.description}</Text>
          </View>
        )}

        {/* Register Button */}
        {!isPast && (
          <TouchableOpacity
            style={[styles.registerBtn, isRegistered && styles.cancelBtn]}
            onPress={handleRegister}
            disabled={registering}
            activeOpacity={0.85}
          >
            {registering ? (
              <ActivityIndicator color={Colors.neutral[0]} />
            ) : (
              <>
                <Ionicons
                  name={isRegistered ? 'close-circle-outline' : 'checkmark-circle-outline'}
                  size={20}
                  color={Colors.neutral[0]}
                  style={{ marginRight: 8 }}
                />
                <Text style={styles.registerBtnText}>
                  {isRegistered ? 'Cancel Registration' : 'Register Now'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function InfoRow({
  icon,
  label,
  value,
  onPress,
  actionIcon,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  onPress?: () => void;
  actionIcon?: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <TouchableOpacity
      style={styles.infoRow}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={styles.infoIcon}>
        <Ionicons name={icon} size={18} color={Colors.primary[500]} />
      </View>
      <View style={styles.infoContent}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
      {actionIcon && <Ionicons name={actionIcon} size={18} color={Colors.primary[500]} />}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8F9FA' },
  emptyText: { fontSize: 14, color: Colors.text.tertiary, marginTop: 12 },
  headerBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.primary[500], paddingHorizontal: Spacing.md, paddingTop: 10, paddingBottom: 14,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: Colors.neutral[0], flex: 1, textAlign: 'center' },
  content: { paddingBottom: 40 },
  dateBanner: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.neutral[0], padding: Spacing.md, borderBottomWidth: 1, borderBottomColor: '#EDF2F7',
  },
  dateBadge: {
    width: 56, height: 60, borderRadius: 12, backgroundColor: 'rgba(128,0,32,0.08)',
    justifyContent: 'center', alignItems: 'center', marginRight: 14,
  },
  dateDay: { fontSize: 22, fontWeight: '800', color: Colors.primary[500] },
  dateMonth: { fontSize: 11, fontWeight: '600', color: Colors.primary[500], textTransform: 'uppercase' },
  dateTitleSection: { flex: 1 },
  eventTitle: { fontSize: 18, fontWeight: '800', color: Colors.text.primary },
  statusPill: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12, marginTop: 6 },
  upcomingPill: { backgroundColor: Colors.success.light },
  pastPill: { backgroundColor: Colors.neutral[100] },
  statusText: { fontSize: 11, fontWeight: '700' },
  upcomingText: { color: Colors.success.dark },
  pastText: { color: Colors.text.tertiary },
  infoCard: { backgroundColor: Colors.neutral[0], marginTop: 10 },
  infoRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.md, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#EDF2F7',
  },
  infoIcon: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(128,0,32,0.08)',
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  infoContent: { flex: 1 },
  infoLabel: { fontSize: 11, color: Colors.text.tertiary, fontWeight: '600' },
  infoValue: { fontSize: 14, color: Colors.text.primary, marginTop: 2 },
  descriptionCard: {
    backgroundColor: Colors.neutral[0], padding: Spacing.md, marginTop: 10,
  },
  sectionLabel: { fontSize: 14, fontWeight: '700', color: Colors.text.primary, marginBottom: 8 },
  descriptionText: { fontSize: 14, color: Colors.text.secondary, lineHeight: 22 },
  registerBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.primary[500], marginHorizontal: Spacing.md, marginTop: 20,
    paddingVertical: 14, borderRadius: 12, elevation: 3,
    shadowColor: Colors.primary[500], shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 5,
  },
  cancelBtn: { backgroundColor: Colors.error.main },
  registerBtnText: { color: Colors.neutral[0], fontSize: 15, fontWeight: '700' },
});
