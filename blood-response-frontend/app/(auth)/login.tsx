import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
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

export default function LoginScreen() {
  const router = useRouter();
  const { setTokens, setUser, t } = useAuthStore();
  const C = useTheme();

  const [phone, setPhone] = useState('+923001234001'); // Pre-filled with Karachi O- test donor
  const [password, setPassword] = useState('Donor@123');
  const [loading, setLoading] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const handleLogin = async () => {
    const errors: Record<string, string> = {};
    const normalizedPhone = phone.trim();
    if (!normalizedPhone) {
      errors.phone = 'This field is required';
    } else if (!/^\+\d{10,}$/.test(normalizedPhone)) {
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

    setLoading(true);
    try {
      const res = await Api.login({ phone: normalizedPhone, password });
      await setTokens(res.data.access_token, res.data.refresh_token);

      // Fetch user details
      const meRes = await Api.getMe();
      await setUser(meRes.data);

      router.replace('/(tabs)/home');
    } catch (err: any) {
      setFormErrors({ password: 'Invalid phone number or password' });
      Alert.alert(
        'Login Failed',
        err.response?.data?.detail || 'Invalid phone number or password'
      );
    } finally {
      setLoading(false);
    }
  };

  const setTestAccount = (testPhone: string, testPass: string) => {
    setPhone(testPhone);
    setPassword(testPass);
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
          <Text style={[styles.title, { color: C.primaryDark }]}>{t.login}</Text>
          <Text style={[styles.subtitle, { color: C.textSecondary }]}>{t.tagline}</Text>
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: C.textPrimary }]}>{t.phonePlaceholder}</Text>
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
          <Text style={[styles.label, { color: C.textPrimary }]}>{t.passwordPlaceholder}</Text>
          <TextInput
            style={[styles.input, { backgroundColor: C.background, borderColor: formErrors.password ? '#DC2626' : C.border, color: C.textPrimary }]}
            placeholder="••••••••"
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

        <Button
          title={t.login}
          loading={loading}
          onPress={handleLogin}
          size="large"
          style={styles.loginBtn}
        />

        <TouchableOpacity
          onPress={() => router.push('/(auth)/register')}
          style={styles.registerLink}
        >
          <Text style={[styles.registerText, { color: C.textSecondary }]}>
            Don't have an account? <Text style={[styles.registerTextBold, { color: C.primary }]}>Register</Text>
          </Text>
        </TouchableOpacity>

        {/* Quick Test Credential Switcher */}
        <View style={[styles.testBox, { borderTopColor: C.borderLight }]}>
          <Text style={[styles.testTitle, { color: C.textMuted }]}>⚡ Quick Fill Test Accounts:</Text>
          <View style={styles.testButtons}>
            <TouchableOpacity
              onPress={() => setTestAccount('+923001234001', 'Donor@123')}
              style={[styles.testChip, { backgroundColor: C.primaryLight }]}
            >
              <Text style={[styles.testChipText, { color: C.primaryDark }]}>Donor (O- Karachi)</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setTestAccount('+923331112233', 'Requester@123')}
              style={[styles.testChip, { backgroundColor: C.primaryLight }]}
            >
              <Text style={[styles.testChipText, { color: C.primaryDark }]}>Requester</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setTestAccount('+923000000000', 'Admin@123')}
              style={[styles.testChip, { backgroundColor: C.primaryLight }]}
            >
              <Text style={[styles.testChipText, { color: C.primaryDark }]}>Admin</Text>
            </TouchableOpacity>
          </View>
        </View>
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
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
  },
  header: {
    marginBottom: 24,
    alignItems: 'center',
  },
  logoHeader: {
    width: 64,
    height: 64,
    borderRadius: 32,
    resizeMode: 'contain',
    marginBottom: 8,
  },
  brandTitle: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  title: {
    fontSize: 24,
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
  loginBtn: {
    marginTop: 10,
  },
  registerLink: {
    alignItems: 'center',
    marginTop: 20,
  },
  registerText: {
    fontSize: 14,
  },
  registerTextBold: {
    fontWeight: '700',
  },
  testBox: {
    marginTop: 28,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  testTitle: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
  },
  testButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  testChip: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  testChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
