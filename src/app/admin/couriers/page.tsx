
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useForm, type SubmitHandler, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import type { User, AdminSession } from '@/types'; // Added AdminSession
import { useAuth } from '@/contexts/AuthContext'; // Added useAuth
import { PlusCircle, Edit, Trash2, UserPlus, Info, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { auth, db } from '@/lib/firebase';
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, getDoc, deleteDoc, collection, getDocs, serverTimestamp, updateDoc } from 'firebase/firestore';

const courierSchema = z.object({
  id: z.string().min(3, "ID Kustom Kurir minimal 3 karakter").regex(/^[a-zA-Z0-9_.-]*$/, "ID Kustom Kurir hanya boleh berisi huruf, angka, _, ., -"),
  fullName: z.string().min(3, "Nama lengkap minimal 3 karakter"),
  password: z.string().min(6, "Password minimal 6 karakter").optional(),
  wilayah: z.string().min(3, "Wilayah minimal 3 karakter"),
  area: z.string().min(3, "Area minimal 3 karakter"),
  workLocation: z.string().min(3, "Lokasi kerja minimal 3 karakter"),
  joinDate: z.string().min(1, "Tanggal join tidak boleh kosong"),
  jobTitle: z.string().min(1, "Jabatan tidak boleh kosong"),
  contractStatus: z.string().min(1, "Status kontrak tidak boleh kosong"),
  accountNumber: z.string().min(1, "Nomor rekening tidak boleh kosong").regex(/^[0-9]*$/, "Nomor rekening hanya boleh angka"),
  bankName: z.string().min(1, "Nama bank tidak boleh kosong"),
  registeredRecipientName: z.string().min(1, "Nama penerima terdaftar tidak boleh kosong"),
  avatarUrl: z.string().url("URL Avatar tidak valid").optional().or(z.literal('')),
  firebaseUid: z.string().optional(), 
});

type CourierFormInputs = z.infer<typeof courierSchema>;

const bankOptions = [
  "Bank Central Asia (BCA)", "Bank Mandiri", "Bank Rakyat Indonesia (BRI)", "Bank Negara Indonesia (BNI)",
  "Bank CIMB Niaga", "Bank Danamon", "Bank Permata", "Bank Tabungan Negara (BTN)",
  "Bank OCBC NISP", "Bank Panin", "Bank BTPN", "Bank Syariah Indonesia (BSI)", "Lainnya"
];

