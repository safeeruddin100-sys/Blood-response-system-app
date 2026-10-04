import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Alert,
  Modal,
  Linking,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { Api, BloodRequestData } from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import { useTheme } from '@/constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export default function RequestDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user, t } = useAuthStore();
  const C = useTheme();
  const insets = useSafeAreaInsets();

  const [request, setRequest] = useState<BloodRequestData | null>(null);
  const [loading, setLoading] = useState(true);
  const [responding, setResponding] = useState(false);

  // Report modal state
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);

  const fetchDetail = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await Api.getRequest(parseInt(id));
      setRequest(res.data);
    } catch (e) {
      console.warn('Failed to load request detail', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [id]);

  const handleDonate = async () => {
    if (!id) return;
    setResponding(true);
    try {
      await Api.respondToRequest(parseInt(id), 'accept');
      Alert.alert(
        'Donation Confirmed',
        'JazakAllah! Donation confirmed. You will be on 90-day cooldown as per health guidelines.'
      );
      fetchDetail();
    } catch (err: any) {
      Alert.alert('Response Failed', err.response?.data?.detail || 'Unable to confirm donation.');
    } finally {
      setResponding(false);
    }
  };

  const handleReport = async () => {
    if (!id || !reportReason) {
      Alert.alert('Required', 'Please enter the reason for reporting this request.');
      return;
    }

    setSubmittingReport(true);
    try {
      await Api.createReport({
        request_id: parseInt(id),
        reason: reportReason,
      });
      Alert.alert(
        'Report Submitted',
        'Thank you for helping keep our platform safe. Alkhidmat moderators will review this request.'
      );
      setReportModalVisible(false);
      setReportReason('');
    } catch (err: any) {
      Alert.alert('Report Failed', err.response?.data?.detail || 'Unable to submit report.');
    } finally {
      setSubmittingReport(false);
    }
  };

  if (loading || !request) {
    return (
      <ScreenWrapper edges={['bottom']}>
        <View style={styles.loading}>
          <Text style={[styles.loadingText, { color: C.textSecondary }]}>Loading request details...</Text>
        </View>
      </ScreenWrapper>
    );
  }

  const isCritical = request.urgency === 'critical';
  const isOwnRequest = user?.id != null && String(user.id) === String(request.requester_id);
  const isFulfilled = request.status === 'fulfilled' || request.units_confirmed >= request.units_needed;
  const progressPercent = Math.min(100, Math.round((request.units_confirmed / request.units_needed) * 100));

  return (
    <ScreenWrapper edges={['bottom']}>
      <ScrollView
        style={[styles.container, { backgroundColor: C.background }]}
        contentContainerStyle={styles.content}
      >
      {/* Urgency Header Card */}
      <View style={[
        styles.mainCard,
        { backgroundColor: C.surface, borderColor: C.border },
        isCritical && { borderColor: C.emergencyBorder, backgroundColor: C.emergencyLight },
      ]}>
        <View style={styles.badgeRow}>
          <Badge label={request.blood_group} variant="blood" />
          <Badge
            label={request.urgency.toUpperCase()}
            variant={isCritical ? 'critical' : 'normal'}
          />
          {request.is_verified && <Badge label="VERIFIED" variant="success" />}
        </View>

        <Text style={[styles.patientName, { color: C.textPrimary }]}>{request.patient_name}</Text>
        <Text style={[styles.hospitalText, { color: C.textSecondary }]}>
          🏥 {request.hospital_name || 'Hospital'} • {request.city || 'Pakistan'}
        </Text>

        {/* Units Fulfilled Tracker */}
        <View style={[styles.progressContainer, { backgroundColor: C.background }]}>
          <View style={styles.progressHeader}>
            <Text style={[styles.progressLabel, { color: C.textSecondary }]}>Units Progress</Text>
            <Text style={[styles.progressValue, { color: C.primaryDark }]}>
              {request.units_confirmed} / {request.units_needed} Bags
            </Text>
          </View>
          <View style={[styles.progressBarBg, { backgroundColor: C.border }]}>
            <View style={[styles.progressBarFill, { width: `${progressPercent}%`, backgroundColor: C.primary }]} />
          </View>
        </View>

        {/* Contact info */}
        {request.contact_phone && (
          <TouchableOpacity
            onPress={() => Linking.openURL(`tel:${request.contact_phone}`)}
            style={[styles.callButton, { backgroundColor: C.primaryDark }]}
          >
            <Ionicons name="call" size={18} color={C.textInverse} />
            <Text style={[styles.callButtonText, { color: C.textInverse }]}>Call Hospital / Requester: {request.contact_phone}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Action Buttons for Donor */}
      {isFulfilled ? (
        <View style={[styles.actionCard, { backgroundColor: C.surface, borderColor: C.borderLight }]}>
          <Text style={[styles.actionTitle, { color: C.primaryDark }]}>✅ This request has been fulfilled</Text>
        </View>
      ) : isOwnRequest ? (
        <View style={[styles.actionCard, { backgroundColor: C.surface, borderColor: C.borderLight }]}>
          <Text style={[styles.actionTitle, { color: C.primaryDark }]}>You posted this request</Text>
        </View>
      ) : user?.role === 'donor' ? (
        <View style={[styles.actionCard, { backgroundColor: C.surface, borderColor: C.borderLight }]}>
          <Text style={[styles.actionTitle, { color: C.primaryDark }]}>Can you help save this life?</Text>
          <Text style={[styles.actionSub, { color: C.textSecondary }]}>
            Confirming will notify the hospital that you are en route to donate blood.
          </Text>
          <Button
            title="🩸 I CAN DONATE NOW"
            size="large"
            loading={responding}
            onPress={handleDonate}
            style={styles.donateBtn}
          />
        </View>
      ) : (
        <View style={[styles.actionCard, { backgroundColor: C.surface, borderColor: C.borderLight }]}> 
          <Text style={[styles.actionTitle, { color: C.primaryDark }]}>This feature is for donors only</Text>
        </View>
      )}

      {/* Flag / Report suspicious button */}
      <TouchableOpacity
        onPress={() => setReportModalVisible(true)}
        style={styles.reportBtn}
      >
        <Ionicons name="flag-outline" size={16} color={C.textMuted} />
        <Text style={[styles.reportBtnText, { color: C.textMuted }]}>{t.reportFake}</Text>
      </TouchableOpacity>

      {/* Report Modal */}
      <Modal visible={reportModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: C.surface, paddingBottom: Math.max(insets.bottom + 16, 24) }]}>
            <Text style={[styles.modalTitle, { color: C.emergency }]}>{t.reportFake}</Text>
            <Text style={[styles.modalSub, { color: C.textSecondary }]}>{t.reportReason}</Text>

            <TextInput
              style={[styles.reportInput, { backgroundColor: C.background, borderColor: C.border, color: C.textPrimary }]}
              multiline
              numberOfLines={4}
              placeholder="e.g. Phone number unreachable, or hospital has no record of patient..."
              placeholderTextColor={C.textMuted}
              value={reportReason}
              onChangeText={setReportReason}
            />

            <View style={styles.modalButtons}>
              <Button
                title="Cancel"
                variant="ghost"
                onPress={() => setReportModalVisible(false)}
              />
              <Button
                title={t.submitReport}
                variant="emergency"
                loading={submittingReport}
                onPress={handleReport}
              />
            </View>
          </View>
        </View>
      </Modal>
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 14,
  },
  mainCard: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    marginBottom: 16,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  patientName: {
    fontSize: 22,
    fontWeight: '800',
  },
  hospitalText: {
    fontSize: 14,
    marginTop: 4,
    marginBottom: 16,
  },
  progressContainer: {
    padding: 14,
    borderRadius: 14,
    marginBottom: 16,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  progressValue: {
    fontSize: 13,
    fontWeight: '800',
  },
  progressBarBg: {
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 5,
  },
  callButton: {
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  callButtonText: {
    fontWeight: '700',
    fontSize: 14,
  },
  actionCard: {
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: 20,
  },
  actionTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  actionSub: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
    lineHeight: 18,
  },
  donateBtn: {
    width: '100%',
  },
  reportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
  },
  reportBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  modalSub: {
    fontSize: 13,
    marginTop: 4,
    marginBottom: 12,
  },
  reportInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    height: 100,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
});
