import React, { useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  BackHandler,
  Linking,
} from 'react-native';
import { useCustomAlert } from '../../context/CustomAlertContext';
import { useRouter } from 'expo-router';
import { useAuth, useClerk } from '@clerk/expo';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, APP } from '../../constants/theme';
import { unregisterPushNotificationsAsync } from '../../services/notifications.service';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface SettingItem {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  color?: string;
  danger?: boolean;
}

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { signOut } = useClerk();
  const { isSignedIn, getToken } = useAuth();
  const { showAlert } = useCustomAlert();

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(member)/home');
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

  const handleLogout = () => {
    showAlert({
      title: 'Sign Out',
      message: 'Are you sure you want to sign out?',
      type: 'confirm',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              // Detach this device's push token before the session goes away.
              await unregisterPushNotificationsAsync(getToken);
              await signOut();
              router.replace('/(auth)/sign-in');
            } catch (err) {
              console.error('Sign out error:', err);
            }
          },
        },
      ],
    });
  };

  const handleDeleteAccount = () => {
    showAlert({
      title: 'Delete Account',
      message: 'This action is irreversible. All your data will be permanently deleted. Are you sure?',
      type: 'warning',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            showAlert({
              title: 'Contact Admin',
              message: 'To delete your account, please contact the MYS admin team at info@mysranchi.org',
              type: 'info',
            });
          },
        },
      ],
    });
  };

  const sections: { title: string; items: SettingItem[] }[] = [
    {
      title: 'Account',
      items: [
        {
          icon: 'person-outline',
          label: 'Edit Profile',
          onPress: () => router.push('/(member)/profile'),
        },
        {
          icon: 'lock-closed-outline',
          label: 'Change Password',
          onPress: () => router.push('/(member)/change-password'),
        },
      ],
    },
    {
      title: 'Information',
      items: [
        {
          icon: 'information-circle-outline',
          label: 'About Us',
          onPress: () => router.push('/(member)/about'),
        },
        {
          icon: 'call-outline',
          label: 'Contact Us',
          onPress: () => router.push('/(member)/contact'),
        },
        {
          icon: 'download-outline',
          label: 'Downloads',
          onPress: () => router.push('/(member)/downloads'),
        },
      ],
    },
    {
      title: 'Legal',
      items: [
        {
          icon: 'shield-checkmark-outline',
          label: 'Privacy Policy',
          onPress: () => Linking.openURL('https://mysranchi.org/privacy'),
        },
        {
          icon: 'document-text-outline',
          label: 'Terms of Service',
          onPress: () => Linking.openURL('https://mysranchi.org/terms'),
        },
      ],
    },
    {
      title: 'Danger Zone',
      items: [
        {
          icon: 'log-out-outline',
          label: 'Sign Out',
          onPress: handleLogout,
          danger: true,
        },
        {
          icon: 'trash-outline',
          label: 'Delete Account',
          onPress: handleDeleteAccount,
          danger: true,
          color: Colors.error.main,
        },
      ],
    },
  ];

  return (
    <View style={styles.container}>
      <View style={[styles.headerBar, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.neutral[0]} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {sections.map((section, si) => (
          <View key={si} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.sectionCard}>
              {section.items.map((item, ii) => (
                <TouchableOpacity
                  key={ii}
                  style={[styles.settingRow, ii < section.items.length - 1 && styles.settingRowBorder]}
                  onPress={item.onPress}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={item.icon}
                    size={20}
                    color={item.color || (item.danger ? Colors.error.main : Colors.primary[500])}
                    style={{ marginRight: 14 }}
                  />
                  <Text
                    style={[
                      styles.settingLabel,
                      item.danger && { color: item.color || Colors.error.main },
                    ]}
                  >
                    {item.label}
                  </Text>
                  <Ionicons name="chevron-forward" size={16} color="#A0AEC0" />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        <View style={styles.footer}>
          <Text style={styles.footerText}>{APP.name}</Text>
          <Text style={styles.footerVersion}>Version 1.0.0</Text>
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
  content: { paddingBottom: 40 },
  section: { marginTop: 16, paddingHorizontal: Spacing.md },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: Colors.text.tertiary, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  sectionCard: {
    backgroundColor: Colors.neutral[0], borderRadius: 12, overflow: 'hidden',
    borderWidth: 1, borderColor: '#EDF2F7', elevation: 1,
  },
  settingRow: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14,
  },
  settingRowBorder: { borderBottomWidth: 1, borderBottomColor: '#EDF2F7' },
  settingLabel: { flex: 1, fontSize: 15, color: Colors.text.primary, fontWeight: '500' },
  footer: { alignItems: 'center', marginTop: 32, paddingBottom: 20 },
  footerText: { fontSize: 14, fontWeight: '700', color: Colors.primary[500] },
  footerVersion: { fontSize: 12, color: Colors.text.tertiary, marginTop: 4 },
});
