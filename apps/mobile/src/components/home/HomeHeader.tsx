import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Platform, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface HomeHeaderProps {
  greeting: string;
  userName: string;
  avatarUrl?: string;
  fallbackInitial?: string;
  onNotificationPress?: () => void;
  onProfilePress?: () => void;
}

export function HomeHeader({
  greeting,
  userName,
  avatarUrl,
  fallbackInitial = 'U',
  onNotificationPress,
  onProfilePress,
}: HomeHeaderProps) {
  const statusBarHeight = Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 12;

  return (
    <View style={[styles.container, { paddingTop: statusBarHeight + 12 }]}>
      <View style={styles.leftSection}>
        <Text style={styles.greetingText}>{greeting}</Text>
        <Text style={styles.userNameText} numberOfLines={1}>
          {userName} 👋
        </Text>
      </View>

      <View style={styles.rightSection}>
        <TouchableOpacity style={styles.iconBtn} onPress={onNotificationPress} activeOpacity={0.7}>
          <Ionicons name="notifications-outline" size={22} color="#FFFFFF" />
        </TouchableOpacity>

        <TouchableOpacity onPress={onProfilePress} activeOpacity={0.8}>
          <View style={styles.avatarBorder}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarInitialText}>{fallbackInitial.toUpperCase()}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#6B1D2A',
    paddingHorizontal: 20,
    paddingBottom: 74, // Space for overlapping EventCarousel card
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftSection: {
    flex: 1,
    paddingRight: 12,
  },
  greetingText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#E2E8F0',
    marginBottom: 2,
  },
  userNameText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  iconBtn: {
    padding: 6,
  },
  avatarBorder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarFallback: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#8C2335',
  },
  avatarInitialText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
});
