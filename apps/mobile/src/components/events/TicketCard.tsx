import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { EventRegistration } from '../../services/api';
import { RegistrationCode } from '../ui/RegistrationCode';

interface TicketCardProps {
  registration: EventRegistration;
  onPress?: () => void;
  onDownload?: (registration: EventRegistration) => Promise<void> | void;
}

function formatEventDate(startDate: string, startTime?: string | null): string {
  const date = new Date(startDate);
  if (Number.isNaN(date.getTime())) return 'Date to be announced';

  const formatted = date.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  return startTime ? `${formatted} · ${startTime}` : formatted;
}

/**
 * One event ticket: the QR the volunteer scans, the code they type when the
 * scan fails, and how many entries are left on it.
 */
export function TicketCard({ registration, onPress, onDownload }: TicketCardProps) {
  const [downloading, setDownloading] = useState(false);

  const { event, registrationCode, qrDataUrl, scansRemaining, maxScans, status } = registration;

  const isUsedUp = scansRemaining <= 0;
  const isAttended = status === 'ATTENDED';
  const venueStr = event.isOnline
    ? 'Online event'
    : event.venue
      ? `${event.venue}${event.city?.name ? `, ${event.city.name}` : ''}`
      : 'Venue to be announced';

  const handleDownload = async () => {
    if (!onDownload || downloading) return;
    setDownloading(true);
    try {
      await onDownload(registration);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <View style={styles.card}>
      {/* Stub header — event identity */}
      <TouchableOpacity
        style={styles.header}
        onPress={onPress}
        activeOpacity={onPress ? 0.85 : 1}
        disabled={!onPress}
      >
        <View style={styles.headerText}>
          <Text style={styles.eventTitle} numberOfLines={2}>
            {event.title}
          </Text>
          <View style={styles.metaRow}>
            <Ionicons name="calendar-outline" size={13} color="#F6E3C5" style={styles.metaIcon} />
            <Text style={styles.metaText} numberOfLines={1}>
              {formatEventDate(event.startDate, event.startTime)}
            </Text>
          </View>
          <View style={styles.metaRow}>
            <Ionicons name="location-outline" size={13} color="#F6E3C5" style={styles.metaIcon} />
            <Text style={styles.metaText} numberOfLines={1}>
              {venueStr}
            </Text>
          </View>
        </View>
        {onPress && <Ionicons name="chevron-forward" size={20} color="#F6E3C5" />}
      </TouchableOpacity>

      {/* Perforation between the stub and the scannable half */}
      <View style={styles.perforation}>
        <View style={[styles.notch, styles.notchLeft]} />
        <View style={styles.dashedLine} />
        <View style={[styles.notch, styles.notchRight]} />
      </View>

      {/* Scannable half */}
      <View style={styles.body}>
        <View style={styles.qrFrame}>
          {qrDataUrl ? (
            <Image
              source={{ uri: qrDataUrl }}
              style={styles.qrImage}
              resizeMode="contain"
              accessibilityLabel={`QR code for ${event.title}`}
            />
          ) : (
            <View style={styles.qrFallback}>
              <Ionicons name="qr-code-outline" size={40} color="#CBD5E0" />
              <Text style={styles.qrFallbackText}>QR not available</Text>
            </View>
          )}

          {isUsedUp && (
            <View style={styles.usedOverlay}>
              <Ionicons name="checkmark-done-circle" size={34} color="#FFFFFF" />
              <Text style={styles.usedOverlayText}>Entry recorded</Text>
            </View>
          )}
        </View>

        <Text style={styles.codeCaption}>Registration Code</Text>
        <RegistrationCode code={registrationCode} size="md" showLegend />

        <Text style={styles.fallbackHint}>
          If the scanner does not work, read this code out to the volunteer.
        </Text>

        {/* Entry quota + status */}
        <View style={styles.statsRow}>
          <View
            style={[
              styles.statusPill,
              isAttended && styles.statusPillAttended,
              isUsedUp && !isAttended && styles.statusPillUsed,
            ]}
          >
            <Ionicons
              name={isAttended ? 'checkmark-circle' : 'ticket-outline'}
              size={13}
              color={isAttended ? '#2F855A' : isUsedUp ? '#975A16' : '#6B1D2A'}
              style={styles.metaIcon}
            />
            <Text
              style={[
                styles.statusPillText,
                isAttended && styles.statusPillTextAttended,
                isUsedUp && !isAttended && styles.statusPillTextUsed,
              ]}
            >
              {isAttended ? 'Attended' : 'Registered'}
            </Text>
          </View>

          <Text style={styles.scanText}>
            <Text style={styles.scanCount}>{scansRemaining}</Text>
            {` of ${maxScans} ${maxScans === 1 ? 'entry' : 'entries'} left`}
          </Text>
        </View>

        {/* Download */}
        <TouchableOpacity
          style={[styles.downloadBtn, (!qrDataUrl || downloading) && styles.downloadBtnDisabled]}
          onPress={handleDownload}
          disabled={!qrDataUrl || downloading}
          activeOpacity={0.85}
        >
          {downloading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="download-outline" size={17} color="#FFFFFF" style={styles.metaIcon} />
              <Text style={styles.downloadBtnText}>Download QR</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    marginBottom: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6B1D2A',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 16,
  },
  headerText: {
    flex: 1,
    paddingRight: 8,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 21,
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  metaIcon: {
    marginRight: 6,
  },
  metaText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#F6E3C5',
    flex: 1,
  },
  perforation: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 20,
    backgroundColor: '#6B1D2A',
  },
  notch: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#F8F9FA',
  },
  notchLeft: {
    marginLeft: -10,
  },
  notchRight: {
    marginRight: -10,
  },
  dashedLine: {
    flex: 1,
    borderBottomWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: 'rgba(255,255,255,0.45)',
    marginHorizontal: 6,
  },
  body: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 16,
  },
  qrFrame: {
    width: 190,
    height: 190,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    padding: 8,
  },
  qrImage: {
    width: '100%',
    height: '100%',
  },
  qrFallback: {
    alignItems: 'center',
  },
  qrFallbackText: {
    fontSize: 11.5,
    color: '#A0AEC0',
    fontWeight: '600',
    marginTop: 8,
  },
  usedOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(47,133,90,0.82)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  usedOverlayText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    marginTop: 6,
    letterSpacing: 0.4,
  },
  codeCaption: {
    fontSize: 11,
    fontWeight: '700',
    color: '#A0AEC0',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: 16,
    marginBottom: 8,
  },
  fallbackHint: {
    fontSize: 11.5,
    color: '#718096',
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 16,
    paddingHorizontal: 8,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    alignSelf: 'stretch',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F4F8',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FDF2F4',
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  statusPillAttended: {
    backgroundColor: '#F0FFF4',
  },
  statusPillUsed: {
    backgroundColor: '#FEFCBF',
  },
  statusPillText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#6B1D2A',
  },
  statusPillTextAttended: {
    color: '#2F855A',
  },
  statusPillTextUsed: {
    color: '#975A16',
  },
  scanText: {
    fontSize: 12,
    color: '#718096',
    fontWeight: '600',
  },
  scanCount: {
    fontSize: 13,
    fontWeight: '800',
    color: '#6B1D2A',
  },
  downloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
    backgroundColor: '#6B1D2A',
    borderRadius: 10,
    paddingVertical: 11,
    marginTop: 14,
  },
  downloadBtnDisabled: {
    backgroundColor: '#CBD5E0',
  },
  downloadBtnText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '800',
  },
});
