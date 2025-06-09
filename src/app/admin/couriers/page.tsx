
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
import type { User, AdminSession, CourierUpdateRequest, UserCreationRequest } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { PlusCircle, Edit, Trash2, UserPlus, Info, Eye, EyeOff, AlertTriangle, Send } from 'lucide-react';
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
import { doc, setDoc, getDoc, deleteDoc, collection, getDocs, serverTimestamp, updateDoc, addDoc } from 'firebase/firestore';

const courierSchema = z.object({
  id: z.string().min(3, "ID Kustom Kurir/PIC minimal 3 karakter").regex(/^[a-zA-Z0-9_.-]*$/, "ID Kustom hanya boleh berisi huruf, angka, _, ., -"),
  fullName: z.string().min(3, "Nama lengkap minimal 3 karakter"),
  password: z.string().min(6, "Password minimal 6 karakter").optional(), // Optional karena admin bisa jadi tidak mengubahnya atau tidak membuatnya langsung
  wilayah: z.string().min(3, "Wilayah minimal 3 karakter"),
  area: z.string().min(3, "Area minimal 3 karakter"),
  workLocation: z.string().min(3, "Lokasi kerja minimal 3 karakter"),
  joinDate: z.string().min(1, "Tanggal join tidak boleh kosong"),
  jobTitle: z.string().min(1, "Jabatan tidak boleh kosong"), // Bisa 'Mitra Kurir' atau 'PIC'
  contractStatus: z.string().min(1, "Status kontrak tidak boleh kosong"),
  accountNumber: z.string().min(1, "Nomor rekening tidak boleh kosong").regex(/^[0-9]*$/, "Nomor rekening hanya boleh angka"),
  bankName: z.string().min(1, "Nama bank tidak boleh kosong"),
  registeredRecipientName: z.string().min(1, "Nama penerima terdaftar tidak boleh kosong"),
  avatarUrl: z.string().url("URL Avatar tidak valid").optional().or(z.literal('')),
  firebaseUid: z.string().optional(), // firebaseUid ada jika kurir sudah ada
});

type CourierFormInputs = z.infer<typeof courierSchema>;

const bankOptions = [
  "Bank Central Asia (BCA)", "Bank Mandiri", "Bank Rakyat Indonesia (BRI)", "Bank Negara Indonesia (BNI)",
  "Bank CIMB Niaga", "Bank Danamon", "Bank Permata", "Bank Tabungan Negara (BTN)",
  "Bank OCBC NISP", "Bank Panin", "Bank BTPN", "Bank Syariah Indonesia (BSI)", "Lainnya"
];

const jobTitleOptions = ["Mitra Kurir", "PIC"]; // Jabatan yang bisa ditambahkan oleh Admin

