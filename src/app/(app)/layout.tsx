
"use client";

import { AppSidebar } from '@/components/layout/AppSidebar';
import { SidebarProvider, SidebarInset, SidebarTrigger as ShadcnSidebarTrigger } from '@/components/ui/sidebar';
import { useAuthRedirect } from '@/hooks/useAuthRedirect';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, PanelLeft, LogOut, SettingsIcon, UserCog } from 'lucide-react'; // Added UserCog
import React from 'react';
import { Button } from '@/components/ui/button'; // Added Button
import Link from 'next/link'; // Added Link
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useRouter } from 'next/navigation';


export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useAuthRedirect();
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();

  if (isLoading || !user) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  const handleLogout = () => {
    logout();
    // router.push('/login'); // logout function in AuthContext already handles this
  };

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen">
        <AppSidebar />
        <SidebarInset className="flex-1 flex flex-col">
          <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background/80 backdrop-blur-sm px-4 md:px-6 justify-between">
            {/* Mobile Sidebar Trigger */}
            <div className="flex items-center gap-2">
              <ShadcnSidebarTrigger className="md:hidden">
                 <PanelLeft className="h-6 w-6" />
                 <span className="sr-only">Toggle Sidebar</span>
              </ShadcnSidebarTrigger>
              <h1 className="text-lg font-semibold font-headline md:hidden">SPX Mitra Kurir</h1>
            </div>
            
            {/* Admin & User Dropdown for Mobile & Desktop */}
            <div className="flex items-center gap-4">
              <Link href="/admin/couriers">
                <Button variant="outline" size="sm" className="hidden sm:flex items-center gap-2">
                  <UserCog className="h-4 w-4" />
                  Admin Panel
                </Button>
              </Link>
               <Link href="/admin/couriers">
                 <Button variant="ghost" size="icon" className="sm:hidden">
                  <UserCog className="h-5 w-5" />
                   <span className="sr-only">Admin Panel</span>
                </Button>
              </Link>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="overflow-hidden rounded-full"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.avatarUrl || `https://placehold.co/32x32.png?text=${user.fullName.substring(0,1)}`} alt={user.fullName} data-ai-hint="user avatar" />
                      <AvatarFallback>{user.fullName.substring(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>{user.fullName}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => router.push('/settings')}>
                    <SettingsIcon className="mr-2 h-4 w-4" />
                    Pengaturan
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:bg-destructive/10 focus:text-destructive">
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>
          <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-auto">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
