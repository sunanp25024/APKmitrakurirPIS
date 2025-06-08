
"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LineChart, Line } from 'recharts';
import { Users, Package, PackageCheck, PackageX, Percent, TrendingUp, Clock } from 'lucide-react';
import type { AdminOverallStats, AdminCourierDailySummary, AdminDeliveryTimeDataPoint } from '@/types';
import { mockAdminOverallStats, mockAdminCourierSummaries, mockAdminDeliveryTimeData } from '@/lib/mockData';

const COLORS_REPORTS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

interface StatCardProps {
  icon: React.ElementType;
  title: string;
  value: string | number;
  description?: string;
}

const StatCard: React.FC<StatCardProps> = ({ icon: Icon, title, value, description }) => (
  <Card className="shadow-sm hover:shadow-md transition-shadow">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <Icon className="h-5 w-5 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
    </CardContent>
  </Card>
);

export default function AdminReportsPage() {
  const overallStats: AdminOverallStats = mockAdminOverallStats;
  const courierSummaries: AdminCourierDailySummary[] = mockAdminCourierSummaries;
  const deliveryTimeData: AdminDeliveryTimeDataPoint[] = mockAdminDeliveryTimeData;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="font-headline text-2xl">Dashboard Laporan Admin</CardTitle>
          <CardDescription>Ringkasan aktivitas dan performa kurir hari ini.</CardDescription>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard icon={Users} title="Total Kurir Aktif" value={overallStats.totalActiveCouriers} />
        <StatCard icon={Package} title="Total Paket Hari Ini" value={overallStats.totalPackagesToday} />
        <StatCard icon={PackageCheck} title="Paket Terkirim Hari Ini" value={overallStats.totalDeliveredToday} />
        <StatCard icon={Percent} title="Rate Sukses Keseluruhan (Hari Ini)" value={`${overallStats.overallSuccessRateToday.toFixed(1)}%`} description="Dari paket yang sudah coba diantar" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Distribusi Pengiriman per Jam</CardTitle>
            <CardDescription>Jumlah paket terkirim berdasarkan jam hari ini.</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={deliveryTimeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Bar dataKey="delivered" fill="hsl(var(--chart-1))" name="Paket Terkirim" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Placeholder Grafik Lain</CardTitle>
            <CardDescription>Misalnya: Tren Pengiriman Mingguan (Semua Kurir).</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-center h-[300px]">
            <p className="text-muted-foreground">Grafik akan ditampilkan di sini.</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ringkasan Performa Kurir Harian</CardTitle>
          <CardDescription>Status dan performa masing-masing kurir hari ini.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama Kurir</TableHead>
                <TableHead>ID Kurir</TableHead>
                <TableHead>Paket Dibawa</TableHead>
                <TableHead>Paket Terkirim</TableHead>
                <TableHead>Gagal/Kembali</TableHead>
                <TableHead>Rate Sukses</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {courierSummaries.map((courier) => (
                <TableRow key={courier.courierId}>
                  <TableCell>{courier.courierName}</TableCell>
                  <TableCell className="font-code">{courier.courierId}</TableCell>
                  <TableCell>{courier.packagesCarried}</TableCell>
                  <TableCell>{courier.packagesDelivered}</TableCell>
                  <TableCell>{courier.packagesFailedOrReturned}</TableCell>
                  <TableCell>{courier.successRate.toFixed(1)}%</TableCell>
                  <TableCell>
                    <Badge variant={
                      courier.status === 'Selesai' ? 'default' :
                      courier.status === 'Aktif Mengantar' ? 'secondary' : 'outline'
                    }
                    className={
                        courier.status === 'Selesai' ? 'bg-green-500 hover:bg-green-600' : ''
                    }
                    >{courier.status}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