export default function AdminCouriersPage() {
  const [couriers, setCouriers] = useState<User[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [editingCourier, setEditingCourier] = useState<User | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);

  const { adminSession } = useAuth(); // Get admin session for role-based access
  const { toast } = useToast();

  const { register, handleSubmit, reset, control, formState: { errors }, setValue, watch } = useForm<CourierFormInputs>({
    resolver: zodResolver(courierSchema),
    defaultValues: {
      id: '', fullName: '', password: '', wilayah: '', area: '', workLocation: '',
      joinDate: new Date().toISOString().split('T')[0], jobTitle: 'Mitra Kurir', contractStatus: 'Aktif',
      accountNumber: '', bankName: '', registeredRecipientName: '', avatarUrl: '',
    }
  });

  const canManageCouriers = adminSession?.role === 'master' || adminSession?.role === 'regular';

  const fetchCouriers = useCallback(async () => {
    setIsLoadingData(true);
    if (!db) {
      toast({ variant: "destructive", title: "Error Firestore", description: "Koneksi database tidak tersedia." });
      setIsLoadingData(false);
      return;
    }
    try {
      const usersCollectionRef = collection(db, "users");
      const querySnapshot = await getDocs(usersCollectionRef);
      const fetchedCouriers: User[] = [];
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.id || data.courierId) { 
             fetchedCouriers.push({
                firebaseUid: docSnap.id, 
                ...data,
              } as User);
        }
      });
      setCouriers(fetchedCouriers);
    } catch (error: any) {
      console.error("Gagal mengambil data kurir dari Firestore:", error);
      toast({ variant: "destructive", title: "Error", description: `Gagal mengambil data kurir: ${error.message}` });
    }
    setIsLoadingData(false);
  }, [toast]);

  useEffect(() => {
    setIsMounted(true);
    fetchCouriers();
  }, [fetchCouriers]);


  const onSubmit: SubmitHandler<CourierFormInputs> = async (data) => {
    if (!canManageCouriers) {
      toast({ variant: "destructive", title: "Akses Ditolak", description: "Anda tidak memiliki izin untuk melakukan tindakan ini." });
      return;
    }
    if (!auth || !db) {
      toast({ variant: "destructive", title: "Error Firebase", description: "Layanan otentikasi atau database tidak siap." });
      return;
    }

    const courierEmail = `${data.id}@spxkurir.app`; 

    if (editingCourier) { 
      try {
        const { password, id, ...dataToUpdate } = data; 
        const courierDocRef = doc(db, "users", editingCourier.firebaseUid);
        
        const docSnap = await getDoc(courierDocRef);
        if (!docSnap.exists()) throw new Error("Dokumen kurir tidak ditemukan untuk diedit.");
        const existingData = docSnap.data();

        await updateDoc(courierDocRef, {
            ...existingData, 
            fullName: dataToUpdate.fullName,
            wilayah: dataToUpdate.wilayah,
            area: dataToUpdate.area,
            workLocation: dataToUpdate.workLocation,
            joinDate: dataToUpdate.joinDate,
            jobTitle: dataToUpdate.jobTitle,
            contractStatus: dataToUpdate.contractStatus,
            accountNumber: dataToUpdate.accountNumber,
            bankName: dataToUpdate.bankName,
            registeredRecipientName: dataToUpdate.registeredRecipientName,
            avatarUrl: dataToUpdate.avatarUrl || `https://placehold.co/100x100.png?text=${data.fullName.substring(0,2).toUpperCase()}`,
        });

        toast({ title: "Kurir Diperbarui", description: `Data untuk ${data.fullName} telah diperbarui.` });
        fetchCouriers(); 
      } catch (error: any) {
        console.error("Error saat memperbarui kurir:", error);
        toast({ variant: "destructive", title: "Update Gagal", description: error.message });
      }
    } else { 
      if (!data.password || data.password.length < 6) {
        toast({ variant: "destructive", title: "Password Diperlukan", description: "Password minimal 6 karakter untuk kurir baru."});
        setValue('password', '');
        return;
      }

      const existingCourierWithCustomId = couriers.find(c => c.id === data.id);
      if (existingCourierWithCustomId) {
          toast({ variant: "destructive", title: "Error", description: `ID Kurir Kustom ${data.id} sudah digunakan.` });
          return;
      }

      try {
        const userCredential = await createUserWithEmailAndPassword(auth, courierEmail, data.password);
        const firebaseUid = userCredential.user.uid;
        const { password, ...courierDataForFirestore } = data;
        const finalCourierData = {
          ...courierDataForFirestore,
          firebaseUid, 
          avatarUrl: data.avatarUrl || `https://placehold.co/100x100.png?text=${data.id.substring(0,2).toUpperCase()}`,
        };
        await setDoc(doc(db, "users", firebaseUid), finalCourierData);
        toast({ title: "Kurir Ditambahkan", description: `${data.fullName} (${data.id}) telah ditambahkan dengan akun Firebase.` });
        fetchCouriers(); 
      } catch (error: any) {
        console.error("Error saat menambah kurir baru:", error);
        let userMessage = `Gagal menambahkan kurir: ${error.message}`;
        if (error.code === 'auth/email-already-in-use') {
          userMessage = `Email ${courierEmail} (berdasarkan ID ${data.id}) sudah terdaftar di Firebase Authentication. Gunakan ID Kurir lain.`;
        } else if (error.code === 'auth/weak-password') {
          userMessage = "Password terlalu lemah. Gunakan minimal 6 karakter.";
        }
        toast({ variant: "destructive", title: "Penambahan Gagal", description: userMessage });
      }
    }
    reset();
    setEditingCourier(null);
    setIsFormOpen(false);
    setShowPassword(false);
  };

  const handleEdit = (courier: User) => {
    if (!canManageCouriers) {
      toast({ variant: "destructive", title: "Akses Ditolak", description: "Anda tidak memiliki izin untuk mengedit." });
      return;
    }
    setEditingCourier(courier);
    setShowPassword(false); 
    const defaultEditValues: CourierFormInputs = {
      firebaseUid: courier.firebaseUid,
      id: courier.id, 
      fullName: courier.fullName,
      password: '', 
      wilayah: courier.wilayah,
      area: courier.area,
      workLocation: courier.workLocation,
      joinDate: courier.joinDate,
      jobTitle: courier.jobTitle,
      contractStatus: courier.contractStatus,
      accountNumber: courier.accountNumber,
      bankName: courier.bankName,
      registeredRecipientName: courier.registeredRecipientName,
      avatarUrl: courier.avatarUrl || '',
    };
    reset(defaultEditValues);
    setIsFormOpen(true);
  };

  const handleDelete = async (courier: User) => {
    if (!canManageCouriers) {
      toast({ variant: "destructive", title: "Akses Ditolak", description: "Anda tidak memiliki izin untuk menghapus." });
      return;
    }
    if (!db) {
      toast({ variant: "destructive", title: "Error Firestore", description: "Koneksi database tidak tersedia." });
      return;
    }
    if (window.confirm(`Apakah Anda yakin ingin menghapus data kurir ${courier.fullName} (${courier.id}) dari Firestore? Ini TIDAK akan menghapus akun login Firebase-nya.`)) {
      try {
        await deleteDoc(doc(db, "users", courier.firebaseUid));
        toast({ title: "Data Kurir Dihapus", description: `Data kurir ${courier.fullName} telah dihapus dari Firestore. Akun Firebase Authentication TIDAK terhapus.` });
        fetchCouriers(); 
      } catch (error: any) {
        console.error("Error menghapus data kurir:", error);
        toast({ variant: "destructive", title: "Hapus Gagal", description: error.message });
      }
    }
  };

  const openAddForm = () => {
    if (!canManageCouriers) {
      toast({ variant: "destructive", title: "Akses Ditolak", description: "Anda tidak memiliki izin untuk menambah kurir." });
      return;
    }
    reset({
        id: '', fullName: '', password: '', wilayah: '', area: '', workLocation: '',
        joinDate: new Date().toISOString().split('T')[0], jobTitle: 'Mitra Kurir', contractStatus: 'Aktif',
        accountNumber: '', bankName: '', registeredRecipientName: '', avatarUrl: '', firebaseUid: undefined,
    });
    setEditingCourier(null);
    setShowPassword(true); 
    setIsFormOpen(true);
  };

  if (!isMounted) {
    return <div className="flex justify-center items-center h-screen"><p>Menyiapkan halaman...</p></div>;
  }

  return (
    <div className="space-y-6">
      <Card x-chunk="dashboard-06-chunk-0">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Manajemen Data Kurir</CardTitle>
            <CardDescription>
              {canManageCouriers 
                ? "Tambah, edit, atau hapus data kurir. Penambahan kurir baru akan membuat akun Firebase Authentication."
                : "Lihat data kurir. Hubungi Admin atau MasterAdmin untuk perubahan."}
            </CardDescription>
          </div>
          {canManageCouriers && (
            <Button onClick={openAddForm} size="sm">
              <UserPlus className="mr-2 h-4 w-4" /> Tambah Kurir Baru
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <Alert variant="default" className="mb-4 bg-blue-50 border-blue-200">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertTitle className="text-blue-700">Informasi Penyimpanan Data</AlertTitle>
            <AlertDescription className="text-blue-600">
              Data kurir disimpan di <strong>Cloud Firestore</strong>. 
              {canManageCouriers && " Penambahan kurir baru juga akan membuat akun di <strong>Firebase Authentication</strong>."}
            </AlertDescription>
          </Alert>
          {isLoadingData ? (
             <p>Mengambil data kurir...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID Kurir (Kustom)</TableHead>
                  <TableHead>Nama Lengkap</TableHead>
                  <TableHead>Wilayah</TableHead>
                  <TableHead>Area</TableHead>
                  <TableHead>Lokasi Kerja</TableHead>
                  <TableHead>Status Kontrak</TableHead>
                  {canManageCouriers && <TableHead className="text-right">Aksi</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {couriers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={canManageCouriers ? 7 : 6} className="text-center">Tidak ada data kurir.</TableCell>
                  </TableRow>
                ) : (
                  couriers.map((courier) => (
                    <TableRow key={courier.firebaseUid}>
                      <TableCell className="font-code">{courier.id}</TableCell>
                      <TableCell>{courier.fullName}</TableCell>
                      <TableCell>{courier.wilayah || '-'}</TableCell>
                      <TableCell>{courier.area || '-'}</TableCell>
                      <TableCell>{courier.workLocation}</TableCell>
                      <TableCell>{courier.contractStatus}</TableCell>
                      {canManageCouriers && (
                        <TableCell className="text-right space-x-2">
                          <Button variant="outline" size="sm" onClick={() => handleEdit(courier)}>
                            <Edit className="mr-1 h-3 w-3" /> Edit Detail
                          </Button>
                          <Button variant="destructive" size="sm" onClick={() => handleDelete(courier)}>
                            <Trash2 className="mr-1 h-3 w-3" /> Hapus Data
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {canManageCouriers && (
        <Dialog open={isFormOpen} onOpenChange={(isOpen) => {
            setIsFormOpen(isOpen);
            if (!isOpen) {
              reset();
              setEditingCourier(null);
              setShowPassword(false);
            }
        }}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingCourier ? 'Edit Detail Kurir' : 'Tambah Kurir Baru & Akun Firebase'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="id">ID Mitra Kurir (Kustom)</Label>
                  <Input id="id" {...register('id')} disabled={!!editingCourier} placeholder="Contoh: KURIR001" />
                  {errors.id && <p className="text-sm text-destructive mt-1">{errors.id.message}</p>}
                  {!editingCourier && <p className="text-xs text-muted-foreground mt-1">ID ini akan digunakan untuk email login: ID@spxkurir.app</p>}
                  {!!editingCourier && <p className="text-xs text-muted-foreground mt-1">ID Kustom tidak dapat diubah.</p>}
                </div>
                <div>
                  <Label htmlFor="fullName">Nama Lengkap</Label>
                  <Input id="fullName" {...register('fullName')} />
                  {errors.fullName && <p className="text-sm text-destructive mt-1">{errors.fullName.message}</p>}
                </div>

                {(!editingCourier || showPassword) && ( 
                  <div>
                    <Label htmlFor="password">Password Awal</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        {...register('password')}
                        placeholder={"Minimal 6 karakter"}
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute inset-y-0 right-0 h-full px-3 flex items-center text-muted-foreground hover:text-foreground"
                        onClick={() => setShowPassword((prev) => !prev)}
                        aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                    {errors.password && <p className="text-sm text-destructive mt-1">{errors.password.message}</p>}
                    {!editingCourier && <p className="text-xs text-muted-foreground mt-1">Password ini akan digunakan untuk login awal kurir.</p>}
                  </div>
                )}
                {editingCourier && (
                  <Alert variant="default" className="md:col-span-2 bg-yellow-50 border-yellow-200">
                      <AlertTriangle className="h-4 w-4 text-yellow-600" />
                      <AlertTitle className="text-yellow-700">Info Password</AlertTitle>
                      <AlertDescription className="text-yellow-600">
                        Pengubahan password akun login Firebase tidak dilakukan dari form ini.
                        Admin dapat mereset password melalui Firebase Console jika diperlukan.
                      </AlertDescription>
                    </Alert>
                )}

                <div>
                  <Label htmlFor="wilayah">Wilayah</Label>
                  <Input id="wilayah" {...register('wilayah')} />
                  {errors.wilayah && <p className="text-sm text-destructive mt-1">{errors.wilayah.message}</p>}
                </div>
                <div>
                  <Label htmlFor="area">Area</Label>
                  <Input id="area" {...register('area')} />
                  {errors.area && <p className="text-sm text-destructive mt-1">{errors.area.message}</p>}
                </div>
                <div>
                  <Label htmlFor="workLocation">Lokasi Kerja (HUB)</Label>
                  <Input id="workLocation" {...register('workLocation')} />
                  {errors.workLocation && <p className="text-sm text-destructive mt-1">{errors.workLocation.message}</p>}
                </div>
                <div>
                  <Label htmlFor="joinDate">Tanggal Join</Label>
                  <Input id="joinDate" type="date" {...register('joinDate')} />
                  {errors.joinDate && <p className="text-sm text-destructive mt-1">{errors.joinDate.message}</p>}
                </div>
                <div>
                  <Label htmlFor="jobTitle">Jabatan</Label>
                  <Input id="jobTitle" {...register('jobTitle')} defaultValue="Mitra Kurir" />
                  {errors.jobTitle && <p className="text-sm text-destructive mt-1">{errors.jobTitle.message}</p>}
                </div>
                <div>
                  <Label htmlFor="contractStatus">Status Kontrak</Label>
                  <Controller
                    name="contractStatus"
                    control={control}
                    defaultValue="Aktif"
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value} >
                        <SelectTrigger id="contractStatus"><SelectValue placeholder="Pilih status kontrak" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Aktif">Aktif</SelectItem>
                          <SelectItem value="Non-Aktif">Non-Aktif</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.contractStatus && <p className="text-sm text-destructive mt-1">{errors.contractStatus.message}</p>}
                </div>
                <div>
                  <Label htmlFor="avatarUrl">URL Foto Profil (Opsional)</Label>
                  <Input id="avatarUrl" {...register('avatarUrl')} placeholder="https://example.com/avatar.png" />
                  {errors.avatarUrl && <p className="text-sm text-destructive mt-1">{errors.avatarUrl.message}</p>}
                </div>
              </div>
              <h3 className="text-md font-semibold pt-2 border-t mt-4">Informasi Bank</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="accountNumber">Nomor Rekening</Label>
                  <Input id="accountNumber" {...register('accountNumber')} />
                  {errors.accountNumber && <p className="text-sm text-destructive mt-1">{errors.accountNumber.message}</p>}
                </div>
                <div>
                  <Label htmlFor="bankName">Nama Bank</Label>
                  <Controller
                    name="bankName"
                    control={control}
                    defaultValue=""
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value} >
                        <SelectTrigger id="bankName"><SelectValue placeholder="Pilih nama bank" /></SelectTrigger>
                        <SelectContent>{bankOptions.map(bank => (<SelectItem key={bank} value={bank}>{bank}</SelectItem>))}</SelectContent>
                      </Select>
                    )}
                  />
                  {errors.bankName && <p className="text-sm text-destructive mt-1">{errors.bankName.message}</p>}
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="registeredRecipientName">Nama Penerima Terdaftar (di Rekening)</Label>
                  <Input id="registeredRecipientName" {...register('registeredRecipientName')} />
                  {errors.registeredRecipientName && <p className="text-sm text-destructive mt-1">{errors.registeredRecipientName.message}</p>}
                </div>
              </div>
              <DialogFooter className="pt-4">
                <DialogClose asChild>
                  <Button type="button" variant="outline" onClick={() => { setIsFormOpen(false); reset(); setEditingCourier(null); setShowPassword(false); }}>Batal</Button>
                </DialogClose>
                <Button type="submit">{editingCourier ? 'Simpan Perubahan Detail' : 'Tambah Kurir & Buat Akun'}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

