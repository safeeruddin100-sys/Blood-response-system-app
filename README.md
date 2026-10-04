# 🩸 The Blood Response System — Frontend (Mobile App)

> Emergency Blood Donation Mobile App for **Alkhidmat Foundation Pakistan** built with React Native, Expo, Expo Router, and TypeScript.

Designed for high reliability, calm and trustworthy medical aesthetics, bilingual Urdu/English support with RTL, 1-tap Emergency SOS, and verified donor coordination.


# Blood Response System App — Alkhidmat Foundation Pakistan

## Tech Stack
* **Backend:** FastAPI + MongoDB (`motor`/`AsyncIOMotorClient`)
* **Frontend:** React Native + Expo + TypeScript + Expo Router
* **Authentication:** JWT (Access + Refresh Tokens)
* **Database:** MongoDB Atlas (Primary)
* **Email OTP:** Gmail SMTP via `smtplib`

## Environment Setup & Installation

### Backend Setup
```bash
cd blood-response-backend
python -m venv venv
venv\Scripts\Activate.ps1   # Windows
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

---

## ⚡ Quick Start (< 5 Minutes)

### 1. Prerequisites
- Node.js 18+
- npm or yarn
- **Expo Go** mobile app (iOS App Store / Google Play Store) or an Android / iOS simulator.

### 2. Install Dependencies
```bash
# Navigate to frontend folder
cd blood-response-frontend

# Install dependencies
npm install
```

### 3. Configure API Connection
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
- **Web / iOS Simulator**: `EXPO_PUBLIC_API_URL=http://localhost:8000/api/v1`
- **Android Emulator**: `EXPO_PUBLIC_API_URL=http://10.0.2.2:8000/api/v1`
- **Physical Phone with Expo Go (Same Wi-Fi)**: `EXPO_PUBLIC_API_URL=http://<YOUR_LOCAL_IP>:8000/api/v1`

### 4. Start Expo Development Server
```bash
npx expo start
```
- Scan the displayed QR code using the **Expo Go** app on your mobile device.
- Or press `w` to open in your desktop web browser.

---

## 📱 Pre-Configured Test Accounts

On the Login screen, tap any of the test buttons for instant 1-tap login:

| Role | Credentials | Focus / Test Flow |
| :--- | :--- | :--- |
| **Donor (O- Karachi)** | `+923001234001` / `Donor@123` | Universal donor view, urgent matching requests, cooldown status |
| **Requester** | `+923331112233` / `Requester@123` | View posted requests, track confirmed blood units, post new requests |
| **Admin** | `+923000000000` / `Admin@123` | Moderate flagged community reports, platform statistics |

---

## 🏗️ Architecture & Screens

```
blood-response-frontend/
├── app/
│   ├── _layout.tsx               # Root auth hydration & status bar
│   ├── (auth)/
│   │   ├── login.tsx             # Phone/Password login + Quick test account switcher
│   │   ├── register.tsx          # Donor/Requester registration + CNIC hash privacy note
│   │   └── otp-verify.tsx        # OTP confirmation screen (stub auto-fill)
│   ├── (tabs)/
│   │   ├── home.tsx              # Role-aware dashboard + prominent 1-tap SOS banner
│   │   ├── requests.tsx          # Public/City emergency request feed + Post Request modal
│   │   ├── donors-nearby.tsx     # Geolocation nearby donors with List / Map View fallback
│   │   ├── profile.tsx           # Donor profile, blood group picker, 90-day cooldown card
│   │   └── alerts.tsx            # Live in-app emergency matching alert feed
│   ├── request/[id].tsx          # Request details, live units progress bar, donor confirmation
│   └── admin/                    # Role-gated moderation queue and platform analytics
├── components/                   # Button, Badge, BloodGroupPicker, CooldownCard, SOSModal, Header
├── constants/                    # Colors (Deep Teal, Amber, Alert Red), Compatibility, i18n (EN/UR)
├── services/api.ts               # Typed Axios client with JWT auto-refresh interceptors
└── store/authStore.ts            # Zustand auth & language store with AsyncStorage persistence
```

---

## 💡 Key Design & Technical Highlights

1. **Medical / Nonprofit Aesthetic**:
   - Palette built on Deep Teal (`#0D7377`) and Warm Amber (`#F59E0B`). Emergency Crimson (`#DC2626`) is used strictly for critical surgeries and SOS alerts.
2. **Urdu / English Bilingual Support with RTL**:
   - Instant header language toggle between English and Urdu.
3. **90-Day Biological Cooldown Enforcement**:
   - Visual countdown card and badge showing remaining recovery days to safeguard donor health.
4. **Expo Go Compatibility**:
   - Includes interactive List and Visual Map fallback ensuring smooth evaluation on low-end devices and Expo Go without native build friction.
