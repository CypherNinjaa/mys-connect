import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing } from '../../constants/theme';

export default function EventsPlaceholder() {
  return (
    <View style={styles.container}>
      <Ionicons name="calendar-outline" size={48} color={Colors.primary[500]} style={styles.icon} />
      <Text style={styles.title}>Community Events</Text>
      <Text style={styles.subtitle}>RSVP & Event Calendar</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  icon: {
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.primary[500],
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.text.tertiary,
    textAlign: 'center',
  },
});
