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
  Image,
  Dimensions,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth, useSignIn } from '@clerk/expo';
import { useRouter, Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing } from '../../constants/theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function ForgotPasswordScreen() {
  const { isLoaded } = useAuth();
  const { signIn, fetchStatus } = useSignIn();
  const router = useRouter();

  const [emailAddress, setEmailAddress] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState<'request' | 'reset'>('request');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Step 1: Request Password Reset Code
  const handleRequestCode = async () => {
    const trimmedEmail = emailAddress.trim();
    if (!trimmedEmail) {
      setErrorMessage('Please enter your registered email address.');
      return;
    }

    if (!isLoaded || !signIn) {
      setErrorMessage('Authentication service loading. Please try again.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const attempt = await signIn.create({
        identifier: trimmedEmail,
      });

      if (attempt?.error) {
        const err = attempt.error as any;
        setErrorMessage(
          err?.errors?.[0]?.longMessage ||
            err?.errors?.[0]?.message ||
            'Failed to start password reset. Please verify your email.',
        );
        return;
      }

      // Clerk requires an initialized sign-in attempt before sending a reset code.
      const response = await signIn.resetPasswordEmailCode.sendCode();

      if (response?.error) {
        const err = response.error as any;
        const msg =
          err?.errors?.[0]?.longMessage ||
          err?.errors?.[0]?.message ||
          'Failed to send reset code. Please verify your email.';
        setErrorMessage(msg);
        setIsSubmitting(false);
        return;
      }

      setSuccessMessage(`Reset code sent to ${trimmedEmail}`);
      setStep('reset');
    } catch (err: any) {
      console.error('Reset code request error:', err);
      const msg =
        err?.errors?.[0]?.longMessage ||
        err?.errors?.[0]?.message ||
        'Failed to send reset code. Please check your email.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 2: Verify Code & Submit New Password
  const handleResetPassword = async () => {
    const trimmedCode = code.trim();
    const trimmedPassword = newPassword.trim();

    if (!trimmedCode || !trimmedPassword) {
      setErrorMessage('Please enter the 6-digit code and your new password.');
      return;
    }

    if (trimmedPassword.length < 8) {
      setErrorMessage('Password must be at least 8 characters long.');
      return;
    }

    if (!isLoaded || !signIn) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      // Verify code
      const verifyRes = await signIn.resetPasswordEmailCode.verifyCode({
        code: trimmedCode,
      });

      if (verifyRes?.error) {
        const err = verifyRes.error as any;
        setErrorMessage(err?.errors?.[0]?.message || 'Invalid verification code.');
        setIsSubmitting(false);
        return;
      }

      // Submit new password
      const passwordRes = await signIn.resetPasswordEmailCode.submitPassword({
        password: trimmedPassword,
      });

      if (passwordRes?.error) {
        const err = passwordRes.error as any;
        setErrorMessage(err?.errors?.[0]?.message || 'Password update failed.');
        setIsSubmitting(false);
        return;
      }

      if (signIn.status === 'complete') {
        await signIn.finalize({
          navigate: () => router.replace('/'),
        });
      } else {
        setSuccessMessage('Password reset successful! Please sign in with your new password.');
        router.replace('/(auth)/sign-in');
      }
    } catch (err: any) {
      console.error('Password reset error:', err);
      const msg = err?.errors?.[0]?.longMessage || err?.errors?.[0]?.message || 'Password reset failed.';
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
          {/* Header Section */}
          <View style={styles.header}>
            <Image
              source={require('../../../assets/images/mys-logo.jpg')}
              style={styles.logoImage}
              resizeMode="contain"
            />
            <Text style={styles.welcomeTitle}>Reset Password</Text>
            <Text style={styles.welcomeSubtitle}>
              {step === 'request'
                ? 'Enter your registered email to receive a reset code'
                : 'Enter verification code and your new password'}
            </Text>
          </View>

          {/* Form Container */}
          <View style={styles.formContainer}>
            {errorMessage && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            )}

            {successMessage && (
              <View style={styles.successBox}>
                <Text style={styles.successText}>{successMessage}</Text>
              </View>
            )}

            {step === 'request' ? (
              <>
                {/* Email Input */}
                <View style={styles.inputCard}>
                  <Ionicons name="mail-outline" size={20} color="#718096" style={styles.inputIcon} />
                  <TextInput
                    style={styles.inputField}
                    placeholder="Registered Email Address"
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

                <TouchableOpacity
                  style={[styles.primaryButton, isLoading && styles.buttonDisabled]}
                  onPress={handleRequestCode}
                  disabled={isLoading}
                  activeOpacity={0.85}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.primaryButtonText}>Send Reset Code</Text>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              <>
                {/* Code Input */}
                <View style={styles.inputCard}>
                  <Ionicons name="key-outline" size={20} color="#718096" style={styles.inputIcon} />
                  <TextInput
                    style={styles.inputField}
                    placeholder="6-Digit Reset Code"
                    placeholderTextColor="#A0AEC0"
                    value={code}
                    onChangeText={setCode}
                    keyboardType="numeric"
                    maxLength={6}
                  />
                </View>

                {/* New Password Input */}
                <View style={styles.inputCard}>
                  <Ionicons name="lock-closed-outline" size={20} color="#718096" style={styles.inputIcon} />
                  <TextInput
                    style={styles.inputField}
                    placeholder="New Password (min 8 chars)"
                    placeholderTextColor="#A0AEC0"
                    value={newPassword}
                    onChangeText={setNewPassword}
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

                <TouchableOpacity
                  style={[styles.primaryButton, isLoading && styles.buttonDisabled]}
                  onPress={handleResetPassword}
                  disabled={isLoading}
                  activeOpacity={0.85}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.primaryButtonText}>Update Password & Sign In</Text>
                  )}
                </TouchableOpacity>
              </>
            )}

            {/* Back to Sign In Link */}
            <View style={styles.registerRow}>
              <Text style={styles.registerPrompt}>Remember your password? </Text>
              <Link href="/(auth)/sign-in" asChild>
                <TouchableOpacity>
                  <Text style={styles.registerLink}>Sign In Now</Text>
                </TouchableOpacity>
              </Link>
            </View>
          </View>

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
  successBox: {
    backgroundColor: Colors.success.light,
    borderRadius: 12,
    padding: Spacing.md,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: Colors.success.main,
  },
  successText: {
    color: Colors.success.dark,
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
