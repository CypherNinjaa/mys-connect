import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Image,
  Dimensions,
  StatusBar,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@clerk/expo';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing } from '../../constants/theme';
import { ApiService, RegisterProfileData } from '../../services/api';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

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

const DEFAULT_CITIES = [
  { id: 'city_ranchi', name: 'Ranchi' },
  { id: 'city_jamshedpur', name: 'Jamshedpur' },
  { id: 'city_dhanbad', name: 'Dhanbad' },
  { id: 'city_bokaro', name: 'Bokaro' },
  { id: 'city_hazaribagh', name: 'Hazaribagh' },
  { id: 'city_giridih', name: 'Giridih' },
  { id: 'city_deoghar', name: 'Deoghar' },
  { id: 'city_ramgarh', name: 'Ramgarh' },
  { id: 'city_dumka', name: 'Dumka' },
];

export default function CompleteProfileScreen() {
  const { getToken } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [cities, setCities] = useState<Array<{ id: string; name: string }>>(DEFAULT_CITIES);
  const [loadingCities, setLoadingCities] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form Fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState<'MALE' | 'FEMALE' | 'OTHER'>('MALE');
  const [bloodGroup, setBloodGroup] = useState<any>('O_POSITIVE');
  const [dateOfBirth, setDateOfBirth] = useState('');

  const [address, setAddress] = useState('');
  const [cityId, setCityId] = useState(DEFAULT_CITIES[0].id);
  const [pinCode, setPinCode] = useState('');

  const [occupation, setOccupation] = useState('');
  const [organization, setOrganization] = useState('');
  const [designation, setDesignation] = useState('');

  // Fetch Cities on mount
  useEffect(() => {
    async function loadCities() {
      try {
        const data = await ApiService.getCities();
        if (data && data.length > 0) {
          setCities(data);
          setCityId(data[0].id);
        }
      } catch (err) {
        console.warn('Backend connection warning, loaded fallback city list');
      } finally {
        setLoadingCities(false);
      }
    }
    loadCities();
  }, []);

  const validateCurrentStep = () => {
    setErrorMessage(null);
    if (step === 1) {
      if (!firstName.trim() || !lastName.trim()) {
        setErrorMessage('First Name and Last Name are required.');
        return false;
      }
      if (!phone.trim()) {
        setErrorMessage('Phone number is required.');
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (!validateCurrentStep()) return;
    if (step < 3) {
      setStep((prev) => (prev + 1) as any);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep((prev) => (prev - 1) as any);
    }
  };

  const handleSubmit = async () => {
    if (!validateCurrentStep()) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const token = await getToken();
      if (!token) {
        throw new Error('Authentication token missing. Please sign in again.');
      }

      const profilePayload: RegisterProfileData = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim(),
        gender,
        bloodGroup,
        dateOfBirth: dateOfBirth.trim() || undefined,
        address: address.trim() || undefined,
        cityId: cityId || undefined,
        pinCode: pinCode.trim() || undefined,
        occupation: occupation.trim() || undefined,
        organization: organization.trim() || undefined,
        designation: designation.trim() || undefined,
      };

      await ApiService.registerProfile(token, profilePayload);
      router.replace('/(member)/home');
    } catch (err: any) {
      console.error('Registration error:', err);
      setErrorMessage(err.message || 'Failed to submit profile registration.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAF6F0" />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header Branding */}
        <View style={styles.header}>
          <Image
            source={require('../../../assets/images/mys-logo.jpg')}
            style={styles.logoImage}
            resizeMode="contain"
          />
          <Text style={styles.welcomeTitle}>Complete Profile</Text>
          <Text style={styles.welcomeSubtitle}>Set up your profile details to unlock full features</Text>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${(step / 3) * 100}%` }]} />
          </View>
          <Text style={styles.progressText}>Step {step} of 3</Text>
        </View>

        {errorMessage && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        )}

        {/* Step 1: Personal Details */}
        {step === 1 && (
          <View style={styles.stepCard}>
            <Text style={styles.sectionTitle}>1. Personal Information</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>First Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Rahul"
                placeholderTextColor="#A0AEC0"
                value={firstName}
                onChangeText={setFirstName}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Last Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Maheshwari"
                placeholderTextColor="#A0AEC0"
                value={lastName}
                onChangeText={setLastName}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Phone / Mobile Number *</Text>
              <TextInput
                style={styles.input}
                placeholder="+91 9876543210"
                placeholderTextColor="#A0AEC0"
                value={phone}
                onChangeText={setPhone}
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
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalChips}>
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
              <Text style={styles.label}>Date of Birth (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.input}
                placeholder="1995-08-15"
                placeholderTextColor="#A0AEC0"
                value={dateOfBirth}
                onChangeText={setDateOfBirth}
              />
            </View>
          </View>
        )}

        {/* Step 2: Address & Location */}
        {step === 2 && (
          <View style={styles.stepCard}>
            <Text style={styles.sectionTitle}>2. Address & Location</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>City (Chapter Location) *</Text>
              {loadingCities ? (
                <ActivityIndicator color={Colors.primary[500]} />
              ) : (
                <View style={styles.chipGrid}>
                  {cities.map((c) => (
                    <TouchableOpacity
                      key={c.id}
                      style={[styles.chip, cityId === c.id && styles.chipActive]}
                      onPress={() => setCityId(c.id)}
                    >
                      <Text style={[styles.chipText, cityId === c.id && styles.chipTextActive]}>
                        {c.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Residential Address</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Street name, locality..."
                placeholderTextColor="#A0AEC0"
                value={address}
                onChangeText={setAddress}
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Pincode</Text>
              <TextInput
                style={styles.input}
                placeholder="834001"
                placeholderTextColor="#A0AEC0"
                value={pinCode}
                onChangeText={setPinCode}
                keyboardType="numeric"
              />
            </View>
          </View>
        )}

        {/* Step 3: Professional Info */}
        {step === 3 && (
          <View style={styles.stepCard}>
            <Text style={styles.sectionTitle}>3. Professional Profile</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Occupation / Field</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Business, Software Engineer, CA..."
                placeholderTextColor="#A0AEC0"
                value={occupation}
                onChangeText={setOccupation}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Organization / Firm Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Company or Business name"
                placeholderTextColor="#A0AEC0"
                value={organization}
                onChangeText={setOrganization}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Designation</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Director, Manager, Owner..."
                placeholderTextColor="#A0AEC0"
                value={designation}
                onChangeText={setDesignation}
              />
            </View>
          </View>
        )}

        {/* Navigation Buttons */}
        <View style={styles.navRow}>
          {step > 1 ? (
            <TouchableOpacity style={styles.secondaryButton} onPress={handleBack}>
              <Text style={styles.secondaryButtonText}>Previous</Text>
            </TouchableOpacity>
          ) : <View />}

          {step < 3 ? (
            <TouchableOpacity style={styles.primaryButton} onPress={handleNext}>
              <Text style={styles.primaryButtonText}>Next Step</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.primaryButton, isSubmitting && styles.disabledButton]}
              onPress={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryButtonText}>Submit Profile</Text>
              )}
            </TouchableOpacity>
          )}
        </View>

        <View style={{ height: 140 }} />
      </ScrollView>

      {/* Architectural Mahal Background Graphic */}
      <View style={styles.mahalWrapper} pointerEvents="none">
        <Image
          source={require('../../../assets/images/mahal-bg.png')}
          style={styles.mahalImage}
          resizeMode="cover"
        />
      </View>

      {/* Bottom Royal Gold/Maroon Wave Banner */}
      <View style={styles.bottomWaveContainer} pointerEvents="none">
        <View style={styles.goldLine} />
        <View style={styles.maroonWave} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF6F0',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 12,
    zIndex: 10,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logoImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 12,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1A202C',
    textAlign: 'center',
  },
  welcomeSubtitle: {
    fontSize: 13,
    color: '#718096',
    marginTop: 4,
    textAlign: 'center',
  },
  progressContainer: {
    marginBottom: 20,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Colors.primary[500],
  },
  progressText: {
    fontSize: 12,
    color: '#718096',
    marginTop: 4,
    textAlign: 'right',
    fontWeight: '600',
  },
  errorBox: {
    backgroundColor: Colors.error.light,
    borderRadius: 12,
    padding: Spacing.md,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: Colors.error.main,
  },
  errorText: {
    color: Colors.error.dark,
    fontSize: 13,
    lineHeight: 18,
  },
  stepCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.primary[500],
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4A5568',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#2D3748',
    backgroundColor: '#FAF6F0',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  horizontalChips: {
    flexDirection: 'row',
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#EDF2F7',
    borderWidth: 1,
    borderColor: '#CBD5E0',
    marginRight: 6,
  },
  chipActive: {
    backgroundColor: Colors.primary[500],
    borderColor: Colors.primary[500],
  },
  chipText: {
    fontSize: 13,
    color: '#4A5568',
    fontWeight: '600',
  },
  chipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  secondaryButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.primary[500],
    backgroundColor: '#FFFFFF',
  },
  secondaryButtonText: {
    color: Colors.primary[500],
    fontWeight: '700',
    fontSize: 15,
  },
  primaryButton: {
    backgroundColor: Colors.primary[500],
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 12,
  },
  disabledButton: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  mahalWrapper: {
    position: 'absolute',
    bottom: 50,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT * 0.32,
    alignItems: 'center',
    justifyContent: 'flex-end',
    opacity: 0.45,
    zIndex: 1,
  },
  mahalImage: {
    width: SCREEN_WIDTH,
    height: '100%',
  },
  bottomWaveContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 70,
    zIndex: 5,
  },
  goldLine: {
    height: 4,
    backgroundColor: Colors.secondary[500],
    borderTopLeftRadius: 50,
    borderTopRightRadius: 50,
  },
  maroonWave: {
    flex: 1,
    backgroundColor: Colors.primary[500],
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
});
