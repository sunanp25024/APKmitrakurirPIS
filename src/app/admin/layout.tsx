
"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { PanelLeft, Home, Users, Briefcase, BarChart3, Settings, Loader2 } from 'lucide-react'; 
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext'; // Import useAuth

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  allowedRoles: ('master' | 'regular' | 'pic')[]; 
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { adminSession, isLoading: authLoading } = useAuth(); // Get adminSession from useAuth
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    if (!authLoading && !adminSession) {
      // Redirect to login if not loading and no admin session (unless already on login)
      // This check might be redundant if pages themselves protect routes, but good for layout
      if (pathname !== '/login') { // Prevent redirect loop if already on login
        // router.push('/login'); // Consider if this is needed or if pages handle it
      }
    }
  }, [adminSession, authLoading, router, pathname]);
  
  const allNavItems: NavItem[] = [
    { href: '/admin/reports', label: 'Laporan & Dashboard', icon: BarChart3, allowedRoles: ['master', 'regular', 'pic'] },
    { href: '/admin/couriers', label: 'Manajemen Kurir', icon: Users, allowedRoles: ['master', 'regular', 'pic'] },
    { href: '/admin/manage-admins', label: 'Manajemen Admin', icon: Settings, allowedRoles: ['master'] },
  ];

  const getFilteredNavItems = () => {
    if (!adminSession) return [];
    return allNavItems.filter(item => item.allowedRoles.includes(adminSession.role));
  };
  
  const navItems = getFilteredNavItems();

  if (!isMounted || authLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-muted/40">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  // If still no admin session after loading, perhaps show a message or redirect more forcefully
  if (!adminSession) {
     router.push('/login'); // Redirect if no session after loading
     return (
        <div className="flex h-screen items-center justify-center bg-muted/40">
            <p>Sesi tidak ditemukan, mengarahkan ke halaman login...</p>
            <Loader2 className="h-8 w-8 animate-spin text-primary ml-2" />
      </div>
     )
  }


  const AdminBrand = () => (
    <div className="flex items-center gap-2 px-4 py-5 border-b h-16">
      <Briefcase className="h-6 w-6 text-primary" />
      <h1 className="text-lg font-semibold text-primary">Admin SPX Kurir</h1>
    </div>
  );

  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
      <aside className="fixed inset-y-0 left-0 z-10 hidden w-60 flex-col border-r bg-background sm:flex">
        <AdminBrand />
        <nav className="flex flex-col items-start gap-1 px-2 py-4">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all hover:bg-accent hover:text-primary",
                pathname === item.href ? 'bg-primary/10 text-primary font-semibold' : 'text-muted-foreground'
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto p-4 border-t">
            <Link href="/dashboard">
                <Button variant="outline" className="w-full">
                    <Home className="mr-2 h-4 w-4" />
                    Ke Aplikasi Kurir
                </Button>
            </Link>
        </div>
      </aside>

      <div className="flex flex-col sm:pl-60">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background px-4 sm:border-0 sm:bg-transparent sm:px-6 sm:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button size="icon" variant="outline">
                  <PanelLeft className="h-5 w-5" />
                  <span className="sr-only">Toggle Menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="sm:max-w-xs w-[260px] p-0">
                <AdminBrand />
                <nav className="grid gap-2 p-2 text-base font-medium">
                  {navItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all hover:bg-accent hover:text-primary",
                        pathname === item.href ? 'bg-primary/10 text-primary font-semibold' : 'text-muted-foreground'
                      )}
                    >
                      <item.icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                  ))}
                </nav>
                 <div className="absolute bottom-0 left-0 right-0 p-4 border-t">
                    <Link href="/dashboard">
                        <Button variant="outline" className="w-full">
                            <Home className="mr-2 h-4 w-4" />
                            Ke Aplikasi Kurir
                        </Button>
                    </Link>
                </div>
              </SheetContent>
            </Sheet>
           <div className="font-semibold text-primary text-lg">Admin SPX Kurir</div>
        </header>
        <header className="sticky top-0 z-30 hidden h-16 items-center justify-end border-b bg-background px-4 sm:flex sm:px-6">
        </header>
        <main className="flex-1 items-start gap-4 p-4 sm:px-6 sm:py-6 md:gap-8">
          {children}
        </main>
      </div>
    </div>
  );
}

