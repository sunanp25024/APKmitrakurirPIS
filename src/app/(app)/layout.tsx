
"use client";

import { AppSidebar } from '@/components/layout/AppSidebar';
import { SidebarProvider, SidebarInset, SidebarTrigger as ShadcnSidebarTrigger } from '@/components/ui/sidebar';
import { useAuthRedirect } from '@/hooks/useAuthRedirect';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, PanelLeft } from 'lucide-react';
import React from 'react';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useAuthRedirect();
  const { user, isLoading } = useAuth();

  if (isLoading || !user) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen">
        <AppSidebar />
        <SidebarInset className="flex-1 flex flex-col">
          <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background/80 backdrop-blur-sm px-4 md:px-6 md:hidden">
            {/* Mobile Sidebar Trigger */}
            <ShadcnSidebarTrigger className="md:hidden">
               <PanelLeft className="h-6 w-6" />
               <span className="sr-only">Toggle Sidebar</span>
            </ShadcnSidebarTrigger>
            <h1 className="text-lg font-semibold font-headline">SPX Mitra Kurir</h1>
          </header>
          <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-auto">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