export default function AdminCouriersPage() {
  const [couriers, setCouriers] = useState<User[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [editingCourier, setEditingCourier] = useState<User | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);

  const { adminSession } = useAuth();
  const { toast } = useToast();

  const { register, handleSubmit, reset, control, formState: { errors }, setValue, watch } = useForm<CourierFormInputs>({
    resolver: zodResolver(courierSchema),
    defaultValues: {
      id: '', fullName: '', password: '', wilayah: '', area: '', workLocation: '',
      joinDate: new Date().toISOString().split('T')[0], jobTitle: 'Mitra Kurir', contractStatus: 'Aktif',
      accountNumber: '', bankName: '', registeredRecipientName: '', avatarUrl: '',
    }
  });

  const isMasterAdmin = adminSession?.role === 'master';
  const isRegularAdmin = adminSession?.role === 'regular';
  const isPIC = adminSession?.role === 'pic';


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
        if (data.id && data.jobTitle) {
             fetchedCouriers.push({
                firebaseUid: docSnap.id, 
                ...data,
              } as User);
        }
      });
      setCouriers(fetchedCouriers.filter(c => c.jobTitle === 'Mitra Kurir' || c.jobTitle === 'PIC'));
    } catch (error: any) {
      console.error("Gagal mengambil data kurir/PIC dari Firestore:", error);
      toast({ variant: "destructive", title: "Error", description: `Gagal mengambil data: ${error.message}` });
    }
    setIsLoadingData(false);
  }, [toast]);

  useEffect(() => {
    setIsMounted(true);
    fetchCouriers();
  }, [fetchCouriers]);


  const onSubmit: SubmitHandler<CourierFormInputs> = async (data) => {
    if (!adminSession) {
        toast({ variant: "destructive", title: "Error", description: "Sesi admin tidak ditemukan." });
        return;
    }

    if (!auth || !db) {
      toast({ variant: "destructive", title: "Error Firebase", description: "Layanan otentikasi atau database tidak siap." });
      return;
    }

    if (editingCourier) { 
      const { password, id: customId, firebaseUid, ...changes } = data; 
      
      const requestedChanges: Partial<Omit<User, 'firebaseUid' | 'password' | 'id'>> = {};
      Object.keys(changes).forEach(keyStr => {
        const key = keyStr as keyof typeof changes;
        if (changes[key] !== editingCourier[key as keyof User]) { 
          (requestedChanges as any)[key] = changes[key];
        }
      });
      
      if (Object.keys(requestedChanges).length === 0) {
        toast({ title: "Tidak Ada Perubahan", description: "Tidak ada data yang diubah." });
        setIsFormOpen(false);
        reset();
        setEditingCourier(null);
        return;
      }

      if (isMasterAdmin) { 
        try {
          if (!editingCourier.firebaseUid) throw new Error("Firebase UID kurir tidak ditemukan untuk diedit.");
          const courierDocRef = doc(db, "users", editingCourier.firebaseUid);
          await updateDoc(courierDocRef, requestedChanges);
          toast({ title: "Data Diperbarui", description: `Data untuk ${editingCourier.fullName} telah diperbarui oleh MasterAdmin.` });
          fetchCouriers();
        } catch (error: any) {
          console.error("Error saat MasterAdmin memperbarui data:", error);
          toast({ variant: "destructive", title: "Update Gagal", description: error.message });
        }
      } else if (isRegularAdmin) { 
        try {
          if (!editingCourier.firebaseUid) throw new Error("Firebase UID kurir tidak ditemukan untuk permintaan update.");
          const updateRequest: CourierUpdateRequest = {
            courierFirebaseUid: editingCourier.firebaseUid,
            courierId: editingCourier.id, 
            courierFullName: editingCourier.fullName,
            requestedChanges,
            requestorFirebaseUid: adminSession.firebaseUid,
            requestorId: adminSession.id, 
            status: 'pending',
            requestedAt: Date.now(),
          };
          const requestsCollectionRef = collection(db, "courierUpdateRequests");
          await addDoc(requestsCollectionRef, updateRequest);
          toast({ title: "Permintaan Update Terkirim", description: `Permintaan update data ${editingCourier.fullName} menunggu persetujuan MasterAdmin.` });
        } catch (error: any) {
          console.error("Error saat mengirim permintaan update:", error);
          toast({ variant: "destructive", title: "Permintaan Update Gagal", description: error.message });
        }
      }
    } else { 
      if (!data.password || data.password.length < 6) {
        toast({ variant: "destructive", title: "Password Diperlukan", description: "Password minimal 6 karakter untuk pengguna baru."});
        setValue('password', ''); 
        return;
      }
      const existingUserWithCustomId = couriers.find(c => c.id === data.id);
      if (existingUserWithCustomId) {
          toast({ variant: "destructive", title: "Error", description: `ID Kustom ${data.id} sudah digunakan.` });
          return;
      }
      const { firebaseUid, ...userDataForRequest } = data; 

      if (isMasterAdmin) { 
        const userEmail = `${data.id}@spxkurir.app`;
        try {
          const userCredential = await createUserWithEmailAndPassword(auth, userEmail, data.password!);
          const newFirebaseUid = userCredential.user.uid;
          const { password, ...courierDataForFirestore } = userDataForRequest; 
          const finalUserData: Omit<User, 'firebaseUid'> & { firebaseUid: string } = {
            ...courierDataForFirestore,
            firebaseUid: newFirebaseUid, 
            avatarUrl: data.avatarUrl || `https://placehold.co/100x100.png?text=${data.id.substring(0,2).toUpperCase()}`,
          };
          await setDoc(doc(db, "users", newFirebaseUid), finalUserData);
          toast({ title: "Pengguna Ditambahkan", description: `${data.fullName} (${data.id}) telah ditambahkan dengan akun Firebase.` });
          fetchCouriers();
        } catch (error: any)
        {
          console.error("Error saat MasterAdmin menambah pengguna baru:", error);
          let userMessage = `Gagal menambahkan pengguna: ${error.message}`;
          if (error.code === 'auth/email-already-in-use') {
            userMessage = `Email ${userEmail} (berdasarkan ID ${data.id}) sudah terdaftar di Firebase. Gunakan ID Kustom lain.`;
          } else if (error.code === 'auth/weak-password') {
            userMessage = `Password terlalu lemah. Gunakan minimal 6 karakter.`;
          }
          toast({ variant: "destructive", title: "Penambahan Gagal", description: userMessage });
        }
      } else if (isRegularAdmin) { 
         try {
            const creationRequest: UserCreationRequest = {
              requestedUserData: { ...userDataForRequest, password: data.password }, 
              requestorFirebaseUid: adminSession.firebaseUid,
              requestorId: adminSession.id, 
              status: 'pending',
              requestedAt: Date.now(),
            };
            const requestsCollectionRef = collection(db, "userCreationRequests");
            await addDoc(requestsCollectionRef, creationRequest);
            toast({ title: "Permintaan Pengguna Baru Terkirim", description: `Penambahan ${data.fullName} (${data.id}) menunggu persetujuan MasterAdmin.` });
         } catch (error: any) {
            console.error("Error saat mengirim permintaan penambahan pengguna:", error);
            toast({ variant: "destructive", title: "Permintaan Gagal", description: error.message });
         }
      }
    }
    reset();
    setEditingCourier(null);
    setIsFormOpen(false);
    setShowPassword(false);
  };

  const handleEdit = (courier: User) => {
    if (isPIC) {
        toast({variant: "destructive", title: "Akses Terbatas", description: "PIC hanya memiliki akses lihat."});
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
    if (!isMasterAdmin) { 
      toast({ variant: "destructive", title: "Akses Ditolak", description: "Hanya MasterAdmin yang dapat menghapus data pengguna." });
      return;
    }
    if (!db) {
      toast({ variant: "destructive", title: "Error Firestore", description: "Koneksi database tidak tersedia." });
      return;
    }
    if (window.confirm(`MasterAdmin: Apakah Anda yakin ingin menghapus data ${courier.fullName} (${courier.id}) dari Firestore? Ini TIDAK akan menghapus akun login Firebase-nya.`)) {
      try {
        if (!courier.firebaseUid) throw new Error("Firebase UID pengguna tidak ditemukan untuk dihapus.");
        await deleteDoc(doc(db, "users", courier.firebaseUid));
        toast({ title: "Data Pengguna Dihapus", description: `Data ${courier.fullName} telah dihapus dari Firestore. Akun Firebase Authentication TIDAK terhapus.` });
        fetchCouriers();
      } catch (error: any) {
        console.error("Error menghapus data pengguna:", error);
        toast({ variant: "destructive", title: "Hapus Gagal", description: error.message });
      }
    }
  };

  const openAddForm = () => {
    if (isPIC) {
        toast({variant: "destructive", title: "Akses Terbatas", description: "PIC hanya memiliki akses lihat."});
        return;
    }
    if (!isMasterAdmin && !isRegularAdmin) {
        toast({ variant: "destructive", title: "Akses Ditolak", description: "Anda tidak memiliki izin untuk menambah pengguna." });
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
            <CardTitle>Manajemen Data Kurir & PIC</CardTitle>
            <CardDescription>
              {isMasterAdmin && "Tambah, edit, atau hapus data kurir/PIC. Penambahan akan membuat akun Firebase."}
              {isRegularAdmin && "Ajukan penambahan pengguna baru atau perubahan data untuk persetujuan MasterAdmin."}
              {isPIC && "Lihat data kurir dan PIC. Hubungi Admin untuk perubahan."}
            </CardDescription>
          </div>
          {(isMasterAdmin || isRegularAdmin) && (
            <Button onClick={openAddForm} size="sm" disabled={isPIC}>
              <UserPlus className="mr-2 h-4 w-4" /> {isMasterAdmin ? 'Tambah Pengguna' : 'Ajukan Pengguna Baru'}
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <Alert variant="default" className="mb-4 bg-blue-50 border-blue-200">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertTitle className="text-blue-700">Informasi Alur Kerja</AlertTitle>
            <AlertDescription className="text-blue-600 space-y-1">
              {isMasterAdmin && <p>MasterAdmin: Penambahan & perubahan data langsung diterapkan.</p>}
              {isRegularAdmin && <p>Admin: Penambahan pengguna baru atau pengubahan data akan dikirim sebagai permintaan persetujuan kepada MasterAdmin. Cek status di menu "Permintaan Saya".</p>}
              {isPIC && <p>PIC: Anda memiliki akses lihat saja untuk data pengguna.</p>}
            </AlertDescription>
          </Alert>
          {isLoadingData ? (
             <p>Mengambil data pengguna...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID Kustom</TableHead>
                  <TableHead>Nama Lengkap</TableHead>
                  <TableHead>Jabatan</TableHead>
                  <TableHead>Wilayah</TableHead>
                  <TableHead>Area</TableHead>
                  <TableHead>Lokasi Kerja</TableHead>
                  <TableHead>Status Kontrak</TableHead>
                  {(!isPIC) && <TableHead className="text-right">Aksi</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {couriers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={isPIC ? 7 : 8} className="text-center">Tidak ada data pengguna (Kurir/PIC).</TableCell>
                  </TableRow>
                ) : (
                  couriers.map((courier) => (
                    <TableRow key={courier.firebaseUid}>
                      <TableCell className="font-code">{courier.id}</TableCell>
                      <TableCell>{courier.fullName}</TableCell>
                      <TableCell><Badge variant={courier.jobTitle === 'PIC' ? "secondary" : "outline"}>{courier.jobTitle}</Badge></TableCell>
                      <TableCell>{courier.wilayah || '-'}</TableCell>
                      <TableCell>{courier.area || '-'}</TableCell>
                      <TableCell>{courier.workLocation}</TableCell>
                      <TableCell><Badge variant={courier.contractStatus === 'Aktif' ? "default" : "destructive"}>{courier.contractStatus}</Badge></TableCell>
                      {(!isPIC) && (
                        <TableCell className="text-right space-x-2">
                          <Button variant="outline" size="sm" onClick={() => handleEdit(courier)} disabled={isPIC}>
                            <Edit className="mr-1 h-3 w-3" /> {isMasterAdmin ? 'Edit Langsung' : 'Ajukan Edit'}
                          </Button>
                          {isMasterAdmin && (
                            <Button variant="destructive" size="sm" onClick={() => handleDelete(courier)}>
                              <Trash2 className="mr-1 h-3 w-3" /> Hapus
                            </Button>
                          )}
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

      {(!isPIC) && (
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
              <DialogTitle>
                {editingCourier
                  ? (isMasterAdmin ? 'Edit Detail Pengguna' : 'Ajukan Perubahan Detail Pengguna')
                  : (isMasterAdmin ? 'Tambah Pengguna Baru & Akun Firebase' : 'Ajukan Penambahan Pengguna Baru')}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="id">ID Kustom Pengguna (Kurir/PIC)</Label>
                  <Input id="id" {...register('id')} disabled={!!editingCourier} placeholder="Contoh: KURIR001 atau PICJBR01" />
                  {errors.id && <p className="text-sm text-destructive mt-1">{errors.id.message}</p>}
                  {!editingCourier && isMasterAdmin && <p className="text-xs text-muted-foreground mt-1">ID ini akan digunakan untuk email login: ID@spxkurir.app</p>}
                  {!!editingCourier && <p className="text-xs text-muted-foreground mt-1">ID Kustom tidak dapat diubah setelah dibuat.</p>}
                </div>
                <div>
                  <Label htmlFor="fullName">Nama Lengkap</Label>
                  <Input id="fullName" {...register('fullName')} />
                  {errors.fullName && <p className="text-sm text-destructive mt-1">{errors.fullName.message}</p>}
                </div>

                {(!editingCourier || (editingCourier && isRegularAdmin)) && ( 
                  <div>
                    <Label htmlFor="password">
                        {!editingCourier ? "Password Awal" : (isRegularAdmin ? "Password (Tidak Diubah)" : "Password Awal")}
                    </Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        {...register('password')}
                        placeholder={!editingCourier ? "Minimal 6 karakter" : (isRegularAdmin ? "Tidak diubah oleh Admin Reguler" : "")}
                        className="pr-10"
                        disabled={!!editingCourier && isRegularAdmin} 
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute inset-y-0 right-0 h-full px-3 flex items-center text-muted-foreground hover:text-foreground"
                        onClick={() => setShowPassword((prev) => !prev)}
                        aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                        tabIndex={-1}
                        disabled={!!editingCourier && isRegularAdmin}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                    {errors.password && <p className="text-sm text-destructive mt-1">{errors.password.message}</p>}
                    {!editingCourier && isMasterAdmin && <p className="text-xs text-muted-foreground mt-1">Password ini akan digunakan untuk login awal pengguna.</p>}
                    {!editingCourier && isRegularAdmin && <p className="text-xs text-muted-foreground mt-1">MasterAdmin akan membuat akun dengan password ini jika disetujui.</p>}
                  </div>
                )}
                {editingCourier && isMasterAdmin && (
                  <Alert variant="default" className="md:col-span-2 bg-yellow-50 border-yellow-200">
                      <AlertTriangle className="h-4 w-4 text-yellow-600" />
                      <AlertTitle className="text-yellow-700">Info Password</AlertTitle>
                      <AlertDescription className="text-yellow-600">
                        Password akun login Firebase tidak diubah dari form ini. MasterAdmin dapat meresetnya via Firebase Console jika diperlukan.
                      </AlertDescription>
                  </Alert>
                )}
                <div>
                  <Label htmlFor="jobTitle">Jabatan</Label>
                   <Controller
                    name="jobTitle"
                    control={control}
                    defaultValue="Mitra Kurir"
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value} >
                        <SelectTrigger id="jobTitle"><SelectValue placeholder="Pilih jabatan" /></SelectTrigger>
                        <SelectContent>{jobTitleOptions.map(title => (<SelectItem key={title} value={title}>{title}</SelectItem>))}</SelectContent>
                      </Select>
                    )}
                  />
                  {errors.jobTitle && <p className="text-sm text-destructive mt-1">{errors.jobTitle.message}</p>}
                </div>
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
                   {!editingCourier && <p className="text-xs text-muted-foreground mt-1">Jika kosong, akan menggunakan placeholder.</p>}
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
                <Button type="submit">
                    <Send className="mr-2 h-4 w-4"/>
                    {editingCourier
                      ? (isMasterAdmin ? 'Simpan Perubahan' : 'Kirim Permintaan Perubahan')
                      : (isMasterAdmin ? 'Tambah Pengguna' : 'Kirim Permintaan Penambahan')}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

