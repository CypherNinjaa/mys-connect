import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  Dimensions,
  StatusBar,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, APP } from '../../constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const EXPLORE_ITEMS = [
  { icon: 'people-outline' as const, label: 'Members', desc: 'Browse our community directory' },
  { icon: 'calendar-outline' as const, label: 'Events', desc: 'Upcoming community events' },
  { icon: 'newspaper-outline' as const, label: 'About', desc: 'Learn about MYS Ranchi' },
];

export default function GuestHomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary[500]} />

      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>{APP.name}</Text>
          <Text style={styles.headerSub}>Welcome, Guest</Text>
        </View>
        <TouchableOpacity
          style={styles.loginBtn}
          onPress={() => router.replace('/(auth)/sign-in')}
        >
          <Text style={styles.loginBtnText}>Sign In</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.heroBanner}>
          <Image
            source={require('../../../assets/images/mys-logo.jpg')}
            style={styles.heroLogo}
            resizeMode="contain"
          />
          <Text style={styles.heroTitle}>Maheshwari Yuva Sangathan</Text>
          <Text style={styles.heroTagline}>{APP.tagline}</Text>
        </View>

        <Text style={styles.sectionTitle}>Explore</Text>
        <View style={styles.exploreGrid}>
          {EXPLORE_ITEMS.map((item, i) => (
            <TouchableOpacity
              key={i}
              style={styles.exploreCard}
              activeOpacity={0.8}
              onPress={() => {
                if (item.label === 'Members') router.push('/(guest)/members');
                else if (item.label === 'Events') router.push('/(guest)/events');
                else router.push('/(guest)/about');
              }}
            >
              <View style={styles.exploreIconCircle}>
                <Ionicons name={item.icon} size={24} color={Colors.primary[500]} />
              </View>
              <Text style={styles.exploreLabel}>{item.label}</Text>
              <Text style={styles.exploreDesc}>{item.desc}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.ctaCard}>
          <Ionicons name="sparkles" size={28} color={Colors.secondary[500]} />
          <Text style={styles.ctaTitle}>Join MYS Connect</Text>
          <Text style={styles.ctaDesc}>
            Sign up to access all features — register for events, view the full directory, get notifications, and more.
          </Text>
          <TouchableOpacity
            style={styles.ctaButton}
            onPress={() => router.replace('/(auth)/sign-up')}
          >
            <Text style={styles.ctaButtonText}>Create Account</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    backgroundColor: Colors.primary[500],
    paddingHorizontal: Spacing.md,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.neutral[0],
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  headerSub: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  loginBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  loginBtnText: {
    color: Colors.neutral[0],
    fontSize: 13,
    fontWeight: '700',
  },
  content: {
    padding: Spacing.md,
    paddingBottom: 40,
  },
  heroBanner: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  heroLogo: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 12,
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.primary[900],
    textAlign: 'center',
  },
  heroTagline: {
    fontSize: 13,
    color: Colors.text.tertiary,
    marginTop: 4,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 12,
    marginTop: 8,
  },
  exploreGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  exploreCard: {
    width: (SCREEN_WIDTH - Spacing.md * 2 - 10) / 2,
    backgroundColor: Colors.neutral[0],
    borderRadius: Spacing.radiusMd,
    padding: 16,
    borderWidth: 1,
    borderColor: '#EDF2F7',
    elevation: 1,
  },
  exploreIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(128, 0, 32, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  exploreLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  exploreDesc: {
    fontSize: 11,
    color: Colors.text.tertiary,
    marginTop: 4,
    lineHeight: 15,
  },
  ctaCard: {
    backgroundColor: Colors.neutral[0],
    borderRadius: Spacing.radiusLg,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EDF2F7',
    elevation: 2,
  },
  ctaTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.primary[900],
    marginTop: 12,
  },
  ctaDesc: {
    fontSize: 13,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 18,
  },
  ctaButton: {
    backgroundColor: Colors.primary[500],
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 16,
  },
  ctaButtonText: {
    color: Colors.neutral[0],
    fontSize: 14,
    fontWeight: '700',
  },
});
