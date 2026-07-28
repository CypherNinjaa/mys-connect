import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export interface EventItemData {
  id: string;
  title: string;
  shortDesc?: string;
  startDate: string;
  startTime?: string;
  endDate?: string;
  venue?: string;
  address?: string;
  chapter?: string;
  category?: string;
  city?: { name: string };
  coverImageUrl?: string;
  status?: string;
  isRegistered?: boolean;
  maxAttendees?: number;
  maxCapacity?: number;
  registrationDeadline?: string;
  _count?: { rsvps?: number; registrations?: number };
}

interface EventCardProps {
  event: EventItemData;
  activeTab: 'UPCOMING' | 'ONGOING' | 'COMPLETED';
  onPress?: () => void;
  onRegisterToggle?: (event: EventItemData) => void;
  isRegistering?: boolean;
}

export function EventCard({
  event,
  activeTab,
  onPress,
  onRegisterToggle,
  isRegistering = false,
}: EventCardProps) {
  const dateObj = new Date(event.startDate);
  const day = dateObj.getDate().toString().padStart(2, '0');
  const month = dateObj.toLocaleString('en-US', { month: 'short' }).toUpperCase();
  const fullFormattedDate = dateObj.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const venueStr = event.venue
    ? `${event.venue}${event.city?.name ? `, ${event.city.name}` : ''}`
    : 'Shree Maheshwari Bhawan, Ranchi';

  const isCompleted = activeTab === 'COMPLETED' || event.status === 'COMPLETED';
  const isRegistered = Boolean(event.isRegistered);
  const maxCap = event.maxAttendees || event.maxCapacity || 0;
  const regCount = event._count?.rsvps || event._count?.registrations || 0;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.88}>
      {/* Top Banner Image (if available) */}
      {event.coverImageUrl ? (
        <View style={styles.bannerWrapper}>
          <Image source={{ uri: event.coverImageUrl }} style={styles.bannerImage} resizeMode="cover" />
          <View style={styles.bannerOverlay} />
          {/* Chapter Badge on image */}
          <View style={styles.chapterBadge}>
            <Text style={styles.chapterText}>{event.chapter || 'Ranchi'} Chapter</Text>
          </View>
        </View>
      ) : null}

      <View style={styles.cardBody}>
        {/* Date & Main Info Row */}
        <View style={styles.mainRow}>
          {/* Date Badge */}
          <View style={styles.leftDateCol}>
            <Text style={styles.dayText}>{day}</Text>
            <Text style={styles.monthText}>{month}</Text>
          </View>

          <View style={styles.verticalDivider} />

          {/* Details */}
          <View style={styles.rightContent}>
            <Text style={styles.eventTitle} numberOfLines={2}>
              {event.title}
            </Text>

            <View style={styles.infoRow}>
              <Ionicons name="calendar-outline" size={14} color="#6B1D2A" style={styles.icon} />
              <Text style={styles.infoText} numberOfLines={1}>
                {fullFormattedDate}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Ionicons name="location-outline" size={14} color="#6B1D2A" style={styles.icon} />
              <Text style={styles.infoText} numberOfLines={1}>
                {venueStr}
              </Text>
            </View>

            {/* Capacity / Registrations pill */}
            {maxCap > 0 ? (
              <View style={styles.infoRow}>
                <Ionicons name="people-outline" size={14} color="#6B1D2A" style={styles.icon} />
                <Text style={styles.capacityText}>
                  {regCount} / {maxCap} Seats Registered
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Action Button Row */}
        <View style={styles.actionRow}>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{event.category || 'General'}</Text>
          </View>

          <TouchableOpacity
            style={[
              styles.actionBtn,
              isRegistered && styles.registeredBtn,
              isCompleted && styles.completedBtn,
            ]}
            onPress={() => onRegisterToggle?.(event)}
            disabled={isCompleted || isRegistering}
            activeOpacity={0.8}
          >
            {isRegistering ? (
              <ActivityIndicator size="small" color={isRegistered ? '#2F855A' : '#6B1D2A'} />
            ) : (
              <>
                {isRegistered && (
                  <Ionicons name="checkmark-circle" size={15} color="#2F855A" style={{ marginRight: 4 }} />
                )}
                <Text
                  style={[
                    styles.actionBtnText,
                    isRegistered && styles.registeredBtnText,
                    isCompleted && styles.completedBtnText,
                  ]}
                >
                  {isCompleted ? 'Completed' : isRegistered ? 'Registered' : 'Register Now'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,

    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  bannerWrapper: {
    height: 120,
    width: '100%',
    position: 'relative',
    backgroundColor: '#6B1D2A',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  bannerOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  chapterBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: 'rgba(107,29,42,0.9)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  chapterText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardBody: {
    padding: 14,
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  leftDateCol: {
    width: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#6B1D2A',
    lineHeight: 28,
  },
  monthText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B1D2A',
    marginTop: 2,
    letterSpacing: 0.5,
  },
  verticalDivider: {
    width: 1,
    height: '80%',
    backgroundColor: '#CBD5E0',
    marginHorizontal: 12,
  },
  rightContent: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1A202C',
    marginBottom: 6,
    lineHeight: 20,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
  },
  icon: {
    marginRight: 6,
  },
  infoText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#4A5568',
    flex: 1,
  },
  capacityText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#D69E2E',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F0F4F8',
  },
  categoryBadge: {
    backgroundColor: '#EDF2F7',
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 6,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4A5568',
  },
  actionBtn: {
    borderWidth: 1.5,
    borderColor: '#6B1D2A',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 14,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionBtnText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#6B1D2A',
  },
  registeredBtn: {
    borderColor: '#C6F6D5',
    backgroundColor: '#F0FFF4',
  },
  registeredBtnText: {
    color: '#2F855A',
  },
  completedBtn: {
    borderColor: '#E2E8F0',
    backgroundColor: '#EDF2F7',
  },
  completedBtnText: {
    color: '#A0AEC0',
  },
});
