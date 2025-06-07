
"use client";

import { useState, useMemo, useEffect } from 'react';
import type { PackageItem, PackageStatus } from '@/types';
import { mockUser, mockPackages, motivationalQuotes } from '@/lib/mockData';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Camera, Edit3, PackageCheck, PackageX, ScanLine, Trash2, Truck, UserCircle, MapPin, CheckCircle, XCircle, Clock, UploadCloud, ImagePlus, DollarSign, Archive } from 'lucide-react';
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

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))'];

export default function DashboardPage() {
  const [packages, setPackages] = useState<PackageItem[]>(mockPackages);
  const [totalPackagesCarried, setTotalPackagesCarried] = useState(20);
  const [codPackages, setCodPackages] = useState(10);
  const [nonCodPackages, setNonCodPackages] = useState(10);
  const [resiInput, setResiInput] = useState('');
  const [isCodInput, setIsCodInput] = useState(false);
  const [motivationalQuote, setMotivationalQuote] = useState('');

  const { toast } = useToast();

  useEffect(() => {
    setMotivationalQuote(motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)]);
  }, []);

  const handleAddPackage = () => {
    if (!resiInput.trim()) {
      toast({ variant: "destructive", title: "Error", description: "Nomor resi tidak boleh kosong." });
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
    setPackages(prev => prev.map(p => {
      if (p.status === 'Dalam Pengantaran') {
        return { ...p, status: 'Tidak Terkirim' };
      }
      return p;
    }));
    toast({ title: "Hari Selesai", description: "Status paket telah diperbarui." });
  };

  const packagesByStatus = (status: PackageStatus) => packages.filter(p => p.status === status);

  const dailyPerformanceData = useMemo(() => {
    const delivered = packages.filter(p => p.status === 'Terkirim').length;
    const pending = packages.filter(p => p.status === 'Tidak Terkirim' || p.status === 'Pending').length;
    const total = delivered + pending;
    return [
      { name: 'Terkirim', value: delivered, percentage: total > 0 ? (delivered / total) * 100 : 0 },
      { name: 'Pending/Gagal', value: pending, percentage: total > 0 ? (pending / total) * 100 : 0 },
    ];
  }, [packages]);


  return (
    <div className="space-y-6">
      <Card className="shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="font-headline text-2xl">Dashboard Kurir</CardTitle>
            <CardDescription>Selamat datang, {mockUser.fullName}!</CardDescription>
          </div>
           <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span>{mockUser.workLocation}</span>
          </div>
        </CardHeader>
        <CardContent>
          <p className="italic text-primary">&quot;{motivationalQuote}&quot;</p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg"><Truck className="h-5 w-5 text-primary"/>Data Input Paket Harian</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between"><span>Total Paket Dibawa:</span> <span className="font-semibold">{totalPackagesCarried}</span></div>
            <div className="flex justify-between"><span>Total Paket COD:</span> <span className="font-semibold">{codPackages}</span></div>
            <div className="flex justify-between"><span>Total Paket Non-COD:</span> <span className="font-semibold">{nonCodPackages}</span></div>
          </CardContent>
        </Card>
        
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" className="md:col-span-1 h-full text-lg flex flex-col items-center justify-center p-4 hover:bg-primary/10">
              <ScanLine className="h-12 w-12 text-primary mb-2" />
              Mulai Scan Barcode
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Input Resi Paket</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="resi">Nomor Resi</Label>
                <Input id="resi" value={resiInput} onChange={(e) => setResiInput(e.target.value)} placeholder="Ketik nomor resi manual" />
              </div>
              <div className="flex items-center space-x-2">
                <Input type="checkbox" id="isCod" checked={isCodInput} onChange={(e) => setIsCodInput(e.target.checked)} className="h-4 w-4"/>
                <Label htmlFor="isCod" className="font-normal">Paket COD</Label>
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild><Button variant="outline">Batal</Button></DialogClose>
              <Button onClick={handleAddPackage}>Simpan Paket</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

         <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg"><PackageCheck className="h-5 w-5 text-accent"/>Performa Harian</CardTitle>
          </CardHeader>
          <CardContent>
            {dailyPerformanceData.find(d => d.value > 0) ? (
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
              <p className="text-center text-muted-foreground">Belum ada data paket untuk hari ini.</p>
            )}
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Archive className="h-5 w-5 text-primary"/>Manage Package (Status: Proses)</CardTitle>
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
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Truck className="h-5 w-5 text-yellow-500"/>Sedang Dalam Pengantaran</CardTitle>
          <CardDescription>Paket yang sedang dalam perjalanan ke penerima.</CardDescription>
        </CardHeader>
        <CardContent>
          <PackageTable
            packages={packagesByStatus('Dalam Pengantaran')}
            actions={[
              (p) => <PackageActionButton key={`photo-${p.resi}`} pkg={p} actionType="photo" updatePackageStatus={updatePackageStatus} />,
              { label: 'Gagal Kirim', icon: PackageX, onClick: (p) => updatePackageStatus(p.resi, 'Tidak Terkirim'), variant: 'outline' }
            ]}
            emptyMessage="Tidak ada paket yang sedang diantar."
            showRecipientInput
            updatePackageStatus={updatePackageStatus}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><CheckCircle className="h-5 w-5 text-green-500"/>Paket Terkirim</CardTitle>
          <CardDescription>Paket yang berhasil diantar hari ini.</CardDescription>
        </CardHeader>
        <CardContent>
           <PackageTable
            packages={packagesByStatus('Terkirim')}
            emptyMessage="Belum ada paket terkirim hari ini."
            showPhoto
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><PackageX className="h-5 w-5 text-red-500"/>Paket Pending / Tidak Terkirim</CardTitle>
          <CardDescription>Paket yang belum berhasil diantar dan perlu tindak lanjut.</CardDescription>
        </CardHeader>
        <CardContent>
          <PackageTable
            packages={[...packagesByStatus('Tidak Terkirim'), ...packagesByStatus('Pending')]}
            actions={[
              (p) => <PackageActionButton key={`return-${p.resi}`} pkg={p} actionType="returnProof" updatePackageStatus={updatePackageStatus} />,
            ]}
            emptyMessage="Tidak ada paket pending atau tidak terkirim."
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
  actions?: (((pkg: PackageItem) => React.ReactNode) | { label: string; icon: React.ElementType; onClick: (pkg: PackageItem) => void; variant: "default" | "destructive" | "outline" })[];
  emptyMessage: string;
  showPhoto?: boolean;
  showRecipientInput?: boolean;
  updatePackageStatus?: (resi: string, status: PackageStatus, photoUrl?: string, recipientName?: string) => void;
}

function PackageTable({ packages, actions = [], emptyMessage, showPhoto, showRecipientInput, updatePackageStatus }: PackageTableProps) {
  if (packages.length === 0) {
    return <p className="text-center text-muted-foreground py-4">{emptyMessage}</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Resi</TableHead>
          <TableHead>Jenis</TableHead>
          {showRecipientInput && <TableHead>Nama Penerima</TableHead>}
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
            {showRecipientInput && updatePackageStatus && (
              <TableCell>
                <Input 
                  type="text" 
                  placeholder="Nama Penerima" 
                  defaultValue={pkg.recipientName}
                  onBlur={(e) => updatePackageStatus(pkg.resi, pkg.status, pkg.photoUrl, e.target.value)}
                  className="h-8"
                />
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
              pkg.status === 'Proses' ? 'secondary' : 'destructive'
            }>{pkg.status}</Badge></TableCell>
            <TableCell className="text-right space-x-1">
              {actions.map((action, idx) => 
                typeof action === 'function' ? (
                  action(pkg)
                ) : (
                  <Button key={idx} variant={action.variant} size="sm" onClick={() => action.onClick(pkg)}>
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
}

function PackageActionButton({ pkg, actionType, updatePackageStatus }: PackageActionButtonProps) {
  const { toast } = useToast();
  const [recipientName, setRecipientName] = useState(pkg.recipientName || '');

  const handlePhotoAction = () => {
    // Simulate photo taking
    const photoPlaceholder = `https://placehold.co/300x200.png?text=Resi+${pkg.resi}`;
    if (actionType === 'photo') {
      if(!recipientName) {
        toast({variant: 'destructive', title: "Error", description: "Nama penerima harus diisi."});
        return;
      }
      updatePackageStatus(pkg.resi, 'Terkirim', photoPlaceholder, recipientName);
      toast({ title: "Sukses", description: `Paket ${pkg.resi} ditandai terkirim dengan foto.` });
    } else { // returnProof
      updatePackageStatus(pkg.resi, 'Dikembalikan', photoPlaceholder);
      toast({ title: "Sukses", description: `Bukti pengembalian paket ${pkg.resi} diupload.` });
    }
  };
  
  const Icon = actionType === 'photo' ? ImagePlus : UploadCloud;
  const title = actionType === 'photo' ? "Upload Foto Bukti & Nama Penerima" : "Upload Bukti Paket Dikembalikan";
  const buttonLabel = actionType === 'photo' ? (pkg.photoUrl ? "Ubah Foto" : "Foto & Kirim") : "Upload Bukti";
  const ButtonIcon = actionType === 'photo' ? (pkg.photoUrl ? Edit3 : Camera) : UploadCloud;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
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
          {pkg.photoUrl && actionType === 'photo' && (
            <Image src={pkg.photoUrl} alt="Current proof" width={200} height={150} className="rounded mx-auto" data-ai-hint="delivery proof document" />
          )}
          {pkg.photoUrl && actionType === 'returnProof' && (
            <Image src={pkg.photoUrl} alt="Current proof of return" width={200} height={150} className="rounded mx-auto" data-ai-hint="return proof package" />
          )}
          <div className="flex justify-center">
             <Button onClick={() => {/* Simulate file input click */ alert("Fitur kamera/upload belum diimplementasikan. Ini adalah simulasi.")}}>
              <Icon className="h-4 w-4 mr-2"/> {pkg.photoUrl ? "Ambil/Upload Ulang" : "Ambil/Upload Foto"}
            </Button>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild><Button variant="outline">Batal</Button></DialogClose>
          <Button onClick={handlePhotoAction}>Simpan Bukti</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

