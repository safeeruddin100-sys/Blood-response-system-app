import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  Alert,
} from 'react-native';
import { Button } from '@/components/Button';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { Api, ReportItem } from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import { useTheme } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';

export default function AdminDashboardScreen() {
  const { user } = useAuthStore();
  const C = useTheme();
  const [stats, setStats] = useState<any>(null);
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const [statsRes, reportsRes] = await Promise.all([
        Api.getAdminStats(),
        Api.getAdminReports(),
      ]);
      setStats(statsRes.data);
      setReports(reportsRes.data);
    } catch (e) {
      console.warn('Failed to load admin data', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleReview = async (reportId: number, status: 'reviewed' | 'dismissed') => {
    try {
      await Api.reviewReport(reportId, { status });
      Alert.alert('Updated', `Report marked as ${status}.`);
      fetchAdminData();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.detail || 'Failed to update report.');
    }
  };

  const handleCleanup = () => {
    Alert.alert(
      'Cleanup Stale Requests',
      'This will expire all pending/in-progress requests older than 3 days. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Expire Stale Data',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await Api.cleanupExpiredRequests(3);
              const { expired_count } = res.data as any;
              Alert.alert('Done', `Expired ${expired_count} stale request(s).`);
              fetchAdminData();
            } catch (err: any) {
              Alert.alert('Error', err.response?.data?.detail || 'Cleanup failed.');
            }
          },
        },
      ]
    );
  };

  if (user?.role !== 'admin') {
    return (
      <ScreenWrapper edges={['bottom']}>
        <View style={styles.unauthorized}>
          <Ionicons name="lock-closed" size={48} color={C.emergency} />
          <Text style={[styles.unauthorizedText, { color: C.emergency }]}>Access Restricted to Alkhidmat Admins.</Text>
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper edges={['bottom']}>
      <ScrollView
        style={[styles.container, { backgroundColor: C.background }]}
        contentContainerStyle={styles.content}
      >
      {/* Platform Stats Grid */}
      <Text style={[styles.sectionTitle, { color: C.primaryDark }]}>Platform Statistics</Text>
      {stats && (
        <View style={styles.statsGrid}>
          <View style={[styles.statTile, { backgroundColor: C.surface, borderColor: C.border }]}>
            <Text style={[styles.statNumber, { color: C.primary }]}>{stats.total_donors}</Text>
            <Text style={[styles.statLabel, { color: C.textSecondary }]}>Registered Donors</Text>
          </View>
          <View style={[styles.statTile, { backgroundColor: C.surface, borderColor: C.border }]}>
            <Text style={[styles.statNumber, { color: C.success }]}>
              {stats.available_donors}
            </Text>
            <Text style={[styles.statLabel, { color: C.textSecondary }]}>Active / Available</Text>
          </View>
          <View style={[styles.statTile, { backgroundColor: C.surface, borderColor: C.border }]}>
            <Text style={[styles.statNumber, { color: C.emergency }]}>
              {stats.total_requests}
            </Text>
            <Text style={[styles.statLabel, { color: C.textSecondary }]}>Total Requests</Text>
          </View>
          <View style={[styles.statTile, { backgroundColor: C.surface, borderColor: C.border }]}>
            <Text style={[styles.statNumber, { color: C.warning }]}>
              {stats.pending_reports}
            </Text>
            <Text style={[styles.statLabel, { color: C.textSecondary }]}>Pending Reports</Text>
          </View>
        </View>
      )}

      {/* Data Maintenance */}
      <Button
        title="🧹 Cleanup Stale Requests (>3 days)"
        variant="outline"
        size="small"
        onPress={handleCleanup}
        style={styles.cleanupBtn}
      />

      {/* Moderation Queue */}
      <Text style={[styles.sectionTitle, { color: C.primaryDark, marginTop: 24 }]}>
        Pending Community Reports ({reports.length})
      </Text>

      {reports.length === 0 ? (
        <View style={[styles.emptyCard, { backgroundColor: C.surface }]}>
          <Ionicons name="checkmark-done-circle" size={40} color={C.success} />
          <Text style={[styles.emptyText, { color: C.textSecondary }]}>All reports reviewed. No flagged items pending.</Text>
        </View>
      ) : (
        reports.map((r) => (
          <View key={r.id} style={[styles.reportCard, { backgroundColor: C.surface, borderColor: C.border }]}>
            <View style={styles.reportHeader}>
              <Text style={[styles.reportTarget, { color: C.textPrimary }]}>Request #{r.request_id}</Text>
              <Text style={[styles.reportStatus, { color: C.warning }]}>{r.status.toUpperCase()}</Text>
            </View>

            <Text style={[styles.reportReason, { color: C.textSecondary }]}>{r.reason}</Text>

            <View style={[styles.reportActions, { borderTopColor: C.borderLight }]}>
              <Button
                title="Dismiss"
                variant="ghost"
                size="small"
                onPress={() => handleReview(r.id, 'dismissed')}
              />
              <Button
                title="Approve & Flag Request"
                variant="emergency"
                size="small"
                onPress={() => handleReview(r.id, 'reviewed')}
              />
            </View>
          </View>
        ))
      )}
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
  unauthorized: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  unauthorizedText: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statTile: {
    width: '48%',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 28,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  reportCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  reportTarget: {
    fontSize: 14,
    fontWeight: '800',
  },
  reportStatus: {
    fontSize: 12,
    fontWeight: '700',
  },
  reportReason: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 14,
  },
  reportActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    borderTopWidth: 1,
    paddingTop: 10,
  },
  emptyCard: {
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    gap: 8,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
  cleanupBtn: {
    marginVertical: 10,
  },
});
