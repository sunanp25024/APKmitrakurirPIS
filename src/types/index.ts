
export interface User {
  id: string; // ID Mitra Kurir
  fullName: string; // Nama Lengkap Mitra Kurir
  workLocation: string; // Lokasi Kerja Mitra Kurir
  joinDate: string; // Tanggal Join Mitra
  jobTitle: string; // Jabatan Mitra
  contractStatus: string; // Status Kontrak Mitra
  accountNumber: string; // Nomor Rekening
  bankName: string; // Jenis Bank
  registeredRecipientName: string; // Nama Penerima (di rekening)
  avatarUrl?: string; // URL for profile photo
  password?: string; // For mock data simulation only
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
  courierId: string;
  courierName: string;
  workLocation: string; // Added workLocation
  packagesCarried: number;
  packagesDelivered: number;
  packagesFailedOrReturned: number;
  successRate: number; // percentage
  status: 'Aktif Mengantar' | 'Selesai' | 'Belum Ada Laporan';
}

export interface AdminDeliveryTimeDataPoint {
  hour: string; // e.g., "09:00", "10:00"
  delivered: number;
}

