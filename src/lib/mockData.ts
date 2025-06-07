import type { User, PackageItem, AttendanceEntry } from '@/types';

export const mockUser: User = {
  id: 'PISTEST2025',
  fullName: 'John Doe',
  workLocation: 'Jakarta Pusat',
  joinDate: '2024-01-15',
  jobTitle: 'Mitra Kurir',
  contractStatus: 'Aktif',
  accountNumber: '1234567890',
  bankName: 'Bank Central Asia (BCA)',
  registeredRecipientName: 'John Doe',
  avatarUrl: 'https://placehold.co/100x100.png',
};

export const mockPackages: PackageItem[] = [
  { resi: 'SPX00000001', status: 'Proses', isCod: true, timestamp: Date.now() - 100000 },
  { resi: 'SPX00000002', status: 'Proses', isCod: false, timestamp: Date.now() - 90000 },
];

export const mockAttendance: AttendanceEntry[] = [
  { id: '1', date: '2024-07-28', checkInTime: '08:00', checkOutTime: '17:00', status: 'On Time' },
  { id: '2', date: '2024-07-27', checkInTime: '08:15', checkOutTime: '17:05', status: 'Late' },
  { id: '3', date: '2024-07-26', status: 'Absent' },
];

export const motivationalQuotes: string[] = [
  "Setiap paket yang terantar adalah senyuman yang tercipta. Semangat!",
  "Kerja kerasmu hari ini adalah investasi untuk esok yang lebih baik.",
  "Kecepatan dan ketepatan adalah kunci kepuasan pelanggan. Kamu bisa!",
  "Jangan biarkan rintangan menghentikanmu. Terus bergerak maju!",
  "Setiap hari adalah kesempatan baru untuk menjadi versi terbaik dirimu."
];
