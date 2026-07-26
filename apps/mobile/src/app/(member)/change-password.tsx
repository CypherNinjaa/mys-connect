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
  Alert,
} from 'react-native';
import { useAuth, useUser, useSignIn } from '@clerk/expo';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing } from '../../constants/theme';

export default function ChangePasswordScreen() {
  const { isLoaded, user } = useUser();
  const { getToken } = useAuth();
  const { signIn } = useSignIn();
  const router = useRouter();

  const [mode, setMode] = useState<'update' | 'forgot_code'>('update');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Forgot password OTP mode state
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Update password using Clerk's user.updatePassword / user.createPassword
  const handleUpdatePassword = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!isLoaded || !user) {
      setErrorMessage('User session not ready.');
      return;
    }

    if (!newPassword.trim()) {
      setErrorMessage('Please enter a new password.');
      return;
    }

    if (newPassword.length < 8) {
      setErrorMessage('New password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('New password and confirm password do not match.');
      return;
    }

    setIsLoading(true);

    try {
      const userAny = user as any;
      if (user.passwordEnabled) {
        if (!currentPassword.trim()) {
          setErrorMessage('Please enter your current password.');
          setIsLoading(false);
          return;
        }

        if (typeof userAny.updatePassword === 'function') {
          await userAny.updatePassword({
            currentPassword: currentPassword.trim(),
            newPassword: newPassword.trim(),
          });
        } else {
          await userAny.update({
            currentPassword: currentPassword.trim(),
            password: newPassword.trim(),
          });
        }
      } else {
        // User created account via OAuth without a password
        if (typeof userAny.updatePassword === 'function') {
          await userAny.updatePassword({
            newPassword: newPassword.trim(),
          });
        } else {
          await userAny.update({
            password: newPassword.trim(),
          });
        }
      }

      setSuccessMessage('Your password has been updated successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        router.back();
      }, 1500);
    } catch (err: any) {
      console.error('Clerk updatePassword error:', err);
      const msg =
        err?.errors?.[0]?.longMessage ||
        err?.errors?.[0]?.message ||
        err?.message ||
        'Failed to update password. Please check your current password.';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // Send password reset code to user's primary email via Clerk
  const handleSendResetCode = async () => {
    const primaryEmail = user?.primaryEmailAddress?.emailAddress;
    if (!primaryEmail || !signIn) {
      setErrorMessage('No primary email found for your account.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      await signIn.create({ identifier: primaryEmail });
      await signIn.resetPasswordEmailCode.sendCode();
      setCodeSent(true);
      setSuccessMessage(`Reset code sent to ${primaryEmail}`);
    } catch (err: any) {
      const msg = err?.errors?.[0]?.longMessage || err?.errors?.[0]?.message || 'Failed to send reset code.';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // Submit reset code & set new password via Clerk signIn
  const handleResetWithCode = async () => {
    if (!code.trim() || !newPassword.trim()) {
      setErrorMessage('Please enter the reset code and your new password.');
      return;
    }

    if (newPassword.length < 8) {
      setErrorMessage('Password must be at least 8 characters.');
      return;
    }

    if (!signIn) return;
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const verifyRes = await signIn.resetPasswordEmailCode.verifyCode({ code: code.trim() });
      if (verifyRes?.error) {
        throw new Error((verifyRes.error as any)?.errors?.[0]?.message || 'Invalid verification code.');
      }

      const passwordRes = await signIn.resetPasswordEmailCode.submitPassword({ password: newPassword.trim() });
      if (passwordRes?.error) {
        throw new Error((passwordRes.error as any)?.errors?.[0]?.message || 'Password update failed.');
      }

      setSuccessMessage('Password reset successfully! Please sign in with your new password.');
      setTimeout(() => {
        router.back();
      }, 1500);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to reset password.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header bar */}
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Security & Password</Text>
        <View style={{ width: 32 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.card}>
            <View style={styles.iconCircle}>
              <Ionicons name="key" size={28} color={Colors.primary[500]} />
            </View>
            <Text style={styles.cardTitle}>
              {mode === 'update' ? 'Change Account Password' : 'Reset via Email Code'}
            </Text>
            <Text style={styles.cardSub}>
              {mode === 'update'
                ? 'Update your password securely using official Clerk authentication'
                : `We will send a security code to ${user?.primaryEmailAddress?.emailAddress || 'your email'}`}
            </Text>

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

            {mode === 'update' ? (
              <>
                {user?.passwordEnabled && (
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Current Password *</Text>
                    <View style={styles.inputCard}>
                      <Ionicons name="lock-closed-outline" size={20} color="#718096" style={styles.inputIcon} />
                      <TextInput
                        style={styles.inputField}
                        placeholder="Enter current password"
                        placeholderTextColor="#A0AEC0"
                        value={currentPassword}
                        onChangeText={setCurrentPassword}
                        secureTextEntry={!showCurrent}
                      />
                      <TouchableOpacity onPress={() => setShowCurrent(!showCurrent)}>
                        <Ionicons name={showCurrent ? 'eye-off-outline' : 'eye-outline'} size={20} color="#718096" />
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>New Password *</Text>
                  <View style={styles.inputCard}>
                    <Ionicons name="key-outline" size={20} color="#718096" style={styles.inputIcon} />
                    <TextInput
                      style={styles.inputField}
                      placeholder="Min. 8 characters"
                      placeholderTextColor="#A0AEC0"
                      value={newPassword}
                      onChangeText={setNewPassword}
                      secureTextEntry={!showNew}
                    />
                    <TouchableOpacity onPress={() => setShowNew(!showNew)}>
                      <Ionicons name={showNew ? 'eye-off-outline' : 'eye-outline'} size={20} color="#718096" />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Confirm New Password *</Text>
                  <View style={styles.inputCard}>
                    <Ionicons name="checkmark-circle-outline" size={20} color="#718096" style={styles.inputIcon} />
                    <TextInput
                      style={styles.inputField}
                      placeholder="Re-enter new password"
                      placeholderTextColor="#A0AEC0"
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      secureTextEntry={!showConfirm}
                    />
                    <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)}>
                      <Ionicons name={showConfirm ? 'eye-off-outline' : 'eye-outline'} size={20} color="#718096" />
                    </TouchableOpacity>
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.primaryButton, isLoading && styles.btnDisabled]}
                  onPress={handleUpdatePassword}
                  disabled={isLoading}
                  activeOpacity={0.85}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.primaryButtonText}>Update Password</Text>
                  )}
                </TouchableOpacity>

                {user?.passwordEnabled && (
                  <TouchableOpacity
                    style={styles.forgotBtn}
                    onPress={() => {
                      setMode('forgot_code');
                      setErrorMessage(null);
                    }}
                  >
                    <Text style={styles.forgotBtnText}>Forgot Current Password?</Text>
                  </TouchableOpacity>
                )}
              </>
            ) : (
              <>
                {!codeSent ? (
                  <TouchableOpacity
                    style={[styles.primaryButton, isLoading && styles.btnDisabled]}
                    onPress={handleSendResetCode}
                    disabled={isLoading}
                    activeOpacity={0.85}
                  >
                    {isLoading ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Text style={styles.primaryButtonText}>Send Reset Code to Email</Text>
                    )}
                  </TouchableOpacity>
                ) : (
                  <>
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>6-Digit Security Code *</Text>
                      <View style={styles.inputCard}>
                        <Ionicons name="mail-unread-outline" size={20} color="#718096" style={styles.inputIcon} />
                        <TextInput
                          style={styles.inputField}
                          placeholder="6-digit code"
                          placeholderTextColor="#A0AEC0"
                          value={code}
                          onChangeText={setCode}
                          keyboardType="number-pad"
                          maxLength={6}
                        />
                      </View>
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>New Password *</Text>
                      <View style={styles.inputCard}>
                        <Ionicons name="key-outline" size={20} color="#718096" style={styles.inputIcon} />
                        <TextInput
                          style={styles.inputField}
                          placeholder="Min. 8 characters"
                          placeholderTextColor="#A0AEC0"
                          value={newPassword}
                          onChangeText={setNewPassword}
                          secureTextEntry={!showNew}
                        />
                      </View>
                    </View>

                    <TouchableOpacity
                      style={[styles.primaryButton, isLoading && styles.btnDisabled]}
                      onPress={handleResetWithCode}
                      disabled={isLoading}
                      activeOpacity={0.85}
                    >
                      {isLoading ? (
                        <ActivityIndicator color="#FFFFFF" />
                      ) : (
                        <Text style={styles.primaryButtonText}>Verify & Save Password</Text>
                      )}
                    </TouchableOpacity>
                  </>
                )}

                <TouchableOpacity
                  style={styles.forgotBtn}
                  onPress={() => {
                    setMode('update');
                    setCodeSent(false);
                    setErrorMessage(null);
                  }}
                >
                  <Text style={styles.forgotBtnText}>← Back to Password Form</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: Spacing.md,
    paddingTop: 44,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#EDF2F7',
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  scrollContent: {
    padding: Spacing.md,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: Spacing.radiusLg,
    padding: Spacing.md,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#EDF2F7',
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFF5F5',
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.primary[900],
    textAlign: 'center',
  },
  cardSub: {
    fontSize: 13,
    color: Colors.text.tertiary,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 20,
  },
  errorBox: {
    backgroundColor: Colors.error.light,
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
    borderLeftWidth: 4,
    borderLeftColor: Colors.error.main,
  },
  errorText: {
    color: Colors.error.dark,
    fontSize: 13,
  },
  successBox: {
    backgroundColor: Colors.success.light,
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
    borderLeftWidth: 4,
    borderLeftColor: Colors.success.main,
  },
  successText: {
    color: Colors.success.dark,
    fontSize: 13,
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
  inputCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 14,
    height: 48,
  },
  inputIcon: {
    marginRight: 10,
  },
  inputField: {
    flex: 1,
    fontSize: 14,
    color: Colors.text.primary,
    height: '100%',
  },
  primaryButton: {
    backgroundColor: Colors.primary[500],
    height: 50,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  btnDisabled: {
    opacity: 0.65,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  forgotBtn: {
    alignSelf: 'center',
    marginTop: 16,
    padding: 8,
  },
  forgotBtnText: {
    color: Colors.primary[500],
    fontWeight: '600',
    fontSize: 13,
  },
});
