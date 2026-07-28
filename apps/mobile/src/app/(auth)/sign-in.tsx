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
import { ApiService } from '../../services/api';

export default function SignInScreen() {
  const { isLoaded } = useAuth();
  const { signIn, fetchStatus } = useSignIn();
  const router = useRouter();

  // Auth Mode: 'OTP' (Magic Code) or 'PASSWORD'
  const [authMode, setAuthMode] = useState<'OTP' | 'PASSWORD'>('OTP');

  // Common & Password State
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // OTP State
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);

  // Loading & Errors
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  // Helper to extract and format ban reason notes
  const processAuthError = async (err: any, userIdentifier: string): Promise<string> => {
    const rawMsg =
      err?.errors?.[0]?.longMessage ||
      err?.errors?.[0]?.message ||
      err?.message ||
      'Authentication failed. Please try again.';

    const isBanned =
      err?.errors?.[0]?.code === 'user_banned' ||
      rawMsg.toLowerCase().includes('banned') ||
      rawMsg.toLowerCase().includes('deactivated') ||
      rawMsg.toLowerCase().includes('rejected');

    if (isBanned && userIdentifier) {
      const banInfo = await ApiService.getBanReason(userIdentifier);
      if (banInfo?.banned && banInfo?.reasonNote) {
        return `Your account has been deactivated by administration.\nReason: "${banInfo.reasonNote}"`;
      }
    }

    return rawMsg;
  };

  // ── Password Sign-In ──
  const handlePasswordSignIn = async () => {
    const trimmedId = identifier.trim();
    const trimmedPassword = password.trim();

    if (!trimmedId || !trimmedPassword) {
      setErrorMessage('Please enter Email / User ID and password.');
      return;
    }

    if (!isLoaded || !signIn) {
      setErrorMessage('Authentication system initializing. Please try again.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await signIn.password({
        emailAddress: trimmedId,
        password: trimmedPassword,
      });

      if (response?.error) {
        const msg = await processAuthError(response.error, trimmedId);
        setErrorMessage(msg);
        setIsSubmitting(false);
        return;
      }

      if (signIn.status === 'complete') {
        await signIn.finalize({
          navigate: () => router.replace('/'),
        });
      } else if (
        signIn.status === 'needs_first_factor' ||
        signIn.status === 'needs_second_factor' ||
        signIn.status === 'needs_client_trust'
      ) {
        let codeSent = false;
        try {
          if (signIn.supportedSecondFactors?.some((f: any) => f.strategy === 'email_code')) {
            await signIn.mfa.sendEmailCode();
            codeSent = true;
          } else if (signIn.supportedFirstFactors?.some((f: any) => f.strategy === 'email_code')) {
            await signIn.emailCode.sendCode();
            codeSent = true;
          }
        } catch (mfaErr) {
          console.warn('Auto send email code warning:', mfaErr);
        }

        setAuthMode('OTP');
        setOtpSent(true);
        setInfoMessage(
          codeSent
            ? `Security Verification: A 6-digit verification code has been sent to ${trimmedId}. Please enter it below to complete sign in.`
            : `Additional email verification required. Please enter the 6-digit code sent to ${trimmedId}.`
        );
      } else {
        setErrorMessage(`Sign in requires additional verification steps (${signIn.status}).`);
      }
    } catch (err: any) {
      console.error('Sign in exception:', err);
      const msg = await processAuthError(err, trimmedId);
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Email OTP Send Code ──
  const handleSendOtp = async () => {
    const trimmedEmail = identifier.trim();
    if (!trimmedEmail) {
      setErrorMessage('Please enter your registered email address.');
      return;
    }

    if (!isLoaded || !signIn) {
      setErrorMessage('Authentication system initializing. Please try again.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setInfoMessage(null);

    try {
      const { error } = await signIn.emailCode.sendCode({ emailAddress: trimmedEmail });
      if (error) {
        const msg = await processAuthError(error, trimmedEmail);
        setErrorMessage(msg);
        setIsSubmitting(false);
        return;
      }
      setOtpSent(true);
      setInfoMessage(`A 6-digit OTP verification code has been sent to ${trimmedEmail}`);
    } catch (err: any) {
      console.error('Send OTP error:', err);
      const msg = await processAuthError(err, trimmedEmail);
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Email OTP Verify Code ──
  const handleVerifyOtp = async () => {
    const trimmedCode = otpCode.trim();
    if (!trimmedCode || trimmedCode.length < 6) {
      setErrorMessage('Please enter the 6-digit code sent to your email.');
      return;
    }

    if (!isLoaded || !signIn) {
      setErrorMessage('Authentication system initializing. Please try again.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      let res: any;
      if (
        signIn.status === 'needs_second_factor' ||
        signIn.status === 'needs_client_trust'
      ) {
        res = await signIn.mfa.verifyEmailCode({ code: trimmedCode });
      } else {
        res = await signIn.emailCode.verifyCode({ code: trimmedCode });
      }

      if (res?.error) {
        const msg = await processAuthError(res.error, identifier);
        setErrorMessage(msg);
        setIsSubmitting(false);
        return;
      }

      if (signIn.status === 'complete') {
        await signIn.finalize({
          navigate: () => router.replace('/'),
        });
      } else {
        setErrorMessage(`Verification complete. Status: ${signIn.status}`);
      }
    } catch (err: any) {
      console.error('Verify OTP error:', err);
      const msg = await processAuthError(err, identifier);
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGuestMode = () => {
    router.replace('/(guest)/home');
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
          {/* Header Section: MYS Logo & Welcome Text */}
          <View style={styles.header}>
            <Image
              source={require('../../../assets/images/mys-logo.jpg')}
              style={styles.logoImage}
              resizeMode="contain"
            />
            <Text style={styles.welcomeTitle}>Welcome Back!</Text>
            <Text style={styles.welcomeSubtitle}>Sign in to MYS CONNECT</Text>
          </View>

          {/* Mode Switcher Tabs */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tabButton, authMode === 'OTP' && styles.activeTabButton]}
              onPress={() => {
                setAuthMode('OTP');
                setErrorMessage(null);
                setInfoMessage(null);
              }}
              activeOpacity={0.8}
            >
              <Ionicons
                name="mail-unread-outline"
                size={18}
                color={authMode === 'OTP' ? '#6B1D2A' : '#718096'}
                style={{ marginRight: 6 }}
              />
              <Text style={[styles.tabText, authMode === 'OTP' && styles.activeTabText]}>
                Email OTP
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabButton, authMode === 'PASSWORD' && styles.activeTabButton]}
              onPress={() => {
                setAuthMode('PASSWORD');
                setErrorMessage(null);
                setInfoMessage(null);
              }}
              activeOpacity={0.8}
            >
              <Ionicons
                name="key-outline"
                size={18}
                color={authMode === 'PASSWORD' ? '#6B1D2A' : '#718096'}
                style={{ marginRight: 6 }}
              />
              <Text style={[styles.tabText, authMode === 'PASSWORD' && styles.activeTabText]}>
                Password
              </Text>
            </TouchableOpacity>
          </View>

          {/* Form Container */}
          <View style={styles.formContainer}>
            {errorMessage && (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle-outline" size={18} color="#C53030" style={{ marginRight: 6 }} />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            )}

            {infoMessage && (
              <View style={styles.infoBox}>
                <Ionicons name="checkmark-circle-outline" size={18} color="#2B6CB0" style={{ marginRight: 6 }} />
                <Text style={styles.infoText}>{infoMessage}</Text>
              </View>
            )}

            {/* ── EMAIL OTP MODE ── */}
            {authMode === 'OTP' ? (
              <>
                <View style={styles.inputCard}>
                  <Ionicons name="mail-outline" size={20} color="#718096" style={styles.inputIcon} />
                  <TextInput
                    style={styles.inputField}
                    placeholder="Enter your registered Email"
                    placeholderTextColor="#A0AEC0"
                    value={identifier}
                    onChangeText={(val) => {
                      setIdentifier(val);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    editable={!otpSent}
                  />
                  {otpSent && (
                    <TouchableOpacity
                      onPress={() => {
                        setOtpSent(false);
                        setOtpCode('');
                        setInfoMessage(null);
                      }}
                      style={styles.changeEmailButton}
                    >
                      <Text style={styles.changeEmailText}>Change</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {otpSent && (
                  <View style={styles.inputCard}>
                    <Ionicons name="keypad-outline" size={20} color="#718096" style={styles.inputIcon} />
                    <TextInput
                      style={styles.inputField}
                      placeholder="Enter 6-digit OTP Code"
                      placeholderTextColor="#A0AEC0"
                      value={otpCode}
                      onChangeText={(val) => {
                        setOtpCode(val);
                        if (errorMessage) setErrorMessage(null);
                      }}
                      keyboardType="number-pad"
                      maxLength={6}
                    />
                  </View>
                )}

                {!otpSent ? (
                  <TouchableOpacity
                    style={[styles.loginButton, isLoading && styles.buttonDisabled]}
                    onPress={handleSendOtp}
                    disabled={isLoading}
                    activeOpacity={0.85}
                  >
                    {isLoading ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Text style={styles.loginButtonText}>SEND OTP CODE</Text>
                    )}
                  </TouchableOpacity>
                ) : (
                  <>
                    <TouchableOpacity
                      style={[styles.loginButton, isLoading && styles.buttonDisabled]}
                      onPress={handleVerifyOtp}
                      disabled={isLoading}
                      activeOpacity={0.85}
                    >
                      {isLoading ? (
                        <ActivityIndicator color="#FFFFFF" />
                      ) : (
                        <Text style={styles.loginButtonText}>VERIFY & LOGIN</Text>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.resendRow}
                      onPress={handleSendOtp}
                      disabled={isLoading}
                    >
                      <Text style={styles.resendText}>Didn&apos;t receive code? Resend OTP</Text>
                    </TouchableOpacity>
                  </>
                )}
              </>
            ) : (
              /* ── PASSWORD MODE ── */
              <>
                <View style={styles.inputCard}>
                  <Ionicons name="person-outline" size={20} color="#718096" style={styles.inputIcon} />
                  <TextInput
                    style={styles.inputField}
                    placeholder="User ID / Mobile Number / Email"
                    placeholderTextColor="#A0AEC0"
                    value={identifier}
                    onChangeText={(val) => {
                      setIdentifier(val);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    autoCapitalize="none"
                    keyboardType="email-address"
                  />
                </View>

                <View style={styles.inputCard}>
                  <Ionicons name="lock-closed-outline" size={20} color="#718096" style={styles.inputIcon} />
                  <TextInput
                    style={styles.inputField}
                    placeholder="Password"
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

                <Link href="/(auth)/forgot-password" asChild>
                  <TouchableOpacity style={styles.forgotPasswordRow}>
                    <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                  </TouchableOpacity>
                </Link>

                <TouchableOpacity
                  style={[styles.loginButton, isLoading && styles.buttonDisabled]}
                  onPress={handlePasswordSignIn}
                  disabled={isLoading}
                  activeOpacity={0.85}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.loginButtonText}>LOGIN WITH PASSWORD</Text>
                  )}
                </TouchableOpacity>
              </>
            )}

            {/* OR Divider */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Continue as Guest Button */}
            <TouchableOpacity
              style={styles.guestButton}
              onPress={handleGuestMode}
              activeOpacity={0.85}
            >
              <Ionicons name="person-circle-outline" size={22} color={Colors.primary[500]} style={{ marginRight: 8 }} />
              <Text style={styles.guestButtonText}>Continue as Guest</Text>
            </TouchableOpacity>

            {/* Registration Navigation */}
            <View style={styles.registerRow}>
              <Text style={styles.registerPrompt}>Don&apos;t have an account? </Text>
              <Link href="/(auth)/sign-up" asChild>
                <TouchableOpacity>
                  <Text style={styles.registerLink}>Register Now</Text>
                </TouchableOpacity>
              </Link>
            </View>
          </View>

          <View style={{ height: 140 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Background Architectural Artwork */}
      <View style={styles.mahalWrapper} pointerEvents="none">
        <Image
          source={require('../../../assets/images/mahal-bg.png')}
          style={styles.mahalImage}
          resizeMode="cover"
        />
      </View>

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
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  logoImage: {
    width: 90,
    height: 90,
    marginBottom: Spacing.sm,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#6B1D2A',
    marginBottom: 4,
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: '#718096',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#EDF2F7',
    borderRadius: 12,
    padding: 4,
    marginBottom: Spacing.lg,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  activeTabButton: {
    backgroundColor: '#FFFFFF',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#718096',
  },
  activeTabText: {
    color: '#6B1D2A',
    fontWeight: '700',
  },
  formContainer: {
    width: '100%',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF5F5',
    borderColor: '#FEB2B2',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: Spacing.md,
  },
  errorText: {
    color: '#C53030',
    fontSize: 13,
    flex: 1,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EBF8FF',
    borderColor: '#90CDF4',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: Spacing.md,
  },
  infoText: {
    color: '#2B6CB0',
    fontSize: 13,
    flex: 1,
  },
  inputCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 52,
    marginBottom: Spacing.md,
  },
  inputIcon: {
    marginRight: 10,
  },
  inputField: {
    flex: 1,
    fontSize: 15,
    color: '#2D3748',
  },
  eyeButton: {
    padding: 6,
  },
  changeEmailButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#EDF2F7',
    borderRadius: 6,
  },
  changeEmailText: {
    fontSize: 12,
    color: '#4A5568',
    fontWeight: '600',
  },
  forgotPasswordRow: {
    alignSelf: 'flex-end',
    marginBottom: Spacing.lg,
  },
  forgotPasswordText: {
    fontSize: 13,
    color: '#6B1D2A',
    fontWeight: '600',
  },
  loginButton: {
    backgroundColor: '#6B1D2A',
    borderRadius: 12,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.xs,
    elevation: 3,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  resendRow: {
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  resendText: {
    fontSize: 13,
    color: '#6B1D2A',
    fontWeight: '600',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#CBD5E0',
  },
  dividerText: {
    marginHorizontal: Spacing.md,
    color: '#A0AEC0',
    fontSize: 12,
    fontWeight: '700',
  },
  guestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#6B1D2A',
    borderRadius: 12,
    height: 50,
  },
  guestButtonText: {
    color: '#6B1D2A',
    fontSize: 15,
    fontWeight: '700',
  },
  registerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: Spacing.xl,
  },
  registerPrompt: {
    fontSize: 14,
    color: '#718096',
  },
  registerLink: {
    fontSize: 14,
    color: '#6B1D2A',
    fontWeight: '700',
  },
  mahalWrapper: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    height: 120,
    opacity: 0.12,
    alignItems: 'center',
  },
  mahalImage: {
    width: Dimensions.get('window').width * 0.9,
    height: 120,
  },
  bottomWaveContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  goldLine: {
    height: 3,
    backgroundColor: '#D4A017',
  },
  maroonWave: {
    height: 16,
    backgroundColor: '#6B1D2A',
  },
});
