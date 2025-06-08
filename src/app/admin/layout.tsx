
"use client";

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { PanelLeft, Home, Users, BarChart3 } from 'lucide-react';
import { usePathname } from 'next/navigation';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const navItems = [
    { href: '/admin/couriers', label: 'Manajemen Kurir', icon: Users },
    // { href: '/admin/reports', label: 'Laporan Harian', icon: BarChart3 }, // Placeholder for Tahap 2
  ];

  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
      <aside className="fixed inset-y-0 left-0 z-10 hidden w-60 flex-col border-r bg-background sm:flex">
        <nav className="flex flex-col items-start gap-2 px-4 py-5">
          <Link
            href="/dashboard"
            className="group flex h-9 w-full items-center justify-start gap-2 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 mb-4"
          >
            <Home className="h-5 w-5 transition-all group-hover:scale-110" />
            <span>Kembali ke App</span>
          </Link>
          <h2 className="text-lg font-semibold text-primary px-1 mb-2">Admin Panel</h2>
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} legacyBehavior passHref>
              <a
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 transition-all hover:text-primary ${
                  pathname === item.href ? 'bg-muted text-primary font-semibold' : 'text-muted-foreground'
                }`}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </a>
            </Link>
          ))}
        </nav>
      </aside>
      <div className="flex flex-col sm:gap-4 sm:py-4 sm:pl-64">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
          <Sheet>
            <SheetTrigger asChild>
              <Button size="icon" variant="outline" className="sm:hidden">
                <PanelLeft className="h-5 w-5" />
                <span className="sr-only">Toggle Menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="sm:max-w-xs">
              <nav className="grid gap-4 text-lg font-medium p-6">
                 <Link
                    href="/dashboard"
                    className="group flex h-10 w-full items-center justify-start gap-2 rounded-md bg-primary px-3 text-base font-medium text-primary-foreground transition-colors hover:bg-primary/90 mb-4"
                  >
                    <Home className="h-5 w-5 transition-all group-hover:scale-110" />
                    <span>Kembali ke App</span>
                  </Link>
                  <h2 className="text-xl font-semibold text-primary px-1 mb-2">Admin Panel</h2>
                {navItems.map((item) => (
                  <Link key={item.href} href={item.href} legacyBehavior passHref>
                    <a
                      className={`flex items-center gap-4 px-2.5 py-2 transition-all hover:text-primary ${
                        pathname === item.href ? 'text-primary font-semibold bg-muted' : 'text-muted-foreground'
                      }`}
                    >
                      <item.icon className="h-5 w-5" />
                      {item.label}
                    </a>
                  </Link>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
           <div className="relative ml-auto flex-1 md:grow-0">
            {/* Bisa ditambahkan search atau user admin di sini nanti */}
          </div>
        </header>
        <main className="grid flex-1 items-start gap-4 p-4 sm:px-6 sm:py-0 md:gap-8">
          {children}
        </main>
      </div>
    </div>
  );
}
