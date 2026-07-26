import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useAuth } from '@clerk/expo';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { Colors, Spacing } from '../../constants/theme';
import { ApiService, RegisterProfileData } from '../../services/api';
import { ProfileSkeleton } from '../../components/ui/SkeletonLoader';
import { CloudinaryMedia } from '../../components/ui/CloudinaryMedia';

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

export function ProfileScreen() {
  const { getToken, isSignedIn, signOut } = useAuth();
  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [cities, setCities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeModal, setActiveModal] = useState<'PERSONAL' | 'ADDRESS' | 'BUSINESS' | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form States
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState<'MALE' | 'FEMALE' | 'OTHER'>('MALE');
  const [bloodGroup, setBloodGroup] = useState<any>('O_POSITIVE');
  const [address, setAddress] = useState('');
  const [cityId, setCityId] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [occupation, setOccupation] = useState('');
  const [organization, setOrganization] = useState('');
  const [designation, setDesignation] = useState('');

  const loadProfile = async () => {
    try {
      if (isSignedIn) {
        const token = await getToken();
        if (token) {
          const [data, citiesList] = await Promise.all([
            ApiService.getMe(token),
            ApiService.getCities().catch(() => []),
          ]);
          setUser(data);
          setCities(citiesList || []);

          if (data?.profile) {
            setFirstName(data.profile.firstName || '');
            setLastName(data.profile.lastName || '');
            setPhone(data.phone || '');
            if (data.profile.gender) setGender(data.profile.gender);
            if (data.profile.bloodGroup) setBloodGroup(data.profile.bloodGroup);
            setAddress(data.profile.address || '');
            setCityId(data.profile.cityId || '');
            setPinCode(data.profile.pinCode || '');
            setOccupation(data.profile.occupation || '');
            setOrganization(data.profile.organization || '');
            setDesignation(data.profile.designation || '');
          }
        }
      }
    } catch (err) {
      console.error('Load profile error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isSignedIn) {
      void loadProfile();
    } else {
      setLoading(false);
    }
  }, [isSignedIn]);

  // Handle Cloudinary Avatar Upload
  const handleUploadAvatarSuccess = async (base64OrUri: string) => {
    try {
      const token = await getToken();
      if (token) {
        const updated = await ApiService.uploadAvatar(token, base64OrUri);
        setUser((prev: any) => ({
          ...prev,
          avatarUrl: updated?.avatarUrl || base64OrUri,
          profile: { ...prev?.profile, avatarUrl: updated?.avatarUrl || base64OrUri },
        }));
        await loadProfile();
        Alert.alert('Success 🎉', 'Profile photo updated successfully!');
      }
    } catch (err: any) {
      Alert.alert('Upload Error', err.message || 'Failed to update avatar photo');
    }
  };

  // Realtime GPS Location Fetch with Native Module Safety Guard
  const handleFetchCurrentLocation = async () => {
    try {
      setIsLocating(true);
      if (!Location || typeof Location.requestForegroundPermissionsAsync !== 'function') {
        Alert.alert(
          'Location Module Native Setup',
          'Expo Location native plugin added. Rebuilding Android dev client...'
        );
        return;
      }

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Permission to access GPS location was denied.');
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const geocoded = await Location.reverseGeocodeAsync({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });

      if (geocoded && geocoded.length > 0) {
        const loc = geocoded[0];
        const formattedAddress = [loc.name, loc.street, loc.subregion, loc.district]
          .filter(Boolean)
          .join(', ');

        if (formattedAddress) setAddress(formattedAddress);
        if (loc.postalCode) setPinCode(loc.postalCode);

        // Auto-select city chip if matched
        const cityName = loc.city || loc.subregion || loc.district;
        if (cityName && cities.length > 0) {
          const matched = cities.find((c) =>
            c.name.toLowerCase().includes(cityName.toLowerCase())
          );
          if (matched) setCityId(matched.id);
        }

        Alert.alert('Location Updated 📍', `Detected: ${cityName || 'Current Address'}`);
      }
    } catch (err: any) {
      console.error('Fetch location error:', err);
      Alert.alert('Location Error', err.message || 'Could not fetch current GPS location.');
    } finally {
      setIsLocating(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      setErrorMessage('First Name and Last Name are required');
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      const token = await getToken();
      if (!token) throw new Error('Authentication required');

      const payload: RegisterProfileData = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim() || undefined,
        gender,
        bloodGroup,
        address: address.trim() || undefined,
        cityId: cityId || undefined,
        pinCode: pinCode.trim() || undefined,
        occupation: occupation.trim() || undefined,
        organization: organization.trim() || undefined,
        designation: designation.trim() || undefined,
      };

      const result = await ApiService.registerProfile(token, payload);
      if (result?.user) setUser(result.user);
      setActiveModal(null);
      await loadProfile();
      Alert.alert('Success', 'Profile updated successfully!');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save profile changes');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSignOut = async () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          router.replace('/(auth)/sign-in');
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ProfileSkeleton />
      </View>
    );
  }

  const profile = user?.profile;
  const displayName = user?.fullName || (profile?.firstName ? `${profile.firstName} ${profile.lastName}` : 'Member Profile');
  const memberIdStr = user?.memberId || 'MYS/01234';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header Profile Section — Wireframe 10 with Cloudinary */}
      <View style={styles.profileHeaderCard}>
        <CloudinaryMedia
          imageUri={user?.avatarUrl || profile?.avatarUrl}
          fallbackInitials={displayName[0] || 'M'}
          width={88}
          height={88}
          borderRadius={44}
          allowUpload={true}
          allowDownload={true}
          onUploadSuccess={handleUploadAvatarSuccess}
          transformOptions={{ crop: 'fill', gravity: 'face', quality: 'auto' }}
          style={{ marginBottom: 12 }}
        />

        <Text style={styles.displayNameText}>{displayName}</Text>
        <Text style={styles.memberIdText}>Member ID: {memberIdStr}</Text>

        <View style={styles.activeMemberBadge}>
          <Text style={styles.activeMemberBadgeText}>
            {user?.status === 'ACTIVE' ? 'Active Member' : user?.status || 'Active Member'}
          </Text>
        </View>
      </View>

      {/* Menu List Options — Wireframe 10 */}
      <View style={styles.menuContainer}>
        {/* 1. Personal Information */}
        <TouchableOpacity style={styles.menuRow} onPress={() => setActiveModal('PERSONAL')}>
          <View style={styles.menuIconCircle}>
            <Ionicons name="person-outline" size={20} color={Colors.primary[500]} />
          </View>
          <View style={styles.menuTextContent}>
            <Text style={styles.menuTitle}>Personal Information</Text>
            <Text style={styles.menuSub}>Name, Gender, Blood Group</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={Colors.neutral[400]} />
        </TouchableOpacity>

        {/* 2. Address */}
        <TouchableOpacity style={styles.menuRow} onPress={() => setActiveModal('ADDRESS')}>
          <View style={styles.menuIconCircle}>
            <Ionicons name="location-outline" size={20} color={Colors.primary[500]} />
          </View>
          <View style={styles.menuTextContent}>
            <Text style={styles.menuTitle}>Address</Text>
            <Text style={styles.menuSub}>{profile?.city?.name || 'Ranchi'}, Jharkhand</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={Colors.neutral[400]} />
        </TouchableOpacity>

        {/* 3. Business / Occupation */}
        <TouchableOpacity style={styles.menuRow} onPress={() => setActiveModal('BUSINESS')}>
          <View style={styles.menuIconCircle}>
            <Ionicons name="briefcase-outline" size={20} color={Colors.primary[500]} />
          </View>
          <View style={styles.menuTextContent}>
            <Text style={styles.menuTitle}>Business / Occupation</Text>
            <Text style={styles.menuSub}>{profile?.occupation || 'Add your profession'}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={Colors.neutral[400]} />
        </TouchableOpacity>

        {/* 4. Change Password */}
        <TouchableOpacity
          style={styles.menuRow}
          onPress={() => router.push('/(member)/change-password')}
        >
          <View style={styles.menuIconCircle}>
            <Ionicons name="lock-closed-outline" size={20} color={Colors.primary[500]} />
          </View>
          <View style={styles.menuTextContent}>
            <Text style={styles.menuTitle}>Change Password</Text>
            <Text style={styles.menuSub}>Reset account credentials via Clerk</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={Colors.neutral[400]} />
        </TouchableOpacity>

        {/* 5. Downloads */}
        <TouchableOpacity
          style={styles.menuRow}
          onPress={() => Alert.alert('Downloads', 'No downloadable documents available at this time.')}
        >
          <View style={styles.menuIconCircle}>
            <Ionicons name="cloud-download-outline" size={20} color={Colors.primary[500]} />
          </View>
          <View style={styles.menuTextContent}>
            <Text style={styles.menuTitle}>Downloads</Text>
            <Text style={styles.menuSub}>Forms & ID Documents</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={Colors.neutral[400]} />
        </TouchableOpacity>
      </View>

      {/* Sign Out Button — Wireframe 10 */}
      <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
        <Ionicons name="log-out-outline" size={20} color="#E53E3E" style={{ marginRight: 8 }} />
        <Text style={styles.signOutBtnText}>Sign Out Account</Text>
      </TouchableOpacity>

      {/* Edit Profile Section Modal with KeyboardAvoidingView Fix for Android & iOS */}
      <Modal visible={Boolean(activeModal)} animationType="slide" transparent={true}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalHeaderTitle}>
                {activeModal === 'PERSONAL' && 'Edit Personal Info'}
                {activeModal === 'ADDRESS' && 'Edit Address Details'}
                {activeModal === 'BUSINESS' && 'Edit Business / Occupation'}
              </Text>
              <TouchableOpacity onPress={() => setActiveModal(null)}>
                <Ionicons name="close" size={24} color={Colors.text.primary} />
              </TouchableOpacity>
            </View>

            {errorMessage && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            )}

            <ScrollView
              style={styles.formScroll}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 24 }}
            >
              {activeModal === 'PERSONAL' && (
                <>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>First Name *</Text>
                    <TextInput style={styles.input} value={firstName} onChangeText={setFirstName} placeholder="First Name" />
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Last Name *</Text>
                    <TextInput style={styles.input} value={lastName} onChangeText={setLastName} placeholder="Last Name" />
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Phone Number</Text>
                    <TextInput style={styles.input} value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="Mobile Number" />
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Gender</Text>
                    <View style={styles.chipRow}>
                      {GENDERS.map((g) => (
                        <TouchableOpacity
                          key={g.value}
                          style={[styles.chip, gender === g.value && styles.chipActive]}
                          onPress={() => setGender(g.value as any)}
                        >
                          <Text style={[styles.chipText, gender === g.value && styles.chipTextActive]}>{g.label}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Blood Group</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      {BLOOD_GROUPS.map((bg) => (
                        <TouchableOpacity
                          key={bg.value}
                          style={[styles.chip, bloodGroup === bg.value && styles.chipActive]}
                          onPress={() => setBloodGroup(bg.value as any)}
                        >
                          <Text style={[styles.chipText, bloodGroup === bg.value && styles.chipTextActive]}>{bg.label}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                </>
              )}

              {activeModal === 'ADDRESS' && (
                <>
                  {/* Realtime GPS Location Button */}
                  <TouchableOpacity
                    style={styles.locationCtaBtn}
                    onPress={handleFetchCurrentLocation}
                    disabled={isLocating}
                  >
                    {isLocating ? (
                      <ActivityIndicator color={Colors.primary[500]} size="small" />
                    ) : (
                      <>
                        <Ionicons name="navigate-circle" size={20} color={Colors.primary[500]} style={{ marginRight: 6 }} />
                        <Text style={styles.locationCtaText}>Use My Current Location</Text>
                      </>
                    )}
                  </TouchableOpacity>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Residential Address</Text>
                    <TextInput
                      style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                      multiline
                      value={address}
                      onChangeText={setAddress}
                      placeholder="Street / Colony Address"
                    />
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>City Chapter</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      {cities.map((c) => (
                        <TouchableOpacity
                          key={c.id}
                          style={[styles.chip, cityId === c.id && styles.chipActive]}
                          onPress={() => setCityId(c.id)}
                        >
                          <Text style={[styles.chipText, cityId === c.id && styles.chipTextActive]}>{c.name}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Pin Code</Text>
                    <TextInput style={styles.input} value={pinCode} onChangeText={setPinCode} keyboardType="number-pad" maxLength={6} placeholder="Pin Code" />
                  </View>
                </>
              )}

              {activeModal === 'BUSINESS' && (
                <>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Occupation / Profession</Text>
                    <TextInput style={styles.input} value={occupation} onChangeText={setOccupation} placeholder="e.g. Business, Engineer, Doctor, CA" />
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Company / Firm Name</Text>
                    <TextInput style={styles.input} value={organization} onChangeText={setOrganization} placeholder="Organization Name" />
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Designation</Text>
                    <TextInput style={styles.input} value={designation} onChangeText={setDesignation} placeholder="e.g. Director, Partner, Manager" />
                  </View>
                </>
              )}

              <TouchableOpacity
                style={[styles.saveBtn, isSaving && styles.btnDisabled]}
                onPress={handleSaveProfile}
                disabled={isSaving}
              >
                {isSaving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.saveBtnText}>Save Details</Text>}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ScrollView>
  );
}

export default ProfileScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  content: {
    padding: Spacing.md,
    paddingBottom: 40,
  },
  profileHeaderCard: {
    backgroundColor: Colors.primary[500],
    borderRadius: Spacing.radiusLg,
    padding: Spacing.lg,
    alignItems: 'center',
    marginBottom: Spacing.md,
    elevation: 3,
  },
  displayNameText: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.neutral[0],
  },
  memberIdText: {
    fontSize: 13,
    color: Colors.secondary[300],
    fontWeight: '600',
    marginTop: 2,
  },
  activeMemberBadge: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 10,
  },
  activeMemberBadgeText: {
    color: Colors.secondary[500],
    fontSize: 12,
    fontWeight: '700',
  },
  menuContainer: {
    backgroundColor: Colors.neutral[0],
    borderRadius: Spacing.radiusLg,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#EDF2F7',
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#EDF2F7',
  },
  menuIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFF5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuTextContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  menuSub: {
    fontSize: 12,
    color: Colors.text.tertiary,
    marginTop: 2,
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.neutral[0],
    borderRadius: Spacing.radiusMd,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#FEB2B2',
  },
  signOutBtnText: {
    color: '#E53E3E',
    fontWeight: '700',
    fontSize: 15,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: Spacing.md,
    maxHeight: '88%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EDF2F7',
  },
  modalHeaderTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primary[900],
  },
  formScroll: {
    marginTop: 12,
  },
  errorBox: {
    backgroundColor: Colors.error.light,
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
    borderLeftWidth: 4,
    borderLeftColor: Colors.error.main,
  },
  errorText: {
    color: Colors.error.dark,
    fontSize: 12,
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text.secondary,
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.text.primary,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginRight: 6,
  },
  chipActive: {
    backgroundColor: Colors.primary[500],
    borderColor: Colors.primary[500],
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text.secondary,
  },
  chipTextActive: {
    color: Colors.neutral[0],
    fontWeight: '700',
  },
  locationCtaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF5F5',
    borderWidth: 1,
    borderColor: '#FEB2B2',
    borderRadius: 8,
    paddingVertical: 10,
    marginBottom: 14,
  },
  locationCtaText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary[500],
  },
  saveBtn: {
    backgroundColor: Colors.primary[500],
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 30,
  },
  btnDisabled: {
    opacity: 0.65,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
