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
import { useSignIn } from '@clerk/expo';
import { useRouter, Link } from 'expo-router';
import { Colors, Spacing, Typography, APP } from '../../constants/theme';

export default function SignInScreen() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const router = useRouter();

  const [emailAddress, setEmailAddress] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSignIn = async () => {
    if (!emailAddress.trim() || !password.trim()) {
      setErrorMessage('Please enter both email address and password.');
      return;
    }

    if (!isLoaded || !signIn) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const result = await signIn.create({
        identifier: emailAddress.trim(),
        password,
      });

      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
        router.replace('/');
      } else {
        setErrorMessage('Sign in incomplete. Please check your credentials.');
      }
    } catch (err: any) {
      console.error('Sign in error:', err);
      const msg = err.errors?.[0]?.longMessage || err.errors?.[0]?.message || 'Invalid email or password.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.flex}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Header Branding */}
        <View style={styles.header}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoBadgeText}>MYS</Text>
          </View>
          <Text style={styles.title}>{APP.name}</Text>
          <Text style={styles.subtitle}>{APP.orgName}</Text>
          <Text style={styles.tagline}>"Connecting Every Member, Digitally"</Text>
        </View>

        {/* Form Container */}
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Member Sign In</Text>

          {errorMessage && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}

          {/* Email Field */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email Address</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your email"
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

          {/* Password Field */}
          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>Password</Text>
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Text style={styles.showHideText}>{showPassword ? 'Hide' : 'Show'}</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.input}
              placeholder="Enter your password"
              placeholderTextColor={Colors.neutral[400]}
              value={password}
              onChangeText={(val) => {
                setPassword(val);
                if (errorMessage) setErrorMessage(null);
              }}
              secureTextEntry={!showPassword}
            />
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.primaryButton, isSubmitting && styles.buttonDisabled]}
            onPress={handleSignIn}
            disabled={isSubmitting}
            activeOpacity={0.8}
          >
            {isSubmitting ? (
              <ActivityIndicator color={Colors.neutral[0]} />
            ) : (
              <Text style={styles.primaryButtonText}>Sign In</Text>
            )}
          </TouchableOpacity>

          {/* Footer Link */}
          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <Link href="/(auth)/sign-up" asChild>
              <TouchableOpacity>
                <Text style={styles.linkText}>Register Here</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>

        <Text style={styles.mottoFooter}>{APP.mottoHindi}</Text>
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
  logoBadge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.primary[600],
    borderWidth: 2,
    borderColor: Colors.secondary[500],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  logoBadgeText: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.secondary[500],
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.neutral[0],
  },
  subtitle: {
    fontSize: 13,
    color: Colors.secondary[300],
    marginTop: 2,
  },
  tagline: {
    fontSize: 12,
    color: Colors.primary[100],
    marginTop: 6,
    fontStyle: 'italic',
  },
  formCard: {
    backgroundColor: Colors.neutral[0],
    borderRadius: Spacing.radiusLg,
    padding: Spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
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
    padding: Spacing.sm,
    marginBottom: Spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: Colors.error.main,
  },
  errorText: {
    color: Colors.error.dark,
    fontSize: 13,
  },
  inputGroup: {
    marginBottom: Spacing.md,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text.secondary,
    marginBottom: 6,
  },
  showHideText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary[500],
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
    opacity: 0.6,
  },
  primaryButtonText: {
    color: Colors.neutral[0],
    fontSize: 16,
    fontWeight: '600',
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
  mottoFooter: {
    textAlign: 'center',
    color: Colors.primary[200],
    fontSize: 12,
    marginTop: Spacing.xl,
    fontStyle: 'italic',
  },
});
