import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Button } from '@/components/Button';
import { Header } from '@/components/Header';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { Api } from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import { useTheme } from '@/constants/theme';

export default function OTPVerifyScreen() {
  const router = useRouter();
  const { phone, email, password } = useLocalSearchParams<{
    phone: string;
    email: string;
    password: string;
  }>();
  const { t } = useAuthStore();
  const C = useTheme();

  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(60);

  useEffect(() => {
    if (resendCountdown === 0) {
      return;
    }

    const timer = setInterval(() => {
      setResendCountdown((current) => Math.max(current - 1, 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [resendCountdown]);

  const handleVerify = async () => {
    if (!otp || otp.length !== 6) {
      Alert.alert('Invalid Code', 'Please enter a 6-digit verification code.');
      return;
    }

    setLoading(true);
    try {
      await Api.verifyOtp(phone || '', otp);

      const loginResponse = await Api.login({
        phone: phone || '',
        password: password || '',
      });
      const { access_token, refresh_token } = loginResponse.data;
      await useAuthStore.getState().setTokens(access_token, refresh_token);

      const meResponse = await Api.getMe();
      await useAuthStore.getState().setUser(meResponse.data);

      router.replace('/(tabs)/home');
    } catch (err: any) {
      Alert.alert(
        'Verification Failed',
        err.response?.data?.detail || 'Unable to verify and sign you in.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResendLoading(true);
    try {
      await Api.resendOtp(phone || '', email || '');
      setResendCountdown(60);
      Alert.alert('Success', 'OTP resent to your email');
    } catch (err: any) {
      Alert.alert('Resend Failed', err.response?.data?.detail || 'Unable to resend OTP.');
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <ScreenWrapper edges={['top', 'bottom']} topInsetBg={C.surface}>
      <Header />

      <View style={[styles.card, { backgroundColor: C.surface }]}>
        <Text style={[styles.title, { color: C.primaryDark }]}>{t.verifyOtpTitle}</Text>
        <Text style={[styles.subtitle, { color: C.textSecondary }]}>{t.verifyOtpSubtitle}</Text>

        <Text style={[styles.phoneLabel, { color: C.primary }]}>We sent a 6-digit OTP to your email: {email}</Text>

        <TextInput
          style={[
            styles.otpInput,
            {
              backgroundColor: C.background,
              borderColor: C.primary,
              color: C.primaryDark,
            },
          ]}
          value={otp}
          onChangeText={setOtp}
          keyboardType="numeric"
          maxLength={6}
          placeholder="123456"
          placeholderTextColor={C.textMuted}
        />

        <Button
          title={t.verifyButton}
          loading={loading}
          onPress={handleVerify}
          size="large"
          style={styles.button}
        />

        <Button
          title={resendCountdown > 0 ? `Resend in ${resendCountdown}s` : 'Resend OTP'}
          variant="outline"
          loading={resendLoading}
          disabled={resendCountdown > 0}
          onPress={handleResend}
          size="medium"
          style={styles.resendButton}
        />
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  card: {
    margin: 20,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 20,
    lineHeight: 18,
  },
  phoneLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 16,
  },
  otpInput: {
    borderWidth: 2,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 24,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 10,
    textAlign: 'center',
    marginBottom: 24,
    width: '80%',
  },
  button: {
    width: '100%',
  },
  resendButton: {
    width: '100%',
    marginTop: 12,
  },
});
