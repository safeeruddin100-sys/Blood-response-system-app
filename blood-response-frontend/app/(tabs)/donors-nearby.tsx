import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Header } from '@/components/Header';
import { Badge } from '@/components/Badge';
import { EmptyState } from '@/components/EmptyState';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { BLOOD_GROUPS } from '@/constants/bloodGroups';
import { Api, NearbyDonorData } from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import { useTheme } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';

export default function DonorsNearbyScreen() {
  const { t } = useAuthStore();
  const C = useTheme();

  const [donors, setDonors] = useState<NearbyDonorData[]>([]);
  const [bloodGroup, setBloodGroup] = useState('B+');
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [loading, setLoading] = useState(false);

  const fetchNearby = async () => {
    setLoading(true);
    try {
      // Default center: Karachi coordinates (or device GPS)
      const res = await Api.getNearbyDonors({
        lat: 24.8607,
        lng: 67.0011,
        blood_group: bloodGroup,
        radius_km: 50,
      });
      setDonors(res.data);
    } catch (e) {
      console.warn('Failed to get nearby donors', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNearby();
  }, [bloodGroup]);

  return (
    <ScreenWrapper edges={['top']} topInsetBg={C.surface}>
      <Header />

      {/* Top Controls */}
      <View style={styles.topBar}>
        <View>
          <Text style={[styles.title, { color: C.primaryDark }]}>{t.nearbyDonors}</Text>
          <Text style={[styles.subtitle, { color: C.textMuted }]}>Center: Karachi (50 km radius)</Text>
        </View>

        {/* View Mode Toggle */}
        <View style={[styles.toggleContainer, { backgroundColor: C.surface, borderColor: C.border }]}>
          <TouchableOpacity
            onPress={() => setViewMode('list')}
            style={[styles.toggleBtn, viewMode === 'list' && { backgroundColor: C.primary }]}
          >
            <Ionicons
              name="list"
              size={18}
              color={viewMode === 'list' ? C.textInverse : C.textSecondary}
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setViewMode('map')}
            style={[styles.toggleBtn, viewMode === 'map' && { backgroundColor: C.primary }]}
          >
            <Ionicons
              name="map"
              size={18}
              color={viewMode === 'map' ? C.textInverse : C.textSecondary}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Blood Group Picker Chips */}
      <View style={styles.filterSection}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {BLOOD_GROUPS.map((bg) => (
            <TouchableOpacity
              key={bg}
              onPress={() => setBloodGroup(bg)}
              style={[
                styles.filterChip,
                { backgroundColor: C.surface, borderColor: C.border },
                bloodGroup === bg && { backgroundColor: C.primary, borderColor: C.primary },
              ]}
            >
              <Text style={[
                styles.filterChipText,
                { color: C.textSecondary },
                bloodGroup === bg && { color: C.textInverse },
              ]}>
                {bg}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* View Mode: Map or List */}
      {viewMode === 'map' ? (
        <View style={styles.mapContainer}>
          {/* Interactive Map Visual Mock with fallback markers for Expo Go reliability */}
          <View style={[styles.mapCanvas, { backgroundColor: C.mutedLight, borderColor: C.border }]}>
            <View style={[styles.centerPin, { backgroundColor: C.surfaceElevated }]}>
              <Ionicons name="radio-button-on" size={24} color={C.primary} />
              <Text style={[styles.pinLabel, { color: C.primaryDark }]}>You (Search Center)</Text>
            </View>

            {donors.map((d, index) => (
              <View
                key={d.donor.id}
                style={[
                  styles.donorPin,
                  {
                    top: 80 + (index * 45) % 200,
                    left: 40 + (index * 70) % 280,
                    backgroundColor: C.surface,
                    borderColor: C.emergency,
                  },
                ]}
              >
                <Ionicons name="water" size={16} color={C.emergency} />
                <Text style={[styles.donorPinText, { color: C.emergency }]}>{d.donor.blood_group}</Text>
              </View>
            ))}
          </View>
          <Text style={[styles.mapFooterNote, { color: C.textSecondary }]}>
            📍 Showing {donors.length} compatible verified donors within 50 km.
          </Text>
        </View>
      ) : (
        <FlatList
          data={donors}
          keyExtractor={(item) => item.donor.id.toString()}
          refreshing={loading}
          onRefresh={fetchNearby}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <EmptyState
              icon="location-outline"
              title="No Donors Found"
              description={`No available ${bloodGroup} donors found within 50 km of Karachi. Try choosing a different blood group.`}
            />
          }
          renderItem={({ item }) => (
            <View style={[styles.donorCard, { backgroundColor: C.surface, borderColor: C.border }]}>
              <View style={styles.donorLeft}>
                <View style={[styles.bloodCircle, { backgroundColor: C.bloodGroup.bg, borderColor: C.bloodGroup.border }]}>
                  <Text style={[styles.bloodText, { color: C.bloodGroup.text }]}>{item.donor.blood_group}</Text>
                </View>
                <View>
                  <Text style={[styles.donorName, { color: C.textPrimary }]}>{item.donor_name}</Text>
                  <Text style={[styles.cityText, { color: C.textSecondary }]}>{item.donor.city || 'Karachi'}</Text>
                </View>
              </View>

              <View style={styles.donorRight}>
                <Badge
                  label={`${item.distance_km} ${t.distanceKm}`}
                  variant="neutral"
                />
                <Text style={[styles.availableTag, { color: C.success }]}>
                  {item.donor.is_available ? '● Available' : '○ Cooldown'}
                </Text>
              </View>
            </View>
          )}
        />
      )}
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  toggleContainer: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    padding: 2,
  },
  toggleBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  filterSection: {
    paddingBottom: 10,
  },
  filterScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
    paddingBottom: 30,
  },
  donorCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
  },
  donorLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bloodCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bloodText: {
    fontSize: 16,
    fontWeight: '800',
  },
  donorName: {
    fontSize: 15,
    fontWeight: '700',
  },
  cityText: {
    fontSize: 12,
    marginTop: 2,
  },
  donorRight: {
    alignItems: 'flex-end',
    gap: 6,
  },
  availableTag: {
    fontSize: 11,
    fontWeight: '700',
  },
  mapContainer: {
    flex: 1,
    padding: 16,
  },
  mapCanvas: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  centerPin: {
    position: 'absolute',
    top: '45%',
    left: '35%',
    alignItems: 'center',
    padding: 8,
    borderRadius: 12,
  },
  pinLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  donorPin: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
    elevation: 2,
  },
  donorPinText: {
    fontSize: 12,
    fontWeight: '800',
    marginLeft: 4,
  },
  mapFooterNote: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 10,
  },
});
