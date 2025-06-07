
"use client";

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { Camera, Save, KeyRound } from 'lucide-react';

export default function SettingsPage() {
  const { user, isLoading } = useAuth(); // Assuming useAuth can update user details or provides a method.
  const { toast } = useToast();
  
  // Mock local state for settings, in a real app this would interact with AuthContext or a backend.
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [avatarPreview, setAvatarPreview] = useState(user?.avatarUrl || 'https://placehold.co/150x150.png');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  if (isLoading || !user) {
    return <div>Loading settings...</div>; // Or a skeleton loader
  }

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setAvatarPreview(e.target?.result as string);
      };
      reader.readAsDataURL(event.target.files[0]);
    }
  };

  const handleProfileUpdate = () => {
    // Simulate profile update
    toast({ title: "Profil Diperbarui", description: "Informasi profil Anda telah berhasil disimpan." });
    // In a real app: updateUser({ ...user, fullName, avatarUrl: avatarPreview });
  };
  
  const handleChangePassword = () => {
    if (newPassword !== confirmPassword) {
      toast({ variant: "destructive", title: "Error", description: "Password baru dan konfirmasi password tidak cocok." });
      return;
    }
    if (newPassword.length < 6) {
      toast({ variant: "destructive", title: "Error", description: "Password baru minimal 6 karakter." });
      return;
    }
    // Simulate password change
    toast({ title: "Password Diubah", description: "Password Anda telah berhasil diubah." });
    setNewPassword('');
    setConfirmPassword('');
    // In a real app: changePassword(newPassword);
  };


  return (
    <div className="space-y-6">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline text-2xl">Pengaturan Akun</CardTitle>
          <CardDescription>Kelola informasi profil dan keamanan akun Anda.</CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Edit Profil</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col items-center space-y-4">
            <Avatar className="w-32 h-32 border-4 border-primary shadow-md">
              <AvatarImage src={avatarPreview} alt={fullName} data-ai-hint="user avatar large" />
              <AvatarFallback className="text-4xl">{fullName.substring(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <Input id="avatarUpload" type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
            <Button variant="outline" onClick={() => document.getElementById('avatarUpload')?.click()}>
              <Camera className="mr-2 h-4 w-4" /> Ganti Foto Profil
            </Button>
          </div>
          <div>
            <Label htmlFor="fullName">Nama Lengkap</Label>
            <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="courierId">ID Mitra Kurir (Tidak dapat diubah)</Label>
            <Input id="courierId" value={user.id} disabled className="font-code" />
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleProfileUpdate}>
            <Save className="mr-2 h-4 w-4" /> Simpan Perubahan Profil
          </Button>
        </CardFooter>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Ganti Password</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="newPassword">Password Baru</Label>
            <Input id="newPassword" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Minimal 6 karakter"/>
          </div>
           <div>
            <Label htmlFor="confirmPassword">Konfirmasi Password Baru</Label>
            <Input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Ulangi password baru"/>
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleChangePassword}>
            <KeyRound className="mr-2 h-4 w-4" /> Ubah Password
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
