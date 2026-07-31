import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Linking,
  Share,
  BackHandler,
  StatusBar,
  Image,
  Modal,
} from 'react-native';
import { useCustomAlert } from '../../context/CustomAlertContext';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@clerk/expo';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing } from '../../constants/theme';
import { ApiService, EventRegistration } from '../../services/api';
import { RegistrationCode } from '../../components/ui/RegistrationCode';
import { saveQrToDevice } from '../../utils/qrDownload';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function EventDetailScreen() {
  const { id, from } = useLocalSearchParams<{ id: string; from?: string }>();
  const { getToken } = useAuth();
  const { showAlert } = useCustomAlert();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  /** The real ticket for this event, fetched after a successful registration. */
  const [ticket, setTicket] = useState<EventRegistration | null>(null);
  const [ticketLoading, setTicketLoading] = useState(false);
  const [savingQr, setSavingQr] = useState(false);

  // Fix Back Navigation to cleanly return to calling screen / events tab
  const handleBack = () => {
    if (from === 'home') {
      router.replace('/(member)/home');
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
  }, [from, router]);

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

  /**
   * Pull this event's ticket out of the member's registration list.
   *
   * The QR image and the registration code are only served by
   * `/events/my-registrations`, so they are fetched once the member actually
   * holds a ticket rather than on every visit to this screen.
   */
  const loadTicket = async (authToken: string) => {
    setTicketLoading(true);
    try {
      const list = await ApiService.getMyRegistrations(authToken);
      setTicket(list.find((reg) => reg.eventId === id) ?? null);
    } catch (err) {
      console.error('Fetch ticket error:', err);
      setTicket(null);
    } finally {
      setTicketLoading(false);
    }
  };

  const handleViewTicket = async () => {
    setShowQRModal(true);
    if (ticket) return;

    const token = await getToken();
    if (token) await loadTicket(token);
  };

  const handleSaveQr = async () => {
    if (savingQr) return;
    setSavingQr(true);
    try {
      await saveQrToDevice(ticket?.qrDataUrl, ticket?.registrationCode);
    } catch (err) {
      showAlert({
        title: 'Download Failed',
        message: err instanceof Error ? err.message : 'Could not save the QR code.',
        type: 'error',
      });
    } finally {
      setSavingQr(false);
    }
  };

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
          message: 'Are you sure you want to cancel your registration for this event?',
          type: 'confirm',
          buttons: [
            { text: 'Keep Registration', style: 'cancel' },
            {
              text: 'Yes, Unregister',
              style: 'destructive',
              onPress: async () => {
                try {
                  await ApiService.cancelEventRegistration(token, id);
                  setIsRegistered(false);
                  setTicket(null);
                  showAlert({ title: 'Registration Cancelled', message: 'Your registration has been cancelled.', type: 'info' });
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
        setShowQRModal(true);
        await loadTicket(token);
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
        message: `Join me at "${event.title}" hosted by Maheshwari Yuva Sangathan!\n\nDate: ${formatDate(event.startDate)}\nVenue: ${event.venue || 'TBD'}`,
        title: event.title,
      });
    } catch {
      // Share dismissed
    }
  };

  const openGoogleMaps = () => {
    if (!event?.venue && !event?.address) return;
    const query = encodeURIComponent(`${event.venue || ''} ${event.address || ''}`);
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${query}`);
  };

  const callOrganizer = () => {
    const phone = event?.contactPhone || '+919835100000';
    Linking.openURL(`tel:${phone}`);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6B1D2A" />
        <Text style={styles.loadingText}>Loading event details...</Text>
      </View>
    );
  }

  if (!event) {
    return (
      <View style={styles.loadingContainer}>
        <Ionicons name="calendar-outline" size={56} color="#CBD5E0" />
        <Text style={styles.emptyText}>Event not found</Text>
        <TouchableOpacity style={styles.backHomeBtn} onPress={handleBack}>
          <Text style={styles.backHomeText}>Return to Events</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const startDateObj = new Date(event.startDate);
  const dayNum = startDateObj.getDate();
  const monthName = startDateObj.toLocaleString('en-IN', { month: 'short' }).toUpperCase();
  const isPast = new Date(event.endDate || event.startDate) < new Date();
  const maxCap = event.maxAttendees || event.maxCapacity || 0;
  const regCount = event._count?.rsvps || event._count?.registrations || 0;
  const fillPct = maxCap > 0 ? Math.min(100, Math.round((regCount / maxCap) * 100)) : 0;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Floating Top Navigation Header Bar */}
      <View style={[styles.headerBar, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={handleBack} style={styles.iconCircleBtn} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>Event Details</Text>
        <View style={styles.rightHeaderActions}>
          <TouchableOpacity onPress={() => setIsBookmarked(!isBookmarked)} style={styles.iconCircleBtn} activeOpacity={0.8}>
            <Ionicons name={isBookmarked ? 'bookmark' : 'bookmark-outline'} size={20} color={isBookmarked ? '#D69E2E' : '#FFFFFF'} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleShare} style={styles.iconCircleBtn} activeOpacity={0.8}>
            <Ionicons name="share-social-outline" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Full-width Hero Cover Banner Image */}
        <View style={styles.heroBannerContainer}>
          {event.coverImageUrl ? (
            <Image source={{ uri: event.coverImageUrl }} style={styles.heroImage} resizeMode="cover" />
          ) : (
            <View style={styles.heroPlaceholder}>
              <Ionicons name="business" size={48} color="rgba(255,255,255,0.4)" />
              <Text style={styles.heroPlaceholderText}>{event.title}</Text>
            </View>
          )}
          <View style={styles.heroGradientOverlay} />

          {/* Chapter & Category Overlay Badges */}
          <View style={styles.heroBadgesRow}>
            <View style={styles.heroBadgeMaroon}>
              <Text style={styles.heroBadgeText}>{event.chapter || 'Ranchi'} Chapter</Text>
            </View>
            <View style={styles.heroBadgeGold}>
              <Text style={styles.heroBadgeGoldText}>{event.category || 'General'}</Text>
            </View>
          </View>
        </View>

        {/* Event Main Title Card */}
        <View style={styles.mainTitleCard}>
          <View style={styles.dateBadgeBox}>
            <Text style={styles.dateDayText}>{dayNum}</Text>
            <Text style={styles.dateMonthText}>{monthName}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.mainTitleText}>{event.title}</Text>
            <View style={styles.statusRow}>
              <View style={[styles.statusPill, isPast ? styles.pastPill : styles.upcomingPill]}>
                <Text style={[styles.statusPillText, isPast ? styles.pastPillText : styles.upcomingPillText]}>
                  {isPast ? 'COMPLETED' : event.status === 'PUBLISHED' ? 'UPCOMING' : event.status}
                </Text>
              </View>
              {isRegistered && (
                <View style={styles.registeredPill}>
                  <Ionicons name="checkmark-circle" size={12} color="#2F855A" style={{ marginRight: 3 }} />
                  <Text style={styles.registeredPillText}>REGISTERED</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Capacity / Seats Progress Bar */}
        {maxCap > 0 && (
          <View style={styles.capacityCard}>
            <View style={styles.capacityHeader}>
              <Text style={styles.capacityTitle}>Capacity & Reservations</Text>
              <Text style={styles.capacityValue}>{regCount} / {maxCap} Seats Registered</Text>
            </View>
            <View style={styles.progressBarTrack}>
              <View style={[styles.progressBarFill, { width: `${fillPct}%` }]} />
            </View>
          </View>
        )}

        {/* Info Items List */}
        <View style={styles.infoCard}>
          <InfoItem
            icon="calendar-outline"
            title="Date & Schedule"
            subtitle={formatDate(event.startDate)}
          />
          {event.endDate && (
            <InfoItem
              icon="time-outline"
              title="End Time"
              subtitle={formatDate(event.endDate)}
            />
          )}
          {event.venue && (
            <InfoItem
              icon="location-outline"
              title="Venue & Location"
              subtitle={`${event.venue}${event.address ? ` — ${event.address}` : ''}`}
              actionLabel="Get Directions"
              onAction={openGoogleMaps}
            />
          )}
          <InfoItem
            icon="person-circle-outline"
            title="Organizer"
            subtitle={event.contactName || 'Maheshwari Yuva Sangathan'}
            actionLabel="Call Organizer"
            onAction={callOrganizer}
          />
        </View>

        {/* Description Section */}
        {event.description && (
          <View style={styles.descriptionCard}>
            <Text style={styles.sectionHeader}>About this Event</Text>
            <Text style={styles.descriptionBody}>{event.description}</Text>
          </View>
        )}
      </ScrollView>

      {/* Sticky Bottom Action Register Bar */}
      {!isPast && (
        <View style={[styles.stickyBottomBar, { paddingBottom: insets.bottom + 12 }]}>
          {/* An already-registered member needs their pass more often than the
              cancel button, so it leads the row. */}
          {isRegistered && (
            <TouchableOpacity
              style={styles.ticketButton}
              onPress={handleViewTicket}
              activeOpacity={0.88}
            >
              <Ionicons name="qr-code-outline" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.registerButtonText}>My Ticket</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[
              styles.registerButton,
              isRegistered && styles.unregisterButton,
              isRegistered && styles.compactButton,
            ]}
            onPress={handleRegister}
            disabled={registering}
            activeOpacity={0.88}
          >
            {registering ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons
                  name={isRegistered ? 'close-circle-outline' : 'qr-code-outline'}
                  size={20}
                  color="#FFFFFF"
                  style={{ marginRight: 8 }}
                />
                <Text style={styles.registerButtonText}>
                  {isRegistered ? 'Cancel' : 'Register Now'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* QR Code Pass Modal */}
      <Modal visible={showQRModal} transparent animationType="fade" onRequestClose={() => setShowQRModal(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Ionicons name="checkmark-circle-sharp" size={48} color="#2F855A" />
              <Text style={styles.modalTitle}>You&apos;re Registered! 🎉</Text>
              <Text style={styles.modalSub}>Show this QR code entry pass at the event entrance</Text>
            </View>

            <View style={styles.qrBox}>
              {ticketLoading ? (
                <View style={styles.qrPlaceholder}>
                  <ActivityIndicator size="large" color="#6B1D2A" />
                  <Text style={styles.qrPlaceholderText}>Preparing your pass…</Text>
                </View>
              ) : ticket?.qrDataUrl ? (
                <Image
                  source={{ uri: ticket.qrDataUrl }}
                  style={styles.qrImage}
                  resizeMode="contain"
                  accessibilityLabel="Your event entry QR code"
                />
              ) : (
                <View style={styles.qrPlaceholder}>
                  <Ionicons name="qr-code-outline" size={64} color="#CBD5E0" />
                  <Text style={styles.qrPlaceholderText}>
                    Your pass will appear under My Tickets.
                  </Text>
                </View>
              )}

              {ticket?.registrationCode ? (
                <>
                  <Text style={styles.qrPassLabel}>Registration Code</Text>
                  <RegistrationCode code={ticket.registrationCode} size="sm" />
                  <Text style={styles.qrPassHint}>
                    Read this out if the scanner does not work.
                  </Text>
                </>
              ) : null}
            </View>

            {ticket?.qrDataUrl ? (
              <TouchableOpacity
                style={styles.modalSecondaryBtn}
                onPress={handleSaveQr}
                disabled={savingQr}
                activeOpacity={0.85}
              >
                {savingQr ? (
                  <ActivityIndicator size="small" color="#6B1D2A" />
                ) : (
                  <>
                    <Ionicons name="download-outline" size={17} color="#6B1D2A" style={{ marginRight: 6 }} />
                    <Text style={styles.modalSecondaryText}>Download QR</Text>
                  </>
                )}
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setShowQRModal(false)}>
              <Text style={styles.modalCloseText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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

function InfoItem({
  icon,
  title,
  subtitle,
  actionLabel,
  onAction,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.infoItemRow}>
      <View style={styles.infoIconWrapper}>
        <Ionicons name={icon} size={20} color="#6B1D2A" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.infoItemTitle}>{title}</Text>
        <Text style={styles.infoItemSubtitle}>{subtitle}</Text>
        {actionLabel && onAction && (
          <TouchableOpacity onPress={onAction} style={styles.actionBtnLink} activeOpacity={0.7}>
            <Text style={styles.actionBtnLinkText}>{actionLabel}</Text>
            <Ionicons name="chevron-forward" size={14} color="#6B1D2A" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8F9FA' },
  loadingText: { fontSize: 13, color: '#718096', marginTop: 10, fontWeight: '600' },
  emptyText: { fontSize: 16, fontWeight: '700', color: '#2D3748', marginTop: 12 },
  backHomeBtn: { marginTop: 16, backgroundColor: '#6B1D2A', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
  backHomeText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },

  headerBar: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 30,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 12, backgroundColor: 'rgba(107,29,42,0.92)',
  },
  iconCircleBtn: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 17, fontWeight: '800', color: '#FFFFFF', flex: 1, textAlign: 'center', marginHorizontal: 10 },
  rightHeaderActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },

  content: { paddingTop: 85, paddingBottom: 90 },

  heroBannerContainer: { height: 210, width: '100%', position: 'relative', backgroundColor: '#6B1D2A' },
  heroImage: { width: '100%', height: '100%' },
  heroPlaceholder: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', padding: 20 },
  heroPlaceholderText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800', textAlign: 'center', marginTop: 8 },
  heroGradientOverlay: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.25)' },
  heroBadgesRow: { position: 'absolute', bottom: 12, left: 16, right: 16, flexDirection: 'row', gap: 8 },
  heroBadgeMaroon: { backgroundColor: '#6B1D2A', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  heroBadgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  heroBadgeGold: { backgroundColor: '#D69E2E', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  heroBadgeGoldText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },

  mainTitleCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 14,
    backgroundColor: '#FFFFFF', padding: 16, borderBottomWidth: 1, borderBottomColor: '#E2E8F0',
  },
  dateBadgeBox: {
    width: 54, height: 58, borderRadius: 14, backgroundColor: 'rgba(107,29,42,0.08)',
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(107,29,42,0.2)',
  },
  dateDayText: { fontSize: 24, fontWeight: '900', color: '#6B1D2A' },
  dateMonthText: { fontSize: 11, fontWeight: '800', color: '#6B1D2A' },
  mainTitleText: { fontSize: 19, fontWeight: '800', color: '#1A202C', lineHeight: 24 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 },
  upcomingPill: { backgroundColor: '#E6FFFA' },
  pastPill: { backgroundColor: '#EDF2F7' },
  statusPillText: { fontSize: 10, fontWeight: '800' },
  upcomingPillText: { color: '#234E52' },
  pastPillText: { color: '#718096' },
  registeredPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0FFF4', borderWidth: 1, borderColor: '#C6F6D5', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  registeredPillText: { fontSize: 10, fontWeight: '800', color: '#2F855A' },

  capacityCard: { backgroundColor: '#FFFFFF', marginTop: 10, padding: 16, borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#E2E8F0' },
  capacityHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  capacityTitle: { fontSize: 12, fontWeight: '700', color: '#4A5568', textTransform: 'uppercase' },
  capacityValue: { fontSize: 12, fontWeight: '800', color: '#6B1D2A' },
  progressBarTrack: { height: 8, backgroundColor: '#EDF2F7', borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#6B1D2A', borderRadius: 4 },

  infoCard: { backgroundColor: '#FFFFFF', marginTop: 10, paddingVertical: 6, borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#E2E8F0' },
  infoItemRow: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 16, paddingVertical: 12, gap: 14 },
  infoIconWrapper: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(107,29,42,0.08)', alignItems: 'center', justifyContent: 'center' },
  infoItemTitle: { fontSize: 11, fontWeight: '700', color: '#A0AEC0', textTransform: 'uppercase' },
  infoItemSubtitle: { fontSize: 13.5, fontWeight: '600', color: '#2D3748', marginTop: 2, lineHeight: 18 },
  actionBtnLink: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  actionBtnLinkText: { fontSize: 12, fontWeight: '700', color: '#6B1D2A', marginRight: 2 },

  descriptionCard: { backgroundColor: '#FFFFFF', marginTop: 10, padding: 16, borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#E2E8F0' },
  sectionHeader: { fontSize: 14, fontWeight: '800', color: '#1A202C', marginBottom: 8 },
  descriptionBody: { fontSize: 13.5, color: '#4A5568', lineHeight: 22 },

  stickyBottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 40,
    backgroundColor: '#FFFFFF', paddingHorizontal: 16, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: '#E2E8F0', elevation: 8,
    flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  registerButton: {
    flex: 1,
    backgroundColor: '#6B1D2A', height: 48, borderRadius: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', elevation: 4,
  },
  ticketButton: {
    flex: 1.3,
    backgroundColor: '#6B1D2A', height: 48, borderRadius: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', elevation: 4,
  },
  // Cancel yields room to the ticket button when both are on screen.
  compactButton: { flex: 0.9 },
  unregisterButton: { backgroundColor: '#C53030' },
  registerButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalCard: { width: '100%', backgroundColor: '#FFFFFF', borderRadius: 24, padding: 24, alignItems: 'center' },
  modalHeader: { alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#1A202C', marginTop: 10 },
  modalSub: { fontSize: 12, color: '#718096', textAlign: 'center', marginTop: 4 },
  qrBox: { padding: 16, backgroundColor: '#F8F9FA', borderRadius: 18, borderWidth: 1, borderColor: '#E2E8F0', alignItems: 'center', marginVertical: 12, alignSelf: 'stretch' },
  qrImage: { width: 190, height: 190 },
  qrPlaceholder: { width: 190, height: 190, alignItems: 'center', justifyContent: 'center' },
  qrPlaceholderText: { fontSize: 11.5, color: '#A0AEC0', fontWeight: '600', marginTop: 10, textAlign: 'center', paddingHorizontal: 12, lineHeight: 16 },
  qrPassLabel: { fontSize: 10, fontWeight: '700', color: '#A0AEC0', letterSpacing: 1, textTransform: 'uppercase', marginTop: 14, marginBottom: 6 },
  qrPassHint: { fontSize: 11, color: '#718096', marginTop: 8, textAlign: 'center' },
  modalSecondaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: '100%', borderWidth: 1.5, borderColor: '#6B1D2A', paddingVertical: 12, borderRadius: 14 },
  modalSecondaryText: { color: '#6B1D2A', fontSize: 13.5, fontWeight: '800' },
  modalCloseBtn: { width: '100%', backgroundColor: '#6B1D2A', paddingVertical: 14, borderRadius: 14, alignItems: 'center', marginTop: 12 },
  modalCloseText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
});
