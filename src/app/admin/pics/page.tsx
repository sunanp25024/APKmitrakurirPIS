
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
import type { User, AdminSession, CourierUpdateRequest, UserCreationRequest } from '@/types'; // CourierUpdate still relevant for structure
import { useAuth } from '@/contexts/AuthContext';
import { PlusCircle, Edit, Trash2, UserPlus, Info, Eye, EyeOff, AlertTriangle, Send, UserCheck } from 'lucide-react';
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
import { useRouter } from 'next/navigation';


// Schema for PIC user, similar to courier but jobTitle is fixed
const picUserSchema = z.object({
  id: z.string().min(3, "ID Kustom PIC minimal 3 karakter").regex(/^[a-zA-Z0-9_.-]*$/, "ID Kustom hanya boleh berisi huruf, angka, _, ., -"),
  fullName: z.string().min(3, "Nama lengkap minimal 3 karakter"),
  password: z.string().min(6, "Password minimal 6 karakter").optional(),
  wilayah: z.string().min(3, "Wilayah minimal 3 karakter"),
  area: z.string().min(3, "Area minimal 3 karakter"),
  workLocation: z.string().min(3, "Lokasi kerja minimal 3 karakter"),
  joinDate: z.string().min(1, "Tanggal join tidak boleh kosong"),
  // jobTitle is fixed to 'PIC'
  contractStatus: z.string().min(1, "Status kontrak tidak boleh kosong"),
  accountNumber: z.string().min(1, "Nomor rekening tidak boleh kosong").regex(/^[0-9]*$/, "Nomor rekening hanya boleh angka"),
  bankName: z.string().min(1, "Nama bank tidak boleh kosong"),
  registeredRecipientName: z.string().min(1, "Nama penerima terdaftar tidak boleh kosong"),
  avatarUrl: z.string().url("URL Avatar tidak valid").optional().or(z.literal('')),
  firebaseUid: z.string().optional(),
});

type PicFormInputs = Omit<z.infer<typeof picUserSchema>, 'jobTitle'>;

const bankOptions = [
  "Bank Central Asia (BCA)", "Bank Mandiri", "Bank Rakyat Indonesia (BRI)", "Bank Negara Indonesia (BNI)",
  "Bank CIMB Niaga", "Bank Danamon", "Bank Permata", "Bank Tabungan Negara (BTN)",
  "Bank OCBC NISP", "Bank Panin", "Bank BTPN", "Bank Syariah Indonesia (BSI)", "Lainnya"
];

const FIXED_JOB_TITLE = 'PIC';

