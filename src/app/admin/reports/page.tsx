
"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { Users, Package, PackageCheck, Percent, Calendar as CalendarIcon, Search, MapPin, Download } from 'lucide-react';
import type { AdminOverallStats, AdminCourierDailySummary, AdminDeliveryTimeDataPoint } from '@/types';
import { mockAdminOverallStats, mockAdminCourierSummaries as initialCourierSummaries, mockAdminDeliveryTimeData } from '@/lib/mockData';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from '@/hooks/use-toast';

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
  const deliveryTimeData: AdminDeliveryTimeDataPoint[] = mockAdminDeliveryTimeData;
  
  const [courierSummaries, setCourierSummaries] = useState<AdminCourierDailySummary[]>(initialCourierSummaries);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedLocation, setSelectedLocation] = useState<string>("all");
  const { toast } = useToast();

  const workLocations = useMemo(() => {
    const locations = new Set(initialCourierSummaries.map(summary => summary.workLocation));
    return ["all", ...Array.from(locations)];
  }, []);

  const filteredCourierSummaries = useMemo(() => {
    return courierSummaries.filter(summary => {
      const matchesSearch = searchTerm.trim() === "" ||
        summary.courierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        summary.courierId.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesLocation = selectedLocation === "all" || summary.workLocation === selectedLocation;
      
      return matchesSearch && matchesLocation;
    });
  }, [courierSummaries, searchTerm, selectedLocation, selectedDate]);

  const handleDownloadReport = () => {
    let reportDescription = `Laporan Ringkasan Kurir Harian`;
    if (selectedLocation !== "all") {
      reportDescription += ` untuk Area ${selectedLocation}`;
    } else {
      reportDescription += ` (Keseluruhan Area)`;
    }
    if (searchTerm.trim() !== "") {
      reportDescription += ` dengan filter pencarian: "${searchTerm.trim()}"`;
    }
    reportDescription += ` per tanggal ${selectedDate ? format(selectedDate, "PPP") : 'Data Terkini'}.`;

    toast({
      title: "Simulasi Download Laporan",
      description: `${reportDescription} sedang diunduh dalam format CSV.`,
      duration: 5000,
    });
    console.log("Data yang akan diunduh (simulasi):", filteredCourierSummaries);
  };


  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="font-headline text-2xl">Dashboard Laporan Admin</CardTitle>
          <CardDescription>Ringkasan aktivitas dan performa kurir untuk tanggal: {selectedDate ? format(selectedDate, "PPP") : 'Belum Dipilih'}</CardDescription>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard icon={Users} title="Total Kurir Aktif" value={overallStats.totalActiveCouriers} />
        <StatCard icon={Package} title="Total Paket Hari Ini" value={overallStats.totalPackagesToday} />
        <StatCard icon={PackageCheck} title="Total Terkirim Hari Ini" value={overallStats.totalDeliveredToday} />
        <StatCard icon={Percent} title="Rate Sukses Keseluruhan (Hari Ini)" value={`${overallStats.overallSuccessRateToday.toFixed(1)}%`} description="Dari paket yang sudah coba diantar" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filter & Aksi Laporan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1 min-w-[200px]">
              <label htmlFor="date-filter" className="text-sm font-medium mb-1 block">Tanggal Laporan</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button id="date-filter" variant={"outline"} className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, "PPP") : <span>Pilih tanggal</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex-1 min-w-[200px]">
              <label htmlFor="location-filter" className="text-sm font-medium mb-1 block">Lokasi Kerja</label>
              <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                <SelectTrigger id="location-filter" className="w-full">
                  <SelectValue placeholder="Semua Lokasi" />
                </SelectTrigger>
                <SelectContent>
                  {workLocations.map(loc => (
                    <SelectItem key={loc} value={loc}>{loc === "all" ? "Semua Lokasi" : loc}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 min-w-[240px]">
              <label htmlFor="search-courier" className="text-sm font-medium mb-1 block">Cari ID/Nama Kurir</label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search-courier"
                  type="search"
                  placeholder="Ketik ID atau Nama Kurir..."
                  className="pl-8 w-full"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </div>
          <div>
            <Button onClick={handleDownloadReport} variant="default">
              <Download className="mr-2 h-4 w-4" />
              Download Laporan (CSV - Simulasi)
            </Button>
          </div>
        </CardContent>
      </Card>


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
          <CardDescription>Status dan performa masing-masing kurir (hasil filter).</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama Kurir</TableHead>
                <TableHead>ID Kurir</TableHead>
                <TableHead>Lokasi Kerja</TableHead>
                <TableHead>Paket Dibawa</TableHead>
                <TableHead>Paket Terkirim</TableHead>
                <TableHead>Gagal/Kembali</TableHead>
                <TableHead>Rate Sukses</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCourierSummaries.length > 0 ? filteredCourierSummaries.map((courier) => (
                <TableRow key={courier.courierId}>
                  <TableCell>{courier.courierName}</TableCell>
                  <TableCell className="font-code">{courier.courierId}</TableCell>
                  <TableCell>{courier.workLocation}</TableCell>
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
              )) : (
                <TableRow>
                  <TableCell colSpan={8} className="text-center">Tidak ada data kurir yang cocok dengan filter.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}


    