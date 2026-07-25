import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Modal,
  Image,
} from 'react-native';
import { useAuth, useSignUp, useClerk } from '@clerk/expo';
import { useRouter, Link } from 'expo-router';
import { Colors, Spacing, APP } from '../../constants/theme';

export default function SignUpScreen() {
  const { isLoaded } = useAuth();
  const { setActive } = useClerk();
  const { signUp, fetchStatus } = useSignUp();
  const router = useRouter();

  const [emailAddress, setEmailAddress] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Handle initial sign up form submission
  const handleSignUp = async () => {
    const trimmedEmail = emailAddress.trim();
    const trimmedPassword = password.trim();

    if (!trimmedEmail || !trimmedPassword) {
      setErrorMessage('Please enter both email address and password.');
      return;
    }

    if (trimmedPassword.length < 8) {
      setErrorMessage('Password must be at least 8 characters long.');
      return;
    }

    if (!isLoaded || !signUp) {
      setErrorMessage('Authentication service loading. Please try again.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      // Use signUp.password strategy for email & password
      const response = await signUp.password({
        emailAddress: trimmedEmail,
        password: trimmedPassword,
      });

      if (response?.error) {
        const err = response.error as any;
        const msg =
          err?.errors?.[0]?.longMessage ||
          err?.errors?.[0]?.message ||
          err?.message ||
          'Failed to create account.';
        setErrorMessage(msg);
        setIsSubmitting(false);
        return;
      }

      // Send email code verification
      await signUp.verifications.sendEmailCode();
      setVerifying(true);
    } catch (err: any) {
      console.error('Sign up error:', err);
      const msg =
        err?.errors?.[0]?.longMessage ||
        err?.errors?.[0]?.message ||
        err?.message ||
        'Failed to create account.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle OTP verification code submission
  const handleVerify = async () => {
    const trimmedCode = code.trim();
    if (!trimmedCode) {
      setErrorMessage('Please enter the 6-digit verification code.');
      return;
    }

    if (!isLoaded || !signUp) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await signUp.verifications.verifyEmailCode({
        code: trimmedCode,
      });

      if (response?.error) {
        const err = response.error as any;
        const msg =
          err?.errors?.[0]?.longMessage ||
          err?.errors?.[0]?.message ||
          err?.message ||
          'Invalid verification code. Please check your email.';
        setErrorMessage(msg);
        setIsSubmitting(false);
        return;
      }

      if (signUp.status === 'complete') {
        if (signUp.createdSessionId && setActive) {
          await setActive({ session: signUp.createdSessionId });
        } else if (signUp.finalize) {
          await signUp.finalize({
            navigate: () => router.replace('/(auth)/complete-profile'),
          });
        }
        setVerifying(false);
        router.replace('/(auth)/complete-profile');
      } else {
        setErrorMessage('Verification incomplete. Please check code.');
      }
    } catch (err: any) {
      console.error('Verification error:', err);
      const msg =
        err?.errors?.[0]?.longMessage ||
        err?.errors?.[0]?.message ||
        err?.message ||
        'Invalid verification code.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLoading = isSubmitting || fetchStatus === 'fetching';

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.flex}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Header Branding with MYS Logo */}
        <View style={styles.header}>
          <Image
            source={require('../../../assets/images/mys-logo.jpg')}
            style={styles.logoImage}
            resizeMode="contain"
          />
          <Text style={styles.title}>{APP.name}</Text>
          <Text style={styles.subtitle}>{APP.orgName}</Text>
        </View>

        {/* Captcha Mount Point for Bot Protection */}
        <View nativeID="clerk-captcha" />

        {/* Form Card */}
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>New Member Registration</Text>

          {errorMessage && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email Address</Text>
            <TextInput
              style={styles.input}
              placeholder="name@domain.com"
              placeholderTextColor={Colors.neutral[400]}
              value={emailAddress}
              onChangeText={(val) => {
                setEmailAddress(val);
                if (errorMessage) setErrorMessage(null);
              }}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password (min. 8 characters)</Text>
            <TextInput
              style={styles.input}
              placeholder="Create strong password"
              placeholderTextColor={Colors.neutral[400]}
              value={password}
              onChangeText={(val) => {
                setPassword(val);
                if (errorMessage) setErrorMessage(null);
              }}
              secureTextEntry
            />
          </View>

          <TouchableOpacity
            style={[styles.primaryButton, isLoading && styles.buttonDisabled]}
            onPress={handleSignUp}
            disabled={isLoading}
            activeOpacity={0.85}
          >
            {isLoading ? (
              <ActivityIndicator color={Colors.neutral[0]} />
            ) : (
              <Text style={styles.primaryButtonText}>Continue to Verification</Text>
            )}
          </TouchableOpacity>

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Already a registered member? </Text>
            <Link href="/(auth)/sign-in" asChild>
              <TouchableOpacity>
                <Text style={styles.linkText}>Sign In</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>

        {/* OTP Verification Modal */}
        <Modal visible={verifying} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Verify Email Address</Text>
              <Text style={styles.modalSubtitle}>
                We sent a 6-digit verification code to {emailAddress}. Please enter it below:
              </Text>

              {errorMessage && (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{errorMessage}</Text>
                </View>
              )}

              <TextInput
                style={styles.otpInput}
                placeholder="000000"
                placeholderTextColor={Colors.neutral[400]}
                value={code}
                onChangeText={setCode}
                keyboardType="numeric"
                maxLength={6}
              />

              <TouchableOpacity
                style={[styles.primaryButton, isLoading && styles.buttonDisabled]}
                onPress={handleVerify}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color={Colors.neutral[0]} />
                ) : (
                  <Text style={styles.primaryButtonText}>Verify & Continue</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setVerifying(false)}
              >
                <Text style={styles.cancelButtonText}>Back</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: Colors.primary[500],
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: Spacing.md,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  logoImage: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 2.5,
    borderColor: Colors.secondary[500],
    marginBottom: Spacing.sm,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.neutral[0],
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.secondary[300],
    marginTop: 2,
    fontWeight: '500',
  },
  formCard: {
    backgroundColor: Colors.neutral[0],
    borderRadius: Spacing.radiusLg,
    padding: Spacing.lg,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: Spacing.md,
  },
  errorBox: {
    backgroundColor: Colors.error.light,
    borderRadius: Spacing.radiusSm,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: Colors.error.main,
  },
  errorText: {
    color: Colors.error.dark,
    fontSize: 13,
    lineHeight: 18,
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
  primaryButton: {
    backgroundColor: Colors.primary[500],
    borderRadius: Spacing.radiusMd,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.sm,
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  primaryButtonText: {
    color: Colors.neutral[0],
    fontSize: 16,
    fontWeight: '700',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.lg,
  },
  footerText: {
    color: Colors.text.secondary,
    fontSize: 13,
  },
  linkText: {
    color: Colors.primary[500],
    fontWeight: '700',
    fontSize: 13,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  modalCard: {
    backgroundColor: Colors.neutral[0],
    borderRadius: Spacing.radiusLg,
    padding: Spacing.xl,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 6,
  },
  modalSubtitle: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginBottom: Spacing.lg,
  },
  otpInput: {
    borderWidth: 2,
    borderColor: Colors.primary[500],
    borderRadius: Spacing.radiusMd,
    paddingVertical: 14,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: 8,
    marginBottom: Spacing.lg,
    backgroundColor: Colors.neutral[50],
  },
  cancelButton: {
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  cancelButtonText: {
    color: Colors.text.tertiary,
    fontSize: 14,
  },
});