export default function AdminPicsPage() {
  const [pics, setPics] = useState<User[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [editingPic, setEditingPic] = useState<User | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);

  const { adminSession, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const { register, handleSubmit, reset, control, formState: { errors }, setValue, watch } = useForm<PicFormInputs>({
    resolver: zodResolver(picUserSchema.omit({ jobTitle: true })),
    defaultValues: {
      id: '', fullName: '', password: '', wilayah: '', area: '', workLocation: '',
      joinDate: new Date().toISOString().split('T')[0], contractStatus: 'Aktif',
      accountNumber: '', bankName: '', registeredRecipientName: '', avatarUrl: '',
    }
  });

  const isMasterAdmin = adminSession?.role === 'master';
  const isRegularAdmin = adminSession?.role === 'regular';

  // Redirect if user is a PIC trying to access this page
  useEffect(() => {
    if (!authLoading && adminSession?.role === 'pic') {
      toast({ variant: "destructive", title: "Akses Ditolak", description: "Anda tidak memiliki izin untuk mengakses halaman ini." });
      router.push('/admin/reports');
    }
  }, [adminSession, authLoading, router, toast]);


  const fetchAllUsers = useCallback(async () => {
    if (adminSession?.role === 'pic') return; // PIC should not fetch this
    setIsLoadingData(true);
    if (!db) {
      toast({ variant: "destructive", title: "Error Firestore", description: "Koneksi database tidak tersedia." });
      setIsLoadingData(false);
      return;
    }
    try {
      const usersCollectionRef = collection(db, "users");
      const querySnapshot = await getDocs(usersCollectionRef);
      const fetchedUsers: User[] = [];
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.id && data.jobTitle) {
             fetchedUsers.push({
                firebaseUid: docSnap.id, 
                ...data,
              } as User);
        }
      });
      setPics(fetchedUsers.filter(u => u.jobTitle === FIXED_JOB_TITLE)); // Filter for PICs only
    } catch (error: any) {
      console.error("Gagal mengambil data PIC dari Firestore:", error);
      toast({ variant: "destructive", title: "Error", description: `Gagal mengambil data: ${error.message}` });
    }
    setIsLoadingData(false);
  }, [toast, adminSession?.role]);

  useEffect(() => {
    setIsMounted(true);
    if (adminSession && adminSession.role !== 'pic') {
      fetchAllUsers();
    } else if (adminSession === null && !authLoading) {
      // If no admin session and not loading, means user might be logged out or not admin
      // Handled by layout redirect
    } else if (adminSession?.role === 'pic') {
        setIsLoadingData(false); // PIC doesn't load data here
    }
  }, [fetchAllUsers, adminSession, authLoading]);


  const onSubmit: SubmitHandler<PicFormInputs> = async (dataFromForm) => {
    if (!adminSession || adminSession.role === 'pic') { // PIC cannot submit
        toast({ variant: "destructive", title: "Error", description: "Sesi admin tidak ditemukan atau tidak diizinkan." });
        return;
    }

    if (!auth || !db) {
      toast({ variant: "destructive", title: "Error Firebase", description: "Layanan otentikasi atau database tidak siap." });
      return;
    }

    const data = { ...dataFromForm, jobTitle: FIXED_JOB_TITLE };

    if (editingPic) { 
      const { password, id: customId, firebaseUid, ...changes } = data; 
      
      const requestedChanges: Partial<Omit<User, 'firebaseUid' | 'password' | 'id'>> = {};
      Object.keys(changes).forEach(keyStr => {
        const key = keyStr as keyof typeof changes;
        if (changes[key] !== editingPic[key as keyof User]) { 
          (requestedChanges as any)[key] = changes[key];
        }
      });
      
      if (Object.keys(requestedChanges).length === 0) {
        toast({ title: "Tidak Ada Perubahan", description: "Tidak ada data yang diubah." });
        setIsFormOpen(false);
        reset();
        setEditingPic(null);
        return;
      }

      if (isMasterAdmin) { 
        try {
          if (!editingPic.firebaseUid) throw new Error("Firebase UID PIC tidak ditemukan untuk diedit.");
          const picDocRef = doc(db, "users", editingPic.firebaseUid);
          await updateDoc(picDocRef, requestedChanges);
          toast({ title: "Data PIC Diperbarui", description: `Data untuk ${editingPic.fullName} telah diperbarui oleh MasterAdmin.` });
          fetchAllUsers();
        } catch (error: any) {
          console.error("Error saat MasterAdmin memperbarui data PIC:", error);
          toast({ variant: "destructive", title: "Update Gagal", description: error.message });
        }
      } else if (isRegularAdmin) { 
        try {
          if (!editingPic.firebaseUid) throw new Error("Firebase UID PIC tidak ditemukan untuk permintaan update.");
          // Using CourierUpdateRequest type but context is PIC
          const updateRequest: CourierUpdateRequest = {
            courierFirebaseUid: editingPic.firebaseUid,
            courierId: editingPic.id, 
            courierFullName: editingPic.fullName,
            requestedChanges,
            requestorFirebaseUid: adminSession.firebaseUid,
            requestorId: adminSession.id, 
            status: 'pending',
            requestedAt: Date.now(),
          };
          const requestsCollectionRef = collection(db, "courierUpdateRequests");
          await addDoc(requestsCollectionRef, updateRequest);
          toast({ title: "Permintaan Update PIC Terkirim", description: `Permintaan update data ${editingPic.fullName} menunggu persetujuan MasterAdmin.` });
        } catch (error: any) {
          console.error("Error saat mengirim permintaan update PIC:", error);
          toast({ variant: "destructive", title: "Permintaan Update Gagal", description: error.message });
        }
      }
    } else { 
      if (!data.password || data.password.length < 6) {
        toast({ variant: "destructive", title: "Password Diperlukan", description: "Password minimal 6 karakter untuk PIC baru."});
        setValue('password', ''); 
        return;
      }
      const allUsersSnapshot = await getDocs(collection(db, "users"));
      const existingUserWithCustomId = allUsersSnapshot.docs.find(docSnap => docSnap.data().id === data.id);
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
          const { password, ...picDataForFirestore } = userDataForRequest; 
          const finalUserData: Omit<User, 'firebaseUid'> & { firebaseUid: string } = {
            ...picDataForFirestore,
            jobTitle: FIXED_JOB_TITLE,
            firebaseUid: newFirebaseUid, 
            avatarUrl: data.avatarUrl || `https://placehold.co/100x100.png?text=${data.id.substring(0,2).toUpperCase()}`,
          };
          await setDoc(doc(db, "users", newFirebaseUid), finalUserData);
          toast({ title: "PIC Ditambahkan", description: `${data.fullName} (${data.id}) telah ditambahkan dengan akun Firebase.` });
          fetchAllUsers();
        } catch (error: any)
        {
          console.error("Error saat MasterAdmin menambah PIC baru:", error);
          let userMessage = `Gagal menambahkan PIC: ${error.message}`;
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
              requestedUserData: { ...userDataForRequest, jobTitle: FIXED_JOB_TITLE, password: data.password }, 
              requestorFirebaseUid: adminSession.firebaseUid,
              requestorId: adminSession.id, 
              status: 'pending',
              requestedAt: Date.now(),
            };
            const requestsCollectionRef = collection(db, "userCreationRequests");
            await addDoc(requestsCollectionRef, creationRequest);
            toast({ title: "Permintaan PIC Baru Terkirim", description: `Penambahan ${data.fullName} (${data.id}) menunggu persetujuan MasterAdmin.` });
         } catch (error: any) {
            console.error("Error saat mengirim permintaan penambahan PIC:", error);
            toast({ variant: "destructive", title: "Permintaan Gagal", description: error.message });
         }
      }
    }
    reset();
    setEditingPic(null);
    setIsFormOpen(false);
    setShowPassword(false);
  };

  const handleEdit = (pic: User) => {
    // PICs cannot edit, this page isn't for them anyway
    setEditingPic(pic);
    setShowPassword(false);
    const defaultEditValues: PicFormInputs = {
      id: pic.id,
      fullName: pic.fullName,
      password: '', 
      wilayah: pic.wilayah,
      area: pic.area,
      workLocation: pic.workLocation,
      joinDate: pic.joinDate,
      contractStatus: pic.contractStatus,
      accountNumber: pic.accountNumber,
      bankName: pic.bankName,
      registeredRecipientName: pic.registeredRecipientName,
      avatarUrl: pic.avatarUrl || '',
    };
    reset(defaultEditValues);
    setValue('firebaseUid', pic.firebaseUid);
    setIsFormOpen(true);
  };

  const handleDelete = async (pic: User) => {
    if (!isMasterAdmin) { 
      toast({ variant: "destructive", title: "Akses Ditolak", description: "Hanya MasterAdmin yang dapat menghapus data PIC." });
      return;
    }
    if (!db) {
      toast({ variant: "destructive", title: "Error Firestore", description: "Koneksi database tidak tersedia." });
      return;
    }
    if (window.confirm(`MasterAdmin: Apakah Anda yakin ingin menghapus data PIC ${pic.fullName} (${pic.id}) dari Firestore? Ini TIDAK akan menghapus akun login Firebase-nya.`)) {
      try {
        if (!pic.firebaseUid) throw new Error("Firebase UID PIC tidak ditemukan untuk dihapus.");
        await deleteDoc(doc(db, "users", pic.firebaseUid));
        toast({ title: "Data PIC Dihapus", description: `Data ${pic.fullName} telah dihapus dari Firestore. Akun Firebase Authentication TIDAK terhapus.` });
        fetchAllUsers();
      } catch (error: any) {
        console.error("Error menghapus data PIC:", error);
        toast({ variant: "destructive", title: "Hapus Gagal", description: error.message });
      }
    }
  };

  const openAddForm = () => {
    if (!isMasterAdmin && !isRegularAdmin) {
        toast({ variant: "destructive", title: "Akses Ditolak", description: "Anda tidak memiliki izin untuk menambah PIC." });
        return;
    }
    reset({
        id: '', fullName: '', password: '', wilayah: '', area: '', workLocation: '',
        joinDate: new Date().toISOString().split('T')[0], contractStatus: 'Aktif',
        accountNumber: '', bankName: '', registeredRecipientName: '', avatarUrl: '', firebaseUid: undefined,
    });
    setEditingPic(null);
    setShowPassword(true); 
    setIsFormOpen(true);
  };

  if (!isMounted || authLoading || (adminSession && adminSession.role !== 'pic' && isLoadingData)) {
    return (
      <div className="flex justify-center items-center h-screen">
        <UserCheck className="h-8 w-8 animate-pulse mr-2" />
        <p>Menyiapkan halaman manajemen PIC...</p>
      </div>
    );
  }
  
  if (adminSession?.role === 'pic') {
    // This case should ideally be handled by the redirect in useEffect,
    // but as a fallback display an access denied message.
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><AlertTriangle className="h-6 w-6 text-destructive" />Akses Ditolak</CardTitle>
            </CardHeader>
            <CardContent>
                <p>Anda tidak memiliki izin untuk mengakses halaman manajemen PIC.</p>
            </CardContent>
        </Card>
    );
  }


  const canManage = isMasterAdmin || isRegularAdmin;

  return (
    <div className="space-y-6">
      <Card x-chunk="dashboard-06-chunk-0">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Manajemen Data PIC</CardTitle>
            <CardDescription>
              {isMasterAdmin && "Tambah, edit, atau hapus data PIC. Penambahan akan membuat akun Firebase."}
              {isRegularAdmin && "Ajukan penambahan PIC baru atau perubahan data PIC untuk persetujuan MasterAdmin."}
            </CardDescription>
          </div>
          {canManage && (
            <Button onClick={openAddForm} size="sm">
              <UserPlus className="mr-2 h-4 w-4" /> {isMasterAdmin ? 'Tambah PIC' : 'Ajukan PIC Baru'}
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <Alert variant="default" className="mb-4 bg-purple-50 border-purple-200">
            <Info className="h-4 w-4 text-purple-600" />
            <AlertTitle className="text-purple-700">Informasi Alur Kerja PIC</AlertTitle>
            <AlertDescription className="text-purple-600 space-y-1">
              {isMasterAdmin && <p>MasterAdmin: Penambahan & perubahan data PIC langsung diterapkan.</p>}
              {isRegularAdmin && <p>Admin: Penambahan PIC baru atau pengubahan data akan dikirim sebagai permintaan persetujuan kepada MasterAdmin. Cek status di menu "Permintaan Saya".</p>}
            </AlertDescription>
          </Alert>
          {isLoadingData ? (
             <p>Mengambil data PIC...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID Kustom</TableHead>
                  <TableHead>Nama Lengkap</TableHead>
                  <TableHead>Wilayah</TableHead>
                  <TableHead>Area</TableHead>
                  <TableHead>Lokasi Kerja</TableHead>
                  <TableHead>Status Kontrak</TableHead>
                  {canManage && <TableHead className="text-right">Aksi</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {pics.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={canManage ? 7 : 6} className="text-center">Tidak ada data PIC.</TableCell>
                  </TableRow>
                ) : (
                  pics.map((pic) => (
                    <TableRow key={pic.firebaseUid}>
                      <TableCell className="font-code">{pic.id}</TableCell>
                      <TableCell>{pic.fullName}</TableCell>
                      <TableCell>{pic.wilayah || '-'}</TableCell>
                      <TableCell>{pic.area || '-'}</TableCell>
                      <TableCell>{pic.workLocation}</TableCell>
                      <TableCell><Badge variant={pic.contractStatus === 'Aktif' ? "default" : "destructive"}>{pic.contractStatus}</Badge></TableCell>
                      {canManage && (
                        <TableCell className="text-right space-x-2">
                          <Button variant="outline" size="sm" onClick={() => handleEdit(pic)}>
                            <Edit className="mr-1 h-3 w-3" /> {isMasterAdmin ? 'Edit Langsung' : 'Ajukan Edit'}
                          </Button>
                          {isMasterAdmin && (
                            <Button variant="destructive" size="sm" onClick={() => handleDelete(pic)}>
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

      {canManage && (
        <Dialog open={isFormOpen} onOpenChange={(isOpen) => {
            setIsFormOpen(isOpen);
            if (!isOpen) {
              reset();
              setEditingPic(null);
              setShowPassword(false);
            }
        }}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingPic
                  ? (isMasterAdmin ? `Edit Detail PIC: ${editingPic.fullName}` : `Ajukan Perubahan Detail PIC: ${editingPic.fullName}`)
                  : (isMasterAdmin ? 'Tambah PIC Baru & Akun Firebase' : 'Ajukan Penambahan PIC Baru')}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
              <input type="hidden" {...register('firebaseUid')} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="id">ID Kustom PIC</Label>
                  <Input id="id" {...register('id')} disabled={!!editingPic} placeholder="Contoh: PICAREA01" />
                  {errors.id && <p className="text-sm text-destructive mt-1">{errors.id.message}</p>}
                  {!editingPic && isMasterAdmin && <p className="text-xs text-muted-foreground mt-1">ID ini akan digunakan untuk email login: ID@spxkurir.app</p>}
                  {!!editingPic && <p className="text-xs text-muted-foreground mt-1">ID Kustom tidak dapat diubah setelah dibuat.</p>}
                </div>
                <div>
                  <Label htmlFor="fullName">Nama Lengkap</Label>
                  <Input id="fullName" {...register('fullName')} />
                  {errors.fullName && <p className="text-sm text-destructive mt-1">{errors.fullName.message}</p>}
                </div>

                {(!editingPic || (editingPic && isRegularAdmin && !isMasterAdmin)) && ( 
                  <div>
                    <Label htmlFor="password">
                        {!editingPic ? "Password Awal" : (isRegularAdmin && !isMasterAdmin ? "Password (Tidak Diubah oleh Admin Reguler)" : "Password Awal")}
                    </Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        {...register('password')}
                        placeholder={!editingPic ? "Minimal 6 karakter" : (isRegularAdmin && !isMasterAdmin ? "Tidak diubah" : "")}
                        className="pr-10"
                        disabled={!!editingPic && isRegularAdmin && !isMasterAdmin} 
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute inset-y-0 right-0 h-full px-3 flex items-center text-muted-foreground hover:text-foreground"
                        onClick={() => setShowPassword((prev) => !prev)}
                        aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                        tabIndex={-1}
                        disabled={!!editingPic && isRegularAdmin && !isMasterAdmin}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                    {errors.password && <p className="text-sm text-destructive mt-1">{errors.password.message}</p>}
                    {!editingPic && isMasterAdmin && <p className="text-xs text-muted-foreground mt-1">Password ini akan digunakan untuk login awal PIC.</p>}
                    {!editingPic && isRegularAdmin && <p className="text-xs text-muted-foreground mt-1">MasterAdmin akan membuat akun dengan password ini jika disetujui.</p>}
                  </div>
                )}
                {editingPic && isMasterAdmin && (
                  <Alert variant="default" className="md:col-span-2 bg-yellow-50 border-yellow-200">
                      <AlertTriangle className="h-4 w-4 text-yellow-600" />
                      <AlertTitle className="text-yellow-700">Info Password</AlertTitle>
                      <AlertDescription className="text-yellow-600">
                        Password akun login Firebase tidak diubah dari form ini. MasterAdmin dapat meresetnya via Firebase Console jika diperlukan.
                      </AlertDescription>
                  </Alert>
                )}
                 <div>
                  <Label htmlFor="jobTitleFixed">Jabatan</Label>
                  <Input id="jobTitleFixed" value={FIXED_JOB_TITLE} readOnly disabled className="bg-muted/50" />
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
                  <Label htmlFor="workLocation">Lokasi Kerja (Kantor/HUB)</Label>
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
                   {!editingPic && <p className="text-xs text-muted-foreground mt-1">Jika kosong, akan menggunakan placeholder.</p>}
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
                  <Button type="button" variant="outline" onClick={() => { setIsFormOpen(false); reset(); setEditingPic(null); setShowPassword(false); }}>Batal</Button>
                </DialogClose>
                <Button type="submit">
                    <Send className="mr-2 h-4 w-4"/>
                    {editingPic
                      ? (isMasterAdmin ? 'Simpan Perubahan PIC' : 'Kirim Permintaan Perubahan')
                      : (isMasterAdmin ? 'Tambah PIC' : 'Kirim Permintaan Penambahan')}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
