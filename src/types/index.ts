
export interface User {
  firebaseUid: string; // UID dari Firebase Auth, digunakan sebagai ID dokumen di Firestore
  id: string; // ID Mitra Kurir kustom yang bisa dibaca manusia (misal PISTEST2025)
  fullName: string; // Nama Lengkap Mitra Kurir
  wilayah: string; // Wilayah Operasional
  area: string; // Area Operasional di dalam Wilayah
  workLocation: string; // Lokasi Kerja Mitra Kurir (HUB)
  joinDate: string; // Tanggal Join Mitra
  jobTitle: string; // Jabatan Mitra
  contractStatus: string; // Status Kontrak Mitra
  accountNumber: string; // Nomor Rekening
  bankName: string; // Jenis Bank
  registeredRecipientName: string; // Nama Penerima (di rekening)
  avatarUrl?: string; // URL for profile photo
  password?: string; // Hanya untuk input form, tidak disimpan di Firestore
}

export type PackageStatus =
  | 'Proses'
  | 'Dalam Pengantaran'
  | 'Terkirim'
  | 'Tidak Terkirim'
  | 'Pending'
  | 'Dikembalikan';

export interface PackageItem {
  resi: string; // Nomor Resi
  status: PackageStatus;
  isCod: boolean;
  photoUrl?: string; // For proof of delivery/return
  recipientName?: string; // Actual recipient name
  timestamp: number; // For sorting or tracking
}

export interface AttendanceEntry {
  id: string;
  date: string;
  checkInTime?: string;
  checkOutTime?: string;
  status: 'On Time' | 'Late' | 'Absent';
}

// For performance page (individual courier)
export interface DailyPerformanceData {
  date: string;
  totalPackages: number;
  deliveredPackages: number;
  undeliveredOrPendingPackages: number;
  avgDeliveryTime: number; // in minutes
  attendance: 'Present' | 'Late' | 'Absent';
  dataFinalizedTimestamp: number; // Timestamp when this day's data was considered final
}


// For Admin System
export interface AdminSession {
  id: string;
  role: 'master' | 'regular' | 'pic';
  firebaseUid: string;
  email: string;
}

export interface AuthLoginResponse {
  success: boolean;
  message?: string;
  user?: AppUserType | null;
  isAdmin?: boolean;
  role?: 'master' | 'regular' | 'pic';
}

// For Admin Reports Page
export interface AdminOverallStats {
  totalActiveCouriers: number;
  totalPackagesToday: number;
  totalDeliveredToday: number;
  totalPendingReturnToday: number; // Packages that are 'Tidak Terkirim', 'Pending', or 'Dikembalikan'
  overallSuccessRateToday: number; // Percentage based on (delivered / (delivered + pendingReturn))
}

export interface AdminCourierDailySummary {
  courierId: string; // Ini adalah ID Kustom
  courierName: string;
  wilayah: string;
  area: string;
  workLocation: string;
  packagesCarried: number;
  packagesDelivered: number;
  packagesFailedOrReturned: number;
  successRate: number; // percentage
  status: 'Aktif Mengantar' | 'Selesai' | 'Belum Ada Laporan' | 'Tidak Aktif';
  lastActivityTimestamp: number; // Timestamp of the last significant activity or update for this summary
}

export interface AdminDeliveryTimeDataPoint {
  hour: string; // e.g., "09:00", "10:00"
  delivered: number;
}

// Renaming to avoid conflict if AppUserType is used elsewhere for courier specific data
export type AppUserType = User;


// For Approval Workflow
export interface CourierUpdateRequest {
  id?: string; // Firestore document ID for this request
  courierFirebaseUid: string; // UID of the courier document in 'users' collection to be updated
  requestedChanges: Partial<Omit<User, 'firebaseUid' | 'password' | 'id'>>; // Fields to be updated
  requestorFirebaseUid: string; // UID of the admin making the request
  requestorId: string; // Custom ID of the admin (e.g., "ADMIN01")
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: number; // Timestamp of request
  reviewedByFirebaseUid?: string; // MasterAdmin UID who reviewed
  reviewedAt?: number; // Timestamp of review
  rejectionReason?: string;
}

export interface UserCreationRequest {
  id?: string; // Firestore document ID for this request
  // Data for the new user. `id` here is the custom courier/pic ID. Password is for Firebase Auth.
  requestedUserData: Omit<User, 'firebaseUid' | 'avatarUrl'> & { password?: string; avatarUrl?: string };
  requestorFirebaseUid: string;
  requestorId: string;
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: number;
  reviewedByFirebaseUid?: string;
  reviewedAt?: number;
  rejectionReason?: string;
}
