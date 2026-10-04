import axios, { AxiosInstance, AxiosError } from 'axios';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { useAuthStore } from '@/store/authStore';

// Determine API base URL dynamically for web, emulator, and physical devices
const getApiBaseUrl = (): string => {
  const envUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

  // In web browsers, localhost is always the machine running the browser
  if (Platform.OS === 'web') {
    return envUrl;
  }

  // On native device/emulator, resolve localhost to Expo dev machine host IP
  if (envUrl.includes('localhost') || envUrl.includes('127.0.0.1')) {
    const hostUri = Constants.expoConfig?.hostUri;
    if (hostUri) {
      const hostIp = hostUri.split(':')[0];
      return envUrl.replace(/localhost|127\.0\.0\.1/, hostIp);
    }
    if (Platform.OS === 'android') {
      return envUrl.replace(/localhost|127\.0\.0\.1/, '10.0.2.2');
    }
  }

  return envUrl;
};

const API_BASE_URL = getApiBaseUrl();

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Request interceptor to attach JWT Access Token
apiClient.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().accessToken;
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for auto token refreshing
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as any;

    if (error.response?.status === 401 && !originalRequest?._retry) {
      originalRequest._retry = true;
      const refreshToken = useAuthStore.getState().refreshToken;

      if (refreshToken) {
        try {
          const res = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            refresh_token: refreshToken,
          });

          const { access_token, refresh_token: newRefresh } = res.data;
          useAuthStore.getState().setTokens(access_token, newRefresh);

          originalRequest.headers.Authorization = `Bearer ${access_token}`;
          return apiClient(originalRequest);
        } catch (refreshErr) {
          useAuthStore.getState().logout();
          return Promise.reject(refreshErr);
        }
      } else {
        useAuthStore.getState().logout();
      }
    }
    return Promise.reject(error);
  }
);

// ==========================================
// Typed API Methods for Backend Endpoints
// ==========================================

export interface UserProfile {
  id: number;
  phone: string;
  full_name: string;
  email: string | null;
  role: 'donor' | 'requester' | 'admin';
  is_verified: boolean;
  is_active: boolean;
  consent_given: boolean;
  created_at: string;
  updated_at: string;
}

export interface DonorProfileData {
  id: number;
  user_id: number;
  blood_group: string;
  latitude: number | null;
  longitude: number | null;
  city: string | null;
  is_available: boolean;
  last_donation_date: string | null;
  cooldown_expires_at: string | null;
  days_until_available?: number;
  cooldown_status?: string;
  created_at: string;
}

export interface BloodRequestData {
  id: number;
  requester_id: number;
  patient_name: string;
  blood_group: string;
  units_needed: number;
  units_confirmed: number;
  urgency: 'critical' | 'normal';
  status: 'pending' | 'in_progress' | 'fulfilled' | 'expired';
  hospital_name: string | null;
  hospital_id: number | null;
  latitude: number | null;
  longitude: number | null;
  city: string | null;
  contact_phone: string | null;
  is_verified: boolean;
  is_flagged: boolean;
  expires_at: string;
  created_at: string;
  donation_matches?: {
    id: number;
    request_id: number;
    donor_id: number;
    status: string;
    donor_name?: string;
    donor_blood_group?: string;
  }[];
}

export interface NearbyDonorData {
  donor: DonorProfileData;
  distance_km: number;
  donor_name: string;
}

export interface HospitalData {
  id: number;
  name: string;
  city: string;
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  phone: string | null;
  is_verified: boolean;
}

export interface NotificationItem {
  id: number;
  user_id: number;
  title: string;
  body: string;
  type: string;
  is_read: boolean;
  data_json: string | null;
  created_at: string;
}

export interface ReportItem {
  id: number;
  reporter_id: number;
  request_id: number;
  reason: string;
  status: 'pending' | 'reviewed' | 'dismissed';
  admin_notes: string | null;
  created_at: string;
}

export const Api = {
  // Auth
  register: (data: {
    phone: string;
    password: string;
    full_name: string;
    email: string;
    intended_role: 'donor' | 'requester';
    cnic: string | null;
    consent_given: boolean;
  }) => apiClient.post<UserProfile>('/auth/register', data),
  login: (data: { phone: string; password: string }) =>
    apiClient.post<{ access_token: string; refresh_token: string }>('/auth/login', data),
  getMe: () => apiClient.get<UserProfile>('/auth/me'),
  verifyOtp: (phone: string, otp: string) =>
    apiClient.post<{ message: string; is_verified: boolean }>('/auth/verify-otp', { phone, otp }),
  resendOtp: (phone: string, email: string) =>
    apiClient.post<{ message: string }>('/auth/resend-otp', { phone, email }),

  // Donors
  createDonorProfile: (data: any) => apiClient.post<DonorProfileData>('/donors/profile', data),
  getDonorProfile: () => apiClient.get<DonorProfileData>('/donors/profile'),
  updateDonorProfile: (data: any) => apiClient.put<DonorProfileData>('/donors/profile', data),
  getNearbyDonors: (params: { lat: number; lng: number; blood_group: string; radius_km?: number }) =>
    apiClient.get<NearbyDonorData[]>('/donors/nearby', { params }),

  // Blood Requests
  createRequest: (data: any) => apiClient.post<BloodRequestData>('/requests/', data),
  listRequests: (params?: { status?: string; city?: string; blood_group?: string; my_requests?: boolean }) =>
    apiClient.get<BloodRequestData[]>('/requests/', { params }),
  getRequest: (id: number) => apiClient.get<BloodRequestData>(`/requests/${id}`),
  respondToRequest: (id: number, action: 'accept' | 'decline') =>
    apiClient.post(`/requests/${id}/respond`, { action }),
  emergencySOS: (data: { blood_group: string; latitude: number; longitude: number; contact_phone: string; city?: string }) =>
    apiClient.post<BloodRequestData>('/requests/emergency-sos', data),

  // Hospitals
  listHospitals: (params?: { city?: string }) => apiClient.get<HospitalData[]>('/hospitals/', { params }),

  // Reports
  createReport: (data: { request_id: number; reason: string }) => apiClient.post<ReportItem>('/reports/', data),

  // Notifications
  listNotifications: (params?: { unread_only?: boolean }) =>
    apiClient.get<NotificationItem[]>('/notifications/', { params }),
  markNotificationRead: (id: number) => apiClient.put<NotificationItem>(`/notifications/${id}/read`),

  // Admin
  getAdminReports: () => apiClient.get<ReportItem[]>('/admin/reports'),
  reviewReport: (id: number, data: { status: string; admin_notes?: string }) =>
    apiClient.put<ReportItem>(`/admin/reports/${id}`, data),
  verifyRequest: (id: number) => apiClient.put(`/admin/requests/${id}/verify`),
  flagRequest: (id: number) => apiClient.put(`/admin/requests/${id}/flag`),
  getAdminStats: () => apiClient.get('/admin/stats'),
  cleanupExpiredRequests: (olderThanDays: number = 3) =>
    apiClient.post(`/admin/cleanup-expired?older_than_days=${olderThanDays}`),
};
