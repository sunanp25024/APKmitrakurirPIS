
"use client";
import { LoginForm } from '@/components/auth/LoginForm';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const { user, adminSession, isLoading: authIsLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // console.log("LoginPage: authIsLoading:", authIsLoading, "user:", !!user, "adminSession:", !!adminSession);
    if (!authIsLoading) {
      if (adminSession) {
        // console.log("LoginPage: Admin session exists. Redirecting to /admin/reports.");
        router.replace('/admin/reports');
      } else if (user) {
        // console.log("LoginPage: User session exists. Redirecting to /dashboard.");
        router.replace('/dashboard');
      }
    }
  }, [user, adminSession, authIsLoading, router]);

  // If auth state is still loading OR if a session is already established (and redirect is about to happen), show loader.
  if (authIsLoading || (!authIsLoading && (user || adminSession))) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-6 bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-lg">Memuat...</p>
      </div>
    );
  }
  
  // Only render LoginForm if not loading and no user/admin session (i.e., truly needs to login)
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 bg-gradient-to-br from-primary to-secondary">
      <LoginForm />
    </div>
  );
}
