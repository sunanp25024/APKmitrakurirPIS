
"use client";

import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { User, MapPin, CalendarDays, Briefcase, FileText, Landmark, CreditCard, Users } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface ProfileItemProps {
  icon: React.ElementType;
  label: string;
  value?: string;
  isCode?: boolean;
}

const ProfileItem: React.FC<ProfileItemProps> = ({ icon: Icon, label, value, isCode = false }) => (
  <div className="flex items-start space-x-3">
    <Icon className="h-5 w-5 text-primary mt-1" />
    <div>
      <p className="text-sm text-muted-foreground">{label}</p>
      {value ? (
        <p className={`font-medium ${isCode ? 'font-code' : ''}`}>{value}</p>
      ) : (
        <Skeleton className="h-5 w-32 mt-1" />
      )}
    </div>
  </div>
);

export default function ProfilePage() {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="space-y-6">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="font-headline text-2xl">Profil Mitra Kurir</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="shadow-lg">
        <CardHeader className="text-center">
          <Avatar className="w-24 h-24 mx-auto mb-4 border-4 border-primary shadow-md">
            <AvatarImage src={user.avatarUrl} alt={user.fullName} data-ai-hint="courier portrait" />
            <AvatarFallback className="text-3xl">{user.fullName.substring(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <CardTitle className="font-headline text-3xl">{user.fullName}</CardTitle>
          <CardDescription className="font-code">{user.id}</CardDescription>
        </CardHeader>
        <CardContent className="mt-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
            <ProfileItem icon={User} label="ID Mitra Kurir" value={user.id} isCode />
            <ProfileItem icon={MapPin} label="Lokasi Kerja" value={user.workLocation} />
            <ProfileItem icon={CalendarDays} label="Tanggal Join" value={user.joinDate} />
            <ProfileItem icon={Briefcase} label="Jabatan" value={user.jobTitle} />
            <ProfileItem icon={FileText} label="Status Kontrak" value={user.contractStatus} />
          </div>
          <Separator />
          <h3 className="text-lg font-semibold font-headline text-primary">Informasi Bank</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
            <ProfileItem icon={CreditCard} label="Nomor Rekening" value={user.accountNumber} isCode />
            <ProfileItem icon={Landmark} label="Jenis Bank" value={user.bankName} />
            <ProfileItem icon={Users} label="Nama Penerima Terdaftar" value={user.registeredRecipientName} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
