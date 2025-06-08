
"use client";

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from '@/components/ui/button';
import { format, subDays, addDays, isToday } from "date-fns";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Calendar as CalendarIcon, TrendingUp, Package, CheckCircle, Clock, Percent, PackageX } from 'lucide-react'; // Removed ArrowLeft, ArrowRight
import type { DailyPerformanceData, AdminCourierDailySummary } from '@/types'; 
import { generateDailyPerformanceEntry } from '@/lib/mockData';
import { useAuth } from '@/contexts/AuthContext'; // Added useAuth

const todayInitial = new Date();
// initialPerformanceData will be set in useEffect
const COLORS_PERFORMANCE = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

export default function PerformancePage() {
  const { user } = useAuth(); // Get current user
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [showCalendar, setShowCalendar] = useState(false);
  const [performanceData, setPerformanceData] = useState<DailyPerformanceData[]>([]);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;

    const todayFormatted = format(new Date(), "yyyy-MM-dd");
    let dataForTodayFromStorage: DailyPerformanceData | undefined = undefined;

    if (user) {
        try {
            const allStoredReportsRaw = localStorage.getItem('spxCourierDailySummaries');
            if (allStoredReportsRaw) {
                const allStoredReports = JSON.parse(allStoredReportsRaw);
                const dailyReportsForToday = allStoredReports[todayFormatted];
                if (dailyReportsForToday && dailyReportsForToday[user.id]) {
                    const summary: AdminCourierDailySummary = dailyReportsForToday[user.id];
                    dataForTodayFromStorage = {
                        date: todayFormatted,
                        totalPackages: summary.packagesCarried,
                        deliveredPackages: summary.packagesDelivered,
                        undeliveredOrPendingPackages: summary.packagesFailedOrReturned,
                        avgDeliveryTime: 90, // Mock, as this isn't in summary from dashboard
                        attendance: 'Present', // Mock, as this isn't in summary from dashboard
                        dataFinalizedTimestamp: summary.lastActivityTimestamp,
                    };
                }
            }
        } catch (e) {
            console.error("Error reading today's summary from localStorage for performance page", e);
        }
    }

    const generatedPerformanceData: DailyPerformanceData[] = Array.from({ length: 30 }, (_, i) => {
        const dayToGenerateFor = subDays(new Date(), i);
        // If it's today and we have data from storage, use that
        if (format(dayToGenerateFor, "yyyy-MM-dd") === todayFormatted && dataForTodayFromStorage) {
            return dataForTodayFromStorage;
        }
        // Otherwise, generate mock data
        return generateDailyPerformanceEntry(dayToGenerateFor);
    }).reverse(); // Keep the reverse to have newest data last for overallStats if needed

    setPerformanceData(generatedPerformanceData);

  }, [user, isMounted]); // Re-run if user changes or component mounts


  const overallStats = useMemo(() => {
    if (!isMounted || performanceData.length === 0) return {
        allPackages: 0, allDelivered: 0, successRate: 0, avgDeliveryTime: 0, attendancePresent: 0, attendanceRate: 0
    };
    const relevantData = performanceData; // Use all 30 days for overall period stats
    const total = relevantData.reduce((sum, day) => sum + day.totalPackages, 0);
    const delivered = relevantData.reduce((sum, day) => sum + day.deliveredPackages, 0);
    const totalDeliveryTime = relevantData.reduce((sum, day) => sum + day.avgDeliveryTime * day.deliveredPackages, 0);
    const totalDeliveredForAvgTime = relevantData.reduce((sum, day) => sum + (day.deliveredPackages > 0 ? day.deliveredPackages : 0), 0);
    
    const presentDays = relevantData.filter(d => d.attendance === 'Present').length;
    const onTimeOrLateDays = relevantData.filter(d => d.attendance === 'Present' || d.attendance === 'Late').length;

    return {
      allPackages: total,
      allDelivered: delivered,
      successRate: total > 0 ? (delivered / total) * 100 : 0,
      avgDeliveryTime: totalDeliveredForAvgTime > 0 ? totalDeliveryTime / totalDeliveredForAvgTime : 0,
      attendancePresent: presentDays,
      attendanceRate: relevantData.length > 0 ? (onTimeOrLateDays / relevantData.length) * 100 : 0,
    };
  }, [performanceData, isMounted]);

  const weeklyChartData = useMemo(() => {
    if (!isMounted || performanceData.length === 0) return [];
    // Ensure data is sorted by date ascending for the chart if it's not already
    const sortedPerformanceData = [...performanceData].sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const last7Days = sortedPerformanceData.slice(-7);
    return last7Days.map(day => ({
      date: format(new Date(day.date), "dd/MM"),
      Terkirim: day.deliveredPackages,
      'Tidak Terkirim/Pending': day.undeliveredOrPendingPackages,
    }));
  }, [performanceData, isMounted]);

  const selectedDayFullData = useMemo(() => {
    if (!isMounted || !selectedDate) return undefined;
    const formattedSelectedDate = format(selectedDate, "yyyy-MM-dd");
    return performanceData.find(d => d.date === formattedSelectedDate);
  }, [performanceData, selectedDate, isMounted]);

  const dailyChartData = useMemo(() => {
    if (!isMounted || !selectedDayFullData || selectedDayFullData.totalPackages === 0) return [{ name: 'Kosong', value: 1, percent: 100, fill: COLORS_PERFORMANCE[4] }];
    
    const data = [
      { name: 'Terkirim', value: selectedDayFullData.deliveredPackages, percent: (selectedDayFullData.deliveredPackages / selectedDayFullData.totalPackages) * 100, fill: COLORS_PERFORMANCE[0] },
      { name: 'Tidak Terkirim/Pending', value: selectedDayFullData.undeliveredOrPendingPackages, percent: (selectedDayFullData.undeliveredOrPendingPackages / selectedDayFullData.totalPackages) * 100, fill: COLORS_PERFORMANCE[1] },
    ].filter(item => item.value > 0);

    if (data.length === 0) { // Should not happen if totalPackages > 0, but as a fallback
        return [{ name: 'Kosong', value: 1, percent: 100, fill: COLORS_PERFORMANCE[4] }];
    }
    return data;

  }, [selectedDayFullData, isMounted]);


  const handleDateChange = (date: Date | undefined) => {
    setSelectedDate(date);
    setShowCalendar(false); 
  };

  if (!isMounted) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <Card className="shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="font-headline text-2xl">Performa Kurir</CardTitle>
            <CardDescription>Analisis kinerja pengiriman dan absensi Anda.</CardDescription>
          </div>
          <Popover open={showCalendar} onOpenChange={setShowCalendar}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-[280px] justify-start text-left font-normal">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {selectedDate ? format(selectedDate, "PPP") : <span>Pilih tanggal</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={handleDateChange}
                disabled={(date) => date > new Date() || date < subDays(new Date(), 60)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard icon={Package} title="Total Paket (Periode)" value={overallStats.allPackages.toLocaleString()} />
        <StatCard icon={CheckCircle} title="Paket Terkirim (Periode)" value={overallStats.allDelivered.toLocaleString()} />
        <StatCard icon={Percent} title="Rate Keberhasilan (Periode)" value={`${overallStats.successRate.toFixed(1)}%`} />
        <StatCard icon={Clock} title="Rata-rata Waktu Pengiriman" value={`${overallStats.avgDeliveryTime.toFixed(0)} min`} />
        <StatCard icon={CalendarIcon} title="Hadir Tepat Waktu (Periode)" value={`${overallStats.attendancePresent} hari`} />
         <StatCard icon={TrendingUp} title="Rate Kehadiran (Periode)" value={`${overallStats.attendanceRate.toFixed(1)}%`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Grafik Pengiriman Mingguan</CardTitle>
            <CardDescription>Jumlah paket dikirim vs tidak terkirim/pending selama 7 hari terakhir.</CardDescription>
          </CardHeader>
          <CardContent>
            {weeklyChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={weeklyChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="Terkirim" stroke="hsl(var(--chart-1))" strokeWidth={2} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="Tidak Terkirim/Pending" stroke="hsl(var(--chart-5))" strokeWidth={2} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-muted-foreground h-[300px] flex items-center justify-center">Data mingguan belum cukup.</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Performa Harian ({selectedDate ? format(selectedDate, "dd MMM yyyy") : 'Pilih Tanggal'})</CardTitle>
             <CardDescription>
                Distribusi status pengiriman untuk tanggal yang dipilih.
                {selectedDayFullData && selectedDayFullData.dataFinalizedTimestamp && (
                    <span className="block text-xs text-muted-foreground mt-1">
                        Data difinalisasi pada: {format(new Date(selectedDayFullData.dataFinalizedTimestamp), "HH:mm:ss")}
                    </span>
                )}
             </CardDescription>
          </CardHeader>
          <CardContent>
            {selectedDayFullData && dailyChartData[0].name !== 'Kosong' ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={dailyChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} labelLine={false} label={({ name, value, percent }) => `${name}: ${value} (${(percent ?? 0).toFixed(0)}%)`}>
                    {dailyChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill || COLORS_PERFORMANCE[index % COLORS_PERFORMANCE.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value, name, props) => [`${value} (${(props.payload.percent ?? 0).toFixed(1)}%)`, name]} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-muted-foreground h-[300px] flex items-center justify-center">Pilih tanggal atau tidak ada data pengiriman untuk tanggal ini.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

interface StatCardProps {
  icon: React.ElementType;
  title: string;
  value: string | number;
}

const StatCard: React.FC<StatCardProps> = ({ icon: Icon, title, value }) => (
  <Card className="shadow-sm hover:shadow-md transition-shadow">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <Icon className="h-5 w-5 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
    </CardContent>
  </Card>
);
