import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  StyleSheet,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { BloodGroupPicker } from '@/components/BloodGroupPicker';
import { Button } from '@/components/Button';
import { BloodGroup } from '@/constants/bloodGroups';
import { Api } from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import { useTheme } from '@/constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

interface SOSModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const SOSModal: React.FC<SOSModalProps> = ({ visible, onClose, onSuccess }) => {
  const { user } = useAuthStore();
  const C = useTheme();
  const insets = useSafeAreaInsets();
  const [bloodGroup, setBloodGroup] = useState<BloodGroup>('O-');
  const [phone, setPhone] = useState(user?.phone || '');
  const [city, setCity] = useState('Karachi');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!phone) {
      Alert.alert('Phone Required', 'Please enter a contact number for the emergency.');
      return;
    }

    setLoading(true);
    try {
      // Default coordinates (Karachi center for MVP, or device location)
      await Api.emergencySOS({
        blood_group: bloodGroup,
        latitude: 24.8607,
        longitude: 67.0011,
        contact_phone: phone,
        city: city,
      });

      Alert.alert(
        '🚨 Emergency SOS Dispatched!',
        `Broadcast sent for ${bloodGroup} blood in ${city}. Nearby compatible donors are being notified immediately.`
      );
      onSuccess();
      onClose();
    } catch (err: any) {
      Alert.alert('SOS Error', err.response?.data?.detail || 'Failed to dispatch SOS alert.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={[
          styles.modalContent,
          { backgroundColor: C.surface, paddingBottom: Math.max(insets.bottom + 16, 24) },
        ]}>
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <Ionicons name="warning" size={24} color={C.emergency} />
              <Text style={[styles.title, { color: C.emergency }]}>EMERGENCY SOS ALERT</Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close-circle" size={24} color={C.textMuted} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.subtitle, { color: C.textSecondary }]}>
            One-tap high priority emergency broadcast. Compatible donors within 50 km will be immediately alerted.
          </Text>

          <BloodGroupPicker
            selectedGroup={bloodGroup}
            onSelect={setBloodGroup}
            label="1. Patient Blood Group Needed *"
          />

          <View style={styles.field}>
            <Text style={[styles.fieldLabel, { color: C.textPrimary }]}>2. Emergency Contact Phone *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: C.background, borderColor: C.border, color: C.textPrimary }]}
              placeholder="+923001234567"
              placeholderTextColor={C.textMuted}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.field}>
            <Text style={[styles.fieldLabel, { color: C.textPrimary }]}>3. City</Text>
            <TextInput
              style={[styles.input, { backgroundColor: C.background, borderColor: C.border, color: C.textPrimary }]}
              placeholder="e.g. Karachi / Lahore"
              placeholderTextColor={C.textMuted}
              value={city}
              onChangeText={setCity}
            />
          </View>

          <Button
            title="DISPATCH EMERGENCY SOS 🚨"
            variant="emergency"
            size="large"
            loading={loading}
            onPress={handleSubmit}
            style={styles.submitButton}
          />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 13,
    marginBottom: 16,
    lineHeight: 18,
  },
  field: {
    marginVertical: 8,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
  },
  submitButton: {
    marginTop: 16,
  },
});
