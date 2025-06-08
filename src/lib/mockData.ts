
import type { User, PackageItem, AttendanceEntry } from '@/types';
import { format, subDays } from "date-fns";


export const mockUsers: User[] = [
  {
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
    password: '123456'
  },
  {
    id: 'SUNANJTN01',
    fullName: 'Sunan Iskandar',
    workLocation: 'HUB JATINEGARA',
    joinDate: '2024-03-10', // Example join date
    jobTitle: 'Mitra Kurir',
    contractStatus: 'Aktif',
    accountNumber: '5530535292',
    bankName: 'Bank Central Asia (BCA)',
    registeredRecipientName: 'SUNAN ISKANDAR',
    avatarUrl: 'https://placehold.co/100x100.png?text=SI',
    password: 'sunan123'
  }
];

export const mockPackages: PackageItem[] = [
  // { resi: 'SPX00000001', status: 'Proses', isCod: true, timestamp: Date.now() - 100000 },
  // { resi: 'SPX00000002', status: 'Proses', isCod: false, timestamp: Date.now() - 90000 },
]; // Start with empty packages for new dashboard logic

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


// For performance page
export interface DailyPerformanceData {
  date: string;
  totalPackages: number;
  deliveredPackages: number;
  undeliveredOrPendingPackages: number; // Added this
  avgDeliveryTime: number; // in minutes
  attendance: 'Present' | 'Late' | 'Absent'; // More specific
}

export const generateDailyPerformanceEntry = (date: Date): DailyPerformanceData => {
  const daySeed = date.getDate() + date.getMonth() * 30; // Make seed vary more
  const total = 15 + (daySeed % 10) - 2; // 13 to 23
  const delivered = Math.floor(total * (0.7 + (daySeed % 3) * 0.1)); // 70-90% success rate
  const undeliveredOrPending = total - delivered;
  
  return {
    date: format(date, "yyyy-MM-dd"),
    totalPackages: total,
    deliveredPackages: delivered,
    undeliveredOrPendingPackages: undeliveredOrPending,
    avgDeliveryTime: 100 + (daySeed % 40) - 20, // 80 to 120 minutes
    attendance: (daySeed % 10) < 7 ? 'Present' : (daySeed % 10) < 9 ? 'Late' : 'Absent',
  };
};
