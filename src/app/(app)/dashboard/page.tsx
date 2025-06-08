
"use client";

import { useState, useMemo, useEffect, useRef } from 'react';
import type { PackageItem, PackageStatus } from '@/types';
import { mockPackages, motivationalQuotes } from '@/lib/mockData'; // Removed mockUser
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Camera, Edit3, PackageCheck, PackageX, ScanLine, Trash2, Truck, UserCircle, MapPin, CheckCircle, XCircle, Clock, UploadCloud, ImagePlus, DollarSign, Archive, SaveIcon } from 'lucide-react';
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
import { useAuth } from '@/contexts/AuthContext'; // Added useAuth import

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))'];

export default function DashboardPage() {
  const { user } = useAuth(); // Get user from AuthContext
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
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    setMotivationalQuote(motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)]);
  }, []);

  useEffect(() => {
    const getCameraPermission = async () => {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.error('Camera API not supported.');
        setHasCameraPermission(false);
        toast({
          variant: 'destructive',
          title: 'Kamera Tidak Didukung',
          description: 'Browser Anda tidak mendukung akses kamera.',
        });
        return;
      }

      let stream: MediaStream | null = null;
      try {
        // Try for rear camera first (exact)
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { exact: "environment" } } });
      } catch (err) {
        console.warn("Could not get rear camera (exact), trying ideal:", err);
        try {
          // Try for rear camera (ideal)
          stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        } catch (err2) {
          console.warn("Could not get rear camera (ideal), trying any camera:", err2);
          try {
            // Fallback to any camera
            stream = await navigator.mediaDevices.getUserMedia({ video: true });
          } catch (finalError) {
            console.error('Error accessing any camera:', finalError);
            setHasCameraPermission(false);
            toast({
              variant: 'destructive',
              title: 'Akses Kamera Ditolak',
              description: 'Mohon izinkan akses kamera di pengaturan browser Anda. Jika sudah, coba muat ulang halaman.',
            });
            return;
          }
        }
      }

      setHasCameraPermission(true);
      streamRef.current = stream; // Store stream in ref
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    };

    if (isScanDialogOpen) {
      getCameraPermission();
    } else {
      // Cleanup when dialog is closed
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      setHasCameraPermission(null); // Reset permission status
    }

    return () => {
      // Ensure cleanup on component unmount or if dialog closes unexpectedly
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    };
  }, [isScanDialogOpen, toast]);

  const handleDailyInputChange = () => {
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
    setIsCodInput(false);
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

    toast({ title: "Pengantaran Hari Ini Selesai", description: "Data akan direset. Mengarahkan ke halaman performa." });
    
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
    const delivered = packages.filter(p => p.status === 'Terkirim').length;
    const failedOrPending = packages.filter(p => p.status === 'Tidak Terkirim' || p.status === 'Pending' || p.status === 'Dikembalikan').length;
    const inProgress = packages.filter(p => p.status === 'Dalam Pengantaran' || p.status === 'Proses').length;

    if (isDailyInputSubmitted && totalPackagesCarried > 0) {
        const remaining = totalPackagesCarried - delivered - failedOrPending - inProgress;
        return [
          { name: 'Terkirim', value: delivered, percentage: (delivered / totalPackagesCarried) * 100 },
          { name: 'Gagal/Pending/Kembali', value: failedOrPending, percentage: (failedOrPending / totalPackagesCarried) * 100 },
          { name: 'Proses/Antar', value: inProgress, percentage: (inProgress / totalPackagesCarried) * 100 },
          { name: 'Belum Scan', value: Math.max(0, remaining), percentage: (Math.max(0,remaining) / totalPackagesCarried) * 100 }
        ].filter(item => item.value > 0 || (item.name === 'Belum Scan' && (delivered > 0 || failedOrPending > 0 || inProgress > 0 || remaining > 0)));
    }
    return [{ name: 'Belum ada data', value: 1, percentage: 100}];

  }, [packages, isDailyInputSubmitted, totalPackagesCarried]);


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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg"><Edit3 className="h-5 w-5 text-primary"/>Input Data Paket Harian</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="totalPackagesCarried">Total Paket Dibawa</Label>
              <Input id="totalPackagesCarried" type="number" value={totalPackagesCarried} onChange={(e) => setTotalPackagesCarried(Math.max(0, parseInt(e.target.value, 10) || 0))} placeholder="Jumlah paket" disabled={isDailyInputSubmitted} />
            </div>
            <div>
              <Label htmlFor="codPackages">Total Paket COD</Label>
              <Input id="codPackages" type="number" value={codPackages} onChange={(e) => setCodPackages(Math.max(0, parseInt(e.target.value, 10) || 0))} placeholder="Jumlah COD" disabled={isDailyInputSubmitted} />
            </div>
            <div>
              <Label htmlFor="nonCodPackages">Total Paket Non-COD</Label>
              <Input id="nonCodPackages" type="number" value={nonCodPackages} onChange={(e) => setNonCodPackages(Math.max(0, parseInt(e.target.value, 10) || 0))} placeholder="Jumlah Non-COD" disabled={isDailyInputSubmitted} />
            </div>
            {!isDailyInputSubmitted && (
              <Button onClick={handleDailyInputChange} className="w-full mt-2">
                <SaveIcon className="mr-2 h-4 w-4" /> Simpan Data Harian
              </Button>
            )}
            {isDailyInputSubmitted && (
              <div className="mt-2 p-3 bg-muted rounded-md text-sm">
                <p>Data harian telah disimpan:</p>
                <p>Total Paket: <strong>{totalPackagesCarried}</strong></p>
                <p>COD: <strong>{codPackages}</strong>, Non-COD: <strong>{nonCodPackages}</strong></p>
                <Button variant="outline" size="sm" onClick={() => setIsDailyInputSubmitted(false)} className="mt-2">Ubah Data</Button>
              </div>
            )}
          </CardContent>
        </Card>
        
        <Dialog open={isScanDialogOpen} onOpenChange={setIsScanDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="md:col-span-1 h-full text-lg flex flex-col items-center justify-center p-4 hover:bg-primary/10" disabled={!isDailyInputSubmitted}>
              <ScanLine className="h-12 w-12 text-primary mb-2" />
              Input/Scan Resi ({packages.length}/{isDailyInputSubmitted ? totalPackagesCarried : '...'})
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Input Resi Paket Manual & Scan</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Scan Barcode (Pratinjau Kamera)</Label>
                <div className="p-1 border rounded-md bg-muted">
                  <video ref={videoRef} className="w-full aspect-[4/3] rounded-md" autoPlay muted playsInline />
                </div>
                {hasCameraPermission === false && (
                  <Alert variant="destructive">
                    <Camera className="h-4 w-4" />
                    <AlertTitle>Akses Kamera Diperlukan</AlertTitle>
                    <AlertDescription>
                      Aplikasi memerlukan izin kamera. Mohon aktifkan di pengaturan browser Anda dan muat ulang halaman jika perlu.
                    </AlertDescription>
                  </Alert>
                )}
                 {hasCameraPermission === null && videoRef.current?.srcObject === null && ( // Show only if permission not yet granted AND video not active
                    <Alert variant="default">
                        <Camera className="h-4 w-4" />
                        <AlertTitle>Menunggu Izin Kamera...</AlertTitle>
                        <AlertDescription>
                            Izinkan aplikasi untuk menggunakan kamera Anda. Akan dicoba akses kamera belakang terlebih dahulu.
                        </AlertDescription>
                    </Alert>
                )}
                <p className="text-xs text-muted-foreground text-center">Arahkan kamera ke barcode. Fitur scan otomatis segera hadir.</p>
              </div>

              <Separator />

              <div>
                <Label htmlFor="resi-manual">Nomor Resi (Manual)</Label>
                <Input id="resi-manual" value={resiInput} onChange={(e) => setResiInput(e.target.value.toUpperCase())} placeholder="Ketik nomor resi" />
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
                if (resiInput.trim() && packages.length < totalPackagesCarried) {
                  // Keep dialog open if successfully added and can add more
                } else {
                  setIsScanDialogOpen(false);
                }
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
            {isDailyInputSubmitted && totalPackagesCarried > 0 ? (
              <ResponsiveContainer width="100%" height={150}>
                <PieChart>
                  <Pie data={dailyPerformanceData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60} labelLine={false} label={({ name, percentage }) => `${name}: ${percentage.toFixed(0)}%`}>
                    {dailyPerformanceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value, name, props) => [`${value} (${props.payload.percentage.toFixed(1)}%)`, name]}/>
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-muted-foreground">Input data harian untuk melihat performa.</p>
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
              { label: 'Mulai Antar', icon: Truck, onClick: (p) => updatePackageStatus(p.resi, 'Dalam Pengantaran'), variant: 'default', disabled: !isDailyInputSubmitted },
              { label: 'Hapus', icon: Trash2, onClick: (p) => deletePackage(p.resi), variant: 'destructive', disabled: !isDailyInputSubmitted }
            ]}
            emptyMessage="Tidak ada paket dalam proses."
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
              (p) => <PackageActionButton key={`photo-${p.resi}`} pkg={p} actionType="photo" updatePackageStatus={updatePackageStatus} disabled={!deliveryActionsActive} />,
              { label: 'Gagal Kirim', icon: PackageX, onClick: (p) => updatePackageStatus(p.resi, 'Tidak Terkirim'), variant: 'outline', disabled: !deliveryActionsActive }
            ]}
            emptyMessage="Tidak ada paket yang sedang diantar."
            showRecipientInput
            updatePackageStatus={updatePackageStatus}
            actionsDisabled={!deliveryActionsActive}
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
              (p) => <PackageActionButton key={`return-${p.resi}`} pkg={p} actionType="returnProof" updatePackageStatus={updatePackageStatus} disabled={!isDailyInputSubmitted} />,
            ]}
            emptyMessage="Tidak ada paket pending atau tidak terkirim."
             showPhoto
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
            />
        </CardContent>
      </Card>

      <Button onClick={handleFinishDay} size="lg" className="w-full mt-6">
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
                  <Button key={idx} variant={action.variant} size="sm" onClick={() => action.onClick(pkg)} disabled={action.disabled}>
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

