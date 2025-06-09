
"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ShieldAlert, Info, Loader2, Users, KeyRound, Database } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

// Impor toast dari hook yang benar
import { toast as appToast } from '@/hooks/use-toast';

// Definisikan fungsi toast helper jika belum ada di file ini
const toast = (options: { title: string; description?: string; variant?: "default" | "destructive" }) => {
  appToast(options);
};


export default function ManageAdminsPage() {
  const [adminRole, setAdminRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    try {
      const adminSession = localStorage.getItem('adminSession_firebase_v2'); // Pastikan key localStorage konsisten
      if (adminSession) {
        const sessionData = JSON.parse(adminSession);
        if (sessionData.role !== 'master') {
          toast({ variant: "destructive", title: "Akses Ditolak", description: "Halaman ini hanya untuk Master Admin." });
          router.push('/admin/reports'); 
        }
        setAdminRole(sessionData.role);
      } else {
        toast({ variant: "destructive", title: "Sesi Tidak Ditemukan", description: "Silakan login kembali sebagai admin." });
        router.push('/login');
      }
    } catch (error) {
      console.error("Error mengakses sesi admin:", error);
      toast({ variant: "destructive", title: "Error Sesi", description: "Gagal memuat sesi admin." });
      router.push('/login');
    }
    setIsLoading(false);
  }, [router]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (adminRole !== 'master') {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><ShieldAlert className="h-6 w-6 text-destructive" />Akses Ditolak</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Halaman ini hanya dapat diakses oleh Master Admin.</p>
            <Button asChild className="mt-4">
              <Link href="/admin/reports">Kembali ke Laporan</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="font-headline text-2xl">Manajemen Akun Admin</CardTitle>
          <CardDescription>Kelola akun admin lain dalam sistem (Khusus Master Admin).</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="default" className="bg-primary/10 border-primary/30 text-primary-foreground">
            <Info className="h-4 w-4 !text-primary" />
            <AlertTitle className="!text-primary font-semibold">Informasi Penting: Manajemen Akun Admin</AlertTitle>
            <AlertDescription className="!text-primary/90 space-y-2">
              <p>
                Untuk prototipe ini, penambahan, pengeditan, atau penonaktifan akun admin (Regular Admin atau Master Admin baru)
                dilakukan melalui kombinasi perubahan kode dan tindakan di Firebase Console.
              </p>
              <div>
                <strong className="block mb-1">Langkah-langkah Menambah Admin Baru:</strong>
                <ol className="list-decimal list-inside space-y-1 pl-2">
                  <li>
                    <Users className="inline h-4 w-4 mr-1" />
                    <strong>Edit Kode Aplikasi:</strong> Buka file 
                    <code className="font-code bg-primary/20 px-1 py-0.5 rounded text-sm mx-1">src/contexts/AuthContext.tsx</code>.
                    Tambahkan entri baru ke dalam array <code className="font-code bg-primary/20 px-1 py-0.5 rounded text-sm mx-1">ADMIN_FIRESTORE_CREDENTIALS</code>.
                    Setiap entri harus berisi <code className="font-code">id</code> (ID kustom admin, misal "ADMINBARU01"), 
                    <code className="font-code">password</code> (password yang akan digunakan untuk login), 
                    <code className="font-code">role</code> ('master' atau 'regular'), dan 
                    <code className="font-code">email</code> (email unik yang akan didaftarkan di Firebase Auth, misal "adminbaru01@spxkurir.app").
                  </li>
                  <li>
                    <KeyRound className="inline h-4 w-4 mr-1" />
                    <strong>Buat Akun di Firebase Authentication:</strong> Buka Firebase Console proyek Anda, navigasi ke "Authentication" > bagian "Users".
                    Klik "Add user". Masukkan <code className="font-code">email</code> dan <code className="font-code">password</code> yang sama persis seperti yang Anda definisikan di langkah 1 untuk properti <code className="font-code">email</code> dan <code className="font-code">password</code>.
                  </li>
                   <li>
                     <strong>Penyimpanan Data (Opsional):</strong> Jika admin juga memerlukan data profil khusus yang disimpan di Firestore (seperti kurir), Anda bisa membuat dokumen untuknya di koleksi `users` dengan ID dokumen adalah Firebase UID dari akun admin yang baru dibuat. Namun, untuk fungsi admin dasar, ini tidak wajib.
                  </li>
                </ol>
              </div>
              <p>
                Setelah melakukan perubahan pada kode dan Firebase Console, pastikan untuk me-refresh aplikasi atau deploy ulang jika di Vercel.
              </p>
              <p>
                <strong>Mengubah Password atau Role:</strong> Ubah password di Firebase Authentication dan/atau ubah detail (termasuk role) di array <code className="font-code bg-primary/20 px-1 py-0.5 rounded text-sm mx-1">ADMIN_FIRESTORE_CREDENTIALS</code> dalam kode.
              </p>
              <p>
                <strong>Menonaktifkan Akun Admin:</strong> Hapus atau komentari entrinya dari array <code className="font-code bg-primary/20 px-1 py-0.5 rounded text-sm mx-1">ADMIN_FIRESTORE_CREDENTIALS</code>. Anda juga mungkin ingin menonaktifkan akunnya di Firebase Authentication.
              </p>
            </AlertDescription>
          </Alert>
          
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-2">Ringkasan Alur Login Admin:</h3>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>Admin memasukkan ID Kustom (misal, "MASTERADMIN") dan password.</li>
              <li>Sistem mencocokkan ID Kustom dengan entri di <code className="font-code">ADMIN_FIRESTORE_CREDENTIALS</code>.</li>
              <li>Jika cocok, sistem menggunakan email yang terpetakan dari array tersebut (dan password yang diinput) untuk login ke Firebase Authentication.</li>
              <li>Jika login Firebase berhasil, sesi admin dibuat dengan role yang sesuai dari array.</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


    