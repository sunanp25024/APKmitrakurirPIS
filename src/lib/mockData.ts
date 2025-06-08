
import type { User, PackageItem, AttendanceEntry, DailyPerformanceData, AdminOverallStats, AdminCourierDailySummary, AdminDeliveryTimeDataPoint } from '@/types';
import { format, subDays } from "date-fns";


export const mockUsers: User[] = [
  {
    id: 'PISTEST2025',
    fullName: 'John Doe',
    wilayah: 'Jabodetabek & Banten',
    area: 'Jakarta Pusat',
    workLocation: 'HUB JAKPUS TEST',
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
    wilayah: 'Jabodetabek & Banten',
    area: 'Jakarta Timur',
    workLocation: 'HUB JATINEGARA',
    joinDate: '2024-03-10',
    jobTitle: 'Mitra Kurir',
    contractStatus: 'Aktif',
    accountNumber: '5530535292',
    bankName: 'Bank Central Asia (BCA)',
    registeredRecipientName: 'SUNAN ISKANDAR',
    avatarUrl: 'https://placehold.co/100x100.png?text=SI',
    password: 'sunan123'
  },
  {
    id: 'BUDIHUBSEL',
    fullName: 'Budi Santoso',
    wilayah: 'Jabodetabek & Banten',
    area: 'Jakarta Selatan',
    workLocation: 'HUB JAKSEL',
    joinDate: '2023-11-05',
    jobTitle: 'Mitra Kurir Senior',
    contractStatus: 'Aktif',
    accountNumber: '0987654321',
    bankName: 'Bank Mandiri',
    registeredRecipientName: 'Budi Santoso',
    avatarUrl: 'https://placehold.co/100x100.png?text=BS',
    password: 'budi123'
  },
   {
    id: 'CITRAHUBBAR',
    fullName: 'Citra Lestari',
    wilayah: 'Jabodetabek & Banten',
    area: 'Jakarta Barat',
    workLocation: 'HUB JAKBAR',
    joinDate: '2024-02-20',
    jobTitle: 'Mitra Kurir',
    contractStatus: 'Aktif',
    accountNumber: '1122334455',
    bankName: 'Bank BRI',
    registeredRecipientName: 'Citra Lestari',
    avatarUrl: 'https://placehold.co/100x100.png?text=CL',
    password: 'citra123'
  },
  {
    id: 'AGUSJPS01',
    fullName: 'Agus Setiawan',
    wilayah: 'Jabodetabek & Banten',
    area: 'Jakarta Pusat',
    workLocation: 'HUB JAKPUS GAMBIR',
    joinDate: '2023-05-10',
    jobTitle: 'Mitra Kurir',
    contractStatus: 'Aktif',
    accountNumber: '2345678901',
    bankName: 'Bank BNI',
    registeredRecipientName: 'Agus Setiawan',
    avatarUrl: 'https://placehold.co/100x100.png?text=AS',
    password: 'password123'
  },
  {
    id: 'DEWIJKT02',
    fullName: 'Dewi Anggraini',
    wilayah: 'Jabodetabek & Banten',
    area: 'Jakarta Timur',
    workLocation: 'HUB CAKUNG',
    joinDate: '2023-06-15',
    jobTitle: 'Mitra Kurir',
    contractStatus: 'Aktif',
    accountNumber: '3456789012',
    bankName: 'Bank CIMB Niaga',
    registeredRecipientName: 'Dewi Anggraini',
    avatarUrl: 'https://placehold.co/100x100.png?text=DA',
    password: 'password123'
  },
  {
    id: 'EKOJKU03',
    fullName: 'Eko Prasetyo',
    wilayah: 'Jabodetabek & Banten',
    area: 'Jakarta Utara',
    workLocation: 'HUB TJ PRIOK',
    joinDate: '2023-07-20',
    jobTitle: 'Mitra Kurir',
    contractStatus: 'Non-Aktif',
    accountNumber: '4567890123',
    bankName: 'Bank Danamon',
    registeredRecipientName: 'Eko Prasetyo',
    avatarUrl: 'https://placehold.co/100x100.png?text=EP',
    password: 'password123'
  },
  {
    id: 'FITRIBKS04',
    fullName: 'Fitri Handayani',
    wilayah: 'Jawa Barat',
    area: 'Bekasi Raya',
    workLocation: 'HUB BEKASI KOTA',
    joinDate: '2023-08-25',
    jobTitle: 'Mitra Kurir',
    contractStatus: 'Aktif',
    accountNumber: '5678901234',
    bankName: 'Bank BCA',
    registeredRecipientName: 'Fitri Handayani',
    avatarUrl: 'https://placehold.co/100x100.png?text=FH',
    password: 'password123'
  },
  {
    id: 'GALIHTGR05',
    fullName: 'Galih Permana',
    wilayah: 'Jabodetabek & Banten',
    area: 'Tangerang Kota',
    workLocation: 'HUB TANGERANG CIPONDOH',
    joinDate: '2023-09-01',
    jobTitle: 'Mitra Kurir',
    contractStatus: 'Aktif',
    accountNumber: '6789012345',
    bankName: 'Bank Mandiri',
    registeredRecipientName: 'Galih Permana',
    avatarUrl: 'https://placehold.co/100x100.png?text=GP',
    password: 'password123'
  },
  {
    id: 'HENDIDPK06',
    fullName: 'Hendi Wijaya',
    wilayah: 'Jawa Barat',
    area: 'Depok Raya',
    workLocation: 'HUB DEPOK MARGONDA',
    joinDate: '2023-10-05',
    jobTitle: 'Koordinator Lapangan',
    contractStatus: 'Aktif',
    accountNumber: '7890123456',
    bankName: 'Bank BRI',
    registeredRecipientName: 'Hendi Wijaya',
    avatarUrl: 'https://placehold.co/100x100.png?text=HW',
    password: 'password123'
  },
  {
    id: 'INDRAJSL07',
    fullName: 'Indra Maulana',
    wilayah: 'Jabodetabek & Banten',
    area: 'Jakarta Selatan',
    workLocation: 'HUB TEBET',
    joinDate: '2023-11-10',
    jobTitle: 'Mitra Kurir',
    contractStatus: 'Aktif',
    accountNumber: '8901234567',
    bankName: 'Bank BNI',
    registeredRecipientName: 'Indra Maulana',
    avatarUrl: 'https://placehold.co/100x100.png?text=IM',
    password: 'password123'
  },
  {
    id: 'JOKOJBR08',
    fullName: 'Joko Susilo',
    wilayah: 'Jabodetabek & Banten',
    area: 'Jakarta Barat',
    workLocation: 'HUB KEBON JERUK',
    joinDate: '2023-12-15',
    jobTitle: 'Mitra Kurir',
    contractStatus: 'Aktif',
    accountNumber: '9012345678',
    bankName: 'Bank CIMB Niaga',
    registeredRecipientName: 'Joko Susilo',
    avatarUrl: 'https://placehold.co/100x100.png?text=JS',
    password: 'password123'
  },
  {
    id: 'KARINAJPS09',
    fullName: 'Karina Putri',
    wilayah: 'Jabodetabek & Banten',
    area: 'Jakarta Pusat',
    workLocation: 'HUB TANAH ABANG',
    joinDate: '2024-01-20',
    jobTitle: 'Mitra Kurir',
    contractStatus: 'Aktif',
    accountNumber: '0123456789',
    bankName: 'Bank Danamon',
    registeredRecipientName: 'Karina Putri',
    avatarUrl: 'https://placehold.co/100x100.png?text=KP',
    password: 'password123'
  },
  {
    id: 'LUKMANJKT10',
    fullName: 'Lukman Hakim',
    wilayah: 'Jabodetabek & Banten',
    area: 'Jakarta Timur',
    workLocation: 'HUB KRAMAT JATI',
    joinDate: '2024-02-25',
    jobTitle: 'Mitra Kurir',
    contractStatus: 'Aktif',
    accountNumber: '1112223330',
    bankName: 'Bank BCA',
    registeredRecipientName: 'Lukman Hakim',
    avatarUrl: 'https://placehold.co/100x100.png?text=LH',
    password: 'password123'
  },
  {
    id: 'MAYABKS11',
    fullName: 'Maya Sari',
    wilayah: 'Jawa Barat',
    area: 'Bekasi Raya',
    workLocation: 'HUB BEKASI BARAT',
    joinDate: '2024-03-01',
    jobTitle: 'Mitra Kurir',
    contractStatus: 'Non-Aktif',
    accountNumber: '2223334441',
    bankName: 'Bank Mandiri',
    registeredRecipientName: 'Maya Sari',
    avatarUrl: 'https://placehold.co/100x100.png?text=MS',
    password: 'password123'
  },
  {
    id: 'NANDATGR12',
    fullName: 'Nanda Pratama',
    wilayah: 'Jabodetabek & Banten',
    area: 'Tangerang Selatan',
    workLocation: 'HUB SERPONG',
    joinDate: '2024-04-05',
    jobTitle: 'Mitra Kurir',
    contractStatus: 'Aktif',
    accountNumber: '3334445552',
    bankName: 'Bank BRI',
    registeredRecipientName: 'Nanda Pratama',
    avatarUrl: 'https://placehold.co/100x100.png?text=NP',
    password: 'password123'
  },
  {
    id: 'OKTADPK13',
    fullName: 'Okta Setiawan',
    wilayah: 'Jawa Barat',
    area: 'Depok Raya',
    workLocation: 'HUB CIMANGGIS',
    joinDate: '2024-05-10',
    jobTitle: 'Mitra Kurir',
    contractStatus: 'Aktif',
    accountNumber: '4445556663',
    bankName: 'Bank BNI',
    registeredRecipientName: 'Okta Setiawan',
    avatarUrl: 'https://placehold.co/100x100.png?text=OS',
    password: 'password123'
  },
  {
    id: 'PUTRAJSL14',
    fullName: 'Putra Dinata',
    wilayah: 'Jabodetabek & Banten',
    area: 'Jakarta Selatan',
    workLocation: 'HUB PASAR MINGGU',
    joinDate: '2023-04-15',
    jobTitle: 'Mitra Kurir',
    contractStatus: 'Aktif',
    accountNumber: '5556667774',
    bankName: 'Bank CIMB Niaga',
    registeredRecipientName: 'Putra Dinata',
    avatarUrl: 'https://placehold.co/100x100.png?text=PD',
    password: 'password123'
  },
  {
    id: 'RATUJBR15',
    fullName: 'Ratu Anjani',
    wilayah: 'Jabodetabek & Banten',
    area: 'Jakarta Barat',
    workLocation: 'HUB CENGKARENG',
    joinDate: '2023-03-20',
    jobTitle: 'Mitra Kurir',
    contractStatus: 'Aktif',
    accountNumber: '6667778885',
    bankName: 'Bank Danamon',
    registeredRecipientName: 'Ratu Anjani',
    avatarUrl: 'https://placehold.co/100x100.png?text=RA',
    password: 'password123'
  },
  {
    id: 'SANDIJPS16',
    fullName: 'Sandi Kurniawan',
    wilayah: 'Jabodetabek & Banten',
    area: 'Jakarta Pusat',
    workLocation: 'HUB KEMAYORAN',
    joinDate: '2023-02-25',
    jobTitle: 'Mitra Kurir',
    contractStatus: 'Aktif',
    accountNumber: '7778889996',
    bankName: 'Bank BCA',
    registeredRecipientName: 'Sandi Kurniawan',
    avatarUrl: 'https://placehold.co/100x100.png?text=SK',
    password: 'password123'
  },
  {
    id: 'TANTRIJKT17',
    fullName: 'Tantri Melati',
    wilayah: 'Jabodetabek & Banten',
    area: 'Jakarta Timur',
    workLocation: 'HUB DUREN SAWIT',
    joinDate: '2023-01-01',
    jobTitle: 'Mitra Kurir Senior',
    contractStatus: 'Aktif',
    accountNumber: '8889990007',
    bankName: 'Bank Mandiri',
    registeredRecipientName: 'Tantri Melati',
    avatarUrl: 'https://placehold.co/100x100.png?text=TM',
    password: 'password123'
  },
  {
    id: 'USMANBKS18',
    fullName: 'Usman Abidin',
    wilayah: 'Jawa Barat',
    area: 'Bekasi Raya',
    workLocation: 'HUB BEKASI TIMUR',
    joinDate: '2024-06-01',
    jobTitle: 'Mitra Kurir',
    contractStatus: 'Aktif',
    accountNumber: '9990001118',
    bankName: 'Bank BRI',
    registeredRecipientName: 'Usman Abidin',
    avatarUrl: 'https://placehold.co/100x100.png?text=UA',
    password: 'password123'
  },
  {
    id: 'VIVITGR19',
    fullName: 'Vivi Novitasari',
    wilayah: 'Jabodetabek & Banten',
    area: 'Tangerang Selatan',
    workLocation: 'HUB PAMULANG',
    joinDate: '2024-07-05',
    jobTitle: 'Mitra Kurir',
    contractStatus: 'Aktif',
    accountNumber: '0001112229',
    bankName: 'Bank BNI',
    registeredRecipientName: 'Vivi Novitasari',
    avatarUrl: 'https://placehold.co/100x100.png?text=VN',
    password: 'password123'
  },
  {
    id: 'YUDIDPK20',
    fullName: 'Yudi Pratama',
    wilayah: 'Jawa Barat',
    area: 'Depok Raya',
    workLocation: 'HUB SAWANGAN',
    joinDate: '2024-07-15',
    jobTitle: 'Mitra Kurir',
    contractStatus: 'Aktif',
    accountNumber: '1212121212',
    bankName: 'Bank CIMB Niaga',
    registeredRecipientName: 'Yudi Pratama',
    avatarUrl: 'https://placehold.co/100x100.png?text=YP',
    password: 'password123'
  },
  // Add more diverse locations
  {
    id: 'BDGKUR01',
    fullName: 'Asep Sunarya',
    wilayah: 'Jawa Barat',
    area: 'Bandung Raya',
    workLocation: 'HUB BANDUNG KOTA',
    joinDate: '2023-01-10',
    jobTitle: 'Mitra Kurir',
    contractStatus: 'Aktif',
    accountNumber: '1010101010',
    bankName: 'Bank BJB',
    registeredRecipientName: 'Asep Sunarya',
    avatarUrl: 'https://placehold.co/100x100.png?text=AS',
    password: 'password123'
  },
  {
    id: 'SBYKUR01',
    fullName: 'Rini Wulandari',
    wilayah: 'Jawa Timur & Bali Nusra',
    area: 'Surabaya Raya',
    workLocation: 'HUB SURABAYA PUSAT',
    joinDate: '2023-02-15',
    jobTitle: 'Mitra Kurir',
    contractStatus: 'Aktif',
    accountNumber: '2020202020',
    bankName: 'Bank Jatim',
    registeredRecipientName: 'Rini Wulandari',
    avatarUrl: 'https://placehold.co/100x100.png?text=RW',
    password: 'password123'
  },
  {
    id: 'SMGKUR01',
    fullName: 'Joko Anwar',
    wilayah: 'Jawa Tengah & DIY',
    area: 'Semarang Raya',
    workLocation: 'HUB SEMARANG KOTA',
    joinDate: '2023-03-20',
    jobTitle: 'Mitra Kurir',
    contractStatus: 'Aktif',
    accountNumber: '3030303030',
    bankName: 'Bank Jateng',
    registeredRecipientName: 'Joko Anwar',
    avatarUrl: 'https://placehold.co/100x100.png?text=JA',
    password: 'password123'
  },
  {
    id: 'MDNKUR01',
    fullName: 'Siti Aminah',
    wilayah: 'Sumatera Utara',
    area: 'Medan Kota',
    workLocation: 'HUB MEDAN BARAT',
    joinDate: '2023-04-25',
    jobTitle: 'Mitra Kurir',
    contractStatus: 'Aktif',
    accountNumber: '4040404040',
    bankName: 'Bank Sumut',
    registeredRecipientName: 'Siti Aminah',
    avatarUrl: 'https://placehold.co/100x100.png?text=SA',
    password: 'password123'
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


// For performance page (individual courier)
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

// For Admin Reports Page
export const mockAdminOverallStats: AdminOverallStats = { // This will be dynamically calculated in the component now.
  totalActiveCouriers: 0,
  totalPackagesToday: 0,
  totalDeliveredToday: 0,
  totalPendingReturnToday: 0,
  overallSuccessRateToday: 0,
};

export const mockAdminCourierSummaries: AdminCourierDailySummary[] = mockUsers.map((user, index) => {
  const carried = 20 + (index * 5) % 15 + Math.floor(Math.random() * 5); // e.g. 20-29
  const deliveredSeed = Math.random();
  const delivered = Math.floor(carried * (0.70 + deliveredSeed * 0.25)); // 70-95% success
  const failed = carried - delivered;
  let status: AdminCourierDailySummary['status'] = 'Belum Ada Laporan';
  if (user.contractStatus === 'Aktif') {
    const statusSeed = Math.random();
    if (statusSeed < 0.6) status = 'Selesai';
    else if (statusSeed < 0.9) status = 'Aktif Mengantar';
    else status = 'Belum Ada Laporan';
  } else {
    status = 'Tidak Aktif';
  }

  return {
    courierId: user.id,
    courierName: user.fullName,
    wilayah: user.wilayah,
    area: user.area,
    workLocation: user.workLocation,
    packagesCarried: carried,
    packagesDelivered: delivered,
    packagesFailedOrReturned: failed,
    successRate: carried > 0 ? (delivered / carried) * 100 : 0,
    status: status,
  };
});

export const mockAdminDeliveryTimeData: AdminDeliveryTimeDataPoint[] = Array.from({ length: 10 }, (_, i) => {
  const hour = 9 + i; // 9 AM to 6 PM (18:00)
  return {
    hour: `${String(hour).padStart(2, '0')}:00`,
    delivered: 5 + Math.floor(Math.random() * 20), // Random deliveries per hour
  };
});
