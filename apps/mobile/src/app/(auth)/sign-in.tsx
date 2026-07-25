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
} from 'react-native';
import { useSignIn } from '@clerk/expo';
import { useRouter, Link } from 'expo-router';
import { Colors, Spacing, APP } from '../../constants/theme';

export default function SignInScreen() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const router = useRouter();

  const [emailAddress, setEmailAddress] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSignIn = async () => {
    const trimmedEmail = emailAddress.trim();
    const trimmedPassword = password.trim();

    if (!trimmedEmail || !trimmedPassword) {
      setErrorMessage('Please enter both email address and password.');
      return;
    }

    if (!isLoaded || !signIn) {
      setErrorMessage('Auth system initializing. Please try again in a moment.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const result = await signIn.create({
        identifier: trimmedEmail,
        password: trimmedPassword,
      });

      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
        router.replace('/(member)/home');
      } else {
        setErrorMessage('Sign in incomplete. Additional verification steps required.');
      }
    } catch (err: any) {
      console.error('Sign in attempt failed:', err);
      const msg =
        err.errors?.[0]?.longMessage ||
        err.errors?.[0]?.message ||
        'Invalid email address or password. Please try again.';
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
        {/* Header Branding with MYS Logo */}
        <View style={styles.header}>
          <Image
            source={require('../../../assets/images/mys-logo.jpg')}
            style={styles.logoImage}
            resizeMode="contain"
          />
          <Text style={styles.title}>{APP.name}</Text>
          <Text style={styles.subtitle}>{APP.orgName}</Text>
          <Text style={styles.tagline}>"{APP.tagline}"</Text>
        </View>

        {/* Form Card (Wireframe Layout) */}
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

          {/* Sign In Action Button */}
          <TouchableOpacity
            style={[styles.primaryButton, isSubmitting && styles.buttonDisabled]}
            onPress={handleSignIn}
            disabled={isSubmitting}
            activeOpacity={0.85}
          >
            {isSubmitting ? (
              <ActivityIndicator color={Colors.neutral[0]} />
            ) : (
              <Text style={styles.primaryButtonText}>Sign In</Text>
            )}
          </TouchableOpacity>

          {/* Footer Navigation */}
          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <Link href="/(auth)/sign-up" asChild>
              <TouchableOpacity>
                <Text style={styles.linkText}>Register Here</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>

        {/* Motto Footer */}
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
  logoImage: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 2,
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
    fontWeight: '700',
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
  mottoFooter: {
    textAlign: 'center',
    color: Colors.primary[200],
    fontSize: 12,
    marginTop: Spacing.xl,
    fontStyle: 'italic',
  },
});
