import React, { useState, useEffect } from 'react';
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
  Dimensions,
  StatusBar,
  BackHandler,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth, useSignUp } from '@clerk/expo';
import { useRouter, Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing } from '../../constants/theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function SignUpScreen() {
  const { isLoaded } = useAuth();
  const { signUp, fetchStatus } = useSignUp();
  const router = useRouter();

  const [emailAddress, setEmailAddress] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [code, setCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const onBackPress = () => {
      if (verifying) {
        setVerifying(false);
        return true;
      }
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/(auth)/sign-in');
      }
      return true;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [verifying, router]);

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
          'Failed to create account. Email may already be in use.';
        setErrorMessage(msg);
        setIsSubmitting(false);
        return;
      }

      // Send email verification code
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

  // Handle OTP verification and let the central guard continue onboarding.
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
        await signUp.finalize({
          navigate: () => router.replace('/'),
        });
        setVerifying(false);
      } else {
        setErrorMessage('Verification incomplete. Please check your code.');
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
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAF6F0" />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header Branding with MYS Logo */}
          <View style={styles.header}>
            <Image
              source={require('../../../assets/images/mys-logo.jpg')}
              style={styles.logoImage}
              resizeMode="contain"
            />
            <Text style={styles.welcomeTitle}>Create Account</Text>
            <Text style={styles.welcomeSubtitle}>Register to join MYS CONNECT community</Text>
          </View>

          {/* Captcha Mount Point */}
          <View nativeID="clerk-captcha" />

          {/* Form Container */}
          <View style={styles.formContainer}>
            {errorMessage && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            )}

            {/* Email Field */}
            <View style={styles.inputCard}>
              <Ionicons name="mail-outline" size={20} color="#718096" style={styles.inputIcon} />
              <TextInput
                style={styles.inputField}
                placeholder="Email Address"
                placeholderTextColor="#A0AEC0"
                value={emailAddress}
                onChangeText={(val) => {
                  setEmailAddress(val);
                  if (errorMessage) setErrorMessage(null);
                }}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>

            {/* Password Field */}
            <View style={styles.inputCard}>
              <Ionicons name="lock-closed-outline" size={20} color="#718096" style={styles.inputIcon} />
              <TextInput
                style={styles.inputField}
                placeholder="Password (min. 8 characters)"
                placeholderTextColor="#A0AEC0"
                value={password}
                onChangeText={(val) => {
                  setPassword(val);
                  if (errorMessage) setErrorMessage(null);
                }}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeButton}
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color="#718096"
                />
              </TouchableOpacity>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.primaryButton, isLoading && styles.buttonDisabled]}
              onPress={handleSignUp}
              disabled={isLoading}
              activeOpacity={0.85}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryButtonText}>REGISTER NOW</Text>
              )}
            </TouchableOpacity>

            {/* Sign In Navigation Link */}
            <View style={styles.registerRow}>
              <Text style={styles.registerPrompt}>Already have an account? </Text>
              <Link href="/(auth)/sign-in" asChild>
                <TouchableOpacity>
                  <Text style={styles.registerLink}>Sign In</Text>
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
                  placeholderTextColor="#A0AEC0"
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
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.primaryButtonText}>Verify & Complete Setup</Text>
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

          <View style={{ height: 140 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Architectural Background Image */}
      <View style={styles.mahalWrapper} pointerEvents="none">
        <Image
          source={require('../../../assets/images/mahal-bg.png')}
          style={styles.mahalImage}
          resizeMode="cover"
        />
      </View>

      {/* Bottom Wave */}
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
  flex: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 12,
    zIndex: 10,
  },
  header: {
    alignItems: 'center',
    marginBottom: 28,
  },
  logoImage: {
    width: 140,
    height: 140,
    borderRadius: 70,
    marginBottom: 16,
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1A202C',
    textAlign: 'center',
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: '#718096',
    marginTop: 4,
    textAlign: 'center',
  },
  formContainer: {
    width: '100%',
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
  inputCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 16,
    height: 52,
    marginBottom: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  inputField: {
    flex: 1,
    fontSize: 15,
    color: '#2D3748',
    height: '100%',
  },
  eyeButton: {
    padding: 6,
  },
  primaryButton: {
    backgroundColor: Colors.primary[500],
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  registerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  registerPrompt: {
    fontSize: 14,
    color: '#718096',
  },
  registerLink: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2B6CB0',
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
  mahalWrapper: {
    position: 'absolute',
    bottom: 50,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT * 0.32,
    alignItems: 'center',
    justifyContent: 'flex-end',
    opacity: 0.55,
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
