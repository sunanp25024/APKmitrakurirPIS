
"use client";
import { LoginForm } from '@/components/auth/LoginForm';
import { useAuthRedirect } from '@/hooks/useAuthRedirect';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';


export default function LoginPage() {
  useAuthRedirect();
  const { isLoading: authIsLoading } = useAuth();

  if (authIsLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-6 bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-lg">Memuat...</p>
      </div>
    );
  }
  
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 bg-gradient-to-br from-primary to-secondary">
      <LoginForm />
    </div>
  );
}
