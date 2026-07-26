import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/theme';

export interface EventItemData {
  id: string;
  title: string;
  startDate: string;
  startTime?: string;
  endDate?: string;
  venue?: string;
  city?: { name: string };
  coverImageUrl?: string;
  status?: string;
  isRegistered?: boolean;
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
    month: 'long',
    year: 'numeric',
  });
  const timeStr = event.startTime || '10:00 AM';
  const venueStr = event.venue
    ? `${event.venue}${event.city?.name ? `, ${event.city.name}` : ''}`
    : 'Shree Maheshwari Bhawan, Jaipur';

  const isCompleted = activeTab === 'COMPLETED' || event.status === 'COMPLETED';
  const isRegistered = Boolean(event.isRegistered);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.88}>
      {/* Left Date Column */}
      <View style={styles.leftDateCol}>
        <Text style={styles.dayText}>{day}</Text>
        <Text style={styles.monthText}>{month}</Text>
      </View>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Right Details Column */}
      <View style={styles.rightContent}>
        <Text style={styles.eventTitle} numberOfLines={2}>
          {event.title}
        </Text>

        <View style={styles.infoRow}>
          <Ionicons name="calendar-outline" size={15} color="#6B1D2A" style={styles.icon} />
          <Text style={styles.infoText}>
            {fullFormattedDate} | {timeStr}
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="location-outline" size={15} color="#6B1D2A" style={styles.icon} />
          <Text style={styles.infoText} numberOfLines={1}>
            {venueStr}
          </Text>
        </View>

        {/* Action Registration Button */}
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
                <Ionicons name="checkmark-circle" size={16} color="#2F855A" style={{ marginRight: 6 }} />
              )}
              <Text
                style={[
                  styles.actionBtnText,
                  isRegistered && styles.registeredBtnText,
                  isCompleted && styles.completedBtnText,
                ]}
              >
                {isCompleted ? 'Event Completed' : isRegistered ? 'Registered' : 'Register Now'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,

    // Soft drop shadow matching wireframe
    borderWidth: 1,
    borderColor: '#F0F4F8',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  leftDateCol: {
    width: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayText: {
    fontSize: 26,
    fontWeight: '800',
    color: '#6B1D2A',
    lineHeight: 30,
  },
  monthText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6B1D2A',
    marginTop: 2,
    letterSpacing: 0.5,
  },
  divider: {
    width: 1,
    height: '75%',
    backgroundColor: '#E2E8F0',
    marginHorizontal: 14,
  },
  rightContent: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1A202C',
    marginBottom: 6,
    lineHeight: 21,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  icon: {
    marginRight: 6,
  },
  infoText: {
    fontSize: 12.5,
    fontWeight: '500',
    color: '#4A5568',
    flex: 1,
  },
  actionBtn: {
    marginTop: 10,
    alignSelf: 'flex-start',
    borderWidth: 1.5,
    borderColor: '#6B1D2A',
    borderRadius: 9,
    paddingVertical: 7,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '700',
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
