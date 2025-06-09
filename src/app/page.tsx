
"use client";
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

export default function HomePage() {
  const { user, adminSession, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // console.log("HomePage: isLoading:", isLoading, "user:", !!user, "adminSession:", !!adminSession);
    if (!isLoading) {
      if (adminSession) {
        // console.log("HomePage: Admin session found. Redirecting to /admin/reports.");
        router.replace('/admin/reports');
      } else if (user) {
        // console.log("HomePage: User session found. Redirecting to /dashboard.");
        router.replace('/dashboard');
      } else {
        // console.log("HomePage: No session found. Redirecting to /login.");
        router.replace('/login');
      }
    }
  }, [user, adminSession, isLoading, router]);

  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
      <p className="ml-4 text-lg">Mengarahkan...</p>
    </div>
  );
}
