
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import type { UserCreationRequest, CourierUpdateRequest } from '@/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ShieldAlert, Info } from 'lucide-react';
import { format } from 'date-fns';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function MyRequestsPage() {
  const { adminSession, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [userCreationRequests, setUserCreationRequests] = useState<UserCreationRequest[]>([]);
  const [courierUpdateRequests, setCourierUpdateRequests] = useState<CourierUpdateRequest[]>([]);
  const [isLoadingRequests, setIsLoadingRequests] = useState(true);

  const fetchMyRequests = useCallback(async () => {
    if (!db || !adminSession || adminSession.role !== 'regular') {
      setIsLoadingRequests(false);
      return;
    }
    setIsLoadingRequests(true);
    try {
      const creationRequestsQuery = query(
        collection(db, "userCreationRequests"), 
        where("requestorFirebaseUid", "==", adminSession.firebaseUid),
        orderBy("requestedAt", "desc")
      );
      const creationSnapshot = await getDocs(creationRequestsQuery);
      setUserCreationRequests(creationSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as UserCreationRequest)));

      const updateRequestsQuery = query(
        collection(db, "courierUpdateRequests"), 
        where("requestorFirebaseUid", "==", adminSession.firebaseUid),
        orderBy("requestedAt", "desc")
      );
      const updateSnapshot = await getDocs(updateRequestsQuery);
      setCourierUpdateRequests(updateSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as CourierUpdateRequest)));

    } catch (error) {
      console.error("Error fetching 'My Requests':", error);
      toast({ variant: "destructive", title: "Gagal Memuat Permintaan Saya", description: "Terjadi kesalahan saat mengambil data." });
    }
    setIsLoadingRequests(false);
  }, [adminSession, toast]);

  useEffect(() => {
    if (!authLoading && (!adminSession || adminSession.role !== 'regular')) {
      toast({ variant: "destructive", title: "Akses Ditolak", description: "Halaman ini hanya untuk Admin." });
      router.push('/admin/reports');
    } else if (adminSession?.role === 'regular') {
      fetchMyRequests();
    }
  }, [adminSession, authLoading, router, toast, fetchMyRequests]);
  
  const getStatusBadgeVariant = (status: 'pending' | 'approved' | 'rejected'): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'pending': return 'secondary';
      case 'approved': return 'default'; // Greenish via custom class
      case 'rejected': return 'destructive';
      default: return 'outline';
    }
  };
  const getStatusBadgeClass = (status: 'pending' | 'approved' | 'rejected'): string => {
     switch (status) {
      case 'approved': return 'bg-green-500 hover:bg-green-600 text-white';
      default: return '';
    }
  }

  if (authLoading || isLoadingRequests) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4">Memuat permintaan Anda...</p>
      </div>
    );
  }

  if (adminSession?.role !== 'regular') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><ShieldAlert className="h-6 w-6 text-destructive" />Akses Ditolak</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Halaman ini hanya untuk Admin.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Permintaan Saya</CardTitle>
          <CardDescription>Lacak status permintaan pembuatan pengguna baru dan update data yang telah Anda ajukan.</CardDescription>
        </CardHeader>
        <CardContent>
           <Alert className="mb-4 bg-sky-50 border-sky-200 text-sky-700">
                <Info className="h-4 w-4 !text-sky-600" />
                <AlertTitle>Informasi</AlertTitle>
                <AlertDescription>
                Di sini Anda dapat melihat semua permintaan yang telah Anda kirimkan beserta statusnya. 
                Jika ditolak, alasan penolakan akan ditampilkan.
                </AlertDescription>
            </Alert>
          <Tabs defaultValue="myUserCreation">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="myUserCreation">Permintaan Pengguna Baru ({userCreationRequests.length})</TabsTrigger>
              <TabsTrigger value="myDataUpdate">Permintaan Update Data ({courierUpdateRequests.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="myUserCreation">
              <Card>
                <CardHeader><CardTitle>Permintaan Pengguna Baru Saya</CardTitle></CardHeader>
                <CardContent>
                  {userCreationRequests.length === 0 ? <p>Anda belum mengajukan permintaan pengguna baru.</p> : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Tgl Permintaan</TableHead>
                          <TableHead>ID Diajukan</TableHead>
                          <TableHead>Nama Diajukan</TableHead>
                          <TableHead>Jabatan</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Direview Oleh</TableHead>
                          <TableHead>Tgl Review</TableHead>
                          <TableHead>Alasan Penolakan</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {userCreationRequests.map(req => (
                          <TableRow key={req.id}>
                            <TableCell>{format(new Date(req.requestedAt), "dd MMM yyyy, HH:mm")}</TableCell>
                            <TableCell className="font-code">{req.requestedUserData.id}</TableCell>
                            <TableCell>{req.requestedUserData.fullName}</TableCell>
                            <TableCell>{req.requestedUserData.jobTitle}</TableCell>
                            <TableCell><Badge variant={getStatusBadgeVariant(req.status)} className={getStatusBadgeClass(req.status)}>{req.status}</Badge></TableCell>
                            <TableCell>{req.reviewedById || '-'}</TableCell>
                            <TableCell>{req.reviewedAt ? format(new Date(req.reviewedAt), "dd MMM yyyy, HH:mm") : '-'}</TableCell>
                            <TableCell className="text-xs">{req.rejectionReason || '-'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="myDataUpdate">
              <Card>
                <CardHeader><CardTitle>Permintaan Update Data Saya</CardTitle></CardHeader>
                <CardContent>
                   {courierUpdateRequests.length === 0 ? <p>Anda belum mengajukan permintaan update data.</p> : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                           <TableHead>Tgl Permintaan</TableHead>
                          <TableHead>Kurir/PIC ID</TableHead>
                          <TableHead>Nama Kurir/PIC</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Direview Oleh</TableHead>
                          <TableHead>Tgl Review</TableHead>
                          <TableHead>Alasan Penolakan</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {courierUpdateRequests.map(req => (
                          <TableRow key={req.id}>
                            <TableCell>{format(new Date(req.requestedAt), "dd MMM yyyy, HH:mm")}</TableCell>
                            <TableCell className="font-code">{req.courierId}</TableCell>
                            <TableCell>{req.courierFullName}</TableCell>
                            <TableCell><Badge variant={getStatusBadgeVariant(req.status)} className={getStatusBadgeClass(req.status)}>{req.status}</Badge></TableCell>
                            <TableCell>{req.reviewedById || '-'}</TableCell>
                            <TableCell>{req.reviewedAt ? format(new Date(req.reviewedAt), "dd MMM yyyy, HH:mm") : '-'}</TableCell>
                            <TableCell className="text-xs">{req.rejectionReason || '-'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                   )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
