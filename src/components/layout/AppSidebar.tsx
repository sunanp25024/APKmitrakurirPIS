
"use client";

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
} from '@/components/ui/sidebar'; // Assuming this path is correct for shadcn/ui sidebar
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import {
  User,
  Clock,
  LayoutDashboard,
  TrendingUp,
  Settings,
  LogOut,
  Truck,
  Package,
} from 'lucide-react';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/profile', label: 'Profile', icon: User },
  { href: '/attendance', label: 'Absen', icon: Clock },
  { href: '/performance', label: 'Performa', icon: TrendingUp },
  { href: '/settings', label: 'Setting', icon: Settings },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <Sidebar side="left" variant="sidebar" collapsible="icon">
      <SidebarHeader className="p-4 flex flex-col items-center gap-2 border-b border-sidebar-border">
         <Link href="/dashboard" className="flex items-center gap-2">
            <Package className="h-8 w-8 text-primary" />
            <h1 className="text-xl font-headline font-bold text-primary group-data-[collapsible=icon]:hidden">
              SPX Kurir
            </h1>
          </Link>
        {user && (
          <div className="mt-2 flex flex-col items-center group-data-[collapsible=icon]:hidden">
            <Avatar className="h-16 w-16">
              <AvatarImage src={user.avatarUrl} alt={user.fullName} data-ai-hint="profile avatar" />
              <AvatarFallback>{user.fullName.substring(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <p className="mt-2 text-sm font-medium text-sidebar-foreground">{user.fullName}</p>
            <p className="text-xs text-muted-foreground font-code">{user.id}</p>
          </div>
        )}
      </SidebarHeader>
      <SidebarContent className="p-2">
        <SidebarMenu>
          {navItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <Link href={item.href} legacyBehavior passHref>
                <SidebarMenuButton
                  isActive={pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))}
                  tooltip={{ children: item.label, side: 'right', align: 'center' }}
                  className="justify-start"
                >
                  <item.icon className="h-5 w-5" />
                  <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="p-4 mt-auto border-t border-sidebar-border">
        <Button
          variant="ghost"
          className="w-full justify-start gap-2 text-sidebar-foreground hover:bg-destructive/10 hover:text-destructive group-data-[collapsible=icon]:justify-center"
          onClick={handleLogout}
          title="Log Out"
        >
          <LogOut className="h-5 w-5" />
          <span className="group-data-[collapsible=icon]:hidden">Log Out</span>
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
