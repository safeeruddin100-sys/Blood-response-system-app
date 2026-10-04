import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Switch,
  TouchableOpacity,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Header } from '@/components/Header';
import { Button } from '@/components/Button';
import { BloodGroupPicker } from '@/components/BloodGroupPicker';
import { CooldownCard } from '@/components/CooldownCard';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { BloodGroup } from '@/constants/bloodGroups';
import { Api, DonorProfileData } from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import { useTheme } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout, t } = useAuthStore();
  const C = useTheme();
  const isDonor = user?.role === 'donor';

  const [donorProfile, setDonorProfile] = useState<DonorProfileData | null>(null);
  const [bloodGroup, setBloodGroup] = useState<BloodGroup>('O+');
  const [isAvailable, setIsAvailable] = useState(true);
  const [city, setCity] = useState('Karachi');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchDonorProfile = async () => {
    setLoading(true);
    try {
      const res = await Api.getDonorProfile();
      setDonorProfile(res.data);
      setBloodGroup(res.data.blood_group as BloodGroup);
      setIsAvailable(res.data.is_available);
      setCity(res.data.city || 'Karachi');
    } catch (e: any) {
      // If 404, user doesn't have a donor profile yet
      if (e.response?.status === 404) {
        setDonorProfile(null);
        setBloodGroup('O+');
        setIsAvailable(true);
        setCity('Karachi');
      } else {
        console.warn('Failed to load donor profile', e);
      }
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => {
    if (isDonor) {
      fetchDonorProfile();
    }
  }, [isDonor]));

  const cooldownExpiresAt = donorProfile?.cooldown_expires_at || null;
  const cooldownIsActive = Boolean(
    cooldownExpiresAt && new Date(cooldownExpiresAt).getTime() > Date.now()
  );
  const effectiveIsAvailable = Boolean(donorProfile?.is_available) && !cooldownIsActive;

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      if (donorProfile) {
        const res = await Api.updateDonorProfile({
          blood_group: bloodGroup,
          city,
          is_available: isAvailable,
        });
        setDonorProfile(res.data);
      } else {
        const res = await Api.createDonorProfile({
          blood_group: bloodGroup,
          city,
          latitude: 24.8607,
          longitude: 67.0011,
        });
        setDonorProfile(res.data);
      }
      Alert.alert('Saved', 'Your donor profile has been updated.');
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.detail || 'Failed to save profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  return (
    <ScreenWrapper edges={['top']} topInsetBg={C.surface}>
      <Header />
      <ScrollView
        style={[styles.container, { backgroundColor: C.background }]}
        contentContainerStyle={styles.content}
      >

      {/* User Info Card */}
      <View style={[styles.userCard, { backgroundColor: C.surface, borderColor: C.borderLight }]}>
        <View style={[styles.avatarCircle, { backgroundColor: C.primaryLight }]}>
          <Text style={[styles.avatarText, { color: C.primaryDark }]}>
            {user?.full_name?.charAt(0)?.toUpperCase() || 'U'}
          </Text>
        </View>
        <View style={styles.userInfo}>
          <Text style={[styles.userName, { color: C.textPrimary }]}>{user?.full_name || 'Alkhidmat User'}</Text>
          <Text style={[styles.userPhone, { color: C.textSecondary }]}>{user?.phone}</Text>
          <Text style={[styles.userRole, { color: C.textMuted }]}>
            Role: <Text style={[styles.roleText, { color: C.primary }]}>{user?.role?.toUpperCase()}</Text>
          </Text>
        </View>
      </View>

      {/* Admin Panel Link (if role = admin) */}
      {user?.role === 'admin' && (
        <TouchableOpacity
          onPress={() => router.push('/admin')}
          style={[styles.adminCard, { backgroundColor: C.primaryLight, borderColor: C.primary }]}
        >
          <Ionicons name="shield-checkmark" size={24} color={C.primary} />
          <View style={styles.adminLeft}>
            <Text style={[styles.adminTitle, { color: C.primaryDark }]}>Admin Moderation Portal</Text>
            <Text style={[styles.adminSubtitle, { color: C.textSecondary }]}>Review flagged requests & system stats</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={C.primary} />
        </TouchableOpacity>
      )}

      {/* Cooldown Status Card */}
      {isDonor && donorProfile && (
        <CooldownCard
          isAvailable={effectiveIsAvailable}
          daysRemaining={cooldownIsActive && cooldownExpiresAt
            ? Math.max(0, Math.ceil((new Date(cooldownExpiresAt).getTime() - Date.now()) / 86400000))
            : donorProfile.days_until_available || 0}
          lastDonationDate={donorProfile.last_donation_date}
          cooldownExpiresAt={cooldownExpiresAt}
        />
      )}

      {/* Donor Configuration */}
      {isDonor ? <View style={[styles.sectionCard, { backgroundColor: C.surface, borderColor: C.border }]}> 
        <Text style={[styles.sectionTitle, { color: C.primaryDark }]}>{t.donorProfile}</Text>

        <BloodGroupPicker
          selectedGroup={bloodGroup}
          onSelect={setBloodGroup}
          label={t.bloodGroupType}
        />

        <View style={[styles.switchRow, { borderTopColor: C.borderLight }]}>
          <View>
            <Text style={[styles.switchTitle, { color: C.textPrimary }]}>{t.availabilityStatus}</Text>
            <Text style={[styles.switchSub, { color: C.textSecondary }]}>
              {effectiveIsAvailable ? 'Ready for emergency calls' : 'Paused / Ineligible'}
            </Text>
          </View>
          <Switch
            value={effectiveIsAvailable}
            onValueChange={setIsAvailable}
            trackColor={{ false: C.border, true: C.success }}
          />
        </View>

        <Button
          title={t.updateProfile}
          loading={saving}
          onPress={handleSaveProfile}
          size="medium"
          style={styles.saveBtn}
        />
      </View> : user?.role === 'requester' ? (
        <View style={[styles.sectionCard, { backgroundColor: C.surface, borderColor: C.border }]}> 
          <Text style={[styles.sectionTitle, { color: C.primaryDark }]}>This feature is for donors only</Text>
          <Text style={[styles.switchSub, { color: C.textSecondary }]}>Requester profiles include basic account information only.</Text>
        </View>
      ) : null}

      {/* Logout */}
      <Button
        title={t.logout}
        variant="outline"
        size="medium"
        onPress={handleLogout}
        style={styles.logoutBtn}
      />
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
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 18,
    gap: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  avatarCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 22,
    fontWeight: '800',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: '800',
  },
  userPhone: {
    fontSize: 13,
    marginTop: 2,
  },
  userRole: {
    fontSize: 12,
    marginTop: 4,
  },
  roleText: {
    fontWeight: '700',
  },
  adminCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    marginBottom: 12,
    borderWidth: 1,
    gap: 12,
  },
  adminLeft: {
    flex: 1,
  },
  adminTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  adminSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  sectionCard: {
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    marginVertical: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 12,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderTopWidth: 1,
    marginTop: 10,
  },
  switchTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  switchSub: {
    fontSize: 12,
    marginTop: 2,
  },
  saveBtn: {
    marginTop: 12,
  },
  logoutBtn: {
    marginTop: 20,
  },
});
