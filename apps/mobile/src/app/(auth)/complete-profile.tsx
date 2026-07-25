import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import { useAuth } from '@clerk/expo';
import { useRouter } from 'expo-router';
import { Colors, Spacing, Typography } from '../../constants/theme';
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

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
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

  const [fatherName, setFatherName] = useState('');
  const [nativePlace, setNativePlace] = useState('');

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
    if (step < 4) {
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
        fatherName: fatherName.trim() || undefined,
        nativePlace: nativePlace.trim() || undefined,
        occupation: occupation.trim() || undefined,
        organization: organization.trim() || undefined,
        designation: designation.trim() || undefined,
      };

      await ApiService.registerProfile(token, profilePayload);
      router.replace('/(auth)/pending-approval');
    } catch (err: any) {
      console.error('Registration error:', err);
      setErrorMessage(err.message || 'Failed to submit profile registration.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Progress Indicator */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${(step / 4) * 100}%` }]} />
        </View>
        <Text style={styles.progressText}>Step {step} of 4</Text>
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
              placeholderTextColor={Colors.neutral[400]}
              value={firstName}
              onChangeText={setFirstName}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Last Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Maheshwari"
              placeholderTextColor={Colors.neutral[400]}
              value={lastName}
              onChangeText={setLastName}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Phone / Mobile Number *</Text>
            <TextInput
              style={styles.input}
              placeholder="+91 9876543210"
              placeholderTextColor={Colors.neutral[400]}
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
              placeholderTextColor={Colors.neutral[400]}
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
              placeholderTextColor={Colors.neutral[400]}
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
              placeholderTextColor={Colors.neutral[400]}
              value={pinCode}
              onChangeText={setPinCode}
              keyboardType="numeric"
            />
          </View>
        </View>
      )}

      {/* Step 3: Family & Cultural */}
      {step === 3 && (
        <View style={styles.stepCard}>
          <Text style={styles.sectionTitle}>3. Family & Cultural Details</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Father's Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Shri..."
              placeholderTextColor={Colors.neutral[400]}
              value={fatherName}
              onChangeText={setFatherName}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Native Place (Mul Nivas)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Didwana, Bikaner, Nagaur..."
              placeholderTextColor={Colors.neutral[400]}
              value={nativePlace}
              onChangeText={setNativePlace}
            />
          </View>
        </View>
      )}

      {/* Step 4: Professional Info */}
      {step === 4 && (
        <View style={styles.stepCard}>
          <Text style={styles.sectionTitle}>4. Professional Profile</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Occupation / Field</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Business, Software Engineer, CA..."
              placeholderTextColor={Colors.neutral[400]}
              value={occupation}
              onChangeText={setOccupation}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Organization / Firm Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Company or Business name"
              placeholderTextColor={Colors.neutral[400]}
              value={organization}
              onChangeText={setOrganization}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Designation</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Director, Manager, Owner..."
              placeholderTextColor={Colors.neutral[400]}
              value={designation}
              onChangeText={setDesignation}
            />
          </View>
        </View>
      )}

      {/* Navigation Controls */}
      <View style={styles.navRow}>
        {step > 1 ? (
          <TouchableOpacity style={styles.secondaryButton} onPress={handleBack}>
            <Text style={styles.secondaryButtonText}>Previous</Text>
          </TouchableOpacity>
        ) : <View />}

        {step < 4 ? (
          <TouchableOpacity style={styles.primaryButton} onPress={handleNext}>
            <Text style={styles.primaryButtonText}>Next Step</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.primaryButton, styles.submitButton, isSubmitting && styles.disabledButton]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color={Colors.neutral[0]} />
            ) : (
              <Text style={styles.primaryButtonText}>Submit Profile</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
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
  progressContainer: {
    marginBottom: Spacing.md,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: Colors.border.default,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Colors.primary[500],
  },
  progressText: {
    fontSize: 12,
    color: Colors.text.tertiary,
    marginTop: 4,
    textAlign: 'right',
  },
  errorBox: {
    backgroundColor: Colors.error.light,
    borderRadius: Spacing.radiusSm,
    padding: Spacing.sm,
    marginBottom: Spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: Colors.error.main,
  },
  errorText: {
    color: Colors.error.dark,
    fontSize: 13,
  },
  stepCard: {
    backgroundColor: Colors.neutral[0],
    borderRadius: Spacing.radiusLg,
    padding: Spacing.lg,
    elevation: 3,
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primary[500],
    marginBottom: Spacing.lg,
  },
  inputGroup: {
    marginBottom: Spacing.md,
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
    borderRadius: Spacing.radiusMd,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    fontSize: 15,
    color: Colors.text.primary,
    backgroundColor: Colors.neutral[50],
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
    borderRadius: Spacing.radiusFull,
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
    fontWeight: '500',
  },
  chipTextActive: {
    color: Colors.neutral[0],
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
    borderRadius: Spacing.radiusMd,
    borderWidth: 1,
    borderColor: Colors.border.dark,
  },
  secondaryButtonText: {
    color: Colors.text.secondary,
    fontWeight: '600',
    fontSize: 15,
  },
  primaryButton: {
    backgroundColor: Colors.primary[500],
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: Spacing.radiusMd,
  },
  submitButton: {
    backgroundColor: Colors.secondary[600],
  },
  disabledButton: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: Colors.neutral[0],
    fontWeight: '700',
    fontSize: 15,
  },
});
