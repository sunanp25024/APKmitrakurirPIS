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
