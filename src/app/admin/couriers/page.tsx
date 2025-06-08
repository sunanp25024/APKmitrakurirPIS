
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
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import type { User } from '@/types';
import { mockUsers } from '@/lib/mockData'; // Fallback
import { PlusCircle, Edit, Trash2, UserPlus, Info, Eye, EyeOff } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const courierSchema = z.object({
  id: z.string().min(3, "ID minimal 3 karakter").regex(/^[a-zA-Z0-9_.-]*$/, "ID hanya boleh berisi huruf, angka, _, ., -"),
  fullName: z.string().min(3, "Nama lengkap minimal 3 karakter"),
  password: z.string().min(6, "Password minimal 6 karakter").or(z.string().length(0).optional()),
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
});

type CourierFormInputs = z.infer<typeof courierSchema>;

const LOCAL_STORAGE_KEY = 'allAdminManagedUsers';

export default function AdminCouriersPage() {
  const [couriers, setCouriers] = useState<User[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [editingCourier, setEditingCourier] = useState<User | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { toast } = useToast();

  const { register, handleSubmit, reset, control, formState: { errors }, setValue, watch } = useForm<CourierFormInputs>({
    resolver: zodResolver(courierSchema),
    defaultValues: {
      id: '',
      fullName: '',
      password: '',
      wilayah: '',
      area: '',
      workLocation: '',
      joinDate: new Date().toISOString().split('T')[0],
      jobTitle: 'Mitra Kurir',
      contractStatus: 'Aktif',
      accountNumber: '',
      bankName: '',
      registeredRecipientName: '',
      avatarUrl: '',
    }
  });

  const currentPasswordValue = watch('password'); // To help with conditional error message

  useEffect(() => {
    setIsMounted(true);
    try {
      const storedUsers = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (storedUsers) {
        setCouriers(JSON.parse(storedUsers));
      } else {
        setCouriers(mockUsers);
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(mockUsers));
      }
    } catch (error) {
      console.error("Failed to parse users from localStorage:", error);
      setCouriers(mockUsers);
    }
  }, []);

  const saveCouriersToLocalStorage = useCallback((updatedCouriers: User[]) => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedCouriers));
  }, []);

  const onSubmit: SubmitHandler<CourierFormInputs> = (data) => {
    let updatedCouriers;
    const userData = {
        ...data,
        avatarUrl: data.avatarUrl || `https://placehold.co/100x100.png?text=${data.fullName.substring(0,2).toUpperCase()}`
    };

    if (editingCourier) {
      const courierToUpdate = couriers.find(c => c.id === editingCourier.id);
      if (!courierToUpdate) return;

      const updatedData: User = {
        ...courierToUpdate,
        ...userData,
        password: (data.password && data.password.length > 0) ? data.password : courierToUpdate.password,
      };

      updatedCouriers = couriers.map(c => c.id === editingCourier.id ? updatedData : c);
      toast({ title: "Kurir Diperbarui", description: `Data untuk ${data.fullName} telah diperbarui.` });
    } else {
      if (couriers.find(c => c.id === data.id)) {
        toast({ variant: "destructive", title: "Error", description: `ID Kurir ${data.id} sudah ada.` });
        return;
      }
      if (!data.password || data.password.length === 0) {
        toast({ variant: "destructive", title: "Error", description: `Password wajib diisi untuk kurir baru.` });
        setValue('password', ''); // Clear password if it was an empty string that failed validation
        return;
      }
      const newCourier: User = { ...userData, password: data.password };
      updatedCouriers = [...couriers, newCourier];
      toast({ title: "Kurir Ditambahkan", description: `${data.fullName} telah ditambahkan sebagai kurir.` });
    }
    setCouriers(updatedCouriers);
    saveCouriersToLocalStorage(updatedCouriers);
    reset();
    setEditingCourier(null);
    setIsFormOpen(false);
    setShowPassword(false);
  };

  const handleEdit = (courier: User) => {
    setEditingCourier(courier);
    setShowPassword(false);
    const defaultEditValues: CourierFormInputs = {
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


  const handleDelete = (courierId: string) => {
    if (window.confirm(`Apakah Anda yakin ingin menghapus kurir dengan ID ${courierId}?`)) {
      const updatedCouriers = couriers.filter(c => c.id !== courierId);
      setCouriers(updatedCouriers);
      saveCouriersToLocalStorage(updatedCouriers);
      toast({ title: "Kurir Dihapus", description: `Kurir dengan ID ${courierId} telah dihapus.` });
    }
  };

  const openAddForm = () => {
    reset({
        id: '',
        fullName: '',
        password: '',
        wilayah: '',
        area: '',
        workLocation: '',
        joinDate: new Date().toISOString().split('T')[0],
        jobTitle: 'Mitra Kurir',
        contractStatus: 'Aktif',
        accountNumber: '',
        bankName: '',
        registeredRecipientName: '',
        avatarUrl: '',
    });
    setEditingCourier(null);
    setShowPassword(false);
    setIsFormOpen(true);
  };

  if (!isMounted) {
    return <div className="flex justify-center items-center h-screen"><p>Loading data kurir...</p></div>;
  }

  return (
    <div className="space-y-6">
      <Card x-chunk="dashboard-06-chunk-0">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Manajemen Data Kurir</CardTitle>
            <CardDescription>Tambah, edit, atau hapus data kurir.</CardDescription>
          </div>
          <Button onClick={openAddForm} size="sm">
            <UserPlus className="mr-2 h-4 w-4" /> Tambah Kurir Baru
          </Button>
        </CardHeader>
        <CardContent>
          <Alert variant="default" className="mb-4 bg-blue-50 border-blue-200">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertTitle className="text-blue-700">Informasi Penyimpanan Data</AlertTitle>
            <AlertDescription className="text-blue-600">
              Untuk prototipe ini, data kurir disimpan di <strong>localStorage</strong> browser Anda. Perubahan tidak akan memengaruhi data di server atau kode sumber asli.
            </AlertDescription>
          </Alert>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID Kurir</TableHead>
                <TableHead>Nama Lengkap</TableHead>
                <TableHead>Wilayah</TableHead>
                <TableHead>Area</TableHead>
                <TableHead>Lokasi Kerja</TableHead>
                <TableHead>Status Kontrak</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {couriers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center">Tidak ada data kurir.</TableCell>
                </TableRow>
              ) : (
                couriers.map((courier) => (
                  <TableRow key={courier.id}>
                    <TableCell className="font-code">{courier.id}</TableCell>
                    <TableCell>{courier.fullName}</TableCell>
                    <TableCell>{courier.wilayah || '-'}</TableCell>
                    <TableCell>{courier.area || '-'}</TableCell>
                    <TableCell>{courier.workLocation}</TableCell>
                    <TableCell>{courier.contractStatus}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button variant="outline" size="sm" onClick={() => handleEdit(courier)}>
                        <Edit className="mr-1 h-3 w-3" /> Edit
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => handleDelete(courier.id)}>
                        <Trash2 className="mr-1 h-3 w-3" /> Hapus
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

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
            <DialogTitle>{editingCourier ? 'Edit Data Kurir' : 'Tambah Kurir Baru'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="id">ID Mitra Kurir</Label>
                <Input id="id" {...register('id')} disabled={!!editingCourier} />
                {errors.id && <p className="text-sm text-destructive mt-1">{errors.id.message}</p>}
              </div>
              <div>
                <Label htmlFor="fullName">Nama Lengkap</Label>
                <Input id="fullName" {...register('fullName')} />
                {errors.fullName && <p className="text-sm text-destructive mt-1">{errors.fullName.message}</p>}
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    {...register('password')}
                    placeholder={editingCourier ? "Kosongkan jika tidak ingin mengubah" : "Minimal 6 karakter"}
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
                {!errors.password && editingCourier && (!currentPasswordValue || currentPasswordValue.length === 0) && <p className="text-xs text-muted-foreground mt-1">Kosongkan jika tidak ingin mengubah password.</p>}
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
                <Label htmlFor="jobTitle">Jabatan</Label>
                <Input id="jobTitle" {...register('jobTitle')} />
                {errors.jobTitle && <p className="text-sm text-destructive mt-1">{errors.jobTitle.message}</p>}
              </div>
              <div>
                <Label htmlFor="contractStatus">Status Kontrak</Label>
                <Controller
                  name="contractStatus"
                  control={control}
                  render={({ field }) => (
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      defaultValue={field.value}
                    >
                      <SelectTrigger id="contractStatus">
                        <SelectValue placeholder="Pilih status kontrak" />
                      </SelectTrigger>
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
                <Input id="bankName" {...register('bankName')} />
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
              <Button type="submit">{editingCourier ? 'Simpan Perubahan' : 'Tambah Kurir'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

