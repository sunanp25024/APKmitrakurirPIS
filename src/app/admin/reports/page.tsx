
"use client";

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { Users, Package, PackageCheck, Percent, Calendar as CalendarIcon, Search, Download, MapPin, Globe, Activity, Map, Clock } from 'lucide-react';
import type { AdminCourierDailySummary, User as CourierUser } from '@/types';
import { mockUsers as fallbackMockUsers } from '@/lib/mockData'; // Renamed to avoid conflict
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from '@/hooks/use-toast';

const LOCAL_STORAGE_USERS_KEY = 'allAdminManagedUsers';
const LOCAL_STORAGE_DAILY_REPORTS_KEY = 'spxCourierDailySummaries';


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
  const [allManagedUsers, setAllManagedUsers] = useState<CourierUser[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedWilayah, setSelectedWilayah] = useState<string>("all");
  const [selectedArea, setSelectedArea] = useState<string>("all");
  const [selectedWorkLocation, setSelectedWorkLocation] = useState<string>("all");
  const { toast } = useToast();

  useEffect(() => {
    setIsMounted(true);
    try {
      const storedUsers = localStorage.getItem(LOCAL_STORAGE_USERS_KEY);
      if (storedUsers) {
        setAllManagedUsers(JSON.parse(storedUsers));
      } else {
        setAllManagedUsers(fallbackMockUsers);
        localStorage.setItem(LOCAL_STORAGE_USERS_KEY, JSON.stringify(fallbackMockUsers));
      }
    } catch (error) {
      console.error("Failed to parse users from localStorage:", error);
      setAllManagedUsers(fallbackMockUsers); // Fallback to mock if parsing fails
    }
  }, []);

  const wilayahOptions = useMemo(() => {
    const wilayahs = new Set(allManagedUsers.map(user => user.wilayah).filter(Boolean));
    return ["all", ...Array.from(wilayahs).sort()];
  }, [allManagedUsers]);

  const areaOptions = useMemo(() => {
    let filteredUsers = allManagedUsers;
    if (selectedWilayah !== "all") {
      filteredUsers = filteredUsers.filter(user => user.wilayah === selectedWilayah);
    }
    const areas = new Set(filteredUsers.map(user => user.area).filter(Boolean));
    return ["all", ...Array.from(areas).sort()];
  }, [allManagedUsers, selectedWilayah]);

  const workLocationOptions = useMemo(() => {
    let filteredUsers = allManagedUsers;
    if (selectedWilayah !== "all") {
      filteredUsers = filteredUsers.filter(user => user.wilayah === selectedWilayah);
    }
    if (selectedArea !== "all") {
      filteredUsers = filteredUsers.filter(user => user.area === selectedArea);
    }
    const locations = new Set(filteredUsers.map(user => user.workLocation).filter(Boolean));
    return ["all", ...Array.from(locations).sort()];
  }, [allManagedUsers, selectedWilayah, selectedArea]);

  const generateSimulatedSummary = useCallback((user: CourierUser, date: Date): AdminCourierDailySummary => {
    const dateSeed = date.getDate() + date.getMonth() * 30 + (user.id.charCodeAt(0) || 7) * 7;
    const carried = 20 + (dateSeed % 15) + (user.id.length % 5);
    const deliveredSeed = ((user.id.charCodeAt(1) || 5) % 11) / 10;
    const delivered = Math.floor(carried * (0.70 + deliveredSeed * 0.25));
    const failed = carried - delivered;
    const attempted = delivered + failed;
    
    let status: AdminCourierDailySummary['status'] = 'Belum Ada Laporan';
    let activityHour = 10 + (dateSeed % 7); 
    let activityMinutes = (dateSeed * 13) % 60;

    if (user.contractStatus === 'Aktif') {
      const statusSeed = (dateSeed % 10);
      if (statusSeed < 2) status = 'Belum Ada Laporan'; // More "Belum Ada Laporan"
      else if (statusSeed < 5) { status = 'Aktif Mengantar'; activityHour = 14 + (dateSeed % 3); }
      else { status = 'Selesai'; activityHour = 17 + (dateSeed % 3); }
    } else {
      status = 'Tidak Aktif';
      activityHour = 9;
    }
    
    const lastActivityDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), activityHour, activityMinutes, 0);

    return {
      courierId: user.id,
      courierName: user.fullName,
      wilayah: user.wilayah,
      area: user.area,
      workLocation: user.workLocation,
      packagesCarried: carried,
      packagesDelivered: delivered,
      packagesFailedOrReturned: failed,
      successRate: attempted > 0 ? (delivered / attempted) * 100 : 0,
      status: status,
      lastActivityTimestamp: lastActivityDate.getTime(),
    };
  }, []);


  const filteredCourierSummaries = useMemo(() => {
    if (!selectedDate || !isMounted) return [];

    const dateKey = format(selectedDate, "yyyy-MM-dd");
    let dailyReportsForDate: { [courierId: string]: AdminCourierDailySummary } = {};
    try {
      const allStoredReportsRaw = localStorage.getItem(LOCAL_STORAGE_DAILY_REPORTS_KEY);
      const allStoredReports = allStoredReportsRaw ? JSON.parse(allStoredReportsRaw) : {};
      dailyReportsForDate = allStoredReports[dateKey] || {};
    } catch (error) {
      console.error("Error reading daily reports from localStorage:", error);
    }
    
    return allManagedUsers
      .filter(user => {
        const matchesSearch = searchTerm.trim() === "" ||
          user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.id.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesWilayah = selectedWilayah === "all" || user.wilayah === selectedWilayah;
        const matchesArea = selectedArea === "all" || user.area === selectedArea;
        const matchesWorkLocation = selectedWorkLocation === "all" || user.workLocation === selectedWorkLocation;
        return matchesSearch && matchesWilayah && matchesArea && matchesWorkLocation;
      })
      .map(user => {
        if (dailyReportsForDate[user.id]) {
          // If actual data exists for this user on this date, use it
          // Ensure status is 'Selesai' and timestamp reflects completion if read from storage
          return { ...dailyReportsForDate[user.id], status: 'Selesai' as AdminCourierDailySummary['status'] };
        }
        // Otherwise, generate simulated data or 'Tidak Aktif'
        if (user.contractStatus !== 'Aktif') {
            return {
                ...generateSimulatedSummary(user, selectedDate), // generate base structure
                packagesCarried: 0, packagesDelivered: 0, packagesFailedOrReturned: 0, successRate: 0,
                status: 'Tidak Aktif' as AdminCourierDailySummary['status'],
                lastActivityTimestamp: new Date(selectedDate.setHours(9,0,0,0)).getTime() // Default time for inactive
            };
        }
        return generateSimulatedSummary(user, selectedDate);
      })
      .sort((a,b) => b.lastActivityTimestamp - a.lastActivityTimestamp);
  }, [allManagedUsers, selectedDate, searchTerm, selectedWilayah, selectedArea, selectedWorkLocation, generateSimulatedSummary, isMounted]);


  const deliveryTimeData = useMemo(() => {
    if (!filteredCourierSummaries.length) return [];
    return Array.from({ length: 10 }, (_, i) => {
      const hour = 9 + i;
      // Simulate deliveries based on the number of active couriers in the current filter
      // and their simulated or actual total delivered packages
      const totalDeliveredInSummaries = filteredCourierSummaries
        .filter(s => s.status !== 'Tidak Aktif' && s.status !== 'Belum Ada Laporan')
        .reduce((acc, curr) => acc + curr.packagesDelivered, 0);
      
      const baseDeliveries = filteredCourierSummaries.length > 0 ? totalDeliveredInSummaries / 10 : 0; // Average over 10 hours
      const calculatedPackages = Math.floor(baseDeliveries * (0.5 + Math.random() * 0.7)); // Add some randomness
      
      return {
        hour: `${String(hour).padStart(2, '0')}:00`,
        delivered: Math.max(0, calculatedPackages), // Ensure non-negative
      };
    });
  }, [filteredCourierSummaries]);

  const dynamicOverallStats = useMemo(() => {
    const activeCouriersInFilter = allManagedUsers.filter(user =>
      user.contractStatus === 'Aktif' &&
      (selectedWilayah === "all" || user.wilayah === selectedWilayah) &&
      (selectedArea === "all" || user.area === selectedArea) &&
      (selectedWorkLocation === "all" || user.workLocation === selectedWorkLocation)
    ).length;

    const currentSummaries = filteredCourierSummaries; 

    const totalPackages = currentSummaries.reduce((sum, s) => sum + s.packagesCarried, 0);
    const totalDelivered = currentSummaries.reduce((sum, s) => sum + s.packagesDelivered, 0);
    const totalFailedOrReturned = currentSummaries.reduce((sum, s) => sum + s.packagesFailedOrReturned, 0);

    const attemptedDeliveries = totalDelivered + totalFailedOrReturned;
    const successRate = attemptedDeliveries > 0 ? (totalDelivered / attemptedDeliveries) * 100 : 0;

    return {
      totalActiveCouriers: activeCouriersInFilter,
      totalPackagesToday: totalPackages,
      totalDeliveredToday: totalDelivered,
      totalPendingReturnToday: totalFailedOrReturned,
      overallSuccessRateToday: successRate,
    };
  }, [allManagedUsers, selectedWilayah, selectedArea, selectedWorkLocation, filteredCourierSummaries]);


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
    setSelectedArea("all");
    setSelectedWorkLocation("all");
  };

  const handleAreaChange = (value: string) => {
    setSelectedArea(value);
    setSelectedWorkLocation("all");
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


  if (!isMounted) {
    return <div className="flex justify-center items-center h-screen"><Activity className="h-8 w-8 animate-spin" /> <p className="ml-2">Memuat data laporan...</p></div>;
  }

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

            <div className="lg:col-span-2"> 
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
            <CardDescription>Jumlah paket terkirim berdasarkan jam untuk {getFilterDescription()} (data hari ini).</CardDescription>
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
            <CardDescription>Perbandingan target pengiriman dan realisasi untuk {getFilterDescription()} (data hari ini).</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-center h-[300px]">
             <ResponsiveContainer width="100%" height={300}>
              <BarChart data={[{name: 'Target Harian', value: 50 * Math.max(1,dynamicOverallStats.totalActiveCouriers) }, {name: 'Realisasi Terkirim', value: dynamicOverallStats.totalDeliveredToday}]}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false}/>
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
          <CardDescription>Status dan performa masing-masing kurir ({getFilterDescription()}) - {selectedDate ? `Untuk ${format(selectedDate, "dd MMM yyyy")}` : 'Data Terkini'}</CardDescription>
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
                <TableHead className="text-right">Update Terakhir</TableHead>
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
                        courier.status === 'Selesai' ? 'bg-green-500 hover:bg-green-600 text-white' : // Added text-white for better contrast
                        courier.status === 'Tidak Aktif' ? 'bg-red-500 hover:bg-red-600 text-white' : // Added text-white
                        courier.status === 'Aktif Mengantar' ? 'bg-yellow-400 hover:bg-yellow-500 text-yellow-900' : // Custom for active
                        '' // Default for others
                    }
                    >{courier.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right text-xs">
                    {format(new Date(courier.lastActivityTimestamp), "HH:mm")}
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={11} className="text-center">Tidak ada data kurir yang cocok dengan filter.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

