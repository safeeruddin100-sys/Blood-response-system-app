import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  FlatList,
  Modal,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Header } from '@/components/Header';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { BloodGroupPicker } from '@/components/BloodGroupPicker';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { BLOOD_GROUPS, CITIES_PAKISTAN, BloodGroup } from '@/constants/bloodGroups';
import { Api, BloodRequestData } from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import { useTheme } from '@/constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export default function RequestsScreen() {
  const router = useRouter();
  const { t, user, accessToken } = useAuthStore();
  const C = useTheme();
  const insets = useSafeAreaInsets();
  const isRequester = user?.role === 'requester';

  const [requests, setRequests] = useState<BloodRequestData[]>([]);
  const [selectedBloodGroup, setSelectedBloodGroup] = useState<string>('');
  const [selectedCity, setSelectedCity] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const [postModalVisible, setPostModalVisible] = useState(false);
  const [patientName, setPatientName] = useState('');
  const [formBloodGroup, setFormBloodGroup] = useState<BloodGroup>('B+');
  const [unitsNeeded, setUnitsNeeded] = useState('2');
  const [urgency, setUrgency] = useState<'critical' | 'normal'>('normal');
  const [hospitalName, setHospitalName] = useState('Aga Khan University Hospital');
  const [contactPhone, setContactPhone] = useState(user?.phone || '');
  const [formCity, setFormCity] = useState('Karachi');
  const [submitting, setSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await Api.listRequests({
        blood_group: selectedBloodGroup || undefined,
        city: selectedCity || undefined,
        my_requests: isRequester || undefined,
      });
      setRequests(res.data);
    } catch (e) {
      console.warn('Failed to fetch requests', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [selectedBloodGroup, selectedCity, isRequester]);

  const handlePostRequest = async () => {
    const errors: Record<string, string> = {};
    const normalizedPatientName = patientName.trim();
    const normalizedContactPhone = contactPhone.trim();
    const parsedUnits = Number(unitsNeeded);
    const phonePattern = /^\+\d{10,}$/;

    if (!normalizedPatientName) {
      errors.patientName = 'This field is required';
    }
    if (!unitsNeeded.trim()) {
      errors.unitsNeeded = 'This field is required';
    } else if (!Number.isInteger(parsedUnits) || parsedUnits < 1 || parsedUnits > 10) {
      errors.unitsNeeded = 'Units needed must be a number between 1 and 10';
    }
    if (!normalizedContactPhone) {
      errors.contactPhone = 'This field is required';
    } else if (!phonePattern.test(normalizedContactPhone)) {
      errors.contactPhone = 'Enter valid phone number starting with +';
    }

    setFormErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }

    setSubmitting(true);
    try {
      await Api.createRequest({
        patient_name: normalizedPatientName,
        blood_group: formBloodGroup,
        units_needed: parsedUnits,
        urgency,
        hospital_name: hospitalName,
        city: formCity,
        contact_phone: normalizedContactPhone,
        latitude: 24.8918,
        longitude: 67.0283,
      });

      Alert.alert('Success', t.requestSuccess);
      setPostModalVisible(false);
      setPatientName('');
      setFormErrors({});
      fetchRequests();
    } catch (err: any) {
      const serverDetail = err.response?.data?.detail;
      console.error('Blood request submission failed:', {
        status: err.response?.status,
        detail: serverDetail,
        data: err.response?.data,
        hasAccessToken: Boolean(accessToken),
      });
      Alert.alert(
        'Error',
        typeof serverDetail === 'string'
          ? serverDetail
          : JSON.stringify(serverDetail || err.response?.data || err.message || 'Failed to post blood request.')
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScreenWrapper edges={['top']} topInsetBg={C.surface}>
      <Header />

      {/* Action Bar */}
      <View style={styles.actionBar}>
        <Text style={[styles.headerTitle, { color: C.primaryDark }]}>
          {isRequester ? t.myRequests : t.activeRequests}
        </Text>
        {isRequester && (
          <Button
            title="+ Post Request"
            size="small"
            onPress={() => setPostModalVisible(true)}
          />
        )}
      </View>

      {/* Filter Chips */}
      <View style={styles.filterSection}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          <TouchableOpacity
            onPress={() => setSelectedBloodGroup('')}
            style={[
              styles.filterChip,
              { backgroundColor: C.surface, borderColor: C.border },
              selectedBloodGroup === '' && { backgroundColor: C.primary, borderColor: C.primary },
            ]}
          >
            <Text style={[
              styles.filterChipText,
              { color: C.textSecondary },
              selectedBloodGroup === '' && { color: '#FFFFFF' },
            ]}>
              All Groups
            </Text>
          </TouchableOpacity>

          {BLOOD_GROUPS.map((bg) => (
            <TouchableOpacity
              key={bg}
              onPress={() => setSelectedBloodGroup(bg === selectedBloodGroup ? '' : bg)}
              style={[
                styles.filterChip,
                { backgroundColor: C.surface, borderColor: C.border },
                selectedBloodGroup === bg && { backgroundColor: C.primary, borderColor: C.primary },
              ]}
            >
              <Text style={[
                styles.filterChipText,
                { color: C.textSecondary },
                selectedBloodGroup === bg && { color: '#FFFFFF' },
              ]}>
                {bg}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Requests List */}
      <FlatList
        data={requests}
        keyExtractor={(item) => item.id.toString()}
        refreshing={loading}
        onRefresh={fetchRequests}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <EmptyState
            icon="water-outline"
            title="No Active Blood Requests"
            description="There are currently no urgent blood requests matching your filters."
            actionTitle={isRequester ? "+ Post Blood Request" : undefined}
            onAction={isRequester ? () => setPostModalVisible(true) : undefined}
          />
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => router.push(`/request/${item.id}`)}
            activeOpacity={0.8}
            style={[
              styles.card,
              { backgroundColor: C.surface, borderColor: C.border },
              item.urgency === 'critical' && { borderColor: C.emergencyBorder, backgroundColor: C.emergencyLight },
            ]}
          >
            <View style={styles.cardHeader}>
              <Badge label={item.blood_group} variant="blood" />
              <Badge
                label={item.urgency.toUpperCase()}
                variant={item.urgency === 'critical' ? 'critical' : 'normal'}
              />
            </View>

            <Text style={[styles.patientTitle, { color: C.textPrimary }]}>{item.patient_name}</Text>
            <Text style={[styles.locationText, { color: C.textSecondary }]}>
              🏥 {item.hospital_name || 'Hospital'} • {item.city || 'Pakistan'}
            </Text>

            <View style={[styles.cardFooter, { borderTopColor: C.borderLight }]}>
              <Text style={[styles.progressText, { color: C.textPrimary }]}> 
                Confirmed: {item.units_confirmed}/{item.units_needed} units
              </Text>
              <Text style={[styles.statusBadge, { color: C.textMuted }]}>{item.status.toUpperCase()}</Text>
            </View>
          </TouchableOpacity>
        )}
      />

      {/* Post Request Modal */}
      <Modal visible={postModalVisible && isRequester} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <ScrollView
            style={[styles.modalContent, { backgroundColor: C.surface }]}
            contentContainerStyle={[
              styles.modalScroll,
              { paddingBottom: Math.max(insets.bottom + 24, 40) },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: C.primaryDark }]}>{t.postRequest}</Text>
              <TouchableOpacity onPress={() => setPostModalVisible(false)}>
                <Ionicons name="close-circle" size={26} color={C.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, { color: C.textPrimary }]}>{t.patientName} *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: C.background, borderColor: formErrors.patientName ? C.emergency : C.border, color: C.textPrimary }]}
                placeholder="e.g. Fatima Tariq"
                placeholderTextColor={C.textMuted}
                value={patientName}
                onChangeText={(value) => {
                  setPatientName(value);
                  if (formErrors.patientName) setFormErrors((current) => ({ ...current, patientName: '' }));
                }}
              />
              {!!formErrors.patientName && <Text style={styles.errorText}>{formErrors.patientName}</Text>}
            </View>

            <BloodGroupPicker
              selectedGroup={formBloodGroup}
              onSelect={setFormBloodGroup}
              label={t.bloodGroup}
            />

            <View style={styles.field}>
              <Text style={[styles.label, { color: C.textPrimary }]}>{t.unitsNeeded}</Text>
              <TextInput
                style={[styles.input, { backgroundColor: C.background, borderColor: formErrors.unitsNeeded ? C.emergency : C.border, color: C.textPrimary }]}
                placeholder="2"
                placeholderTextColor={C.textMuted}
                value={unitsNeeded}
                onChangeText={(value) => {
                  setUnitsNeeded(value);
                  if (formErrors.unitsNeeded) setFormErrors((current) => ({ ...current, unitsNeeded: '' }));
                }}
                keyboardType="numeric"
              />
              {!!formErrors.unitsNeeded && <Text style={styles.errorText}>{formErrors.unitsNeeded}</Text>}
            </View>

            {/* Urgency Toggle */}
            <View style={styles.field}>
              <Text style={[styles.label, { color: C.textPrimary }]}>{t.urgencyLevel}</Text>
              <View style={styles.urgencyRow}>
                <TouchableOpacity
                  onPress={() => setUrgency('normal')}
                  style={[
                    styles.urgencyOption,
                    { borderColor: C.border },
                    urgency === 'normal' && { borderColor: C.primary, backgroundColor: C.primary },
                  ]}
                >
                  <Text style={[
                    styles.urgencyText,
                    { color: C.textSecondary },
                    urgency === 'normal' && { color: '#FFFFFF' },
                  ]}>
                    {t.normalUrgency}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setUrgency('critical')}
                  style={[
                    styles.urgencyOption,
                    { borderColor: C.border },
                    urgency === 'critical' && { borderColor: C.emergency, backgroundColor: C.emergency },
                  ]}
                >
                  <Text style={[
                    styles.urgencyText,
                    { color: C.textSecondary },
                    urgency === 'critical' && { color: '#FFFFFF' },
                  ]}>
                    {t.criticalUrgency}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, { color: C.textPrimary }]}>{t.hospitalName}</Text>
              <TextInput
                style={[styles.input, { backgroundColor: C.background, borderColor: C.border, color: C.textPrimary }]}
                placeholder="e.g. Jinnah Hospital / PIMS"
                placeholderTextColor={C.textMuted}
                value={hospitalName}
                onChangeText={setHospitalName}
              />
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, { color: C.textPrimary }]}>{t.contactPhone} *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: C.background, borderColor: formErrors.contactPhone ? C.emergency : C.border, color: C.textPrimary }]}
                placeholder="+923001234567"
                placeholderTextColor={C.textMuted}
                value={contactPhone}
                onChangeText={(value) => {
                  setContactPhone(value);
                  if (formErrors.contactPhone) setFormErrors((current) => ({ ...current, contactPhone: '' }));
                }}
                keyboardType="phone-pad"
              />
              {!!formErrors.contactPhone && <Text style={styles.errorText}>{formErrors.contactPhone}</Text>}
            </View>

            <Button
              title={t.submitRequest}
              size="large"
              loading={submitting}
              onPress={handlePostRequest}
              style={styles.submitBtn}
            />
          </ScrollView>
        </View>
      </Modal>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  actionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: { fontSize: 18, fontWeight: '800' },
  filterSection: { paddingBottom: 8 },
  filterScroll: { paddingHorizontal: 16, gap: 8 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterChipText: { fontSize: 13, fontWeight: '600' },
  listContent: { padding: 16, paddingBottom: 30 },
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  patientTitle: { fontSize: 16, fontWeight: '700' },
  locationText: { fontSize: 13, marginTop: 4, marginBottom: 10 },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
  },
  progressText: { fontSize: 12, fontWeight: '600' },
  statusBadge: { fontSize: 11, fontWeight: '700' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  modalScroll: { padding: 24, paddingBottom: 40 },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: { fontSize: 20, fontWeight: '800' },
  field: { marginBottom: 14 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 12,
    marginTop: 4,
  },
  urgencyRow: { flexDirection: 'row', gap: 10 },
  urgencyOption: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  urgencyText: { fontSize: 13, fontWeight: '700' },
  submitBtn: { marginTop: 16 },
});
