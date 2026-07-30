import React, { useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Linking,
  BackHandler,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing } from '../../constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const CONTACT_ITEMS = [
  {
    icon: 'call-outline' as const,
    label: 'Phone',
    value: '+91 98765 43210',
    action: 'tel:+919876543210',
    color: Colors.success.main,
  },
  {
    icon: 'logo-whatsapp' as const,
    label: 'WhatsApp',
    value: '+91 98765 43210',
    action: 'https://wa.me/919876543210',
    color: '#25D366',
  },
  {
    icon: 'mail-outline' as const,
    label: 'Email',
    value: 'info@mysranchi.org',
    action: 'mailto:info@mysranchi.org',
    color: Colors.info.main,
  },
  {
    icon: 'globe-outline' as const,
    label: 'Website',
    value: 'www.mysranchi.org',
    action: 'https://www.mysranchi.org',
    color: Colors.primary[500],
  },
];

const ADDRESS = {
  line1: 'MYS Bhawan',
  line2: 'Main Road, Ranchi',
  line3: 'Jharkhand - 834001',
};

const SOCIAL_LINKS = [
  { icon: 'logo-facebook' as const, url: 'https://facebook.com/mysranchi', color: '#1877F2' },
  { icon: 'logo-instagram' as const, url: 'https://instagram.com/mysranchi', color: '#E4405F' },
  { icon: 'logo-youtube' as const, url: 'https://youtube.com/@mysranchi', color: '#FF0000' },
  { icon: 'logo-twitter' as const, url: 'https://twitter.com/mysranchi', color: '#1DA1F2' },
];

export default function ContactScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(member)/settings');
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

  return (
    <View style={styles.container}>
      <View style={[styles.headerBar, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.neutral[0]} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Contact Us</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.subtitle}>
          We&apos;d love to hear from you. Reach out to us through any of the channels below.
        </Text>

        {CONTACT_ITEMS.map((item, i) => (
          <TouchableOpacity
            key={i}
            style={styles.contactCard}
            onPress={() => Linking.openURL(item.action)}
            activeOpacity={0.7}
          >
            <View style={[styles.contactIcon, { backgroundColor: `${item.color}15` }]}>
              <Ionicons name={item.icon} size={22} color={item.color} />
            </View>
            <View style={styles.contactInfo}>
              <Text style={styles.contactLabel}>{item.label}</Text>
              <Text style={styles.contactValue}>{item.value}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#A0AEC0" />
          </TouchableOpacity>
        ))}

        {/* Address */}
        <TouchableOpacity
          style={styles.addressCard}
          onPress={() =>
            Linking.openURL(
              `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                `${ADDRESS.line1}, ${ADDRESS.line2}, ${ADDRESS.line3}`
              )}`
            )
          }
          activeOpacity={0.7}
        >
          <View style={styles.addressIcon}>
            <Ionicons name="location" size={24} color={Colors.primary[500]} />
          </View>
          <View style={styles.addressInfo}>
            <Text style={styles.addressLabel}>Visit Us</Text>
            <Text style={styles.addressLine}>{ADDRESS.line1}</Text>
            <Text style={styles.addressLine}>{ADDRESS.line2}</Text>
            <Text style={styles.addressLine}>{ADDRESS.line3}</Text>
          </View>
          <Ionicons name="navigate-outline" size={20} color={Colors.primary[500]} />
        </TouchableOpacity>

        {/* Social */}
        <Text style={styles.socialTitle}>Follow Us</Text>
        <View style={styles.socialRow}>
          {SOCIAL_LINKS.map((s, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.socialBtn, { backgroundColor: `${s.color}15` }]}
              onPress={() => Linking.openURL(s.url)}
              activeOpacity={0.7}
            >
              <Ionicons name={s.icon} size={24} color={s.color} />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  headerBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.primary[500], paddingHorizontal: Spacing.md, paddingTop: 10, paddingBottom: 14,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: Colors.neutral[0] },
  content: { padding: Spacing.md, paddingBottom: 40 },
  subtitle: { fontSize: 14, color: Colors.text.secondary, lineHeight: 20, marginBottom: 20 },
  contactCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.neutral[0],
    borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#EDF2F7', elevation: 1,
  },
  contactIcon: {
    width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: 14,
  },
  contactInfo: { flex: 1 },
  contactLabel: { fontSize: 11, color: Colors.text.tertiary, fontWeight: '600' },
  contactValue: { fontSize: 15, color: Colors.text.primary, fontWeight: '600', marginTop: 2 },
  addressCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.neutral[0],
    borderRadius: 12, padding: 16, marginTop: 10, borderWidth: 1, borderColor: '#EDF2F7', elevation: 1,
  },
  addressIcon: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(128,0,32,0.08)',
    justifyContent: 'center', alignItems: 'center', marginRight: 14,
  },
  addressInfo: { flex: 1 },
  addressLabel: { fontSize: 12, color: Colors.text.tertiary, fontWeight: '600', marginBottom: 4 },
  addressLine: { fontSize: 14, color: Colors.text.primary, lineHeight: 20 },
  socialTitle: { fontSize: 16, fontWeight: '700', color: Colors.text.primary, marginTop: 24, marginBottom: 12 },
  socialRow: { flexDirection: 'row', gap: 14 },
  socialBtn: {
    width: 52, height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center',
  },
});
