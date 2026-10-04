import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  Switch,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Button } from '@/components/Button';
import { Header } from '@/components/Header';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { Api } from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import { useTheme } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';

export default function RegisterScreen() {
  const router = useRouter();
  const { t } = useAuthStore();
  const C = useTheme();

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'donor' | 'requester'>('donor');
  const [cnic, setCnic] = useState('');
  const [consentGiven, setConsentGiven] = useState(true);
  const [loading, setLoading] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const handleRegister = async () => {
    const errors: Record<string, string> = {};
    const normalizedFullName = fullName.trim();
    const normalizedEmail = email.trim();
    const normalizedPhone = phone.trim();
    const phonePattern = /^\+\d{10,}$/;

    if (!normalizedFullName) {
      errors.fullName = 'This field is required';
    }
    if (!normalizedEmail) {
      errors.email = 'This field is required';
    } else if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      errors.email = 'Please enter a valid email address';
    }
    if (!normalizedPhone) {
      errors.phone = 'This field is required';
    } else if (!phonePattern.test(normalizedPhone)) {
      errors.phone = 'Enter valid phone number starting with +';
    }
    if (!password) {
      errors.password = 'This field is required';
    } else if (password.length < 6) {
      errors.password = 'Minimum 6 characters required';
    }

    setFormErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }

    if (!consentGiven) {
      Alert.alert('Consent Required', 'You must agree to data processing to register.');
      return;
    }

    setLoading(true);
    try {
      await Api.register({
        phone: normalizedPhone,
        password,
        full_name: normalizedFullName,
        email: normalizedEmail,
        intended_role: role,
        cnic: cnic ? cnic : null,
        consent_given: consentGiven,
      });

      // Forward to OTP screen
      router.push({
        pathname: '/(auth)/otp-verify',
        params: { phone: normalizedPhone, email: normalizedEmail, password },
      });
    } catch (err: any) {
      console.log('Registration error:', JSON.stringify(err.response?.data));
      console.log('Status:', err.response?.status);
      console.log('Error message:', err.message);

      const status = err.response?.status;
      const detail = String(err.response?.data?.detail || '').trim();
      const normalizedDetail = detail.toLowerCase();
      if (status === 409 && normalizedDetail === 'phone number already registered') {
        Alert.alert(
          'Account Already Exists',
          'This mobile number is already registered. Please login instead.',
          [
            { text: 'Login', onPress: () => router.replace('/(auth)/login') },
            { text: 'Try Different Number', style: 'cancel' },
          ]
        );
        return;
      } else if (status === 409 && normalizedDetail === 'cnic already registered') {
        Alert.alert(
          'CNIC Already Registered',
          'This CNIC is already registered with another account. If this is your CNIC, please contact support.',
          [{ text: 'OK' }]
        );
        return;
      } else if (status === 409 && normalizedDetail === 'email already registered') {
        Alert.alert(
          'Email Already Registered',
          'This email is already registered. Please login or use a different email.',
          [
            { text: 'Login', onPress: () => router.replace('/(auth)/login') },
            { text: 'Try Different Email', style: 'cancel' },
          ]
        );
        return;
      }

      Alert.alert(
        'Registration Failed',
        detail || err.message || 'Unable to register account.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenWrapper edges={['top', 'bottom']} topInsetBg={C.surface}>
      <Header />
      <ScrollView
        style={[styles.container, { backgroundColor: C.background }]}
        contentContainerStyle={styles.content}
      >

      <View style={[styles.card, { backgroundColor: C.surface, shadowColor: C.primary }]}>
        <View style={styles.header}>
          <Image
            source={require('../../assets/alkhidmat-logo.png')}
            style={styles.logoHeader}
          />
          <Text style={[styles.brandTitle, { color: C.primary }]}>Alkhidmat Foundation</Text>
          <Text style={[styles.title, { color: C.primaryDark }]}>{t.register}</Text>
          <Text style={[styles.subtitle, { color: C.textSecondary }]}>{t.tagline}</Text>
        </View>

        {/* Role Picker */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: C.textPrimary }]}>{t.selectRole}</Text>
          <View style={styles.roleRow}>
            <TouchableOpacity
              onPress={() => setRole('donor')}
              activeOpacity={0.8}
              style={[
                styles.roleOption,
                { borderColor: C.border, backgroundColor: C.surface },
                role === 'donor' && { backgroundColor: C.primary, borderColor: C.primary },
              ]}
            >
              <Ionicons
                name="water"
                size={20}
                color={role === 'donor' ? C.textInverse : C.primary}
              />
              <Text
                style={[
                  styles.roleText,
                  { color: C.textPrimary },
                  role === 'donor' && { color: C.textInverse },
                ]}
              >
                {t.roleDonor}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setRole('requester')}
              activeOpacity={0.8}
              style={[
                styles.roleOption,
                { borderColor: C.border, backgroundColor: C.surface },
                role === 'requester' && { backgroundColor: C.primary, borderColor: C.primary },
              ]}
            >
              <Ionicons
                name="medkit"
                size={20}
                color={role === 'requester' ? C.textInverse : C.primary}
              />
              <Text
                style={[
                  styles.roleText,
                  { color: C.textPrimary },
                  role === 'requester' && { color: C.textInverse },
                ]}
              >
                {t.roleRequester}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: C.textPrimary }]}>Email *</Text>
          <TextInput
            style={[styles.input, { backgroundColor: C.background, borderColor: formErrors.email ? '#DC2626' : C.border, color: C.textPrimary }]}
            placeholder="you@example.com"
            placeholderTextColor={C.textMuted}
            value={email}
            onChangeText={(value) => {
              setEmail(value);
              if (formErrors.email) setFormErrors((current) => ({ ...current, email: '' }));
            }}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />
          {!!formErrors.email && <Text style={styles.errorText}>{formErrors.email}</Text>}
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: C.textPrimary }]}>{t.fullNamePlaceholder} *</Text>
          <TextInput
            style={[styles.input, { backgroundColor: C.background, borderColor: formErrors.fullName ? '#DC2626' : C.border, color: C.textPrimary }]}
            placeholder="e.g. Ahmed Khan"
            placeholderTextColor={C.textMuted}
            value={fullName}
            onChangeText={(value) => {
              setFullName(value);
              if (formErrors.fullName) setFormErrors((current) => ({ ...current, fullName: '' }));
            }}
          />
          {!!formErrors.fullName && <Text style={styles.errorText}>{formErrors.fullName}</Text>}
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: C.textPrimary }]}>{t.phonePlaceholder} *</Text>
          <TextInput
            style={[styles.input, { backgroundColor: C.background, borderColor: formErrors.phone ? '#DC2626' : C.border, color: C.textPrimary }]}
            placeholder="+923001234567"
            placeholderTextColor={C.textMuted}
            value={phone}
            onChangeText={(value) => {
              setPhone(value);
              if (formErrors.phone) setFormErrors((current) => ({ ...current, phone: '' }));
            }}
            keyboardType="phone-pad"
            autoCapitalize="none"
          />
          {!!formErrors.phone && <Text style={styles.errorText}>{formErrors.phone}</Text>}
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: C.textPrimary }]}>{t.passwordPlaceholder} *</Text>
          <TextInput
            style={[styles.input, { backgroundColor: C.background, borderColor: formErrors.password ? '#DC2626' : C.border, color: C.textPrimary }]}
            placeholder="Minimum 6 characters"
            placeholderTextColor={C.textMuted}
            value={password}
            onChangeText={(value) => {
              setPassword(value);
              if (formErrors.password) setFormErrors((current) => ({ ...current, password: '' }));
            }}
            secureTextEntry
          />
          {!!formErrors.password && <Text style={styles.errorText}>{formErrors.password}</Text>}
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: C.textPrimary }]}>{t.cnicPlaceholder}</Text>
          <TextInput
            style={[styles.input, { backgroundColor: C.background, borderColor: C.border, color: C.textPrimary }]}
            placeholder="42201-1234567-1"
            placeholderTextColor={C.textMuted}
            value={cnic}
            onChangeText={setCnic}
            keyboardType="numeric"
          />
          <Text style={[styles.privacyNote, { color: C.textMuted }]}>{t.cnicNote}</Text>
        </View>

        {/* Consent Switch */}
        <View style={styles.consentRow}>
          <Switch
            value={consentGiven}
            onValueChange={setConsentGiven}
            trackColor={{ false: C.border, true: C.primary }}
          />
          <Text style={[styles.consentText, { color: C.textSecondary }]}>{t.consentText}</Text>
        </View>

        <Button
          title={t.register}
          loading={loading}
          onPress={handleRegister}
          size="large"
          style={styles.submitBtn}
        />

        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.loginLink}
        >
          <Text style={[styles.loginText, { color: C.textSecondary }]}>
            Already have an account? <Text style={[styles.loginTextBold, { color: C.primary }]}>Login</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingBottom: 40,
  },
  card: {
    margin: 20,
    borderRadius: 20,
    padding: 24,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  header: {
    marginBottom: 20,
    alignItems: 'center',
  },
  logoHeader: {
    width: 60,
    height: 60,
    borderRadius: 30,
    resizeMode: 'contain',
    marginBottom: 8,
  },
  brandTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    marginTop: 4,
    textAlign: 'center',
  },
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  roleRow: {
    flexDirection: 'row',
    gap: 10,
  },
  roleOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  roleText: {
    fontSize: 13,
    fontWeight: '700',
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 12,
    marginTop: 4,
  },
  privacyNote: {
    fontSize: 11,
    marginTop: 6,
    lineHeight: 16,
  },
  consentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 16,
  },
  consentText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
  },
  submitBtn: {
    marginTop: 10,
  },
  loginLink: {
    alignItems: 'center',
    marginTop: 20,
  },
  loginText: {
    fontSize: 14,
  },
  loginTextBold: {
    fontWeight: '700',
  },
});
