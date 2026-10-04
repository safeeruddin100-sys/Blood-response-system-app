import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Header } from '@/components/Header';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { SOSModal } from '@/components/SOSModal';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { Api, BloodRequestData } from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import { useTheme } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';

export default function HomeScreen() {
  const router = useRouter();
  const { user, t } = useAuthStore();
  const C = useTheme();

  const [requests, setRequests] = useState<BloodRequestData[]>([]);
  const [loading, setLoading] = useState(false);
  const [sosVisible, setSosVisible] = useState(false);
  const [adminStats, setAdminStats] = useState<any>(null);
  const isDonor = user?.role === 'donor';
  const isRequester = user?.role === 'requester';
  const isAdmin = user?.role === 'admin';

  const fetchRequests = useCallback(async () => {
    if (isAdmin) return;
    setLoading(true);
    try {
      const params = isRequester ? { my_requests: true } : { status: 'pending' };
      const res = await Api.listRequests(params);
      setRequests(res.data);
    } catch (e) {
      console.warn('Failed to load requests on home', e);
    } finally {
      setLoading(false);
    }
  }, [isAdmin, isRequester]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  useEffect(() => {
    if (!isAdmin) return;
    Api.getAdminStats()
      .then((res) => setAdminStats(res.data))
      .catch((e) => console.warn('Failed to load admin stats on home', e));
  }, [isAdmin]);

  return (
    <ScreenWrapper edges={['top']} topInsetBg={C.surface}>
      <Header subtitle={
        user?.role === 'donor'
          ? user.is_verified === true ? 'Verified Donor Dashboard' : 'Donor Dashboard'
          : 'Emergency Blood Coordinator'
      } />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchRequests} tintColor={C.primary} />}
      >
        {isDonor && (
          <TouchableOpacity
            onPress={() => setSosVisible(true)}
            activeOpacity={0.85}
            style={[styles.sosCard, { backgroundColor: C.emergency }]}
          >
            <View style={styles.sosLeft}>
              <View style={styles.sosIconCircle}>
                <Ionicons name="alert-circle" size={28} color={C.textInverse} />
              </View>
              <View>
                <Text style={[styles.sosTitle, { color: C.textInverse }]}>{t.emergencySOS}</Text>
                <Text style={[styles.sosSubtitle, { color: 'rgba(255,255,255,0.9)' }]}>{t.emergencySubtitle}</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={24} color={C.textInverse} />
          </TouchableOpacity>
        )}

        {/* Role-Aware Banner */}
        <View style={[styles.welcomeCard, {
          backgroundColor: C.surface,
          borderColor: C.primaryBorder,
        }]}>
          <Text style={[styles.welcomeName, { color: C.textPrimary }]}>
            Assalam-o-Alaikum, {user?.full_name || 'Alkhidmat Volunteer'}!
          </Text>
          <Text style={[styles.welcomeRole, { color: C.textSecondary }]}>
            Role: <Text style={[styles.roleHighlight, { color: C.primary }]}>{user?.role?.toUpperCase() || 'GUEST'}</Text>
          </Text>
        </View>

        {isAdmin ? (
          <>
            <Text style={[styles.sectionTitle, { color: C.primaryDark }]}>Platform Statistics</Text>
            <View style={[styles.welcomeCard, { backgroundColor: C.surface, borderColor: C.primaryBorder }]}> 
              <Text style={[styles.welcomeName, { color: C.textPrimary }]}>Users: {adminStats?.total_users ?? '...'}</Text>
              <Text style={[styles.welcomeRole, { color: C.textSecondary }]}>Requests: {adminStats?.total_requests ?? '...'}</Text>
              <Text style={[styles.welcomeRole, { color: C.textSecondary }]}>Pending reports: {adminStats?.pending_reports ?? '...'}</Text>
            </View>
            <Button
              title="Open Moderation Queue"
              onPress={() => router.push('/admin')}
              size="large"
            />
          </>
        ) : <>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: C.primaryDark }]}>
            {isRequester ? t.myRequests : t.activeRequests}
          </Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/requests')}>
            <Text style={[styles.viewAllText, { color: C.primary }]}>View All</Text>
          </TouchableOpacity>
        </View>

        {isRequester && (
          <Button
            title="+ Post Request"
            onPress={() => router.push('/(tabs)/requests')}
            size="large"
          />
        )}

        {/* Requests Feed */}
        {requests.length === 0 ? (
          <EmptyState
            icon="shield-checkmark-outline"
            title="All Clear — No Pending Requests"
            description="There are currently no active emergency blood requests in your region."
            actionTitle={isRequester ? "+ Post a Request" : undefined}
            onAction={isRequester ? () => router.push('/(tabs)/requests') : undefined}
          />
        ) : (
          requests.map((req) => (
            <TouchableOpacity
              key={req.id}
              onPress={() => router.push(`/request/${req.id}`)}
              activeOpacity={0.8}
              style={[
                styles.requestCard,
                { backgroundColor: C.surface, borderColor: C.border },
                req.urgency === 'critical' && { borderColor: C.emergencyBorder, backgroundColor: C.emergencyLight },
              ]}
            >
              <View style={styles.cardTop}>
                <Badge label={req.blood_group} variant="blood" />
                <Badge
                  label={req.urgency.toUpperCase()}
                  variant={req.urgency === 'critical' ? 'critical' : 'normal'}
                />
              </View>

              <Text style={[styles.patientName, { color: C.textPrimary }]}>{req.patient_name}</Text>

              <View style={styles.detailRow}>
                <Ionicons name="business-outline" size={16} color={C.textSecondary} />
                <Text style={[styles.detailText, { color: C.textSecondary }]}>
                  {req.hospital_name || 'Local Blood Bank'} • {req.city || 'Pakistan'}
                </Text>
              </View>

              <View style={[styles.footerRow, { borderTopColor: C.borderLight }]}>
                <Text style={[styles.unitsProgress, { color: C.primaryDark }]}>
                  🩸 {req.units_confirmed} of {req.units_needed} bags confirmed
                </Text>
                <Text style={[styles.detailsLink, { color: C.primary }]}>View Details →</Text>
              </View>
            </TouchableOpacity>
          ))
        )}
        </>}
      </ScrollView>

      <SOSModal
        visible={sosVisible}
        onClose={() => setSosVisible(false)}
        onSuccess={fetchRequests}
      />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  sosCard: {
    borderRadius: 18,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  sosLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  sosIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sosTitle: { fontSize: 16, fontWeight: '900', letterSpacing: 0.5 },
  sosSubtitle: { fontSize: 12, marginTop: 2 },
  welcomeCard: {
    borderRadius: 16,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  welcomeName: { fontSize: 16, fontWeight: '700' },
  welcomeRole: { fontSize: 13, marginTop: 4 },
  roleHighlight: { fontWeight: '800' },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 16, fontWeight: '800' },
  viewAllText: { fontSize: 13, fontWeight: '700' },
  requestCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  patientName: { fontSize: 16, fontWeight: '700', marginBottom: 6 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  detailText: { fontSize: 13 },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
  },
  unitsProgress: { fontSize: 13, fontWeight: '600' },
  detailsLink: { fontSize: 13, fontWeight: '700' },
});
