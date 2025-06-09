
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { db, auth } from '@/lib/firebase';
import { collection, getDocs, doc, updateDoc, setDoc, deleteDoc, query, where, serverTimestamp } from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import type { UserCreationRequest, CourierUpdateRequest, User as AppUserType } from '@/types';
import { Button } from '@/components/ui/button';
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
import { Loader2, CheckCircle, XCircle, ShieldAlert, Info, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

export default function ApprovalsPage() {
  const { adminSession, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [userCreationRequests, setUserCreationRequests] = useState<UserCreationRequest[]>([]);
  const [courierUpdateRequests, setCourierUpdateRequests] = useState<CourierUpdateRequest[]>([]);
  const [isLoadingRequests, setIsLoadingRequests] = useState(true);
  const [isProcessing, setIsProcessing] = useState<string | null>(null); // Stores ID of request being processed

  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [currentRequestToReject, setCurrentRequestToReject] = useState<{ id: string; type: 'creation' | 'update' } | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');


  const fetchRequests = useCallback(async () => {
    if (!db || adminSession?.role !== 'master') {
      setIsLoadingRequests(false);
      return;
    }
    setIsLoadingRequests(true);
    try {
      const creationRequestsQuery = query(collection(db, "userCreationRequests"), where("status", "==", "pending"));
      const creationSnapshot = await getDocs(creationRequestsQuery);
      setUserCreationRequests(creationSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as UserCreationRequest)));

      const updateRequestsQuery = query(collection(db, "courierUpdateRequests"), where("status", "==", "pending"));
      const updateSnapshot = await getDocs(updateRequestsQuery);
      setCourierUpdateRequests(updateSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as CourierUpdateRequest)));
    } catch (error) {
      console.error("Error fetching approval requests:", error);
      toast({ variant: "destructive", title: "Gagal Memuat Permintaan", description: "Terjadi kesalahan saat mengambil data permintaan." });
    }
    setIsLoadingRequests(false);
  }, [adminSession?.role, toast]);

  useEffect(() => {
    if (!authLoading && (!adminSession || adminSession.role !== 'master')) {
      toast({ variant: "destructive", title: "Akses Ditolak", description: "Halaman ini hanya untuk Master Admin." });
      router.push('/admin/reports');
    } else if (adminSession?.role === 'master') {
      fetchRequests();
    }
  }, [adminSession, authLoading, router, toast, fetchRequests]);

  const handleApproveCreation = async (request: UserCreationRequest) => {
    if (!db || !auth || !adminSession || !request.id) return;
    setIsProcessing(request.id);
    const userData = request.requestedUserData;
    const userEmail = `${userData.id}@spxkurir.app`;

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, userEmail, userData.password!);
      const newFirebaseUid = userCredential.user.uid;

      const finalUserData: Omit<AppUserType, 'firebaseUid'> & { firebaseUid: string } = {
        id: userData.id,
        fullName: userData.fullName,
        wilayah: userData.wilayah,
        area: userData.area,
        workLocation: userData.workLocation,
        joinDate: userData.joinDate,
        jobTitle: userData.jobTitle,
        contractStatus: userData.contractStatus,
        accountNumber: userData.accountNumber,
        bankName: userData.bankName,
        registeredRecipientName: userData.registeredRecipientName,
        avatarUrl: userData.avatarUrl || `https://placehold.co/100x100.png?text=${userData.id.substring(0,2).toUpperCase()}`,
        firebaseUid: newFirebaseUid, // Explicitly set the UID from Auth
      };
      // Remove password before storing in Firestore
      const { password, ...userDataWithoutPassword } = finalUserData;

      await setDoc(doc(db, "users", newFirebaseUid), userDataWithoutPassword);
      
      const requestDocRef = doc(db, "userCreationRequests", request.id);
      await updateDoc(requestDocRef, {
        status: 'approved',
        reviewedByFirebaseUid: adminSession.firebaseUid,
        reviewedById: adminSession.id,
        reviewedAt: serverTimestamp(),
      });

      toast({ title: "Pengguna Disetujui & Dibuat", description: `Akun untuk ${userData.fullName} (${userData.id}) telah berhasil dibuat.` });
      fetchRequests(); // Refresh list
    } catch (error: any) {
      console.error("Error approving user creation:", error);
      let userMessage = `Gagal menyetujui pembuatan pengguna: ${error.message}`;
      if (error.code === 'auth/email-already-in-use') {
        userMessage = `Email ${userEmail} sudah terdaftar di Firebase. Permintaan ini mungkin perlu ditolak atau data pengguna diperbaiki.`;
      } else if (error.code === 'auth/weak-password') {
        userMessage = "Password yang diajukan terlalu lemah.";
      }
      toast({ variant: "destructive", title: "Persetujuan Gagal", description: userMessage });
      // Optionally, mark request as failed or needing attention if auth creation fails
    }
    setIsProcessing(null);
  };

  const handleApproveUpdate = async (request: CourierUpdateRequest) => {
    if (!db || !adminSession || !request.id) return;
    setIsProcessing(request.id);
    try {
      const userDocRef = doc(db, "users", request.courierFirebaseUid);
      await updateDoc(userDocRef, request.requestedChanges);

      const requestDocRef = doc(db, "courierUpdateRequests", request.id);
      await updateDoc(requestDocRef, {
        status: 'approved',
        reviewedByFirebaseUid: adminSession.firebaseUid,
        reviewedById: adminSession.id,
        reviewedAt: serverTimestamp(),
      });

      toast({ title: "Update Data Disetujui", description: `Perubahan data untuk ${request.courierFullName} (${request.courierId}) telah diterapkan.` });
      fetchRequests(); // Refresh list
    } catch (error: any) {
      console.error("Error approving user update:", error);
      toast({ variant: "destructive", title: "Persetujuan Update Gagal", description: error.message });
    }
    setIsProcessing(null);
  };

  const openRejectDialog = (requestId: string, type: 'creation' | 'update') => {
    setCurrentRequestToReject({ id: requestId, type });
    setRejectionReason('');
    setIsRejectDialogOpen(true);
  };

  const handleRejectRequest = async () => {
    if (!db || !adminSession || !currentRequestToReject) return;
    if (!rejectionReason.trim()) {
      toast({ variant: "destructive", title: "Alasan Diperlukan", description: "Harap masukkan alasan penolakan." });
      return;
    }

    setIsProcessing(currentRequestToReject.id);
    const collectionName = currentRequestToReject.type === 'creation' ? "userCreationRequests" : "courierUpdateRequests";
    const requestDocRef = doc(db, collectionName, currentRequestToReject.id);

    try {
      await updateDoc(requestDocRef, {
        status: 'rejected',
        reviewedByFirebaseUid: adminSession.firebaseUid,
        reviewedById: adminSession.id,
        reviewedAt: serverTimestamp(),
        rejectionReason: rejectionReason.trim(),
      });
      toast({ title: "Permintaan Ditolak", description: `Permintaan telah ditolak dengan alasan: ${rejectionReason.trim()}` });
      fetchRequests(); // Refresh list
    } catch (error: any) {
      console.error("Error rejecting request:", error);
      toast({ variant: "destructive", title: "Penolakan Gagal", description: error.message });
    }
    setIsProcessing(null);
    setIsRejectDialogOpen(false);
    setCurrentRequestToReject(null);
  };


  if (authLoading || isLoadingRequests) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4">Memuat data persetujuan...</p>
      </div>
    );
  }

  if (adminSession?.role !== 'master') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><ShieldAlert className="h-6 w-6 text-destructive" />Akses Ditolak</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Halaman ini hanya untuk Master Admin.</p>
        </CardContent>
      </Card>
    );
  }
  
  const renderRequestedChanges = (changes: Partial<Omit<AppUserType, 'firebaseUid' | 'password' | 'id'>>) => {
    return Object.entries(changes).map(([key, value]) => (
      <div key={key} className="text-xs">
        <span className="font-semibold">{key}:</span> {String(value)}
      </div>
    )).reduce((acc, curr, idx) => [acc, <br key={`br-${idx}`} />, curr] as any);
  };


  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Persetujuan (Master Admin)</CardTitle>
          <CardDescription>Kelola permintaan pembuatan pengguna baru dan update data dari Admin.</CardDescription>
        </CardHeader>
        <CardContent>
            <Alert className="mb-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Penting!</AlertTitle>
                <AlertDescription>
                Pastikan Anda telah memverifikasi detail permintaan dengan seksama sebelum menyetujui atau menolak.
                Menyetujui pembuatan pengguna akan membuat akun di Firebase Authentication.
                </AlertDescription>
            </Alert>
          <Tabs defaultValue="userCreation">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="userCreation">Permintaan Pengguna Baru ({userCreationRequests.length})</TabsTrigger>
              <TabsTrigger value="dataUpdate">Permintaan Update Data ({courierUpdateRequests.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="userCreation">
              <Card>
                <CardHeader>
                  <CardTitle>Permintaan Pengguna Baru</CardTitle>
                </CardHeader>
                <CardContent>
                  {userCreationRequests.length === 0 ? <p>Tidak ada permintaan pengguna baru.</p> : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Diminta Oleh</TableHead>
                          <TableHead>Tgl Permintaan</TableHead>
                          <TableHead>ID Diajukan</TableHead>
                          <TableHead>Nama Diajukan</TableHead>
                          <TableHead>Jabatan</TableHead>
                          <TableHead>Wilayah</TableHead>
                          <TableHead className="text-right">Aksi</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {userCreationRequests.map(req => (
                          <TableRow key={req.id}>
                            <TableCell>{req.requestorId}</TableCell>
                            <TableCell>{format(new Date(req.requestedAt), "dd MMM yyyy, HH:mm")}</TableCell>
                            <TableCell className="font-code">{req.requestedUserData.id}</TableCell>
                            <TableCell>{req.requestedUserData.fullName}</TableCell>
                            <TableCell>{req.requestedUserData.jobTitle}</TableCell>
                            <TableCell>{req.requestedUserData.wilayah}</TableCell>
                            <TableCell className="text-right space-x-2">
                              <Button size="sm" onClick={() => handleApproveCreation(req)} disabled={isProcessing === req.id} variant="default">
                                {isProcessing === req.id ? <Loader2 className="h-4 w-4 animate-spin"/> : <CheckCircle className="h-4 w-4"/>} Setujui
                              </Button>
                              <Button size="sm" onClick={() => openRejectDialog(req.id!, 'creation')} disabled={isProcessing === req.id} variant="destructive">
                                {isProcessing === req.id ? <Loader2 className="h-4 w-4 animate-spin"/> : <XCircle className="h-4 w-4"/>} Tolak
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="dataUpdate">
              <Card>
                <CardHeader>
                  <CardTitle>Permintaan Update Data</CardTitle>
                </CardHeader>
                <CardContent>
                   {courierUpdateRequests.length === 0 ? <p>Tidak ada permintaan update data.</p> : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Diminta Oleh</TableHead>
                          <TableHead>Tgl Permintaan</TableHead>
                          <TableHead>Kurir/PIC ID</TableHead>
                          <TableHead>Nama Kurir/PIC</TableHead>
                          <TableHead>Perubahan Diajukan</TableHead>
                          <TableHead className="text-right">Aksi</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {courierUpdateRequests.map(req => (
                          <TableRow key={req.id}>
                            <TableCell>{req.requestorId}</TableCell>
                            <TableCell>{format(new Date(req.requestedAt), "dd MMM yyyy, HH:mm")}</TableCell>
                            <TableCell className="font-code">{req.courierId}</TableCell>
                            <TableCell>{req.courierFullName}</TableCell>
                            <TableCell>{renderRequestedChanges(req.requestedChanges)}</TableCell>
                            <TableCell className="text-right space-x-2">
                               <Button size="sm" onClick={() => handleApproveUpdate(req)} disabled={isProcessing === req.id} variant="default">
                                {isProcessing === req.id ? <Loader2 className="h-4 w-4 animate-spin"/> : <CheckCircle className="h-4 w-4"/>} Setujui
                              </Button>
                              <Button size="sm" onClick={() => openRejectDialog(req.id!, 'update')} disabled={isProcessing === req.id} variant="destructive">
                                {isProcessing === req.id ? <Loader2 className="h-4 w-4 animate-spin"/> : <XCircle className="h-4 w-4"/>} Tolak
                              </Button>
                            </TableCell>
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

      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tolak Permintaan</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-2">
            <Label htmlFor="rejectionReason">Alasan Penolakan (Wajib)</Label>
            <Textarea 
              id="rejectionReason" 
              value={rejectionReason} 
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Masukkan alasan mengapa permintaan ini ditolak..."
            />
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Batal</Button></DialogClose>
            <Button onClick={handleRejectRequest} variant="destructive" disabled={isProcessing === currentRequestToReject?.id || !rejectionReason.trim()}>
              {isProcessing === currentRequestToReject?.id ? <Loader2 className="h-4 w-4 animate-spin"/> : null} Tolak Permintaan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
