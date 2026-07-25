import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native';
import { useAuth } from '@clerk/expo';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing } from '../../constants/theme';
import { ApiService, RegisterProfileData } from '../../services/api';

const BLOOD_GROUPS = [
  { label: 'A+', value: 'A_POSITIVE' },
  { label: 'A-', value: 'A_NEGATIVE' },
  { label: 'B+', value: 'B_POSITIVE' },
  { label: 'B-', value: 'B_NEGATIVE' },
  { label: 'AB+', value: 'AB_POSITIVE' },
  { label: 'AB-', value: 'AB_NEGATIVE' },
  { label: 'O+', value: 'O_POSITIVE' },
  { label: 'O-', value: 'O_NEGATIVE' },
];

const GENDERS = [
  { label: 'Male', value: 'MALE' },
  { label: 'Female', value: 'FEMALE' },
  { label: 'Other', value: 'OTHER' },
];

export default function ProfileScreen() {
  const { getToken, isSignedIn, signOut } = useAuth();
  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Edit Form Fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState<'MALE' | 'FEMALE' | 'OTHER'>('MALE');
  const [bloodGroup, setBloodGroup] = useState<any>('O_POSITIVE');
  const [address, setAddress] = useState('');
  const [occupation, setOccupation] = useState('');
  const [organization, setOrganization] = useState('');

  const loadProfile = async () => {
    try {
      if (isSignedIn) {
        const token = await getToken();
        if (token) {
          const data = await ApiService.getMe(token);
          setUser(data);
          if (data?.profile) {
            setFirstName(data.profile.firstName || '');
            setLastName(data.profile.lastName || '');
            setPhone(data.phone || data.profile.phone || '');
            if (data.profile.gender) setGender(data.profile.gender);
            if (data.profile.bloodGroup) setBloodGroup(data.profile.bloodGroup);
            setAddress(data.profile.address || '');
            setOccupation(data.profile.occupation || '');
            setOrganization(data.profile.organization || '');
          }
        }
      }
    } catch (err) {
      // Quietly swallow for guest mode
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, [isSignedIn]);

  const handlePickAvatar = async () => {
    try {
      // Safely import expo-image-picker
      const ImagePicker = require('expo-image-picker');
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission?.granted) {
        Alert.alert('Permission Denied', 'Permission to access photo gallery is required.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        setIsUploadingAvatar(true);
        const token = await getToken();
        if (token) {
          const updated = await ApiService.uploadAvatar(token, result.assets[0].uri);
          setUser((prev: any) => ({
            ...prev,
            profile: { ...prev?.profile, avatarUrl: updated?.avatarUrl || updated },
          }));
          await loadProfile();
        }
      }
    } catch (err: any) {
      console.error('Image picker error:', err);
      if (err?.message?.includes('ExponentImagePicker')) {
        Alert.alert(
          'Rebuild Required',
          'A new native module was added. Please re-run "npx expo run:android" in your mobile terminal to rebuild the app binary.'
        );
      } else {
        Alert.alert('Upload Error', err.message || 'Failed to pick image.');
      }
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      setErrorMessage('First Name and Last Name are required.');
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      const token = await getToken();
      if (!token) throw new Error('Sign in required.');

      const payload: RegisterProfileData = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim() || undefined,
        gender,
        bloodGroup,
        address: address.trim() || undefined,
        occupation: occupation.trim() || undefined,
        organization: organization.trim() || undefined,
      };

      const result = await ApiService.registerProfile(token, payload);
      if (result) {
        setUser(result.user || result);
      }
      setIsEditing(false);
      await loadProfile();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update profile.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.replace('/(auth)/sign-in');
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary[500]} />
      </View>
    );
  }

  const profile = user?.profile;
  const isRealEmail = user?.email && !user.email.includes('@user.clerk') && !user.email.includes('user_');

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header Avatar & Info */}
      <View style={styles.profileHeader}>
        {/* Cloudinary Avatar Uploader */}
        <TouchableOpacity
          style={styles.avatarWrapper}
          onPress={handlePickAvatar}
          activeOpacity={0.8}
        >
          <View style={styles.avatarCircle}>
            {isUploadingAvatar ? (
              <ActivityIndicator color={Colors.secondary[500]} />
            ) : profile?.avatarUrl ? (
              <Image source={{ uri: profile.avatarUrl }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarText}>
                {profile?.firstName ? profile.firstName[0].toUpperCase() : 'M'}
              </Text>
            )}
          </View>

          {/* Camera Badge */}
          <View style={styles.cameraBadge}>
            <Ionicons name="camera" size={14} color="#FFFFFF" />
          </View>
        </TouchableOpacity>

        <Text style={styles.nameText}>
          {profile?.firstName ? `${profile.firstName} ${profile.lastName}` : 'Member'}
        </Text>
        
        {/* Only display real user emails; hide internal Clerk IDs */}
        {isRealEmail && <Text style={styles.emailText}>{user.email}</Text>}

        <View style={styles.statusBadge}>
          <Text style={styles.statusBadgeText}>{user?.status || 'ACTIVE'}</Text>
        </View>

        {/* Edit Profile Toggle Button */}
        <TouchableOpacity
          style={styles.editToggleBtn}
          onPress={() => setIsEditing(!isEditing)}
        >
          <Ionicons
            name={isEditing ? 'close-outline' : 'create-outline'}
            size={18}
            color={Colors.secondary[500]}
          />
          <Text style={styles.editToggleBtnText}>
            {isEditing ? 'Cancel Edit' : 'Edit Profile'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Editing Form inside Profile Tab */}
      {isEditing ? (
        <View style={styles.card}>
          <Text style={styles.cardSectionTitle}>Edit Member Profile</Text>

          {errorMessage && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>First Name *</Text>
            <TextInput
              style={styles.input}
              value={firstName}
              onChangeText={setFirstName}
              placeholder="First Name"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Last Name *</Text>
            <TextInput
              style={styles.input}
              value={lastName}
              onChangeText={setLastName}
              placeholder="Last Name"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Phone Number</Text>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              placeholder="Phone Number"
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Gender</Text>
            <View style={styles.chipRow}>
              {GENDERS.map((g) => (
                <TouchableOpacity
                  key={g.value}
                  style={[styles.chip, gender === g.value && styles.chipActive]}
                  onPress={() => setGender(g.value as any)}
                >
                  <Text style={[styles.chipText, gender === g.value && styles.chipTextActive]}>
                    {g.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Blood Group</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {BLOOD_GROUPS.map((bg) => (
                <TouchableOpacity
                  key={bg.value}
                  style={[styles.chip, bloodGroup === bg.value && styles.chipActive]}
                  onPress={() => setBloodGroup(bg.value as any)}
                >
                  <Text style={[styles.chipText, bloodGroup === bg.value && styles.chipTextActive]}>
                    {bg.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Occupation / Field</Text>
            <TextInput
              style={styles.input}
              value={occupation}
              onChangeText={setOccupation}
              placeholder="e.g. Software Engineer, Business"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Organization Name</Text>
            <TextInput
              style={styles.input}
              value={organization}
              onChangeText={setOrganization}
              placeholder="Company or Firm Name"
            />
          </View>

          <TouchableOpacity
            style={[styles.saveBtn, isSaving && styles.btnDisabled]}
            onPress={handleSaveProfile}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.saveBtnText}>Save Profile Details</Text>
            )}
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {/* Details Card */}
          <View style={styles.card}>
            <Text style={styles.cardSectionTitle}>Personal & Contact Details</Text>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Phone Number</Text>
              <Text style={styles.infoValue}>{user?.phone || 'Not provided'}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Gender</Text>
              <Text style={styles.infoValue}>{profile?.gender || 'N/A'}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Blood Group</Text>
              <Text style={styles.infoValue}>
                {profile?.bloodGroup ? profile.bloodGroup.replace('_', ' ') : 'N/A'}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>City Chapter</Text>
              <Text style={styles.infoValue}>{profile?.city?.name || 'Ranchi'}</Text>
            </View>
          </View>

          {/* Professional Card */}
          <View style={styles.card}>
            <Text style={styles.cardSectionTitle}>Professional Details</Text>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Occupation</Text>
              <Text style={styles.infoValue}>{profile?.occupation || 'Not specified'}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Organization</Text>
              <Text style={styles.infoValue}>{profile?.organization || 'Not specified'}</Text>
            </View>
          </View>

          {/* Sign Out Button */}
          <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
            <Text style={styles.signOutButtonText}>Sign Out Account</Text>
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  content: {
    padding: Spacing.md,
    paddingBottom: 40,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileHeader: {
    backgroundColor: Colors.primary[500],
    borderRadius: Spacing.radiusLg,
    padding: Spacing.xl,
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: Spacing.sm,
  },
  avatarCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: Colors.primary[600],
    borderWidth: 3,
    borderColor: Colors.secondary[500],
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '800',
    color: Colors.secondary[500],
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: Colors.secondary[500],
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.primary[500],
  },
  nameText: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.neutral[0],
  },
  emailText: {
    fontSize: 13,
    color: Colors.primary[100],
    marginTop: 2,
  },
  statusBadge: {
    backgroundColor: Colors.success.light,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: Spacing.radiusSm,
    marginTop: Spacing.sm,
  },
  statusBadgeText: {
    color: Colors.success.dark,
    fontWeight: '700',
    fontSize: 12,
  },
  editToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.secondary[500],
  },
  editToggleBtnText: {
    color: Colors.secondary[500],
    fontWeight: '700',
    fontSize: 13,
  },
  card: {
    backgroundColor: Colors.neutral[0],
    borderRadius: Spacing.radiusMd,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    elevation: 2,
  },
  cardSectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.primary[500],
    marginBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
    paddingBottom: 6,
  },
  errorBox: {
    backgroundColor: Colors.error.light,
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  errorText: {
    color: Colors.error.dark,
    fontSize: 13,
  },
  inputGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text.secondary,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border.default,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.text.primary,
    backgroundColor: Colors.neutral[50],
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.neutral[100],
    borderWidth: 1,
    borderColor: Colors.border.default,
    marginRight: 6,
  },
  chipActive: {
    backgroundColor: Colors.primary[500],
    borderColor: Colors.primary[500],
  },
  chipText: {
    fontSize: 13,
    color: Colors.text.secondary,
  },
  chipTextActive: {
    color: Colors.neutral[0],
    fontWeight: '700',
  },
  saveBtn: {
    backgroundColor: Colors.primary[500],
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 12,
  },
  btnDisabled: {
    opacity: 0.65,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral[100],
  },
  infoLabel: {
    fontSize: 13,
    color: Colors.text.tertiary,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  signOutButton: {
    backgroundColor: Colors.error.dark,
    borderRadius: Spacing.radiusMd,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  signOutButtonText: {
    color: Colors.neutral[0],
    fontWeight: '700',
    fontSize: 15,
  },
});
