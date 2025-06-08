
"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import type { PackageItem, PackageStatus, AdminCourierDailySummary, User as CourierUser } from '@/types';
import { mockPackages, motivationalQuotes } from '@/lib/mockData';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Camera, Edit3, PackageCheck, PackageX, ScanLine, Trash2, Truck, MapPin, CheckCircle, XCircle, Clock, UploadCloud, ImagePlus, DollarSign, Archive, SaveIcon, AlertCircle, LogIn } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import Link from 'next/link';

const LOCAL_STORAGE_DAILY_REPORTS_KEY = 'spxCourierDailySummaries';
const LOCAL_STORAGE_LAST_CHECK_IN_KEY = 'spxUserLastCheckInDate';

const CHART_COLORS_PIE = {
  delivered: 'hsl(var(--chart-2))', // Using chart-2 (Greenish) for delivered
  failedOrReturned: 'hsl(var(--chart-5))', // Using chart-5 (Red) for failed/returned
  inProgressOrProses: 'hsl(var(--chart-3))', // Using chart-3 (Orange) for in progress
  noData: 'hsl(var(--muted))',
};


export default function DashboardPage() {
  const { user } = useAuth();
  const [packages, setPackages] = useState<PackageItem[]>(mockPackages);
  const [totalPackagesCarried, setTotalPackagesCarried] = useState(0);
  const [codPackages, setCodPackages] = useState(0);
  const [nonCodPackages, setNonCodPackages] = useState(0);
  const [isDailyInputSubmitted, setIsDailyInputSubmitted] = useState(false);

  const [resiInput, setResiInput] = useState('');
  const [isCodInput, setIsCodInput] = useState(false);
  const [motivationalQuote, setMotivationalQuote] = useState('');
  
  const [isScanDialogOpen, setIsScanDialogOpen] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [scanHintMessage, setScanHintMessage] = useState<string | null>("Kamera belum aktif.");
  
  const [hasCheckedInToday, setHasCheckedInToday] = useState<boolean | null>(null);
  const [isDashboardMounted, setIsDashboardMounted] = useState(false);


  const videoRef = useRef<HTMLVideoElement>(null);
  const { toast } = useToast();
  const router = useRouter();

  const checkAttendanceStatus = useCallback(() => {
    const lastCheckInDate = localStorage.getItem(LOCAL_STORAGE_LAST_CHECK_IN_KEY);
    const todayFormatted = format(new Date(), "yyyy-MM-dd");
    if (lastCheckInDate === todayFormatted) {
      setHasCheckedInToday(true);
    } else {
      setHasCheckedInToday(false);
    }
  }, []);

  useEffect(() => {
    setIsDashboardMounted(true);
    checkAttendanceStatus(); // Check on initial mount
  }, [checkAttendanceStatus]);

  // Re-check on window focus to catch updates from other tabs
  useEffect(() => {
    if (!isDashboardMounted) return;

    window.addEventListener('focus', checkAttendanceStatus);
    return () => {
      window.removeEventListener('focus', checkAttendanceStatus);
    };
  }, [isDashboardMounted, checkAttendanceStatus]);


  useEffect(() => {
    setMotivationalQuote(motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)]);
  }, []);

  useEffect(() => {
    let currentStream: MediaStream | null = null;
    let currentReader: any = null; 
    let currentControls: any = null;

    const stopScanAndCamera = () => {
      console.log('BarcodeScanner: Stopping scan and camera...');
      if (currentControls && typeof currentControls.stop === 'function') {
        try {
          currentControls.stop();
        } catch (e) {
          console.warn('BarcodeScanner: Error stopping scanner controls:', e);
        }
      }
      currentControls = null;

      if (currentReader && typeof currentReader.reset === 'function') {
        try {
          currentReader.reset();
        } catch (e) {
          console.warn('BarcodeScanner: Error resetting code reader:', e);
        }
      }
      currentReader = null;

      if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
      }
      currentStream = null;
      
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };

    const initializeAndStartScanner = async () => {
      stopScanAndCamera(); 
      currentStream = null;
      currentReader = null;
      currentControls = null;
      setHasCameraPermission(null); 
      setScanHintMessage("Menyiapkan kamera...");

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setHasCameraPermission(false);
        setScanHintMessage('Kamera tidak didukung oleh browser ini.');
        toast({ variant: 'destructive', title: 'Kamera Tidak Didukung', description: 'Browser Anda tidak mendukung akses kamera.' });
        return;
      }

      let zxingModule: any;
      let BrowserMultiFormatReader: any;
      let BarcodeFormat: any;
      let DecodeHintType: any;

      try {
        zxingModule = await import('@zxing/library');
        BrowserMultiFormatReader = zxingModule.BrowserMultiFormatReader;
        BarcodeFormat = zxingModule.BarcodeFormat;
        DecodeHintType = zxingModule.DecodeHintType;
        
        if (!BrowserMultiFormatReader) {
          throw new Error('BrowserMultiFormatReader class not found');
        }
      } catch (libLoadError) {
        setHasCameraPermission(false);
        setScanHintMessage('Gagal memuat komponen pemindai.');
        toast({ variant: 'destructive', title: 'Scan Error', description: 'Gagal memuat komponen pemindai. Periksa konsol.' });
        return;
      }

      try {
        const constraints: MediaStreamConstraints = { 
          video: { 
            facingMode: "environment",
            width: { ideal: 640 }, 
            height: { ideal: 480 } 
          } 
        };
        currentStream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (permError: any) {
        let userMessage = `Gagal mengakses kamera: ${permError.message || permError.name}`;
        if (permError.name === "NotAllowedError" || permError.name === "PermissionDeniedError") {
          userMessage = 'Akses kamera ditolak. Mohon izinkan di pengaturan browser Anda.';
        } else if (permError.name === "NotFoundError" || permError.name === "DevicesNotFoundError") {
          userMessage = 'Kamera tidak ditemukan di perangkat ini.';
        }
        setHasCameraPermission(false);
        setScanHintMessage(userMessage);
        toast({ variant: 'destructive', title: 'Kamera Error', description: userMessage });
        return;
      }

      if (!currentStream) {
        setHasCameraPermission(false);
        setScanHintMessage('Gagal mendapatkan stream kamera.');
        toast({ variant: 'destructive', title: 'Kamera Error', description: 'Stream kamera tidak valid.' });
        return;
      }
      
      setHasCameraPermission(true); 

      if (!videoRef.current) {
        setScanHintMessage('Komponen video tidak siap. Kamera aktif, tapi tidak bisa ditampilkan.');
        toast({ variant: 'destructive', title: 'Scan Error', description: 'Komponen video tidak siap.' });
        return;
      }

      videoRef.current.srcObject = currentStream;
      try {
        await videoRef.current.play();
        setScanHintMessage("Kamera aktif. Menyiapkan pemindai..."); 
      } catch (playError) {
        setScanHintMessage('Gagal memulai video untuk scan. Kamera mungkin aktif tapi pratinjau gagal.');
        toast({ variant: 'destructive', title: 'Video Error', description: 'Gagal memulai video untuk scan.' });
        return;
      }
      
      try {
        if (BarcodeFormat && DecodeHintType) {
            const hints = new Map();
            const formats = [
                BarcodeFormat.QR_CODE, 
                BarcodeFormat.CODE_128,
            ];
            hints.set(DecodeHintType.POSSIBLE_FORMATS, formats);
            currentReader = new BrowserMultiFormatReader(hints, 500);
        } else {
            currentReader = new BrowserMultiFormatReader(); 
        }
      } catch (readerError) {
        currentReader = null; 
      }

      if (!currentReader || typeof currentReader.decodeFromContinuously !== 'function') {
        setScanHintMessage('Pemindai barcode gagal diinisialisasi. Kamera aktif, tapi fitur scan tidak tersedia.');
        toast({ variant: 'destructive', title: 'Scan Error', description: 'Gagal menginisialisasi pemindai barcode (instance tidak valid). Periksa konsol.' });
        return; 
      }

      setScanHintMessage("Kamera aktif. Arahkan ke barcode."); 
      if (videoRef.current) {
        currentControls = currentReader.decodeFromContinuously(
          videoRef.current,
          (result: any, error: any) => {
            if (!currentControls) { 
              return;
            }
            if (result) {
              setResiInput(result.getText().toUpperCase());
              toast({ title: "Barcode Terdeteksi!", description: `Resi: ${result.getText().toUpperCase()}` });
              setScanHintMessage(null); 
            } else if (error && zxingModule) { 
              if (error instanceof zxingModule.NotFoundException) {
                setScanHintMessage("Barcode tidak terdeteksi. Arahkan lebih jelas atau dekatkan.");
              } else if (error instanceof zxingModule.ChecksumException || error instanceof zxingModule.FormatException) {
                setScanHintMessage("Barcode terdeteksi tetapi formatnya salah atau rusak.");
              } else {
                 setScanHintMessage("Error saat memindai barcode."); 
              }
            }
          }
        );
      } else {
         setScanHintMessage('Komponen video hilang sebelum scan dimulai. Kamera aktif, tapi scan gagal.');
         toast({variant: 'destructive', title: 'Scan Error', description: 'Video tidak siap untuk scan.'});
      }
    };

    if (isScanDialogOpen) {
      initializeAndStartScanner();
    } else {
      stopScanAndCamera();
    }

    return () => {
      stopScanAndCamera();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isScanDialogOpen]); 


  const handleDailyInputChange = () => {
    if (!hasCheckedInToday) {
      toast({
        variant: "destructive",
        title: "Absensi Diperlukan",
        description: "Anda harus melakukan check-in absensi terlebih dahulu hari ini."
      });
      return;
    }
    if (totalPackagesCarried <= 0) {
       toast({
        variant: "destructive",
        title: "Input Tidak Valid",
        description: "Total Paket Dibawa harus lebih dari 0."
      });
      return;
    }
    if (totalPackagesCarried !== (codPackages + nonCodPackages)) {
      toast({
        variant: "destructive",
        title: "Input Tidak Valid",
        description: "Jumlah paket COD dan Non-COD harus sama dengan Total Paket Dibawa."
      });
      return;
    }
    setIsDailyInputSubmitted(true);
    toast({
      title: "Data Harian Disimpan",
      description: `Total: ${totalPackagesCarried}, COD: ${codPackages}, Non-COD: ${nonCodPackages}. Lanjutkan scan paket.`
    });
  };
  
  const handleAddPackage = () => {
    if (!hasCheckedInToday) {
      toast({ variant: "destructive", title: "Absensi Diperlukan", description: "Harap check-in absensi terlebih dahulu." });
      return;
    }
    if (!isDailyInputSubmitted) {
      toast({ variant: "destructive", title: "Error", description: "Harap simpan data paket harian terlebih dahulu." });
      return;
    }
    if (!resiInput.trim()) {
      toast({ variant: "destructive", title: "Error", description: "Nomor resi tidak boleh kosong." });
      return;
    }
    if (packages.length >= totalPackagesCarried) {
      toast({ variant: "destructive", title: "Error", description: `Anda sudah mencapai batas ${totalPackagesCarried} paket untuk hari ini.` });
      return;
    }
    const newPackage: PackageItem = {
      resi: resiInput.trim().toUpperCase(),
      status: 'Proses',
      isCod: isCodInput,
      timestamp: Date.now(),
    };
    setPackages(prev => [newPackage, ...prev]);
    setResiInput(''); 
    toast({ title: "Sukses", description: `Paket ${newPackage.resi} ditambahkan.` });
  };

  const updatePackageStatus = (resi: string, status: PackageStatus, photoUrl?: string, recipientName?: string) => {
    setPackages(prev => prev.map(p => p.resi === resi ? { ...p, status, photoUrl, recipientName } : p));
  };

  const deletePackage = (resi: string) => {
    setPackages(prev => prev.filter(p => p.resi !== resi));
    toast({ title: "Dihapus", description: `Paket ${resi} telah dihapus.` });
  };
  
  const handleFinishDay = () => {
     if (!hasCheckedInToday) {
      toast({ variant: "destructive", title: "Absensi Diperlukan", description: "Harap check-in absensi terlebih dahulu." });
      return;
    }
    if (!user) {
        toast({ variant: "destructive", title: "Error", description: "User tidak ditemukan." });
        return;
    }
    if (!isDailyInputSubmitted) {
      toast({ variant: "destructive", title: "Input Harian Belum Disimpan", description: "Harap simpan data paket harian terlebih dahulu." });
      return;
    }

    const packagesInProses = packages.filter(p => p.status === 'Proses');
    const packagesInPengantaran = packages.filter(p => p.status === 'Dalam Pengantaran');
    const packagesNeedReturnProof = packages.filter(p => p.status === 'Tidak Terkirim' || p.status === 'Pending');

    if (packagesInProses.length > 0 || packagesInPengantaran.length > 0) {
      toast({
        variant: "destructive",
        title: "Pengantaran Belum Selesai",
        description: "Masih ada paket dalam status 'Proses' atau 'Dalam Pengantaran'. Selesaikan semua pengantaran terlebih dahulu.",
      });
      return;
    }

    if (packagesNeedReturnProof.length > 0) {
      toast({
        variant: "destructive",
        title: "Paket Belum Diproses",
        description: "Harap proses semua paket 'Tidak Terkirim' atau 'Pending' dan ubah statusnya menjadi 'Dikembalikan' dengan bukti foto.",
      });
      return;
    }

    const todayDateString = format(new Date(), "yyyy-MM-dd");
    const deliveredCount = packages.filter(p => p.status === 'Terkirim').length;
    const failedOrReturnedCount = packages.filter(p => ['Tidak Terkirim', 'Pending', 'Dikembalikan'].includes(p.status)).length;
    const attemptedDeliveries = deliveredCount + failedOrReturnedCount;
    const successRate = attemptedDeliveries > 0 ? (deliveredCount / attemptedDeliveries) * 100 : 0;

    const dailySummary: AdminCourierDailySummary = {
      courierId: user.id,
      courierName: user.fullName,
      wilayah: user.wilayah,
      area: user.area,
      workLocation: user.workLocation,
      packagesCarried: totalPackagesCarried,
      packagesDelivered: deliveredCount,
      packagesFailedOrReturned: failedOrReturnedCount,
      successRate: successRate,
      status: 'Selesai',
      lastActivityTimestamp: Date.now(),
    };

    try {
        const existingReportsRaw = localStorage.getItem(LOCAL_STORAGE_DAILY_REPORTS_KEY);
        const allReports = existingReportsRaw ? JSON.parse(existingReportsRaw) : {};
        
        if (!allReports[todayDateString]) {
            allReports[todayDateString] = {};
        }
        allReports[todayDateString][user.id] = dailySummary;
        localStorage.setItem(LOCAL_STORAGE_DAILY_REPORTS_KEY, JSON.stringify(allReports));
        
        toast({ title: "Pengantaran Hari Ini Selesai", description: "Data telah disimpan. Mengarahkan ke halaman performa." });

    } catch (error) {
        console.error("Error saving daily summary to localStorage:", error);
        toast({ variant: "destructive", title: "Gagal Menyimpan", description: "Gagal menyimpan ringkasan harian." });
        return; 
    }
    
    setPackages([]);
    setTotalPackagesCarried(0);
    setCodPackages(0);
    setNonCodPackages(0);
    setIsDailyInputSubmitted(false);
    setResiInput('');
    setMotivationalQuote(motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)]);

    router.push('/performance');
  };

  const packagesByStatus = (status: PackageStatus) => packages.filter(p => p.status === status);

  const deliveryActionsActive = useMemo(() => {
    return isDailyInputSubmitted && 
           packagesByStatus('Proses').length === 0 && 
           packages.length > 0 && 
           packages.length === totalPackagesCarried;
  }, [isDailyInputSubmitted, packages, totalPackagesCarried]);

  const dailyPerformanceData = useMemo(() => {
    const deliveredCount = packages.filter(p => p.status === 'Terkirim').length;
    const failedOrReturnedCount = packages.filter(p => p.status === 'Tidak Terkirim' || p.status === 'Pending' || p.status === 'Dikembalikan').length;
    const inProgressOrProsesCount = packages.filter(p => p.status === 'Dalam Pengantaran' || p.status === 'Proses').length;

    const totalScannedPackages = packages.length;

    if (!isDailyInputSubmitted || totalPackagesCarried === 0) {
      return [{ name: 'Belum ada data', value: 1, percentage: 100, fill: CHART_COLORS_PIE.noData }];
    }

    if (totalScannedPackages === 0) {
      return [{ name: 'Belum ada paket di-scan', value: 1, percentage: 100, fill: CHART_COLORS_PIE.noData }];
    }
    
    const data = [];
    if (deliveredCount > 0) {
      data.push({
        name: 'Terkirim',
        value: deliveredCount,
        percentage: (deliveredCount / totalScannedPackages) * 100,
        fill: CHART_COLORS_PIE.delivered,
      });
    }
    if (failedOrReturnedCount > 0) {
      data.push({
        name: 'Gagal/Kembali', // Updated name for chart legend
        value: failedOrReturnedCount,
        percentage: (failedOrReturnedCount / totalScannedPackages) * 100,
        fill: CHART_COLORS_PIE.failedOrReturned,
      });
    }
    if (inProgressOrProsesCount > 0) {
      data.push({
        name: 'Proses/Antar',
        value: inProgressOrProsesCount,
        percentage: (inProgressOrProsesCount / totalScannedPackages) * 100,
        fill: CHART_COLORS_PIE.inProgressOrProses,
      });
    }
    
    if (data.length === 0 && totalScannedPackages > 0) {
        return [{ name: 'Status tidak jelas', value: totalScannedPackages, percentage: 100, fill: CHART_COLORS_PIE.noData }];
    }
    
    return data.length > 0 ? data : [{ name: 'Tidak ada paket diproses', value: 1, percentage: 100, fill: CHART_COLORS_PIE.noData }];

  }, [packages, isDailyInputSubmitted, totalPackagesCarried]);


  if (!isDashboardMounted) {
    return <div className="flex h-screen items-center justify-center">Loading dashboard...</div>;
  }

  return (
    <div className="space-y-6">
      <Card className="shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="font-headline text-2xl">Dashboard Kurir</CardTitle>
            <CardDescription>Selamat datang, {user?.fullName || 'Kurir'}!</CardDescription>
          </div>
           <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span>{user?.workLocation || 'Lokasi Kerja'}</span>
          </div>
        </CardHeader>
        <CardContent>
          <p className="italic text-primary">&quot;{motivationalQuote}&quot;</p>
        </CardContent>
      </Card>

      {hasCheckedInToday === false && (
        <Alert variant="destructive">
          <LogIn className="h-4 w-4" />
          <AlertTitle>Absensi Diperlukan!</AlertTitle>
          <AlertDescription>
            Anda belum melakukan check-in absensi hari ini. 
            Silakan check-in terlebih dahulu di halaman Absensi sebelum melanjutkan input data paket.
            <Button asChild variant="link" className="p-0 h-auto ml-1 text-destructive hover:underline">
                <Link href="/attendance">Ke Halaman Absensi</Link>
            </Button>
          </AlertDescription>
        </Alert>
      )}


      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg"><Edit3 className="h-5 w-5 text-primary"/>Input Data Paket Harian</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="totalPackagesCarried">Total Paket Dibawa</Label>
              <Input id="totalPackagesCarried" type="number" value={totalPackagesCarried} onChange={(e) => setTotalPackagesCarried(Math.max(0, parseInt(e.target.value, 10) || 0))} placeholder="Jumlah paket" disabled={isDailyInputSubmitted || !hasCheckedInToday} />
            </div>
            <div>
              <Label htmlFor="codPackages">Total Paket COD</Label>
              <Input id="codPackages" type="number" value={codPackages} onChange={(e) => setCodPackages(Math.max(0, parseInt(e.target.value, 10) || 0))} placeholder="Jumlah COD" disabled={isDailyInputSubmitted || !hasCheckedInToday} />
            </div>
            <div>
              <Label htmlFor="nonCodPackages">Total Paket Non-COD</Label>
              <Input id="nonCodPackages" type="number" value={nonCodPackages} onChange={(e) => setNonCodPackages(Math.max(0, parseInt(e.target.value, 10) || 0))} placeholder="Jumlah Non-COD" disabled={isDailyInputSubmitted || !hasCheckedInToday} />
            </div>
            {!isDailyInputSubmitted && (
              <Button onClick={handleDailyInputChange} className="w-full mt-2" disabled={!hasCheckedInToday}>
                <SaveIcon className="mr-2 h-4 w-4" /> Simpan Data Harian
              </Button>
            )}
            {isDailyInputSubmitted && (
              <div className="mt-2 p-3 bg-muted rounded-md text-sm">
                <p>Data harian telah disimpan:</p>
                <p>Total Paket: <strong>{totalPackagesCarried}</strong></p>
                <p>COD: <strong>{codPackages}</strong>, Non-COD: <strong>{nonCodPackages}</strong></p>
                <Button variant="outline" size="sm" onClick={() => setIsDailyInputSubmitted(false)} className="mt-2" disabled={!hasCheckedInToday}>Ubah Data</Button>
              </div>
            )}
          </CardContent>
        </Card>
        
        <Dialog open={isScanDialogOpen} onOpenChange={setIsScanDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="md:col-span-1 h-full text-lg flex flex-col items-center justify-center p-4 hover:bg-primary/10" disabled={!isDailyInputSubmitted || !hasCheckedInToday}>
              <ScanLine className="h-12 w-12 text-primary mb-2" />
              Input/Scan Resi ({packages.length}/{isDailyInputSubmitted ? totalPackagesCarried : '...'})
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Scan & Input Resi Paket</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Pratinjau Kamera Scan</Label>
                <div className="p-1 border rounded-md bg-muted aspect-video overflow-hidden">
                   <video ref={videoRef} className="w-full h-full object-cover rounded-md" playsInline muted autoPlay />
                </div>
                {hasCameraPermission === false && (
                  <Alert variant="destructive" className="mt-2">
                    <Camera className="h-4 w-4" />
                    <AlertTitle>Akses Kamera Diperlukan atau Gagal</AlertTitle>
                    <AlertDescription>
                      {scanHintMessage || "Gagal mengakses kamera. Pastikan izin telah diberikan dan tidak ada aplikasi lain yang menggunakan kamera."}
                    </AlertDescription>
                  </Alert>
                )}
                 {hasCameraPermission === null && (
                    <Alert variant="default" className="mt-2">
                        <Camera className="h-4 w-4" />
                        <AlertTitle>Menunggu Izin Kamera...</AlertTitle>
                        <AlertDescription>
                            {scanHintMessage || "Izinkan aplikasi untuk menggunakan kamera Anda."}
                        </AlertDescription>
                    </Alert>
                )}
                {hasCameraPermission === true && scanHintMessage && (
                  <div className="mt-2 p-2 text-sm text-orange-600 bg-orange-50 border border-orange-200 rounded-md flex items-center">
                    <AlertCircle className="h-4 w-4 mr-2 shrink-0" />
                    <p>{scanHintMessage}</p>
                  </div>
                )}
                 {hasCameraPermission === true && !scanHintMessage && (
                  <p className="text-xs text-muted-foreground text-center mt-1">Arahkan kamera ke barcode.</p>
                )}
              </div>

              <Separator />

              <div>
                <Label htmlFor="resi-manual">Nomor Resi</Label>
                <Input id="resi-manual" value={resiInput} onChange={(e) => setResiInput(e.target.value.toUpperCase())} placeholder="Hasil scan atau ketik manual" />
              </div>
              <div className="flex items-center space-x-2">
                <Input type="checkbox" id="isCod-manual" checked={isCodInput} onChange={(e) => setIsCodInput(e.target.checked)} className="h-4 w-4"/>
                <Label htmlFor="isCod-manual" className="font-normal">Paket COD</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsScanDialogOpen(false)}>Batal</Button>
              <Button onClick={() => { 
                handleAddPackage();
              }}>Simpan Paket</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

         <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg"><PackageCheck className="h-5 w-5 text-accent"/>Performa Harian</CardTitle>
             <CardDescription>Distribusi status paket yang diinput.</CardDescription>
          </CardHeader>
          <CardContent>
            {(isDailyInputSubmitted && totalPackagesCarried > 0 && dailyPerformanceData.length > 0) ? (
              <ResponsiveContainer width="100%" height={150}>
                <PieChart>
                  <Pie 
                    data={dailyPerformanceData} 
                    dataKey="value" 
                    nameKey="name" 
                    cx="50%" 
                    cy="50%" 
                    outerRadius={60} 
                    labelLine={false} 
                    label={({ name, percentage }) => `${name}: ${percentage ? percentage.toFixed(0) : '0'}%`}
                  >
                    {dailyPerformanceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value, name, props) => {
                      const percentage = props.payload.percentage;
                      return [`${value} (${percentage ? percentage.toFixed(1) : '0.0'}%)`, name];
                  }}/>
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-muted-foreground h-[150px] flex items-center justify-center">
                {isDailyInputSubmitted && totalPackagesCarried > 0 && dailyPerformanceData.length === 0 
                  ? 'Tidak ada paket yang diproses.' 
                  : 'Input data harian untuk melihat performa.'}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Archive className="h-5 w-5 text-primary"/>Manage Package (Status: Proses) ({packagesByStatus('Proses').length})</CardTitle>
          <CardDescription>Daftar paket yang baru diinput dan siap untuk diantar.</CardDescription>
        </CardHeader>
        <CardContent>
          <PackageTable
            packages={packagesByStatus('Proses')}
            actions={[
              { label: 'Mulai Antar', icon: Truck, onClick: (p) => updatePackageStatus(p.resi, 'Dalam Pengantaran'), variant: 'default' },
              { label: 'Hapus', icon: Trash2, onClick: (p) => deletePackage(p.resi), variant: 'destructive' }
            ]}
            emptyMessage="Tidak ada paket dalam proses."
            actionsDisabled={!hasCheckedInToday}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Truck className="h-5 w-5 text-yellow-500"/>Sedang Dalam Pengantaran ({packagesByStatus('Dalam Pengantaran').length})</CardTitle>
          <CardDescription>
            Paket yang sedang dalam perjalanan ke penerima.
            {!deliveryActionsActive && isDailyInputSubmitted && packagesByStatus('Proses').length === 0 && packages.length > 0 && packages.length < totalPackagesCarried &&
              <span className="text-destructive block mt-1"> (Scan semua {totalPackagesCarried - packages.length} paket lagi untuk mengaktifkan aksi)</span>
            }
            {!deliveryActionsActive && isDailyInputSubmitted && packagesByStatus('Proses').length > 0 &&
              <span className="text-destructive block mt-1"> (Pindahkan semua paket dari 'Proses' untuk mengaktifkan aksi)</span>
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PackageTable
            packages={packagesByStatus('Dalam Pengantaran')}
            actions={[
              (p) => <PackageActionButton key={`photo-${p.resi}`} pkg={p} actionType="photo" updatePackageStatus={updatePackageStatus} disabled={!deliveryActionsActive || !hasCheckedInToday} />,
              { label: 'Gagal Kirim', icon: PackageX, onClick: (p) => updatePackageStatus(p.resi, 'Tidak Terkirim'), variant: 'outline', disabled: !deliveryActionsActive || !hasCheckedInToday }
            ]}
            emptyMessage="Tidak ada paket yang sedang diantar."
            showRecipientInput
            updatePackageStatus={updatePackageStatus}
            actionsDisabled={!deliveryActionsActive || !hasCheckedInToday}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><CheckCircle className="h-5 w-5 text-green-500"/>Paket Terkirim ({packagesByStatus('Terkirim').length})</CardTitle>
          <CardDescription>Paket yang berhasil diantar hari ini.</CardDescription>
        </CardHeader>
        <CardContent>
           <PackageTable
            packages={packagesByStatus('Terkirim')}
            emptyMessage="Belum ada paket terkirim hari ini."
            showPhoto
            showRecipientName
            actionsDisabled={!hasCheckedInToday}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><PackageX className="h-5 w-5 text-red-500"/>Paket Pending / Tidak Terkirim ({packagesByStatus('Tidak Terkirim').length + packagesByStatus('Pending').length})</CardTitle>
          <CardDescription>Paket yang belum berhasil diantar dan perlu tindak lanjut.</CardDescription>
        </CardHeader>
        <CardContent>
          <PackageTable
            packages={[...packagesByStatus('Tidak Terkirim'), ...packagesByStatus('Pending')]}
            actions={[
              (p) => <PackageActionButton key={`return-${p.resi}`} pkg={p} actionType="returnProof" updatePackageStatus={updatePackageStatus} disabled={!hasCheckedInToday}/>,
            ]}
            emptyMessage="Tidak ada paket pending atau tidak terkirim."
             showPhoto
             actionsDisabled={!hasCheckedInToday}
          />
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
            <CardTitle className="flex items-center gap-2"><Archive className="h-5 w-5 text-gray-500"/>Paket Dikembalikan ({packagesByStatus('Dikembalikan').length})</CardTitle>
            <CardDescription>Paket yang telah dikembalikan ke gudang.</CardDescription>
        </CardHeader>
        <CardContent>
            <PackageTable
                packages={packagesByStatus('Dikembalikan')}
                emptyMessage="Belum ada paket yang dikembalikan."
                showPhoto
                actionsDisabled={!hasCheckedInToday}
            />
        </CardContent>
      </Card>

      <Button onClick={handleFinishDay} size="lg" className="w-full mt-6" disabled={!hasCheckedInToday}>
        <Clock className="mr-2 h-5 w-5"/> Selesaikan Pengantaran Hari Ini
      </Button>
    </div>
  );
}


interface PackageTableProps {
  packages: PackageItem[];
  actions?: (((pkg: PackageItem) => React.ReactNode) | { label: string; icon: React.ElementType; onClick: (pkg: PackageItem) => void; variant: "default" | "destructive" | "outline", disabled?: boolean })[];
  emptyMessage: string;
  showPhoto?: boolean;
  showRecipientInput?: boolean;
  showRecipientName?: boolean;
  updatePackageStatus?: (resi: string, status: PackageStatus, photoUrl?: string, recipientName?: string) => void;
  actionsDisabled?: boolean; 
}

function PackageTable({ packages, actions = [], emptyMessage, showPhoto, showRecipientInput, showRecipientName, updatePackageStatus, actionsDisabled }: PackageTableProps) {
  if (packages.length === 0) {
    return <p className="text-center text-muted-foreground py-4">{emptyMessage}</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Resi</TableHead>
          <TableHead>Jenis</TableHead>
          {(showRecipientInput || showRecipientName) && <TableHead>Nama Penerima</TableHead>}
          {showPhoto && <TableHead>Bukti Foto</TableHead>}
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Aksi</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {packages.map((pkg) => (
          <TableRow key={pkg.resi}>
            <TableCell className="font-code">{pkg.resi}</TableCell>
            <TableCell>
              <Badge variant={pkg.isCod ? "default" : "secondary"}>
                {pkg.isCod ? "COD" : "Non-COD"}
              </Badge>
            </TableCell>
            {(showRecipientInput || showRecipientName) && (
              <TableCell>
                {showRecipientInput && updatePackageStatus ? (
                  <Input 
                    type="text" 
                    placeholder="Nama Penerima" 
                    defaultValue={pkg.recipientName}
                    onBlur={(e) => updatePackageStatus(pkg.resi, pkg.status, pkg.photoUrl, e.target.value)}
                    className="h-8"
                    disabled={actionsDisabled}
                  />
                ) : pkg.recipientName ? (
                  <span>{pkg.recipientName}</span>
                ) : (
                  <span className="text-xs text-muted-foreground">N/A</span>
                )}
              </TableCell>
            )}
            {showPhoto && (
              <TableCell>
                {pkg.photoUrl ? (
                  <Image src={pkg.photoUrl} alt={`Proof for ${pkg.resi}`} width={40} height={40} className="rounded" data-ai-hint="delivery proof" />
                ) : (
                  <span className="text-xs text-muted-foreground">N/A</span>
                )}
              </TableCell>
            )}
            <TableCell><Badge variant={
              pkg.status === 'Terkirim' ? 'default' : 
              pkg.status === 'Dalam Pengantaran' ? 'outline' :
              pkg.status === 'Proses' ? 'secondary' : 
              pkg.status === 'Dikembalikan' ? 'default' : 
              'destructive'
            }
            className={
                pkg.status === 'Terkirim' ? 'bg-green-500 hover:bg-green-600' : 
                pkg.status === 'Dikembalikan' ? 'bg-blue-500 hover:bg-blue-600' : ''
            }
            >{pkg.status}</Badge></TableCell>
            <TableCell className="text-right space-x-1">
              {actions.map((action, idx) => 
                typeof action === 'function' ? (
                  action(pkg) 
                ) : (
                  <Button key={idx} variant={action.variant} size="sm" onClick={() => action.onClick(pkg)} disabled={action.disabled || actionsDisabled}>
                    <action.icon className="h-4 w-4 mr-1" /> {action.label}
                  </Button>
                )
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}


interface PackageActionButtonProps {
  pkg: PackageItem;
  actionType: 'photo' | 'returnProof';
  updatePackageStatus: (resi: string, status: PackageStatus, photoUrl?: string, recipientName?: string) => void;
  disabled?: boolean;
}

function PackageActionButton({ pkg, actionType, updatePackageStatus, disabled }: PackageActionButtonProps) {
  const { toast } = useToast();
  const [recipientName, setRecipientName] = useState(pkg.recipientName || '');
  const [isInternalDialogOpen, setIsInternalDialogOpen] = useState(false);


  const handlePhotoAction = () => {
    const photoPlaceholder = `https://placehold.co/300x200.png?text=Resi+${pkg.resi}`;
    if (actionType === 'photo') {
      if(!recipientName && pkg.status !== 'Tidak Terkirim') { 
        toast({variant: 'destructive', title: "Error", description: "Nama penerima harus diisi untuk paket terkirim."});
        return;
      }
      updatePackageStatus(pkg.resi, 'Terkirim', photoPlaceholder, recipientName);
      toast({ title: "Sukses", description: `Paket ${pkg.resi} ditandai terkirim dengan foto.` });
    } else { 
      updatePackageStatus(pkg.resi, 'Dikembalikan', photoPlaceholder, recipientName); 
      toast({ title: "Sukses", description: `Bukti pengembalian paket ${pkg.resi} diupload. Status diubah menjadi 'Dikembalikan'.` });
    }
    setIsInternalDialogOpen(false);
  };
  
  const Icon = actionType === 'photo' ? Camera : UploadCloud; 
  const title = actionType === 'photo' ? "Upload Foto Bukti & Nama Penerima" : "Upload Bukti Paket Dikembalikan";
  const buttonLabel = actionType === 'photo' ? (pkg.photoUrl && pkg.status === 'Terkirim' ? "Lihat/Ubah Bukti" : "Foto & Kirim") : (pkg.photoUrl && pkg.status === 'Dikembalikan' ? "Lihat/Ubah Bukti" : "Upload Bukti Kembali");
  const ButtonIcon = actionType === 'photo' ? (pkg.photoUrl && pkg.status === 'Terkirim' ? Edit3 : Camera) : (pkg.photoUrl && pkg.status === 'Dikembalikan' ? Edit3 : UploadCloud);

  return (
    <Dialog open={isInternalDialogOpen} onOpenChange={setIsInternalDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled}>
          <ButtonIcon className="h-4 w-4 mr-1" />
          {buttonLabel}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title} - {pkg.resi}</DialogTitle>
        </DialogHeader>
        <div className="py-4 space-y-4">
          {actionType === 'photo' && (
            <div>
              <Label htmlFor={`recipientName-${pkg.resi}`}>Nama Penerima</Label>
              <Input 
                id={`recipientName-${pkg.resi}`}
                value={recipientName} 
                onChange={(e) => setRecipientName(e.target.value)}
                placeholder="Masukkan nama penerima" 
              />
            </div>
          )}
          <p className="text-sm text-muted-foreground">Simulasikan pengambilan/upload foto di sini.</p>
          {((pkg.photoUrl && pkg.status === 'Terkirim' && actionType === 'photo') || (pkg.photoUrl && pkg.status === 'Dikembalikan' && actionType === 'returnProof')) && (
            <Image src={pkg.photoUrl} alt="Current proof" width={200} height={150} className="rounded mx-auto" data-ai-hint="delivery proof document" />
          )}
          <div className="flex justify-center">
             <Button onClick={() => {alert("Fitur kamera/upload belum diimplementasikan. Ini adalah simulasi pengambilan foto baru.")}}>
              <Icon className="h-4 w-4 mr-2"/> {(pkg.photoUrl && (pkg.status === 'Terkirim' || pkg.status === 'Dikembalikan')) ? "Ambil/Upload Ulang" : "Ambil/Upload Foto"}
            </Button>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild><Button variant="outline" onClick={()=> setIsInternalDialogOpen(false)}>Batal</Button></DialogClose>
          <Button onClick={handlePhotoAction}>Simpan Bukti</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
    

    


