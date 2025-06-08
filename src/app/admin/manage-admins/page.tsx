
"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ShieldAlert, Info, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function ManageAdminsPage() {
  const [adminRole, setAdminRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    try {
      const adminSession = localStorage.getItem('adminSession');
      if (adminSession) {
        const sessionData = JSON.parse(adminSession);
        if (sessionData.role !== 'master') {
          // If not master, redirect or deny access
          toast({ variant: "destructive", title: "Akses Ditolak", description: "Halaman ini hanya untuk Master Admin." });
          router.push('/admin/reports'); // Or a generic access denied page
        }
        setAdminRole(sessionData.role);
      } else {
        // No admin session, redirect to login
        router.push('/login');
      }
    } catch (error) {
      console.error("Error accessing admin session:", error);
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
    // This case should ideally be handled by redirection in useEffect,
    // but as a fallback or if redirection is slow:
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
            <AlertTitle className="!text-primary font-semibold">Informasi Prototipe</AlertTitle>
            <AlertDescription className="!text-primary/90">
              Untuk prototipe ini, penambahan, pengeditan, atau penonaktifan akun admin lain (Regular Admin atau Master Admin baru)
              dilakukan secara manual dengan memodifikasi array `ADMIN_CREDENTIALS` di file:
              <br />
              <code className="font-code bg-primary/20 px-1 py-0.5 rounded text-sm">src/components/auth/LoginForm.tsx</code>.
              <br />
              Setelah melakukan perubahan pada kode, pastikan untuk me-refresh aplikasi agar perubahan kredensial terbaca.
              Master Admin berikutnya dapat ditambahkan dengan role 'master' dalam array tersebut.
            </AlertDescription>
          </Alert>
          
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-2">Tindakan yang Dapat Dilakukan (Secara Manual di Kode):</h3>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>Menambahkan akun admin baru (Master atau Regular) dengan ID, password, dan role yang sesuai.</li>
              <li>Mengubah password atau role akun admin yang sudah ada.</li>
              <li>Menonaktifkan akun admin dengan menghapus atau mengomentari entrinya dari array `ADMIN_CREDENTIALS`.</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Helper for toast (can be moved to a utility if used elsewhere)
import { toast as appToast } from '@/hooks/use-toast'; // Assuming this path is correct

const toast = (options: { title: string; description?: string; variant?: "default" | "destructive" }) => {
  appToast(options);
};
