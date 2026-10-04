import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { Header } from '@/components/Header';
import { EmptyState } from '@/components/EmptyState';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { Api, NotificationItem } from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import { useTheme } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';

export default function AlertsScreen() {
  const { t } = useAuthStore();
  const C = useTheme();
  const [alerts, setAlerts] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const res = await Api.listNotifications();
      const latestNoDonorsByRequest = new Map<string, NotificationItem>();
      const visibleAlerts = res.data.filter((item) => {
        const isNoDonorsNotification = /no donors found/i.test(`${item.title} ${item.body}`);
        if (!isNoDonorsNotification) {
          return true;
        }

        let requestId: string | undefined;
        try {
          requestId = JSON.parse(item.data_json || '{}').request_id?.toString();
        } catch {
          requestId = undefined;
        }

        if (!requestId) {
          return true;
        }

        const previous = latestNoDonorsByRequest.get(requestId);
        if (!previous || new Date(item.created_at).getTime() > new Date(previous.created_at).getTime()) {
          latestNoDonorsByRequest.set(requestId, item);
        }
        return false;
      });

      setAlerts([
        ...visibleAlerts,
        ...latestNoDonorsByRequest.values(),
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
    } catch (e) {
      console.warn('Failed to load notifications', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  const markRead = async (id: number) => {
    try {
      await Api.markNotificationRead(id);
      setAlerts((prev) =>
        prev.map((item) => (item.id === id ? { ...item, is_read: true } : item))
      );
    } catch (e) {
      console.warn('Failed to mark read', e);
    }
  };

  const getNotificationBody = (item: NotificationItem): string => {
    if (item.type !== 'donation_confirmed' || !item.data_json) {
      return item.body;
    }

    try {
      const data = JSON.parse(item.data_json) as { donor_blood_group?: string };
      if (data.donor_blood_group) {
        return item.body;
      }

      // Older notifications may contain a blood-group suffix in the body even
      // though the donor profile metadata was unavailable.
      return item.body.replace(/^(.+?) \([^)]*\)( has confirmed.*)$/, '$1$2');
    } catch {
      return item.body;
    }
  };

  return (
    <ScreenWrapper edges={['top']} topInsetBg={C.surface}>
      <Header />

      <View style={styles.topRow}>
        <Text style={[styles.title, { color: C.primaryDark }]}>{t.alerts}</Text>
        <Text style={[styles.subtext, { color: C.textMuted }]}>Live emergency notification dispatch</Text>
      </View>

      <FlatList
        data={alerts}
        keyExtractor={(item) => item.id.toString()}
        refreshing={loading}
        onRefresh={fetchAlerts}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <EmptyState
            icon="notifications-off-outline"
            title="No Alerts Yet"
            description="You have no notifications or match dispatches at this time."
          />
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => markRead(item.id)}
            activeOpacity={0.8}
            style={[
              styles.card,
              { backgroundColor: C.surface, borderColor: C.border },
              !item.is_read && { borderColor: C.primary, backgroundColor: C.primaryLight },
            ]}
          >
            <View style={[styles.iconCircle, { backgroundColor: C.mutedLight }]}>
              <Ionicons
                name={item.type === 'match_found' ? 'water' : 'information-circle'}
                size={20}
                color={item.type === 'match_found' ? C.emergency : C.primary}
              />
            </View>
            <View style={styles.content}>
              <Text style={[styles.cardTitle, { color: C.textPrimary }]}>{item.title}</Text>
              <Text style={[styles.cardBody, { color: C.textSecondary }]}>{getNotificationBody(item)}</Text>
              <Text style={[styles.timestamp, { color: C.textMuted }]}>
                {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
            {!item.is_read && <View style={[styles.unreadDot, { backgroundColor: C.primary }]} />}
          </TouchableOpacity>
        )}
      />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  topRow: {
    padding: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
  },
  subtext: {
    fontSize: 12,
    marginTop: 2,
  },
  list: {
    padding: 16,
    paddingTop: 8,
  },
  card: {
    flexDirection: 'row',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    alignItems: 'flex-start',
    gap: 12,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  cardBody: {
    fontSize: 13,
    lineHeight: 18,
  },
  timestamp: {
    fontSize: 11,
    marginTop: 6,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 4,
  },
});
