import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/constants/theme';
import { useAuthStore } from '@/store/authStore';
import { Ionicons } from '@expo/vector-icons';

interface CooldownCardProps {
  isAvailable: boolean;
  daysRemaining?: number;
  lastDonationDate?: string | null;
  cooldownExpiresAt?: string | null;
}

export const CooldownCard: React.FC<CooldownCardProps> = ({
  isAvailable,
  daysRemaining = 0,
  lastDonationDate,
  cooldownExpiresAt,
}) => {
  const { t } = useAuthStore();
  const C = useTheme();

  return (
    <View
      style={[
        styles.card,
        isAvailable
          ? { backgroundColor: C.successLight, borderColor: C.success }
          : { backgroundColor: C.warningLight, borderColor: C.warning },
      ]}
    >
      <View style={styles.headerRow}>
        <Ionicons
          name={isAvailable ? 'checkmark-circle' : 'time'}
          size={24}
          color={isAvailable ? C.success : C.warning}
        />
        <Text
          style={[
            styles.title,
            { color: isAvailable ? C.success : C.warning },
          ]}
        >
          {isAvailable ? t.availableNow : t.unavailableCooldown}
        </Text>
      </View>

      {!isAvailable && (
        <View style={[styles.countdownContainer, { backgroundColor: C.surfaceElevated }]}>
          <Text style={[styles.daysNumber, { color: C.warning }]}>{daysRemaining}</Text>
          <Text style={[styles.daysLabel, { color: C.textSecondary }]}>{t.cooldownRemaining}</Text>
        </View>
      )}

      {!isAvailable && cooldownExpiresAt && (
        <Text style={[styles.dateText, { color: C.textSecondary }]}> 
          Available again: {new Date(cooldownExpiresAt).toLocaleDateString()}
        </Text>
      )}

      {lastDonationDate && (
        <Text style={[styles.dateText, { color: C.textSecondary }]}>
          {t.lastDonationDate}: {new Date(lastDonationDate).toLocaleDateString()}
        </Text>
      )}

      <Text style={[styles.infoText, { color: C.textSecondary }]}>
        {isAvailable
          ? "You are medically eligible to respond to emergency blood donation requests."
          : "Standard 90-day biological recovery period to protect donor health."}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    marginVertical: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
  },
  countdownContainer: {
    alignItems: 'center',
    marginVertical: 12,
    padding: 14,
    borderRadius: 12,
  },
  daysNumber: {
    fontSize: 32,
    fontWeight: '800',
  },
  daysLabel: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 2,
  },
  dateText: {
    fontSize: 13,
    marginBottom: 6,
  },
  infoText: {
    fontSize: 12,
    lineHeight: 18,
  },
});
