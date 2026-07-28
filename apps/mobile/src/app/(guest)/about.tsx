import React, { useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Platform,
  BackHandler,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, APP } from '../../constants/theme';

const CONTACT_INFO = [
  { icon: 'call-outline' as const, label: 'Phone', value: '+91 98765 43210', action: 'tel:+919876543210' },
  { icon: 'mail-outline' as const, label: 'Email', value: 'info@mysranchi.org', action: 'mailto:info@mysranchi.org' },
  { icon: 'location-outline' as const, label: 'Address', value: 'MYS Bhawan, Main Road, Ranchi, Jharkhand 834001', action: '' },
];

export default function GuestAboutScreen() {
  const router = useRouter();

  useEffect(() => {
    const onBackPress = () => {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/(guest)/home');
      }
      return true;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [router]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.aboutCard}>
        <Text style={styles.title}>About {APP.name}</Text>
        <Text style={styles.body}>
          Maheshwari Yuva Sangathan (MYS) Ranchi is a vibrant community organization
          dedicated to bringing together Maheshwari youth for social, cultural, and
          educational activities. Founded with the vision of strengthening community
          bonds, MYS Ranchi organizes events, seminars, sports activities, and
          cultural programs throughout the year.
        </Text>
        <Text style={styles.body}>
          Our mission is to foster unity, encourage personal development, and create
          a supportive network for Maheshwari families in Ranchi and surrounding areas.
        </Text>
      </View>

      <Text style={styles.sectionTitle}>Contact Us</Text>
      {CONTACT_INFO.map((item, i) => (
        <TouchableOpacity
          key={i}
          style={styles.contactRow}
          onPress={() => item.action ? Linking.openURL(item.action) : null}
          disabled={!item.action}
          activeOpacity={item.action ? 0.7 : 1}
        >
          <View style={styles.contactIcon}>
            <Ionicons name={item.icon} size={20} color={Colors.primary[500]} />
          </View>
          <View style={styles.contactInfo}>
            <Text style={styles.contactLabel}>{item.label}</Text>
            <Text style={styles.contactValue}>{item.value}</Text>
          </View>
          {item.action ? <Ionicons name="chevron-forward" size={16} color="#A0AEC0" /> : null}
        </TouchableOpacity>
      ))}

      <View style={styles.ctaCard}>
        <Text style={styles.ctaTitle}>Ready to join?</Text>
        <Text style={styles.ctaDesc}>
          Create an account to become a member and access all features.
        </Text>
        <TouchableOpacity
          style={styles.ctaButton}
          onPress={() => router.replace('/(auth)/sign-up')}
        >
          <Text style={styles.ctaButtonText}>Sign Up</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  content: { padding: Spacing.md, paddingBottom: 40 },
  aboutCard: {
    backgroundColor: Colors.neutral[0],
    borderRadius: Spacing.radiusLg,
    padding: 20,
    borderWidth: 1,
    borderColor: '#EDF2F7',
    elevation: 1,
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.primary[900],
    marginBottom: 12,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  body: {
    fontSize: 14,
    color: Colors.text.secondary,
    lineHeight: 22,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 12,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.neutral[0],
    borderRadius: Spacing.radiusMd,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#EDF2F7',
  },
  contactIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(128, 0, 32, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  contactInfo: { flex: 1 },
  contactLabel: { fontSize: 12, color: Colors.text.tertiary, fontWeight: '600' },
  contactValue: { fontSize: 14, color: Colors.text.primary, marginTop: 2 },
  ctaCard: {
    backgroundColor: Colors.neutral[0],
    borderRadius: Spacing.radiusLg,
    padding: 24,
    alignItems: 'center',
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#EDF2F7',
    elevation: 1,
  },
  ctaTitle: { fontSize: 18, fontWeight: '800', color: Colors.primary[900] },
  ctaDesc: { fontSize: 13, color: Colors.text.secondary, textAlign: 'center', marginTop: 8, lineHeight: 18 },
  ctaButton: {
    backgroundColor: Colors.primary[500],
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 16,
  },
  ctaButtonText: { color: Colors.neutral[0], fontSize: 14, fontWeight: '700' },
});
