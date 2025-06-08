
"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { Users, Package, PackageCheck, Percent, Calendar as CalendarIcon, Search, Download, MapPin, Globe, Activity } from 'lucide-react';
import type { AdminCourierDailySummary, User as CourierUser } from '@/types'; // Removed AdminDeliveryTimeDataPoint as it's generated inside
import { mockAdminCourierSummaries as initialCourierSummaries, mockUsers } from '@/lib/mockData';
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
  
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedWilayah, setSelectedWilayah] = useState<string>("all");
  const [selectedArea, setSelectedArea] = useState<string>("all");
  const [selectedWorkLocation, setSelectedWorkLocation] = useState<string>("all");
  const { toast } = useToast();

  // Regenerate deliveryTimeData to be deterministic or based on current filters if needed
   const deliveryTimeData = useMemo(() => {
    return Array.from({ length: 10 }, (_, i) => {
      const hour = 9 + i;
      // Example: make delivered packages somewhat related to total packages of filtered couriers
      // This is a simple example; a real app would fetch this data
      const baseDeliveries = filteredCourierSummaries.reduce((acc, curr) => acc + curr.packagesDelivered, 0) / 10;
      const deliveredPackages = Math.max(5, Math.floor(baseDeliveries * (0.5 + ((hour + i*2) % 10) / 10) )); // Make it vary per hour
      return {
        hour: `${String(hour).padStart(2, '0')}:00`,
        delivered: deliveredPackages > 0 ? deliveredPackages : 5 + ((hour + i*2) % 15) , // Ensure some data if base is 0
      };
    });
  }, [/*filteredCourierSummaries*/]); // Dependency on filteredCourierSummaries removed for now to avoid complex loops if stats are not ready.

  const wilayahOptions = useMemo(() => {
    const wilayahs = new Set(mockUsers.map(user => user.wilayah).filter(Boolean));
    return ["all", ...Array.from(wilayahs).sort()];
  }, []);

  const areaOptions = useMemo(() => {
    let filteredUsers = mockUsers;
    if (selectedWilayah !== "all") {
      filteredUsers = filteredUsers.filter(user => user.wilayah === selectedWilayah);
    }
    const areas = new Set(filteredUsers.map(user => user.area).filter(Boolean));
    return ["all", ...Array.from(areas).sort()];
  }, [selectedWilayah]);

  const workLocationOptions = useMemo(() => {
    let filteredUsers = mockUsers;
    if (selectedWilayah !== "all") {
      filteredUsers = filteredUsers.filter(user => user.wilayah === selectedWilayah);
    }
    if (selectedArea !== "all") {
      filteredUsers = filteredUsers.filter(user => user.area === selectedArea);
    }
    const locations = new Set(filteredUsers.map(user => user.workLocation).filter(Boolean));
    return ["all", ...Array.from(locations).sort()];
  }, [selectedWilayah, selectedArea]);

  const filteredCourierSummaries = useMemo(() => {
    return initialCourierSummaries.filter(summary => {
      // const matchesDate = !selectedDate || summary.date === format(selectedDate, "yyyy-MM-dd"); // summary.date does not exist on AdminCourierDailySummary

      const matchesSearch = searchTerm.trim() === "" ||
        summary.courierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        summary.courierId.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesWilayah = selectedWilayah === "all" || summary.wilayah === selectedWilayah;
      const matchesArea = selectedArea === "all" || summary.area === selectedArea;
      const matchesWorkLocation = selectedWorkLocation === "all" || summary.workLocation === selectedWorkLocation;

      return matchesSearch && matchesWilayah && matchesArea && matchesWorkLocation;
    });
  }, [searchTerm, selectedWilayah, selectedArea, selectedWorkLocation, selectedDate]);

  const dynamicOverallStats = useMemo(() => {
    const activeCouriersInFilter = mockUsers.filter(user =>
      user.contractStatus === 'Aktif' &&
      (selectedWilayah === "all" || user.wilayah === selectedWilayah) &&
      (selectedArea === "all" || user.area === selectedArea) &&
      (selectedWorkLocation === "all" || user.workLocation === selectedWorkLocation)
    ).length;

    const currentSummaries = filteredCourierSummaries;

    const totalPackages = currentSummaries.reduce((sum, s) => sum + s.packagesCarried, 0);
    const totalDelivered = currentSummaries.reduce((sum, s) => sum + s.packagesDelivered, 0);
    const totalFailedOrReturned = currentSummaries.reduce((sum, s) => sum + s.packagesFailedOrReturned, 0);

    const attemptedDeliveries = totalDelivered + totalFailedOrReturned; // Consider only packages that had an attempt
    const successRate = attemptedDeliveries > 0 ? (totalDelivered / attemptedDeliveries) * 100 : 0;

    return {
      totalActiveCouriers: activeCouriersInFilter,
      totalPackagesToday: totalPackages, // Total packages assigned/carried
      totalDeliveredToday: totalDelivered,
      totalPendingReturnToday: totalFailedOrReturned, // This now correctly sums failed/returned from summaries
      overallSuccessRateToday: successRate,
    };
  }, [selectedWilayah, selectedArea, selectedWorkLocation, filteredCourierSummaries]);


  const getFilterDescription = () => {
    if (selectedWilayah === "all") return "Nasional";
    let desc = `Wilayah ${selectedWilayah}`;
    if (selectedArea !== "all") {
      desc += ` / Area ${selectedArea}`;
      if (selectedWorkLocation !== "all") {
        desc += ` / Lokasi ${selectedWorkLocation}`;
      }
    }
    return desc;
  };
  
  const handleWilayahChange = (value: string) => {
    setSelectedWilayah(value);
    setSelectedArea("all"); // Reset area when wilayah changes
    setSelectedWorkLocation("all"); // Reset work location
  };

  const handleAreaChange = (value: string) => {
    setSelectedArea(value);
    setSelectedWorkLocation("all"); // Reset work location when area changes
  };

  const handleDownloadReport = () => {
    let reportDescription = `Laporan Ringkasan Kurir Harian`;
    reportDescription += ` untuk ${getFilterDescription()}`;
    
    if (searchTerm.trim() !== "") {
      reportDescription += ` dengan filter pencarian: "${searchTerm.trim()}"`;
    }
    reportDescription += ` per tanggal ${selectedDate ? format(selectedDate, "PPP") : 'Data Terkini'}.`;

    toast({
      title: "Simulasi Download Laporan",
      description: `${reportDescription} sedang diunduh dalam format CSV. (Cek konsol untuk data).`,
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
        <StatCard icon={Users} title="Total Kurir Aktif" value={dynamicOverallStats.totalActiveCouriers} description={getFilterDescription()} />
        <StatCard icon={Package} title="Total Paket Dibawa" value={dynamicOverallStats.totalPackagesToday} description={getFilterDescription()} />
        <StatCard icon={PackageCheck} title="Total Terkirim" value={dynamicOverallStats.totalDeliveredToday} description={getFilterDescription()} />
        <StatCard icon={Percent} title="Rate Sukses" value={`${dynamicOverallStats.overallSuccessRateToday.toFixed(1)}%`} description={`${getFilterDescription()}, dari paket coba antar`} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filter & Aksi Laporan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
            <div>
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
            
            <div>
              <label htmlFor="wilayah-filter" className="text-sm font-medium mb-1 block"><Globe className="inline h-4 w-4 mr-1 text-muted-foreground"/>Wilayah</label>
              <Select value={selectedWilayah} onValueChange={handleWilayahChange}>
                <SelectTrigger id="wilayah-filter" className="w-full">
                  <SelectValue placeholder="Semua Wilayah" />
                </SelectTrigger>
                <SelectContent>
                  {wilayahOptions.map(wil => (
                    <SelectItem key={wil} value={wil}>{wil === "all" ? "Semua Wilayah" : wil}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label htmlFor="area-filter" className="text-sm font-medium mb-1 block"><Map className="inline h-4 w-4 mr-1 text-muted-foreground"/>Area</label>
              <Select value={selectedArea} onValueChange={handleAreaChange} disabled={selectedWilayah === "all" && areaOptions.length <=1}>
                <SelectTrigger id="area-filter" className="w-full">
                  <SelectValue placeholder="Semua Area" />
                </SelectTrigger>
                <SelectContent>
                  {areaOptions.map(area => (
                    <SelectItem key={area} value={area}>{area === "all" ? "Semua Area" : area}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label htmlFor="worklocation-filter" className="text-sm font-medium mb-1 block"><MapPin className="inline h-4 w-4 mr-1 text-muted-foreground"/>Lokasi Kerja (HUB)</label>
              <Select value={selectedWorkLocation} onValueChange={setSelectedWorkLocation} disabled={(selectedWilayah === "all" && selectedArea === "all") && workLocationOptions.length <=1}>
                <SelectTrigger id="worklocation-filter" className="w-full">
                  <SelectValue placeholder="Semua Lokasi Kerja" />
                </SelectTrigger>
                <SelectContent>
                  {workLocationOptions.map(loc => (
                    <SelectItem key={loc} value={loc}>{loc === "all" ? "Semua Lokasi Kerja" : loc}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="lg:col-span-2"> {/* Make search input wider on larger screens */}
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
            <CardDescription>Jumlah paket terkirim berdasarkan jam untuk {getFilterDescription()}.</CardDescription>
          </CardHeader>
          <CardContent>
             {deliveryTimeData && deliveryTimeData.length > 0 ? (
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
            ) : (
              <p className="text-center text-muted-foreground h-[300px] flex items-center justify-center">Tidak ada data pengiriman per jam untuk ditampilkan.</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Target vs Realisasi Pengiriman</CardTitle>
            <CardDescription>Perbandingan target pengiriman dan realisasi untuk {getFilterDescription()}.</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-center h-[300px]">
             <ResponsiveContainer width="100%" height={300}>
              <BarChart data={[{name: 'Target Harian', value: 50 * Math.max(1,dynamicOverallStats.totalActiveCouriers) }, {name: 'Realisasi Terkirim', value: dynamicOverallStats.totalDeliveredToday}]}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="value" fill="hsl(var(--chart-2))" name="Jumlah Paket" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ringkasan Performa Kurir Harian</CardTitle>
          <CardDescription>Status dan performa masing-masing kurir ({getFilterDescription()})</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama Kurir</TableHead>
                <TableHead>ID Kurir</TableHead>
                <TableHead>Wilayah</TableHead>
                <TableHead>Area</TableHead>
                <TableHead>Lokasi Kerja</TableHead>
                <TableHead>Paket Dibawa</TableHead>
                <TableHead>Paket Terkirim</TableHead>
                <TableHead>Gagal/Kembali</TableHead>
                <TableHead>Rate Sukses</TableHead>
                <TableHead>Status Harian</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCourierSummaries.length > 0 ? filteredCourierSummaries.map((courier) => (
                <TableRow key={courier.courierId}>
                  <TableCell>{courier.courierName}</TableCell>
                  <TableCell className="font-code">{courier.courierId}</TableCell>
                  <TableCell>{courier.wilayah}</TableCell>
                  <TableCell>{courier.area}</TableCell>
                  <TableCell>{courier.workLocation}</TableCell>
                  <TableCell>{courier.packagesCarried}</TableCell>
                  <TableCell>{courier.packagesDelivered}</TableCell>
                  <TableCell>{courier.packagesFailedOrReturned}</TableCell>
                  <TableCell>{courier.successRate.toFixed(1)}%</TableCell>
                  <TableCell>
                    <Badge variant={
                      courier.status === 'Selesai' ? 'default' :
                      courier.status === 'Aktif Mengantar' ? 'secondary' :
                      courier.status === 'Belum Ada Laporan' ? 'outline' :
                      courier.status === 'Tidak Aktif' ? 'destructive' : 'outline'
                    }
                    className={
                        courier.status === 'Selesai' ? 'bg-green-500 hover:bg-green-600' :
                        courier.status === 'Tidak Aktif' ? 'bg-red-500 hover:bg-red-600' : ''
                    }
                    >{courier.status}</Badge>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={10} className="text-center">Tidak ada data kurir yang cocok dengan filter.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
