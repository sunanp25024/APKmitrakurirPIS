
"use client";

import { useState } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

const loginSchema = z.object({
  id: z.string().min(1, "ID Pengguna tidak boleh kosong"),
  password: z.string().min(1, "Password tidak boleh kosong"),
});

type LoginFormInputs = z.infer<typeof loginSchema>;

// Hardcoded admin credentials (FOR PROTOTYPE ONLY)
// Roles: 'master' or 'regular'
const ADMIN_CREDENTIALS = [
  { id: "MASTERADMIN", password: "masterpassword", role: "master" },
  { id: "ADMIN01", password: "admin123", role: "regular" },
  { id: "SUPERVISOR01", password: "super123", role: "regular" },
];

export function LoginForm() {
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormInputs>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit: SubmitHandler<LoginFormInputs> = async (data) => {
    setIsLoading(true);

    const foundAdmin = ADMIN_CREDENTIALS.find(
      (admin) => admin.id === data.id && admin.password === data.password
    );

    if (foundAdmin) {
      toast({ title: `Login Admin (${foundAdmin.role}) Berhasil`, description: "Mengarahkan ke Panel Admin." });
      // Store admin session with role
      try {
        localStorage.setItem('adminSession', JSON.stringify({ id: foundAdmin.id, role: foundAdmin.role }));
      } catch (e) {
        console.error("Failed to set admin session in localStorage", e);
      }
      router.push('/admin/reports'); // Default admin page
      setIsLoading(false);
      return;
    }

    // If not admin, proceed with courier login
    const success = await login(data.id, data.password);
    setIsLoading(false);
    if (success) {
      toast({ title: "Login Kurir Berhasil", description: "Selamat datang kembali!" });
      router.push('/dashboard');
    } else {
      toast({ variant: "destructive", title: "Login Gagal", description: "ID atau Password salah." });
    }
  };

  return (
    <Card className="w-full max-w-md shadow-xl">
      <CardHeader>
        <CardTitle className="text-2xl font-headline text-center">Mitra Kurir SPX</CardTitle>
        <CardDescription className="text-center">Silakan masuk untuk melanjutkan</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="id">ID Pengguna</Label>
            <Input 
              id="id" 
              type="text"
              placeholder="Masukkan ID Anda" 
              {...register('id')} 
              className={errors.id ? 'border-destructive' : ''}
            />
            {errors.id && <p className="text-sm text-destructive">{errors.id.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input 
              id="password" 
              type="password" 
              placeholder="******"
              {...register('password')} 
              className={errors.password ? 'border-destructive' : ''}
            />
            {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
          </div>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Login'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
