import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { UpcomingEvent } from '../../services/homeService';

interface UpcomingEventCardProps {
  events: UpcomingEvent[];
  onEventPress?: (event: UpcomingEvent) => void;
  onViewAllPress?: () => void;
}

export function UpcomingEventCard({ events, onEventPress, onViewAllPress }: UpcomingEventCardProps) {
  return (
    <View style={styles.container}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Upcoming Events</Text>
        {onViewAllPress && (
          <TouchableOpacity onPress={onViewAllPress} activeOpacity={0.7}>
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.listContainer}>
        {events.map((event) => (
          <TouchableOpacity
            key={event.id}
            style={styles.card}
            onPress={() => onEventPress?.(event)}
            activeOpacity={0.8}
          >
            <View style={[styles.iconCircle, { backgroundColor: event.bgColor || '#FFEBF0' }]}>
              <Ionicons
                name={(event.iconName || 'pulse') as any}
                size={26}
                color={event.iconColor || '#E53E3E'}
              />
            </View>

            <View style={styles.content}>
              <Text style={styles.eventTitle} numberOfLines={1}>
                {event.title}
              </Text>

              <View style={styles.infoRow}>
                <Ionicons name="calendar-outline" size={14} color="#6B1D2A" style={styles.infoIcon} />
                <Text style={styles.infoText}>{event.dateTime}</Text>
              </View>

              <View style={styles.infoRow}>
                <Ionicons name="location-outline" size={14} color="#6B1D2A" style={styles.infoIcon} />
                <Text style={styles.infoText} numberOfLines={1}>
                  {event.venue}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1A202C',
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2B6CB0',
  },
  listContainer: {
    gap: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',

    // Soft drop shadow matching wireframe exactly
    borderWidth: 1,
    borderColor: '#F0F4F8',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  content: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1A202C',
    marginBottom: 4,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  infoIcon: {
    marginRight: 6,
  },
  infoText: {
    fontSize: 12.5,
    fontWeight: '500',
    color: '#4A5568',
  },
});
